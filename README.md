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

This project is not intended to become a PMS.

TAMIAS is the internal PMS / operational system for property management. TRP Booking is focused only on the public booking experience, direct reservations, payments, Airbnb iCal synchronization, and a minimal admin panel for that flow.

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
- Public page copy should be centralized in `messages/en.ts` and `messages/es.ts` instead of hardcoded in TSX components.
- Amenity labels and icons should be managed through the typed amenity catalog.
- Guests must not modify confirmed reservation dates directly from the public website. Date changes require admin authorization or cancellation and a new reservation according to the cancellation policy.
- Stay extensions require a server-side availability check and any additional payment before the reservation is updated or extended.
- Confirmed reservations and imported Airbnb bookings must generate preparation buffer blocks automatically. The admin can manually unlock preparation buffer days when operationally convenient.

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
```

The assistant collaboration rules live in:

```text
AGENTS.md
```

## Development Status

```text
Current phase: Phase 2 — Public Website Foundation
Current subphase: 2.7 Public copy cleanup and visual QA
```

See `docs/10-phases.md`, `docs/11-progress-log.md`, and `docs/12-public-visual-qa.md` for the official phase tracker and QA checklist.
