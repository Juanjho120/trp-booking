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
  ReservationAvailabilityStatus,
} from "@/types/availability";

import {
  assertValidAvailabilityDateRange,
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

export async function getAvailabilityBlockingRecords(
  input: AvailabilityCheckInput,
  options: AvailabilityServiceOptions = {},
): Promise<readonly AvailabilityBlockingRecord[]> {
  assertServerSideAvailabilityService();
  assertValidAvailabilityDateRange(input);

  const prismaClient = options.prismaClient ?? prisma;
  const now = options.now ?? new Date();
  const requestedStartDate = dateOnlyToUtcDate(input.startDate);
  const requestedEndDate = dateOnlyToUtcDate(input.endDate);
  const blockingAccommodationIds = getBlockingAccommodationIds(input.accommodationId);
  const propertyMappings = await resolvePropertyMappings(prismaClient, blockingAccommodationIds);
  const propertyIdToAccommodationId = new Map(
    propertyMappings.map((mapping) => [mapping.propertyId, mapping.accommodationId]),
  );
  const blockingPropertyIds = propertyMappings.map((mapping) => mapping.propertyId);

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
          lt: requestedEndDate,
        },
        checkOutDate: {
          gt: requestedStartDate,
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

  const reservationBlockingRecords = reservations.map((reservation) =>
    toReservationBlockingRecord(reservation, propertyIdToAccommodationId, input.accommodationId),
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

  return [...reservationBlockingRecords, ...calendarBlockBlockingRecords];
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
