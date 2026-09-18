import {
  AdditionalChargeStatus,
  PaymentStatus,
  Prisma,
  RefundAuthorizationType,
  RefundStatus,
} from "@prisma/client";

export type AdditionalChargeRefundTimelineRecord = Readonly<{
  id: string;
  status: RefundStatus;
  approvedAt: Date | null;
  updatedAt: Date;
  createdAt: Date;
}>;

export type AdditionalChargeRefundStateAllocation = Readonly<{
  allocatedAmount: Prisma.Decimal;
  refund: AdditionalChargeRefundTimelineRecord;
}>;

export type AdditionalChargeRefundStateAtTarget = Readonly<{
  cumulativeRefundedAmount: Prisma.Decimal;
  remainingAmount: Prisma.Decimal;
  resultingStatus: AdditionalChargeStatus;
}>;

export type AdditionalChargePaymentRefundStateRecord =
  AdditionalChargeRefundTimelineRecord &
    Readonly<{
      authorizationType: RefundAuthorizationType;
      amount: Prisma.Decimal;
    }>;

export type AdditionalChargePaymentRefundStateAtTarget = Readonly<{
  cumulativeRefundedAmount: Prisma.Decimal;
  remainingAmount: Prisma.Decimal;
  resultingStatus: PaymentStatus;
}>;

function decimalCents(value: Prisma.Decimal): number {
  return value.mul(100).toDecimalPlaces(0).toNumber();
}

function centsDecimal(value: number): Prisma.Decimal {
  return new Prisma.Decimal(value).div(100).toDecimalPlaces(2);
}

export function effectiveRefundTimestamp(
  refund: AdditionalChargeRefundTimelineRecord,
): Date {
  return refund.approvedAt ?? refund.updatedAt ?? refund.createdAt;
}

export function isCompletedAncillaryRefundStatus(
  status: RefundStatus,
): boolean {
  return status === RefundStatus.APPROVED || status === RefundStatus.MANUAL;
}

export function isRefundEffectiveThroughTarget(
  candidateRefund: AdditionalChargeRefundTimelineRecord,
  targetRefund: AdditionalChargeRefundTimelineRecord,
): boolean {
  if (!isCompletedAncillaryRefundStatus(candidateRefund.status)) {
    return false;
  }

  const candidateAt = effectiveRefundTimestamp(candidateRefund);
  const targetAt = effectiveRefundTimestamp(targetRefund);
  const timestampOrder = candidateAt.getTime() - targetAt.getTime();

  if (timestampOrder !== 0) {
    return timestampOrder < 0;
  }

  return candidateRefund.id <= targetRefund.id;
}

export function deriveAdditionalChargeRefundStateAtTarget(input: Readonly<{
  originalAmount: Prisma.Decimal;
  allocations: readonly AdditionalChargeRefundStateAllocation[];
  targetRefund: AdditionalChargeRefundTimelineRecord;
}>): AdditionalChargeRefundStateAtTarget {
  const originalCents = decimalCents(input.originalAmount);
  const cumulativeRefundedCents = input.allocations
    .filter((allocation) =>
      isRefundEffectiveThroughTarget(
        allocation.refund,
        input.targetRefund,
      ),
    )
    .reduce(
      (total, allocation) => total + decimalCents(allocation.allocatedAmount),
      0,
    );
  const remainingCents = Math.max(
    originalCents - cumulativeRefundedCents,
    0,
  );

  return {
    cumulativeRefundedAmount: centsDecimal(cumulativeRefundedCents),
    remainingAmount: centsDecimal(remainingCents),
    resultingStatus:
      cumulativeRefundedCents <= 0
        ? AdditionalChargeStatus.PAID
        : cumulativeRefundedCents >= originalCents
          ? AdditionalChargeStatus.REFUNDED
          : AdditionalChargeStatus.PARTIALLY_REFUNDED,
  };
}

export function deriveAdditionalChargePaymentRefundStateAtTarget(
  input: Readonly<{
    paymentAmount: Prisma.Decimal;
    refunds: readonly AdditionalChargePaymentRefundStateRecord[];
    targetRefund: AdditionalChargeRefundTimelineRecord;
  }>,
): AdditionalChargePaymentRefundStateAtTarget {
  const paymentCents = decimalCents(input.paymentAmount);
  const cumulativeRefundedCents = input.refunds
    .filter(
      (refund) =>
        refund.authorizationType === RefundAuthorizationType.ADDITIONAL_CHARGE &&
        isRefundEffectiveThroughTarget(refund, input.targetRefund),
    )
    .reduce((total, refund) => total + decimalCents(refund.amount), 0);
  const remainingCents = Math.max(paymentCents - cumulativeRefundedCents, 0);

  return {
    cumulativeRefundedAmount: centsDecimal(cumulativeRefundedCents),
    remainingAmount: centsDecimal(remainingCents),
    resultingStatus:
      cumulativeRefundedCents <= 0
        ? PaymentStatus.APPROVED
        : cumulativeRefundedCents >= paymentCents
          ? PaymentStatus.REFUNDED
          : PaymentStatus.PARTIALLY_REFUNDED,
  };
}
