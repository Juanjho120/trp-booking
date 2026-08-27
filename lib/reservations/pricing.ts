import {
  assertDateOnlyString,
  assertValidAvailabilityDateRange,
  dateOnlyToUtcDate,
} from "@/lib/availability/rules";
import {
  PricingRepositoryError,
  resolvePropertyStayPricing,
} from "@/lib/pricing";
import { getPublicAccommodationById } from "@/lib/properties";
import type { AvailabilityDateRange } from "@/types/availability";
import type { FinalCPricingSnapshot } from "@/types/pricing";
import type {
  ReservationQuote,
  ReservationQuotePricingSegment,
  ReservationQuoteAmount,
  ReservationQuoteCurrency,
  ReservationQuoteErrorCode,
  ReservationQuoteInput,
} from "@/types/reservation-quote";
import type { PrismaClient } from "@prisma/client";

type ReservationQuoteQueryOptions = Readonly<{
  prismaClient?: Pick<PrismaClient, "property">;
}>;

export type ReservationQuoteWithPricingSnapshot = Readonly<{
  quote: ReservationQuote;
  pricingSnapshot: FinalCPricingSnapshot;
}>;

const USD_CURRENCY: ReservationQuoteCurrency = "USD";
const ZERO_USD_CENTS = 0;
const MS_PER_DAY = 24 * 60 * 60 * 1000;

export class ReservationQuoteError extends Error {
  readonly code: ReservationQuoteErrorCode;

  constructor(code: ReservationQuoteErrorCode) {
    super(code);
    this.name = "ReservationQuoteError";
    this.code = code;
  }
}

function toReservationQuotePricingBreakdown(
  snapshot: FinalCPricingSnapshot,
): readonly ReservationQuotePricingSegment[] {
  return snapshot.segments.flatMap((segment) => {
    if (segment.kind !== "RESOLVED_RATE") {
      return [];
    }

    return [
      {
        startDate: segment.startDate,
        endDate: segment.endDate,
        nights: segment.nights,
        source: segment.source,
        minimumNights:
          segment.source === "LENGTH_OF_STAY"
            ? segment.minimumNights
            : null,
        nightlyRate: toReservationQuoteAmount(
          segment.nightlyRateCents,
        ),
        subtotal: toReservationQuoteAmount(segment.subtotalCents),
      },
    ];
  });
}

function assertReservationQuoteDateRange(
  input: ReservationQuoteInput,
): AvailabilityDateRange {
  try {
    assertDateOnlyString(input.checkInDate, "checkInDate");
    assertDateOnlyString(input.checkOutDate, "checkOutDate");

    const range: AvailabilityDateRange = {
      startDate: input.checkInDate,
      endDate: input.checkOutDate,
    };

    assertValidAvailabilityDateRange(range);

    return range;
  } catch {
    throw new ReservationQuoteError("INVALID_DATE_RANGE");
  }
}

function countNights(range: AvailabilityDateRange): number {
  const checkIn = dateOnlyToUtcDate(range.startDate);
  const checkOut = dateOnlyToUtcDate(range.endDate);
  const nights = (checkOut.getTime() - checkIn.getTime()) / MS_PER_DAY;

  if (!Number.isInteger(nights) || nights <= 0) {
    throw new ReservationQuoteError("INVALID_DATE_RANGE");
  }

  return nights;
}

function toReservationQuoteAmount(amountCents: number): ReservationQuoteAmount {
  if (!Number.isSafeInteger(amountCents) || amountCents < 0) {
    throw new ReservationQuoteError("INVALID_QUOTE_REQUEST");
  }

  return {
    currency: USD_CURRENCY,
    amountCents,
    amount: (amountCents / 100).toFixed(2),
  };
}

function assertGuestCount(input: ReservationQuoteInput, maxGuests: number): void {
  if (!Number.isInteger(input.guestCount) || input.guestCount < 1) {
    throw new ReservationQuoteError("INVALID_GUEST_COUNT");
  }

  if (input.guestCount > maxGuests) {
    throw new ReservationQuoteError("INVALID_GUEST_COUNT");
  }
}

function mapPricingRepositoryError(
  error: PricingRepositoryError,
): ReservationQuoteError {
  if (error.code === "PRICING_PROPERTY_NOT_FOUND") {
    return new ReservationQuoteError("INVALID_ACCOMMODATION");
  }

  return new ReservationQuoteError("INVALID_QUOTE_REQUEST");
}

export async function calculateReservationQuoteWithPricingSnapshot(
  input: ReservationQuoteInput,
  options: ReservationQuoteQueryOptions = {},
): Promise<ReservationQuoteWithPricingSnapshot> {
  const accommodation = await getPublicAccommodationById(
    input.accommodationId,
    options,
  );

  if (!accommodation) {
    throw new ReservationQuoteError("INVALID_ACCOMMODATION");
  }

  assertGuestCount(input, accommodation.maxGuests);

  const range = assertReservationQuoteDateRange(input);
  const nights = countNights(range);
  let pricing;

  try {
    pricing = await resolvePropertyStayPricing(
      {
        propertyId: input.accommodationId,
        checkInDate: input.checkInDate,
        checkOutDate: input.checkOutDate,
        stayLengthContextNights: nights,
      },
      options,
    );
  } catch (error) {
    if (error instanceof PricingRepositoryError) {
      throw mapPricingRepositoryError(error);
    }

    throw error;
  }

  const cleaningFeeCents = ZERO_USD_CENTS;
  const taxesCents = ZERO_USD_CENTS;
  const discountsCents = ZERO_USD_CENTS;
  const totalCents =
    pricing.subtotalCents + cleaningFeeCents + taxesCents - discountsCents;

  if (
    totalCents < 0 ||
    totalCents !== pricing.totalCents ||
    pricing.pricedNights !== nights
  ) {
    throw new ReservationQuoteError("INVALID_QUOTE_REQUEST");
  }

  const quote: ReservationQuote = {
    accommodationId: accommodation.id,
    accommodationName: accommodation.name,
    accommodationSlug: accommodation.slug,
    checkInDate: input.checkInDate,
    checkOutDate: input.checkOutDate,
    guestCount: input.guestCount,
    maxGuests: accommodation.maxGuests,
    pricingBreakdown: toReservationQuotePricingBreakdown(
      pricing.snapshot,
    ),
    nights,
    nightlyRate:
      pricing.uniformNightlyRateCents === null
        ? null
        : toReservationQuoteAmount(pricing.uniformNightlyRateCents),
    subtotal: toReservationQuoteAmount(pricing.subtotalCents),
    cleaningFee: toReservationQuoteAmount(cleaningFeeCents),
    taxes: toReservationQuoteAmount(taxesCents),
    discounts: toReservationQuoteAmount(discountsCents),
    total: toReservationQuoteAmount(totalCents),
    currency: USD_CURRENCY,
    paymentRequired: true,
    quoteKind: "NON_BINDING",
  };

  return {
    quote,
    pricingSnapshot: pricing.snapshot,
  };
}

export async function calculateReservationQuote(
  input: ReservationQuoteInput,
  options: ReservationQuoteQueryOptions = {},
): Promise<ReservationQuote> {
  const result = await calculateReservationQuoteWithPricingSnapshot(
    input,
    options,
  );

  return result.quote;
}
