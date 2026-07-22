import {
  EmailNotificationOrigin,
  EmailNotificationStatus,
  EmailNotificationType,
  Prisma,
  ReservationStatus,
} from "@prisma/client";

import { prisma } from "@/lib/db/prisma";
import { deliverPendingEmailNotificationsBestEffort } from "@/lib/email";
import type { AdminActor } from "@/types/admin";
import type {
  AdminEmailNotificationResendErrorCode,
  AdminEmailNotificationResendOutcome,
  AdminEmailNotificationResendResult,
  RequestAdminEmailNotificationResendInput,
} from "@/types/admin-email-notification-resend";

import { resolveAdminActor } from "./admin-actor";

const supportedManualResendTypes = new Set<EmailNotificationType>([
  EmailNotificationType.RESERVATION_CONFIRMED,
  EmailNotificationType.ADMIN_NEW_RESERVATION,
]);

const eligibleSourceStatuses = new Set<EmailNotificationStatus>([
  EmailNotificationStatus.PENDING,
  EmailNotificationStatus.FAILED,
  EmailNotificationStatus.SENT,
]);

const notificationSelect = {
  id: true,
  reservationId: true,
  type: true,
  recipient: true,
  locale: true,
  status: true,
  updatedAt: true,
  manualResends: {
    take: 1,
    select: { id: true },
  },
  reservation: {
    select: {
      status: true,
      confirmedAt: true,
    },
  },
} satisfies Prisma.EmailNotificationSelect;

type SourceNotification = Prisma.EmailNotificationGetPayload<{
  select: typeof notificationSelect;
}>;

type PersistedManualRequest = Readonly<{
  notificationId: string;
  created: boolean;
}>;

export class AdminEmailNotificationResendError extends Error {
  constructor(public readonly code: AdminEmailNotificationResendErrorCode) {
    super(code);
    this.name = "AdminEmailNotificationResendError";
  }
}

function normalizeId(value: string): string {
  return value.trim();
}

function buildManualDeduplicationKey(
  sourceNotificationId: string,
  requestId: string,
): string {
  return `manual-resend/${sourceNotificationId}/${requestId}`;
}

function assertSourceIsEligible(
  source: SourceNotification,
  expectedUpdatedAt: string,
): void {
  if (source.updatedAt.toISOString() !== expectedUpdatedAt) {
    throw new AdminEmailNotificationResendError(
      "ADMIN_EMAIL_NOTIFICATION_STALE",
    );
  }

  if (source.status === EmailNotificationStatus.PROCESSING) {
    throw new AdminEmailNotificationResendError(
      "ADMIN_EMAIL_NOTIFICATION_PROCESSING_ACTIVE",
    );
  }

  if (
    !eligibleSourceStatuses.has(source.status) ||
    !supportedManualResendTypes.has(source.type) ||
    (source.status !== EmailNotificationStatus.SENT &&
      source.manualResends.length > 0)
  ) {
    throw new AdminEmailNotificationResendError(
      "ADMIN_EMAIL_NOTIFICATION_RESEND_NOT_ALLOWED",
    );
  }

  if (
    source.reservation.status !== ReservationStatus.CONFIRMED ||
    !source.reservation.confirmedAt
  ) {
    throw new AdminEmailNotificationResendError(
      "ADMIN_EMAIL_NOTIFICATION_RESERVATION_NOT_CONFIRMED",
    );
  }
}

async function persistManualResendRequest(
  input: RequestAdminEmailNotificationResendInput,
  actor: AdminActor,
): Promise<PersistedManualRequest> {
  const sourceNotificationId = normalizeId(input.sourceNotificationId);
  const reservationId = normalizeId(input.reservationId);
  const requestId = normalizeId(input.requestId);
  const deduplicationKey = buildManualDeduplicationKey(
    sourceNotificationId,
    requestId,
  );

  try {
    return await prisma.$transaction(
      async (transaction) => {
        const adminActor = await resolveAdminActor(transaction, actor);
        const existing = await transaction.emailNotification.findUnique({
          where: { deduplicationKey },
          select: {
            id: true,
            reservationId: true,
            parentNotificationId: true,
          },
        });

        if (existing) {
          if (
            existing.reservationId !== reservationId ||
            existing.parentNotificationId !== sourceNotificationId
          ) {
            throw new AdminEmailNotificationResendError(
              "ADMIN_EMAIL_NOTIFICATION_UNEXPECTED_ERROR",
            );
          }

          return {
            notificationId: existing.id,
            created: false,
          };
        }

        const source = await transaction.emailNotification.findFirst({
          where: {
            id: sourceNotificationId,
            reservationId,
          },
          select: notificationSelect,
        });

        if (!source) {
          throw new AdminEmailNotificationResendError(
            "ADMIN_EMAIL_NOTIFICATION_NOT_FOUND",
          );
        }

        assertSourceIsEligible(source, input.expectedUpdatedAt);
        const requestedAt = new Date();
        const sourceFenceWhere: Prisma.EmailNotificationWhereInput = {
          id: source.id,
          reservationId: source.reservationId,
          status: source.status,
          updatedAt: source.updatedAt,
          ...(source.status === EmailNotificationStatus.SENT
            ? {}
            : { manualResends: { none: {} } }),
        };
        const sourceFence = await transaction.emailNotification.updateMany({
          where: sourceFenceWhere,
          data: {
            // This concurrency stamp obtains a row lock without rewriting delivery history.
            updatedAt: requestedAt,
          },
        });

        if (sourceFence.count !== 1) {
          throw new AdminEmailNotificationResendError(
            "ADMIN_EMAIL_NOTIFICATION_STALE",
          );
        }

        const manualNotification = await transaction.emailNotification.create({
          data: {
            reservationId: source.reservationId,
            type: source.type,
            recipient: source.recipient,
            locale: source.locale,
            deduplicationKey,
            origin: EmailNotificationOrigin.MANUAL,
            parentNotificationId: source.id,
            requestedByAdminId: adminActor.id,
            requestedAt,
            status: EmailNotificationStatus.PENDING,
          },
          select: { id: true },
        });

        await transaction.adminAuditLog.create({
          data: {
            userId: adminActor.id,
            action: "EMAIL_NOTIFICATION_MANUAL_RESEND_REQUESTED",
            entityType: "EmailNotification",
            entityId: manualNotification.id,
            metadata: {
              actorEmail: adminActor.email,
              requestId,
              reservationId: source.reservationId,
              sourceNotificationId: source.id,
              sourceStatus: source.status,
              notificationType: source.type,
              intendedRecipient: source.recipient,
              locale: source.locale,
              requestedAt: requestedAt.toISOString(),
            },
          },
        });

        return {
          notificationId: manualNotification.id,
          created: true,
        };
      },
      {
        isolationLevel: Prisma.TransactionIsolationLevel.Serializable,
      },
    );
  } catch (error) {
    if (
      (error instanceof Prisma.PrismaClientKnownRequestError &&
        (error.code === "P2002" || error.code === "P2034")) ||
      (error instanceof AdminEmailNotificationResendError &&
        error.code === "ADMIN_EMAIL_NOTIFICATION_STALE")
    ) {
      const existing = await prisma.emailNotification.findUnique({
        where: { deduplicationKey },
        select: {
          id: true,
          reservationId: true,
          parentNotificationId: true,
        },
      });

      if (
        existing &&
        existing.reservationId === reservationId &&
        existing.parentNotificationId === sourceNotificationId
      ) {
        return {
          notificationId: existing.id,
          created: false,
        };
      }
    }

    throw error;
  }
}

function resolveOutcome(
  input: Readonly<{
    created: boolean;
    sent: number;
    failed: number;
    finalStatus: EmailNotificationStatus;
  }>,
): AdminEmailNotificationResendOutcome {
  if (input.sent > 0) {
    return "sent";
  }

  if (input.finalStatus === EmailNotificationStatus.SENT) {
    return "already-processed";
  }

  if (input.failed > 0 || input.finalStatus === EmailNotificationStatus.FAILED) {
    return "failed";
  }

  return input.created ? "queued" : "already-processed";
}

export async function requestAdminEmailNotificationResend(
  input: RequestAdminEmailNotificationResendInput,
  actor: AdminActor,
): Promise<AdminEmailNotificationResendResult> {
  const persisted = await persistManualResendRequest(input, actor);
  const delivery = await deliverPendingEmailNotificationsBestEffort([
    persisted.notificationId,
  ]);
  const notification = await prisma.emailNotification.findUnique({
    where: { id: persisted.notificationId },
    select: {
      status: true,
      nextAttemptAt: true,
    },
  });

  if (!notification) {
    throw new AdminEmailNotificationResendError(
      "ADMIN_EMAIL_NOTIFICATION_UNEXPECTED_ERROR",
    );
  }

  return {
    notificationId: persisted.notificationId,
    created: persisted.created,
    deliveryMode: delivery.deliveryMode,
    outcome: resolveOutcome({
      created: persisted.created,
      sent: delivery.sent,
      failed: delivery.failed,
      finalStatus: notification.status,
    }),
    retryScheduled: notification.nextAttemptAt !== null,
    finalStatus: notification.status,
  };
}
