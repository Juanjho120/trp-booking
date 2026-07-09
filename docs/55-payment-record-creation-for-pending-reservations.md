# 55 — Payment Record Creation for Pending Reservations

## Status

Completed as part of Phase 9.3.

## Purpose

This subphase creates the internal payment attempt foundation for direct reservations.

Phase 9.3 creates an auditable `Payment` record for an active `PENDING_PAYMENT` reservation after the reservation has passed the Phase 8.5 payment handoff readiness validation.

No Tilopay API call, checkout redirect, webhook handler, reservation confirmation, Resend email, schema change, migration, admin payment UI, or PMS behavior is added in this subphase.

## Starting point

The Prisma schema already includes:

```text
PaymentProvider.TILOPAY
PaymentStatus.PENDING
Payment model
Reservation.payments relation
```

Because the `Payment` model already exists, Phase 9.3 does not require a migration.

## Endpoint

Phase 9.3 adds:

```text
POST /api/payments/attempts
```

Request:

```json
{
  "reservationId": "reservation_id",
  "locale": "es"
}
```

Response:

```json
{
  "paymentAttempt": {
    "id": "payment_id",
    "reservationId": "reservation_id",
    "reservationStatus": "PENDING_PAYMENT",
    "provider": "TILOPAY",
    "status": "PENDING",
    "amount": {
      "currency": "USD",
      "amountCents": 14500,
      "amount": "145.00"
    },
    "currency": "USD",
    "existing": false,
    "expiresAt": "2026-07-09T00:00:00.000Z",
    "quote": {},
    "futurePaymentProvider": "TILOPAY",
    "phaseBoundary": "PAYMENT_PROVIDER_NOT_INTEGRATED"
  }
}
```

The `quote` object follows the existing `ReservationQuote` type.

## Service

Phase 9.3 adds:

```text
lib/payments/payment-attempts.ts
```

Main function:

```ts
createPaymentAttemptForPendingReservation()
```

The service:

```text
1. Validates the reservation id.
2. Calls validatePaymentHandoff().
3. Requires the reservation to still be PENDING_PAYMENT.
4. Requires expiresAt > now.
5. Recalculates quote and validates stored totals through the existing Phase 8.5 logic.
6. Revalidates availability through the existing Phase 8.5 logic.
7. Checks for an existing PENDING Tilopay Payment for the reservation.
8. Returns the existing Payment if amount and currency still match.
9. Creates a new Payment if none exists.
```

## Idempotency behavior

The service avoids creating unlimited duplicate pending payments.

Rule:

```text
reservation_id + provider = TILOPAY + status = PENDING
```

If a matching pending payment exists:

```text
- If amount and currency match the current validated total, return the existing payment.
- If amount or currency does not match, reject the request.
```

This is best-effort idempotency without adding a new database unique constraint in Phase 9.3.

A stricter database-level unique constraint can be considered later only if the payment provider flow requires it and a migration is explicitly planned.

## Payment record created

A new Payment record uses:

```text
reservationId = validated reservation id
provider = TILOPAY
status = PENDING
amount = validated reservation total
currency = USD
providerTransactionId = null
providerReference = null
paidAt = null
failedAt = null
rawPayload = null
```

Provider identifiers stay null because Phase 9.3 does not call Tilopay.

## Error handling

User-facing payment attempt error messages are centralized in:

```text
messages/es.ts
messages/en.ts
```

Route handlers must read the localized copy from those files instead of creating feature-specific copy files.

Supported error codes:

```text
INVALID_PAYMENT_HANDOFF_REQUEST
PENDING_HOLD_NOT_FOUND
PENDING_HOLD_NOT_PAYABLE
PENDING_HOLD_EXPIRED
PAYMENT_HANDOFF_UNAVAILABLE_DATES
PAYMENT_HANDOFF_QUOTE_CHANGED
PAYMENT_HANDOFF_UNEXPECTED_ERROR
PAYMENT_ATTEMPT_AMOUNT_MISMATCH
PAYMENT_ATTEMPT_UNEXPECTED_ERROR
```

## Out of scope

Phase 9.3 intentionally does not add:

```text
- Tilopay API calls.
- Checkout/session redirect.
- Provider transaction id persistence.
- Provider reference generation.
- Webhook/callback handling.
- Reservation CONFIRMED transition.
- Calendar block creation for confirmed reservations.
- Resend emails.
- Admin payment UI.
- Prisma schema changes.
- Prisma migrations.
- PMS behavior.
```

## Validation checklist

Run:

```bash
npm run env:validate
npm run lint
npm run build
```

Manual test example:

```bash
curl -X POST "http://localhost:3000/api/payments/attempts" \
  -H "Content-Type: application/json" \
  -d "{\"reservationId\":\"PENDING_RESERVATION_ID\",\"locale\":\"es\"}"
```

Expected result for an active payable pending reservation:

```text
HTTP 201
paymentAttempt.status = PENDING
paymentAttempt.provider = TILOPAY
```

Expected result when called again for the same pending reservation:

```text
HTTP 201
paymentAttempt.existing = true
```

## Corrective note

The initial 9.3 package introduced `features/payments/payment-attempt-copy.ts`.

That file is not part of the final intended structure and must be removed. Payment attempt user-facing messages belong in `messages/es.ts` and `messages/en.ts`.

## Next subphase

```text
9.4 Payment handoff redirect/session foundation
```

Phase 9.4 should prepare the checkout handoff/session boundary after an internal Payment record exists.
