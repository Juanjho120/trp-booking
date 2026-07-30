import type { AccommodationId } from "@/types/accommodation";
import type { DateOnlyString } from "@/types/availability";

export const adminDateMutationRequestTypes = [
  "DATE_CHANGE",
  "STAY_EXTENSION",
] as const;

export type AdminDateMutationRequestType =
  (typeof adminDateMutationRequestTypes)[number];

export const adminDateMutationChannels = [
  "EMAIL",
  "PHONE",
  "WHATSAPP",
  "OTHER",
] as const;

export type AdminDateMutationChannel =
  (typeof adminDateMutationChannels)[number];

export const adminDateMutationPricingModes = [
  "FULL_STAY_CURRENT_PRICE",
  "ADDED_NIGHTS_CURRENT_PRICE",
] as const;

export type AdminDateMutationPricingMode =
  (typeof adminDateMutationPricingModes)[number];

export const adminDateMutationDecisions = ["APPROVE", "REJECT"] as const;
export type AdminDateMutationDecision =
  (typeof adminDateMutationDecisions)[number];

export type AdminDateMutationErrorCode =
  | "ADMIN_UNAUTHORIZED"
  | "INVALID_ADMIN_DATE_MUTATION_REQUEST"
  | "ADMIN_DATE_MUTATION_RESERVATION_NOT_FOUND"
  | "ADMIN_DATE_MUTATION_RESERVATION_NOT_CONFIRMED"
  | "ADMIN_DATE_MUTATION_PROPERTY_NOT_ELIGIBLE"
  | "ADMIN_DATE_MUTATION_SOURCE_PAYMENT_NOT_FOUND"
  | "ADMIN_DATE_MUTATION_DATES_UNCHANGED"
  | "ADMIN_DATE_MUTATION_DATE_CHANGE_AFTER_CHECK_IN"
  | "ADMIN_DATE_MUTATION_EXTENSION_INVALID"
  | "ADMIN_DATE_MUTATION_STAY_ENDED"
  | "ADMIN_DATE_MUTATION_DATE_HORIZON_EXCEEDED"
  | "ADMIN_DATE_MUTATION_DATES_UNAVAILABLE"
  | "ADMIN_DATE_MUTATION_REQUEST_NOT_FOUND"
  | "ADMIN_DATE_MUTATION_REQUEST_NOT_PENDING"
  | "ADMIN_DATE_MUTATION_REQUEST_EXPIRED"
  | "ADMIN_DATE_MUTATION_DECISION_CONFLICT"
  | "ADMIN_DATE_MUTATION_ADJUSTMENT_PAYMENT_CONFLICT"
  | "ADMIN_DATE_MUTATION_REFUND_BALANCE_INSUFFICIENT"
  | "ADMIN_DATE_MUTATION_REQUEST_ALREADY_ACTIVE"
  | "ADMIN_DATE_MUTATION_CANCELLATION_ACTIVE"
  | "ADMIN_DATE_MUTATION_STALE"
  | "ADMIN_DATE_MUTATION_IDEMPOTENCY_CONFLICT"
  | "ADMIN_DATE_MUTATION_UNEXPECTED_ERROR";

export type CreateAdminDateMutationRequestInput = Readonly<{
  reservationId: string;
  requestType: AdminDateMutationRequestType;
  requestedCheckInDate: string;
  requestedCheckOutDate: string;
  channel: AdminDateMutationChannel;
  requesterName: string;
  requesterEmail: string | null;
  requesterPhone: string | null;
  requestNote: string;
  expectedReservationUpdatedAt: string;
  requestId: string;
}>;

export type DecideAdminDateMutationRequestInput = Readonly<{
  reservationId: string;
  requestId: string;
  decision: AdminDateMutationDecision;
  decisionNote: string;
  expectedRequestVersion: number;
  expectedReservationUpdatedAt: string;
}>;

export type AdminDateMutationAdminSummary = Readonly<{
  name: string | null;
  email: string;
}>;

export type AdminDateMutationPricingSummary = Readonly<{
  subtotal: string;
  cleaningFee: string;
  taxes: string;
  discounts: string;
  total: string;
  currency: string;
}>;

export type AdminDateMutationStaySummary = Readonly<{
  checkInDate: DateOnlyString;
  checkOutDate: DateOnlyString;
  guestCount: number;
  pricing: AdminDateMutationPricingSummary;
}>;

export type AdminDateMutationAvailabilitySummary = Readonly<{
  available: true;
  validatedAt: string;
  affectedAccommodationIds: readonly AccommodationId[];
  blockingAccommodationIds: readonly AccommodationId[];
}>;

export type AdminDateMutationHoldSummary = Readonly<{
  id: string;
  status: "ACTIVE" | "RELEASED" | "EXPIRED";
  startDate: DateOnlyString;
  endDate: DateOnlyString;
  preparationDaysBefore: number;
  preparationDaysAfter: number;
  expiresAt: string;
  releasedAt: string | null;
  expiredAt: string | null;
  releaseReasonCode: string | null;
  version: number;
}>;

export type AdminDateMutationPaymentSummary = Readonly<{
  id: string;
  purpose: "LIFECYCLE_ADJUSTMENT";
  status:
    | "PENDING"
    | "APPROVED"
    | "REJECTED"
    | "FAILED"
    | "REFUNDED"
    | "PARTIALLY_REFUNDED";
  amount: string;
  currency: string;
  providerReference: string | null;
  paidAt: string | null;
  failedAt: string | null;
  createdAt: string;
  updatedAt: string;
}>;

export type AdminDateMutationRequestSummary = Readonly<{
  id: string;
  reservationId: string;
  sourcePaymentId: string;
  requestType: AdminDateMutationRequestType;
  status: string;
  channel: AdminDateMutationChannel;
  requesterName: string;
  requesterEmail: string | null;
  requesterPhone: string | null;
  requestNote: string | null;
  original: AdminDateMutationStaySummary;
  requested: AdminDateMutationStaySummary;
  financialDifference: string;
  pricingMode: AdminDateMutationPricingMode;
  availability: AdminDateMutationAvailabilitySummary;
  createdByAdmin: AdminDateMutationAdminSummary;
  reviewedByAdmin: AdminDateMutationAdminSummary | null;
  decisionReasonCode: string | null;
  decisionNote: string | null;
  requestedAt: string;
  reviewedAt: string | null;
  decidedAt: string | null;
  reviewExpiresAt: string;
  reviewExpired: boolean;
  hold: AdminDateMutationHoldSummary | null;
  adjustmentPayments: readonly AdminDateMutationPaymentSummary[];
  paymentHandoffPath: string | null;
  version: number;
  expectedReservationUpdatedAt: string;
  createdAt: string;
  updatedAt: string;
}>;

export type AdminDateMutationDecisionResult = Readonly<{
  request: AdminDateMutationRequestSummary;
  decision: AdminDateMutationDecision;
  financialBranch: "POSITIVE" | "ZERO" | "NEGATIVE";
  holdCreated: boolean;
  paymentCreated: boolean;
  alreadyProcessed: boolean;
}>;
