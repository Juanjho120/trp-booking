# 92 — Manual Resend and Delivery Recovery Controls

## Phase Record

```text
Phase: Phase 10 — Email Notifications
Subphase: 10.5.1 Manual resend and delivery recovery controls
Status: Implementation prepared; pending local validation and commit
Base commit: f77625f1d95095d7ebfd270007e1cbc54b667762
Previous accepted subphase: 10.5 Retry processing and admin delivery visibility
Next subphase after acceptance: 10.6 Arrival instructions scheduling and content
```

## Goal

Add a protected, explicit administrative recovery action for transactional confirmation emails that automatic retry cannot or should not recover, while preserving the original delivery record and keeping payment and reservation state independent.

```text
Manual action
-> create a new EmailNotification
-> commit audit data
-> attempt delivery after commit
-> reuse bounded automatic retry when needed
```

The action never resets the source notification and never edits delivery fields such as status, attemptCount, sentAt, providerMessageId, or error diagnostics directly from the UI.

## Supported Source Notifications

Manual delivery is allowed only when all conditions hold:

```text
Reservation.status = CONFIRMED
Reservation.confirmedAt is present
Notification type = RESERVATION_CONFIRMED or ADMIN_NEW_RESERVATION
Notification status = PENDING, FAILED, or SENT
The admin session is authorized
The submitted updatedAt matches the source record
```

The action is rejected for:

```text
PROCESSING
SKIPPED
Unsupported future notification types
Notifications outside the selected reservation
Notifications linked to a reservation that is not confirmed
Stale browser data
Unauthenticated or unauthorized sessions
```

A PROCESSING notification remains owned by the current worker or becomes eligible for stale recovery after the accepted 10-minute timeout. The admin action does not compete with that claim.

## Persistence Model

`EmailNotification` adds:

```text
origin: AUTOMATIC | MANUAL
parentNotificationId: nullable self-reference
requestedByAdminId: nullable User reference
requestedAt: nullable timestamp
```

Existing rows are migrated with `origin = AUTOMATIC`.

A manual row stores:

```text
origin = MANUAL
parentNotificationId = source notification ID
requestedByAdminId = resolved admin User ID
requestedAt = request timestamp
status = PENDING
attemptCount = 0
new unique deduplicationKey
```

The parent cannot reference itself. Parent and requester foreign keys use `ON DELETE SET NULL` so delivery history remains readable if a related actor reference is removed later.

## Idempotency and Concurrency

The browser creates one UUID when the confirmation Sheet opens and keeps that UUID for the request attempt.

The permanent manual key is:

```text
manual-resend/<sourceNotificationId>/<requestId>
```

The unique database constraint makes repeated network submissions with the same request UUID resolve to the same manual notification. A serializable transaction plus `P2002` recovery handles concurrent identical requests without creating duplicate rows or duplicate audit entries.

A repeated request may safely continue processing an existing PENDING child or report its existing final state.

## Preventing Automatic Duplicate Delivery

The source delivery record remains intact for auditability. It is not converted to PENDING, its attempt count is not reset, and its historical diagnostics are not erased. The transaction updates only its updatedAt concurrency stamp to obtain a row lock before creating the child.

Once a source has at least one manual child:

```text
manualResends: { none: {} }
```

must be true before the source can be claimed by either:

```text
- the immediate confirmation-delivery path
- the bounded retry worker
- stale/exhausted worker cleanup
```

Candidate discovery also carries the source `updatedAt` value into the atomic claim. The manual transaction updates that concurrency stamp while holding the source row lock. Therefore, a worker or immediate callback that discovered the row before the manual action cannot claim it afterward with an obsolete version.

This relationship-and-version suppression prevents an original PENDING or retryable FAILED row from later delivering automatically after a manual replacement was created. The new manual child has its own retry lifecycle and remains eligible until it gains a later manual child of its own.

## Post-Transaction Delivery

The database transaction contains only:

```text
- admin actor resolution
- source validation
- new manual EmailNotification creation
- AdminAuditLog creation
```

No provider call occurs inside the transaction.

After commit, the service calls the generalized pending-notification delivery helper. The new row then reuses:

```text
- atomic PENDING -> PROCESSING claim
- processingStartedAt ownership token
- existing bilingual templates
- existing Resend provider adapter
- new manual deduplication key as provider idempotency key
- normalized safe failure codes
- bounded automatic retry policy
```

A provider or template failure updates only the new EmailNotification. Payment remains APPROVED and Reservation remains CONFIRMED.

## Administrative Audit

Each newly created request writes:

```text
AdminAuditLog.action = EMAIL_NOTIFICATION_MANUAL_RESEND_REQUESTED
AdminAuditLog.entityType = EmailNotification
AdminAuditLog.entityId = new manual notification ID
```

Safe metadata includes:

```text
actor email
request UUID
reservation ID
source notification ID and status
notification type
intended recipient
locale
requested timestamp
```

No API key, sender credential, rendered HTML, provider request, provider response, payment payload, or card data is stored in audit metadata.

## Admin UI

The reservation delivery section remains a read-only history surface. It adds controlled actions rather than editable delivery fields.

```text
PENDING or FAILED -> Reintentar ahora / Retry now
SENT -> Enviar nuevamente / Send again
PROCESSING, SKIPPED, unsupported -> no action
```

The confirmation uses the existing Radix-based `Sheet`, not native `confirm()`.

The Sheet explains that:

```text
- a separate notification will be created
- the original remains in history
- the original stops automatic processing after the child exists
- sending again from SENT may create a duplicate email
```

Buttons are disabled while the request is active. Success and failure use the existing accessible `AdminSnackbar` and centralized ES/EN copy.

The history also displays:

```text
origin
created timestamp
manual requester
manual requested timestamp
parent notification ID
```

## API

Protected endpoint:

```text
POST /api/admin/email-notifications/[notificationId]/resend
```

Strict request body:

```json
{
  "reservationId": "...",
  "expectedUpdatedAt": "ISO-8601 timestamp",
  "requestId": "UUID"
}
```

The response exposes only the new notification ID, safe delivery mode/outcome, retry scheduling flag, and final normalized status.

## Schema and Migration

Migration:

```text
prisma/migrations/20260722160000_email_manual_resend_controls/migration.sql
```

The migration:

```text
- creates email_notification_origin
- backfills existing rows through the AUTOMATIC default
- adds parent/requester/requested-at columns
- adds parent and requester foreign keys
- adds a parent-not-self check
- adds origin, parent, and requester indexes
```

No dependency or seed change is required.

## Explicitly Out of Scope

```text
- Generic editing of EmailNotification delivery fields
- Changing the intended recipient during resend
- Changing notification type or locale during resend
- Bulk resend
- Manual action for PROCESSING or SKIPPED
- Provider delivery/open/bounce webhooks
- Raw Resend request/response visibility
- Payment or reservation mutation
- Arrival instructions
- Cancellation, refund, date-change, or stay-extension workflows
- PMS behavior
```

## Files

```text
prisma/schema.prisma
prisma/migrations/20260722160000_email_manual_resend_controls/migration.sql
types/admin-email-notification-resend.ts
types/admin-reservation-detail.ts
lib/admin/email-notification-resend.ts
lib/admin/reservation-detail.ts
lib/admin/index.ts
lib/email/reservation-confirmation-notifications.ts
lib/email/process-email-notifications.ts
lib/email/index.ts
app/api/admin/email-notifications/[notificationId]/resend/route.ts
features/admin/components/admin-reservation-detail-page.tsx
messages/es.ts
messages/en.ts
README.md
docs/10-phases.md
docs/11-progress-log.md
docs/85-email-notification-strategy-and-phase-10-roadmap.md
docs/91-email-retry-processing-and-admin-delivery-visibility.md
docs/92-manual-resend-and-delivery-recovery-controls.md
```

## Validation Checklist

```text
- npm run db:format
- npm run db:generate
- npm run db:validate
- npm run env:validate
- npm run lint
- npm run build
- git diff --check
- Existing rows migrate as AUTOMATIC
- FAILED configuration error can create a new MANUAL row after configuration is corrected
- SENT action shows duplicate warning and creates a new provider idempotency key
- PENDING/FAILED source with a manual child is no longer selected by cron or immediate claim
- Manual child remains eligible for bounded retries
- PROCESSING/SKIPPED/unsupported/non-confirmed actions are rejected server-side
- Same request UUID creates one row and one audit event
- Concurrent identical requests recover the same row
- Original status, attempt count, provider ID, sent time, and safe error remain unchanged
- Requesting admin, parent, origin, and timestamps appear in ES and EN
- Provider failure never changes Payment or Reservation
- No native alert, confirm, or prompt
- No raw provider payload, secret, card data, or PMS behavior
```
