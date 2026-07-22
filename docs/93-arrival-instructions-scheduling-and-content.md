# 93 — Arrival Instructions Scheduling and Content

## Phase Record

```text
Phase: Phase 10 — Email Notifications
Subphase: 10.6 Arrival instructions scheduling and content
Status: Implementation prepared; pending local validation and commit
Base commit: 355c72490d416a257b9827d31c67223a97200491
Previous accepted subphase: 10.5.1 Manual resend and delivery recovery controls
Next subphase after acceptance: 10.7 Validation and documentation closure
```

## Goal

Send one safe, bilingual arrival-instructions email to the guest at the approved time before check-in while keeping operational content editable, auditable, idempotent, and independent from payment and reservation confirmation.

```text
Confirmed reservation
+ enabled complete property instructions
-> idempotent ARRIVAL_INSTRUCTIONS intent
-> scheduled eligibility
-> existing delivery/retry worker
-> SENT, bounded FAILED, or safe SKIPPED
```

Email delivery never confirms, cancels, refunds, or otherwise mutates a reservation or payment.

## Approved Timing Contract

Arrival timing is property-specific.

```text
Default lead time: 48 hours
Allowed range: 1 through 168 hours
Business timezone: America/Guatemala
Reference time: Property.checkInTime on Reservation.checkInDate
```

Scheduling behavior:

```text
More than the lead time before check-in
-> create PENDING intent
-> scheduledFor and nextAttemptAt equal the future eligibility timestamp

Inside the lead-time window, including same-day confirmation before or after the configured check-in time
-> create PENDING intent with scheduledFor in the past
-> post-confirmation delivery or the next worker run may claim it immediately

Check-in date before the current date in America/Guatemala
-> do not create a new arrival intent
```

The maximum configured lead time is seven days. The scheduler scans eight calendar days so every eligible reservation enters the scheduling horizon before its earliest possible delivery time.

## Property-Owned Content

A new one-to-one `PropertyArrivalInstructions` record owns:

```text
enabled
leadTimeHours
exactAddress
mapUrl (optional HTTPS URL)
instructionsEs
instructionsEn
createdAt
updatedAt
```

The settings are managed from:

```text
/admin/accommodations/[propertyId]/arrival-instructions
```

Admin editing uses:

```text
- authenticated ADMIN session
- strict Zod request validation
- server-side normalization and validation
- expectedUpdatedAt optimistic concurrency
- serializable transaction
- PROPERTY_ARRIVAL_INSTRUCTIONS_UPDATED AdminAuditLog event
- centralized messages/es.ts and messages/en.ts copy
- styled project controls and Snackbar feedback
```

An absent settings record behaves as disabled with the 48-hour default. Enabling requires a valid exact address and complete instructions in both languages.

## Sensitive Content Boundary

The approved fields are for stable operational guidance only.

They must not contain:

```text
- door or gate access codes
- lockbox codes
- alarm codes
- private Wi-Fi passwords
- payment credentials
- identity documents
- card data
- API keys or provider secrets
- other rotating or revocable credentials
```

Those values require a future secure secret-delivery design and are not part of this phase. No operational address or instructions are committed to source code, messages, migrations, seeds, or documentation.

## Bilingual Email Content

`ARRIVAL_INSTRUCTIONS` uses the guest's stored `Reservation.preferredLocale`.

The HTML and plain-text alternatives include:

```text
- branded heading and preview text
- guest greeting
- reservation reference
- accommodation name
- localized check-in date
- localized property check-in time
- exact address
- optional HTTPS map link
- property-approved instructions in the selected language
- security reminder
- locale-specific reservations support email
```

The template does not expose admin links, raw provider payloads, payment data, access codes, or PMS-only content.

## Intent Creation and Backfill

There are two complementary scheduling paths.

### Confirmation path

When an APPROVED payment confirms a reservation, the existing confirmation transaction also attempts to create the arrival intent when property settings are enabled and complete.

The row is committed with reservation confirmation, but provider delivery remains post-transaction. A future `nextAttemptAt` prevents premature immediate delivery.

### Backfill scheduler

Protected endpoint:

```text
GET /api/cron/schedule-arrival-instructions
Authorization: Bearer CRON_SECRET
```

Vercel schedule:

```text
*/30 * * * *
```

The scheduler handles:

```text
- confirmed reservations created before property instructions were enabled
- upcoming reservations after content or lead-time changes
- existing confirmed reservations that did not receive an intent during their original confirmation transaction
```

It creates intents only. Provider delivery continues through `/api/cron/process-email-notifications`, preserving one delivery pipeline.

## Permanent Idempotency

The arrival deduplication key includes:

```text
arrival-instructions/
<reservationId>/
<checkInDate>/
<arrivalSettingsUpdatedAtMillis>/
<normalizedRecipient>
```

This means repeated confirmation callbacks, repeated scheduler runs, concurrent scheduler requests, and provider retries reuse one notification for the same reservation date and content version.

`EmailNotification` additionally stores:

```text
scheduledFor
reservationCheckInDateSnapshot
arrivalInstructionsVersion
```

These fields are audit data, not editable admin delivery controls.

## Supersession and Future Date Changes

Before provider delivery, the dispatcher verifies:

```text
Reservation.status = CONFIRMED
Reservation.checkInDate matches reservationCheckInDateSnapshot
Property arrival instructions still exist and are enabled
PropertyArrivalInstructions.updatedAt matches arrivalInstructionsVersion
Required bilingual content remains complete
```

A mismatch marks the notification `SKIPPED` with a safe normalized code before calling Resend.

Updating arrival settings also marks existing PENDING or FAILED arrival notifications for that property as superseded. The scheduler then creates one new version for each eligible upcoming reservation.

Phase 11 will own the authorized date-change workflow. Because the key and snapshot include check-in date, a valid future date change naturally supersedes the old intent and permits one new intent for the new date without rewriting historical delivery rows.

A previously `SENT` arrival email remains historical evidence. Phase 10.6 does not attempt to retract delivered email.

## Retry and Failure Isolation

The phase reuses the accepted Phase 10.5 worker:

```text
- due-date filtering through nextAttemptAt
- maximum batch size 20
- PENDING/FAILED/PROCESSING claim rules
- 5-minute, 15-minute, 1-hour, and 6-hour retry delays
- 5 total attempts
- stale PROCESSING recovery after 10 minutes
- provider idempotency through deduplicationKey
- test recipient override
- safe normalized diagnostics
```

Template, provider, retry, scheduler, or audit failure never changes:

```text
Payment.status = APPROVED
Reservation.status = CONFIRMED
```

## Persistence and Migration

Migration:

```text
prisma/migrations/20260722193000_arrival_instructions_scheduling_content/migration.sql
```

It creates `property_arrival_instructions` and adds the three arrival scheduling/version fields and indexes to `email_notifications`.

No dependency, seed, or environment-variable change is required.

## Admin Visibility

Reservation detail continues to show read-only delivery history and now includes `scheduledFor`.

The property accommodation overview links to the dedicated arrival-instructions editor. Delivery metadata itself remains non-editable, and Phase 10.5.1 manual resend remains restricted to the two confirmation notification types.

## Explicitly Out of Scope

```text
- rotating secret storage or delivery
- access-code, lockbox-code, alarm-code, or Wi-Fi-password management
- guest self-service address or instruction editing
- Phase 11 cancellation, refund, date-change, or stay-extension UI
- automatic retraction of an already delivered email
- provider delivery/open/bounce webhooks
- raw Resend payload visibility
- payment or reservation mutation caused by email results
- new dependencies or environment variables
- PMS behavior
```

## Files

```text
prisma/schema.prisma
prisma/migrations/20260722193000_arrival_instructions_scheduling_content/migration.sql
types/admin-arrival-instructions.ts
types/admin-reservation-detail.ts
types/email-notification.ts
types/email-template.ts
lib/admin/arrival-instructions.ts
lib/admin/index.ts
lib/admin/reservation-detail.ts
lib/email/arrival-instructions.ts
lib/email/reservation-confirmation-notifications.ts
lib/email/index.ts
lib/reservations/confirmation.ts
emails/arrival-instructions-email.tsx
emails/template-data.ts
emails/index.ts
app/admin/accommodations/[propertyId]/arrival-instructions/page.tsx
app/api/admin/accommodations/[propertyId]/arrival-instructions/route.ts
app/api/cron/schedule-arrival-instructions/route.ts
features/admin/components/admin-accommodation-management.tsx
features/admin/components/admin-arrival-instructions-editor.tsx
features/admin/components/admin-reservation-detail-page.tsx
features/admin/index.ts
messages/es.ts
messages/en.ts
vercel.json
README.md
docs/10-phases.md
docs/11-progress-log.md
docs/85-email-notification-strategy-and-phase-10-roadmap.md
docs/92-manual-resend-and-delivery-recovery-controls.md
docs/93-arrival-instructions-scheduling-and-content.md
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
- Disabled or incomplete settings never create an arrival notification
- Enabling complete settings creates an auditable property configuration
- A reservation more than 48 hours away receives one future PENDING intent
- A reservation inside the lead window becomes immediately eligible
- Same-day reservations before and after the configured check-in time are immediately eligible
- A reservation whose check-in date is before the current Guatemala business date does not create a new intent
- Repeated and concurrent scheduler runs create one row per permanent key
- The worker ignores the row before scheduledFor and claims it after scheduledFor
- ES and EN HTML/plain-text output match the stored guest locale
- Test mode retains the guest recipient in persistence while delivering only to EMAIL_TEST_RECIPIENT
- Settings changes supersede old PENDING/FAILED rows and create a new version
- Reservation cancellation or check-in-date mismatch causes safe SKIPPED before provider work
- SENT and SKIPPED rows are never automatically retried
- Provider failure never changes Payment or Reservation
- No native alert, confirm, or prompt
- No access code, lockbox code, Wi-Fi password, raw provider payload, secret, card data, or PMS behavior
```
