# 10 — Project Phases

This document defines the official implementation phases for TRP Booking and tracks the current progress at a high level.

## Status Legend

```text
Not started  — Work has not begun.
In progress  — Work has started but the phase is not complete.
Completed    — Deliverables are implemented and committed.
Deferred     — Intentionally postponed.
```

## Current Phase

```text
Current phase: Phase 2 — Public Website Foundation
Current focus: static public pages, centralized public copy, and visual polish before database work.
```

---

## Phase 0 — Project Definition and Technical Documentation

Status: **Completed**

Goal: Create official project documentation before writing code.

Deliverables:

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

Deliverables:

```text
GitHub repository trp-booking
Next.js 15 setup
TypeScript strict
ESLint
Basic App Router structure
Base layout
Initial i18n/message structure
Centralized error message foundation
Design system foundation
```

---

## Phase 2 — Public Website Foundation

Status: **In progress**

Goal: Build the first static public website experience before adding database, admin, booking, payments, or calendar logic.

Completed subphases:

```text
2.1 Initial marketing homepage shell
2.2 Public layout foundation with header and footer
2.3 Static accommodation listing page
2.4 Static accommodation detail pages
2.5 Static image foundation with optimized local WebP assets
```

Current subphase:

```text
2.6 Centralize public page copy and add amenity icons
```

Remaining / upcoming subphases:

```text
2.7 Public copy cleanup and visual QA
2.8 Basic SEO metadata review for static pages
2.9 Mobile responsive review
```

Deliverables:

```text
Home page
Accommodation listing page
Accommodation detail pages
Header
Footer
Responsive layout
Brand tone implementation
Static optimized images
Centralized public copy foundation
Amenity icons
Basic SEO metadata
```

---

## Phase 3 — Prisma and Supabase Setup

Status: **Not started**

Goal: Connect database and define initial schema.

Deliverables:

```text
Supabase portfolio-lab schema trp_booking
Prisma setup
Initial models
Initial migration
Seed data for three accommodations
Database connection validation
```

---

## Phase 4 — Cloudinary Images

Status: **Not started**

Goal: Manage and display accommodation photos from Cloudinary.

Deliverables:

```text
Cloudinary configuration
Admin image upload
Cover image selection
Gallery ordering
Image deletion
Alt text management
Optimized public gallery
```

---

## Phase 5 — Admin Authentication and Admin Base

Status: **Not started**

Goal: Protect the private area.

Deliverables:

```text
Auth.js setup
Admin login
Protected /admin routes
Admin dashboard
Admin navigation
Basic audit logging
```

---

## Phase 6 — Accommodation Admin

Status: **Not started**

Goal: Manage core accommodation content.

Deliverables:

```text
Create/edit properties
Manage descriptions
Manage base prices
Manage capacity
Manage amenities
Manage rules
Manage composed listing configuration
```

---

## Phase 7 — Availability Engine

Status: **Not started**

Goal: Calculate availability correctly.

Deliverables:

```text
CalendarBlock model usage
Manual blocks
Availability service
Overlap prevention
Composed listing availability rules
Preparation buffer block generation
Preparation buffer admin unlock
Public date selector
Admin calendar view
```

---

## Phase 8 — Airbnb iCal Synchronization

Status: **Not started**

Goal: Synchronize calendars with Airbnb.

Deliverables:

```text
ExternalCalendar configuration
Airbnb iCal import parser
ExternalCalendarEvent storage
CalendarBlock generation from Airbnb
TRP Booking iCal export endpoint
Preparation buffer export to Airbnb
Manual sync button
Vercel Cron endpoint
Sync logs
```

---

## Phase 9 — Reservation Flow Without Payment

Status: **Not started**

Goal: Create reservation flow and pending holds.

Deliverables:

```text
Reservation form
Guest details
Estimated arrival time
Server-side availability validation
Server-side price calculation
PENDING_PAYMENT reservation
Reservation expiration
Reservation summary page
No self-service confirmed date modification
```

---

## Phase 10 — Tilopay Sandbox Integration

Status: **Not started**

Goal: Connect reservations to sandbox payments.

Deliverables:

```text
PaymentService
TilopayPaymentProvider
Create payment transaction
Payment redirect or embedded flow, depending on Tilopay
Tilopay webhook route
Webhook validation
Payment status updates
Reservation confirmation after payment
Payment failed handling
```

---

## Phase 11 — Resend Email Notifications

Status: **Not started**

Goal: Send transactional emails.

Deliverables:

```text
Resend setup
Reservation confirmation email
Arrival instructions email
Payment failed email
Cancellation email
Reservation dates updated email
Stay extension confirmed email
Refund email
Admin notification email
EmailNotification logs
Spanish templates
English templates
```

---

## Phase 12 — Cancellation, Date Changes, Extensions, and Refunds

Status: **Not started**

Goal: Handle cancellations, admin-approved date changes, stay extensions, and refund tracking.

Deliverables:

```text
Cancellation policy implementation
Cancel reservation from admin
Admin-approved date change workflow
Stay extension availability validation
Additional payment handling for extensions
Refund eligibility calculation
Full refund tracking
Partial refund tracking
Tilopay refund API integration if available
Manual refund tracking if needed
Refund email
Audit logs
```

---

## Phase 13 — SEO and Trust Polish

Status: **Not started**

Goal: Prepare public pages for trust and search visibility.

Deliverables:

```text
Metadata per page
Open Graph images
Sitemap
Robots.txt
FAQ page
Policies page
Book directly with us section
Mobile polish
Performance review
Image optimization review
```

---

## Phase 14 — Logo Refresh and Brand Finalization

Status: **Not started**

Goal: Replace temporary brand assets with polished assets.

Deliverables:

```text
Refreshed logo SVG
Header logo
Square logo
Favicon
Dark background version
Light background version
Social preview image
```

This phase may be done earlier if final logo assets are ready.

---

## Phase 15 — Production Preparation

Status: **Not started**

Goal: Prepare the project for real reservations and payments.

Deliverables:

```text
Production Supabase project
Production Cloudinary account
Production Resend domain
Production Tilopay affiliation
Vercel Pro production configuration
Official domain setup
Environment variables configured
Cron configured
Webhook configured
End-to-end test booking
End-to-end test cancellation
End-to-end test refund, if supported
Airbnb import/export validation
Launch checklist completed
```

---

## Phase 16 — Analytics and Conversion Tracking

Status: **Not started**

Goal: Measure user behavior and booking conversion.

Deliverables:

```text
Vercel Analytics
Custom events
Accommodation view event
Date selection event
Checkout start event
Payment success event
Payment failed event
Admin dashboard metrics, optional
```
