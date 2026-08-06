import {
  LifecycleRequestHoldStatus,
  PaymentPurpose,
  PaymentStatus,
  PaymentSubmissionSource,
  PaymentSubmissionStatus,
  Prisma,
  ReservationStatus,
} from "@prisma/client";

import { prisma } from "@/lib/db/prisma";
import type { PaymentAttemptErrorCode } from "@/types/payment-attempt";
import type {
  PaymentSubmissionAttempt,
  PaymentSubmissionAttemptSource,
  PaymentSubmissionAttemptStatus,
} from "@/types/payment-submission-attempt";

const MAX_CREATE_RETRIES = 3;
const SAFE_RESULT_CODE_MAX_LENGTH = 100;

export class PaymentSubmissionAttemptError extends Error {
  readonly code: PaymentAttemptErrorCode;

  constructor(code: PaymentAttemptErrorCode) {
    super(code);
    this.name = "PaymentSubmissionAttemptError";
    this.code = code;
  }
}

type StoredAttempt = Readonly<{
  id: string;
  paymentId: string;
  reservationId: string;
  attemptNumber: number;
  source: PaymentSubmissionSource;
  status: PaymentSubmissionStatus;
  environment: string;
  locale: string;
  safeResultCode: string | null;
  preflightExpiresAt: Date | null;
  startedAt: Date;
  submittedAt: Date | null;
  completedAt: Date | null;
}>;

function mapAttempt(attempt: StoredAttempt): PaymentSubmissionAttempt {
  return {
    id: attempt.id,
    paymentId: attempt.paymentId,
    reservationId: attempt.reservationId,
    attemptNumber: attempt.attemptNumber,
    source: attempt.source,
    status: attempt.status,
    environment: attempt.environment,
    locale: attempt.locale === "en" ? "en" : "es",
    safeResultCode: attempt.safeResultCode,
    preflightExpiresAt: attempt.preflightExpiresAt?.toISOString() ?? null,
    startedAt: attempt.startedAt.toISOString(),
    submittedAt: attempt.submittedAt?.toISOString() ?? null,
    completedAt: attempt.completedAt?.toISOString() ?? null,
  };
}

function normalizeSafeResultCode(value: string | null | undefined): string | null {
  const normalized = value?.trim().toUpperCase().replace(/[^A-Z0-9_:-]/g, "_");
  return normalized ? normalized.slice(0, SAFE_RESULT_CODE_MAX_LENGTH) : null;
}

function isRetryableTransactionError(error: unknown): boolean {
  return (
    error instanceof Prisma.PrismaClientKnownRequestError &&
    (error.code === "P2002" || error.code === "P2034")
  );
}

function assertSourceMatchesPaymentPurpose(
  purpose: PaymentPurpose,
  source: PaymentSubmissionSource,
): void {
  if (purpose === PaymentPurpose.LIFECYCLE_ADJUSTMENT) {
    if (source !== PaymentSubmissionSource.LIFECYCLE_ADJUSTMENT) {
      throw new PaymentSubmissionAttemptError(
        "INVALID_PAYMENT_HANDOFF_REQUEST",
      );
    }

    return;
  }

  if (
    source !== PaymentSubmissionSource.INITIAL_CHECKOUT &&
    source !== PaymentSubmissionSource.RETRY_PAGE
  ) {
    throw new PaymentSubmissionAttemptError(
      "INVALID_PAYMENT_HANDOFF_REQUEST",
    );
  }
}

function parseActivePreflightExpiration(value: string, now: Date): Date {
  const expiration = new Date(value);

  if (
    Number.isNaN(expiration.getTime()) ||
    expiration.getTime() <= now.getTime()
  ) {
    throw new PaymentSubmissionAttemptError("PENDING_HOLD_EXPIRED");
  }

  return expiration;
}

async function createAttemptOnce(input: Readonly<{
  paymentId: string;
  reservationReference: string;
  source: PaymentSubmissionSource;
  environment: string;
  locale: "es" | "en";
  preflightExpiresAt: string;
}>): Promise<PaymentSubmissionAttempt> {
  const now = new Date();
  const preflightExpiresAt = parseActivePreflightExpiration(
    input.preflightExpiresAt,
    now,
  );

  return prisma.$transaction(
    async (transaction) => {
      const payment = await transaction.payment.findUnique({
        where: { id: input.paymentId },
        select: {
          id: true,
          reservationId: true,
          purpose: true,
          status: true,
          reservation: {
            select: {
              status: true,
              expiresAt: true,
            },
          },
          lifecycleRequest: {
            select: {
              hold: {
                select: {
                  status: true,
                  expiresAt: true,
                },
              },
            },
          },
        },
      });

      if (!payment || payment.status !== PaymentStatus.PENDING) {
        throw new PaymentSubmissionAttemptError(
          "PAYMENT_ATTEMPT_UNEXPECTED_ERROR",
        );
      }

      assertSourceMatchesPaymentPurpose(payment.purpose, input.source);

      if (payment.purpose === PaymentPurpose.INITIAL_RESERVATION) {
        if (
          payment.reservationId !== input.reservationReference ||
          payment.reservation.status !== ReservationStatus.PENDING_PAYMENT ||
          !payment.reservation.expiresAt ||
          payment.reservation.expiresAt.getTime() <= now.getTime() ||
          payment.reservation.expiresAt.getTime() !==
            preflightExpiresAt.getTime()
        ) {
          throw new PaymentSubmissionAttemptError(
            "PENDING_HOLD_NOT_PAYABLE",
          );
        }
      } else {
        const hold = payment.lifecycleRequest?.hold;

        if (
          payment.reservation.status !== ReservationStatus.CONFIRMED ||
          !hold ||
          hold.status !== LifecycleRequestHoldStatus.ACTIVE ||
          hold.expiresAt.getTime() <= now.getTime() ||
          hold.expiresAt.getTime() !== preflightExpiresAt.getTime()
        ) {
          throw new PaymentSubmissionAttemptError(
            "PENDING_HOLD_NOT_PAYABLE",
          );
        }
      }

      const latestAttempt =
        await transaction.paymentSubmissionAttempt.findFirst({
          where: { reservationId: payment.reservationId },
          orderBy: [{ attemptNumber: "desc" }, { id: "desc" }],
          select: { attemptNumber: true },
        });
      const attemptNumber = (latestAttempt?.attemptNumber ?? 0) + 1;
      const attempt = await transaction.paymentSubmissionAttempt.create({
        data: {
          paymentId: payment.id,
          reservationId: payment.reservationId,
          attemptNumber,
          source: input.source,
          status: PaymentSubmissionStatus.SUBMITTED,
          environment: input.environment,
          locale: input.locale,
          preflightExpiresAt,
          startedAt: now,
          submittedAt: now,
        },
        select: {
          id: true,
          paymentId: true,
          reservationId: true,
          attemptNumber: true,
          source: true,
          status: true,
          environment: true,
          locale: true,
          safeResultCode: true,
          preflightExpiresAt: true,
          startedAt: true,
          submittedAt: true,
          completedAt: true,
        },
      });

      return mapAttempt(attempt);
    },
    {
      isolationLevel: Prisma.TransactionIsolationLevel.Serializable,
    },
  );
}

export async function createPaymentSubmissionAttempt(input: Readonly<{
  paymentId: string;
  reservationReference: string;
  source: PaymentSubmissionAttemptSource;
  environment: string;
  locale: "es" | "en";
  preflightExpiresAt: string;
}>): Promise<PaymentSubmissionAttempt> {
  for (let attempt = 1; attempt <= MAX_CREATE_RETRIES; attempt += 1) {
    try {
      return await createAttemptOnce({
        ...input,
        source: input.source as PaymentSubmissionSource,
      });
    } catch (error) {
      if (
        attempt < MAX_CREATE_RETRIES &&
        isRetryableTransactionError(error)
      ) {
        continue;
      }

      if (error instanceof PaymentSubmissionAttemptError) {
        throw error;
      }

      throw new PaymentSubmissionAttemptError(
        "PAYMENT_ATTEMPT_UNEXPECTED_ERROR",
      );
    }
  }

  throw new PaymentSubmissionAttemptError(
    "PAYMENT_ATTEMPT_UNEXPECTED_ERROR",
  );
}

async function findLatestAttempt(paymentId: string): Promise<
  | Readonly<{
      id: string;
      status: PaymentSubmissionStatus;
      safeResultCode: string | null;
    }>
  | null
> {
  return prisma.paymentSubmissionAttempt.findFirst({
    where: { paymentId },
    orderBy: [{ attemptNumber: "desc" }, { id: "desc" }],
    select: {
      id: true,
      status: true,
      safeResultCode: true,
    },
  });
}

function isProviderFinalAttempt(
  attempt: Readonly<{
    status: PaymentSubmissionStatus;
    safeResultCode: string | null;
  }>,
): boolean {
  if (attempt.status === PaymentSubmissionStatus.UNKNOWN) {
    return false;
  }

  if (
    attempt.status === PaymentSubmissionStatus.STARTED ||
    attempt.status === PaymentSubmissionStatus.SUBMITTED
  ) {
    return false;
  }

  return !attempt.safeResultCode?.startsWith("TILOPAY_SDK_");
}

async function updateLatestOpenAttempt(input: Readonly<{
  paymentId: string;
  status: PaymentSubmissionStatus;
  safeResultCode: string | null;
}>): Promise<void> {
  const latestAttempt = await prisma.paymentSubmissionAttempt.findFirst({
    where: {
      paymentId: input.paymentId,
      status: {
        in: [
          PaymentSubmissionStatus.STARTED,
          PaymentSubmissionStatus.SUBMITTED,
        ],
      },
    },
    orderBy: [{ attemptNumber: "desc" }, { id: "desc" }],
    select: { id: true },
  });

  if (!latestAttempt) {
    return;
  }

  await prisma.paymentSubmissionAttempt.updateMany({
    where: {
      id: latestAttempt.id,
      status: {
        in: [
          PaymentSubmissionStatus.STARTED,
          PaymentSubmissionStatus.SUBMITTED,
        ],
      },
    },
    data: {
      status: input.status,
      safeResultCode: normalizeSafeResultCode(input.safeResultCode),
      completedAt: new Date(),
    },
  });
}

export async function finalizePaymentSubmissionAttempt(input: Readonly<{
  paymentId: string;
  status: PaymentSubmissionAttemptStatus;
  safeResultCode: string | null;
}>): Promise<void> {
  const latestAttempt = await findLatestAttempt(input.paymentId);

  if (!latestAttempt) {
    return;
  }

  const status = input.status as PaymentSubmissionStatus;
  const safeResultCode = normalizeSafeResultCode(input.safeResultCode);

  if (
    latestAttempt.status === status &&
    latestAttempt.safeResultCode === safeResultCode
  ) {
    return;
  }

  if (isProviderFinalAttempt(latestAttempt)) {
    return;
  }

  await prisma.paymentSubmissionAttempt.update({
    where: { id: latestAttempt.id },
    data: {
      status,
      safeResultCode,
      completedAt: new Date(),
    },
  });
}

export async function finalizePaymentSubmissionAttemptFromSdkEvent(input: Readonly<{
  paymentId: string;
  eventType:
    | "TILOPAY_SDK_START_PAYMENT_FAILED"
    | "TILOPAY_SDK_START_PAYMENT_NON_SUCCESS";
  sdkMessage: string | null | undefined;
}>): Promise<void> {
  const invalidCardNumber =
    input.sdkMessage?.trim().toLowerCase() ===
    "please enter a valid card number";

  if (input.eventType === "TILOPAY_SDK_START_PAYMENT_NON_SUCCESS") {
    await updateLatestOpenAttempt({
      paymentId: input.paymentId,
      status: PaymentSubmissionStatus.REJECTED,
      safeResultCode: invalidCardNumber
        ? "TILOPAY_SDK_INVALID_CARD_NUMBER"
        : "TILOPAY_SDK_NON_SUCCESS",
    });
    return;
  }

  await updateLatestOpenAttempt({
    paymentId: input.paymentId,
    status: PaymentSubmissionStatus.FAILED,
    safeResultCode: invalidCardNumber
      ? "TILOPAY_SDK_INVALID_CARD_NUMBER"
      : "TILOPAY_SDK_START_PAYMENT_FAILED",
  });
}
