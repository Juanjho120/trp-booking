# 39 — Airbnb iCal Import Parser and Sync Service

This document completes Phase 7.3 — Airbnb iCal import parser and sync service.

Phase 7.3 introduces server-side foundation code for importing Airbnb iCal events into the TRP Booking availability model without adding cron scheduling, manual admin sync UI, export endpoints, checkout, payment, email, database migrations, seed data, real Airbnb URLs, raw export tokens, or PMS features.

## Phase

```text
Phase: Phase 7 — Airbnb iCal Synchronization
Subphase completed by this document: 7.3 Airbnb iCal import parser and sync service
Next subphase: 7.4 Airbnb iCal export feed foundation
```

## Source Documents

This subphase builds on:

```text
docs/07-airbnb-ical-sync.md
docs/37-airbnb-ical-strategy-and-environment-contract.md
docs/38-airbnb-calendar-configuration-model.md
docs/36-phase-6-availability-closure-review.md
```

## Implemented Files

```text
lib/airbnb-ical/types.ts
lib/airbnb-ical/parser.ts
lib/airbnb-ical/sync-service.ts
lib/airbnb-ical/index.ts
```

## Parser Scope

`lib/airbnb-ical/parser.ts` parses Airbnb-oriented iCal content in memory.

Supported iCal behavior:

```text
Folded iCal lines
VEVENT blocks
UID
DTSTART
DTEND
SUMMARY
STATUS:CANCELLED
All-day date values in YYYYMMDD format
Date-only fallback values in YYYY-MM-DD format
Check-in inclusive and check-out exclusive ranges
```

The parser returns:

```text
events
skippedEvents
```

Invalid events are skipped instead of exposing raw provider details to callers.

## Sync Service Scope

`lib/airbnb-ical/sync-service.ts` adds a server-side sync function:

```text
syncAirbnbIcalImport(input, options)
```

The function:

```text
Loads an ExternalCalendar configuration by id
Validates provider AIRBNB
Validates import is enabled
Accepts a decrypted import URL at runtime
Fetches iCal text server-side
Parses Airbnb VEVENT records
Upserts ExternalCalendarEvent records
Creates or updates AIRBNB CalendarBlock records
Creates or updates PREPARATION_BUFFER CalendarBlock records for imported Airbnb bookings
Marks missing provider events as REMOVED
Soft-deletes active imported blocks when provider events disappear or are cancelled
Writes ExternalCalendarSyncLog counters and redacted error metadata
Updates ExternalCalendar import timestamps and failure metadata
```

## Security Contract Preserved

Phase 7.3 preserves the Phase 7 security contract:

```text
No real Airbnb iCal URLs are committed.
No raw Airbnb import URL is stored by this service.
No raw Airbnb import URL is logged by this service.
No raw export token is introduced.
No public route exposes provider configuration.
No public UI is added.
```

The sync function accepts `decryptedImportUrl` only as a runtime value. A future admin/configuration layer can decrypt `importUrlEncrypted` before calling the service, but this phase does not implement encryption or decryption.

## Composed Listing Rules

The sync service reuses Phase 6 composed listing rules.

Imported Airbnb event for `Apartamento Blanco y Negro`:

```text
Creates/updates AIRBNB block for Apartamento Blanco y Negro
Creates/updates AIRBNB block for Refugio Completo
```

Imported Airbnb event for `Bungalow Refugio Perfecto`:

```text
Creates/updates AIRBNB block for Bungalow Refugio Perfecto
Creates/updates AIRBNB block for Refugio Completo
```

Imported Airbnb event for `Refugio Completo`:

```text
Creates/updates AIRBNB block for Refugio Completo
Creates/updates AIRBNB block for Apartamento Blanco y Negro
Creates/updates AIRBNB block for Bungalow Refugio Perfecto
```

## Preparation Buffer Behavior

Active imported Airbnb events create or update preparation buffer blocks for the source accommodation using Phase 6 rules:

```text
Apartamento Blanco y Negro: 1 day before check-in and 1 day after check-out
Bungalow Refugio Perfecto: 2 days before check-in and 2 days after check-out
Refugio Completo: 2 days before check-in and 2 days after check-out
```

Preparation buffer blocks are created with:

```text
source = PREPARATION_BUFFER
isAdminOverrideAllowed = true
externalCalendarEventId = imported event id
parentBlockId = source AIRBNB block id
```

If a previously created preparation buffer block has already been manually unlocked by admin, the sync service does not reactivate it.

## Reconciliation Behavior

The service treats the current Airbnb feed as the provider source of truth for the calendar being synced.

When a provider event is present:

```text
ExternalCalendarEvent is created or updated.
AIRBNB CalendarBlock records are created or updated.
Preparation buffer blocks are created or updated.
```

When a previously active provider event disappears from the feed:

```text
ExternalCalendarEvent.status becomes REMOVED.
ExternalCalendarEvent.removedAt is set.
Active AIRBNB and PREPARATION_BUFFER blocks linked to the event are soft-deleted.
```

When a provider event is present with `STATUS:CANCELLED`:

```text
ExternalCalendarEvent.status becomes CANCELLED.
Active AIRBNB and PREPARATION_BUFFER blocks linked to the event are soft-deleted.
```

No imported event history is hard-deleted.

## Sync Log Behavior

Each service run creates an `ExternalCalendarSyncLog` record.

Successful runs update counters:

```text
eventsImported
eventsUpdated
eventsRemoved
eventsSkipped
blocksCreated
blocksUpdated
```

Failed runs store only redacted failure details:

```text
errorCode
errorMessage
```

Raw Airbnb import URLs, raw export tokens, provider secrets, guest data, and admin-only details must not be written into sync logs.

## Current Entry Point

The current entry point is a server-side function only:

```ts
syncAirbnbIcalImport({
  externalCalendarId,
  decryptedImportUrl,
  triggeredBy,
});
```

This phase intentionally does not expose this through a route handler, cron endpoint, or admin button.

## Out of Scope

Phase 7.3 intentionally does not add:

```text
Cron endpoint
Vercel Cron configuration
Manual admin sync UI
Admin sync server action
Export feed endpoint
Export token generation
Token rotation UI
Database migrations
Seed data
Checkout
Tilopay integration
Resend integration
Email delivery
PMS features
Real Airbnb iCal URLs
Raw reusable export tokens
Encryption/decryption implementation
```

## Validation

After applying this package, run:

```bash
npm run db:generate
npm run db:validate
npm run build
npm run env:validate
npm run lint
```

## Completion Decision

Phase 7.3 is complete when the project has a typed server-side parser and import sync service that can reconcile Airbnb iCal VEVENT records into `ExternalCalendarEvent`, `AIRBNB CalendarBlock`, and `PREPARATION_BUFFER CalendarBlock` records while preserving token secrecy, soft delete conventions, composed listing rules, and preparation buffer rules.
