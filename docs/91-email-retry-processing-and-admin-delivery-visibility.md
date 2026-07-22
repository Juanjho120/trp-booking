# 91 — Email Retry Processing and Admin Delivery Visibility

## Phase Record

```text
Phase: Phase 10 — Email Notifications
Subphase: 10.5 Retry processing and admin delivery visibility
Status: Completed and accepted
Implementation commit: 1d3b02f6ae5fe37bd850a0ede0227e7173628aa1
Accepted follow-up commit: f77625f1d95095d7ebfd270007e1cbc54b667762
Related roadmap: docs/85-email-notification-strategy-and-phase-10-roadmap.md
```

## Goal

Add bounded, concurrency-safe recovery for transactional email delivery and expose safe read-only notification history in the protected reservation detail.

Email processing remains independent from payment and reservation state:

```text
Payment APPROVED remains APPROVED.
Reservation CONFIRMED remains CONFIRMED.
Email retries only update EmailNotification delivery metadata.
```

## Retry Worker

The protected endpoint is:

```text
GET /api/cron/process-email-notifications
```

It reuses the existing `CRON_SECRET` authorization contract:

```text
Authorization: Bearer <CRON_SECRET>
```

or:

```text
x-cron-secret: <CRON_SECRET>
```

The endpoint returns only bounded operational counters. It never returns recipients, provider payloads, rendered email content, API keys, sender credentials, or raw errors.

## Centralized Retry Policy

`lib/email/retry-policy.ts` owns the delivery constants:

```text
Maximum rows per execution: 20
Maximum total attempts: 5
Stale PROCESSING timeout: 10 minutes
Retry after attempt 1: 5 minutes
Retry after attempt 2: 15 minutes
Retry after attempt 3: 1 hour
Retry after attempt 4: 6 hours
Attempt 5: terminal when it fails
```

Retryable safe error codes:

```text
EMAIL_PROVIDER_RATE_LIMITED
EMAIL_PROVIDER_TEMPORARY_FAILURE
EMAIL_PROVIDER_UNEXPECTED_ERROR
EMAIL_NOTIFICATION_UNEXPECTED_ERROR
```

Configuration errors, invalid requests, provider rejection, template validation failures, incomplete data, unsupported notification types, and idempotency conflicts are not retried automatically.

## Eligibility

The worker may select only:

```text
- PENDING rows whose nextAttemptAt is null or due
- FAILED rows with an approved retryable error code whose nextAttemptAt is null or due
- PROCESSING rows whose processingStartedAt is at least 10 minutes old
```

All candidates must have `attemptCount < 5`.

`SENT` and `SKIPPED` are never selected.

A retryable `FAILED` row with `nextAttemptAt = null` remains eligible. This preserves compatibility with safe failures persisted before 10.5 introduced scheduling.

## Claim and Concurrency Contract

Candidate discovery does not itself grant ownership.

Each row is claimed through an atomic `updateMany` that verifies:

```text
- the expected status still matches
- the retry is still due
- the attempt limit is not exhausted
- stale PROCESSING rows still use an expired processingStartedAt
```

The claim:

```text
- changes status to PROCESSING
- increments attemptCount
- records lastAttemptAt
- writes a new processingStartedAt ownership token
- clears nextAttemptAt and previous safe error values
```

All subsequent reads and final updates require the same `processingStartedAt` token. If another worker safely recovers the row, the older worker cannot mark it `SENT` or `FAILED` afterward.

The permanent `deduplicationKey` continues to be sent as the Resend idempotency key.

## Failure Scheduling

After a claimed delivery fails:

```text
Retryable + attempts remaining
-> FAILED with a calculated nextAttemptAt

Retryable + maximum reached
-> FAILED with nextAttemptAt = null

Non-retryable
-> FAILED with nextAttemptAt = null
```

Only normalized safe codes and bounded safe messages are persisted.

## Stale Claim Recovery

A `PROCESSING` row older than 10 minutes is eligible for a new atomic claim when it still has attempts remaining.

A stale `PROCESSING` row that already reached the attempt limit is changed to terminal `FAILED` with:

```text
EMAIL_NOTIFICATION_RETRY_LIMIT_REACHED
```

This cleanup runs only when enabled email configuration and the provider adapter are available. Disabled or unavailable email configuration does not mutate retry rows.

## Vercel Schedule

`vercel.json` runs the worker every five minutes:

```text
*/5 * * * *
```

A single execution processes no more than 20 candidates so runtime, provider pressure, and database work remain bounded.

## Admin Delivery Visibility

The protected route remains:

```text
/admin/reservations/[reservationId]
```

The reservation detail loader now includes ordered email-notification history.

The UI may display only:

```text
- notification type
- intended recipient
- locale
- status
- attempt count
- last attempt timestamp
- next attempt timestamp
- sent timestamp
- provider message ID
- normalized safe error code
- normalized safe error message
```

Provider message IDs and error values are normalized and bounded server-side before reaching the client component.

The section is read-only and uses centralized bilingual copy from:

```text
messages/es.ts
messages/en.ts
```

The UI clarifies that `SENT` means the provider accepted the message. It does not prove inbox delivery, opening, or reading because webhook-based delivery observability is outside the current MVP.

## Explicitly Out of Scope

```text
- Manual resend button or API
- Provider delivery/open/bounce webhooks
- Raw Resend requests or responses
- Raw email HTML in admin
- API keys, sender credentials, or environment secrets
- Prisma schema or migration changes
- New dependencies
- Payment or reservation mutations
- Arrival-instruction scheduling
- Cancellation, refund, date-change, or stay-extension workflows
- PMS behavior
```

Those audit, authorization, idempotency, history-preservation, and concurrency rules were later approved as Phase 10.5.1 and are documented separately in docs/92-manual-resend-and-delivery-recovery-controls.md.

## Files

```text
app/api/cron/process-email-notifications/route.ts
lib/email/process-email-notifications.ts
lib/email/retry-policy.ts
lib/email/reservation-confirmation-notifications.ts
lib/email/index.ts
types/email-notification.ts
lib/admin/reservation-detail.ts
types/admin-reservation-detail.ts
features/admin/components/admin-reservation-detail-page.tsx
messages/es.ts
messages/en.ts
vercel.json
README.md
docs/10-phases.md
docs/11-progress-log.md
docs/85-email-notification-strategy-and-phase-10-roadmap.md
docs/91-email-retry-processing-and-admin-delivery-visibility.md
```

## Validation Checklist

```text
- npm run env:validate
- npm run db:validate
- npm run lint
- npm run build
- Cron rejects missing or invalid CRON_SECRET
- Cron does not mutate rows when email delivery is disabled or unavailable
- Only due PENDING/FAILED and stale PROCESSING rows are selected
- Concurrent executions cannot claim the same state transition twice
- Stale ownership tokens cannot overwrite a newer claim
- Retry delays and maximum attempts match the centralized policy
- SENT and SKIPPED rows are never retried
- A retry failure never changes Payment or Reservation
- Reservation detail renders localized safe notification history
- At the 10.5 acceptance commits, no raw provider payload, secret, card data, or manual resend action was exposed
```


## Acceptance Record

The user completed and accepted local validation for:

```text
- retryable FAILED scheduling and due processing
- non-retryable FAILED exclusion
- stale PROCESSING recovery after 10 minutes
- single attempt-count increment per claim
- maximum attempt handling
- concurrent claim safety
- Resend idempotency behavior
- localized protected delivery history
- unchanged APPROVED payment and CONFIRMED reservation state on delivery failure
```

Accepted commits:

```text
Implementation: 1d3b02f6ae5fe37bd850a0ede0227e7173628aa1
Prisma type follow-up: f77625f1d95095d7ebfd270007e1cbc54b667762
```
