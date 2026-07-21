export {
  buildAdminNewReservationEmail,
  buildReservationConfirmedEmail,
  EmailTemplateDataError,
} from "@/emails";

export { processEmailNotifications } from "./process-email-notifications";
export { EmailProviderError } from "./provider";
export { createResendEmailProvider } from "./resend-provider";
export {
  createReservationConfirmationNotificationIntents,
  deliverClaimedEmailNotification,
  deliverReservationConfirmationNotificationsBestEffort,
} from "./reservation-confirmation-notifications";
export {
  EMAIL_NOTIFICATION_MAX_ATTEMPTS,
  EMAIL_NOTIFICATION_PROCESSING_TIMEOUT_MS,
  EMAIL_NOTIFICATION_RETRY_BATCH_SIZE,
} from "./retry-policy";
