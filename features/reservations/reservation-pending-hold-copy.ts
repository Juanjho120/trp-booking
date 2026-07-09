export type PendingHoldErrorCode =
  | "INVALID_PENDING_HOLD_REQUEST"
  | "INVALID_ACCOMMODATION"
  | "INVALID_DATE_RANGE"
  | "INVALID_GUEST_COUNT"
  | "UNAVAILABLE_DATES"
  | "PENDING_HOLD_CONFLICT"
  | "PENDING_HOLD_UNEXPECTED_ERROR";

type PendingHoldCopy = Readonly<{
  createHold: string;
  creatingHold: string;
  successTitle: string;
  reservationId: string;
  status: string;
  expiresAt: string;
  total: string;
  pendingPayment: string;
  paymentPendingNote: string;
  phaseBoundaryNote: string;
  errors: Record<PendingHoldErrorCode, string>;
}>;

const esCopy: PendingHoldCopy = {
  createHold: "Crear reserva pendiente",
  creatingHold: "Creando reserva pendiente...",
  successTitle: "Reserva pendiente creada",
  reservationId: "Reserva",
  status: "Estado",
  expiresAt: "Expira",
  total: "Total",
  pendingPayment: "Pendiente de pago",
  paymentPendingNote:
    "Tu reserva quedó apartada temporalmente. El pago directo se integrará en la siguiente subfase; por ahora este hold expira automáticamente.",
  phaseBoundaryNote:
    "Subfase 8.4 crea una reserva pendiente por 15 minutos. Todavía no confirma pago, no envía correos y no crea bloques manuales de calendario.",
  errors: {
    INVALID_PENDING_HOLD_REQUEST: "Revisa los datos de la reserva e inténtalo de nuevo.",
    INVALID_ACCOMMODATION: "No pudimos encontrar este alojamiento.",
    INVALID_DATE_RANGE: "Selecciona una fecha de entrada y una fecha de salida válidas.",
    INVALID_GUEST_COUNT: "La cantidad de huéspedes no es válida para este alojamiento.",
    UNAVAILABLE_DATES: "Estas fechas ya no están disponibles. Selecciona otro rango de fechas.",
    PENDING_HOLD_CONFLICT: "Alguien más tomó estas fechas al mismo tiempo. Selecciona otro rango de fechas.",
    PENDING_HOLD_UNEXPECTED_ERROR: "No pudimos crear la reserva pendiente. Inténtalo de nuevo.",
  },
};

const enCopy: PendingHoldCopy = {
  createHold: "Create pending reservation",
  creatingHold: "Creating pending reservation...",
  successTitle: "Pending reservation created",
  reservationId: "Reservation",
  status: "Status",
  expiresAt: "Expires",
  total: "Total",
  pendingPayment: "Pending payment",
  paymentPendingNote:
    "Your reservation was temporarily held. Direct payment will be added in the next subphase; for now this hold expires automatically.",
  phaseBoundaryNote:
    "Subphase 8.4 creates a pending reservation for 15 minutes. It still does not confirm payment, send emails, or create manual calendar blocks.",
  errors: {
    INVALID_PENDING_HOLD_REQUEST: "Review the reservation details and try again.",
    INVALID_ACCOMMODATION: "We could not find this accommodation.",
    INVALID_DATE_RANGE: "Select a valid check-in and check-out date.",
    INVALID_GUEST_COUNT: "The guest count is not valid for this accommodation.",
    UNAVAILABLE_DATES: "These dates are no longer available. Select a different date range.",
    PENDING_HOLD_CONFLICT: "Someone else took these dates at the same time. Select a different date range.",
    PENDING_HOLD_UNEXPECTED_ERROR: "We could not create the pending reservation. Please try again.",
  },
};

export function getPendingHoldCopy(locale: "es" | "en"): PendingHoldCopy {
  return locale === "en" ? enCopy : esCopy;
}

export function getPendingHoldErrorMessage(code: PendingHoldErrorCode, locale: "es" | "en"): string {
  return getPendingHoldCopy(locale).errors[code];
}
