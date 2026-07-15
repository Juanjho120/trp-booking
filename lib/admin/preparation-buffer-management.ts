import {
  CalendarBlockSource,
  ReservationStatus,
  UserRole,
  type Prisma,
  type PrismaClient,
} from "@prisma/client";

import { normalizeAdminEmail } from "@/lib/auth/admin-access";
import {
  addDaysToDateOnly,
  buildPreparationBufferRanges,
  dateOnlyFromDate,
  dateOnlyToUtcDate,
} from "@/lib/availability/rules";
import { prisma } from "@/lib/db/prisma";
import type { AccommodationId, PreparationBufferPolicy } from "@/types/accommodation";
import type {
  AdminPreparationBufferActor,
  AdminPreparationBufferDay,
  AdminPreparationBufferErrorCode,
  AdminPreparationBufferManagement,
  AdminPreparationBufferProperty,
  AdminPreparationBufferReservation,
  UnlockAdminPreparationBufferDayInput,
  UpdateAdminPreparationBufferSettingsInput,
} from "@/types/admin-preparation-buffer-management";
import type {
  AvailabilityDateRange,
  DateOnlyString,
  PreparationBufferDateRange,
} from "@/types/availability";

const SUPPORTED_ACCOMMODATION_IDS: readonly AccommodationId[] = [
  "black-white-apartment",
  "perfect-retreat-bungalow",
  "complete-retreat",
];

const MAX_PREPARATION_DAYS = 30;
const DIRECT_BUFFER_OVERRIDE_REASON = "Direct reservation preparation buffer admin override";

const propertyManagementSelect = {
  id: true,
  nameEs: true,
  nameEn: true,
  preparationDaysBefore: true,
  preparationDaysAfter: true,
  updatedAt: true,
} satisfies Prisma.PropertySelect;

const reservationManagementSelect = {
  id: true,
  propertyId: true,
  guestName: true,
  checkInDate: true,
  checkOutDate: true,
  status: true,
  property: {
    select: propertyManagementSelect,
  },
} satisfies Prisma.ReservationSelect;

const preparationBufferOverrideSelect = {
  id: true,
  propertyId: true,
  reservationId: true,
  startDate: true,
  endDate: true,
  adminOverrideReason: true,
  unlockedByAdminAt: true,
  unlockedByAdmin: {
    select: {
      name: true,
      email: true,
    },
  },
} satisfies Prisma.CalendarBlockSelect;

type PropertyManagementRecord = Prisma.PropertyGetPayload<{
  select: typeof propertyManagementSelect;
}>;

type ReservationManagementRecord = Prisma.ReservationGetPayload<{
  select: typeof reservationManagementSelect;
}>;

type PreparationBufferOverrideRecord = Prisma.CalendarBlockGetPayload<{
  select: typeof preparationBufferOverrideSelect;
}>;

type AdminPrismaClient = PrismaClient | Prisma.TransactionClient;

export class AdminPreparationBufferError extends Error {
  constructor(public readonly code: AdminPreparationBufferErrorCode) {
    super(code);
    this.name = "AdminPreparationBufferError";
  }
}

function toAccommodationId(value: string): AccommodationId {
  if (!SUPPORTED_ACCOMMODATION_IDS.includes(value as AccommodationId)) {
    throw new AdminPreparationBufferError("PREPARATION_BUFFER_PROPERTY_NOT_FOUND");
  }

  return value as AccommodationId;
}

function toDateOnlyRange(startDate: Date, endDate: Date): AvailabilityDateRange {
  return {
    startDate: dateOnlyFromDate(startDate),
    endDate: dateOnlyFromDate(endDate),
  };
}

function toIsoString(value: Date | null): string | null {
  return value ? value.toISOString() : null;
}

function assertPreparationDays(value: number): void {
  if (!Number.isInteger(value) || value < 0 || value > MAX_PREPARATION_DAYS) {
    throw new AdminPreparationBufferError("INVALID_PREPARATION_BUFFER_REQUEST");
  }
}

function getPreparationBufferPolicy(
  property: Pick<PropertyManagementRecord, "preparationDaysBefore" | "preparationDaysAfter">,
): PreparationBufferPolicy {
  return {
    daysBefore: property.preparationDaysBefore,
    daysAfter: property.preparationDaysAfter,
  };
}

function enumerateBufferDays(
  bufferRange: PreparationBufferDateRange,
): readonly DateOnlyString[] {
  const days: DateOnlyString[] = [];

  for (
    let date = bufferRange.startDate;
    date < bufferRange.endDate;
    date = addDaysToDateOnly(date, 1)
  ) {
    days.push(date);
  }

  return days;
}

function overrideCoversDay(
  override: PreparationBufferOverrideRecord,
  date: DateOnlyString,
): boolean {
  const overrideRange = toDateOnlyRange(override.startDate, override.endDate);
  const dayEnd = addDaysToDateOnly(date, 1);

  return overrideRange.startDate <= date && overrideRange.endDate >= dayEnd;
}

function buildReservationBufferDays(
  reservation: ReservationManagementRecord,
  overrides: readonly PreparationBufferOverrideRecord[],
  today: DateOnlyString,
): readonly AdminPreparationBufferDay[] {
  const accommodationId = toAccommodationId(reservation.propertyId);
  const stayRange = toDateOnlyRange(reservation.checkInDate, reservation.checkOutDate);
  const bufferRanges = buildPreparationBufferRanges(
    accommodationId,
    stayRange,
    getPreparationBufferPolicy(reservation.property),
  );

  return bufferRanges.flatMap((bufferRange) =>
    enumerateBufferDays(bufferRange)
      .filter((date) => date >= today)
      .map((date) => {
        const matchingOverride = overrides.find(
          (override) =>
            override.reservationId === reservation.id &&
            override.propertyId === reservation.propertyId &&
            overrideCoversDay(override, date),
        );

        return {
          date,
          kind: bufferRange.kind,
          isUnlocked: Boolean(matchingOverride),
          overrideId: matchingOverride?.id ?? null,
          overrideReason: matchingOverride?.adminOverrideReason ?? null,
          unlockedAt: toIsoString(matchingOverride?.unlockedByAdminAt ?? null),
          unlockedByName: matchingOverride?.unlockedByAdmin?.name ?? null,
          unlockedByEmail: matchingOverride?.unlockedByAdmin?.email ?? null,
        };
      }),
  );
}

async function resolveAdminActor(
  prismaClient: AdminPrismaClient,
  actor: AdminPreparationBufferActor,
) {
  const email = normalizeAdminEmail(actor.email);

  if (!email) {
    throw new AdminPreparationBufferError("ADMIN_UNAUTHORIZED");
  }

  return prismaClient.user.upsert({
    where: {
      email,
    },
    update: {
      name: actor.name?.trim() || undefined,
      role: UserRole.ADMIN,
    },
    create: {
      email,
      name: actor.name?.trim() || null,
      role: UserRole.ADMIN,
    },
    select: {
      id: true,
      email: true,
      name: true,
    },
  });
}

function toPropertySummary(
  property: PropertyManagementRecord,
): AdminPreparationBufferProperty {
  return {
    id: property.id,
    nameEs: property.nameEs,
    nameEn: property.nameEn,
    preparationDaysBefore: property.preparationDaysBefore,
    preparationDaysAfter: property.preparationDaysAfter,
    updatedAt: property.updatedAt.toISOString(),
  };
}

export async function getAdminPreparationBufferManagement(
  prismaClient: AdminPrismaClient = prisma,
): Promise<AdminPreparationBufferManagement> {
  const properties = await prismaClient.property.findMany({
    where: {
      id: {
        in: [...SUPPORTED_ACCOMMODATION_IDS],
      },
      deletedAt: null,
    },
    select: propertyManagementSelect,
  });
  const propertyOrder = new Map<string, number>(
    SUPPORTED_ACCOMMODATION_IDS.map(
      (propertyId, index) => [propertyId, index] as const,
    ),
  );
  const orderedProperties = [...properties].sort(
    (left, right) =>
      (propertyOrder.get(left.id) ?? Number.MAX_SAFE_INTEGER) -
      (propertyOrder.get(right.id) ?? Number.MAX_SAFE_INTEGER),
  );
  const maxPreparationDaysAfter = orderedProperties.reduce(
    (currentMax, property) =>
      Math.max(currentMax, property.preparationDaysAfter),
    0,
  );
  const today = dateOnlyFromDate(new Date());
  const earliestRelevantCheckoutDate = dateOnlyToUtcDate(
    addDaysToDateOnly(today, -Math.max(maxPreparationDaysAfter, 1)),
  );
  const reservations = await prismaClient.reservation.findMany({
    where: {
      propertyId: {
        in: orderedProperties.map((property) => property.id),
      },
      status: ReservationStatus.CONFIRMED,
      checkOutDate: {
        gte: earliestRelevantCheckoutDate,
      },
    },
    orderBy: [
      {
        checkInDate: "asc",
      },
      {
        createdAt: "desc",
      },
    ],
    select: reservationManagementSelect,
  });
  const reservationIds = reservations.map((reservation) => reservation.id);
  const overrides =
    reservationIds.length > 0
      ? await prismaClient.calendarBlock.findMany({
          where: {
            reservationId: {
              in: reservationIds,
            },
            source: CalendarBlockSource.PREPARATION_BUFFER,
            unlockedByAdminAt: {
              not: null,
            },
            deletedAt: null,
          },
          orderBy: {
            createdAt: "asc",
          },
          select: preparationBufferOverrideSelect,
        })
      : [];

  const reservationSummaries = reservations
    .map<AdminPreparationBufferReservation>((reservation) => ({
      id: reservation.id,
      propertyId: reservation.propertyId,
      propertyNameEs: reservation.property.nameEs,
      propertyNameEn: reservation.property.nameEn,
      guestName: reservation.guestName,
      checkInDate: dateOnlyFromDate(reservation.checkInDate),
      checkOutDate: dateOnlyFromDate(reservation.checkOutDate),
      bufferDays: buildReservationBufferDays(
        reservation,
        overrides,
        today,
      ),
    }))
    .filter((reservation) => reservation.bufferDays.length > 0);

  return {
    generatedAt: new Date().toISOString(),
    properties: orderedProperties.map(toPropertySummary),
    reservations: reservationSummaries,
  };
}

export async function updateAdminPreparationBufferSettings(
  input: UpdateAdminPreparationBufferSettingsInput,
  actor: AdminPreparationBufferActor,
): Promise<AdminPreparationBufferManagement> {
  assertPreparationDays(input.preparationDaysBefore);
  assertPreparationDays(input.preparationDaysAfter);
  const accommodationId = toAccommodationId(input.propertyId);

  await prisma.$transaction(async (transaction) => {
    const adminActor = await resolveAdminActor(transaction, actor);
    const property = await transaction.property.findFirst({
      where: {
        id: accommodationId,
        deletedAt: null,
      },
      select: propertyManagementSelect,
    });

    if (!property) {
      throw new AdminPreparationBufferError(
        "PREPARATION_BUFFER_PROPERTY_NOT_FOUND",
      );
    }

    if (
      property.preparationDaysBefore === input.preparationDaysBefore &&
      property.preparationDaysAfter === input.preparationDaysAfter
    ) {
      return;
    }

    await transaction.property.update({
      where: {
        id: property.id,
      },
      data: {
        preparationDaysBefore: input.preparationDaysBefore,
        preparationDaysAfter: input.preparationDaysAfter,
      },
    });

    await transaction.adminAuditLog.create({
      data: {
        userId: adminActor.id,
        action: "PROPERTY_PREPARATION_BUFFER_UPDATED",
        entityType: "Property",
        entityId: property.id,
        metadata: {
          actorEmail: adminActor.email,
          before: {
            preparationDaysBefore: property.preparationDaysBefore,
            preparationDaysAfter: property.preparationDaysAfter,
          },
          after: {
            preparationDaysBefore: input.preparationDaysBefore,
            preparationDaysAfter: input.preparationDaysAfter,
          },
        },
      },
    });
  });

  return getAdminPreparationBufferManagement();
}

function isDayInsideBufferRange(
  date: DateOnlyString,
  bufferRange: PreparationBufferDateRange,
): boolean {
  const dayEnd = addDaysToDateOnly(date, 1);

  return bufferRange.startDate <= date && bufferRange.endDate >= dayEnd;
}

export async function unlockAdminPreparationBufferDay(
  input: UnlockAdminPreparationBufferDayInput,
  actor: AdminPreparationBufferActor,
): Promise<AdminPreparationBufferManagement> {
  const reason = input.reason.trim();

  if (reason.length < 3 || reason.length > 500) {
    throw new AdminPreparationBufferError(
      "PREPARATION_BUFFER_REASON_REQUIRED",
    );
  }

  const today = dateOnlyFromDate(new Date());

  if (input.date < today) {
    throw new AdminPreparationBufferError(
      "PREPARATION_BUFFER_DATE_IN_PAST",
    );
  }

  await prisma.$transaction(async (transaction) => {
    const adminActor = await resolveAdminActor(transaction, actor);
    const reservation = await transaction.reservation.findUnique({
      where: {
        id: input.reservationId.trim(),
      },
      select: reservationManagementSelect,
    });

    if (!reservation) {
      throw new AdminPreparationBufferError(
        "PREPARATION_BUFFER_RESERVATION_NOT_FOUND",
      );
    }

    if (reservation.status !== ReservationStatus.CONFIRMED) {
      throw new AdminPreparationBufferError(
        "PREPARATION_BUFFER_RESERVATION_NOT_CONFIRMED",
      );
    }

    const accommodationId = toAccommodationId(reservation.propertyId);
    const stayRange = toDateOnlyRange(
      reservation.checkInDate,
      reservation.checkOutDate,
    );
    const bufferRanges = buildPreparationBufferRanges(
      accommodationId,
      stayRange,
      getPreparationBufferPolicy(reservation.property),
    );
    const matchingBufferRange = bufferRanges.find((bufferRange) =>
      isDayInsideBufferRange(input.date, bufferRange),
    );

    if (!matchingBufferRange) {
      throw new AdminPreparationBufferError(
        "PREPARATION_BUFFER_DATE_NOT_UNLOCKABLE",
      );
    }

    const targetStartDate = dateOnlyToUtcDate(input.date);
    const targetEndDate = dateOnlyToUtcDate(
      addDaysToDateOnly(input.date, 1),
    );
    const existingOverride = await transaction.calendarBlock.findFirst({
      where: {
        propertyId: reservation.propertyId,
        reservationId: reservation.id,
        source: CalendarBlockSource.PREPARATION_BUFFER,
        unlockedByAdminAt: {
          not: null,
        },
        deletedAt: null,
        startDate: {
          lte: targetStartDate,
        },
        endDate: {
          gte: targetEndDate,
        },
      },
      select: {
        id: true,
      },
    });

    if (existingOverride) {
      return;
    }

    const override = await transaction.calendarBlock.create({
      data: {
        propertyId: reservation.propertyId,
        reservationId: reservation.id,
        startDate: targetStartDate,
        endDate: targetEndDate,
        source: CalendarBlockSource.PREPARATION_BUFFER,
        reason: DIRECT_BUFFER_OVERRIDE_REASON,
        isAdminOverrideAllowed: true,
        unlockedByAdminAt: new Date(),
        unlockedByAdminId: adminActor.id,
        adminOverrideReason: reason,
      },
      select: {
        id: true,
      },
    });

    await transaction.adminAuditLog.create({
      data: {
        userId: adminActor.id,
        action: "PREPARATION_BUFFER_DAY_UNLOCKED",
        entityType: "CalendarBlock",
        entityId: override.id,
        metadata: {
          actorEmail: adminActor.email,
          reservationId: reservation.id,
          propertyId: reservation.propertyId,
          date: input.date,
          rangeKind: matchingBufferRange.kind,
          reason,
        },
      },
    });
  });

  return getAdminPreparationBufferManagement();
}
