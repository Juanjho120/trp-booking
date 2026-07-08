# 35 — Preparation Buffer and Blocked-Date Evaluation

This document completes Phase 6.4 and records how TRP Booking evaluates preparation buffers and blocked dates in the public availability foundation.

## Phase

```text
Phase: Phase 6 — Availability Calendar Foundation
Subphase completed by this document: 6.4 Preparation buffer and blocked-date evaluation
Next subphase: 6.5 Phase 6 documentation update
```

## Goal

Phase 6.4 strengthens the availability service after the first public calendar UI.

The goal is to make availability evaluation closer to real lodging operations without introducing booking checkout, payments, email, Airbnb iCal sync, migrations, seed data, or PMS behavior.

## Implemented Behavior

The availability service now evaluates these blocking sources:

```text
CONFIRMED direct reservations
Active PENDING_PAYMENT holds
Manual calendar blocks
Maintenance calendar blocks
Airbnb calendar blocks when present as CalendarBlock records
Composed listing dependency blocks when present as CalendarBlock records
Persisted preparation buffer blocks
Derived preparation buffer blocks from confirmed reservations
```

## Preparation Buffer Rules

TRP Booking keeps the documented buffer policies:

```text
Apartamento Blanco y Negro: 1 day before check-in and 1 day after check-out
Bungalow Refugio Perfecto: 2 days before check-in and 2 days after check-out
Refugio Completo: 2 days before check-in and 2 days after check-out
```

The service derives preparation buffer blocking records from confirmed reservations at read time.

This is intentional because Phase 6 does not yet create reservations or persist automatic preparation buffer blocks.

## Expanded Reservation Lookup Window

Preparation buffers may fall outside the reservation stay range.

Example:

```text
Reservation: July 10 to July 12
Before check-in buffer: July 8 to July 10 for a 2-day buffer accommodation
After check-out buffer: July 12 to July 14 for a 2-day buffer accommodation
```

If the public API asks only for July 8 or July 13, a simple reservation overlap query would miss the reservation because the stay itself does not overlap the requested date.

Phase 6.4 fixes that by expanding the reservation lookup window using the maximum preparation buffer policies for the accommodations that can block the requested listing.

## Derived vs Persisted Preparation Buffers

The service follows this precedence:

```text
1. Persisted CalendarBlock records remain authoritative when they exist.
2. Unlocked PREPARATION_BUFFER CalendarBlock records suppress derived buffer records for the matching range.
3. If no persisted preparation buffer block exists for the matching range, the service derives the buffer from the confirmed reservation.
```

This allows public availability to be correct now while leaving room for a later admin/reservation flow to persist real preparation buffer blocks.

## Pending Payment Holds

Pending payment holds continue to block the selected stay dates only.

They do not derive preparation buffer blocks because the operational buffer should apply to confirmed reservations and imported bookings, not abandoned payment attempts.

## Blocked-Date Evaluation

The service still ignores:

```text
Expired PENDING_PAYMENT reservations
Soft-deleted CalendarBlock records
Manually unlocked PREPARATION_BUFFER CalendarBlock records
```

The public availability API receives blocking records and marks unavailable days as disabled/non-selectable.

## Out of Scope

Phase 6.4 intentionally does not add:

```text
Reservation creation
Pending hold creation
Checkout
Tilopay integration
Resend integration
Airbnb iCal import/export
Database migrations
Seed data
Admin calendar UI
Admin preparation buffer unlock UI
Persistence of automatic preparation buffer blocks
PMS features
```

## Validation Checklist

Run:

```bash
npm run db:generate
npm run build
npm run env:validate
npm run db:validate
npm run lint
```

Manual checks:

```text
Open /disponibilidad.
Confirm the page still renders all 3 accommodations.
Create or use a confirmed reservation in local/dev data if available.
Check dates immediately before and after the reservation.
Confirm preparation buffer dates are shown as unavailable.
Confirm pending payment holds block only their stay dates.
Confirm unlocked PREPARATION_BUFFER calendar blocks do not block availability.
```

## Completion Decision

Phase 6.4 is complete when the service can show unavailable dates from confirmed reservations, active pending holds, persisted calendar blocks, and derived preparation buffers without creating reservations or introducing checkout.
