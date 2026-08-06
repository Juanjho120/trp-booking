import { Prisma, type PrismaClient } from "@prisma/client";

import { resolveAdminActor } from "@/lib/admin/admin-actor";
import { prisma } from "@/lib/db/prisma";
import { PUBLIC_LOCATION_SETTINGS_ID } from "@/lib/public-location";
import {
  normalizePublicLocationMapEmbedUrl,
  PublicLocationMapUrlError,
} from "@/lib/public-location-map";
import type {
  AdminPublicLocationActor,
  AdminPublicLocationAuditEntry,
  AdminPublicLocationErrorCode,
  AdminPublicLocationPageData,
  AdminPublicLocationSettings,
  UpdateAdminPublicLocationInput,
} from "@/types/admin-public-location";
import { PUBLIC_LOCATION_TEXT_MAX_LENGTH } from "@/types/admin-public-location";

const PUBLIC_LOCATION_TEXT_MIN_LENGTH = 5;
const PUBLIC_LOCATION_AUDIT_ACTION = "PUBLIC_LOCATION_SETTINGS_UPDATED";
const PUBLIC_LOCATION_AUDIT_LIMIT = 20;

const settingsSelect = {
  enabled: true,
  publicLocationEs: true,
  publicLocationEn: true,
  mapEmbedUrl: true,
  updatedAt: true,
} satisfies Prisma.PublicLocationSettingsSelect;

type SettingsRecord = Prisma.PublicLocationSettingsGetPayload<{
  select: typeof settingsSelect;
}>;
type AdminPrismaClient = PrismaClient | Prisma.TransactionClient;
type NormalizedSettings = Readonly<{
  enabled: boolean;
  publicLocationEs: string;
  publicLocationEn: string;
  mapEmbedUrl: string;
}>;

export class AdminPublicLocationError extends Error {
  constructor(public readonly code: AdminPublicLocationErrorCode) {
    super(code);
    this.name = "AdminPublicLocationError";
  }
}

function normalizeText(value: string): string {
  return value.replace(/\r\n/g, "\n").trim();
}

function normalizeMapEmbedUrl(value: string): string {
  try {
    return normalizePublicLocationMapEmbedUrl(value);
  } catch (error) {
    if (error instanceof PublicLocationMapUrlError) {
      throw new AdminPublicLocationError(
        "ADMIN_PUBLIC_LOCATION_MAP_URL_NOT_ALLOWED",
      );
    }

    throw error;
  }
}

function normalizeInput(
  input: UpdateAdminPublicLocationInput,
): NormalizedSettings {
  const normalized = {
    enabled: input.enabled,
    publicLocationEs: normalizeText(input.publicLocationEs),
    publicLocationEn: normalizeText(input.publicLocationEn),
    mapEmbedUrl: normalizeMapEmbedUrl(input.mapEmbedUrl),
  } satisfies NormalizedSettings;

  for (const value of [
    normalized.publicLocationEs,
    normalized.publicLocationEn,
  ]) {
    if (
      value.length > PUBLIC_LOCATION_TEXT_MAX_LENGTH ||
      (value.length > 0 && value.length < PUBLIC_LOCATION_TEXT_MIN_LENGTH)
    ) {
      throw new AdminPublicLocationError(
        "INVALID_ADMIN_PUBLIC_LOCATION_REQUEST",
      );
    }
  }

  if (
    normalized.enabled &&
    (!normalized.publicLocationEs ||
      !normalized.publicLocationEn ||
      !normalized.mapEmbedUrl)
  ) {
    throw new AdminPublicLocationError(
      "INVALID_ADMIN_PUBLIC_LOCATION_REQUEST",
    );
  }

  return normalized;
}

function toComparable(settings: SettingsRecord | null): NormalizedSettings {
  return {
    enabled: settings?.enabled ?? false,
    publicLocationEs: settings?.publicLocationEs ?? "",
    publicLocationEn: settings?.publicLocationEn ?? "",
    mapEmbedUrl: settings?.mapEmbedUrl ?? "",
  };
}

function toSafeMapEmbedUrl(value: string): string {
  try {
    return normalizePublicLocationMapEmbedUrl(value);
  } catch (error) {
    if (error instanceof PublicLocationMapUrlError) {
      return "";
    }

    throw error;
  }
}

function toSafeSnapshot(settings: NormalizedSettings): NormalizedSettings {
  const mapEmbedUrl = toSafeMapEmbedUrl(settings.mapEmbedUrl);

  return {
    enabled:
      settings.enabled &&
      Boolean(
        settings.publicLocationEs &&
          settings.publicLocationEn &&
          mapEmbedUrl,
      ),
    publicLocationEs: settings.publicLocationEs,
    publicLocationEn: settings.publicLocationEn,
    mapEmbedUrl,
  };
}

function toAdminSettings(
  settings: SettingsRecord | null,
): AdminPublicLocationSettings {
  const safeSettings = toSafeSnapshot(toComparable(settings));

  return {
    ...safeSettings,
    updatedAt: settings?.updatedAt.toISOString() ?? null,
  };
}

function getChangedFields(
  before: NormalizedSettings,
  after: NormalizedSettings,
): string[] {
  return (Object.keys(after) as Array<keyof NormalizedSettings>).filter(
    (field) => before[field] !== after[field],
  );
}

function parseAuditMetadata(
  metadata: Prisma.JsonValue,
): Readonly<{
  changedFields: readonly string[];
  enabledBefore: boolean;
  enabledAfter: boolean;
}> {
  if (!metadata || typeof metadata !== "object" || Array.isArray(metadata)) {
    return { changedFields: [], enabledBefore: false, enabledAfter: false };
  }

  const record = metadata as Prisma.JsonObject;
  const changedFields = Array.isArray(record.changedFields)
    ? record.changedFields.filter(
        (value): value is string => typeof value === "string",
      )
    : [];
  const before =
    record.before &&
    typeof record.before === "object" &&
    !Array.isArray(record.before)
      ? (record.before as Prisma.JsonObject)
      : {};
  const after =
    record.after &&
    typeof record.after === "object" &&
    !Array.isArray(record.after)
      ? (record.after as Prisma.JsonObject)
      : {};

  return {
    changedFields,
    enabledBefore:
      typeof before.enabled === "boolean" ? before.enabled : false,
    enabledAfter: typeof after.enabled === "boolean" ? after.enabled : false,
  };
}

async function getSettings(
  prismaClient: AdminPrismaClient,
): Promise<SettingsRecord | null> {
  return prismaClient.publicLocationSettings.findUnique({
    where: { id: PUBLIC_LOCATION_SETTINGS_ID },
    select: settingsSelect,
  });
}

async function getAuditHistory(
  prismaClient: AdminPrismaClient,
): Promise<readonly AdminPublicLocationAuditEntry[]> {
  const rows = await prismaClient.adminAuditLog.findMany({
    where: {
      action: PUBLIC_LOCATION_AUDIT_ACTION,
      entityType: "PublicLocationSettings",
      entityId: PUBLIC_LOCATION_SETTINGS_ID,
    },
    orderBy: { createdAt: "desc" },
    take: PUBLIC_LOCATION_AUDIT_LIMIT,
    select: {
      id: true,
      createdAt: true,
      metadata: true,
      user: {
        select: {
          name: true,
          email: true,
        },
      },
    },
  });

  return rows.map((row) => {
    const metadata = parseAuditMetadata(row.metadata);

    return {
      id: row.id,
      createdAt: row.createdAt.toISOString(),
      actor: {
        name: row.user?.name ?? null,
        email: row.user?.email ?? null,
      },
      ...metadata,
    };
  });
}

export async function getAdminPublicLocationPage(
  prismaClient: AdminPrismaClient = prisma,
): Promise<AdminPublicLocationPageData> {
  const [settings, history] = await Promise.all([
    getSettings(prismaClient),
    getAuditHistory(prismaClient),
  ]);

  return {
    settings: toAdminSettings(settings),
    history,
  };
}

export async function updateAdminPublicLocation(
  input: UpdateAdminPublicLocationInput,
  actor: AdminPublicLocationActor,
): Promise<AdminPublicLocationSettings> {
  const normalized = normalizeInput(input);

  try {
    return await prisma.$transaction(
      async (transaction) => {
        const adminActor = await resolveAdminActor(transaction, actor);
        const current = await getSettings(transaction);
        const currentUpdatedAt = current?.updatedAt.toISOString() ?? null;

        if (currentUpdatedAt !== input.expectedUpdatedAt) {
          throw new AdminPublicLocationError(
            "ADMIN_PUBLIC_LOCATION_STALE",
          );
        }

        const before = toComparable(current);
        const changedFields = getChangedFields(before, normalized);

        if (changedFields.length === 0) {
          return toAdminSettings(current);
        }

        const updatedAt = new Date();
        let updated: SettingsRecord;

        if (current) {
          const result = await transaction.publicLocationSettings.updateMany({
            where: {
              id: PUBLIC_LOCATION_SETTINGS_ID,
              updatedAt: current.updatedAt,
            },
            data: {
              ...normalized,
              publicLocationEs: normalized.publicLocationEs || null,
              publicLocationEn: normalized.publicLocationEn || null,
              mapEmbedUrl: normalized.mapEmbedUrl || null,
              updatedAt,
            },
          });

          if (result.count !== 1) {
            throw new AdminPublicLocationError(
              "ADMIN_PUBLIC_LOCATION_STALE",
            );
          }

          const reloaded = await getSettings(transaction);
          if (!reloaded) {
            throw new AdminPublicLocationError(
              "ADMIN_PUBLIC_LOCATION_UNEXPECTED_ERROR",
            );
          }
          updated = reloaded;
        } else {
          updated = await transaction.publicLocationSettings.create({
            data: {
              id: PUBLIC_LOCATION_SETTINGS_ID,
              ...normalized,
              publicLocationEs: normalized.publicLocationEs || null,
              publicLocationEn: normalized.publicLocationEn || null,
              mapEmbedUrl: normalized.mapEmbedUrl || null,
              updatedAt,
            },
            select: settingsSelect,
          });
        }

        await transaction.adminAuditLog.create({
          data: {
            userId: adminActor.id,
            action: PUBLIC_LOCATION_AUDIT_ACTION,
            entityType: "PublicLocationSettings",
            entityId: PUBLIC_LOCATION_SETTINGS_ID,
            metadata: {
              actorEmail: adminActor.email,
              changedFields,
              before: toSafeSnapshot(before),
              after: toSafeSnapshot(normalized),
            },
          },
        });

        return toAdminSettings(updated);
      },
      { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
    );
  } catch (error) {
    if (error instanceof AdminPublicLocationError) {
      throw error;
    }

    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      (error.code === "P2002" || error.code === "P2034")
    ) {
      throw new AdminPublicLocationError("ADMIN_PUBLIC_LOCATION_STALE");
    }

    throw new AdminPublicLocationError(
      "ADMIN_PUBLIC_LOCATION_UNEXPECTED_ERROR",
    );
  }
}
