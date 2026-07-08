import { createHash } from "crypto";

import {
  CalendarBlockSource,
  ExternalCalendarDirection,
  ExternalCalendarProvider,
  ExternalCalendarStatus,
  ReservationStatus,
  type Prisma,
  type PrismaClient,
} from "@prisma/client";

import { getAccommodationById } from "@/config/accommodations";
import {
  addDaysToDateOnly,
  assertValidAvailabilityDateRange,
  availabilityDateRangesOverlap,
  buildPreparationBufferRanges,
  dateOnlyFromDate,
  dateOnlyToUtcDate,
  getBlockingAccommodationIds,
} from "@/lib/availability/rules";
import { prisma } from "@/lib/db/prisma";
import type { AccommodationId } from "@/types/accommodation";
import type { AvailabilityDateRange, DateOnlyString } from "@/types/availability";

import type {
  AirbnbIcalExportFeedInput,
  AirbnbIcalExportFeedResult,
  AirbnbIcalExportUnavailableRange,
} from "./types";

const DEFAULT_EXPORT_LOOKBACK_DAYS = 0;
const DEFAULT_EXPORT_LOOKAHEAD_DAYS = 365;
const EXPORT_CALENDAR_PROD_ID = "-//Tu Refugio Perfecto//TRP Booking iCal Export//EN";
const EXPORT_EVENT_SUMMARY = "Unavailable";
const EXPORT_FEED_HOST = "turefugioperfecto.com.gt";

const externalCalendarExportSelect = {
  id: true,
  propertyId: true,
  provider: true,
  direction: true,
  name: true,
  exportTokenHash: true,
  isExportEnabled: true,
  status: true,
  deletedAt: true,
  property: {
    select: {
      id: true,
      slug: true,
      nameEs: true,
      nameEn: true,
    },
  },
} satisfies Prisma.ExternalCalendarSelect;

const propertyExportSelect = {
  id: true,
  slug: true,
} satisfies Prisma.PropertySelect;

const reservationExportSelect = {
  id: true,
  propertyId: true,
  checkInDate: true,
  checkOutDate: true,
  status: true,
} satisfies Prisma.ReservationSelect;

const calendarBlockExportSelect = {
  id: true,
  propertyId: true,
  source: true,
  startDate: true,
  endDate: true,
  unlockedByAdminAt: true,
} satisfies Prisma.CalendarBlockSelect;

type ExternalCalendarExportRecord = Prisma.ExternalCalendarGetPayload<{
  select: typeof externalCalendarExportSelect;
}>;

type PropertyExportRecord = Prisma.PropertyGetPayload<{
  select: typeof propertyExportSelect;
}>;

type ReservationExportRecord = Prisma.ReservationGetPayload<{
  select: typeof reservationExportSelect;
}>;

type CalendarBlockExportRecord = Prisma.CalendarBlockGetPayload<{
  select: typeof calendarBlockExportSelect;
}>;

type AirbnbIcalExportFeedOptions = Readonly<{
  prismaClient?: PrismaClient;
  now?: Date;
}>;

type PropertyMapping = Readonly<{
  propertyId: string;
  accommodationId: AccommodationId;
}>;

function assertServerSideAirbnbIcalExport(): void {
  if (typeof window !== "undefined") {
    throw new Error("Airbnb iCal export feed must remain server-side only.");
  }
}

function assertPositiveInteger(value: number, label: string): void {
  if (!Number.isInteger(value) || value < 0) {
    throw new Error(`${label} must be a non-negative integer.`);
  }
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

function getAccommodationSlug(accommodationId: AccommodationId): string {
  const accommodation = getAccommodationById(accommodationId);

  if (!accommodation) {
    throw new Error(`Accommodation not found for ${accommodationId}.`);
  }

  return accommodation.slug.es;
}

export function hashAirbnbIcalExportToken(token: string): string {
  const trimmedToken = token.trim();

  if (!trimmedToken) {
    throw new Error("Airbnb iCal export token is required.");
  }

  return createHash("sha256").update(trimmedToken, "utf8").digest("hex");
}

function buildExportWindow(input: AirbnbIcalExportFeedInput, now: Date): AvailabilityDateRange {
  const lookbackDays = input.lookbackDays ?? DEFAULT_EXPORT_LOOKBACK_DAYS;
  const lookaheadDays = input.lookaheadDays ?? DEFAULT_EXPORT_LOOKAHEAD_DAYS;

  assertPositiveInteger(lookbackDays, "lookbackDays");
  assertPositiveInteger(lookaheadDays, "lookaheadDays");

  const today = dateOnlyFromDate(now);
  const range = {
    startDate: addDaysToDateOnly(today, -lookbackDays),
    endDate: addDaysToDateOnly(today, lookaheadDays),
  };

  assertValidAvailabilityDateRange(range);

  return range;
}

async function getExportCalendar(
  prismaClient: PrismaClient,
  rawToken: string,
): Promise<ExternalCalendarExportRecord> {
  const exportTokenHash = hashAirbnbIcalExportToken(rawToken);
  const externalCalendar = await prismaClient.externalCalendar.findFirst({
    where: {
      exportTokenHash,
      deletedAt: null,
    },
    select: externalCalendarExportSelect,
  });

  if (!externalCalendar || externalCalendar.deletedAt) {
    throw new Error("Airbnb iCal export calendar was not found.");
  }

  if (externalCalendar.provider !== ExternalCalendarProvider.AIRBNB) {
    throw new Error("External calendar provider is not supported for Airbnb export feeds.");
  }

  if (externalCalendar.direction === ExternalCalendarDirection.IMPORT) {
    throw new Error("External calendar is not configured for export feeds.");
  }

  if (!externalCalendar.isExportEnabled) {
    throw new Error("External calendar export is disabled.");
  }

  if (externalCalendar.status === ExternalCalendarStatus.INACTIVE) {
    throw new Error("External calendar is inactive.");
  }

  return externalCalendar;
}

async function resolvePropertyMappings(
  prismaClient: PrismaClient,
  accommodationIds: readonly AccommodationId[],
): Promise<readonly PropertyMapping[]> {
  const expectedSlugs = accommodationIds.map(getAccommodationSlug);
  const properties: PropertyExportRecord[] = await prismaClient.property.findMany({
    where: {
      deletedAt: null,
      slug: {
        in: expectedSlugs,
      },
    },
    select: propertyExportSelect,
  });

  const foundSlugs = new Set(properties.map((property) => property.slug));
  const missingSlugs = expectedSlugs.filter((slug) => !foundSlugs.has(slug));

  if (missingSlugs.length > 0) {
    throw new Error(`Missing property records for Airbnb export feed: ${missingSlugs.join(", ")}.`);
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

function shouldExportCalendarBlock(calendarBlock: CalendarBlockExportRecord): boolean {
  if (
    calendarBlock.source === CalendarBlockSource.PREPARATION_BUFFER &&
    calendarBlock.unlockedByAdminAt
  ) {
    return false;
  }

  return true;
}

function toExportRange(
  range: AvailabilityDateRange,
  exportWindow: AvailabilityDateRange,
): AirbnbIcalExportUnavailableRange | null {
  if (!availabilityDateRangesOverlap(range, exportWindow)) {
    return null;
  }

  const clippedRange = {
    startDate: range.startDate < exportWindow.startDate ? exportWindow.startDate : range.startDate,
    endDate: range.endDate > exportWindow.endDate ? exportWindow.endDate : range.endDate,
  };

  if (clippedRange.startDate >= clippedRange.endDate) {
    return null;
  }

  return clippedRange;
}

function buildReservationUnavailableRanges(
  input: Readonly<{
    reservations: readonly ReservationExportRecord[];
    propertyIdToAccommodationId: ReadonlyMap<string, AccommodationId>;
    exportWindow: AvailabilityDateRange;
  }>,
): readonly AirbnbIcalExportUnavailableRange[] {
  const ranges: AirbnbIcalExportUnavailableRange[] = [];

  for (const reservation of input.reservations) {
    const stayRange = toExportRange(
      toDateOnlyRange(reservation.checkInDate, reservation.checkOutDate),
      input.exportWindow,
    );

    if (stayRange) {
      ranges.push(stayRange);
    }

    if (reservation.status !== ReservationStatus.CONFIRMED) {
      continue;
    }

    const accommodationId = input.propertyIdToAccommodationId.get(reservation.propertyId);

    if (!accommodationId) {
      continue;
    }

    const reservationRange = toDateOnlyRange(reservation.checkInDate, reservation.checkOutDate);

    for (const bufferRange of buildPreparationBufferRanges(accommodationId, reservationRange)) {
      const exportRange = toExportRange(bufferRange, input.exportWindow);

      if (exportRange) {
        ranges.push(exportRange);
      }
    }
  }

  return ranges;
}

function buildCalendarBlockUnavailableRanges(
  input: Readonly<{
    calendarBlocks: readonly CalendarBlockExportRecord[];
    exportWindow: AvailabilityDateRange;
  }>,
): readonly AirbnbIcalExportUnavailableRange[] {
  return input.calendarBlocks
    .filter(shouldExportCalendarBlock)
    .map((calendarBlock) =>
      toExportRange(
        toDateOnlyRange(calendarBlock.startDate, calendarBlock.endDate),
        input.exportWindow,
      ),
    )
    .filter((range): range is AirbnbIcalExportUnavailableRange => Boolean(range));
}

function normalizeUnavailableRanges(
  ranges: readonly AirbnbIcalExportUnavailableRange[],
): readonly AirbnbIcalExportUnavailableRange[] {
  const sortedRanges = [...ranges].sort((firstRange, secondRange) => {
    if (firstRange.startDate === secondRange.startDate) {
      return firstRange.endDate.localeCompare(secondRange.endDate);
    }

    return firstRange.startDate.localeCompare(secondRange.startDate);
  });
  const normalizedRanges: AirbnbIcalExportUnavailableRange[] = [];

  for (const range of sortedRanges) {
    const previousRange = normalizedRanges.at(-1);

    if (!previousRange) {
      normalizedRanges.push(range);
      continue;
    }

    if (range.startDate <= previousRange.endDate) {
      normalizedRanges[normalizedRanges.length - 1] = {
        startDate: previousRange.startDate,
        endDate: range.endDate > previousRange.endDate ? range.endDate : previousRange.endDate,
      };
      continue;
    }

    normalizedRanges.push(range);
  }

  return normalizedRanges;
}

function formatIcalDate(date: DateOnlyString): string {
  return date.replace(/-/g, "");
}

function formatIcalUtcDateTime(date: Date): string {
  return date.toISOString().replace(/[-:]/g, "").replace(/\.\d{3}Z$/, "Z");
}

function escapeIcalText(value: string): string {
  return value
    .replace(/\\/g, "\\\\")
    .replace(/\n/g, "\\n")
    .replace(/,/g, "\\,")
    .replace(/;/g, "\\;");
}

function foldIcalLine(line: string): readonly string[] {
  const maxLineLength = 75;

  if (line.length <= maxLineLength) {
    return [line];
  }

  const foldedLines: string[] = [];
  let remainingLine = line;

  while (remainingLine.length > maxLineLength) {
    foldedLines.push(remainingLine.slice(0, maxLineLength));
    remainingLine = ` ${remainingLine.slice(maxLineLength)}`;
  }

  foldedLines.push(remainingLine);

  return foldedLines;
}

function buildIcalContent(input: Readonly<{
  calendar: ExternalCalendarExportRecord;
  ranges: readonly AirbnbIcalExportUnavailableRange[];
  now: Date;
}>): string {
  const timestamp = formatIcalUtcDateTime(input.now);
  const lines: string[] = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    `PRODID:${EXPORT_CALENDAR_PROD_ID}`,
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
    `X-WR-CALNAME:${escapeIcalText(input.calendar.name)}`,
  ];

  input.ranges.forEach((range, index) => {
    const rangeKey = `${range.startDate}-${range.endDate}`;

    lines.push(
      "BEGIN:VEVENT",
      `UID:trp-booking-${input.calendar.id}-${index}-${rangeKey}@${EXPORT_FEED_HOST}`,
      `DTSTAMP:${timestamp}`,
      `DTSTART;VALUE=DATE:${formatIcalDate(range.startDate)}`,
      `DTEND;VALUE=DATE:${formatIcalDate(range.endDate)}`,
      `SUMMARY:${escapeIcalText(EXPORT_EVENT_SUMMARY)}`,
      "TRANSP:OPAQUE",
      "END:VEVENT",
    );
  });

  lines.push("END:VCALENDAR");

  return `${lines.flatMap(foldIcalLine).join("\r\n")}\r\n`;
}

export async function generateAirbnbIcalExportFeed(
  input: AirbnbIcalExportFeedInput,
  options: AirbnbIcalExportFeedOptions = {},
): Promise<AirbnbIcalExportFeedResult> {
  assertServerSideAirbnbIcalExport();

  const prismaClient = options.prismaClient ?? prisma;
  const now = options.now ?? new Date();
  const exportWindow = buildExportWindow(input, now);
  const calendar = await getExportCalendar(prismaClient, input.token);
  const sourceAccommodationId = getAccommodationIdBySlug(calendar.property.slug);
  const blockingAccommodationIds = getBlockingAccommodationIds(sourceAccommodationId);
  const propertyMappings = await resolvePropertyMappings(prismaClient, blockingAccommodationIds);
  const propertyIdToAccommodationId = new Map(
    propertyMappings.map((mapping) => [mapping.propertyId, mapping.accommodationId]),
  );
  const blockingPropertyIds = propertyMappings.map((mapping) => mapping.propertyId);

  const [reservations, calendarBlocks]: [ReservationExportRecord[], CalendarBlockExportRecord[]] =
    await Promise.all([
      prismaClient.reservation.findMany({
        where: {
          propertyId: {
            in: blockingPropertyIds,
          },
          status: ReservationStatus.CONFIRMED,
          checkInDate: {
            lt: dateOnlyToUtcDate(exportWindow.endDate),
          },
          checkOutDate: {
            gt: dateOnlyToUtcDate(exportWindow.startDate),
          },
        },
        select: reservationExportSelect,
      }),
      prismaClient.calendarBlock.findMany({
        where: {
          propertyId: {
            in: blockingPropertyIds,
          },
          deletedAt: null,
          startDate: {
            lt: dateOnlyToUtcDate(exportWindow.endDate),
          },
          endDate: {
            gt: dateOnlyToUtcDate(exportWindow.startDate),
          },
        },
        select: calendarBlockExportSelect,
      }),
    ]);

  const unavailableRanges = normalizeUnavailableRanges([
    ...buildReservationUnavailableRanges({
      reservations,
      propertyIdToAccommodationId,
      exportWindow,
    }),
    ...buildCalendarBlockUnavailableRanges({
      calendarBlocks,
      exportWindow,
    }),
  ]);
  const content = buildIcalContent({
    calendar,
    ranges: unavailableRanges,
    now,
  });
  const generatedAt = new Date();

  await prismaClient.externalCalendar.update({
    where: {
      id: calendar.id,
    },
    data: {
      lastExportGeneratedAt: generatedAt,
    },
  });

  return {
    externalCalendarId: calendar.id,
    generatedAt,
    range: exportWindow,
    eventCount: unavailableRanges.length,
    content,
  };
}
