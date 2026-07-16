import {
  CalendarBlockSource,
  ReservationStatus,
  type Prisma,
  type PrismaClient,
} from "@prisma/client";

import { resolveAdminActor } from "@/lib/admin/admin-actor";
import {
  adminAccommodationIds,
  isAdminAccommodationId,
  toAdminAccommodationId,
} from "@/lib/admin/accommodations";
import {
  addDaysToDateOnly,
  buildPreparationBufferRanges,
  dateOnlyFromDate,
  dateOnlyToUtcDate,
} from "@/lib/availability/rules";
import { prisma } from "@/lib/db/prisma";
import type { PreparationBufferPolicy } from "@/types/accommodation";
import type {
  AdminPreparationBufferActor,
  AdminPreparationBufferErrorCode,
  AdminPreparationBufferMutationResult,
  AdminPreparationBufferProperty,
  AdminPreparationBufferSettings,
  RestoreAdminPreparationBufferDayInput,
  UnlockAdminPreparationBufferDayInput,
  UpdateAdminPreparationBufferSettingsInput,
} from "@/types/admin-preparation-buffer-management";
import type {
  AvailabilityDateRange,
  DateOnlyString,
} from "@/types/availability";

const MAX_PREPARATION_DAYS = 30;
const DIRECT_BUFFER_OVERRIDE_REASON =
  "Direct reservation preparation buffer admin override";
const PERSISTED_BUFFER_OVERRIDE_REASON =
  "Persisted preparation buffer admin override";

const propertySettingsSelect = {
  id: true,
  nameEs: true,
  nameEn: true,
  preparationDaysBefore: true,
  preparationDaysAfter: true,
  updatedAt: true,
} satisfies Prisma.PropertySelect;

const reservationBufferSelect = {
  id: true,
  propertyId: true,
  checkInDate: true,
  checkOutDate: true,
  status: true,
  property: {
    select: {
      preparationDaysBefore: true,
      preparationDaysAfter: true,
    },
  },
} satisfies Prisma.ReservationSelect;

type PropertySettingsRecord = Prisma.PropertyGetPayload<{
  select: typeof propertySettingsSelect;
}>;

type ReservationBufferRecord = Prisma.ReservationGetPayload<{
  select: typeof reservationBufferSelect;
}>;

type AdminPrismaClient = PrismaClient | Prisma.TransactionClient;

export class AdminPreparationBufferError extends Error {
  constructor(public readonly code: AdminPreparationBufferErrorCode) {
    super(code);
    this.name = "AdminPreparationBufferError";
  }
}

function toPropertySummary(
  property: PropertySettingsRecord,
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

function assertPreparationDays(value: number): void {
  if (!Number.isInteger(value) || value < 0 || value > MAX_PREPARATION_DAYS) {
    throw new AdminPreparationBufferError(
      "INVALID_PREPARATION_BUFFER_REQUEST",
    );
  }
}

function getPreparationBufferPolicy(
  reservation: ReservationBufferRecord,
): PreparationBufferPolicy {
  return {
    daysBefore: reservation.property.preparationDaysBefore,
    daysAfter: reservation.property.preparationDaysAfter,
  };
}

function toDateOnlyRange(startDate: Date, endDate: Date): AvailabilityDateRange {
  return {
    startDate: dateOnlyFromDate(startDate),
    endDate: dateOnlyFromDate(endDate),
  };
}

function isDayInsideBufferRange(
  date: DateOnlyString,
  bufferRange: AvailabilityDateRange,
): boolean {
  const dayEnd = addDaysToDateOnly(date, 1);

  return bufferRange.startDate <= date && bufferRange.endDate >= dayEnd;
}

function normalizeOptionalReason(value: string | null | undefined): string | null {
  const reason = value?.trim();
  return reason ? reason.slice(0, 500) : null;
}

export async function getAdminPreparationBufferSettings(
  prismaClient: AdminPrismaClient = prisma,
): Promise<AdminPreparationBufferSettings> {
  const properties = await prismaClient.property.findMany({
    where: {
      id: {
        in: [...adminAccommodationIds],
      },
      deletedAt: null,
    },
    select: propertySettingsSelect,
  });
  const propertyOrder = new Map<string, number>(
    adminAccommodationIds.map(
      (propertyId, index) => [propertyId, index] as const,
    ),
  );
  const orderedProperties = [...properties].sort(
    (left, right) =>
      (propertyOrder.get(left.id) ?? Number.MAX_SAFE_INTEGER) -
      (propertyOrder.get(right.id) ?? Number.MAX_SAFE_INTEGER),
  );

  return {
    generatedAt: new Date().toISOString(),
    properties: orderedProperties.map(toPropertySummary),
  };
}

export async function updateAdminPreparationBufferSettings(
  input: UpdateAdminPreparationBufferSettingsInput,
  actor: AdminPreparationBufferActor,
): Promise<AdminPreparationBufferSettings> {
  assertPreparationDays(input.preparationDaysBefore);
  assertPreparationDays(input.preparationDaysAfter);

  if (!isAdminAccommodationId(input.propertyId)) {
    throw new AdminPreparationBufferError(
      "PREPARATION_BUFFER_PROPERTY_NOT_FOUND",
    );
  }

  await prisma.$transaction(async (transaction) => {
    const adminActor = await resolveAdminActor(transaction, actor);
    const property = await transaction.property.findFirst({
      where: {
        id: input.propertyId,
        deletedAt: null,
      },
      select: propertySettingsSelect,
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

  return getAdminPreparationBufferSettings();
}

export async function unlockAdminPreparationBufferDay(
  input: UnlockAdminPreparationBufferDayInput,
  actor: AdminPreparationBufferActor,
): Promise<AdminPreparationBufferMutationResult> {
  const reservationId = input.reservationId?.trim() || null;
  const calendarBlockId = input.calendarBlockId?.trim() || null;

  if (Boolean(reservationId) === Boolean(calendarBlockId)) {
    throw new AdminPreparationBufferError(
      "INVALID_PREPARATION_BUFFER_REQUEST",
    );
  }

  const today = dateOnlyFromDate(new Date());

  if (input.date < today) {
    throw new AdminPreparationBufferError(
      "PREPARATION_BUFFER_DATE_IN_PAST",
    );
  }

  return prisma.$transaction(async (transaction) => {
    const adminActor = await resolveAdminActor(transaction, actor);
    const targetStartDate = dateOnlyToUtcDate(input.date);
    const targetEndDate = dateOnlyToUtcDate(addDaysToDateOnly(input.date, 1));
    const reason = normalizeOptionalReason(input.reason);

    if (reservationId) {
      const reservation = await transaction.reservation.findUnique({
        where: {
          id: reservationId,
        },
        select: reservationBufferSelect,
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

      const accommodationId = toAdminAccommodationId(reservation.propertyId);
      const bufferRanges = buildPreparationBufferRanges(
        accommodationId,
        toDateOnlyRange(reservation.checkInDate, reservation.checkOutDate),
        getPreparationBufferPolicy(reservation),
      );
      const matchingBufferRange = bufferRanges.find((bufferRange) =>
        isDayInsideBufferRange(input.date, bufferRange),
      );

      if (!matchingBufferRange) {
        throw new AdminPreparationBufferError(
          "PREPARATION_BUFFER_DATE_NOT_UNLOCKABLE",
        );
      }

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
        return {
          calendarBlockId: existingOverride.id,
        };
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

      return {
        calendarBlockId: override.id,
      };
    }

    const persistedBuffer = await transaction.calendarBlock.findFirst({
      where: {
        id: calendarBlockId!,
        source: CalendarBlockSource.PREPARATION_BUFFER,
        isAdminOverrideAllowed: true,
        unlockedByAdminAt: null,
        deletedAt: null,
      },
      select: {
        id: true,
        propertyId: true,
        reservationId: true,
        externalCalendarEventId: true,
        parentBlockId: true,
        startDate: true,
        endDate: true,
      },
    });

    if (!persistedBuffer) {
      throw new AdminPreparationBufferError(
        "PREPARATION_BUFFER_DATE_NOT_UNLOCKABLE",
      );
    }

    const persistedRange = toDateOnlyRange(
      persistedBuffer.startDate,
      persistedBuffer.endDate,
    );

    if (!isDayInsideBufferRange(input.date, persistedRange)) {
      throw new AdminPreparationBufferError(
        "PREPARATION_BUFFER_DATE_NOT_UNLOCKABLE",
      );
    }

    if (
      !persistedBuffer.reservationId &&
      !persistedBuffer.externalCalendarEventId
    ) {
      throw new AdminPreparationBufferError(
        "PREPARATION_BUFFER_DATE_NOT_UNLOCKABLE",
      );
    }

    const relationshipWhere = persistedBuffer.reservationId
      ? { reservationId: persistedBuffer.reservationId }
      : {
          externalCalendarEventId: persistedBuffer.externalCalendarEventId!,
          parentBlockId: persistedBuffer.parentBlockId,
        };
    const existingOverride = await transaction.calendarBlock.findFirst({
      where: {
        propertyId: persistedBuffer.propertyId,
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
        ...relationshipWhere,
      },
      select: {
        id: true,
      },
    });

    if (existingOverride) {
      return {
        calendarBlockId: existingOverride.id,
      };
    }

    const override = await transaction.calendarBlock.create({
      data: {
        propertyId: persistedBuffer.propertyId,
        reservationId: persistedBuffer.reservationId,
        externalCalendarEventId: persistedBuffer.externalCalendarEventId,
        parentBlockId: persistedBuffer.parentBlockId,
        startDate: targetStartDate,
        endDate: targetEndDate,
        source: CalendarBlockSource.PREPARATION_BUFFER,
        reason: PERSISTED_BUFFER_OVERRIDE_REASON,
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
          propertyId: persistedBuffer.propertyId,
          sourceCalendarBlockId: persistedBuffer.id,
          externalCalendarEventId: persistedBuffer.externalCalendarEventId,
          date: input.date,
          reason,
        },
      },
    });

    return {
      calendarBlockId: override.id,
    };
  });
}

export async function restoreAdminPreparationBufferDay(
  input: RestoreAdminPreparationBufferDayInput,
  actor: AdminPreparationBufferActor,
): Promise<AdminPreparationBufferMutationResult> {
  return prisma.$transaction(async (transaction) => {
    const adminActor = await resolveAdminActor(transaction, actor);
    const override = await transaction.calendarBlock.findFirst({
      where: {
        id: input.overrideId.trim(),
        source: CalendarBlockSource.PREPARATION_BUFFER,
        unlockedByAdminAt: {
          not: null,
        },
        deletedAt: null,
      },
      select: {
        id: true,
        propertyId: true,
        reservationId: true,
        externalCalendarEventId: true,
        parentBlockId: true,
        startDate: true,
        endDate: true,
        adminOverrideReason: true,
      },
    });

    if (!override) {
      throw new AdminPreparationBufferError(
        "PREPARATION_BUFFER_OVERRIDE_NOT_FOUND",
      );
    }

    const restoredAt = new Date();

    await transaction.calendarBlock.update({
      where: {
        id: override.id,
      },
      data: {
        deletedAt: restoredAt,
        deletedById: adminActor.id,
      },
    });

    await transaction.adminAuditLog.create({
      data: {
        userId: adminActor.id,
        action: "PREPARATION_BUFFER_DAY_RESTORED",
        entityType: "CalendarBlock",
        entityId: override.id,
        metadata: {
          actorEmail: adminActor.email,
          propertyId: override.propertyId,
          reservationId: override.reservationId,
          externalCalendarEventId: override.externalCalendarEventId,
          parentBlockId: override.parentBlockId,
          startDate: dateOnlyFromDate(override.startDate),
          endDate: dateOnlyFromDate(override.endDate),
          previousReason: override.adminOverrideReason,
        },
      },
    });

    return {
      calendarBlockId: override.id,
    };
  });
}
