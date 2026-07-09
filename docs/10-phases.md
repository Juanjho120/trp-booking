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
Current subphase: 8.5 Availability revalidation before payment handoff
Current focus: validate active PENDING_PAYMENT reservations server-side immediately before a future payment handoff, without integrating Tilopay, creating payment records, sending Resend emails, confirming reservations, or adding PMS features.
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

Goal: Add the public direct reservation flow foundation using server-side validation, pending holds, guest details, seeded accommodation records, improved booking UX, manual locale selection, and availability revalidation before any payment handoff.

Subphase status:

```text
8.1 Reservation flow strategy and pending hold contract — Completed
8.2 Reservation quote and server-side pricing foundation — Completed
8.3 Public guest details and reservation request form — Completed
8.3.1 Initial seed and DB-backed accommodation source — Completed
8.3.2 Reservation form UX and manual locale switcher — Completed
8.4 Pending reservation creation and expiration handling — Completed
8.5 Availability revalidation before payment handoff — In progress
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

Phase 8.1 result:

```text
- docs/43-reservation-flow-strategy-and-pending-hold-contract.md was added.
- The public direct reservation lifecycle was documented before writing reservation creation code.
- The pending hold contract was defined using Reservation.status = PENDING_PAYMENT and a required non-null expiresAt value for future hold creation.
- Server-side validation boundaries were documented for date ranges, guest capacity, availability, price calculation, currency, and expiration handling.
- Phase 8.1 confirmed that reservations must not become CONFIRMED until payment is validated by a later Tilopay webhook phase.
```

Phase 8.2 result:

```text
- types/reservation-quote.ts was added with the public quote contract.
- lib/reservations/pricing.ts was added with the server-side quote calculation service.
- lib/reservations/index.ts was added as the reservation service export boundary.
- GET /api/reservations/quote was added as a public-safe quote endpoint.
- messages/es.ts and messages/en.ts were updated with centralized reservation quote errors.
- docs/44-reservation-quote-and-server-side-pricing-foundation.md was added.
- The quote foundation uses server-controlled accommodation prices, date-only night counting, capacity validation, USD cents, and fixed decimal output.
```

Phase 8.3 result:

```text
- features/reservations/components/reservation-request-form.tsx was added as a public client-side request form.
- features/reservations/index.ts was added as the reservation feature export boundary.
- The accommodation detail page now renders the reservation request form instead of a disabled coming-soon CTA.
- The form collects date, guest count, guest contact, country, and estimated arrival time in the UI.
- The form calculates a non-binding quote through GET /api/reservations/quote.
- messages/es.ts and messages/en.ts were updated with centralized reservation request form copy.
- docs/45-public-guest-details-and-reservation-request-form.md was added.
```

Phase 8.3.1 result:

```text
- prisma/seed.ts was added with deterministic, idempotent seed records.
- package.json now includes db:seed and Prisma seed configuration.
- lib/properties/public.ts was added as the server-side DB-backed public accommodation query service.
- Public accommodations list and detail routes now read from Prisma instead of config/accommodations.ts.
- The reservation quote service now reads pricing and capacity from seeded database properties.
- The availability service now resolves property IDs and preparation buffer policies from seeded database records.
- docs/47-initial-seed-and-db-backed-accommodation-source.md was added.
```

Phase 8.3.2 result:

```text
- react-day-picker was added for a styled public date range picker.
- react-phone-number-input was added so country phone metadata and dial codes are not manually guessed.
- features/i18n/use-locale.tsx was added as the client-side locale state and persistence hook.
- features/i18n/locale-switcher.tsx was added as the visible manual ES/EN switcher.
- lib/geo/countries.ts was added to expose localized country options with flags and dial codes.
- features/reservations/components/reservation-request-form.tsx was upgraded to controlled, styled inputs for date range, guest count, country, phone, and estimated arrival time.
- features/reservations/reservation-request-copy.ts was added to centralize reservation UX copy outside TSX components.
- docs/48-reservation-form-ux-and-manual-locale-switcher.md was added.
```

Phase 8.4 result:

```text
- POST /api/reservations/pending-hold was added.
- lib/reservations/pending-holds.ts was added with the server-side pending reservation hold service.
- types/reservation-pending-hold.ts was added with the public pending hold contract.
- features/reservations/reservation-pending-hold-copy.ts was added with centralized bilingual pending hold copy.
- features/reservations/components/reservation-request-form.tsx now creates a real PENDING_PAYMENT reservation hold after quote calculation and guest detail entry.
- Pending holds set expiresAt = now + 15 minutes.
- The server recalculates quote and revalidates availability immediately before writing the pending reservation.
- ReservationGuest is created together with the Reservation record.
- docs/49-pending-reservation-creation-and-expiration-handling.md was added.
- Phase 8.4 does not integrate Tilopay, create payment records, confirm reservations, send Resend emails, create manual calendar blocks, add admin reservation UI, add PMS behavior, or add migrations.
```

Phase 8.5 current scope:

```text
- Add a public-safe server endpoint to validate an active PENDING_PAYMENT reservation before future payment handoff.
- Require the hold to exist, remain PENDING_PAYMENT, and have expiresAt > now.
- Recalculate quote server-side using DB-backed pricing.
- Verify stored reservation amounts still match the recalculated quote.
- Revalidate availability while excluding the reservation itself from blocking records.
- Return readyForPayment only when the pending hold is still eligible.
- Do not integrate Tilopay, create payment records, confirm reservations, send emails, add admin UI, add PMS behavior, or add migrations.
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
