import {
  Prisma,
  ReviewInvitationStatus,
  ReviewModerationStatus,
  type PrismaClient,
} from "@prisma/client";
import { z } from "zod";

import { prisma } from "@/lib/db/prisma";
import {
  createAdminReviewSubmittedNotificationIntents,
} from "@/lib/email/review-submitted-notifications";
import {
  evaluatePersistedReviewInvitationBusinessEligibility,
} from "./review-invitation-eligibility";
import {
  hashReviewInvitationAccessToken,
  isReviewInvitationAccessToken,
} from "./review-invitation-token";
import {
  cancelReviewInvitationInTransaction,
  expireReviewInvitationIfOverdueInTransaction,
  getReviewInvitationEffectiveStatus,
} from "./review-invitations";
import type {
  ReviewSubmissionErrorCode,
  ReviewSubmissionLocale,
  ReviewSubmissionResult,
  ReviewSubmissionSummary,
} from "@/types/review-submission";

const REVIEW_SUBMISSION_TRANSACTION_MAX_ATTEMPTS = 3;
const REVIEW_COMMENT_MAX_CODE_POINTS = 2_000;

const reviewSubmissionInputSchema = z
  .object({
    rating: z.number().int().min(1).max(5),
    comment: z.string(),
    locale: z.enum(["es", "en"]),
  })
  .strict();

const reviewSubmissionInvitationSelect = {
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
  reservation: {
    select: {
      id: true,
      propertyId: true,
      status: true,
      confirmedAt: true,
      cancelledAt: true,
      guestName: true,
      preferredLocale: true,
      property: {
        select: {
          nameEs: true,
          nameEn: true,
        },
      },
      review: {
        select: {
          id: true,
        },
      },
    },
  },
} satisfies Prisma.ReviewInvitationSelect;

type ReviewSubmissionInvitationRecord =
  Prisma.ReviewInvitationGetPayload<{
    select: typeof reviewSubmissionInvitationSelect;
  }>;

type ReviewSubmissionPrismaClient = Pick<
  PrismaClient,
  "$transaction" | "reviewInvitation"
>;

export type ReviewSubmissionInput = Readonly<{
  rating: number;
  comment: string;
  locale: ReviewSubmissionLocale;
}>;

export type ReviewSubmissionOptions = Readonly<{
  now?: Date;
  prismaClient?: ReviewSubmissionPrismaClient;
  source?: NodeJS.ProcessEnv;
}>;

type ReviewSubmissionTransactionResult =
  | ReviewSubmissionResult
  | Readonly<{ errorCode: ReviewSubmissionErrorCode }>;

class ReviewSubmissionRaceError extends Error {
  constructor() {
    super("Review submission race.");
    this.name = "ReviewSubmissionRaceError";
  }
}

export class ReviewSubmissionError extends Error {
  constructor(public readonly code: ReviewSubmissionErrorCode) {
    super(code);
    this.name = "ReviewSubmissionError";
  }
}

function normalizeLocale(value: string): ReviewSubmissionLocale {
  return value === "en" ? "en" : "es";
}

function normalizeToken(rawToken: string): Readonly<{
  rawToken: string;
  tokenHash: string;
}> {
  const normalizedToken = rawToken.trim();

  if (!isReviewInvitationAccessToken(normalizedToken)) {
    throw new ReviewSubmissionError("INVALID_REVIEW_INVITATION");
  }

  return {
    rawToken: normalizedToken,
    tokenHash: hashReviewInvitationAccessToken(normalizedToken),
  };
}

function unicodeLength(value: string): number {
  return Array.from(value).length;
}

export function normalizeReviewSubmissionComment(value: string): string {
  const normalizedComment = value.replace(/\r\n/g, "\n").trim();

  if (
    unicodeLength(normalizedComment) < 1 ||
    unicodeLength(normalizedComment) > REVIEW_COMMENT_MAX_CODE_POINTS
  ) {
    throw new ReviewSubmissionError("INVALID_REVIEW_SUBMISSION");
  }

  return normalizedComment;
}

export function parseReviewSubmissionInput(
  value: unknown,
): ReviewSubmissionInput {
  const parsed = reviewSubmissionInputSchema.safeParse(value);

  if (!parsed.success) {
    throw new ReviewSubmissionError("INVALID_REVIEW_SUBMISSION");
  }

  return {
    rating: parsed.data.rating,
    comment: normalizeReviewSubmissionComment(parsed.data.comment),
    locale: parsed.data.locale,
  };
}

function hasUnicodeLetter(value: string): boolean {
  return /\p{L}/u.test(value);
}

function firstUnicodeLetter(value: string): string | null {
  for (const character of Array.from(value)) {
    if (/\p{L}/u.test(character)) {
      return character;
    }
  }

  return null;
}

export function deriveReviewGuestDisplayNameSnapshot(
  guestName: string,
): string | null {
  const normalizedName = guestName
    .normalize("NFC")
    .trim()
    .replace(/\s+/gu, " ");
  const tokens = normalizedName
    .split(/\s/gu)
    .map((token) => token.trim())
    .filter((token) => token.length > 0 && hasUnicodeLetter(token));

  if (tokens.length === 0) {
    return null;
  }

  if (tokens.length === 1) {
    return tokens[0];
  }

  const lastInitial = firstUnicodeLetter(tokens[tokens.length - 1]);

  if (!lastInitial) {
    return null;
  }

  return `${tokens[0]} ${lastInitial}.`;
}

function propertyNameForLocale(
  invitation: ReviewSubmissionInvitationRecord,
  locale: ReviewSubmissionLocale,
): string {
  return locale === "en"
    ? invitation.reservation.property.nameEn
    : invitation.reservation.property.nameEs;
}

function summaryFromInvitation(
  invitation: ReviewSubmissionInvitationRecord,
  state: ReviewSubmissionSummary["state"],
): ReviewSubmissionSummary {
  const locale = normalizeLocale(invitation.reservation.preferredLocale);

  return {
    state,
    locale,
    propertyName: propertyNameForLocale(invitation, locale),
    expiresAt: state === "ACTIVE" ? invitation.expiresAt.toISOString() : null,
  };
}

function isSerializationConflict(error: unknown): boolean {
  return (
    error instanceof Prisma.PrismaClientKnownRequestError &&
    error.code === "P2034"
  );
}

function isUniqueConstraintFailure(error: unknown): boolean {
  return (
    error instanceof Prisma.PrismaClientKnownRequestError &&
    error.code === "P2002"
  );
}

async function runReviewSubmissionTransactionWithRetry<T>(
  prismaClient: ReviewSubmissionPrismaClient,
  operation: (transaction: Prisma.TransactionClient) => Promise<T>,
): Promise<T> {
  let lastConflict: unknown = null;

  for (
    let attempt = 0;
    attempt < REVIEW_SUBMISSION_TRANSACTION_MAX_ATTEMPTS;
    attempt += 1
  ) {
    try {
      return await prismaClient.$transaction(operation, {
        isolationLevel: Prisma.TransactionIsolationLevel.Serializable,
      });
    } catch (error) {
      if (!isSerializationConflict(error)) {
        throw error;
      }

      lastConflict = error;
    }
  }

  throw lastConflict ?? new ReviewSubmissionError(
    "REVIEW_SUBMISSION_UNEXPECTED_ERROR",
  );
}

async function readInvitationByTokenHash(
  transaction: Prisma.TransactionClient,
  tokenHash: string,
): Promise<ReviewSubmissionInvitationRecord | null> {
  return transaction.reviewInvitation.findUnique({
    where: { accessTokenHash: tokenHash },
    select: reviewSubmissionInvitationSelect,
  });
}

function persistedEligibilityInput(invitation: ReviewSubmissionInvitationRecord) {
  return {
    reservation: {
      status: invitation.reservation.status,
      confirmedAt: invitation.reservation.confirmedAt,
      cancelledAt: invitation.reservation.cancelledAt,
      hasReview: invitation.reservation.review !== null,
    },
    invitation,
  };
}

async function cancelActiveInvitationForExistingReview(
  transaction: Prisma.TransactionClient,
  invitation: ReviewSubmissionInvitationRecord,
  now: Date,
): Promise<void> {
  if (invitation.status !== ReviewInvitationStatus.ACTIVE) {
    return;
  }

  await cancelReviewInvitationInTransaction(transaction, invitation.id, now);
}

async function resolveSummaryInTransaction(
  transaction: Prisma.TransactionClient,
  tokenHash: string,
  now: Date,
): Promise<ReviewSubmissionSummary> {
  const invitation = await readInvitationByTokenHash(transaction, tokenHash);

  if (!invitation) {
    throw new ReviewSubmissionError("INVALID_REVIEW_INVITATION");
  }

  if (invitation.reservation.review) {
    await cancelActiveInvitationForExistingReview(transaction, invitation, now);
    return summaryFromInvitation(invitation, "ALREADY_SUBMITTED");
  }

  if (invitation.status === ReviewInvitationStatus.CONSUMED) {
    return summaryFromInvitation(invitation, "UNAVAILABLE");
  }

  if (invitation.status === ReviewInvitationStatus.EXPIRED) {
    return summaryFromInvitation(invitation, "EXPIRED");
  }

  if (invitation.status === ReviewInvitationStatus.CANCELLED) {
    return summaryFromInvitation(invitation, "UNAVAILABLE");
  }

  if (
    getReviewInvitationEffectiveStatus(invitation, now) ===
    ReviewInvitationStatus.EXPIRED
  ) {
    await expireReviewInvitationIfOverdueInTransaction(
      transaction,
      invitation.id,
      now,
    );
    return summaryFromInvitation(invitation, "EXPIRED");
  }

  const eligibility = evaluatePersistedReviewInvitationBusinessEligibility(
    persistedEligibilityInput(invitation),
    now,
  );

  if (!eligibility.eligible) {
    if (eligibility.cancelActiveInvitation) {
      await cancelReviewInvitationInTransaction(transaction, invitation.id, now);
    }

    return summaryFromInvitation(invitation, "UNAVAILABLE");
  }

  return summaryFromInvitation(invitation, "ACTIVE");
}

export async function getReviewSubmissionSummary(
  rawToken: string,
  options: ReviewSubmissionOptions = {},
): Promise<ReviewSubmissionSummary> {
  const { tokenHash } = normalizeToken(rawToken);
  const now = options.now ?? new Date();
  const prismaClient = options.prismaClient ?? prisma;

  return runReviewSubmissionTransactionWithRetry(
    prismaClient,
    (transaction) => resolveSummaryInTransaction(transaction, tokenHash, now),
  );
}

async function submitReviewOnce(
  transaction: Prisma.TransactionClient,
  tokenHash: string,
  input: ReviewSubmissionInput,
  now: Date,
  source: NodeJS.ProcessEnv,
): Promise<ReviewSubmissionTransactionResult> {
  const invitation = await readInvitationByTokenHash(transaction, tokenHash);

  if (!invitation) {
    throw new ReviewSubmissionError("INVALID_REVIEW_INVITATION");
  }

  if (invitation.reservation.review) {
    await cancelActiveInvitationForExistingReview(transaction, invitation, now);
    return { outcome: "already-submitted" };
  }

  if (invitation.status === ReviewInvitationStatus.CONSUMED) {
    return { errorCode: "REVIEW_INVITATION_UNAVAILABLE" };
  }

  if (invitation.status === ReviewInvitationStatus.EXPIRED) {
    return { errorCode: "REVIEW_INVITATION_EXPIRED" };
  }

  if (invitation.status === ReviewInvitationStatus.CANCELLED) {
    return { errorCode: "REVIEW_INVITATION_UNAVAILABLE" };
  }

  if (
    getReviewInvitationEffectiveStatus(invitation, now) ===
    ReviewInvitationStatus.EXPIRED
  ) {
    await expireReviewInvitationIfOverdueInTransaction(
      transaction,
      invitation.id,
      now,
    );
    return { errorCode: "REVIEW_INVITATION_EXPIRED" };
  }

  const eligibility = evaluatePersistedReviewInvitationBusinessEligibility(
    persistedEligibilityInput(invitation),
    now,
  );

  if (!eligibility.eligible) {
    if (eligibility.cancelActiveInvitation) {
      await cancelReviewInvitationInTransaction(transaction, invitation.id, now);
    }

    return { errorCode: "REVIEW_INVITATION_UNAVAILABLE" };
  }

  const guestDisplayName = deriveReviewGuestDisplayNameSnapshot(
    invitation.reservation.guestName,
  );

  if (!guestDisplayName) {
    throw new ReviewSubmissionError("REVIEW_SUBMISSION_UNEXPECTED_ERROR");
  }

  const consumed = await transaction.reviewInvitation.updateMany({
    where: {
      id: invitation.id,
      status: ReviewInvitationStatus.ACTIVE,
      consumedAt: null,
      expiresAt: { gt: now },
    },
    data: {
      status: ReviewInvitationStatus.CONSUMED,
      consumedAt: now,
      accessTokenEncrypted: null,
    },
  });

  if (consumed.count !== 1) {
    throw new ReviewSubmissionRaceError();
  }

  const review = await transaction.review.create({
    data: {
      reservationId: invitation.reservationId,
      propertyId: invitation.reservation.propertyId,
      rating: input.rating,
      comment: input.comment,
      guestDisplayName,
      moderationStatus: ReviewModerationStatus.PENDING,
      submittedAt: now,
      publishedAt: null,
      moderatedAt: null,
      moderatedByAdminId: null,
    },
    select: {
      id: true,
      reservationId: true,
    },
  });
  await createAdminReviewSubmittedNotificationIntents(
    transaction,
    {
      reviewId: review.id,
      reservationId: review.reservationId,
    },
    source,
  );

  return { outcome: "submitted" };
}

function isReviewSubmissionTransactionError(
  result: ReviewSubmissionTransactionResult,
): result is Readonly<{ errorCode: ReviewSubmissionErrorCode }> {
  return "errorCode" in result;
}

export async function submitReviewSubmission(
  rawToken: string,
  rawInput: unknown,
  options: ReviewSubmissionOptions = {},
): Promise<ReviewSubmissionResult> {
  const { tokenHash } = normalizeToken(rawToken);
  const input = parseReviewSubmissionInput(rawInput);
  const now = options.now ?? new Date();
  const prismaClient = options.prismaClient ?? prisma;
  const source = options.source ?? process.env;

  try {
    const result = await runReviewSubmissionTransactionWithRetry(
      prismaClient,
      (transaction) =>
        submitReviewOnce(transaction, tokenHash, input, now, source),
    );

    if (isReviewSubmissionTransactionError(result)) {
      throw new ReviewSubmissionError(result.errorCode);
    }

    return result;
  } catch (error) {
    if (error instanceof ReviewSubmissionRaceError || isUniqueConstraintFailure(error)) {
      const summary = await getReviewSubmissionSummary(rawToken, {
        now,
        prismaClient,
        source,
      });

      if (summary.state === "ALREADY_SUBMITTED") {
        return { outcome: "already-submitted" };
      }
    }

    if (error instanceof ReviewSubmissionError) {
      throw error;
    }

    throw new ReviewSubmissionError("REVIEW_SUBMISSION_UNEXPECTED_ERROR");
  }
}
