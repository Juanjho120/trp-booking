import assert from "node:assert/strict";

import {
  PaymentPurpose,
  PaymentStatus,
  Prisma,
  RefundStatus,
  ReservationLifecycleRequestStatus,
  ReservationLifecycleRequestType,
} from "@prisma/client";

import {
  buildReservationFinancialSummary,
  ReservationFinancialSummaryError,
  type ReservationFinancialLifecycleSnapshot,
  type ReservationFinancialPaymentSnapshot,
  type ReservationFinancialRefundSnapshot,
  type ReservationFinancialSnapshot,
} from "../lib/reservations/financial-summary";
import {
  calculateStandardCancellationPolicyAmount,
} from "../lib/reservations/cancellation-policy";

const baseDate = new Date("2026-08-01T12:00:00.000Z");

function money(value: string | number): Prisma.Decimal {
  return new Prisma.Decimal(value).toDecimalPlaces(2);
}

function refund(
  id: string,
  amount: string,
  status: RefundStatus,
): ReservationFinancialRefundSnapshot {
  return {
    id,
    amount: money(amount),
    currency: "USD",
    status,
  };
}

function lifecycle(
  id: string,
  difference: string,
  status: ReservationLifecycleRequestStatus =
    ReservationLifecycleRequestStatus.COMPLETED,
  type: ReservationLifecycleRequestType =
    ReservationLifecycleRequestType.STAY_EXTENSION,
): ReservationFinancialLifecycleSnapshot {
  return {
    id,
    reservationId: "reservation-1",
    requestType: type,
    status,
    financialDifference: money(difference),
    currency: "USD",
  };
}

function payment(input: Readonly<{
  id: string;
  purpose?: PaymentPurpose;
  status?: PaymentStatus;
  amount: string;
  lifecycleRequest?: ReservationFinancialLifecycleSnapshot | null;
  paidAtOffsetHours?: number | null;
  refunds?: readonly ReservationFinancialRefundSnapshot[];
}>): ReservationFinancialPaymentSnapshot {
  const lifecycleRequest = input.lifecycleRequest ?? null;
  const paidAt =
    input.paidAtOffsetHours === null
      ? null
      : new Date(
          baseDate.getTime() +
            (input.paidAtOffsetHours ?? 0) * 60 * 60 * 1_000,
        );

  return {
    id: input.id,
    reservationId: "reservation-1",
    lifecycleRequestId: lifecycleRequest?.id ?? null,
    purpose: input.purpose ?? PaymentPurpose.INITIAL_RESERVATION,
    status: input.status ?? PaymentStatus.APPROVED,
    amount: money(input.amount),
    currency: "USD",
    providerReference: `TRP-${input.id}`,
    paidAt,
    createdAt: new Date(baseDate.getTime() + 1_000),
    updatedAt: new Date(baseDate.getTime() + 2_000),
    lifecycleRequest,
    refunds: input.refunds ?? [],
  };
}

function snapshot(
  total: string,
  payments: readonly ReservationFinancialPaymentSnapshot[],
): ReservationFinancialSnapshot {
  return {
    id: "reservation-1",
    total: money(total),
    currency: "USD",
    payments,
  };
}

function assertMoney(
  actual: Prisma.Decimal,
  expected: string,
  label: string,
): void {
  assert.equal(actual.toFixed(2), expected, label);
}

{
  const summary = buildReservationFinancialSummary(
    snapshot("130.00", [
      payment({ id: "initial", amount: "130.00" }),
    ]),
  );

  assertMoney(summary.originalStayAmount, "130.00", "original stay");
  assertMoney(summary.currentStayValue, "130.00", "current stay");
  assertMoney(summary.capturedStayPayments, "130.00", "captured stay");
  assertMoney(
    summary.approvedCompletedPositiveStayAdjustments,
    "0.00",
    "positive adjustments",
  );
  assertMoney(
    summary.remainingRefundableStayBalance,
    "130.00",
    "remaining stay balance",
  );
  assert.equal(summary.eligibleStayPayments.length, 1);
}

{
  const completedAdjustment = lifecycle("extension-1", "65.00");
  const summary = buildReservationFinancialSummary(
    snapshot("195.00", [
      payment({ id: "initial", amount: "130.00" }),
      payment({
        id: "adjustment-1",
        purpose: PaymentPurpose.LIFECYCLE_ADJUSTMENT,
        amount: "65.00",
        lifecycleRequest: completedAdjustment,
        paidAtOffsetHours: 2,
      }),
    ]),
  );

  assertMoney(summary.originalStayAmount, "130.00", "positive original stay");
  assertMoney(summary.currentStayValue, "195.00", "positive current stay");
  assertMoney(summary.capturedStayPayments, "195.00", "positive captured");
  assertMoney(
    summary.approvedCompletedPositiveStayAdjustments,
    "65.00",
    "positive adjustment total",
  );
  assertMoney(
    summary.remainingRefundableStayBalance,
    "195.00",
    "positive remaining balance",
  );
  assert.deepEqual(
    summary.eligibleStayPayments.map((entry) => entry.paymentId),
    ["initial", "adjustment-1"],
    "initial payment must sort before completed positive adjustments",
  );
}

{
  const completedDateChange = lifecycle(
    "date-change-1",
    "30.00",
    ReservationLifecycleRequestStatus.COMPLETED,
    ReservationLifecycleRequestType.DATE_CHANGE,
  );
  const summary = buildReservationFinancialSummary(
    snapshot("160.00", [
      payment({ id: "initial", amount: "130.00" }),
      payment({
        id: "date-change-payment",
        purpose: PaymentPurpose.LIFECYCLE_ADJUSTMENT,
        amount: "30.00",
        lifecycleRequest: completedDateChange,
        paidAtOffsetHours: 1,
      }),
    ]),
  );

  assertMoney(
    summary.approvedCompletedPositiveStayAdjustments,
    "30.00",
    "completed positive DATE_CHANGE adjustment",
  );
  assertMoney(
    summary.currentStayValue,
    "160.00",
    "completed positive DATE_CHANGE current stay",
  );
  assertMoney(
    summary.remainingRefundableStayBalance,
    "160.00",
    "completed positive DATE_CHANGE remaining balance",
  );
}

{
  const zeroAdjustment = lifecycle(
    "date-change-zero",
    "0.00",
    ReservationLifecycleRequestStatus.COMPLETED,
    ReservationLifecycleRequestType.DATE_CHANGE,
  );
  const summary = buildReservationFinancialSummary(
    snapshot("130.00", [
      payment({ id: "initial", amount: "130.00" }),
      payment({
        id: "zero-adjustment-payment",
        purpose: PaymentPurpose.LIFECYCLE_ADJUSTMENT,
        amount: "0.00",
        lifecycleRequest: zeroAdjustment,
        paidAtOffsetHours: 1,
      }),
    ]),
  );

  assertMoney(
    summary.approvedCompletedPositiveStayAdjustments,
    "0.00",
    "zero adjustment must not enter positive adjustment total",
  );
  assert.equal(
    summary.eligibleStayPayments.length,
    1,
    "zero adjustment must not create effective stay capture",
  );
}

{
  const failedAdjustment = lifecycle(
    "extension-failed",
    "65.00",
    ReservationLifecycleRequestStatus.FAILED,
  );
  const summary = buildReservationFinancialSummary(
    snapshot("130.00", [
      payment({ id: "initial", amount: "130.00" }),
      payment({
        id: "adjustment-failed",
        purpose: PaymentPurpose.LIFECYCLE_ADJUSTMENT,
        amount: "65.00",
        lifecycleRequest: failedAdjustment,
        refunds: [
          refund("compensation-approved", "65.00", RefundStatus.APPROVED),
        ],
      }),
    ]),
  );

  assertMoney(
    summary.capturedStayPayments,
    "130.00",
    "failed completion must not enter stay captures",
  );
  assert.equal(summary.eligibleStayPayments.length, 1);
}

{
  const completedAdjustment = lifecycle("extension-2", "65.00");
  const summary = buildReservationFinancialSummary(
    snapshot("195.00", [
      payment({
        id: "initial",
        amount: "130.00",
        refunds: [
          refund("refund-pending", "20.00", RefundStatus.PENDING),
          refund("refund-failed", "15.00", RefundStatus.FAILED),
        ],
      }),
      payment({
        id: "adjustment-2",
        purpose: PaymentPurpose.LIFECYCLE_ADJUSTMENT,
        amount: "65.00",
        lifecycleRequest: completedAdjustment,
        paidAtOffsetHours: 3,
      }),
    ]),
  );

  assertMoney(
    summary.committedStayRefunds,
    "20.00",
    "PENDING reserves balance while FAILED releases it",
  );
  assertMoney(
    summary.approvedStayRefunds,
    "0.00",
    "pending refund is not completed",
  );
  assertMoney(
    summary.remainingRefundableStayBalance,
    "175.00",
    "reserved refund reduces remaining balance",
  );
}

{
  const completedAdjustment = lifecycle("extension-3", "65.00");
  const summary = buildReservationFinancialSummary(
    snapshot("165.00", [
      payment({
        id: "initial",
        amount: "130.00",
        refunds: [
          refund("negative-leg", "30.00", RefundStatus.PROCESSING),
        ],
      }),
      payment({
        id: "adjustment-3",
        purpose: PaymentPurpose.LIFECYCLE_ADJUSTMENT,
        amount: "65.00",
        lifecycleRequest: completedAdjustment,
        paidAtOffsetHours: 4,
      }),
    ]),
  );

  assertMoney(summary.currentStayValue, "165.00", "negative current stay");
  assertMoney(summary.capturedStayPayments, "195.00", "negative gross capture");
  assertMoney(summary.committedStayRefunds, "30.00", "negative committed refund");
  assertMoney(
    summary.remainingRefundableStayBalance,
    "165.00",
    "negative adjustment remaining balance",
  );
}

assertMoney(
  calculateStandardCancellationPolicyAmount(money("195.00"), 100),
  "195.00",
  "100 percent cancellation base",
);
assertMoney(
  calculateStandardCancellationPolicyAmount(money("195.00"), 50),
  "97.50",
  "50 percent cancellation base",
);
assertMoney(
  calculateStandardCancellationPolicyAmount(money("195.00"), 0),
  "0.00",
  "0 percent cancellation base",
);

assert.throws(
  () =>
    buildReservationFinancialSummary(
      snapshot("65.00", [
        payment({
          id: "adjustment-only",
          purpose: PaymentPurpose.LIFECYCLE_ADJUSTMENT,
          amount: "65.00",
          lifecycleRequest: lifecycle("extension-only", "65.00"),
        }),
      ]),
    ),
  (error: unknown) =>
    error instanceof ReservationFinancialSummaryError &&
    error.code === "RESERVATION_FINANCIAL_SUMMARY_INITIAL_PAYMENT_NOT_FOUND",
  "captured stay summary requires the validated initial payment",
);

assert.throws(
  () =>
    buildReservationFinancialSummary(
      snapshot("130.00", [
        payment({ id: "initial-a", amount: "130.00" }),
        payment({ id: "initial-b", amount: "130.00" }),
      ]),
    ),
  (error: unknown) =>
    error instanceof ReservationFinancialSummaryError &&
    error.code === "RESERVATION_FINANCIAL_SUMMARY_INCONSISTENT",
  "duplicate captured initial payments must fail closed",
);

assert.throws(
  () =>
    buildReservationFinancialSummary(
      snapshot("195.00", [
        payment({ id: "initial", amount: "130.00" }),
        payment({
          id: "bad-adjustment",
          purpose: PaymentPurpose.LIFECYCLE_ADJUSTMENT,
          amount: "60.00",
          lifecycleRequest: lifecycle("extension-mismatch", "65.00"),
        }),
      ]),
    ),
  (error: unknown) =>
    error instanceof ReservationFinancialSummaryError &&
    error.code === "RESERVATION_FINANCIAL_SUMMARY_INCONSISTENT",
  "a completed positive adjustment without its exact captured amount must fail closed",
);

console.log("Final-A.2 financial summary validation passed.");
