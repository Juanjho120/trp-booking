# 11 — Progress Log

This document is the official progress tracker for TRP Booking. Update it whenever a phase or subphase changes status.

## Current Status

```text
Current phase: Phase 9 — Tilopay Sandbox Integration
Current subphase: 9.9 Admin preparation buffer settings and manual unlock behavior
Last updated: 2026-07-15
Last completed phase: Phase 8 — Reservation Flow
Last completed subphase: 9.8 Automatic preparation buffers in availability
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
types/reservation-confirmation.ts added
lib/payments/tilopay-payment-result.ts updated
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
Only an active PENDING_PAYMENT reservation can become CONFIRMED after a validated APPROVED payment.
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
features/admin/index.ts updated
lib/admin/reservation-payment-review.ts added
lib/admin/index.ts added
types/admin-reservation-payment-review.ts added
messages/es.ts updated
messages/en.ts updated
docs/69-admin-reservation-payment-review.md added
docs/10-phases.md updated
docs/11-progress-log.md updated
AGENTS.md updated with ZIP Delivery Gate
```

Important decisions:

```text
The admin review page is read-only.
The admin review page shows recent direct reservations and their latest payment status.
The admin review page shows recent payments and safe Tilopay diagnostic summaries.
The admin review page shows recent Tilopay SDK client events for operational troubleshooting.
Admin review copy is centralized in messages/es.ts and messages/en.ts.
Reservation and payment statuses shown in admin are localized.
The admin dashboard uses the shared LocaleSwitcher and useLocale so ES/EN copy changes in place.
The admin review page does not include manual confirmation, cancellation, refund, date-change, calendar, or email actions.
Payment-driven reservation confirmation remains the only confirmation path.
No card number, CVV, expiration date, or tokenized card data is shown.
No Prisma schema change or migration is required in 9.7.
No Phase 10 emails are sent in 9.7.
No PMS behavior is added.
```

### Phase 9.8 — Automatic Preparation Buffers in Availability

Status: **Completed**

Completed deliverables:

```text
lib/availability/service.ts updated
lib/airbnb-ical/export-feed.ts updated
docs/70-automatic-preparation-buffers-in-availability.md added
docs/35-preparation-buffer-and-blocked-date-evaluation.md updated
docs/68-phase-9-admin-and-preparation-buffers-roadmap.md updated
docs/10-phases.md updated
docs/11-progress-log.md updated
README.md updated
```

Important decisions:

```text
CONFIRMED reservations dynamically block their stay and preparation-buffer ranges.
PENDING_PAYMENT reservations dynamically block their stay and preparation-buffer ranges only when expiresAt > now.
PENDING_PAYMENT rows with expiresAt = null are not treated as active holds.
EXPIRED reservations and expired pending holds do not block stay or buffer ranges.
Preparation buffer values are read from Property.preparationDaysBefore and Property.preparationDaysAfter.
The documented composed-listing dependency rules continue to apply.
Direct-reservation buffers are calculated dynamically in 9.8 and are not materialized into calendar_blocks.
Pending holds remain excluded from Airbnb iCal export because they are short-lived payment holds.
Confirmed reservation buffers remain included in Airbnb iCal export, including export-window boundary cases.
No Prisma schema change, migration, visible copy, admin configuration, new manual unlock behavior, email, or PMS behavior was added.
```

## Current Work

### Phase 9.9 — Admin Preparation Buffer Settings and Manual Unlock Behavior

Status: **In progress**

Goals:

```text
Decide and document whether confirmed direct-reservation buffers are materialized calendar_blocks or dynamic buffers with auditable override records.
Add protected admin configuration for daysBefore/daysAfter per accommodation.
Allow admin to unlock only preparation-buffer ranges without releasing the reservation stay.
Preserve auditability and composed-listing behavior.
Do not add guest date modification, email delivery, or PMS behavior.
```

Expected review checklist:

```text
- Existing defaults remain 1/1, 2/2, and 2/2 unless admin changes them.
- Manual unlock does not release the reservation stay.
- Unlock records remain auditable.
- Public availability and iCal exports reflect the same effective buffer rules.
- Admin-facing copy is centralized and localized.
```

## Next Recommended Work

```text
1. Implement 9.9 Admin preparation buffer settings and manual unlock behavior.
2. Close Phase 9 with 9.10 documentation update and closure.
3. Start Phase 10 — Email Notifications.
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
docs/35-preparation-buffer-and-blocked-date-evaluation.md
docs/68-phase-9-admin-and-preparation-buffers-roadmap.md
docs/69-admin-reservation-payment-review.md
docs/70-automatic-preparation-buffers-in-availability.md
lib/availability/rules.ts
lib/availability/service.ts
lib/airbnb-ical/export-feed.ts
lib/reservations/confirmation.ts
prisma/schema.prisma
```
