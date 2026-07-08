# 37 — Airbnb iCal Strategy and Environment Contract

This document completes Phase 7.1 and defines the secure contract for Airbnb iCal synchronization before implementing calendar configuration records, iCal parsing, scheduled sync, manual sync, or export endpoints.

## Phase

```text
Phase: Phase 7 — Airbnb iCal Synchronization
Subphase completed by this document: 7.1 Airbnb iCal strategy and environment contract
Next subphase: 7.2 Airbnb calendar configuration model
```

## Goal

Phase 7.1 defines how TRP Booking will handle Airbnb calendar synchronization securely.

This subphase is intentionally a contract phase. It does not implement actual iCal parsing, cron sync, admin sync, export feeds, database migrations, seed data, checkout, payment, email, or PMS features.

## Source Documents

The contract builds on:

```text
docs/07-airbnb-ical-sync.md
docs/36-phase-6-availability-closure-review.md
```

The existing Airbnb iCal documentation requires import, export, manual sync, scheduled sync every 30 minutes, and preparation buffer support.

Phase 6 already provides the public availability foundation that Phase 7 must reuse.

## Security Contract

Airbnb import URLs contain private tokens and must be treated as secrets.

Rules:

```text
Do not commit real Airbnb iCal URLs.
Do not place real Airbnb iCal URLs in documentation.
Do not expose Airbnb import URLs in public UI.
Do not expose Airbnb import URLs in API responses.
Do not log raw Airbnb import URLs or export tokens.
Do not include raw tokens in sync error messages.
```

Any logging must use redacted identifiers such as:

```text
calendarId
propertyId
listing label
lastSyncedAt
sync status
redacted URL host only if needed
```

## Import Configuration Contract

Each reservable listing needs an Airbnb import calendar configuration.

Initial reservable listings:

```text
Apartamento Blanco y Negro
Bungalow Refugio Perfecto
Refugio Completo
```

Each configuration should eventually include:

```text
Property reference
Provider = AIRBNB
Direction = IMPORT
Private iCal URL
Active flag
Last sync timestamps
Failure status / failure reason
Audit fields
Soft delete fields
```

The private iCal URL should be stored server-side only.

Preferred long-term storage:

```text
Database table for external calendars, with private fields never returned to public clients.
```

Acceptable early development fallback:

```text
Server-side environment configuration, only if real URLs are never committed and are not exposed to the browser.
```

## Export Token Contract

TRP Booking must eventually provide an export feed per listing so Airbnb can import TRP unavailable dates.

Suggested endpoint shape remains:

```text
/api/ical/[token]
```

Rules:

```text
Tokens must be unguessable.
Tokens must not expose admin data.
Tokens must not reveal private Airbnb import URLs.
Tokens must be rotatable.
Tokens must be revocable by disabling the calendar configuration.
```

The export endpoint must return only `text/calendar` content for unavailable date ranges.

## Import Behavior Contract

Airbnb imported events must become availability blocks for the matching listing.

Imported Airbnb event for Apartamento Blanco y Negro:

```text
Block Apartamento Blanco y Negro
Block Refugio Completo
```

Imported Airbnb event for Bungalow Refugio Perfecto:

```text
Block Bungalow Refugio Perfecto
Block Refugio Completo
```

Imported Airbnb event for Refugio Completo:

```text
Block Refugio Completo
Block Apartamento Blanco y Negro
Block Bungalow Refugio Perfecto
```

The sync implementation should persist imported events as `CalendarBlock` records using source `AIRBNB` when the calendar configuration model is available.

## Preparation Buffer Contract

Imported Airbnb bookings must generate preparation buffer blocks using the same documented policies:

```text
Apartamento Blanco y Negro: 1 day before check-in and 1 day after check-out
Bungalow Refugio Perfecto: 2 days before check-in and 2 days after check-out
Refugio Completo: 2 days before check-in and 2 days after check-out
```

Preparation buffer blocks created from Airbnb imports must affect public availability and later iCal exports.

Admin-unlocked preparation buffer days must become available unless another reservation, Airbnb event, manual block, maintenance block, or composed listing dependency still blocks them.

## Export Feed Contract

Export feeds should include unavailable dates from:

```text
Confirmed direct reservations
Imported Airbnb blocks when they affect the exported listing
Manual blocks
Maintenance blocks
Preparation buffer blocks
Composed listing dependency blocks when needed for listing consistency
```

Export feeds must not include:

```text
Guest personal data
Payment data
Admin notes
Private Airbnb import URLs
Raw internal error details
Soft-deleted blocks
Expired pending payment holds
```

## Scheduled Sync Contract

Phase 7 should eventually add scheduled synchronization through Vercel Cron.

Target cadence:

```text
Every 30 minutes
```

Suggested endpoint remains:

```text
/api/cron/sync-airbnb-calendars
```

Security requirement:

```text
The cron endpoint must validate CRON_SECRET or an equivalent server-only secret.
```

The secret must be server-side only and must not be available in client bundles.

## Manual Sync Contract

The admin flow should eventually include manual sync.

Manual sync must:

```text
Run only from protected admin routes.
Require an authenticated admin user.
Create audit records.
Return summarized results without raw provider tokens.
Update lastSyncedAt and failure metadata.
```

## Sync Logging Contract

Sync logs should track:

```text
Sync start time
Sync end time
Calendar processed
Events imported
Events updated
Events no longer present
Preparation buffer blocks created or updated
Manual unlock interactions when relevant
Errors with redacted sensitive values
lastSyncedAt
```

Sync logs must not expose:

```text
Raw Airbnb import URLs
Raw export tokens
Guest-sensitive details
Provider secret values
```

## Environment Contract

The following server-only configuration names are reserved for Phase 7 implementation:

```text
CRON_SECRET
AIRBNB_ICAL_EXPORT_TOKEN_SECRET
AIRBNB_ICAL_IMPORT_TIMEOUT_MS
AIRBNB_ICAL_SYNC_LOOKBACK_DAYS
AIRBNB_ICAL_SYNC_LOOKAHEAD_DAYS
```

Behavior:

```text
CRON_SECRET protects scheduled sync endpoints.
AIRBNB_ICAL_EXPORT_TOKEN_SECRET is used to sign or verify export tokens if token signing is implemented.
AIRBNB_ICAL_IMPORT_TIMEOUT_MS limits remote iCal fetch duration.
AIRBNB_ICAL_SYNC_LOOKBACK_DAYS controls how far back imports should reconcile events.
AIRBNB_ICAL_SYNC_LOOKAHEAD_DAYS controls how far ahead imports should reconcile events.
```

This subphase reserves the names and behavior only. It does not require the variables to be present yet because no sync endpoint or parser is implemented in Phase 7.1.

## Recommended Defaults for Future Implementation

```text
AIRBNB_ICAL_IMPORT_TIMEOUT_MS=10000
AIRBNB_ICAL_SYNC_LOOKBACK_DAYS=30
AIRBNB_ICAL_SYNC_LOOKAHEAD_DAYS=365
```

These values should be validated server-side once the sync implementation is introduced.

## Out of Scope

Phase 7.1 intentionally does not add:

```text
iCal parser dependency
iCal fetch client
Calendar configuration database model
Database migrations
Seed data
Cron endpoint
Manual sync action
Export endpoint
Admin calendar UI
Reservation creation
Checkout
Tilopay integration
Resend integration
PMS features
```

## Completion Decision

Phase 7.1 is complete when the project has a documented, secure import/export and environment contract for Airbnb iCal sync, and Phase 7.2 can safely introduce the calendar configuration model without exposing tokens or implementing sync prematurely.
