# 50 — Availability revalidation before payment handoff

## Status

In progress as part of Phase 8.5.

## Purpose

This subphase adds the server-side validation boundary required immediately before a future payment handoff.

The goal is to verify that a previously created `PENDING_PAYMENT` reservation is still eligible for payment without integrating Tilopay, creating payment records, sending emails, confirming reservations, or adding PMS behavior.

## Public endpoint

```txt
POST /api/reservations/payment-handoff/validate
```

### Request body

```ts
{
  reservationId: string;
  locale: "es" | "en";
}
```

## Server-side validation rules

The endpoint validates the reservation server-side and returns safe public handoff readiness data only when all conditions pass.

The server:

1. Validates the request body with Zod.
2. Loads the reservation by id.
3. Requires `status = PENDING_PAYMENT`.
4. Requires a non-null `expiresAt`.
5. Requires `expiresAt > now`.
6. Recalculates the quote using the DB-backed pricing service.
7. Verifies that the stored reservation amounts still match the recalculated quote.
8. Revalidates availability for the reservation date range.
9. Ignores the reservation itself while checking blocking records so the active pending hold does not conflict with itself.
10. Returns `readyForPayment = true` only when the hold is still payable.

## Self-blocking rule

Active pending holds block availability through their `Reservation` record.

During payment handoff validation, the reservation being validated must not block itself. The validation service therefore filters out blocking records whose `reservationId` matches the pending reservation currently being validated.

Any other active pending hold, confirmed reservation, Airbnb block, manual block, maintenance block, composed-listing dependency, or preparation buffer can still make the handoff unavailable.

## Response boundary

Successful responses return a safe payment readiness object:

```ts
{
  paymentHandoff: {
    reservationId: string;
    reservationStatus: "PENDING_PAYMENT";
    status: "READY_FOR_PAYMENT";
    readyForPayment: true;
    expiresAt: string;
    accommodationId: string;
    accommodationSlug: LocalizedText;
    checkInDate: string;
    checkOutDate: string;
    guestCount: number;
    total: ReservationQuoteAmount;
    currency: "USD";
    quote: ReservationQuote;
    futurePaymentProvider: "TILOPAY";
    phaseBoundary: "PAYMENT_PROVIDER_NOT_INTEGRATED";
  }
}
```

The response intentionally does not include provider credentials, payment tokens, checkout URLs, admin notes, raw operational records, or private provider data.

## Out of scope

This subphase intentionally does not add:

- Tilopay checkout.
- Tilopay payment intents.
- Tilopay redirect URLs.
- Payment records.
- Payment webhooks.
- Reservation confirmation.
- `CONFIRMED` status changes.
- Resend emails.
- Admin reservation UI.
- PMS behavior.
- New Prisma schema fields.
- New migrations.

## Files added or updated

```txt
app/api/reservations/payment-handoff/validate/route.ts
features/reservations/reservation-payment-handoff-copy.ts
lib/reservations/index.ts
lib/reservations/payment-handoff.ts
types/reservation-payment-handoff.ts
docs/50-availability-revalidation-before-payment-handoff.md
README.md
docs/10-phases.md
docs/11-progress-log.md
```

## Validation checklist

Run:

```bash
npm run lint
npm run build
```

Manual check after creating a valid 8.4 pending hold:

```bash
curl -X POST http://localhost:3000/api/reservations/payment-handoff/validate \
  -H "content-type: application/json" \
  -d '{"reservationId":"REPLACE_WITH_PENDING_RESERVATION_ID","locale":"es"}'
```

Expected result for a fresh active pending reservation:

```txt
HTTP 200
paymentHandoff.readyForPayment = true
paymentHandoff.status = READY_FOR_PAYMENT
paymentHandoff.reservationStatus = PENDING_PAYMENT
paymentHandoff.phaseBoundary = PAYMENT_PROVIDER_NOT_INTEGRATED
```

Database checks:

```sql
select id, status, expires_at, total, currency
from trp_booking.reservations
where id = '<reservation_id>';
```

The validation endpoint must not create records in:

```txt
payments
email_notifications
calendar_blocks
```
