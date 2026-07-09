export type PaymentHandoffErrorCode =
  | "INVALID_PAYMENT_HANDOFF_REQUEST"
  | "PENDING_HOLD_NOT_FOUND"
  | "PENDING_HOLD_NOT_PAYABLE"
  | "PENDING_HOLD_EXPIRED"
  | "PAYMENT_HANDOFF_UNAVAILABLE_DATES"
  | "PAYMENT_HANDOFF_QUOTE_CHANGED"
  | "PAYMENT_HANDOFF_UNEXPECTED_ERROR";

type PaymentHandoffCopy = Readonly<{
  errors: Record<PaymentHandoffErrorCode, string>;
}>;

const esCopy: PaymentHandoffCopy = {
  errors: {
    INVALID_PAYMENT_HANDOFF_REQUEST: "No pudimos validar esta reserva pendiente. Inténtalo de nuevo.",
    PENDING_HOLD_NOT_FOUND: "No encontramos esta reserva pendiente.",
    PENDING_HOLD_NOT_PAYABLE: "Esta reserva ya no está disponible para pago.",
    PENDING_HOLD_EXPIRED: "El tiempo para pagar esta reserva pendiente expiró. Crea una nueva reserva.",
    PAYMENT_HANDOFF_UNAVAILABLE_DATES:
      "Estas fechas ya no están disponibles antes del pago. Crea una nueva reserva con otro rango de fechas.",
    PAYMENT_HANDOFF_QUOTE_CHANGED:
      "El total de esta reserva cambió antes del pago. Calcula nuevamente la reserva.",
    PAYMENT_HANDOFF_UNEXPECTED_ERROR:
      "No pudimos validar la reserva antes del pago. Inténtalo de nuevo.",
  },
};

const enCopy: PaymentHandoffCopy = {
  errors: {
    INVALID_PAYMENT_HANDOFF_REQUEST: "We could not validate this pending reservation. Please try again.",
    PENDING_HOLD_NOT_FOUND: "We could not find this pending reservation.",
    PENDING_HOLD_NOT_PAYABLE: "This reservation is no longer available for payment.",
    PENDING_HOLD_EXPIRED: "The payment window for this pending reservation expired. Create a new reservation.",
    PAYMENT_HANDOFF_UNAVAILABLE_DATES:
      "These dates are no longer available before payment. Create a new reservation with a different date range.",
    PAYMENT_HANDOFF_QUOTE_CHANGED:
      "The reservation total changed before payment. Please calculate the reservation again.",
    PAYMENT_HANDOFF_UNEXPECTED_ERROR:
      "We could not validate the reservation before payment. Please try again.",
  },
};

export function getPaymentHandoffCopy(locale: "es" | "en"): PaymentHandoffCopy {
  return locale === "en" ? enCopy : esCopy;
}

export function getPaymentHandoffErrorMessage(
  code: PaymentHandoffErrorCode,
  locale: "es" | "en",
): string {
  return getPaymentHandoffCopy(locale).errors[code];
}
