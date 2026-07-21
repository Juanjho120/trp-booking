import type { EmailNotificationDeliveryErrorCode } from "@/types/email-notification";

export const EMAIL_NOTIFICATION_RETRY_BATCH_SIZE = 20;
export const EMAIL_NOTIFICATION_MAX_ATTEMPTS = 5;
export const EMAIL_NOTIFICATION_PROCESSING_TIMEOUT_MS = 10 * 60 * 1000;

export const EMAIL_NOTIFICATION_RETRY_LIMIT_ERROR_CODE =
  "EMAIL_NOTIFICATION_RETRY_LIMIT_REACHED" as const;
export const EMAIL_NOTIFICATION_RETRY_LIMIT_ERROR_MESSAGE =
  "The email notification reached the maximum delivery attempt count.";

const EMAIL_NOTIFICATION_RETRY_DELAYS_MS = [
  5 * 60 * 1000,
  15 * 60 * 1000,
  60 * 60 * 1000,
  6 * 60 * 60 * 1000,
] as const;

export const RETRYABLE_EMAIL_NOTIFICATION_ERROR_CODES: readonly EmailNotificationDeliveryErrorCode[] = [
  "EMAIL_PROVIDER_RATE_LIMITED",
  "EMAIL_PROVIDER_TEMPORARY_FAILURE",
  "EMAIL_PROVIDER_UNEXPECTED_ERROR",
  "EMAIL_NOTIFICATION_UNEXPECTED_ERROR",
];

const retryableErrorCodes = new Set<string>(
  RETRYABLE_EMAIL_NOTIFICATION_ERROR_CODES,
);

export function isRetryableEmailNotificationErrorCode(
  errorCode: string | null,
): boolean {
  return errorCode !== null && retryableErrorCodes.has(errorCode);
}

export function calculateNextEmailNotificationAttemptAt(
  attemptCount: number,
  failedAt: Date,
): Date | null {
  if (attemptCount >= EMAIL_NOTIFICATION_MAX_ATTEMPTS) {
    return null;
  }

  const delayIndex = Math.min(
    Math.max(attemptCount - 1, 0),
    EMAIL_NOTIFICATION_RETRY_DELAYS_MS.length - 1,
  );

  return new Date(
    failedAt.getTime() + EMAIL_NOTIFICATION_RETRY_DELAYS_MS[delayIndex],
  );
}

export function getEmailNotificationStaleProcessingCutoff(now: Date): Date {
  return new Date(
    now.getTime() - EMAIL_NOTIFICATION_PROCESSING_TIMEOUT_MS,
  );
}
