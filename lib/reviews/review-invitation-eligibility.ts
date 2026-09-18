import { ReservationStatus } from "@prisma/client";

import {
  calculateReviewInvitationTimes,
  getReviewInvitationSchedulerCatchUpStart,
} from "./review-invitation-time";

export type ReviewInvitationEligibilityFailureReason =
  | "RESERVATION_NOT_FOUND"
  | "RESERVATION_STATUS_NOT_ELIGIBLE"
  | "RESERVATION_NOT_CONFIRMED"
  | "INVALID_CHECKOUT_TIME"
  | "NOT_YET_ELIGIBLE"
  | "CANCELLED_AT_MISSING"
  | "CANCELLED_BEFORE_CHECKOUT"
  | "REVIEW_ALREADY_EXISTS";

export type ReviewInvitationSchedulerEligibilityFailureReason =
  | ReviewInvitationEligibilityFailureReason
  | "OUTSIDE_CATCH_UP_WINDOW";

export type ReviewInvitationLifecycleCompatibility =
  | "CONFIRMED"
  | "HISTORICAL_REFUND_COMPATIBLE"
  | "POST_CHECKOUT_CANCELLATION_COMPATIBLE";

export type ReviewInvitationEligibilityInput = Readonly<{
  status: ReservationStatus;
  confirmedAt: Date | null;
  cancelledAt: Date | null;
  checkOutDate: Date;
  checkOutTime: string | null;
  hasReview: boolean;
}>;

export type ReviewInvitationBusinessEligibilityResult =
  | Readonly<{
      eligible: true;
      checkoutAt: Date;
      eligibleAt: Date;
      compatibility: ReviewInvitationLifecycleCompatibility;
    }>
  | Readonly<{
      eligible: false;
      reason: ReviewInvitationEligibilityFailureReason;
      checkoutAt?: Date;
      eligibleAt?: Date;
    }>;

export type ReviewInvitationSchedulerEligibilityResult =
  | Readonly<{
      eligible: true;
      checkoutAt: Date;
      eligibleAt: Date;
      catchUpStart: Date;
      compatibility: ReviewInvitationLifecycleCompatibility;
    }>
  | Readonly<{
      eligible: false;
      reason: ReviewInvitationSchedulerEligibilityFailureReason;
      checkoutAt?: Date;
      eligibleAt?: Date;
      catchUpStart?: Date;
    }>;

function isAbsolutelyRejectedStatus(status: ReservationStatus): boolean {
  return (
    status === ReservationStatus.PENDING_PAYMENT ||
    status === ReservationStatus.EXPIRED ||
    status === ReservationStatus.BLOCKED
  );
}

function resolveLifecycleCompatibility(
  input: ReviewInvitationEligibilityInput,
  checkoutAt: Date,
): ReviewInvitationBusinessEligibilityResult {
  if (input.status === ReservationStatus.CANCELLED) {
    if (!input.cancelledAt) {
      return {
        eligible: false,
        reason: "CANCELLED_AT_MISSING",
        checkoutAt,
      };
    }

    if (input.cancelledAt.getTime() < checkoutAt.getTime()) {
      return {
        eligible: false,
        reason: "CANCELLED_BEFORE_CHECKOUT",
        checkoutAt,
      };
    }

    return {
      eligible: true,
      checkoutAt,
      eligibleAt: new Date(0),
      compatibility: "POST_CHECKOUT_CANCELLATION_COMPATIBLE",
    };
  }

  if (
    input.cancelledAt &&
    input.cancelledAt.getTime() < checkoutAt.getTime()
  ) {
    return {
      eligible: false,
      reason: "CANCELLED_BEFORE_CHECKOUT",
      checkoutAt,
    };
  }

  if (
    input.status === ReservationStatus.REFUNDED ||
    input.status === ReservationStatus.PARTIALLY_REFUNDED
  ) {
    return {
      eligible: true,
      checkoutAt,
      eligibleAt: new Date(0),
      compatibility: "HISTORICAL_REFUND_COMPATIBLE",
    };
  }

  return {
    eligible: true,
    checkoutAt,
    eligibleAt: new Date(0),
    compatibility: "CONFIRMED",
  };
}

export function evaluateReviewInvitationBusinessEligibility(
  input: ReviewInvitationEligibilityInput,
  now: Date,
): ReviewInvitationBusinessEligibilityResult {
  if (isAbsolutelyRejectedStatus(input.status)) {
    return {
      eligible: false,
      reason: "RESERVATION_STATUS_NOT_ELIGIBLE",
    };
  }

  if (!input.confirmedAt) {
    return {
      eligible: false,
      reason: "RESERVATION_NOT_CONFIRMED",
    };
  }

  const timeResult = calculateReviewInvitationTimes(
    input.checkOutDate,
    input.checkOutTime,
  );

  if (!timeResult.ok) {
    return {
      eligible: false,
      reason: timeResult.reason,
    };
  }

  const lifecycleCompatibility = resolveLifecycleCompatibility(
    input,
    timeResult.checkoutAt,
  );

  if (!lifecycleCompatibility.eligible) {
    return {
      ...lifecycleCompatibility,
      eligibleAt: timeResult.eligibleAt,
    };
  }

  if (input.hasReview) {
    return {
      eligible: false,
      reason: "REVIEW_ALREADY_EXISTS",
      checkoutAt: timeResult.checkoutAt,
      eligibleAt: timeResult.eligibleAt,
    };
  }

  if (now.getTime() < timeResult.eligibleAt.getTime()) {
    return {
      eligible: false,
      reason: "NOT_YET_ELIGIBLE",
      checkoutAt: timeResult.checkoutAt,
      eligibleAt: timeResult.eligibleAt,
    };
  }

  return {
    eligible: true,
    checkoutAt: timeResult.checkoutAt,
    eligibleAt: timeResult.eligibleAt,
    compatibility: lifecycleCompatibility.compatibility,
  };
}

export function evaluateReviewInvitationSchedulerEligibility(
  input: ReviewInvitationEligibilityInput,
  now: Date,
): ReviewInvitationSchedulerEligibilityResult {
  const businessEligibility = evaluateReviewInvitationBusinessEligibility(
    input,
    now,
  );
  const catchUpStart = getReviewInvitationSchedulerCatchUpStart(now);

  if (!businessEligibility.eligible) {
    return {
      ...businessEligibility,
      catchUpStart,
    };
  }

  if (businessEligibility.eligibleAt.getTime() < catchUpStart.getTime()) {
    return {
      eligible: false,
      reason: "OUTSIDE_CATCH_UP_WINDOW",
      checkoutAt: businessEligibility.checkoutAt,
      eligibleAt: businessEligibility.eligibleAt,
      catchUpStart,
    };
  }

  return {
    eligible: true,
    checkoutAt: businessEligibility.checkoutAt,
    eligibleAt: businessEligibility.eligibleAt,
    catchUpStart,
    compatibility: businessEligibility.compatibility,
  };
}
