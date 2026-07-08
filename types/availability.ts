import type { AccommodationId, PreparationBufferPolicy } from "@/types/accommodation";

export type DateOnlyString = `${number}-${number}-${number}`;

export type AvailabilityDateRange = Readonly<{
  startDate: DateOnlyString;
  endDate: DateOnlyString;
}>;

export type AvailabilityBlockSource =
  | "DIRECT_RESERVATION"
  | "AIRBNB"
  | "MANUAL_BLOCK"
  | "MAINTENANCE"
  | "COMPOSED_LISTING_DEPENDENCY"
  | "PREPARATION_BUFFER";

export type ReservationAvailabilityStatus = "CONFIRMED" | "PENDING_PAYMENT";

export type AvailabilityDependencyRule = Readonly<{
  accommodationId: AccommodationId;
  affectedAccommodationIds: readonly AccommodationId[];
}>;

export type PreparationBufferRangeKind = "before-check-in" | "after-check-out";

export type PreparationBufferDateRange = AvailabilityDateRange &
  Readonly<{
    accommodationId: AccommodationId;
    kind: PreparationBufferRangeKind;
    days: number;
  }>;

export type AvailabilityBlockingRecord = AvailabilityDateRange &
  Readonly<{
    accommodationId: AccommodationId;
    source: AvailabilityBlockSource;
    reason?: string;
    reservationId?: string;
    reservationStatus?: ReservationAvailabilityStatus;
    calendarBlockId?: string;
    externalCalendarEventId?: string;
  }>;

export type AvailabilityCheckInput = AvailabilityDateRange &
  Readonly<{
    accommodationId: AccommodationId;
  }>;

export type AvailabilityCheckResult = Readonly<{
  accommodationId: AccommodationId;
  requestedRange: AvailabilityDateRange;
  available: boolean;
  affectedAccommodationIds: readonly AccommodationId[];
  blockingAccommodationIds: readonly AccommodationId[];
  blockingRecords: readonly AvailabilityBlockingRecord[];
}>;

export type AvailabilityRuleSummary = Readonly<{
  accommodationId: AccommodationId;
  affectedAccommodationIds: readonly AccommodationId[];
  blockingAccommodationIds: readonly AccommodationId[];
  preparationBuffer: PreparationBufferPolicy;
}>;
