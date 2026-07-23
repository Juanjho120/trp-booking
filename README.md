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
- Receive bilingual reservation confirmation and scheduled arrival instructions by email.

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
- Transactional email logos must use a permanent HTTPS asset through `EMAIL_BRAND_LOGO_URL`; they must not depend on localhost or the current Vercel deployment.
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

Phase 10 is completed. The strategy and implementation roadmap are defined in `docs/85-email-notification-strategy-and-phase-10-roadmap.md`, and the authoritative closure record is `docs/94-phase-10-validation-and-documentation-closure.md`.

Planned subphases:

```text
10.1 Email notification strategy and environment contract — Completed
10.2 Persistence and Resend provider foundation — Completed
10.3 Bilingual branded reservation-confirmation templates — Completed
10.4 Guest and admin confirmation notification orchestration — Completed
10.5 Retry processing and admin delivery visibility — Completed
10.5.1 Manual resend and delivery recovery controls — Completed
10.6 Arrival instructions scheduling and content — Completed
10.7 Validation and documentation closure — Completed
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
- The approved primary brand logo uses the permanent public HTTPS asset configured in EMAIL_BRAND_LOGO_URL, independently from the application deployment URL.
- Guest templates do not expose protected admin links, provider payloads, card data, access codes, or PMS-only data.
- No EmailNotification row is created and no Resend provider call is made in 10.3.
- The accepted implementation was committed as 7f6510d3e152caccefa42d9a2f5f75dbf747a22e.
```

Phase 10.4 orchestration completed:

```text
- Guest and admin EmailNotification intents are inserted or reused inside the reservation-confirmation transaction.
- Stable reservation-confirmed/... and admin-new-reservation/... keys remain the permanent database and Resend idempotency keys.
- Repeated APPROVED payment callbacks reuse existing intents instead of creating duplicates.
- Immediate delivery starts only after the confirmation transaction commits.
- An atomic PENDING to PROCESSING claim prevents concurrent callbacks from sending the same intent twice.
- Disabled or unavailable email configuration leaves intents PENDING without affecting payment or reservation success.
- Test mode keeps the intended recipient in the database while the provider adapter redirects delivery to EMAIL_TEST_RECIPIENT.
- Provider and template failures become safe FAILED notification records while the approved payment and confirmed reservation remain unchanged.
- The accepted orchestration and its environment/logo follow-ups are recorded through commit 6f7bdc3c6027d6be8b4fcdfe027c57b01dfef50d.
- Retry scheduling, stale PROCESSING recovery, attempt limits, and read-only admin delivery visibility remain assigned to 10.5.
- Manual resend was excluded from the original roadmap and was later approved as subphase 10.5.1.
```

Phase 10.5 retry and visibility completed:

```text
- A CRON_SECRET-protected worker processes at most 20 due notifications every five minutes.
- Retryable failures use bounded backoff at 5 minutes, 15 minutes, 1 hour, and 6 hours.
- Delivery stops after 5 total attempts and stale PROCESSING claims are recovered after 10 minutes.
- Atomic claim tokens prevent an older stale worker from finalizing a row reclaimed by a newer worker.
- SENT and SKIPPED notifications are never retried.
- Reservation detail exposes safe read-only notification history, intended recipient, locale, attempts, schedule, provider ID, and normalized error diagnostics.
- No raw Resend payload, API key, sender credential, card data, schema migration, dependency, or PMS behavior was added.
- Local retry, stale-claim, maximum-attempt, concurrency, idempotency, admin-visibility, and payment/reservation isolation tests were accepted.
- Accepted commits: 1d3b02f6ae5fe37bd850a0ede0227e7173628aa1 and f77625f1d95095d7ebfd270007e1cbc54b667762.
- The implementation record is docs/91-email-retry-processing-and-admin-delivery-visibility.md.
```

Phase 10.5.1 manual resend and delivery recovery completed:

```text
- Authorized admins can request a new delivery from eligible PENDING, FAILED, or SENT confirmation notifications.
- Each manual request creates a separate EmailNotification with a new provider idempotency key, origin metadata, parent linkage, requesting admin, and audit log.
- The source delivery state remains intact and becomes ineligible for automatic claiming after a manual child exists, preventing duplicate automatic delivery.
- PROCESSING, SKIPPED, unsupported notification types, and notifications for non-confirmed reservations cannot be manually resent.
- A styled confirmation sheet distinguishes retry from sending another copy and warns when a prior SENT message may be duplicated.
- The new notification reuses the existing post-transaction delivery and bounded retry pipeline; payment and reservation state remain unchanged.
- Local recovery, duplicate-warning, request-idempotency, concurrency, audit, and payment/reservation isolation tests were accepted.
- Accepted commit: 355c72490d416a257b9827d31c67223a97200491.
- The implementation record is docs/92-manual-resend-and-delivery-recovery-controls.md.
```

Phase 10.6 arrival instructions scheduling and content completed:

```text
- Arrival settings are owned per accommodation in PostgreSQL and edited through a protected bilingual admin page.
- Each property can configure an enabled flag, a lead time from 1 through 168 hours, an exact address, an optional HTTPS map URL, and ES/EN instructions.
- The default lead time is 48 hours before the property's check-in time in America/Guatemala.
- Same-day confirmations become immediately eligible even when the configured check-in time has already passed; only reservations whose check-in date is before the current date in America/Guatemala are excluded.
- Confirmation creates the ARRIVAL_INSTRUCTIONS intent transactionally when the property is configured; a protected 30-minute scheduler backfills existing upcoming confirmed reservations.
- scheduledFor, a check-in-date snapshot, and the arrival-settings version make delivery auditable and allow stale notifications to be skipped after configuration or authorized date changes.
- The permanent deduplication key includes reservation, check-in date, settings version, and recipient.
- Delivery reuses the existing provider, idempotency, claim, bounded retry, test-recipient, and admin-history foundation.
- RESERVATION_CONFIRMED and ARRIVAL_INSTRUCTIONS render the accommodation's currently active assigned house rules in the guest's stored locale.
- Rotating access codes, lockbox codes, Wi-Fi passwords, and other secrets are explicitly prohibited from the stored instructions.
- No payment mutation, reservation confirmation change, dependency, environment variable, or PMS behavior is added.
- Accepted implementation and follow-up commits run from e75a50f6b7a929ff1e167c590284086c6259130b through 17be3fdf752a10932bae3f7192f55b16d80ac8e3.
- The implementation record is docs/93-arrival-instructions-scheduling-and-content.md.
```

Phase 10.7 validation and documentation closure completed:

```text
- The accepted Phase 10 architecture, implementation boundaries, local/test validation evidence, and operational handoff are consolidated.
- Reservation confirmation, admin notification, retry recovery, manual resend, arrival scheduling, same-day delivery, supersession, and house-rule rendering were validated without changing approved Payment or confirmed Reservation state.
- Production recipient delivery, Resend delivery/bounce/complaint webhooks, and production-domain operational acceptance remain deferred to Phase 12 Production Readiness.
- Phase 11 Cancellation, Refund, and Change Request Rules is the next official phase and must begin by defining explicit subphases and business contracts.
- The authoritative closure record is docs/94-phase-10-validation-and-documentation-closure.md.
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
docs/90-transactional-email-brand-logo-hosting.md
docs/91-email-retry-processing-and-admin-delivery-visibility.md
docs/92-manual-resend-and-delivery-recovery-controls.md
docs/93-arrival-instructions-scheduling-and-content.md
docs/94-phase-10-validation-and-documentation-closure.md
```

## Development Status

```text
Current phase: Phase 11 — Cancellation, Refund, and Change Request Rules
Current subphase: Phase 11 planning — Not started
Current focus: define explicit Phase 11 subphases and business contracts before implementing cancellation, refund, authorized date-change, or stay-extension workflows
Last completed phase: Phase 10 — Email Notifications
Phase 10 closure base commit: 17be3fdf752a10932bae3f7192f55b16d80ac8e3
Phase 10 closure document: docs/94-phase-10-validation-and-documentation-closure.md
```
