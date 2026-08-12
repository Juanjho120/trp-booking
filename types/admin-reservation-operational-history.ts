export const adminReservationOperationalHistoryCategories = [
  "RESERVATION",
  "REQUEST",
  "HOLD",
  "PAYMENT",
  "REFUND",
  "EMAIL",
  "RECOVERY",
] as const;

export type AdminReservationOperationalHistoryCategory =
  (typeof adminReservationOperationalHistoryCategories)[number];

export const adminReservationOperationalHistoryEventTypes = [
  "RESERVATION_CREATED",
  "RESERVATION_CONFIRMED",
  "RESERVATION_CANCELLED",
  "CANCELLATION_REQUESTED",
  "CANCELLATION_APPROVED",
  "CANCELLATION_REJECTED",
  "CANCELLATION_COMPLETED",
  "CANCELLATION_FAILED",
  "CANCELLATION_EXPIRED",
  "CANCELLATION_WITHDRAWN",
  "DATE_CHANGE_REQUESTED",
  "DATE_CHANGE_APPROVED",
  "DATE_CHANGE_REJECTED",
  "DATE_CHANGE_COMPLETED",
  "DATE_CHANGE_FAILED",
  "DATE_CHANGE_EXPIRED",
  "DATE_CHANGE_WITHDRAWN",
  "STAY_EXTENSION_REQUESTED",
  "STAY_EXTENSION_APPROVED",
  "STAY_EXTENSION_REJECTED",
  "STAY_EXTENSION_COMPLETED",
  "STAY_EXTENSION_FAILED",
  "STAY_EXTENSION_EXPIRED",
  "STAY_EXTENSION_WITHDRAWN",
  "LIFECYCLE_HOLD_CREATED",
  "LIFECYCLE_HOLD_RELEASED",
  "LIFECYCLE_HOLD_EXPIRED",
  "PAYMENT_CREATED",
  "PAYMENT_APPROVED",
  "PAYMENT_REJECTED",
  "PAYMENT_FAILED",
  "PAYMENT_PARTIALLY_REFUNDED",
  "PAYMENT_REFUNDED",
  "REFUND_AUTHORIZED",
  "REFUND_PROVIDER_EXECUTION_STARTED",
  "REFUND_PROVIDER_RESPONSE_OBSERVED",
  "REFUND_PROVIDER_RESULT_UNCERTAIN",
  "REFUND_PROVIDER_EXECUTION_FAILED",
  "REFUND_PROVIDER_CONSULT_OBSERVED",
  "REFUND_RECONCILED_APPROVED",
  "REFUND_RECONCILED_FAILED",
  "REFUND_APPROVED",
  "REFUND_FAILED",
  "EMAIL_CREATED",
  "EMAIL_PROCESSING",
  "EMAIL_RETRY_SCHEDULED",
  "EMAIL_SENT",
  "EMAIL_FAILED",
  "EMAIL_SKIPPED",
  "EMAIL_MANUAL_RESEND_REQUESTED",
] as const;

export type AdminReservationOperationalHistoryEventType =
  (typeof adminReservationOperationalHistoryEventTypes)[number];

export const adminReservationOperationalHistoryReferenceKinds = [
  "RESERVATION",
  "LIFECYCLE_REQUEST",
  "HOLD",
  "PAYMENT",
  "REFUND",
  "EMAIL_NOTIFICATION",
] as const;

export type AdminReservationOperationalHistoryReferenceKind =
  (typeof adminReservationOperationalHistoryReferenceKinds)[number];

export const adminReservationOperationalHistoryRelationKinds = [
  "LIFECYCLE_REQUEST",
  "HOLD",
  "PAYMENT",
  "REFUND",
  "PARENT_NOTIFICATION",
  "SOURCE_NOTIFICATION",
] as const;

export type AdminReservationOperationalHistoryRelationKind =
  (typeof adminReservationOperationalHistoryRelationKinds)[number];

export type AdminReservationOperationalHistoryActor = Readonly<{
  kind: "ADMIN" | "SYSTEM";
  name: string | null;
  email: string | null;
}>;

export type AdminReservationOperationalHistoryReference = Readonly<{
  kind: AdminReservationOperationalHistoryReferenceKind;
  id: string;
}>;

export type AdminReservationOperationalHistoryRelation = Readonly<{
  kind: AdminReservationOperationalHistoryRelationKind;
  id: string;
}>;

export type AdminReservationOperationalHistoryEvent = Readonly<{
  id: string;
  category: AdminReservationOperationalHistoryCategory;
  eventType: AdminReservationOperationalHistoryEventType;
  occurredAt: string;
  status: string | null;
  actor: AdminReservationOperationalHistoryActor;
  reference: AdminReservationOperationalHistoryReference;
  relations: readonly AdminReservationOperationalHistoryRelation[];
  amount: string | null;
  currency: string | null;
  requestType: string | null;
  paymentPurpose: string | null;
  refundAuthorizationType: string | null;
  refundOperationKey: string | null;
  notificationType: string | null;
  recipient: string | null;
  locale: string | null;
  origin: string | null;
  attemptCount: number | null;
  nextAttemptAt: string | null;
  expiresAt: string | null;
  scheduledFor: string | null;
  errorCode: string | null;
  providerReference: string | null;
  originalCheckInDate: string | null;
  originalCheckOutDate: string | null;
  requestedCheckInDate: string | null;
  requestedCheckOutDate: string | null;
}>;
