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

The stable test domain is:

```text
trp-booking.juantzun.dev
```

As of 2026-08-14, Phase 12 — Test Deployment & External Integration Validation — is completed and accepted. The stable HTTPS Test deployment at `trp-booking.juantzun.dev` remains `TRP_ENVIRONMENT=test` on the developer-owned stack with zero Vercel scheduler registrations. The Post-Phase-12 / Pre-Phase-13 Final Improvement Track is active: Final-A — reservation financial correctness and effective stay value — is completed and accepted, including the 44/44 integrated regression gate; Final-B — admin external-calendar integrations — is now in progress at Final-B.1, whose external-calendar admin strategy and security contract is documented in `docs/167-final-b-1-external-calendar-admin-strategy-and-security-contract.md`. Final-B implementation starts from the latest working head `0927feb18be35b8d96aca0205a75ee19445f15d4`; the historical Final-A accepted head remains unchanged. Phase 13 — Production Infrastructure, Deployment & Go-Live — remains **Not started** until Final-H closes and the owner explicitly accepts the improvement track.

## Environment Strategy

TRP Booking separates the business/runtime environment from the deployment platform environment:

```text
TRP_ENVIRONMENT=local
- Application URL: http://localhost:3000
- Database: developer-owned Supabase database used by the portfolio project
- Tilopay: existing sandbox account
- Email: disabled or test
- Resend: existing personal test account / mail.trp-booking.juantzun.dev
- Zoho: existing juantzun.dev organization and aliases
- Cloudinary: existing personal account
- Guest email physical delivery: EMAIL_TEST_RECIPIENT when email is enabled
- Admin email delivery: intended juantzun.dev admin recipient
- Subject prefix: [LOCAL]

TRP_ENVIRONMENT=test
- Application URL: https://trp-booking.juantzun.dev
- Deployment status: Vercel Test deployment and stable custom domain `trp-booking.juantzun.dev` are operational; Google OAuth hosted validation passed in 12.4
- Database: same developer-owned Supabase database used by Local
- Tilopay: same sandbox account used by Local
- Resend: same personal account and sending domain used by Local
- Zoho: same juantzun.dev organization and aliases used by Local
- Cloudinary: same personal account used by Local
- CRON_SECRET: unique Test secret, different from Local and future Production
- Airbnb: real inbound iCal URLs plus three private TRP Test outbound `.ics` feeds connected to the matching real listings; the controlled bidirectional round-trip was accepted in 12.6
- Guest email delivery: intended reservation recipient
- Admin email delivery: intended juantzun.dev admin recipient
- EMAIL_TEST_RECIPIENT: empty
- Subject prefix: [TEST]

TRP_ENVIRONMENT=production
- Application URL: https://turefugioperfecto.com
- Phase: Phase 13 only
- Vercel: new company-owned account/project
- Database: new company-owned Supabase account/project
- Tilopay: new company-owned production account/credentials
- Resend: new company-owned account and mail.turefugioperfecto.com sending domain
- Zoho: new company-owned organization for turefugioperfecto.com correspondence
- Cloudinary: new company-owned account
- Admin OAuth: company Gmail/Google identity
- CRON_SECRET: unique Production secret
- Guest/admin delivery: intended production recipients
- EMAIL_TEST_RECIPIENT: empty
- Subject prefix: none
```

`VERCEL_ENV` remains deployment metadata and must not be used as the only signal for the TRP business environment. The accepted Test site uses the stable domain while remaining `TRP_ENVIRONMENT=test`; a Vercel production deployment target does not make it the TRP Production environment. A documented target URL must never be treated as proof of deployment without explicit validation.

Detailed environment ownership, domain, provider-reuse, recipient-routing, and Phase 12/13 separation rules are documented in `docs/89-test-and-production-environment-strategy.md` and `docs/136-phase-12.1-test-deployment-and-environment-strategy.md`.

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
- TRP outbound iCal must not echo provider-origin Airbnb blocks or provider-derived Airbnb preparation artifacts back to Airbnb; Phase 12.6 validated this ownership boundary through a real controlled round-trip and recovery test.
- TRP outbound iCal VEVENT UIDs are deterministic and stable across feed ordering changes; the accepted permanent UID namespace is `turefugioperfecto.com`.
- `TRP_ENVIRONMENT` is the source of truth for local, test, and production business/runtime behavior.
- Local/test credentials, domains, databases, payment settings, and recipient routing must remain isolated from production.
- Local and Test intentionally reuse the developer-owned Supabase, Resend, Zoho, Cloudinary, and Tilopay sandbox infrastructure; Production must use separate company-owned accounts provisioned in Phase 13.
- Reservation flow must re-check availability server-side before creating pending holds or handing off to payment.
- Pending reservation holds must use `PENDING_PAYMENT` with a non-null `expiresAt` and must never be confirmed before validated payment.
- `CONFIRMED` reservations block their stay dates and preparation buffers.
- Active `PENDING_PAYMENT` holds with `expiresAt > now` temporarily block their stay dates and preparation buffers.
- Expired pending holds and `EXPIRED` reservations do not block stay dates or preparation buffers.
- Preparation buffers use the values stored in `Property.preparationDaysBefore` and `Property.preparationDaysAfter`.
- Composed-listing dependency rules apply to stay dates and preparation buffers.
- Guests cannot modify confirmed dates directly from the public website.
- The approved direct-booking cancellation matrix is 100% refund at 7 or more days before check-in, 50% refund from 72 hours through less than 7 days before check-in, and no refund below 72 hours.
- Tilopay credentials remain server-side and TRP Booking does not store card number, CVV, expiration date, or tokenized card data.
- `Reservation.status` becomes `CONFIRMED` only after the provider payment result is validated server-side.
- Failed, rejected, expired, and successful payment attempts remain auditable.
- Email delivery never determines payment approval and an email failure never rolls back a valid confirmed reservation.
- Transactional email intents must use permanent database deduplication in addition to provider idempotency.
- Local enabled email delivery preserves the intended recipient in persistence but redirects only guest-audience physical delivery to `EMAIL_TEST_RECIPIENT`; admin-audience delivery remains on `juantzun.dev`.
- Test-mode email delivery uses intended guest recipients and configured `juantzun.dev` admin recipients; `EMAIL_TEST_RECIPIENT` must be empty. Phase 12 creates and validates the first stable Test deployment.
- Local/Test transactional email logos use the current developer-owned Cloudinary HTTPS asset through `EMAIL_BRAND_LOGO_URL`; local delivered emails must not expose a clickable localhost logo link. Phase 13 must move Production branding to the company-owned Cloudinary account before go-live.
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
- Local/Test use the approved public HTTPS brand asset configured in EMAIL_BRAND_LOGO_URL independently from the application deployment URL; Production must switch this to the company-owned Cloudinary asset during Phase 13.
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
- The provider preserves intended-recipient persistence; current routing redirects only local guest-audience delivery to `EMAIL_TEST_RECIPIENT`, while test-mode and production routing use intended recipients.
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
- Delivery reuses the existing provider, idempotency, claim, bounded retry, environment-aware recipient routing, and admin-history foundation.
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
- Production recipient delivery, production-provider ownership, production-domain operational acceptance, and production go-live remain deferred to Phase 13.
- Phase 11 Cancellation, Refund, and Change Request Rules is the next official phase and must begin by defining explicit subphases and business contracts.
- The authoritative closure record is docs/94-phase-10-validation-and-documentation-closure.md.
```

## Phase 11 — Cancellation, Refund, and Change Request Rules

Phase 11 is completed and accepted. The strategy and explicit subphase roadmap are defined in `docs/95-phase-11-lifecycle-strategy-and-roadmap.md`, and the authoritative closure record is `docs/120-phase-11.7-validation-and-documentation-closure.md`.

Completed subphases:

```text
11.1 Lifecycle strategy, policy, and provider boundary — Completed
11.2 Lifecycle request persistence and audit foundation — Completed
11.3 Admin cancellation decision and availability release — Completed
11.4 Refund authorization and Tilopay reconciliation — Completed
11.4.1 Observed Tilopay contract and evidence-based reconciliation — Completed
11.4.2 Extraordinary refund authorization and consult evidence lock — Completed
11.5 Authorized date changes and stay extensions — Completed
11.5.1 Strategy, pricing, independent holds, and financial-adjustment contract — Completed
11.5.2 Admin request creation, quote, and availability validation — Completed
11.5.2.1 Admin availability datepicker and own-reservation exclusion UX — Completed
11.5.3 Approval, requested-date hold, and adjustment payment — Completed
11.5.3.1 Transaction resilience and admin datepicker positioning — Completed
11.5.4 Final date-change and stay-extension completion — Completed
11.5.5 Negative-difference and failed-completion refund integration — Completed
11.5.6 Integrated acceptance and documentation closure — Completed
11.6 Lifecycle notifications and admin operational history — Completed
11.6.1 Notification contract and persistence relations — Completed
11.6.2 Bilingual lifecycle email templates — Completed
11.6.3 Transactional intent orchestration and delivery — Completed
11.6.4 Lifecycle adjustment payment-link notifications and email corrections — Completed
11.6.5 Protected operational history and acceptance — Completed
11.7 Validation and documentation closure — Completed
```

Accepted Phase 11 foundation:

```text
- Reservation state owns the stay/availability lifecycle; Payment and Refund own financial reversals.
- Guests cannot directly edit confirmed dates or invoke unauthenticated lifecycle mutations.
- Cancellation and refund remain separate, auditable decisions.
- The approved cancellation matrix is 100% at 168 hours or more, 50% from 72 through less than 168 hours, and 0% below 72 hours before check-in.
- Public pending reservations retain an independent 15-minute hold.
- Positive lifecycle adjustments use a separate 60-minute LifecycleRequestHold.
- Full DATE_CHANGE requests reprice the complete requested stay using current pricing.
- STAY_EXTENSION preserves the original check-in and confirmed total, and prices only added nights.
- Positive differences require an approved adjustment Payment before completion.
- Zero differences complete without Payment or lifecycle hold.
- Negative shortened-stay DATE_CHANGE requests complete with an exact lifecycle-adjustment Refund authorization.
- Approved adjustment Payments whose final mutation cannot commit receive an exact compensating Refund while original dates remain unchanged.
- Refund execution and reconciliation remain evidence-based and independent from Reservation lifecycle status.
- Lifecycle emails are created only after the underlying transition commits and never determine that transition.
- No guest self-service mutation, card-data handling, hard deletion, or PMS behavior is added.
```

## Phase 11.5 Closure

Phase 11.5 — Authorized date changes and stay extensions is completed and accepted.

```text
- Admin-recorded DATE_CHANGE and STAY_EXTENSION requests preserve typed snapshots, decision history, idempotency, and optimistic concurrency.
- Availability, preparation buffers, and composed-listing dependencies are validated during request creation, approval, and final completion.
- Positive, zero, negative, and failed-positive compensation branches are implemented and accepted.
- Reservation.id, CONFIRMED, and confirmedAt remain stable across successful date mutations.
- Original dates remain when an approved positive adjustment cannot complete.
- Updated dates remain when a negative-difference Refund later fails.
- Arrival-instruction supersession remains idempotent.
- Public and lifecycle holds remain independent at 15 and 60 minutes.
- Replay and concurrent operations do not duplicate Payments, Refunds, holds, or terminal request transitions.
- No lifecycle email is created before Phase 11.6.
- All eight integrated acceptance cases passed on 2026-08-04.
- Accepted feature head: d1f43a34a27ba09b68ceee993581a11649cb1508.
- Authoritative closure record: docs/114-phase-11.5-integrated-acceptance-and-documentation-closure.md.
```

## Documentation

Important continuity files:

```text
AGENTS.md
README.md
docs/10-phases.md
docs/11-progress-log.md
docs/89-test-and-production-environment-strategy.md
docs/95-phase-11-lifecycle-strategy-and-roadmap.md
docs/96-phase-11.1-cancellation-policy-and-tilopay-refund-contract-correction.md
docs/97-phase-11.2-lifecycle-request-persistence-and-audit-foundation.md
docs/98-phase-11.3-admin-cancellation-decision-and-availability-release.md
docs/99-phase-11.4-refund-authorization-and-tilopay-reconciliation.md
docs/100-phase-11.4.1-observed-tilopay-contract-and-evidence-based-reconciliation.md
docs/101-phase-11.4.2-extraordinary-refund-authorization-and-consult-evidence-lock.md
docs/102-phase-11.4-refund-acceptance-and-documentation-closure.md
docs/103-phase-11.5.1-date-change-extension-strategy-and-pricing-contract.md
docs/104-phase-11.5.2-admin-request-creation-quote-and-availability-validation.md
docs/105-phase-11.5.2.1-admin-availability-datepicker-and-own-reservation-exclusion.md
docs/106-phase-11.5.2-and-11.5.2.1-acceptance-closure.md
docs/107-phase-11.5.3-approval-hold-and-adjustment-payment.md
docs/108-phase-11.5.3.1-transaction-resilience-and-datepicker-positioning.md
docs/109-phase-11.5.3-and-11.5.3.1-acceptance-closure.md
docs/110-phase-11.5.4-final-positive-zero-completion.md
docs/111-phase-11.5.4-acceptance-closure.md
docs/112-phase-11.5.5-negative-and-compensating-lifecycle-refunds.md
docs/113-phase-11.5.5-acceptance-closure.md
docs/114-phase-11.5-integrated-acceptance-and-documentation-closure.md
docs/115-phase-11.6.1-lifecycle-notification-contract-and-persistence-relations.md
docs/116-phase-11.6.2-bilingual-lifecycle-email-templates.md
docs/117-phase-11.6.3-transactional-intent-orchestration-and-delivery.md
docs/118-phase-11.6.4-lifecycle-adjustment-payment-link-notifications-and-email-corrections.md
docs/119-phase-11.6.5-protected-operational-history-and-acceptance.md
docs/120-phase-11.7-validation-and-documentation-closure.md
docs/121-pre-phase-12-improvement-track.md
docs/135-pre-phase-12-package-f-integrated-acceptance-closure.md
docs/136-phase-12.1-test-deployment-and-environment-strategy.md
docs/137-phase-12.2-vercel-test-project-and-first-deployment.md
docs/138-phase-12.2-acceptance-closure.md
docs/139-phase-12.3-test-environment-variables-and-provider-wiring.md
docs/140-phase-12.3-acceptance-closure.md
docs/141-phase-12.4-test-custom-domain-authjs-and-external-callback-validation.md
docs/142-phase-12.4.1-hosted-database-pooling-correction.md
docs/143-phase-12.4-acceptance-closure.md
docs/144-phase-12.5-real-airbnb-inbound-ical-integration.md
docs/145-phase-12.5.1-airbnb-inbound-reconciliation-correction.md
docs/146-phase-12.5.1.1-admin-calendar-effective-block-consolidation.md
docs/147-phase-12.5-acceptance-closure.md
docs/148-phase-12.6-test-outbound-ical-and-controlled-airbnb-round-trip.md
docs/149-phase-12.6.1-outbound-provider-loop-prevention-and-stable-event-identity.md
docs/150-phase-12.6.1.1-airbnb-ics-url-compatibility.md
docs/151-phase-12.6-acceptance-closure.md
docs/152-phase-12.7-vercel-cron-deployment-and-scheduler-validation.md
docs/153-phase-12.8-full-internet-e2e-regression-start.md
docs/154-phase-12.8-hosted-internet-e2e-regression-matrix.md
docs/155-phase-12.8-acceptance-closure.md
docs/156-phase-12.9-observability-security-recovery-readiness.md
docs/157-phase-12.9-http-security-header-hardening.md
docs/158-phase-12.9-acceptance-closure.md
docs/159-phase-12.10-phase-12-validation-and-closure.md
docs/160-post-phase-12-pre-phase-13-final-improvement-track.md
docs/161-final-a-financial-correctness-strategy-and-roadmap.md
docs/162-final-a-2-central-financial-summary-and-cancellation-policy-correction.md
docs/163-final-a-3-standard-and-extraordinary-multi-payment-refunds.md
docs/164-final-a-4-negative-date-change-multi-payment-integration.md
docs/165-final-a-5-admin-refund-ux-notification-and-operational-history.md
docs/166-final-a-6-integrated-acceptance-and-documentation-closure.md
docs/167-final-b-1-external-calendar-admin-strategy-and-security-contract.md
```

## Development Status

```text
Current phase state: Phase 12 — Test Deployment & External Integration Validation — Completed and accepted on 2026-08-11
Current numbered phase: none active
Current work boundary: Post-Phase-12 / Pre-Phase-13 Final Improvement Track — Active
Current package: Final-B — Admin external-calendar integrations — In progress
Current subphase: Final-B.1 — External-calendar admin strategy and security contract — Strategy/contract prepared; pending owner acceptance
Final-B implementation base head: 0927feb18be35b8d96aca0205a75ee19445f15d4
Final-B.1 record: docs/167-final-b-1-external-calendar-admin-strategy-and-security-contract.md
Next planned subphase: Final-B.2 — Outbound-token encrypted persistence and rotation foundation — Not started
Last completed package: Final-A — Reservation financial correctness and effective stay value — Completed and accepted on 2026-08-12
Final-A.1 status: Completed and accepted on 2026-08-11
Final-A.1 accepted head: 19531568752a44446d0802d6581262260b881aaf
Final-A.2 status: Completed and accepted on 2026-08-11
Final-A.2 accepted head: 9f4e04068726451ca87614dd99b1f10656510825
Final-A.3 status: Completed and accepted on 2026-08-11
Final-A.3 accepted head: 8d5884c4f536c0d9407fac2d0229b71105114453
Final-A.4 status: Completed and accepted on 2026-08-11
Final-A.4 accepted head: 1c5ea765543e46b89beb64ecb3c06141e8efd8e4
Final-A.5 status: Completed and accepted on 2026-08-12
Final-A.5 accepted head: 4117435dd52f6278a205e314db95d336ce0f7662
Final-A.6 status: Completed and accepted on 2026-08-12
Final-A.6 suite commit: 6016b7950331bd528d39b819bad29689688d799c
Final-A.6 accepted head: 66afbeacd6ee7d669cb4bc251c8416160fae3f49
Final-A status: Completed and accepted on 2026-08-12
Final-A accepted head: 66afbeacd6ee7d669cb4bc251c8416160fae3f49
Track registration base: dac105088d2c46be05a900abed3dfe83e608e964
Track plan: docs/160-post-phase-12-pre-phase-13-final-improvement-track.md
Final-A strategy: docs/161-final-a-financial-correctness-strategy-and-roadmap.md
Final-A.2 record: docs/162-final-a-2-central-financial-summary-and-cancellation-policy-correction.md
Final-A.3 record: docs/163-final-a-3-standard-and-extraordinary-multi-payment-refunds.md
Final-A.4 record: docs/164-final-a-4-negative-date-change-multi-payment-integration.md
Final-A.5 record: docs/165-final-a-5-admin-refund-ux-notification-and-operational-history.md
Final-A.6 record: docs/166-final-a-6-integrated-acceptance-and-documentation-closure.md
Phase 13: Production Infrastructure, Deployment & Go-Live — Not started
12.1 status: Completed and accepted on 2026-08-10
12.1 documentation base: ede3881a0d2d341018c107fe0cfe5ba0a7f9c490
12.1 record: docs/136-phase-12.1-test-deployment-and-environment-strategy.md
12.2 status: Completed and accepted on 2026-08-10
12.2 accepted deployment source head: 91f513c57b6220ad8d1d32f9a198a3d5099b1fd7
12.2 record: docs/137-phase-12.2-vercel-test-project-and-first-deployment.md
12.2 acceptance closure: docs/138-phase-12.2-acceptance-closure.md
12.3 status: Completed and accepted on 2026-08-10
12.3 validated repository head: dcea31801351b40029c8c194949e91d0a5642407
12.3 record: docs/139-phase-12.3-test-environment-variables-and-provider-wiring.md
12.3 acceptance closure: docs/140-phase-12.3-acceptance-closure.md
12.4 status: Completed and accepted on 2026-08-10
12.4 accepted repository head: 4956fe08c033d0265d5400639c94d8b4927ddaf5
12.4 record: docs/141-phase-12.4-test-custom-domain-authjs-and-external-callback-validation.md
12.4.1 status: Completed and accepted on 2026-08-10 — Vercel/Supabase serverless runtime moved from Session pooler to Transaction pooler
12.4.1 record: docs/142-phase-12.4.1-hosted-database-pooling-correction.md
12.4 acceptance closure: docs/143-phase-12.4-acceptance-closure.md
12.5 status: Completed and accepted on 2026-08-10 — real Airbnb inbound iCal integration
12.5 accepted functional head: 409e299eee233d852a9ffee0aef20561b0931c4d
12.5 record: docs/144-phase-12.5-real-airbnb-inbound-ical-integration.md
12.5.1 status: Completed and accepted on 2026-08-10 — source-only provider reconciliation and reservation-only preparation buffers
12.5.1 implementation commit: 438f3b95afecdfed5e4fd2df0b3a89856f276dbd
12.5.1 record: docs/145-phase-12.5.1-airbnb-inbound-reconciliation-correction.md
12.5.1.1 status: Completed and accepted on 2026-08-10 — effective admin-calendar blocker consolidation
12.5.1.1 accepted head: 409e299eee233d852a9ffee0aef20561b0931c4d
12.5.1.1 record: docs/146-phase-12.5.1.1-admin-calendar-effective-block-consolidation.md
12.5 acceptance closure: docs/147-phase-12.5-acceptance-closure.md
12.6 status: Completed and accepted on 2026-08-10 — outbound iCal and controlled Airbnb round-trip
12.6 accepted head: 543e0b4bc4cd700e6ebc3a29415981aeae91a13c
12.6 record: docs/148-phase-12.6-test-outbound-ical-and-controlled-airbnb-round-trip.md
12.6.1 status: Completed and accepted on 2026-08-10 — outbound provider-loop prevention and stable VEVENT identity
12.6.1 implementation commit: 5a120e49fb2e6196d64fc98e608552b217b7522f
12.6.1 record: docs/149-phase-12.6.1-outbound-provider-loop-prevention-and-stable-event-identity.md
12.6.1.1 status: Completed and accepted on 2026-08-10 — Airbnb-compatible `.ics` export URL support
12.6.1.1 accepted head: 543e0b4bc4cd700e6ebc3a29415981aeae91a13c
12.6.1.1 record: docs/150-phase-12.6.1.1-airbnb-ics-url-compatibility.md
12.6 acceptance closure: docs/151-phase-12.6-acceptance-closure.md
12.7 status: Deferred to Phase 13 on 2026-08-11 — no Vercel scheduler activation required in Test
12.7 record: docs/152-phase-12.7-vercel-cron-deployment-and-scheduler-validation.md
12.8 status: Completed and accepted on 2026-08-11 — hosted Full Internet E2E regression
12.8 acceptance base head: 9f7594e5423a7f78163c1f0bad645823f9c17e8d
12.8 start record: docs/153-phase-12.8-full-internet-e2e-regression-start.md
12.8 matrix: docs/154-phase-12.8-hosted-internet-e2e-regression-matrix.md
12.8 acceptance closure: docs/155-phase-12.8-acceptance-closure.md
12.9 status: Completed and accepted on 2026-08-11 — Test observability, security, and recovery readiness
12.9 validated application/security head: c6791cde5ae99a7b16d4582705f994b7963d115c
12.9 validation matrix: docs/156-phase-12.9-observability-security-recovery-readiness.md
12.9 HTTP security hardening: docs/157-phase-12.9-http-security-header-hardening.md
12.9 acceptance closure: docs/158-phase-12.9-acceptance-closure.md
12.10 status: Completed and accepted on 2026-08-11 — Phase 12 validation and closure
12.10 validated repository head: ebe28579872cbc2414573ef852b15139a2501551
12.10 closure: docs/159-phase-12.10-phase-12-validation-and-closure.md
Phase 12 status: Completed and accepted on 2026-08-11
Vercel cron registration: intentionally disabled in Test; the Test project may remain on Hobby. Phase 13 owns production-only scheduler activation and recurrence validation through environment-aware Vercel configuration
Test deployment status: stable HTTPS domain `trp-booking.juantzun.dev` is attached and operational
Test domain target: https://trp-booking.juantzun.dev
Phase 13: Production Infrastructure, Deployment & Go-Live — Not started; Production remains blocked until Final-H completes and the Final Improvement Track is explicitly accepted
Pre-Phase-12 Improvement Track status: Completed and accepted — Packages A, B, C, E, and F accepted; Package D remains deferred outside the current gate
Package F closure: docs/135-pre-phase-12-package-f-integrated-acceptance-closure.md
```

### Phase 11.6.1 completed and accepted

```text
- The eight lifecycle notification types and guest/admin audiences are frozen.
- EmailNotification now has optional typed links to ReservationLifecycleRequest and Refund.
- Stable per-recipient deduplication keys are centralized and validated.
- Existing notification history remains valid; no historical backfill is performed.
- Accepted commit: 8996de10fadd676b1de41951e528c84aa6583f03.
- Implementation record: docs/115-phase-11.6.1-lifecycle-notification-contract-and-persistence-relations.md.
```

### Phase 11.6.2 completed and accepted

```text
- Eight strict bilingual HTML and plain-text lifecycle template builders are committed.
- Lint and build passed at 6eb4a18c9e7476266cae8c627318fa83ff27fb0d.
- Manual content, rendering, and inbox checks are intentionally consolidated into the integrated 11.6.3 matrix.
- Implementation record: docs/116-phase-11.6.2-bilingual-lifecycle-email-templates.md.
```

### Phase 11.6.3 completed and accepted

```text
- The integrated lifecycle inbox matrix passed for cancellation, date changes, extensions, standard/extraordinary refunds, and lifecycle-adjustment refunds.
- Guest/admin intents, post-commit delivery, environment-aware routing, retry recovery, permanent deduplication, replay safety, and domain failure isolation were accepted.
- Accepted commit: 5fed1ca0423190cd51a9c710d00c9216b65883a9.
- Three accepted follow-up requirements were assigned to 11.6.4 without reopening the accepted 11.6.3 orchestration boundary.
- Implementation record: docs/117-phase-11.6.3-transactional-intent-orchestration-and-delivery.md.
```

### Phase 11.6.4 completed and accepted

```text
- Positive DATE_CHANGE and STAY_EXTENSION requests send the guest the existing private 60-minute adjustment-payment link while preserving the original dates until payment and successful completion.
- Guest SENT and terminal FAILED outcomes create separate administrative delivery-result notifications without claiming inbox delivery or opening.
- Protected manual sending, duplicate and active-delivery warnings, failed-only behavior, UUID idempotency, source preservation, and missing-intent worker recovery passed.
- Positive, zero, and negative RESERVATION_DATES_UPDATED copy branches passed in ES and EN HTML/plain text.
- Email failure leaves Reservation, lifecycle request, hold, Payment, Refund, and completed dates unchanged.
- All 20 acceptance criteria passed on 2026-08-05.
- Implementation commit: ffbed6b8c1b1d3dbd6fc61cee0e0c0f4d21d9c53.
- Compilation fixes: 92e182e46796502335b8c3c171377c363d5521ae, 308721dd11f87e098cb639dca7356ebc35b0e67f.
- Accepted head: 308721dd11f87e098cb639dca7356ebc35b0e67f.
- Authoritative record: docs/118-phase-11.6.4-lifecycle-adjustment-payment-link-notifications-and-email-corrections.md.
```

### Phase 11.6.5 completed and accepted

```text
- The protected reservation detail exposes one responsive, read-only operational timeline without creating a new persistence source.
- Lifecycle requests, holds, initial and adjustment Payments, Refunds, notification delivery, retries, manual parent/child relations, source/result relations, actors, and timestamps render through the accepted typed projection.
- Deterministic descending ordering and the stable event-ID tie-breaker passed.
- No-lifecycle empty state, cancellation, positive/zero/negative DATE_CHANGE, STAY_EXTENSION, compensating Refund, notification relations, retry states, existing recovery controls, ES/EN desktop/mobile behavior, and security boundaries passed.
- Raw provider payloads, private tokens, credentials, card data, full email bodies, and unfiltered AdminAuditLog.metadata remain excluded.
- No schema, migration, dependency, environment-variable, public endpoint, mutation action, or PMS behavior was added.
- All 15 acceptance criteria passed on 2026-08-05.
- Implementation and accepted head: 6a14fa7f8dd39765bb782b59c737436465ca3e0f.
- Implementation and acceptance record: docs/119-phase-11.6.5-protected-operational-history-and-acceptance.md.
```

### Phase 11.6 completed and accepted

```text
- Phase 11.6.1 through 11.6.5 are completed and accepted.
- Lifecycle notification contracts, bilingual templates, transactional intent orchestration, post-commit delivery, adjustment-payment links, delivery-result relations, retry/manual recovery, and protected operational history operate through the accepted Phase 10 foundation.
- Email delivery remains isolated from Reservation, lifecycle-request, hold, Payment, Refund, and date-transition state.
- Permanent deduplication, environment-aware routing, bounded retry, stale recovery, ES/EN output, source/result relations, manual parent/child history, safe diagnostics, and protected admin visibility were accepted.
- No historical email backfill, guest self-service mutation, raw provider exposure, card-data handling, hard deletion, or PMS behavior was introduced.
- Accepted feature head: 6a14fa7f8dd39765bb782b59c737436465ca3e0f.
- Closure record: docs/119-phase-11.6.5-protected-operational-history-and-acceptance.md.
```

### Phase 11.7 completed and accepted

```text
- All 15 reduced cross-phase criteria passed on 2026-08-05 across cancellation, refunds, date changes, stay extensions, availability, independent holds, payments, lifecycle emails, operational history, idempotency, concurrency, security, localization, and technical validation.
- Cancellation policy boundaries remained exact at 168 and 72 hours using the property check-in time in America/Guatemala.
- Standard, extraordinary, negative-difference, and compensating Refund paths remained bounded and evidence-based.
- Positive, zero, negative, and failed-positive lifecycle branches remained coherent without duplicating Payments, Refunds, holds, notifications, or terminal transitions.
- The 15-minute public hold and 60-minute lifecycle-adjustment hold remained independent.
- Preparation buffers, composed-listing dependencies, manual overrides, unrelated blockers, post-commit email delivery, retry/manual recovery, and protected operational history remained intact.
- ES/EN responsive and accessible output, safe diagnostics, and restricted-data boundaries passed.
- Environment validation, Prisma generation/validation/migration status, lint, build, whitespace validation, and clean repository status passed.
- No application code, Prisma schema, migration, seed, dependency, environment variable, or Phase 12 behavior was required.
- Validated closure base: 16cca9e63f5fd8d8af590fc1211dbc69d642f1f6.
- Accepted feature head: 6a14fa7f8dd39765bb782b59c737436465ca3e0f.
- Authoritative closure record: docs/120-phase-11.7-validation-and-documentation-closure.md.
```

### Phase 11 completed and accepted

```text
- Phase 11.1 through 11.7 are completed and accepted as one auditable cancellation, refund, authorized date-change, stay-extension, lifecycle-notification, and protected-history feature.
- Reservation remains the source of truth for stay and availability state; Payment and Refund remain the sources of truth for financial state.
- Guest self-service lifecycle mutation, raw provider exposure, card-data handling, hard deletion, history rewrite, and PMS expansion remain excluded.
- At Phase 11 closure, Phase 12 was the next Test-only phase. Phase 12 later completed and was accepted on 2026-08-11; its authoritative final closure is `docs/159-phase-12.10-phase-12-validation-and-closure.md`. Phase 13 remains not started.
```
