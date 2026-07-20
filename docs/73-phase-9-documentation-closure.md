# 73 — Phase 9 Documentation Closure

## Closure Record

```text
Phase: Phase 9 — Tilopay Sandbox Integration
Status: Completed
Closure date: 2026-07-17
Implementation base commit: 497ae635c69c6267c383ecd134847b64ab7caacf
Next phase: Phase 10 — Email Notifications
```

## Purpose

This document closes Phase 9 and provides the authoritative handoff from the completed payment/admin/availability foundation to Phase 10 email notifications.

Phase 9.10 is documentation-only. It adds no application code, Prisma migration, provider credential, visible application copy, or PMS behavior.

## Completed Phase 9 Scope

```text
9.1 Tilopay sandbox strategy and environment contract
9.2 Tilopay environment validation
9.3 Payment record creation for pending reservations
9.4 Tilopay SDK V2 checkout foundation
9.5 Tilopay redirect, consult, and OrderHash V2 validation
9.6 Payment-driven reservation confirmation
9.6.1 Sandbox hardening, retry behavior, status localization, and checkout UX
9.7 Admin reservation/payment operational visibility
9.8 Automatic preparation buffers
9.9 Admin preparation settings and auditable overrides
9.9.1 Scalable admin navigation and property calendar operations
9.10 Documentation update and closure
```

## Final Payment Contract

```text
- Tilopay credentials and login/consult operations remain server-side.
- Payment.providerReference stores the unique orderNumber.
- Public redirect data is not trusted without server-side consult/hash validation.
- Payment can become APPROVED, REJECTED, or FAILED.
- Reservation confirmation is idempotent and occurs only for a validated APPROVED payment.
- Rejected and failed payments do not confirm reservations.
- Card number, CVV, expiration date, and tokenized card data are never stored or exposed.
- Raw provider errors are not shown to guests.
```

## Final Checkout and Retry UX

```text
- The normal pending-reservation flow and retry page reuse TilopaySdkCheckout.
- The visible payment-method control uses the shared Radix selector.
- The SDK-required tlpy_payment_method native field remains hidden and synchronized.
- Unsupported or empty technical values do not clear a valid visible selection.
- The normal checkout is isolated from the reservation quote form.
- Visa, Mastercard, and American Express acceptance indicators appear below the card-number input.
- Dynamic card-brand detection inside the input remains driven by Tilopay.getCardType().
```

## Final Availability and Preparation Contract

```text
- CONFIRMED reservations block stay dates and dynamic preparation buffers.
- Active PENDING_PAYMENT holds block stay dates and buffers only while expiresAt > now.
- Expired holds, EXPIRED reservations, and PENDING_PAYMENT rows without expiresAt do not block.
- Preparation settings come from Property.preparationDaysBefore/After.
- Composed-listing dependencies apply to stay and buffer ranges.
- One-day admin unlocks persist only the exception, not the full direct buffer.
- Overrides match their source relation and cannot suppress unrelated buffers.
- Reservation stay dates are never released by a preparation override.
```

## Final Admin Contract

```text
/admin                 Compact dashboard
/admin/reservations    Search, filters, pagination
/admin/payments        Payment and SDK-event operational views
/admin/calendar        Effective occupancy and date operations
/admin/accommodations  Preparation settings
```

Admin behavior:

```text
- Shared protected layout and responsive sidebar
- Optimistic active state and route loading skeleton
- Radix design-system selectors
- Auto-dismissing success snackbars
- Persistent inline operational errors
- Manual blocks only on fully available future ranges
- Server-side availability revalidation before manual-block persistence
- Auditable soft-delete release and range splitting
- Preparation-buffer unlock and restore
- Read-only reservation stays, active holds, Airbnb bookings, and inherited records where appropriate
```

## Security and Scope Boundaries Preserved

```text
No card-data storage
No client-side provider secrets
No manual reservation confirmation
No refund workflow
No guest self-service date changes
No Phase 10 email delivery
No hard deletion of operational history
No PMS expansion
```

## Validation Acceptance

The Phase 9.9.1 implementation was reported working and committed before closure.

Accepted areas include:

```text
- Local build
- Normal Tilopay payment form
- Retry payment form
- Radix payment/admin selectors
- Hidden Tilopay technical selector synchronization
- Accepted-card indicators
- Admin navigation and filtering
- Property calendar manual blocks
- Manual release
- Preparation-buffer unlock and restore
- Composed-listing behavior
- Admin snackbars
```

## Deferred Production-Readiness Item

The availability and export calculations are implemented consistently, but the real Airbnb iCal operational end-to-end test is deferred.

It requires:

```text
- Secure operational external_calendars rows
- Real Airbnb import URLs
- Secure export tokens
- Import/export scheduling and monitoring
- Verification against real Airbnb calendars
```

No real URLs, tokens, or credentials may be committed to the repository or documentation.

## Phase 10 Handoff

Phase 10 must start by defining explicit subphases before implementation.

Recommended first planning scope:

```text
- Resend provider and environment contract
- Bilingual email-template architecture
- Reservation confirmation email trigger
- Minimum admin notification trigger
- Idempotency and duplicate-send prevention
- Delivery attempt auditability
- Safe provider failure and retry behavior
- Arrival instruction timing and content ownership
```

Phase 10 must preserve these rules:

```text
- Email delivery never determines payment approval.
- Email failure never rolls back a valid confirmed reservation.
- Only validated payment can confirm a reservation.
- Provider errors shown to users must remain safe and localized.
- Email content belongs in centralized bilingual message/template sources.
- No PMS behavior is introduced.
```

## Files Updated by Phase 9.10

```text
README.md
docs/10-phases.md
docs/11-progress-log.md
docs/68-phase-9-admin-and-preparation-buffers-roadmap.md
docs/72-admin-navigation-and-property-calendar-operations.md
docs/73-phase-9-documentation-closure.md
```
