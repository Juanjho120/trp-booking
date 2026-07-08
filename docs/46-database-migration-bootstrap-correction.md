# 46 — Database Migration Bootstrap Correction

## Phase

```text
Phase 8 corrective task — Database migration bootstrap before pending reservation writes
```

## Why This Correction Exists

TRP Booking reached Phase 8.3 with a validated Prisma schema, Prisma Client usage, availability services, iCal services, quote services, and public reservation request UI, but without committed Prisma migration files.

That was a planning mistake.

The project cannot safely continue to:

```text
8.4 Pending reservation creation and expiration handling
```

until the database has real tables for the existing Prisma schema.

This correction adds the first Prisma migration required to create the database objects that have already been modeled through the previous phases.

## Delivered Files

```text
prisma/migrations/migration_lock.toml
prisma/migrations/20260708193000_init_trp_booking_schema/migration.sql
package.json
README_PACKAGE.md
docs/46-database-migration-bootstrap-correction.md
```

## What the Migration Creates

The migration creates the current database foundation for:

```text
users
properties
property_images
amenities
property_amenities
house_rules
property_rules
reservations
reservation_guests
payments
refunds
calendar_blocks
external_calendars
external_calendar_events
external_calendar_sync_logs
email_notifications
```

It also creates the current Prisma enum types:

```text
UserRole
PropertyStatus
ReservationStatus
PaymentProvider
PaymentStatus
RefundStatus
CalendarBlockSource
ExternalCalendarProvider
ExternalCalendarStatus
ExternalCalendarDirection
ExternalCalendarEventStatus
CalendarSyncTriggeredBy
CalendarSyncStatus
EmailNotificationType
EmailNotificationStatus
```

## Why It Is Needed Before Phase 8.4

Phase 8.4 is the first phase that should write public reservation holds.

That means the system needs real database tables for:

```text
reservations
calendar_blocks
payments
properties
```

The public form from Phase 8.3 does not write anything yet, but the next phase must create a `Reservation` with:

```text
status = PENDING_PAYMENT
expiresAt = non-null timestamp
confirmedAt = null
cancelledAt = null
```

Without this migration, there is nowhere safe to persist that data.

## Important Database Rule Going Forward

From this point forward, whenever a subphase adds or changes persisted data, the same subphase must include the required Prisma migration files unless the subphase explicitly documents why no schema change is needed.

Do not defer migrations silently again.

## How to Apply Locally

After copying the files into the project, run:

```bash
npm run db:generate
npm run db:validate
npm run db:migrate:dev
npm run build
npm run env:validate
npm run lint
```

For an already-provisioned shared database environment, use deploy instead of dev:

```bash
npm run db:migrate:deploy
```

## Supabase Schema Note

TRP Booking is intended to use the project database configuration already defined for Supabase/PostgreSQL.

If the target schema is `trp_booking`, make sure the Prisma `DATABASE_URL` points to the intended schema before running migrations. Do not run migrations against the wrong schema.

## Out of Scope

This correction does not add:

```text
reservation creation route handlers
pending hold write logic
checkout sessions
Tilopay payment intents
Tilopay redirects
Tilopay webhooks
Resend emails
admin reservation UI
seed data
PMS features
```

Those remain for the documented future subphases.

## Handoff Back to Phase 8.4

After this migration correction is committed and applied successfully, continue with:

```text
8.4 Pending reservation creation and expiration handling
```

Phase 8.4 must write `PENDING_PAYMENT` reservations only after:

```text
1. Validating request input.
2. Recalculating the quote server-side.
3. Rechecking availability server-side.
4. Creating the Reservation record.
5. Setting expiresAt to a non-null value.
```
