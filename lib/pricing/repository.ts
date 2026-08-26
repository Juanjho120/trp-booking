import { PropertyStatus, type PrismaClient } from "@prisma/client";

import { dateOnlyFromDate } from "@/lib/availability/rules";
import { prisma } from "@/lib/db/prisma";
import {
  calculateStayPricing,
  PricingEngineError,
  type CalculatedStayPricing,
} from "@/lib/pricing/engine";
import type { DateOnlyString } from "@/types/availability";
import {
  SUPPORTED_LENGTH_OF_STAY_MINIMUM_NIGHTS,
  TRP_STAY_PRICING_CURRENCY,
  type LengthOfStayMinimumNights,
} from "@/types/pricing";

type PricingQueryClient = Pick<PrismaClient, "property">;

export type ResolvePropertyStayPricingInput = Readonly<{
  propertyId: string;
  checkInDate: DateOnlyString;
  checkOutDate: DateOnlyString;
  stayLengthContextNights: number;
}>;

export type ResolvePropertyStayPricingOptions = Readonly<{
  prismaClient?: PricingQueryClient;
}>;

export type PricingRepositoryErrorCode =
  | "PRICING_PROPERTY_NOT_FOUND"
  | "PRICING_CONFIGURATION_INVALID";

export class PricingRepositoryError extends Error {
  readonly code: PricingRepositoryErrorCode;

  constructor(code: PricingRepositoryErrorCode) {
    super(code);
    this.name = "PricingRepositoryError";
    this.code = code;
  }
}

const supportedLengthOfStayMinimumNights = new Set<number>(
  SUPPORTED_LENGTH_OF_STAY_MINIMUM_NIGHTS,
);

function decimalMoneyToCents(value: Readonly<{ toString: () => string }>): number {
  const normalized = value.toString();
  const match = /^(\d+)(?:\.(\d{1,2}))?$/.exec(normalized);

  if (!match) {
    throw new PricingRepositoryError("PRICING_CONFIGURATION_INVALID");
  }

  const whole = Number(match[1]);
  const fractional = Number((match[2] ?? "").padEnd(2, "0"));
  const cents = whole * 100 + fractional;

  if (!Number.isSafeInteger(cents) || cents <= 0) {
    throw new PricingRepositoryError("PRICING_CONFIGURATION_INVALID");
  }

  return cents;
}

function toLengthOfStayMinimumNights(value: number): LengthOfStayMinimumNights {
  if (!supportedLengthOfStayMinimumNights.has(value)) {
    throw new PricingRepositoryError("PRICING_CONFIGURATION_INVALID");
  }

  return value as LengthOfStayMinimumNights;
}

function toDateOnlyDate(value: DateOnlyString): Date {
  return new Date(`${value}T00:00:00.000Z`);
}

export async function resolvePropertyStayPricing(
  input: ResolvePropertyStayPricingInput,
  options: ResolvePropertyStayPricingOptions = {},
): Promise<CalculatedStayPricing> {
  const prismaClient = options.prismaClient ?? prisma;
  const property = await prismaClient.property.findFirst({
    where: {
      id: input.propertyId,
      status: PropertyStatus.ACTIVE,
      deletedAt: null,
    },
    select: {
      id: true,
      baseNightlyPrice: true,
      currency: true,
      seasonalPricingRules: {
        where: {
          isEnabled: true,
          deletedAt: null,
          startDate: {
            lt: toDateOnlyDate(input.checkOutDate),
          },
          endDate: {
            gt: toDateOnlyDate(input.checkInDate),
          },
        },
        orderBy: [{ startDate: "asc" }, { endDate: "asc" }, { id: "asc" }],
        select: {
          id: true,
          startDate: true,
          endDate: true,
          nightlyRate: true,
        },
      },
      lengthOfStayPricingRules: {
        where: {
          isEnabled: true,
          deletedAt: null,
          minimumNights: {
            lte: input.stayLengthContextNights,
          },
        },
        orderBy: [{ minimumNights: "desc" }, { id: "asc" }],
        select: {
          id: true,
          minimumNights: true,
          nightlyRate: true,
        },
      },
    },
  });

  if (!property) {
    throw new PricingRepositoryError("PRICING_PROPERTY_NOT_FOUND");
  }

  if (property.currency !== TRP_STAY_PRICING_CURRENCY) {
    throw new PricingRepositoryError("PRICING_CONFIGURATION_INVALID");
  }

  try {
    return calculateStayPricing({
      propertyId: property.id,
      checkInDate: input.checkInDate,
      checkOutDate: input.checkOutDate,
      stayLengthContextNights: input.stayLengthContextNights,
      baseNightlyRateCents: decimalMoneyToCents(property.baseNightlyPrice),
      seasonalRules: property.seasonalPricingRules.map((rule) => ({
        id: rule.id,
        startDate: dateOnlyFromDate(rule.startDate),
        endDate: dateOnlyFromDate(rule.endDate),
        nightlyRateCents: decimalMoneyToCents(rule.nightlyRate),
      })),
      lengthOfStayRules: property.lengthOfStayPricingRules.map((rule) => ({
        id: rule.id,
        minimumNights: toLengthOfStayMinimumNights(rule.minimumNights),
        nightlyRateCents: decimalMoneyToCents(rule.nightlyRate),
      })),
    });
  } catch (error) {
    if (error instanceof PricingEngineError) {
      throw new PricingRepositoryError("PRICING_CONFIGURATION_INVALID");
    }

    throw error;
  }
}
