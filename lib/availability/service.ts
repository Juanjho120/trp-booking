import type { PrismaClient } from "@prisma/client";

import { getAccommodationById } from "@/config/accommodations";
import { prisma } from "@/lib/db/prisma";
import type { AccommodationId } from "@/types/accommodation";
import type {
  AvailabilityBlockingRecord,
  AvailabilityCheckInput,
  AvailabilityCheckResult,
  AvailabilityDateRange,
  DateOnlyString,
} from "@/types/availability";

import {
  assertValidAvailabilityDateRange,
  dateOnlyFromDate,
  dateOnlyToUtcDate,
  getAffectedAccommodationIds,
  getBlockingAccommodationIds,
} from "./rules";

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
  const properties = await prismaClient.property.findMany({
    where: {
      deletedAt: null,
      slug: {
        in: expectedSlugs,
      },
    },
    select: {
      id: true,
      slug: true,
    },
  });

  const foundSlugs = new Set(properties.map((property) => property.slug));
  const missingSlugs = expectedSlugs.filter((slug) => !foundSlugs.has(slug));

  if (missingSlugs.length > 0) {
    throw new Error(
      `Availability cannot be evaluated because property records are missing for: ${missingSlugs.join(", ")}.`,
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

function shouldUseCalendarBlock(source: string, unlockedByAdminAt: Date | null): boolean {
  if (source === "PREPARATION_BUFFER" && unlockedByAdminAt) {
    return false;
  }

  return true;
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

  const [reservations, calendarBlocks] = await Promise.all([
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
            status: "CONFIRMED",
          },
          {
            status: "PENDING_PAYMENT",
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
      select: {
        id: true,
        propertyId: true,
        checkInDate: true,
        checkOutDate: true,
        status: true,
      },
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
      select: {
        id: true,
        propertyId: true,
        startDate: true,
        endDate: true,
        source: true,
        reason: true,
        reservationId: true,
        externalCalendarEventId: true,
        unlockedByAdminAt: true,
      },
    }),
  ]);

  const reservationBlockingRecords: AvailabilityBlockingRecord[] = reservations.map((reservation) => ({
    accommodationId: propertyIdToAccommodationId.get(reservation.propertyId) ?? input.accommodationId,
    ...toDateOnlyRange(reservation.checkInDate, reservation.checkOutDate),
    source: "DIRECT_RESERVATION",
    reason: reservation.status,
    reservationId: reservation.id,
    reservationStatus: reservation.status as AvailabilityBlockingRecord["reservationStatus"],
  }));

  const calendarBlockBlockingRecords: AvailabilityBlockingRecord[] = calendarBlocks
    .filter((calendarBlock) =>
      shouldUseCalendarBlock(calendarBlock.source, calendarBlock.unlockedByAdminAt),
    )
    .map((calendarBlock) => ({
      accommodationId: propertyIdToAccommodationId.get(calendarBlock.propertyId) ?? input.accommodationId,
      ...toDateOnlyRange(calendarBlock.startDate, calendarBlock.endDate),
      source: calendarBlock.source as AvailabilityBlockingRecord["source"],
      reason: calendarBlock.reason ?? undefined,
      reservationId: calendarBlock.reservationId ?? undefined,
      calendarBlockId: calendarBlock.id,
      externalCalendarEventId: calendarBlock.externalCalendarEventId ?? undefined,
    }));

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
