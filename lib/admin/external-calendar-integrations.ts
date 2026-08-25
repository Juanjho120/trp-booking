import {
  CalendarSyncStatus,
  ExternalCalendarProvider,
  ExternalCalendarStatus,
  type Prisma,
  type PrismaClient,
} from "@prisma/client";

import { adminAccommodationIds } from "@/lib/admin/accommodations";
import { prisma } from "@/lib/db/prisma";
import type {
  AdminExternalCalendarImportSecretSource,
  AdminExternalCalendarInboundStatus,
  AdminExternalCalendarIntegration,
  AdminExternalCalendarIntegrationsPageData,
  AdminExternalCalendarLatestSync,
  AdminExternalCalendarOutboundStatus,
  AdminExternalCalendarSafeFailure,
} from "@/types/admin-external-calendar-integration";

const LEGACY_AIRBNB_IMPORT_URLS_ENV_NAME = "AIRBNB_ICAL_IMPORT_URLS_JSON";

const SAFE_GENERIC_IMPORT_MESSAGES = new Set([
  "Airbnb iCal import failed. Review provider availability and calendar configuration.",
  "Airbnb iCal import URL is not available in server-side configuration.",
]);

const propertyIntegrationSelect = {
  id: true,
  nameEs: true,
  nameEn: true,
} satisfies Prisma.PropertySelect;

const externalCalendarIntegrationSelect = {
  id: true,
  propertyId: true,
  provider: true,
  direction: true,
  name: true,
  importUrlEncrypted: true,
  exportTokenHash: true,
  exportTokenEncrypted: true,
  exportTokenLastRotatedAt: true,
  isImportEnabled: true,
  isExportEnabled: true,
  lastExportGeneratedAt: true,
  lastFailureCode: true,
  lastFailureMessage: true,
  status: true,
  updatedAt: true,
  deletedAt: true,
} satisfies Prisma.ExternalCalendarSelect;

const externalCalendarSyncLogSelect = {
  status: true,
  triggeredBy: true,
  startedAt: true,
  finishedAt: true,
  eventsImported: true,
  eventsUpdated: true,
  eventsRemoved: true,
  eventsSkipped: true,
  blocksCreated: true,
  blocksUpdated: true,
  errorCode: true,
  errorMessage: true,
} satisfies Prisma.ExternalCalendarSyncLogSelect;

type PropertyIntegrationRecord = Prisma.PropertyGetPayload<{
  select: typeof propertyIntegrationSelect;
}>;

type ExternalCalendarIntegrationRecord = Prisma.ExternalCalendarGetPayload<{
  select: typeof externalCalendarIntegrationSelect;
}>;

type ExternalCalendarSyncLogRecord = Prisma.ExternalCalendarSyncLogGetPayload<{
  select: typeof externalCalendarSyncLogSelect;
}>;

type AdminExternalCalendarIntegrationOptions = Readonly<{
  prismaClient?: PrismaClient;
  env?: NodeJS.ProcessEnv;
}>;

function toIsoString(value: Date | null): string | null {
  return value?.toISOString() ?? null;
}

function normalizeSafeFailureCode(value: string | null): string | null {
  const code = value?.trim();

  if (!code || code.length > 100 || !/^[A-Za-z0-9_-]+$/.test(code)) {
    return null;
  }

  return code;
}

function normalizeSafeFailureMessage(value: string | null): string | null {
  const message = value?.trim();

  if (!message) {
    return null;
  }

  if (/^ICAL_HTTP_[1-5][0-9]{2}$/.test(message)) {
    return message;
  }

  return SAFE_GENERIC_IMPORT_MESSAGES.has(message) ? message : null;
}

function toSafeFailure(
  input: Readonly<{
    code: string | null;
    message: string | null;
  }>,
): AdminExternalCalendarSafeFailure | null {
  const code = normalizeSafeFailureCode(input.code);
  const message = normalizeSafeFailureMessage(input.message);

  return code || message ? { code, message } : null;
}

function toLatestSync(
  syncLog: ExternalCalendarSyncLogRecord | null,
): AdminExternalCalendarLatestSync | null {
  if (!syncLog) {
    return null;
  }

  return {
    status: syncLog.status,
    triggeredBy: syncLog.triggeredBy,
    startedAt: syncLog.startedAt.toISOString(),
    finishedAt: toIsoString(syncLog.finishedAt),
    eventsImported: syncLog.eventsImported,
    eventsUpdated: syncLog.eventsUpdated,
    eventsRemoved: syncLog.eventsRemoved,
    eventsSkipped: syncLog.eventsSkipped,
    blocksCreated: syncLog.blocksCreated,
    blocksUpdated: syncLog.blocksUpdated,
  };
}

function hasLegacyImportConfiguration(
  externalCalendarId: string,
  env: NodeJS.ProcessEnv,
): boolean {
  const rawValue = env[LEGACY_AIRBNB_IMPORT_URLS_ENV_NAME];

  if (!rawValue?.trim()) {
    return false;
  }

  try {
    const parsedValue: unknown = JSON.parse(rawValue);

    if (!parsedValue || typeof parsedValue !== "object" || Array.isArray(parsedValue)) {
      return false;
    }

    const candidate = (parsedValue as Record<string, unknown>)[externalCalendarId];
    return typeof candidate === "string" && candidate.trim().length > 0;
  } catch {
    return false;
  }
}

function resolveImportSecretSource(
  calendar: ExternalCalendarIntegrationRecord,
  env: NodeJS.ProcessEnv,
): AdminExternalCalendarImportSecretSource {
  if (calendar.importUrlEncrypted) {
    return "DATABASE_ENCRYPTED";
  }

  return hasLegacyImportConfiguration(calendar.id, env) ? "LEGACY_ENV" : "NONE";
}

function resolveInboundStatus(
  calendar: ExternalCalendarIntegrationRecord,
  importSecretSource: AdminExternalCalendarImportSecretSource,
  latestSync: ExternalCalendarSyncLogRecord | null,
): AdminExternalCalendarInboundStatus {
  if (importSecretSource === "NONE") {
    return "NOT_CONFIGURED";
  }

  if (
    calendar.direction === "EXPORT" ||
    !calendar.isImportEnabled ||
    calendar.status === ExternalCalendarStatus.INACTIVE
  ) {
    return "DISABLED";
  }

  if (importSecretSource === "LEGACY_ENV") {
    return "LEGACY_ENV_MIGRATION_REQUIRED";
  }

  if (latestSync?.status === CalendarSyncStatus.FAILED) {
    return "ERROR";
  }

  if (latestSync?.status === CalendarSyncStatus.PARTIAL_SUCCESS) {
    return "WARNING";
  }

  if (latestSync?.status === CalendarSyncStatus.SUCCESS) {
    return "HEALTHY";
  }

  if (calendar.status === ExternalCalendarStatus.ERROR) {
    return "ERROR";
  }

  return "READY";
}

function resolveOutboundStatus(
  calendar: ExternalCalendarIntegrationRecord,
): AdminExternalCalendarOutboundStatus {
  if (!calendar.exportTokenHash) {
    return "NOT_CONFIGURED";
  }

  if (
    calendar.direction === "IMPORT" ||
    !calendar.isExportEnabled ||
    calendar.status === ExternalCalendarStatus.INACTIVE
  ) {
    return "DISABLED";
  }

  if (!calendar.exportTokenEncrypted) {
    return "ROTATION_REQUIRED";
  }

  return "READY";
}

async function getSyncEvidence(
  prismaClient: PrismaClient,
  externalCalendarId: string,
): Promise<
  Readonly<{
    latest: ExternalCalendarSyncLogRecord | null;
    lastSuccessful: ExternalCalendarSyncLogRecord | null;
  }>
> {
  const [latest, lastSuccessful] = await Promise.all([
    prismaClient.externalCalendarSyncLog.findFirst({
      where: {
        externalCalendarId,
      },
      orderBy: [{ startedAt: "desc" }, { id: "desc" }],
      select: externalCalendarSyncLogSelect,
    }),
    prismaClient.externalCalendarSyncLog.findFirst({
      where: {
        externalCalendarId,
        status: CalendarSyncStatus.SUCCESS,
      },
      orderBy: [{ startedAt: "desc" }, { id: "desc" }],
      select: externalCalendarSyncLogSelect,
    }),
  ]);

  return { latest, lastSuccessful };
}

async function toIntegration(
  property: PropertyIntegrationRecord,
  calendar: ExternalCalendarIntegrationRecord | null,
  options: Readonly<{
    prismaClient: PrismaClient;
    env: NodeJS.ProcessEnv;
  }>,
): Promise<AdminExternalCalendarIntegration> {
  if (!calendar) {
    return {
      calendarId: null,
      property,
      provider: "AIRBNB",
      direction: null,
      importConfigured: false,
      importSecretSource: "NONE",
      isImportEnabled: false,
      inboundStatus: "NOT_CONFIGURED",
      lastSyncAt: null,
      lastSuccessfulSyncAt: null,
      latestSync: null,
      safeFailure: null,
      exportConfigured: false,
      exportCopyAvailable: false,
      isExportEnabled: false,
      outboundStatus: "NOT_CONFIGURED",
      exportTokenLastRotatedAt: null,
      lastExportGeneratedAt: null,
      updatedAt: null,
    };
  }

  const importSecretSource = resolveImportSecretSource(calendar, options.env);
  const syncEvidence = await getSyncEvidence(options.prismaClient, calendar.id);
  const latestSafeFailure = syncEvidence.latest
    ? toSafeFailure({
        code: syncEvidence.latest.errorCode,
        message: syncEvidence.latest.errorMessage,
      })
    : null;
  const persistedSafeFailure = toSafeFailure({
    code: calendar.lastFailureCode,
    message: calendar.lastFailureMessage,
  });

  return {
    calendarId: calendar.id,
    property,
    provider: calendar.provider,
    direction: calendar.direction,
    importConfigured: importSecretSource !== "NONE",
    importSecretSource,
    isImportEnabled:
      calendar.direction !== "EXPORT" && calendar.isImportEnabled,
    inboundStatus: resolveInboundStatus(
      calendar,
      importSecretSource,
      syncEvidence.latest,
    ),
    lastSyncAt: syncEvidence.latest
      ? toIsoString(syncEvidence.latest.finishedAt) ??
        syncEvidence.latest.startedAt.toISOString()
      : null,
    lastSuccessfulSyncAt: syncEvidence.lastSuccessful
      ? toIsoString(syncEvidence.lastSuccessful.finishedAt) ??
        syncEvidence.lastSuccessful.startedAt.toISOString()
      : null,
    latestSync: toLatestSync(syncEvidence.latest),
    safeFailure: latestSafeFailure ?? persistedSafeFailure,
    exportConfigured: Boolean(calendar.exportTokenHash),
    exportCopyAvailable: Boolean(
      calendar.exportTokenHash && calendar.exportTokenEncrypted,
    ),
    isExportEnabled:
      calendar.direction !== "IMPORT" && calendar.isExportEnabled,
    outboundStatus: resolveOutboundStatus(calendar),
    exportTokenLastRotatedAt: toIsoString(calendar.exportTokenLastRotatedAt),
    lastExportGeneratedAt: toIsoString(calendar.lastExportGeneratedAt),
    updatedAt: calendar.updatedAt.toISOString(),
  };
}

export async function getAdminExternalCalendarIntegrationsPage(
  options: AdminExternalCalendarIntegrationOptions = {},
): Promise<AdminExternalCalendarIntegrationsPageData> {
  const prismaClient = options.prismaClient ?? prisma;
  const env = options.env ?? process.env;
  const [properties, calendars] = await Promise.all([
    prismaClient.property.findMany({
      where: {
        id: {
          in: [...adminAccommodationIds],
        },
        deletedAt: null,
      },
      select: propertyIntegrationSelect,
    }),
    prismaClient.externalCalendar.findMany({
      where: {
        propertyId: {
          in: [...adminAccommodationIds],
        },
        provider: ExternalCalendarProvider.AIRBNB,
        deletedAt: null,
      },
      select: externalCalendarIntegrationSelect,
    }),
  ]);

  const propertiesById = new Map(properties.map((property) => [property.id, property]));
  const calendarsByPropertyId = new Map(
    calendars.map((calendar) => [calendar.propertyId, calendar]),
  );
  const orderedProperties = adminAccommodationIds.map((propertyId) => {
    const property = propertiesById.get(propertyId);

    if (!property) {
      throw new Error("ADMIN_EXTERNAL_CALENDAR_PROPERTY_NOT_FOUND");
    }

    return property;
  });
  const integrations = await Promise.all(
    orderedProperties.map((property) =>
      toIntegration(property, calendarsByPropertyId.get(property.id) ?? null, {
        prismaClient,
        env,
      }),
    ),
  );

  return { integrations };
}
