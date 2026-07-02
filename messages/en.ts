export const enMessages = {
  common: {
    brandName: "Tu Refugio Perfecto",
    publicName: "Bungalows Tu Refugio Perfecto",
    bookNow: "Book now",
    viewAccommodations: "View accommodations",
  },
  errors: {
    reservation: {
      unavailableDates: "The selected dates are no longer available.",
      invalidGuestCount: "The number of guests exceeds the allowed capacity.",
      expiredReservation: "The reservation expired before payment was completed.",
      dateChangesRequireApproval:
        "Reservation date changes require prior administrator approval.",
    },
    payment: {
      failed:
        "We could not complete the payment. Please try again or contact us for help.",
      webhookNotConfirmed:
        "The reservation cannot be confirmed yet because the payment has not been validated.",
    },
    calendar: {
      syncFailed:
        "We could not synchronize the calendar right now. Please try again later.",
      preparationBufferConflict:
        "The selected dates are not available due to accommodation preparation time.",
    },
  },
} as const;
