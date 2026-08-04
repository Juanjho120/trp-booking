import {
  Prisma,
  ReservationLifecycleRequestStatus,
  ReservationLifecycleRequestType,
} from "@prisma/client";

import { prisma } from "@/lib/db/prisma";
import {
  completeApprovedNegativeDateMutationInTransaction,
} from "@/lib/reservations/negative-date-mutation-completion";
import { ReservationDateMutationCompletionError } from "@/lib/reservations/date-mutation-completion";
import type { AdminActor } from "@/types/admin";
import type {
  AdminDateMutationDecisionResult,
  DecideAdminDateMutationRequestInput,
} from "@/types/admin-reservation-date-mutation";

import { resolveAdminActor } from "./admin-actor";
import {
  AdminReservationDateMutationError,
  getAdminDateMutationRequestsForReservation,
} from "./reservation-date-mutation";

const REVIEW_DURATION_HOURS = 24;
const MILLISECONDS_PER_HOUR = 60 * 60 * 1_000;
const TRANSACTION_MAX_ATTEMPTS = 3;
const TRANSACTION_MAX_WAIT_MS = 10_000;
const TRANSACTION_TIMEOUT_MS = 20_000;
const TRANSACTION_RETRY_DELAY_MS = 75;
const PENDING_REVIEW_EXPIRED_FAILURE_CODE =
  "LIFECYCLE_PENDING_REVIEW_EXPIRED";

const decisionBoundarySelect = {
  id: true,
  reservationId: true,
  requestType: true,
  status: true,
  version: true,
  updatedAt: true,
  requestedAt: true,
  financialDifference: true,
  expectedReservationUpdatedAt: true,
  decisionNote: true,
  reservation: {
    select: {
      updatedAt: true,
    },
  },
} satisfies Prisma.ReservationLifecycleRequestSelect;

type DecisionBoundary = Prisma.ReservationLifecycleRequestGetPayload<{
  select: typeof decisionBoundarySelect;
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

async function runSerializableDecisionTransaction<T>(
  operation: (transaction: Prisma.TransactionClient) => Promise<T>,
): Promise<T> {
  for (
    let attempt = 1;
    attempt <= TRANSACTION_MAX_ATTEMPTS;
    attempt += 1
  ) {
    try {
      return await prisma.$transaction(operation, {
        isolationLevel: Prisma.TransactionIsolationLevel.Serializable,
        maxWait: TRANSACTION_MAX_WAIT_MS,
        timeout: TRANSACTION_TIMEOUT_MS,
      });
    } catch (error) {
      if (
        !isSerializationConflict(error) ||
        attempt === TRANSACTION_MAX_ATTEMPTS
      ) {
        throw error;
      }

      await wait(TRANSACTION_RETRY_DELAY_MS * attempt);
    }
  }

  throw new AdminReservationDateMutationError(
    "ADMIN_DATE_MUTATION_UNEXPECTED_ERROR",
  );
}

function isSupportedRequestType(
  value: ReservationLifecycleRequestType,
): boolean {
  return (
    value === ReservationLifecycleRequestType.DATE_CHANGE ||
    value === ReservationLifecycleRequestType.STAY_EXTENSION
  );
}

function normalizedDecisionNote(value: string): string {
  return value.trim().replace(/\s+/g, " ").slice(0, 2_000);
}

function assertRequestIdentity(
  request: DecisionBoundary,
  input: DecideAdminDateMutationRequestInput,
): Prisma.Decimal {
  const difference = request.financialDifference;

  if (
    request.reservationId !== input.reservationId.trim() ||
    !isSupportedRequestType(request.requestType) ||
    !difference ||
    !difference.lessThan(0)
  ) {
    throw new AdminReservationDateMutationError(
      "ADMIN_DATE_MUTATION_REQUEST_NOT_FOUND",
    );
  }

  return difference;
}

async function isNegativeApproval(
  input: DecideAdminDateMutationRequestInput,
): Promise<boolean> {
  if (input.decision !== "APPROVE") {
    return false;
  }

  const request = await prisma.reservationLifecycleRequest.findUnique({
    where: { id: input.requestId.trim() },
    select: {
      reservationId: true,
      requestType: true,
      financialDifference: true,
    },
  });

  return Boolean(
    request &&
      request.reservationId === input.reservationId.trim() &&
      isSupportedRequestType(request.requestType) &&
      request.financialDifference?.lessThan(0),
  );
}

async function completeNegativeDecision(
  transaction: Prisma.TransactionClient,
  input: DecideAdminDateMutationRequestInput,
  actor: AdminActor,
): Promise<Readonly<{ alreadyProcessed: boolean; expired: boolean }>> {
  const adminActor = await resolveAdminActor(transaction, actor);
  const request = await transaction.reservationLifecycleRequest.findUnique({
    where: { id: input.requestId.trim() },
    select: decisionBoundarySelect,
  });

  if (!request) {
    throw new AdminReservationDateMutationError(
      "ADMIN_DATE_MUTATION_REQUEST_NOT_FOUND",
    );
  }

  const difference = assertRequestIdentity(request, input);
  const now = new Date();

  if (request.status === ReservationLifecycleRequestStatus.COMPLETED) {
    try {
      const completion =
        await completeApprovedNegativeDateMutationInTransaction(
          transaction,
          request.id,
          now,
        );
      return {
        alreadyProcessed: completion.alreadyCompleted,
        expired: false,
      };
    } catch (error) {
      if (error instanceof ReservationDateMutationCompletionError) {
        throw new AdminReservationDateMutationError(error.code);
      }
      throw error;
    }
  }

  if (request.status === ReservationLifecycleRequestStatus.APPROVED) {
    try {
      const completion =
        await completeApprovedNegativeDateMutationInTransaction(
          transaction,
          request.id,
          now,
        );
      return {
        alreadyProcessed: completion.alreadyCompleted,
        expired: false,
      };
    } catch (error) {
      if (error instanceof ReservationDateMutationCompletionError) {
        throw new AdminReservationDateMutationError(error.code);
      }
      throw error;
    }
  }

  if (
    request.status === ReservationLifecycleRequestStatus.EXPIRED ||
    request.status === ReservationLifecycleRequestStatus.FAILED
  ) {
    throw new AdminReservationDateMutationError(
      "ADMIN_DATE_MUTATION_REQUEST_EXPIRED",
    );
  }

  if (request.status !== ReservationLifecycleRequestStatus.PENDING_REVIEW) {
    throw new AdminReservationDateMutationError(
      "ADMIN_DATE_MUTATION_DECISION_CONFLICT",
    );
  }

  const reviewExpiresAt = new Date(
    request.requestedAt.getTime() +
      REVIEW_DURATION_HOURS * MILLISECONDS_PER_HOUR,
  );

  if (reviewExpiresAt <= now) {
    const expired = await transaction.reservationLifecycleRequest.updateMany({
      where: {
        id: request.id,
        status: ReservationLifecycleRequestStatus.PENDING_REVIEW,
        version: request.version,
        updatedAt: request.updatedAt,
      },
      data: {
        status: ReservationLifecycleRequestStatus.EXPIRED,
        expiredAt: now,
        failureCode: PENDING_REVIEW_EXPIRED_FAILURE_CODE,
        version: { increment: 1 },
      },
    });

    if (expired.count !== 1) {
      throw new AdminReservationDateMutationError(
        "ADMIN_DATE_MUTATION_STALE",
      );
    }

    await transaction.adminAuditLog.create({
      data: {
        userId: adminActor.id,
        action: "LIFECYCLE_REQUEST_EXPIRED",
        entityType: "ReservationLifecycleRequest",
        entityId: request.id,
        metadata: {
          actorEmail: adminActor.email,
          reservationId: request.reservationId,
          lifecycleRequestId: request.id,
          requestType: request.requestType,
          requestedAt: request.requestedAt.toISOString(),
          expiredAt: now.toISOString(),
          reasonCode: PENDING_REVIEW_EXPIRED_FAILURE_CODE,
        },
      },
    });

    return { alreadyProcessed: false, expired: true };
  }

  if (
    request.version !== input.expectedRequestVersion ||
    request.expectedReservationUpdatedAt.toISOString() !==
      input.expectedReservationUpdatedAt ||
    request.reservation.updatedAt.toISOString() !==
      input.expectedReservationUpdatedAt
  ) {
    throw new AdminReservationDateMutationError("ADMIN_DATE_MUTATION_STALE");
  }

  const decisionNote = normalizedDecisionNote(input.decisionNote);

  if (!decisionNote) {
    throw new AdminReservationDateMutationError(
      "INVALID_ADMIN_DATE_MUTATION_REQUEST",
    );
  }

  const updated = await transaction.reservationLifecycleRequest.updateMany({
    where: {
      id: request.id,
      status: ReservationLifecycleRequestStatus.PENDING_REVIEW,
      version: input.expectedRequestVersion,
      updatedAt: request.updatedAt,
    },
    data: {
      status: ReservationLifecycleRequestStatus.APPROVED,
      reviewedByAdminId: adminActor.id,
      reviewedAt: now,
      decidedAt: now,
      decisionReasonCode: "DATE_MUTATION_APPROVED_NEGATIVE_DIFFERENCE",
      decisionNote,
      version: { increment: 1 },
    },
  });

  if (updated.count !== 1) {
    throw new AdminReservationDateMutationError("ADMIN_DATE_MUTATION_STALE");
  }

  await transaction.adminAuditLog.create({
    data: {
      userId: adminActor.id,
      action: "LIFECYCLE_REQUEST_APPROVED",
      entityType: "ReservationLifecycleRequest",
      entityId: request.id,
      metadata: {
        actorEmail: adminActor.email,
        reservationId: request.reservationId,
        lifecycleRequestId: request.id,
        requestType: request.requestType,
        previousStatus: ReservationLifecycleRequestStatus.PENDING_REVIEW,
        status: ReservationLifecycleRequestStatus.APPROVED,
        financialDifference: difference.toFixed(2),
        financialBranch: "NEGATIVE",
        decisionNote,
        requestVersion: input.expectedRequestVersion,
        reservationVersion: request.reservation.updatedAt.toISOString(),
        holdCreated: false,
        adjustmentPaymentCreated: false,
        completionTriggered: true,
        lifecycleAdjustmentRefundAuthorized: true,
      },
    },
  });

  try {
    await completeApprovedNegativeDateMutationInTransaction(
      transaction,
      request.id,
      now,
    );
  } catch (error) {
    if (error instanceof ReservationDateMutationCompletionError) {
      throw new AdminReservationDateMutationError(error.code);
    }
    throw error;
  }

  return { alreadyProcessed: false, expired: false };
}

export async function decideAdminNegativeDateMutationRequestIfApplicable(
  input: DecideAdminDateMutationRequestInput,
  actor: AdminActor,
): Promise<AdminDateMutationDecisionResult | null> {
  if (!(await isNegativeApproval(input))) {
    return null;
  }

  try {
    const transactionResult = await runSerializableDecisionTransaction(
      (transaction) => completeNegativeDecision(transaction, input, actor),
    );

    if (transactionResult.expired) {
      throw new AdminReservationDateMutationError(
        "ADMIN_DATE_MUTATION_REQUEST_EXPIRED",
      );
    }

    const requests = await getAdminDateMutationRequestsForReservation(
      input.reservationId,
    );
    const request = requests.find(
      (candidate) => candidate.id === input.requestId.trim(),
    );

    if (!request) {
      throw new AdminReservationDateMutationError(
        "ADMIN_DATE_MUTATION_REQUEST_NOT_FOUND",
      );
    }

    return {
      request,
      decision: "APPROVE",
      financialBranch: "NEGATIVE",
      holdCreated: false,
      paymentCreated: false,
      alreadyProcessed: transactionResult.alreadyProcessed,
    };
  } catch (error) {
    const recoverableConflict =
      (error instanceof Prisma.PrismaClientKnownRequestError &&
        (error.code === "P2002" || error.code === "P2034")) ||
      (error instanceof AdminReservationDateMutationError &&
        error.code === "ADMIN_DATE_MUTATION_STALE");

    if (recoverableConflict) {
      const existing = await prisma.reservationLifecycleRequest.findUnique({
        where: { id: input.requestId.trim() },
        select: {
          reservationId: true,
          requestType: true,
          status: true,
          financialDifference: true,
        },
      });

      if (
        existing &&
        existing.reservationId === input.reservationId.trim() &&
        isSupportedRequestType(existing.requestType) &&
        existing.financialDifference?.lessThan(0) &&
        existing.status === ReservationLifecycleRequestStatus.COMPLETED
      ) {
        const requests = await getAdminDateMutationRequestsForReservation(
          input.reservationId,
        );
        const request = requests.find(
          (candidate) => candidate.id === input.requestId.trim(),
        );

        if (request) {
          return {
            request,
            decision: "APPROVE",
            financialBranch: "NEGATIVE",
            holdCreated: false,
            paymentCreated: false,
            alreadyProcessed: true,
          };
        }
      }

      throw new AdminReservationDateMutationError(
        "ADMIN_DATE_MUTATION_STALE",
      );
    }

    throw error;
  }
}
