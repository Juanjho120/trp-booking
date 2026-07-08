# TRP Booking

TRP Booking is the technical name for the direct booking website of Tu Refugio Perfecto, a lodging business in Panajachel, Guatemala.

The public brand of the project is:

```text
Tu Refugio Perfecto
Bungalows Tu Refugio Perfecto
```

The official domain target is:

```text
turefugioperfecto.com.gt
```

## Purpose

TRP Booking is a public website and booking engine for direct reservations. It allows guests to:

- Discover the available accommodations.
- View photos, descriptions, amenities, rules, and policies.
- Check availability.
- Reserve available dates.
- Pay online through Tilopay.
- Receive confirmation and arrival instructions by email.

It also includes a private admin area to manage the minimum operational features needed for direct reservations.

## Important Scope Boundary

This project is not intended to become a PMS. TAMIAS is the internal PMS / operational system for property management.

TRP Booking is focused only on the public booking experience, direct reservations, payments, Airbnb iCal synchronization, and a minimal admin panel for that flow.

## Initial Stack

```text
Next.js 15
TypeScript
Prisma
PostgreSQL / Supabase
Auth.js / NextAuth
Tilopay
Cloudinary
Resend
Vercel Pro
Vercel Cron
```

## Initial Accommodations

```text
Apartamento Blanco y Negro
Black & White Apartment
Base price: $65/night
Max guests: 2

Bungalow Refugio Perfecto
Perfect Retreat Bungalow
Base price: $95/night
Max guests: 4

Refugio Completo
Complete Private Retreat in Panajachel
Base price: $145/night
Max guests: 6
```

`Refugio Completo` is a composed listing that combines `Apartamento Blanco y Negro` and `Bungalow Refugio Perfecto`.

## Key Operational Rules

- User-facing error messages must be centralized, reusable, bilingual, and mapped by domain instead of hardcoded inside components or server handlers.
- Public page copy should be centralized instead of hardcoded in TSX components.
- Public accommodation content must be read from the database after Phase 8.3.1. Typed accommodation config may remain only as transitional fallback/reference until it is removed.
- Amenity labels and icons must come from seeded database records for public pages after Phase 8.3.1.
- Guests must not modify confirmed reservation dates directly from the public website.
- Date changes require admin authorization or cancellation and a new reservation according to the cancellation policy.
- Stay extensions require a server-side availability check and any additional payment before the reservation is updated or extended.
- Confirmed reservations and imported Airbnb bookings must generate preparation buffer blocks automatically.
- The admin can manually unlock preparation buffer days when operationally convenient.
- Business-critical reservation, payment, refund, calendar, sync, and audit records must not be hard-deleted.
- Admin-managed catalog records that can be hidden from the UI should use soft delete where historical consistency matters.
- Seed data must be deterministic and idempotent; no seed script should create duplicate properties, amenities, rules, or relationships.
- Admin access must be protected before any admin page exposes operational data or actions.
- Provider secrets for Auth.js, Cloudinary, Tilopay, Resend, Airbnb iCal, and similar services must remain server-side only.
- Public accommodation images are backed by database `property_images` records after Phase 8.3.1. Image records may point to local fallback URLs until Cloudinary public IDs are managed through the database/admin flow.
- Availability ranges use date-only boundaries where `checkInDate` is inclusive and `checkOutDate` is exclusive.
- Availability must account for composed listing dependencies and preparation buffer rules before payment or reservation confirmation.
- Availability checks must ignore expired pending reservations, soft-deleted calendar blocks, and manually unlocked preparation buffer blocks.
- Public availability UI must not create reservations, start checkout, or collect payments during Phase 6.
- Confirmed reservations now derive preparation buffer blocking records at read time until a later write flow persists automatic buffer blocks.
- Airbnb iCal import URLs and export tokens must never be committed, logged, exposed through API responses, or displayed in public UI.
- Airbnb export feed tokens must be stored as hashes, not as raw reusable tokens.
- Airbnb scheduled sync must be protected by `CRON_SECRET` and must return redacted operational summaries only.
- Reservation flow must re-check availability server-side before creating pending holds or handing off to payment.
- Pending reservation holds must use `PENDING_PAYMENT` with a non-null `expiresAt` and must never be confirmed before validated payment.
- Public guest details forms may calculate quotes and collect client-side details before Phase 8.4, but must not create reservations or block dates.
- After Phase 8.3.2, the public reservation request form must use styled, controlled booking inputs instead of free-form date, guest, country, phone, and arrival-time fields.
- The public site must expose a manual ES/EN locale switcher and must persist the guest-selected locale client-side.

## Documentation

The project documentation lives under `/docs`:

```text
docs/
  00-project-overview.md
  01-product-scope.md
  02-brand-and-content.md
  03-architecture.md
  04-database-model.md
  05-development-standards.md
  06-security-and-payments.md
  07-airbnb-ical-sync.md
  08-email-notifications.md
  09-deployment.md
  10-phases.md
  11-progress-log.md
  12-public-visual-qa.md
  13-seo-foundation.md
  14-phase-2-closure-review.md
  15-database-foundation.md
  16-environment-validation.md
  17-prisma-core-schema.md
  18-soft-delete-audit-conventions.md
  19-seed-strategy.md
  20-phase-3-database-closure-review.md
  21-auth-admin-strategy.md
  22-auth-environment-validation.md
  23-auth-js-configuration.md
  24-admin-route-protection.md
  25-minimal-admin-shell.md
  26-phase-4-auth-closure-review.md
  27-cloudinary-strategy-and-environment.md
  28-cloudinary-environment-validation.md
  29-cloudinary-service-foundation.md
  30-public-accommodation-cloudinary-images.md
  31-phase-5-cloudinary-closure-review.md
  32-availability-strategy-and-calendar-rules.md
  33-availability-domain-service-foundation.md
  34-public-availability-calendar-ui-foundation.md
  35-preparation-buffer-and-blocked-date-evaluation.md
  36-phase-6-availability-closure-review.md
  37-airbnb-ical-strategy-and-environment-contract.md
  38-airbnb-calendar-configuration-model.md
  39-airbnb-ical-import-parser-and-sync-service.md
  40-airbnb-ical-export-feed-foundation.md
  41-scheduled-sync-and-manual-sync-foundation.md
  42-phase-7-airbnb-ical-closure-review.md
  43-reservation-flow-strategy-and-pending-hold-contract.md
  44-reservation-quote-and-server-side-pricing-foundation.md
  45-public-guest-details-and-reservation-request-form.md
  46-database-migration-bootstrap-correction.md
  47-initial-seed-and-db-backed-accommodation-source.md
  48-reservation-form-ux-and-manual-locale-switcher.md
```

The assistant collaboration rules live in:

```text
AGENTS.md
```

## Development Status

```text
Current phase: Phase 8 — Reservation Flow
Current subphase: 8.4 Pending reservation creation and expiration handling
Last completed phase: Phase 7 — Airbnb iCal Synchronization
Last completed subphase: 8.3.2 Reservation form UX and manual locale switcher
```

See `docs/10-phases.md`, `docs/11-progress-log.md`, `docs/46-database-migration-bootstrap-correction.md`, `docs/47-initial-seed-and-db-backed-accommodation-source.md`, and `docs/48-reservation-form-ux-and-manual-locale-switcher.md` for the official current tracker and database-backed reservation flow context.
