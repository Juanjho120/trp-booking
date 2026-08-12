import {
  EmailNotificationOrigin,
  EmailNotificationStatus,
  PaymentStatus,
  Prisma,
  RefundStatus,
  ReservationLifecycleRequestStatus,
  ReservationLifecycleRequestType,
} from "@prisma/client";

import { dateOnlyFromDate } from "@/lib/availability/rules";
import { prisma } from "@/lib/db/prisma";
import type {
  AdminReservationOperationalHistoryActor,
  AdminReservationOperationalHistoryEvent,
  AdminReservationOperationalHistoryEventType,
  AdminReservationOperationalHistoryReference,
  AdminReservationOperationalHistoryRelation,
} from "@/types/admin-reservation-operational-history";

const ADMIN_NAME_MAX_LENGTH = 160;
const ADMIN_EMAIL_MAX_LENGTH = 160;
const ERROR_CODE_MAX_LENGTH = 120;
const PROVIDER_REFERENCE_MAX_LENGTH = 180;

const refundAuditActions = [
  "REFUND_PROVIDER_EXECUTION_STARTED",
  "REFUND_PROVIDER_RESPONSE_OBSERVED",
  "REFUND_PROVIDER_RESULT_UNCERTAIN",
  "REFUND_PROVIDER_EXECUTION_FAILED",
  "REFUND_PROVIDER_CONSULT_OBSERVED",
  "REFUND_RECONCILED_APPROVED",
  "REFUND_RECONCILED_FAILED",
] as const;

type RefundAuditAction = (typeof refundAuditActions)[number];

const reservationHistorySelect = {
  id: true,
  status: true,
  currency: true,
  createdAt: true,
  confirmedAt: true,
  cancelledAt: true,
} satisfies Prisma.ReservationSelect;

type ReservationHistoryRecord = Prisma.ReservationGetPayload<{
  select: typeof reservationHistorySelect;
}>;

const lifecycleRequestHistorySelect = {
  id: true,
  requestType: true,
  status: true,
  financialDifference: true,
  currency: true,
  originalCheckInDate: true,
  originalCheckOutDate: true,
  requestedCheckInDate: true,
  requestedCheckOutDate: true,
  failureCode: true,
  requestedAt: true,
  reviewedAt: true,
  decidedAt: true,
  completedAt: true,
  failedAt: true,
  withdrawnAt: true,
  expiredAt: true,
  createdAt: true,
  updatedAt: true,
  createdByAdmin: {
    select: {
      name: true,
      email: true,
    },
  },
  reviewedByAdmin: {
    select: {
      name: true,
      email: true,
    },
  },
  hold: {
    select: {
      id: true,
      status: true,
      expiresAt: true,
      releasedAt: true,
      expiredAt: true,
      releaseReasonCode: true,
      createdAt: true,
      updatedAt: true,
    },
  },
} satisfies Prisma.ReservationLifecycleRequestSelect;

type LifecycleRequestHistoryRecord =
  Prisma.ReservationLifecycleRequestGetPayload<{
    select: typeof lifecycleRequestHistorySelect;
  }>;

const paymentHistorySelect = {
  id: true,
  lifecycleRequestId: true,
  purpose: true,
  status: true,
  amount: true,
  currency: true,
  providerReference: true,
  paidAt: true,
  failedAt: true,
  createdAt: true,
  updatedAt: true,
} satisfies Prisma.PaymentSelect;

type PaymentHistoryRecord = Prisma.PaymentGetPayload<{
  select: typeof paymentHistorySelect;
}>;

const refundHistorySelect = {
  id: true,
  paymentId: true,
  lifecycleRequestId: true,
  authorizationType: true,
  refundOperationKey: true,
  status: true,
  amount: true,
  currency: true,
  processingMode: true,
  providerRefundId: true,
  processingStartedAt: true,
  approvedAt: true,
  failedAt: true,
  failureCode: true,
  createdAt: true,
  updatedAt: true,
  requestedByAdmin: {
    select: {
      name: true,
      email: true,
    },
  },
} satisfies Prisma.RefundSelect;

type RefundHistoryRecord = Prisma.RefundGetPayload<{
  select: typeof refundHistorySelect;
}>;

const emailHistorySelect = {
  id: true,
  lifecycleRequestId: true,
  refundId: true,
  type: true,
  recipient: true,
  locale: true,
  origin: true,
  parentNotificationId: true,
  sourceNotificationId: true,
  requestedAt: true,
  scheduledFor: true,
  requestedByAdmin: {
    select: {
      name: true,
      email: true,
    },
  },
  status: true,
  attemptCount: true,
  lastAttemptAt: true,
  nextAttemptAt: true,
  processingStartedAt: true,
  providerMessageId: true,
  sentAt: true,
  errorCode: true,
  createdAt: true,
  updatedAt: true,
} satisfies Prisma.EmailNotificationSelect;

type EmailHistoryRecord = Prisma.EmailNotificationGetPayload<{
  select: typeof emailHistorySelect;
}>;

const refundAuditHistorySelect = {
  id: true,
  action: true,
  entityId: true,
  createdAt: true,
  user: {
    select: {
      name: true,
      email: true,
    },
  },
} satisfies Prisma.AdminAuditLogSelect;

type RefundAuditHistoryRecord = Prisma.AdminAuditLogGetPayload<{
  select: typeof refundAuditHistorySelect;
}>;

const systemActor: AdminReservationOperationalHistoryActor = {
  kind: "SYSTEM",
  name: null,
  email: null,
};

function normalizeRequiredText(value: string, maximumLength: number): string {
  return value.trim().replace(/\s+/g, " ").slice(0, maximumLength);
}

function normalizeOptionalText(
  value: string | null | undefined,
  maximumLength: number,
): string | null {
  if (!value) {
    return null;
  }

  const normalized = value.trim().replace(/\s+/g, " ");
  return normalized ? normalized.slice(0, maximumLength) : null;
}

function adminActor(
  value: Readonly<{ name: string | null; email: string }> | null,
): AdminReservationOperationalHistoryActor {
  if (!value) {
    return systemActor;
  }

  return {
    kind: "ADMIN",
    name: normalizeOptionalText(value.name, ADMIN_NAME_MAX_LENGTH),
    email: normalizeRequiredText(value.email, ADMIN_EMAIL_MAX_LENGTH),
  };
}

function reference(
  kind: AdminReservationOperationalHistoryReference["kind"],
  id: string,
): AdminReservationOperationalHistoryReference {
  return { kind, id };
}

function relation(
  kind: AdminReservationOperationalHistoryRelation["kind"],
  id: string | null | undefined,
): AdminReservationOperationalHistoryRelation[] {
  return id ? [{ kind, id }] : [];
}

function createEvent(
  input: Readonly<{
    id: string;
    category: AdminReservationOperationalHistoryEvent["category"];
    eventType: AdminReservationOperationalHistoryEventType;
    occurredAt: Date;
    reference: AdminReservationOperationalHistoryReference;
    status?: string | null;
    actor?: AdminReservationOperationalHistoryActor;
    relations?: readonly AdminReservationOperationalHistoryRelation[];
    amount?: string | null;
    currency?: string | null;
    requestType?: string | null;
    paymentPurpose?: string | null;
    refundAuthorizationType?: string | null;
    refundOperationKey?: string | null;
    notificationType?: string | null;
    recipient?: string | null;
    locale?: string | null;
    origin?: string | null;
    attemptCount?: number | null;
    nextAttemptAt?: Date | null;
    expiresAt?: Date | null;
    scheduledFor?: Date | null;
    errorCode?: string | null;
    providerReference?: string | null;
    originalCheckInDate?: Date | null;
    originalCheckOutDate?: Date | null;
    requestedCheckInDate?: Date | null;
    requestedCheckOutDate?: Date | null;
  }>,
): AdminReservationOperationalHistoryEvent {
  return {
    id: input.id,
    category: input.category,
    eventType: input.eventType,
    occurredAt: input.occurredAt.toISOString(),
    status: input.status ?? null,
    actor: input.actor ?? systemActor,
    reference: input.reference,
    relations: input.relations ?? [],
    amount: input.amount ?? null,
    currency: input.currency ?? null,
    requestType: input.requestType ?? null,
    paymentPurpose: input.paymentPurpose ?? null,
    refundAuthorizationType: input.refundAuthorizationType ?? null,
    refundOperationKey: input.refundOperationKey ?? null,
    notificationType: input.notificationType ?? null,
    recipient: input.recipient ?? null,
    locale: input.locale ?? null,
    origin: input.origin ?? null,
    attemptCount: input.attemptCount ?? null,
    nextAttemptAt: input.nextAttemptAt?.toISOString() ?? null,
    expiresAt: input.expiresAt?.toISOString() ?? null,
    scheduledFor: input.scheduledFor?.toISOString() ?? null,
    errorCode: normalizeOptionalText(input.errorCode, ERROR_CODE_MAX_LENGTH),
    providerReference: normalizeOptionalText(
      input.providerReference,
      PROVIDER_REFERENCE_MAX_LENGTH,
    ),
    originalCheckInDate: input.originalCheckInDate
      ? dateOnlyFromDate(input.originalCheckInDate)
      : null,
    originalCheckOutDate: input.originalCheckOutDate
      ? dateOnlyFromDate(input.originalCheckOutDate)
      : null,
    requestedCheckInDate: input.requestedCheckInDate
      ? dateOnlyFromDate(input.requestedCheckInDate)
      : null,
    requestedCheckOutDate: input.requestedCheckOutDate
      ? dateOnlyFromDate(input.requestedCheckOutDate)
      : null,
  };
}

function requestEventPrefix(
  requestType: ReservationLifecycleRequestType,
): "CANCELLATION" | "DATE_CHANGE" | "STAY_EXTENSION" {
  if (requestType === ReservationLifecycleRequestType.CANCELLATION) {
    return "CANCELLATION";
  }

  if (requestType === ReservationLifecycleRequestType.DATE_CHANGE) {
    return "DATE_CHANGE";
  }

  return "STAY_EXTENSION";
}

function requestEventType(
  requestType: ReservationLifecycleRequestType,
  suffix:
    | "REQUESTED"
    | "APPROVED"
    | "REJECTED"
    | "COMPLETED"
    | "FAILED"
    | "EXPIRED"
    | "WITHDRAWN",
): AdminReservationOperationalHistoryEventType {
  return `${requestEventPrefix(requestType)}_${suffix}` as AdminReservationOperationalHistoryEventType;
}

function requestRelations(
  request: LifecycleRequestHistoryRecord,
): AdminReservationOperationalHistoryRelation[] {
  return request.hold
    ? relation("HOLD", request.hold.id)
    : [];
}

function buildReservationEvents(
  reservation: ReservationHistoryRecord,
): AdminReservationOperationalHistoryEvent[] {
  const events = [
    createEvent({
      id: `reservation/${reservation.id}/created`,
      category: "RESERVATION",
      eventType: "RESERVATION_CREATED",
      occurredAt: reservation.createdAt,
      reference: reference("RESERVATION", reservation.id),
      currency: reservation.currency,
    }),
  ];

  if (reservation.confirmedAt) {
    events.push(
      createEvent({
        id: `reservation/${reservation.id}/confirmed`,
        category: "RESERVATION",
        eventType: "RESERVATION_CONFIRMED",
        occurredAt: reservation.confirmedAt,
        reference: reference("RESERVATION", reservation.id),
        status: "CONFIRMED",
        currency: reservation.currency,
      }),
    );
  }

  if (reservation.cancelledAt) {
    events.push(
      createEvent({
        id: `reservation/${reservation.id}/cancelled`,
        category: "RESERVATION",
        eventType: "RESERVATION_CANCELLED",
        occurredAt: reservation.cancelledAt,
        reference: reference("RESERVATION", reservation.id),
        status: "CANCELLED",
        currency: reservation.currency,
      }),
    );
  }

  return events;
}

function requestEventBase(request: LifecycleRequestHistoryRecord) {
  return {
    category: "REQUEST" as const,
    reference: reference("LIFECYCLE_REQUEST", request.id),
    relations: requestRelations(request),
    requestType: request.requestType,
    amount: request.financialDifference?.toFixed(2) ?? null,
    currency: request.currency,
    originalCheckInDate: request.originalCheckInDate,
    originalCheckOutDate: request.originalCheckOutDate,
    requestedCheckInDate: request.requestedCheckInDate,
    requestedCheckOutDate: request.requestedCheckOutDate,
  };
}

function buildRequestEvents(
  request: LifecycleRequestHistoryRecord,
): AdminReservationOperationalHistoryEvent[] {
  const base = requestEventBase(request);
  const events: AdminReservationOperationalHistoryEvent[] = [
    createEvent({
      ...base,
      id: `request/${request.id}/requested`,
      eventType: requestEventType(request.requestType, "REQUESTED"),
      occurredAt: request.requestedAt,
      status: "PENDING_REVIEW",
      actor: adminActor(request.createdByAdmin),
    }),
  ];

  if (request.decidedAt) {
    const rejected =
      request.status === ReservationLifecycleRequestStatus.REJECTED;
    events.push(
      createEvent({
        ...base,
        id: `request/${request.id}/${rejected ? "rejected" : "approved"}`,
        eventType: requestEventType(
          request.requestType,
          rejected ? "REJECTED" : "APPROVED",
        ),
        occurredAt: request.decidedAt,
        status: rejected ? "REJECTED" : "APPROVED",
        actor: adminActor(request.reviewedByAdmin),
      }),
    );
  }

  if (request.completedAt) {
    events.push(
      createEvent({
        ...base,
        id: `request/${request.id}/completed`,
        eventType: requestEventType(request.requestType, "COMPLETED"),
        occurredAt: request.completedAt,
        status: "COMPLETED",
        actor: adminActor(request.reviewedByAdmin),
      }),
    );
  }

  if (request.failedAt) {
    events.push(
      createEvent({
        ...base,
        id: `request/${request.id}/failed`,
        eventType: requestEventType(request.requestType, "FAILED"),
        occurredAt: request.failedAt,
        status: "FAILED",
        actor: adminActor(request.reviewedByAdmin),
        errorCode: request.failureCode,
      }),
    );
  }

  if (request.expiredAt) {
    events.push(
      createEvent({
        ...base,
        id: `request/${request.id}/expired`,
        eventType: requestEventType(request.requestType, "EXPIRED"),
        occurredAt: request.expiredAt,
        status: "EXPIRED",
      }),
    );
  }

  if (request.withdrawnAt) {
    events.push(
      createEvent({
        ...base,
        id: `request/${request.id}/withdrawn`,
        eventType: requestEventType(request.requestType, "WITHDRAWN"),
        occurredAt: request.withdrawnAt,
        status: "WITHDRAWN",
      }),
    );
  }

  if (request.hold) {
    events.push(
      createEvent({
        id: `hold/${request.hold.id}/created`,
        category: "HOLD",
        eventType: "LIFECYCLE_HOLD_CREATED",
        occurredAt: request.hold.createdAt,
        reference: reference("HOLD", request.hold.id),
        relations: relation("LIFECYCLE_REQUEST", request.id),
        status: "ACTIVE",
        requestType: request.requestType,
        expiresAt: request.hold.expiresAt,
      }),
    );

    if (request.hold.releasedAt) {
      events.push(
        createEvent({
          id: `hold/${request.hold.id}/released`,
          category: "HOLD",
          eventType: "LIFECYCLE_HOLD_RELEASED",
          occurredAt: request.hold.releasedAt,
          reference: reference("HOLD", request.hold.id),
          relations: relation("LIFECYCLE_REQUEST", request.id),
          status: "RELEASED",
          requestType: request.requestType,
          errorCode: request.hold.releaseReasonCode,
        }),
      );
    }

    if (request.hold.expiredAt) {
      events.push(
        createEvent({
          id: `hold/${request.hold.id}/expired`,
          category: "HOLD",
          eventType: "LIFECYCLE_HOLD_EXPIRED",
          occurredAt: request.hold.expiredAt,
          reference: reference("HOLD", request.hold.id),
          relations: relation("LIFECYCLE_REQUEST", request.id),
          status: "EXPIRED",
          requestType: request.requestType,
        }),
      );
    }
  }

  return events;
}

function paymentRelations(
  payment: PaymentHistoryRecord,
): AdminReservationOperationalHistoryRelation[] {
  return relation("LIFECYCLE_REQUEST", payment.lifecycleRequestId);
}

function buildPaymentEvents(
  payment: PaymentHistoryRecord,
): AdminReservationOperationalHistoryEvent[] {
  const base = {
    category: "PAYMENT" as const,
    reference: reference("PAYMENT", payment.id),
    relations: paymentRelations(payment),
    amount: payment.amount.toFixed(2),
    currency: payment.currency,
    paymentPurpose: payment.purpose,
    providerReference: payment.providerReference,
  };
  const events: AdminReservationOperationalHistoryEvent[] = [
    createEvent({
      ...base,
      id: `payment/${payment.id}/created`,
      eventType: "PAYMENT_CREATED",
      occurredAt: payment.createdAt,
    }),
  ];

  if (payment.paidAt) {
    events.push(
      createEvent({
        ...base,
        id: `payment/${payment.id}/approved`,
        eventType: "PAYMENT_APPROVED",
        occurredAt: payment.paidAt,
        status: "APPROVED",
      }),
    );
  }

  if (
    payment.status === PaymentStatus.REJECTED ||
    payment.status === PaymentStatus.FAILED
  ) {
    events.push(
      createEvent({
        ...base,
        id: `payment/${payment.id}/${payment.status.toLowerCase()}`,
        eventType:
          payment.status === PaymentStatus.REJECTED
            ? "PAYMENT_REJECTED"
            : "PAYMENT_FAILED",
        occurredAt: payment.failedAt ?? payment.updatedAt,
        status: payment.status,
      }),
    );
  }

  if (payment.status === PaymentStatus.PARTIALLY_REFUNDED) {
    events.push(
      createEvent({
        ...base,
        id: `payment/${payment.id}/partially-refunded`,
        eventType: "PAYMENT_PARTIALLY_REFUNDED",
        occurredAt: payment.updatedAt,
        status: payment.status,
      }),
    );
  }

  if (payment.status === PaymentStatus.REFUNDED) {
    events.push(
      createEvent({
        ...base,
        id: `payment/${payment.id}/refunded`,
        eventType: "PAYMENT_REFUNDED",
        occurredAt: payment.updatedAt,
        status: payment.status,
      }),
    );
  }

  return events;
}

function refundRelations(
  refund: RefundHistoryRecord,
): AdminReservationOperationalHistoryRelation[] {
  return [
    ...relation("PAYMENT", refund.paymentId),
    ...relation("LIFECYCLE_REQUEST", refund.lifecycleRequestId),
  ];
}

function refundBase(refund: RefundHistoryRecord) {
  return {
    category: "REFUND" as const,
    reference: reference("REFUND", refund.id),
    relations: refundRelations(refund),
    amount: refund.amount.toFixed(2),
    currency: refund.currency,
    refundAuthorizationType: refund.authorizationType,
    refundOperationKey: refund.refundOperationKey,
    providerReference: refund.providerRefundId,
  };
}

function buildRefundEvents(
  refund: RefundHistoryRecord,
): AdminReservationOperationalHistoryEvent[] {
  const base = refundBase(refund);
  const events: AdminReservationOperationalHistoryEvent[] = [
    createEvent({
      ...base,
      id: `refund/${refund.id}/authorized`,
      eventType: "REFUND_AUTHORIZED",
      occurredAt: refund.createdAt,
      status: "PENDING",
      actor: adminActor(refund.requestedByAdmin),
    }),
  ];

  if (
    (refund.status === RefundStatus.APPROVED ||
      refund.status === RefundStatus.MANUAL) &&
    (refund.approvedAt || refund.status === RefundStatus.MANUAL)
  ) {
    events.push(
      createEvent({
        ...base,
        id: `refund/${refund.id}/approved`,
        eventType: "REFUND_APPROVED",
        occurredAt: refund.approvedAt ?? refund.updatedAt,
        status: refund.status,
      }),
    );
  }

  if (refund.status === RefundStatus.FAILED && refund.failedAt) {
    events.push(
      createEvent({
        ...base,
        id: `refund/${refund.id}/failed`,
        eventType: "REFUND_FAILED",
        occurredAt: refund.failedAt,
        status: "FAILED",
        errorCode: refund.failureCode,
      }),
    );
  }

  return events;
}

function isRefundAuditAction(value: string): value is RefundAuditAction {
  return (refundAuditActions as readonly string[]).includes(value);
}

function buildRefundAuditEvent(
  audit: RefundAuditHistoryRecord,
  refundsById: ReadonlyMap<string, RefundHistoryRecord>,
): AdminReservationOperationalHistoryEvent | null {
  if (!audit.entityId || !isRefundAuditAction(audit.action)) {
    return null;
  }

  const refund = refundsById.get(audit.entityId);
  if (!refund) {
    return null;
  }

  return createEvent({
    ...refundBase(refund),
    id: `refund-audit/${audit.id}`,
    category: "RECOVERY",
    eventType: audit.action,
    occurredAt: audit.createdAt,
    status:
      audit.action === "REFUND_RECONCILED_APPROVED"
        ? "APPROVED"
        : audit.action === "REFUND_RECONCILED_FAILED" ||
            audit.action === "REFUND_PROVIDER_EXECUTION_FAILED"
          ? "FAILED"
          : "PROCESSING",
    actor: adminActor(audit.user),
    errorCode:
      audit.action === "REFUND_PROVIDER_RESULT_UNCERTAIN"
        ? "RESULT_UNCERTAIN"
        : audit.action === "REFUND_PROVIDER_EXECUTION_FAILED"
          ? refund.failureCode
          : null,
  });
}

function emailRelations(
  notification: EmailHistoryRecord,
): AdminReservationOperationalHistoryRelation[] {
  return [
    ...relation("LIFECYCLE_REQUEST", notification.lifecycleRequestId),
    ...relation("REFUND", notification.refundId),
    ...relation("PARENT_NOTIFICATION", notification.parentNotificationId),
    ...relation("SOURCE_NOTIFICATION", notification.sourceNotificationId),
  ];
}

function emailBase(notification: EmailHistoryRecord) {
  return {
    category: "EMAIL" as const,
    reference: reference("EMAIL_NOTIFICATION", notification.id),
    relations: emailRelations(notification),
    notificationType: notification.type,
    recipient: normalizeRequiredText(notification.recipient, ADMIN_EMAIL_MAX_LENGTH),
    locale: notification.locale,
    origin: notification.origin,
    attemptCount: notification.attemptCount,
    nextAttemptAt: notification.nextAttemptAt,
    scheduledFor: notification.scheduledFor,
    errorCode: notification.errorCode,
    providerReference: notification.providerMessageId,
  };
}

function buildEmailEvents(
  notification: EmailHistoryRecord,
): AdminReservationOperationalHistoryEvent[] {
  const base = emailBase(notification);
  const events: AdminReservationOperationalHistoryEvent[] = [
    createEvent({
      ...base,
      id: `email/${notification.id}/created`,
      eventType: "EMAIL_CREATED",
      occurredAt: notification.createdAt,
      status: "PENDING",
    }),
  ];

  if (
    notification.origin === EmailNotificationOrigin.MANUAL &&
    notification.requestedAt
  ) {
    events.push(
      createEvent({
        ...base,
        id: `email/${notification.id}/manual-requested`,
        eventType: "EMAIL_MANUAL_RESEND_REQUESTED",
        occurredAt: notification.requestedAt,
        status: notification.status,
        actor: adminActor(notification.requestedByAdmin),
      }),
    );
  }

  if (
    notification.status === EmailNotificationStatus.PROCESSING &&
    notification.processingStartedAt
  ) {
    events.push(
      createEvent({
        ...base,
        id: `email/${notification.id}/processing`,
        eventType: "EMAIL_PROCESSING",
        occurredAt: notification.processingStartedAt,
        status: "PROCESSING",
      }),
    );
  }

  if (notification.nextAttemptAt && notification.lastAttemptAt) {
    events.push(
      createEvent({
        ...base,
        id: `email/${notification.id}/retry/${notification.attemptCount}`,
        eventType: "EMAIL_RETRY_SCHEDULED",
        occurredAt: notification.lastAttemptAt,
        status: notification.status,
      }),
    );
  }

  if (notification.status === EmailNotificationStatus.SENT && notification.sentAt) {
    events.push(
      createEvent({
        ...base,
        id: `email/${notification.id}/sent`,
        eventType: "EMAIL_SENT",
        occurredAt: notification.sentAt,
        status: "SENT",
      }),
    );
  }

  if (notification.status === EmailNotificationStatus.FAILED) {
    events.push(
      createEvent({
        ...base,
        id: `email/${notification.id}/failed/${notification.attemptCount}`,
        eventType: "EMAIL_FAILED",
        occurredAt: notification.lastAttemptAt ?? notification.updatedAt,
        status: "FAILED",
      }),
    );
  }

  if (notification.status === EmailNotificationStatus.SKIPPED) {
    events.push(
      createEvent({
        ...base,
        id: `email/${notification.id}/skipped`,
        eventType: "EMAIL_SKIPPED",
        occurredAt: notification.updatedAt,
        status: "SKIPPED",
      }),
    );
  }

  return events;
}

function sortEvents(
  events: readonly AdminReservationOperationalHistoryEvent[],
): AdminReservationOperationalHistoryEvent[] {
  return [...events].sort((first, second) => {
    const timestampOrder = second.occurredAt.localeCompare(first.occurredAt);
    return timestampOrder !== 0 ? timestampOrder : first.id.localeCompare(second.id);
  });
}

export async function getAdminReservationOperationalHistory(
  reservationId: string,
): Promise<readonly AdminReservationOperationalHistoryEvent[]> {
  const id = reservationId.trim();
  if (!id || id.length > 120) {
    return [];
  }

  const [reservation, lifecycleRequests, payments, refunds, notifications]: [
    ReservationHistoryRecord | null,
    LifecycleRequestHistoryRecord[],
    PaymentHistoryRecord[],
    RefundHistoryRecord[],
    EmailHistoryRecord[],
  ] = await Promise.all([
      prisma.reservation.findUnique({
        where: { id },
        select: reservationHistorySelect,
      }),
      prisma.reservationLifecycleRequest.findMany({
        where: { reservationId: id },
        orderBy: [{ requestedAt: "asc" }, { id: "asc" }],
        select: lifecycleRequestHistorySelect,
      }),
      prisma.payment.findMany({
        where: { reservationId: id },
        orderBy: [{ createdAt: "asc" }, { id: "asc" }],
        select: paymentHistorySelect,
      }),
      prisma.refund.findMany({
        where: { payment: { is: { reservationId: id } } },
        orderBy: [{ createdAt: "asc" }, { id: "asc" }],
        select: refundHistorySelect,
      }),
      prisma.emailNotification.findMany({
        where: { reservationId: id },
        orderBy: [{ createdAt: "asc" }, { id: "asc" }],
        select: emailHistorySelect,
      }),
    ]);

  if (!reservation) {
    return [];
  }

  const hasLifecycleActivity =
    lifecycleRequests.length > 0 ||
    refunds.length > 0 ||
    payments.some((payment) => payment.purpose === "LIFECYCLE_ADJUSTMENT");

  if (!hasLifecycleActivity) {
    return [];
  }

  const refundIds = refunds.map((refund) => refund.id);
  const refundAudits: RefundAuditHistoryRecord[] =
    refundIds.length > 0
      ? await prisma.adminAuditLog.findMany({
          where: {
            entityType: "Refund",
            entityId: { in: refundIds },
            action: { in: [...refundAuditActions] },
          },
          orderBy: [{ createdAt: "asc" }, { id: "asc" }],
          select: refundAuditHistorySelect,
        })
      : [];

  const refundsById = new Map<string, RefundHistoryRecord>(
    refunds.map((refund) => [refund.id, refund]),
  );
  const auditEvents = refundAudits.flatMap((audit) => {
    const event = buildRefundAuditEvent(audit, refundsById);
    return event ? [event] : [];
  });

  return sortEvents([
    ...buildReservationEvents(reservation),
    ...lifecycleRequests.flatMap(buildRequestEvents),
    ...payments.flatMap(buildPaymentEvents),
    ...refunds.flatMap(buildRefundEvents),
    ...auditEvents,
    ...notifications.flatMap(buildEmailEvents),
  ]);
}
