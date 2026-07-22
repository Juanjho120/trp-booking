import { Prisma, type PrismaClient } from "@prisma/client";

import { resolveAdminActor } from "@/lib/admin/admin-actor";
import { isAdminAccommodationId } from "@/lib/admin/accommodations";
import { prisma } from "@/lib/db/prisma";
import type {
  AdminArrivalInstructionsActor,
  AdminArrivalInstructionsErrorCode,
  AdminArrivalInstructionsProperty,
  UpdateAdminArrivalInstructionsInput,
} from "@/types/admin-arrival-instructions";
import {
  ARRIVAL_INSTRUCTIONS_DEFAULT_LEAD_TIME_HOURS,
  ARRIVAL_INSTRUCTIONS_MAX_LEAD_TIME_HOURS,
  ARRIVAL_INSTRUCTIONS_MIN_LEAD_TIME_HOURS,
} from "@/types/admin-arrival-instructions";

const ADDRESS_MIN_LENGTH = 5;
const ADDRESS_MAX_LENGTH = 500;
const INSTRUCTIONS_MIN_LENGTH = 20;
const INSTRUCTIONS_MAX_LENGTH = 5_000;
const MAP_URL_MAX_LENGTH = 500;

const arrivalInstructionsSelect = {
  id: true,
  enabled: true,
  leadTimeHours: true,
  exactAddress: true,
  mapUrl: true,
  instructionsEs: true,
  instructionsEn: true,
  updatedAt: true,
} satisfies Prisma.PropertyArrivalInstructionsSelect;

const propertySelect = {
  id: true,
  nameEs: true,
  nameEn: true,
  checkInTime: true,
  arrivalInstructions: {
    select: arrivalInstructionsSelect,
  },
} satisfies Prisma.PropertySelect;

type PropertyRecord = Prisma.PropertyGetPayload<{
  select: typeof propertySelect;
}>;

type AdminPrismaClient = PrismaClient | Prisma.TransactionClient;

type NormalizedArrivalInstructions = Readonly<{
  enabled: boolean;
  leadTimeHours: number;
  exactAddress: string;
  mapUrl: string;
  instructionsEs: string;
  instructionsEn: string;
}>;

export class AdminArrivalInstructionsError extends Error {
  constructor(public readonly code: AdminArrivalInstructionsErrorCode) {
    super(code);
    this.name = "AdminArrivalInstructionsError";
  }
}

function normalizeMultiline(value: string): string {
  return value.replace(/\r\n/g, "\n").trim();
}

function assertOptionalLength(
  value: string,
  minimum: number,
  maximum: number,
): void {
  if (value.length > maximum || (value.length > 0 && value.length < minimum)) {
    throw new AdminArrivalInstructionsError(
      "INVALID_ADMIN_ARRIVAL_INSTRUCTIONS_REQUEST",
    );
  }
}

function normalizeMapUrl(value: string): string {
  const normalized = value.trim();

  if (!normalized) {
    return "";
  }

  if (normalized.length > MAP_URL_MAX_LENGTH) {
    throw new AdminArrivalInstructionsError(
      "INVALID_ADMIN_ARRIVAL_INSTRUCTIONS_REQUEST",
    );
  }

  try {
    const url = new URL(normalized);

    if (url.protocol !== "https:" || url.username || url.password) {
      throw new Error("Invalid map URL");
    }

    return url.toString();
  } catch {
    throw new AdminArrivalInstructionsError(
      "INVALID_ADMIN_ARRIVAL_INSTRUCTIONS_REQUEST",
    );
  }
}

function normalizeInput(
  input: UpdateAdminArrivalInstructionsInput,
): NormalizedArrivalInstructions {
  if (
    !Number.isInteger(input.leadTimeHours) ||
    input.leadTimeHours < ARRIVAL_INSTRUCTIONS_MIN_LEAD_TIME_HOURS ||
    input.leadTimeHours > ARRIVAL_INSTRUCTIONS_MAX_LEAD_TIME_HOURS
  ) {
    throw new AdminArrivalInstructionsError(
      "INVALID_ADMIN_ARRIVAL_INSTRUCTIONS_REQUEST",
    );
  }

  const normalized = {
    enabled: input.enabled,
    leadTimeHours: input.leadTimeHours,
    exactAddress: normalizeMultiline(input.exactAddress),
    mapUrl: normalizeMapUrl(input.mapUrl),
    instructionsEs: normalizeMultiline(input.instructionsEs),
    instructionsEn: normalizeMultiline(input.instructionsEn),
  } satisfies NormalizedArrivalInstructions;

  assertOptionalLength(
    normalized.exactAddress,
    ADDRESS_MIN_LENGTH,
    ADDRESS_MAX_LENGTH,
  );
  assertOptionalLength(
    normalized.instructionsEs,
    INSTRUCTIONS_MIN_LENGTH,
    INSTRUCTIONS_MAX_LENGTH,
  );
  assertOptionalLength(
    normalized.instructionsEn,
    INSTRUCTIONS_MIN_LENGTH,
    INSTRUCTIONS_MAX_LENGTH,
  );

  if (
    normalized.enabled &&
    (!normalized.exactAddress ||
      !normalized.instructionsEs ||
      !normalized.instructionsEn)
  ) {
    throw new AdminArrivalInstructionsError(
      "INVALID_ADMIN_ARRIVAL_INSTRUCTIONS_REQUEST",
    );
  }

  return normalized;
}

function toSettings(property: PropertyRecord): AdminArrivalInstructionsProperty {
  const settings = property.arrivalInstructions;

  return {
    propertyId: property.id,
    propertyNameEs: property.nameEs,
    propertyNameEn: property.nameEn,
    checkInTime: property.checkInTime,
    enabled: settings?.enabled ?? false,
    leadTimeHours:
      settings?.leadTimeHours ?? ARRIVAL_INSTRUCTIONS_DEFAULT_LEAD_TIME_HOURS,
    exactAddress: settings?.exactAddress ?? "",
    mapUrl: settings?.mapUrl ?? "",
    instructionsEs: settings?.instructionsEs ?? "",
    instructionsEn: settings?.instructionsEn ?? "",
    updatedAt: settings?.updatedAt.toISOString() ?? null,
  };
}

function toComparable(
  settings: PropertyRecord["arrivalInstructions"],
): NormalizedArrivalInstructions {
  return {
    enabled: settings?.enabled ?? false,
    leadTimeHours:
      settings?.leadTimeHours ?? ARRIVAL_INSTRUCTIONS_DEFAULT_LEAD_TIME_HOURS,
    exactAddress: settings?.exactAddress ?? "",
    mapUrl: settings?.mapUrl ?? "",
    instructionsEs: settings?.instructionsEs ?? "",
    instructionsEn: settings?.instructionsEn ?? "",
  };
}

function getChangedFields(
  before: NormalizedArrivalInstructions,
  after: NormalizedArrivalInstructions,
): string[] {
  return (Object.keys(after) as Array<keyof NormalizedArrivalInstructions>).filter(
    (field) => before[field] !== after[field],
  );
}

export async function getAdminArrivalInstructionsByPropertyId(
  propertyId: string,
  prismaClient: AdminPrismaClient = prisma,
): Promise<AdminArrivalInstructionsProperty | null> {
  if (!isAdminAccommodationId(propertyId)) {
    return null;
  }

  const property = await prismaClient.property.findFirst({
    where: {
      id: propertyId,
      deletedAt: null,
    },
    select: propertySelect,
  });

  return property ? toSettings(property) : null;
}

export async function updateAdminArrivalInstructions(
  input: UpdateAdminArrivalInstructionsInput,
  actor: AdminArrivalInstructionsActor,
): Promise<AdminArrivalInstructionsProperty> {
  if (!isAdminAccommodationId(input.propertyId)) {
    throw new AdminArrivalInstructionsError(
      "ADMIN_ARRIVAL_INSTRUCTIONS_PROPERTY_NOT_FOUND",
    );
  }

  const normalized = normalizeInput(input);

  try {
    return await prisma.$transaction(
      async (transaction) => {
        const adminActor = await resolveAdminActor(transaction, actor);
        const property = await transaction.property.findFirst({
          where: {
            id: input.propertyId,
            deletedAt: null,
          },
          select: propertySelect,
        });

        if (!property) {
          throw new AdminArrivalInstructionsError(
            "ADMIN_ARRIVAL_INSTRUCTIONS_PROPERTY_NOT_FOUND",
          );
        }

        const currentUpdatedAt =
          property.arrivalInstructions?.updatedAt.toISOString() ?? null;

        if (currentUpdatedAt !== input.expectedUpdatedAt) {
          throw new AdminArrivalInstructionsError(
            "ADMIN_ARRIVAL_INSTRUCTIONS_STALE",
          );
        }

        const before = toComparable(property.arrivalInstructions);
        const changedFields = getChangedFields(before, normalized);

        if (changedFields.length === 0) {
          return toSettings(property);
        }

        const updatedAt = new Date();
        let settingsId: string;

        if (property.arrivalInstructions) {
          const result = await transaction.propertyArrivalInstructions.updateMany({
            where: {
              id: property.arrivalInstructions.id,
              updatedAt: property.arrivalInstructions.updatedAt,
            },
            data: {
              ...normalized,
              exactAddress: normalized.exactAddress || null,
              mapUrl: normalized.mapUrl || null,
              instructionsEs: normalized.instructionsEs || null,
              instructionsEn: normalized.instructionsEn || null,
              updatedAt,
            },
          });

          if (result.count !== 1) {
            throw new AdminArrivalInstructionsError(
              "ADMIN_ARRIVAL_INSTRUCTIONS_STALE",
            );
          }

          settingsId = property.arrivalInstructions.id;
        } else {
          const created = await transaction.propertyArrivalInstructions.create({
            data: {
              propertyId: property.id,
              ...normalized,
              exactAddress: normalized.exactAddress || null,
              mapUrl: normalized.mapUrl || null,
              instructionsEs: normalized.instructionsEs || null,
              instructionsEn: normalized.instructionsEn || null,
              updatedAt,
            },
            select: {
              id: true,
            },
          });
          settingsId = created.id;
        }

        const superseded = await transaction.emailNotification.updateMany({
          where: {
            type: "ARRIVAL_INSTRUCTIONS",
            status: {
              in: ["PENDING", "FAILED"],
            },
            reservation: {
              propertyId: property.id,
            },
          },
          data: {
            status: "SKIPPED",
            nextAttemptAt: null,
            processingStartedAt: null,
            errorCode: "EMAIL_ARRIVAL_INSTRUCTIONS_SUPERSEDED",
            errorMessage:
              "Arrival instructions changed before this notification was delivered.",
          },
        });

        await transaction.adminAuditLog.create({
          data: {
            userId: adminActor.id,
            action: "PROPERTY_ARRIVAL_INSTRUCTIONS_UPDATED",
            entityType: "PropertyArrivalInstructions",
            entityId: settingsId,
            metadata: {
              actorEmail: adminActor.email,
              propertyId: property.id,
              changedFields,
              enabledBefore: before.enabled,
              enabledAfter: normalized.enabled,
              leadTimeHoursBefore: before.leadTimeHours,
              leadTimeHoursAfter: normalized.leadTimeHours,
              exactAddressChanged:
                before.exactAddress !== normalized.exactAddress,
              mapUrlChanged: before.mapUrl !== normalized.mapUrl,
              instructionsEsChanged:
                before.instructionsEs !== normalized.instructionsEs,
              instructionsEnChanged:
                before.instructionsEn !== normalized.instructionsEn,
              supersededNotificationCount: superseded.count,
            },
          },
        });

        const updatedProperty = await transaction.property.findUnique({
          where: {
            id: property.id,
          },
          select: propertySelect,
        });

        if (!updatedProperty) {
          throw new AdminArrivalInstructionsError(
            "ADMIN_ARRIVAL_INSTRUCTIONS_PROPERTY_NOT_FOUND",
          );
        }

        return toSettings(updatedProperty);
      },
      {
        isolationLevel: Prisma.TransactionIsolationLevel.Serializable,
      },
    );
  } catch (error) {
    if (error instanceof AdminArrivalInstructionsError) {
      throw error;
    }

    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      (error.code === "P2002" || error.code === "P2034")
    ) {
      throw new AdminArrivalInstructionsError(
        "ADMIN_ARRIVAL_INSTRUCTIONS_STALE",
      );
    }

    throw new AdminArrivalInstructionsError(
      "ADMIN_ARRIVAL_INSTRUCTIONS_UNEXPECTED_ERROR",
    );
  }
}
