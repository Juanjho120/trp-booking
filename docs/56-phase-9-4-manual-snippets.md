# 56A — Phase 9.4 Manual Snippets

These snippets are intentionally small because the existing files are long and the changes are surgical.

## 1. Update features/reservations/components/reservation-request-form.tsx

Add this import after the Button import:

```ts
import { TilopaySdkCheckout } from "@/features/payments/components/tilopay-sdk-checkout";
```

After the existing PendingHoldSummary block:

```tsx
{pendingHold ? (
  <PendingHoldSummary
    copy={pendingHoldCopy}
    locale={locale}
    pendingHold={pendingHold}
  />
) : null}
```

add:

```tsx
{pendingHold ? <TilopaySdkCheckout reservationId={pendingHold.reservationId} /> : null}
```

Optionally avoid duplicate pending-hold creation by changing the create-hold button disabled prop to:

```tsx
disabled={status === "loading" || holdStatus === "loading" || Boolean(pendingHold)}
```

## 2. Update messages/es.ts

Add this top-level object after `reservations` and before `admin`:

```ts
  payments: {
    tilopaySdk: {
      title: "Pago seguro con Tilopay",
      description:
        "Completa el pago dentro de esta página usando el formulario seguro de Tilopay. No guardamos los datos de tu tarjeta.",
      preparePayment: "Preparar pago seguro",
      preparingPayment: "Preparando pago seguro...",
      initializingPayment: "Inicializando formulario seguro de Tilopay...",
      cardSectionTitle: "Datos de tarjeta",
      secureFieldsNote:
        "Estos campos son procesados por Tilopay SDK. TRP Booking no almacena número de tarjeta, CVV ni fecha de expiración.",
      paymentMethod: "Método de pago",
      cardNumber: "Número de tarjeta",
      cardExpiration: "Vencimiento",
      cardCvv: "CVV",
      pay: "Pagar reserva",
      processingPayment: "Procesando pago...",
      paymentSubmitted:
        "El pago fue enviado a Tilopay. Espera la respuesta del formulario seguro antes de cerrar esta página.",
      providerNote:
        "La reserva se confirmará únicamente después de validar el resultado del pago en el servidor.",
      sessionError: "No pudimos preparar el formulario de pago. Inténtalo de nuevo.",
      sdkError: "No pudimos inicializar el formulario seguro de Tilopay. Inténtalo de nuevo.",
      paymentError: "No pudimos enviar el pago a Tilopay. Revisa los datos e inténtalo de nuevo.",
    },
  },
```

Inside `errors.payment`, after the existing `attempt` object, add:

```ts
      tilopaySdk: {
        INVALID_PAYMENT_HANDOFF_REQUEST:
          "No pudimos preparar el pago. Inténtalo de nuevo.",
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
        TILOPAY_SDK_TOKEN_UNAVAILABLE:
          "No pudimos conectar con Tilopay para preparar el pago. Inténtalo de nuevo.",
        TILOPAY_SDK_SESSION_UNEXPECTED_ERROR:
          "No pudimos preparar el formulario de pago. Inténtalo de nuevo.",
      },
```

## 3. Update messages/en.ts

Add this top-level object after `reservations` and before `admin`:

```ts
  payments: {
    tilopaySdk: {
      title: "Secure payment with Tilopay",
      description:
        "Complete payment inside this page using Tilopay's secure form. We do not store your card details.",
      preparePayment: "Prepare secure payment",
      preparingPayment: "Preparing secure payment...",
      initializingPayment: "Initializing Tilopay secure form...",
      cardSectionTitle: "Card details",
      secureFieldsNote:
        "These fields are processed by Tilopay SDK. TRP Booking does not store card number, CVV, or expiration date.",
      paymentMethod: "Payment method",
      cardNumber: "Card number",
      cardExpiration: "Expiration",
      cardCvv: "CVV",
      pay: "Pay reservation",
      processingPayment: "Processing payment...",
      paymentSubmitted:
        "The payment was sent to Tilopay. Wait for the secure form response before closing this page.",
      providerNote:
        "The reservation will only be confirmed after the payment result is validated on the server.",
      sessionError: "We could not prepare the payment form. Please try again.",
      sdkError: "We could not initialize the Tilopay secure form. Please try again.",
      paymentError: "We could not send the payment to Tilopay. Review the details and try again.",
    },
  },
```

Inside `errors.payment`, after the existing `attempt` object, add:

```ts
      tilopaySdk: {
        INVALID_PAYMENT_HANDOFF_REQUEST:
          "We could not prepare the payment. Please try again.",
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
        TILOPAY_SDK_TOKEN_UNAVAILABLE:
          "We could not connect to Tilopay to prepare payment. Please try again.",
        TILOPAY_SDK_SESSION_UNEXPECTED_ERROR:
          "We could not prepare the payment form. Please try again.",
      },
```
