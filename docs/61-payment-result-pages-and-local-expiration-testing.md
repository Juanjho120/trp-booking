# 61 — Payment Result Pages and Local Expiration Testing

## Status

Prepared after the first successful Tilopay sandbox happy-path test.

## Context

The Tilopay callback successfully validated the payment and confirmed the reservation, but the guest-facing result route returned 404 because the configured destination URLs did not exist yet.

Observed successful callback destination:

```text
/reservas/pago/exitoso?paymentId=...&reservationId=...&paymentStatus=approved&reservationStatus=confirmed&reservationConfirmed=true&phaseBoundary=PAYMENT_VALIDATED_RESERVATION_CONFIRMED
```

## Result pages added

```text
app/reservas/pago/exitoso/page.tsx
app/reservas/pago/cancelado/page.tsx
app/reservas/pago/error/page.tsx
```

These pages are guest-facing destinations for:

```text
TILOPAY_SUCCESS_URL
TILOPAY_CANCEL_URL
TILOPAY_ERROR_URL
```

The pages render safe query-string details such as payment id, reservation id, status, and validation code.

## Calendar blocks note

The current Phase 9 flow confirms the reservation directly in `reservations`.

It does not create `calendar_blocks` rows for direct reservations yet.

Availability must continue using confirmed reservations and active pending holds as blocking sources. A dedicated later subphase can decide whether to materialize confirmed direct reservations into `calendar_blocks`.

## Local expiration testing endpoint

A local-only helper endpoint was added:

```text
GET  /api/dev/reservations/expire-pending-holds
POST /api/dev/reservations/expire-pending-holds
```

It calls:

```text
expirePendingReservationHolds()
```

The route returns 404 in production.

## Local test command

```bash
curl -X POST http://localhost:3000/api/dev/reservations/expire-pending-holds
```

or open this in the browser while running `npm run dev`:

```text
http://localhost:3000/api/dev/reservations/expire-pending-holds
```

## Validation

```bash
npm run build
```

Manual happy-path validation:

```text
1. Complete a Tilopay sandbox approved payment.
2. Confirm payments.status = APPROVED.
3. Confirm reservations.status = CONFIRMED.
4. Confirm redirect lands on /reservas/pago/exitoso without 404.
5. Confirm the page displays the reservation id and payment id.
```
