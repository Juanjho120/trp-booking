# 52 — Phase 8 Reservation Flow Closure Review

## Status

Completed as part of Phase 8.6.

## Purpose

This document formally closes Phase 8 — Reservation Flow.

Phase 8 created the pre-payment direct reservation foundation for TRP Booking. It allows guests to calculate a server-side quote, enter reservation details through controlled UI inputs, create a temporary pending reservation hold, validate that hold before future payment handoff, and automatically mark expired holds as `EXPIRED`.

Phase 8 intentionally stops before real Tilopay payment processing.

## Completed subphases

```text
8.1 Reservation flow strategy and pending hold contract — Completed
8.2 Reservation quote and server-side pricing foundation — Completed
8.3 Public guest details and reservation request form — Completed
8.3.1 Initial seed and DB-backed accommodation source — Completed
8.3.2 Reservation form UX and manual locale switcher — Completed
8.4 Pending reservation creation and expiration handling — Completed
8.5 Availability revalidation before payment handoff — Completed
8.5.1 Pending hold expiration status cleanup — Completed
8.6 Phase 8 documentation update — Completed
```

## What Phase 8 added

Phase 8 added the following reservation-flow foundation:

```text
- Server-side quote calculation.
- Public reservation request form.
- DB-backed accommodation source for quote and reservation flow.
- Styled date range, guest count, country, phone, and arrival-time inputs.
- Manual ES/EN locale switcher.
- PENDING_PAYMENT reservation hold creation.
- ReservationGuest creation with pending reservation holds.
- 15-minute pending hold expiration timestamp.
- Server-side availability revalidation before writing pending holds.
- Server-side payment handoff readiness validation.
- Quote/totals verification before payment handoff readiness.
- Availability revalidation before payment handoff readiness.
- Self-blocking exclusion for the pending reservation being validated.
- Protected cron cleanup for expired PENDING_PAYMENT holds.
- EXPIRED status transition for expired pending holds.
```

## What Phase 8 intentionally did not add

Phase 8 intentionally did not add:

```text
- Tilopay checkout.
- Tilopay payment intents or sessions.
- Tilopay redirect behavior.
- Tilopay webhook validation.
- Payment records created from provider attempts.
- Reservation confirmation.
- status = CONFIRMED transitions.
- Resend email delivery.
- Admin reservation management UI.
- PMS behavior.
- Card data storage.
```

## Reservation lifecycle after Phase 8

The completed Phase 8 lifecycle is:

```text
1. Guest selects accommodation, dates, and guest count.
2. Server calculates a non-binding quote.
3. Guest enters contact and stay details.
4. Server validates guest details.
5. Server recalculates quote.
6. Server revalidates availability.
7. Server creates a Reservation with status = PENDING_PAYMENT.
8. Server sets expiresAt to a non-null timestamp.
9. Active pending holds block availability while expiresAt > now.
10. Expired pending holds stop blocking availability when expiresAt <= now.
11. Payment handoff readiness can be validated before Phase 9 payment integration.
12. A protected cron route marks expired PENDING_PAYMENT holds as EXPIRED.
```

The lifecycle still stops before payment processing.

## Availability behavior

Availability after Phase 8 follows these rules:

```text
PENDING_PAYMENT + expiresAt > now  => blocks availability
PENDING_PAYMENT + expiresAt <= now => does not block availability
EXPIRED                            => does not block availability
CONFIRMED                          => blocks availability and derived preparation buffers
```

The expiration cron improves persisted data clarity but does not control availability release. Availability release is based on `expiresAt <= now`.

## Payment handoff readiness behavior

Phase 8.5 added payment handoff readiness validation.

The endpoint validates:

```text
- Reservation exists.
- Reservation status is PENDING_PAYMENT.
- expiresAt is non-null.
- expiresAt > now.
- Quote can be recalculated from server-side DB-backed property data.
- Stored reservation totals still match the recalculated quote.
- Availability is still valid for the selected range.
- The reservation itself is excluded from its own blocking record evaluation.
```

The endpoint returns `readyForPayment = true` only when the hold is still eligible.

## Database state after Phase 8

Phase 8 writes:

```text
reservations
reservation_guests
```

Phase 8.5.1 updates:

```text
reservations.status = EXPIRED
```

Phase 8 does not write:

```text
payments
email_notifications
manual calendar blocks for pending holds
```

## Security boundaries preserved

Phase 8 preserves these security boundaries:

```text
- Provider secrets remain server-side.
- CRON_SECRET protects cron endpoints.
- Public APIs do not expose provider secrets.
- Public APIs do not expose raw operational provider payloads.
- Reservations are not confirmed without validated payment.
- Card data is not stored.
```

## Validation notes

Phase 8 was validated through the following user-confirmed checks:

```text
- A PENDING_PAYMENT reservation can be created successfully.
- Duplicate holds on the same active pending date range are blocked.
- No Payment records are created in Phase 8.
- No email_notifications records are created in Phase 8.
- No calendar_blocks records are created by the pending hold/payment handoff flow.
- The expiration cleanup cron route can be called successfully from PowerShell.
```

## Known intentional limitations

These are not bugs; they are Phase 9+ work:

```text
- There is no Tilopay checkout yet.
- There is no payment redirect yet.
- There is no payment webhook yet.
- There is no CONFIRMED reservation transition yet.
- There are no Resend emails yet.
- There is no admin reservation management UI yet.
```

## Phase 9 readiness

Phase 9 can now build on a stable reservation foundation:

```text
- Pending reservation exists before payment.
- Pending reservation has a limited payment window.
- Pending reservation can be revalidated before payment handoff.
- Expired pending reservations can be marked EXPIRED.
- Availability remains safe around active and expired holds.
```

Recommended Phase 9 starting point:

```text
9.1 Tilopay sandbox strategy and environment contract
```

Phase 9 should define:

```text
- Required Tilopay sandbox credentials.
- Server-side environment variable names.
- Payment creation flow for PENDING_PAYMENT reservations.
- Public redirect/handoff contract.
- Webhook validation contract.
- Payment failure/rejection behavior.
- Reservation CONFIRMED transition only after validated payment.
```

## Closure decision

Phase 8 is complete.

The next implementation phase is:

```text
Phase 9 — Tilopay Sandbox Integration
```
