import type { AccommodationId, LocalizedText } from "@/types/accommodation";
import type { DateOnlyString } from "@/types/availability";

export type ReservationQuoteCurrency = "USD";

export type ReservationQuoteAmount = Readonly<{
  currency: ReservationQuoteCurrency;
  amountCents: number;
  amount: string;
}>;

export type ReservationQuoteInput = Readonly<{
  accommodationId: AccommodationId;
  checkInDate: DateOnlyString;
  checkOutDate: DateOnlyString;
  guestCount: number;
}>;

export type ReservationQuote = Readonly<{
  accommodationId: AccommodationId;
  accommodationName: LocalizedText;
  accommodationSlug: LocalizedText;
  checkInDate: DateOnlyString;
  checkOutDate: DateOnlyString;
  guestCount: number;
  maxGuests: number;
  nights: number;
  nightlyRate: ReservationQuoteAmount;
  subtotal: ReservationQuoteAmount;
  cleaningFee: ReservationQuoteAmount;
  taxes: ReservationQuoteAmount;
  discounts: ReservationQuoteAmount;
  total: ReservationQuoteAmount;
  currency: ReservationQuoteCurrency;
  paymentRequired: true;
  quoteKind: "NON_BINDING";
}>;

export type ReservationQuoteErrorCode =
  | "INVALID_QUOTE_REQUEST"
  | "INVALID_ACCOMMODATION"
  | "INVALID_DATE_RANGE"
  | "INVALID_GUEST_COUNT";
