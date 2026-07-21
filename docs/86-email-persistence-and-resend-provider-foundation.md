# 86 — Email Persistence and Resend Provider Foundation

## Phase Record

```text
Phase: Phase 10 — Email Notifications
Subphase: 10.2 Persistence and Resend provider foundation
Status: Completed
Base commit: 970eef34826004dcdd42cecf534f99652ecc7e78
Accepted commit: 5ad4f1c4c08a1f98691d0215dc5958fbe7542f72
Strategy: docs/85-email-notification-strategy-and-phase-10-roadmap.md
Next subphase after acceptance: 10.3 Bilingual branded reservation-confirmation templates
```

## Purpose

Add the durable database and server-side provider foundation required by later notification subphases without creating notification intents, changing reservation confirmation, rendering templates, processing retries, exposing admin delivery UI, or sending email.

The existing payment-driven confirmation contract remains unchanged:

```text
Validated APPROVED payment
-> Reservation.status = CONFIRMED
-> email delivery remains independent
```

An email configuration error or provider failure must never roll back a valid payment or confirmed reservation.

## Delivered Foundation

```text
- Resend Node.js SDK dependency
- Conditional email environment validation
- Stored reservation locale
- Permanent notification deduplication
- PROCESSING notification status
- Retry and worker-claim metadata
- Safe normalized provider error codes
- Typed server-side Resend adapter
- Data-safe Prisma migration
```

## Dependency Decision

The only new runtime dependency is:

```text
resend 6.17.2
```

The project continues to use its existing React dependency. Phase 10.2 does not add `@react-email/components` because templates are not part of this subphase and the accepted strategy requires a concrete compatibility reason before adding another email-rendering dependency.

`package-lock.json` is regenerated from the current project dependency set rather than edited by hand.

Resend 6.17.2 declares Node.js 20 or newer. Phase 10.2 does not change the project-wide `engines` contract, but local development and the Vercel runtime must use Node.js 20+ before this dependency is accepted.

## Environment Contract

New server-side variables:

```text
EMAIL_DELIVERY_MODE="disabled|test|production"
RESEND_API_KEY=""
EMAIL_FROM_ES="Tu Refugio Perfecto <reservas@turefugioperfecto.com.gt>"
EMAIL_FROM_EN="Tu Refugio Perfecto <reservations@turefugioperfecto.com.gt>"
EMAIL_REPLY_TO_ES="reservas@turefugioperfecto.com.gt"
EMAIL_REPLY_TO_EN="reservations@turefugioperfecto.com.gt"
EMAIL_ADMIN_RECIPIENTS="admin@turefugioperfecto.com.gt"
EMAIL_ADMIN_LOCALE="es|en"
EMAIL_PUBLIC_BASE_URL="absolute application URL"
EMAIL_TEST_RECIPIENT=""
```

### Disabled mode

```text
- RESEND_API_KEY is not required.
- No provider can be called successfully.
- createResendEmailProvider returns a provider whose send method fails with EMAIL_PROVIDER_DISABLED.
- Existing local development can continue without email credentials.
```

### Test mode

```text
- RESEND_API_KEY and all sender/link configuration are required.
- EMAIL_TEST_RECIPIENT is required.
- Every intended recipient is replaced by the single test recipient.
- The subject receives a clear [TEST] prefix.
- Localhost EMAIL_PUBLIC_BASE_URL is allowed only outside production deployment.
```

### Production mode

```text
- RESEND_API_KEY and all sender/link configuration are required.
- EMAIL_PUBLIC_BASE_URL must use HTTPS.
- EMAIL_TEST_RECIPIENT must be empty.
- Sender and reply-to addresses must use turefugioperfecto.com.gt or one of its subdomains.
- Actual intended recipients are used.
```

All configuration remains server-side. No `NEXT_PUBLIC` email variables are introduced.

## Reservation Locale Persistence

`Reservation` adds:

```prisma
preferredLocale String @default("es") @map("preferred_locale")
```

Behavior:

```text
- New pending reservations persist the already validated locale from CreatePendingReservationHoldInput.
- Service-layer validation still rejects values other than es or en.
- Reused active pending holds retain the locale stored when they were first created.
- Existing reservation rows receive es through the migration/default.
- No locale is inferred again during payment confirmation.
```

The public response contract is unchanged; `preferredLocale` is internal persisted state for later transactional email rendering.

## Email Notification Persistence

`EmailNotificationStatus` adds:

```text
PROCESSING
```

`EmailNotification` adds:

```prisma
deduplicationKey    String    @unique @map("deduplication_key")
attemptCount        Int       @default(0) @map("attempt_count")
lastAttemptAt       DateTime? @map("last_attempt_at")
nextAttemptAt       DateTime? @map("next_attempt_at")
processingStartedAt DateTime? @map("processing_started_at")
errorCode           String?   @map("error_code")
```

The existing `errorMessage` remains available and is explicitly stored as PostgreSQL text. Both error fields may contain only normalized safe values.

The retry-oriented lookup index becomes:

```prisma
@@index([status, nextAttemptAt])
```

Phase 10.2 does not yet define batch size, maximum attempts, stale-processing timeout, or backoff intervals. Those constants belong to 10.5 when the worker is implemented.

## Migration Safety

Migration:

```text
prisma/migrations/20260721143000_email_provider_foundation/migration.sql
```

Historical-data handling:

```text
reservations.preferred_locale
- Added NOT NULL with default es.
- Existing and future rows are safe immediately.

email_notifications.deduplication_key
- Added nullable first.
- Existing rows are backfilled with legacy/<notification-id>.
- The column is then changed to NOT NULL.
- A unique index is added only after the backfill.
```

The legacy key does not claim that an older message followed the future business-key format. It only gives every historical row a stable unique identity so the migration can be applied to a non-empty table safely.

The migration does not delete or rewrite reservation, payment, guest, or notification history.

## Provider Adapter

Public foundation entry point:

```ts
createResendEmailProvider(source?)
```

The returned provider exposes one typed operation:

```ts
send(input: EmailProviderSendInput): Promise<EmailProviderSendResult>
```

Input contract:

```text
intendedRecipient
locale
subject
html
text
idempotencyKey
```

Each provider call represents exactly one persisted `EmailNotification` row and therefore exactly one intended recipient and one permanent idempotency key. Multiple admin recipients must be delivered through separate notification rows and separate provider calls.

The adapter owns:

```text
- sender selection by locale
- reply-to selection by locale
- single-recipient normalization
- test-recipient override
- test subject prefix
- idempotency-key validation
- Resend SDK invocation
- provider response normalization
```

Resend accepts an idempotency key with a maximum length of 256 characters and retains provider-side idempotency for a limited 24-hour window. PostgreSQL therefore remains the permanent source of duplicate-send prevention.

No Phase 10.2 application path imports and calls the provider. The adapter is intentionally dormant until notification orchestration is added later.

## Safe Provider Errors

Normalized internal codes:

```text
EMAIL_PROVIDER_DISABLED
EMAIL_PROVIDER_CONFIGURATION_ERROR
EMAIL_PROVIDER_INVALID_REQUEST
EMAIL_PROVIDER_IDEMPOTENCY_CONFLICT
EMAIL_PROVIDER_RATE_LIMITED
EMAIL_PROVIDER_TEMPORARY_FAILURE
EMAIL_PROVIDER_REJECTED
EMAIL_PROVIDER_UNEXPECTED_ERROR
```

Each `EmailProviderError` exposes:

```text
code
retryable
safe fixed message
```

It does not expose or persist:

```text
raw Resend error messages
response bodies
request headers
API keys
template HTML
guest-sensitive payloads
```

Phase 10.5 will decide how these safe codes map to retry scheduling and admin visibility.

## Explicit Non-Goals

```text
- No reservation-confirmation email template
- No admin-new-reservation email template
- No email copy added to messages/es.ts or messages/en.ts yet
- No EmailNotification intent creation
- No changes to confirmReservationAfterApprovedPayment
- No provider network call from reservation/payment flows
- No cron retry processor
- No admin notification-delivery section
- No arrival-instruction scheduling
- No payment-failed email
- No cancellation, refund, date-change, or stay-extension email
- No webhook delivery-status processing
- No PMS behavior
```

## Files Added

```text
lib/email/provider.ts
lib/email/resend-provider.ts
lib/email/index.ts
types/email-provider.ts
prisma/migrations/20260721143000_email_provider_foundation/migration.sql
docs/86-email-persistence-and-resend-provider-foundation.md
```

## Files Updated

```text
.env.example
package.json
package-lock.json
prisma/schema.prisma
lib/env/server.ts
lib/reservations/pending-holds.ts
README.md
docs/10-phases.md
docs/11-progress-log.md
docs/85-email-notification-strategy-and-phase-10-roadmap.md
```

## Local Validation Gate

Confirm the runtime first:

```text
node --version
```

Use Node.js 20 or newer, then install exactly from the committed lockfile:

```text
npm install
```

Validate and generate Prisma:

```text
npm run db:format
npm run db:generate
npm run db:validate
```

Apply the migration locally:

```text
npm run db:migrate:dev
```

For an already provisioned shared environment:

```text
npm run db:migrate:deploy
```

Validate application configuration and code:

```text
npm run env:validate
npm run lint
npm run build
```

Start with:

```text
EMAIL_DELIVERY_MODE=disabled
RESEND_API_KEY=
```

Manual checks:

```text
1. Create a new Spanish pending reservation and verify preferred_locale = es.
2. Create a new English pending reservation and verify preferred_locale = en.
3. Submit the same active-hold request with a different locale and verify the reused reservation keeps its original preferred_locale.
4. Verify the migration preserves all existing reservations and notification rows.
5. Verify every existing notification has a unique legacy/<id> deduplication_key.
6. Verify no EmailNotification row is created by pending-hold creation or payment confirmation in this subphase.
7. Verify no Resend request occurs while exercising the current reservation/payment flow.
8. Run env validation with disabled mode and no API key.
9. Separately validate test-mode configuration using a non-production test recipient without committing credentials.
```

## Handoff to 10.3

After acceptance, continue with:

```text
10.3 — Bilingual branded reservation-confirmation templates
```

10.3 may render typed ES/EN guest and admin templates, but it must still avoid creating notification intents or connecting delivery to reservation confirmation because that work remains explicitly assigned to 10.4.
