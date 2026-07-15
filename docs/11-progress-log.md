# 11 — Progress Log

This document is the official progress tracker for TRP Booking. Update it whenever a phase or subphase changes status.

## Current Status

```text
Current phase: Phase 9 — Tilopay Sandbox Integration
Current subphase: 9.8 Automatic preparation buffers in availability
Last updated: 2026-07-15
Last completed phase: Phase 8 — Reservation Flow
Last completed subphase: 9.7 Admin reservation and payment review
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

### Phase 9.6.1 — Tilopay Sandbox Hardening, Retryable Payment Errors, Status Localization, and Checkout UX

Status: **Completed**

Completed deliverables:

```text
Strict Tilopay OrderHash validation was hardened.
Tilopay preflight validation was added before starting payment.
Expired reservation confirmations were prevented.
Tilopay SDK client failures are tracked for safe operational diagnostics.
Retryable payment errors were mapped to safe localized issues.
The retry page was added for retryable payment failures.
Payment retry copy was centralized in messages/es.ts and messages/en.ts.
Payment result labels distinguish payment status from reservation status.
Payment and reservation statuses are localized.
The reservation flow auto-scrolls to quote, pending reservation, and payment areas.
```

Important decisions:

```text
Do not show raw Tilopay provider descriptions to guests.
Do not store card number, CVV, expiration, or tokenized card data.
Retryable failures should preserve guest-friendly messaging while keeping operational diagnostics auditable.
The public payment result pages should not claim success until server-side payment validation has completed.
Payment retry and payment result copy must stay centralized in messages/es.ts and messages/en.ts.
The UX auto-scroll improvements are visual guidance only; they do not change reservation or payment state.
```

### Phase 9.7 — Admin Reservation and Payment Review

Status: **Completed**

Completed deliverables:

```text
app/admin/page.tsx updated
features/admin/components/admin-reservation-payment-review-shell.tsx added
features/admin/admin-review-copy.ts added
features/admin/index.ts updated
lib/admin/reservation-payment-review.ts added
lib/admin/index.ts added
types/admin-reservation-payment-review.ts added
docs/69-admin-reservation-payment-review.md added
docs/10-phases.md updated
docs/11-progress-log.md updated
```

Important decisions:

```text
The admin review page is read-only.
The admin review page shows recent direct reservations and their latest payment status.
The admin review page shows recent payments and safe Tilopay diagnostic summaries.
The admin review page shows recent Tilopay SDK client events for operational troubleshooting.
The admin review page does not include manual confirmation, cancellation, refund, date-change, calendar, or email actions.
Payment-driven reservation confirmation remains the only confirmation path.
No card number, CVV, expiration date, or tokenized card data is shown.
No Prisma schema change or migration is required in 9.7.
No Phase 10 emails are sent in 9.7.
No PMS behavior is added.
```

## Current Work

### Phase 9.8 — Automatic Preparation Buffers in Availability

Status: **Not started**

Goals:

```text
Make CONFIRMED reservations block their stay dates and preparation buffers.
Make active PENDING_PAYMENT reservations with expiresAt > now block their stay dates and preparation buffers temporarily.
Ensure EXPIRED reservations do not block stay dates or preparation buffers.
Use dynamic availability calculation first instead of materializing pending-payment buffers into calendar_blocks.
Keep admin buffer settings and manual unlock behavior for Phase 9.9.
```

Expected review checklist:

```text
- Apartamento Blanco y Negro uses the documented 1/1 buffer default.
- Bungalow Refugio Perfecto uses the documented 2/2 buffer default.
- Refugio Completo uses the documented 2/2 buffer default.
- Composed-listing dependency rules still apply.
- Expired pending holds do not affect public availability.
- No admin buffer configuration is added in 9.8.
```

## Next Recommended Work

```text
1. Implement 9.8 Automatic preparation buffers in availability.
2. Implement 9.9 Admin preparation buffer settings and manual unlock behavior.
3. Close Phase 9 with 9.10 documentation update and closure.
4. Start Phase 10 — Email Notifications.
```

## Continuity Notes for New Conversations

Minimum context files to review before continuing:

```text
README.md
AGENTS.md
.env.example
docs/10-phases.md
docs/11-progress-log.md
docs/32-availability-strategy-and-calendar-rules.md
docs/56-tilopay-sdk-v2-contract-for-trp-booking.md
docs/57-tilopay-redirect-consult-and-orderhash-validation.md
docs/58-confirm-reservation-after-validated-payment.md
docs/68-phase-9-admin-and-preparation-buffers-roadmap.md
docs/69-admin-reservation-payment-review.md
lib/payments/tilopay-payment-result.ts
lib/reservations/confirmation.ts
lib/availability/rules.ts
prisma/schema.prisma
```
