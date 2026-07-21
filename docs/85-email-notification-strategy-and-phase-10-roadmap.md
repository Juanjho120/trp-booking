# 85 — Email Notification Strategy and Phase 10 Roadmap

## Phase Record

```text
Phase: Phase 10 — Email Notifications
Subphase: 10.1 Email notification strategy and environment contract
Status: Completed
Strategy date: 2026-07-21
Base commit: 0c9df37380588ca9573a74faf3ce52a1b25a0654
Next subphase: 10.2 Persistence and Resend provider foundation
```

## Purpose

Define the complete Phase 10 implementation sequence before introducing provider credentials, database changes, templates, notification triggers, retry workers, or actual email delivery.

Phase 10 must add safe, bilingual, idempotent transactional emails without changing the existing payment-driven reservation-confirmation contract.

## Repository Findings

The current repository already contains an initial email persistence model:

```text
EmailNotification
EmailNotificationType
EmailNotificationStatus
```

The existing model records:

```text
reservationId
notification type
recipient
locale
status
provider message ID
sent timestamp
safe error message
created/updated timestamps
```

The current repository does not yet provide:

```text
- Resend dependency or server adapter
- Resend API-key or sender environment validation
- A permanent database deduplication key
- Safe concurrent worker claiming
- Retry counters or next-attempt scheduling
- Bilingual transactional email templates
- Confirmation-email notification intents
- Retry cron processing
- Admin email-delivery visibility
```

Two important persistence gaps were identified:

```text
1. The public pending-hold request carries locale = es|en, but Reservation does not persist the guest language preference.
2. EmailNotification does not have a permanent unique key identifying one intended email.
```

The existing reservation-confirmation service remains the only valid trigger boundary:

```text
Validated APPROVED payment
-> confirmReservationAfterApprovedPayment(paymentId)
-> Reservation.status = CONFIRMED
```

No public request, redirect parameter, browser callback, or email result may confirm a reservation.

## Phase 10 Email Scope

Initial automatic messages:

```text
RESERVATION_CONFIRMED
- Recipient: confirmed reservation guest
- Locale: reservation preferred locale
- Trigger: successful reservation confirmation after validated payment

ADMIN_NEW_RESERVATION
- Recipient: configured operational admin recipients
- Locale: configured admin locale
- Trigger: the same newly confirmed direct reservation
```

Later Phase 10 message:

```text
ARRIVAL_INSTRUCTIONS
- Recipient: confirmed reservation guest
- Trigger: approved pre-arrival schedule
- Timing and content ownership must be explicitly accepted before activation
```

Explicit initial non-goals:

```text
- No separate PAYMENT_APPROVED email; RESERVATION_CONFIRMED already communicates successful payment and confirmation.
- No automatic PAYMENT_FAILED or rejected-payment email in the initial MVP; repeated payment attempts could generate noisy or duplicate communication.
- No RESERVATION_CANCELLED, RESERVATION_DATES_UPDATED, STAY_EXTENSION_CONFIRMED, or REFUND_PROCESSED email before Phase 11 defines those business rules.
- No marketing email, newsletter, contact list, or campaign behavior.
- No PMS behavior.
```

The public payment-result and retry screens remain the immediate source of safe failed/rejected-payment guidance.

## Provider Decision

Resend is the Phase 10 transactional-email provider.

Provider rules:

```text
- Use the official Resend Node.js SDK server-side only.
- Never expose RESEND_API_KEY through NEXT_PUBLIC variables, browser bundles, logs, or responses.
- Production sending requires an approved verified domain or sending subdomain.
- Sender and reply-to addresses are environment-controlled so development/test configuration cannot accidentally impersonate production.
- Provider network calls must not execute inside the reservation-confirmation database transaction.
- Raw Resend errors and response payloads must not be persisted or shown to users/admins.
- Normalize provider failures into bounded internal error codes and safe messages.
```

`EmailNotification.status = SENT` means that Resend accepted the request and returned a provider message ID. It does not prove inbox delivery, opening, or reading.

Bounce, complaint, delivered, and opened webhook processing is not required for the initial Phase 10 MVP and may be evaluated during Phase 12 production readiness.

## Planned Environment Contract

Phase 10.2 will add conditional validation for:

```text
EMAIL_DELIVERY_MODE="disabled|test|production"
RESEND_API_KEY="server-side API key"
EMAIL_FROM_ES="Tu Refugio Perfecto <reservas@turefugioperfecto.com.gt>"
EMAIL_FROM_EN="Tu Refugio Perfecto <reservations@turefugioperfecto.com.gt>"
EMAIL_REPLY_TO_ES="reservas@turefugioperfecto.com.gt"
EMAIL_REPLY_TO_EN="reservations@turefugioperfecto.com.gt"
EMAIL_ADMIN_RECIPIENTS="admin@turefugioperfecto.com.gt"
EMAIL_ADMIN_LOCALE="es|en"
EMAIL_PUBLIC_BASE_URL="absolute HTTPS application URL"
EMAIL_TEST_RECIPIENT="safe recipient override used only in test mode"
```

Mode behavior:

```text
disabled
- Provider delivery is disabled.
- Useful for local work that does not test email delivery.
- No real recipient is contacted.

test
- Resend is enabled.
- All messages are redirected to EMAIL_TEST_RECIPIENT.
- Subjects must include a clear test prefix.
- The original intended recipient may appear only in safe test metadata/copy and never as an additional real recipient.

production
- Messages use the actual guest/admin recipient.
- Sender domain and public base URL must be production-safe.
- EMAIL_TEST_RECIPIENT must not override production recipients.
```

Environment validation must remain centralized in `lib/env/server.ts` and documented in `.env.example` without committing real secrets.

## Planned Persistence Contract

Phase 10.2 will introduce the minimum fields required for durable language selection, deduplication, safe retries, and worker claiming.

Reservation addition:

```text
preferredLocale String @default("es") @map("preferred_locale")
```

Rules:

```text
- Accept only es or en through application validation.
- Persist the existing pending-hold request locale when a new reservation is created.
- Reused active pending holds keep their originally persisted locale.
- Existing reservations receive the safe default es through the migration/default.
```

EmailNotification additions:

```text
deduplicationKey String @unique @map("deduplication_key")
attemptCount Int @default(0) @map("attempt_count")
lastAttemptAt DateTime? @map("last_attempt_at")
nextAttemptAt DateTime? @map("next_attempt_at")
processingStartedAt DateTime? @map("processing_started_at")
errorCode String? @map("error_code")
```

EmailNotificationStatus addition:

```text
PROCESSING
```

Existing fields remain:

```text
status
providerMessageId
sentAt
errorMessage
createdAt
updatedAt
```

`errorCode` and `errorMessage` must contain only normalized safe values. Raw provider objects, API keys, request headers, template HTML, and guest-sensitive payloads must not be stored there.

## Permanent Idempotency Contract

Resend idempotency keys protect repeated provider requests for a limited provider window, but the application database must provide permanent protection.

Stable key patterns:

```text
reservation-confirmed/<reservationId>/<normalized-recipient>
admin-new-reservation/<reservationId>/<normalized-recipient>
arrival-instructions/<reservationId>/<check-in-date>/<normalized-recipient>
```

Rules:

```text
- The same logical email always receives the same deduplication key.
- EmailNotification.deduplicationKey is unique in PostgreSQL.
- The same key is passed to Resend as its idempotency key.
- Random UUIDs must not be generated for retries of the same logical email.
- A different payload must not reuse an existing key.
- Repeated confirmation callbacks may return the existing notification intent but must not create another message.
- Multiple admin recipients receive separate records and separate stable keys.
```

## Transaction and Delivery Boundary

Notification intent creation and external delivery are separate operations.

Required flow:

```text
1. Validated payment result reaches the existing confirmation service.
2. The database transaction confirms the reservation.
3. In the same transaction, idempotent guest/admin EmailNotification intents are inserted or reused.
4. The transaction commits.
5. A best-effort dispatcher may attempt immediate delivery after commit.
6. Any provider failure is caught, normalized, and recorded.
7. The guest payment-success redirect remains successful because the reservation is already confirmed.
8. The retry worker later processes eligible PENDING or FAILED notifications.
```

Forbidden flow:

```text
Database transaction
-> call Resend
-> wait on external network
-> commit or roll back reservation based on email result
```

An email failure must never:

```text
- Roll back Reservation.status = CONFIRMED
- Change Payment.status
- Clear confirmedAt
- Restore expiresAt
- Change availability or preparation buffers
- Redirect a successfully paid guest to a payment-failure result
```

## Template and Copy Architecture

Phase 10.3 will use React email components with inline email-safe styles through the Resend Node.js SDK.

Dependency rule:

```text
- Add resend as the provider dependency in Phase 10.2.
- Do not add @react-email/components during the initial implementation unless a concrete compatibility requirement justifies it.
- Reuse the project's existing React dependency.
```

Planned files:

```text
emails/components/email-layout.tsx
emails/reservation-confirmed-email.tsx
emails/admin-new-reservation-email.tsx
emails/email-text.ts
```

Copy rules:

```text
- Subjects, preview text, labels, paragraphs, CTA copy, and support text belong under an emails namespace in messages/es.ts and messages/en.ts.
- Templates receive typed reservation data and localized message objects.
- Do not create feature-local visible copy files.
- Include an explicit plain-text alternative.
- Format dates, times, and money using the notification locale.
- Use absolute URLs based on EMAIL_PUBLIC_BASE_URL.
- Reuse an approved brand asset with an absolute URL.
```

Guest confirmation content may include:

```text
- Reservation confirmed heading
- Reservation reference
- Accommodation name
- Guest name
- Check-in/check-out dates
- Guest count
- Arrival-time estimate when present
- Confirmed total and currency
- General support contact
- Clear statement that date changes require authorization or cancellation/new booking according to policy
```

It must not include:

```text
- Card number, CVV, expiration date, or tokenized card data
- Raw Tilopay references not intended for the guest
- Raw provider payloads or error details
- Internal admin notes
- Door/access codes committed in source code
- PMS-only operational data
```

Admin notification content may include the minimum operational reservation details and a protected admin reservation-detail link.

## Retry and Worker Strategy

Phase 10.5 will add a bounded cron processor protected by the existing `CRON_SECRET` pattern.

Planned endpoint:

```text
/api/cron/process-email-notifications
```

Worker rules:

```text
- Process a bounded batch.
- Atomically claim eligible rows by changing status to PROCESSING.
- Recover stale PROCESSING rows after a documented timeout.
- Increment attemptCount before or during each provider attempt.
- Record lastAttemptAt and calculate nextAttemptAt after retryable failure.
- Mark SENT only when a provider message ID is returned.
- Mark FAILED with a safe error code/message after failure.
- Stop automatic retries after a bounded maximum attempt count.
- Never retry SENT or SKIPPED rows.
- Reuse the existing stable idempotency key on every retry.
```

Exact batch size, maximum attempts, processing timeout, and backoff intervals will be centralized constants introduced in Phase 10.5.

## Admin Delivery Visibility

Phase 10.5 will extend the protected reservation detail with a read-only notification section.

Safe fields:

```text
notification type
intended recipient
locale
status
attempt count
last attempt
next attempt
sent timestamp
provider message ID
safe error code/message
```

The UI must not render:

```text
raw provider responses
API keys
authorization headers
full template HTML
provider request payloads
```

No manual resend button is included in the initial Phase 10 roadmap. The bounded retry worker remains the first recovery mechanism; a manual action can be proposed later with explicit audit and concurrency rules.

## Arrival Instructions Boundary

Phase 10.6 is intentionally separate from confirmation emails.

Before implementation, it must define:

```text
- How long before check-in the email is eligible
- Whether the lead time is global or property-specific
- Which instructions are public/static and which are sensitive
- Where operational content is owned and edited
- What happens for same-day bookings
- Whether a previously sent message is superseded after an authorized date change in Phase 11
```

No access code, lockbox code, private Wi-Fi credential, or other rotating secret may be committed to source-controlled messages or documentation.

## Explicit Phase 10 Roadmap

### 10.1 — Email notification strategy and environment contract

Status: **Completed**

```text
- Review current schema, confirmation trigger, locale flow, environment validator, brand configuration, and Phase 9.11 closure.
- Select Resend server-side provider contract.
- Define environment modes and planned keys.
- Define initial notification types and explicit deferrals.
- Define permanent application idempotency and provider idempotency.
- Define transaction, delivery, retry, copy, security, and admin-visibility boundaries.
- Update README and official trackers.
```

### 10.2 — Persistence and Resend provider foundation

Status: **Completed**

```text
- Add resend dependency.
- Add conditional email environment validation and .env.example entries.
- Add Reservation.preferredLocale.
- Add permanent EmailNotification deduplication and retry/claim fields.
- Add migration and regenerate Prisma Client.
- Persist locale during pending-hold creation.
- Add server-side provider adapter and safe error normalization.
- Do not send emails yet.
```

### 10.3 — Bilingual branded reservation-confirmation templates

Status: **In progress**

```text
- Add centralized ES/EN transactional email copy.
- Add shared branded React email layout.
- Add guest reservation-confirmation template and plain-text alternative.
- Add admin new-reservation template and plain-text alternative.
- Add typed template data builders and locale-aware formatting.
- Do not enqueue or deliver emails yet.
```

### 10.4 — Guest and admin confirmation notification orchestration

Status: **Not started**

```text
- Create guest/admin notification intents transactionally with a newly confirmed reservation.
- Reuse existing intents on idempotent confirmation callbacks.
- Attempt best-effort delivery only after commit.
- Keep successful payment/reservation behavior independent of provider delivery.
- Validate disabled, test-recipient, and production recipient routing.
```

### 10.5 — Retry processing and admin delivery visibility

Status: **Not started**

```text
- Add protected bounded cron processing.
- Add concurrency-safe claiming, retry backoff, stale-claim recovery, and attempt limits.
- Extend reservation detail with safe read-only notification history.
- Confirm no raw provider payload or secret reaches the admin UI.
```

### 10.6 — Arrival instructions scheduling and content

Status: **Not started**

```text
- Approve timing and same-day behavior.
- Approve public versus sensitive content ownership.
- Add idempotent ARRIVAL_INSTRUCTIONS intents and scheduling.
- Reuse the delivery/retry foundation.
- Keep future date-change behavior aligned with Phase 11.
```

### 10.7 — Validation and documentation closure

Status: **Not started**

```text
- Run environment, Prisma, lint, build, and manual end-to-end validation.
- Verify guest/admin bilingual delivery and permanent duplicate prevention.
- Verify provider failure never affects confirmed reservation/payment state.
- Verify test recipient override and production recipient behavior.
- Verify retry and admin visibility.
- Consolidate README and official trackers.
- Record deferred webhook/production-readiness items.
```

## Validation Gate for 10.1

This strategy subphase is documentation-only.

Validation:

```text
- AGENTS.md reviewed.
- docs/10-phases.md reviewed.
- docs/11-progress-log.md reviewed.
- docs/84-phase-9.11-validation-and-documentation-closure.md reviewed.
- Current base commit verified.
- Existing EmailNotification schema verified.
- Existing pending-hold locale input verified.
- Existing reservation-confirmation transaction verified.
- Existing site email configuration verified.
- No application code changed.
- No Prisma schema or migration changed.
- No dependency changed.
- No environment variable or credential added.
- No email sent.
- No PMS behavior added.
```

## Files Updated by 10.1

```text
README.md
docs/10-phases.md
docs/11-progress-log.md
docs/85-email-notification-strategy-and-phase-10-roadmap.md
```

## Phase 10.2 Implementation Note

Status: **Completed and accepted.**

The Phase 10.2 delivery implements the persistence and provider foundation defined by this strategy:

```text
- resend 6.17.2 dependency and lockfile update
- disabled, test, and production email environment modes
- stored Reservation.preferredLocale
- permanent EmailNotification.deduplicationKey
- PROCESSING status and retry/claim metadata
- safe normalized provider error codes
- typed server-side Resend adapter
- data-safe migration for historical reservations and notifications
```

The accepted 10.2 delivery does not create notification intents, connect email work to reservation confirmation, render templates, process retries, expose admin delivery UI, or send an email. Accepted commit: 5ad4f1c4c08a1f98691d0215dc5958fbe7542f72. Those remaining boundaries stay assigned to 10.3 through 10.5.

Detailed implementation record:

```text
docs/86-email-persistence-and-resend-provider-foundation.md
```

## Phase 10.3 Implementation Note

Status at delivery: **Implementation prepared; pending local validation and commit.**

The Phase 10.3 delivery implements the template and copy architecture defined by this roadmap:

```text
- matching emails namespaces in messages/es.ts and messages/en.ts
- shared email-safe React layout using inline styles and table markup
- approved primary logo resolved from an absolute public base URL
- typed and validated guest/admin reservation template data with preferred-locale enforcement for guest output
- locale-aware dates, Guatemala business timestamps, money, duration, guest counts, arrival time, and country names
- guest reservation-confirmation HTML and plain-text output
- admin new-reservation HTML and plain-text output with a protected admin detail link
```

The delivery does not create `EmailNotification` intents, alter reservation confirmation, call Resend, process retries, expose delivery history, add arrival scheduling, change Prisma, or add dependencies. Those responsibilities remain in 10.4 and later.

Detailed implementation record:

```text
docs/87-bilingual-branded-reservation-confirmation-templates.md
```
