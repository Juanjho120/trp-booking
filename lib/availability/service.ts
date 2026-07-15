import {
  CalendarBlockSource,
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
  unlockedByAdminAt: true,
} satisfies Prisma.CalendarBlockSelect;

type PropertyAvailabilityRecord = Prisma.PropertyGetPayload<{
  select: typeof propertyAvailabilitySelect;
}>;

type ReservationAvailabilityRecord = Prisma.ReservationGetPayload<{
  select: typeof reservationAvailabilitySelect;
}>;

type CalendarBlockAvailabilityRecord = Prisma.CalendarBlockGetPayload<{
  select: typeof calendarBlockAvailabilitySelect;
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

function shouldUseCalendarBlock(calendarBlock: CalendarBlockAvailabilityRecord): boolean {
  if (
    calendarBlock.source === CalendarBlockSource.PREPARATION_BUFFER &&
    calendarBlock.unlockedByAdminAt
  ) {
    return false;
  }

  return true;
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
      daysBefore: Math.max(currentMax.daysBefore, mapping.preparationBuffer.daysBefore),
      daysAfter: Math.max(currentMax.daysAfter, mapping.preparationBuffer.daysAfter),
    }),
    {
      daysBefore: 0,
      daysAfter: 0,
    },
  );

  return {
    startDate: addDaysToDateOnly(requestedRange.startDate, -maxPreparationDays.daysAfter),
    endDate: addDaysToDateOnly(requestedRange.endDate, maxPreparationDays.daysBefore),
  };
}

function toReservationBlockingRecord(
  reservation: ReservationAvailabilityRecord,
  propertyIdToAccommodationId: ReadonlyMap<string, AccommodationId>,
  fallbackAccommodationId: AccommodationId,
): AvailabilityBlockingRecord {
  return {
    accommodationId:
      propertyIdToAccommodationId.get(reservation.propertyId) ?? fallbackAccommodationId,
    ...toDateOnlyRange(reservation.checkInDate, reservation.checkOutDate),
    source: CalendarBlockSource.DIRECT_RESERVATION,
    reason: reservation.status,
    reservationId: reservation.id,
    reservationStatus: toReservationAvailabilityStatus(reservation.status),
  };
}

function toCalendarBlockBlockingRecord(
  calendarBlock: CalendarBlockAvailabilityRecord,
  propertyIdToAccommodationId: ReadonlyMap<string, AccommodationId>,
  fallbackAccommodationId: AccommodationId,
): AvailabilityBlockingRecord {
  return {
    accommodationId:
      propertyIdToAccommodationId.get(calendarBlock.propertyId) ?? fallbackAccommodationId,
    ...toDateOnlyRange(calendarBlock.startDate, calendarBlock.endDate),
    source: toAvailabilityBlockSource(calendarBlock.source),
    reason: calendarBlock.reason ?? undefined,
    reservationId: calendarBlock.reservationId ?? undefined,
    calendarBlockId: calendarBlock.id,
    externalCalendarEventId: calendarBlock.externalCalendarEventId ?? undefined,
  };
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
    propertyIdToAccommodationId.get(reservation.propertyId) ?? fallbackAccommodationId;
  const preparationBuffer = propertyIdToPreparationBuffer.get(reservation.propertyId);

  if (!preparationBuffer) {
    return [];
  }

  const stayRange = toDateOnlyRange(reservation.checkInDate, reservation.checkOutDate);
  const suppressionRanges = getPreparationBufferSuppressionRanges(
    reservation,
    calendarBlocks,
  );

  return buildPreparationBufferRanges(accommodationId, stayRange, preparationBuffer).flatMap(
    (bufferRange) =>
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
  const blockingAccommodationIds = getBlockingAccommodationIds(input.accommodationId);
  const propertyMappings = await resolvePropertyMappings(prismaClient, blockingAccommodationIds);
  const propertyIdToAccommodationId = new Map(
    propertyMappings.map((mapping) => [mapping.propertyId, mapping.accommodationId]),
  );
  const propertyIdToPreparationBuffer = new Map(
    propertyMappings.map((mapping) => [mapping.propertyId, mapping.preparationBuffer]),
  );
  const blockingPropertyIds = propertyMappings.map((mapping) => mapping.propertyId);
  const preparationLookupWindow = getPreparationBufferLookupWindow(
    requestedRange,
    propertyMappings,
  );

  const [reservations, calendarBlocks]: [
    ReservationAvailabilityRecord[],
    CalendarBlockAvailabilityRecord[],
  ] = await Promise.all([
    prismaClient.reservation.findMany({
      where: {
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
  ]);

  const blockingReservations = reservations.filter((reservation) =>
    isReservationBlockingAvailability(reservation, now),
  );

  const reservationBlockingRecords = blockingReservations
    .filter((reservation) =>
      availabilityDateRangesOverlap(
        requestedRange,
        toDateOnlyRange(reservation.checkInDate, reservation.checkOutDate),
      ),
    )
    .map((reservation) =>
      toReservationBlockingRecord(reservation, propertyIdToAccommodationId, input.accommodationId),
    );

  const derivedPreparationBufferBlockingRecords = blockingReservations.flatMap((reservation) =>
    toDerivedPreparationBufferBlockingRecords(
      reservation,
      requestedRange,
      propertyIdToAccommodationId,
      propertyIdToPreparationBuffer,
      input.accommodationId,
      calendarBlocks,
    ),
  );

  const calendarBlockBlockingRecords = calendarBlocks
    .filter(shouldUseCalendarBlock)
    .map((calendarBlock) =>
      toCalendarBlockBlockingRecord(
        calendarBlock,
        propertyIdToAccommodationId,
        input.accommodationId,
      ),
    );

  return [
    ...reservationBlockingRecords,
    ...derivedPreparationBufferBlockingRecords,
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
