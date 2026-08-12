import assert from "node:assert/strict";

import {
  PaymentPurpose,
  RefundStatus,
  ReservationLifecycleRequestStatus,
  ReservationLifecycleRequestType,
} from "@prisma/client";

import {
  calculateStandardCancellationPolicyAmount,
  calculateStandardCancellationPolicyTiming,
} from "../../lib/reservations/cancellation-policy";
import {
  buildReservationFinancialSummary,
  ReservationFinancialSummaryError,
} from "../../lib/reservations/financial-summary";
import {
  financialPayment,
  financialRefund,
  financialSnapshot,
  lifecycleSnapshot,
  money,
} from "./fixtures";
import { test } from "./harness";

function assertMoney(actual: { toFixed: (digits: number) => string }, expected: string): void {
  assert.equal(actual.toFixed(2), expected);
}

test("A.2 original-only reservation keeps the original stay balance", () => {
  const summary = buildReservationFinancialSummary(
    financialSnapshot({
      total: "130.00",
      payments: [financialPayment({ id: "initial", amount: "130.00" })],
    }),
  );

  assertMoney(summary.originalStayAmount, "130.00");
  assertMoney(summary.currentStayValue, "130.00");
  assertMoney(summary.capturedStayPayments, "130.00");
  assertMoney(summary.approvedCompletedPositiveStayAdjustments, "0.00");
  assertMoney(summary.committedStayRefunds, "0.00");
  assertMoney(summary.approvedStayRefunds, "0.00");
  assertMoney(summary.remainingRefundableStayBalance, "130.00");
  assert.equal(summary.eligibleStayPayments.length, 1);
});

test("A.2 completed positive DATE_CHANGE increases current stay value and captured pool", () => {
  const request = lifecycleSnapshot({
    id: "date-change-positive",
    difference: "30.00",
    type: ReservationLifecycleRequestType.DATE_CHANGE,
  });
  const summary = buildReservationFinancialSummary(
    financialSnapshot({
      total: "160.00",
      payments: [
        financialPayment({ id: "initial", amount: "130.00" }),
        financialPayment({
          id: "date-change-payment",
          purpose: PaymentPurpose.LIFECYCLE_ADJUSTMENT,
          amount: "30.00",
          lifecycleRequest: request,
          paidAtOffsetHours: 1,
        }),
      ],
    }),
  );

  assertMoney(summary.currentStayValue, "160.00");
  assertMoney(summary.capturedStayPayments, "160.00");
  assertMoney(summary.approvedCompletedPositiveStayAdjustments, "30.00");
  assertMoney(summary.remainingRefundableStayBalance, "160.00");
  assert.deepEqual(
    summary.eligibleStayPayments.map((payment) => payment.paymentId),
    ["initial", "date-change-payment"],
  );
});

test("A.2 completed positive STAY_EXTENSION increases current stay value and captured pool", () => {
  const request = lifecycleSnapshot({
    id: "extension-positive",
    difference: "65.00",
    type: ReservationLifecycleRequestType.STAY_EXTENSION,
  });
  const summary = buildReservationFinancialSummary(
    financialSnapshot({
      total: "195.00",
      payments: [
        financialPayment({ id: "initial", amount: "130.00" }),
        financialPayment({
          id: "extension-payment",
          purpose: PaymentPurpose.LIFECYCLE_ADJUSTMENT,
          amount: "65.00",
          lifecycleRequest: request,
          paidAtOffsetHours: 2,
        }),
      ],
    }),
  );

  assertMoney(summary.currentStayValue, "195.00");
  assertMoney(summary.capturedStayPayments, "195.00");
  assertMoney(summary.approvedCompletedPositiveStayAdjustments, "65.00");
  assertMoney(summary.remainingRefundableStayBalance, "195.00");
});

test("A.2 zero adjustment does not become a captured stay payment", () => {
  const request = lifecycleSnapshot({
    id: "date-change-zero",
    difference: "0.00",
    type: ReservationLifecycleRequestType.DATE_CHANGE,
  });
  const summary = buildReservationFinancialSummary(
    financialSnapshot({
      total: "130.00",
      payments: [
        financialPayment({ id: "initial", amount: "130.00" }),
        financialPayment({
          id: "zero-payment",
          purpose: PaymentPurpose.LIFECYCLE_ADJUSTMENT,
          amount: "0.00",
          lifecycleRequest: request,
          paidAtOffsetHours: 1,
        }),
      ],
    }),
  );

  assertMoney(summary.approvedCompletedPositiveStayAdjustments, "0.00");
  assert.equal(summary.eligibleStayPayments.length, 1);
});

test("A.2 failed positive completion and its compensation stay outside effective stay value", () => {
  const failedRequest = lifecycleSnapshot({
    id: "extension-failed",
    difference: "65.00",
    status: ReservationLifecycleRequestStatus.FAILED,
    type: ReservationLifecycleRequestType.STAY_EXTENSION,
  });
  const summary = buildReservationFinancialSummary(
    financialSnapshot({
      total: "130.00",
      payments: [
        financialPayment({ id: "initial", amount: "130.00" }),
        financialPayment({
          id: "failed-adjustment",
          purpose: PaymentPurpose.LIFECYCLE_ADJUSTMENT,
          amount: "65.00",
          lifecycleRequest: failedRequest,
          refunds: [
            financialRefund(
              "compensation-approved",
              "65.00",
              RefundStatus.APPROVED,
            ),
          ],
        }),
      ],
    }),
  );

  assertMoney(summary.currentStayValue, "130.00");
  assertMoney(summary.capturedStayPayments, "130.00");
  assertMoney(summary.approvedCompletedPositiveStayAdjustments, "0.00");
  assertMoney(summary.remainingRefundableStayBalance, "130.00");
  assert.equal(summary.eligibleStayPayments.length, 1);
});

test("A.2 negative stay correction keeps gross captures while committed refund reduces balance", () => {
  const positiveRequest = lifecycleSnapshot({
    id: "extension-before-negative",
    difference: "65.00",
  });
  const summary = buildReservationFinancialSummary(
    financialSnapshot({
      total: "165.00",
      payments: [
        financialPayment({
          id: "initial",
          amount: "130.00",
          refunds: [
            financialRefund(
              "negative-child",
              "30.00",
              RefundStatus.PROCESSING,
            ),
          ],
        }),
        financialPayment({
          id: "positive-adjustment",
          purpose: PaymentPurpose.LIFECYCLE_ADJUSTMENT,
          amount: "65.00",
          lifecycleRequest: positiveRequest,
          paidAtOffsetHours: 2,
        }),
      ],
    }),
  );

  assertMoney(summary.currentStayValue, "165.00");
  assertMoney(summary.capturedStayPayments, "195.00");
  assertMoney(summary.committedStayRefunds, "30.00");
  assertMoney(summary.remainingRefundableStayBalance, "165.00");
});

test("A.2 committed refund states reserve balance while FAILED releases it", () => {
  const positiveRequest = lifecycleSnapshot({
    id: "extension-refund-statuses",
    difference: "65.00",
  });
  const summary = buildReservationFinancialSummary(
    financialSnapshot({
      total: "195.00",
      payments: [
        financialPayment({
          id: "initial",
          amount: "130.00",
          refunds: [
            financialRefund("pending", "10.00", RefundStatus.PENDING),
            financialRefund("processing", "10.00", RefundStatus.PROCESSING),
            financialRefund("approved", "10.00", RefundStatus.APPROVED),
            financialRefund("manual", "10.00", RefundStatus.MANUAL),
            financialRefund("failed", "10.00", RefundStatus.FAILED),
          ],
        }),
        financialPayment({
          id: "adjustment",
          purpose: PaymentPurpose.LIFECYCLE_ADJUSTMENT,
          amount: "65.00",
          lifecycleRequest: positiveRequest,
          paidAtOffsetHours: 1,
        }),
      ],
    }),
  );

  assertMoney(summary.committedStayRefunds, "40.00");
  assertMoney(summary.approvedStayRefunds, "20.00");
  assertMoney(summary.remainingRefundableStayBalance, "155.00");
});

test("A.2 additional-charge placeholders remain isolated at zero until Final-D", () => {
  const summary = buildReservationFinancialSummary(
    financialSnapshot({
      total: "130.00",
      payments: [financialPayment({ id: "initial", amount: "130.00" })],
    }),
  );

  assertMoney(summary.additionalChargeGrossAmount, "0.00");
  assertMoney(summary.additionalChargeCapturedAmount, "0.00");
  assertMoney(summary.additionalChargeRefundedAmount, "0.00");
});

test("A.2 deterministic stay-payment order is initial first, then oldest positive captures", () => {
  const laterRequest = lifecycleSnapshot({
    id: "extension-later",
    difference: "25.00",
  });
  const earlierRequest = lifecycleSnapshot({
    id: "extension-earlier",
    difference: "40.00",
  });
  const summary = buildReservationFinancialSummary(
    financialSnapshot({
      total: "195.00",
      payments: [
        financialPayment({ id: "initial", amount: "130.00", paidAtOffsetHours: 10 }),
        financialPayment({
          id: "later",
          purpose: PaymentPurpose.LIFECYCLE_ADJUSTMENT,
          amount: "25.00",
          lifecycleRequest: laterRequest,
          paidAtOffsetHours: 3,
        }),
        financialPayment({
          id: "earlier",
          purpose: PaymentPurpose.LIFECYCLE_ADJUSTMENT,
          amount: "40.00",
          lifecycleRequest: earlierRequest,
          paidAtOffsetHours: 1,
        }),
      ],
    }),
  );

  assert.deepEqual(
    summary.eligibleStayPayments.map((payment) => payment.paymentId),
    ["initial", "earlier", "later"],
  );
});

test("A.2 financial summary fails closed on duplicate initial captured payments", () => {
  assert.throws(
    () =>
      buildReservationFinancialSummary(
        financialSnapshot({
          total: "130.00",
          payments: [
            financialPayment({ id: "initial-a", amount: "130.00" }),
            financialPayment({ id: "initial-b", amount: "130.00" }),
          ],
        }),
      ),
    (error: unknown) =>
      error instanceof ReservationFinancialSummaryError &&
      error.code === "RESERVATION_FINANCIAL_SUMMARY_INCONSISTENT",
  );
});

test("A.2 completed positive adjustment must match its exact captured amount", () => {
  const request = lifecycleSnapshot({ id: "mismatch", difference: "65.00" });

  assert.throws(
    () =>
      buildReservationFinancialSummary(
        financialSnapshot({
          total: "195.00",
          payments: [
            financialPayment({ id: "initial", amount: "130.00" }),
            financialPayment({
              id: "bad-adjustment",
              purpose: PaymentPurpose.LIFECYCLE_ADJUSTMENT,
              amount: "60.00",
              lifecycleRequest: request,
            }),
          ],
        }),
      ),
    (error: unknown) =>
      error instanceof ReservationFinancialSummaryError &&
      error.code === "RESERVATION_FINANCIAL_SUMMARY_INCONSISTENT",
  );
});

test("A.2 current stay value cannot exceed authoritative captured stay payments", () => {
  assert.throws(
    () =>
      buildReservationFinancialSummary(
        financialSnapshot({
          total: "131.00",
          payments: [financialPayment({ id: "initial", amount: "130.00" })],
        }),
      ),
    (error: unknown) =>
      error instanceof ReservationFinancialSummaryError &&
      error.code === "RESERVATION_FINANCIAL_SUMMARY_INCONSISTENT",
  );
});

test("A.2 cancellation timing preserves exact 168h / 72h / below-72h thresholds", () => {
  const checkInAt = new Date("2026-08-20T14:00:00.000Z");

  assert.equal(
    calculateStandardCancellationPolicyTiming(
      checkInAt,
      new Date(checkInAt.getTime() - 168 * 60 * 60 * 1_000),
    ).refundPercentage,
    100,
  );
  assert.equal(
    calculateStandardCancellationPolicyTiming(
      checkInAt,
      new Date(checkInAt.getTime() - 72 * 60 * 60 * 1_000),
    ).refundPercentage,
    50,
  );
  assert.equal(
    calculateStandardCancellationPolicyTiming(
      checkInAt,
      new Date(checkInAt.getTime() - (72 * 60 * 60 * 1_000 - 1)),
    ).refundPercentage,
    0,
  );
});

test("A.2 standard cancellation amount uses current effective stay value after adjustment", () => {
  assertMoney(calculateStandardCancellationPolicyAmount(money("195.00"), 100), "195.00");
  assertMoney(calculateStandardCancellationPolicyAmount(money("195.00"), 50), "97.50");
  assertMoney(calculateStandardCancellationPolicyAmount(money("195.00"), 0), "0.00");
});
