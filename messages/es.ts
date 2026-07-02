export const esMessages = {
  common: {
    brandName: "Tu Refugio Perfecto",
    publicName: "Bungalows Tu Refugio Perfecto",
    bookNow: "Reservar ahora",
    viewAccommodations: "Ver alojamientos",
  },
  errors: {
    reservation: {
      unavailableDates: "Las fechas seleccionadas ya no están disponibles.",
      invalidGuestCount: "La cantidad de huéspedes excede la capacidad permitida.",
      expiredReservation: "La reservación expiró antes de completar el pago.",
      dateChangesRequireApproval:
        "Los cambios de fechas requieren autorización previa del administrador.",
    },
    payment: {
      failed:
        "No pudimos completar el pago. Intenta nuevamente o contáctanos para recibir ayuda.",
      webhookNotConfirmed:
        "La reservación aún no puede confirmarse porque el pago no ha sido validado.",
    },
    calendar: {
      syncFailed:
        "No pudimos sincronizar el calendario en este momento. Intenta nuevamente más tarde.",
      preparationBufferConflict:
        "Las fechas seleccionadas no están disponibles por tiempo de preparación del alojamiento.",
    },
  },
} as const;
