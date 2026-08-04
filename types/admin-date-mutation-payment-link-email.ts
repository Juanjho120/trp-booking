import type { EmailDeliveryMode } from "@/types/email-notification";

export type AdminDateMutationPaymentLinkEmailErrorCode =
  | "ADMIN_UNAUTHORIZED"
  | "INVALID_ADMIN_DATE_MUTATION_PAYMENT_EMAIL_REQUEST"
  | "ADMIN_DATE_MUTATION_PAYMENT_EMAIL_REQUEST_NOT_FOUND"
  | "ADMIN_DATE_MUTATION_PAYMENT_EMAIL_NOT_AVAILABLE"
  | "ADMIN_DATE_MUTATION_PAYMENT_EMAIL_PROCESSING_ACTIVE"
  | "ADMIN_DATE_MUTATION_PAYMENT_EMAIL_STALE"
  | "ADMIN_DATE_MUTATION_PAYMENT_EMAIL_UNEXPECTED_ERROR";

export type AdminDateMutationPaymentLinkEmailWarning =
  | "DUPLICATE_POSSIBLE"
  | "DELIVERY_ACTIVE"
  | null;

export type AdminDateMutationPaymentLinkEmailState = Readonly<{
  lifecycleRequestId: string;
  requestType: "DATE_CHANGE" | "STAY_EXTENSION";
  guestEmail: string;
  available: boolean;
  hasSuccessfulDelivery: boolean;
  hasActiveDelivery: boolean;
  hasFailedDelivery: boolean;
  warning: AdminDateMutationPaymentLinkEmailWarning;
  latestNotificationId: string | null;
  latestStatus: "PENDING" | "PROCESSING" | "SENT" | "FAILED" | "SKIPPED" | null;
}>;

export type SendAdminDateMutationPaymentLinkEmailInput = Readonly<{
  reservationId: string;
  lifecycleRequestId: string;
  requestId: string;
}>;

export type AdminDateMutationPaymentLinkEmailSendResult = Readonly<{
  state: AdminDateMutationPaymentLinkEmailState;
  notificationId: string;
  created: boolean;
  deliveryMode: EmailDeliveryMode;
  outcome: "sent" | "failed" | "queued" | "already-processed";
  retryScheduled: boolean;
}>;
