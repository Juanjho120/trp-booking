# 38 — Airbnb Calendar Configuration Model

This document completes Phase 7.2 and records the Airbnb iCal calendar configuration model used by later import, export, scheduled sync, and manual sync work.

## Phase

```text
Phase: Phase 7 — Airbnb iCal Synchronization
Subphase completed by this document: 7.2 Airbnb calendar configuration model
Next subphase: 7.3 Airbnb iCal import parser and sync service
```

## Goal

Phase 7.2 introduces the secure Prisma schema foundation for Airbnb calendar configuration.

This subphase creates the database model shape that later phases will use, but it intentionally does not implement iCal parsing, remote fetches, scheduled sync, manual sync, export endpoints, migrations, seed data, checkout, payments, email, or PMS behavior.

## Source Documents

The model follows:

```text
docs/04-database-model.md
docs/07-airbnb-ical-sync.md
docs/18-soft-delete-audit-conventions.md
docs/37-airbnb-ical-strategy-and-environment-contract.md
```

## Updated Prisma Models

Phase 7.2 strengthens these Prisma models:

```text
ExternalCalendar
ExternalCalendarEvent
ExternalCalendarSyncLog
```

It also adds these enums:

```text
ExternalCalendarDirection
ExternalCalendarEventStatus
```

## ExternalCalendar

`ExternalCalendar` is the private server-side configuration record for a reservable listing's Airbnb calendar behavior.

It is linked to `Property` and is not public guest-facing data.

Important fields:

```text
propertyId
provider
direction
name
importUrlEncrypted
exportTokenHash
exportTokenLastRotatedAt
isImportEnabled
isExportEnabled
lastImportStartedAt
lastImportFinishedAt
lastExportGeneratedAt
lastFailureCode
lastFailureMessage
status
deletedAt
deletedById
```

Security decisions:

```text
importUrlEncrypted stores the private Airbnb iCal URL in encrypted server-side form.
exportTokenHash stores a hash of the TRP export feed token, not the raw token.
lastFailureMessage must be redacted and must not contain raw provider tokens.
Soft delete is used through deletedAt/deletedById.
```

## Direction

`ExternalCalendarDirection` defines whether a configuration is intended for import, export, or both.

Values:

```text
IMPORT
EXPORT
BIDIRECTIONAL
```

Initial Airbnb listing configurations should normally use `BIDIRECTIONAL` once both import and export are active.

During staged implementation, import/export behavior can also be toggled independently through:

```text
isImportEnabled
isExportEnabled
```

## Import URL Storage

Airbnb import URLs contain private provider tokens.

Rules:

```text
Do not commit real Airbnb iCal URLs.
Do not store raw Airbnb iCal URLs in public configuration.
Do not expose importUrlEncrypted through public APIs.
Do not log importUrlEncrypted or decrypted import URLs.
Do not include raw URLs in sync errors.
```

A later admin/configuration flow may write encrypted values, but Phase 7.2 does not add that UI or server action.

## Export Token Storage

TRP Booking must eventually expose a feed like:

```text
/api/ical/[token]
```

The raw token must be generated securely and shown only at creation/rotation time when an admin flow exists.

The database stores only:

```text
exportTokenHash
exportTokenLastRotatedAt
```

A later export endpoint should hash the incoming token and compare it with `exportTokenHash`.

If an export token is compromised, the admin flow should rotate it by replacing the hash and updating `exportTokenLastRotatedAt`.

## ExternalCalendarEvent

`ExternalCalendarEvent` stores imported provider events from Airbnb iCal.

Important fields:

```text
externalCalendarId
providerEventUid
status
summary
startDate
endDate
firstSeenAt
lastSeenAt
removedAt
rawPayload
```

Status values:

```text
ACTIVE
REMOVED
CANCELLED
```

Sync reconciliation should not hard-delete provider events.

Instead:

```text
If a provider event still exists, update lastSeenAt.
If a provider event no longer exists, set status = REMOVED and removedAt.
If a provider event is explicitly cancelled, set status = CANCELLED when the parser can detect that state.
```

`rawPayload` may store safe diagnostic metadata, but must not include raw provider URLs, export tokens, or unnecessary guest-sensitive data.

## ExternalCalendarSyncLog

`ExternalCalendarSyncLog` stores safe sync execution metadata.

Important fields:

```text
externalCalendarId
triggeredBy
status
startedAt
finishedAt
eventsImported
eventsUpdated
eventsRemoved
eventsSkipped
blocksCreated
blocksUpdated
errorCode
errorMessage
createdAt
```

Logging rules:

```text
Do not log raw import URLs.
Do not log export tokens.
Do not log decrypted provider secrets.
Do not log guest-sensitive details.
Keep errorMessage redacted and operational.
```

## Relationship With CalendarBlock

Imported Airbnb events will later create or update `CalendarBlock` records with:

```text
source = AIRBNB
externalCalendarEventId = imported event id
```

Preparation buffer blocks derived from imported Airbnb bookings should use:

```text
source = PREPARATION_BUFFER
isAdminOverrideAllowed = true
parentBlockId = AIRBNB block id when available
```

Phase 7.2 does not create those blocks yet. It only ensures the configuration and event records can support that later sync behavior.

## Soft Delete and Retention

Soft delete applies to:

```text
ExternalCalendar
```

Normal application workflows must not hard-delete:

```text
ExternalCalendarEvent
ExternalCalendarSyncLog
```

Those records are needed for sync troubleshooting, availability dispute review, and historical import diagnostics.

## Migration Policy

Phase 7.2 updates the Prisma schema only.

It does not create migration files or apply database changes.

Migration execution remains deferred until a dedicated migration task is introduced and reviewed.

## Out of Scope

Phase 7.2 intentionally does not add:

```text
Database migration files
Seed data
Real Airbnb iCal URLs
iCal parser dependency
iCal fetch client
Cron endpoint
Manual sync action
Export endpoint
Admin calendar configuration UI
Admin sync UI
Reservation creation
Checkout
Tilopay integration
Resend integration
PMS features
```

## Validation Checklist

Run:

```bash
npm run db:generate
npm run db:validate
npm run build
npm run env:validate
npm run lint
```

## Completion Decision

Phase 7.2 is complete when the Prisma schema and documentation define a secure calendar configuration model for Airbnb import/export without exposing provider tokens or implementing synchronization behavior prematurely.
