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

## Important Scope Boundary

This project is not intended to become a PMS. TAMIAS is the internal PMS / operational system for property management.

## Key Operational Rules

- Provider secrets must remain server-side only.
- Pending reservation holds must never be confirmed before validated payment.
- Phase 9 must not store card data.
- Phase 9 must not set `Reservation.status = CONFIRMED` until a provider payment result is validated server-side.
- Phase 9 must keep failed, rejected, expired, and successful payment attempts auditable.
- Resend email delivery belongs to Phase 10 unless explicitly moved later.
- User-facing public copy must be centralized in `messages/es.ts` and `messages/en.ts`.

## Phase 9 Summary

Phase 9 completed so far:

```text
9.1 Tilopay sandbox strategy and environment contract
9.2 Tilopay environment validation
9.3 Payment record creation for pending reservations
9.4 Tilopay SDK V2 checkout foundation
9.5 Tilopay redirect, consult, and OrderHash V2 validation foundation
```

Phase 9.5 added:

```text
- TILOPAY_REDIRECT_URL as the SDK callback URL.
- GET /api/payments/tilopay/redirect
- Server-side Tilopay /login and /consult.
- OrderHash V2 HMAC-SHA256 validation.
- Payment.status updates to APPROVED, REJECTED, or FAILED.
```

No reservation confirmation, Resend email delivery, Prisma migration, admin payment UI, refund handling, or PMS behavior is implemented in 9.5.

## Documentation

Important current tracker files:

```text
AGENTS.md
README.md
docs/10-phases.md
docs/11-progress-log.md
docs/53-tilopay-sandbox-strategy-and-environment-contract.md
docs/54-tilopay-environment-validation.md
docs/55-payment-record-creation-for-pending-reservations.md
docs/56-tilopay-sdk-v2-contract-for-trp-booking.md
docs/57-tilopay-redirect-consult-and-orderhash-validation.md
```

## Development Status

```text
Current phase: Phase 9 — Tilopay Sandbox Integration
Current subphase: 9.6 Confirm reservation only after validated payment
Last completed phase: Phase 8 — Reservation Flow
Last completed subphase: 9.5 Tilopay redirect, consult, and OrderHash V2 validation foundation
```
