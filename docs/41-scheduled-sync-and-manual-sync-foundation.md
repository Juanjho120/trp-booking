# 41 — Scheduled Sync and Manual Sync Foundation

This document completes Phase 7.5 — Scheduled sync and manual sync foundation.

Phase 7.5 adds the first protected scheduled Airbnb iCal import sync foundation and a server-side manual sync service entry point without adding admin UI, checkout, payment, email, reservation flow, migrations, seed data, real Airbnb URLs, raw token storage, or PMS features.

## Phase

```text
Phase: Phase 7 — Airbnb iCal Synchronization
Subphase completed by this document: 7.5 Scheduled sync and manual sync foundation
Next subphase: 7.6 Phase 7 documentation update
```

## Source Documents

This subphase builds on:

```text
docs/07-airbnb-ical-sync.md
docs/37-airbnb-ical-strategy-and-environment-contract.md
docs/38-airbnb-calendar-configuration-model.md
docs/39-airbnb-ical-import-parser-and-sync-service.md
docs/40-airbnb-ical-export-feed-foundation.md
```

## Goal

Phase 7.5 connects the existing import sync service to a protected scheduled execution path.

It also introduces a reusable server-side manual sync function that a future protected admin UI or server action can call.

The implementation remains intentionally narrow:

```text
No admin sync UI
No admin server action exposed to the browser
No checkout
No payment
No email
No reservation creation
No database migration files
No seed data
No PMS features
```

## Added Files

```text
vercel.json
app/api/cron/sync-airbnb-calendars/route.ts
lib/airbnb-ical/scheduled-sync.ts
```

Updated files:

```text
.env.example
README.md
docs/10-phases.md
docs/11-progress-log.md
lib/airbnb-ical/index.ts
lib/airbnb-ical/types.ts
```

## Scheduled Sync Endpoint

Phase 7.5 adds:

```text
GET /api/cron/sync-airbnb-calendars
```

The endpoint is server-side only:

```text
export const runtime = "nodejs"
export const dynamic = "force-dynamic"
```

The endpoint calls:

```text
syncConfiguredAirbnbIcalImports({ triggeredBy: CalendarSyncTriggeredBy.CRON })
```

The endpoint returns a redacted operational summary only.

It does not return:

```text
Raw Airbnb import URLs
Encrypted import URL values
Export token hashes
Raw export tokens
Guest data
Payment data
Admin notes
Raw provider error details
```

## Cron Security

The endpoint requires `CRON_SECRET`.

Accepted authentication methods:

```text
Authorization: Bearer <CRON_SECRET>
x-cron-secret: <CRON_SECRET>
```

If `CRON_SECRET` is missing from server configuration, the endpoint returns:

```text
503
```

If the request does not provide the correct secret, the endpoint returns:

```text
401
```

The comparison uses timing-safe equality when string lengths match.

## Vercel Cron Schedule

Phase 7.5 adds `vercel.json`:

```json
{
  "crons": [
    {
      "path": "/api/cron/sync-airbnb-calendars",
      "schedule": "*/30 * * * *"
    }
  ]
}
```

This preserves the documented target cadence:

```text
Every 30 minutes
```

## Server-Side Batch Sync Service

Phase 7.5 adds:

```text
lib/airbnb-ical/scheduled-sync.ts
```

Main exports:

```text
syncConfiguredAirbnbIcalImports
syncAirbnbIcalCalendarManually
resolveAirbnbIcalImportUrlFromEnv
```

`syncConfiguredAirbnbIcalImports` finds active Airbnb import calendars using the Phase 7.2 calendar model:

```text
provider = AIRBNB
direction IN (IMPORT, BIDIRECTIONAL)
isImportEnabled = true
deletedAt = null
status != INACTIVE
```

For each calendar, the service resolves the private import URL server-side and calls the Phase 7.3 import sync service.

## Import URL Resolution

Phase 7.5 does not add a decryption service or admin settings UI.

Instead, it introduces a resolver abstraction:

```text
AirbnbIcalImportUrlResolver
```

Default early-development behavior:

```text
resolveAirbnbIcalImportUrlFromEnv
```

The default resolver reads a server-side JSON environment variable:

```text
AIRBNB_ICAL_IMPORT_URLS_JSON
```

Expected shape:

```json
{
  "external_calendar_id": "https://calendar.airbnb.com/calendar/ical/CHANGE_ME.ics?s=CHANGE_ME"
}
```

Important:

```text
Do not commit real Airbnb iCal URLs.
Do not expose AIRBNB_ICAL_IMPORT_URLS_JSON to client bundles.
Do not use NEXT_PUBLIC for Airbnb import URLs.
```

This is an early-development bridge only. The documented long-term path remains encrypted database-backed resolution through `ExternalCalendar.importUrlEncrypted` once the admin settings/decryption flow exists.

## Missing Import URL Behavior

If an import calendar is eligible for sync but no server-side URL can be resolved, the service:

```text
Creates an ExternalCalendarSyncLog with status FAILED
Uses errorCode ICAL_IMPORT_URL_UNAVAILABLE
Stores a redacted operational error message
Updates ExternalCalendar.lastImportStartedAt
Updates ExternalCalendar.lastImportFinishedAt
Updates ExternalCalendar.lastFailureCode
Updates ExternalCalendar.lastFailureMessage
Sets ExternalCalendar.status to ERROR
```

No raw URL is logged or returned.

## Manual Sync Foundation

Phase 7.5 adds a server-side manual sync function:

```text
syncAirbnbIcalCalendarManually
```

It runs a single calendar sync with:

```text
triggeredBy = ADMIN
```

It accepts either:

```text
A runtime decryptedImportUrl provided by the caller
A server-side resolver configured in options
```

This is only a service foundation.

Phase 7.5 does not add:

```text
Admin button
Admin page
Admin server action
Admin API route
Client-side manual sync interaction
```

A future admin flow must be protected by the existing admin authentication foundation before calling this service.

## Response Shape

The cron endpoint returns only a redacted summary:

```text
calendarsFound
calendarsSynced
calendarsFailed
calendarsSkipped
results[]
```

Each result may include:

```text
externalCalendarId
syncLogId
status
errorCode
errorMessage
eventsImported
eventsUpdated
eventsRemoved
eventsSkipped
blocksCreated
blocksUpdated
```

Each result must not include:

```text
importUrlEncrypted
raw Airbnb URL
exportTokenHash
raw export token
guest information
payment information
admin notes
provider secrets
```

## Status Codes

The cron endpoint returns:

```text
200 when all processed calendars succeed or there are no calendars to process
207 when one or more calendars fail but the batch request itself was authorized and processed
401 when the request is unauthorized
503 when CRON_SECRET is not configured
```

## Environment Variables

Phase 7.5 documents these values in `.env.example`:

```text
CRON_SECRET
AIRBNB_ICAL_IMPORT_URLS_JSON
```

`CRON_SECRET` is required before invoking the scheduled endpoint.

`AIRBNB_ICAL_IMPORT_URLS_JSON` is optional and only exists as an early-development fallback for server-side import URL resolution.

`npm run env:validate` is not expanded in this subphase to require `CRON_SECRET` because local development may build the application before enabling the cron endpoint. Runtime endpoint execution still requires `CRON_SECRET`.

## Out of Scope

Phase 7.5 intentionally does not add:

```text
Admin sync UI
Admin sync server action
Calendar configuration admin screen
Import URL encryption/decryption implementation
Migration files
Seed data
Checkout
Tilopay integration
Resend integration
Reservation creation
Real Airbnb iCal URLs
Raw token storage
PMS features
```

## Validation

After applying this subphase, run:

```bash
npm run db:generate
npm run db:validate
npm run build
npm run env:validate
npm run lint
```

Before invoking the cron endpoint locally or in Vercel, configure:

```text
CRON_SECRET
```

For early import testing without a decryption/admin configuration flow, configure the optional server-side fallback:

```text
AIRBNB_ICAL_IMPORT_URLS_JSON
```

Do not commit real values.

## Completion Decision

Phase 7.5 is complete when the project has:

```text
A Vercel Cron schedule for Airbnb calendar sync
A protected cron route
A reusable batch sync service
A reusable manual sync service function
Redacted sync summaries
Server-side URL resolver abstraction
Documentation for CRON_SECRET and early import URL resolution
```

The next subphase is Phase 7.6 — Phase 7 documentation update.
