import { Prisma, type PrismaClient } from "@prisma/client";

import {
  addDaysToDateOnly,
  assertValidAvailabilityDateRange,
  dateOnlyFromDate,
  isDateOnlyString,
} from "@/lib/availability/rules";
import { prisma } from "@/lib/db/prisma";
import {
  calculateStayPricing,
  PricingEngineError,
} from "@/lib/pricing/engine";
import type { DateOnlyString } from "@/types/availability";
import type {
  AdminLengthOfStayPricingRule,
  AdminPricingActor,
  AdminPricingErrorCode,
  AdminPricingPreview,
  AdminPricingPreviewInput,
  AdminPricingSettings,
  AdminSeasonalPricingRule,
  CreateAdminSeasonalPricingRuleInput,
  RestoreAdminSeasonalPricingRuleInput,
  SaveAdminLengthOfStayPricingRuleInput,
  SetAdminLengthOfStayPricingRuleEnabledInput,
  SetAdminSeasonalPricingRuleEnabledInput,
  SoftDeleteAdminSeasonalPricingRuleInput,
  UpdateAdminSeasonalPricingRuleInput,
} from "@/types/admin-pricing";
import {
  SUPPORTED_LENGTH_OF_STAY_MINIMUM_NIGHTS,
  TRP_STAY_PRICING_CURRENCY,
  type LengthOfStayMinimumNights,
} from "@/types/pricing";

import { resolveAdminActor } from "./admin-actor";
import { isAdminAccommodationId } from "./accommodations";

type AdminPricingPrismaClient = PrismaClient | Prisma.TransactionClient;

const SEASONAL_NAME_MIN_LENGTH = 2;
const SEASONAL_NAME_MAX_LENGTH = 160;
const SERIALIZABLE_ATTEMPTS = 2;
const supportedLosTiers = new Set<number>(
  SUPPORTED_LENGTH_OF_STAY_MINIMUM_NIGHTS,
);

const propertySelect = {
  id: true,
  nameEs: true,
  nameEn: true,
  baseNightlyPrice: true,
  currency: true,
} satisfies Prisma.PropertySelect;

const seasonalRuleSelect = {
  id: true,
  propertyId: true,
  name: true,
  startDate: true,
  endDate: true,
  nightlyRate: true,
  isEnabled: true,
  deletedAt: true,
  updatedAt: true,
} satisfies Prisma.SeasonalPricingRuleSelect;

const lengthOfStayRuleSelect = {
  id: true,
  propertyId: true,
  minimumNights: true,
  nightlyRate: true,
  isEnabled: true,
  deletedAt: true,
  updatedAt: true,
} satisfies Prisma.LengthOfStayPricingRuleSelect;

type PropertyRecord = Prisma.PropertyGetPayload<{
  select: typeof propertySelect;
}>;
type SeasonalRuleRecord = Prisma.SeasonalPricingRuleGetPayload<{
  select: typeof seasonalRuleSelect;
}>;
type LengthOfStayRuleRecord = Prisma.LengthOfStayPricingRuleGetPayload<{
  select: typeof lengthOfStayRuleSelect;
}>;

export class AdminPricingError extends Error {
  constructor(public readonly code: AdminPricingErrorCode) {
    super(code);
    this.name = "AdminPricingError";
  }
}

function assertSupportedPropertyId(propertyId: string): void {
  if (!isAdminAccommodationId(propertyId)) {
    throw new AdminPricingError("ADMIN_PRICING_PROPERTY_NOT_FOUND");
  }
}

function normalizeSeasonalName(value: string): string {
  const normalized = value.trim().replace(/\s+/g, " ");

  if (
    normalized.length < SEASONAL_NAME_MIN_LENGTH ||
    normalized.length > SEASONAL_NAME_MAX_LENGTH
  ) {
    throw new AdminPricingError("INVALID_ADMIN_PRICING_REQUEST");
  }

  return normalized;
}

function moneyDecimalToCents(value: Readonly<{ toString: () => string }>): number {
  const match = /^(\d+)(?:\.(\d{1,2}))?$/.exec(value.toString());

  if (!match) {
    throw new AdminPricingError("ADMIN_PRICING_CONFIGURATION_INVALID");
  }

  const cents = Number(match[1]) * 100 + Number((match[2] ?? "").padEnd(2, "0"));

  if (!Number.isSafeInteger(cents) || cents <= 0) {
    throw new AdminPricingError("ADMIN_PRICING_CONFIGURATION_INVALID");
  }

  return cents;
}

function normalizeMoney(value: string): Readonly<{
  decimal: Prisma.Decimal;
  amount: string;
  cents: number;
}> {
  const normalized = value.trim();
  const match = /^(\d{1,8})(?:\.(\d{1,2}))?$/.exec(normalized);

  if (!match) {
    throw new AdminPricingError("INVALID_ADMIN_PRICING_REQUEST");
  }

  const cents = Number(match[1]) * 100 + Number((match[2] ?? "").padEnd(2, "0"));

  if (!Number.isSafeInteger(cents) || cents <= 0) {
    throw new AdminPricingError("INVALID_ADMIN_PRICING_REQUEST");
  }

  return {
    decimal: new Prisma.Decimal((cents / 100).toFixed(2)),
    amount: (cents / 100).toFixed(2),
    cents,
  };
}

function formatCents(cents: number): string {
  if (!Number.isSafeInteger(cents) || cents < 0) {
    throw new AdminPricingError("ADMIN_PRICING_CONFIGURATION_INVALID");
  }

  return (cents / 100).toFixed(2);
}

function parseDateRange(
  startDateValue: string,
  endDateValue: string,
): Readonly<{ startDate: DateOnlyString; endDate: DateOnlyString }> {
  const startDate = startDateValue.trim();
  const endDate = endDateValue.trim();

  if (!isDateOnlyString(startDate) || !isDateOnlyString(endDate)) {
    throw new AdminPricingError("INVALID_ADMIN_PRICING_REQUEST");
  }

  try {
    assertValidAvailabilityDateRange({ startDate, endDate });
  } catch {
    throw new AdminPricingError("INVALID_ADMIN_PRICING_REQUEST");
  }

  return { startDate, endDate };
}

function toDateOnlyDate(value: DateOnlyString): Date {
  return new Date(`${value}T00:00:00.000Z`);
}

function toLengthOfStayMinimumNights(value: number): LengthOfStayMinimumNights {
  if (!supportedLosTiers.has(value)) {
    throw new AdminPricingError("ADMIN_PRICING_LOS_TIER_INVALID");
  }

  return value as LengthOfStayMinimumNights;
}

function assertExpectedUpdatedAt(
  actual: Date,
  expectedUpdatedAt: string,
): void {
  const expected = new Date(expectedUpdatedAt);

  if (
    !Number.isFinite(expected.getTime()) ||
    actual.getTime() !== expected.getTime()
  ) {
    throw new AdminPricingError("ADMIN_PRICING_RULE_STALE");
  }
}

async function findProperty(
  propertyId: string,
  prismaClient: AdminPricingPrismaClient,
): Promise<PropertyRecord> {
  assertSupportedPropertyId(propertyId);

  const property = await prismaClient.property.findFirst({
    where: {
      id: propertyId,
      deletedAt: null,
    },
    select: propertySelect,
  });

  if (!property) {
    throw new AdminPricingError("ADMIN_PRICING_PROPERTY_NOT_FOUND");
  }

  if (property.currency !== TRP_STAY_PRICING_CURRENCY) {
    throw new AdminPricingError("ADMIN_PRICING_CONFIGURATION_INVALID");
  }

  return property;
}

function toSeasonalRule(rule: SeasonalRuleRecord): AdminSeasonalPricingRule {
  return {
    id: rule.id,
    name: rule.name,
    startDate: dateOnlyFromDate(rule.startDate),
    endDate: dateOnlyFromDate(rule.endDate),
    nightlyRate: rule.nightlyRate.toFixed(2),
    isEnabled: rule.isEnabled,
    isDeleted: rule.deletedAt !== null,
    updatedAt: rule.updatedAt.toISOString(),
  };
}

function toLengthOfStayRules(
  records: readonly LengthOfStayRuleRecord[],
): readonly AdminLengthOfStayPricingRule[] {
  const byTier = new Map(
    records
      .filter((record) => record.deletedAt === null)
      .map((record) => [record.minimumNights, record] as const),
  );

  return SUPPORTED_LENGTH_OF_STAY_MINIMUM_NIGHTS.map((minimumNights) => {
    const record = byTier.get(minimumNights);

    return {
      id: record?.id ?? null,
      minimumNights,
      nightlyRate: record?.nightlyRate.toFixed(2) ?? null,
      isEnabled: record?.isEnabled ?? false,
      updatedAt: record?.updatedAt.toISOString() ?? null,
    };
  });
}

async function getSettingsOrThrow(
  propertyId: string,
  prismaClient: AdminPricingPrismaClient,
): Promise<AdminPricingSettings> {
  const property = await findProperty(propertyId, prismaClient);
  const [seasonalRules, lengthOfStayRules] = await Promise.all([
    prismaClient.seasonalPricingRule.findMany({
      where: { propertyId },
      orderBy: [{ deletedAt: "asc" }, { startDate: "asc" }, { name: "asc" }],
      select: seasonalRuleSelect,
    }),
    prismaClient.lengthOfStayPricingRule.findMany({
      where: { propertyId },
      orderBy: { minimumNights: "asc" },
      select: lengthOfStayRuleSelect,
    }),
  ]);

  return {
    property: {
      id: property.id,
      nameEs: property.nameEs,
      nameEn: property.nameEn,
      baseNightlyRate: property.baseNightlyPrice.toFixed(2),
      currency: TRP_STAY_PRICING_CURRENCY,
    },
    seasonalRules: seasonalRules.map(toSeasonalRule),
    lengthOfStayRules: toLengthOfStayRules(lengthOfStayRules),
    generatedAt: new Date().toISOString(),
  };
}

export async function getAdminPricingSettings(
  propertyId: string,
  prismaClient: AdminPricingPrismaClient = prisma,
): Promise<AdminPricingSettings | null> {
  if (!isAdminAccommodationId(propertyId)) {
    return null;
  }

  try {
    return await getSettingsOrThrow(propertyId, prismaClient);
  } catch (error) {
    if (
      error instanceof AdminPricingError &&
      error.code === "ADMIN_PRICING_PROPERTY_NOT_FOUND"
    ) {
      return null;
    }

    throw error;
  }
}

function isSerializableConflict(error: unknown): boolean {
  return (
    error instanceof Prisma.PrismaClientKnownRequestError &&
    error.code === "P2034"
  );
}

function isUniqueConflict(error: unknown): boolean {
  return (
    error instanceof Prisma.PrismaClientKnownRequestError &&
    error.code === "P2002"
  );
}

async function runSerializable<T>(
  operation: (tx: Prisma.TransactionClient) => Promise<T>,
): Promise<T> {
  for (let attempt = 1; attempt <= SERIALIZABLE_ATTEMPTS; attempt += 1) {
    try {
      return await prisma.$transaction(operation, {
        isolationLevel: Prisma.TransactionIsolationLevel.Serializable,
      });
    } catch (error) {
      if (isUniqueConflict(error)) {
        throw new AdminPricingError("ADMIN_PRICING_CONFLICT");
      }

      if (!isSerializableConflict(error) || attempt === SERIALIZABLE_ATTEMPTS) {
        if (isSerializableConflict(error)) {
          throw new AdminPricingError("ADMIN_PRICING_CONFLICT");
        }

        throw error;
      }
    }
  }

  throw new AdminPricingError("ADMIN_PRICING_CONFLICT");
}

async function assertNoActiveSeasonalOverlap(
  tx: Prisma.TransactionClient,
  input: Readonly<{
    propertyId: string;
    startDate: DateOnlyString;
    endDate: DateOnlyString;
    excludeRuleId?: string;
  }>,
): Promise<void> {
  const overlap = await tx.seasonalPricingRule.findFirst({
    where: {
      propertyId: input.propertyId,
      isEnabled: true,
      deletedAt: null,
      id: input.excludeRuleId ? { not: input.excludeRuleId } : undefined,
      startDate: { lt: toDateOnlyDate(input.endDate) },
      endDate: { gt: toDateOnlyDate(input.startDate) },
    },
    select: { id: true },
  });

  if (overlap) {
    throw new AdminPricingError("ADMIN_PRICING_SEASONAL_OVERLAP");
  }
}

async function findSeasonalRuleOrThrow(
  tx: Prisma.TransactionClient,
  propertyId: string,
  ruleId: string,
  includeDeleted: boolean,
): Promise<SeasonalRuleRecord> {
  const rule = await tx.seasonalPricingRule.findFirst({
    where: {
      id: ruleId,
      propertyId,
      deletedAt: includeDeleted ? undefined : null,
    },
    select: seasonalRuleSelect,
  });

  if (!rule) {
    throw new AdminPricingError("ADMIN_PRICING_RULE_NOT_FOUND");
  }

  return rule;
}

export async function createAdminSeasonalPricingRule(
  input: CreateAdminSeasonalPricingRuleInput,
  actor: AdminPricingActor,
): Promise<AdminPricingSettings> {
  assertSupportedPropertyId(input.propertyId);
  const name = normalizeSeasonalName(input.name);
  const range = parseDateRange(input.startDate, input.endDate);
  const money = normalizeMoney(input.nightlyRate);

  await runSerializable(async (tx) => {
    const adminActor = await resolveAdminActor(tx, actor);
    await findProperty(input.propertyId, tx);
    await assertNoActiveSeasonalOverlap(tx, {
      propertyId: input.propertyId,
      ...range,
    });

    const rule = await tx.seasonalPricingRule.create({
      data: {
        propertyId: input.propertyId,
        name,
        startDate: toDateOnlyDate(range.startDate),
        endDate: toDateOnlyDate(range.endDate),
        nightlyRate: money.decimal,
        isEnabled: true,
      },
      select: seasonalRuleSelect,
    });

    await tx.adminAuditLog.create({
      data: {
        userId: adminActor.id,
        action: "SEASONAL_PRICING_RULE_CREATED",
        entityType: "SeasonalPricingRule",
        entityId: rule.id,
        metadata: {
          actorEmail: adminActor.email,
          propertyId: input.propertyId,
          name,
          startDate: range.startDate,
          endDate: range.endDate,
          nightlyRate: money.amount,
          isEnabled: true,
        },
      },
    });
  });

  return getSettingsOrThrow(input.propertyId, prisma);
}

export async function updateAdminSeasonalPricingRule(
  input: UpdateAdminSeasonalPricingRuleInput,
  actor: AdminPricingActor,
): Promise<AdminPricingSettings> {
  assertSupportedPropertyId(input.propertyId);
  const name = normalizeSeasonalName(input.name);
  const range = parseDateRange(input.startDate, input.endDate);
  const money = normalizeMoney(input.nightlyRate);

  await runSerializable(async (tx) => {
    const adminActor = await resolveAdminActor(tx, actor);
    await findProperty(input.propertyId, tx);
    const current = await findSeasonalRuleOrThrow(
      tx,
      input.propertyId,
      input.ruleId,
      false,
    );
    assertExpectedUpdatedAt(current.updatedAt, input.expectedUpdatedAt);

    if (current.isEnabled) {
      await assertNoActiveSeasonalOverlap(tx, {
        propertyId: input.propertyId,
        ...range,
        excludeRuleId: current.id,
      });
    }

    const updated = await tx.seasonalPricingRule.updateMany({
      where: {
        id: current.id,
        propertyId: input.propertyId,
        updatedAt: current.updatedAt,
        deletedAt: null,
      },
      data: {
        name,
        startDate: toDateOnlyDate(range.startDate),
        endDate: toDateOnlyDate(range.endDate),
        nightlyRate: money.decimal,
      },
    });

    if (updated.count !== 1) {
      throw new AdminPricingError("ADMIN_PRICING_RULE_STALE");
    }

    await tx.adminAuditLog.create({
      data: {
        userId: adminActor.id,
        action: "SEASONAL_PRICING_RULE_UPDATED",
        entityType: "SeasonalPricingRule",
        entityId: current.id,
        metadata: {
          actorEmail: adminActor.email,
          propertyId: input.propertyId,
          before: {
            name: current.name,
            startDate: dateOnlyFromDate(current.startDate),
            endDate: dateOnlyFromDate(current.endDate),
            nightlyRate: current.nightlyRate.toFixed(2),
          },
          after: {
            name,
            startDate: range.startDate,
            endDate: range.endDate,
            nightlyRate: money.amount,
          },
        },
      },
    });
  });

  return getSettingsOrThrow(input.propertyId, prisma);
}

export async function setAdminSeasonalPricingRuleEnabled(
  input: SetAdminSeasonalPricingRuleEnabledInput,
  actor: AdminPricingActor,
): Promise<AdminPricingSettings> {
  assertSupportedPropertyId(input.propertyId);

  await runSerializable(async (tx) => {
    const adminActor = await resolveAdminActor(tx, actor);
    await findProperty(input.propertyId, tx);
    const current = await findSeasonalRuleOrThrow(
      tx,
      input.propertyId,
      input.ruleId,
      false,
    );
    assertExpectedUpdatedAt(current.updatedAt, input.expectedUpdatedAt);

    if (current.isEnabled === input.enabled) {
      return;
    }

    if (input.enabled) {
      await assertNoActiveSeasonalOverlap(tx, {
        propertyId: input.propertyId,
        startDate: dateOnlyFromDate(current.startDate),
        endDate: dateOnlyFromDate(current.endDate),
        excludeRuleId: current.id,
      });
    }

    const updated = await tx.seasonalPricingRule.updateMany({
      where: {
        id: current.id,
        propertyId: input.propertyId,
        updatedAt: current.updatedAt,
        deletedAt: null,
      },
      data: { isEnabled: input.enabled },
    });

    if (updated.count !== 1) {
      throw new AdminPricingError("ADMIN_PRICING_RULE_STALE");
    }

    await tx.adminAuditLog.create({
      data: {
        userId: adminActor.id,
        action: "SEASONAL_PRICING_RULE_ENABLED_CHANGED",
        entityType: "SeasonalPricingRule",
        entityId: current.id,
        metadata: {
          actorEmail: adminActor.email,
          propertyId: input.propertyId,
          beforeEnabled: current.isEnabled,
          afterEnabled: input.enabled,
        },
      },
    });
  });

  return getSettingsOrThrow(input.propertyId, prisma);
}

export async function softDeleteAdminSeasonalPricingRule(
  input: SoftDeleteAdminSeasonalPricingRuleInput,
  actor: AdminPricingActor,
): Promise<AdminPricingSettings> {
  assertSupportedPropertyId(input.propertyId);

  await runSerializable(async (tx) => {
    const adminActor = await resolveAdminActor(tx, actor);
    await findProperty(input.propertyId, tx);
    const current = await findSeasonalRuleOrThrow(
      tx,
      input.propertyId,
      input.ruleId,
      false,
    );
    assertExpectedUpdatedAt(current.updatedAt, input.expectedUpdatedAt);
    const deletedAt = new Date();

    const updated = await tx.seasonalPricingRule.updateMany({
      where: {
        id: current.id,
        propertyId: input.propertyId,
        updatedAt: current.updatedAt,
        deletedAt: null,
      },
      data: {
        isEnabled: false,
        deletedAt,
      },
    });

    if (updated.count !== 1) {
      throw new AdminPricingError("ADMIN_PRICING_RULE_STALE");
    }

    await tx.adminAuditLog.create({
      data: {
        userId: adminActor.id,
        action: "SEASONAL_PRICING_RULE_SOFT_DELETED",
        entityType: "SeasonalPricingRule",
        entityId: current.id,
        metadata: {
          actorEmail: adminActor.email,
          propertyId: input.propertyId,
          previousEnabled: current.isEnabled,
          deletedAt: deletedAt.toISOString(),
        },
      },
    });
  });

  return getSettingsOrThrow(input.propertyId, prisma);
}

export async function restoreAdminSeasonalPricingRule(
  input: RestoreAdminSeasonalPricingRuleInput,
  actor: AdminPricingActor,
): Promise<AdminPricingSettings> {
  assertSupportedPropertyId(input.propertyId);

  await runSerializable(async (tx) => {
    const adminActor = await resolveAdminActor(tx, actor);
    await findProperty(input.propertyId, tx);
    const current = await findSeasonalRuleOrThrow(
      tx,
      input.propertyId,
      input.ruleId,
      true,
    );

    if (!current.deletedAt) {
      throw new AdminPricingError("ADMIN_PRICING_RULE_NOT_FOUND");
    }

    assertExpectedUpdatedAt(current.updatedAt, input.expectedUpdatedAt);

    const updated = await tx.seasonalPricingRule.updateMany({
      where: {
        id: current.id,
        propertyId: input.propertyId,
        updatedAt: current.updatedAt,
        deletedAt: { not: null },
      },
      data: {
        deletedAt: null,
        isEnabled: false,
      },
    });

    if (updated.count !== 1) {
      throw new AdminPricingError("ADMIN_PRICING_RULE_STALE");
    }

    await tx.adminAuditLog.create({
      data: {
        userId: adminActor.id,
        action: "SEASONAL_PRICING_RULE_RESTORED",
        entityType: "SeasonalPricingRule",
        entityId: current.id,
        metadata: {
          actorEmail: adminActor.email,
          propertyId: input.propertyId,
          restoredEnabled: false,
        },
      },
    });
  });

  return getSettingsOrThrow(input.propertyId, prisma);
}

export async function saveAdminLengthOfStayPricingRule(
  input: SaveAdminLengthOfStayPricingRuleInput,
  actor: AdminPricingActor,
): Promise<AdminPricingSettings> {
  assertSupportedPropertyId(input.propertyId);
  const minimumNights = toLengthOfStayMinimumNights(input.minimumNights);
  const money = normalizeMoney(input.nightlyRate);

  await runSerializable(async (tx) => {
    const adminActor = await resolveAdminActor(tx, actor);
    await findProperty(input.propertyId, tx);
    const current = await tx.lengthOfStayPricingRule.findUnique({
      where: {
        propertyId_minimumNights: {
          propertyId: input.propertyId,
          minimumNights,
        },
      },
      select: lengthOfStayRuleSelect,
    });

    if (current?.deletedAt) {
      throw new AdminPricingError("ADMIN_PRICING_CONFIGURATION_INVALID");
    }

    if (!current) {
      if (input.expectedUpdatedAt !== null) {
        throw new AdminPricingError("ADMIN_PRICING_RULE_STALE");
      }

      const created = await tx.lengthOfStayPricingRule.create({
        data: {
          propertyId: input.propertyId,
          minimumNights,
          nightlyRate: money.decimal,
          isEnabled: true,
        },
        select: lengthOfStayRuleSelect,
      });

      await tx.adminAuditLog.create({
        data: {
          userId: adminActor.id,
          action: "LOS_PRICING_RULE_CREATED",
          entityType: "LengthOfStayPricingRule",
          entityId: created.id,
          metadata: {
            actorEmail: adminActor.email,
            propertyId: input.propertyId,
            minimumNights,
            nightlyRate: money.amount,
            isEnabled: true,
          },
        },
      });

      return;
    }

    if (!input.expectedUpdatedAt) {
      throw new AdminPricingError("ADMIN_PRICING_RULE_STALE");
    }

    assertExpectedUpdatedAt(current.updatedAt, input.expectedUpdatedAt);

    const updated = await tx.lengthOfStayPricingRule.updateMany({
      where: {
        id: current.id,
        propertyId: input.propertyId,
        updatedAt: current.updatedAt,
        deletedAt: null,
      },
      data: { nightlyRate: money.decimal },
    });

    if (updated.count !== 1) {
      throw new AdminPricingError("ADMIN_PRICING_RULE_STALE");
    }

    await tx.adminAuditLog.create({
      data: {
        userId: adminActor.id,
        action: "LOS_PRICING_RULE_UPDATED",
        entityType: "LengthOfStayPricingRule",
        entityId: current.id,
        metadata: {
          actorEmail: adminActor.email,
          propertyId: input.propertyId,
          minimumNights,
          beforeNightlyRate: current.nightlyRate.toFixed(2),
          afterNightlyRate: money.amount,
        },
      },
    });
  });

  return getSettingsOrThrow(input.propertyId, prisma);
}

export async function setAdminLengthOfStayPricingRuleEnabled(
  input: SetAdminLengthOfStayPricingRuleEnabledInput,
  actor: AdminPricingActor,
): Promise<AdminPricingSettings> {
  assertSupportedPropertyId(input.propertyId);
  const minimumNights = toLengthOfStayMinimumNights(input.minimumNights);

  await runSerializable(async (tx) => {
    const adminActor = await resolveAdminActor(tx, actor);
    await findProperty(input.propertyId, tx);
    const current = await tx.lengthOfStayPricingRule.findUnique({
      where: {
        propertyId_minimumNights: {
          propertyId: input.propertyId,
          minimumNights,
        },
      },
      select: lengthOfStayRuleSelect,
    });

    if (!current || current.deletedAt) {
      throw new AdminPricingError("ADMIN_PRICING_RULE_NOT_FOUND");
    }

    assertExpectedUpdatedAt(current.updatedAt, input.expectedUpdatedAt);

    if (current.isEnabled === input.enabled) {
      return;
    }

    const updated = await tx.lengthOfStayPricingRule.updateMany({
      where: {
        id: current.id,
        propertyId: input.propertyId,
        updatedAt: current.updatedAt,
        deletedAt: null,
      },
      data: { isEnabled: input.enabled },
    });

    if (updated.count !== 1) {
      throw new AdminPricingError("ADMIN_PRICING_RULE_STALE");
    }

    await tx.adminAuditLog.create({
      data: {
        userId: adminActor.id,
        action: "LOS_PRICING_RULE_ENABLED_CHANGED",
        entityType: "LengthOfStayPricingRule",
        entityId: current.id,
        metadata: {
          actorEmail: adminActor.email,
          propertyId: input.propertyId,
          minimumNights,
          beforeEnabled: current.isEnabled,
          afterEnabled: input.enabled,
        },
      },
    });
  });

  return getSettingsOrThrow(input.propertyId, prisma);
}

function countNights(startDate: DateOnlyString, endDate: DateOnlyString): number {
  let current = startDate;
  let nights = 0;

  while (current < endDate) {
    nights += 1;
    current = addDaysToDateOnly(current, 1);

    if (!Number.isSafeInteger(nights) || nights > 3660) {
      throw new AdminPricingError("INVALID_ADMIN_PRICING_REQUEST");
    }
  }

  if (nights <= 0 || current !== endDate) {
    throw new AdminPricingError("INVALID_ADMIN_PRICING_REQUEST");
  }

  return nights;
}

export async function previewAdminPricing(
  input: AdminPricingPreviewInput,
  prismaClient: AdminPricingPrismaClient = prisma,
): Promise<AdminPricingPreview> {
  assertSupportedPropertyId(input.propertyId);
  const range = parseDateRange(input.checkInDate, input.checkOutDate);
  const nights = countNights(range.startDate, range.endDate);
  const property = await prismaClient.property.findFirst({
    where: {
      id: input.propertyId,
      deletedAt: null,
    },
    select: {
      ...propertySelect,
      seasonalPricingRules: {
        where: {
          isEnabled: true,
          deletedAt: null,
          startDate: { lt: toDateOnlyDate(range.endDate) },
          endDate: { gt: toDateOnlyDate(range.startDate) },
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
          minimumNights: { lte: nights },
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
    throw new AdminPricingError("ADMIN_PRICING_PROPERTY_NOT_FOUND");
  }

  if (property.currency !== TRP_STAY_PRICING_CURRENCY) {
    throw new AdminPricingError("ADMIN_PRICING_CONFIGURATION_INVALID");
  }

  try {
    const calculated = calculateStayPricing({
      propertyId: property.id,
      checkInDate: range.startDate,
      checkOutDate: range.endDate,
      stayLengthContextNights: nights,
      baseNightlyRateCents: moneyDecimalToCents(property.baseNightlyPrice),
      seasonalRules: property.seasonalPricingRules.map((rule) => ({
        id: rule.id,
        startDate: dateOnlyFromDate(rule.startDate),
        endDate: dateOnlyFromDate(rule.endDate),
        nightlyRateCents: moneyDecimalToCents(rule.nightlyRate),
      })),
      lengthOfStayRules: property.lengthOfStayPricingRules.map((rule) => ({
        id: rule.id,
        minimumNights: toLengthOfStayMinimumNights(rule.minimumNights),
        nightlyRateCents: moneyDecimalToCents(rule.nightlyRate),
      })),
    });

    return {
      checkInDate: range.startDate,
      checkOutDate: range.endDate,
      nights: calculated.pricedNights,
      uniformNightlyRate:
        calculated.uniformNightlyRateCents === null
          ? null
          : formatCents(calculated.uniformNightlyRateCents),
      subtotal: formatCents(calculated.subtotalCents),
      currency: TRP_STAY_PRICING_CURRENCY,
      segments: calculated.snapshot.segments.flatMap((segment) =>
        segment.kind === "RESOLVED_RATE"
          ? [
              {
                startDate: segment.startDate,
                endDate: segment.endDate,
                nights: segment.nights,
                source: segment.source,
                nightlyRate: formatCents(segment.nightlyRateCents),
                subtotal: formatCents(segment.subtotalCents),
              },
            ]
          : [],
      ),
    };
  } catch (error) {
    if (error instanceof PricingEngineError) {
      if (error.code === "OVERLAPPING_SEASONAL_RULES") {
        throw new AdminPricingError("ADMIN_PRICING_SEASONAL_OVERLAP");
      }

      throw new AdminPricingError("ADMIN_PRICING_CONFIGURATION_INVALID");
    }

    throw error;
  }
}
