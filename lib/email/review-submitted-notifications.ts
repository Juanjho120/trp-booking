import {
  EmailNotificationOrigin,
  EmailNotificationStatus,
  EmailNotificationType,
  type Prisma,
} from "@prisma/client";

import {
  buildAdminReviewSubmittedEmail,
  EmailTemplateDataError,
} from "@/emails";
import { prisma } from "@/lib/db/prisma";
import type { EmailProvider } from "@/types/email-provider";
import type {
  ClaimedEmailNotificationDeliveryOutcome,
  EmailNotificationClaim,
  EmailNotificationDeliveryErrorCode,
} from "@/types/email-notification";
import type {
  AdminReviewSubmittedEmailTemplateInput,
} from "@/types/admin-review-submitted-email-template";

import {
  normalizeAdminNotificationRecipient,
  resolveAdminNotificationRouting,
} from "./admin-notification-routing";
import { EmailProviderError } from "./provider";
import {
  calculateNextEmailNotificationAttemptAt,
} from "./retry-policy";

type AdminReviewSubmittedNotificationIntent = Readonly<{
  id: string;
  recipient: string;
  locale: "es" | "en";
  status: EmailNotificationStatus;
  created: boolean;
}>;

type ReviewSubmittedEmailDeliveryErrorCode =
  | EmailNotificationDeliveryErrorCode
  | "EMAIL_REVIEW_SUBMITTED_RELATION_MISMATCH";

const SAFE_REVIEW_SUBMITTED_DELIVERY_ERROR_MESSAGES = {
  EMAIL_PROVIDER_DISABLED: "Email delivery is disabled.",
  EMAIL_PROVIDER_CONFIGURATION_ERROR:
    "Email provider configuration is invalid.",
  EMAIL_PROVIDER_INVALID_REQUEST: "The email request is invalid.",
  EMAIL_PROVIDER_IDEMPOTENCY_CONFLICT:
    "The email idempotency request conflicts with a previous request.",
  EMAIL_PROVIDER_RATE_LIMITED: "The email provider rate limit was reached.",
  EMAIL_PROVIDER_TEMPORARY_FAILURE:
    "The email provider is temporarily unavailable.",
  EMAIL_PROVIDER_REJECTED: "The email provider rejected the request.",
  EMAIL_PROVIDER_UNEXPECTED_ERROR:
    "The email provider returned an unexpected error.",
  EMAIL_TEMPLATE_INVALID_DATA: "The email template data is invalid.",
  EMAIL_NOTIFICATION_DATA_INCOMPLETE:
    "The email notification data is incomplete.",
  EMAIL_NOTIFICATION_UNSUPPORTED_TYPE:
    "The email notification type is not supported by this dispatcher.",
  EMAIL_NOTIFICATION_RETRY_LIMIT_REACHED:
    "The email notification reached the maximum delivery attempt count.",
  EMAIL_ARRIVAL_INSTRUCTIONS_SUPERSEDED:
    "Arrival instructions were superseded before delivery.",
  EMAIL_ARRIVAL_INSTRUCTIONS_DISABLED:
    "Arrival instructions are no longer enabled for this accommodation.",
  EMAIL_REVIEW_SUBMITTED_RELATION_MISMATCH:
    "The submitted-review notification relation is inconsistent.",
  EMAIL_NOTIFICATION_UNEXPECTED_ERROR:
    "The email notification could not be delivered.",
} as const satisfies Readonly<
  Record<ReviewSubmittedEmailDeliveryErrorCode, string>
>;

const claimedReviewSubmittedSelect = {
  id: true,
  reservationId: true,
  type: true,
  recipient: true,
  locale: true,
  deduplicationKey: true,
  attemptCount: true,
  reservation: {
    select: {
      id: true,
      property: {
        select: {
          nameEs: true,
          nameEn: true,
        },
      },
      review: {
        select: {
          id: true,
          reservationId: true,
          rating: true,
          comment: true,
          guestDisplayName: true,
          submittedAt: true,
        },
      },
    },
  },
} satisfies Prisma.EmailNotificationSelect;

type ClaimedReviewSubmittedNotification = Prisma.EmailNotificationGetPayload<{
  select: typeof claimedReviewSubmittedSelect;
}>;

class ReviewSubmittedEmailDeliveryError extends Error {
  readonly code: ReviewSubmittedEmailDeliveryErrorCode;
  readonly retryable: boolean;

  constructor(code: ReviewSubmittedEmailDeliveryErrorCode, retryable: boolean) {
    super(SAFE_REVIEW_SUBMITTED_DELIVERY_ERROR_MESSAGES[code]);
    this.name = "ReviewSubmittedEmailDeliveryError";
    this.code = code;
    this.retryable = retryable;
  }
}

function normalizeLocale(value: string): "es" | "en" {
  return value === "en" ? "en" : "es";
}

export function buildAdminReviewSubmittedNotificationKey(
  reviewId: string,
  recipient: string,
): string {
  const normalizedReviewId = reviewId.trim();
  const normalizedRecipient = normalizeAdminNotificationRecipient(recipient);

  if (!normalizedReviewId) {
    throw new TypeError("Missing submitted-review relation.");
  }

  return `admin-review-submitted/${normalizedReviewId}/${normalizedRecipient}`;
}

export function isReviewSubmittedNotificationType(
  value: EmailNotificationType,
): boolean {
  return value === EmailNotificationType.ADMIN_REVIEW_SUBMITTED;
}

async function ensureAdminReviewSubmittedNotificationIntent(
  transaction: Prisma.TransactionClient,
  input: Readonly<{
    reviewId: string;
    reservationId: string;
    recipient: string;
    locale: "es" | "en";
  }>,
): Promise<AdminReviewSubmittedNotificationIntent> {
  const recipient = normalizeAdminNotificationRecipient(input.recipient);
  const deduplicationKey = buildAdminReviewSubmittedNotificationKey(
    input.reviewId,
    recipient,
  );
  const data = {
    reservationId: input.reservationId,
    type: EmailNotificationType.ADMIN_REVIEW_SUBMITTED,
    recipient,
    locale: input.locale,
    deduplicationKey,
    origin: EmailNotificationOrigin.AUTOMATIC,
    status: EmailNotificationStatus.PENDING,
  };
  const creation = await transaction.emailNotification.createMany({
    data,
    skipDuplicates: true,
  });
  const notification = await transaction.emailNotification.findUnique({
    where: { deduplicationKey },
    select: {
      id: true,
      reservationId: true,
      reviewInvitationId: true,
      guestPaymentRequestId: true,
      lifecycleRequestId: true,
      refundId: true,
      type: true,
      recipient: true,
      locale: true,
      status: true,
    },
  });

  if (!notification) {
    throw new TypeError(
      "Submitted-review notification intent was not persisted.",
    );
  }

  if (
    notification.reservationId !== input.reservationId ||
    notification.reviewInvitationId !== null ||
    notification.guestPaymentRequestId !== null ||
    notification.lifecycleRequestId !== null ||
    notification.refundId !== null ||
    notification.type !== EmailNotificationType.ADMIN_REVIEW_SUBMITTED ||
    notification.recipient !== recipient ||
    notification.locale !== input.locale
  ) {
    throw new TypeError("Submitted-review notification deduplication conflict.");
  }

  return {
    id: notification.id,
    recipient: notification.recipient,
    locale: normalizeLocale(notification.locale),
    status: notification.status,
    created: creation.count === 1,
  };
}

export async function createAdminReviewSubmittedNotificationIntents(
  transaction: Prisma.TransactionClient,
  input: Readonly<{
    reviewId: string;
    reservationId: string;
  }>,
  source: NodeJS.ProcessEnv = process.env,
): Promise<readonly AdminReviewSubmittedNotificationIntent[]> {
  const routing = resolveAdminNotificationRouting(source);
  const intents: AdminReviewSubmittedNotificationIntent[] = [];

  for (const adminRecipient of routing.adminRecipients) {
    intents.push(
      await ensureAdminReviewSubmittedNotificationIntent(transaction, {
        reviewId: input.reviewId,
        reservationId: input.reservationId,
        recipient: adminRecipient,
        locale: routing.adminLocale,
      }),
    );
  }

  return intents;
}

async function readClaimedReviewSubmittedNotification(
  claim: EmailNotificationClaim,
): Promise<ClaimedReviewSubmittedNotification | null> {
  return prisma.emailNotification.findFirst({
    where: {
      id: claim.notificationId,
      type: EmailNotificationType.ADMIN_REVIEW_SUBMITTED,
      status: EmailNotificationStatus.PROCESSING,
      processingStartedAt: claim.processingStartedAt,
    },
    select: claimedReviewSubmittedSelect,
  });
}

function parseReviewIdFromDeduplicationKey(value: string): string | null {
  const parts = value.split("/");

  if (
    parts.length !== 3 ||
    parts[0] !== "admin-review-submitted" ||
    !parts[1] ||
    !parts[2]
  ) {
    return null;
  }

  return parts[1];
}

function isCoherentReviewSubmittedNotification(
  notification: ClaimedReviewSubmittedNotification,
): notification is ClaimedReviewSubmittedNotification & {
  reservation: ClaimedReviewSubmittedNotification["reservation"] & {
    review: NonNullable<
      ClaimedReviewSubmittedNotification["reservation"]["review"]
    >;
  };
} {
  if (
    notification.type !== EmailNotificationType.ADMIN_REVIEW_SUBMITTED ||
    notification.reservation.id !== notification.reservationId ||
    !notification.reservation.review ||
    notification.reservation.review.reservationId !==
      notification.reservationId
  ) {
    return false;
  }

  const reviewId = parseReviewIdFromDeduplicationKey(
    notification.deduplicationKey,
  );

  if (reviewId !== notification.reservation.review.id) {
    return false;
  }

  try {
    return (
      buildAdminReviewSubmittedNotificationKey(
        notification.reservation.review.id,
        notification.recipient,
      ) === notification.deduplicationKey
    );
  } catch {
    return false;
  }
}

function assertClaimedNotificationShape(
  notification: ClaimedReviewSubmittedNotification,
): asserts notification is ClaimedReviewSubmittedNotification & {
  reservation: ClaimedReviewSubmittedNotification["reservation"] & {
    review: NonNullable<
      ClaimedReviewSubmittedNotification["reservation"]["review"]
    >;
  };
} {
  if (!isCoherentReviewSubmittedNotification(notification)) {
    throw new ReviewSubmittedEmailDeliveryError(
      "EMAIL_REVIEW_SUBMITTED_RELATION_MISMATCH",
      false,
    );
  }
}

function buildTemplateInput(
  notification: ClaimedReviewSubmittedNotification & {
    reservation: ClaimedReviewSubmittedNotification["reservation"] & {
      review: NonNullable<
        ClaimedReviewSubmittedNotification["reservation"]["review"]
      >;
    };
  },
  publicBaseUrl: string,
  brandLogoUrl: string,
): AdminReviewSubmittedEmailTemplateInput {
  const locale = normalizeLocale(notification.locale);
  const review = notification.reservation.review;

  return {
    locale,
    publicBaseUrl,
    brandLogoUrl,
    review: {
      propertyNameEs: notification.reservation.property.nameEs,
      propertyNameEn: notification.reservation.property.nameEn,
      guestDisplayName: review.guestDisplayName,
      rating: review.rating,
      comment: review.comment,
      submittedAt: review.submittedAt.toISOString(),
    },
  };
}

function normalizeDeliveryError(
  error: unknown,
): ReviewSubmittedEmailDeliveryError {
  if (error instanceof ReviewSubmittedEmailDeliveryError) {
    return error;
  }

  if (error instanceof EmailProviderError) {
    return new ReviewSubmittedEmailDeliveryError(
      error.code,
      error.retryable,
    );
  }

  if (error instanceof EmailTemplateDataError) {
    return new ReviewSubmittedEmailDeliveryError(
      "EMAIL_TEMPLATE_INVALID_DATA",
      false,
    );
  }

  return new ReviewSubmittedEmailDeliveryError(
    "EMAIL_NOTIFICATION_UNEXPECTED_ERROR",
    true,
  );
}

async function markReviewSubmittedNotificationSent(
  claim: EmailNotificationClaim,
  providerMessageId: string,
  sentAt: Date,
): Promise<void> {
  const updated = await prisma.emailNotification.updateMany({
    where: {
      id: claim.notificationId,
      status: EmailNotificationStatus.PROCESSING,
      processingStartedAt: claim.processingStartedAt,
    },
    data: {
      status: EmailNotificationStatus.SENT,
      providerMessageId,
      sentAt,
      processingStartedAt: null,
      nextAttemptAt: null,
      errorCode: null,
      errorMessage: null,
    },
  });

  if (updated.count !== 1) {
    throw new ReviewSubmittedEmailDeliveryError(
      "EMAIL_NOTIFICATION_UNEXPECTED_ERROR",
      true,
    );
  }
}

async function markReviewSubmittedNotificationFailed(
  claim: EmailNotificationClaim,
  attemptCount: number,
  error: ReviewSubmittedEmailDeliveryError,
  failedAt: Date,
): Promise<Date | null> {
  const nextAttemptAt = error.retryable
    ? calculateNextEmailNotificationAttemptAt(attemptCount, failedAt)
    : null;

  try {
    const updated = await prisma.emailNotification.updateMany({
      where: {
        id: claim.notificationId,
        status: EmailNotificationStatus.PROCESSING,
        processingStartedAt: claim.processingStartedAt,
      },
      data: {
        status: EmailNotificationStatus.FAILED,
        processingStartedAt: null,
        errorCode: error.code,
        errorMessage: error.message,
        nextAttemptAt,
      },
    });

    return updated.count === 1 ? nextAttemptAt : null;
  } catch {
    return null;
  }
}

export async function deliverClaimedReviewSubmittedEmailNotification(
  input: Readonly<{
    claim: EmailNotificationClaim;
    provider: EmailProvider;
    publicBaseUrl: string;
    brandLogoUrl: string;
    now: () => Date;
  }>,
): Promise<ClaimedEmailNotificationDeliveryOutcome> {
  const notification = await readClaimedReviewSubmittedNotification(input.claim);

  if (!notification) {
    return { outcome: "skipped", retryScheduled: false };
  }

  try {
    assertClaimedNotificationShape(notification);

    const locale = normalizeLocale(notification.locale);
    const content = await buildAdminReviewSubmittedEmail(
      buildTemplateInput(
        notification,
        input.publicBaseUrl,
        input.brandLogoUrl,
      ),
    );
    const sent = await input.provider.send({
      intendedRecipient: notification.recipient,
      audience: "admin",
      locale,
      subject: content.subject,
      html: content.html,
      text: content.text,
      idempotencyKey: notification.deduplicationKey,
    });

    await markReviewSubmittedNotificationSent(
      input.claim,
      sent.providerMessageId,
      input.now(),
    );

    return { outcome: "sent", retryScheduled: false };
  } catch (error) {
    const nextAttemptAt = await markReviewSubmittedNotificationFailed(
      input.claim,
      notification.attemptCount,
      normalizeDeliveryError(error),
      input.now(),
    );

    return {
      outcome: "failed",
      retryScheduled: nextAttemptAt !== null,
    };
  }
}
