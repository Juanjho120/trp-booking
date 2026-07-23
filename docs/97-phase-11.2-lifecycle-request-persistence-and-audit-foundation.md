# 97 — Phase 11.2 Lifecycle Request Persistence and Audit Foundation

## Phase Record

```text
Phase: Phase 11 — Cancellation, Refund, and Change Request Rules
Subphase: 11.2 Lifecycle request persistence and audit foundation
Status: Implementation package prepared; repository validation and acceptance pending
Prepared: 2026-07-23
Base commit: deb939676b5aa3d5d67e18a0e04b059dae4eccdf
Previous subphase: 11.1 Lifecycle strategy, policy, and provider boundary
Strategy: docs/95-phase-11-lifecycle-strategy-and-roadmap.md
Correction: docs/96-phase-11.1-cancellation-policy-and-tilopay-refund-contract-correction.md
```

## Purpose

Add the typed database and availability foundation required by future cancellation, refund, authorized date-change, and stay-extension mutations without adding those mutations yet.

This package adds no public or admin lifecycle form, no unauthenticated reservation-management endpoint, no Tilopay refund/reversal call, no adjustment checkout, no lifecycle email, and no PMS behavior.

## Repository Base and Scope Review

The implementation was prepared from the current `main` state at:

```text
deb939676b5aa3d5d67e18a0e04b059dae4eccdf
docs(lifecycle): correct cancellation and refund contract
```

The following continuity files were reviewed before implementation:

```text
AGENTS.md
README.md
docs/10-phases.md
docs/11-progress-log.md
docs/35-preparation-buffer-and-blocked-date-evaluation.md
docs/95-phase-11-lifecycle-strategy-and-roadmap.md
docs/96-phase-11.1-cancellation-policy-and-tilopay-refund-contract-correction.md
prisma/schema.prisma
lib/availability/service.ts
types/availability.ts
```

## Typed Lifecycle Request

`ReservationLifecycleRequest` is the authoritative typed record for an admin-recorded request received through an approved support channel.

Supported request types:

```text
CANCELLATION
DATE_CHANGE
STAY_EXTENSION
```

Supported request states:

```text
PENDING_REVIEW
APPROVED
REJECTED
AWAITING_ADJUSTMENT_PAYMENT
COMPLETED
WITHDRAWN
EXPIRED
FAILED
```

Supported intake channels:

```text
EMAIL
PHONE
WHATSAPP
OTHER
```

The model persists:

```text
Reservation and optional captured source payment
Request type, status, channel, requester contact snapshot, and note
Permanent client request ID and idempotency key
Original reservation status, dates, guest identity/contact/locale, guest count, pricing, total, and currency
Requested dates, guest count, pricing, total, and financial difference when relevant
Cancellation-policy version, timezone, calculation instant, check-in instant, hours, reason, percentages, and amounts
Optional separately audited exception result without replacing the standard policy result
Creating and reviewing admins
Decision, failure, completion, withdrawal, and expiration timestamps
Expected reservation updatedAt and an integer version for optimistic concurrency
Linked adjustment payments, refunds, and temporary hold
```

Transition-critical dates, amounts, statuses, and relations are not stored only in unrestricted JSON. Future `AdminAuditLog.metadata` remains supplementary before/after context.

## Cancellation Policy Snapshot

The migration enforces the approved policy snapshot for cancellation requests:

```text
Policy version: DIRECT_BOOKING_2026_07_23
Timezone: America/Guatemala

hoursBeforeCheckIn >= 168
-> AT_LEAST_168_HOURS
-> 100%

72 <= hoursBeforeCheckIn < 168
-> BETWEEN_72_AND_168_HOURS
-> 50%

hoursBeforeCheckIn < 72
-> LESS_THAN_72_HOURS
-> 0%
```

Exactly 168 hours receives 100%. Exactly 72 hours receives 50%. Same-day, after-check-in, and no-show scenarios remain in the standard less-than-72-hours outcome. The database validates the exact cutoffs by comparing `policyCalculatedAt` with `policyCheckInAt`; the decimal hours value is retained as an audit snapshot rather than used as the sole boundary authority.

`standardRefundPercentage` and `standardRefundAmount` preserve the policy result even if a later, separately approved exception path records a different approved result. The persistence fields do not grant exception authority and this subphase adds no exception action.

## Request Shape Constraints

Database checks enforce:

```text
Original check-in must be before original check-out.
Guest counts must be positive.
Stored non-difference amounts must be nonnegative.
CANCELLATION has no requested date range.
DATE_CHANGE has a valid requested range different from the original range.
STAY_EXTENSION keeps check-in unchanged and moves check-out later.
Percentages remain from 0 through 100.
Policy-exception reason is required only when an exception is flagged.
Version starts at 1 or greater.
```

Final domain services in 11.3 and 11.5 must still authenticate, authorize, normalize, re-read current state, validate expected `updatedAt`, and use serializable transactions.

## Payment Purpose and Lifecycle Relation

`PaymentPurpose` separates the original payment from a positive date-change or extension difference:

```text
INITIAL_RESERVATION
LIFECYCLE_ADJUSTMENT
```

Existing payments receive `INITIAL_RESERVATION` through the migration default. A future adjustment payment can reference one lifecycle request through `Payment.lifecycleRequestId`.

No checkout or payment-attempt behavior changes in 11.2.

## Refund Status and Processing Mode

The old `RefundStatus.MANUAL` value combined lifecycle state with the processing method. The new foundation separates them:

Refund lifecycle state:

```text
PENDING
PROCESSING
APPROVED
FAILED
```

Historical compatibility:

```text
MANUAL
```

Processing mode:

```text
LEGACY_UNSPECIFIED
TILOPAY_API
TILOPAY_PORTAL_FALLBACK
```

Migration behavior for existing rows:

```text
Existing status = MANUAL
-> processingMode = TILOPAY_PORTAL_FALLBACK

Every other existing refund
-> processingMode = LEGACY_UNSPECIFIED

New refunds
-> default processingMode = TILOPAY_API
```

The migration does not change an existing refund's status, amount, reason, provider reference, or timestamps. `MANUAL` remains available only for historical compatibility and must not be used by new Phase 11 services.

Refund persistence also gains optional lifecycle-request/admin linkage, permanent request/idempotency identifiers for future attempts, processing timestamps, and a bounded failure code. Existing rows remain valid because those new audit identifiers are nullable for legacy data.

## Reservation Refund Status Compatibility

`ReservationStatus.REFUNDED` and `ReservationStatus.PARTIALLY_REFUNDED` are retained because 11.2 cannot safely assume that no historical database row uses them.

They are documented as compatibility-only values. New Phase 11 flows must follow:

```text
Cancellation accepted
-> Reservation.status = CANCELLED

Active date change or partial financial return
-> Reservation.status remains CONFIRMED

Financial reversal
-> Payment and Refund own the result
```

This prevents an active stay from being released merely because money was partially returned.

## Temporary Lifecycle-Request Hold

`LifecycleRequestHold` protects requested dates while an approved positive difference is waiting for payment.

The hold:

```text
Belongs one-to-one to a lifecycle request
Stores property, requested dates, and explicit expiresAt
Snapshots preparation days before and after
Uses ACTIVE, RELEASED, or EXPIRED status
Stores release/expiration timestamps and a bounded reason code
Uses a version for optimistic concurrency
Is not a CalendarBlock
Does not replace the original confirmed reservation
```

The schema intentionally provides no default hold duration. The exact duration remains a Phase 11.5 business decision and must be supplied explicitly when a hold is created.

## Availability Evaluation

`getAvailabilityBlockingRecords` now includes active, non-expired lifecycle-request holds.

Each effective hold blocks:

```text
Requested stay dates
Snapshotted preparation buffers
Every property affected by the existing composed-listing dependency graph
```

Expired, released, or persisted-as-expired holds do not block availability.

The public availability API requires no special parameter and therefore sees lifecycle holds as blockers automatically.

Future Phase 11.5 server-side validation may use:

```text
excludeReservationId
excludeLifecycleRequestId
```

These options ignore only the original reservation or the request's own hold during final revalidation. They do not suppress competing reservations, pending payments, Airbnb events, manual/maintenance blocks, preparation buffers, or other lifecycle holds.

Lifecycle holds remain excluded from Airbnb iCal export because they are temporary internal protections, not confirmed stays.

## Idempotency and Concurrency Foundation

Permanent uniqueness exists for:

```text
ReservationLifecycleRequest.clientRequestId
ReservationLifecycleRequest.idempotencyKey
Refund.clientRequestId when present
Refund.idempotencyKey when present
One LifecycleRequestHold per lifecycle request
```

The request stores both `expectedReservationUpdatedAt` and `version`. The hold also stores `version`. Future mutation services must use those values together with a serializable transaction and an `AdminAuditLog` row.

## Migration Safety

The migration:

```text
Creates new enum and table types without deleting operational history.
Adds PROCESSING to refund_status without removing MANUAL.
Backfills refund processing mode before making it required.
Defaults existing Payment rows to INITIAL_RESERVATION.
Uses RESTRICT or SET NULL relationships according to historical ownership.
Adds indexes for reservation/status, request/status, expiration, actors, purpose, and lifecycle relations.
Adds database checks for dates, amounts, percentages, policy boundaries, and versions.
Does not update Reservation status values.
Does not execute Tilopay or Resend calls.
```

A production-like backup and normal Prisma migration review remain required before deployment.

## Files

```text
prisma/schema.prisma
prisma/migrations/20260723104500_phase_11_2_lifecycle_request_foundation/migration.sql
lib/availability/service.ts
types/availability.ts
docs/35-preparation-buffer-and-blocked-date-evaluation.md
docs/97-phase-11.2-lifecycle-request-persistence-and-audit-foundation.md
```

## Explicitly Deferred

```text
Admin lifecycle request creation/decision UI
Cancellation transaction and availability release
Policy exception authority and limits
Tilopay processModification execution and reconciliation
Adjustment-payment checkout
Automatic lifecycle hold creation, release, or cleanup worker
Exact lifecycle hold duration
Date-change repricing basis
Negative-difference refund authorization
Lifecycle email templates and orchestration
Guest self-service management portal or unauthenticated request endpoint
PMS behavior
```

## Required Validation

After copying the package into the repository, run:

```powershell
npm run env:validate
npm run db:format
npm run db:validate
npm run db:generate
npm run lint
npm run build
git diff --check
git status --short
```

Review the migration without applying it first:

```powershell
Get-Content .\prisma\migrations\20260723104500_phase_11_2_lifecycle_request_foundation\migration.sql
```

Apply it to the intended local/test database through the repository's normal workflow:

```powershell
npm run db:migrate:dev
```

Do not run a production deployment until the local/test migration, Prisma generation, build, and availability scenarios are accepted.

## Manual Acceptance Scenarios

```text
1. Existing Payment rows remain queryable and show purpose INITIAL_RESERVATION.
2. Existing Refund rows remain unchanged in status and receive the expected compatibility processing mode.
3. A valid cancellation request can store a 100%, 50%, or 0% typed policy snapshot at the exact boundaries.
4. A cancellation row with a requested date range is rejected by the database.
5. A no-op DATE_CHANGE row is rejected.
6. A STAY_EXTENSION that changes check-in or shortens check-out is rejected.
7. An ACTIVE future lifecycle hold blocks requested dates, buffers, and composed listings.
8. An expired, RELEASED, or EXPIRED hold does not block.
9. Excluding the original reservation does not exclude another reservation.
10. Excluding one lifecycle request does not exclude another request's hold.
11. Existing public reservation/payment behavior remains unchanged.
12. No new lifecycle action or email appears in the UI.
```

## Tracker Boundary

This implementation record intentionally does not mark 11.2 completed in `README.md`, `docs/10-phases.md`, or `docs/11-progress-log.md` before repository validation and migration acceptance. Those trackers should be updated in the acceptance/closure follow-up after the package is applied and the required checks pass.
