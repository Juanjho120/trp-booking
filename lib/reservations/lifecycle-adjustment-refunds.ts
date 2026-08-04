import {
  LifecycleRequestHoldStatus,
  PaymentPurpose,
  PaymentStatus,
  Prisma,
  RefundAuthorizationType,
  RefundProcessingMode,
  RefundStatus,
  ReservationLifecycleRequestStatus,
  ReservationLifecycleRequestType,
  ReservationStatus,
} from "@prisma/client";

import { prisma } from "@/lib/db/prisma";
import type { AdminDateMutationErrorCode } from "@/types/admin-reservation-date-mutation";

const REFUND_TRANSACTION_MAX_ATTEMPTS = 3;
const REFUND_TRANSACTION_MAX_WAIT_MS = 10_000;
const REFUND_TRANSACTION_TIMEOUT_MS = 20_000;
const REFUND_TRANSACTION_RETRY_DELAY_MS = 75;
const LIFECYCLE_REFUND_REASON_MAX_LENGTH = 2_000;

const COMMITTED_REFUND_STATUSES = [
  RefundStatus.PENDING,
  RefundStatus.PROCESSING,
  RefundStatus.APPROVED,
  RefundStatus.MANUAL,
] as const;
const REFUND_HISTORY_PAYMENT_STATUSES = new Set<PaymentStatus>([
  PaymentStatus.APPROVED,
  PaymentStatus.PARTIALLY_REFUNDED,
  PaymentStatus.REFUNDED,
]);
const DATE_MUTATION_REQUEST_TYPES = new Set<ReservationLifecycleRequestType>([
  ReservationLifecycleRequestType.DATE_CHANGE,
  ReservationLifecycleRequestType.STAY_EXTENSION,
]);

const NEGATIVE_REFUND_IDEMPOTENCY_PREFIX =
  "lifecycle-adjustment/negative-difference";
const COMPENSATING_REFUND_IDEMPOTENCY_PREFIX =
  "lifecycle-adjustment/compensating-refund";
const COMPENSATION_FAILURE_PREFIX = "LIFECYCLE_DATE_MUTATION_COMPLETION";
const COMPENSATION_HOLD_RELEASE_REASON =
  "LIFECYCLE_DATE_MUTATION_COMPENSATION_REQUIRED";
const COMPENSATION_HOLD_EXPIRED_REASON =
  "LIFECYCLE_DATE_MUTATION_COMPENSATION_AFTER_EXPIRY";

export type LifecycleAdjustmentRefundKind =
  | "NEGATIVE_DIFFERENCE"
  | "FAILED_POSITIVE_COMPLETION";

export type LifecycleAdjustmentRefundAuthorizationResult = Readonly<{
  refundId: string;
  paymentId: string;
  lifecycleRequestId: string;
  kind: LifecycleAdjustmentRefundKind;
  amount: string;
  currency: string;
  status: "PENDING" | "PROCESSING" | "APPROVED" | "FAILED" | "MANUAL";
  processingMode:
    | "LEGACY_UNSPECIFIED"
    | "TILOPAY_API"
    | "TILOPAY_PORTAL_FALLBACK";
  alreadyProcessed: boolean;
}>;

export type CompensatedDateMutationResult = Readonly<{
  refund: LifecycleAdjustmentRefundAuthorizationResult;
  requestStatus: "FAILED" | "EXPIRED";
  holdStatus: "RELEASED" | "EXPIRED" | null;
}>;

export class LifecycleAdjustmentRefundError extends Error {
  constructor(public readonly code: AdminDateMutationErrorCode) {
    super(code);
    this.name = "LifecycleAdjustmentRefundError";
  }
}

export type RefundPaymentSnapshot = Readonly<{
  id: string;
  reservationId: string;
  lifecycleRequestId: string | null;
  purpose: PaymentPurpose;
  status: PaymentStatus;
  amount: Prisma.Decimal;
  currency: string;
  providerReference: string | null;
  updatedAt: Date;
}>;

function wait(milliseconds: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, milliseconds));
}

function isSerializationConflict(error: unknown): boolean {
  return (
    error instanceof Prisma.PrismaClientKnownRequestError &&
    error.code === "P2034"
  );
}

async function runSerializableRefundTransaction<T>(
  operation: (transaction: Prisma.TransactionClient) => Promise<T>,
): Promise<T> {
  for (
    let attempt = 1;
    attempt <= REFUND_TRANSACTION_MAX_ATTEMPTS;
    attempt += 1
  ) {
    try {
      return await prisma.$transaction(operation, {
        isolationLevel: Prisma.TransactionIsolationLevel.Serializable,
        maxWait: REFUND_TRANSACTION_MAX_WAIT_MS,
        timeout: REFUND_TRANSACTION_TIMEOUT_MS,
      });
    } catch (error) {
      if (
        !isSerializationConflict(error) ||
        attempt === REFUND_TRANSACTION_MAX_ATTEMPTS
      ) {
        throw error;
      }

      await wait(REFUND_TRANSACTION_RETRY_DELAY_MS * attempt);
    }
  }

  throw new LifecycleAdjustmentRefundError(
    "ADMIN_DATE_MUTATION_UNEXPECTED_ERROR",
  );
}

function normalizeReason(value: string | null | undefined): string {
  const normalized = value?.trim().replace(/\s+/g, " ") ?? "";
  return normalized.slice(0, LIFECYCLE_REFUND_REASON_MAX_LENGTH);
}

function processingModeForPayment(
  payment: RefundPaymentSnapshot,
): RefundProcessingMode {
  return payment.providerReference
    ? RefundProcessingMode.TILOPAY_API
    : RefundProcessingMode.TILOPAY_PORTAL_FALLBACK;
}

function toAuthorizationResult(
  refund: Readonly<{
    id: string;
    paymentId: string;
    lifecycleRequestId: string | null;
    amount: Prisma.Decimal;
    currency: string;
    status: RefundStatus;
    processingMode: RefundProcessingMode;
  }>,
  kind: LifecycleAdjustmentRefundKind,
  alreadyProcessed: boolean,
): LifecycleAdjustmentRefundAuthorizationResult {
  if (!refund.lifecycleRequestId) {
    throw new LifecycleAdjustmentRefundError(
      "ADMIN_DATE_MUTATION_COMPLETION_CONFLICT",
    );
  }

  return {
    refundId: refund.id,
    paymentId: refund.paymentId,
    lifecycleRequestId: refund.lifecycleRequestId,
    kind,
    amount: refund.amount.toFixed(2),
    currency: refund.currency,
    status: refund.status,
    processingMode: refund.processingMode,
    alreadyProcessed,
  };
}

async function remainingCapturedBalance(
  transaction: Prisma.TransactionClient,
  payment: RefundPaymentSnapshot,
): Promise<Prisma.Decimal> {
  const committed = await transaction.refund.aggregate({
    where: {
      paymentId: payment.id,
      status: { in: [...COMMITTED_REFUND_STATUSES] },
    },
    _sum: { amount: true },
  });

  return payment.amount
    .sub(committed._sum.amount ?? new Prisma.Decimal(0))
    .toDecimalPlaces(2);
}

function assertExactAvailableBalance(
  remaining: Prisma.Decimal,
  amount: Prisma.Decimal,
): void {
  if (amount.lessThanOrEqualTo(0) || remaining.comparedTo(amount) < 0) {
    throw new LifecycleAdjustmentRefundError(
      "ADMIN_DATE_MUTATION_REFUND_BALANCE_INSUFFICIENT",
    );
  }
}

async function findExistingRefund(
  transaction: Prisma.TransactionClient,
  idempotencyKey: string,
) {
  return transaction.refund.findUnique({
    where: { idempotencyKey },
    select: {
      id: true,
      paymentId: true,
      lifecycleRequestId: true,
      authorizationType: true,
      amount: true,
      currency: true,
      status: true,
      processingMode: true,
    },
  });
}

function assertExistingRefundMatches(
  refund: NonNullable<Awaited<ReturnType<typeof findExistingRefund>>>,
  input: Readonly<{
    paymentId: string;
    lifecycleRequestId: string;
    amount: Prisma.Decimal;
    currency: string;
  }>,
): void {
  if (
    refund.authorizationType !==
      RefundAuthorizationType.LIFECYCLE_ADJUSTMENT ||
    refund.paymentId !== input.paymentId ||
    refund.lifecycleRequestId !== input.lifecycleRequestId ||
    refund.amount.comparedTo(input.amount) !== 0 ||
    refund.currency !== input.currency
  ) {
    throw new LifecycleAdjustmentRefundError(
      "ADMIN_DATE_MUTATION_COMPLETION_CONFLICT",
    );
  }
}

async function createLifecycleRefund(
  transaction: Prisma.TransactionClient,
  input: Readonly<{
    payment: RefundPaymentSnapshot;
    lifecycleRequestId: string;
    requestedByAdminId: string;
    amount: Prisma.Decimal;
    currency: string;
    reason: string;
    idempotencyKey: string;
    clientRequestId: string;
    kind: LifecycleAdjustmentRefundKind;
    now: Date;
  }>,
): Promise<LifecycleAdjustmentRefundAuthorizationResult> {
  const existing = await findExistingRefund(transaction, input.idempotencyKey);

  if (existing) {
    assertExistingRefundMatches(existing, {
      paymentId: input.payment.id,
      lifecycleRequestId: input.lifecycleRequestId,
      amount: input.amount,
      currency: input.currency,
    });
    return toAuthorizationResult(existing, input.kind, true);
  }

  const remaining = await remainingCapturedBalance(transaction, input.payment);
  assertExactAvailableBalance(remaining, input.amount);

  const processingMode = processingModeForPayment(input.payment);
  const refund = await transaction.refund.create({
    data: {
      paymentId: input.payment.id,
      lifecycleRequestId: input.lifecycleRequestId,
      requestedByAdminId: input.requestedByAdminId,
      clientRequestId: input.clientRequestId,
      idempotencyKey: input.idempotencyKey,
      authorizationType: RefundAuthorizationType.LIFECYCLE_ADJUSTMENT,
      amount: input.amount,
      currency: input.currency,
      reason: input.reason,
      status: RefundStatus.PENDING,
      processingMode,
    },
    select: {
      id: true,
      paymentId: true,
      lifecycleRequestId: true,
      amount: true,
      currency: true,
      status: true,
      processingMode: true,
    },
  });

  await transaction.adminAuditLog.create({
    data: {
      userId: input.requestedByAdminId,
      action:
        input.kind === "NEGATIVE_DIFFERENCE"
          ? "LIFECYCLE_ADJUSTMENT_NEGATIVE_REFUND_AUTHORIZED"
          : "LIFECYCLE_ADJUSTMENT_COMPENSATING_REFUND_AUTHORIZED",
      entityType: "Refund",
      entityId: refund.id,
      metadata: {
        lifecycleRequestId: input.lifecycleRequestId,
        reservationId: input.payment.reservationId,
        paymentId: input.payment.id,
        refundId: refund.id,
        authorizationType: RefundAuthorizationType.LIFECYCLE_ADJUSTMENT,
        lifecycleAdjustmentKind: input.kind,
        amount: input.amount.toFixed(2),
        currency: input.currency,
        processingMode,
        authorizedAt: input.now.toISOString(),
        providerCalled: false,
        reservationStatusChangedByRefund: false,
      },
    },
  });

  return toAuthorizationResult(refund, input.kind, false);
}

export async function createNegativeLifecycleAdjustmentRefundInTransaction(
  transaction: Prisma.TransactionClient,
  input: Readonly<{
    lifecycleRequestId: string;
    reservationId: string;
    requestedByAdminId: string;
    sourcePayment: RefundPaymentSnapshot;
    financialDifference: Prisma.Decimal;
    currency: string;
    reason: string | null;
    now: Date;
  }>,
): Promise<LifecycleAdjustmentRefundAuthorizationResult> {
  const amount = input.financialDifference.abs().toDecimalPlaces(2);

  if (
    !input.financialDifference.lessThan(0) ||
    input.sourcePayment.id === "" ||
    input.sourcePayment.reservationId !== input.reservationId ||
    input.sourcePayment.lifecycleRequestId !== null ||
    input.sourcePayment.purpose !== PaymentPurpose.INITIAL_RESERVATION ||
    !REFUND_HISTORY_PAYMENT_STATUSES.has(input.sourcePayment.status) ||
    input.sourcePayment.currency !== input.currency
  ) {
    throw new LifecycleAdjustmentRefundError(
      "ADMIN_DATE_MUTATION_SOURCE_PAYMENT_NOT_FOUND",
    );
  }

  const key = `${NEGATIVE_REFUND_IDEMPOTENCY_PREFIX}/${input.lifecycleRequestId}`;

  return createLifecycleRefund(transaction, {
    payment: input.sourcePayment,
    lifecycleRequestId: input.lifecycleRequestId,
    requestedByAdminId: input.requestedByAdminId,
    amount,
    currency: input.currency,
    reason: normalizeReason(input.reason),
    idempotencyKey: key,
    clientRequestId: key,
    kind: "NEGATIVE_DIFFERENCE",
    now: input.now,
  });
}

export function isCompensatableDateMutationCompletionError(
  code: AdminDateMutationErrorCode,
): boolean {
  return new Set<AdminDateMutationErrorCode>([
    "ADMIN_DATE_MUTATION_RESERVATION_NOT_CONFIRMED",
    "ADMIN_DATE_MUTATION_PROPERTY_NOT_ELIGIBLE",
    "ADMIN_DATE_MUTATION_DATES_UNAVAILABLE",
    "ADMIN_DATE_MUTATION_REQUEST_EXPIRED",
    "ADMIN_DATE_MUTATION_EXTENSION_INVALID",
    "ADMIN_DATE_MUTATION_STALE",
    "ADMIN_DATE_MUTATION_COMPLETION_NOT_READY",
    "ADMIN_DATE_MUTATION_ADJUSTMENT_PAYMENT_NOT_APPROVED",
    "ADMIN_DATE_MUTATION_HOLD_NOT_ACTIVE",
  ]).has(code);
}

function boundedFailureCode(code: AdminDateMutationErrorCode): string {
  return `${COMPENSATION_FAILURE_PREFIX}_${code
    .replace(/^ADMIN_DATE_MUTATION_/, "")
    .slice(0, 55)}`.slice(0, 100);
}

export async function compensateApprovedLifecycleAdjustmentPayment(
  paymentId: string,
  completionErrorCode: AdminDateMutationErrorCode,
  now: Date = new Date(),
): Promise<CompensatedDateMutationResult> {
  if (!isCompensatableDateMutationCompletionError(completionErrorCode)) {
    throw new LifecycleAdjustmentRefundError(
      "ADMIN_DATE_MUTATION_UNEXPECTED_ERROR",
    );
  }

  return runSerializableRefundTransaction(async (transaction) => {
    const payment = await transaction.payment.findUnique({
      where: { id: paymentId.trim() },
      select: {
        id: true,
        reservationId: true,
        lifecycleRequestId: true,
        purpose: true,
        status: true,
        amount: true,
        currency: true,
        providerReference: true,
        updatedAt: true,
        lifecycleRequest: {
          select: {
            id: true,
            reservationId: true,
            requestType: true,
            status: true,
            version: true,
            updatedAt: true,
            createdByAdminId: true,
            reviewedByAdminId: true,
            decisionNote: true,
            requestNote: true,
            hold: {
              select: {
                id: true,
                status: true,
                expiresAt: true,
                version: true,
                updatedAt: true,
              },
            },
            reservation: {
              select: {
                status: true,
                confirmedAt: true,
                cancelledAt: true,
              },
            },
          },
        },
      },
    });

    const request = payment?.lifecycleRequest;

    if (
      !payment ||
      !request ||
      payment.lifecycleRequestId !== request.id ||
      request.reservationId !== payment.reservationId ||
      !DATE_MUTATION_REQUEST_TYPES.has(request.requestType) ||
      payment.purpose !== PaymentPurpose.LIFECYCLE_ADJUSTMENT ||
      !REFUND_HISTORY_PAYMENT_STATUSES.has(payment.status) ||
      request.reservation.status !== ReservationStatus.CONFIRMED ||
      !request.reservation.confirmedAt ||
      request.reservation.cancelledAt ||
      request.status === ReservationLifecycleRequestStatus.COMPLETED
    ) {
      throw new LifecycleAdjustmentRefundError(
        "ADMIN_DATE_MUTATION_COMPLETION_CONFLICT",
      );
    }

    const actorId = request.reviewedByAdminId ?? request.createdByAdminId;
    const idempotencyKey = `${COMPENSATING_REFUND_IDEMPOTENCY_PREFIX}/${request.id}/${payment.id}`;
    const refund = await createLifecycleRefund(transaction, {
      payment,
      lifecycleRequestId: request.id,
      requestedByAdminId: actorId,
      amount: payment.amount.toDecimalPlaces(2),
      currency: payment.currency,
      reason: normalizeReason(
        request.decisionNote ?? request.requestNote ?? completionErrorCode,
      ),
      idempotencyKey,
      clientRequestId: idempotencyKey,
      kind: "FAILED_POSITIVE_COMPLETION",
      now,
    });

    if (
      refund.alreadyProcessed &&
      (request.status === ReservationLifecycleRequestStatus.FAILED ||
        request.status === ReservationLifecycleRequestStatus.EXPIRED) &&
      (!request.hold ||
        request.hold.status === LifecycleRequestHoldStatus.RELEASED ||
        request.hold.status === LifecycleRequestHoldStatus.EXPIRED)
    ) {
      return {
        refund,
        requestStatus:
          request.status === ReservationLifecycleRequestStatus.EXPIRED
            ? "EXPIRED"
            : "FAILED",
        holdStatus:
          request.hold?.status === LifecycleRequestHoldStatus.EXPIRED
            ? "EXPIRED"
            : request.hold?.status === LifecycleRequestHoldStatus.RELEASED
              ? "RELEASED"
              : null,
      };
    }

    let requestStatus: "FAILED" | "EXPIRED";

    if (request.status === ReservationLifecycleRequestStatus.EXPIRED) {
      requestStatus = "EXPIRED";
    } else if (request.status === ReservationLifecycleRequestStatus.FAILED) {
      requestStatus = "FAILED";
    } else {
      const requestUpdate =
        await transaction.reservationLifecycleRequest.updateMany({
          where: {
            id: request.id,
            status: request.status,
            version: request.version,
            updatedAt: request.updatedAt,
          },
          data: {
            status: ReservationLifecycleRequestStatus.FAILED,
            failedAt: now,
            failureCode: boundedFailureCode(completionErrorCode),
            version: { increment: 1 },
          },
        });

      if (requestUpdate.count !== 1) {
        throw new LifecycleAdjustmentRefundError(
          "ADMIN_DATE_MUTATION_COMPLETION_CONFLICT",
        );
      }

      requestStatus = "FAILED";
    }

    let holdStatus: "RELEASED" | "EXPIRED" | null = null;

    if (request.hold?.status === LifecycleRequestHoldStatus.ACTIVE) {
      const expired = request.hold.expiresAt <= now;
      const holdUpdate = await transaction.lifecycleRequestHold.updateMany({
        where: {
          id: request.hold.id,
          status: LifecycleRequestHoldStatus.ACTIVE,
          version: request.hold.version,
          updatedAt: request.hold.updatedAt,
        },
        data: expired
          ? {
              status: LifecycleRequestHoldStatus.EXPIRED,
              expiredAt: now,
              releaseReasonCode: COMPENSATION_HOLD_EXPIRED_REASON,
              version: { increment: 1 },
            }
          : {
              status: LifecycleRequestHoldStatus.RELEASED,
              releasedAt: now,
              releaseReasonCode: COMPENSATION_HOLD_RELEASE_REASON,
              version: { increment: 1 },
            },
      });

      if (holdUpdate.count !== 1) {
        throw new LifecycleAdjustmentRefundError(
          "ADMIN_DATE_MUTATION_HOLD_NOT_ACTIVE",
        );
      }

      holdStatus = expired ? "EXPIRED" : "RELEASED";
    } else if (request.hold?.status === LifecycleRequestHoldStatus.EXPIRED) {
      holdStatus = "EXPIRED";
    } else if (request.hold?.status === LifecycleRequestHoldStatus.RELEASED) {
      holdStatus = "RELEASED";
    }

    await transaction.adminAuditLog.create({
      data: {
        userId: actorId,
        action: "LIFECYCLE_DATE_MUTATION_COMPLETION_FAILED",
        entityType: "ReservationLifecycleRequest",
        entityId: request.id,
        metadata: {
          reservationId: payment.reservationId,
          lifecycleRequestId: request.id,
          requestType: request.requestType,
          paymentId: payment.id,
          paymentStatus: payment.status,
          paymentAmount: payment.amount.toFixed(2),
          currency: payment.currency,
          completionErrorCode,
          requestStatus,
          holdId: request.hold?.id ?? null,
          holdStatus,
          compensatingRefundId: refund.refundId,
          compensatingRefundStatus: refund.status,
          reservationStatus: ReservationStatus.CONFIRMED,
          reservationDatesChanged: false,
          reservationPricingChanged: false,
          paymentDowngraded: false,
          recordedAt: now.toISOString(),
        },
      },
    });

    return { refund, requestStatus, holdStatus };
  });
}
