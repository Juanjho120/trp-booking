# 58 — Confirm Reservation After Validated Payment

## Status

Completed as part of Phase 9.6.

## Purpose

Phase 9.6 completes the first safe reservation-confirmation transition for direct bookings.

A reservation can be confirmed only after:

```text
1. Tilopay redirect is received.
2. Tilopay /consult validates the transaction server-side.
3. OrderHash V2 is valid.
4. Internal Payment.status becomes APPROVED.
5. The reservation confirmation service confirms the matching reservation.
```

## New reservation confirmation service

```text
lib/reservations/confirmation.ts
```

The service exposes:

```text
confirmReservationAfterApprovedPayment(paymentId)
```

It is intentionally payment-driven. It does not confirm a reservation directly from the browser, from the SDK, or from a public request.

## Confirmation rules

Allowed transition:

```text
Payment.status = APPROVED
Reservation.status = PENDING_PAYMENT or EXPIRED
→ Reservation.status = CONFIRMED
→ Reservation.confirmedAt = Payment.paidAt or now
→ Reservation.expiresAt = null
```

Idempotent transition:

```text
Payment.status = APPROVED
Reservation.status = CONFIRMED
Reservation.confirmedAt is not null
→ return current confirmation result without changing the record again
```

Rejected transitions:

```text
Payment.status != APPROVED
Reservation.status = CANCELLED
Reservation.status = REFUNDED
Reservation.status = PARTIALLY_REFUNDED
Reservation.status = BLOCKED
```

## Why EXPIRED can still be confirmed

A pending hold can expire while the user is already inside the provider payment flow.

If Tilopay validates the payment as approved, TRP Booking confirms the reservation to avoid a paid-but-unconfirmed operational state.

If this becomes risky after real sandbox testing, add an availability revalidation before the status transition and document the refund/manual review behavior.

## Updated Tilopay callback behavior

`processTilopayPaymentRedirect()` now:

```text
- keeps the Phase 9.5 provider validation
- updates Payment.status
- confirms Reservation only when Payment.status = APPROVED
- keeps Reservation unconfirmed for REJECTED or FAILED payment results
```

The redirect route now appends these query params to the guest-facing result URL:

```text
paymentId
reservationId
paymentStatus
reservationStatus
reservationConfirmed
phaseBoundary
```

## No emails yet

Phase 9.6 does not send Resend emails.

Email delivery remains Phase 10 unless explicitly moved.

## No Prisma migration

The existing schema already supports the transition:

```text
Reservation.status
Reservation.confirmedAt
Reservation.expiresAt
Payment.status
Payment.paidAt
Payment.failedAt
Payment.providerTransactionId
Payment.rawPayload
```

No new model, enum, or migration is required.

## No PMS behavior

Phase 9.6 does not add:

```text
- admin reservation management
- PMS workflows
- manual date changes
- stay extensions
- refunds
- housekeeping tasks
- maintenance tasks
```

## Calendar blocks

Phase 9.6 confirms the reservation status only.

Calendar block generation for confirmed direct reservations should be handled in a later dedicated subphase if the project needs explicit `calendar_blocks` rows beyond the existing reservation-status-based availability behavior.

## Files added or updated

```text
lib/reservations/confirmation.ts
lib/reservations/index.ts
types/reservation-confirmation.ts
types/tilopay-payment-result.ts
lib/payments/tilopay-payment-result.ts
lib/payments/index.ts
app/api/payments/tilopay/redirect/route.ts
docs/58-confirm-reservation-after-validated-payment.md
docs/10-phases.md
docs/11-progress-log.md
README.md
```

## Validation checklist

Run:

```bash
npm run env:validate
npm run lint
npm run build
```

Manual sandbox test:

```text
1. Create a PENDING_PAYMENT reservation.
2. Complete payment through Tilopay SDK sandbox.
3. Let Tilopay redirect back to TRP Booking.
4. Verify Payment.status = APPROVED.
5. Verify Reservation.status = CONFIRMED.
6. Verify Reservation.confirmedAt is set.
7. Verify Reservation.expiresAt is null.
8. Verify no email was sent.
```

Rejected payment test:

```text
1. Complete a rejected/failed sandbox payment.
2. Verify Payment.status = REJECTED or FAILED.
3. Verify Reservation.status did not become CONFIRMED.
```

## Next subphase

```text
9.7 Phase 9 documentation update
```
