export type PaymentSubmissionAttemptSource =
  | "INITIAL_CHECKOUT"
  | "RETRY_PAGE"
  | "LIFECYCLE_ADJUSTMENT";

export type PaymentSubmissionAttemptStatus =
  | "STARTED"
  | "SUBMITTED"
  | "APPROVED"
  | "REJECTED"
  | "FAILED"
  | "UNKNOWN";

export type PaymentSubmissionAttempt = Readonly<{
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
