import {
  EmailNotificationOrigin,
  EmailNotificationStatus,
  EmailNotificationType,
  Prisma,
  ReservationStatus,
  ReviewInvitationStatus,
  type PrismaClient,
} from "@prisma/client";
import { z } from "zod";

import {
  buildReviewInvitationEmail,
  EmailTemplateDataError,
} from "@/emails";
import { prisma } from "@/lib/db/prisma";
import { EmailProviderError } from "@/lib/email/provider";
import {
  calculateNextEmailNotificationAttemptAt,
} from "@/lib/email/retry-policy";
import {
  cancelReviewInvitationInTransaction,
  decryptReviewInvitationAccessToken,
  ensureReviewInvitationInTransaction,
  expireReviewInvitationIfOverdueInTransaction,
  getReviewInvitationEffectiveStatus,
  hashReviewInvitationAccessToken,
  type EnsureReviewInvitationResult,
  type ReviewInvitationLifecycleRecord,
} from "@/lib/reviews";
import type { EmailProvider } from "@/types/email-provider";
import type {
  ClaimedEmailNotificationDeliveryOutcome,
  EmailNotificationClaim,
  EmailNotificationDeliveryErrorCode,
  ReviewInvitationSchedulingSummary,
} from "@/types/email-notification";
import type { ReviewInvitationEmailTemplateInput } from "@/types/review-invitation-email-template";

const REVIEW_INVITATION_SCHEDULING_CATCH_UP_DAYS = 8;
const REVIEW_INVITATION_SCHEDULING_MAX_CANDIDATES = 500;
const REVIEW_INVITATION_SERIALIZATION_RETRY_LIMIT = 3;

const recipientSchema = z
  .string()
  .trim()
  .email()
  .max(160)
  .transform((value) => value.toLowerCase());

type ReviewInvitationPrismaClient = PrismaClient | Prisma.TransactionClient;
type ReviewInvitationSchedulingPrismaClient = Pick<
  PrismaClient,
  "$transaction" | "reservation" | "reviewInvitation"
>;

type ReviewInvitationDeliveryErrorCode =
  | EmailNotificationDeliveryErrorCode
  | "EMAIL_REVIEW_INVITATION_EXPIRED"
  | "EMAIL_REVIEW_INVITATION_SUPERSEDED"
  | "EMAIL_REVIEW_INVITATION_RELATION_MISMATCH"
  | "EMAIL_REVIEW_INVITATION_RECIPIENT_CHANGED"
  | "EMAIL_REVIEW_INVITATION_TOKEN_UNAVAILABLE";

const SAFE_REVIEW_INVITATION_DELIVERY_ERROR_MESSAGES = {
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
  EMAIL_REVIEW_INVITATION_EXPIRED:
    "The review invitation expired before delivery.",
  EMAIL_REVIEW_INVITATION_SUPERSEDED:
    "The review invitation is no longer deliverable.",
  EMAIL_REVIEW_INVITATION_RELATION_MISMATCH:
    "The review invitation notification relation is inconsistent.",
  EMAIL_REVIEW_INVITATION_RECIPIENT_CHANGED:
    "The review invitation recipient changed before delivery.",
  EMAIL_REVIEW_INVITATION_TOKEN_UNAVAILABLE:
    "The review invitation token is unavailable.",
  EMAIL_NOTIFICATION_UNEXPECTED_ERROR:
    "The email notification could not be delivered.",
} as const satisfies Readonly<
  Record<ReviewInvitationDeliveryErrorCode, string>
>;

const terminalSkipCodes = new Set<ReviewInvitationDeliveryErrorCode>([
  "EMAIL_REVIEW_INVITATION_EXPIRED",
  "EMAIL_REVIEW_INVITATION_SUPERSEDED",
  "EMAIL_REVIEW_INVITATION_RELATION_MISMATCH",
  "EMAIL_REVIEW_INVITATION_RECIPIENT_CHANGED",
  "EMAIL_REVIEW_INVITATION_TOKEN_UNAVAILABLE",
  "EMAIL_NOTIFICATION_UNSUPPORTED_TYPE",
  "EMAIL_NOTIFICATION_DATA_INCOMPLETE",
]);

class ReviewInvitationEmailDeliveryError extends Error {
  readonly code: ReviewInvitationDeliveryErrorCode;
  readonly retryable: boolean;

  constructor(code: ReviewInvitationDeliveryErrorCode, retryable: boolean) {
    super(SAFE_REVIEW_INVITATION_DELIVERY_ERROR_MESSAGES[code]);
    this.name = "ReviewInvitationEmailDeliveryError";
    this.code = code;
    this.retryable = retryable;
  }
}

type ReviewInvitationIntent = Readonly<{
  id: string;
  recipient: string;
  locale: "es" | "en";
  status: EmailNotificationStatus;
  created: boolean;
}>;

type CurrentReservationState = Readonly<{
  id: string;
  status: ReservationStatus;
  confirmedAt: Date | null;
  cancelledAt: Date | null;
  guestName: string;
  guestEmail: string;
  preferredLocale: string;
  review: Readonly<{ id: string }> | null;
  property: Readonly<{
    nameEs: string;
    nameEn: string;
  }>;
}>;

type ExistingInvitationEligibility =
  | Readonly<{ eligible: true }>
  | Readonly<{
      eligible: false;
      reason:
        | "RESERVATION_NOT_FOUND"
        | "RESERVATION_STATUS_NOT_ELIGIBLE"
        | "RESERVATION_NOT_CONFIRMED"
        | "NOT_YET_ELIGIBLE"
        | "CANCELLED_AT_MISSING"
        | "CANCELLED_BEFORE_CHECKOUT"
        | "REVIEW_ALREADY_EXISTS";
      cancelActiveInvitation: boolean;
    }>;

const claimedReviewInvitationSelect = {
  id: true,
  reservationId: true,
  reviewInvitationId: true,
  type: true,
  recipient: true,
  locale: true,
  deduplicationKey: true,
  attemptCount: true,
  reviewInvitation: {
    select: {
      id: true,
      reservationId: true,
      status: true,
      accessTokenHash: true,
      accessTokenEncrypted: true,
      checkoutAtSnapshot: true,
      eligibleAt: true,
      expiresAt: true,
      consumedAt: true,
      createdAt: true,
      updatedAt: true,
    },
  },
  reservation: {
    select: {
      id: true,
      status: true,
      confirmedAt: true,
      cancelledAt: true,
      guestName: true,
      guestEmail: true,
      preferredLocale: true,
      review: {
        select: {
          id: true,
        },
      },
      property: {
        select: {
          nameEs: true,
          nameEn: true,
        },
      },
    },
  },
} satisfies Prisma.EmailNotificationSelect;

type ClaimedReviewInvitationNotification = Prisma.EmailNotificationGetPayload<{
  select: typeof claimedReviewInvitationSelect;
}>;

type EnsureInvitationAndIntentResult = Readonly<{
  outcome:
    | "created"
    | "existing"
    | "skipped"
    | "notification-intent-conflict";
  invitationId: string | null;
  notificationId: string | null;
  notificationIntentCreated: boolean;
  skipReason: string | null;
}>;

type EnsureInvitationAndIntentOptions = Readonly<{
  now?: Date;
  prismaClient?: ReviewInvitationSchedulingPrismaClient;
  ensureReviewInvitation?: (
    tx: Prisma.TransactionClient,
    reservationId: string,
    options: Readonly<{ now: Date }>,
  ) => Promise<EnsureReviewInvitationResult>;
}>;

function normalizeRecipient(value: string): string {
  const parsed = recipientSchema.safeParse(value);

  if (!parsed.success) {
    throw new TypeError("Invalid review-invitation notification recipient.");
  }

  return parsed.data;
}

function normalizeLocale(value: string): "es" | "en" {
  return value === "en" ? "en" : "es";
}

function isAbsolutelyRejectedStatus(status: ReservationStatus): boolean {
  return (
    status === ReservationStatus.PENDING_PAYMENT ||
    status === ReservationStatus.EXPIRED ||
    status === ReservationStatus.BLOCKED
  );
}

function evaluateExistingInvitationEligibility(
  reservation: CurrentReservationState | null,
  invitation: Pick<
    ReviewInvitationLifecycleRecord,
    "checkoutAtSnapshot" | "eligibleAt"
  >,
  now: Date,
): ExistingInvitationEligibility {
  if (!reservation) {
    return {
      eligible: false,
      reason: "RESERVATION_NOT_FOUND",
      cancelActiveInvitation: true,
    };
  }

  if (isAbsolutelyRejectedStatus(reservation.status)) {
    return {
      eligible: false,
      reason: "RESERVATION_STATUS_NOT_ELIGIBLE",
      cancelActiveInvitation: true,
    };
  }

  if (!reservation.confirmedAt) {
    return {
      eligible: false,
      reason: "RESERVATION_NOT_CONFIRMED",
      cancelActiveInvitation: true,
    };
  }

  if (reservation.status === ReservationStatus.CANCELLED) {
    if (!reservation.cancelledAt) {
      return {
        eligible: false,
        reason: "CANCELLED_AT_MISSING",
        cancelActiveInvitation: true,
      };
    }

    if (
      reservation.cancelledAt.getTime() <
      invitation.checkoutAtSnapshot.getTime()
    ) {
      return {
        eligible: false,
        reason: "CANCELLED_BEFORE_CHECKOUT",
        cancelActiveInvitation: true,
      };
    }
  }

  if (
    reservation.status !== ReservationStatus.CANCELLED &&
    reservation.cancelledAt &&
    reservation.cancelledAt.getTime() < invitation.checkoutAtSnapshot.getTime()
  ) {
    return {
      eligible: false,
      reason: "CANCELLED_BEFORE_CHECKOUT",
      cancelActiveInvitation: true,
    };
  }

  if (reservation.review) {
    return {
      eligible: false,
      reason: "REVIEW_ALREADY_EXISTS",
      cancelActiveInvitation: true,
    };
  }

  if (now.getTime() < invitation.eligibleAt.getTime()) {
    return {
      eligible: false,
      reason: "NOT_YET_ELIGIBLE",
      cancelActiveInvitation: false,
    };
  }

  return { eligible: true };
}

function buildReviewInvitationNotificationKey(
  reviewInvitationId: string,
  recipient: string,
): string {
  const normalizedRecipient = normalizeRecipient(recipient);
  const normalizedInvitationId = reviewInvitationId.trim();

  if (!normalizedInvitationId) {
    throw new TypeError("Missing review invitation relation.");
  }

  return `review-invitation/${normalizedInvitationId}/${normalizedRecipient}`;
}

export function buildReviewInvitationReviewPath(rawToken: string): string {
  return `/resenas/${encodeURIComponent(rawToken)}`;
}

function buildReviewInvitationReviewUrl(
  rawToken: string,
  publicBaseUrl: string,
): string {
  return new URL(
    buildReviewInvitationReviewPath(rawToken),
    publicBaseUrl,
  ).toString();
}

export function isReviewInvitationNotificationType(
  value: EmailNotificationType,
): boolean {
  return value === EmailNotificationType.REVIEW_INVITATION;
}

export async function ensureReviewInvitationNotificationIntent(
  transaction: Prisma.TransactionClient,
  input: Readonly<{
    reservationId: string;
    reviewInvitationId: string;
    recipient: string;
    locale: "es" | "en";
    scheduledFor: Date;
    nextAttemptAt: Date;
  }>,
): Promise<ReviewInvitationIntent> {
  const recipient = normalizeRecipient(input.recipient);
  const deduplicationKey = buildReviewInvitationNotificationKey(
    input.reviewInvitationId,
    recipient,
  );
  const data = {
    reservationId: input.reservationId,
    reviewInvitationId: input.reviewInvitationId,
    type: EmailNotificationType.REVIEW_INVITATION,
    recipient,
    locale: input.locale,
    deduplicationKey,
    origin: EmailNotificationOrigin.AUTOMATIC,
    status: EmailNotificationStatus.PENDING,
    scheduledFor: input.scheduledFor,
    nextAttemptAt: input.nextAttemptAt,
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
      type: true,
      recipient: true,
      locale: true,
      status: true,
    },
  });

  if (!notification) {
    throw new TypeError(
      "Review invitation notification intent was not persisted.",
    );
  }

  if (
    notification.reservationId !== input.reservationId ||
    notification.reviewInvitationId !== input.reviewInvitationId ||
    notification.type !== EmailNotificationType.REVIEW_INVITATION ||
    notification.recipient !== recipient ||
    notification.locale !== input.locale
  ) {
    throw new TypeError("Review invitation notification deduplication conflict.");
  }

  return {
    id: notification.id,
    recipient: notification.recipient,
    locale: normalizeLocale(notification.locale),
    status: notification.status,
    created: creation.count === 1,
  };
}

async function readCurrentReservationState(
  transaction: ReviewInvitationPrismaClient,
  reservationId: string,
): Promise<CurrentReservationState | null> {
  return transaction.reservation.findUnique({
    where: { id: reservationId },
    select: {
      id: true,
      status: true,
      confirmedAt: true,
      cancelledAt: true,
      guestName: true,
      guestEmail: true,
      preferredLocale: true,
      review: {
        select: { id: true },
      },
      property: {
        select: {
          nameEs: true,
          nameEn: true,
        },
      },
    },
  });
}

async function expireActiveInvitation(
  transaction: Prisma.TransactionClient,
  invitation: ReviewInvitationLifecycleRecord,
  now: Date,
): Promise<void> {
  if (
    getReviewInvitationEffectiveStatus(invitation, now) ===
    ReviewInvitationStatus.EXPIRED
  ) {
    await expireReviewInvitationIfOverdueInTransaction(
      transaction,
      invitation.id,
      now,
    );
  }
}

function isSerializationConflict(error: unknown): boolean {
  return (
    error instanceof Prisma.PrismaClientKnownRequestError &&
    error.code === "P2034"
  );
}

async function ensureReviewInvitationAndNotificationIntentOnce(
  transaction: Prisma.TransactionClient,
  reservationId: string,
  options: Required<Pick<EnsureInvitationAndIntentOptions, "now">> &
    Pick<EnsureInvitationAndIntentOptions, "ensureReviewInvitation">,
): Promise<EnsureInvitationAndIntentResult> {
  const ensureInvitation =
    options.ensureReviewInvitation ?? ensureReviewInvitationInTransaction;
  const result = await ensureInvitation(transaction, reservationId, {
    now: options.now,
  });

  if (
    result.outcome !== "created" &&
    result.outcome !== "existing"
  ) {
    return {
      outcome: "skipped",
      invitationId: null,
      notificationId: null,
      notificationIntentCreated: false,
      skipReason: result.outcome,
    };
  }

  const invitation = result.invitation;
  const effectiveStatus =
    result.outcome === "existing"
      ? result.effectiveStatus
      : getReviewInvitationEffectiveStatus(invitation, options.now);

  if (effectiveStatus === ReviewInvitationStatus.EXPIRED) {
    await expireActiveInvitation(transaction, invitation, options.now);

    return {
      outcome: "skipped",
      invitationId: invitation.id,
      notificationId: null,
      notificationIntentCreated: false,
      skipReason: "expired",
    };
  }

  if (effectiveStatus !== ReviewInvitationStatus.ACTIVE) {
    return {
      outcome: "skipped",
      invitationId: invitation.id,
      notificationId: null,
      notificationIntentCreated: false,
      skipReason: effectiveStatus.toLowerCase(),
    };
  }

  const reservation = await readCurrentReservationState(
    transaction,
    invitation.reservationId,
  );
  const eligibility = evaluateExistingInvitationEligibility(
    reservation,
    invitation,
    options.now,
  );

  if (!eligibility.eligible) {
    if (eligibility.cancelActiveInvitation) {
      await cancelReviewInvitationInTransaction(
        transaction,
        invitation.id,
        options.now,
      );
    }

    return {
      outcome: "skipped",
      invitationId: invitation.id,
      notificationId: null,
      notificationIntentCreated: false,
      skipReason: eligibility.reason,
    };
  }

  if (!reservation) {
    return {
      outcome: "skipped",
      invitationId: invitation.id,
      notificationId: null,
      notificationIntentCreated: false,
      skipReason: "RESERVATION_NOT_FOUND",
    };
  }

  const intent = await ensureReviewInvitationNotificationIntent(transaction, {
    reservationId: reservation.id,
    reviewInvitationId: invitation.id,
    recipient: reservation.guestEmail,
    locale: normalizeLocale(reservation.preferredLocale),
    scheduledFor: invitation.createdAt,
    nextAttemptAt: options.now,
  });

  return {
    outcome: result.outcome,
    invitationId: invitation.id,
    notificationId: intent.id,
    notificationIntentCreated: intent.created,
    skipReason: null,
  };
}

export async function ensureReviewInvitationAndNotificationIntentForReservation(
  reservationId: string,
  options: EnsureInvitationAndIntentOptions = {},
): Promise<EnsureInvitationAndIntentResult> {
  const now = options.now ?? new Date();
  const prismaClient = options.prismaClient ?? prisma;
  let lastConflict: unknown = null;

  for (
    let attempt = 0;
    attempt < REVIEW_INVITATION_SERIALIZATION_RETRY_LIMIT;
    attempt += 1
  ) {
    try {
      return await prismaClient.$transaction(
        (transaction) =>
          ensureReviewInvitationAndNotificationIntentOnce(
            transaction,
            reservationId,
            {
              now,
              ensureReviewInvitation: options.ensureReviewInvitation,
            },
          ),
        {
          isolationLevel: Prisma.TransactionIsolationLevel.Serializable,
        },
      );
    } catch (error) {
      if (!isSerializationConflict(error)) {
        throw error;
      }

      lastConflict = error;
    }
  }

  throw lastConflict ?? new Error("Review invitation scheduling conflict.");
}

function getGuatemalaDateOnly(value: Date): Date {
  const parts = new Intl.DateTimeFormat("en-CA", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    timeZone: "America/Guatemala",
  }).formatToParts(value);
  const values = Object.fromEntries(
    parts
      .filter((part) => part.type !== "literal")
      .map((part) => [part.type, part.value]),
  );

  return new Date(`${values.year}-${values.month}-${values.day}T00:00:00.000Z`);
}

async function findReviewInvitationSchedulerCandidateIds(
  prismaClient: ReviewInvitationSchedulingPrismaClient,
  now: Date,
): Promise<readonly string[]> {
  const currentGuatemalaDate = getGuatemalaDateOnly(now);
  const lowerBound = new Date(
    currentGuatemalaDate.getTime() -
      REVIEW_INVITATION_SCHEDULING_CATCH_UP_DAYS * 86_400_000,
  );
  const newInvitationCandidates = await prismaClient.reservation.findMany({
    where: {
      confirmedAt: { not: null },
      review: null,
      reviewInvitation: null,
      status: {
        in: [
          ReservationStatus.CONFIRMED,
          ReservationStatus.REFUNDED,
          ReservationStatus.PARTIALLY_REFUNDED,
          ReservationStatus.CANCELLED,
        ],
      },
      checkOutDate: {
        gte: lowerBound,
        lte: currentGuatemalaDate,
      },
    },
    orderBy: [{ checkOutDate: "asc" }, { id: "asc" }],
    take: REVIEW_INVITATION_SCHEDULING_MAX_CANDIDATES,
    select: { id: true },
  });
  const missingIntentRepairCandidates =
    await prismaClient.reviewInvitation.findMany({
      where: {
        status: ReviewInvitationStatus.ACTIVE,
        expiresAt: { gt: now },
        emailNotifications: {
          none: { type: EmailNotificationType.REVIEW_INVITATION },
        },
      },
      orderBy: [{ expiresAt: "asc" }, { id: "asc" }],
      take: REVIEW_INVITATION_SCHEDULING_MAX_CANDIDATES,
      select: { reservationId: true },
    });
  const currentRecipientRepairCandidates =
    await prismaClient.reviewInvitation.findMany({
      where: {
        status: ReviewInvitationStatus.ACTIVE,
        expiresAt: { gt: now },
        emailNotifications: {
          some: { type: EmailNotificationType.REVIEW_INVITATION },
        },
      },
      orderBy: [{ expiresAt: "asc" }, { id: "asc" }],
      take: REVIEW_INVITATION_SCHEDULING_MAX_CANDIDATES,
      select: {
        reservationId: true,
        reservation: {
          select: { guestEmail: true },
        },
        emailNotifications: {
          where: { type: EmailNotificationType.REVIEW_INVITATION },
          select: { recipient: true },
        },
      },
    });
  const candidateIds: string[] = [];
  const seenCandidateIds = new Set<string>();
  const addCandidateId = (reservationId: string): void => {
    if (
      seenCandidateIds.has(reservationId) ||
      candidateIds.length >= REVIEW_INVITATION_SCHEDULING_MAX_CANDIDATES
    ) {
      return;
    }

    seenCandidateIds.add(reservationId);
    candidateIds.push(reservationId);
  };

  for (const candidate of newInvitationCandidates) {
    addCandidateId(candidate.id);
  }

  for (const candidate of missingIntentRepairCandidates) {
    addCandidateId(candidate.reservationId);
  }

  for (const candidate of currentRecipientRepairCandidates) {
    if (needsCurrentRecipientIntentRepair(candidate)) {
      addCandidateId(candidate.reservationId);
    }
  }

  return candidateIds;
}

function needsCurrentRecipientIntentRepair(
  candidate: Readonly<{
    reservation: Readonly<{ guestEmail: string }>;
    emailNotifications: readonly Readonly<{ recipient: string }>[];
  }>,
): boolean {
  let currentRecipient: string;

  try {
    currentRecipient = normalizeRecipient(candidate.reservation.guestEmail);
  } catch {
    return false;
  }

  return !candidate.emailNotifications.some((notification) => {
    try {
      return normalizeRecipient(notification.recipient) === currentRecipient;
    } catch {
      return false;
    }
  });
}

export async function scheduleReviewInvitations(
  options: Readonly<{
    now?: Date;
    prismaClient?: ReviewInvitationSchedulingPrismaClient;
  }> = {},
): Promise<ReviewInvitationSchedulingSummary> {
  const now = options.now ?? new Date();
  const prismaClient = options.prismaClient ?? prisma;
  const candidateIds = await findReviewInvitationSchedulerCandidateIds(
    prismaClient,
    now,
  );

  let created = 0;
  let existing = 0;
  let skipped = 0;
  let failed = 0;
  let notificationIntentsCreated = 0;
  let notificationIntentsExisting = 0;

  for (const reservationId of candidateIds) {
    try {
      const result = await ensureReviewInvitationAndNotificationIntentForReservation(
        reservationId,
        { now, prismaClient },
      );

      if (result.outcome === "created") {
        created += 1;
      } else if (result.outcome === "existing") {
        existing += 1;
      } else {
        skipped += 1;
      }

      if (result.notificationId) {
        if (result.notificationIntentCreated) {
          notificationIntentsCreated += 1;
        } else {
          notificationIntentsExisting += 1;
        }
      }
    } catch {
      failed += 1;
    }
  }

  return {
    processedAt: now.toISOString(),
    catchUpWindowDays: 7,
    candidates: candidateIds.length,
    created,
    existing,
    skipped,
    failed,
    notificationIntentsCreated,
    notificationIntentsExisting,
  };
}

async function readClaimedReviewInvitationNotification(
  claim: EmailNotificationClaim,
): Promise<ClaimedReviewInvitationNotification | null> {
  return prisma.emailNotification.findFirst({
    where: {
      id: claim.notificationId,
      type: EmailNotificationType.REVIEW_INVITATION,
      status: EmailNotificationStatus.PROCESSING,
      processingStartedAt: claim.processingStartedAt,
    },
    select: claimedReviewInvitationSelect,
  });
}

async function convergeDeliveryTerminalState(
  notification: ClaimedReviewInvitationNotification,
  now: Date,
  errorCode: ReviewInvitationDeliveryErrorCode,
): Promise<void> {
  if (!isCoherentReviewInvitationNotification(notification)) {
    return;
  }

  const invitationId = notification.reviewInvitation.id;

  if (errorCode === "EMAIL_REVIEW_INVITATION_EXPIRED") {
    await prisma.$transaction((transaction) =>
      expireReviewInvitationIfOverdueInTransaction(
        transaction,
        invitationId,
        now,
      ),
    );
    return;
  }

  if (errorCode === "EMAIL_REVIEW_INVITATION_SUPERSEDED") {
    await prisma.$transaction((transaction) =>
      cancelReviewInvitationInTransaction(transaction, invitationId, now),
    );
  }
}

function isCoherentReviewInvitationNotification(
  notification: ClaimedReviewInvitationNotification,
): notification is ClaimedReviewInvitationNotification & {
  reviewInvitation: ReviewInvitationLifecycleRecord;
} {
  return (
    notification.type === EmailNotificationType.REVIEW_INVITATION &&
    !!notification.reviewInvitation &&
    !!notification.reviewInvitationId &&
    notification.reviewInvitationId === notification.reviewInvitation.id &&
    notification.reviewInvitation.reservationId === notification.reservationId &&
    notification.reservation.id === notification.reservationId
  );
}

function assertClaimedNotificationShape(
  notification: ClaimedReviewInvitationNotification,
): asserts notification is ClaimedReviewInvitationNotification & {
  reviewInvitation: ReviewInvitationLifecycleRecord;
} {
  if (!isCoherentReviewInvitationNotification(notification)) {
    throw new ReviewInvitationEmailDeliveryError(
      "EMAIL_REVIEW_INVITATION_RELATION_MISMATCH",
      false,
    );
  }
}

function decryptAndValidateRawToken(
  invitation: ReviewInvitationLifecycleRecord,
): string {
  if (!invitation.accessTokenEncrypted) {
    throw new ReviewInvitationEmailDeliveryError(
      "EMAIL_REVIEW_INVITATION_TOKEN_UNAVAILABLE",
      false,
    );
  }

  try {
    const rawToken = decryptReviewInvitationAccessToken(
      invitation.reservationId,
      invitation.accessTokenEncrypted,
    );

    if (hashReviewInvitationAccessToken(rawToken) !== invitation.accessTokenHash) {
      throw new Error("Review invitation token hash mismatch.");
    }

    return rawToken;
  } catch {
    throw new ReviewInvitationEmailDeliveryError(
      "EMAIL_REVIEW_INVITATION_TOKEN_UNAVAILABLE",
      false,
    );
  }
}

function assertDeliveryEligibility(
  notification: ClaimedReviewInvitationNotification & {
    reviewInvitation: ReviewInvitationLifecycleRecord;
  },
  now: Date,
): void {
  const invitation = notification.reviewInvitation;

  if (
    getReviewInvitationEffectiveStatus(invitation, now) ===
    ReviewInvitationStatus.EXPIRED
  ) {
    throw new ReviewInvitationEmailDeliveryError(
      "EMAIL_REVIEW_INVITATION_EXPIRED",
      false,
    );
  }

  if (invitation.status !== ReviewInvitationStatus.ACTIVE) {
    throw new ReviewInvitationEmailDeliveryError(
      "EMAIL_REVIEW_INVITATION_SUPERSEDED",
      false,
    );
  }

  const eligibility = evaluateExistingInvitationEligibility(
    notification.reservation,
    invitation,
    now,
  );

  if (!eligibility.eligible) {
    throw new ReviewInvitationEmailDeliveryError(
      "EMAIL_REVIEW_INVITATION_SUPERSEDED",
      false,
    );
  }

  const currentRecipient = normalizeRecipient(notification.reservation.guestEmail);

  if (currentRecipient !== normalizeRecipient(notification.recipient)) {
    throw new ReviewInvitationEmailDeliveryError(
      "EMAIL_REVIEW_INVITATION_RECIPIENT_CHANGED",
      false,
    );
  }
}

function buildReviewInvitationTemplateInput(
  notification: ClaimedReviewInvitationNotification & {
    reviewInvitation: ReviewInvitationLifecycleRecord;
  },
  rawToken: string,
  publicBaseUrl: string,
  brandLogoUrl: string,
): ReviewInvitationEmailTemplateInput {
  const locale = normalizeLocale(notification.locale);

  return {
    locale,
    publicBaseUrl,
    brandLogoUrl,
    guestName: notification.reservation.guestName,
    propertyNameEs: notification.reservation.property.nameEs,
    propertyNameEn: notification.reservation.property.nameEn,
    checkoutAt: notification.reviewInvitation.checkoutAtSnapshot.toISOString(),
    expiresAt: notification.reviewInvitation.expiresAt.toISOString(),
    reviewUrl: buildReviewInvitationReviewUrl(rawToken, publicBaseUrl),
  };
}

function normalizeDeliveryError(
  error: unknown,
): ReviewInvitationEmailDeliveryError {
  if (error instanceof ReviewInvitationEmailDeliveryError) {
    return error;
  }

  if (error instanceof EmailProviderError) {
    return new ReviewInvitationEmailDeliveryError(error.code, error.retryable);
  }

  if (error instanceof EmailTemplateDataError) {
    return new ReviewInvitationEmailDeliveryError(
      "EMAIL_TEMPLATE_INVALID_DATA",
      false,
    );
  }

  return new ReviewInvitationEmailDeliveryError(
    "EMAIL_NOTIFICATION_UNEXPECTED_ERROR",
    true,
  );
}

async function markReviewInvitationNotificationSkipped(
  claim: EmailNotificationClaim,
  error: ReviewInvitationEmailDeliveryError,
): Promise<void> {
  await prisma.emailNotification.updateMany({
    where: {
      id: claim.notificationId,
      status: EmailNotificationStatus.PROCESSING,
      processingStartedAt: claim.processingStartedAt,
    },
    data: {
      status: EmailNotificationStatus.SKIPPED,
      processingStartedAt: null,
      nextAttemptAt: null,
      errorCode: error.code,
      errorMessage: error.message,
    },
  });
}

async function markReviewInvitationNotificationSent(
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
    throw new ReviewInvitationEmailDeliveryError(
      "EMAIL_NOTIFICATION_UNEXPECTED_ERROR",
      true,
    );
  }
}

async function markReviewInvitationNotificationFailed(
  claim: EmailNotificationClaim,
  attemptCount: number,
  error: ReviewInvitationEmailDeliveryError,
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

export async function deliverClaimedReviewInvitationEmailNotification(
  input: Readonly<{
    claim: EmailNotificationClaim;
    provider: EmailProvider;
    publicBaseUrl: string;
    brandLogoUrl: string;
    now: () => Date;
  }>,
): Promise<ClaimedEmailNotificationDeliveryOutcome> {
  const notification = await readClaimedReviewInvitationNotification(input.claim);

  if (!notification) {
    return { outcome: "skipped", retryScheduled: false };
  }

  try {
    const checkedAt = input.now();

    assertClaimedNotificationShape(notification);
    assertDeliveryEligibility(notification, checkedAt);

    const rawToken = decryptAndValidateRawToken(notification.reviewInvitation);
    const locale = normalizeLocale(notification.locale);
    const content = await buildReviewInvitationEmail(
      buildReviewInvitationTemplateInput(
        notification,
        rawToken,
        input.publicBaseUrl,
        input.brandLogoUrl,
      ),
    );
    const sent = await input.provider.send({
      intendedRecipient: notification.recipient,
      audience: "guest",
      locale,
      subject: content.subject,
      html: content.html,
      text: content.text,
      idempotencyKey: notification.deduplicationKey,
    });

    await markReviewInvitationNotificationSent(
      input.claim,
      sent.providerMessageId,
      input.now(),
    );

    return { outcome: "sent", retryScheduled: false };
  } catch (error) {
    const normalized = normalizeDeliveryError(error);

    if (terminalSkipCodes.has(normalized.code)) {
      await convergeDeliveryTerminalState(
        notification,
        input.now(),
        normalized.code,
      );
      await markReviewInvitationNotificationSkipped(input.claim, normalized);
      return { outcome: "skipped", retryScheduled: false };
    }

    const nextAttemptAt = await markReviewInvitationNotificationFailed(
      input.claim,
      notification.attemptCount,
      normalized,
      input.now(),
    );

    return {
      outcome: "failed",
      retryScheduled: nextAttemptAt !== null,
    };
  }
}
