# 35 — Preparation Buffer and Blocked-Date Evaluation

This document records the Phase 6.4 preparation-buffer foundation, the Phase 9.8 pending-hold update, and the Phase 9.9 auditable override strategy, and the Phase 9.9.1 property-calendar operations.

## Original Phase 6 Context

```text
Phase: Phase 6 — Availability Calendar Foundation
Original subphase: 6.4 Preparation buffer and blocked-date evaluation
Later rule updates: 9.8 Automatic preparation buffers in availability; 9.9 Admin settings and auditable overrides
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

Phase 9.9 keeps confirmed direct-reservation buffers dynamic. A manually unlocked day is persisted as a one-day, same-reservation `PREPARATION_BUFFER` CalendarBlock with unlock audit fields populated.

## Derived vs Persisted Preparation Buffers

For direct reservations:

```text
1. The service derives the complete buffer from the current Property settings.
2. Same-reservation PREPARATION_BUFFER ranges are subtracted from that dynamic buffer.
3. An unlocked one-day override therefore removes only that day, not the complete before/after side.
4. Active same-reservation persisted buffer ranges remain authoritative blockers and suppress the overlapping dynamic portion to avoid duplication.
5. A PREPARATION_BUFFER belonging to another reservation or an imported calendar event does not suppress this direct reservation's dynamic buffer.
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

Confirmed direct-reservation exports subtract the same auditable override ranges used by public availability. The confirmed-reservation lookup window is expanded so a buffer is exported when it intersects the export window even if the reservation stay itself is immediately outside that window.

Airbnb import sync also reads the current Property preparation values when it creates or refreshes imported buffer blocks.

The real iCal end-to-end test remains deferred until an operational ExternalCalendar configuration exists.

## Phase 9.9 Admin Overrides

```text
Configuration changes update Property.preparationDaysBefore/After.
One-day unlocks are allowed for future direct dynamic buffers and admin-unlockable persisted preparation buffers.
An internal note is optional; the authenticated admin and timestamp are always recorded.
Overrides can be restored through audited soft deletion.
AdminAuditLog records settings changes and unlock actions.
The reservation stay is never released by a buffer override.
```

See `docs/71-admin-preparation-buffer-settings-and-overrides.md` for the complete contract.

## Phase 9.9.1 Manual Calendar Operations

```text
MANUAL_BLOCK records may cover any future date range for one property.
A manual block can overlap reservations, Airbnb dates, or buffers as an independent reason to remain unavailable.
Releasing one day soft-deletes the original range and creates left/right replacement ranges when needed.
Composed-listing dependency rules apply to manual blocks exactly as they apply to reservations and buffers.
Reservation stays, active pending holds, and Airbnb booking blocks remain read-only.
```

## Out of Scope After Phase 9.9.1

```text
Materializing every direct-reservation buffer
Pending-payment buffer persistence
Operational external-calendar setup and real Airbnb E2E validation
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

Manual checks for the admin calendar follow-up are documented in `docs/72-admin-navigation-and-property-calendar-operations.md`.
