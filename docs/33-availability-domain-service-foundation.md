# 33 — Availability Domain Service Foundation

This document completes Phase 6.2 and defines the first server-side availability evaluation service for TRP Booking.

## Phase

```text
Phase: Phase 6 — Availability Calendar Foundation
Subphase completed by this document: 6.2 Availability domain service foundation
Next subphase: 6.3 Public availability calendar UI foundation
```

## Goal

Phase 6.2 turns the Phase 6.1 availability rules into a server-side domain service.

The goal is intentionally limited:

```text
Read relevant reservations through Prisma.
Read relevant calendar blocks through Prisma.
Apply composed listing dependency rules.
Respect confirmed reservations.
Respect active pending payment holds.
Respect manual, maintenance, Airbnb, composed dependency, and preparation buffer blocks.
Ignore expired pending reservations.
Ignore soft-deleted calendar blocks.
Ignore manually unlocked preparation buffer blocks.
Return a typed availability result for a requested accommodation and date range.
```

Phase 6.2 does not create reservations, start checkout, integrate Tilopay, send email, import/export Airbnb iCal, create migrations, seed data, or add PMS functionality.

## Files Added

```text
lib/db/prisma.ts
lib/availability/service.ts
docs/33-availability-domain-service-foundation.md
```

## Files Updated

```text
README.md
docs/10-phases.md
docs/11-progress-log.md
types/availability.ts
lib/availability/rules.ts
lib/availability/index.ts
```

## Prisma Client Foundation

A reusable Prisma client was added at:

```text
lib/db/prisma.ts
```

This is the first shared Prisma client helper in the project. It uses the standard Next.js development pattern of reusing the Prisma client in non-production environments to avoid creating too many connections during local hot reload.

This helper does not perform database writes by itself.

## Availability Service

The service lives in:

```text
lib/availability/service.ts
```

It exposes:

```text
getAvailabilityBlockingRecords()
checkAccommodationAvailability()
```

### getAvailabilityBlockingRecords()

This function returns the blocking records that overlap a requested accommodation/date range.

It reads from:

```text
Reservation
CalendarBlock
```

Reservation blockers include:

```text
CONFIRMED reservations
PENDING_PAYMENT reservations with no expiration
PENDING_PAYMENT reservations with expiresAt in the future
```

Calendar block blockers include non-deleted blocks from:

```text
DIRECT_RESERVATION
AIRBNB
MANUAL_BLOCK
MAINTENANCE
COMPOSED_LISTING_DEPENDENCY
PREPARATION_BUFFER
```

Unlocked preparation buffer blocks are ignored because those dates become available again unless another reservation or block still covers the same range.

### checkAccommodationAvailability()

This function returns:

```text
requestedRange
available
blockingRecords
affectedAccommodationIds
blockingAccommodationIds
```

`affectedAccommodationIds` answers:

```text
If this accommodation is reserved, which accommodations become unavailable?
```

`blockingAccommodationIds` answers:

```text
Which accommodations can make this requested accommodation unavailable?
```

For example:

```text
Checking Refugio Completo must look at:
- Refugio Completo
- Apartamento Blanco y Negro
- Bungalow Refugio Perfecto

Checking Apartamento Blanco y Negro must look at:
- Apartamento Blanco y Negro
- Refugio Completo
```

## Date Range Rules

The service preserves the Phase 6.1 lodging convention:

```text
checkInDate/startDate is inclusive
checkOutDate/endDate is exclusive
```

Overlap rule:

```text
existing.startDate < requested.endDate
existing.endDate > requested.startDate
```

This allows a guest to check in on the same date another guest checks out, unless a preparation buffer or another block covers that date.

## Property Resolution

The public site still uses typed accommodation config.

The availability service resolves database `Property` records using the stable seed strategy:

```text
Accommodation.slug.es -> Property.slug
```

The seed strategy already documents the Spanish slugs as stable database keys:

```text
apartamento-blanco-y-negro
bungalow-refugio-perfecto
refugio-completo
```

If a required property record is missing, the service throws an internal error instead of silently returning available dates. This prevents false availability when the database is not ready or seed data is missing.

## Server-Side Only Boundary

The availability service must remain server-side only.

It must be used from:

```text
Server components
Route handlers
Server actions introduced in later phases
Other server-side services
```

It must not be imported directly by client components.

## What Phase 6.2 Does Not Do

Phase 6.2 does not add:

```text
Public interactive calendar UI
Route handlers for availability
Reservation creation
Pending reservation creation
Payment start
Tilopay integration
Resend integration
Airbnb iCal import/export
Admin calendar management UI
Database migrations
Seed data
Database writes
PMS features
```

## Validation

After applying this update, run:

```powershell
npm run env:validate
npm run db:validate
npm run lint
npm run build
```

Expected results:

```text
Environment variables are valid.
Prisma schema is valid.
Lint passes.
Build passes.
```

## Next Step

```text
Phase 6.3 — Public availability calendar UI foundation
```

The next subphase should use this service foundation to add public date visibility without creating reservations or starting checkout yet.
