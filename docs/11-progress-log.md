# 11 — Progress Log

This document is the official progress tracker for TRP Booking. Update it whenever a phase or subphase changes status.

## Current Status

```text
Current phase: Phase 9 — Tilopay Sandbox Integration
Current subphase: 9.5 Tilopay redirect, consult, and OrderHash V2 validation foundation
Last updated: 2026-07-10
Last completed phase: Phase 8 — Reservation Flow
Last completed subphase: 9.4 Tilopay SDK V2 checkout foundation
```

## Completed Work

### Phase 8 — Reservation Flow

Status: **Completed**

Closure document:

```text
docs/52-phase-8-reservation-flow-closure-review.md
```

Phase 8 closure result:

```text
The project can now create PENDING_PAYMENT reservation holds, block active pending holds, release expired pending holds, validate payment handoff readiness, and mark expired pending holds as EXPIRED through a protected cron cleanup.
Phase 8 intentionally did not add Tilopay checkout, Payment records, payment webhooks, CONFIRMED reservation transitions, Resend emails, admin reservation UI, or PMS behavior.
```

### Phase 9.1 — Tilopay Sandbox Strategy and Environment Contract

Status: **Completed**

Important decisions:

```text
Tilopay sandbox exposes Api Key, Api User, and Api Password.
Those values map to TILOPAY_API_KEY, TILOPAY_API_USER, and TILOPAY_API_PASSWORD.
TRP Booking must not store card data.
Payment must start from an active PENDING_PAYMENT reservation.
Payment handoff must revalidate the reservation before creating a payment attempt.
Reservation.status must not become CONFIRMED until a provider result is validated server-side.
No PMS behavior is introduced in Phase 9.
```

### Phase 9.2 — Tilopay Environment Validation

Status: **Completed**

Important decisions:

```text
TILOPAY_ENVIRONMENT is required and must be sandbox or production.
TILOPAY_API_KEY is required and maps to Api Key in the Tilopay sandbox panel.
TILOPAY_API_USER is required and maps to Api User in the Tilopay sandbox panel.
TILOPAY_API_PASSWORD is required and maps to Api Password in the Tilopay sandbox panel.
TILOPAY_SUCCESS_URL, TILOPAY_CANCEL_URL, TILOPAY_ERROR_URL, and TILOPAY_WEBHOOK_URL are currently validated from the previous environment contract.
Callback URLs must use HTTPS outside local development.
Tilopay secrets remain server-side only.
```

### Phase 9.3 — Payment Record Creation for Pending Reservations

Status: **Completed**

Important decisions:

```text
Payment attempts are internal Payment records.
Payment attempts require an active payable PENDING_PAYMENT reservation.
The service reuses Phase 8.5 payment handoff readiness validation before creating the Payment.
The Payment record uses provider = TILOPAY and status = PENDING.
The Payment amount is the validated reservation total.
If a matching PENDING Tilopay Payment already exists for the reservation, the service returns it instead of creating another record.
If an existing pending payment amount does not match the current reservation total, the service rejects the request.
Payment attempt user-facing error messages live in messages/es.ts and messages/en.ts.
No Tilopay API call is made in 9.3.
No checkout redirect is created in 9.3.
No webhook handler is added in 9.3.
No reservation is confirmed in 9.3.
No Resend email is sent in 9.3.
No Prisma schema change or migration is required in 9.3 because the Payment model already exists.
```

### Phase 9.4 — Tilopay SDK V2 Checkout Foundation

Status: **Completed**

Completed deliverables:

```text
app/api/payments/tilopay/sdk-session/route.ts added
features/payments/components/tilopay-sdk-checkout.tsx added
lib/payments/tilopay-sdk-session.ts added
types/tilopay-sdk-session.ts added
lib/payments/index.ts updated
docs/56-tilopay-sdk-v2-contract-for-trp-booking.md added
docs/10-phases.md updated to mark 9.4 completed and 9.5 next
docs/11-progress-log.md updated with Phase 9.4 completion
```

Important decisions:

```text
TRP Booking uses Tilopay SDK V2 as the preferred checkout foundation.
The guest should not leave the TRP Booking experience as the main payment flow.
The SDK is loaded from https://app.tilopay.com/sdk/v2/sdk_tpay.min.js.
The backend calls /loginSdk server-side with apiuser, password, and key.
The frontend receives only the SDK access token and safe init configuration.
Payment.providerReference stores the unique orderNumber sent to Tilopay.
The SDK form fields are rendered in the browser but TRP Booking does not read, store, log, or send card number, CVV, expiration, or tokens to its backend.
No regular-payment webhook is assumed because Tilopay support confirmed non-recurrent hosted payments do not currently have webhooks.
No reservation is confirmed in 9.4.
No Resend email is sent in 9.4.
No Prisma schema change or migration is required in 9.4.
```

## Current Work

### Phase 9 — Tilopay Sandbox Integration

Status: **In progress**

Current subphase:

```text
9.5 Tilopay redirect, consult, and OrderHash V2 validation foundation
```

Phase 9.5 goals:

```text
Read the Tilopay redirect result.
Validate OrderHash V2.
Consult the transaction server-side.
Update Payment status according to the validated provider result.
Do not confirm reservations yet unless the phase explicitly reaches the documented confirmation transition.
Do not send emails yet.
Do not add PMS features.
```

## Next Recommended Work

```text
1. Implement the same-domain Tilopay redirect result route/page.
2. Validate OrderHash V2 against sandbox.
3. Use /api/v1/consult server-side to verify amount, currency, orderNumber, and status.
4. Update Payment status only after provider validation.
5. Keep Reservation.status = PENDING_PAYMENT until the documented confirmation subphase.
```

## Continuity Notes for New Conversations

Minimum context files to review before continuing:

```text
README.md
AGENTS.md
.env.example
docs/10-phases.md
docs/11-progress-log.md
docs/53-tilopay-sandbox-strategy-and-environment-contract.md
docs/54-tilopay-environment-validation.md
docs/55-payment-record-creation-for-pending-reservations.md
docs/56-tilopay-sdk-v2-contract-for-trp-booking.md
lib/env/server.ts
lib/payments/payment-attempts.ts
lib/payments/tilopay-sdk-session.ts
lib/reservations/payment-handoff.ts
prisma/schema.prisma
```
