# TRP Booking

TRP Booking is the technical name for the direct booking website of Tu Refugio Perfecto, a lodging business in Panajachel, Guatemala.

The public brand of the project is:

```text
Tu Refugio Perfecto
Bungalows Tu Refugio Perfecto
```

The official production domain is:

```text
turefugioperfecto.com
```

The stable test deployment is:

```text
trp-booking.juantzun.dev
```

## Environment Strategy

TRP Booking separates the business/runtime environment from the deployment platform environment:

```text
TRP_ENVIRONMENT=local
- Application URL: http://localhost:3000
- Tilopay: sandbox
- Email: disabled or test
- Resend account: personal test account
- Verified sending domain: mail.trp-booking.juantzun.dev

TRP_ENVIRONMENT=test
- Application URL: https://trp-booking.juantzun.dev
- Tilopay: sandbox
- Email: disabled or test
- Resend account: personal test account
- Verified sending domain: mail.trp-booking.juantzun.dev

TRP_ENVIRONMENT=production
- Application URL: https://turefugioperfecto.com
- Tilopay: production
- Email: disabled or production
- Resend account: Tu Refugio Perfecto company account
- Verified sending domain: mail.turefugioperfecto.com
```

`VERCEL_ENV` remains deployment metadata and must not be used as the only signal for the TRP business environment. The stable test site may use a Vercel production deployment while remaining `TRP_ENVIRONMENT=test`.

Detailed environment, domain, Resend-account, and Cloudflare DNS rules are documented in `docs/89-test-and-production-environment-strategy.md`.

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
- `TRP_ENVIRONMENT` is the source of truth for local, test, and production business/runtime behavior.
- Local/test credentials, domains, databases, payment settings, and recipient routing must remain isolated from production.
- The personal Resend account and `mail.trp-booking.juantzun.dev` are test-only; production will use a company-owned Resend account and `mail.turefugioperfecto.com`.
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
- Email delivery never determines payment approval and an email failure never rolls back a valid confirmed reservation.
- Transactional email intents must use permanent database deduplication in addition to provider idempotency.
- Test email delivery preserves the intended recipient in persistence but sends only to `EMAIL_TEST_RECIPIENT`.
- Public-facing, admin-facing, and transactional email copy is centralized in `messages/es.ts` and `messages/en.ts`.
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
- Successful and failed admin mutations shown through accessible auto-dismissing snackbars with distinct variants and manual dismissal.
- No Phase 10 emails, guest date changes, manual reservation confirmation, refund workflow, or PMS behavior.
```

The real Airbnb iCal operational end-to-end test remains deferred until secure `external_calendars` configuration, real import URLs, and export tokens are available.

## Phase 9.11 — Admin MVP and Brand Identity Completion

Phase 9.11 is completed.

Completed subphases:

```text
9.11.1-A Production raster assets
9.11.1-B Reusable brand components
9.11.1-C Application and metadata integration
9.11.1-D Responsive QA and documentation closure
9.11.2 Accommodation content management
9.11.3 Property photo management
9.11.4 Amenities and house rules
9.11.5 Reservation and payment detail views
9.11.6 Validation and documentation closure
```

Final Phase 9.11 capabilities:

```text
- Approved BrandLogo and BrandMark components across public, admin, Auth.js, favicon, application-icon, and social metadata surfaces.
- Responsive brand behavior for narrow footers, the compact mobile admin header, and short sign-in viewports.
- Protected bilingual accommodation content editing with validation, optimistic concurrency, and audit history.
- Cloudinary-backed property photo upload, bilingual alt text, ordering, cover selection, local preview, and soft deletion.
- Shared bilingual amenity and house-rule catalog lifecycle management separated from property-specific assignments.
- Styled check-in/check-out selectors and typed static/dynamic amenity ordering.
- Protected read-only reservation and payment details with safe diagnostics and cross-navigation.
- Existing reservation and payment list routes preserved alongside their dynamic detail routes.
- No manual reservation confirmation, cancellation, refund, guest date change, stay extension, payment override, email delivery, or PMS expansion.
```

Phase 9.11 closure is documented in `docs/84-phase-9.11-validation-and-documentation-closure.md`.

## Phase 10 — Email Notifications

Phase 10 is in progress. The strategy and explicit subphase roadmap are defined in `docs/85-email-notification-strategy-and-phase-10-roadmap.md`.

Planned subphases:

```text
10.1 Email notification strategy and environment contract — Completed
10.2 Persistence and Resend provider foundation — Completed
10.3 Bilingual branded reservation-confirmation templates — Completed
10.4 Guest and admin confirmation notification orchestration — In progress
10.5 Retry processing and admin delivery visibility — Not started
10.6 Arrival instructions scheduling and content — Not started
10.7 Validation and documentation closure — Not started
```

Initial Phase 10 scope:

```text
- Guest reservation-confirmation email after validated payment confirms the reservation.
- Minimum admin notification for a newly confirmed direct reservation.
- Bilingual ES/EN templates using the approved brand system.
- Permanent database deduplication plus Resend idempotency keys.
- Safe delivery-attempt history and bounded retry processing.
- Arrival instructions only after timing and content ownership are explicitly approved.
- No separate PAYMENT_APPROVED email and no automatic failed/rejected-payment email in the initial MVP.
- No cancellation, refund, date-change, stay-extension, or PMS behavior.
```

Phase 10.2 foundation completed:

```text
- Reservation.preferredLocale persists the existing ES/EN booking preference with a safe default for historical rows.
- EmailNotification gains permanent deduplication, PROCESSING state, retry timestamps, attempt count, and safe error-code storage.
- Existing notification rows are backfilled with unique legacy keys before the uniqueness constraint is enforced.
- Resend 6.17.2 is isolated behind a typed server-side provider adapter.
- Email environment validation supports disabled, test-recipient override, and production modes.
- TRP_ENVIRONMENT now separates business environment rules from Vercel deployment metadata.
- Test and production Resend accounts, public domains, and verified sending domains remain isolated.
- Provider errors are normalized into bounded internal codes without persisting raw Resend responses.
- No templates, notification intents, confirmation hooks, cron worker, admin email UI, or actual email delivery are introduced yet.
```

Phase 10.3 templates completed:

```text
- Centralized transactional-email copy is added under the emails namespace in messages/es.ts and messages/en.ts.
- Shared React email primitives render email-safe table markup and inline styles.
- Guest RESERVATION_CONFIRMED and admin ADMIN_NEW_RESERVATION builders return subject, HTML, and plain-text content.
- Template inputs are validated and normalized before rendering, and guest output must match the reservation preferred locale.
- Dates, Guatemala business timestamps, money, guest counts, stay length, arrival time, and country names are locale-aware.
- The approved primary brand logo is resolved as an absolute URL from EMAIL_PUBLIC_BASE_URL.
- Guest templates do not expose protected admin links, provider payloads, card data, access codes, or PMS-only data.
- No EmailNotification row is created and no Resend provider call is made in 10.3.
- The accepted implementation was committed as 7f6510d3e152caccefa42d9a2f5f75dbf747a22e.
```

Phase 10.4 orchestration prepared:

```text
- Guest and admin EmailNotification intents are inserted or reused inside the reservation-confirmation transaction.
- Stable reservation-confirmed/... and admin-new-reservation/... keys remain the permanent database and Resend idempotency keys.
- Repeated APPROVED payment callbacks reuse existing intents instead of creating duplicates.
- Immediate delivery starts only after the confirmation transaction commits.
- An atomic PENDING to PROCESSING claim prevents concurrent callbacks from sending the same intent twice.
- Disabled or unavailable email configuration leaves intents PENDING without affecting payment or reservation success.
- Test mode keeps the intended recipient in the database while the provider adapter redirects delivery to EMAIL_TEST_RECIPIENT.
- Provider and template failures become safe FAILED notification records while the approved payment and confirmed reservation remain unchanged.
- Retry scheduling, stale PROCESSING recovery, attempt limits, admin delivery visibility, and manual resend remain assigned to 10.5.
```

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
docs/74-brand-identity-refresh.md
docs/75-reusable-brand-components.md
docs/76-brand-application-and-metadata-integration.md
docs/77-responsive-brand-qa-and-closure.md
docs/78-accommodation-content-management.md
docs/79-property-photo-management.md
docs/80-amenities-and-house-rules.md
docs/81-phase-9.11.4-ui-follow-up.md
docs/82-catalog-lifecycle-and-photo-selection.md
docs/83-reservation-and-payment-detail-views.md
docs/84-phase-9.11-validation-and-documentation-closure.md
docs/85-email-notification-strategy-and-phase-10-roadmap.md
docs/86-email-persistence-and-resend-provider-foundation.md
docs/87-bilingual-branded-reservation-confirmation-templates.md
docs/88-guest-admin-confirmation-notification-orchestration.md
docs/89-test-and-production-environment-strategy.md
```

## Development Status

```text
Current phase: Phase 10 — Email Notifications
Current subphase: 10.4 Guest and admin confirmation notification orchestration — In progress
Current focus: validate transactional intent creation, post-commit best-effort delivery, duplicate-send prevention, and isolated local/test/production provider configuration
Last completed subphase: 10.3 Bilingual branded reservation-confirmation templates
10.3 accepted commit: 7f6510d3e152caccefa42d9a2f5f75dbf747a22e
```
