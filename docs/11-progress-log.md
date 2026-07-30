# 11 — Progress Log

This document is the official progress tracker for TRP Booking. Update it whenever a phase or subphase changes status.

## Current Status

```text
Current phase: Phase 11 — Cancellation, Refund, and Change Request Rules
Current subphase: 11.5.2.1 Admin availability datepicker and own-reservation exclusion UX — In progress
Current focus: validate the protected admin range calendar, own-reservation stay/buffer exclusion, unrelated blocker visibility, fixed-check-in extension behavior, month loading, bilingual copy, and unchanged financial/lifecycle state
Last updated: 2026-07-30
Last completed subphase: 11.5.1 Strategy, pricing, independent holds, and financial-adjustment contract
11.5.1 strategy base commit: 3d1487f31ca74fc5a41573b4ab206ce9ad838bb5
11.5.1 strategy document: docs/103-phase-11.5.1-date-change-extension-strategy-and-pricing-contract.md
11.5.1 accepted commit: e0b77658c74ee2d7a30c96f529d5f7f4451ab045
11.5.2 implementation document: docs/104-phase-11.5.2-admin-request-creation-quote-and-availability-validation.md
11.5.2 implementation commit: 1a57fbbfb71533c16c8b58bceb8546a70a88599f
11.5.2 backend acceptance: Passed on 2026-07-30; calendar UX correction tracked in 11.5.2.1
11.5.2.1 correction document: docs/105-phase-11.5.2.1-admin-availability-datepicker-and-own-reservation-exclusion.md
11.4 accepted implementation commit: 06e857df9d36e77c26557bb7b2057661979809dc
11.4 implementation document: docs/99-phase-11.4-refund-authorization-and-tilopay-reconciliation.md
11.4.1 correction document: docs/100-phase-11.4.1-observed-tilopay-contract-and-evidence-based-reconciliation.md
11.4.2 implementation document: docs/101-phase-11.4.2-extraordinary-refund-authorization-and-consult-evidence-lock.md
11.4 closure document: docs/102-phase-11.4-refund-acceptance-and-documentation-closure.md
Last completed phase: Phase 10 — Email Notifications
Phase 10 closure document: docs/94-phase-10-validation-and-documentation-closure.md
```

## Completed Work

### Phase 9.4 — Tilopay SDK V2 Checkout Foundation

Status: **Completed**

```text
TRP Booking uses Tilopay SDK V2 as the preferred checkout foundation.
The backend calls Tilopay server-side and exposes only safe initialization data.
Payment.providerReference stores the unique provider order number.
Card number, CVV, expiration, and card tokens never reach the backend.
```

### Phase 9.5 — Tilopay Redirect, Consult, and OrderHash V2 Validation

Status: **Completed**

```text
Redirect handling resolves Payment by providerReference/orderNumber.
Tilopay consult runs server-side.
OrderHash V2 uses HMAC-SHA256 validation.
Redirect query parameters are not final payment truth.
```

### Phase 9.6 — Confirm Reservation Only After Validated Payment

Status: **Completed**

```text
Reservation confirmation is payment-driven and idempotent.
Only APPROVED payment for an active PENDING_PAYMENT reservation can confirm it.
Reservation.confirmedAt is set and expiresAt is cleared.
Rejected and failed payments never confirm reservations.
```

### Phase 9.6.1 — Sandbox Hardening and Checkout UX

Status: **Completed**

```text
Tilopay preflight and OrderHash validation were hardened.
Expired reservation confirmation is prevented.
Retryable provider issues map to safe bilingual messages.
SDK client failures use safe operational diagnostics.
Payment and reservation statuses remain distinct and localized.
```

### Phase 9.7 — Admin Reservation and Payment Review

Status: **Completed**

```text
Protected admin visibility exists for reservations, payments, and safe SDK diagnostics.
Visible copy and statuses are bilingual.
Payment-driven confirmation remains the only confirmation path.
No card data, manual confirmation, cancellation, refund, date change, email, or PMS action was added.
```

### Phase 9.8 — Automatic Preparation Buffers

Status: **Completed**

```text
CONFIRMED reservations block stay dates and preparation buffers.
Active PENDING_PAYMENT holds block only while expiresAt is in the future.
Expired or invalid holds do not block availability.
Property buffer settings and composed-listing dependencies are respected.
```

### Phase 9.9 — Preparation Buffer Settings and Unlocks

Status: **Completed**

```text
Dynamic direct-reservation buffers use auditable override records.
Preparation days are editable from 0 through 30.
One-day PREPARATION_BUFFER CalendarBlock rows record admin unlocks.
Availability and iCal subtract only matching overrides.
Reservation stay dates remain blocked.
```

### Phase 9.9.1 — Admin Navigation and Property Calendar

Status: **Completed**

```text
The protected admin layout provides responsive sidebar navigation and route feedback.
Reservations and payments use dedicated searchable, filterable, paginated routes.
Visible selectors use the shared Radix design-system component.
The property calendar supports effective blockers, composed inheritance, manual blocks, and preparation overrides.
Successful and failed admin mutations use accessible snackbars.
```

### Phase 9.10 — Phase 9 Documentation Closure

Status: **Completed**

```text
Phase 9 behavior and boundaries were consolidated in README and official trackers.
Real Airbnb iCal operational configuration remains deferred to production readiness.
No credentials, card data, private iCal URLs, or provider secrets were documented.
```

### Phase 9.11.1 — Brand Identity

Status: **Completed**

```text
Approved BrandLogo and BrandMark components are used across public, admin, sign-in, favicon, application icon, and social metadata surfaces.
Responsive closure protects narrow footer, mobile admin header, and short admin-login viewports.
Auth.js policy and provider configuration remain unchanged.
```

Accepted commits:

```text
Application integration: 8ac8291db2296f2c977f5e6667150a7ea0b8f9a8
Visible-name follow-up: cf9154f290c9635c61371b5ce83cf9a7e9a2966e
```

### Phase 9.11.2 — Accommodation Content Management

Status: **Completed**

```text
/admin/accommodations lists the supported properties and separates content from preparation settings.
Each property has a bilingual content editor.
Editable fields include names, descriptions, capacity, bedroom/bathroom counts, check-in, and optional check-out.
Slug, price, currency, status, composition, photos, amenities, rules, and preparation policy remain outside that editor.
Strict Zod validation, service normalization, expectedUpdatedAt, and PROPERTY_CONTENT_UPDATED auditing are preserved.
The public locale selector and shared admin error snackbars were accepted.
```

Accepted commits:

```text
Implementation: bc19e7327cd96647fd760b1a551fc4ae9ffacde2
Locale/snackbar follow-up: 3dc5797aef1efc2942d68358bdc5d3b5b44cca4d
```

### Phase 9.11.3 — Property Photo Management

Status: **Completed**

```text
/admin/accommodations/[propertyId]/photos manages up to 40 active JPG, PNG, or WEBP photos of at most 10 MB.
Cloudinary uploads use short-lived server signatures and provider verification.
Bilingual alt text, ordering, cover selection, soft deletion, optimistic gallery revisions, and audit history are supported.
The final active photo cannot be deleted.
The local upload preview uses a temporary object URL.
```

Audit actions:

```text
PROPERTY_IMAGE_UPLOADED
PROPERTY_IMAGE_ALT_TEXT_UPDATED
PROPERTY_IMAGES_REORDERED
PROPERTY_IMAGE_COVER_CHANGED
PROPERTY_IMAGE_SOFT_DELETED
```

Accepted commits:

```text
Implementation: c76451b4f1f8b1af97783f3c2571b4fbb7c5daa0
Sheet accessibility fix: 39a90fd8f5314189265b8cbf445a3e873c873c80
Photo-limit/card alignment: 9f5c10a6ca5812e0c6ea48852e1f673fb65df138
```

### Phase 9.11.4 — Amenities and House Rules

Status: **Completed**

Base implementation:

```text
/admin/accommodations/[propertyId]/amenities-rules manages assignments.
Each property must retain at least one active amenity and one active rule.
Assignment changes use a SHA-256 revision and serializable transaction.
PROPERTY_AMENITIES_RULES_UPDATED preserves before/after membership history.
Public pages read active bilingual catalog content and assignments from PostgreSQL.
```

Accepted UI follow-up:

```text
The sidebar includes a dedicated Catalogs entry.
/admin/catalogs separates Amenities and House Rules with tab-style buttons.
Shared catalog editing is separate from property assignments.
Property photo upload shows a local preview.
Accommodation check-in and check-out use controlled 30-minute selectors.
Accepted follow-up commit: ac4c8d96dbe1a80e481ebbc9046a3bf887a22a6e
```

Accepted catalog lifecycle follow-up:

```text
POST /api/admin/catalogs creates amenities and house rules.
New catalog items are unassigned initially.
The server generates an immutable runtime key from the English label and resolves collisions with a suffix.
DELETE /api/admin/catalogs soft-deletes amenities and house rules.
Deletion removes replaceable assignment rows in the same serializable transaction.
Deletion is rejected when an affected property would lose its final active item in that domain.
deletedAt, deletedById, expectedUpdatedAt, and AdminAuditLog preserve history and concurrency.
The property-photo upload form can explicitly clear its local selection without contacting Cloudinary.
Static amenity ordering accepts runtime-created catalog keys.
No Prisma migration, hard deletion, restore/purge UI, reservation/payment action, email delivery, or PMS behavior was added.
```

Catalog audit actions:

```text
AMENITY_CREATED
AMENITY_CONTENT_UPDATED
AMENITY_SOFT_DELETED
HOUSE_RULE_CREATED
HOUSE_RULE_CONTENT_UPDATED
HOUSE_RULE_SOFT_DELETED
PROPERTY_AMENITIES_RULES_UPDATED
```

Important seed boundary:

```text
Amenity and HouseRule upserts use update: {}.
Default assignments are inserted only when a property currently has zero assignments.
Seed reruns do not overwrite runtime content or restore soft-deleted catalog records.
```

Accepted commits:

```text
Catalog lifecycle implementation: 96e6d3938be82dd500b03aeead18c95b962a20fe
Static amenity-key hardening: 88b2320994d0dd91b80e2359bb28932751de8a37
Static amenity-key hardening follow-up: d6ae907b6c3bc91b45147d05aa83878c0b38d3c2
Final static/dynamic ordering fix: c5b15197bba6d2fce84a15649944ebd013a0fdfc
```

### Phase 9.11.5 — Reservation and Payment Detail Views

Status: **Completed**

```text
/admin/reservations/[reservationId] provides a protected read-only reservation detail.
/admin/payments/[paymentId] provides a protected read-only payment detail.
Reservation and payment list cards link to the corresponding detail routes.
Reservation detail shows guest, stay, pricing, active hold, and ordered payment-attempt information.
Payment detail shows safe allowlisted diagnostics, parent reservation context, and ordered SDK client events.
Reservation and payment detail pages provide cross-navigation.
Payment.rawPayload is processed only in the server loader and never returned as raw JSON.
PaymentClientEvent.sdkPayload is not selected.
Visible copy and statuses reuse the centralized bilingual message catalog.
No mutation action, Prisma migration, seed change, email delivery, calendar mutation, refund flow, date-change flow, or PMS behavior was added.
```

Accepted commits:

```text
Implementation: f3d14a26f314967c7d1ff536477e9541dd17a7ed
Detail-route registration fix: 1ae765fe1bb3b2504f2c458632fd5b9acef43ade
List-route restoration: b9fa0d7e397959a385685b7c8298c2b93cd974b0
```

Implementation document:

```text
docs/83-reservation-and-payment-detail-views.md
```

### Phase 9.11.6 — Validation and Documentation Closure

Status: **Completed**

```text
Phase 9.11 implementation and scope boundaries are consolidated in README and the official trackers.
The final reservation/payment list and detail route arrangement was reported working and committed.
The closure records the accepted Phase 9.11.5 commits and the next Phase 10 handoff.
No application code, Prisma migration, seed change, dependency, provider credential, visible UI copy, email delivery, or PMS behavior was added.
```

Closure document:

```text
docs/84-phase-9.11-validation-and-documentation-closure.md
```

### Phase 10.1 — Email Notification Strategy and Environment Contract

Status: **Completed**

Repository findings:

```text
EmailNotification and the email type/status enums already exist in prisma/schema.prisma.
EmailNotification does not yet have a permanent deduplication key or safe retry-claim fields.
The public pending-hold request carries locale = es|en, but Reservation does not persist that preference.
The reservation-confirmation service is already payment-driven and transactionally changes the reservation to CONFIRMED.
The repository has no Resend dependency, API-key validation, sender validation, template layer, dispatcher, or retry worker yet.
siteConfig already centralizes the public Spanish, English, and admin email addresses.
```

Accepted strategy:

```text
The database owns permanent email deduplication and Resend receives the same stable key as its provider idempotency key.
Provider network calls run only after the reservation-confirmation transaction commits.
Guest RESERVATION_CONFIRMED and ADMIN_NEW_RESERVATION are the initial automatic messages.
PAYMENT_APPROVED is not sent separately.
Automatic rejected/failed-payment emails are deferred from the initial MVP to avoid duplicate or noisy messages across payment retries.
Arrival instructions remain a later Phase 10 subphase pending explicit timing and content approval.
Transactional email copy stays centralized in messages/es.ts and messages/en.ts.
The server-side environment contract will support disabled, test-recipient-override, and production delivery modes.
No email is sent and no schema, migration, dependency, or environment file is changed by 10.1.
```

Strategy document:

```text
docs/85-email-notification-strategy-and-phase-10-roadmap.md
```

### Phase 10.2 — Persistence and Resend Provider Foundation

Status: **Completed**

Implemented scope:

```text
Added resend 6.17.2 as the only provider dependency and regenerated package-lock.json.
Added conditional disabled/test/production email environment validation and safe .env.example values.
Persisted Reservation.preferredLocale from the existing pending-hold locale input.
Added permanent EmailNotification.deduplicationKey uniqueness and a safe legacy-row backfill.
Added PROCESSING plus bounded retry/claim metadata and normalized error-code storage.
Added a typed server-side Resend adapter with recipient override and safe provider-error mapping.
Kept templates, notification intents, confirmation hooks, retry cron, admin delivery visibility, and actual email delivery out of scope.
Accepted commit: 5ad4f1c4c08a1f98691d0215dc5958fbe7542f72.
```

## Completed Work — Phase 10.3

### Phase 10.3 — Bilingual Branded Reservation-Confirmation Templates

Status: **Completed**

Implemented scope:

```text
Added matching transactional email copy under messages/es.ts and messages/en.ts.
Added shared email-safe React layout primitives using the approved primary brand asset.
Added guest RESERVATION_CONFIRMED subject, HTML, and plain-text builders.
Added admin ADMIN_NEW_RESERVATION subject, HTML, and plain-text builders.
Added strict typed template inputs, Zod validation, normalized safe view models, preferred-locale enforcement for guest output, and locale-aware formatting.
Added an absolute protected admin reservation-detail URL only to the administrative template.
Kept EmailNotification intent creation, reservation-confirmation hooks, Resend calls, retry processing, admin delivery history, arrival scheduling, schema changes, and new dependencies out of scope.
Implementation document: docs/87-bilingual-branded-reservation-confirmation-templates.md.
Accepted commit: 7f6510d3e152caccefa42d9a2f5f75dbf747a22e.
```

## Completed Work — Phase 10.4

### Phase 10.4 — Guest and Admin Confirmation Notification Orchestration

Status: **Completed and accepted**

```text
Guest and per-admin notification intents are created or reused transactionally with reservation confirmation.
Provider delivery starts only after commit and atomically claims PENDING rows.
Repeated APPROVED callbacks reuse the same permanent deduplication keys.
Test mode preserves intended recipients while delivering only to EMAIL_TEST_RECIPIENT.
Provider/template failure remains isolated from approved payment and confirmed reservation state.
Environment/domain isolation and the permanent public logo URL were accepted as follow-ups.
No retry cron, stale-claim recovery, admin notification history, arrival scheduling, or manual resend was included.
```

Accepted commits:

```text
Orchestration: ab74af5863d82ede8489b11a00627c3e759c205d
Turbopack-compatible renderer: 263b2a396ed206beb12ca407bc67472cbbead3bf
Environment isolation: d3803fb7744c5d9836db7a37001b2753c3f4c8f8
Permanent email logo URL: 6f7bdc3c6027d6be8b4fcdfe027c57b01dfef50d
```

## Completed Work — Phase 10.5

### Phase 10.5 — Retry Processing and Admin Delivery Visibility

Status: **Completed and accepted**

```text
A CRON_SECRET-protected worker processes no more than 20 due notifications every five minutes.
Retryable failures use 5-minute, 15-minute, 1-hour, and 6-hour backoff with 5 total attempts.
Stale PROCESSING claims recover after 10 minutes through ownership tokens and atomic claims.
SENT and SKIPPED rows are never automatically retried.
Protected reservation detail shows localized, bounded, safe delivery history.
Payment remains APPROVED and Reservation remains CONFIRMED when delivery or retry fails.
Local retry, stale recovery, concurrency, limit, idempotency, and admin-visibility tests were accepted.
```

Accepted commits:

```text
Implementation: 1d3b02f6ae5fe37bd850a0ede0227e7173628aa1
Prisma filter typing follow-up: f77625f1d95095d7ebfd270007e1cbc54b667762
```

Implementation document:

```text
docs/91-email-retry-processing-and-admin-delivery-visibility.md
```

## Completed Work — Phase 10.5.1

### Phase 10.5.1 — Manual Resend and Delivery Recovery Controls

Status: **Completed and accepted**

```text
Eligible PENDING, FAILED, and SENT confirmation notifications expose a protected manual action.
Each request creates a separate MANUAL EmailNotification with a new deduplication key, parent link, requesting admin, requested timestamp, and audit event.
The original delivery record remains intact and is excluded from automatic claiming after a manual child exists.
PROCESSING, SKIPPED, unsupported, stale, and non-confirmed requests remain rejected.
Client request UUIDs and unique keys make network retries and concurrent duplicate submissions idempotent.
The styled bilingual confirmation Sheet warns when a prior SENT notification may be duplicated.
Manual delivery reuses the existing post-transaction provider and bounded retry pipeline.
Payment and Reservation remain unchanged when manual delivery fails.
```

Accepted commit:

```text
355c72490d416a257b9827d31c67223a97200491
```

Implementation document:

```text
docs/92-manual-resend-and-delivery-recovery-controls.md
```

## Completed Work — Phase 10.6

### Phase 10.6 — Arrival Instructions Scheduling and Content

Status: **Completed and accepted**

Implemented scope:

```text
Added property-owned arrival settings with enabled state, a 1–168-hour lead time, exact address, optional HTTPS map URL, and bilingual ES/EN instructions.
Selected 48 hours before the property check-in time in America/Guatemala as the default schedule.
Same-day and late confirmations inside the lead window become immediately eligible even after the configured check-in time; only check-in dates before the current Guatemala business date are excluded.
Added a protected admin editor with optimistic concurrency, audit logging, centralized bilingual copy, and explicit secret-content guardrails.
Added an ARRIVAL_INSTRUCTIONS branded HTML/plain-text template using the guest's stored preferred locale.
Added active bilingual house rules to RESERVATION_CONFIRMED and ARRIVAL_INSTRUCTIONS using the accommodation's current PropertyRule assignments at delivery time.
Added transactional intent creation during confirmation plus a CRON_SECRET-protected backfill scheduler every 30 minutes.
Added scheduledFor, check-in snapshot, and settings-version metadata to EmailNotification.
Added permanent deduplication by reservation, check-in date, settings version, and recipient.
Settings or date changes supersede stale pending/failed intents, and delivery performs a final version/status check before contacting Resend.
Reused the existing worker, claim ownership, bounded retry, provider idempotency, test recipient override, and admin history.
Kept rotating secrets, raw provider payloads, payment/reservation mutation, new dependencies, environment variables, and PMS behavior out of scope.
Implementation document: docs/93-arrival-instructions-scheduling-and-content.md.
Accepted implementation and follow-up commits: e75a50f6b7a929ff1e167c590284086c6259130b through 17be3fdf752a10932bae3f7192f55b16d80ac8e3.
```

## Completed Work — Phase 10.7

### Phase 10.7 — Validation and Documentation Closure

Status: **Completed**

```text
Phase 10 implementation and accepted local/test validation evidence are consolidated in README and the official trackers.
The closure preserves payment-driven confirmation, post-commit provider calls, permanent database idempotency, safe bounded retries, audited manual recovery, and version-aware arrival delivery.
Production-recipient delivery and Resend webhook observability remain deferred to Phase 12 Production Readiness.
No application code, Prisma schema, migration, seed, dependency, provider credential, visible UI copy, payment/reservation mutation, or PMS behavior was added.
Closure document: docs/94-phase-10-validation-and-documentation-closure.md.
```


## Completed Work — Phase 11.1

### Phase 11.1 — Lifecycle Strategy, Policy, and Provider Boundary

Status: **Completed**

Repository findings:

```text
Reservation already has CANCELLED/REFUNDED/PARTIALLY_REFUNDED statuses and cancelledAt.
Payment already has PARTIALLY_REFUNDED/REFUNDED states.
Refund persistence already stores payment, amount, currency, reason, provider reference, status, and timestamps.
EmailNotificationType already reserves cancellation, date-update, extension, and refund types.
AdminAuditLog exists, but there is no typed lifecycle request or transition snapshot.
Current availability treats CONFIRMED as the active direct-reservation blocker.
```

Accepted strategy, including the Phase 11.1 correction:

```text
Reservation owns stay/availability state; Payment and Refund own financial state.
New flows do not move an active reservation to PARTIALLY_REFUNDED.
Cancellation and refund are separate admin decisions.
The approved cancellation matrix returns 100% at 7 or more days before check-in, 50% from 72 hours through less than 7 days, and 0% below 72 hours.
Policy timing uses the property's configured check-in time in America/Guatemala.
Same-day, after-check-in, and no-show cancellations are standard 0% refund cases unless a separately approved exception is recorded.
Official Tilopay documentation defines POST /api/v1/processModification with bearer authentication, orderNumber, amount, key, type 2 refund, and type 3 reversal.
Actual sandbox support, successful and failed response bodies, duplicate behavior, retry safety, and idempotency remain assigned to 11.4 endpoint testing.
Merchant-portal processing remains a fallback/reconciliation option rather than the only initial path.
Guests request authorization through approved support channels; no unauthenticated mutation endpoint is introduced.
Date changes and extensions preserve the original reservation and require availability/buffer repricing validation.
Positive price differences require an approved linked adjustment payment before applying dates.
Requested dates awaiting payment require a temporary expiring lifecycle-request hold.
Lifecycle notifications are deferred until the underlying mutations are accepted.
Fee treatment, exception authority, and date-change repricing remain explicit decisions for their corresponding implementation subphases.
No application code, Prisma change, migration, dependency, environment variable, provider request, visible copy, or PMS behavior is added by 11.1 or its correction.
```

Strategy and correction documents:

```text
docs/95-phase-11-lifecycle-strategy-and-roadmap.md
docs/96-phase-11.1-cancellation-policy-and-tilopay-refund-contract-correction.md
```

## Phase 11.5 Implementation Sequence

```text
1. 11.5.1 Strategy, pricing, independent holds, and financial-adjustment contract — Completed.
2. 11.5.2 Admin request creation, immutable snapshots, server quote, and requested-range availability validation.
3. 11.5.3 Approval/rejection, independent 60-minute lifecycle hold, purpose-bound adjustment checkout, and payment attempts.
4. 11.5.4 Final serializable completion for positive and zero differences while preserving Reservation ID and CONFIRMED status, plus the shared completion framework used by the next subphase.
5. 11.5.5 Negative-difference completion, RefundAuthorizationType.LIFECYCLE_ADJUSTMENT, and compensating refunds for approved payments whose date transition cannot complete.
6. 11.5.6 Local/test acceptance for pricing, holds, expiry, idempotency, concurrency, availability, payments, refunds, audit, and documentation.
7. Keep the normal public pending-reservation hold fixed at 15 minutes; its constant and Reservation.expiresAt flow are independent from the 60-minute LifecycleRequestHold.
8. Keep date-update and extension notification implementation assigned to 11.6 and production Tilopay execution assigned to Phase 12.
```

## Completed Work — Phase 11.2

### Phase 11.2 — Lifecycle Request Persistence and Audit Foundation

Status: **Completed and accepted**

```text
Typed lifecycle requests now own request state, actors, timestamps, old/new operational and financial snapshots, idempotency, and optimistic concurrency.
Payment purpose/request linkage distinguishes adjustment payments from initial reservation payments.
Temporary lifecycle-request holds participate in availability, preparation buffers, and composed-listing dependencies while active and unexpired.
Refund status is separated from processing mode without silently rewriting historical lifecycle meaning.
New flows keep active stays CONFIRMED and do not use Reservation.PARTIALLY_REFUNDED as an availability state.
Accepted commit: 2495aa891fd26938550960f94fdbea700151350f.
Implementation document: docs/97-phase-11.2-lifecycle-request-persistence-and-audit-foundation.md.
```

## Completed Work — Phase 11.3

### Phase 11.3 — Admin Cancellation Decision and Availability Release

Status: **Completed and accepted**

```text
Protected admin routes record and decide cancellation requests using strict Zod validation and safe error codes.
Creation snapshots the confirmed reservation, validated initial payment, and exact standard cancellation-policy outcome.
Approval changes Reservation to CANCELLED and completes the request inside a serializable transaction.
Rejection preserves the reservation and availability.
Cancellation releases direct stay, preparation-buffer, and composed-listing availability through the existing status-driven model.
Pending and failed arrival-instruction notifications are skipped without rewriting SENT history.
Local/test policy-boundary, idempotency, concurrency, audit, and availability-release tests were reported successful.
No Refund row, Tilopay modification, Payment refund state, lifecycle email, public self-service endpoint, or PMS behavior was added.
Accepted commit: c609ea0e5b4654da86436dba79477455681d7b14.
Implementation document: docs/98-phase-11.3-admin-cancellation-decision-and-availability-release.md.
```

## Completed Work — Phase 11.4

### Phase 11.4 — Refund Authorization and Tilopay Reconciliation

Status: **Completed and accepted**

```text
Full/partial PENDING refund authorization is protected, idempotent, and constrained by policy and captured-payment cumulative balances.
Provider and portal actions occur only after the Refund authorization transaction commits.
Tilopay processModification type 2 execution is intentionally sandbox-only.
Observed 1101 / Transaction is approved responses remain PROCESSING until evidence reconciliation.
Known rejected codes 12 and 96 become FAILED without changing Payment; unknown responses and timeouts remain PROCESSING.
Only evidence-backed APPROVED reconciliation changes Payment to PARTIALLY_REFUNDED or REFUNDED.
FAILED attempts preserve history and never change the Reservation lifecycle status.
Safe diagnostics omit credentials and raw provider values.
Controlled CLIs support processModification matrix execution and safe `/consult` candidate observation.
The original 11.4 package added no migration; 11.4.2 adds only the Refund authorization-type migration. No dependency, environment variable, refund email, public mutation endpoint, or PMS behavior is added.
Final acceptance covered standard partial accumulation, portal fallback, consult evidence, tampering protection, idempotency, concurrency, financial-state transitions, and audit history.
Accepted implementation commit: 06e857df9d36e77c26557bb7b2057661979809dc.
Implementation document: docs/99-phase-11.4-refund-authorization-and-tilopay-reconciliation.md.
Closure document: docs/102-phase-11.4-refund-acceptance-and-documentation-closure.md.
```

## Completed Work — Phase 11.4.1

### Phase 11.4.1 — Observed Tilopay Contract and Evidence-Based Reconciliation

Status: **Completed and accepted**

```text
Cases 1–16 were completed using sanitized processModification output plus Tilopay merchant-portal financial verification; case 17 established the `/consult` contract.
The accepted sandbox response contract is HTTP 200 + code 1101 + Transaction is approved + provider reference.
Known code 12 and 96 responses are rejected even when HTTP is 200 and an attempt reference exists.
Accepted responses remain PROCESSING; known rejected responses become FAILED; uncertain responses remain PROCESSING with no retry.
Sequential duplicate calls produced multiple refunds, so TRP Booking remains the mandatory idempotency owner.
A safe /consult observer returns bounded financial candidates, excludes the top-level wrapper, and preserves response shape without raw payload or secrets.
Consult reconciliation is valid only when the provider reference, order, normalized Refund/2 type, absolute amount, currency, code, and description match.
The admin UI locks consult-derived outcomes/references and uses portal verification for inconclusive evidence.
Type 3 remains outside the application refund path.
The original 11.4.1 correction added no migration; the 11.4.2 follow-up adds only the authorization-type migration. No dependency, environment variable, production execution, email, public mutation, or PMS behavior is added.
Correction document: docs/100-phase-11.4.1-observed-tilopay-contract-and-evidence-based-reconciliation.md.
Case 17 returned the original Payment plus approved and rejected Refund candidates in one response. Case 18 `consultTransactions` is not required. Accepted and inconclusive consult paths, portal fallback, backend tampering rejection, replay protection, and audit/state transitions passed. UI-4 rejected consult evidence is retained as a defensive synthetic path because known normal-flow provider rejections become FAILED during execution.
```

## Completed Work — Phase 11.4.2

### Phase 11.4.2 — Extraordinary Refund Authorization and Consult Evidence Lock

Status: **Completed and accepted**

```text
Refund authorization is persisted as LEGACY_UNSPECIFIED, STANDARD_POLICY, or EXTRAORDINARY.
Existing Refund rows migrate conservatively as legacy/unspecified while new rows default to standard policy.
Standard and legacy committed Refunds consume policy allowance; extraordinary Refunds bypass policy but never payment balance.
An extraordinary refund can be authorized while the Reservation is CONFIRMED or CANCELLED, including during an active stay, after policy allowance is exhausted, or when the applied policy amount is zero.
The admin form clearly identifies that an extraordinary refund is outside the cancellation policy, does not cancel the reservation, and requires a reason.
Conclusive consult evidence recognizes Refund/2 and locks outcome, source, final mode, and provider reference.
The server rejects source/outcome/reference manipulation when conclusive consult evidence exists.
All committed Refund types remain cumulatively bounded by the captured Payment amount.
Authorization type is included in provider and reconciliation audit metadata.
The existing Refund.authorizationType migration was applied and validated; no additional migration, dependency, environment variable, production execution, email, public mutation, or PMS behavior is added.
All acceptance scenarios passed, including CONFIRMED/CANCELLED compensation, policy-zero/policy-exhausted authorization, full and partial outcomes, unsupported Reservation/payment rejection, failed-balance release, consult field locking, manipulation rejection, replay protection, concurrency, and final entity/audit verification.
Accepted implementation commit: 06e857df9d36e77c26557bb7b2057661979809dc.
Implementation document: docs/101-phase-11.4.2-extraordinary-refund-authorization-and-consult-evidence-lock.md.
Closure document: docs/102-phase-11.4-refund-acceptance-and-documentation-closure.md.
```

## Completed Work — Phase 11.5.1

### Phase 11.5.1 — Strategy, Pricing, Independent Holds, and Financial-Adjustment Contract

Status: **Completed and accepted**

```text
The normal public pending-reservation hold remains exactly 15 minutes through PENDING_RESERVATION_HOLD_DURATION_MINUTES and Reservation.expiresAt.
The lifecycle-adjustment hold is a separate 60-minute future constant and uses LifecycleRequestHold.expiresAt; neither timer reads, aliases, or modifies the other.
Full date changes reprice the complete requested stay using current server-side pricing.
Stay extensions preserve originalTotal and charge only the added nights using current server-side pricing.
PENDING_REVIEW requests expire after 24 hours; requested dates cannot extend beyond 365 days from the Guatemala business date.
Positive differences require a linked Payment with purpose LIFECYCLE_ADJUSTMENT and an active 60-minute requested-date hold.
Zero differences complete without a payment or lifecycle hold.
Negative differences require an exact Refund authorization with the future LIFECYCLE_ADJUSTMENT authorization type; refund failure never restores old dates.
An approved adjustment payment that cannot complete its date transition requires a compensating lifecycle-adjustment refund while the original Reservation remains unchanged.
Only the current Reservation's own effective blockers may be excluded during quote validation; every unrelated reservation, calendar block, composed dependency, preparation buffer, and active lifecycle hold remains authoritative.
The current Reservation ID and CONFIRMED status remain unchanged after successful date changes and extensions.
No application code, Prisma schema, migration, dependency, environment variable, visible copy, payment request, date mutation, email delivery, or PMS behavior was added by 11.5.1.
Strategy base commit: 3d1487f31ca74fc5a41573b4ab206ce9ad838bb5.
Strategy document: docs/103-phase-11.5.1-date-change-extension-strategy-and-pricing-contract.md.
```


## In Progress — Phase 11.5.2

### Phase 11.5.2 — Admin Request Creation, Quote, and Availability Validation

Status: **In progress — backend acceptance passed; admin calendar correction 11.5.2.1 pending acceptance**

```text
Protected POST creation exists for DATE_CHANGE and STAY_EXTENSION requests.
The server validates CONFIRMED Reservation eligibility, supported ACTIVE property state, validated initial Payment, date rules, horizon, active cancellation/date-mutation conflicts, and expected Reservation.updatedAt.
Original Reservation/guest/date/pricing/currency snapshots are copied into typed ReservationLifecycleRequest columns.
DATE_CHANGE reprices the entire requested stay at the current nightly price.
STAY_EXTENSION preserves original pricing and adds only newly requested nights at the current nightly price.
Availability excludes only the current Reservation and retains every unrelated reservation, Airbnb/calendar block, maintenance/manual block, preparation buffer, composed dependency, and active lifecycle hold.
Successful requests remain PENDING_REVIEW; no Reservation, Payment, Refund, LifecycleRequestHold, provider, or email state changes.
Same UUID/same payload is idempotent; changed replay is rejected; serializable fencing protects concurrent creation.
The protected admin UI displays original/requested stay, quote, difference, pricing mode, availability evidence, request state, expiry, actor, channel, and reason in ES/EN.
Implementation base commit: e0b77658c74ee2d7a30c96f529d5f7f4451ab045.
Implementation document: docs/104-phase-11.5.2-admin-request-creation-quote-and-availability-validation.md.
```

Reported acceptance on 2026-07-30:

```text
All documented backend/local scenarios passed: positive/zero/negative DATE_CHANGE, STAY_EXTENSION pricing and invalid rules, own-reservation overlap, unrelated blockers, check-in/check-out boundaries, 365-day horizon, active request/cancellation conflicts, stale state, identical and altered replay, concurrency, 24-hour expiry, audit metadata, bilingual parity, and unchanged Reservation/Payment/Refund/Hold state.
A positive PENDING_REVIEW quote correctly did not create a Payment; that remains assigned to 11.5.3 after approval.
Property.checkOutTime is already used when valid, with end-of-day America/Guatemala fallback when null/blank/invalid.
The remaining blocker is the admin free-text date UX, corrected by 11.5.2.1.
```

## In Progress — Phase 11.5.2.1

### Phase 11.5.2.1 — Admin Availability Datepicker and Own-Reservation Exclusion UX

Status: **In progress — implementation prepared; reduced local/test acceptance pending**

```text
A styled date-range calendar replaces the admin YYYY-MM-DD free-text inputs.
A protected reservation-scoped blocked-dates endpoint derives property and exclusion server-side.
The calendar excludes only the current Reservation and its derived buffers while retaining all unrelated blockers.
DATE_CHANGE permits a complete replacement range.
STAY_EXTENSION keeps the original check-in fixed and permits only a later check-out.
Availability is loaded per month and retained while the request dialog remains open.
Availability-load failures prevent submission and use centralized ES/EN feedback.
No Payment, LifecycleRequestHold, Tilopay call, Reservation mutation, Refund, email, Prisma migration, dependency, environment variable, or public hold change is added.
Implementation base commit: 1a57fbbfb71533c16c8b58bceb8546a70a88599f.
Correction document: docs/105-phase-11.5.2.1-admin-availability-datepicker-and-own-reservation-exclusion.md.
```

Remaining acceptance:

```text
Run the reduced calendar matrix in docs/105, including own stay/buffers, unrelated blockers, date-change selection, fixed-start extension, month navigation, load failure, unchanged backend quote/isolation, public calendar regression, and ES/EN parity.
```

## Continuity Notes for New Conversations

Minimum context files:

```text
README.md
AGENTS.md
.env.example
package.json
prisma/schema.prisma
docs/10-phases.md
docs/11-progress-log.md
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
lib/admin/reservation-cancellation.ts
lib/admin/reservation-date-mutation.ts
types/admin-reservation-date-mutation.ts
lib/reservations/cancellation-policy.ts
types/admin-reservation-cancellation.ts
lib/admin/refunds.ts
lib/payments/tilopay-api-client.ts
types/admin-refund.ts
scripts/observe-tilopay-modification.ts
scripts/observe-tilopay-consult.ts
config/site.ts
lib/env/server.ts
lib/reservations/pending-holds.ts
lib/reservations/confirmation.ts
lib/email/arrival-instructions.ts
lib/admin/arrival-instructions.ts
types/admin-arrival-instructions.ts
types/reservation-pending-hold.ts
messages/es.ts
messages/en.ts
```


### Phase 11.4.2 scope correction — Extraordinary compensation without cancellation

```text
- Standard refunds remain bound to a completed cancellation request and frozen policy allowance.
- Extraordinary refunds use a dedicated reservation endpoint and the validated initial Payment; new records use lifecycleRequestId = null.
- Reservation.status may be CONFIRMED or CANCELLED and is never changed by refund authorization, execution, consultation, or reconciliation.
- A confirmed active stay may receive an authorized partial or full compensation without releasing availability.
- All committed refunds remain bounded by Payment.amount and protected by idempotency, serializable transactions, stale-state fences, and audit history.
- No additional migration is required beyond the existing Refund.authorizationType migration.
- Phase 11.6 requirements are now explicit: guest/admin cancellation emails after cancellation commit and guest/admin refund emails only after APPROVED reconciliation.
- Notification implementation, typed EmailNotification lifecycleRequestId/refundId links, templates, and orchestration remain deferred to 11.6.
```
