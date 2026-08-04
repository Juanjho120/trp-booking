import type {
  EmailProviderErrorCode,
  TransactionalEmailLocale,
} from "@/types/email-provider";

export type ReservationConfirmationNotificationType =
  | "RESERVATION_CONFIRMED"
  | "ADMIN_NEW_RESERVATION";

export type LifecycleGuestNotificationType =
  | "RESERVATION_CANCELLED"
  | "RESERVATION_DATES_UPDATED"
  | "STAY_EXTENSION_CONFIRMED"
  | "REFUND_PROCESSED";

export type LifecycleAdminNotificationType =
  | "ADMIN_RESERVATION_CANCELLED"
  | "ADMIN_RESERVATION_DATES_UPDATED"
  | "ADMIN_STAY_EXTENSION_CONFIRMED"
  | "ADMIN_REFUND_PROCESSED";

export type LifecycleNotificationType =
  | LifecycleGuestNotificationType
  | LifecycleAdminNotificationType;

export type LifecycleNotificationAudience = "guest" | "admin";

export type LifecycleNotificationRelationKind =
  | "lifecycle-request"
  | "refund";

export type LifecycleRequestNotificationDeduplicationInput = Readonly<{
  type:
    | "RESERVATION_CANCELLED"
    | "ADMIN_RESERVATION_CANCELLED"
    | "RESERVATION_DATES_UPDATED"
    | "ADMIN_RESERVATION_DATES_UPDATED"
    | "STAY_EXTENSION_CONFIRMED"
    | "ADMIN_STAY_EXTENSION_CONFIRMED";
  lifecycleRequestId: string;
  recipient: string;
}>;

export type RefundNotificationDeduplicationInput = Readonly<{
  type: "REFUND_PROCESSED" | "ADMIN_REFUND_PROCESSED";
  refundId: string;
  recipient: string;
}>;

export type LifecycleNotificationDeduplicationInput =
  | LifecycleRequestNotificationDeduplicationInput
  | RefundNotificationDeduplicationInput;

export type ArrivalInstructionsNotificationIntent = Readonly<{
  outcome:
    | "created"
    | "existing"
    | "not-configured"
    | "not-confirmed"
    | "check-in-passed"
    | "invalid-data";
  notificationId: string | null;
  scheduledFor: string | null;
}>;

export type ReservationConfirmationNotificationIntent = Readonly<{
  id: string;
  type: ReservationConfirmationNotificationType;
  recipient: string;
  locale: TransactionalEmailLocale;
  status: "PENDING" | "PROCESSING" | "SENT" | "FAILED" | "SKIPPED";
}>;

export type EmailNotificationDeliveryErrorCode =
  | EmailProviderErrorCode
  | "EMAIL_TEMPLATE_INVALID_DATA"
  | "EMAIL_NOTIFICATION_DATA_INCOMPLETE"
  | "EMAIL_NOTIFICATION_UNSUPPORTED_TYPE"
  | "EMAIL_NOTIFICATION_RETRY_LIMIT_REACHED"
  | "EMAIL_ARRIVAL_INSTRUCTIONS_SUPERSEDED"
  | "EMAIL_ARRIVAL_INSTRUCTIONS_DISABLED"
  | "EMAIL_NOTIFICATION_UNEXPECTED_ERROR";

export type EmailDeliveryMode =
  | "disabled"
  | "test"
  | "production"
  | "unavailable";

export type ImmediateEmailDeliverySummary = Readonly<{
  deliveryMode: EmailDeliveryMode;
  requested: number;
  attempted: number;
  sent: number;
  failed: number;
  retryScheduled: number;
  skipped: number;
}>;

export type ArrivalInstructionsSchedulingSummary = Readonly<{
  processedAt: string;
  lookaheadDays: number;
  candidates: number;
  created: number;
  existing: number;
  skipped: number;
  failed: number;
}>;

export type EmailNotificationProcessingSummary = Readonly<{
  deliveryMode: EmailDeliveryMode;
  processedAt: string;
  batchSize: number;
  candidates: number;
  claimed: number;
  staleRecovered: number;
  staleExhausted: number;
  attempted: number;
  sent: number;
  failed: number;
  retryScheduled: number;
  skipped: number;
}>;

export type EmailNotificationClaim = Readonly<{
  notificationId: string;
  processingStartedAt: Date;
}>;

export type ClaimedEmailNotificationDeliveryOutcome = Readonly<{
  outcome: "sent" | "failed" | "skipped";
  retryScheduled: boolean;
}>;
