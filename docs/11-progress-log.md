# 11 — Progress Log

This document is the official progress tracker for TRP Booking. Update it whenever a phase or subphase changes status.

## Current Status

```text
Current phase: Phase 10 — Email Notifications
Current focus: Phase 10 planning has not started; define the notification strategy and first implementation subphase before coding
Last updated: 2026-07-17
Last completed phase: Phase 9 — Tilopay Sandbox Integration
Last completed subphase: 9.10 Phase 9 documentation update and closure
Phase 9 closure base commit: 497ae635c69c6267c383ecd134847b64ab7caacf
```

## Completed Work

### Phase 9.4 — Tilopay SDK V2 Checkout Foundation

Status: **Completed**

Important decisions:

```text
TRP Booking uses Tilopay SDK V2 as the preferred checkout foundation.
The guest remains inside the TRP Booking experience for the main payment flow.
The backend calls the Tilopay SDK login endpoint server-side.
The frontend receives only a safe SDK access token and initialization configuration.
Payment.providerReference stores the unique orderNumber sent to Tilopay.
TRP Booking does not read, store, log, or send card number, CVV, expiration, or card tokens to its backend.
No regular-payment webhook is assumed for the current non-recurrent hosted payment flow.
```

### Phase 9.5 — Tilopay Redirect, Consult, and OrderHash V2 Validation Foundation

Status: **Completed**

Important decisions:

```text
The redirect route resolves Payment through providerReference/orderNumber.
Tilopay consult runs server-side.
OrderHash V2 is validated with HMAC-SHA256.
Payment.status can become APPROVED, REJECTED, or FAILED.
Redirect query parameters alone are not treated as final payment truth.
```

### Phase 9.6 — Confirm Reservation Only After Validated Payment

Status: **Completed**

Important decisions:

```text
Reservation confirmation is payment-driven.
Only APPROVED payments can confirm an active PENDING_PAYMENT reservation.
The confirmation service is idempotent.
Reservation.confirmedAt is set and Reservation.expiresAt is cleared.
Rejected and failed payments never confirm reservations.
```

### Phase 9.6.1 — Tilopay Sandbox Hardening, Retryable Payment Errors, Status Localization, and Checkout UX

Status: **Completed**

Completed behavior:

```text
Strict Tilopay OrderHash validation was hardened.
Tilopay preflight validation was added before starting payment.
Expired reservation confirmations were prevented.
Tilopay SDK client failures are tracked using safe operational diagnostics.
Retryable payment errors map to guest-friendly bilingual messages.
The retry page reuses the shared checkout.
Payment and reservation statuses are localized and shown separately.
The reservation flow guides the guest to the relevant quote, pending reservation, payment, or error area.
Raw provider descriptions and card data remain hidden.
```

### Phase 9.7 — Admin Reservation and Payment Review

Status: **Completed**

Completed behavior:

```text
Protected admin visibility exists for direct reservations, payments, and safe Tilopay SDK diagnostics.
Admin copy and visible statuses are centralized in messages/es.ts and messages/en.ts.
The admin never exposes card number, CVV, expiration date, or tokenized card data.
Payment-driven confirmation remains the only confirmation path.
No manual confirmation, cancellation, refund, date-change, email, or PMS action was introduced.
```

### Phase 9.8 — Automatic Preparation Buffers in Availability

Status: **Completed**

Completed behavior:

```text
CONFIRMED reservations dynamically block stay dates and preparation-buffer ranges.
Active PENDING_PAYMENT reservations block stay dates and buffers only while expiresAt > now.
PENDING_PAYMENT rows with expiresAt = null are not active holds.
EXPIRED reservations and expired pending holds do not block availability.
Buffer values come from Property.preparationDaysBefore and Property.preparationDaysAfter.
Composed-listing dependency rules apply to stay and buffer ranges.
Pending holds remain excluded from Airbnb iCal export.
Confirmed buffers remain part of future iCal export calculations.
```

### Phase 9.9 — Admin Preparation Buffer Settings and Manual Unlock Behavior

Status: **Completed**

Completed behavior:

```text
Option B was selected: dynamic direct-reservation buffers plus auditable override records.
Preparation settings are editable from 0 through 30 days before/after.
A one-day PREPARATION_BUFFER CalendarBlock records each admin unlock.
Overrides are linked to their source relation and retain admin, timestamp, and optional note.
Availability and iCal export subtract only matching override ranges.
Reservation stay dates remain blocked.
Property changes, unlocks, and restores preserve AdminAuditLog history.
The real iCal operational E2E test remains deferred until secure external-calendar configuration exists.
```

### Phase 9.9.1 — Admin Navigation and Property Calendar Operations

Status: **Completed**

Completed behavior:

```text
app/admin/layout.tsx provides the shared protected shell.
The admin dashboard remains compact.
Reservations and payments use dedicated searchable, filterable, paginated routes.
Visible admin and Tilopay selectors use the shared Radix design-system component.
The hidden SDK-required tlpy_payment_method field remains synchronized with the visible selector.
The normal pending-reservation checkout and retry checkout share the same component.
The checkout displays Visa, Mastercard, and American Express acceptance indicators.
Accommodation preparation settings use a dedicated route.
The property calendar supports one selected accommodation, month navigation, search, effective blockers, composed-listing inheritance, manual block creation/release, and preparation-buffer unlock/restore.
Manual blocks are accepted only on fully available future dates and are revalidated server-side.
Manual blocks and preparation overrides preserve audit history through soft deletion and AdminAuditLog.
Successful admin mutations use auto-dismissing snackbars; errors remain persistent inline.
No Prisma migration, email delivery, guest date change, manual confirmation, refund action, or PMS behavior was added.
```

Validation acceptance recorded for closure:

```text
The implementation was reported working and committed after local build and manual verification.
Normal Tilopay checkout, retry checkout, Radix filters/selectors, calendar operations, snackbars, and accepted-card indicators were accepted before 9.10 closure.
```

### Phase 9.10 — Phase 9 Documentation Update and Closure

Status: **Completed**

Completed deliverables:

```text
README.md updated
docs/10-phases.md updated
docs/11-progress-log.md updated
docs/68-phase-9-admin-and-preparation-buffers-roadmap.md updated
docs/72-admin-navigation-and-property-calendar-operations.md updated
docs/73-phase-9-documentation-closure.md added
```

Closure decisions:

```text
Phase 9 is completed.
Phase 10 — Email Notifications is the next phase.
No production credentials, real Airbnb URLs, export tokens, card data, or provider secrets were added to documentation.
Real Airbnb iCal operational configuration and E2E validation remain deferred to production-readiness work.
```

## Current Work

### Phase 10 — Email Notifications

Status: **Not started**

Next planning scope:

```text
Define the first Phase 10 subphase before implementation.
Document the Resend provider/environment contract.
Define bilingual reservation and admin notification templates.
Define idempotency and duplicate-send prevention.
Define delivery audit records and safe provider failure handling.
Preserve payment-driven reservation confirmation.
```

## Next Recommended Work

```text
1. Define the Phase 10 notification architecture and subphase sequence.
2. Implement server-side Resend environment validation and provider abstraction.
3. Add idempotent bilingual reservation-confirmation email delivery.
4. Add the minimum admin notification required for a confirmed direct reservation.
5. Keep arrival instructions and later lifecycle emails explicitly scoped and documented.
6. Complete operational Airbnb iCal setup/E2E during production-readiness work when secure configuration exists.
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
docs/58-confirm-reservation-after-validated-payment.md
docs/68-phase-9-admin-and-preparation-buffers-roadmap.md
docs/69-admin-reservation-payment-review.md
docs/70-automatic-preparation-buffers-in-availability.md
docs/71-admin-preparation-buffer-settings-and-overrides.md
docs/72-admin-navigation-and-property-calendar-operations.md
docs/73-phase-9-documentation-closure.md
lib/reservations/confirmation.ts
lib/payments/tilopay-payment-result.ts
lib/availability/rules.ts
lib/availability/service.ts
lib/airbnb-ical/export-feed.ts
lib/airbnb-ical/sync-service.ts
prisma/schema.prisma
```
