import {
  LifecycleRequestHoldStatus,
  PaymentPurpose,
  PaymentStatus,
  Prisma,
  ReservationLifecycleRequestStatus,
} from "@prisma/client";

import { prisma } from "@/lib/db/prisma";

export const LIFECYCLE_ADJUSTMENT_HOLD_DURATION_MINUTES = 60;

export const LIFECYCLE_ADJUSTMENT_HOLD_EXPIRED_CODE =
  "LIFECYCLE_ADJUSTMENT_HOLD_EXPIRED";

const MILLISECONDS_PER_MINUTE = 60 * 1_000;
const LIFECYCLE_ADJUSTMENT_EXPIRATION_TRANSACTION_MAX_WAIT_MS = 10_000;
const LIFECYCLE_ADJUSTMENT_EXPIRATION_TRANSACTION_TIMEOUT_MS = 20_000;

export function buildLifecycleAdjustmentHoldExpiresAt(now: Date): Date {
  return new Date(
    now.getTime() +
      LIFECYCLE_ADJUSTMENT_HOLD_DURATION_MINUTES * MILLISECONDS_PER_MINUTE,
  );
}

export type LifecycleAdjustmentExpirationResult = Readonly<{
  expired: boolean;
  lifecycleRequestId: string;
  holdId: string | null;
  expiredPaymentIds: readonly string[];
}>;

async function expireLifecycleAdjustmentRequestTransaction(
  transaction: Prisma.TransactionClient,
  lifecycleRequestId: string,
  now: Date,
): Promise<LifecycleAdjustmentExpirationResult> {
  const request = await transaction.reservationLifecycleRequest.findUnique({
    where: { id: lifecycleRequestId },
    select: {
      id: true,
      reservationId: true,
      requestType: true,
      status: true,
      version: true,
      createdByAdminId: true,
      reviewedByAdminId: true,
      hold: {
        select: {
          id: true,
          status: true,
          expiresAt: true,
          version: true,
        },
      },
      adjustmentPayments: {
        where: {
          purpose: PaymentPurpose.LIFECYCLE_ADJUSTMENT,
          status: PaymentStatus.PENDING,
        },
        select: { id: true },
      },
    },
  });

  if (!request?.hold) {
    return {
      expired: false,
      lifecycleRequestId,
      holdId: null,
      expiredPaymentIds: [],
    };
  }

  if (
    request.status !==
      ReservationLifecycleRequestStatus.AWAITING_ADJUSTMENT_PAYMENT ||
    request.hold.status !== LifecycleRequestHoldStatus.ACTIVE ||
    request.hold.expiresAt > now
  ) {
    return {
      expired: false,
      lifecycleRequestId,
      holdId: request.hold.id,
      expiredPaymentIds: [],
    };
  }

  const holdUpdate = await transaction.lifecycleRequestHold.updateMany({
    where: {
      id: request.hold.id,
      status: LifecycleRequestHoldStatus.ACTIVE,
      version: request.hold.version,
      expiresAt: { lte: now },
    },
    data: {
      status: LifecycleRequestHoldStatus.EXPIRED,
      expiredAt: now,
      releaseReasonCode: LIFECYCLE_ADJUSTMENT_HOLD_EXPIRED_CODE,
      version: { increment: 1 },
    },
  });

  if (holdUpdate.count !== 1) {
    return {
      expired: false,
      lifecycleRequestId,
      holdId: request.hold.id,
      expiredPaymentIds: [],
    };
  }

  const requestUpdate = await transaction.reservationLifecycleRequest.updateMany({
    where: {
      id: request.id,
      status: ReservationLifecycleRequestStatus.AWAITING_ADJUSTMENT_PAYMENT,
      version: request.version,
    },
    data: {
      status: ReservationLifecycleRequestStatus.EXPIRED,
      expiredAt: now,
      failureCode: LIFECYCLE_ADJUSTMENT_HOLD_EXPIRED_CODE,
      version: { increment: 1 },
    },
  });

  if (requestUpdate.count !== 1) {
    throw new Error("LIFECYCLE_ADJUSTMENT_EXPIRATION_STALE");
  }

  const pendingPaymentIds = request.adjustmentPayments.map(
    (payment) => payment.id,
  );

  if (pendingPaymentIds.length > 0) {
    await transaction.payment.updateMany({
      where: {
        id: { in: pendingPaymentIds },
        purpose: PaymentPurpose.LIFECYCLE_ADJUSTMENT,
        status: PaymentStatus.PENDING,
      },
      data: {
        status: PaymentStatus.FAILED,
        failedAt: now,
        rawPayload: {
          source: "lifecycle_adjustment_hold_expiration",
          failureCode: LIFECYCLE_ADJUSTMENT_HOLD_EXPIRED_CODE,
        },
      },
    });
  }

  await transaction.adminAuditLog.create({
    data: {
      userId: request.reviewedByAdminId ?? request.createdByAdminId,
      action: "LIFECYCLE_ADJUSTMENT_HOLD_EXPIRED",
      entityType: "LifecycleRequestHold",
      entityId: request.hold.id,
      metadata: {
        reservationId: request.reservationId,
        lifecycleRequestId: request.id,
        requestType: request.requestType,
        holdId: request.hold.id,
        expiredAt: now.toISOString(),
        expiresAt: request.hold.expiresAt.toISOString(),
        reasonCode: LIFECYCLE_ADJUSTMENT_HOLD_EXPIRED_CODE,
        expiredPaymentIds: pendingPaymentIds,
        publicPendingReservationHoldChanged: false,
      },
    },
  });

  return {
    expired: true,
    lifecycleRequestId: request.id,
    holdId: request.hold.id,
    expiredPaymentIds: pendingPaymentIds,
  };
}

export async function expireLifecycleAdjustmentRequestIfNeeded(
  lifecycleRequestId: string,
  now: Date = new Date(),
): Promise<LifecycleAdjustmentExpirationResult> {
  const id = lifecycleRequestId.trim();
  const candidate = await prisma.reservationLifecycleRequest.findUnique({
    where: { id },
    select: {
      status: true,
      hold: {
        select: {
          id: true,
          status: true,
          expiresAt: true,
        },
      },
    },
  });

  if (!candidate?.hold) {
    return {
      expired: false,
      lifecycleRequestId: id,
      holdId: null,
      expiredPaymentIds: [],
    };
  }

  if (
    candidate.status !==
      ReservationLifecycleRequestStatus.AWAITING_ADJUSTMENT_PAYMENT ||
    candidate.hold.status !== LifecycleRequestHoldStatus.ACTIVE ||
    candidate.hold.expiresAt > now
  ) {
    return {
      expired: false,
      lifecycleRequestId: id,
      holdId: candidate.hold.id,
      expiredPaymentIds: [],
    };
  }

  return prisma.$transaction(
    (transaction) =>
      expireLifecycleAdjustmentRequestTransaction(transaction, id, now),
    {
      isolationLevel: Prisma.TransactionIsolationLevel.Serializable,
      maxWait: LIFECYCLE_ADJUSTMENT_EXPIRATION_TRANSACTION_MAX_WAIT_MS,
      timeout: LIFECYCLE_ADJUSTMENT_EXPIRATION_TRANSACTION_TIMEOUT_MS,
    },
  );
}

export async function expireLifecycleAdjustmentRequestIfNeededInTransaction(
  transaction: Prisma.TransactionClient,
  lifecycleRequestId: string,
  now: Date,
): Promise<LifecycleAdjustmentExpirationResult> {
  return expireLifecycleAdjustmentRequestTransaction(
    transaction,
    lifecycleRequestId.trim(),
    now,
  );
}

export async function expireDueLifecycleAdjustmentHolds(
  now: Date = new Date(),
): Promise<Readonly<{ expiredCount: number; expiredAt: string }>> {
  const dueHolds = await prisma.lifecycleRequestHold.findMany({
    where: {
      status: LifecycleRequestHoldStatus.ACTIVE,
      expiresAt: { lte: now },
    },
    orderBy: [{ expiresAt: "asc" }, { id: "asc" }],
    select: { lifecycleRequestId: true },
  });
  let expiredCount = 0;

  for (const hold of dueHolds) {
    const result = await expireLifecycleAdjustmentRequestIfNeeded(
      hold.lifecycleRequestId,
      now,
    );

    if (result.expired) {
      expiredCount += 1;
    }
  }

  return { expiredCount, expiredAt: now.toISOString() };
}
