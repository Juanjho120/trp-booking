import {
  CalendarBlockSource,
  CalendarSyncStatus,
  CalendarSyncTriggeredBy,
  ExternalCalendarDirection,
  ExternalCalendarEventStatus,
  ExternalCalendarProvider,
  ExternalCalendarStatus,
  type Prisma,
  type PrismaClient,
} from "@prisma/client";

import { getAccommodationById } from "@/config/accommodations";
import {
  buildPreparationBufferRanges,
  dateOnlyToUtcDate,
  getAffectedAccommodationIds,
} from "@/lib/availability/rules";
import { prisma } from "@/lib/db/prisma";
import type {
  AccommodationId,
  PreparationBufferPolicy,
} from "@/types/accommodation";
import type { AvailabilityDateRange } from "@/types/availability";

import { parseAirbnbIcalContent } from "./parser";
import type {
  AirbnbIcalFetchClient,
  AirbnbIcalImportedEvent,
  AirbnbIcalImportSyncInput,
  AirbnbIcalImportSyncResult,
} from "./types";

const DEFAULT_IMPORT_TIMEOUT_MS = 10_000;
const AIRBNB_BLOCK_REASON = "Airbnb imported booking";
const PREPARATION_BUFFER_REASON =
  "Airbnb imported booking preparation buffer";

const externalCalendarImportSelect = {
  id: true,
  propertyId: true,
  provider: true,
  direction: true,
  name: true,
  isImportEnabled: true,
  status: true,
  deletedAt: true,
  property: {
    select: {
      id: true,
      slug: true,
    },
  },
} satisfies Prisma.ExternalCalendarSelect;

const propertySyncSelect = {
  id: true,
  slug: true,
  preparationDaysBefore: true,
  preparationDaysAfter: true,
} satisfies Prisma.PropertySelect;

const externalCalendarEventSyncSelect = {
  id: true,
  externalCalendarId: true,
  providerEventUid: true,
  status: true,
  summary: true,
  startDate: true,
  endDate: true,
  removedAt: true,
} satisfies Prisma.ExternalCalendarEventSelect;

const calendarBlockSyncSelect = {
  id: true,
  propertyId: true,
  source: true,
  startDate: true,
  endDate: true,
  externalCalendarEventId: true,
  parentBlockId: true,
  unlockedByAdminAt: true,
  deletedAt: true,
} satisfies Prisma.CalendarBlockSelect;

type ExternalCalendarImportRecord = Prisma.ExternalCalendarGetPayload<{
  select: typeof externalCalendarImportSelect;
}>;

type PropertySyncRecord = Prisma.PropertyGetPayload<{
  select: typeof propertySyncSelect;
}>;

type ExternalCalendarEventSyncRecord = Prisma.ExternalCalendarEventGetPayload<{
  select: typeof externalCalendarEventSyncSelect;
}>;

type CalendarBlockSyncRecord = Prisma.CalendarBlockGetPayload<{
  select: typeof calendarBlockSyncSelect;
}>;

type AirbnbIcalImportSyncOptions = Readonly<{
  prismaClient?: PrismaClient;
  now?: Date;
  fetchIcalText?: AirbnbIcalFetchClient;
}>;

type SyncCounters = {
  eventsImported: number;
  eventsUpdated: number;
  eventsRemoved: number;
  eventsSkipped: number;
  blocksCreated: number;
  blocksUpdated: number;
};

type PropertyMapping = Readonly<{
  propertyId: string;
  accommodationId: AccommodationId;
  preparationBuffer: PreparationBufferPolicy;
}>;

type EnsuredCalendarBlock = Readonly<{
  id: string;
  wasCreated: boolean;
  wasUpdated: boolean;
}>;

function assertServerSideAirbnbIcalSync(): void {
  if (typeof window !== "undefined") {
    throw new Error("Airbnb iCal sync service must remain server-side only.");
  }
}

function assertValidRuntimeImportUrl(url: string): void {
  const parsedUrl = new URL(url);

  if (!["http:", "https:"].includes(parsedUrl.protocol)) {
    throw new Error("Airbnb iCal import URL must use HTTP or HTTPS.");
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
    throw new Error(
      `Accommodation config not found for property slug ${slug}.`,
    );
  }

  return accommodation.id;
}

function toEventStatus(
  event: AirbnbIcalImportedEvent,
): ExternalCalendarEventStatus {
  return event.status === "CANCELLED"
    ? ExternalCalendarEventStatus.CANCELLED
    : ExternalCalendarEventStatus.ACTIVE;
}

function toDateRange(
  event: AirbnbIcalImportedEvent,
): AvailabilityDateRange {
  return {
    startDate: event.startDate,
    endDate: event.endDate,
  };
}

function buildAirbnbBlockReason(event: AirbnbIcalImportedEvent): string {
  return event.summary
    ? `${AIRBNB_BLOCK_REASON}: ${event.summary}`
    : AIRBNB_BLOCK_REASON;
}

function toSafeErrorMessage(error: unknown): string {
  if (error instanceof Error && error.message.startsWith("ICAL_HTTP_")) {
    return error.message;
  }

  return "Airbnb iCal import failed. Review provider availability and calendar configuration.";
}

async function defaultFetchIcalText(
  url: string,
  options: Readonly<{ timeoutMs: number }>,
): Promise<string> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), options.timeoutMs);

  try {
    const response = await fetch(url, {
      headers: {
        accept: "text/calendar,text/plain;q=0.9,*/*;q=0.1",
      },
      signal: controller.signal,
    });

    if (!response.ok) {
      throw new Error(`ICAL_HTTP_${response.status}`);
    }

    return await response.text();
  } finally {
    clearTimeout(timeout);
  }
}

async function getImportCalendar(
  prismaClient: PrismaClient,
  externalCalendarId: string,
): Promise<ExternalCalendarImportRecord> {
  const externalCalendar = await prismaClient.externalCalendar.findUnique({
    where: {
      id: externalCalendarId,
    },
    select: externalCalendarImportSelect,
  });

  if (!externalCalendar || externalCalendar.deletedAt) {
    throw new Error("External calendar configuration was not found.");
  }

  if (externalCalendar.provider !== ExternalCalendarProvider.AIRBNB) {
    throw new Error(
      "External calendar provider is not supported for Airbnb import sync.",
    );
  }

  if (externalCalendar.direction === ExternalCalendarDirection.EXPORT) {
    throw new Error("External calendar is not configured for import sync.");
  }

  if (!externalCalendar.isImportEnabled) {
    throw new Error("External calendar import is disabled.");
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
  const properties: PropertySyncRecord[] = await prismaClient.property.findMany({
    where: {
      deletedAt: null,
      slug: {
        in: expectedSlugs,
      },
    },
    select: propertySyncSelect,
  });
  const foundSlugs = new Set(properties.map((property) => property.slug));
  const missingSlugs = expectedSlugs.filter((slug) => !foundSlugs.has(slug));

  if (missingSlugs.length > 0) {
    throw new Error(
      `Missing property records for Airbnb sync: ${missingSlugs.join(", ")}.`,
    );
  }

  return properties.map((property) => ({
    propertyId: property.id,
    accommodationId: getAccommodationIdBySlug(property.slug),
    preparationBuffer: {
      daysBefore: property.preparationDaysBefore,
      daysAfter: property.preparationDaysAfter,
    },
  }));
}

async function ensureCalendarBlock(
  prismaClient: PrismaClient,
  input: Readonly<{
    propertyId: string;
    eventRecordId: string;
    source: CalendarBlockSource;
    range: AvailabilityDateRange;
    reason: string;
    parentBlockId?: string;
    isAdminOverrideAllowed?: boolean;
    now: Date;
  }>,
): Promise<EnsuredCalendarBlock> {
  const existingBlock: CalendarBlockSyncRecord | null =
    await prismaClient.calendarBlock.findFirst({
      where: {
        propertyId: input.propertyId,
        externalCalendarEventId: input.eventRecordId,
        source: input.source,
        parentBlockId: input.parentBlockId ?? null,
        unlockedByAdminAt: null,
        reason:
          input.source === CalendarBlockSource.PREPARATION_BUFFER
            ? input.reason
            : undefined,
      },
      orderBy: {
        updatedAt: "desc",
      },
      select: calendarBlockSyncSelect,
    });

  if (existingBlock) {
    await prismaClient.calendarBlock.update({
      where: {
        id: existingBlock.id,
      },
      data: {
        startDate: dateOnlyToUtcDate(input.range.startDate),
        endDate: dateOnlyToUtcDate(input.range.endDate),
        reason: input.reason,
        isAdminOverrideAllowed: input.isAdminOverrideAllowed ?? false,
        deletedAt: null,
        deletedById: null,
      },
    });

    return {
      id: existingBlock.id,
      wasCreated: false,
      wasUpdated: true,
    };
  }

  const createdBlock = await prismaClient.calendarBlock.create({
    data: {
      propertyId: input.propertyId,
      externalCalendarEventId: input.eventRecordId,
      parentBlockId: input.parentBlockId,
      startDate: dateOnlyToUtcDate(input.range.startDate),
      endDate: dateOnlyToUtcDate(input.range.endDate),
      source: input.source,
      reason: input.reason,
      isAdminOverrideAllowed: input.isAdminOverrideAllowed ?? false,
      createdAt: input.now,
    },
    select: {
      id: true,
    },
  });

  return {
    id: createdBlock.id,
    wasCreated: true,
    wasUpdated: false,
  };
}

function applyBlockCounter(
  counters: SyncCounters,
  ensuredBlock: EnsuredCalendarBlock,
): void {
  if (ensuredBlock.wasCreated) {
    counters.blocksCreated += 1;
  }

  if (ensuredBlock.wasUpdated) {
    counters.blocksUpdated += 1;
  }
}

async function softDeleteImportedBlocksForEvents(
  prismaClient: PrismaClient,
  eventRecordIds: readonly string[],
  now: Date,
): Promise<number> {
  if (eventRecordIds.length === 0) {
    return 0;
  }

  const updateResult = await prismaClient.calendarBlock.updateMany({
    where: {
      externalCalendarEventId: {
        in: [...eventRecordIds],
      },
      source: {
        in: [
          CalendarBlockSource.AIRBNB,
          CalendarBlockSource.PREPARATION_BUFFER,
        ],
      },
      deletedAt: null,
    },
    data: {
      deletedAt: now,
    },
  });

  return updateResult.count;
}

async function syncBlocksForActiveEvent(
  prismaClient: PrismaClient,
  input: Readonly<{
    event: AirbnbIcalImportedEvent;
    eventRecord: ExternalCalendarEventSyncRecord;
    sourcePropertyMapping: PropertyMapping;
    affectedPropertyMappings: readonly PropertyMapping[];
    counters: SyncCounters;
    now: Date;
  }>,
): Promise<void> {
  const eventRange = toDateRange(input.event);
  let sourceAirbnbBlockId: string | undefined;

  for (const mapping of input.affectedPropertyMappings) {
    const airbnbBlock = await ensureCalendarBlock(prismaClient, {
      propertyId: mapping.propertyId,
      eventRecordId: input.eventRecord.id,
      source: CalendarBlockSource.AIRBNB,
      range: eventRange,
      reason: buildAirbnbBlockReason(input.event),
      now: input.now,
    });

    applyBlockCounter(input.counters, airbnbBlock);

    if (mapping.propertyId === input.sourcePropertyMapping.propertyId) {
      sourceAirbnbBlockId = airbnbBlock.id;
    }
  }

  if (!sourceAirbnbBlockId) {
    throw new Error(
      "Source Airbnb calendar block was not created for preparation buffers.",
    );
  }

  const bufferRanges = buildPreparationBufferRanges(
    input.sourcePropertyMapping.accommodationId,
    eventRange,
    input.sourcePropertyMapping.preparationBuffer,
  );

  const desiredPreparationBufferIds: string[] = [];

  for (const bufferRange of bufferRanges) {
    const preparationBufferBlock = await ensureCalendarBlock(prismaClient, {
      propertyId: input.sourcePropertyMapping.propertyId,
      eventRecordId: input.eventRecord.id,
      source: CalendarBlockSource.PREPARATION_BUFFER,
      range: bufferRange,
      reason: `${PREPARATION_BUFFER_REASON}: ${bufferRange.kind}`,
      parentBlockId: sourceAirbnbBlockId,
      isAdminOverrideAllowed: true,
      now: input.now,
    });

    desiredPreparationBufferIds.push(preparationBufferBlock.id);
    applyBlockCounter(input.counters, preparationBufferBlock);
  }

  const obsoleteBufferResult = await prismaClient.calendarBlock.updateMany({
    where: {
      propertyId: input.sourcePropertyMapping.propertyId,
      externalCalendarEventId: input.eventRecord.id,
      parentBlockId: sourceAirbnbBlockId,
      source: CalendarBlockSource.PREPARATION_BUFFER,
      deletedAt: null,
      id:
        desiredPreparationBufferIds.length > 0
          ? {
              notIn: desiredPreparationBufferIds,
            }
          : undefined,
    },
    data: {
      deletedAt: input.now,
    },
  });

  input.counters.blocksUpdated += obsoleteBufferResult.count;
}

async function upsertImportedEvent(
  prismaClient: PrismaClient,
  input: Readonly<{
    externalCalendarId: string;
    event: AirbnbIcalImportedEvent;
    existingEvent?: ExternalCalendarEventSyncRecord;
    now: Date;
  }>,
): Promise<ExternalCalendarEventSyncRecord> {
  const eventStatus = toEventStatus(input.event);

  if (input.existingEvent) {
    return prismaClient.externalCalendarEvent.update({
      where: {
        id: input.existingEvent.id,
      },
      data: {
        status: eventStatus,
        summary: input.event.summary,
        startDate: dateOnlyToUtcDate(input.event.startDate),
        endDate: dateOnlyToUtcDate(input.event.endDate),
        lastSeenAt: input.now,
        removedAt:
          eventStatus === ExternalCalendarEventStatus.ACTIVE
            ? null
            : input.now,
      },
      select: externalCalendarEventSyncSelect,
    });
  }

  return prismaClient.externalCalendarEvent.create({
    data: {
      externalCalendarId: input.externalCalendarId,
      providerEventUid: input.event.providerEventUid,
      status: eventStatus,
      summary: input.event.summary,
      startDate: dateOnlyToUtcDate(input.event.startDate),
      endDate: dateOnlyToUtcDate(input.event.endDate),
      firstSeenAt: input.now,
      lastSeenAt: input.now,
      removedAt:
        eventStatus === ExternalCalendarEventStatus.ACTIVE ? null : input.now,
    },
    select: externalCalendarEventSyncSelect,
  });
}

async function reconcileImportedEvents(
  prismaClient: PrismaClient,
  input: Readonly<{
    calendar: ExternalCalendarImportRecord;
    events: readonly AirbnbIcalImportedEvent[];
    skippedEvents: number;
    now: Date;
  }>,
): Promise<SyncCounters> {
  const counters: SyncCounters = {
    eventsImported: 0,
    eventsUpdated: 0,
    eventsRemoved: 0,
    eventsSkipped: input.skippedEvents,
    blocksCreated: 0,
    blocksUpdated: 0,
  };
  const sourceAccommodationId = getAccommodationIdBySlug(
    input.calendar.property.slug,
  );
  const affectedAccommodationIds = getAffectedAccommodationIds(
    sourceAccommodationId,
  );
  const affectedPropertyMappings = await resolvePropertyMappings(
    prismaClient,
    affectedAccommodationIds,
  );
  const sourcePropertyMapping = affectedPropertyMappings.find(
    (mapping) => mapping.accommodationId === sourceAccommodationId,
  );

  if (!sourcePropertyMapping) {
    throw new Error(
      "Source property mapping was not found for Airbnb import sync.",
    );
  }

  const existingEvents: ExternalCalendarEventSyncRecord[] =
    await prismaClient.externalCalendarEvent.findMany({
      where: {
        externalCalendarId: input.calendar.id,
      },
      select: externalCalendarEventSyncSelect,
    });
  const existingEventsByUid = new Map(
    existingEvents.map((eventRecord) => [
      eventRecord.providerEventUid,
      eventRecord,
    ]),
  );
  const parsedEventUids = new Set(
    input.events.map((event) => event.providerEventUid),
  );

  for (const event of input.events) {
    const existingEvent = existingEventsByUid.get(event.providerEventUid);
    const eventRecord = await upsertImportedEvent(prismaClient, {
      externalCalendarId: input.calendar.id,
      event,
      existingEvent,
      now: input.now,
    });

    if (existingEvent) {
      counters.eventsUpdated += 1;
    } else {
      counters.eventsImported += 1;
    }

    if (eventRecord.status === ExternalCalendarEventStatus.ACTIVE) {
      await syncBlocksForActiveEvent(prismaClient, {
        event,
        eventRecord,
        sourcePropertyMapping,
        affectedPropertyMappings,
        counters,
        now: input.now,
      });
    } else {
      counters.blocksUpdated += await softDeleteImportedBlocksForEvents(
        prismaClient,
        [eventRecord.id],
        input.now,
      );
    }
  }

  const removedEvents = existingEvents.filter(
    (eventRecord) =>
      eventRecord.status === ExternalCalendarEventStatus.ACTIVE &&
      !parsedEventUids.has(eventRecord.providerEventUid),
  );

  for (const removedEvent of removedEvents) {
    await prismaClient.externalCalendarEvent.update({
      where: {
        id: removedEvent.id,
      },
      data: {
        status: ExternalCalendarEventStatus.REMOVED,
        removedAt: input.now,
      },
    });
  }

  counters.eventsRemoved += removedEvents.length;
  counters.blocksUpdated += await softDeleteImportedBlocksForEvents(
    prismaClient,
    removedEvents.map((eventRecord) => eventRecord.id),
    input.now,
  );

  return counters;
}

export async function syncAirbnbIcalImport(
  input: AirbnbIcalImportSyncInput,
  options: AirbnbIcalImportSyncOptions = {},
): Promise<AirbnbIcalImportSyncResult> {
  assertServerSideAirbnbIcalSync();
  assertValidRuntimeImportUrl(input.decryptedImportUrl);

  const prismaClient = options.prismaClient ?? prisma;
  const now = options.now ?? new Date();
  const timeoutMs = input.timeoutMs ?? DEFAULT_IMPORT_TIMEOUT_MS;
  const fetchIcalText = options.fetchIcalText ?? defaultFetchIcalText;
  const calendar = await getImportCalendar(
    prismaClient,
    input.externalCalendarId,
  );
  const syncLog = await prismaClient.externalCalendarSyncLog.create({
    data: {
      externalCalendarId: calendar.id,
      triggeredBy: input.triggeredBy ?? CalendarSyncTriggeredBy.SYSTEM,
      status: CalendarSyncStatus.STARTED,
      startedAt: now,
    },
    select: {
      id: true,
    },
  });

  await prismaClient.externalCalendar.update({
    where: {
      id: calendar.id,
    },
    data: {
      lastImportStartedAt: now,
    },
  });

  try {
    const content = await fetchIcalText(input.decryptedImportUrl, {
      timeoutMs,
    });
    const parsedCalendar = parseAirbnbIcalContent(content);
    const counters = await reconcileImportedEvents(prismaClient, {
      calendar,
      events: parsedCalendar.events,
      skippedEvents: parsedCalendar.skippedEvents,
      now,
    });
    const finishedAt = new Date();
    const status =
      counters.eventsSkipped > 0
        ? CalendarSyncStatus.PARTIAL_SUCCESS
        : CalendarSyncStatus.SUCCESS;

    await prismaClient.externalCalendarSyncLog.update({
      where: {
        id: syncLog.id,
      },
      data: {
        status,
        finishedAt,
        eventsImported: counters.eventsImported,
        eventsUpdated: counters.eventsUpdated,
        eventsRemoved: counters.eventsRemoved,
        eventsSkipped: counters.eventsSkipped,
        blocksCreated: counters.blocksCreated,
        blocksUpdated: counters.blocksUpdated,
      },
    });

    await prismaClient.externalCalendar.update({
      where: {
        id: calendar.id,
      },
      data: {
        lastImportFinishedAt: finishedAt,
        lastFailureCode: null,
        lastFailureMessage: null,
        status: ExternalCalendarStatus.ACTIVE,
      },
    });

    return {
      externalCalendarId: calendar.id,
      syncLogId: syncLog.id,
      ...counters,
    };
  } catch (error) {
    const finishedAt = new Date();
    const errorMessage = toSafeErrorMessage(error);

    await prismaClient.externalCalendarSyncLog.update({
      where: {
        id: syncLog.id,
      },
      data: {
        status: CalendarSyncStatus.FAILED,
        finishedAt,
        errorCode:
          error instanceof Error ? error.name : "ICAL_IMPORT_ERROR",
        errorMessage,
      },
    });

    await prismaClient.externalCalendar.update({
      where: {
        id: calendar.id,
      },
      data: {
        lastImportFinishedAt: finishedAt,
        lastFailureCode:
          error instanceof Error ? error.name : "ICAL_IMPORT_ERROR",
        lastFailureMessage: errorMessage,
        status: ExternalCalendarStatus.ERROR,
      },
    });

    throw error;
  }
}
