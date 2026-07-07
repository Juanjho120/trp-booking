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
Current phase: Phase 5 — Cloudinary Integration
Current subphase: 5.1 Cloudinary strategy and environment foundation
Current focus: define the Cloudinary integration approach and environment requirements after closing the protected admin authentication foundation.
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

Phase 4 rules preserved:

```text
- No booking checkout was added in Phase 4.
- No Tilopay integration was added in Phase 4.
- No Cloudinary integration was added in Phase 4.
- No Resend integration was added in Phase 4.
- No Airbnb iCal sync was implemented in Phase 4.
- No PMS features were added.
```

---

## Phase 5 — Cloudinary Integration

Status: **In progress**

Goal: Add the image storage, delivery, and transformation foundation for accommodation images without introducing reservation, payment, email, or iCal functionality.

Subphase status:

```text
5.1 Cloudinary strategy and environment foundation — In progress
5.2 Cloudinary environment validation — Not started
5.3 Cloudinary service foundation — Not started
5.4 Accommodation image data mapping review — Not started
5.5 Phase 5 documentation update — Not started
```

Phase 5 rules:

```text
- Do not add booking checkout in Phase 5.
- Do not integrate Tilopay in Phase 5.
- Do not integrate Resend in Phase 5.
- Do not implement Airbnb iCal sync in Phase 5.
- Do not add PMS features.
- Do not store provider secrets in client-side code.
- Do not upload or persist images until the Cloudinary strategy and environment validation are documented.
- Public pages must keep working during the image integration foundation.
```

---

## Phase 6 — Availability Calendar Foundation

Status: **Not started**

---

## Phase 7 — Airbnb iCal Synchronization

Status: **Not started**

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
