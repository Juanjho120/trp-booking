import type { AccommodationId } from "@/types/accommodation";
import type { DateOnlyString } from "@/types/availability";
import type { ReservationQuote, ReservationQuoteAmount } from "@/types/reservation-quote";

export type PaymentHandoffValidationStatus = "READY_FOR_PAYMENT";

export type PaymentHandoffErrorCode =
  | "INVALID_PAYMENT_HANDOFF_REQUEST"
  | "PENDING_HOLD_NOT_FOUND"
  | "PENDING_HOLD_NOT_PAYABLE"
  | "PENDING_HOLD_EXPIRED"
  | "PAYMENT_HANDOFF_UNAVAILABLE_DATES"
  | "PAYMENT_HANDOFF_QUOTE_CHANGED"
  | "PAYMENT_HANDOFF_UNEXPECTED_ERROR";

export type ValidatePaymentHandoffInput = Readonly<{
  reservationId: string;
  locale: "es" | "en";
}>;

export type PaymentHandoffValidation = Readonly<{
  reservationId: string;
  reservationStatus: "PENDING_PAYMENT";
  status: PaymentHandoffValidationStatus;
  readyForPayment: true;
  expiresAt: string;
  accommodationId: AccommodationId;
  accommodationSlug: ReservationQuote["accommodationSlug"];
  checkInDate: DateOnlyString;
  checkOutDate: DateOnlyString;
  guestCount: number;
  total: ReservationQuoteAmount;
  currency: ReservationQuote["currency"];
  quote: ReservationQuote;
  futurePaymentProvider: "TILOPAY";
  phaseBoundary: "PAYMENT_PROVIDER_NOT_INTEGRATED";
}>;

export type PaymentHandoffValidationApiSuccessResponse = Readonly<{
  paymentHandoff: PaymentHandoffValidation;
}>;

export type PaymentHandoffValidationApiErrorResponse = Readonly<{
  error: Readonly<{
    code: PaymentHandoffErrorCode;
    message: string;
  }>;
}>;

export type PaymentHandoffValidationApiResponse =
  | PaymentHandoffValidationApiSuccessResponse
  | PaymentHandoffValidationApiErrorResponse;
