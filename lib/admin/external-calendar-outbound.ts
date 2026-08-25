import {
  ExternalCalendarDirection,
  ExternalCalendarProvider,
  ExternalCalendarStatus,
  Prisma,
  type PrismaClient,
} from "@prisma/client";

import { environmentConfig } from "@/config/site";
import { resolveAdminActor } from "@/lib/admin/admin-actor";
import { adminAccommodationIds } from "@/lib/admin/accommodations";
import { prisma } from "@/lib/db/prisma";
import { validateServerEnv } from "@/lib/env/server";
import {
  decryptExternalCalendarExportToken,
  ExternalCalendarOutboundTokenMutationError,
  generateExternalCalendarOutboundToken,
  hashExternalCalendarExportToken,
  rotateExternalCalendarOutboundToken,
} from "@/lib/external-calendars";
import type { AdminActor } from "@/types/admin";
import type { AdminExternalCalendarOutboundErrorCode } from "@/types/admin-external-calendar-integration";

const ENTITY_TYPE = "ExternalCalendar";

type AdminPrismaClient = PrismaClient | Prisma.TransactionClient;

type ExportTokenOperation = "GENERATE" | "ROTATE";

const calendarSelect = {
  id: true,
  propertyId: true,
  provider: true,
  direction: true,
  exportTokenHash: true,
  exportTokenEncrypted: true,
  isExportEnabled: true,
  status: true,
  updatedAt: true,
  deletedAt: true,
} satisfies Prisma.ExternalCalendarSelect;

const propertySelect = {
  id: true,
} satisfies Prisma.PropertySelect;

type CalendarRecord = Prisma.ExternalCalendarGetPayload<{
  select: typeof calendarSelect;
}>;

type PropertyRecord = Prisma.PropertyGetPayload<{
  select: typeof propertySelect;
}>;

export class AdminExternalCalendarOutboundError extends Error {
  constructor(public readonly code: AdminExternalCalendarOutboundErrorCode) {
    super(code);
    this.name = "AdminExternalCalendarOutboundError";
  }
}

function isSupportedPropertyId(propertyId: string): boolean {
  return adminAccommodationIds.includes(
    propertyId as (typeof adminAccommodationIds)[number],
  );
}

async function getProperty(
  prismaClient: AdminPrismaClient,
  propertyId: string,
): Promise<PropertyRecord> {
  if (!isSupportedPropertyId(propertyId)) {
    throw new AdminExternalCalendarOutboundError(
      "ADMIN_EXTERNAL_CALENDAR_PROPERTY_NOT_FOUND",
    );
  }

  const property = await prismaClient.property.findFirst({
    where: {
      id: propertyId,
      deletedAt: null,
    },
    select: propertySelect,
  });

  if (!property) {
    throw new AdminExternalCalendarOutboundError(
      "ADMIN_EXTERNAL_CALENDAR_PROPERTY_NOT_FOUND",
    );
  }

  return property;
}

async function getCalendar(
  prismaClient: AdminPrismaClient,
  propertyId: string,
): Promise<CalendarRecord | null> {
  return prismaClient.externalCalendar.findUnique({
    where: {
      propertyId_provider: {
        propertyId,
        provider: ExternalCalendarProvider.AIRBNB,
      },
    },
    select: calendarSelect,
  });
}

function requireActiveCalendar(calendar: CalendarRecord | null): CalendarRecord {
  if (!calendar || calendar.deletedAt) {
    throw new AdminExternalCalendarOutboundError(
      "ADMIN_EXTERNAL_CALENDAR_NOT_FOUND",
    );
  }

  return calendar;
}

function assertExpectedUpdatedAt(
  calendar: CalendarRecord,
  expectedUpdatedAt: string,
): void {
  if (calendar.updatedAt.toISOString() !== expectedUpdatedAt) {
    throw new AdminExternalCalendarOutboundError(
      "ADMIN_EXTERNAL_CALENDAR_STALE",
    );
  }
}

function toExportDirection(
  direction: ExternalCalendarDirection,
): ExternalCalendarDirection {
  return direction === ExternalCalendarDirection.IMPORT
    ? ExternalCalendarDirection.BIDIRECTIONAL
    : direction;
}

function mapTokenMutationError(
  error: unknown,
): AdminExternalCalendarOutboundError {
  if (error instanceof AdminExternalCalendarOutboundError) {
    return error;
  }

  if (error instanceof ExternalCalendarOutboundTokenMutationError) {
    switch (error.code) {
      case "EXTERNAL_CALENDAR_NOT_FOUND":
        return new AdminExternalCalendarOutboundError(
          "ADMIN_EXTERNAL_CALENDAR_NOT_FOUND",
        );
      case "EXTERNAL_CALENDAR_EXPORT_TOKEN_ALREADY_CONFIGURED":
        return new AdminExternalCalendarOutboundError(
          "ADMIN_EXTERNAL_CALENDAR_EXPORT_ALREADY_CONFIGURED",
        );
      case "EXTERNAL_CALENDAR_EXPORT_TOKEN_NOT_CONFIGURED":
        return new AdminExternalCalendarOutboundError(
          "ADMIN_EXTERNAL_CALENDAR_EXPORT_NOT_CONFIGURED",
        );
      case "EXTERNAL_CALENDAR_CONFIGURATION_STALE":
        return new AdminExternalCalendarOutboundError(
          "ADMIN_EXTERNAL_CALENDAR_STALE",
        );
      case "INVALID_EXTERNAL_CALENDAR_OUTBOUND_TOKEN_REQUEST":
      default:
        return new AdminExternalCalendarOutboundError(
          "INVALID_ADMIN_EXTERNAL_CALENDAR_REQUEST",
        );
    }
  }

  return new AdminExternalCalendarOutboundError(
    "ADMIN_EXTERNAL_CALENDAR_UNEXPECTED_ERROR",
  );
}

function isLocalDevelopmentOrigin(origin: string): boolean {
  let url: URL;

  try {
    url = new URL(origin);
  } catch {
    return false;
  }

  if (url.protocol !== "http:" && url.protocol !== "https:") {
    return false;
  }

  const hostname = url.hostname.toLowerCase();
  return (
    hostname === "localhost" ||
    hostname === "127.0.0.1" ||
    hostname === "[::1]" ||
    hostname === "::1"
  );
}

function getOutboundBaseUrl(
  requestOrigin: string | null,
  envSource: NodeJS.ProcessEnv,
): string {
  const environment = validateServerEnv(envSource).TRP_ENVIRONMENT;

  if (environment === "test") {
    return environmentConfig.test.applicationUrl;
  }

  if (environment === "production") {
    return environmentConfig.production.applicationUrl;
  }

  if (!requestOrigin || !isLocalDevelopmentOrigin(requestOrigin)) {
    throw new AdminExternalCalendarOutboundError(
      "ADMIN_EXTERNAL_CALENDAR_ORIGIN_INVALID",
    );
  }

  return new URL(requestOrigin).origin;
}

async function auditCopyRequest(
  actor: AdminActor,
  calendar: CalendarRecord,
): Promise<void> {
  await prisma.$transaction(async (transaction) => {
    const adminActor = await resolveAdminActor(transaction, actor);

    await transaction.adminAuditLog.create({
      data: {
        userId: adminActor.id,
        action: "EXTERNAL_CALENDAR_EXPORT_URL_COPIED",
        entityType: ENTITY_TYPE,
        entityId: calendar.id,
        metadata: {
          actorEmail: adminActor.email,
          propertyId: calendar.propertyId,
          provider: calendar.provider,
        },
      },
    });
  });
}

export async function mutateAdminAirbnbExportToken(
  input: Readonly<{
    propertyId: string;
    operation: ExportTokenOperation;
    expectedUpdatedAt: string;
  }>,
  actor: AdminActor,
): Promise<void> {
  await getProperty(prisma, input.propertyId);
  const calendar = requireActiveCalendar(
    await getCalendar(prisma, input.propertyId),
  );
  assertExpectedUpdatedAt(calendar, input.expectedUpdatedAt);

  try {
    const mutationInput = {
      externalCalendarId: calendar.id,
      expectedUpdatedAt: calendar.updatedAt,
      actor,
    } as const;

    if (input.operation === "GENERATE") {
      await generateExternalCalendarOutboundToken(mutationInput);
      return;
    }

    await rotateExternalCalendarOutboundToken(mutationInput);
  } catch (error) {
    throw mapTokenMutationError(error);
  }
}

export async function copyAdminAirbnbExportUrl(
  input: Readonly<{
    propertyId: string;
    requestOrigin: string | null;
    env?: NodeJS.ProcessEnv;
  }>,
  actor: AdminActor,
): Promise<string> {
  await getProperty(prisma, input.propertyId);
  const calendar = requireActiveCalendar(
    await getCalendar(prisma, input.propertyId),
  );

  if (!calendar.exportTokenHash) {
    throw new AdminExternalCalendarOutboundError(
      "ADMIN_EXTERNAL_CALENDAR_EXPORT_NOT_CONFIGURED",
    );
  }

  if (!calendar.exportTokenEncrypted) {
    throw new AdminExternalCalendarOutboundError(
      "ADMIN_EXTERNAL_CALENDAR_EXPORT_COPY_UNAVAILABLE",
    );
  }

  let rawToken: string;

  try {
    rawToken = decryptExternalCalendarExportToken(
      calendar.propertyId,
      calendar.exportTokenEncrypted,
    );
  } catch {
    throw new AdminExternalCalendarOutboundError(
      "ADMIN_EXTERNAL_CALENDAR_EXPORT_SECRET_UNAVAILABLE",
    );
  }

  if (hashExternalCalendarExportToken(rawToken) !== calendar.exportTokenHash) {
    throw new AdminExternalCalendarOutboundError(
      "ADMIN_EXTERNAL_CALENDAR_EXPORT_SECRET_UNAVAILABLE",
    );
  }

  const baseUrl = getOutboundBaseUrl(
    input.requestOrigin,
    input.env ?? process.env,
  );
  const outboundUrl = `${baseUrl}/api/ical/${rawToken}.ics`;

  await auditCopyRequest(actor, calendar);

  return outboundUrl;
}

export async function setAdminAirbnbExportEnabled(
  input: Readonly<{
    propertyId: string;
    enabled: boolean;
    expectedUpdatedAt: string;
  }>,
  actor: AdminActor,
): Promise<void> {
  try {
    await prisma.$transaction(
      async (transaction) => {
        const [adminActor] = await Promise.all([
          resolveAdminActor(transaction, actor),
          getProperty(transaction, input.propertyId),
        ]);
        const current = requireActiveCalendar(
          await getCalendar(transaction, input.propertyId),
        );
        assertExpectedUpdatedAt(current, input.expectedUpdatedAt);

        if (input.enabled && !current.exportTokenHash) {
          throw new AdminExternalCalendarOutboundError(
            "ADMIN_EXTERNAL_CALENDAR_EXPORT_NOT_CONFIGURED",
          );
        }

        if (
          current.isExportEnabled === input.enabled &&
          (!input.enabled ||
            (current.direction !== ExternalCalendarDirection.IMPORT &&
              current.status !== ExternalCalendarStatus.INACTIVE))
        ) {
          return;
        }

        const updatedAt = new Date();
        const result = await transaction.externalCalendar.updateMany({
          where: {
            id: current.id,
            updatedAt: current.updatedAt,
          },
          data: {
            isExportEnabled: input.enabled,
            direction: input.enabled
              ? toExportDirection(current.direction)
              : current.direction,
            status:
              input.enabled && current.status === ExternalCalendarStatus.INACTIVE
                ? ExternalCalendarStatus.ACTIVE
                : current.status,
            updatedAt,
          },
        });

        if (result.count !== 1) {
          throw new AdminExternalCalendarOutboundError(
            "ADMIN_EXTERNAL_CALENDAR_STALE",
          );
        }

        await transaction.adminAuditLog.create({
          data: {
            userId: adminActor.id,
            action: input.enabled
              ? "EXTERNAL_CALENDAR_EXPORT_ENABLED"
              : "EXTERNAL_CALENDAR_EXPORT_DISABLED",
            entityType: ENTITY_TYPE,
            entityId: current.id,
            metadata: {
              actorEmail: adminActor.email,
              propertyId: current.propertyId,
              provider: current.provider,
              previousEnabled: current.isExportEnabled,
              newEnabled: input.enabled,
            },
          },
        });
      },
      { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
    );
  } catch (error) {
    if (error instanceof AdminExternalCalendarOutboundError) {
      throw error;
    }

    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2034"
    ) {
      throw new AdminExternalCalendarOutboundError(
        "ADMIN_EXTERNAL_CALENDAR_STALE",
      );
    }

    throw new AdminExternalCalendarOutboundError(
      "ADMIN_EXTERNAL_CALENDAR_UNEXPECTED_ERROR",
    );
  }
}
