import assert from "node:assert/strict";

import { ReservationStatus } from "@prisma/client";

import {
  calculateReviewInvitationTimes,
  evaluateReviewInvitationBusinessEligibility,
  evaluateReviewInvitationSchedulerEligibility,
} from "@/lib/reviews";

import { test } from "./harness";

const checkoutDate = new Date("2026-09-18T00:00:00.000Z");
const checkoutAt = new Date("2026-09-18T17:00:00.000Z");
const eligibleAt = new Date("2026-09-18T19:00:00.000Z");
const nowAtEligibility = new Date(eligibleAt);

function confirmedReservation(
  overrides: Partial<Parameters<typeof evaluateReviewInvitationBusinessEligibility>[0]> = {},
): Parameters<typeof evaluateReviewInvitationBusinessEligibility>[0] {
  return {
    status: ReservationStatus.CONFIRMED,
    confirmedAt: new Date("2026-09-16T15:00:00.000Z"),
    cancelledAt: null,
    checkOutDate: checkoutDate,
    checkOutTime: "11:00",
    hasReview: false,
    ...overrides,
  };
}

test("E.3 calculates Guatemala checkoutAt and eligibleAt with 24h and 12h checkout times", () => {
  const twentyFourHour = calculateReviewInvitationTimes(checkoutDate, "11:00");
  const twelveHour = calculateReviewInvitationTimes(checkoutDate, "11:00 a.m.");

  assert.equal(twentyFourHour.ok, true);
  assert.equal(twelveHour.ok, true);

  if (!twentyFourHour.ok || !twelveHour.ok) {
    throw new Error("Expected valid checkout time parsing.");
  }

  assert.equal(twentyFourHour.timezone, "America/Guatemala");
  assert.equal(twentyFourHour.checkoutAt.toISOString(), checkoutAt.toISOString());
  assert.equal(twentyFourHour.eligibleAt.toISOString(), eligibleAt.toISOString());
  assert.equal(twelveHour.checkoutAt.toISOString(), checkoutAt.toISOString());
  assert.equal(twelveHour.eligibleAt.toISOString(), eligibleAt.toISOString());
});

test("E.3 fails closed for null, blank and invalid checkout time", () => {
  for (const checkOutTime of [null, "", "   ", "25:00", "checkout"] as const) {
    const result = calculateReviewInvitationTimes(checkoutDate, checkOutTime);

    assert.equal(result.ok, false);

    if (!result.ok) {
      assert.equal(result.reason, "INVALID_CHECKOUT_TIME");
    }
  }
});

test("E.3 business eligibility starts exactly at checkout plus two hours", () => {
  const oneMillisecondEarly = evaluateReviewInvitationBusinessEligibility(
    confirmedReservation(),
    new Date(eligibleAt.getTime() - 1),
  );
  const exactlyEligible = evaluateReviewInvitationBusinessEligibility(
    confirmedReservation(),
    nowAtEligibility,
  );

  assert.equal(oneMillisecondEarly.eligible, false);

  if (!oneMillisecondEarly.eligible) {
    assert.equal(oneMillisecondEarly.reason, "NOT_YET_ELIGIBLE");
  }

  assert.equal(exactlyEligible.eligible, true);

  if (exactlyEligible.eligible) {
    assert.equal(exactlyEligible.checkoutAt.toISOString(), checkoutAt.toISOString());
    assert.equal(exactlyEligible.eligibleAt.toISOString(), eligibleAt.toISOString());
  }
});

test("E.3 applies reservation status, confirmation and cancellation eligibility rules", () => {
  assert.equal(
    evaluateReviewInvitationBusinessEligibility(
      confirmedReservation(),
      nowAtEligibility,
    ).eligible,
    true,
  );

  const rejectedStatuses = [
    ReservationStatus.PENDING_PAYMENT,
    ReservationStatus.EXPIRED,
    ReservationStatus.BLOCKED,
  ] as const;

  for (const status of rejectedStatuses) {
    const result = evaluateReviewInvitationBusinessEligibility(
      confirmedReservation({ status }),
      nowAtEligibility,
    );

    assert.equal(result.eligible, false);

    if (!result.eligible) {
      assert.equal(result.reason, "RESERVATION_STATUS_NOT_ELIGIBLE");
    }
  }

  const neverConfirmed = evaluateReviewInvitationBusinessEligibility(
    confirmedReservation({ confirmedAt: null }),
    nowAtEligibility,
  );
  assert.equal(neverConfirmed.eligible, false);

  if (!neverConfirmed.eligible) {
    assert.equal(neverConfirmed.reason, "RESERVATION_NOT_CONFIRMED");
  }

  const cancelledWithoutEvidence = evaluateReviewInvitationBusinessEligibility(
    confirmedReservation({ status: ReservationStatus.CANCELLED }),
    nowAtEligibility,
  );
  assert.equal(cancelledWithoutEvidence.eligible, false);

  if (!cancelledWithoutEvidence.eligible) {
    assert.equal(cancelledWithoutEvidence.reason, "CANCELLED_AT_MISSING");
  }

  const cancelledBeforeCheckout = evaluateReviewInvitationBusinessEligibility(
    confirmedReservation({
      status: ReservationStatus.CANCELLED,
      cancelledAt: new Date(checkoutAt.getTime() - 1),
    }),
    nowAtEligibility,
  );
  assert.equal(cancelledBeforeCheckout.eligible, false);

  if (!cancelledBeforeCheckout.eligible) {
    assert.equal(cancelledBeforeCheckout.reason, "CANCELLED_BEFORE_CHECKOUT");
  }

  const cancelledAtCheckout = evaluateReviewInvitationBusinessEligibility(
    confirmedReservation({
      status: ReservationStatus.CANCELLED,
      cancelledAt: new Date(checkoutAt),
    }),
    nowAtEligibility,
  );
  assert.equal(cancelledAtCheckout.eligible, true);

  const cancelledAfterCheckout = evaluateReviewInvitationBusinessEligibility(
    confirmedReservation({
      status: ReservationStatus.CANCELLED,
      cancelledAt: new Date(checkoutAt.getTime() + 1),
    }),
    nowAtEligibility,
  );
  assert.equal(cancelledAfterCheckout.eligible, true);

  const refunded = evaluateReviewInvitationBusinessEligibility(
    confirmedReservation({ status: ReservationStatus.REFUNDED }),
    nowAtEligibility,
  );
  const partiallyRefunded = evaluateReviewInvitationBusinessEligibility(
    confirmedReservation({ status: ReservationStatus.PARTIALLY_REFUNDED }),
    nowAtEligibility,
  );
  assert.equal(refunded.eligible, true);
  assert.equal(partiallyRefunded.eligible, true);

  const historicalWithPreCheckoutCancellation =
    evaluateReviewInvitationBusinessEligibility(
      confirmedReservation({
        status: ReservationStatus.PARTIALLY_REFUNDED,
        cancelledAt: new Date(checkoutAt.getTime() - 1),
      }),
      nowAtEligibility,
    );
  assert.equal(historicalWithPreCheckoutCancellation.eligible, false);

  if (!historicalWithPreCheckoutCancellation.eligible) {
    assert.equal(
      historicalWithPreCheckoutCancellation.reason,
      "CANCELLED_BEFORE_CHECKOUT",
    );
  }
});

test("E.3 keeps scheduler catch-up separate and bounded to seven days inclusively", () => {
  const now = new Date("2026-09-25T19:00:00.000Z");
  const exactlyNow = evaluateReviewInvitationSchedulerEligibility(
    confirmedReservation({ checkOutDate: new Date("2026-09-25T00:00:00.000Z") }),
    now,
  );
  const exactlySevenDays = evaluateReviewInvitationSchedulerEligibility(
    confirmedReservation(),
    now,
  );
  const oneMillisecondOlder = evaluateReviewInvitationSchedulerEligibility(
    confirmedReservation(),
    new Date("2026-09-25T19:00:00.001Z"),
  );
  const futureBusiness = evaluateReviewInvitationBusinessEligibility(
    confirmedReservation({ checkOutDate: new Date("2026-09-26T00:00:00.000Z") }),
    now,
  );
  const futureScheduler = evaluateReviewInvitationSchedulerEligibility(
    confirmedReservation({ checkOutDate: new Date("2026-09-26T00:00:00.000Z") }),
    now,
  );

  assert.equal(exactlyNow.eligible, true);
  assert.equal(exactlySevenDays.eligible, true);
  assert.equal(oneMillisecondOlder.eligible, false);

  if (!oneMillisecondOlder.eligible) {
    assert.equal(oneMillisecondOlder.reason, "OUTSIDE_CATCH_UP_WINDOW");
  }

  assert.equal(futureBusiness.eligible, false);
  assert.equal(futureScheduler.eligible, false);

  if (!futureBusiness.eligible && !futureScheduler.eligible) {
    assert.equal(futureBusiness.reason, "NOT_YET_ELIGIBLE");
    assert.equal(futureScheduler.reason, "NOT_YET_ELIGIBLE");
  }
});

test("E.3 existing Review blocks scheduler invitation creation", () => {
  const result = evaluateReviewInvitationSchedulerEligibility(
    confirmedReservation({ hasReview: true }),
    nowAtEligibility,
  );

  assert.equal(result.eligible, false);

  if (!result.eligible) {
    assert.equal(result.reason, "REVIEW_ALREADY_EXISTS");
  }
});
