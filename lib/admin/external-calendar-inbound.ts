import {
  ExternalCalendarDirection,
  ExternalCalendarProvider,
  ExternalCalendarStatus,
  Prisma,
  type PrismaClient,
} from "@prisma/client";

import { resolveAdminActor } from "@/lib/admin/admin-actor";
import { adminAccommodationIds } from "@/lib/admin/accommodations";
import { syncAirbnbIcalCalendarManually } from "@/lib/airbnb-ical/scheduled-sync";
import {
  AirbnbIcalProviderError,
  assertAllowedAirbnbIcalUrl,
  testAirbnbIcalConnection,
} from "@/lib/airbnb-ical/provider-security";
import { prisma } from "@/lib/db/prisma";
import {
  resolveAirbnbIcalImportUrlDatabaseFirst,
  resolveAirbnbImportSecretSource,
} from "@/lib/external-calendars/airbnb-import-secret";
import { encryptExternalCalendarSecret } from "@/lib/external-calendars/secret-crypto";
import type { AdminActor } from "@/types/admin";
import type {
  AdminExternalCalendarInboundErrorCode,
  AdminExternalCalendarTestConnectionResult,
} from "@/types/admin-external-calendar-integration";

const ENTITY_TYPE = "ExternalCalendar";
const GENERIC_PROVIDER_FAILURE_CODE = "ICAL_PROVIDER_TEST_FAILED";

type AdminPrismaClient = PrismaClient | Prisma.TransactionClient;

const calendarSelect = {
  id: true,
  propertyId: true,
  provider: true,
  direction: true,
  name: true,
  importUrlEncrypted: true,
  isImportEnabled: true,
  isExportEnabled: true,
  status: true,
  updatedAt: true,
  deletedAt: true,
} satisfies Prisma.ExternalCalendarSelect;

const propertySelect = {
  id: true,
  nameEn: true,
} satisfies Prisma.PropertySelect;

type CalendarRecord = Prisma.ExternalCalendarGetPayload<{
  select: typeof calendarSelect;
}>;

type PropertyRecord = Prisma.PropertyGetPayload<{
  select: typeof propertySelect;
}>;

export class AdminExternalCalendarInboundError extends Error {
  constructor(public readonly code: AdminExternalCalendarInboundErrorCode) {
    super(code);
    this.name = "AdminExternalCalendarInboundError";
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
    throw new AdminExternalCalendarInboundError(
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
    throw new AdminExternalCalendarInboundError(
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
    throw new AdminExternalCalendarInboundError(
      "ADMIN_EXTERNAL_CALENDAR_NOT_FOUND",
    );
  }

  return calendar;
}

function assertExpectedUpdatedAt(
  calendar: CalendarRecord,
  expectedUpdatedAt: string | null,
): void {
  if (calendar.updatedAt.toISOString() !== expectedUpdatedAt) {
    throw new AdminExternalCalendarInboundError(
      "ADMIN_EXTERNAL_CALENDAR_STALE",
    );
  }
}

function toImportDirection(
  direction: ExternalCalendarDirection,
): ExternalCalendarDirection {
  return direction === ExternalCalendarDirection.EXPORT
    ? ExternalCalendarDirection.BIDIRECTIONAL
    : direction;
}

function mapProviderError(error: unknown): AdminExternalCalendarInboundError {
  if (error instanceof AdminExternalCalendarInboundError) {
    return error;
  }

  if (error instanceof AirbnbIcalProviderError) {
    if (error.code === "ICAL_URL_NOT_ALLOWED") {
      return new AdminExternalCalendarInboundError(
        "ADMIN_EXTERNAL_CALENDAR_IMPORT_URL_NOT_ALLOWED",
      );
    }

    if (
      error.code === "ICAL_PROVIDER_TIMEOUT" ||
      error.code === "ICAL_PROVIDER_UNAVAILABLE"
    ) {
      return new AdminExternalCalendarInboundError(
        "ADMIN_EXTERNAL_CALENDAR_PROVIDER_UNAVAILABLE",
      );
    }

    return new AdminExternalCalendarInboundError(
      "ADMIN_EXTERNAL_CALENDAR_IMPORT_TEST_FAILED",
    );
  }

  if (error instanceof Error && error.message.startsWith("ICAL_HTTP_")) {
    return new AdminExternalCalendarInboundError(
      "ADMIN_EXTERNAL_CALENDAR_PROVIDER_UNAVAILABLE",
    );
  }

  return new AdminExternalCalendarInboundError(
    "ADMIN_EXTERNAL_CALENDAR_UNEXPECTED_ERROR",
  );
}

function safeResultCode(error: unknown): string {
  if (error instanceof AdminExternalCalendarInboundError) {
    return error.code;
  }

  if (error instanceof AirbnbIcalProviderError) {
    return error.code;
  }

  if (error instanceof Error && /^[A-Za-z0-9_-]{1,100}$/.test(error.name)) {
    return error.name;
  }

  return GENERIC_PROVIDER_FAILURE_CODE;
}

async function audit(
  prismaClient: AdminPrismaClient,
  input: Readonly<{
    actorId: string;
    actorEmail: string;
    action: string;
    calendarId: string;
    propertyId: string;
    metadata?: Prisma.InputJsonObject;
  }>,
): Promise<void> {
  await prismaClient.adminAuditLog.create({
    data: {
      userId: input.actorId,
      action: input.action,
      entityType: ENTITY_TYPE,
      entityId: input.calendarId,
      metadata: {
        actorEmail: input.actorEmail,
        propertyId: input.propertyId,
        provider: "AIRBNB",
        ...(input.metadata ?? {}),
      },
    },
  });
}

async function auditStandalone(
  actor: AdminActor,
  input: Readonly<{
    action: string;
    calendarId: string;
    propertyId: string;
    metadata?: Prisma.InputJsonObject;
  }>,
): Promise<void> {
  await prisma.$transaction(async (transaction) => {
    const adminActor = await resolveAdminActor(transaction, actor);
    await audit(transaction, {
      actorId: adminActor.id,
      actorEmail: adminActor.email,
      ...input,
    });
  });
}

export async function saveAdminAirbnbImportUrl(
  input: Readonly<{
    propertyId: string;
    importUrl: string;
    expectedUpdatedAt: string | null;
  }>,
  actor: AdminActor,
): Promise<void> {
  const normalizedUrl = input.importUrl.trim();

  try {
    assertAllowedAirbnbIcalUrl(normalizedUrl);
  } catch (error) {
    throw mapProviderError(error);
  }

  try {
    await prisma.$transaction(
      async (transaction) => {
        const [adminActor, property] = await Promise.all([
          resolveAdminActor(transaction, actor),
          getProperty(transaction, input.propertyId),
        ]);
        const current = await getCalendar(transaction, property.id);
        const currentIsActive = Boolean(current && !current.deletedAt);

        if (currentIsActive && current) {
          assertExpectedUpdatedAt(current, input.expectedUpdatedAt);
        } else if (input.expectedUpdatedAt !== null) {
          throw new AdminExternalCalendarInboundError(
            "ADMIN_EXTERNAL_CALENDAR_STALE",
          );
        }

        const previousConfigured = current
          ? resolveAirbnbImportSecretSource(current) !== "NONE"
          : false;
        const encryptedUrl = encryptExternalCalendarSecret({
          plaintext: normalizedUrl,
          propertyId: property.id,
          purpose: "AIRBNB_IMPORT",
        });
        const updatedAt = new Date();
        let updated: CalendarRecord;

        if (current) {
          const result = await transaction.externalCalendar.updateMany({
            where: {
              id: current.id,
              updatedAt: current.updatedAt,
            },
            data: {
              direction: toImportDirection(current.direction),
              importUrlEncrypted: encryptedUrl,
              deletedAt: null,
              deletedById: null,
              status: current.deletedAt
                ? ExternalCalendarStatus.ACTIVE
                : current.status,
              lastFailureCode: null,
              lastFailureMessage: null,
              updatedAt,
            },
          });

          if (result.count !== 1) {
            throw new AdminExternalCalendarInboundError(
              "ADMIN_EXTERNAL_CALENDAR_STALE",
            );
          }

          const reloaded = await getCalendar(transaction, property.id);
          if (!reloaded) {
            throw new AdminExternalCalendarInboundError(
              "ADMIN_EXTERNAL_CALENDAR_UNEXPECTED_ERROR",
            );
          }
          updated = reloaded;
        } else {
          updated = await transaction.externalCalendar.create({
            data: {
              propertyId: property.id,
              provider: ExternalCalendarProvider.AIRBNB,
              direction: ExternalCalendarDirection.BIDIRECTIONAL,
              name: `${property.nameEn} Airbnb`,
              importUrlEncrypted: encryptedUrl,
              isImportEnabled: false,
              isExportEnabled: false,
              status: ExternalCalendarStatus.ACTIVE,
              updatedAt,
            },
            select: calendarSelect,
          });
        }

        await audit(transaction, {
          actorId: adminActor.id,
          actorEmail: adminActor.email,
          action: previousConfigured
            ? "EXTERNAL_CALENDAR_IMPORT_URL_REPLACED"
            : "EXTERNAL_CALENDAR_IMPORT_URL_SAVED",
          calendarId: updated.id,
          propertyId: property.id,
          metadata: {
            previousConfigured,
            newConfigured: true,
          },
        });
      },
      { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
    );
  } catch (error) {
    if (error instanceof AdminExternalCalendarInboundError) {
      throw error;
    }

    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      (error.code === "P2002" || error.code === "P2034")
    ) {
      throw new AdminExternalCalendarInboundError(
        "ADMIN_EXTERNAL_CALENDAR_STALE",
      );
    }

    throw new AdminExternalCalendarInboundError(
      "ADMIN_EXTERNAL_CALENDAR_UNEXPECTED_ERROR",
    );
  }
}

export async function testAdminAirbnbImportConnection(
  input: Readonly<{
    propertyId: string;
    candidateImportUrl?: string;
  }>,
  actor: AdminActor,
): Promise<AdminExternalCalendarTestConnectionResult> {
  await getProperty(prisma, input.propertyId);
  const calendar = requireActiveCalendar(
    await getCalendar(prisma, input.propertyId),
  );

  try {
    const candidate = input.candidateImportUrl?.trim();
    const effectiveUrl = candidate
      ? candidate
      : resolveAirbnbIcalImportUrlDatabaseFirst(calendar);

    if (!effectiveUrl) {
      throw new AdminExternalCalendarInboundError(
        "ADMIN_EXTERNAL_CALENDAR_IMPORT_NOT_CONFIGURED",
      );
    }

    const result = await testAirbnbIcalConnection(effectiveUrl);
    await auditStandalone(actor, {
      action: "EXTERNAL_CALENDAR_IMPORT_CONNECTION_TESTED",
      calendarId: calendar.id,
      propertyId: input.propertyId,
      metadata: {
        resultCode: "SUCCESS",
      },
    });

    return {
      status: "SUCCESS",
      eventsFound: result.eventsFound,
      eventsSkipped: result.eventsSkipped,
    };
  } catch (error) {
    await auditStandalone(actor, {
      action: "EXTERNAL_CALENDAR_IMPORT_CONNECTION_TESTED",
      calendarId: calendar.id,
      propertyId: input.propertyId,
      metadata: {
        resultCode: safeResultCode(error),
      },
    });
    throw mapProviderError(error);
  }
}

export async function syncAdminAirbnbImportNow(
  propertyId: string,
  actor: AdminActor,
): Promise<void> {
  await getProperty(prisma, propertyId);
  const calendar = requireActiveCalendar(await getCalendar(prisma, propertyId));

  if (resolveAirbnbImportSecretSource(calendar) === "NONE") {
    throw new AdminExternalCalendarInboundError(
      "ADMIN_EXTERNAL_CALENDAR_IMPORT_NOT_CONFIGURED",
    );
  }

  if (
    calendar.direction === ExternalCalendarDirection.EXPORT ||
    !calendar.isImportEnabled ||
    calendar.status === ExternalCalendarStatus.INACTIVE
  ) {
    throw new AdminExternalCalendarInboundError(
      "ADMIN_EXTERNAL_CALENDAR_IMPORT_DISABLED",
    );
  }

  try {
    const result = await syncAirbnbIcalCalendarManually({
      externalCalendarId: calendar.id,
    });
    const calendarResult = result.results[0];

    await auditStandalone(actor, {
      action: "EXTERNAL_CALENDAR_IMPORT_SYNC_REQUESTED",
      calendarId: calendar.id,
      propertyId,
      metadata: {
        resultCode:
          calendarResult?.errorCode ?? calendarResult?.status ?? "FAILED",
        ...(calendarResult?.syncLogId
          ? { syncLogId: calendarResult.syncLogId }
          : {}),
      },
    });

    if (!calendarResult || calendarResult.status !== "SUCCESS") {
      throw new AdminExternalCalendarInboundError(
        "ADMIN_EXTERNAL_CALENDAR_IMPORT_SYNC_FAILED",
      );
    }
  } catch (error) {
    if (error instanceof AdminExternalCalendarInboundError) {
      throw error;
    }

    await auditStandalone(actor, {
      action: "EXTERNAL_CALENDAR_IMPORT_SYNC_REQUESTED",
      calendarId: calendar.id,
      propertyId,
      metadata: {
        resultCode: safeResultCode(error),
      },
    });

    throw new AdminExternalCalendarInboundError(
      "ADMIN_EXTERNAL_CALENDAR_IMPORT_SYNC_FAILED",
    );
  }
}

export async function setAdminAirbnbImportEnabled(
  input: Readonly<{
    propertyId: string;
    enabled: boolean;
    expectedUpdatedAt: string | null;
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

        if (
          input.enabled &&
          resolveAirbnbImportSecretSource(current) === "NONE"
        ) {
          throw new AdminExternalCalendarInboundError(
            "ADMIN_EXTERNAL_CALENDAR_IMPORT_NOT_CONFIGURED",
          );
        }

        if (
          current.isImportEnabled === input.enabled &&
          (!input.enabled ||
            (current.direction !== ExternalCalendarDirection.EXPORT &&
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
            isImportEnabled: input.enabled,
            direction: input.enabled
              ? toImportDirection(current.direction)
              : current.direction,
            status:
              input.enabled && current.status === ExternalCalendarStatus.INACTIVE
                ? ExternalCalendarStatus.ACTIVE
                : current.status,
            updatedAt,
          },
        });

        if (result.count !== 1) {
          throw new AdminExternalCalendarInboundError(
            "ADMIN_EXTERNAL_CALENDAR_STALE",
          );
        }

        await audit(transaction, {
          actorId: adminActor.id,
          actorEmail: adminActor.email,
          action: input.enabled
            ? "EXTERNAL_CALENDAR_IMPORT_ENABLED"
            : "EXTERNAL_CALENDAR_IMPORT_DISABLED",
          calendarId: current.id,
          propertyId: input.propertyId,
          metadata: {
            previousEnabled: current.isImportEnabled,
            newEnabled: input.enabled,
          },
        });
      },
      { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
    );
  } catch (error) {
    if (error instanceof AdminExternalCalendarInboundError) {
      throw error;
    }

    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2034"
    ) {
      throw new AdminExternalCalendarInboundError(
        "ADMIN_EXTERNAL_CALENDAR_STALE",
      );
    }

    throw new AdminExternalCalendarInboundError(
      "ADMIN_EXTERNAL_CALENDAR_UNEXPECTED_ERROR",
    );
  }
}
