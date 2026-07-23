import {
  CalendarBlockSource,
  LifecycleRequestHoldStatus,
  ReservationStatus,
  type Prisma,
  type PrismaClient,
} from "@prisma/client";

import { prisma } from "@/lib/db/prisma";
import type { AccommodationId, PreparationBufferPolicy } from "@/types/accommodation";
import type {
  AvailabilityBlockSource,
  AvailabilityBlockingRecord,
  AvailabilityCheckInput,
  AvailabilityCheckResult,
  AvailabilityDateRange,
  ReservationAvailabilityStatus,
} from "@/types/availability";

import {
  addDaysToDateOnly,
  assertValidAvailabilityDateRange,
  availabilityDateRangesOverlap,
  buildPreparationBufferRanges,
  dateOnlyFromDate,
  dateOnlyToUtcDate,
  getAffectedAccommodationIds,
  getBlockingAccommodationIds,
  subtractAvailabilityDateRanges,
} from "./rules";

const LIFECYCLE_HOLD_MAX_PREPARATION_DAYS = 30;

const propertyAvailabilitySelect = {
  id: true,
  preparationDaysBefore: true,
  preparationDaysAfter: true,
} satisfies Prisma.PropertySelect;

const reservationAvailabilitySelect = {
  id: true,
  propertyId: true,
  checkInDate: true,
  checkOutDate: true,
  status: true,
  expiresAt: true,
} satisfies Prisma.ReservationSelect;

const calendarBlockAvailabilitySelect = {
  id: true,
  propertyId: true,
  startDate: true,
  endDate: true,
  source: true,
  reason: true,
  reservationId: true,
  externalCalendarEventId: true,
  parentBlockId: true,
  unlockedByAdminAt: true,
} satisfies Prisma.CalendarBlockSelect;

const lifecycleRequestHoldAvailabilitySelect = {
  id: true,
  lifecycleRequestId: true,
  propertyId: true,
  startDate: true,
  endDate: true,
  preparationDaysBefore: true,
  preparationDaysAfter: true,
  status: true,
  expiresAt: true,
  lifecycleRequest: {
    select: {
      reservationId: true,
    },
  },
} satisfies Prisma.LifecycleRequestHoldSelect;

type PropertyAvailabilityRecord = Prisma.PropertyGetPayload<{
  select: typeof propertyAvailabilitySelect;
}>;

type ReservationAvailabilityRecord = Prisma.ReservationGetPayload<{
  select: typeof reservationAvailabilitySelect;
}>;

type CalendarBlockAvailabilityRecord = Prisma.CalendarBlockGetPayload<{
  select: typeof calendarBlockAvailabilitySelect;
}>;

type LifecycleRequestHoldAvailabilityRecord = Prisma.LifecycleRequestHoldGetPayload<{
  select: typeof lifecycleRequestHoldAvailabilitySelect;
}>;

type AvailabilityPrismaClient = PrismaClient | Prisma.TransactionClient;

type AvailabilityServiceOptions = Readonly<{
  prismaClient?: AvailabilityPrismaClient;
  now?: Date;
}>;

type PropertyAvailabilityMapping = Readonly<{
  propertyId: string;
  accommodationId: AccommodationId;
  preparationBuffer: PreparationBufferPolicy;
}>;

type PreparationBufferLookupWindow = Readonly<{
  startDate: AvailabilityDateRange["startDate"];
  endDate: AvailabilityDateRange["endDate"];
}>;

function assertServerSideAvailabilityService(): void {
  if (typeof window !== "undefined") {
    throw new Error("Availability service must remain server-side only.");
  }
}

function toAccommodationId(value: string): AccommodationId {
  const accommodationIds: readonly AccommodationId[] = [
    "black-white-apartment",
    "perfect-retreat-bungalow",
    "complete-retreat",
  ];

  if (!accommodationIds.includes(value as AccommodationId)) {
    throw new Error(`Unsupported accommodation id in database: ${value}.`);
  }

  return value as AccommodationId;
}

async function resolvePropertyMappings(
  prismaClient: AvailabilityPrismaClient,
  accommodationIds: readonly AccommodationId[],
): Promise<readonly PropertyAvailabilityMapping[]> {
  const properties: PropertyAvailabilityRecord[] = await prismaClient.property.findMany({
    where: {
      deletedAt: null,
      id: {
        in: [...accommodationIds],
      },
    },
    select: propertyAvailabilitySelect,
  });

  const foundPropertyIds = new Set(properties.map((property) => property.id));
  const missingAccommodationIds = accommodationIds.filter(
    (accommodationId) => !foundPropertyIds.has(accommodationId),
  );

  if (missingAccommodationIds.length > 0) {
    throw new Error(
      `Availability cannot be evaluated because property records are missing for: ${missingAccommodationIds.join(
        ", ",
      )}. Run npm run db:seed before checking availability.`,
    );
  }

  return properties.map((property) => ({
    propertyId: property.id,
    accommodationId: toAccommodationId(property.id),
    preparationBuffer: {
      daysBefore: property.preparationDaysBefore,
      daysAfter: property.preparationDaysAfter,
    },
  }));
}

function toDateOnlyRange(startDate: Date, endDate: Date): AvailabilityDateRange {
  return {
    startDate: dateOnlyFromDate(startDate),
    endDate: dateOnlyFromDate(endDate),
  };
}

function isPreparationBufferOverride(
  calendarBlock: CalendarBlockAvailabilityRecord,
): boolean {
  return (
    calendarBlock.source === CalendarBlockSource.PREPARATION_BUFFER &&
    Boolean(calendarBlock.unlockedByAdminAt)
  );
}

function isOverrideForPersistedPreparationBuffer(
  override: CalendarBlockAvailabilityRecord,
  persistedBuffer: CalendarBlockAvailabilityRecord,
): boolean {
  if (!isPreparationBufferOverride(override)) {
    return false;
  }

  if (override.propertyId !== persistedBuffer.propertyId) {
    return false;
  }

  if (persistedBuffer.reservationId) {
    return override.reservationId === persistedBuffer.reservationId;
  }

  if (persistedBuffer.externalCalendarEventId) {
    return (
      override.externalCalendarEventId === persistedBuffer.externalCalendarEventId &&
      override.parentBlockId === persistedBuffer.parentBlockId
    );
  }

  return false;
}

function isReservationBlockingAvailability(
  reservation: ReservationAvailabilityRecord,
  now: Date,
): boolean {
  if (reservation.status === ReservationStatus.CONFIRMED) {
    return true;
  }

  return (
    reservation.status === ReservationStatus.PENDING_PAYMENT &&
    Boolean(reservation.expiresAt && reservation.expiresAt > now)
  );
}

function isLifecycleRequestHoldBlockingAvailability(
  hold: LifecycleRequestHoldAvailabilityRecord,
  now: Date,
): boolean {
  return hold.status === LifecycleRequestHoldStatus.ACTIVE && hold.expiresAt > now;
}

function toReservationAvailabilityStatus(
  status: ReservationAvailabilityRecord["status"],
): ReservationAvailabilityStatus {
  if (status === ReservationStatus.CONFIRMED) {
    return ReservationStatus.CONFIRMED;
  }

  if (status === ReservationStatus.PENDING_PAYMENT) {
    return ReservationStatus.PENDING_PAYMENT;
  }

  throw new Error(`Unsupported reservation availability status: ${status}.`);
}

function toAvailabilityBlockSource(
  source: CalendarBlockAvailabilityRecord["source"],
): AvailabilityBlockSource {
  return source;
}

function getPreparationBufferLookupWindow(
  requestedRange: AvailabilityDateRange,
  propertyMappings: readonly PropertyAvailabilityMapping[],
): PreparationBufferLookupWindow {
  const maxPreparationDays = propertyMappings.reduce(
    (currentMax, mapping) => ({
      daysBefore: Math.max(
        currentMax.daysBefore,
        mapping.preparationBuffer.daysBefore,
      ),
      daysAfter: Math.max(
        currentMax.daysAfter,
        mapping.preparationBuffer.daysAfter,
      ),
    }),
    {
      daysBefore: 0,
      daysAfter: 0,
    },
  );

  return {
    startDate: addDaysToDateOnly(
      requestedRange.startDate,
      -maxPreparationDays.daysAfter,
    ),
    endDate: addDaysToDateOnly(
      requestedRange.endDate,
      maxPreparationDays.daysBefore,
    ),
  };
}

function getLifecycleHoldLookupWindow(
  requestedRange: AvailabilityDateRange,
): PreparationBufferLookupWindow {
  return {
    startDate: addDaysToDateOnly(
      requestedRange.startDate,
      -LIFECYCLE_HOLD_MAX_PREPARATION_DAYS,
    ),
    endDate: addDaysToDateOnly(
      requestedRange.endDate,
      LIFECYCLE_HOLD_MAX_PREPARATION_DAYS,
    ),
  };
}

function toReservationBlockingRecord(
  reservation: ReservationAvailabilityRecord,
  propertyIdToAccommodationId: ReadonlyMap<string, AccommodationId>,
  fallbackAccommodationId: AccommodationId,
): AvailabilityBlockingRecord {
  return {
    accommodationId:
      propertyIdToAccommodationId.get(reservation.propertyId) ??
      fallbackAccommodationId,
    ...toDateOnlyRange(reservation.checkInDate, reservation.checkOutDate),
    source: CalendarBlockSource.DIRECT_RESERVATION,
    reason: reservation.status,
    reservationId: reservation.id,
    reservationStatus: toReservationAvailabilityStatus(reservation.status),
  };
}

function toLifecycleRequestHoldBlockingRecord(
  hold: LifecycleRequestHoldAvailabilityRecord,
  effectiveRange: AvailabilityDateRange,
  propertyIdToAccommodationId: ReadonlyMap<string, AccommodationId>,
  fallbackAccommodationId: AccommodationId,
  reason: string,
): AvailabilityBlockingRecord {
  return {
    accommodationId:
      propertyIdToAccommodationId.get(hold.propertyId) ?? fallbackAccommodationId,
    ...effectiveRange,
    source: "LIFECYCLE_REQUEST_HOLD",
    reason,
    reservationId: hold.lifecycleRequest.reservationId,
    lifecycleRequestId: hold.lifecycleRequestId,
    lifecycleRequestHoldId: hold.id,
  };
}

function toCalendarBlockBlockingRecord(
  calendarBlock: CalendarBlockAvailabilityRecord,
  effectiveRange: AvailabilityDateRange,
  propertyIdToAccommodationId: ReadonlyMap<string, AccommodationId>,
  fallbackAccommodationId: AccommodationId,
): AvailabilityBlockingRecord {
  return {
    accommodationId:
      propertyIdToAccommodationId.get(calendarBlock.propertyId) ??
      fallbackAccommodationId,
    ...effectiveRange,
    source: toAvailabilityBlockSource(calendarBlock.source),
    reason: calendarBlock.reason ?? undefined,
    reservationId: calendarBlock.reservationId ?? undefined,
    calendarBlockId: calendarBlock.id,
    externalCalendarEventId: calendarBlock.externalCalendarEventId ?? undefined,
  };
}

function toEffectiveCalendarBlockBlockingRecords(
  calendarBlock: CalendarBlockAvailabilityRecord,
  calendarBlocks: readonly CalendarBlockAvailabilityRecord[],
  propertyIdToAccommodationId: ReadonlyMap<string, AccommodationId>,
  fallbackAccommodationId: AccommodationId,
): readonly AvailabilityBlockingRecord[] {
  if (isPreparationBufferOverride(calendarBlock)) {
    return [];
  }

  const sourceRange = toDateOnlyRange(
    calendarBlock.startDate,
    calendarBlock.endDate,
  );

  if (calendarBlock.source !== CalendarBlockSource.PREPARATION_BUFFER) {
    return [
      toCalendarBlockBlockingRecord(
        calendarBlock,
        sourceRange,
        propertyIdToAccommodationId,
        fallbackAccommodationId,
      ),
    ];
  }

  const suppressionRanges = calendarBlocks
    .filter((candidate) =>
      isOverrideForPersistedPreparationBuffer(candidate, calendarBlock),
    )
    .map((override) =>
      toDateOnlyRange(override.startDate, override.endDate),
    );

  return subtractAvailabilityDateRanges(sourceRange, suppressionRanges).map(
    (effectiveRange) =>
      toCalendarBlockBlockingRecord(
        calendarBlock,
        effectiveRange,
        propertyIdToAccommodationId,
        fallbackAccommodationId,
      ),
  );
}

function getPreparationBufferSuppressionRanges(
  reservation: ReservationAvailabilityRecord,
  calendarBlocks: readonly CalendarBlockAvailabilityRecord[],
): readonly AvailabilityDateRange[] {
  return calendarBlocks
    .filter(
      (calendarBlock) =>
        calendarBlock.propertyId === reservation.propertyId &&
        calendarBlock.source === CalendarBlockSource.PREPARATION_BUFFER &&
        calendarBlock.reservationId === reservation.id,
    )
    .map((calendarBlock) =>
      toDateOnlyRange(calendarBlock.startDate, calendarBlock.endDate),
    );
}

function toDerivedPreparationBufferBlockingRecords(
  reservation: ReservationAvailabilityRecord,
  requestedRange: AvailabilityDateRange,
  propertyIdToAccommodationId: ReadonlyMap<string, AccommodationId>,
  propertyIdToPreparationBuffer: ReadonlyMap<string, PreparationBufferPolicy>,
  fallbackAccommodationId: AccommodationId,
  calendarBlocks: readonly CalendarBlockAvailabilityRecord[],
): readonly AvailabilityBlockingRecord[] {
  const accommodationId =
    propertyIdToAccommodationId.get(reservation.propertyId) ??
    fallbackAccommodationId;
  const preparationBuffer = propertyIdToPreparationBuffer.get(
    reservation.propertyId,
  );

  if (!preparationBuffer) {
    return [];
  }

  const stayRange = toDateOnlyRange(
    reservation.checkInDate,
    reservation.checkOutDate,
  );
  const suppressionRanges = getPreparationBufferSuppressionRanges(
    reservation,
    calendarBlocks,
  );

  return buildPreparationBufferRanges(
    accommodationId,
    stayRange,
    preparationBuffer,
  ).flatMap((bufferRange) =>
    subtractAvailabilityDateRanges(bufferRange, suppressionRanges)
      .filter((effectiveRange) =>
        availabilityDateRangesOverlap(requestedRange, effectiveRange),
      )
      .map((effectiveRange) => ({
        accommodationId: bufferRange.accommodationId,
        startDate: effectiveRange.startDate,
        endDate: effectiveRange.endDate,
        source: CalendarBlockSource.PREPARATION_BUFFER,
        reason: `Derived ${bufferRange.kind} preparation buffer (${bufferRange.days} day${
          bufferRange.days === 1 ? "" : "s"
        }).`,
        reservationId: reservation.id,
        reservationStatus: toReservationAvailabilityStatus(reservation.status),
      })),
  );
}

function toDerivedLifecycleHoldPreparationBufferBlockingRecords(
  hold: LifecycleRequestHoldAvailabilityRecord,
  requestedRange: AvailabilityDateRange,
  propertyIdToAccommodationId: ReadonlyMap<string, AccommodationId>,
  fallbackAccommodationId: AccommodationId,
): readonly AvailabilityBlockingRecord[] {
  const accommodationId =
    propertyIdToAccommodationId.get(hold.propertyId) ?? fallbackAccommodationId;
  const holdRange = toDateOnlyRange(hold.startDate, hold.endDate);
  const preparationBuffer: PreparationBufferPolicy = {
    daysBefore: hold.preparationDaysBefore,
    daysAfter: hold.preparationDaysAfter,
  };

  return buildPreparationBufferRanges(
    accommodationId,
    holdRange,
    preparationBuffer,
  )
    .filter((bufferRange) =>
      availabilityDateRangesOverlap(requestedRange, bufferRange),
    )
    .map((bufferRange) =>
      toLifecycleRequestHoldBlockingRecord(
        hold,
        bufferRange,
        propertyIdToAccommodationId,
        fallbackAccommodationId,
        `Lifecycle request ${bufferRange.kind} preparation buffer (${bufferRange.days} day${
          bufferRange.days === 1 ? "" : "s"
        }).`,
      ),
    );
}

export async function getAvailabilityBlockingRecords(
  input: AvailabilityCheckInput,
  options: AvailabilityServiceOptions = {},
): Promise<readonly AvailabilityBlockingRecord[]> {
  assertServerSideAvailabilityService();
  assertValidAvailabilityDateRange(input);

  const prismaClient = options.prismaClient ?? prisma;
  const now = options.now ?? new Date();
  const requestedRange: AvailabilityDateRange = {
    startDate: input.startDate,
    endDate: input.endDate,
  };
  const requestedStartDate = dateOnlyToUtcDate(input.startDate);
  const requestedEndDate = dateOnlyToUtcDate(input.endDate);
  const blockingAccommodationIds = getBlockingAccommodationIds(
    input.accommodationId,
  );
  const propertyMappings = await resolvePropertyMappings(
    prismaClient,
    blockingAccommodationIds,
  );
  const propertyIdToAccommodationId = new Map(
    propertyMappings.map((mapping) => [
      mapping.propertyId,
      mapping.accommodationId,
    ]),
  );
  const propertyIdToPreparationBuffer = new Map(
    propertyMappings.map((mapping) => [
      mapping.propertyId,
      mapping.preparationBuffer,
    ]),
  );
  const blockingPropertyIds = propertyMappings.map(
    (mapping) => mapping.propertyId,
  );
  const preparationLookupWindow = getPreparationBufferLookupWindow(
    requestedRange,
    propertyMappings,
  );
  const lifecycleHoldLookupWindow = getLifecycleHoldLookupWindow(requestedRange);

  const [reservations, calendarBlocks, lifecycleRequestHolds]: [
    ReservationAvailabilityRecord[],
    CalendarBlockAvailabilityRecord[],
    LifecycleRequestHoldAvailabilityRecord[],
  ] = await Promise.all([
    prismaClient.reservation.findMany({
      where: {
        ...(input.excludeReservationId
          ? {
              id: {
                not: input.excludeReservationId,
              },
            }
          : {}),
        propertyId: {
          in: blockingPropertyIds,
        },
        checkInDate: {
          lt: dateOnlyToUtcDate(preparationLookupWindow.endDate),
        },
        checkOutDate: {
          gt: dateOnlyToUtcDate(preparationLookupWindow.startDate),
        },
        OR: [
          {
            status: ReservationStatus.CONFIRMED,
          },
          {
            status: ReservationStatus.PENDING_PAYMENT,
            expiresAt: {
              gt: now,
            },
          },
        ],
      },
      select: reservationAvailabilitySelect,
    }),
    prismaClient.calendarBlock.findMany({
      where: {
        propertyId: {
          in: blockingPropertyIds,
        },
        deletedAt: null,
        startDate: {
          lt: requestedEndDate,
        },
        endDate: {
          gt: requestedStartDate,
        },
      },
      select: calendarBlockAvailabilitySelect,
    }),
    prismaClient.lifecycleRequestHold.findMany({
      where: {
        ...(input.excludeLifecycleRequestId
          ? {
              lifecycleRequestId: {
                not: input.excludeLifecycleRequestId,
              },
            }
          : {}),
        propertyId: {
          in: blockingPropertyIds,
        },
        status: LifecycleRequestHoldStatus.ACTIVE,
        expiresAt: {
          gt: now,
        },
        startDate: {
          lt: dateOnlyToUtcDate(lifecycleHoldLookupWindow.endDate),
        },
        endDate: {
          gt: dateOnlyToUtcDate(lifecycleHoldLookupWindow.startDate),
        },
      },
      select: lifecycleRequestHoldAvailabilitySelect,
    }),
  ]);

  const blockingReservations = reservations.filter((reservation) =>
    isReservationBlockingAvailability(reservation, now),
  );
  const blockingLifecycleRequestHolds = lifecycleRequestHolds.filter((hold) =>
    isLifecycleRequestHoldBlockingAvailability(hold, now),
  );

  const reservationBlockingRecords = blockingReservations
    .filter((reservation) =>
      availabilityDateRangesOverlap(
        requestedRange,
        toDateOnlyRange(reservation.checkInDate, reservation.checkOutDate),
      ),
    )
    .map((reservation) =>
      toReservationBlockingRecord(
        reservation,
        propertyIdToAccommodationId,
        input.accommodationId,
      ),
    );

  const derivedPreparationBufferBlockingRecords = blockingReservations.flatMap(
    (reservation) =>
      toDerivedPreparationBufferBlockingRecords(
        reservation,
        requestedRange,
        propertyIdToAccommodationId,
        propertyIdToPreparationBuffer,
        input.accommodationId,
        calendarBlocks,
      ),
  );

  const lifecycleRequestHoldBlockingRecords = blockingLifecycleRequestHolds
    .filter((hold) =>
      availabilityDateRangesOverlap(
        requestedRange,
        toDateOnlyRange(hold.startDate, hold.endDate),
      ),
    )
    .map((hold) =>
      toLifecycleRequestHoldBlockingRecord(
        hold,
        toDateOnlyRange(hold.startDate, hold.endDate),
        propertyIdToAccommodationId,
        input.accommodationId,
        "Active lifecycle request hold.",
      ),
    );

  const lifecycleRequestHoldPreparationBufferBlockingRecords =
    blockingLifecycleRequestHolds.flatMap((hold) =>
      toDerivedLifecycleHoldPreparationBufferBlockingRecords(
        hold,
        requestedRange,
        propertyIdToAccommodationId,
        input.accommodationId,
      ),
    );

  const calendarBlockBlockingRecords = calendarBlocks.flatMap(
    (calendarBlock) =>
      toEffectiveCalendarBlockBlockingRecords(
        calendarBlock,
        calendarBlocks,
        propertyIdToAccommodationId,
        input.accommodationId,
      ),
  );

  return [
    ...reservationBlockingRecords,
    ...derivedPreparationBufferBlockingRecords,
    ...lifecycleRequestHoldBlockingRecords,
    ...lifecycleRequestHoldPreparationBufferBlockingRecords,
    ...calendarBlockBlockingRecords,
  ];
}

export async function checkAccommodationAvailability(
  input: AvailabilityCheckInput,
  options: AvailabilityServiceOptions = {},
): Promise<AvailabilityCheckResult> {
  const requestedRange: AvailabilityDateRange = {
    startDate: input.startDate,
    endDate: input.endDate,
  };
  const blockingRecords = await getAvailabilityBlockingRecords(input, options);

  return {
    accommodationId: input.accommodationId,
    requestedRange,
    available: blockingRecords.length === 0,
    affectedAccommodationIds: getAffectedAccommodationIds(input.accommodationId),
    blockingAccommodationIds: getBlockingAccommodationIds(input.accommodationId),
    blockingRecords,
  };
}
