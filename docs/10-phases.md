# 10 — Project Phases

This document defines the official implementation phases for TRP Booking and tracks the current progress at a high level.

## Status Legend

```text
Not started — Work has not begun.
In progress — Work has started but the phase is not complete.
Completed — Deliverables are implemented and committed.
Deferred — Intentionally postponed.
```

## Current Phase

```text
Current phase: Phase 11 — Cancellation, Refund, and Change Request Rules
Current subphase: 11.4 Refund authorization and Tilopay reconciliation — In progress
Current focus: validate cumulative refund authorization, sandbox processModification observations, uncertain-result handling, consult/portal reconciliation, payment financial-state transitions, idempotency, and unchanged cancelled reservation state
Last completed subphase: 11.3 Admin cancellation decision and availability release
11.3 accepted commit: c609ea0e5b4654da86436dba79477455681d7b14
11.3 implementation document: docs/98-phase-11.3-admin-cancellation-decision-and-availability-release.md
11.4 implementation document: docs/99-phase-11.4-refund-authorization-and-tilopay-reconciliation.md
Last completed phase: Phase 10 — Email Notifications
Phase 10 closure document: docs/94-phase-10-validation-and-documentation-closure.md
```

---

## Phase 8 — Reservation Flow

Status: **Completed**

Goal: Add the public direct reservation flow foundation using server-side validation, pending holds, guest details, seeded accommodation records, improved booking UX, manual locale selection, availability revalidation, and expired hold cleanup before payment integration.

Completed subphases:

```text
8.1 Reservation flow strategy and pending hold contract — Completed
8.2 Reservation quote and server-side pricing foundation — Completed
8.3 Public guest details and reservation request form — Completed
8.3.1 Initial seed and DB-backed accommodation source — Completed
8.3.2 Reservation form UX and manual locale switcher — Completed
8.4 Pending reservation creation and expiration handling — Completed
8.5 Availability revalidation before payment handoff — Completed
8.5.1 Pending hold expiration status cleanup — Completed
8.6 Phase 8 documentation update — Completed
```

---

## Phase 9 — Tilopay Sandbox Integration

Status: **Completed**

Goal: Add the Tilopay sandbox payment foundation on top of the completed Phase 8 reservation flow and close the operational payment, admin, availability, and preparation-buffer gaps required before Phase 10 email notifications.

Subphase status:

```text
9.1 Tilopay sandbox strategy and environment contract — Completed
9.2 Tilopay environment validation — Completed
9.3 Payment record creation for pending reservations — Completed
9.4 Tilopay SDK V2 checkout foundation — Completed
9.5 Tilopay redirect, consult, and OrderHash V2 validation foundation — Completed
9.6 Confirm reservation only after validated payment — Completed
9.6.1 Tilopay sandbox hardening, retryable payment errors, status localization, and checkout UX — Completed
9.7 Admin reservation and payment review — Completed
9.8 Automatic preparation buffers in availability — Completed
9.9 Admin preparation buffer settings and manual unlock behavior — Completed
9.9.1 Admin navigation and property calendar operations — Completed
9.10 Phase 9 documentation update and closure — Completed
```

Phase 9 rules preserved:

```text
- Do not store card data.
- Keep all Tilopay credentials server-side only.
- Do not expose raw provider payloads in public API responses.
- Do not set Reservation.status = CONFIRMED until payment validation succeeds.
- Keep failed/rejected payment states auditable.
- Do not send Resend emails in Phase 9.
- Do not add PMS features.
```

### Phase 9.4 result

```text
- Tilopay SDK V2 became the preferred checkout foundation.
- The backend obtains SDK access server-side and exposes only safe initialization data.
- Payment.providerReference stores the unique Tilopay order number.
- Card fields remain browser/SDK-managed and are never sent to the TRP Booking backend.
```

### Phase 9.5 result

```text
- Redirect handling resolves the payment by providerReference/orderNumber.
- Tilopay consult is executed server-side.
- OrderHash V2 is validated with HMAC-SHA256.
- Payment status can become APPROVED, REJECTED, or FAILED.
- Public result pages do not trust redirect parameters as final payment truth.
```

### Phase 9.6 result

```text
- Reservation confirmation is payment-driven and idempotent.
- Only an active PENDING_PAYMENT reservation with an APPROVED payment can become CONFIRMED.
- Reservation.confirmedAt is set and Reservation.expiresAt is cleared.
- Rejected and failed payments never confirm reservations.
```

### Phase 9.6.1 result

```text
- Tilopay preflight validation and sandbox hardening were added.
- Expired reservation confirmation is prevented.
- Retryable provider issues map to safe bilingual messages.
- Payment retry and result pages distinguish payment status from reservation status.
- SDK client failures are recorded using safe operational diagnostics.
- The public reservation flow guides the guest to the relevant quote, hold, payment, or error area.
```

### Phase 9.7 result

```text
- Protected admin visibility was added for reservations, payments, and safe SDK diagnostics.
- Visible statuses and copy are localized.
- Payment-driven confirmation remains the only confirmation path.
- No card number, CVV, expiration date, or tokenized card data is exposed.
```

### Phase 9.8 result

```text
- CONFIRMED reservations dynamically block stay dates and preparation-buffer ranges.
- Active PENDING_PAYMENT holds block stay dates and preparation buffers only while expiresAt > now.
- Expired holds, EXPIRED reservations, and PENDING_PAYMENT rows without expiresAt do not block availability.
- Property preparation settings and composed-listing dependency rules are used by availability.
- Confirmed buffers are represented consistently in future Airbnb iCal export calculations.
```

### Phase 9.9 result

```text
- Option B was selected: dynamic direct-reservation buffers plus auditable override records.
- Admin can configure preparation days before/after per accommodation from 0 through 30.
- A one-day PREPARATION_BUFFER CalendarBlock records each manual unlock.
- Availability and iCal export subtract only the matching override range.
- Reservation stay dates remain blocked.
- Property changes and unlock operations create AdminAuditLog records.
```

### Phase 9.9.1 result

```text
- A shared protected admin layout provides responsive sidebar navigation, optimistic active state, and route loading feedback.
- /admin remains a compact dashboard.
- Reservations and payments use dedicated searchable, filterable, paginated routes.
- Visible accommodation/status/payment-method selectors use the shared Radix design-system component.
- The Tilopay SDK-required tlpy_payment_method native field remains hidden and synchronized.
- The normal checkout and retry flow reuse the same stable Tilopay checkout component.
- Visa, Mastercard, and American Express acceptance indicators appear below the card-number field.
- Accommodation settings use a dedicated route.
- The property calendar shows direct reservations, active holds, Airbnb blocks, manual blocks, maintenance, preparation buffers, overrides, and composed-listing inheritance.
- New manual blocks are allowed only across fully available future dates and are revalidated server-side.
- Manual release, preparation unlock, and preparation restore preserve audit history.
- Successful and failed admin mutations use accessible auto-dismissing snackbars with distinct variants and manual dismissal.
```

### Phase 9.10 result

```text
- Phase 9 implementation and operational boundaries were consolidated in README and the official trackers.
- Phase 9.9.1 was marked completed after local implementation acceptance.
- The remaining operational Airbnb iCal setup and real E2E validation were explicitly deferred to production-readiness work.
- Phase 10 — Email Notifications became the next active phase.
```

Deferred Phase 9 operational item:

```text
Real Airbnb iCal import/export E2E validation requires secure operational external_calendars rows, real import URLs, and export tokens.
```

---

## Phase 9.11 — Admin MVP and Brand Identity Completion

Status: **Completed**

Goal: Close the documented MVP admin and brand-identity gaps before Phase 10 so public, admin, metadata, and future transactional email surfaces use the same approved brand system.

Subphase status:

```text
9.11.1-A Production raster assets — Completed
9.11.1-B Reusable brand components — Completed
9.11.1-C Application and metadata integration — Completed
9.11.1-D Responsive QA and documentation closure — Completed
9.11.2 Accommodation content management — Completed
9.11.3 Property photo management — Completed
9.11.4 Amenities and house rules — Completed
9.11.5 Reservation and payment detail views — Completed
9.11.6 Phase 9.11 validation and documentation closure — Completed
```

### Phase 9.11.1 result

```text
- Approved raster masters exist for the primary wordmark and icon-only mark.
- BrandLogo and BrandMark centralize runtime paths, intrinsic dimensions, aspect ratios, and accessibility defaults.
- The public header, public footer, admin navigation, and branded admin login use the reusable components.
- Next.js favicon, application icon, Apple touch icon, Open Graph, and Twitter metadata use the approved assets.
- Favicon-scale assets use only the mark without text.
- Long footer contact values wrap on narrow screens.
- The compact mobile admin header prioritizes menu, mark, and language controls without horizontal overflow.
- The branded admin sign-in page permits vertical scrolling on short displays.
- Auth.js authorization, Google OAuth verification, JWT roles, server-side admin allowlist, and safe callback behavior remain unchanged.
- Resend delivery and transactional email templates remain deferred to Phase 10.
```

### Phase 9.11.2 result

```text
- Authorized admins can edit bilingual property names, short descriptions, and long descriptions.
- Admins can edit maximum guests, bedroom count, bathroom count, check-in time, and optional check-out time.
- The existing /admin/accommodations page separates public content management from preparation-buffer settings.
- Slug, price, currency, status, composition, photos, amenities, rules, and preparation settings are not editable through the content editor.
- Zod validates the PATCH request and the service repeats normalization and domain validation.
- expectedUpdatedAt prevents an older browser tab from silently overwriting newer property content.
- PROPERTY_CONTENT_UPDATED audit rows record the actor, changed fields, and before/after values.
- Public accommodation pages already read Property content from PostgreSQL and therefore reflect accepted updates without a separate synchronization step.
- Soft-deleted or unsupported property records cannot be edited.
- No Prisma schema migration, photo management, amenity/rule management, pricing workflow, email delivery, or PMS behavior was added.
```

### Phase 9.11.3 result

```text
- Each supported accommodation has a protected /admin/accommodations/[propertyId]/photos route.
- Authorized admins can upload JPG, PNG, and WEBP files up to 10 MB with required bilingual alternative text.
- Image bytes upload directly from the browser to Cloudinary through a short-lived signed request; the Cloudinary API secret remains server-side.
- Finalization verifies the exact owned public ID, provider resource type, upload type, actual format, byte size, delivery URLs, and recent creation time before persistence.
- Active galleries support up to 40 photos, sequential ordering, exactly one cover, bilingual alt-text editing, and soft deletion.
- Structural mutations use an optimistic gallery revision and serializable transactions so stale tabs do not silently overwrite order, cover, or deletion changes.
- Deleting the cover promotes the first remaining ordered image; the final active photo cannot be deleted.
- PROPERTY_IMAGE_UPLOADED, PROPERTY_IMAGE_ALT_TEXT_UPDATED, PROPERTY_IMAGES_REORDERED, PROPERTY_IMAGE_COVER_CHANGED, and PROPERTY_IMAGE_SOFT_DELETED preserve AdminAuditLog history.
- Soft deletion retains the PropertyImage row and Cloudinary asset until a restore/permanent-purge lifecycle is explicitly approved.
- Public listing and detail pages already read active PropertyImage rows, isCover, sortOrder, and bilingual alt text from PostgreSQL.
- No Prisma migration, amenity/rule management, pricing workflow, reservation/payment action, email delivery, or PMS behavior was added.
```

### Phase 9.11.4 result

```text
- Shared catalog content is managed from /admin/catalogs with Amenities and House Rules tabs.
- Property-specific assignment remains under /admin/accommodations/[propertyId]/amenities-rules.
- Authorized admins can assign or unassign active amenities and house rules while preserving at least one of each per accommodation.
- Catalog content remains bilingual and amenity icons remain restricted to the approved typed icon catalog.
- Admins can create new amenity and house-rule catalog rows; new entries start unassigned.
- The server generates immutable runtime keys from the English label and safely resolves key collisions.
- Catalog updates and soft deletions use expectedUpdatedAt.
- Soft deletion removes replaceable membership rows, sets deletedAt/deletedById, and rejects any operation that would leave an accommodation without an active item in that domain.
- AMENITY_CREATED, AMENITY_CONTENT_UPDATED, AMENITY_SOFT_DELETED, HOUSE_RULE_CREATED, HOUSE_RULE_CONTENT_UPDATED, HOUSE_RULE_SOFT_DELETED, and PROPERTY_AMENITIES_RULES_UPDATED preserve AdminAuditLog history.
- Public accommodation pages read active assignments and bilingual catalog content from PostgreSQL.
- Selecting a local property photo produces an object-URL preview, and the admin can explicitly clear that selection before upload.
- Check-in and optional check-out values use styled 30-minute selectors and server-side validation.
- Static amenity ordering accepts runtime-created catalog keys without weakening the typed static icon catalog.
- No Prisma migration, catalog hard deletion, restore/purge UI, price/status editing, reservation/payment action, email delivery, or PMS behavior was added.
```

### Phase 9.11.5 result

```text
- /admin/reservations/[reservationId] provides a protected, read-only reservation detail view.
- /admin/payments/[paymentId] provides a protected, read-only payment detail view.
- Reservation and payment list cards expose localized detail actions.
- Reservation detail includes guest, stay, pricing, hold, and ordered payment-attempt information.
- Payment detail includes safe allowlisted diagnostics, parent reservation context, and ordered SDK client events.
- Reservation and payment detail pages provide cross-navigation without introducing mutation actions.
- Payment.rawPayload is processed only server-side and is never returned as raw JSON.
- PaymentClientEvent.sdkPayload is not selected or exposed.
- The implementation reuses centralized bilingual copy and localized statuses.
- No Prisma migration, seed change, reservation/payment mutation, email delivery, calendar mutation, refund action, date-change action, or PMS behavior was added.
```

### Phase 9.11.6 result

```text
- Phase 9.11 validation and accepted implementation boundaries are consolidated in README and the official trackers.
- Phase 9.11.5 is recorded as completed after the final list/detail route structure was reported working and committed.
- The authoritative closure record is docs/84-phase-9.11-validation-and-documentation-closure.md.
- Phase 10 — Email Notifications is the next official phase and must begin by defining explicit implementation subphases.
- No application code, visible UI copy, Prisma schema, migration, seed, dependency, provider credential, email delivery, reservation/payment mutation, or PMS behavior was added by the closure subphase.
```

---

## Phase 10 — Email Notifications

Status: **Completed**

Goal: Add safe, bilingual, idempotent email notifications for the direct-booking lifecycle without changing payment-driven reservation confirmation.

Subphase status:

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

Phase 10 rules:

```text
- Email delivery never determines payment approval.
- Email failure never rolls back or downgrades a valid confirmed reservation.
- Provider network calls do not run inside the reservation-confirmation database transaction.
- Resend credentials, sender configuration, and recipient overrides remain server-side only.
- Permanent database deduplication is required in addition to provider idempotency.
- Transactional email copy and subjects remain centralized in messages/es.ts and messages/en.ts.
- Email records retain safe delivery-attempt history without raw provider payloads or secrets.
- Initial automatic emails are RESERVATION_CONFIRMED and ADMIN_NEW_RESERVATION.
- PAYMENT_APPROVED is not sent separately because the reservation-confirmation email already communicates success.
- Automatic rejected/failed-payment emails are deferred from the initial MVP to avoid duplicate or noisy messages across payment retries.
- Cancellation, refund, date-change, stay-extension, and related Phase 11 emails remain deferred.
- Arrival instructions use approved property-specific timing and database-owned bilingual content; rotating secrets are never stored in source-controlled copy.
- No PMS behavior is added.
```

### Phase 10.1 result

```text
- The current repository and Phase 9.11 closure were reviewed before defining email architecture.
- EmailNotification already provides the initial audit record, but it lacks a permanent deduplication key and retry-claim fields.
- The public booking locale reaches pending-hold creation but is not currently persisted on Reservation.
- The reservation-confirmation service remains the only valid business trigger after an APPROVED payment.
- Resend is selected as a server-side provider through the official Node.js SDK.
- The database will own permanent deduplication; the stable database key will also be sent as the Resend idempotency key.
- Notification intents will be created transactionally with reservation confirmation, while provider delivery occurs only after commit.
- Test and production recipient behavior will be controlled through validated server-side environment configuration.
- Bilingual React email templates will reuse the approved brand assets and centralized ES/EN copy without introducing a second visible-copy source.
- The explicit Phase 10 roadmap is documented in docs/85-email-notification-strategy-and-phase-10-roadmap.md.
- No application code, Prisma schema, migration, dependency, environment variable, credential, email delivery, or PMS behavior was added in 10.1.
```

### Phase 10.2 result

```text
- resend 6.17.2 is added as the only provider dependency.
- Reservation.preferredLocale stores es or en and existing rows default safely to es.
- EmailNotification gains a permanent unique deduplicationKey and PROCESSING status.
- attemptCount, lastAttemptAt, nextAttemptAt, processingStartedAt, and errorCode support later bounded retry processing.
- Existing EmailNotification rows receive deterministic legacy/<id> keys before the NOT NULL and UNIQUE constraints are applied.
- lib/env/server.ts validates disabled, test, and production email modes without requiring a provider key while delivery is disabled.
- Test mode redirects every intended recipient to one validated EMAIL_TEST_RECIPIENT.
- Production mode requires HTTPS links and official-domain sender/reply-to addresses.
- A typed server-side Resend adapter uses the database key as the provider idempotency key and normalizes failures into safe internal codes.
- The existing pending-hold service persists the request locale only when creating a new hold; reused holds keep their original stored locale.
- No email template, notification intent, confirmation trigger, retry worker, admin delivery view, or real email send is activated in 10.2.
- Detailed implementation and migration guidance is documented in docs/86-email-persistence-and-resend-provider-foundation.md.
- The accepted implementation was committed as 5ad4f1c4c08a1f98691d0215dc5958fbe7542f72.
```

### Phase 10.3 result

```text
- messages/es.ts and messages/en.ts gain matching transactional-email namespaces for guest and admin confirmation messages.
- A shared React email layout uses email-safe table markup, inline styles, absolute brand URLs, and the approved primary logo.
- buildReservationConfirmedEmail returns the bilingual guest subject, HTML, and plain-text alternative.
- buildAdminNewReservationEmail returns the bilingual administrative subject, HTML, and plain-text alternative with a protected reservation-detail link.
- A strict typed input contract and Zod validation normalize reservation data before rendering; guest output must match the stored preferred locale.
- Dates, stay length, guest count, arrival time, currency, country, and confirmation timestamps are formatted by locale.
- Guest output excludes admin links, raw provider data, card information, access codes, and PMS-only content.
- No EmailNotification intent, reservation-confirmation hook, provider call, retry worker, migration, or dependency change is added.
- The implementation record is docs/87-bilingual-branded-reservation-confirmation-templates.md.
- The accepted implementation was committed as 7f6510d3e152caccefa42d9a2f5f75dbf747a22e.
```

### Phase 10.4 result

```text
- The payment-driven confirmation service creates or reuses one guest intent and one intent per configured admin recipient in the same database transaction that confirms the reservation.
- Existing APPROVED callbacks use the same confirmation service and therefore backfill or reuse missing intents idempotently.
- Permanent deduplication keys follow reservation-confirmed/<reservationId>/<recipient> and admin-new-reservation/<reservationId>/<recipient>.
- Provider delivery starts only after the transaction commits.
- Immediate delivery atomically claims PENDING rows as PROCESSING before rendering or calling Resend.
- The stored recipient always remains the intended guest/admin recipient; test-mode rerouting stays inside the provider adapter.
- SENT requires a provider message ID. Safe template/provider failures become FAILED without changing Payment or Reservation.
- Disabled or invalid email configuration leaves intents PENDING and returns the existing successful confirmation result.
- The accepted implementation and follow-ups are recorded through 6f7bdc3c6027d6be8b4fcdfe027c57b01dfef50d.
- FAILED retries, nextAttemptAt scheduling, stale claims, bounded attempt limits, cron processing, and admin visibility remain in 10.5.
- Manual resend remains outside the initial Phase 10 roadmap.
- No Prisma schema, migration, environment variable, dependency, arrival scheduling, or PMS behavior is added.
- The implementation record is docs/88-guest-admin-confirmation-notification-orchestration.md.
```

### Phase 10.5 result

```text
- A CRON_SECRET-protected /api/cron/process-email-notifications endpoint processes a maximum of 20 due rows per execution.
- Retryable errors use centralized 5-minute, 15-minute, 1-hour, and 6-hour delays with a maximum of 5 total attempts.
- PROCESSING claims older than 10 minutes are eligible for safe recovery; exhausted stale claims become terminal FAILED rows.
- Atomic updateMany claims and processingStartedAt ownership tokens prevent concurrent or stale workers from finalizing the same row.
- The worker never retries SENT or SKIPPED notifications and reuses the permanent deduplication key as the Resend idempotency key.
- Existing retryable FAILED rows with no nextAttemptAt remain eligible, preserving compatibility with failures created before 10.5.
- Reservation detail now includes safe read-only notification history with localized type/status labels and bounded diagnostics.
- No raw provider payload, secret, schema migration, dependency, arrival scheduling, or PMS behavior was added.
- Local retry, stale-claim, maximum-attempt, concurrency, idempotency, admin-visibility, and payment/reservation isolation tests were accepted.
- Accepted commits: 1d3b02f6ae5fe37bd850a0ede0227e7173628aa1 and f77625f1d95095d7ebfd270007e1cbc54b667762.
- The implementation record is docs/91-email-retry-processing-and-admin-delivery-visibility.md.
```

### Phase 10.5.1 result

```text
- Eligible PENDING, FAILED, and SENT confirmation notifications expose a protected manual action.
- Each request creates a separate MANUAL EmailNotification with a new deduplication key, parent linkage, requesting admin, requested timestamp, and AdminAuditLog entry.
- Existing source delivery history is not rewritten; automatic and immediate claims require both no manual child and the source version observed during discovery.
- PROCESSING, SKIPPED, unsupported types, and notifications for non-confirmed reservations are rejected.
- A client-generated request UUID makes API retries idempotent and concurrent duplicate submissions resolve to one manual row.
- A styled Sheet and centralized ES/EN copy distinguish retry from sending another copy and warn about duplicate delivery after SENT.
- Manual delivery runs only after the creation transaction and reuses the existing provider, template, claim, failure, and retry pipeline.
- No raw provider payload, secret, payment mutation, reservation mutation, arrival scheduling, dependency, or PMS behavior is added.
- Local recovery, duplicate-warning, request-idempotency, concurrency, audit, and payment/reservation isolation tests were accepted.
- Accepted commit: 355c72490d416a257b9827d31c67223a97200491.
- The implementation record is docs/92-manual-resend-and-delivery-recovery-controls.md.
```

### Phase 10.6 result

```text
- PropertyArrivalInstructions stores an enabled flag, 1–168-hour lead time, exact address, optional HTTPS map URL, and bilingual ES/EN operational instructions.
- The accepted default is 48 hours before the property's configured check-in time in America/Guatemala.
- Reservations confirmed inside the lead window become immediately eligible. Same-day confirmations remain eligible even after the configured check-in time; only reservations whose check-in date is before the current date in America/Guatemala do not create a new intent.
- Reservation confirmation creates an idempotent ARRIVAL_INSTRUCTIONS intent inside the existing transaction when configuration is complete.
- A CRON_SECRET-protected scheduler runs every 30 minutes and backfills upcoming confirmed reservations within the maximum lead-time horizon.
- EmailNotification stores scheduledFor, a reservation check-in snapshot, and the arrival-settings version.
- Deduplication includes reservation, check-in date, settings version, and intended recipient; stale versions are marked SKIPPED before provider delivery.
- The bilingual branded email contains schedule, exact address, optional map link, approved operational instructions, active bilingual house rules, and support contact.
- RESERVATION_CONFIRMED and ARRIVAL_INSTRUCTIONS render the accommodation's active assigned house rules in the guest's stored locale at delivery time.
- Admin editing is optimistic, audited, and warns against storing access codes, lockbox codes, Wi-Fi passwords, or other rotating secrets.
- The existing worker, retry limits, Resend idempotency, test routing, and read-only delivery history are reused.
- No payment mutation, reservation confirmation change, new dependency, environment variable, or PMS behavior is added.
- Accepted implementation and follow-up commits run from e75a50f6b7a929ff1e167c590284086c6259130b through 17be3fdf752a10932bae3f7192f55b16d80ac8e3.
- The implementation record is docs/93-arrival-instructions-scheduling-and-content.md.
```

### Phase 10.7 result

```text
- Phase 10 local/test acceptance evidence and final operational boundaries are consolidated in README and the official trackers.
- The closure records successful bilingual confirmation/admin delivery, permanent deduplication, bounded retry, stale-claim recovery, manual resend, arrival scheduling, same-day eligibility, version/date supersession, and active house-rule rendering.
- Email failures remain isolated from approved Payment and confirmed Reservation state.
- Real production-recipient delivery and provider webhook observability remain deferred to Phase 12 Production Readiness.
- Phase 11 becomes the next official phase and must begin by defining explicit cancellation, refund, authorized date-change, and stay-extension subphases.
- The authoritative closure record is docs/94-phase-10-validation-and-documentation-closure.md.
- No application code, visible UI copy, Prisma schema, migration, seed, dependency, credential, provider call, payment/reservation mutation, or PMS behavior is added by 10.7.
```

---

## Phase 11 — Cancellation, Refund, and Change Request Rules

Status: **In progress**

Goal: Add safe, auditable, idempotent cancellation, refund, authorized date-change, and stay-extension workflows without creating unrestricted guest self-service mutation or expanding TRP Booking into a PMS.

Subphase status:

```text
11.1 Lifecycle strategy, policy, and provider boundary — Completed
11.2 Lifecycle request persistence and audit foundation — Completed
11.3 Admin cancellation decision and availability release — Completed
11.4 Refund authorization and Tilopay reconciliation — In progress
11.5 Authorized date changes and stay extensions — Not started
11.6 Lifecycle notifications and admin operational history — Not started
11.7 Validation and documentation closure — Not started
```

Phase 11 rules:

```text
- Reservation status owns the stay and availability lifecycle; Payment and Refund own financial reversals.
- Guests do not edit confirmed dates directly from the public website.
- Initial cancellation/change/extension requests are recorded and decided by authorized admins.
- Cancellation and refund are separate, auditable decisions.
- Refund failure never restores a cancelled reservation or rewrites historical attempts.
- The approved cancellation matrix returns 100% at 7 or more days before check-in, 50% from 72 hours through less than 7 days, and 0% below 72 hours.
- Policy timing uses the property's configured check-in time in America/Guatemala.
- Full and partial refunds cannot exceed the validated captured payment amount.
- Tilopay officially documents POST /api/v1/processModification with type 2 for refund and type 3 for reversal.
- Sandbox responses, errors, duplicate behavior, retries, and idempotency are validated in 11.4 before production execution.
- Merchant-portal processing remains an operational fallback.
- Authorized date changes and extensions revalidate availability, composed dependencies, buffers, and server-side pricing.
- A positive financial difference must be paid before new dates are applied.
- Lifecycle emails are created only after the underlying transition commits and never determine that transition.
- No hard deletion, raw provider exposure, card-data handling, unauthenticated lifecycle mutation, or PMS behavior is added.
```

### Phase 11.1 result

```text
- The current schema already contains cancellation/refund statuses, Refund persistence, cancelledAt, AdminAuditLog, and reserved lifecycle email types.
- No typed lifecycle request record, old/new snapshot, adjustment-payment relation, or temporary requested-date hold currently exists.
- New flows must not set an active reservation to PARTIALLY_REFUNDED because current availability uses CONFIRMED as the active direct-reservation blocker.
- Cancellation changes Reservation to CANCELLED; Payment and Refund record full/partial financial reversals.
- Guests request authorization through approved support channels; the initial MVP has no insecure public mutation or lookup endpoint.
- The approved cancellation matrix is 100% refund at 7 or more days before check-in, 50% from 72 hours through less than 7 days, and 0% below 72 hours.
- Same-day, after-check-in, and no-show cancellations fall in the standard 0% window unless a separately approved exception is recorded.
- Date changes preserve the original reservation ID/history and apply only after final availability validation and any required additional payment.
- Stay extensions are specialized date changes and require availability validation plus the price difference when applicable.
- Official Tilopay documentation defines POST /api/v1/processModification, bearer authentication, orderNumber, amount, key, type 2 refund, and type 3 reversal.
- Response/error/idempotency/sandbox validation is intentionally assigned to 11.4 and will be recorded from actual endpoint tests before production execution.
- The strategy record is docs/95-phase-11-lifecycle-strategy-and-roadmap.md.
- The corrective record is docs/96-phase-11.1-cancellation-policy-and-tilopay-refund-contract-correction.md.
- Fee treatment, admin exception authority, and exact date-change repricing remain explicit decisions for their corresponding implementation subphases.
- No application code, visible UI copy, Prisma schema, migration, seed, dependency, environment variable, provider request, lifecycle mutation, or PMS behavior is added by 11.1 or its correction.
```

### Phase 11.2 result

```text
- ReservationLifecycleRequest persists typed cancellation, date-change, and stay-extension requests with request state, actors, timestamps, snapshots, idempotency, and optimistic concurrency.
- PaymentPurpose distinguishes initial reservation payments from lifecycle adjustment payments.
- LifecycleRequestHold persists requested-date holds and participates in availability and preparation buffers only while active and unexpired.
- Refund status and processing mode are separated without silently reinterpreting historical records.
- Reservation REFUNDED and PARTIALLY_REFUNDED values remain historical compatibility states and are not used by new active-stay flows.
- The accepted implementation commit is 2495aa891fd26938550960f94fdbea700151350f.
- The implementation record is docs/97-phase-11.2-lifecycle-request-persistence-and-audit-foundation.md.
```

### Phase 11.3 result

```text
- Authorized admins can record an idempotent cancellation request from reservation detail using an approved support channel.
- The server snapshots the confirmed reservation, validated initial payment, and exact 100% / 50% / 0% policy result using the property check-in time in America/Guatemala.
- Approval changes Reservation from CONFIRMED to CANCELLED and completes the request inside a serializable transaction.
- Rejection preserves the confirmed reservation and availability.
- Cancellation releases dynamic stay and preparation-buffer availability without deleting operational history.
- Pending and failed arrival-instruction notifications become SKIPPED; existing SENT history remains unchanged.
- Refund creation, Tilopay execution, payment financial-state changes, and lifecycle emails remain deferred.
- Local/test cancellation, policy-boundary, concurrency, idempotency, availability-release, and arrival-supersession tests were reported successful.
- The accepted implementation commit is c609ea0e5b4654da86436dba79477455681d7b14.
- The implementation record is docs/98-phase-11.3-admin-cancellation-decision-and-availability-release.md.
```

### Phase 11.4 implementation prepared

```text
- Authorized admins can create idempotent full/partial PENDING Refund records within both the frozen policy allowance and captured-payment balance.
- PENDING, PROCESSING, APPROVED, and historical MANUAL amounts participate in cumulative protection; confirmed FAILED attempts remain historical but release their reserved balance.
- Tilopay processModification type 2 execution is sandbox-only and occurs only after the Refund transaction commits.
- Unknown provider responses and timeouts remain PROCESSING and require explicit reconciliation; they are never blindly retried or treated as success.
- Existing Tilopay consult and audited portal evidence can reconcile APPROVED/FAILED outcomes.
- Payment changes to PARTIALLY_REFUNDED or REFUNDED only after an approved reconciliation; Reservation remains CANCELLED.
- Safe diagnostics expose bounded codes, descriptions, references, and response shapes without raw provider values or credentials.
- No Prisma migration, dependency, environment variable, refund email, public mutation endpoint, or PMS behavior is added.
- Real sandbox full/partial/reversal/error/duplicate/timeout observations remain required before 11.4 completion or production API execution.
- The implementation record is docs/99-phase-11.4-refund-authorization-and-tilopay-reconciliation.md.
```

---

## Phase 12 — Production Readiness

Status: **Not started**
