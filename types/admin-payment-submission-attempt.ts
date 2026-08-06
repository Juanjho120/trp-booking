import type {
  PaymentSubmissionAttemptSource,
  PaymentSubmissionAttemptStatus,
} from "@/types/payment-submission-attempt";

export type AdminPaymentSubmissionAttempt = Readonly<{
  id: string;
  paymentId: string;
  reservationId: string;
  attemptNumber: number;
  source: PaymentSubmissionAttemptSource;
  status: PaymentSubmissionAttemptStatus;
  environment: string;
  locale: "es" | "en";
  safeResultCode: string | null;
  preflightExpiresAt: string | null;
  startedAt: string;
  submittedAt: string | null;
  completedAt: string | null;
}>;

export type AdminPaymentSubmissionAttemptHistory = Readonly<{
  totalAttempts: number;
  rejectedOrFailedAttempts: number;
  lastAttemptAt: string | null;
  lastSource: PaymentSubmissionAttemptSource | null;
  attempts: readonly AdminPaymentSubmissionAttempt[];
}>;
