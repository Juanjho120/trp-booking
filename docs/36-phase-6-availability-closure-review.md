# 36 — Phase 6 Availability Closure Review

This document closes Phase 6 — Availability Calendar Foundation.

Phase 6 created the first real availability foundation for TRP Booking without introducing checkout, payments, email delivery, Airbnb iCal synchronization, admin calendar management, migrations, seed data, reservation creation, or PMS features.

## Phase

```text
Phase closed by this document: Phase 6 — Availability Calendar Foundation
Subphase completed by this document: 6.5 Phase 6 documentation update
Next phase: Phase 7 — Airbnb iCal Synchronization
Next subphase: 7.1 Airbnb iCal strategy and environment contract
```

## Closure Decision

Phase 6 is complete because the project now has:

```text
Typed date-only availability rules
Typed accommodation dependency rules
Preparation buffer range helpers
Reusable server-side Prisma client helper
Server-side availability service
Runtime public availability API
Public non-booking availability page
Blocked-date evaluation for reservations and calendar blocks
Derived preparation buffer blocking records from confirmed reservations
Documentation for all Phase 6 availability decisions
```

## Completed Subphases

```text
6.1 Availability strategy and booking calendar rules — Completed
6.2 Availability domain service foundation — Completed
6.3 Public availability calendar UI foundation — Completed
6.4 Preparation buffer and blocked-date evaluation — Completed
6.5 Phase 6 documentation update — Completed
```

## Implemented Technical Foundation

Phase 6 added the following availability foundation:

```text
types/availability.ts
lib/availability/rules.ts
lib/availability/service.ts
lib/availability/index.ts
lib/db/prisma.ts
app/api/availability/route.ts
app/disponibilidad/page.tsx
features/availability/components/public-availability-calendar.tsx
features/availability/copy.ts
features/availability/index.ts
```

## Implemented Documentation

Phase 6 added these documentation files:

```text
docs/32-availability-strategy-and-calendar-rules.md
docs/33-availability-domain-service-foundation.md
docs/34-public-availability-calendar-ui-foundation.md
docs/35-preparation-buffer-and-blocked-date-evaluation.md
docs/36-phase-6-availability-closure-review.md
```

## Availability Rules Preserved

Phase 6 preserves the documented lodging convention:

```text
checkInDate is inclusive
checkOutDate is exclusive
Date-only values use YYYY-MM-DD
```

Phase 6 also preserves composed listing behavior:

```text
Apartamento Blanco y Negro blocks Apartamento Blanco y Negro and Refugio Completo.
Bungalow Refugio Perfecto blocks Bungalow Refugio Perfecto and Refugio Completo.
Refugio Completo blocks Refugio Completo, Apartamento Blanco y Negro, and Bungalow Refugio Perfecto.
```

## Preparation Buffer Rules Preserved

Phase 6 preserves the documented preparation buffer policies:

```text
Apartamento Blanco y Negro: 1 day before check-in and 1 day after check-out
Bungalow Refugio Perfecto: 2 days before check-in and 2 days after check-out
Refugio Completo: 2 days before check-in and 2 days after check-out
```

Confirmed reservations derive preparation buffer blocking records at read time until a later reservation/admin flow persists automatic preparation buffer blocks.

Pending payment holds intentionally do not derive preparation buffers.

## Blocked-Date Evaluation

The availability service evaluates these blocking sources:

```text
CONFIRMED direct reservations
Active PENDING_PAYMENT holds
Manual calendar blocks
Maintenance calendar blocks
Airbnb calendar blocks when represented as CalendarBlock records
Composed listing dependency blocks when represented as CalendarBlock records
Persisted preparation buffer blocks
Derived preparation buffer blocks from confirmed reservations
```

The availability service ignores:

```text
Expired PENDING_PAYMENT reservations
Soft-deleted CalendarBlock records
Manually unlocked PREPARATION_BUFFER CalendarBlock records
```

Unlocked preparation buffer blocks also suppress matching derived preparation buffer records.

## Public Availability API

The public API added in Phase 6:

```text
GET /api/availability
```

Its purpose is to provide date visibility for the public availability UI.

It is not a reservation endpoint.

It does not create records, start checkout, collect payment, send email, expose admin data, or synchronize Airbnb calendars.

## Public Availability Page

The public page added in Phase 6:

```text
/disponibilidad
```

The page displays availability for:

```text
Apartamento Blanco y Negro
Bungalow Refugio Perfecto
Refugio Completo
```

Unavailable dates are visually disabled/non-selectable.

The page intentionally does not allow booking or date selection during Phase 6.

## Explicit Out of Scope

Phase 6 intentionally does not add:

```text
Reservation creation
Pending hold creation
Checkout
Tilopay integration
Resend integration
Airbnb iCal import
Airbnb iCal export
Scheduled calendar sync
Manual admin sync
Database migrations
Seed data
Admin calendar UI
Admin preparation buffer unlock UI
Persistence of automatic preparation buffer blocks
PMS features
```

## Handoff to Phase 7

Phase 7 must build on the Phase 6 availability foundation.

The next phase should focus on Airbnb iCal synchronization and must reuse these Phase 6 rules:

```text
Date-only range handling
Composed listing dependencies
Preparation buffer policies
Soft-delete behavior
Manual preparation buffer unlock behavior
Public availability blocking semantics
```

Phase 7 must not commit real Airbnb iCal URLs or expose private tokens.

## Phase 7 Starting Point

The next subphase is:

```text
7.1 Airbnb iCal strategy and environment contract
```

The first Phase 7 task should define:

```text
How Airbnb import URLs are stored safely
How export tokens are generated and protected
How raw token values are kept out of logs and public responses
How imported events map to CalendarBlock records
How preparation buffers apply to imported Airbnb bookings
How exported iCal feeds should represent unavailable dates later
How cron/manual sync will be secured later
```

The first Phase 7 task should not yet implement parser logic, cron sync, admin sync UI, export endpoints, checkout, payments, email, migrations, seed data, or PMS features.

## Validation Checklist

Run:

```bash
npm run db:generate
npm run build
npm run env:validate
npm run db:validate
npm run lint
```

Manual check:

```text
Open /disponibilidad.
Confirm the public availability page still renders.
Confirm no booking or checkout flow was added.
Confirm Phase 6 is marked as completed in docs/10-phases.md.
Confirm Phase 7.1 is marked as the current subphase in docs/10-phases.md and docs/11-progress-log.md.
```

## Final Phase 6 Status

```text
Phase 6 — Availability Calendar Foundation: Completed
Next phase: Phase 7 — Airbnb iCal Synchronization
```
