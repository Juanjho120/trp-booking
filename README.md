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
- Tilopay credentials remain server-side and TRP Booking does not store card number, CVV, expiration date, or tokenized card data.
- `Reservation.status` becomes `CONFIRMED` only after the provider payment result is validated server-side.
- Failed, rejected, expired, and successful payment attempts remain auditable.
- Resend email delivery belongs to Phase 10.
- Public-facing and admin-facing copy is centralized in `messages/es.ts` and `messages/en.ts`.
- Admin modules use dedicated routes under `/admin`; the dashboard remains a compact summary.
- Manual availability blocks use `CalendarBlock.source = MANUAL_BLOCK`, optional internal notes, soft deletion, audit logs, and server-side availability revalidation.
- Existing effective blockers—including direct reservations, active holds, Airbnb bookings, manual blocks, maintenance, and preparation buffers—cannot be selected for a new manual range.
- Only manual blocks and preparation buffers support the admin release/restore actions documented for Phase 9.

## Phase 9 Summary

Phase 9 — Tilopay Sandbox Integration is completed.

Completed subphases:

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
9.9.1 Admin navigation and property calendar operations
9.10 Phase 9 documentation update and closure
```

Final Phase 9 capabilities:

```text
- Server-side Tilopay sandbox session, redirect, consult, hash validation, and payment-result handling.
- Payment-driven and idempotent reservation confirmation.
- Safe localized retry behavior without exposing raw provider errors.
- A shared Tilopay checkout used by the normal pending-reservation flow and retry flow.
- Fully styled Radix payment-method selection while the SDK-required native field remains hidden and synchronized.
- Visible accepted-card indicators for Visa, Mastercard, and American Express.
- Dedicated admin routes for dashboard, reservations, payments, calendar, and accommodation settings.
- Search, filters, and pagination for operational reservation/payment data.
- Dynamic preparation buffers for confirmed reservations and active pending holds.
- Auditable one-day preparation-buffer overrides.
- Property calendar with effective blockers, composed-listing inheritance, manual blocking, release, unlock, and restore operations.
- Successful admin mutations shown as auto-dismissing snackbars; operational errors remain persistent inline.
- No Phase 10 emails, guest date changes, manual reservation confirmation, refund workflow, or PMS behavior.
```

The real Airbnb iCal operational end-to-end test remains deferred until secure `external_calendars` configuration, real import URLs, and export tokens are available.

## Documentation

The project documentation lives under `/docs`.

Important tracker and continuity files:

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
docs/72-admin-navigation-and-property-calendar-operations.md
docs/73-phase-9-documentation-closure.md
```

## Development Status

```text
Current phase: Phase 10 — Email Notifications
Current focus: define the Phase 10 notification strategy, Resend contract, idempotency, templates, and delivery audit behavior
Last completed phase: Phase 9 — Tilopay Sandbox Integration
Last completed subphase: 9.10 Phase 9 documentation update and closure
```
