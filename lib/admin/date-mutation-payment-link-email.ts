import {
  EmailNotificationOrigin,
  EmailNotificationStatus,
  EmailNotificationType,
  LifecycleRequestHoldStatus,
  PaymentPurpose,
  PaymentStatus,
  Prisma,
  ReservationLifecycleRequestStatus,
  ReservationLifecycleRequestType,
  ReservationStatus,
} from "@prisma/client";

import { prisma } from "@/lib/db/prisma";
import {
  deliverLifecycleAdjustmentPaymentNotificationsBestEffort,
  ensureLifecycleAdjustmentPaymentRequiredNotification,
  lifecycleAdjustmentPaymentGuestNotificationTypes,
} from "@/lib/email/lifecycle-adjustment-payment-notifications";
import type { AdminActor } from "@/types/admin";
import type {
  AdminDateMutationPaymentLinkEmailErrorCode,
  AdminDateMutationPaymentLinkEmailSendResult,
  AdminDateMutationPaymentLinkEmailState,
  SendAdminDateMutationPaymentLinkEmailInput,
} from "@/types/admin-date-mutation-payment-link-email";

import { resolveAdminActor } from "./admin-actor";

const requestStateSelect = {
  id: true,
  reservationId: true,
  requestType: true,
  status: true,
  financialDifference: true,
  currency: true,
  hold: { select: { status: true, expiresAt: true } },
  reservation: {
    select: {
      status: true,
      guestEmail: true,
    },
  },
  adjustmentPayments: {
    where: { purpose: PaymentPurpose.LIFECYCLE_ADJUSTMENT },
    orderBy: [{ createdAt: "desc" }, { id: "desc" }],
    take: 1,
    select: {
      id: true,
      status: true,
      amount: true,
      currency: true,
    },
  },
} satisfies Prisma.ReservationLifecycleRequestSelect;

type RequestState = Prisma.ReservationLifecycleRequestGetPayload<{
  select: typeof requestStateSelect;
}>;

const notificationStateSelect = {
  id: true,
  type: true,
  status: true,
  nextAttemptAt: true,
  createdAt: true,
  updatedAt: true,
} satisfies Prisma.EmailNotificationSelect;

type NotificationState = Prisma.EmailNotificationGetPayload<{
  select: typeof notificationStateSelect;
}>;

export class AdminDateMutationPaymentLinkEmailError extends Error {
  constructor(
    readonly code: AdminDateMutationPaymentLinkEmailErrorCode,
  ) {
    super(code);
    this.name = "AdminDateMutationPaymentLinkEmailError";
  }
}

function expectedGuestType(requestType: ReservationLifecycleRequestType) {
  if (requestType === ReservationLifecycleRequestType.DATE_CHANGE) {
    return EmailNotificationType.DATE_CHANGE_PAYMENT_REQUIRED;
  }
  if (requestType === ReservationLifecycleRequestType.STAY_EXTENSION) {
    return EmailNotificationType.STAY_EXTENSION_PAYMENT_REQUIRED;
  }
  throw new AdminDateMutationPaymentLinkEmailError(
    "ADMIN_DATE_MUTATION_PAYMENT_EMAIL_NOT_AVAILABLE",
  );
}

function assertAvailable(
  request: RequestState,
  reservationId: string,
  now: Date,
): void {
  const payment = request.adjustmentPayments[0];
  const difference = request.financialDifference;
  if (
    request.reservationId !== reservationId.trim() ||
    (request.requestType !== ReservationLifecycleRequestType.DATE_CHANGE &&
      request.requestType !== ReservationLifecycleRequestType.STAY_EXTENSION) ||
    request.status !==
      ReservationLifecycleRequestStatus.AWAITING_ADJUSTMENT_PAYMENT ||
    request.reservation.status !== ReservationStatus.CONFIRMED ||
    !difference ||
    !difference.greaterThan(0) ||
    !request.hold ||
    request.hold.status !== LifecycleRequestHoldStatus.ACTIVE ||
    request.hold.expiresAt <= now ||
    !payment ||
    payment.status !== PaymentStatus.PENDING ||
    payment.amount.comparedTo(difference) !== 0 ||
    payment.currency !== request.currency
  ) {
    throw new AdminDateMutationPaymentLinkEmailError(
      "ADMIN_DATE_MUTATION_PAYMENT_EMAIL_NOT_AVAILABLE",
    );
  }
}

function buildState(
  request: RequestState,
  notifications: readonly NotificationState[],
): AdminDateMutationPaymentLinkEmailState {
  const successful = notifications.some(
    (notification) => notification.status === EmailNotificationStatus.SENT,
  );
  const active = notifications.some(
    (notification) =>
      notification.status === EmailNotificationStatus.PENDING ||
      notification.status === EmailNotificationStatus.PROCESSING ||
      (notification.status === EmailNotificationStatus.FAILED &&
        notification.nextAttemptAt !== null),
  );
  const failed = notifications.some(
    (notification) => notification.status === EmailNotificationStatus.FAILED,
  );
  const latest = notifications[0] ?? null;
  return {
    lifecycleRequestId: request.id,
    requestType:
      request.requestType === ReservationLifecycleRequestType.DATE_CHANGE
        ? "DATE_CHANGE"
        : "STAY_EXTENSION",
    guestEmail: request.reservation.guestEmail.trim().toLowerCase(),
    available: true,
    hasSuccessfulDelivery: successful,
    hasActiveDelivery: active,
    hasFailedDelivery: failed,
    warning: successful
      ? "DUPLICATE_POSSIBLE"
      : active
        ? "DELIVERY_ACTIVE"
        : null,
    latestNotificationId: latest?.id ?? null,
    latestStatus: latest?.status ?? null,
  };
}

async function readRequest(
  reservationId: string,
  lifecycleRequestId: string,
): Promise<RequestState> {
  const request = await prisma.reservationLifecycleRequest.findUnique({
    where: { id: lifecycleRequestId.trim() },
    select: requestStateSelect,
  });
  if (!request || request.reservationId !== reservationId.trim()) {
    throw new AdminDateMutationPaymentLinkEmailError(
      "ADMIN_DATE_MUTATION_PAYMENT_EMAIL_REQUEST_NOT_FOUND",
    );
  }
  assertAvailable(request, reservationId, new Date());
  return request;
}

async function readNotifications(
  lifecycleRequestId: string,
  expectedType: EmailNotificationType,
): Promise<readonly NotificationState[]> {
  return prisma.emailNotification.findMany({
    where: {
      lifecycleRequestId: lifecycleRequestId.trim(),
      type: expectedType,
    },
    orderBy: [{ createdAt: "desc" }, { id: "desc" }],
    select: notificationStateSelect,
  });
}

export async function getAdminDateMutationPaymentLinkEmailState(
  reservationId: string,
  lifecycleRequestId: string,
): Promise<AdminDateMutationPaymentLinkEmailState> {
  const request = await readRequest(reservationId, lifecycleRequestId);
  const notifications = await readNotifications(
    request.id,
    expectedGuestType(request.requestType),
  );
  return buildState(request, notifications);
}

async function createManualNotification(
  sourceNotificationId: string,
  requestId: string,
  actor: AdminActor,
): Promise<Readonly<{ notificationId: string; created: boolean }>> {
  const normalizedRequestId = requestId.trim();
  const deduplicationKey = `manual-resend/${sourceNotificationId.trim()}/${normalizedRequestId}`;
  try {
    return await prisma.$transaction(
      async (transaction) => {
        const adminActor = await resolveAdminActor(transaction, actor);
        const existing = await transaction.emailNotification.findUnique({
          where: { deduplicationKey },
          select: { id: true, parentNotificationId: true },
        });
        if (existing) {
          if (existing.parentNotificationId !== sourceNotificationId) {
            throw new AdminDateMutationPaymentLinkEmailError(
              "ADMIN_DATE_MUTATION_PAYMENT_EMAIL_UNEXPECTED_ERROR",
            );
          }
          return { notificationId: existing.id, created: false };
        }

        const source = await transaction.emailNotification.findUnique({
          where: { id: sourceNotificationId },
          select: {
            id: true,
            reservationId: true,
            lifecycleRequestId: true,
            type: true,
            recipient: true,
            locale: true,
            status: true,
            manualResends: { take: 1, select: { id: true } },
          },
        });
        if (
          !source ||
          !source.lifecycleRequestId ||
          !(lifecycleAdjustmentPaymentGuestNotificationTypes as readonly EmailNotificationType[]).includes(
            source.type,
          ) ||
          source.status === EmailNotificationStatus.PROCESSING ||
          source.status === EmailNotificationStatus.SKIPPED ||
          source.manualResends.length > 0
        ) {
          throw new AdminDateMutationPaymentLinkEmailError(
            source?.status === EmailNotificationStatus.PROCESSING
              ? "ADMIN_DATE_MUTATION_PAYMENT_EMAIL_PROCESSING_ACTIVE"
              : "ADMIN_DATE_MUTATION_PAYMENT_EMAIL_STALE",
          );
        }

        const requestedAt = new Date();
        const child = await transaction.emailNotification.create({
          data: {
            reservationId: source.reservationId,
            lifecycleRequestId: source.lifecycleRequestId,
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
            action: "LIFECYCLE_ADJUSTMENT_PAYMENT_EMAIL_MANUAL_SEND_REQUESTED",
            entityType: "EmailNotification",
            entityId: child.id,
            metadata: {
              actorEmail: adminActor.email,
              requestId: normalizedRequestId,
              reservationId: source.reservationId,
              lifecycleRequestId: source.lifecycleRequestId,
              sourceNotificationId: source.id,
              sourceStatus: source.status,
              notificationType: source.type,
              intendedRecipient: source.recipient,
              requestedAt: requestedAt.toISOString(),
            },
          },
        });
        return { notificationId: child.id, created: true };
      },
      { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
    );
  } catch (error) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      (error.code === "P2002" || error.code === "P2034")
    ) {
      const existing = await prisma.emailNotification.findUnique({
        where: { deduplicationKey },
        select: { id: true, parentNotificationId: true },
      });
      if (existing?.parentNotificationId === sourceNotificationId) {
        return { notificationId: existing.id, created: false };
      }
    }
    throw error;
  }
}

function resolveOutcome(
  created: boolean,
  delivery: Awaited<
    ReturnType<typeof deliverLifecycleAdjustmentPaymentNotificationsBestEffort>
  >,
  status: EmailNotificationStatus,
): AdminDateMutationPaymentLinkEmailSendResult["outcome"] {
  if (delivery.sent > 0 || status === EmailNotificationStatus.SENT) {
    return delivery.sent > 0 ? "sent" : "already-processed";
  }
  if (delivery.failed > 0 || status === EmailNotificationStatus.FAILED) {
    return "failed";
  }
  return created ? "queued" : "already-processed";
}

export async function sendAdminDateMutationPaymentLinkEmail(
  input: SendAdminDateMutationPaymentLinkEmailInput,
  actor: AdminActor,
): Promise<AdminDateMutationPaymentLinkEmailSendResult> {
  const request = await readRequest(
    input.reservationId,
    input.lifecycleRequestId,
  );
  const expectedType = expectedGuestType(request.requestType);
  const ensured = await ensureLifecycleAdjustmentPaymentRequiredNotification(
    request.id,
  );
  let notificationId = ensured.id;
  let created = ensured.created;
  const leaf = await prisma.emailNotification.findFirst({
    where: {
      lifecycleRequestId: request.id,
      type: expectedType,
      manualResends: { none: {} },
    },
    orderBy: [{ createdAt: "desc" }, { id: "desc" }],
    select: { id: true, status: true },
  });

  if (!leaf) {
    throw new AdminDateMutationPaymentLinkEmailError(
      "ADMIN_DATE_MUTATION_PAYMENT_EMAIL_STALE",
    );
  }
  if (leaf.status === EmailNotificationStatus.PROCESSING) {
    throw new AdminDateMutationPaymentLinkEmailError(
      "ADMIN_DATE_MUTATION_PAYMENT_EMAIL_PROCESSING_ACTIVE",
    );
  }
  if (
    leaf.status === EmailNotificationStatus.SENT ||
    leaf.status === EmailNotificationStatus.FAILED
  ) {
    const manual = await createManualNotification(
      leaf.id,
      input.requestId,
      actor,
    );
    notificationId = manual.notificationId;
    created = manual.created;
  } else if (leaf.status === EmailNotificationStatus.SKIPPED) {
    throw new AdminDateMutationPaymentLinkEmailError(
      "ADMIN_DATE_MUTATION_PAYMENT_EMAIL_NOT_AVAILABLE",
    );
  } else {
    notificationId = leaf.id;
  }

  const delivery =
    await deliverLifecycleAdjustmentPaymentNotificationsBestEffort([
      notificationId,
    ]);
  const notification = await prisma.emailNotification.findUnique({
    where: { id: notificationId },
    select: { status: true, nextAttemptAt: true },
  });
  if (!notification) {
    throw new AdminDateMutationPaymentLinkEmailError(
      "ADMIN_DATE_MUTATION_PAYMENT_EMAIL_UNEXPECTED_ERROR",
    );
  }
  const state = await getAdminDateMutationPaymentLinkEmailState(
    input.reservationId,
    input.lifecycleRequestId,
  );
  return {
    state,
    notificationId,
    created,
    deliveryMode: delivery.deliveryMode,
    outcome: resolveOutcome(created, delivery, notification.status),
    retryScheduled: notification.nextAttemptAt !== null,
  };
}
