import type { AccommodationId } from "@/types/accommodation";
import type { DateOnlyString } from "@/types/availability";
import type {
  ReservationQuote,
  ReservationQuoteAmount,
} from "@/types/reservation-quote";

export type PendingReservationHoldStatus = "PENDING_PAYMENT";
export type ReleasedPendingReservationHoldStatus = "EXPIRED";

export type PendingHoldErrorCode =
  | "INVALID_PENDING_HOLD_REQUEST"
  | "INVALID_ACCOMMODATION"
  | "INVALID_DATE_RANGE"
  | "INVALID_GUEST_COUNT"
  | "UNAVAILABLE_DATES"
  | "PENDING_HOLD_CONFLICT"
  | "PENDING_HOLD_UNEXPECTED_ERROR";

export type ReleasePendingHoldErrorCode =
  | "INVALID_PENDING_HOLD_RELEASE_REQUEST"
  | "PENDING_HOLD_NOT_FOUND"
  | "PENDING_HOLD_NOT_EDITABLE"
  | "PENDING_HOLD_EDIT_LOCKED_BY_PAYMENT"
  | "PENDING_HOLD_RELEASE_STALE"
  | "PENDING_HOLD_RELEASE_UNEXPECTED_ERROR";

export type CreatePendingReservationHoldInput = Readonly<{
  accommodationId: AccommodationId;
  checkInDate: DateOnlyString;
  checkOutDate: DateOnlyString;
  guestCount: number;
  guestName: string;
  guestEmail: string;
  guestCountry: string;
  countryDialCode: string;
  guestPhoneLocal: string;
  arrivalTimeEstimate: string;
  locale: "es" | "en";
}>;

export type ReleasePendingReservationHoldInput = Readonly<{
  reservationId: string;
  expectedUpdatedAt: string;
}>;

export type PendingReservationHold = Readonly<{
  reservationId: string;
  status: PendingReservationHoldStatus;
  expiresAt: string;
  updatedAt: string;
  accommodationId: AccommodationId;
  accommodationSlug: string;
  checkInDate: DateOnlyString;
  checkOutDate: DateOnlyString;
  guestCount: number;
  total: ReservationQuoteAmount;
  currency: ReservationQuote["currency"];
  quote: ReservationQuote;
}>;

export type ReleasedPendingReservationHold = Readonly<{
  reservationId: string;
  status: ReleasedPendingReservationHoldStatus;
  releasedAt: string;
}>;

export type PendingReservationHoldApiSuccessResponse = Readonly<{
  pendingHold: PendingReservationHold;
}>;

export type ReleasePendingReservationHoldApiSuccessResponse = Readonly<{
  releasedHold: ReleasedPendingReservationHold;
}>;

export type PendingReservationHoldApiErrorResponse = Readonly<{
  error: Readonly<{
    code: PendingHoldErrorCode;
    message: string;
  }>;
}>;

export type PendingReservationHoldApiResponse =
  | PendingReservationHoldApiSuccessResponse
  | PendingReservationHoldApiErrorResponse;

export type ReleasePendingReservationHoldApiErrorResponse = Readonly<{
  error: Readonly<{
    code: ReleasePendingHoldErrorCode;
    message: string;
  }>;
}>;

export type ReleasePendingReservationHoldApiResponse =
  | ReleasePendingReservationHoldApiSuccessResponse
  | ReleasePendingReservationHoldApiErrorResponse;
