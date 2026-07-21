import type {
  EmailProviderErrorCode,
  TransactionalEmailLocale,
} from "@/types/email-provider";

export type ReservationConfirmationNotificationType =
  | "RESERVATION_CONFIRMED"
  | "ADMIN_NEW_RESERVATION";

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
  | "EMAIL_NOTIFICATION_UNEXPECTED_ERROR";

export type ImmediateEmailDeliveryMode =
  | "disabled"
  | "test"
  | "production"
  | "unavailable";

export type ImmediateEmailDeliverySummary = Readonly<{
  deliveryMode: ImmediateEmailDeliveryMode;
  requested: number;
  attempted: number;
  sent: number;
  failed: number;
  skipped: number;
}>;
