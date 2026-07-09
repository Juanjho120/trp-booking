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

## Key Operational Rules

- Provider secrets for Auth.js, Cloudinary, Tilopay, Resend, Airbnb iCal, and similar services must remain server-side only.
- Reservation flow must re-check availability server-side before creating pending holds or handing off to payment.
- Pending reservation holds must use `PENDING_PAYMENT` with a non-null `expiresAt` and must never be confirmed before validated payment.
- Phase 9 must keep all Tilopay credentials server-side only.
- Phase 9 must not store card data.
- Phase 9 must not set `Reservation.status = CONFIRMED` until a payment callback/webhook is validated.
- Phase 9 must keep failed, rejected, expired, and successful payment attempts auditable.
- Resend email delivery belongs to Phase 10 unless explicitly moved later.

## Phase 9 Start Summary

Phase 9 starts from the completed Phase 8 reservation-flow foundation.

Phase 9 completed so far:

```text
9.1 Tilopay sandbox strategy and environment contract
9.2 Tilopay environment validation
9.3 Payment record creation for pending reservations
```

Phase 9.3 added:

```text
- POST /api/payments/attempts
- Internal Payment record creation for active PENDING_PAYMENT reservations.
- Reuse of payment handoff readiness validation before creating a Payment.
- Idempotent reuse of an existing pending Tilopay Payment for the same reservation when the amount still matches.
- Centralized bilingual payment-attempt error copy.
```

No Tilopay checkout, redirect, webhook handler, reservation confirmation, or Resend email delivery is implemented in 9.3.

## Documentation

The project documentation lives under `/docs`.

Important current tracker files:

```text
AGENTS.md
README.md
docs/10-phases.md
docs/11-progress-log.md
docs/53-tilopay-sandbox-strategy-and-environment-contract.md
docs/54-tilopay-environment-validation.md
docs/55-payment-record-creation-for-pending-reservations.md
```

## Development Status

```text
Current phase: Phase 9 — Tilopay Sandbox Integration
Current subphase: 9.4 Payment handoff redirect/session foundation
Last completed phase: Phase 8 — Reservation Flow
Last completed subphase: 9.3 Payment record creation for pending reservations
```
