# 34 — Public Availability Calendar UI Foundation

This document completes Phase 6.3 and defines the first public availability calendar UI foundation for TRP Booking.

## Phase

```text
Phase: Phase 6 — Availability Calendar Foundation
Subphase completed by this document: 6.3 Public availability calendar UI foundation
Next subphase: 6.4 Preparation buffer and blocked-date evaluation
```

## Goal

Phase 6.3 exposes the first public availability visibility layer without enabling booking checkout.

The goal is intentionally limited:

```text
Add a runtime availability API for public calendar data.
Use the Phase 6.2 server-side availability service as the source of truth.
Add a public availability page.
Show available and unavailable dates per accommodation.
Keep unavailable dates visually disabled/non-selectable.
Keep checkout, date selection, reservation creation, and payment disabled.
```

## Public Route

Phase 6.3 adds:

```text
/disponibilidad
```

This route displays a public availability calendar card for:

```text
Apartamento Blanco y Negro
Bungalow Refugio Perfecto
Refugio Completo
```

The page is intentionally informational during this phase.

## Runtime API

Phase 6.3 adds:

```text
GET /api/availability
```

Accepted query parameters:

```text
accommodationId
startDate
endDate
```

Date format:

```text
YYYY-MM-DD
```

Availability range convention:

```text
startDate is inclusive.
endDate is exclusive.
```

Example:

```text
/api/availability?accommodationId=black-white-apartment&startDate=2026-08-01&endDate=2026-09-01
```

## API Behavior

The API:

```text
Validates the accommodation id.
Validates date-only values.
Rejects invalid or reversed ranges.
Caps public requests to a safe number of days.
Calls getAvailabilityBlockingRecords().
Builds one availability item per date.
Marks a day unavailable when a blocking record overlaps that day.
Returns availability-oriented blocking sources only.
```

The API does not expose:

```text
Guest names
Guest emails
Guest phones
Payment data
Provider references
Admin-only details
Raw external calendar payloads
```

## UI Behavior

The public calendar:

```text
Loads availability through /api/availability at runtime.
Shows a loading state.
Shows available dates.
Shows unavailable dates as disabled/non-selectable.
Shows a safe retry state if availability cannot be loaded.
Shows a notice that checkout and payment are not enabled yet.
```

The UI does not:

```text
Let guests select dates.
Create reservations.
Create pending payment holds.
Start payment.
Send email.
Modify reservation dates.
Unlock preparation buffer days.
```

## Files Added

```text
app/api/availability/route.ts
app/disponibilidad/page.tsx
features/availability/components/public-availability-calendar.tsx
features/availability/copy.ts
features/availability/index.ts
docs/34-public-availability-calendar-ui-foundation.md
```

## Files Updated

```text
README.md
docs/10-phases.md
docs/11-progress-log.md
```

## Phase 6 Boundaries Preserved

Phase 6.3 does not add:

```text
Booking checkout
Tilopay integration
Resend integration
Airbnb iCal import/export
Reservation creation
Pending hold creation
Admin calendar management UI
Database migrations
Seed data
PMS features
```

## Validation

After applying this update, run:

```bash
npm run db:generate
npm run build
npm run env:validate
npm run db:validate
npm run lint
```

Expected results:

```text
Prisma Client is generated.
Build passes.
Environment variables are valid.
Prisma schema is valid.
Lint passes.
```
