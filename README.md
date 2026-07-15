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
- Receive confirmation and arrival instructions by email when Phase 10 is implemented.

It also includes a private admin area for the minimum operational features required by the direct-booking flow.

## Important Scope Boundary

This project is not intended to become a PMS. TAMIAS is the internal PMS / operational system for property management.

TRP Booking is focused only on the public booking experience, direct reservations, payments, Airbnb iCal synchronization, and a minimal admin panel for that flow.

## Key Operational Rules

- Provider secrets for Auth.js, Cloudinary, Tilopay, Resend, Airbnb iCal, and similar services must remain server-side only.
- Reservation flow must re-check availability server-side before creating pending holds or handing off to payment.
- Pending reservation holds must use `PENDING_PAYMENT` with a non-null `expiresAt` and must never be confirmed before validated payment.
- `CONFIRMED` reservations block their stay dates and preparation buffers.
- Active `PENDING_PAYMENT` holds with `expiresAt > now` temporarily block their stay dates and preparation buffers.
- Expired pending holds and `EXPIRED` reservations do not block stay dates or preparation buffers.
- Preparation buffers use the values stored in `Property.preparationDaysBefore` and `Property.preparationDaysAfter`.
- Composed-listing dependency rules apply to stay dates and preparation buffers.
- Guests cannot modify confirmed dates directly from the public website.
- Phase 9 must keep all Tilopay credentials server-side only and must not store card data.
- Phase 9 must not set `Reservation.status = CONFIRMED` until a provider payment result is validated server-side.
- Phase 9 must keep failed, rejected, expired, and successful payment attempts auditable.
- Resend email delivery belongs to Phase 10 unless explicitly moved later.
- Public-facing and admin-facing copy must be centralized in `messages/es.ts` and `messages/en.ts`.

## Phase 9 Summary

Completed Phase 9 work:

```text
9.1 Tilopay sandbox strategy and environment contract
9.2 Tilopay environment validation
9.3 Payment record creation for pending reservations
9.4 Tilopay SDK V2 checkout foundation
9.5 Tilopay redirect, consult, and OrderHash V2 validation foundation
9.6 Confirm reservation only after validated payment
9.6.1 Tilopay sandbox hardening, retryable payment errors, status localization, and checkout UX
9.7 Admin reservation and payment review
9.8 Automatic preparation buffers in availability
9.9 Admin preparation buffer settings and auditable overrides
```

Phase 9.9 added:

```text
- Protected admin configuration for preparation days per accommodation.
- Dynamic direct-reservation buffers remain the source of truth.
- One-day PREPARATION_BUFFER override rows record manual unlocks without releasing stay dates.
- AdminAuditLog records configuration changes and day unlocks.
- Availability and future iCal exports apply the same override subtraction.
- Airbnb import sync reads the current Property preparation settings when it materializes imported buffers.
- No Prisma migration, pending-hold persistence, emails, guest date changes, or PMS behavior.
```

## Documentation

The project documentation lives under `/docs`.

Important current tracker and continuity files:

```text
AGENTS.md
README.md
docs/10-phases.md
docs/11-progress-log.md
docs/32-availability-strategy-and-calendar-rules.md
docs/35-preparation-buffer-and-blocked-date-evaluation.md
docs/68-phase-9-admin-and-preparation-buffers-roadmap.md
docs/69-admin-reservation-payment-review.md
docs/70-automatic-preparation-buffers-in-availability.md
docs/71-admin-preparation-buffer-settings-and-overrides.md
```

## Development Status

```text
Current phase: Phase 9 — Tilopay Sandbox Integration
Current subphase: 9.10 Phase 9 documentation update and closure
Last completed phase: Phase 8 — Reservation Flow
Last completed subphase: 9.9 Admin preparation buffer settings and auditable overrides
```
