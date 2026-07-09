import type { ReservationQuote, ReservationQuoteAmount } from "@/types/reservation-quote";

export type PaymentAttemptStatus = "PENDING";

export type PaymentAttemptErrorCode =
  | "INVALID_PAYMENT_HANDOFF_REQUEST"
  | "PENDING_HOLD_NOT_FOUND"
  | "PENDING_HOLD_NOT_PAYABLE"
  | "PENDING_HOLD_EXPIRED"
  | "PAYMENT_HANDOFF_UNAVAILABLE_DATES"
  | "PAYMENT_HANDOFF_QUOTE_CHANGED"
  | "PAYMENT_HANDOFF_UNEXPECTED_ERROR"
  | "PAYMENT_ATTEMPT_AMOUNT_MISMATCH"
  | "PAYMENT_ATTEMPT_UNEXPECTED_ERROR";

export type CreatePaymentAttemptInput = Readonly<{
  reservationId: string;
  locale: "es" | "en";
}>;

export type PaymentAttempt = Readonly<{
  id: string;
  reservationId: string;
  reservationStatus: "PENDING_PAYMENT";
  provider: "TILOPAY";
  status: PaymentAttemptStatus;
  amount: ReservationQuoteAmount;
  currency: ReservationQuote["currency"];
  existing: boolean;
  expiresAt: string;
  quote: ReservationQuote;
  futurePaymentProvider: "TILOPAY";
  phaseBoundary: "PAYMENT_PROVIDER_NOT_INTEGRATED";
}>;

export type CreatePaymentAttemptApiSuccessResponse = Readonly<{
  paymentAttempt: PaymentAttempt;
}>;

export type CreatePaymentAttemptApiErrorResponse = Readonly<{
  error: Readonly<{
    code: PaymentAttemptErrorCode;
    message: string;
  }>;
}>;

export type CreatePaymentAttemptApiResponse =
  | CreatePaymentAttemptApiSuccessResponse
  | CreatePaymentAttemptApiErrorResponse;
