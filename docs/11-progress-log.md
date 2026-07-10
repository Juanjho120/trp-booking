# 11 — Progress Log

This document is the official progress tracker for TRP Booking. Update it whenever a phase or subphase changes status.

## Current Status

```text
Current phase: Phase 9 — Tilopay Sandbox Integration
Current subphase: 9.7 Phase 9 documentation update
Last updated: 2026-07-10
Last completed phase: Phase 8 — Reservation Flow
Last completed subphase: 9.6 Confirm reservation only after validated payment
```

## Completed Work

### Phase 9.4 — Tilopay SDK V2 Checkout Foundation

Status: **Completed**

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

### Phase 9.5 — Tilopay Redirect, Consult, and OrderHash V2 Validation Foundation

Status: **Completed**

Important decisions:

```text
TILOPAY_REDIRECT_URL is the callback URL passed to Tilopay SDK.
TILOPAY_SUCCESS_URL, TILOPAY_CANCEL_URL, and TILOPAY_ERROR_URL are guest-facing destinations after callback processing.
The redirect route reads Tilopay query parameters and resolves the Payment through providerReference/orderNumber.
The route calls Tilopay /login and /consult server-side.
OrderHash V2 is validated with HMAC-SHA256.
Payment.status can become APPROVED, REJECTED, or FAILED.
Reservation.status remains PENDING_PAYMENT until Phase 9.6.
No emails are sent in 9.5.
No Prisma schema change or migration is required in 9.5.
No PMS behavior is added.
```

### Phase 9.6 — Confirm Reservation Only After Validated Payment

Status: **Completed**

Completed deliverables:

```text
lib/reservations/confirmation.ts added
lib/reservations/index.ts added
types/reservation-confirmation.ts added
types/tilopay-payment-result.ts updated
lib/payments/tilopay-payment-result.ts updated
lib/payments/index.ts updated
app/api/payments/tilopay/redirect/route.ts updated
docs/58-confirm-reservation-after-validated-payment.md added
docs/10-phases.md updated
docs/11-progress-log.md updated
README.md updated
```

Important decisions:

```text
Reservation confirmation is payment-driven.
Only APPROVED payments can confirm a reservation.
Rejected and failed payments never confirm reservations.
The confirmation service is idempotent.
PENDING_PAYMENT and EXPIRED reservations can become CONFIRMED after a validated APPROVED payment.
Reservation.confirmedAt is set during confirmation.
Reservation.expiresAt is cleared during confirmation.
No Resend email is sent in 9.6.
No Prisma schema change or migration is required in 9.6.
No PMS behavior is added.
```

## Current Work

### Phase 9 — Tilopay Sandbox Integration

Status: **In progress**

Current subphase:

```text
9.7 Phase 9 documentation update
```

Phase 9.7 goals:

```text
Close Phase 9 documentation.
Review the Tilopay sandbox integration end-to-end.
Document manual sandbox testing.
Document known limitations before Phase 10 emails.
```

## Next Recommended Work

```text
1. Run an end-to-end Tilopay sandbox payment.
2. Confirm Payment.status becomes APPROVED.
3. Confirm Reservation.status becomes CONFIRMED.
4. Confirm failed/rejected payments do not confirm reservations.
5. Close Phase 9 documentation before starting Phase 10 emails.
```

## Continuity Notes for New Conversations

Minimum context files to review before continuing:

```text
README.md
AGENTS.md
.env.example
docs/10-phases.md
docs/11-progress-log.md
docs/56-tilopay-sdk-v2-contract-for-trp-booking.md
docs/57-tilopay-redirect-consult-and-orderhash-validation.md
docs/58-confirm-reservation-after-validated-payment.md
lib/payments/tilopay-payment-result.ts
lib/reservations/confirmation.ts
prisma/schema.prisma
```
