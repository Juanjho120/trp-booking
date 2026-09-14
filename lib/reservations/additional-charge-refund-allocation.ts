import { AdditionalChargeStatus, Prisma } from "@prisma/client";

export type AdditionalChargeRefundAllocationErrorCode =
  | "ADDITIONAL_CHARGE_REFUND_ALLOCATION_AMOUNT_MISMATCH"
  | "ADDITIONAL_CHARGE_REFUND_ALLOCATION_CHARGE_NOT_ELIGIBLE"
  | "ADDITIONAL_CHARGE_REFUND_ALLOCATION_EXCEEDS_BALANCE"
  | "ADDITIONAL_CHARGE_REFUND_ALLOCATION_INCONSISTENT";

export class AdditionalChargeRefundAllocationError extends Error {
  constructor(public readonly code: AdditionalChargeRefundAllocationErrorCode) {
    super(code);
    this.name = "AdditionalChargeRefundAllocationError";
  }
}

export type AdditionalChargeRefundAllocationCandidate = Readonly<{
  additionalChargeId: string;
  reservationId: string;
  paymentId: string;
  paymentRequestId: string;
  status: AdditionalChargeStatus;
  capturedAmount: Prisma.Decimal;
  currency: string;
  committedRefundAmount: Prisma.Decimal;
  requestedRefundAmount: Prisma.Decimal;
}>;

export type AdditionalChargeRefundAllocationPlan = Readonly<{
  additionalChargeId: string;
  allocatedAmount: Prisma.Decimal;
  capturedAmount: Prisma.Decimal;
  committedRefundAmountBefore: Prisma.Decimal;
  remainingRefundableAmountBefore: Prisma.Decimal;
  remainingRefundableAmountAfter: Prisma.Decimal;
}>;

const REFUNDABLE_ADDITIONAL_CHARGE_STATUSES = new Set<AdditionalChargeStatus>([
  AdditionalChargeStatus.PAID,
  AdditionalChargeStatus.PARTIALLY_REFUNDED,
]);

function zero(): Prisma.Decimal {
  return new Prisma.Decimal(0);
}

function decimal(value: Prisma.Decimal): Prisma.Decimal {
  return value.toDecimalPlaces(2);
}

export function resolveAdditionalChargeStatusFromApprovedRefunds(
  capturedAmount: Prisma.Decimal,
  approvedRefundedAmount: Prisma.Decimal,
): AdditionalChargeStatus {
  const captured = decimal(capturedAmount);
  const refunded = decimal(approvedRefundedAmount);

  if (
    captured.lessThanOrEqualTo(0) ||
    refunded.lessThan(0) ||
    refunded.greaterThan(captured)
  ) {
    throw new AdditionalChargeRefundAllocationError(
      "ADDITIONAL_CHARGE_REFUND_ALLOCATION_INCONSISTENT",
    );
  }

  if (refunded.equals(0)) {
    return AdditionalChargeStatus.PAID;
  }

  return refunded.equals(captured)
    ? AdditionalChargeStatus.REFUNDED
    : AdditionalChargeStatus.PARTIALLY_REFUNDED;
}

export function buildAdditionalChargeRefundAllocationPlan(input: Readonly<{
  reservationId: string;
  paymentId: string;
  paymentRequestId: string;
  amount: Prisma.Decimal;
  currency: string;
  candidates: readonly AdditionalChargeRefundAllocationCandidate[];
}>): readonly AdditionalChargeRefundAllocationPlan[] {
  const amount = decimal(input.amount);
  const seenChargeIds = new Set<string>();
  let requestedTotal = zero();

  if (amount.lessThanOrEqualTo(0) || input.candidates.length === 0) {
    throw new AdditionalChargeRefundAllocationError(
      "ADDITIONAL_CHARGE_REFUND_ALLOCATION_AMOUNT_MISMATCH",
    );
  }

  const plans = input.candidates.map((candidate) => {
    if (
      seenChargeIds.has(candidate.additionalChargeId) ||
      candidate.reservationId !== input.reservationId ||
      candidate.paymentId !== input.paymentId ||
      candidate.paymentRequestId !== input.paymentRequestId ||
      candidate.currency !== input.currency ||
      candidate.capturedAmount.lessThanOrEqualTo(0) ||
      candidate.committedRefundAmount.lessThan(0)
    ) {
      throw new AdditionalChargeRefundAllocationError(
        "ADDITIONAL_CHARGE_REFUND_ALLOCATION_INCONSISTENT",
      );
    }

    if (!REFUNDABLE_ADDITIONAL_CHARGE_STATUSES.has(candidate.status)) {
      throw new AdditionalChargeRefundAllocationError(
        "ADDITIONAL_CHARGE_REFUND_ALLOCATION_CHARGE_NOT_ELIGIBLE",
      );
    }

    seenChargeIds.add(candidate.additionalChargeId);
    const capturedAmount = decimal(candidate.capturedAmount);
    const committedRefundAmount = decimal(candidate.committedRefundAmount);
    const allocatedAmount = decimal(candidate.requestedRefundAmount);
    const remainingRefundableAmount = capturedAmount.sub(committedRefundAmount);

    if (
      committedRefundAmount.greaterThan(capturedAmount) ||
      remainingRefundableAmount.lessThan(0)
    ) {
      throw new AdditionalChargeRefundAllocationError(
        "ADDITIONAL_CHARGE_REFUND_ALLOCATION_INCONSISTENT",
      );
    }

    if (
      allocatedAmount.lessThanOrEqualTo(0) ||
      allocatedAmount.greaterThan(remainingRefundableAmount)
    ) {
      throw new AdditionalChargeRefundAllocationError(
        "ADDITIONAL_CHARGE_REFUND_ALLOCATION_EXCEEDS_BALANCE",
      );
    }

    requestedTotal = requestedTotal.add(allocatedAmount).toDecimalPlaces(2);

    return {
      additionalChargeId: candidate.additionalChargeId,
      allocatedAmount,
      capturedAmount,
      committedRefundAmountBefore: committedRefundAmount,
      remainingRefundableAmountBefore: remainingRefundableAmount.toDecimalPlaces(2),
      remainingRefundableAmountAfter: remainingRefundableAmount
        .sub(allocatedAmount)
        .toDecimalPlaces(2),
    };
  });

  if (!requestedTotal.equals(amount)) {
    throw new AdditionalChargeRefundAllocationError(
      "ADDITIONAL_CHARGE_REFUND_ALLOCATION_AMOUNT_MISMATCH",
    );
  }

  return plans;
}
