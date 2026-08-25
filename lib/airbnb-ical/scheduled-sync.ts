import {
  CalendarSyncStatus,
  CalendarSyncTriggeredBy,
  ExternalCalendarDirection,
  ExternalCalendarProvider,
  ExternalCalendarStatus,
  type Prisma,
  type PrismaClient,
} from "@prisma/client";

import { prisma } from "@/lib/db/prisma";
import {
  resolveAirbnbIcalImportUrlDatabaseFirst,
  resolveLegacyAirbnbIcalImportUrl,
} from "@/lib/external-calendars/airbnb-import-secret";

import { fetchAirbnbIcalTextSecurely } from "./provider-security";
import { syncAirbnbIcalImport } from "./sync-service";
import type {
  AirbnbIcalBatchSyncCalendarResult,
  AirbnbIcalBatchSyncInput,
  AirbnbIcalBatchSyncResult,
  AirbnbIcalFetchClient,
  AirbnbIcalImportSyncResult,
  AirbnbIcalImportUrlResolver,
  AirbnbIcalImportUrlResolverCalendar,
} from "./types";

const MISSING_IMPORT_URL_ERROR_CODE = "ICAL_IMPORT_URL_UNAVAILABLE";
const MISSING_IMPORT_URL_ERROR_MESSAGE =
  "Airbnb iCal import URL is not available in server-side configuration.";
const GENERIC_IMPORT_ERROR_MESSAGE =
  "Airbnb iCal import failed. Review provider availability and calendar configuration.";

const scheduledExternalCalendarSelect = {
  id: true,
  propertyId: true,
  provider: true,
  direction: true,
  name: true,
  importUrlEncrypted: true,
  isImportEnabled: true,
  status: true,
  deletedAt: true,
} satisfies Prisma.ExternalCalendarSelect;

type ScheduledExternalCalendarRecord = Prisma.ExternalCalendarGetPayload<{
  select: typeof scheduledExternalCalendarSelect;
}>;

type AirbnbIcalBatchSyncOptions = Readonly<{
  prismaClient?: PrismaClient;
  now?: Date;
  resolveImportUrl?: AirbnbIcalImportUrlResolver;
  fetchIcalText?: AirbnbIcalFetchClient;
}>;

function assertServerSideAirbnbIcalBatchSync(): void {
  if (typeof window !== "undefined") {
    throw new Error("Airbnb iCal batch sync must remain server-side only.");
  }
}

function toResolverCalendar(
  calendar: ScheduledExternalCalendarRecord,
): AirbnbIcalImportUrlResolverCalendar {
  return {
    id: calendar.id,
    propertyId: calendar.propertyId,
    name: calendar.name,
    importUrlEncrypted: calendar.importUrlEncrypted,
  };
}

export function resolveAirbnbIcalImportUrlFromEnv(
  calendar: AirbnbIcalImportUrlResolverCalendar,
  source: NodeJS.ProcessEnv = process.env,
): string | null {
  return resolveLegacyAirbnbIcalImportUrl(calendar.id, source);
}

export function resolveAirbnbIcalImportUrl(
  calendar: AirbnbIcalImportUrlResolverCalendar,
  source: NodeJS.ProcessEnv = process.env,
): string | null {
  return resolveAirbnbIcalImportUrlDatabaseFirst(calendar, source);
}

function getSafeErrorCode(error: unknown): string {
  if (error instanceof Error && error.name.trim()) {
    return error.name;
  }

  return "ICAL_IMPORT_ERROR";
}

function getSafeErrorMessage(error: unknown): string {
  if (error instanceof Error && error.message.startsWith("ICAL_HTTP_")) {
    return error.message;
  }

  return GENERIC_IMPORT_ERROR_MESSAGE;
}

function toSuccessResult(
  result: AirbnbIcalImportSyncResult,
): AirbnbIcalBatchSyncCalendarResult {
  return {
    externalCalendarId: result.externalCalendarId,
    syncLogId: result.syncLogId,
    status: "SUCCESS",
    eventsImported: result.eventsImported,
    eventsUpdated: result.eventsUpdated,
    eventsRemoved: result.eventsRemoved,
    eventsSkipped: result.eventsSkipped,
    blocksCreated: result.blocksCreated,
    blocksUpdated: result.blocksUpdated,
  };
}

function toFailedResult(
  input: Readonly<{
    externalCalendarId: string;
    syncLogId?: string;
    errorCode: string;
    errorMessage: string;
  }>,
): AirbnbIcalBatchSyncCalendarResult {
  return {
    externalCalendarId: input.externalCalendarId,
    syncLogId: input.syncLogId,
    status: "FAILED",
    errorCode: input.errorCode,
    errorMessage: input.errorMessage,
    eventsImported: 0,
    eventsUpdated: 0,
    eventsRemoved: 0,
    eventsSkipped: 0,
    blocksCreated: 0,
    blocksUpdated: 0,
  };
}

async function recordImportConfigurationFailure(
  prismaClient: PrismaClient,
  input: Readonly<{
    externalCalendarId: string;
    triggeredBy: CalendarSyncTriggeredBy;
    now: Date;
    errorCode: string;
    errorMessage: string;
  }>,
): Promise<string> {
  const syncLog = await prismaClient.externalCalendarSyncLog.create({
    data: {
      externalCalendarId: input.externalCalendarId,
      triggeredBy: input.triggeredBy,
      status: CalendarSyncStatus.FAILED,
      startedAt: input.now,
      finishedAt: input.now,
      errorCode: input.errorCode,
      errorMessage: input.errorMessage,
    },
    select: {
      id: true,
    },
  });

  await prismaClient.externalCalendar.update({
    where: {
      id: input.externalCalendarId,
    },
    data: {
      lastImportStartedAt: input.now,
      lastImportFinishedAt: input.now,
      lastFailureCode: input.errorCode,
      lastFailureMessage: input.errorMessage,
      status: ExternalCalendarStatus.ERROR,
    },
  });

  return syncLog.id;
}

async function getCalendarsForBatchSync(
  prismaClient: PrismaClient,
  input: AirbnbIcalBatchSyncInput,
): Promise<readonly ScheduledExternalCalendarRecord[]> {
  const externalCalendarIds = input.externalCalendarIds?.filter(Boolean) ?? [];

  return prismaClient.externalCalendar.findMany({
    where: {
      id:
        externalCalendarIds.length > 0
          ? {
              in: [...new Set(externalCalendarIds)],
            }
          : undefined,
      provider: ExternalCalendarProvider.AIRBNB,
      direction: {
        in: [ExternalCalendarDirection.IMPORT, ExternalCalendarDirection.BIDIRECTIONAL],
      },
      isImportEnabled: true,
      deletedAt: null,
      status: {
        not: ExternalCalendarStatus.INACTIVE,
      },
    },
    orderBy: {
      updatedAt: "asc",
    },
    select: scheduledExternalCalendarSelect,
  });
}

export async function syncConfiguredAirbnbIcalImports(
  input: AirbnbIcalBatchSyncInput = {},
  options: AirbnbIcalBatchSyncOptions = {},
): Promise<AirbnbIcalBatchSyncResult> {
  assertServerSideAirbnbIcalBatchSync();

  const prismaClient = options.prismaClient ?? prisma;
  const now = options.now ?? new Date();
  const triggeredBy = input.triggeredBy ?? CalendarSyncTriggeredBy.SYSTEM;
  const resolveImportUrl = options.resolveImportUrl ?? resolveAirbnbIcalImportUrl;
  const fetchIcalText = options.fetchIcalText ?? fetchAirbnbIcalTextSecurely;
  const calendars = await getCalendarsForBatchSync(prismaClient, input);
  const results: AirbnbIcalBatchSyncCalendarResult[] = [];

  for (const calendar of calendars) {
    let resolvedImportUrl: string | null = null;

    try {
      resolvedImportUrl =
        (await resolveImportUrl(toResolverCalendar(calendar)))?.trim() ?? null;
    } catch (error) {
      const errorCode = getSafeErrorCode(error);
      const errorMessage = getSafeErrorMessage(error);
      const syncLogId = await recordImportConfigurationFailure(prismaClient, {
        externalCalendarId: calendar.id,
        triggeredBy,
        now,
        errorCode,
        errorMessage,
      });

      results.push(
        toFailedResult({
          externalCalendarId: calendar.id,
          syncLogId,
          errorCode,
          errorMessage,
        }),
      );
      continue;
    }

    if (!resolvedImportUrl) {
      const syncLogId = await recordImportConfigurationFailure(prismaClient, {
        externalCalendarId: calendar.id,
        triggeredBy,
        now,
        errorCode: MISSING_IMPORT_URL_ERROR_CODE,
        errorMessage: MISSING_IMPORT_URL_ERROR_MESSAGE,
      });

      results.push(
        toFailedResult({
          externalCalendarId: calendar.id,
          syncLogId,
          errorCode: MISSING_IMPORT_URL_ERROR_CODE,
          errorMessage: MISSING_IMPORT_URL_ERROR_MESSAGE,
        }),
      );
      continue;
    }

    try {
      const result = await syncAirbnbIcalImport(
        {
          externalCalendarId: calendar.id,
          decryptedImportUrl: resolvedImportUrl,
          triggeredBy,
          timeoutMs: input.timeoutMs,
        },
        {
          prismaClient,
          now,
          fetchIcalText,
        },
      );

      results.push(toSuccessResult(result));
    } catch (error) {
      results.push(
        toFailedResult({
          externalCalendarId: calendar.id,
          errorCode: getSafeErrorCode(error),
          errorMessage: getSafeErrorMessage(error),
        }),
      );
    }
  }

  const calendarsSynced = results.filter((result) => result.status === "SUCCESS").length;
  const calendarsFailed = results.filter((result) => result.status === "FAILED").length;
  const calendarsSkipped = results.filter((result) => result.status === "SKIPPED").length;

  return {
    triggeredBy,
    calendarsFound: calendars.length,
    calendarsSynced,
    calendarsFailed,
    calendarsSkipped,
    results,
  };
}

export async function syncAirbnbIcalCalendarManually(
  input: Readonly<{
    externalCalendarId: string;
    decryptedImportUrl?: string;
    timeoutMs?: number;
  }>,
  options: AirbnbIcalBatchSyncOptions = {},
): Promise<AirbnbIcalBatchSyncResult> {
  return syncConfiguredAirbnbIcalImports(
    {
      externalCalendarIds: [input.externalCalendarId],
      triggeredBy: CalendarSyncTriggeredBy.ADMIN,
      timeoutMs: input.timeoutMs,
    },
    {
      ...options,
      resolveImportUrl: input.decryptedImportUrl
        ? () => input.decryptedImportUrl
        : options.resolveImportUrl,
    },
  );
}
