# 40 — Airbnb iCal Export Feed Foundation

This document completes Phase 7.4 and defines the first public-safe Airbnb iCal export feed foundation.

## Phase

```text
Phase: Phase 7 — Airbnb iCal Synchronization
Subphase completed by this document: 7.4 Airbnb iCal export feed foundation
Next subphase: 7.5 Scheduled sync and manual sync foundation
```

## Goal

Phase 7.4 adds a server-side export feed foundation so Airbnb can eventually import TRP Booking unavailable dates.

This subphase intentionally does not add cron scheduling, admin manual sync UI, reservation creation, checkout, Tilopay, Resend, seed data, migrations, real Airbnb URLs, raw reusable token storage, or PMS features.

## Implemented Files

```text
app/api/ical/[token]/route.ts
lib/airbnb-ical/export-feed.ts
lib/airbnb-ical/index.ts
lib/airbnb-ical/types.ts
docs/40-airbnb-ical-export-feed-foundation.md
```

## Public Endpoint

The export endpoint is:

```text
GET /api/ical/[token]
```

The token is the raw export feed token used by Airbnb.

The raw token is never stored in the database by this implementation. Runtime lookup hashes the received token and compares it with `ExternalCalendar.exportTokenHash`.

The endpoint returns:

```text
Content-Type: text/calendar; charset=utf-8
Cache-Control: no-store, max-age=0
```

If the token is invalid, disabled, soft-deleted, import-only, or otherwise unavailable, the endpoint returns a generic 404 without revealing whether a calendar record exists.

## Export Token Handling

Rules preserved:

```text
Do not store raw reusable export tokens.
Do not expose exportTokenHash in API responses.
Do not log raw tokens.
Do not include tokens in generated iCal content.
```

The helper added for Phase 7.4 is:

```text
hashAirbnbIcalExportToken(token)
```

It uses SHA-256 for deterministic lookup against `ExternalCalendar.exportTokenHash`.

Future admin tooling can generate a raw URL-safe token once, store only its hash, and show the raw token only at creation/rotation time.

## Export Calendar Eligibility

A calendar can produce an export feed only when:

```text
ExternalCalendar.provider = AIRBNB
ExternalCalendar.direction is EXPORT or BIDIRECTIONAL
ExternalCalendar.isExportEnabled = true
ExternalCalendar.status is not INACTIVE
ExternalCalendar.deletedAt is null
ExternalCalendar.exportTokenHash matches the hashed runtime token
```

`ERROR` status is not treated as an automatic export disable because import failures should not necessarily stop an otherwise valid export feed. Admin can disable export using `isExportEnabled = false` or set the configuration inactive in a later admin flow.

## Export Window

Default export window:

```text
lookbackDays = 0
lookaheadDays = 365
```

The exported window starts at the current UTC date and ends 365 days ahead by default.

The service supports optional server-side `lookbackDays` and `lookaheadDays` input for future internal use, but the public route uses defaults.

## Unavailable Sources

The export service includes unavailable date ranges from:

```text
CONFIRMED direct reservations
Derived preparation buffers for confirmed direct reservations
Active CalendarBlock records
Imported Airbnb blocks
Manual blocks
Maintenance blocks
Composed listing dependency blocks
Persisted preparation buffer blocks
```

The service ignores:

```text
Expired pending payment holds
Pending payment holds
Soft-deleted CalendarBlock records
Admin-unlocked PREPARATION_BUFFER CalendarBlock records
```

## Composed Listing Rules

The export service reuses the Phase 6 blocking dependency rules.

This means:

```text
Exporting Apartamento Blanco y Negro includes blocks that affect Apartamento Blanco y Negro.
Exporting Bungalow Refugio Perfecto includes blocks that affect Bungalow Refugio Perfecto.
Exporting Refugio Completo includes blocks that affect Refugio Completo.
```

The dependency lookup ensures composed listing consistency:

```text
Apartamento Blanco y Negro blocks Refugio Completo.
Bungalow Refugio Perfecto blocks Refugio Completo.
Refugio Completo blocks both individual listings.
```

## iCal Content

The generated feed contains only generic unavailable events.

VEVENT fields:

```text
UID
DTSTAMP
DTSTART;VALUE=DATE
DTEND;VALUE=DATE
SUMMARY:Unavailable
TRANSP:OPAQUE
```

The feed does not include:

```text
Guest names
Guest emails
Guest phone numbers
Payment data
Admin notes
Private Airbnb import URLs
Export token hashes
Raw export tokens
Internal error details
```

## Range Normalization

Unavailable ranges are clipped to the export window and normalized.

Overlapping or directly contiguous ranges are merged before generating VEVENT records. This keeps the feed smaller and avoids exposing unnecessary internal blocking source details.

## Database Writes

Phase 7.4 performs only one safe operational write when a valid feed is generated:

```text
ExternalCalendar.lastExportGeneratedAt
```

It does not create reservations, calendar sync logs, payment records, email records, migrations, or seed data.

## Out of Scope

Phase 7.4 intentionally does not add:

```text
Cron scheduling
Manual admin sync UI
Admin token generation UI
Export token rotation UI
Database migrations
Seed data
Reservation creation
Checkout
Tilopay integration
Resend integration
PMS features
Real Airbnb import URLs
Raw token storage
```

## Validation

After applying Phase 7.4, run:

```text
npm run db:generate
npm run db:validate
npm run build
npm run env:validate
npm run lint
```

## Completion Decision

Phase 7.4 is complete when the project has a public-safe `text/calendar` export feed foundation backed by hashed export token lookup, unavailable date range generation, composed listing rules, and documentation, without adding cron scheduling or admin UI.
