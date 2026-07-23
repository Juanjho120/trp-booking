import {
  CancellationPolicyReasonCode,
  CancellationPolicyVersion,
  EmailNotificationStatus,
  EmailNotificationType,
  PaymentPurpose,
  PaymentStatus,
  Prisma,
  ReservationLifecycleRequestStatus,
  ReservationLifecycleRequestType,
  ReservationStatus,
} from "@prisma/client";

import { prisma } from "@/lib/db/prisma";
import { getArrivalCheckInDateTime } from "@/lib/email";
import {
  calculateStandardCancellationPolicyTiming,
  CANCELLATION_POLICY_TIMEZONE,
} from "@/lib/reservations/cancellation-policy";
import type { AdminActor } from "@/types/admin";
import type {
  AdminCancellationDecisionResult,
  AdminCancellationPolicySnapshot,
  AdminCancellationRequestSummary,
  AdminReservationCancellationErrorCode,
  CreateAdminCancellationRequestInput,
  DecideAdminCancellationRequestInput,
} from "@/types/admin-reservation-cancellation";

import { resolveAdminActor } from "./admin-actor";

const CANCELLATION_POLICY_VERSION =
  CancellationPolicyVersion.DIRECT_BOOKING_2026_07_23;
const ARRIVAL_SUPERSEDED_ERROR_CODE =
  "EMAIL_ARRIVAL_INSTRUCTIONS_SUPERSEDED";
const ARRIVAL_SUPERSEDED_ERROR_MESSAGE =
  "Arrival instructions were superseded before delivery.";
const ACTIVE_CANCELLATION_STATUSES = [
  ReservationLifecycleRequestStatus.PENDING_REVIEW,
  ReservationLifecycleRequestStatus.APPROVED,
] as const;

const lifecycleRequestSummarySelect = {
  id: true,
  reservationId: true,
  sourcePaymentId: true,
  requestType: true,
  clientRequestId: true,
  status: true,
  channel: true,
  requesterName: true,
  requesterEmail: true,
  requesterPhone: true,
  requestNote: true,
  cancellationPolicyVersion: true,
  policyTimezone: true,
  policyCalculatedAt: true,
  policyCheckInAt: true,
  policyHoursBeforeCheckIn: true,
  policyReasonCode: true,
  standardRefundPercentage: true,
  standardRefundAmount: true,
  currency: true,
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
  decisionReasonCode: true,
  decisionNote: true,
  requestedAt: true,
  reviewedAt: true,
  decidedAt: true,
  completedAt: true,
  version: true,
  expectedReservationUpdatedAt: true,
  updatedAt: true,
} satisfies Prisma.ReservationLifecycleRequestSelect;

type LifecycleRequestSummaryRecord = Prisma.ReservationLifecycleRequestGetPayload<{
  select: typeof lifecycleRequestSummarySelect;
}>;

const reservationForCancellationSelect = {
  id: true,
  propertyId: true,
  guestName: true,
  guestEmail: true,
  guestPhone: true,
  guestCountry: true,
  preferredLocale: true,
  checkInDate: true,
  checkOutDate: true,
  guestCount: true,
  status: true,
  subtotal: true,
  cleaningFee: true,
  taxes: true,
  discounts: true,
  total: true,
  currency: true,
  confirmedAt: true,
  cancelledAt: true,
  updatedAt: true,
  property: {
    select: {
      checkInTime: true,
    },
  },
  payments: {
    where: {
      purpose: PaymentPurpose.INITIAL_RESERVATION,
      status: {
        in: [
          PaymentStatus.APPROVED,
          PaymentStatus.PARTIALLY_REFUNDED,
          PaymentStatus.REFUNDED,
        ],
      },
    },
    orderBy: [{ paidAt: "desc" }, { createdAt: "desc" }, { id: "desc" }],
    take: 1,
    select: {
      id: true,
      amount: true,
      currency: true,
      status: true,
    },
  },
} satisfies Prisma.ReservationSelect;

type ReservationForCancellation = Prisma.ReservationGetPayload<{
  select: typeof reservationForCancellationSelect;
}>;

const requestForDecisionSelect = {
  ...lifecycleRequestSummarySelect,
  requestType: true,
  originalReservationStatus: true,
  policyExceptionApplied: true,
  reservation: {
    select: {
      id: true,
      status: true,
      confirmedAt: true,
      cancelledAt: true,
      updatedAt: true,
    },
  },
} satisfies Prisma.ReservationLifecycleRequestSelect;

type RequestForDecision = Prisma.ReservationLifecycleRequestGetPayload<{
  select: typeof requestForDecisionSelect;
}>;

export class AdminReservationCancellationError extends Error {
  constructor(public readonly code: AdminReservationCancellationErrorCode) {
    super(code);
    this.name = "AdminReservationCancellationError";
  }
}

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

function normalizeEmail(value: string | null | undefined): string | null {
  return normalizeOptionalText(value, 254)?.toLowerCase() ?? null;
}

function buildCancellationIdempotencyKey(
  reservationId: string,
  requestId: string,
): string {
  return `reservation-cancellation/${reservationId}/${requestId}`;
}

function toPolicySnapshot(
  request: LifecycleRequestSummaryRecord,
): AdminCancellationPolicySnapshot {
  if (
    request.cancellationPolicyVersion !== CANCELLATION_POLICY_VERSION ||
    request.policyTimezone !== CANCELLATION_POLICY_TIMEZONE ||
    !request.policyCalculatedAt ||
    !request.policyCheckInAt ||
    !request.policyHoursBeforeCheckIn ||
    request.policyReasonCode === CancellationPolicyReasonCode.NOT_APPLICABLE ||
    request.standardRefundPercentage === null ||
    !request.standardRefundAmount
  ) {
    throw new AdminReservationCancellationError(
      "ADMIN_CANCELLATION_UNEXPECTED_ERROR",
    );
  }

  return {
    version: CANCELLATION_POLICY_VERSION,
    timezone: CANCELLATION_POLICY_TIMEZONE,
    calculatedAt: request.policyCalculatedAt.toISOString(),
    checkInAt: request.policyCheckInAt.toISOString(),
    hoursBeforeCheckIn: request.policyHoursBeforeCheckIn.toFixed(6),
    reasonCode: request.policyReasonCode,
    refundPercentage: request.standardRefundPercentage,
    refundAmount: request.standardRefundAmount.toFixed(2),
    currency: request.currency,
  };
}

function toAdminSummary(
  admin: Readonly<{ name: string | null; email: string }>,
) {
  return {
    name: normalizeOptionalText(admin.name, 160),
    email: normalizeRequiredText(admin.email, 254).toLowerCase(),
  };
}

export function toAdminCancellationRequestSummary(
  request: LifecycleRequestSummaryRecord,
): AdminCancellationRequestSummary {
  return {
    id: request.id,
    reservationId: request.reservationId,
    sourcePaymentId: request.sourcePaymentId,
    status: request.status,
    channel: request.channel,
    requesterName: request.requesterName,
    requesterEmail: request.requesterEmail,
    requesterPhone: request.requesterPhone,
    requestNote: request.requestNote,
    policy: toPolicySnapshot(request),
    createdByAdmin: toAdminSummary(request.createdByAdmin),
    reviewedByAdmin: request.reviewedByAdmin
      ? toAdminSummary(request.reviewedByAdmin)
      : null,
    decisionReasonCode: request.decisionReasonCode,
    decisionNote: request.decisionNote,
    requestedAt: request.requestedAt.toISOString(),
    reviewedAt: request.reviewedAt?.toISOString() ?? null,
    decidedAt: request.decidedAt?.toISOString() ?? null,
    completedAt: request.completedAt?.toISOString() ?? null,
    version: request.version,
    expectedReservationUpdatedAt:
      request.expectedReservationUpdatedAt.toISOString(),
    updatedAt: request.updatedAt.toISOString(),
  };
}

function assertReservationEligible(
  reservation: ReservationForCancellation,
  expectedUpdatedAt: string,
): void {
  if (reservation.updatedAt.toISOString() !== expectedUpdatedAt) {
    throw new AdminReservationCancellationError("ADMIN_CANCELLATION_STALE");
  }

  if (
    reservation.status !== ReservationStatus.CONFIRMED ||
    !reservation.confirmedAt ||
    reservation.cancelledAt
  ) {
    throw new AdminReservationCancellationError(
      "ADMIN_CANCELLATION_RESERVATION_NOT_CONFIRMED",
    );
  }

  if (reservation.payments.length === 0) {
    throw new AdminReservationCancellationError(
      "ADMIN_CANCELLATION_SOURCE_PAYMENT_NOT_FOUND",
    );
  }
}

function calculateCancellationPolicy(
  reservation: ReservationForCancellation,
  calculatedAt: Date,
) {
  const checkInAt = getArrivalCheckInDateTime(
    reservation.checkInDate,
    reservation.property.checkInTime,
  );

  if (!checkInAt) {
    throw new AdminReservationCancellationError(
      "ADMIN_CANCELLATION_UNEXPECTED_ERROR",
    );
  }

  const policyTiming = calculateStandardCancellationPolicyTiming(
    checkInAt,
    calculatedAt,
  );

  const sourcePayment = reservation.payments[0];

  if (sourcePayment.currency !== reservation.currency) {
    throw new AdminReservationCancellationError(
      "ADMIN_CANCELLATION_UNEXPECTED_ERROR",
    );
  }

  const eligibleCapturedAmount = reservation.total.lessThan(sourcePayment.amount)
    ? reservation.total
    : sourcePayment.amount;
  const standardRefundAmount = eligibleCapturedAmount
    .mul(policyTiming.refundPercentage)
    .div(100)
    .toDecimalPlaces(2);

  return {
    sourcePayment,
    checkInAt,
    hoursBeforeCheckIn: new Prisma.Decimal(policyTiming.hoursBeforeCheckIn),
    reasonCode: policyTiming.reasonCode,
    percentage: policyTiming.refundPercentage,
    standardRefundAmount,
  };
}

async function readSummaryById(
  transaction: Prisma.TransactionClient,
  requestId: string,
): Promise<AdminCancellationRequestSummary> {
  const request = await transaction.reservationLifecycleRequest.findUnique({
    where: { id: requestId },
    select: lifecycleRequestSummarySelect,
  });

  if (!request) {
    throw new AdminReservationCancellationError(
      "ADMIN_CANCELLATION_REQUEST_NOT_FOUND",
    );
  }

  return toAdminCancellationRequestSummary(request);
}

async function createCancellationRequestTransaction(
  input: CreateAdminCancellationRequestInput,
  actor: AdminActor,
): Promise<AdminCancellationRequestSummary> {
  const reservationId = input.reservationId.trim();
  const requestId = input.requestId.trim();
  const idempotencyKey = buildCancellationIdempotencyKey(
    reservationId,
    requestId,
  );

  return prisma.$transaction(
    async (transaction) => {
      const adminActor = await resolveAdminActor(transaction, actor);
      const existing = await transaction.reservationLifecycleRequest.findUnique({
        where: { idempotencyKey },
        select: lifecycleRequestSummarySelect,
      });

      if (existing) {
        if (
          existing.reservationId !== reservationId ||
          existing.clientRequestId !== requestId ||
          existing.requestType !== ReservationLifecycleRequestType.CANCELLATION
        ) {
          throw new AdminReservationCancellationError(
            "ADMIN_CANCELLATION_UNEXPECTED_ERROR",
          );
        }

        return toAdminCancellationRequestSummary(existing);
      }

      const reservation = await transaction.reservation.findUnique({
        where: { id: reservationId },
        select: reservationForCancellationSelect,
      });

      if (!reservation) {
        throw new AdminReservationCancellationError(
          "ADMIN_CANCELLATION_RESERVATION_NOT_FOUND",
        );
      }

      assertReservationEligible(reservation, input.expectedReservationUpdatedAt);

      const reservationFence = await transaction.reservation.updateMany({
        where: {
          id: reservation.id,
          status: ReservationStatus.CONFIRMED,
          updatedAt: reservation.updatedAt,
        },
        data: {
          // Obtain a row lock without changing the reservation version snapshot.
          updatedAt: reservation.updatedAt,
        },
      });

      if (reservationFence.count !== 1) {
        throw new AdminReservationCancellationError("ADMIN_CANCELLATION_STALE");
      }

      const activeRequest =
        await transaction.reservationLifecycleRequest.findFirst({
          where: {
            reservationId: reservation.id,
            requestType: ReservationLifecycleRequestType.CANCELLATION,
            status: {
              in: [...ACTIVE_CANCELLATION_STATUSES],
            },
          },
          select: { id: true },
        });

      if (activeRequest) {
        throw new AdminReservationCancellationError(
          "ADMIN_CANCELLATION_REQUEST_ALREADY_ACTIVE",
        );
      }

      const calculatedAt = new Date();
      const policy = calculateCancellationPolicy(reservation, calculatedAt);
      const cancellationRequest =
        await transaction.reservationLifecycleRequest.create({
          data: {
            reservationId: reservation.id,
            sourcePaymentId: policy.sourcePayment.id,
            requestType: ReservationLifecycleRequestType.CANCELLATION,
            status: ReservationLifecycleRequestStatus.PENDING_REVIEW,
            channel: input.channel,
            requesterName: normalizeRequiredText(input.requesterName, 160),
            requesterEmail: normalizeEmail(input.requesterEmail),
            requesterPhone: normalizeOptionalText(input.requesterPhone, 40),
            requestNote: normalizeRequiredText(input.requestNote, 2_000),
            clientRequestId: requestId,
            idempotencyKey,
            originalReservationStatus: reservation.status,
            originalCheckInDate: reservation.checkInDate,
            originalCheckOutDate: reservation.checkOutDate,
            originalGuestName: reservation.guestName,
            originalGuestEmail: reservation.guestEmail,
            originalGuestPhone: reservation.guestPhone,
            originalGuestCountry: reservation.guestCountry,
            originalPreferredLocale: reservation.preferredLocale,
            originalGuestCount: reservation.guestCount,
            originalSubtotal: reservation.subtotal,
            originalCleaningFee: reservation.cleaningFee,
            originalTaxes: reservation.taxes,
            originalDiscounts: reservation.discounts,
            originalTotal: reservation.total,
            currency: reservation.currency,
            cancellationPolicyVersion: CANCELLATION_POLICY_VERSION,
            policyTimezone: CANCELLATION_POLICY_TIMEZONE,
            policyCalculatedAt: calculatedAt,
            policyCheckInAt: policy.checkInAt,
            policyHoursBeforeCheckIn: policy.hoursBeforeCheckIn,
            policyReasonCode: policy.reasonCode,
            standardRefundPercentage: policy.percentage,
            standardRefundAmount: policy.standardRefundAmount,
            policyExceptionApplied: false,
            createdByAdminId: adminActor.id,
            expectedReservationUpdatedAt: reservation.updatedAt,
          },
          select: lifecycleRequestSummarySelect,
        });

      await transaction.adminAuditLog.create({
        data: {
          userId: adminActor.id,
          action: "RESERVATION_CANCELLATION_REQUEST_CREATED",
          entityType: "ReservationLifecycleRequest",
          entityId: cancellationRequest.id,
          metadata: {
            actorEmail: adminActor.email,
            reservationId: reservation.id,
            requestId,
            channel: input.channel,
            sourcePaymentId: policy.sourcePayment.id,
            originalReservationStatus: reservation.status,
            originalCheckInDate: reservation.checkInDate.toISOString(),
            originalCheckOutDate: reservation.checkOutDate.toISOString(),
            policyVersion: CANCELLATION_POLICY_VERSION,
            policyTimezone: CANCELLATION_POLICY_TIMEZONE,
            policyCalculatedAt: calculatedAt.toISOString(),
            policyCheckInAt: policy.checkInAt.toISOString(),
            policyReasonCode: policy.reasonCode,
            standardRefundPercentage: policy.percentage,
            standardRefundAmount: policy.standardRefundAmount.toFixed(2),
            currency: reservation.currency,
            refundExecuted: false,
          },
        },
      });

      return toAdminCancellationRequestSummary(cancellationRequest);
    },
    {
      isolationLevel: Prisma.TransactionIsolationLevel.Serializable,
    },
  );
}

export async function createAdminCancellationRequest(
  input: CreateAdminCancellationRequestInput,
  actor: AdminActor,
): Promise<AdminCancellationRequestSummary> {
  const reservationId = input.reservationId.trim();
  const requestId = input.requestId.trim();
  const idempotencyKey = buildCancellationIdempotencyKey(
    reservationId,
    requestId,
  );

  try {
    return await createCancellationRequestTransaction(input, actor);
  } catch (error) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      (error.code === "P2002" || error.code === "P2034")
    ) {
      const existing = await prisma.reservationLifecycleRequest.findUnique({
        where: { idempotencyKey },
        select: lifecycleRequestSummarySelect,
      });

      if (existing && existing.reservationId === reservationId) {
        return toAdminCancellationRequestSummary(existing);
      }

      const activeRequest = await prisma.reservationLifecycleRequest.findFirst({
        where: {
          reservationId,
          requestType: ReservationLifecycleRequestType.CANCELLATION,
          status: {
            in: [...ACTIVE_CANCELLATION_STATUSES],
          },
        },
        select: { id: true },
      });

      if (activeRequest) {
        throw new AdminReservationCancellationError(
          "ADMIN_CANCELLATION_REQUEST_ALREADY_ACTIVE",
        );
      }

      throw new AdminReservationCancellationError("ADMIN_CANCELLATION_STALE");
    }

    throw error;
  }
}

function assertPendingDecisionRequest(
  request: RequestForDecision,
  input: DecideAdminCancellationRequestInput,
): void {
  if (
    request.reservationId !== input.reservationId.trim() ||
    request.requestType !== ReservationLifecycleRequestType.CANCELLATION
  ) {
    throw new AdminReservationCancellationError(
      "ADMIN_CANCELLATION_REQUEST_NOT_FOUND",
    );
  }

  if (
    input.decision === "APPROVE" &&
    request.status === ReservationLifecycleRequestStatus.COMPLETED &&
    request.reservation.status === ReservationStatus.CANCELLED
  ) {
    return;
  }

  if (
    input.decision === "REJECT" &&
    request.status === ReservationLifecycleRequestStatus.REJECTED
  ) {
    return;
  }

  if (request.status !== ReservationLifecycleRequestStatus.PENDING_REVIEW) {
    throw new AdminReservationCancellationError(
      "ADMIN_CANCELLATION_REQUEST_NOT_PENDING",
    );
  }

  if (
    request.version !== input.expectedRequestVersion ||
    request.expectedReservationUpdatedAt.toISOString() !==
      input.expectedReservationUpdatedAt ||
    request.reservation.updatedAt.toISOString() !==
      input.expectedReservationUpdatedAt
  ) {
    throw new AdminReservationCancellationError("ADMIN_CANCELLATION_STALE");
  }

  if (
    request.originalReservationStatus !== ReservationStatus.CONFIRMED ||
    request.policyExceptionApplied ||
    request.reservation.status !== ReservationStatus.CONFIRMED ||
    !request.reservation.confirmedAt ||
    request.reservation.cancelledAt
  ) {
    throw new AdminReservationCancellationError(
      "ADMIN_CANCELLATION_RESERVATION_NOT_CONFIRMED",
    );
  }
}

async function decideCancellationRequestTransaction(
  input: DecideAdminCancellationRequestInput,
  actor: AdminActor,
): Promise<AdminCancellationDecisionResult> {
  return prisma.$transaction(
    async (transaction) => {
      const adminActor = await resolveAdminActor(transaction, actor);
      const request = await transaction.reservationLifecycleRequest.findUnique({
        where: { id: input.requestId.trim() },
        select: requestForDecisionSelect,
      });

      if (!request) {
        throw new AdminReservationCancellationError(
          "ADMIN_CANCELLATION_REQUEST_NOT_FOUND",
        );
      }

      assertPendingDecisionRequest(request, input);

      if (
        input.decision === "APPROVE" &&
        request.status === ReservationLifecycleRequestStatus.COMPLETED
      ) {
        return {
          request: toAdminCancellationRequestSummary(request),
          decision: input.decision,
          reservationStatus: request.reservation.status,
          cancelledAt: request.reservation.cancelledAt?.toISOString() ?? null,
          skippedArrivalNotifications: 0,
          alreadyProcessed: true,
        };
      }

      if (
        input.decision === "REJECT" &&
        request.status === ReservationLifecycleRequestStatus.REJECTED
      ) {
        return {
          request: toAdminCancellationRequestSummary(request),
          decision: input.decision,
          reservationStatus: request.reservation.status,
          cancelledAt: request.reservation.cancelledAt?.toISOString() ?? null,
          skippedArrivalNotifications: 0,
          alreadyProcessed: true,
        };
      }

      const decidedAt = new Date();
      const decisionNote = normalizeRequiredText(input.decisionNote, 2_000);
      let skippedArrivalNotifications = 0;
      let reservationStatus = request.reservation.status;
      let cancelledAt: Date | null = request.reservation.cancelledAt;

      if (input.decision === "APPROVE") {
        const reservationUpdate = await transaction.reservation.updateMany({
          where: {
            id: request.reservation.id,
            status: ReservationStatus.CONFIRMED,
            updatedAt: request.reservation.updatedAt,
            cancelledAt: null,
          },
          data: {
            status: ReservationStatus.CANCELLED,
            cancelledAt: decidedAt,
          },
        });

        if (reservationUpdate.count !== 1) {
          throw new AdminReservationCancellationError(
            "ADMIN_CANCELLATION_STALE",
          );
        }

        const requestUpdate =
          await transaction.reservationLifecycleRequest.updateMany({
            where: {
              id: request.id,
              reservationId: request.reservation.id,
              requestType: ReservationLifecycleRequestType.CANCELLATION,
              status: ReservationLifecycleRequestStatus.PENDING_REVIEW,
              version: input.expectedRequestVersion,
            },
            data: {
              status: ReservationLifecycleRequestStatus.COMPLETED,
              reviewedByAdminId: adminActor.id,
              reviewedAt: decidedAt,
              decidedAt,
              completedAt: decidedAt,
              decisionReasonCode: "STANDARD_POLICY_CANCELLATION_APPROVED",
              decisionNote,
              version: {
                increment: 1,
              },
            },
          });

        if (requestUpdate.count !== 1) {
          throw new AdminReservationCancellationError(
            "ADMIN_CANCELLATION_STALE",
          );
        }

        const skippedNotifications =
          await transaction.emailNotification.updateMany({
            where: {
              reservationId: request.reservation.id,
              type: EmailNotificationType.ARRIVAL_INSTRUCTIONS,
              status: {
                in: [
                  EmailNotificationStatus.PENDING,
                  EmailNotificationStatus.FAILED,
                ],
              },
            },
            data: {
              status: EmailNotificationStatus.SKIPPED,
              processingStartedAt: null,
              nextAttemptAt: null,
              errorCode: ARRIVAL_SUPERSEDED_ERROR_CODE,
              errorMessage: ARRIVAL_SUPERSEDED_ERROR_MESSAGE,
            },
          });

        skippedArrivalNotifications = skippedNotifications.count;
        reservationStatus = ReservationStatus.CANCELLED;
        cancelledAt = decidedAt;

        await transaction.adminAuditLog.create({
          data: {
            userId: adminActor.id,
            action: "RESERVATION_CANCELLATION_APPROVED",
            entityType: "ReservationLifecycleRequest",
            entityId: request.id,
            metadata: {
              actorEmail: adminActor.email,
              reservationId: request.reservation.id,
              previousReservationStatus: ReservationStatus.CONFIRMED,
              reservationStatus: ReservationStatus.CANCELLED,
              cancelledAt: decidedAt.toISOString(),
              requestVersion: input.expectedRequestVersion,
              policyVersion: request.cancellationPolicyVersion,
              policyReasonCode: request.policyReasonCode,
              standardRefundPercentage: request.standardRefundPercentage,
              standardRefundAmount:
                request.standardRefundAmount?.toFixed(2) ?? null,
              currency: request.currency,
              policyExceptionApplied: false,
              refundAuthorized: false,
              refundExecuted: false,
              skippedArrivalNotifications,
            },
          },
        });
      } else {
        const requestUpdate =
          await transaction.reservationLifecycleRequest.updateMany({
            where: {
              id: request.id,
              reservationId: request.reservation.id,
              requestType: ReservationLifecycleRequestType.CANCELLATION,
              status: ReservationLifecycleRequestStatus.PENDING_REVIEW,
              version: input.expectedRequestVersion,
            },
            data: {
              status: ReservationLifecycleRequestStatus.REJECTED,
              reviewedByAdminId: adminActor.id,
              reviewedAt: decidedAt,
              decidedAt,
              decisionReasonCode: "CANCELLATION_REJECTED",
              decisionNote,
              version: {
                increment: 1,
              },
            },
          });

        if (requestUpdate.count !== 1) {
          throw new AdminReservationCancellationError(
            "ADMIN_CANCELLATION_STALE",
          );
        }

        await transaction.adminAuditLog.create({
          data: {
            userId: adminActor.id,
            action: "RESERVATION_CANCELLATION_REJECTED",
            entityType: "ReservationLifecycleRequest",
            entityId: request.id,
            metadata: {
              actorEmail: adminActor.email,
              reservationId: request.reservation.id,
              reservationStatus: request.reservation.status,
              requestVersion: input.expectedRequestVersion,
              policyVersion: request.cancellationPolicyVersion,
              policyReasonCode: request.policyReasonCode,
              standardRefundPercentage: request.standardRefundPercentage,
              standardRefundAmount:
                request.standardRefundAmount?.toFixed(2) ?? null,
              currency: request.currency,
              refundAuthorized: false,
              refundExecuted: false,
            },
          },
        });
      }

      return {
        request: await readSummaryById(transaction, request.id),
        decision: input.decision,
        reservationStatus,
        cancelledAt: cancelledAt?.toISOString() ?? null,
        skippedArrivalNotifications,
        alreadyProcessed: false,
      };
    },
    {
      isolationLevel: Prisma.TransactionIsolationLevel.Serializable,
    },
  );
}

export async function decideAdminCancellationRequest(
  input: DecideAdminCancellationRequestInput,
  actor: AdminActor,
): Promise<AdminCancellationDecisionResult> {
  try {
    return await decideCancellationRequestTransaction(input, actor);
  } catch (error) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2034"
    ) {
      throw new AdminReservationCancellationError("ADMIN_CANCELLATION_STALE");
    }

    throw error;
  }
}

export async function getAdminCancellationRequestsForReservation(
  reservationId: string,
): Promise<readonly AdminCancellationRequestSummary[]> {
  const id = reservationId.trim();

  if (!id || id.length > 120) {
    return [];
  }

  const requests = await prisma.reservationLifecycleRequest.findMany({
    where: {
      reservationId: id,
      requestType: ReservationLifecycleRequestType.CANCELLATION,
    },
    orderBy: [{ requestedAt: "desc" }, { id: "desc" }],
    select: lifecycleRequestSummarySelect,
  });

  return requests.map(toAdminCancellationRequestSummary);
}
