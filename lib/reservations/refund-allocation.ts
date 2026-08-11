import { Prisma } from "@prisma/client";

import type { ReservationFinancialEligiblePayment } from "./financial-summary";

export type ReservationRefundAllocationErrorCode =
  | "RESERVATION_REFUND_ALLOCATION_INVALID_AMOUNT"
  | "RESERVATION_REFUND_ALLOCATION_INSUFFICIENT_BALANCE"
  | "RESERVATION_REFUND_ALLOCATION_INCONSISTENT";

export class ReservationRefundAllocationError extends Error {
  constructor(public readonly code: ReservationRefundAllocationErrorCode) {
    super(code);
    this.name = "ReservationRefundAllocationError";
  }
}

export type ReservationRefundAllocationLeg = Readonly<{
  paymentId: string;
  amount: Prisma.Decimal;
  currency: string;
  providerReference: string | null;
  expectedPaymentUpdatedAt: Date;
}>;

export type ReservationRefundAllocation = Readonly<{
  requestedAmount: Prisma.Decimal;
  allocatedAmount: Prisma.Decimal;
  legs: readonly ReservationRefundAllocationLeg[];
}>;

function zero(): Prisma.Decimal {
  return new Prisma.Decimal(0);
}

export function allocateReservationRefund(
  requestedAmount: Prisma.Decimal,
  eligibleStayPayments: readonly ReservationFinancialEligiblePayment[],
): ReservationRefundAllocation {
  const normalizedAmount = requestedAmount.toDecimalPlaces(2);

  if (!normalizedAmount.greaterThan(0)) {
    throw new ReservationRefundAllocationError(
      "RESERVATION_REFUND_ALLOCATION_INVALID_AMOUNT",
    );
  }

  let remaining = normalizedAmount;
  const legs: ReservationRefundAllocationLeg[] = [];

  for (const payment of eligibleStayPayments) {
    if (!remaining.greaterThan(0)) {
      break;
    }

    const paymentRemaining = payment.remainingRefundableAmount.toDecimalPlaces(2);

    if (paymentRemaining.lessThan(0)) {
      throw new ReservationRefundAllocationError(
        "RESERVATION_REFUND_ALLOCATION_INCONSISTENT",
      );
    }

    if (paymentRemaining.equals(0)) {
      continue;
    }

    const legAmount = paymentRemaining.lessThan(remaining)
      ? paymentRemaining
      : remaining;

    if (!legAmount.greaterThan(0)) {
      continue;
    }

    legs.push({
      paymentId: payment.paymentId,
      amount: legAmount.toDecimalPlaces(2),
      currency: payment.currency,
      providerReference: payment.providerReference,
      expectedPaymentUpdatedAt: payment.updatedAt,
    });
    remaining = remaining.sub(legAmount).toDecimalPlaces(2);
  }

  if (remaining.greaterThan(0)) {
    throw new ReservationRefundAllocationError(
      "RESERVATION_REFUND_ALLOCATION_INSUFFICIENT_BALANCE",
    );
  }

  const allocatedAmount = legs.reduce(
    (total, leg) => total.add(leg.amount).toDecimalPlaces(2),
    zero(),
  );

  if (!allocatedAmount.equals(normalizedAmount) || legs.length === 0) {
    throw new ReservationRefundAllocationError(
      "RESERVATION_REFUND_ALLOCATION_INCONSISTENT",
    );
  }

  return {
    requestedAmount: normalizedAmount,
    allocatedAmount,
    legs,
  };
}
