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
Current phase: Phase 3 — Database Foundation
Current subphase: 3.2 Environment variable validation foundation
Current focus: add typed environment validation after the Prisma/PostgreSQL foundation has been installed and documented.
```

---

## Phase 0 — Project Definition and Technical Documentation

Status: **Completed**

Goal: Create official project documentation before writing code.

Completed deliverables:

```text
README.md
AGENTS.md
docs/00-project-overview.md
docs/01-product-scope.md
docs/02-brand-and-content.md
docs/03-architecture.md
docs/04-database-model.md
docs/05-development-standards.md
docs/06-security-and-payments.md
docs/07-airbnb-ical-sync.md
docs/08-email-notifications.md
docs/09-deployment.md
docs/10-phases.md
docs/11-progress-log.md
```

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

Status: **In progress**

Goal: Add Prisma and Supabase/PostgreSQL foundation after the public static foundation is stable.

Subphase status:

```text
3.1 Prisma and Supabase foundation setup — Completed
3.2 Environment variable validation foundation — In progress
3.3 Initial Prisma schema for core booking domain — Not started
3.4 Soft delete and audit field conventions — Not started
3.5 Initial seed strategy for accommodations, amenities, rules, and static content — Not started
3.6 Database documentation update — Not started
```

Phase 3 rules:

```text
- Do not add admin UI in Phase 3.
- Do not integrate Tilopay in Phase 3.
- Do not integrate Cloudinary in Phase 3.
- Do not integrate Resend in Phase 3.
- Do not implement Airbnb iCal sync in Phase 3.
- Do not move TRP Booking toward PMS features.
- Keep current public pages working while adding database foundation.
```

---

## Phase 4 — Admin Authentication Foundation

Status: **Not started**

---

## Phase 5 — Cloudinary Integration

Status: **Not started**

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
