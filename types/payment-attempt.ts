import type { ReservationQuote, ReservationQuoteAmount } from "@/types/reservation-quote";

export type PaymentAttemptStatus = "PENDING";

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
    code: string;
    message: string;
  }>;
}>;

export type CreatePaymentAttemptApiResponse =
  | CreatePaymentAttemptApiSuccessResponse
  | CreatePaymentAttemptApiErrorResponse;
