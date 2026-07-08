export const publicAvailabilityCopy = {
  es: {
    metadataTitle: "Disponibilidad | Tu Refugio Perfecto",
    metadataDescription:
      "Consulta la disponibilidad inicial de los alojamientos de Tu Refugio Perfecto en Panajachel.",
    pageEyebrow: "Disponibilidad",
    pageTitle: "Consulta disponibilidad por alojamiento",
    pageDescription:
      "Este calendario muestra fechas disponibles y no disponibles como base pública antes de habilitar el flujo completo de reservación y pago.",
    nightlyPricePrefix: "Desde",
    nightlyPriceSuffix: "por noche",
    calendarTitle: "Calendario de disponibilidad",
    loading: "Cargando disponibilidad...",
    available: "Disponible",
    unavailable: "No disponible",
    unavailableSourcesLabel: "Motivos de bloqueo detectados",
    errorTitle: "No pudimos cargar la disponibilidad",
    retry: "Reintentar",
    checkoutDisabledNotice:
      "La selección de fechas, creación de reserva y pago todavía no están habilitados en esta fase.",
    emptyState: "No hay días para mostrar en este rango.",
    nextWindowLabel: "Próximos días visibles",
  },
  en: {
    metadataTitle: "Availability | Tu Refugio Perfecto",
    metadataDescription:
      "Check the initial availability for Tu Refugio Perfecto accommodations in Panajachel.",
    pageEyebrow: "Availability",
    pageTitle: "Check availability by accommodation",
    pageDescription:
      "This calendar shows available and unavailable dates as the public foundation before enabling the full reservation and payment flow.",
    nightlyPricePrefix: "From",
    nightlyPriceSuffix: "per night",
    calendarTitle: "Availability calendar",
    loading: "Loading availability...",
    available: "Available",
    unavailable: "Unavailable",
    unavailableSourcesLabel: "Detected blocking reasons",
    errorTitle: "Availability could not be loaded",
    retry: "Retry",
    checkoutDisabledNotice:
      "Date selection, reservation creation, and payment are not enabled in this phase yet.",
    emptyState: "There are no days to show in this range.",
    nextWindowLabel: "Upcoming visible days",
  },
} as const;

export type PublicAvailabilityCopy = (typeof publicAvailabilityCopy)["es"];
