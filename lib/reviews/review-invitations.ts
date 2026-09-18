import {
  ReservationStatus,
  ReviewInvitationStatus,
  type Prisma,
} from "@prisma/client";

import {
  evaluateReviewInvitationSchedulerEligibility,
  type ReviewInvitationSchedulerEligibilityResult,
} from "./review-invitation-eligibility";
import {
  addReviewInvitationLifetime,
} from "./review-invitation-time";
import {
  createReviewInvitationTokenMaterial,
  type ReviewInvitationTokenMaterial,
} from "./review-invitation-token";

export type ReviewInvitationLifecycleRecord = Readonly<{
  id: string;
  reservationId: string;
  status: ReviewInvitationStatus;
  accessTokenHash: string;
  accessTokenEncrypted: string | null;
  checkoutAtSnapshot: Date;
  eligibleAt: Date;
  expiresAt: Date;
  consumedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}>;

type ReviewInvitationReservationRecord = Readonly<{
  id: string;
  status: ReservationStatus;
  confirmedAt: Date | null;
  cancelledAt: Date | null;
  checkOutDate: Date;
  property: Readonly<{
    checkOutTime: string | null;
  }>;
  review: Readonly<{ id: string }> | null;
  reviewInvitation: ReviewInvitationLifecycleRecord | null;
}>;

export type EnsureReviewInvitationResult =
  | Readonly<{
      outcome: "created";
      invitation: ReviewInvitationLifecycleRecord;
      tokenMaterial: ReviewInvitationTokenMaterial;
      eligibility: Extract<
        ReviewInvitationSchedulerEligibilityResult,
        { eligible: true }
      >;
    }>
  | Readonly<{
      outcome: "existing";
      invitation: ReviewInvitationLifecycleRecord;
      effectiveStatus: ReviewInvitationStatus;
    }>
  | Readonly<{
      outcome: "invalid-checkout-time";
      eligibility: Extract<
        ReviewInvitationSchedulerEligibilityResult,
        { eligible: false }
      >;
    }>
  | Readonly<{
      outcome: "review-already-exists";
      eligibility: Extract<
        ReviewInvitationSchedulerEligibilityResult,
        { eligible: false }
      >;
    }>
  | Readonly<{
      outcome: "outside-catch-up-window";
      eligibility: Extract<
        ReviewInvitationSchedulerEligibilityResult,
        { eligible: false }
      >;
    }>
  | Readonly<{
      outcome: "not-eligible";
      eligibility: Extract<
        ReviewInvitationSchedulerEligibilityResult,
        { eligible: false }
      >;
    }>;

export type EnsureReviewInvitationOptions = Readonly<{
  now?: Date;
  tokenMaterialFactory?: (
    reservationId: string,
  ) => ReviewInvitationTokenMaterial;
}>;

export type ReviewInvitationTerminalTransitionResult = Readonly<{
  transitioned: boolean;
  transitionedAt: Date;
}>;

const reviewInvitationSelect = {
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
} satisfies Prisma.ReviewInvitationSelect;

function mapNotEligibleOutcome(
  eligibility: Extract<
    ReviewInvitationSchedulerEligibilityResult,
    { eligible: false }
  >,
): Exclude<EnsureReviewInvitationResult, { outcome: "created" | "existing" }> {
  if (eligibility.reason === "INVALID_CHECKOUT_TIME") {
    return {
      outcome: "invalid-checkout-time",
      eligibility,
    };
  }

  if (eligibility.reason === "REVIEW_ALREADY_EXISTS") {
    return {
      outcome: "review-already-exists",
      eligibility,
    };
  }

  if (eligibility.reason === "OUTSIDE_CATCH_UP_WINDOW") {
    return {
      outcome: "outside-catch-up-window",
      eligibility,
    };
  }

  return {
    outcome: "not-eligible",
    eligibility,
  };
}

export function getReviewInvitationEffectiveStatus(
  invitation: Pick<ReviewInvitationLifecycleRecord, "status" | "expiresAt">,
  now: Date,
): ReviewInvitationStatus {
  if (
    invitation.status === ReviewInvitationStatus.ACTIVE &&
    invitation.expiresAt.getTime() <= now.getTime()
  ) {
    return ReviewInvitationStatus.EXPIRED;
  }

  return invitation.status;
}

export async function ensureReviewInvitationInTransaction(
  tx: Prisma.TransactionClient,
  reservationId: string,
  options: EnsureReviewInvitationOptions = {},
): Promise<EnsureReviewInvitationResult> {
  const now = options.now ?? new Date();
  const tokenMaterialFactory =
    options.tokenMaterialFactory ?? createReviewInvitationTokenMaterial;

  const reservation = (await tx.reservation.findUnique({
    where: { id: reservationId },
    select: {
      id: true,
      status: true,
      confirmedAt: true,
      cancelledAt: true,
      checkOutDate: true,
      property: {
        select: {
          checkOutTime: true,
        },
      },
      review: {
        select: {
          id: true,
        },
      },
      reviewInvitation: {
        select: reviewInvitationSelect,
      },
    },
  })) as ReviewInvitationReservationRecord | null;

  if (!reservation) {
    return {
      outcome: "not-eligible",
      eligibility: {
        eligible: false,
        reason: "RESERVATION_NOT_FOUND",
      },
    };
  }

  if (reservation.reviewInvitation) {
    return {
      outcome: "existing",
      invitation: reservation.reviewInvitation,
      effectiveStatus: getReviewInvitationEffectiveStatus(
        reservation.reviewInvitation,
        now,
      ),
    };
  }

  const eligibility = evaluateReviewInvitationSchedulerEligibility(
    {
      status: reservation.status,
      confirmedAt: reservation.confirmedAt,
      cancelledAt: reservation.cancelledAt,
      checkOutDate: reservation.checkOutDate,
      checkOutTime: reservation.property.checkOutTime,
      hasReview: reservation.review !== null,
    },
    now,
  );

  if (!eligibility.eligible) {
    return mapNotEligibleOutcome(eligibility);
  }

  const tokenMaterial = tokenMaterialFactory(reservation.id);
  const expiresAt = addReviewInvitationLifetime(now);
  const invitation = (await tx.reviewInvitation.create({
    data: {
      reservationId: reservation.id,
      status: ReviewInvitationStatus.ACTIVE,
      accessTokenHash: tokenMaterial.tokenHash,
      accessTokenEncrypted: tokenMaterial.encryptedToken,
      checkoutAtSnapshot: eligibility.checkoutAt,
      eligibleAt: eligibility.eligibleAt,
      expiresAt,
      consumedAt: null,
      createdAt: now,
    },
    select: reviewInvitationSelect,
  })) as ReviewInvitationLifecycleRecord;

  return {
    outcome: "created",
    invitation,
    tokenMaterial,
    eligibility,
  };
}

export async function expireReviewInvitationIfOverdueInTransaction(
  tx: Prisma.TransactionClient,
  invitationId: string,
  now: Date = new Date(),
): Promise<ReviewInvitationTerminalTransitionResult> {
  const result = await tx.reviewInvitation.updateMany({
    where: {
      id: invitationId,
      status: ReviewInvitationStatus.ACTIVE,
      expiresAt: {
        lte: now,
      },
    },
    data: {
      status: ReviewInvitationStatus.EXPIRED,
      accessTokenEncrypted: null,
      consumedAt: null,
    },
  });

  return {
    transitioned: result.count === 1,
    transitionedAt: now,
  };
}

export async function cancelReviewInvitationInTransaction(
  tx: Prisma.TransactionClient,
  invitationId: string,
  now: Date = new Date(),
): Promise<ReviewInvitationTerminalTransitionResult> {
  const result = await tx.reviewInvitation.updateMany({
    where: {
      id: invitationId,
      status: ReviewInvitationStatus.ACTIVE,
    },
    data: {
      status: ReviewInvitationStatus.CANCELLED,
      accessTokenEncrypted: null,
      consumedAt: null,
    },
  });

  return {
    transitioned: result.count === 1,
    transitionedAt: now,
  };
}
