import { prisma } from "@/lib/db/prisma";
import type {
  AdminPaymentSubmissionAttempt,
  AdminPaymentSubmissionAttemptHistory,
} from "@/types/admin-payment-submission-attempt";

const MAX_IDENTIFIER_LENGTH = 120;

function normalizeIdentifier(value: string): string | null {
  const normalized = value.trim();
  return normalized && normalized.length <= MAX_IDENTIFIER_LENGTH
    ? normalized
    : null;
}

function mapAttempt(attempt: Readonly<{
  id: string;
  paymentId: string;
  reservationId: string;
  attemptNumber: number;
  source: AdminPaymentSubmissionAttempt["source"];
  status: AdminPaymentSubmissionAttempt["status"];
  environment: string;
  locale: string;
  safeResultCode: string | null;
  preflightExpiresAt: Date | null;
  startedAt: Date;
  submittedAt: Date | null;
  completedAt: Date | null;
}>): AdminPaymentSubmissionAttempt {
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

function buildHistory(
  attempts: readonly AdminPaymentSubmissionAttempt[],
): AdminPaymentSubmissionAttemptHistory {
  const countedAttempts = attempts.filter(
    (attempt) => attempt.status !== "STARTED",
  );
  const lastAttempt = countedAttempts[0] ?? null;

  return {
    totalAttempts: countedAttempts.length,
    rejectedOrFailedAttempts: countedAttempts.filter(
      (attempt) =>
        attempt.status === "REJECTED" || attempt.status === "FAILED",
    ).length,
    lastAttemptAt: lastAttempt?.startedAt ?? null,
    lastSource: lastAttempt?.source ?? null,
    attempts,
  };
}

const attemptSelect = {
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
} as const;

export async function getAdminPaymentSubmissionAttemptsForPayment(
  paymentId: string,
): Promise<AdminPaymentSubmissionAttemptHistory> {
  const id = normalizeIdentifier(paymentId);

  if (!id) {
    return buildHistory([]);
  }

  const attempts = await prisma.paymentSubmissionAttempt.findMany({
    where: { paymentId: id },
    orderBy: [
      { attemptNumber: "desc" },
      { startedAt: "desc" },
      { id: "desc" },
    ],
    select: attemptSelect,
  });

  return buildHistory(attempts.map(mapAttempt));
}

export async function getAdminPaymentSubmissionAttemptsForReservation(
  reservationId: string,
): Promise<AdminPaymentSubmissionAttemptHistory> {
  const id = normalizeIdentifier(reservationId);

  if (!id) {
    return buildHistory([]);
  }

  const attempts = await prisma.paymentSubmissionAttempt.findMany({
    where: { reservationId: id },
    orderBy: [
      { attemptNumber: "desc" },
      { startedAt: "desc" },
      { id: "desc" },
    ],
    select: attemptSelect,
  });

  return buildHistory(attempts.map(mapAttempt));
}
