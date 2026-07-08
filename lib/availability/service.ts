import {
  CalendarBlockSource,
  ReservationStatus,
  type Prisma,
  type PrismaClient,
} from "@prisma/client";

import { getAccommodationById } from "@/config/accommodations";
import { prisma } from "@/lib/db/prisma";
import type { AccommodationId } from "@/types/accommodation";
import type {
  AvailabilityBlockSource,
  AvailabilityBlockingRecord,
  AvailabilityCheckInput,
  AvailabilityCheckResult,
  AvailabilityDateRange,
  PreparationBufferDateRange,
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
} from "./rules";

const propertyAvailabilitySelect = {
  id: true,
  slug: true,
} satisfies Prisma.PropertySelect;

const reservationAvailabilitySelect = {
  id: true,
  propertyId: true,
  checkInDate: true,
  checkOutDate: true,
  status: true,
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

type AvailabilityServiceOptions = Readonly<{
  prismaClient?: PrismaClient;
  now?: Date;
}>;

type PropertyAvailabilityMapping = Readonly<{
  propertyId: string;
  accommodationId: AccommodationId;
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

function getAccommodationSlug(accommodationId: AccommodationId): string {
  const accommodation = getAccommodationById(accommodationId);

  if (!accommodation) {
    throw new Error(`Accommodation not found for ${accommodationId}.`);
  }

  return accommodation.slug.es;
}

function getAccommodationIdBySlug(slug: string): AccommodationId {
  const accommodationIds: readonly AccommodationId[] = [
    "black-white-apartment",
    "perfect-retreat-bungalow",
    "complete-retreat",
  ];

  const accommodation = accommodationIds
    .map((candidateId) => getAccommodationById(candidateId))
    .find((candidate) => candidate?.slug.es === slug);

  if (!accommodation) {
    throw new Error(`Accommodation config not found for property slug ${slug}.`);
  }

  return accommodation.id;
}

async function resolvePropertyMappings(
  prismaClient: PrismaClient,
  accommodationIds: readonly AccommodationId[],
): Promise<readonly PropertyAvailabilityMapping[]> {
  const expectedSlugs = accommodationIds.map(getAccommodationSlug);
  const properties: PropertyAvailabilityRecord[] = await prismaClient.property.findMany({
    where: {
      deletedAt: null,
      slug: {
        in: expectedSlugs,
      },
    },
    select: propertyAvailabilitySelect,
  });

  const foundSlugs = new Set(properties.map((property) => property.slug));
  const missingSlugs = expectedSlugs.filter((slug) => !foundSlugs.has(slug));

  if (missingSlugs.length > 0) {
    throw new Error(
      `Availability cannot be evaluated because property records are missing for: ${missingSlugs.join(
        ", ",
      )}.`,
    );
  }

  return properties.map((property) => ({
    propertyId: property.id,
    accommodationId: getAccommodationIdBySlug(property.slug),
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
  accommodationIds: readonly AccommodationId[],
): PreparationBufferLookupWindow {
  const maxPreparationDays = accommodationIds.reduce(
    (currentMax, accommodationId) => {
      const accommodation = getAccommodationById(accommodationId);

      if (!accommodation) {
        throw new Error(`Accommodation not found for ${accommodationId}.`);
      }

      return {
        daysBefore: Math.max(currentMax.daysBefore, accommodation.preparationBuffer.daysBefore),
        daysAfter: Math.max(currentMax.daysAfter, accommodation.preparationBuffer.daysAfter),
      };
    },
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

function hasPersistedPreparationBufferForRange(
  reservation: ReservationAvailabilityRecord,
  bufferRange: PreparationBufferDateRange,
  calendarBlocks: readonly CalendarBlockAvailabilityRecord[],
): boolean {
  return calendarBlocks.some((calendarBlock) => {
    if (calendarBlock.propertyId !== reservation.propertyId) {
      return false;
    }

    if (calendarBlock.source !== CalendarBlockSource.PREPARATION_BUFFER) {
      return false;
    }

    if (calendarBlock.reservationId && calendarBlock.reservationId !== reservation.id) {
      return false;
    }

    return availabilityDateRangesOverlap(
      bufferRange,
      toDateOnlyRange(calendarBlock.startDate, calendarBlock.endDate),
    );
  });
}

function toDerivedPreparationBufferBlockingRecords(
  reservation: ReservationAvailabilityRecord,
  requestedRange: AvailabilityDateRange,
  propertyIdToAccommodationId: ReadonlyMap<string, AccommodationId>,
  fallbackAccommodationId: AccommodationId,
  calendarBlocks: readonly CalendarBlockAvailabilityRecord[],
): readonly AvailabilityBlockingRecord[] {
  if (reservation.status !== ReservationStatus.CONFIRMED) {
    return [];
  }

  const accommodationId =
    propertyIdToAccommodationId.get(reservation.propertyId) ?? fallbackAccommodationId;
  const stayRange = toDateOnlyRange(reservation.checkInDate, reservation.checkOutDate);

  return buildPreparationBufferRanges(accommodationId, stayRange)
    .filter((bufferRange) => availabilityDateRangesOverlap(requestedRange, bufferRange))
    .filter(
      (bufferRange) =>
        !hasPersistedPreparationBufferForRange(reservation, bufferRange, calendarBlocks),
    )
    .map((bufferRange) => ({
      accommodationId: bufferRange.accommodationId,
      startDate: bufferRange.startDate,
      endDate: bufferRange.endDate,
      source: CalendarBlockSource.PREPARATION_BUFFER,
      reason: `Derived ${bufferRange.kind} preparation buffer (${bufferRange.days} day${
        bufferRange.days === 1 ? "" : "s"
      }).`,
      reservationId: reservation.id,
    }));
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
  const blockingPropertyIds = propertyMappings.map((mapping) => mapping.propertyId);
  const preparationLookupWindow = getPreparationBufferLookupWindow(
    requestedRange,
    blockingAccommodationIds,
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
            OR: [
              {
                expiresAt: null,
              },
              {
                expiresAt: {
                  gt: now,
                },
              },
            ],
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

  const reservationBlockingRecords = reservations
    .filter((reservation) =>
      availabilityDateRangesOverlap(
        requestedRange,
        toDateOnlyRange(reservation.checkInDate, reservation.checkOutDate),
      ),
    )
    .map((reservation) =>
      toReservationBlockingRecord(reservation, propertyIdToAccommodationId, input.accommodationId),
    );

  const derivedPreparationBufferBlockingRecords = reservations.flatMap((reservation) =>
    toDerivedPreparationBufferBlockingRecords(
      reservation,
      requestedRange,
      propertyIdToAccommodationId,
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
