# 11 — Progress Log

This document is the official progress tracker for TRP Booking. Update it whenever a phase or subphase changes status.

## Current Status

```text
Current phase: Phase 9.11 — Admin MVP and Brand Identity Completion
Current subphase: 9.11.2 Accommodation content management
Current focus: define the minimum admin-managed accommodation content contract before implementation
Last updated: 2026-07-20
Last completed subphase: 9.11.1-D Responsive QA and documentation closure
9.11.1-D base commit: cf9154f290c9635c61371b5ce83cf9a7e9a2966e
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

### Phase 9.11.1-C — Application and Metadata Integration

Status: **Completed**

Accepted implementation:

```text
Public header uses BrandMark instead of the temporary TRP block.
Public footer uses BrandLogo.
Desktop and mobile admin navigation use BrandMark.
Custom branded /admin-login page uses BrandLogo.
Auth.js uses /admin-login as its custom sign-in page.
Admin callback destinations are reduced to safe local /admin paths.
Root metadata uses approved favicon, Apple touch, Open Graph, and Twitter assets.
Next.js app/favicon.ico, app/icon.png, and app/apple-icon.png use the approved mark without text.
Bilingual admin sign-in copy remains centralized in messages/es.ts and messages/en.ts.
The public brand name replaces the internal technical name in visible brand surfaces.
```

Acceptance:

```text
The application and metadata integration was reported functioning and committed.
Integration commit: 8ac8291db2296f2c977f5e6667150a7ea0b8f9a8
Visible-name follow-up commit: cf9154f290c9635c61371b5ce83cf9a7e9a2966e
```

### Phase 9.11.1-D — Responsive QA and Documentation Closure

Status: **Completed**

Responsive closure:

```text
Long reservation and admin email addresses can wrap inside the public footer on narrow screens.
The mobile admin top bar hides redundant adjacent brand text below the sm breakpoint while preserving the menu, mark, and locale selector.
The locale selector remains non-shrinking in the compact admin header.
The branded /admin-login page allows vertical scrolling and starts below the fixed locale selector on small screens.
BrandLogo and BrandMark continue to preserve their approved aspect ratios.
Favicon-scale contexts continue to use only the mark without text.
No visible copy, dependency, Auth.js policy, database schema, or provider integration changed.
```

Documentation closure:

```text
README.md updated.
docs/10-phases.md updated.
docs/11-progress-log.md updated.
docs/74-brand-identity-refresh.md updated.
docs/75-reusable-brand-components.md updated.
docs/76-brand-application-and-metadata-integration.md updated.
docs/77-responsive-brand-qa-and-closure.md added.
public/brand/brand-manifest.json updated to Phase 9.11.1-D.
```

## Current Work

### Phase 9.11.2 — Accommodation Content Management

Status: **Not started**

Planning scope:

```text
Define which accommodation fields the admin may edit.
Preserve bilingual public content requirements.
Keep availability, pricing, booking, and PMS responsibilities separated.
Define validation, audit, and soft-delete behavior before implementation.
Do not start photo, amenity, rule, email, or refund work inside this subphase.
```

## Next Recommended Work

```text
1. Apply and validate Phase 9.11.1-D.
2. Confirm public footer contact wrapping at 320px and 375px widths.
3. Confirm the admin top bar keeps menu, mark, and ES/EN controls visible at mobile widths.
4. Confirm /admin-login scrolls on a short mobile viewport.
5. Run npm run env:validate, npm run db:validate, npm run lint, and npm run build.
6. Commit Phase 9.11.1-D.
7. Define the exact 9.11.2 accommodation content management contract before coding.
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
docs/74-brand-identity-refresh.md
docs/75-reusable-brand-components.md
docs/76-brand-application-and-metadata-integration.md
docs/77-responsive-brand-qa-and-closure.md
components/brand/
components/layout/site-header.tsx
components/layout/site-footer.tsx
features/admin/components/admin-shell.tsx
features/auth/components/admin-sign-in-page.tsx
app/admin-login/page.tsx
app/layout.tsx
lib/reservations/confirmation.ts
lib/payments/tilopay-payment-result.ts
lib/availability/rules.ts
lib/availability/service.ts
lib/airbnb-ical/export-feed.ts
lib/airbnb-ical/sync-service.ts
prisma/schema.prisma
```
