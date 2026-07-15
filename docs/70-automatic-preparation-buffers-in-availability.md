# 70 — Automatic Preparation Buffers in Availability

## Phase

```text
Phase: Phase 9 — Tilopay Sandbox Integration
Subphase: 9.8 Automatic preparation buffers in availability
Status: Completed
Next subphase: 9.9 Admin preparation buffer settings and manual unlock behavior
```

## Goal

Make public availability evaluate preparation buffers for all direct reservations that currently block booking, while keeping temporary holds dynamic and postponing admin configuration and unlock behavior to Phase 9.9.

## Implemented Files

```text
lib/availability/service.ts
lib/airbnb-ical/export-feed.ts
docs/35-preparation-buffer-and-blocked-date-evaluation.md
docs/68-phase-9-admin-and-preparation-buffers-roadmap.md
docs/70-automatic-preparation-buffers-in-availability.md
docs/10-phases.md
docs/11-progress-log.md
README.md
```

## Availability Status Matrix

| Reservation status | Additional condition | Stay blocks | Buffers block |
| --- | --- | --- | --- |
| `CONFIRMED` | None | Yes | Yes |
| `PENDING_PAYMENT` | `expiresAt > now` | Yes | Yes, temporarily |
| `PENDING_PAYMENT` | `expiresAt <= now` | No | No |
| `PENDING_PAYMENT` | `expiresAt = null` | No | No |
| `EXPIRED` | None | No | No |
| `CANCELLED` | None | No | No |
| `REFUNDED` | None | No | No |
| `PARTIALLY_REFUNDED` | None | No | No |

## Dynamic Buffer Strategy

Direct-reservation preparation buffers are calculated at read time by the availability service.

```text
No pending hold creates PREPARATION_BUFFER calendar_blocks.
No confirmed direct reservation creates PREPARATION_BUFFER calendar_blocks in 9.8.
```

This keeps temporary holds self-expiring and avoids adding persistence or cleanup behavior before the Phase 9.9 override strategy is selected.

## Buffer Values

The availability service reads:

```text
Property.preparationDaysBefore
Property.preparationDaysAfter
```

Expected current values:

```text
black-white-apartment: 1 / 1
perfect-retreat-bungalow: 2 / 2
complete-retreat: 2 / 2
```

No Prisma schema change or migration is required.

## Date Range Convention

```text
Stay: [checkInDate, checkOutDate)
Before buffer: [checkInDate - daysBefore, checkInDate)
After buffer: [checkOutDate, checkOutDate + daysAfter)
```

Check-out remains exclusive.

## Composed Listing Dependency

A stay or buffer for an individual listing also blocks Refugio Completo.

A stay or buffer for Refugio Completo also blocks both individual listings.

The implementation continues to use the centralized dependency rules from `lib/availability/rules.ts`.

## Persisted Buffer Precedence

A persisted `PREPARATION_BUFFER` can suppress a dynamic direct-reservation buffer only when it is linked to the same reservation.

This prevents an imported Airbnb buffer or another reservation's buffer from suppressing an unrelated direct-reservation buffer.

Existing unlocked same-reservation buffer rows remain capable of suppressing the dynamic equivalent. Phase 9.8 does not add a new unlock action or admin UI.

## Payment Handoff Compatibility

Payment preflight reuses `getAvailabilityBlockingRecords()` and excludes blocking records belonging to the reservation being paid.

Derived pending buffers retain `reservationId`, so:

```text
The hold does not conflict with itself.
The hold does conflict with stay or buffer ranges from another reservation.
```

## Airbnb iCal Export

Pending holds are not exported because they are short-lived payment holds.

Confirmed reservation stays and buffers are exported.

The confirmed-reservation lookup is expanded using the maximum relevant DB buffer values. This covers cases where:

```text
The reservation stay is just outside the export window,
but its before-check-in or after-check-out buffer intersects the export window.
```

## Public and Admin Copy

No visible UI copy was added in Phase 9.8.

Therefore:

```text
messages/es.ts unchanged
messages/en.ts unchanged
No hardcoded visible TSX copy added
No feature-local copy file added
No visible status or enum localization change required
```

## Out of Scope

```text
Admin buffer configuration
Manual unlock UI or new unlock actions
Materialized pending buffers
Materialized confirmed direct-reservation buffers
Reservation date modification
Stay extensions
Refund flows
Resend email notifications
PMS behavior
Prisma migrations
New dependencies
```

## Manual Validation

Use controlled development data with a known current time.

### Confirmed reservation

1. Create or identify a `CONFIRMED` reservation for `black-white-apartment` from August 10 to August 12.
2. Open the public availability calendar for the apartment.
3. Confirm August 9 through August 12 are unavailable:
   - August 9: before buffer.
   - August 10 and 11: stay nights.
   - August 12: after buffer.
4. Confirm the same blocked range affects `complete-retreat`.

### Active pending hold

1. Create a `PENDING_PAYMENT` hold with `expiresAt` in the future for `perfect-retreat-bungalow`, August 10 to August 12.
2. Confirm August 8 through August 13 are unavailable for the bungalow.
3. Confirm the same range affects `complete-retreat`.
4. Confirm no `PREPARATION_BUFFER` rows are created for that hold.

### Expired pending hold

1. Change the pending hold so `expiresAt <= now`, or run the existing expiration cleanup.
2. Confirm its stay dates and buffers no longer affect availability.
3. Confirm a pending row with `expiresAt = null` also does not block.

### Refugio Completo

1. Create a blocking reservation for `complete-retreat`.
2. Confirm its stay and 2/2 buffer range blocks both individual listings.

### iCal boundary

1. Use a confirmed reservation whose stay ends immediately before the export window but whose after buffer enters the window.
2. Generate the iCal export.
3. Confirm the intersecting buffer dates are included.
4. Confirm active pending holds are not included in the feed.

## Commands

```powershell
npm run db:validate
npm run lint
npm run build
```
