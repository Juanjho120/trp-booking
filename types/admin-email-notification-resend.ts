import type { EmailDeliveryMode } from "@/types/email-notification";

export type AdminEmailNotificationResendErrorCode =
  | "ADMIN_UNAUTHORIZED"
  | "INVALID_ADMIN_EMAIL_NOTIFICATION_RESEND_REQUEST"
  | "ADMIN_EMAIL_NOTIFICATION_NOT_FOUND"
  | "ADMIN_EMAIL_NOTIFICATION_STALE"
  | "ADMIN_EMAIL_NOTIFICATION_PROCESSING_ACTIVE"
  | "ADMIN_EMAIL_NOTIFICATION_RESEND_NOT_ALLOWED"
  | "ADMIN_EMAIL_NOTIFICATION_RESERVATION_NOT_CONFIRMED"
  | "ADMIN_EMAIL_NOTIFICATION_UNEXPECTED_ERROR";

export type RequestAdminEmailNotificationResendInput = Readonly<{
  sourceNotificationId: string;
  reservationId: string;
  expectedUpdatedAt: string;
  requestId: string;
}>;

export type AdminEmailNotificationResendOutcome =
  | "sent"
  | "failed"
  | "queued"
  | "already-processed";

export type AdminEmailNotificationResendResult = Readonly<{
  notificationId: string;
  created: boolean;
  deliveryMode: EmailDeliveryMode;
  outcome: AdminEmailNotificationResendOutcome;
  retryScheduled: boolean;
  finalStatus: string;
}>;
