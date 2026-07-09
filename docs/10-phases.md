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
Current phase: Phase 8 — Reservation Flow
Current subphase: 8.5.1 Pending hold expiration status cleanup
Current focus: mark expired PENDING_PAYMENT reservation holds as EXPIRED through a protected cron cleanup route, without creating payments, emails, calendar blocks, confirmations, PMS behavior, migrations, or Tilopay integration.
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
- After Phase 8.3.1, availability resolves property records and preparation buffer policies from the database instead of static accommodation config.
- Phase 6 intentionally stops before reservation creation, checkout, payment collection, email delivery, Airbnb iCal synchronization, and admin calendar management.
```

---

## Phase 7 — Airbnb iCal Synchronization

Status: **Completed**

Goal: Add Airbnb iCal import/export synchronization without exposing private iCal tokens, without creating checkout/payment flows, and without turning TRP Booking into a PMS.

Completed subphases:

```text
7.1 Airbnb iCal strategy and environment contract — Completed
7.2 Airbnb calendar configuration model — Completed
7.3 Airbnb iCal import parser and sync service — Completed
7.4 Airbnb iCal export feed foundation — Completed
7.5 Scheduled sync and manual sync foundation — Completed
7.6 Phase 7 documentation update — Completed
```

Phase 7 closure result:

```text
- Airbnb iCal synchronization now has a secure import/export contract, hardened calendar configuration model, parser, import sync service, export feed endpoint, scheduled sync foundation, and manual sync service foundation.
- Import URLs and raw export tokens remain secrets and must not be committed, logged, exposed through API responses, or displayed in public UI.
- Export feed tokens are validated by hash through ExternalCalendar.exportTokenHash.
- Scheduled sync is protected by CRON_SECRET and returns redacted summaries only.
- Phase 7 intentionally stops before reservation checkout, Tilopay, Resend, production deployment, admin sync UI, and PMS features.
```

---

## Phase 8 — Reservation Flow

Status: **In progress**

Goal: Add the public direct reservation flow foundation using server-side validation, pending holds, guest details, seeded accommodation records, improved booking UX, manual locale selection, availability revalidation, and expired hold cleanup before payment integration.

Subphase status:

```text
8.1 Reservation flow strategy and pending hold contract — Completed
8.2 Reservation quote and server-side pricing foundation — Completed
8.3 Public guest details and reservation request form — Completed
8.3.1 Initial seed and DB-backed accommodation source — Completed
8.3.2 Reservation form UX and manual locale switcher — Completed
8.4 Pending reservation creation and expiration handling — Completed
8.5 Availability revalidation before payment handoff — Completed
8.5.1 Pending hold expiration status cleanup — In progress
8.6 Phase 8 documentation update — Not started
```

Phase 8 rules:

```text
- Do not integrate Tilopay in Phase 8 unless a later documented subphase explicitly allows payment handoff preparation only.
- Do not send Resend emails in Phase 8.
- Do not confirm reservations before payment validation.
- Pending reservations must expire if payment is not completed in time.
- Availability must be rechecked server-side before creating a pending reservation and again before payment handoff.
- Guest count, date ranges, and totals must be validated on the server.
- Guests must not modify confirmed reservation dates directly from the public website.
- Public accommodation listing, detail, quote, availability, and reservation creation must use seeded database property records as the source of truth.
- Public reservation input must use controlled, styled inputs for date range, guest count, country, phone, and arrival time after Phase 8.3.2.
- Public language selection must be manual and visible through the locale switcher after Phase 8.3.2.
- Do not add PMS features.
```

Phase 8.4 result:

```text
- POST /api/reservations/pending-hold was added.
- Pending holds create real Reservation records with status = PENDING_PAYMENT.
- Pending holds set expiresAt = now + 15 minutes.
- The server recalculates quote and revalidates availability immediately before writing the pending reservation.
- ReservationGuest is created together with the Reservation record.
- Phase 8.4 does not integrate Tilopay, create payment records, confirm reservations, send Resend emails, create manual calendar blocks, add admin reservation UI, add PMS behavior, or add migrations.
```

Phase 8.5 result:

```text
- POST /api/reservations/payment-handoff/validate was added.
- The endpoint validates that a pending reservation exists, remains PENDING_PAYMENT, has expiresAt > now, and is still eligible before future payment handoff.
- The service recalculates quote server-side and compares stored reservation amounts against the recalculated quote.
- The service revalidates availability while excluding the reservation itself from blocking records.
- The endpoint returns readyForPayment only for active, non-conflicting pending reservations.
- Phase 8.5 does not integrate Tilopay, create payment records, confirm reservations, send emails, add admin UI, add PMS behavior, or add migrations.
```

Phase 8.5.1 current scope:

```text
- Add a protected cron route to mark expired PENDING_PAYMENT reservations as EXPIRED.
- Reuse the existing CRON_SECRET authorization pattern already used by the Airbnb iCal cron route.
- Register the cleanup route in vercel.json.
- Keep availability release tied to expiresAt <= now, not to the cleanup route schedule.
- Do not hard-delete reservations.
- Do not create payments, emails, calendar blocks, confirmations, PMS behavior, migrations, or Tilopay integration.
```

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
