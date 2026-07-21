# 88 — Guest and Admin Confirmation Notification Orchestration

## Phase Record

```text
Phase: Phase 10 — Email Notifications
Subphase: 10.4 Guest and admin confirmation notification orchestration
Status: Implementation prepared; pending local validation and commit
Base commit: 7f6510d3e152caccefa42d9a2f5f75dbf747a22e
Strategy: docs/85-email-notification-strategy-and-phase-10-roadmap.md
Provider foundation: docs/86-email-persistence-and-resend-provider-foundation.md
Template foundation: docs/87-bilingual-branded-reservation-confirmation-templates.md
Next subphase after acceptance: 10.5 Retry processing and admin delivery visibility
```

## Purpose

Connect the accepted persistence, provider, and bilingual template foundations to the existing payment-driven reservation-confirmation boundary.

Phase 10.4 must create permanent notification intents in the same database transaction that confirms a reservation, then attempt immediate delivery only after that transaction commits. Rendering or provider failure must never downgrade an approved payment or a confirmed reservation.

## Existing Business Trigger

The only valid trigger remains:

```text
Validated APPROVED Tilopay payment
-> confirmReservationAfterApprovedPayment(paymentId)
-> Reservation.status = CONFIRMED
```

No browser query parameter, public request, email state, or provider result may confirm a reservation independently.

Both current APPROVED paths already use this service:

```text
- first validated payment result
- repeated/idempotent APPROVED callback
```

Phase 10.4 therefore adds orchestration at this shared service boundary instead of duplicating it in the route handler or Tilopay integration.

## Transaction Boundary

Required transaction flow:

```text
1. Read and validate the APPROVED payment.
2. Confirm the reservation or recognize that it is already CONFIRMED.
3. Insert or reuse the guest RESERVATION_CONFIRMED intent.
4. Insert or reuse one ADMIN_NEW_RESERVATION intent per configured admin recipient.
5. Commit the database transaction.
6. Attempt best-effort immediate delivery after commit.
7. Return the existing successful confirmation result regardless of delivery outcome.
```

The provider is never called from the Prisma transaction callback.

Intent persistence remains transactional because a newly confirmed reservation must have durable notification work before confirmation returns. External rendering and provider operations remain outside the transaction.

## Notification Intents

Initial intents:

```text
RESERVATION_CONFIRMED
- recipient: normalized reservation guest email
- locale: stored Reservation.preferredLocale
- one logical row per reservation and recipient

ADMIN_NEW_RESERVATION
- recipient: each normalized EMAIL_ADMIN_RECIPIENTS entry
- locale: EMAIL_ADMIN_LOCALE
- one logical row per reservation and admin recipient
```

When the raw admin recipient configuration is absent or unusable during intent creation, the official `siteConfig.emails.admin` address is the safe operational fallback. Enabled delivery still requires the complete validated email environment before a provider call can occur.

## Permanent Deduplication

Stable key patterns:

```text
reservation-confirmed/<reservationId>/<normalized-recipient>
admin-new-reservation/<reservationId>/<normalized-recipient>
```

Rules:

```text
- EmailNotification.deduplicationKey remains unique in PostgreSQL.
- Intent creation uses Prisma upsert by deduplicationKey.
- Repeated APPROVED callbacks return the existing intent rows.
- The same deduplication key is passed to Resend as the provider idempotency key.
- A different admin recipient gets a different row and key.
- Random retry keys are forbidden.
```

This gives permanent application-level duplicate protection while retaining provider-level protection for repeated network attempts.

## Immediate Delivery Claim

Before rendering or calling Resend, immediate delivery performs an atomic conditional update:

```text
WHERE id = notificationId AND status = PENDING
SET status = PROCESSING
    attemptCount = attemptCount + 1
    lastAttemptAt = now
    processingStartedAt = now
```

Only a process whose update count is exactly one owns the immediate attempt. Concurrent callbacks that cannot claim the row skip it.

Phase 10.4 immediately claims only `PENDING` rows. `FAILED` rows are intentionally left for the bounded retry strategy in 10.5.

## Template Data Loading

After a successful claim, the dispatcher loads only the reservation/property fields required by the accepted builders:

```text
reservation id
guest name/email/phone/country
stored preferred locale
property names in ES and EN
check-in/check-out dates
guest count
arrival-time estimate
confirmed total and currency
confirmed timestamp
```

The dispatcher then calls:

```text
buildReservationConfirmedEmail
buildAdminNewReservationEmail
```

No card data, raw Tilopay payload, raw Resend payload, access code, internal note, or PMS-only data is loaded into template input.

## Environment and Recipient Routing

### Disabled

```text
- Intents are created or reused.
- Rows remain PENDING.
- No provider is constructed or called.
- Payment and reservation success are unchanged.
```

### Test

```text
- EmailNotification.recipient keeps the actual intended guest/admin address.
- The existing provider adapter redirects every delivery to EMAIL_TEST_RECIPIENT.
- The test subject prefix remains provider-owned.
- Deduplication remains based on the intended recipient.
```

### Production

```text
- The actual intended recipient is delivered.
- The validated official-domain sender/reply-to and HTTPS public base URL are used.
- No test recipient override is allowed.
```

If enabled email configuration cannot be validated, immediate delivery returns an unavailable summary and leaves the durable intents PENDING for later recovery.

## Delivery Results

### Sent

A notification becomes `SENT` only after the provider returns a message ID:

```text
status = SENT
providerMessageId = returned Resend ID
sentAt = now
processingStartedAt = null
errorCode/errorMessage = null
```

`SENT` still means provider acceptance, not inbox delivery.

### Failed

Template/provider failures are normalized to safe codes and messages:

```text
status = FAILED
processingStartedAt = null
errorCode = bounded internal code
errorMessage = bounded safe message
nextAttemptAt = null until 10.5 defines backoff
```

Raw provider responses, headers, API keys, HTML payloads, and guest-sensitive request bodies are not persisted.

If even failure-audit persistence fails, the exception remains contained after confirmation. A stale `PROCESSING` row can later be recovered by the 10.5 stale-claim rules.

## Confirmation Result Contract

`confirmReservationAfterApprovedPayment` keeps its existing public return shape:

```text
paymentId
reservationId
reservationStatus
confirmedAt
alreadyConfirmed
phaseBoundary
```

Email delivery statistics are intentionally not exposed through the payment redirect. A guest with a validated approved payment must continue to the success result even if the email provider is disabled, unavailable, rate-limited, or rejects a message.

## Delivered Files

```text
lib/email/reservation-confirmation-notifications.ts
lib/email/index.ts
lib/reservations/confirmation.ts
types/email-notification.ts
docs/88-guest-admin-confirmation-notification-orchestration.md
README.md
docs/10-phases.md
docs/11-progress-log.md
docs/85-email-notification-strategy-and-phase-10-roadmap.md
docs/87-bilingual-branded-reservation-confirmation-templates.md
```

## Explicit Non-Goals

Phase 10.4 does not add:

```text
- retry cron endpoint
- automatic FAILED retries
- retry backoff intervals
- maximum-attempt constants
- stale PROCESSING recovery
- admin delivery-history UI
- manual resend action
- delivery/bounce/open webhooks
- arrival-instruction scheduling
- failed or rejected payment emails
- cancellation/refund/change emails
- Prisma schema or migration changes
- new environment variables
- new dependencies
- new public/admin visible copy
- PMS behavior
```

## Validation Gate

Run:

```text
npm run env:validate
npm run db:validate
npm run lint
npm run build
```

### Disabled-mode check

```text
1. Set EMAIL_DELIVERY_MODE=disabled.
2. Complete a valid approved payment.
3. Confirm Payment.status = APPROVED.
4. Confirm Reservation.status = CONFIRMED.
5. Confirm one guest and the configured/fallback admin intent exist as PENDING.
6. Confirm no Resend request occurs.
```

### Idempotency check

```text
1. Process the same APPROVED result again.
2. Confirm the reservation result reports alreadyConfirmed=true.
3. Confirm the count of each deduplication key remains one.
4. Confirm no duplicate guest/admin intent is inserted.
```

### Test-delivery check

```text
1. Configure EMAIL_DELIVERY_MODE=test and EMAIL_TEST_RECIPIENT.
2. Complete or repeat an eligible approved confirmation.
3. Confirm the provider delivers only to EMAIL_TEST_RECIPIENT.
4. Confirm EmailNotification.recipient remains the intended guest/admin address.
5. Confirm successful rows become SENT and retain a providerMessageId.
```

### Failure-isolation check

```text
1. Use test mode with a deliberately invalid/restricted provider credential or a controlled mock provider.
2. Confirm the claimed notification becomes FAILED with a safe internal error.
3. Confirm Payment remains APPROVED.
4. Confirm Reservation remains CONFIRMED with confirmedAt and no expiresAt.
5. Confirm the payment success result is still returned.
```

### Concurrency check

```text
1. Trigger two callbacks for the same APPROVED payment concurrently.
2. Confirm only one row exists per stable deduplication key.
3. Confirm only one process claims each PENDING row.
4. Confirm the second process skips SENT or PROCESSING rows.
```

## Handoff to 10.5

After local validation and commit, continue with:

```text
10.5 — Retry processing and admin delivery visibility
```

10.5 must reuse the safe status/error fields and stable idempotency keys introduced in 10.2 and exercised here. It must add bounded retry scheduling, stale-claim recovery, protected cron processing, and read-only admin visibility without changing payment or reservation outcomes.
