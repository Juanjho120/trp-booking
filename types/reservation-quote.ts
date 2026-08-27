import type { AccommodationId, LocalizedText } from "@/types/accommodation";
import type { DateOnlyString } from "@/types/availability";
import type { FinalCPricingResolutionSource, LengthOfStayMinimumNights } from "@/types/pricing";

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

export type ReservationQuotePricingSegment = Readonly<{
  startDate: DateOnlyString;
  endDate: DateOnlyString;
  nights: number;
  source: FinalCPricingResolutionSource;
  minimumNights: LengthOfStayMinimumNights | null;
  nightlyRate: ReservationQuoteAmount;
  subtotal: ReservationQuoteAmount;
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
  nightlyRate: ReservationQuoteAmount | null;
  subtotal: ReservationQuoteAmount;
  cleaningFee: ReservationQuoteAmount;
  taxes: ReservationQuoteAmount;
  discounts: ReservationQuoteAmount;
  total: ReservationQuoteAmount;
  currency: ReservationQuoteCurrency;
  paymentRequired: true;
  quoteKind: "NON_BINDING";
  pricingBreakdown: readonly ReservationQuotePricingSegment[];
}>;

export type ReservationQuoteErrorCode =
  | "INVALID_QUOTE_REQUEST"
  | "INVALID_ACCOMMODATION"
  | "INVALID_DATE_RANGE"
  | "INVALID_GUEST_COUNT";
