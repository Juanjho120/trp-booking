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
Current phase: Phase 9 — Tilopay Sandbox Integration
Current subphase: 9.2 Tilopay environment validation
Current focus: implement server-side environment validation for the Tilopay sandbox contract defined in Phase 9.1, without creating payment records, checkout redirects, webhooks, confirmation transitions, emails, or PMS features yet.
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
- Migration execution was later corrected in docs/46-database-migration-bootstrap-correction.md.
- Initial seed execution and DB-backed public accommodation reads were later corrected in docs/47-initial-seed-and-db-backed-accommodation-source.md.
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

Status: **Completed**

Goal: Add the public direct reservation flow foundation using server-side validation, pending holds, guest details, seeded accommodation records, improved booking UX, manual locale selection, availability revalidation, and expired hold cleanup before payment integration.

Completed subphases:

```text
8.1 Reservation flow strategy and pending hold contract — Completed
8.2 Reservation quote and server-side pricing foundation — Completed
8.3 Public guest details and reservation request form — Completed
8.3.1 Initial seed and DB-backed accommodation source — Completed
8.3.2 Reservation form UX and manual locale switcher — Completed
8.4 Pending reservation creation and expiration handling — Completed
8.5 Availability revalidation before payment handoff — Completed
8.5.1 Pending hold expiration status cleanup — Completed
8.6 Phase 8 documentation update — Completed
```

Phase 8 closure result:

```text
- The public reservation form can calculate a server-side quote.
- The public reservation form can create real PENDING_PAYMENT reservation holds.
- Pending holds use a non-null expiresAt value and initially last 15 minutes.
- Availability blocks active pending holds while ignoring expired pending holds.
- Payment handoff readiness can be validated server-side for an active pending hold.
- Payment handoff validation recalculates quote, checks stored totals, and revalidates availability while excluding the reservation itself.
- A protected cron route marks expired PENDING_PAYMENT holds as EXPIRED.
- The reservation flow is ready for Phase 9 Tilopay sandbox integration.
```

---

## Phase 9 — Tilopay Sandbox Integration

Status: **In progress**

Goal: Add the Tilopay sandbox payment foundation on top of the completed Phase 8 reservation-flow foundation.

Subphase status:

```text
9.1 Tilopay sandbox strategy and environment contract — Completed
9.2 Tilopay environment validation — Not started
9.3 Payment record creation for pending reservations — Not started
9.4 Payment handoff redirect/session foundation — Not started
9.5 Tilopay webhook validation foundation — Not started
9.6 Confirm reservation only after validated payment — Not started
9.7 Phase 9 documentation update — Not started
```

Phase 9 rules:

```text
- Do not store card data.
- Keep all Tilopay credentials server-side only.
- Do not expose raw provider payloads in public API responses.
- Do not set Reservation.status = CONFIRMED until payment validation succeeds.
- Keep failed/rejected payment states auditable.
- Do not send Resend emails in Phase 9 unless explicitly moved from Phase 10.
- Do not add PMS features.
```

Phase 9.1 result:

```text
- docs/53-tilopay-sandbox-strategy-and-environment-contract.md was added.
- README.md was updated with Phase 9.1 completion and Phase 9 current status.
- docs/10-phases.md was updated to mark Phase 9 in progress and 9.1 completed.
- docs/11-progress-log.md was updated with Phase 9.1 completion.
- The Tilopay sandbox environment variable contract was defined.
- The expected callback and webhook URLs were documented.
- The payment attempt lifecycle was documented before writing payment integration code.
- Phase 9.1 intentionally did not add Tilopay API calls, payment records, checkout redirects, webhook handlers, reservation confirmation, Resend emails, PMS behavior, schema changes, or migrations.
```

Phase 9.2 current scope:

```text
- Add server-side environment validation for the Tilopay variables defined in Phase 9.1.
- Keep credentials server-side only.
- Do not call Tilopay yet.
- Do not create Payment records yet.
- Do not create checkout redirects yet.
- Do not add webhook handlers yet.
- Do not confirm reservations yet.
- Do not send emails yet.
- Do not add PMS features.
```

---

## Phase 10 — Email Notifications

Status: **Not started**

---

## Phase 11 — Cancellation, Refund, and Change Request Rules

Status: **Not started**

---

## Phase 12 — Production Readiness

Status: **Not started**
