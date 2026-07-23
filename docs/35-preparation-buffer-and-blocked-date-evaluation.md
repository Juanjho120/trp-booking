# 35 — Preparation Buffer and Blocked-Date Evaluation

This document records the Phase 6.4 preparation-buffer foundation, the Phase 9.8 pending-hold update, the Phase 9.9 auditable override strategy, the Phase 9.9.1 property-calendar operations, and the Phase 11.2 lifecycle-request hold foundation.

## Original Phase 6 Context

```text
Phase: Phase 6 — Availability Calendar Foundation
Original subphase: 6.4 Preparation buffer and blocked-date evaluation
Later rule updates: 9.8 Automatic preparation buffers in availability; 9.9 Admin settings and auditable overrides; 11.2 Lifecycle request holds
```

Phase 6.4 introduced dynamic preparation buffers for confirmed reservations before the real pending-payment flow existed.

Phase 9.8 updated that behavior once active payment holds became part of the production booking flow.

Phase 11.2 adds a separate temporary hold for authorized date-change or stay-extension requests that are waiting for an adjustment payment. It is not a `CalendarBlock` and it never replaces the original confirmed reservation.

## Blocking Sources

The availability service evaluates:

```text
CONFIRMED direct reservations
Active PENDING_PAYMENT holds with expiresAt > now
Active lifecycle-request holds with expiresAt > now
Manual calendar blocks
Maintenance calendar blocks
Airbnb calendar blocks
Composed-listing dependency blocks
Persisted preparation buffer blocks
Dynamic preparation buffer ranges from blocking direct reservations
Dynamic preparation buffer ranges from active lifecycle-request holds
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

A lifecycle-request hold snapshots those two values when it is created so its protected range does not move silently if accommodation settings change while an adjustment payment is pending.

## Range Convention

```text
Stay: [checkInDate, checkOutDate)
Before buffer: [checkInDate - daysBefore, checkInDate)
After buffer: [checkOutDate, checkOutDate + daysAfter)
```

## Expanded Reservation Lookup Window

Preparation buffers may overlap a requested availability range even when the reservation stay itself does not.

The service expands reservation lookup using the maximum relevant `daysBefore` and `daysAfter` values for all accommodations that can block the requested listing.

Lifecycle-request hold lookup uses the accepted accommodation-setting upper bound of 30 preparation days because each hold owns a snapshot of the values that were active when the hold was created.

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

## Phase 11.2 Lifecycle-Request Hold Rule

A lifecycle-request hold exists only for a typed date-change or stay-extension request whose requested dates need temporary protection, normally while a positive adjustment payment is pending.

```text
LifecycleRequestHold.status = ACTIVE and expiresAt > now
-> blocks requested stay dates
-> blocks its snapshotted preparation buffers
-> follows composed-listing dependency rules
-> does not release or replace the original confirmed reservation

LifecycleRequestHold.expiresAt <= now
-> blocks neither requested stay dates nor preparation buffers

LifecycleRequestHold.status = RELEASED or EXPIRED
-> blocks neither requested stay dates nor preparation buffers
```

The hold belongs one-to-one to a lifecycle request. Its expiration has no schema default because the business duration remains an explicit Phase 11.5 decision. The service treats an elapsed `expiresAt` as nonblocking even before a later cleanup process persists `status = EXPIRED`.

Availability checks may provide:

```text
excludeReservationId
excludeLifecycleRequestId
```

These exclusions are server-side domain options for Phase 11.5. They allow final validation to ignore only the original reservation and the request's own hold while preserving every other reservation, Airbnb booking, manual block, maintenance block, preparation buffer, and competing lifecycle hold.

## Derived vs Persisted Preparation Buffers

For direct reservations:

```text
1. The service derives the complete buffer from the current Property settings.
2. Same-reservation PREPARATION_BUFFER ranges are subtracted from that dynamic buffer.
3. An unlocked one-day override therefore removes only that day, not the complete before/after side.
4. Active same-reservation persisted buffer ranges remain authoritative blockers and suppress the overlapping dynamic portion to avoid duplication.
5. A PREPARATION_BUFFER belonging to another reservation or an imported calendar event does not suppress this direct reservation's dynamic buffer.
```

For lifecycle-request holds:

```text
1. The service derives the buffer from the hold's preparation snapshots.
2. The hold and its buffers remain temporary and expire together.
3. Admin preparation-buffer unlock records do not modify lifecycle-request holds.
4. A later Phase 11 mutation must release or expire the hold explicitly when the request completes, is rejected, is withdrawn, or expires.
```

## Composed Listing Rules

The same dependency graph applies to stay and buffer ranges:

```text
Apartamento Blanco y Negro blocks itself and Refugio Completo.
Bungalow Refugio Perfecto blocks itself and Refugio Completo.
Refugio Completo blocks itself and both individual accommodations.
```

This dependency graph also applies to lifecycle-request holds.

## Airbnb iCal Export

Airbnb iCal exports include:

```text
CONFIRMED stay ranges
CONFIRMED preparation-buffer ranges
Active persisted calendar blocks
```

Pending payment holds and lifecycle-request holds remain excluded because they are short-lived internal payment/change protections rather than confirmed bookings.

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
Reservation stays, active pending holds, lifecycle-request holds, and Airbnb booking blocks remain read-only in calendar operations.
```

## Out of Scope After Phase 11.2

```text
Lifecycle request mutation UI or API actions
Admin approval/rejection/cancellation execution
Tilopay refund/reversal requests
Adjustment checkout creation
Automatic hold creation or cleanup worker
Lifecycle emails
Guest self-service date modification
PMS behavior
```

## Validation

Run:

```powershell
npm run db:format
npm run db:validate
npm run db:generate
npm run lint
npm run build
git diff --check
```

The detailed Phase 11.2 persistence and migration contract is documented in `docs/97-phase-11.2-lifecycle-request-persistence-and-audit-foundation.md`.
