# 57 — Tilopay Redirect, Consult, and OrderHash V2 Validation

## Status

Completed as part of Phase 9.5.

## Purpose

This subphase adds the server-side foundation for validating a Tilopay SDK payment result before TRP Booking ever confirms a reservation.

Phase 9.5 validates the provider result and updates `Payment.status`, but it does **not** set `Reservation.status = CONFIRMED`.

## Environment update

Phase 9.5 adds a dedicated callback URL:

```env
TILOPAY_REDIRECT_URL=https://<app-domain>/api/payments/tilopay/redirect
```

`TILOPAY_REDIRECT_URL` is the URL passed to Tilopay SDK as `redirect`.

`TILOPAY_SUCCESS_URL`, `TILOPAY_CANCEL_URL`, and `TILOPAY_ERROR_URL` remain guest-facing result destinations after TRP Booking processes the callback.

## Route added

```text
GET /api/payments/tilopay/redirect
```

The route:

```text
1. Receives Tilopay redirect query parameters.
2. Resolves the internal Payment by providerReference/orderNumber.
3. Calls Tilopay /login server-side.
4. Calls Tilopay /consult server-side.
5. Validates amount, currency, order number, and email when provided.
6. Validates OrderHash V2 with HMAC-SHA256.
7. Updates Payment.status.
8. Redirects the guest to the configured success, cancel, or error URL.
```

## Tilopay consult endpoint

```text
POST https://app.tilopay.com/api/v1/consult
```

Request body:

```json
{
  "key": "api_key",
  "orderNumber": "TRP-payment-id",
  "merchantId": ""
}
```

The endpoint is called server-side only. Tilopay credentials and bearer tokens are never exposed to the browser.

## OrderHash V2

Phase 9.5 implements OrderHash V2 using HMAC-SHA256.

Signing key:

```text
tpt | api_key | api_password
```

Signing message fields in exact order:

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

The implementation supports hexadecimal and base64 HMAC digests because the final Tilopay response format must still be verified against sandbox.

## Redirect parameter compatibility

The redirect parser accepts the names documented across the PDF/support responses:

```text
responseCode or code
auth
external_order_id, order, or orderNumber
orderId, tpt, or tilopay-transaction
OrderHash or orderHash
returnData
amount
currency
email or billToEmail
form_update
```

## Payment status mapping

```text
responseCode/code 1 or 00 -> PaymentStatus.APPROVED
other provider response code -> PaymentStatus.REJECTED
consult/hash/mismatch failures -> PaymentStatus.FAILED
```

`Payment.providerTransactionId` stores the Tilopay transaction/order id when available.

`Payment.rawPayload` stores sanitized audit information only. It does not store card data, credentials, bearer tokens, or raw secrets.

## Reservation boundary

Phase 9.5 intentionally does not confirm reservations.

Allowed in 9.5:

```text
Payment PENDING -> APPROVED
Payment PENDING -> REJECTED
Payment PENDING -> FAILED
```

Not allowed in 9.5:

```text
Reservation PENDING_PAYMENT -> CONFIRMED
email notifications
refund processing
admin payment UI
PMS behavior
```

Reservation confirmation belongs to Phase 9.6.

## Validation checklist

After adding `TILOPAY_REDIRECT_URL` to local `.env`, run:

```bash
npm run env:validate
npm run lint
npm run build
```

## Next subphase

```text
9.6 Confirm reservation only after validated payment
```
