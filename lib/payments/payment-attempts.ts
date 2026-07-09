import { PaymentProvider, PaymentStatus } from "@prisma/client";

import { prisma } from "@/lib/db/prisma";
import {
  PaymentHandoffValidationError,
  validatePaymentHandoff,
} from "@/lib/reservations/payment-handoff";
import type {
  CreatePaymentAttemptInput,
  PaymentAttempt,
} from "@/types/payment-attempt";
import type { ReservationQuoteAmount } from "@/types/reservation-quote";

export type PaymentAttemptCreationErrorCode =
  | PaymentHandoffValidationError["code"]
  | "PAYMENT_ATTEMPT_AMOUNT_MISMATCH";

export class PaymentAttemptCreationError extends Error {
  readonly code: PaymentAttemptCreationErrorCode;

  constructor(code: PaymentAttemptCreationErrorCode) {
    super(code);
    this.name = "PaymentAttemptCreationError";
    this.code = code;
  }
}

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

function toAmountCents(value: StoredPaymentAmount): number {
  const amount = Number(value.toString());

  if (!Number.isFinite(amount) || amount < 0) {
    throw new PaymentAttemptCreationError("PAYMENT_ATTEMPT_AMOUNT_MISMATCH");
  }

  const amountCents = Math.round(amount * 100);

  if (!Number.isSafeInteger(amountCents)) {
    throw new PaymentAttemptCreationError("PAYMENT_ATTEMPT_AMOUNT_MISMATCH");
  }

  return amountCents;
}

function buildPaymentAmount(
  amount: StoredPaymentAmount,
  currency: string,
): ReservationQuoteAmount {
  if (currency !== "USD") {
    throw new PaymentAttemptCreationError("PAYMENT_ATTEMPT_AMOUNT_MISMATCH");
  }

  return {
    currency,
    amountCents: toAmountCents(amount),
    amount: amount.toString(),
  };
}

function assertPaymentMatchesCurrentReservation(
  payment: StoredPayment,
  expectedTotal: ReservationQuoteAmount,
): void {
  const paymentAmountCents = toAmountCents(payment.amount);

  if (payment.currency !== expectedTotal.currency || paymentAmountCents !== expectedTotal.amountCents) {
    throw new PaymentAttemptCreationError("PAYMENT_ATTEMPT_AMOUNT_MISMATCH");
  }
}

function mapPaymentAttempt(
  payment: StoredPayment,
  validation: Awaited<ReturnType<typeof validatePaymentHandoff>>,
  existing: boolean,
): PaymentAttempt {
  return {
    id: payment.id,
    reservationId: validation.reservationId,
    reservationStatus: validation.reservationStatus,
    provider: "TILOPAY",
    status: "PENDING",
    amount: buildPaymentAmount(payment.amount, payment.currency),
    currency: validation.currency,
    existing,
    expiresAt: validation.expiresAt,
    quote: validation.quote,
    futurePaymentProvider: "TILOPAY",
    phaseBoundary: "PAYMENT_PROVIDER_NOT_INTEGRATED",
  };
}

export async function createPaymentAttemptForPendingReservation(
  input: CreatePaymentAttemptInput,
): Promise<PaymentAttempt> {
  let validation: Awaited<ReturnType<typeof validatePaymentHandoff>>;

  try {
    validation = await validatePaymentHandoff(input);
  } catch (error) {
    if (error instanceof PaymentHandoffValidationError) {
      throw new PaymentAttemptCreationError(error.code);
    }

    throw error;
  }

  const existingPendingPayment = await prisma.payment.findFirst({
    where: {
      reservationId: validation.reservationId,
      provider: PaymentProvider.TILOPAY,
      status: PaymentStatus.PENDING,
    },
    orderBy: {
      createdAt: "desc",
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

  if (existingPendingPayment) {
    assertPaymentMatchesCurrentReservation(existingPendingPayment, validation.total);

    return mapPaymentAttempt(existingPendingPayment, validation, true);
  }

  const payment = await prisma.payment.create({
    data: {
      reservationId: validation.reservationId,
      provider: PaymentProvider.TILOPAY,
      status: PaymentStatus.PENDING,
      amount: validation.total.amount,
      currency: validation.currency,
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

  return mapPaymentAttempt(payment, validation, false);
}
