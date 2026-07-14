import { PaymentProvider, PaymentStatus } from "@prisma/client";

import { prisma } from "@/lib/db/prisma";
import {
  PaymentHandoffValidationError,
  validatePaymentHandoff,
} from "@/lib/reservations/payment-handoff";
import type { PaymentAttemptErrorCode } from "@/types/payment-attempt";
import type { ReservationQuoteAmount } from "@/types/reservation-quote";
import type { TilopayPaymentPreflight } from "@/types/tilopay-payment-preflight";

type StoredPaymentAmount = Readonly<{
  toString: () => string;
}>;

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
    throw new TilopayPaymentPreflightError("PAYMENT_ATTEMPT_AMOUNT_MISMATCH");
  }

  const amountCents = Math.round(amount * 100);

  if (!Number.isSafeInteger(amountCents)) {
    throw new TilopayPaymentPreflightError("PAYMENT_ATTEMPT_AMOUNT_MISMATCH");
  }

  return amountCents;
}

function assertPaymentMatchesCurrentReservation(
  payment: StoredPayment,
  expectedTotal: ReservationQuoteAmount,
): void {
  const paymentAmountCents = toAmountCents(payment.amount);

  if (payment.currency !== expectedTotal.currency || paymentAmountCents !== expectedTotal.amountCents) {
    throw new TilopayPaymentPreflightError("PAYMENT_ATTEMPT_AMOUNT_MISMATCH");
  }
}

export async function validateTilopayPaymentPreflight(input: Readonly<{
  reservationId: string;
  paymentId: string;
  locale: "es" | "en";
}>): Promise<TilopayPaymentPreflight> {
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
    throw new TilopayPaymentPreflightError("PAYMENT_ATTEMPT_UNEXPECTED_ERROR");
  }

  assertPaymentMatchesCurrentReservation(payment, validation.total);

  return {
    paymentId: payment.id,
    reservationId: validation.reservationId,
    status: "READY_FOR_PAYMENT",
    expiresAt: validation.expiresAt,
    phaseBoundary: "TILOPAY_PREFLIGHT_READY",
  };
}
