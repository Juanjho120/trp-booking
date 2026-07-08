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
Current phase: Phase 6 — Availability Calendar Foundation
Current subphase: 6.4 Preparation buffer and blocked-date evaluation
Current focus: strengthen preparation buffer and blocked-date evaluation after the first public availability UI, without checkout, payment, email, or Airbnb iCal sync.
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

Status: **In progress**

Goal: Add the first availability calendar foundation for public date visibility and future reservation validation without introducing checkout, payment, email, or Airbnb iCal sync yet.

Subphase status:

```text
6.1 Availability strategy and booking calendar rules — Completed
6.2 Availability domain service foundation — Completed
6.3 Public availability calendar UI foundation — Completed
6.4 Preparation buffer and blocked-date evaluation — In progress
6.5 Phase 6 documentation update — Not started
```

Phase 6 rules:

```text
- Do not add booking checkout in Phase 6.
- Do not integrate Tilopay in Phase 6.
- Do not integrate Resend in Phase 6.
- Do not implement Airbnb iCal import/export in Phase 6.
- Do not add PMS features.
- Guests must not be able to modify confirmed reservation dates directly.
- Public availability must eventually account for confirmed reservations, imported Airbnb bookings, manual blocks, and preparation buffer blocks.
- Preparation buffer rules must preserve the documented policies for each accommodation.
- Date ranges use lodging convention: check-in inclusive, check-out exclusive.
```

Phase 6.1 result:

```text
- Availability strategy and booking calendar rules were documented in docs/32-availability-strategy-and-calendar-rules.md.
- Typed availability domain types were added in types/availability.ts.
- Availability dependency rules were added for individual and composed accommodations.
- Date-only helper functions were added for YYYY-MM-DD boundaries.
- Preparation buffer range helpers were added for future service and UI work.
- No checkout, payment, email, iCal sync, database writes, migrations, seed data, or PMS features were added.
```

Phase 6.2 result:

```text
- A reusable Prisma client helper was added under lib/db/prisma.ts.
- A server-side availability service was added under lib/availability/service.ts.
- The service reads overlapping reservations and calendar blocks through Prisma.
- The service applies composed listing dependency rules before evaluating availability.
- Active pending payment holds and confirmed reservations block availability.
- Expired pending reservations are ignored.
- Soft-deleted calendar blocks are ignored.
- Manually unlocked preparation buffer blocks are ignored.
- The service returns typed availability results without creating reservations or writing to the database.
- Prisma Client generation must run before build/type checking.
- No checkout, payment, email, Airbnb iCal sync, migrations, seed data, admin calendar UI, or PMS features were added.
```

Phase 6.3 result:

```text
- A runtime `/api/availability` endpoint was added for public availability calendar data.
- The endpoint uses the Phase 6.2 server-side availability service.
- A public `/disponibilidad` page was added.
- The page renders public availability calendar cards for each accommodation.
- Unavailable dates are displayed as disabled/non-selectable.
- Checkout, date selection, reservation creation, payment, email, Airbnb iCal sync, migrations, seed data, admin calendar UI, and PMS features remain out of scope.
```

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
