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
} from "@/lib/admin/accommodations";
import {
  addDaysToDateOnly,
  assertValidAvailabilityDateRange,
  dateOnlyFromDate,
  dateOnlyToUtcDate,
  getBlockingAccommodationIds,
  isDateOnlyString,
} from "@/lib/availability/rules";
import { getAvailabilityBlockingRecords } from "@/lib/availability/service";
import { prisma } from "@/lib/db/prisma";
import type { AdminPropertyOption } from "@/types/admin";
import type {
  AdminCalendarActor,
  AdminCalendarDay,
  AdminCalendarEntry,
  AdminCalendarEntrySource,
  AdminCalendarErrorCode,
  AdminCalendarMutationResult,
  AdminPropertyCalendar,
  CreateAdminManualBlockInput,
  GetAdminPropertyCalendarInput,
  ReleaseAdminManualBlockDayInput,
} from "@/types/admin-calendar";
import type { AvailabilityDateRange, DateOnlyString } from "@/types/availability";

const CALENDAR_GRID_DAYS = 42;
const MAX_MANUAL_BLOCK_DAYS = 366;

const propertyCalendarSelect = {
  id: true,
  nameEs: true,
  nameEn: true,
} satisfies Prisma.PropertySelect;

const reservationCalendarSelect = {
  id: true,
  guestName: true,
  guestEmail: true,
  status: true,
} satisfies Prisma.ReservationSelect;

const calendarBlockDetailsSelect = {
  id: true,
  propertyId: true,
  source: true,
  startDate: true,
  endDate: true,
  reason: true,
  reservationId: true,
  externalCalendarEventId: true,
  isAdminOverrideAllowed: true,
  unlockedByAdminAt: true,
  adminOverrideReason: true,
} satisfies Prisma.CalendarBlockSelect;

type PropertyCalendarRecord = Prisma.PropertyGetPayload<{
  select: typeof propertyCalendarSelect;
}>;

type ReservationCalendarRecord = Prisma.ReservationGetPayload<{
  select: typeof reservationCalendarSelect;
}>;

type CalendarBlockDetailsRecord = Prisma.CalendarBlockGetPayload<{
  select: typeof calendarBlockDetailsSelect;
}>;

type AdminCalendarPrismaClient = PrismaClient | Prisma.TransactionClient;

export class AdminCalendarError extends Error {
  constructor(public readonly code: AdminCalendarErrorCode) {
    super(code);
    this.name = "AdminCalendarError";
  }
}

function toPropertyOption(property: PropertyCalendarRecord): AdminPropertyOption {
  return {
    id: property.id,
    nameEs: property.nameEs,
    nameEn: property.nameEn,
  };
}

function parseMonth(month: string): Readonly<{
  month: string;
  startDate: DateOnlyString;
  endDate: DateOnlyString;
}> {
  const match = /^(\d{4})-(\d{2})$/.exec(month);

  if (!match) {
    throw new AdminCalendarError("INVALID_ADMIN_CALENDAR_REQUEST");
  }

  const year = Number(match[1]);
  const monthNumber = Number(match[2]);

  if (monthNumber < 1 || monthNumber > 12) {
    throw new AdminCalendarError("INVALID_ADMIN_CALENDAR_REQUEST");
  }

  const monthStart = new Date(Date.UTC(year, monthNumber - 1, 1));

  if (
    monthStart.getUTCFullYear() !== year ||
    monthStart.getUTCMonth() !== monthNumber - 1
  ) {
    throw new AdminCalendarError("INVALID_ADMIN_CALENDAR_REQUEST");
  }

  const firstDate = dateOnlyFromDate(monthStart);
  const gridStart = addDaysToDateOnly(firstDate, -monthStart.getUTCDay());

  return {
    month,
    startDate: gridStart,
    endDate: addDaysToDateOnly(gridStart, CALENDAR_GRID_DAYS),
  };
}

function enumerateDates(range: AvailabilityDateRange): readonly DateOnlyString[] {
  const dates: DateOnlyString[] = [];

  for (
    let date = range.startDate;
    date < range.endDate;
    date = addDaysToDateOnly(date, 1)
  ) {
    dates.push(date);
  }

  return dates;
}

function normalizeOptionalNote(value: string | null | undefined): string | null {
  const note = value?.trim();
  return note ? note.slice(0, 500) : null;
}

function sourcePriority(source: AdminCalendarEntrySource): number {
  const priorities: Record<AdminCalendarEntrySource, number> = {
    DIRECT_RESERVATION: 0,
    PENDING_PAYMENT: 1,
    AIRBNB: 2,
    MANUAL_BLOCK: 3,
    MAINTENANCE: 4,
    PREPARATION_BUFFER: 5,
    COMPOSED_LISTING_DEPENDENCY: 6,
    PREPARATION_BUFFER_OVERRIDE: 7,
  };

  return priorities[source];
}

function resolveEntrySource(
  source: string,
  reservationStatus: string | undefined,
): AdminCalendarEntrySource {
  if (
    source === CalendarBlockSource.DIRECT_RESERVATION &&
    reservationStatus === ReservationStatus.PENDING_PAYMENT
  ) {
    return "PENDING_PAYMENT";
  }

  return source as AdminCalendarEntrySource;
}

function rangeContainsDate(
  range: AvailabilityDateRange,
  date: DateOnlyString,
): boolean {
  return range.startDate <= date && date < range.endDate;
}

function getDaySpan(startDate: DateOnlyString, endDate: DateOnlyString): number {
  return Math.round(
    (dateOnlyToUtcDate(endDate).getTime() - dateOnlyToUtcDate(startDate).getTime()) /
      86_400_000,
  );
}

export async function getAdminPropertyCalendar(
  input: GetAdminPropertyCalendarInput,
  options: Readonly<{
    prismaClient?: AdminCalendarPrismaClient;
    now?: Date;
  }> = {},
): Promise<AdminPropertyCalendar> {
  if (!isAdminAccommodationId(input.propertyId)) {
    throw new AdminCalendarError("ADMIN_CALENDAR_PROPERTY_NOT_FOUND");
  }

  const prismaClient = options.prismaClient ?? prisma;
  const now = options.now ?? new Date();
  const calendarRange = parseMonth(input.month);
  const today = dateOnlyFromDate(now);
  const properties = await prismaClient.property.findMany({
    where: {
      id: {
        in: [...adminAccommodationIds],
      },
      deletedAt: null,
    },
    select: propertyCalendarSelect,
  });
  const propertyOrder = new Map<string, number>(
    adminAccommodationIds.map((propertyId, index) => [propertyId, index] as const),
  );
  const orderedProperties = [...properties].sort(
    (left, right) =>
      (propertyOrder.get(left.id) ?? Number.MAX_SAFE_INTEGER) -
      (propertyOrder.get(right.id) ?? Number.MAX_SAFE_INTEGER),
  );
  const selectedProperty = orderedProperties.find(
    (property) => property.id === input.propertyId,
  );

  if (!selectedProperty) {
    throw new AdminCalendarError("ADMIN_CALENDAR_PROPERTY_NOT_FOUND");
  }

  const blockingPropertyIds = getBlockingAccommodationIds(input.propertyId);
  const blockingRecords = await getAvailabilityBlockingRecords(
    {
      accommodationId: input.propertyId,
      startDate: calendarRange.startDate,
      endDate: calendarRange.endDate,
    },
    {
      prismaClient,
      now,
    },
  );
  const calendarBlockIds = blockingRecords
    .map((record) => record.calendarBlockId)
    .filter((value): value is string => Boolean(value));
  const [blockingCalendarBlocks, preparationOverrides] = await Promise.all([
    calendarBlockIds.length > 0
      ? prismaClient.calendarBlock.findMany({
          where: {
            id: {
              in: calendarBlockIds,
            },
            deletedAt: null,
          },
          select: calendarBlockDetailsSelect,
        })
      : Promise.resolve([] as CalendarBlockDetailsRecord[]),
    prismaClient.calendarBlock.findMany({
      where: {
        propertyId: {
          in: [...blockingPropertyIds],
        },
        source: CalendarBlockSource.PREPARATION_BUFFER,
        unlockedByAdminAt: {
          not: null,
        },
        deletedAt: null,
        startDate: {
          lt: dateOnlyToUtcDate(calendarRange.endDate),
        },
        endDate: {
          gt: dateOnlyToUtcDate(calendarRange.startDate),
        },
      },
      select: calendarBlockDetailsSelect,
    }),
  ]);
  const reservationIds = new Set<string>();

  blockingRecords.forEach((record) => {
    if (record.reservationId) {
      reservationIds.add(record.reservationId);
    }
  });
  preparationOverrides.forEach((override) => {
    if (override.reservationId) {
      reservationIds.add(override.reservationId);
    }
  });

  const reservations: ReservationCalendarRecord[] =
    reservationIds.size > 0
      ? await prismaClient.reservation.findMany({
          where: {
            id: {
              in: [...reservationIds],
            },
          },
          select: reservationCalendarSelect,
        })
      : [];
  const propertyById = new Map<string, PropertyCalendarRecord>(
    orderedProperties.map((property) => [property.id, property] as const),
  );
  const reservationById = new Map<string, ReservationCalendarRecord>(
    reservations.map((reservation) => [reservation.id, reservation] as const),
  );
  const calendarBlockById = new Map<string, CalendarBlockDetailsRecord>(
    blockingCalendarBlocks.map(
      (calendarBlock) => [calendarBlock.id, calendarBlock] as const,
    ),
  );

  const blockingEntries: AdminCalendarEntry[] = blockingRecords.map(
    (record, index) => {
      const originProperty = propertyById.get(record.accommodationId);
      const reservation = record.reservationId
        ? reservationById.get(record.reservationId)
        : undefined;
      const calendarBlock = record.calendarBlockId
        ? calendarBlockById.get(record.calendarBlockId)
        : undefined;
      const source = resolveEntrySource(record.source, record.reservationStatus);

      return {
        id: record.calendarBlockId
          ? `${record.calendarBlockId}:${record.startDate}:${record.endDate}`
          : `${source}:${record.reservationId ?? "none"}:${record.startDate}:${index}`,
        source,
        blocking: true,
        inherited: record.accommodationId !== input.propertyId,
        originPropertyId: record.accommodationId,
        originPropertyNameEs: originProperty?.nameEs ?? record.accommodationId,
        originPropertyNameEn: originProperty?.nameEn ?? record.accommodationId,
        startDate: record.startDate,
        endDate: record.endDate,
        reservationId: record.reservationId ?? null,
        guestName: reservation?.guestName ?? null,
        guestEmail: reservation?.guestEmail ?? null,
        calendarBlockId: record.calendarBlockId ?? null,
        externalCalendarEventId: record.externalCalendarEventId ?? null,
        note: calendarBlock?.reason ?? record.reason ?? null,
        canUnlockPreparation:
          record.accommodationId === input.propertyId &&
          source === "PREPARATION_BUFFER" &&
          ((record.reservationStatus === ReservationStatus.CONFIRMED &&
            Boolean(record.reservationId)) ||
            Boolean(
              calendarBlock?.isAdminOverrideAllowed &&
                calendarBlock.id,
            )),
        canRestorePreparation: false,
        canReleaseManualDay:
          record.accommodationId === input.propertyId &&
          source === "MANUAL_BLOCK" &&
          Boolean(record.calendarBlockId),
      };
    },
  );

  const overrideEntries: AdminCalendarEntry[] = preparationOverrides.map(
    (override) => {
      const originProperty = propertyById.get(override.propertyId);
      const reservation = override.reservationId
        ? reservationById.get(override.reservationId)
        : undefined;

      return {
        id: `override:${override.id}`,
        source: "PREPARATION_BUFFER_OVERRIDE",
        blocking: false,
        inherited: override.propertyId !== input.propertyId,
        originPropertyId: override.propertyId,
        originPropertyNameEs: originProperty?.nameEs ?? override.propertyId,
        originPropertyNameEn: originProperty?.nameEn ?? override.propertyId,
        startDate: dateOnlyFromDate(override.startDate),
        endDate: dateOnlyFromDate(override.endDate),
        reservationId: override.reservationId,
        guestName: reservation?.guestName ?? null,
        guestEmail: reservation?.guestEmail ?? null,
        calendarBlockId: override.id,
        externalCalendarEventId: override.externalCalendarEventId,
        note: override.adminOverrideReason,
        canUnlockPreparation: false,
        canRestorePreparation: override.propertyId === input.propertyId,
        canReleaseManualDay: false,
      };
    },
  );
  const entries = [...blockingEntries, ...overrideEntries].sort(
    (left, right) => sourcePriority(left.source) - sourcePriority(right.source),
  );
  const days: AdminCalendarDay[] = enumerateDates(calendarRange).map((date) => {
    const dayEntries = entries.filter((entry) =>
      rangeContainsDate(entry, date),
    );
    const blockingCount = dayEntries.filter((entry) => entry.blocking).length;

    return {
      date,
      inCurrentMonth: date.startsWith(`${calendarRange.month}-`),
      isPast: date < today,
      canCreateManualBlock: date >= today && blockingCount === 0,
      blockingCount,
      entries: dayEntries,
    };
  });

  return {
    generatedAt: new Date().toISOString(),
    month: calendarRange.month,
    today,
    range: {
      startDate: calendarRange.startDate,
      endDate: calendarRange.endDate,
    },
    selectedProperty: toPropertyOption(selectedProperty),
    properties: orderedProperties.map(toPropertyOption),
    days,
  };
}

export async function createAdminManualCalendarBlock(
  input: CreateAdminManualBlockInput,
  actor: AdminCalendarActor,
): Promise<AdminCalendarMutationResult> {
  if (
    !isAdminAccommodationId(input.propertyId) ||
    !isDateOnlyString(input.startDate) ||
    !isDateOnlyString(input.endDate)
  ) {
    throw new AdminCalendarError("INVALID_ADMIN_CALENDAR_REQUEST");
  }

  const range = {
    startDate: input.startDate,
    endDate: input.endDate,
  };

  try {
    assertValidAvailabilityDateRange(range);
  } catch {
    throw new AdminCalendarError("INVALID_ADMIN_CALENDAR_REQUEST");
  }

  const today = dateOnlyFromDate(new Date());

  if (input.startDate < today) {
    throw new AdminCalendarError("ADMIN_CALENDAR_DATE_IN_PAST");
  }

  if (getDaySpan(input.startDate, input.endDate) > MAX_MANUAL_BLOCK_DAYS) {
    throw new AdminCalendarError("INVALID_ADMIN_CALENDAR_REQUEST");
  }

  return prisma.$transaction(async (transaction) => {
    const adminActor = await resolveAdminActor(transaction, actor);
    const property = await transaction.property.findFirst({
      where: {
        id: input.propertyId,
        deletedAt: null,
      },
      select: {
        id: true,
      },
    });

    if (!property) {
      throw new AdminCalendarError("ADMIN_CALENDAR_PROPERTY_NOT_FOUND");
    }

    const blockingRecords = await getAvailabilityBlockingRecords(
      {
        accommodationId: input.propertyId,
        startDate: input.startDate,
        endDate: input.endDate,
      },
      {
        prismaClient: transaction,
      },
    );

    if (blockingRecords.length > 0) {
      throw new AdminCalendarError("ADMIN_CALENDAR_RANGE_UNAVAILABLE");
    }

    const requestedStartDate = dateOnlyToUtcDate(input.startDate);
    const requestedEndDate = dateOnlyToUtcDate(input.endDate);
    const mergeCandidates = await transaction.calendarBlock.findMany({
      where: {
        propertyId: property.id,
        source: CalendarBlockSource.MANUAL_BLOCK,
        deletedAt: null,
        startDate: {
          lte: requestedEndDate,
        },
        endDate: {
          gte: requestedStartDate,
        },
      },
      orderBy: {
        startDate: "asc",
      },
      select: {
        id: true,
        startDate: true,
        endDate: true,
        reason: true,
      },
    });
    const coveringBlock = mergeCandidates.find(
      (candidate) =>
        candidate.startDate <= requestedStartDate &&
        candidate.endDate >= requestedEndDate,
    );

    if (coveringBlock) {
      return {
        calendarBlockId: coveringBlock.id,
      };
    }

    const note = normalizeOptionalNote(input.note);
    const mergedStartDate = mergeCandidates.reduce(
      (earliest, candidate) =>
        candidate.startDate < earliest ? candidate.startDate : earliest,
      requestedStartDate,
    );
    const mergedEndDate = mergeCandidates.reduce(
      (latest, candidate) =>
        candidate.endDate > latest ? candidate.endDate : latest,
      requestedEndDate,
    );
    const replacedAt = new Date();

    if (mergeCandidates.length > 0) {
      await transaction.calendarBlock.updateMany({
        where: {
          id: {
            in: mergeCandidates.map((candidate) => candidate.id),
          },
        },
        data: {
          deletedAt: replacedAt,
          deletedById: adminActor.id,
        },
      });
    }

    const calendarBlock = await transaction.calendarBlock.create({
      data: {
        propertyId: property.id,
        startDate: mergedStartDate,
        endDate: mergedEndDate,
        source: CalendarBlockSource.MANUAL_BLOCK,
        reason:
          note ??
          mergeCandidates.find((candidate) => candidate.reason)?.reason ??
          null,
        isAdminOverrideAllowed: true,
      },
      select: {
        id: true,
      },
    });

    await transaction.adminAuditLog.create({
      data: {
        userId: adminActor.id,
        action: "MANUAL_CALENDAR_BLOCK_CREATED",
        entityType: "CalendarBlock",
        entityId: calendarBlock.id,
        metadata: {
          actorEmail: adminActor.email,
          propertyId: property.id,
          requestedStartDate: input.startDate,
          requestedEndDate: input.endDate,
          effectiveStartDate: dateOnlyFromDate(mergedStartDate),
          effectiveEndDate: dateOnlyFromDate(mergedEndDate),
          replacedBlockIds: mergeCandidates.map((candidate) => candidate.id),
          note,
        },
      },
    });

    return {
      calendarBlockId: calendarBlock.id,
    };
  });
}

export async function releaseAdminManualCalendarBlockDay(
  input: ReleaseAdminManualBlockDayInput,
  actor: AdminCalendarActor,
): Promise<AdminCalendarMutationResult> {
  if (!isDateOnlyString(input.date)) {
    throw new AdminCalendarError("INVALID_ADMIN_CALENDAR_REQUEST");
  }

  const today = dateOnlyFromDate(new Date());

  if (input.date < today) {
    throw new AdminCalendarError("ADMIN_CALENDAR_DATE_IN_PAST");
  }

  return prisma.$transaction(async (transaction) => {
    const adminActor = await resolveAdminActor(transaction, actor);
    const block = await transaction.calendarBlock.findFirst({
      where: {
        id: input.calendarBlockId.trim(),
        source: CalendarBlockSource.MANUAL_BLOCK,
        deletedAt: null,
      },
      select: {
        id: true,
        propertyId: true,
        startDate: true,
        endDate: true,
        reason: true,
        isAdminOverrideAllowed: true,
      },
    });

    if (!block) {
      throw new AdminCalendarError(
        "ADMIN_CALENDAR_MANUAL_BLOCK_NOT_FOUND",
      );
    }

    const originalRange = {
      startDate: dateOnlyFromDate(block.startDate),
      endDate: dateOnlyFromDate(block.endDate),
    };

    if (!rangeContainsDate(originalRange, input.date)) {
      throw new AdminCalendarError("ADMIN_CALENDAR_DAY_NOT_IN_BLOCK");
    }

    const releasedAt = new Date();
    const releasedDayEnd = addDaysToDateOnly(input.date, 1);

    await transaction.calendarBlock.update({
      where: {
        id: block.id,
      },
      data: {
        deletedAt: releasedAt,
        deletedById: adminActor.id,
      },
    });

    const replacementRanges: AvailabilityDateRange[] = [];

    if (originalRange.startDate < input.date) {
      replacementRanges.push({
        startDate: originalRange.startDate,
        endDate: input.date,
      });
    }

    if (releasedDayEnd < originalRange.endDate) {
      replacementRanges.push({
        startDate: releasedDayEnd,
        endDate: originalRange.endDate,
      });
    }

    const replacements = await Promise.all(
      replacementRanges.map((replacementRange) =>
        transaction.calendarBlock.create({
          data: {
            propertyId: block.propertyId,
            startDate: dateOnlyToUtcDate(replacementRange.startDate),
            endDate: dateOnlyToUtcDate(replacementRange.endDate),
            source: CalendarBlockSource.MANUAL_BLOCK,
            reason: block.reason,
            isAdminOverrideAllowed: block.isAdminOverrideAllowed,
          },
          select: {
            id: true,
          },
        }),
      ),
    );

    await transaction.adminAuditLog.create({
      data: {
        userId: adminActor.id,
        action: "MANUAL_CALENDAR_BLOCK_DAY_RELEASED",
        entityType: "CalendarBlock",
        entityId: block.id,
        metadata: {
          actorEmail: adminActor.email,
          propertyId: block.propertyId,
          releasedDate: input.date,
          originalRange,
          replacementBlockIds: replacements.map((replacement) => replacement.id),
        },
      },
    });

    return {
      calendarBlockId: block.id,
    };
  });
}
