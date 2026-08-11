import {
  PaymentPurpose,
  PaymentStatus,
  Prisma,
  RefundStatus,
  ReservationLifecycleRequestStatus,
  ReservationLifecycleRequestType,
} from "@prisma/client";

import { prisma } from "@/lib/db/prisma";

const STAY_PAYMENT_HISTORY_STATUSES = new Set<PaymentStatus>([
  PaymentStatus.APPROVED,
  PaymentStatus.PARTIALLY_REFUNDED,
  PaymentStatus.REFUNDED,
]);
const COMMITTED_REFUND_STATUSES = new Set<RefundStatus>([
  RefundStatus.PENDING,
  RefundStatus.PROCESSING,
  RefundStatus.APPROVED,
  RefundStatus.MANUAL,
]);
const APPROVED_REFUND_STATUSES = new Set<RefundStatus>([
  RefundStatus.APPROVED,
  RefundStatus.MANUAL,
]);
const POSITIVE_STAY_ADJUSTMENT_TYPES =
  new Set<ReservationLifecycleRequestType>([
    ReservationLifecycleRequestType.DATE_CHANGE,
    ReservationLifecycleRequestType.STAY_EXTENSION,
  ]);

const reservationFinancialSummarySelect = {
  id: true,
  total: true,
  currency: true,
  payments: {
    where: {
      purpose: {
        in: [
          PaymentPurpose.INITIAL_RESERVATION,
          PaymentPurpose.LIFECYCLE_ADJUSTMENT,
        ],
      },
      status: {
        in: [
          PaymentStatus.APPROVED,
          PaymentStatus.PARTIALLY_REFUNDED,
          PaymentStatus.REFUNDED,
        ],
      },
    },
    orderBy: [{ createdAt: "asc" }, { id: "asc" }],
    select: {
      id: true,
      reservationId: true,
      lifecycleRequestId: true,
      purpose: true,
      status: true,
      amount: true,
      currency: true,
      providerReference: true,
      paidAt: true,
      createdAt: true,
      updatedAt: true,
      lifecycleRequest: {
        select: {
          id: true,
          reservationId: true,
          requestType: true,
          status: true,
          financialDifference: true,
          currency: true,
        },
      },
      refunds: {
        select: {
          id: true,
          amount: true,
          currency: true,
          status: true,
        },
      },
    },
  },
} satisfies Prisma.ReservationSelect;

type ReservationFinancialSummaryClient = Pick<
  Prisma.TransactionClient,
  "reservation"
>;

export type ReservationFinancialSummaryErrorCode =
  | "RESERVATION_FINANCIAL_SUMMARY_NOT_FOUND"
  | "RESERVATION_FINANCIAL_SUMMARY_INITIAL_PAYMENT_NOT_FOUND"
  | "RESERVATION_FINANCIAL_SUMMARY_INCONSISTENT";

export class ReservationFinancialSummaryError extends Error {
  constructor(public readonly code: ReservationFinancialSummaryErrorCode) {
    super(code);
    this.name = "ReservationFinancialSummaryError";
  }
}

export type ReservationFinancialRefundSnapshot = Readonly<{
  id: string;
  amount: Prisma.Decimal;
  currency: string;
  status: RefundStatus;
}>;

export type ReservationFinancialLifecycleSnapshot = Readonly<{
  id: string;
  reservationId: string;
  requestType: ReservationLifecycleRequestType;
  status: ReservationLifecycleRequestStatus;
  financialDifference: Prisma.Decimal | null;
  currency: string;
}>;

export type ReservationFinancialPaymentSnapshot = Readonly<{
  id: string;
  reservationId: string;
  lifecycleRequestId: string | null;
  purpose: PaymentPurpose;
  status: PaymentStatus;
  amount: Prisma.Decimal;
  currency: string;
  providerReference: string | null;
  paidAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
  lifecycleRequest: ReservationFinancialLifecycleSnapshot | null;
  refunds: readonly ReservationFinancialRefundSnapshot[];
}>;

export type ReservationFinancialSnapshot = Readonly<{
  id: string;
  total: Prisma.Decimal;
  currency: string;
  payments: readonly ReservationFinancialPaymentSnapshot[];
}>;

export type ReservationFinancialEligiblePayment = Readonly<{
  paymentId: string;
  lifecycleRequestId: string | null;
  purpose: PaymentPurpose;
  status: PaymentStatus;
  amount: Prisma.Decimal;
  currency: string;
  providerReference: string | null;
  paidAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
  committedRefundAmount: Prisma.Decimal;
  approvedRefundAmount: Prisma.Decimal;
  remainingRefundableAmount: Prisma.Decimal;
}>;

export type ReservationFinancialSummary = Readonly<{
  reservationId: string;
  currency: string;
  originalStayAmount: Prisma.Decimal;
  approvedCompletedPositiveStayAdjustments: Prisma.Decimal;
  currentStayValue: Prisma.Decimal;
  capturedStayPayments: Prisma.Decimal;
  committedStayRefunds: Prisma.Decimal;
  approvedStayRefunds: Prisma.Decimal;
  remainingRefundableStayBalance: Prisma.Decimal;
  additionalChargeGrossAmount: Prisma.Decimal;
  additionalChargeCapturedAmount: Prisma.Decimal;
  additionalChargeRefundedAmount: Prisma.Decimal;
  eligibleStayPayments: readonly ReservationFinancialEligiblePayment[];
}>;

function zero(): Prisma.Decimal {
  return new Prisma.Decimal(0);
}

function add(
  left: Prisma.Decimal,
  right: Prisma.Decimal,
): Prisma.Decimal {
  return left.add(right).toDecimalPlaces(2);
}

function sumRefunds(
  payment: ReservationFinancialPaymentSnapshot,
  statuses: ReadonlySet<RefundStatus>,
  reservationCurrency: string,
): Prisma.Decimal {
  return payment.refunds.reduce((total, refund) => {
    if (!statuses.has(refund.status)) {
      return total;
    }

    if (refund.currency !== reservationCurrency) {
      throw new ReservationFinancialSummaryError(
        "RESERVATION_FINANCIAL_SUMMARY_INCONSISTENT",
      );
    }

    return add(total, refund.amount);
  }, zero());
}

function isEligibleInitialPayment(
  payment: ReservationFinancialPaymentSnapshot,
  reservation: ReservationFinancialSnapshot,
): boolean {
  return (
    payment.purpose === PaymentPurpose.INITIAL_RESERVATION &&
    payment.lifecycleRequestId === null &&
    payment.reservationId === reservation.id &&
    payment.currency === reservation.currency &&
    STAY_PAYMENT_HISTORY_STATUSES.has(payment.status)
  );
}

function isEligibleCompletedPositiveAdjustment(
  payment: ReservationFinancialPaymentSnapshot,
  reservation: ReservationFinancialSnapshot,
): boolean {
  const lifecycleRequest = payment.lifecycleRequest;
  const difference = lifecycleRequest?.financialDifference;

  return Boolean(
    payment.purpose === PaymentPurpose.LIFECYCLE_ADJUSTMENT &&
      payment.reservationId === reservation.id &&
      payment.currency === reservation.currency &&
      STAY_PAYMENT_HISTORY_STATUSES.has(payment.status) &&
      payment.lifecycleRequestId &&
      lifecycleRequest &&
      payment.lifecycleRequestId === lifecycleRequest.id &&
      lifecycleRequest.reservationId === reservation.id &&
      lifecycleRequest.currency === reservation.currency &&
      POSITIVE_STAY_ADJUSTMENT_TYPES.has(lifecycleRequest.requestType) &&
      lifecycleRequest.status === ReservationLifecycleRequestStatus.COMPLETED &&
      difference &&
      difference.greaterThan(0) &&
      payment.amount.equals(difference) &&
      payment.paidAt,
  );
}

function paymentSort(
  left: ReservationFinancialPaymentSnapshot,
  right: ReservationFinancialPaymentSnapshot,
): number {
  const leftInitial = left.purpose === PaymentPurpose.INITIAL_RESERVATION;
  const rightInitial = right.purpose === PaymentPurpose.INITIAL_RESERVATION;

  if (leftInitial !== rightInitial) {
    return leftInitial ? -1 : 1;
  }

  const leftTimestamp = (left.paidAt ?? left.createdAt).getTime();
  const rightTimestamp = (right.paidAt ?? right.createdAt).getTime();

  if (leftTimestamp !== rightTimestamp) {
    return leftTimestamp - rightTimestamp;
  }

  const createdAtDifference =
    left.createdAt.getTime() - right.createdAt.getTime();

  if (createdAtDifference !== 0) {
    return createdAtDifference;
  }

  return left.id.localeCompare(right.id);
}

function toEligiblePayment(
  payment: ReservationFinancialPaymentSnapshot,
  reservationCurrency: string,
): ReservationFinancialEligiblePayment {
  if (
    payment.amount.lessThanOrEqualTo(0) ||
    payment.currency !== reservationCurrency
  ) {
    throw new ReservationFinancialSummaryError(
      "RESERVATION_FINANCIAL_SUMMARY_INCONSISTENT",
    );
  }

  const committedRefundAmount = sumRefunds(
    payment,
    COMMITTED_REFUND_STATUSES,
    reservationCurrency,
  );
  const approvedRefundAmount = sumRefunds(
    payment,
    APPROVED_REFUND_STATUSES,
    reservationCurrency,
  );

  if (
    committedRefundAmount.greaterThan(payment.amount) ||
    approvedRefundAmount.greaterThan(committedRefundAmount)
  ) {
    throw new ReservationFinancialSummaryError(
      "RESERVATION_FINANCIAL_SUMMARY_INCONSISTENT",
    );
  }

  return {
    paymentId: payment.id,
    lifecycleRequestId: payment.lifecycleRequestId,
    purpose: payment.purpose,
    status: payment.status,
    amount: payment.amount.toDecimalPlaces(2),
    currency: payment.currency,
    providerReference: payment.providerReference,
    paidAt: payment.paidAt,
    createdAt: payment.createdAt,
    updatedAt: payment.updatedAt,
    committedRefundAmount,
    approvedRefundAmount,
    remainingRefundableAmount: payment.amount
      .sub(committedRefundAmount)
      .toDecimalPlaces(2),
  };
}

export function buildReservationFinancialSummary(
  reservation: ReservationFinancialSnapshot,
): ReservationFinancialSummary {
  if (
    !reservation.id.trim() ||
    !reservation.currency.trim() ||
    reservation.total.lessThan(0)
  ) {
    throw new ReservationFinancialSummaryError(
      "RESERVATION_FINANCIAL_SUMMARY_INCONSISTENT",
    );
  }

  const initialPayments = reservation.payments.filter((payment) =>
    isEligibleInitialPayment(payment, reservation),
  );

  if (initialPayments.length === 0) {
    throw new ReservationFinancialSummaryError(
      "RESERVATION_FINANCIAL_SUMMARY_INITIAL_PAYMENT_NOT_FOUND",
    );
  }

  if (initialPayments.length !== 1) {
    throw new ReservationFinancialSummaryError(
      "RESERVATION_FINANCIAL_SUMMARY_INCONSISTENT",
    );
  }

  const positiveAdjustments = reservation.payments.filter((payment) =>
    isEligibleCompletedPositiveAdjustment(payment, reservation),
  );
  const seenLifecycleRequests = new Set<string>();

  for (const payment of positiveAdjustments) {
    const lifecycleRequestId = payment.lifecycleRequestId;

    if (
      !lifecycleRequestId ||
      seenLifecycleRequests.has(lifecycleRequestId)
    ) {
      throw new ReservationFinancialSummaryError(
        "RESERVATION_FINANCIAL_SUMMARY_INCONSISTENT",
      );
    }

    seenLifecycleRequests.add(lifecycleRequestId);
  }

  const eligiblePayments = [...initialPayments, ...positiveAdjustments]
    .sort(paymentSort)
    .map((payment) =>
      toEligiblePayment(payment, reservation.currency),
    );

  const originalStayAmount = initialPayments[0].amount.toDecimalPlaces(2);
  const approvedCompletedPositiveStayAdjustments =
    positiveAdjustments.reduce(
      (total, payment) => add(total, payment.amount),
      zero(),
    );
  const capturedStayPayments = eligiblePayments.reduce(
    (total, payment) => add(total, payment.amount),
    zero(),
  );
  const committedStayRefunds = eligiblePayments.reduce(
    (total, payment) => add(total, payment.committedRefundAmount),
    zero(),
  );
  const approvedStayRefunds = eligiblePayments.reduce(
    (total, payment) => add(total, payment.approvedRefundAmount),
    zero(),
  );
  const remainingRefundableStayBalance = eligiblePayments.reduce(
    (total, payment) => add(total, payment.remainingRefundableAmount),
    zero(),
  );
  const currentStayValue = reservation.total.toDecimalPlaces(2);

  if (currentStayValue.greaterThan(capturedStayPayments)) {
    throw new ReservationFinancialSummaryError(
      "RESERVATION_FINANCIAL_SUMMARY_INCONSISTENT",
    );
  }

  return {
    reservationId: reservation.id,
    currency: reservation.currency,
    originalStayAmount,
    approvedCompletedPositiveStayAdjustments,
    currentStayValue,
    capturedStayPayments,
    committedStayRefunds,
    approvedStayRefunds,
    remainingRefundableStayBalance,
    additionalChargeGrossAmount: zero(),
    additionalChargeCapturedAmount: zero(),
    additionalChargeRefundedAmount: zero(),
    eligibleStayPayments: eligiblePayments,
  };
}

export async function getReservationFinancialSummary(
  reservationId: string,
  client: ReservationFinancialSummaryClient = prisma,
): Promise<ReservationFinancialSummary> {
  const id = reservationId.trim();

  if (!id || id.length > 120) {
    throw new ReservationFinancialSummaryError(
      "RESERVATION_FINANCIAL_SUMMARY_NOT_FOUND",
    );
  }

  const reservation = await client.reservation.findUnique({
    where: { id },
    select: reservationFinancialSummarySelect,
  });

  if (!reservation) {
    throw new ReservationFinancialSummaryError(
      "RESERVATION_FINANCIAL_SUMMARY_NOT_FOUND",
    );
  }

  return buildReservationFinancialSummary(reservation);
}
