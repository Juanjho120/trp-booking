# 10 — Project Phases

This document defines the official implementation phases for TRP Booking and tracks the current progress at a high level.

## Status Legend

```text
Not started — Work has not begun.
In progress — Work has started but the phase is not complete.
Completed — Deliverables are implemented and committed.
Deferred — Intentionally postponed.
```

## Current Phase

```text
Current phase: Phase 7 — Airbnb iCal Synchronization
Current subphase: 7.4 Airbnb iCal export feed foundation
Current focus: add the public-safe TRP Booking iCal export feed foundation after the Airbnb import parser and sync service, without checkout, payment, email, admin sync UI, or PMS features.
```

---

## Phase 0 — Project Definition and Technical Documentation

Status: **Completed**

Goal: Create official project documentation before writing code.

---

## Phase 1 — Repository and Next.js Setup

Status: **Completed**

Goal: Create the technical foundation.

Completed subphases:

```text
1.1 GitHub repository created
1.2 Initial documentation committed
1.3 Clean Next.js 15 setup
1.4 TypeScript strict enabled
1.5 ESLint configured
1.6 shadcn/ui + Radix Luma design system foundation
1.7 Base project folders created
1.8 Initial site config, accommodation config, messages, and error keys
```

---

## Phase 2 — Public Website Foundation

Status: **Completed**

Goal: Build the first static public website experience before adding database, admin, booking, payments, or calendar logic.

Completed subphases:

```text
2.1 Public layout foundation
2.2 Initial marketing homepage shell
2.3 Static accommodations listing
2.4 Static accommodation detail pages
2.5 Accommodation image foundation
2.6 Centralized public page copy and amenity icons
2.7 Public copy cleanup and visual QA
2.8 Static SEO metadata and sitemap foundation
2.9 Phase 2 closure review
```

---

## Phase 3 — Database Foundation

Status: **Completed**

Goal: Add Prisma and Supabase/PostgreSQL foundation after the public static foundation is stable.

Completed subphases:

```text
3.1 Prisma and Supabase foundation setup
3.2 Environment variable validation foundation
3.3 Initial Prisma schema for core booking domain
3.4 Soft delete and audit field conventions
3.5 Initial seed strategy for accommodations, amenities, rules, and static content
3.6 Database documentation update
```

Important Phase 3 closure notes:

```text
- Phase 3 created and validated the Prisma schema foundation.
- Phase 3 did not create or apply migrations.
- Phase 3 did not write records to Supabase.
- Migration execution remains deferred until the first migration-specific task is explicitly introduced and reviewed.
```

---

## Phase 4 — Admin Authentication Foundation

Status: **Completed**

Goal: Add the minimum authentication foundation required for the private admin area.

Completed subphases:

```text
4.1 Auth.js strategy and admin access foundation — Completed
4.2 Auth environment variables and validation — Completed
4.3 Auth.js configuration — Completed
4.4 Admin route protection foundation — Completed
4.5 Minimal admin shell — Completed
4.6 Phase 4 documentation update — Completed
```

Phase 4 closure result:

```text
- Google OAuth admin authentication is configured through Auth.js / NextAuth.
- JWT sessions are used without the Prisma adapter.
- Admin access is controlled by the server-side AUTH_ALLOWED_ADMIN_EMAILS allowlist.
- /admin routes are protected before exposing admin UI.
- The first protected minimal admin shell exists.
- Public routes remain accessible without login.
- AUTH_TRUST_HOST=true is required for local/admin Auth.js routes after middleware is enabled.
```

---

## Phase 5 — Cloudinary Integration

Status: **Completed**

Goal: Add the image storage, delivery, and transformation foundation for accommodation images without introducing reservation, payment, email, or iCal functionality.

Completed subphases:

```text
5.1 Cloudinary strategy and environment foundation — Completed
5.2 Cloudinary environment validation — Completed
5.3 Cloudinary service foundation — Completed
5.4 Public accommodation images from Cloudinary — Completed
5.5 Phase 5 documentation update — Completed
```

Phase 5 closure result:

```text
- Cloudinary usage scope was documented.
- Cloudinary environment variables are validated server-side.
- The Cloudinary SDK dependency is installed.
- A server-side Cloudinary client foundation exists under lib/cloudinary.
- Accommodation image public IDs are deterministic and folder-based.
- Public accommodation listing cards now receive Cloudinary delivery URLs through coverImage.src.
- Public accommodation detail galleries now receive Cloudinary delivery URLs through coverImage and galleryImages.
- SEO/Open Graph image metadata supports Cloudinary URLs.
- next/image is configured to allow res.cloudinary.com.
- Local files under public/images/accommodations remain only as upload source/rollback metadata through fallbackSrc.
- No upload route handlers, admin image UI, database writes, migrations, seed data, booking checkout, Tilopay, Resend, Airbnb iCal sync, or PMS features were added.
```

---

## Phase 6 — Availability Calendar Foundation

Status: **Completed**

Goal: Add the first availability calendar foundation for public date visibility and future reservation validation without introducing checkout, payment, email, or Airbnb iCal sync yet.

Completed subphases:

```text
6.1 Availability strategy and booking calendar rules — Completed
6.2 Availability domain service foundation — Completed
6.3 Public availability calendar UI foundation — Completed
6.4 Preparation buffer and blocked-date evaluation — Completed
6.5 Phase 6 documentation update — Completed
```

Phase 6 closure result:

```text
- Public availability now has a documented strategy, typed rules, a server-side Prisma service, a public runtime API, and a public non-booking calendar UI.
- Availability evaluation covers composed listing dependencies, confirmed reservations, active pending holds, calendar blocks, and derived preparation buffers from confirmed reservations.
- Phase 6 intentionally stops before reservation creation, checkout, payment collection, email delivery, Airbnb iCal synchronization, and admin calendar management.
```

---

## Phase 7 — Airbnb iCal Synchronization

Status: **In progress**

Goal: Add Airbnb iCal import/export synchronization without exposing private iCal tokens, without creating checkout/payment flows, and without turning TRP Booking into a PMS.

Subphase status:

```text
7.1 Airbnb iCal strategy and environment contract — Completed
7.2 Airbnb calendar configuration model — Completed
7.3 Airbnb iCal import parser and sync service — Completed
7.4 Airbnb iCal export feed foundation — In progress
7.5 Scheduled sync and manual sync foundation — Not started
7.6 Phase 7 documentation update — Not started
```

Phase 7 rules:

```text
- Do not commit real Airbnb iCal URLs or tokens.
- Do not expose raw iCal tokens in logs, API responses, or public UI.
- Store import URLs and export tokens only in server-side private configuration or database records.
- Sync must respect composed listing dependencies and preparation buffer rules from Phase 6.
- Export feeds must include direct reservation blocks and preparation buffer blocks when they become available.
- Do not add booking checkout, Tilopay, Resend, or PMS features in Phase 7 unless a later documented subphase explicitly allows it.
```

Phase 7.1 result:

```text
- docs/37-airbnb-ical-strategy-and-environment-contract.md was added.
- The secure handling contract for Airbnb import URLs and export tokens was documented.
- The import, export, scheduled sync, manual sync, logging, and environment contracts were defined.
- Reserved server-only configuration names were documented for later implementation.
- No iCal parser, cron endpoint, export endpoint, admin sync UI, migrations, seed data, checkout, payment, email, or PMS features were added.
```

Phase 7.2 result:

```text
- The Prisma external calendar configuration model was strengthened for secure Airbnb import/export setup.
- ExternalCalendar now distinguishes import/export direction and separate import/export enablement flags.
- Airbnb import URLs are modeled as encrypted server-side values.
- Export feed tokens are modeled as hashes instead of raw reusable tokens.
- ExternalCalendarEvent now tracks imported event status and first/last seen timestamps for reconciliation.
- ExternalCalendarSyncLog now tracks imported, updated, removed, skipped, created, and updated block counts with redacted error metadata.
- docs/38-airbnb-calendar-configuration-model.md was added.
- docs/04-database-model.md was updated to reflect the secure calendar configuration model.
- No migration files, seed data, parser, fetch client, cron endpoint, export endpoint, admin calendar UI, checkout, payment, email, or PMS features were added.
```

Phase 7.3 result:

```text
- A server-side Airbnb iCal parser was added under lib/airbnb-ical/parser.ts.
- The parser supports folded iCal lines and Airbnb all-day VEVENT ranges with UID, DTSTART, DTEND, SUMMARY, and STATUS.
- A server-side Airbnb import sync service was added under lib/airbnb-ical/sync-service.ts.
- The sync service can fetch iCal content from a decrypted runtime URL, parse events, upsert ExternalCalendarEvent records, create/update AIRBNB CalendarBlock records, create/update PREPARATION_BUFFER blocks for imported Airbnb bookings, and soft-delete blocks when provider events disappear.
- Sync results are recorded through ExternalCalendarSyncLog with redacted error metadata.
- The service reuses Phase 6 date-only, composed listing, and preparation buffer rules.
- No cron endpoint, admin sync UI, export endpoint, migration files, seed data, checkout, payment, email, or PMS features were added.
```

---

## Phase 8 — Reservation Flow

Status: **Not started**

---

## Phase 9 — Tilopay Sandbox Integration

Status: **Not started**

---

## Phase 10 — Email Notifications

Status: **Not started**

---

## Phase 11 — Cancellation, Refund, and Change Request Rules

Status: **Not started**

---

## Phase 12 — Production Readiness

Status: **Not started**
