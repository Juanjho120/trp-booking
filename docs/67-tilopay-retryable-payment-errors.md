# 67 — Tilopay Retryable Payment Errors

## Status

Prepared during Phase 9 sandbox testing after strict OrderHash V2 validation was confirmed working. Updated to keep retry copy centralized in messages/es.ts and messages/en.ts.

## Context

Manual sandbox tests identified two different failure moments:

```text
1. Client-side SDK failure before redirect.
2. Server-side validated rejected payment after redirect + /consult + OrderHash.
```

The existing flow already stored client-side SDK failures in `payment_client_events` and server-side payment results in `payments.raw_payload`, but all rejected server-side cases redirected to `/reservas/pago/cancelado`.

## Decision

A new retry page was added:

```text
/reservas/pago/reintentar?reservationId=<id>&paymentIssue=<issue>
```

This page rebuilds the checkout using only `reservationId`. It is intentionally reusable for future admin-generated payment retry links.

## Retryable cases

### Client-side SDK: invalid card number

Tilopay SDK can return:

```json
{ "message": "Please enter a valid card number" }
```

TRP Booking maps this to:

```text
paymentIssue = invalid_card_number
fieldIssue = card_details
```

Behavior:

```text
- Show localized TRP Booking message.
- Mark Card number and Expiration in red.
- Clear the red state when the guest changes either Card number or Expiration.
- Store the SDK event in payment_client_events.
```

### Server-side rejected: invalid CVV

Tilopay can return code `82` with description `Invalid CVV`.

TRP Booking maps this to:

```text
paymentIssue = invalid_cvv
fieldIssue = cvv
```

Behavior:

```text
- Redirect to /reservas/pago/reintentar.
- Show localized TRP Booking message.
- Mark only CVV in red.
- Clear the red state when the guest changes CVV.
```

### Server-side rejected: insufficient funds

Tilopay can return code `51` with description `Insufficient funds`.

TRP Booking maps this to:

```text
paymentIssue = insufficient_funds
fieldIssue = null
```

Behavior:

```text
- Redirect to /reservas/pago/reintentar.
- Show localized TRP Booking message.
- Do not mark any field in red.
```

### Server-side rejected: stolen card / sensitive card status

Tilopay can return code `43` with description similar to `Pick up card stolen card`.

TRP Booking maps this to a safe public message:

```text
paymentIssue = card_not_allowed_sensitive
fieldIssue = null
```

Behavior:

```text
- Redirect to /reservas/pago/reintentar.
- Do not show the raw provider description to the guest.
- Show a safe localized message asking the guest to use another card or contact their bank.
- Do not mark any field in red.
```

## Non-retryable rejected cases

Any other validated `REJECTED` payment remains routed to:

```text
/reservas/pago/cancelado
```

## Security and privacy

```text
- No card number is stored.
- No CVV is stored.
- No expiration date is stored.
- Raw Tilopay descriptions remain in payments.raw_payload for admin/debugging.
- Guest-facing copy is mapped to localized TRP Booking messages in messages/es.ts and messages/en.ts.
```

## Future admin usage

The retry page can later be reused by the admin module to generate payment retry links for guests who contact the property after payment problems.

Example future link:

```text
/reservas/pago/reintentar?reservationId=<pending-reservation-id>
```

## Validation

Run:

```bash
npm run build
```

Manual tests:

```text
1. Invalid card number before redirect:
   Expected: same checkout, localized invalid card number message, Card number + Expiration red.

2. Invalid CVV after redirect:
   Expected: /reservas/pago/reintentar, localized invalid CVV message, CVV red.

3. Insufficient funds after redirect:
   Expected: /reservas/pago/reintentar, localized insufficient funds message, no red fields.

4. Stolen/sensitive card after redirect:
   Expected: /reservas/pago/reintentar, safe localized card-not-allowed message, no red fields.

5. Any other REJECTED payment:
   Expected: /reservas/pago/cancelado.
```
