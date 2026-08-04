import { enMessages, esMessages } from "@/messages";
import type { TransactionalEmailLocale } from "@/types/email-provider";

export function getLifecycleEmailMessages(locale: TransactionalEmailLocale) {
  const messages = locale === "en" ? enMessages : esMessages;

  return {
    common: messages.emails.common,
    reservationConfirmed: messages.emails.reservationConfirmed,
    adminNewReservation: messages.emails.adminNewReservation,
    adminBrandLabel: messages.admin.navigation.brandLabel,
    paymentStatuses: messages.admin.statuses.payment,
    cancellation: messages.admin.reservationsPage.cancellation,
    dateMutation: messages.admin.reservationsPage.dateMutation,
    refunds: messages.admin.reservationsPage.refunds,
    notifications: messages.admin.reservationsPage.notifications,
    lifecycleAdjustment: messages.payments.lifecycleAdjustment,
  } as const;
}
