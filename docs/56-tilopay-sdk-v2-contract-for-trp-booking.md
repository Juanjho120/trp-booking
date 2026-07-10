# 56 — Tilopay SDK V2 Contract for TRP Booking

## Status

Completed as part of Phase 9.4.

## Purpose

This is the internal Tilopay contract for TRP Booking. It exists so future implementation and maintenance can be based on repository documentation instead of public links, PDFs, or chat history.

## Checkout experience decision

TRP Booking uses **Tilopay SDK V2** as the main checkout foundation.

The guest should not be sent away from the TRP Booking experience as the primary payment flow. The payment form is rendered inside the public reservation flow while Tilopay SDK handles the sensitive payment processing.

## Official SDK script

```text
https://app.tilopay.com/sdk/v2/sdk_tpay.min.js
```

For framework-based integrations, the script can be loaded dynamically with cache busting.

## Required frontend structure

Tilopay SDK V2 expects these DOM identifiers:

```text
.payFormTilopay
#tlpy_payment_method
#tlpy_saved_cards
#tlpy_card_payment_div
#tlpy_cc_number
#tlpy_cc_expiration_date
#tlpy_cvv
#tlpy_phone_number_div
#tlpy_phone_number
#responseTilopay
```

`#responseTilopay` is required by Tilopay for 3DS or provider response rendering when the method requires it.

## SDK functions used

```text
Tilopay.Init()
Tilopay.startPayment()
Tilopay.getCardType()      optional
Tilopay.updateOptions()    optional
```

Phase 9.4 uses:

```text
Tilopay.Init()
Tilopay.startPayment()
```

## Backend endpoint added by TRP Booking

```text
POST /api/payments/tilopay/sdk-session
```

The endpoint:

```text
1. Receives reservationId and locale.
2. Revalidates the active PENDING_PAYMENT reservation through the Phase 9.3 payment attempt service.
3. Creates or reuses a pending internal Payment record.
4. Ensures Payment.providerReference has a unique order number.
5. Calls Tilopay /loginSdk server-side.
6. Returns only safe SDK initialization data to the browser.
```

## Tilopay SDK token endpoint

```text
POST https://app.tilopay.com/api/v1/loginSdk
```

Request body:

```json
{
  "apiuser": "api_user",
  "password": "api_password",
  "key": "api_key"
}
```

Expected response:

```json
{
  "access_token": "jwt",
  "token_type": "bearer",
  "expires_in": 86400
}
```

Only `access_token` is sent to the frontend as part of the SDK initialization payload.

## SDK Init config

TRP Booking passes these values to `Tilopay.Init()`:

```text
token
currency
language
amount
billToFirstName
billToLastName
billToAddress
billToAddress2
billToCity
billToState
billToZipPostCode
billToCountry
billToTelephone
billToEmail
orderNumber
capture = 1
redirect
subscription = 0
hashVersion = V2
returnData
```

## Billing address policy

TRP Booking does not collect or store the guest's full billing address during the reservation request.

For Phase 9.4, required billing address values are completed server-side using business/location defaults:

```text
billToAddress: Panajachel
billToAddress2: Tu Refugio Perfecto
billToCity: Panajachel
billToState: GT-SO
billToZipPostCode: 07010
```

If Tilopay, the acquiring bank, or fraud controls require stricter AVS-style billing fields later, the reservation/payment UX must be reviewed before adding new public fields.

## Payment methods for this project

For regular lodging reservations, TRP Booking supports card payment through Tilopay SDK V2.

Out of scope for this phase:

```text
- Server-to-server card payments with PAN/CVV.
- Tokenized card storage.
- Recurrent payments or subscriptions.
- SINPE/Yappy/Tasa Cero/Tafi for the MVP reservation payment flow.
```

Sandbox restrictions from Tilopay support:

```text
- Sandbox and production credentials are the same.
- Test vs production mode is controlled from the Tilopay admin panel.
- Sandbox allows only contado card transactions with test cards.
- Sandbox does not support tokenized tests, recurrent charges, subscriptions, alternative payment methods, or 3DS.
```

## Redirect and validation

The SDK still requires a final redirect/callback URL.

Phase 9.4 initializes the SDK and starts payment. It does not confirm reservations.

Payment validation remains deferred to later subphases:

```text
9.5 Tilopay redirect, consult, and OrderHash V2 validation foundation
9.6 Confirm reservation only after validated payment
```

## OrderHash V2

TRP Booking sends:

```json
{
  "hashVersion": "V2"
}
```

Tilopay support confirmed that OrderHash V2 uses HMAC-SHA256.

Signing key format:

```text
tpt | api_key | api_password
```

Fields used for the signature, in exact order:

```text
api_key
api_user
orderId / tpt
external_order_id
amount
currency
responseCode
auth
email
```

The exact local implementation must be verified against sandbox in Phase 9.5.

## No webhook for regular hosted/SDK payments

Tilopay support confirmed that non-recurrent hosted/processPayment payments do not currently have webhooks.

For TRP Booking regular reservation payments, validation should use:

```text
- redirect response parameters
- OrderHash V2
- server-side consult endpoint
```

Recurrent-payment webhooks are out of scope.

## Security rules

TRP Booking must not read, store, log, or send to its backend:

```text
- card number
- CVV
- expiration date
- card tokens
```

The SDK fields are rendered in the browser because Tilopay requires them, but they are not controlled or persisted by TRP Booking business logic.

TRP Booking backend must not expose:

```text
- TILOPAY_API_KEY
- TILOPAY_API_USER
- TILOPAY_API_PASSWORD
- raw Tilopay provider errors
- raw sensitive provider payloads
```

## Files introduced in Phase 9.4

```text
app/api/payments/tilopay/sdk-session/route.ts
features/payments/components/tilopay-sdk-checkout.tsx
lib/payments/tilopay-sdk-session.ts
types/tilopay-sdk-session.ts
docs/56-tilopay-sdk-v2-contract-for-trp-booking.md
```

## Validation checklist

Run:

```bash
npm run env:validate
npm run lint
npm run build
```

Manual test:

```bash
curl -X POST "http://localhost:3000/api/payments/tilopay/sdk-session" \
  -H "Content-Type: application/json" \
  -d "{\"reservationId\":\"PENDING_RESERVATION_ID\",\"locale\":\"es\"}"
```

Expected result:

```text
HTTP 201 or 200
tilopaySdkSession.provider = TILOPAY
tilopaySdkSession.paymentStatus = PENDING
tilopaySdkSession.initConfig.token is present
tilopaySdkSession.initConfig.hashVersion = V2
tilopaySdkSession.phaseBoundary = TILOPAY_SDK_V2_CHECKOUT_FOUNDATION
```
