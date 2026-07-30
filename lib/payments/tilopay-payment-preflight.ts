import { PaymentProvider, PaymentStatus } from "@prisma/client";

import { prisma } from "@/lib/db/prisma";
import {
  isLifecycleAdjustmentHandoffToken,
  LifecycleAdjustmentHandoffError,
  prepareLifecycleAdjustmentPayment,
} from "@/lib/payments/lifecycle-adjustment-handoff";
import {
  PaymentHandoffValidationError,
  validatePaymentHandoff,
} from "@/lib/reservations/payment-handoff";
import type { PaymentAttemptErrorCode } from "@/types/payment-attempt";
import type { ReservationQuoteAmount } from "@/types/reservation-quote";
import type { TilopayPaymentPreflight } from "@/types/tilopay-payment-preflight";

type StoredPaymentAmount = Readonly<{ toString: () => string }>;
type StoredPayment = Readonly<{
  id: string;
  reservationId: string;
  provider: PaymentProvider;
  status: PaymentStatus;
  amount: StoredPaymentAmount;
  currency: string;
}>;

export class TilopayPaymentPreflightError extends Error {
  readonly code: PaymentAttemptErrorCode;

  constructor(code: PaymentAttemptErrorCode) {
    super(code);
    this.name = "TilopayPaymentPreflightError";
    this.code = code;
  }
}

function toAmountCents(value: StoredPaymentAmount): number {
  const amount = Number(value.toString());

  if (!Number.isFinite(amount) || amount < 0) {
    throw new TilopayPaymentPreflightError(
      "PAYMENT_ATTEMPT_AMOUNT_MISMATCH",
    );
  }

  const amountCents = Math.round(amount * 100);

  if (!Number.isSafeInteger(amountCents)) {
    throw new TilopayPaymentPreflightError(
      "PAYMENT_ATTEMPT_AMOUNT_MISMATCH",
    );
  }

  return amountCents;
}

function assertPaymentMatchesAmount(
  payment: StoredPayment,
  expectedTotal: ReservationQuoteAmount,
): void {
  if (
    payment.currency !== expectedTotal.currency ||
    toAmountCents(payment.amount) !== expectedTotal.amountCents
  ) {
    throw new TilopayPaymentPreflightError(
      "PAYMENT_ATTEMPT_AMOUNT_MISMATCH",
    );
  }
}

function mapLifecycleError(
  error: LifecycleAdjustmentHandoffError,
): TilopayPaymentPreflightError {
  switch (error.code) {
    case "LIFECYCLE_ADJUSTMENT_HANDOFF_EXPIRED":
      return new TilopayPaymentPreflightError("PENDING_HOLD_EXPIRED");
    case "LIFECYCLE_ADJUSTMENT_NOT_PAYABLE":
      return new TilopayPaymentPreflightError("PENDING_HOLD_NOT_PAYABLE");
    case "LIFECYCLE_ADJUSTMENT_PAYMENT_MISMATCH":
      return new TilopayPaymentPreflightError(
        "PAYMENT_ATTEMPT_AMOUNT_MISMATCH",
      );
    case "INVALID_LIFECYCLE_ADJUSTMENT_HANDOFF":
    default:
      return new TilopayPaymentPreflightError(
        "INVALID_PAYMENT_HANDOFF_REQUEST",
      );
  }
}

async function validateLifecycleAdjustmentPreflight(input: Readonly<{
  reservationId: string;
  paymentId: string;
}>): Promise<TilopayPaymentPreflight> {
  let prepared;

  try {
    prepared = await prepareLifecycleAdjustmentPayment(input.reservationId);
  } catch (error) {
    if (error instanceof LifecycleAdjustmentHandoffError) {
      throw mapLifecycleError(error);
    }

    throw error;
  }

  if (
    prepared.payment.id !== input.paymentId ||
    prepared.payment.status !== PaymentStatus.PENDING
  ) {
    throw new TilopayPaymentPreflightError(
      "PAYMENT_ATTEMPT_UNEXPECTED_ERROR",
    );
  }

  return {
    paymentId: prepared.payment.id,
    reservationId: prepared.token,
    status: "READY_FOR_PAYMENT",
    expiresAt: prepared.expiresAt,
    phaseBoundary: "LIFECYCLE_ADJUSTMENT_PREFLIGHT_READY",
  };
}

export async function validateTilopayPaymentPreflight(input: Readonly<{
  reservationId: string;
  paymentId: string;
  locale: "es" | "en";
}>): Promise<TilopayPaymentPreflight> {
  if (isLifecycleAdjustmentHandoffToken(input.reservationId)) {
    return validateLifecycleAdjustmentPreflight(input);
  }

  let validation: Awaited<ReturnType<typeof validatePaymentHandoff>>;

  try {
    validation = await validatePaymentHandoff({
      reservationId: input.reservationId,
      locale: input.locale,
    });
  } catch (error) {
    if (error instanceof PaymentHandoffValidationError) {
      throw new TilopayPaymentPreflightError(error.code);
    }

    throw error;
  }

  const payment = await prisma.payment.findFirst({
    where: {
      id: input.paymentId,
      reservationId: validation.reservationId,
      provider: PaymentProvider.TILOPAY,
      status: PaymentStatus.PENDING,
    },
    select: {
      id: true,
      reservationId: true,
      provider: true,
      status: true,
      amount: true,
      currency: true,
    },
  });

  if (!payment) {
    throw new TilopayPaymentPreflightError(
      "PAYMENT_ATTEMPT_UNEXPECTED_ERROR",
    );
  }

  assertPaymentMatchesAmount(payment, validation.total);

  return {
    paymentId: payment.id,
    reservationId: validation.reservationId,
    status: "READY_FOR_PAYMENT",
    expiresAt: validation.expiresAt,
    phaseBoundary: "TILOPAY_PREFLIGHT_READY",
  };
}
