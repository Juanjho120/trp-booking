# 35 — Preparation Buffer and Blocked-Date Evaluation

This document records the Phase 6.4 preparation-buffer foundation and the later Phase 9.8 rule that supersedes its original pending-hold limitation.

## Original Phase 6 Context

```text
Phase: Phase 6 — Availability Calendar Foundation
Original subphase: 6.4 Preparation buffer and blocked-date evaluation
Later rule update: 9.8 Automatic preparation buffers in availability
```

Phase 6.4 introduced dynamic preparation buffers for confirmed reservations before the real pending-payment flow existed.

Phase 9.8 updates that behavior now that active payment holds are part of the production booking flow.

## Blocking Sources

The availability service evaluates:

```text
CONFIRMED direct reservations
Active PENDING_PAYMENT holds with expiresAt > now
Manual calendar blocks
Maintenance calendar blocks
Airbnb calendar blocks
Composed-listing dependency blocks
Persisted preparation buffer blocks
Dynamic preparation buffer ranges from blocking direct reservations
```

## Preparation Buffer Defaults

```text
Apartamento Blanco y Negro: 1 day before check-in and 1 day after check-out
Bungalow Refugio Perfecto: 2 days before check-in and 2 days after check-out
Refugio Completo: 2 days before check-in and 2 days after check-out
```

Runtime availability reads the values from:

```text
Property.preparationDaysBefore
Property.preparationDaysAfter
```

## Range Convention

```text
Stay: [checkInDate, checkOutDate)
Before buffer: [checkInDate - daysBefore, checkInDate)
After buffer: [checkOutDate, checkOutDate + daysAfter)
```

## Expanded Reservation Lookup Window

Preparation buffers may overlap a requested availability range even when the reservation stay itself does not.

The service expands reservation lookup using the maximum relevant `daysBefore` and `daysAfter` values for all accommodations that can block the requested listing.

This preserves buffer visibility at both sides of a requested date range.

## Phase 9.8 Pending-Hold Rule

The Phase 6 statement that pending holds block only their selected stay dates is superseded.

The current rule is:

```text
PENDING_PAYMENT with expiresAt > now
-> blocks stay dates
-> blocks preparation buffers temporarily

PENDING_PAYMENT with expiresAt <= now
-> blocks neither stay dates nor preparation buffers

PENDING_PAYMENT with expiresAt = null
-> is not a valid active hold
-> blocks neither stay dates nor preparation buffers

EXPIRED
-> blocks neither stay dates nor preparation buffers
```

Temporary pending buffers are calculated dynamically. They are not written to `calendar_blocks`.

## Confirmed Reservation Rule

```text
CONFIRMED
-> blocks stay dates
-> blocks preparation buffers dynamically
```

Phase 9.8 does not materialize confirmed direct-reservation buffers into `calendar_blocks`. Phase 9.9 must decide the persistence or override strategy before implementing manual unlock behavior for those dynamic buffers.

## Derived vs Persisted Preparation Buffers

For direct reservations:

```text
1. A persisted PREPARATION_BUFFER linked to the same reservation remains authoritative.
2. If that same-reservation buffer was unlocked, the dynamic equivalent is suppressed.
3. A PREPARATION_BUFFER belonging to another reservation or an imported calendar event does not suppress the direct reservation's dynamic buffer.
4. If no same-reservation persisted block exists, the service derives the buffer dynamically.
```

This prevents an unrelated or unlocked imported buffer from accidentally removing a direct reservation's buffer.

## Composed Listing Rules

The same dependency graph applies to stay and buffer ranges:

```text
Apartamento Blanco y Negro blocks itself and Refugio Completo.
Bungalow Refugio Perfecto blocks itself and Refugio Completo.
Refugio Completo blocks itself and both individual accommodations.
```

## Airbnb iCal Export

Airbnb iCal exports include:

```text
CONFIRMED stay ranges
CONFIRMED preparation-buffer ranges
Active persisted calendar blocks
```

Pending payment holds remain excluded because they are short-lived payment holds.

The confirmed-reservation lookup window is expanded so a buffer is exported when it intersects the export window even if the reservation stay itself is immediately outside that window.

## Out of Scope for Phase 9.8

```text
Admin buffer configuration
Manual unlock UI or new unlock actions
Persistent direct-reservation buffer creation
Pending-payment buffer persistence
Email delivery
Guest date modification
Stay-extension workflows
PMS behavior
Prisma schema changes or migrations
```

## Validation

Run:

```powershell
npm run db:validate
npm run lint
npm run build
```

Manual checks are documented in `docs/70-automatic-preparation-buffers-in-availability.md`.
