# 11 — Progress Log

This document is the official progress tracker for TRP Booking. Update it whenever a phase or subphase changes status.

## Current Status

```text
Current phase: No active implementation phase — Phase 11 is completed and Phase 12 is not activated
Current subphase: None
Current focus: complete a bounded polish of the admin reservations page, then review and prioritize the requested system improvements before activating Phase 12
Last updated: 2026-08-05
Last completed subphase: 11.7 Validation and documentation closure
11.6.5 implementation and accepted head: 6a14fa7f8dd39765bb782b59c737436465ca3e0f
11.6.5 acceptance: All 15 protected-history, ordering, relation, retry, ES/EN, responsive, security, and integrated criteria passed on 2026-08-05
11.6.5 implementation and acceptance document: docs/119-phase-11.6.5-protected-operational-history-and-acceptance.md
11.6 status: Completed and accepted
11.6 accepted feature head: 6a14fa7f8dd39765bb782b59c737436465ca3e0f
11.6 closure record: docs/119-phase-11.6.5-protected-operational-history-and-acceptance.md
11.7 status: Completed and accepted
11.7 acceptance: All 15 reduced cross-phase and technical-validation criteria passed on 2026-08-05
11.7 validated closure base: 16cca9e63f5fd8d8af590fc1211dbc69d642f1f6
Phase 11 accepted feature head: 6a14fa7f8dd39765bb782b59c737436465ca3e0f
Phase 11 closure document: docs/120-phase-11.7-validation-and-documentation-closure.md
Next planned phase: Phase 12 — Production Readiness
Phase 12 status: Not started; activation intentionally deferred until the bounded admin-reservations polish and improvement review are complete
11.5.1 strategy base commit: 3d1487f31ca74fc5a41573b4ab206ce9ad838bb5
11.5.1 strategy document: docs/103-phase-11.5.1-date-change-extension-strategy-and-pricing-contract.md
11.5.1 accepted commit: e0b77658c74ee2d7a30c96f529d5f7f4451ab045
11.5.2 implementation document: docs/104-phase-11.5.2-admin-request-creation-quote-and-availability-validation.md
11.5.2 implementation commit: 1a57fbbfb71533c16c8b58bceb8546a70a88599f
11.5.2 acceptance: Completed on 2026-07-30 after backend and reduced calendar matrices passed
11.5.2.1 correction document: docs/105-phase-11.5.2.1-admin-availability-datepicker-and-own-reservation-exclusion.md
11.5.2.1 implementation commit: ab432fdc1e9d3ffb1ff868fd43a6fe70c5999a5e
11.5.2.1 type-safety follow-ups: f57a777f26ab919e95098dfc13ee11b44f423b02, 56023423f4545914f43856ea44398e8d90301820
11.5.2/11.5.2.1 accepted head: 56023423f4545914f43856ea44398e8d90301820
11.5.2/11.5.2.1 closure document: docs/106-phase-11.5.2-and-11.5.2.1-acceptance-closure.md
11.5.3 implementation commit: bf216e7796151d10a01902efac9dea8d36f29f31
11.5.3 type-safety follow-up: 9130831029441e024ebd3bc93e4f1e7904ca99c1
11.5.3 implementation document: docs/107-phase-11.5.3-approval-hold-and-adjustment-payment.md
11.5.3 functional matrix: Passed on 2026-08-03
11.5.3.1 accepted head: ece97aa72aec1b0c1eb13f2d21b6b8d862d9c4d4
11.5.3.1 correction document: docs/108-phase-11.5.3.1-transaction-resilience-and-datepicker-positioning.md
11.5.3/11.5.3.1 closure document: docs/109-phase-11.5.3-and-11.5.3.1-acceptance-closure.md
11.5.4 implementation and accepted head: c996716aaad897c4e583a0d83b31b87bfece8e08
11.5.4 implementation document: docs/110-phase-11.5.4-final-positive-zero-completion.md
11.5.4 functional matrix: Passed on 2026-08-03; all 17 criteria passed
11.5.4 closure document: docs/111-phase-11.5.4-acceptance-closure.md
11.5.5 implementation commit: e1e62859bc76a19ba0afb79e397f30b4e8c396fa
11.5.5 type-safety follow-ups: 5abf48d8ccb5c9f5484de0dca28ca1a546bf8b80, da7bd89acb623da6d7788e3cc9d392710cefc145
11.5.5 accepted head: da7bd89acb623da6d7788e3cc9d392710cefc145
11.5.5 implementation document: docs/112-phase-11.5.5-negative-and-compensating-lifecycle-refunds.md
11.5.5 functional matrix: Passed on 2026-08-04; all 24 criteria passed
11.5.5 closure document: docs/113-phase-11.5.5-acceptance-closure.md
11.5.6 integrated matrix: Passed on 2026-08-04; all 8 reduced end-to-end cases passed
11.5 accepted feature head: d1f43a34a27ba09b68ceee993581a11649cb1508
11.5 closure document: docs/114-phase-11.5-integrated-acceptance-and-documentation-closure.md
11.4 accepted implementation commit: 06e857df9d36e77c26557bb7b2057661979809dc
11.4 implementation document: docs/99-phase-11.4-refund-authorization-and-tilopay-reconciliation.md
11.4.1 correction document: docs/100-phase-11.4.1-observed-tilopay-contract-and-evidence-based-reconciliation.md
11.4.2 implementation document: docs/101-phase-11.4.2-extraordinary-refund-authorization-and-consult-evidence-lock.md
11.4 closure document: docs/102-phase-11.4-refund-acceptance-and-documentation-closure.md
Last completed phase: Phase 11 — Cancellation, Refund, and Change Request Rules
Phase 11 closure document: docs/120-phase-11.7-validation-and-documentation-closure.md
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

### Phase 9.11 — Admin MVP and Brand Identity Completion

Status: **Completed**

```text
BrandLogo and BrandMark are used across public, admin, sign-in, metadata, and favicon surfaces.
Accommodation content, Cloudinary photos, amenity and house-rule catalogs, assignments, and read-only reservation/payment details are protected, bilingual, validated, and audited.
Photo, catalog, and accommodation mutations preserve optimistic concurrency and soft-delete history.
No manual reservation confirmation, cancellation, refund, guest date mutation, payment override, email delivery, or PMS expansion was added.
Closure document: docs/84-phase-9.11-validation-and-documentation-closure.md.
```

### Phase 10.1 — Email Notification Strategy and Environment Contract

Status: **Completed**

```text
Database-owned permanent deduplication and provider idempotency were selected.
Provider network calls run only after the reservation-confirmation transaction commits.
Guest RESERVATION_CONFIRMED and ADMIN_NEW_RESERVATION are the initial automatic messages.
Transactional email copy remains centralized in messages/es.ts and messages/en.ts.
```

### Phase 10.2 — Persistence and Resend Provider Foundation

Status: **Completed**

```text
Added Resend 6.17.2, environment isolation, Reservation.preferredLocale, permanent notification deduplication, PROCESSING, retry metadata, and a safe server-side provider adapter.
No templates, notification intents, confirmation hooks, retry cron, admin email UI, or actual delivery were introduced by this subphase.
Accepted commit: 5ad4f1c4c08a1f98691d0215dc5958fbe7542f72.
```

### Phase 10.3 — Bilingual Branded Reservation-Confirmation Templates

Status: **Completed**

```text
Guest and admin confirmation subjects, HTML, and plain-text templates use centralized bilingual copy and the approved brand system.
Strict typed inputs and Zod normalization prevent unsafe provider, card, admin-only, or PMS data from appearing in guest output.
Accepted commit: 7f6510d3e152caccefa42d9a2f5f75dbf747a22e.
```

### Phase 10.4 — Guest and Admin Confirmation Notification Orchestration

Status: **Completed and accepted**

```text
Guest and per-admin notification intents are created or reused transactionally with reservation confirmation.
Provider delivery starts only after commit and atomically claims PENDING rows.
Repeated APPROVED callbacks reuse permanent deduplication keys.
Test mode preserves intended recipients while delivering only to EMAIL_TEST_RECIPIENT.
Accepted head: 6f7bdc3c6027d6be8b4fcdfe027c57b01dfef50d.
```

### Phase 10.5 — Retry Processing and Admin Delivery Visibility

Status: **Completed and accepted**

```text
A protected worker applies bounded retries, stale PROCESSING recovery, atomic claims, and maximum-attempt enforcement.
Reservation detail shows safe, localized delivery history.
Payment remains APPROVED and Reservation remains CONFIRMED when delivery fails.
Accepted commits: 1d3b02f6ae5fe37bd850a0ede0227e7173628aa1 and f77625f1d95095d7ebfd270007e1cbc54b667762.
```

### Phase 10.5.1 — Manual Resend and Delivery Recovery Controls

Status: **Completed and accepted**

```text
Eligible confirmation notifications can create separate audited MANUAL delivery rows without rewriting source history.
Client request IDs and unique keys make retries and concurrent submissions idempotent.
Manual delivery reuses the existing provider and bounded retry pipeline.
Accepted commit: 355c72490d416a257b9827d31c67223a97200491.
```

### Phase 10.6 — Arrival Instructions Scheduling and Content

Status: **Completed and accepted**

```text
Property-owned bilingual arrival settings, scheduling, templates, house-rule rendering, version/date supersession, and idempotent intent creation were added.
The existing worker, Resend provider, retry limits, test routing, and admin history are reused.
Rotating secrets and PMS behavior remain prohibited.
Implementation document: docs/93-arrival-instructions-scheduling-and-content.md.
```

### Phase 10.7 — Validation and Documentation Closure

Status: **Completed**

```text
Phase 10 implementation and local/test evidence are consolidated in README and official trackers.
Production-recipient delivery and provider webhook observability remain deferred to Phase 12.
Closure document: docs/94-phase-10-validation-and-documentation-closure.md.
```

### Phase 11.1 — Lifecycle Strategy, Policy, and Provider Boundary

Status: **Completed**

```text
Reservation owns stay and availability state; Payment and Refund own financial state.
Cancellation and refund are separate decisions.
The approved direct-booking cancellation matrix is 100% at 7 or more days, 50% from 72 hours to less than 7 days, and 0% below 72 hours.
Policy timing uses the property's check-in time in America/Guatemala.
Guests use approved support channels; no unauthenticated lifecycle mutation endpoint is introduced.
Tilopay processModification type 2 is the refund boundary; actual sandbox behavior was assigned to 11.4.
Strategy and correction documents: docs/95-phase-11-lifecycle-strategy-and-roadmap.md and docs/96-phase-11.1-cancellation-policy-and-tilopay-refund-contract-correction.md.
```

### Phase 11.2 — Lifecycle Request Persistence and Audit Foundation

Status: **Completed and accepted**

```text
ReservationLifecycleRequest owns typed request state, actors, snapshots, timestamps, idempotency, and optimistic concurrency.
PaymentPurpose distinguishes initial and adjustment payments.
LifecycleRequestHold participates in availability only while active and unexpired.
Accepted commit: 2495aa891fd26938550960f94fdbea700151350f.
Implementation document: docs/97-phase-11.2-lifecycle-request-persistence-and-audit-foundation.md.
```

### Phase 11.3 — Admin Cancellation Decision and Availability Release

Status: **Completed and accepted**

```text
Protected creation and decision flows snapshot the confirmed reservation, payment, and exact policy result.
Approval changes Reservation to CANCELLED and releases status-driven availability.
Rejection preserves the reservation.
Pending/failed arrival intents become SKIPPED while SENT history remains.
Accepted commit: c609ea0e5b4654da86436dba79477455681d7b14.
Implementation document: docs/98-phase-11.3-admin-cancellation-decision-and-availability-release.md.
```

### Phase 11.4 — Refund Authorization and Tilopay Reconciliation

Status: **Completed and accepted**

```text
Refund authorization is protected, idempotent, and bounded by policy and captured-payment balance.
Tilopay type-2 execution is sandbox-only and occurs after authorization commit.
Known rejected responses fail safely; uncertain or accepted-pending responses require evidence-backed reconciliation.
Only APPROVED reconciliation changes Payment financial state.
Extraordinary compensation is independent from cancellation and preserves CONFIRMED or CANCELLED Reservation status.
Accepted implementation commit: 06e857df9d36e77c26557bb7b2057661979809dc.
Closure document: docs/102-phase-11.4-refund-acceptance-and-documentation-closure.md.
```

### Phase 11.4.1 — Observed Tilopay Contract and Evidence-Based Reconciliation

Status: **Completed and accepted**

```text
The accepted sandbox success contract is HTTP 200, code 1101, approved description, and provider reference.
Codes 12 and 96 are rejected outcomes.
Sequential and concurrent provider duplicates prove that TRP Booking must own idempotency.
Consult reconciliation requires matching reference, order, Refund/2 movement, amount, currency when available, code, and description.
Correction document: docs/100-phase-11.4.1-observed-tilopay-contract-and-evidence-based-reconciliation.md.
```

### Phase 11.4.2 — Extraordinary Refund Authorization and Consult Evidence Lock

Status: **Completed and accepted**

```text
Refund.authorizationType distinguishes legacy, standard-policy, and extraordinary compensation.
Extraordinary refunds link to the validated initial Payment, may apply to CONFIRMED or CANCELLED reservations, and never change Reservation lifecycle status.
All committed refund types remain cumulatively bounded by Payment.amount.
Conclusive consult evidence locks outcome, source, mode, and provider reference.
Implementation document: docs/101-phase-11.4.2-extraordinary-refund-authorization-and-consult-evidence-lock.md.
```

### Phase 11.5.1 — Strategy, Pricing, Independent Holds, and Financial-Adjustment Contract

Status: **Completed and accepted**

```text
The public pending-reservation hold remains 15 minutes and is independent from the 60-minute lifecycle-adjustment hold.
Full date changes reprice the requested stay; extensions preserve original total and price only added nights.
Positive differences require an adjustment Payment and hold; zero requires neither; negative requires an exact lifecycle-adjustment refund path.
Approved adjustment payment that cannot complete requires compensation while original dates remain unchanged.
Strategy document: docs/103-phase-11.5.1-date-change-extension-strategy-and-pricing-contract.md.
```

### Phase 11.5.2 — Admin Request Creation, Quote, and Availability Validation

Status: **Completed and accepted**

```text
Protected request creation snapshots the confirmed Reservation and validated initial Payment, calculates authoritative pricing, and validates availability while excluding only the current Reservation.
Creation is idempotent, concurrent-safe, stale-fenced, audited, and bilingual.
Positive, zero, negative, timing, availability, and expiry matrices passed.
Implementation commit: 1a57fbbfb71533c16c8b58bceb8546a70a88599f.
Implementation document: docs/104-phase-11.5.2-admin-request-creation-quote-and-availability-validation.md.
```

### Phase 11.5.2.1 — Admin Availability Datepicker and Own-Reservation Exclusion UX

Status: **Completed and accepted**

```text
The styled admin range calendar excludes only the current Reservation and its derived buffers.
Every unrelated blocker remains disabled.
DATE_CHANGE, fixed-check-in STAY_EXTENSION, loading, failure protection, public-calendar regression, and ES/EN parity passed.
Accepted head: 56023423f4545914f43856ea44398e8d90301820.
Closure document: docs/106-phase-11.5.2-and-11.5.2.1-acceptance-closure.md.
```

### Phase 11.5.3 — Approval, Requested-Date Hold, and Adjustment Payment

Status: **Completed and accepted**

```text
Protected idempotent approval/rejection is implemented.
Positive approval creates one active 60-minute hold and one exact pending LIFECYCLE_ADJUSTMENT Payment.
Zero and negative approvals create no payment or hold at this boundary.
Opaque AES-256-GCM guest handoff isolates request, hold, payment, purpose, and expiration.
Tilopay SDK, preflight, telemetry, redirect, retry rotation, and hold expiry remain purpose-safe.
Functional matrix passed on 2026-08-03.
Implementation document: docs/107-phase-11.5.3-approval-hold-and-adjustment-payment.md.
```

### Phase 11.5.3.1 — Transaction Resilience and Admin Datepicker Positioning

Status: **Completed and accepted**

```text
Serializable transactions define 10-second maxWait and 20-second timeout.
P2034 conflicts retry complete idempotent transactions up to three times.
The availability calendar opens directly below its trigger.
First-attempt creation/decision and focused concurrency tests passed.
Accepted head: ece97aa72aec1b0c1eb13f2d21b6b8d862d9c4d4.
Closure document: docs/109-phase-11.5.3-and-11.5.3.1-acceptance-closure.md.
```

### Phase 11.5.4 — Final Positive/Zero Completion

Status: **Completed and accepted**

```text
Zero DATE_CHANGE and STAY_EXTENSION complete atomically inside approval with no Payment or hold.
Positive completion runs only after exact server-validated APPROVED LIFECYCLE_ADJUSTMENT payment evidence and an active matching hold.
The shared Serializable completion transaction revalidates immutable Reservation state, timing, requested pricing, availability, buffers, dependencies, payment, and hold.
Reservation.id, CONFIRMED, and confirmedAt are preserved while requested dates/pricing are applied.
Positive completion releases the hold; replay and concurrent completion are idempotent.
Stale snapshots, unrelated blockers, invalid holds, invalid Payments, and timing failures preserve original dates/prices.
Old PENDING/FAILED arrival intents become SKIPPED, SENT history remains, and at most one new eligible arrival intent is created.
The opaque completed page hides checkout and creates no additional attempt.
No lifecycle email is created and the public checkout and 15-minute hold remain unchanged.
All 17 acceptance criteria passed on 2026-08-03, including ES/EN parity and npm run build.
Implementation and accepted head: c996716aaad897c4e583a0d83b31b87bfece8e08.
Implementation document: docs/110-phase-11.5.4-final-positive-zero-completion.md.
Closure document: docs/111-phase-11.5.4-acceptance-closure.md.
```

### Phase 11.5.5 — Negative-Difference and Failed-Completion Refund Integration

Status: **Completed and accepted**

```text
Negative shortened-stay DATE_CHANGE requests apply requested dates/pricing and create one exact lifecycle-adjustment Refund against the initial Payment.
STAY_EXTENSION preserves check-in, moves check-out later, and prices only added nights; reducing nights is DATE_CHANGE.
Approved adjustment Payments whose final mutation cannot commit preserve original dates and create one exact compensating Refund.
Failed negative Refunds preserve completed dates; failed compensation preserves the approved adjustment Payment and original Reservation.
Replay, concurrency, evidence locking, balance protection, arrival supersession, public-hold regression, no-lifecycle-email boundary, and ES/EN parity passed.
All 24 acceptance criteria passed on 2026-08-04.
Accepted head: da7bd89acb623da6d7788e3cc9d392710cefc145.
Implementation record: docs/112-phase-11.5.5-negative-and-compensating-lifecycle-refunds.md.
Closure record: docs/113-phase-11.5.5-acceptance-closure.md.
```

### Phase 11.5.6 — Integrated Acceptance and Documentation Closure

Status: **Completed and accepted**

```text
The reduced integrated matrix passed all eight cases on 2026-08-04.
Positive DATE_CHANGE, positive STAY_EXTENSION, zero DATE_CHANGE, shortened-stay negative DATE_CHANGE, and failed-positive compensation completed with the accepted Payment/Refund ownership rules.
The 15-minute public hold and 60-minute lifecycle hold remained independent.
Availability, preparation buffers, composed-listing dependencies, arrival supersession, replay, concurrency, standard/extraordinary Refund regression, public checkout, ES/EN parity, and lifecycle-email deferral remained intact.
No application code change was required.
Accepted feature head: d1f43a34a27ba09b68ceee993581a11649cb1508.
Closure document: docs/114-phase-11.5-integrated-acceptance-and-documentation-closure.md.
```

## Completed Work — Phase 11.6.1

### Phase 11.6.1 — Notification Contract and Persistence Relations

Status: **Completed and accepted**

```text
The eight guest/admin lifecycle notification types and authoritative triggers are frozen.
EmailNotification has optional typed lifecycleRequestId and refundId relations while reservationId remains mandatory.
Stable normalized per-recipient deduplication keys are centralized for lifecycle-request and refund sources.
The migration preserved existing history and performed no historical backfill.
Prisma migration/generation, lint, build, and functional validation passed.
Accepted commit: 8996de10fadd676b1de41951e528c84aa6583f03.
Implementation document: docs/115-phase-11.6.1-lifecycle-notification-contract-and-persistence-relations.md.
```

## Completed Work — Phase 11.6.2

### Phase 11.6.2 — Bilingual Lifecycle Email Templates

Status: **Completed and accepted — technical validation**

```text
Eight branded guest/admin HTML and plain-text template builders are committed.
The user's checkout passed lint and build at 6eb4a18c9e7476266cae8c627318fa83ff27fb0d.
Manual subject, content, HTML/text, ES/EN, and inbox verification is intentionally consolidated into the integrated 11.6.3 matrix.
Implementation document: docs/116-phase-11.6.2-bilingual-lifecycle-email-templates.md.
```

## Completed Work — Phase 11.6.3

### Phase 11.6.3 — Transactional Intent Orchestration and Delivery

Status: **Completed and accepted**

```text
The integrated lifecycle inbox matrix passed successfully on 2026-08-04.
Guest/admin intent ownership, permanent deduplication, post-commit delivery, test routing, retries, stale recovery, replay safety, and failure isolation were accepted.
The accepted head is 5fed1ca0423190cd51a9c710d00c9216b65883a9.
Three follow-up observations were accepted for the next subphase without reopening the completed orchestration contract.
Implementation document: docs/117-phase-11.6.3-transactional-intent-orchestration-and-delivery.md.
```

## Completed Work — Phase 11.6.4

### Phase 11.6.4 — Lifecycle Adjustment Payment-Link Notifications and Email Corrections

Status: **Completed and accepted**

```text
Positive DATE_CHANGE and STAY_EXTENSION requests notify the guest with the private adjustment-payment link while preserving the original dates until payment and successful completion.
Guest SENT and terminal FAILED results create separate administrative delivery-result notifications without claiming inbox delivery or opening.
Protected manual sending, duplicate and active-delivery warnings, failed-only behavior, UUID idempotency, source preservation, and missing-intent worker recovery passed.
Completed DATE_CHANGE copy differentiates positive, zero, and negative financial branches; REFUND_PROCESSED remains the only final refund confirmation.
All 20 local, inbox, retry, idempotency, recovery, copy, security, and domain-isolation criteria passed on 2026-08-05.
Implementation commit: ffbed6b8c1b1d3dbd6fc61cee0e0c0f4d21d9c53.
Compilation fixes: 92e182e46796502335b8c3c171377c363d5521ae, 308721dd11f87e098cb639dca7356ebc35b0e67f.
Accepted head: 308721dd11f87e098cb639dca7356ebc35b0e67f.
Authoritative record: docs/118-phase-11.6.4-lifecycle-adjustment-payment-link-notifications-and-email-corrections.md.
```

## Completed Work — Phase 11.6.5

### Phase 11.6.5 — Protected Operational History and Acceptance

Status: **Completed and accepted**

```text
The protected reservation detail exposes one responsive, read-only operational timeline without creating a new persistence source.
Lifecycle requests, holds, initial and adjustment Payments, Refunds, EmailNotifications, retry state, manual parent/child links, source/result links, actors, and timestamps render through the accepted typed projection.
Deterministic descending ordering and the stable event-ID tie-breaker passed.
No-lifecycle empty state, cancellation, positive/zero/negative DATE_CHANGE, STAY_EXTENSION, compensating Refund, notification relations, retry states, existing recovery controls, ES/EN desktop/mobile behavior, and security boundaries passed.
Raw provider payloads, private tokens, credentials, card data, full email bodies, and unfiltered AdminAuditLog.metadata remain excluded.
No schema, migration, dependency, environment-variable, public endpoint, mutation action, or PMS behavior was added.
All 15 acceptance criteria passed on 2026-08-05.
Implementation and accepted head: 6a14fa7f8dd39765bb782b59c737436465ca3e0f.
Implementation and acceptance document: docs/119-phase-11.6.5-protected-operational-history-and-acceptance.md.
```

## Completed Work — Phase 11.6

### Phase 11.6 — Lifecycle Notifications and Admin Operational History

Status: **Completed and accepted**

```text
Phase 11.6.1 through 11.6.5 are completed and accepted.
Lifecycle notification contracts, bilingual templates, transactional intent orchestration, post-commit delivery, adjustment-payment links, delivery-result relations, retry/manual recovery, and protected operational history operate through the accepted Phase 10 foundation.
Email delivery remains isolated from Reservation, lifecycle-request, hold, Payment, Refund, and date-transition state.
Permanent deduplication, test routing, bounded retry, stale recovery, ES/EN output, source/result relations, manual parent/child history, safe diagnostics, and protected admin visibility were accepted.
No historical email backfill, guest self-service mutation, raw provider exposure, card-data handling, hard deletion, or PMS behavior was introduced.
Accepted feature head: 6a14fa7f8dd39765bb782b59c737436465ca3e0f.
Closure record: docs/119-phase-11.6.5-protected-operational-history-and-acceptance.md.
```

## Completed Work — Phase 11.7

### Phase 11.7 — Validation and Documentation Closure

Status: **Completed and accepted**

```text
All 15 reduced cross-phase criteria passed on 2026-08-05.
Cancellation policy boundaries, cancellation decisions, standard and extraordinary refunds, evidence-based reconciliation, positive/zero/negative/failed-positive date mutations, stay extensions, independent holds, availability, buffers, composed dependencies, lifecycle emails, retry/manual recovery, and protected operational history remained coherent.
ES/EN responsive and accessible output, centralized copy, safe diagnostics, restricted-data boundaries, idempotency, concurrency protection, and failure isolation passed.
Environment validation, Prisma generation/validation/migration status, lint, build, whitespace validation, and clean repository status passed.
No application code, schema, migration, seed, dependency, environment variable, or Phase 12 behavior was required.
Validated closure base: 16cca9e63f5fd8d8af590fc1211dbc69d642f1f6.
Accepted feature head: 6a14fa7f8dd39765bb782b59c737436465ca3e0f.
Authoritative closure record: docs/120-phase-11.7-validation-and-documentation-closure.md.
```

## Completed Work — Phase 11

### Phase 11 — Cancellation, Refund, and Change Request Rules

Status: **Completed and accepted**

```text
Phase 11.1 through 11.7 are completed and accepted as one coherent lifecycle feature.
Reservation owns stay and availability state; Payment and Refund own financial state; typed requests, holds, notifications, and bounded audit evidence preserve operational history.
Guest self-service lifecycle mutation, raw provider exposure, card-data handling, hard deletion, history rewrite, and PMS behavior remain excluded.
Phase 12 remains Not started by explicit decision.
The immediate next work is a bounded polish of the admin reservations page, followed by review and prioritization of the requested system improvements.
```

## Inter-Phase Work — Pre-Phase-12 Polish

Status: **Planned — not an official implementation phase**

```text
Scope begins with a small UX/UI polish of the protected admin reservations page.
A broader user-provided improvement list will then be reviewed, grouped, prioritized, and assigned to the appropriate future phase or bounded polish scope.
This work must preserve the accepted Phase 11 domain contracts and must not activate production credentials, webhooks, real-recipient email delivery, real Airbnb iCal operations, or other Phase 12 behavior.
Phase 12 will be activated explicitly only after this polish and improvement review are complete.
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
lib/admin/reservation-cancellation.ts
lib/admin/reservation-date-mutation.ts
lib/reservations/date-mutation-completion.ts
lib/reservations/lifecycle-adjustment-holds.ts
lib/payments/lifecycle-adjustment-handoff.ts
lib/reservations/cancellation-policy.ts
lib/admin/refunds.ts
lib/payments/tilopay-api-client.ts
lib/reservations/confirmation.ts
lib/reservations/pending-holds.ts
lib/email/arrival-instructions.ts
lib/admin/arrival-instructions.ts
types/admin-reservation-date-mutation.ts
types/admin-reservation-cancellation.ts
types/admin-refund.ts
types/reservation-confirmation.ts
types/reservation-pending-hold.ts
types/admin-arrival-instructions.ts
scripts/observe-tilopay-modification.ts
scripts/observe-tilopay-consult.ts
config/site.ts
lib/env/server.ts
messages/es.ts
messages/en.ts
```
