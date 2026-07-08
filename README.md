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
- Amenity labels and icons should be managed through the typed amenity catalog.
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
- Public accommodation images are delivered from Cloudinary after Phase 5.4; local files under `public/images/accommodations` remain only as upload sources or temporary rollback references until an admin image management flow replaces them.
- Availability ranges use date-only boundaries where `checkInDate` is inclusive and `checkOutDate` is exclusive.
- Availability must account for composed listing dependencies and preparation buffer rules before payment or reservation confirmation.
- Availability checks must ignore expired pending reservations, soft-deleted calendar blocks, and manually unlocked preparation buffer blocks.
- Public availability UI must not create reservations, start checkout, or collect payments during Phase 6.
- Confirmed reservations now derive preparation buffer blocking records at read time until a later write flow persists automatic buffer blocks.
- Airbnb iCal import URLs and export tokens must never be committed, logged, exposed through API responses, or displayed in public UI.
- Airbnb export feed tokens must be stored as hashes, not as raw reusable tokens.

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
```

The assistant collaboration rules live in:

```text
AGENTS.md
```

## Development Status

```text
Current phase: Phase 7 — Airbnb iCal Synchronization
Current subphase: 7.4 Airbnb iCal export feed foundation
Last completed phase: Phase 6 — Availability Calendar Foundation
Last completed subphase: 7.3 Airbnb iCal import parser and sync service
```

See `docs/10-phases.md`, `docs/11-progress-log.md`, `docs/07-airbnb-ical-sync.md`, `docs/36-phase-6-availability-closure-review.md`, `docs/37-airbnb-ical-strategy-and-environment-contract.md`, `docs/38-airbnb-calendar-configuration-model.md`, and `docs/39-airbnb-ical-import-parser-and-sync-service.md` for the official current tracker and iCal synchronization context.
