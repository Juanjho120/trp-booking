import { ReservationStatus } from "@prisma/client";

import { getAvailabilityBlockingRecords } from "@/lib/availability/service";
import { dateOnlyFromDate } from "@/lib/availability/rules";
import { prisma } from "@/lib/db/prisma";
import { calculateReservationQuote, ReservationQuoteError } from "@/lib/reservations/pricing";
import type { AccommodationId } from "@/types/accommodation";
import type { DateOnlyString } from "@/types/availability";
import type {
  PaymentHandoffValidation,
  ValidatePaymentHandoffInput,
} from "@/types/reservation-payment-handoff";
import type { ReservationQuote } from "@/types/reservation-quote";

export type PaymentHandoffValidationErrorCode =
  | "INVALID_PAYMENT_HANDOFF_REQUEST"
  | "PENDING_HOLD_NOT_FOUND"
  | "PENDING_HOLD_NOT_PAYABLE"
  | "PENDING_HOLD_EXPIRED"
  | "PAYMENT_HANDOFF_UNAVAILABLE_DATES"
  | "PAYMENT_HANDOFF_QUOTE_CHANGED";

export class PaymentHandoffValidationError extends Error {
  readonly code: PaymentHandoffValidationErrorCode;

  constructor(code: PaymentHandoffValidationErrorCode) {
    super(code);
    this.name = "PaymentHandoffValidationError";
    this.code = code;
  }
}

const allowedAccommodationIds: readonly AccommodationId[] = [
  "black-white-apartment",
  "perfect-retreat-bungalow",
  "complete-retreat",
];

type StoredReservationAmount = Readonly<{
  toString: () => string;
}>;

function assertReservationId(reservationId: string): void {
  if (reservationId.trim().length < 1 || reservationId.trim().length > 120) {
    throw new PaymentHandoffValidationError("INVALID_PAYMENT_HANDOFF_REQUEST");
  }
}

function toAccommodationId(value: string): AccommodationId {
  if (!allowedAccommodationIds.includes(value as AccommodationId)) {
    throw new PaymentHandoffValidationError("PENDING_HOLD_NOT_PAYABLE");
  }

  return value as AccommodationId;
}

function toAmountCents(value: StoredReservationAmount): number {
  const amount = Number(value.toString());

  if (!Number.isFinite(amount) || amount < 0) {
    throw new PaymentHandoffValidationError("PAYMENT_HANDOFF_QUOTE_CHANGED");
  }

  const amountCents = Math.round(amount * 100);

  if (!Number.isSafeInteger(amountCents)) {
    throw new PaymentHandoffValidationError("PAYMENT_HANDOFF_QUOTE_CHANGED");
  }

  return amountCents;
}

function assertStoredQuoteStillMatchesReservation(
  reservation: Readonly<{
    subtotal: StoredReservationAmount;
    cleaningFee: StoredReservationAmount;
    taxes: StoredReservationAmount;
    discounts: StoredReservationAmount;
    total: StoredReservationAmount;
    currency: string;
  }>,
  quote: ReservationQuote,
): void {
  const storedAmounts = {
    subtotal: toAmountCents(reservation.subtotal),
    cleaningFee: toAmountCents(reservation.cleaningFee),
    taxes: toAmountCents(reservation.taxes),
    discounts: toAmountCents(reservation.discounts),
    total: toAmountCents(reservation.total),
  };

  if (
    reservation.currency !== quote.currency ||
    storedAmounts.subtotal !== quote.subtotal.amountCents ||
    storedAmounts.cleaningFee !== quote.cleaningFee.amountCents ||
    storedAmounts.taxes !== quote.taxes.amountCents ||
    storedAmounts.discounts !== quote.discounts.amountCents ||
    storedAmounts.total !== quote.total.amountCents
  ) {
    throw new PaymentHandoffValidationError("PAYMENT_HANDOFF_QUOTE_CHANGED");
  }
}

function mapQuoteError(error: ReservationQuoteError): PaymentHandoffValidationError {
  switch (error.code) {
    case "INVALID_ACCOMMODATION":
    case "INVALID_DATE_RANGE":
    case "INVALID_GUEST_COUNT":
    case "INVALID_QUOTE_REQUEST":
    default:
      return new PaymentHandoffValidationError("PENDING_HOLD_NOT_PAYABLE");
  }
}

export async function validatePaymentHandoff(
  input: ValidatePaymentHandoffInput,
): Promise<PaymentHandoffValidation> {
  assertReservationId(input.reservationId);

  const now = new Date();
  const reservation = await prisma.reservation.findUnique({
    where: {
      id: input.reservationId.trim(),
    },
    select: {
      id: true,
      propertyId: true,
      status: true,
      checkInDate: true,
      checkOutDate: true,
      guestCount: true,
      subtotal: true,
      cleaningFee: true,
      taxes: true,
      discounts: true,
      total: true,
      currency: true,
      expiresAt: true,
    },
  });

  if (!reservation) {
    throw new PaymentHandoffValidationError("PENDING_HOLD_NOT_FOUND");
  }

  if (reservation.status !== ReservationStatus.PENDING_PAYMENT) {
    throw new PaymentHandoffValidationError("PENDING_HOLD_NOT_PAYABLE");
  }

  if (!reservation.expiresAt || reservation.expiresAt <= now) {
    throw new PaymentHandoffValidationError("PENDING_HOLD_EXPIRED");
  }

  const accommodationId = toAccommodationId(reservation.propertyId);
  const checkInDate = dateOnlyFromDate(reservation.checkInDate);
  const checkOutDate = dateOnlyFromDate(reservation.checkOutDate);

  let quote: ReservationQuote;

  try {
    quote = await calculateReservationQuote({
      accommodationId,
      checkInDate,
      checkOutDate,
      guestCount: reservation.guestCount,
    });
  } catch (error) {
    if (error instanceof ReservationQuoteError) {
      throw mapQuoteError(error);
    }

    throw error;
  }

  assertStoredQuoteStillMatchesReservation(reservation, quote);

  const blockingRecords = await getAvailabilityBlockingRecords(
    {
      accommodationId,
      startDate: checkInDate,
      endDate: checkOutDate,
    },
    {
      now,
    },
  );
  const conflictingBlockingRecords = blockingRecords.filter(
    (blockingRecord) => blockingRecord.reservationId !== reservation.id,
  );

  if (conflictingBlockingRecords.length > 0) {
    throw new PaymentHandoffValidationError("PAYMENT_HANDOFF_UNAVAILABLE_DATES");
  }

  return {
    reservationId: reservation.id,
    reservationStatus: "PENDING_PAYMENT",
    status: "READY_FOR_PAYMENT",
    readyForPayment: true,
    expiresAt: reservation.expiresAt.toISOString(),
    accommodationId,
    accommodationSlug: quote.accommodationSlug,
    checkInDate: checkInDate as DateOnlyString,
    checkOutDate: checkOutDate as DateOnlyString,
    guestCount: reservation.guestCount,
    total: quote.total,
    currency: quote.currency,
    quote,
    futurePaymentProvider: "TILOPAY",
    phaseBoundary: "PAYMENT_PROVIDER_NOT_INTEGRATED",
  };
}
