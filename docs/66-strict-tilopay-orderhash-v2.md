# 66 — Strict Tilopay OrderHash V2 Validation

## Status

Prepared during Phase 9 sandbox testing.

## Context

Tilopay documentation for Hash V2 defines the server-side validation formula using:

```text
hashVersion = "V2"
OrderHash returned at the end of the purchase
```

The previous TRP Booking implementation used the correct shared secret shape:

```text
tpt|api_key|api_password
```

But it signed a pipe-delimited message. Tilopay's document signs the PHP `http_build_query($params)` output instead.

## Correct signing message

The signing parameters must be serialized as an application/x-www-form-urlencoded query string equivalent to PHP `http_build_query`:

```text
api_Key=<api_key>&api_user=<api_user>&orderId=<tpt>&external_orden_id=<orderNumber>&amount=<amount>&currency=<currency>&responseCode=<code>&auth=<auth>&email=<email>
```

Important field names:

```text
api_Key
api_user
orderId
external_orden_id
amount
currency
responseCode
auth
email
```

The field name `external_orden_id` is intentionally kept as written in Tilopay's PHP sample.

## Strict behavior

OrderHash is now mandatory in all environments.

```text
OrderHash valid   -> payment can be marked APPROVED or REJECTED based on responseCode.
OrderHash invalid -> payment is marked FAILED and reservation is not confirmed.
OrderHash missing -> payment is marked FAILED and reservation is not confirmed.
```

There is no longer a sandbox bypass.

```text
sandbox_mismatch_allowed removed
```

## Expected payload after a successful approved payment

```json
{
  "validation": {
    "status": "APPROVED",
    "orderHash": "valid",
    "orderHashMatchedVariant": "payment_provider_reference",
    "providerOrderNumberMatched": true,
    "reservationConfirmation": "pending_phase_9_6_transition"
  }
}
```

If Tilopay signs with the commerce-prefixed order number returned by `/consult`, the matched variant can be:

```text
consult_order_number
```

## Validation

Run after applying the ZIP:

```bash
npm run build
```

Manual test:

```text
1. Create a new pending reservation.
2. Pay with an approved sandbox card.
3. Confirm Payment.rawPayload.validation.orderHash = "valid".
4. Confirm Payment.rawPayload.validation.orderHashMatchedVariant is not null.
5. Confirm Payment.status = APPROVED.
6. Confirm Reservation.status = CONFIRMED.
```

If `orderHash` remains `invalid`, the payment must fail and the reservation must not confirm. In that case, inspect:

```text
Payment.rawPayload.validation.orderHashAttemptedVariants
```

and compare the values used by Tilopay with the fields returned in redirect and `/consult`.
