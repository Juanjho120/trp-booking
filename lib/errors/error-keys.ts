export const errorKeys = {
  reservation: {
    unavailableDates: "errors.reservation.unavailableDates",
    invalidGuestCount: "errors.reservation.invalidGuestCount",
    expiredReservation: "errors.reservation.expiredReservation",
    dateChangesRequireApproval: "errors.reservation.dateChangesRequireApproval",
  },
  payment: {
    failed: "errors.payment.failed",
    webhookNotConfirmed: "errors.payment.webhookNotConfirmed",
  },
  calendar: {
    syncFailed: "errors.calendar.syncFailed",
    preparationBufferConflict: "errors.calendar.preparationBufferConflict",
  },
} as const;
