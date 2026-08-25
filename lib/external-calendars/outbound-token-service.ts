import {
  ExternalCalendarProvider,
  Prisma,
  type PrismaClient,
} from "@prisma/client";

import { resolveAdminActor } from "@/lib/admin/admin-actor";
import { prisma } from "@/lib/db/prisma";
import type { AdminActor } from "@/types/admin";

import { createExternalCalendarExportTokenMaterial } from "./export-token";

const OUTBOUND_TOKEN_TRANSACTION_MAX_WAIT_MS = 10_000;
const OUTBOUND_TOKEN_TRANSACTION_TIMEOUT_MS = 20_000;
const OUTBOUND_TOKEN_TRANSACTION_MAX_ATTEMPTS = 3;

export type ExternalCalendarOutboundTokenMutationErrorCode =
  | "INVALID_EXTERNAL_CALENDAR_OUTBOUND_TOKEN_REQUEST"
  | "EXTERNAL_CALENDAR_NOT_FOUND"
  | "EXTERNAL_CALENDAR_EXPORT_TOKEN_ALREADY_CONFIGURED"
  | "EXTERNAL_CALENDAR_EXPORT_TOKEN_NOT_CONFIGURED"
  | "EXTERNAL_CALENDAR_CONFIGURATION_STALE";

export class ExternalCalendarOutboundTokenMutationError extends Error {
  constructor(
    public readonly code: ExternalCalendarOutboundTokenMutationErrorCode,
  ) {
    super(code);
    this.name = "ExternalCalendarOutboundTokenMutationError";
  }
}

type ExternalCalendarOutboundTokenMutationInput = Readonly<{
  externalCalendarId: string;
  expectedUpdatedAt: Date;
  actor: AdminActor;
}>;

type ExternalCalendarOutboundTokenMutationOptions = Readonly<{
  prismaClient?: PrismaClient;
  now?: Date;
}>;

export type ExternalCalendarOutboundTokenMutationResult = Readonly<{
  externalCalendarId: string;
  propertyId: string;
  exportTokenLastRotatedAt: string;
  updatedAt: string;
}>;

type TokenMutationMode = "GENERATE" | "ROTATE";

const outboundTokenCalendarSelect = {
  id: true,
  propertyId: true,
  provider: true,
  exportTokenHash: true,
  exportTokenEncrypted: true,
  updatedAt: true,
  deletedAt: true,
} satisfies Prisma.ExternalCalendarSelect;

async function mutateExternalCalendarOutboundToken(
  mode: TokenMutationMode,
  input: ExternalCalendarOutboundTokenMutationInput,
  options: ExternalCalendarOutboundTokenMutationOptions = {},
): Promise<ExternalCalendarOutboundTokenMutationResult> {
  const prismaClient = options.prismaClient ?? prisma;
  const externalCalendarId = input.externalCalendarId.trim();
  const now = options.now ?? new Date();

  if (
    !externalCalendarId ||
    !(input.expectedUpdatedAt instanceof Date) ||
    Number.isNaN(input.expectedUpdatedAt.getTime())
  ) {
    throw new ExternalCalendarOutboundTokenMutationError(
      "INVALID_EXTERNAL_CALENDAR_OUTBOUND_TOKEN_REQUEST",
    );
  }

  const runTransaction = () => prismaClient.$transaction(
    async (transaction) => {
      const adminActor = await resolveAdminActor(transaction, input.actor);
      const calendar = await transaction.externalCalendar.findFirst({
        where: {
          id: externalCalendarId,
          provider: ExternalCalendarProvider.AIRBNB,
          deletedAt: null,
        },
        select: outboundTokenCalendarSelect,
      });

      if (!calendar) {
        throw new ExternalCalendarOutboundTokenMutationError(
          "EXTERNAL_CALENDAR_NOT_FOUND",
        );
      }

      if (calendar.updatedAt.getTime() !== input.expectedUpdatedAt.getTime()) {
        throw new ExternalCalendarOutboundTokenMutationError(
          "EXTERNAL_CALENDAR_CONFIGURATION_STALE",
        );
      }

      if (
        mode === "GENERATE" &&
        (calendar.exportTokenHash || calendar.exportTokenEncrypted)
      ) {
        throw new ExternalCalendarOutboundTokenMutationError(
          "EXTERNAL_CALENDAR_EXPORT_TOKEN_ALREADY_CONFIGURED",
        );
      }

      if (mode === "ROTATE" && !calendar.exportTokenHash) {
        throw new ExternalCalendarOutboundTokenMutationError(
          "EXTERNAL_CALENDAR_EXPORT_TOKEN_NOT_CONFIGURED",
        );
      }

      const tokenMaterial = createExternalCalendarExportTokenMaterial(
        calendar.propertyId,
      );
      const updateResult = await transaction.externalCalendar.updateMany({
        where: {
          id: calendar.id,
          provider: ExternalCalendarProvider.AIRBNB,
          deletedAt: null,
          updatedAt: input.expectedUpdatedAt,
          ...(mode === "GENERATE"
            ? {
                exportTokenHash: null,
                exportTokenEncrypted: null,
              }
            : {
                exportTokenHash: { not: null },
              }),
        },
        data: {
          exportTokenHash: tokenMaterial.tokenHash,
          exportTokenEncrypted: tokenMaterial.encryptedToken,
          exportTokenLastRotatedAt: now,
          updatedAt: now,
        },
      });

      if (updateResult.count !== 1) {
        throw new ExternalCalendarOutboundTokenMutationError(
          "EXTERNAL_CALENDAR_CONFIGURATION_STALE",
        );
      }

      await transaction.adminAuditLog.create({
        data: {
          userId: adminActor.id,
          action:
            mode === "GENERATE"
              ? "EXTERNAL_CALENDAR_EXPORT_TOKEN_GENERATED"
              : "EXTERNAL_CALENDAR_EXPORT_TOKEN_ROTATED",
          entityType: "ExternalCalendar",
          entityId: calendar.id,
          metadata: {
            actorEmail: adminActor.email,
            propertyId: calendar.propertyId,
            provider: calendar.provider,
            previousConfigured: Boolean(calendar.exportTokenHash),
            newConfigured: true,
            rotationTimestamp: now.toISOString(),
          },
        },
      });

      return {
        externalCalendarId: calendar.id,
        propertyId: calendar.propertyId,
        exportTokenLastRotatedAt: now.toISOString(),
        updatedAt: now.toISOString(),
      };
    },
    {
      isolationLevel: Prisma.TransactionIsolationLevel.Serializable,
      maxWait: OUTBOUND_TOKEN_TRANSACTION_MAX_WAIT_MS,
      timeout: OUTBOUND_TOKEN_TRANSACTION_TIMEOUT_MS,
    },
  );

  let attempt = 1;

  while (true) {
    try {
      return await runTransaction();
    } catch (error) {
      if (
        !(error instanceof Prisma.PrismaClientKnownRequestError) ||
        error.code !== "P2034" ||
        attempt >= OUTBOUND_TOKEN_TRANSACTION_MAX_ATTEMPTS
      ) {
        throw error;
      }

      attempt += 1;
    }
  }
}

export async function generateExternalCalendarOutboundToken(
  input: ExternalCalendarOutboundTokenMutationInput,
  options: ExternalCalendarOutboundTokenMutationOptions = {},
): Promise<ExternalCalendarOutboundTokenMutationResult> {
  return mutateExternalCalendarOutboundToken("GENERATE", input, options);
}

export async function rotateExternalCalendarOutboundToken(
  input: ExternalCalendarOutboundTokenMutationInput,
  options: ExternalCalendarOutboundTokenMutationOptions = {},
): Promise<ExternalCalendarOutboundTokenMutationResult> {
  return mutateExternalCalendarOutboundToken("ROTATE", input, options);
}
