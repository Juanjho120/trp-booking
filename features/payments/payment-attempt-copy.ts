import type { PaymentHandoffErrorCode } from "@/features/reservations/reservation-payment-handoff-copy";

export type PaymentAttemptErrorCode =
  | PaymentHandoffErrorCode
  | "PAYMENT_ATTEMPT_AMOUNT_MISMATCH"
  | "PAYMENT_ATTEMPT_UNEXPECTED_ERROR";

type PaymentAttemptCopy = Readonly<{
  errors: Record<PaymentAttemptErrorCode, string>;
}>;

const esCopy: PaymentAttemptCopy = {
  errors: {
    INVALID_PAYMENT_HANDOFF_REQUEST:
      "No pudimos preparar el intento de pago. Inténtalo de nuevo.",
    PENDING_HOLD_NOT_FOUND: "No encontramos esta reserva pendiente.",
    PENDING_HOLD_NOT_PAYABLE: "Esta reserva ya no está disponible para pago.",
    PENDING_HOLD_EXPIRED:
      "El tiempo para pagar esta reserva pendiente expiró. Crea una nueva reserva.",
    PAYMENT_HANDOFF_UNAVAILABLE_DATES:
      "Estas fechas ya no están disponibles antes del pago. Crea una nueva reserva con otro rango de fechas.",
    PAYMENT_HANDOFF_QUOTE_CHANGED:
      "El total de esta reserva cambió antes del pago. Calcula nuevamente la reserva.",
    PAYMENT_HANDOFF_UNEXPECTED_ERROR:
      "No pudimos validar la reserva antes del pago. Inténtalo de nuevo.",
    PAYMENT_ATTEMPT_AMOUNT_MISMATCH:
      "Ya existe un intento de pago pendiente que no coincide con el total actual. Crea una nueva reserva o contacta al alojamiento.",
    PAYMENT_ATTEMPT_UNEXPECTED_ERROR:
      "No pudimos preparar el intento de pago. Inténtalo de nuevo.",
  },
};

const enCopy: PaymentAttemptCopy = {
  errors: {
    INVALID_PAYMENT_HANDOFF_REQUEST:
      "We could not prepare the payment attempt. Please try again.",
    PENDING_HOLD_NOT_FOUND: "We could not find this pending reservation.",
    PENDING_HOLD_NOT_PAYABLE: "This reservation is no longer available for payment.",
    PENDING_HOLD_EXPIRED:
      "The payment window for this pending reservation expired. Create a new reservation.",
    PAYMENT_HANDOFF_UNAVAILABLE_DATES:
      "These dates are no longer available before payment. Create a new reservation with a different date range.",
    PAYMENT_HANDOFF_QUOTE_CHANGED:
      "The reservation total changed before payment. Please calculate the reservation again.",
    PAYMENT_HANDOFF_UNEXPECTED_ERROR:
      "We could not validate the reservation before payment. Please try again.",
    PAYMENT_ATTEMPT_AMOUNT_MISMATCH:
      "A pending payment attempt already exists and does not match the current total. Create a new reservation or contact the property.",
    PAYMENT_ATTEMPT_UNEXPECTED_ERROR:
      "We could not prepare the payment attempt. Please try again.",
  },
};

export function getPaymentAttemptCopy(locale: "es" | "en"): PaymentAttemptCopy {
  return locale === "en" ? enCopy : esCopy;
}

export function getPaymentAttemptErrorMessage(
  code: PaymentAttemptErrorCode,
  locale: "es" | "en",
): string {
  return getPaymentAttemptCopy(locale).errors[code];
}
