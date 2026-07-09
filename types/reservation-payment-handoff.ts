import type { AccommodationId } from "@/types/accommodation";
import type { DateOnlyString } from "@/types/availability";
import type { ReservationQuote, ReservationQuoteAmount } from "@/types/reservation-quote";

export type PaymentHandoffValidationStatus = "READY_FOR_PAYMENT";

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
    code: string;
    message: string;
  }>;
}>;

export type PaymentHandoffValidationApiResponse =
  | PaymentHandoffValidationApiSuccessResponse
  | PaymentHandoffValidationApiErrorResponse;
