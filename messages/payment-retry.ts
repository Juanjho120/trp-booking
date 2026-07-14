import type { TilopayRetryPaymentIssue } from "@/types/tilopay-retry-payment";

export type PaymentRetryLocale = "es" | "en";

export const paymentRetryMessages = {
  es: {
    page: {
      title: "Reintentar pago seguro",
      description:
        "Tu reserva sigue pendiente de pago. Revisa los datos e intenta completar el pago nuevamente.",
      missingReservationTitle: "No encontramos la reserva pendiente",
      missingReservationDescription:
        "El enlace de pago no incluye una reserva válida. Crea una nueva reserva o contáctanos para recibir ayuda.",
      supportNote:
        "Si el problema continúa, contáctanos para ayudarte a completar el pago de forma segura.",
    },
    errors: {
      invalid_card_number: "Ingresa un número de tarjeta válido.",
      invalid_cvv: "El CVV no es válido. Revisa el código de seguridad e inténtalo de nuevo.",
      insufficient_funds:
        "La tarjeta no tiene fondos suficientes. Usa otra tarjeta o contacta a tu banco.",
      card_not_allowed:
        "Esta tarjeta no puede utilizarse para completar el pago. Usa otra tarjeta o contacta a tu banco.",
    },
  },
  en: {
    page: {
      title: "Retry secure payment",
      description:
        "Your reservation is still pending payment. Review the details and try completing the payment again.",
      missingReservationTitle: "We could not find the pending reservation",
      missingReservationDescription:
        "This payment link does not include a valid reservation. Create a new reservation or contact us for help.",
      supportNote:
        "If the problem continues, contact us so we can help you complete the payment securely.",
    },
    errors: {
      invalid_card_number: "Please enter a valid card number.",
      invalid_cvv: "The CVV is invalid. Review the security code and try again.",
      insufficient_funds: "The card has insufficient funds. Use another card or contact your bank.",
      card_not_allowed: "This card cannot be used to complete the payment. Use another card or contact your bank.",
    },
  },
} as const;

export function getPaymentRetryMessages(locale: PaymentRetryLocale) {
  return paymentRetryMessages[locale];
}

export function getPaymentRetryErrorMessage(
  locale: PaymentRetryLocale,
  issue: TilopayRetryPaymentIssue,
): string {
  return paymentRetryMessages[locale].errors[issue];
}
