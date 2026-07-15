# 68 — Phase 9 Admin and Preparation Buffers Roadmap

## Status

Roadmap updated after completing Phase 9.9.

## Purpose

This document defines the Phase 9 work that follows payment validation and keeps admin visibility, dynamic preparation buffers, admin overrides, and Phase 10 emails separated into explicit subphases.

## Corrected Phase 9 Roadmap

```text
9.1 Tilopay sandbox strategy and environment contract — Completed
9.2 Tilopay environment validation — Completed
9.3 Payment record creation for pending reservations — Completed
9.4 Tilopay SDK V2 checkout foundation — Completed
9.5 Tilopay redirect, consult, and OrderHash V2 validation foundation — Completed
9.6 Confirm reservation only after validated payment — Completed
9.6.1 Tilopay sandbox hardening, retryable payment errors, status localization, and checkout UX — Completed
9.7 Admin reservation and payment review — Completed
9.8 Automatic preparation buffers in availability — Completed
9.9 Admin preparation buffer settings and manual unlock behavior — Completed
9.10 Phase 9 documentation update and closure — In progress
```

## Phase 9.7 — Admin Reservation and Payment Review

### Result

The protected admin dashboard provides read-only visibility into reservations, payments, safe Tilopay diagnostics, and SDK client events.

It does not provide manual confirmation, cancellation, refund, date-change, calendar-editing, email, or PMS actions.

Admin copy and visible statuses are localized through `messages/es.ts` and `messages/en.ts`.

## Phase 9.8 — Automatic Preparation Buffers in Availability

### Goal

Make availability block preparation buffers automatically for reservations that currently block public availability.

### Preparation buffer defaults

```text
Apartamento Blanco y Negro: 1 day before and 1 day after
Bungalow Refugio Perfecto: 2 days before and 2 days after
Refugio Completo: 2 days before and 2 days after
```

### Range convention

```text
Before check-in buffer: [checkInDate - daysBefore, checkInDate)
After check-out buffer: [checkOutDate, checkOutDate + daysAfter)
```

### Implemented behavior

```text
1. Active PENDING_PAYMENT reservation with expiresAt > now:
   - Blocks stay dates.
   - Blocks preparation buffers temporarily.

2. Expired PENDING_PAYMENT reservation:
   - Does not block stay dates.
   - Does not block preparation buffers.

3. PENDING_PAYMENT reservation with expiresAt = null:
   - Is not a valid active hold.
   - Does not block stay dates.
   - Does not block preparation buffers.

4. CONFIRMED reservation:
   - Blocks stay dates.
   - Blocks preparation buffers dynamically.

5. EXPIRED reservation:
   - Does not block stay dates.
   - Does not block preparation buffers.
```

### Technical decisions

```text
- Dynamic availability calculation remains the Phase 9.8 strategy.
- PENDING_PAYMENT buffers are not materialized in calendar_blocks.
- CONFIRMED direct-reservation buffers remain dynamic; Phase 9.9 selected auditable one-day override rows.
- Buffer values are read from Property.preparationDaysBefore and Property.preparationDaysAfter.
- The composed-listing dependency graph remains active.
- Persisted PREPARATION_BUFFER rows suppress a direct dynamic buffer only when linked to the same reservation.
- Airbnb iCal exports continue to exclude pending holds.
- Airbnb iCal exports include confirmed buffers, including export-window boundary cases.
```

### Not included in 9.8

```text
Admin configuration for daysBefore/daysAfter
New manual unlock behavior
Persistent buffer materialization for pending holds
Persistent direct-reservation buffer materialization
Email notifications
Guest date changes
PMS behavior
Prisma schema changes or migrations
```

## Phase 9.9 — Admin Preparation Buffer Settings and Manual Unlock Behavior

### Result

Phase 9.9 selected Option B:

```text
Dynamic direct-reservation buffers plus auditable override records
```

Implemented behavior:

```text
- Admin can configure daysBefore/daysAfter per accommodation from 0 through 30.
- Existing defaults remain 1/1, 2/2, and 2/2 until changed.
- Confirmed direct-reservation buffers are still calculated dynamically.
- A one-day PREPARATION_BUFFER CalendarBlock records each manual unlock.
- The row is linked to the reservation and records admin, timestamp, and required reason.
- Availability subtracts only the override range from the dynamic buffer.
- The reservation stay remains blocked.
- Composed-listing behavior remains active.
- iCal export applies the same override subtraction when an operational feed exists.
- Airbnb import sync reads current Property values when materializing imported preparation buffers.
- Property changes and unlock actions create AdminAuditLog entries.
```

### Persistence decision

No dedicated override model was required because the existing CalendarBlock schema already contains:

```text
reservationId
isAdminOverrideAllowed
unlockedByAdminAt
unlockedByAdminId
adminOverrideReason
soft-delete fields
```

The normal direct buffer is not materialized. Only the exception is persisted.

### Boundaries preserved

```text
No pending-hold override rows
No release of reservation stay dates
No guest date changes
No confirmation/cancellation/refund actions
No emails
No PMS behavior
No external_calendars seed or real Airbnb connection
No Prisma migration
```

### Operational iCal note

The calculation path is consistent now, but the real iCal end-to-end test remains deferred because the project intentionally has no operational ExternalCalendar rows, raw export tokens, or real Airbnb import URLs yet.

## Phase 9.10 — Phase 9 Documentation Update and Closure

### Goal

Close Phase 9 only after:

```text
- 9.7 admin review is completed.
- 9.8 dynamic preparation buffers are completed and validated.
- 9.9 admin buffer settings/unlock behavior is implemented or explicitly deferred.
- Phase 9 docs reflect the final payment, retry, admin, and buffer behavior.
```

### Required documentation updates at closure

```text
docs/10-phases.md
docs/11-progress-log.md
README.md
Any Phase 9 payment/admin/buffer docs added during implementation
```

## Validation Notes

Before closing 9.8:

```powershell
npm run db:validate
npm run lint
npm run build
```

Phase 9.9 implementation validation:

```powershell
npm run db:generate
npm run db:validate
npm run lint
npm run build
```

Manual validation is documented in `docs/71-admin-preparation-buffer-settings-and-overrides.md`.
