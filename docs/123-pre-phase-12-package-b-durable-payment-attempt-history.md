# 123 — Pre-Phase-12 Package B Durable Payment-Attempt History

## Implementation status

```text
Track: Pre-Phase-12 Improvement Track
Package: B — Durable payment-attempt history
Status: Completed and accepted
Implementation base: ec1e6ce7f43099864788f28ae30a87214afe554d
Prepared on: 2026-08-05
Accepted on: 2026-08-06
Accepted head: 795a95fec81bc7ff3f177304f2df3df35c4d59e6
Current phase: No active implementation phase
Phase 11: Completed and accepted
Phase 12: Not started and not activated
Package A: Completed and accepted
```

## Purpose

Package B adds a durable, safe record for each real Tilopay submission across the initial reservation checkout, the retry page, and lifecycle-adjustment payment links. It complements the financial `Payment` record and the existing SDK diagnostic events without replacing either one.

This package does not change pricing, payment approval, reservation confirmation, refund behavior, or the Phase 12 activation decision.

## Counting boundary

An attempt is persisted only after the existing server-side payment preflight succeeds. The preflight endpoint creates the durable row immediately before the browser is allowed to invoke `Tilopay.startPayment()`.

```text
Counted:
- initial checkout after a successful server preflight
- retry-page submission after a successful server preflight
- lifecycle-adjustment submission after a successful server preflight

Not counted:
- local card-field corrections
- client validation failures before preflight
- rejected or expired server preflights
- opening or initializing the Tilopay form without submitting it
```

The narrow interval between the successful preflight response and the client SDK invocation is the accepted submission boundary. A row left as `SUBMITTED` indicates that no safe terminal result was observed by TRP Booking.

## Persistence model

The migration adds `payment_submission_attempts`, related to both `payments` and `reservations` with restrictive foreign keys.

Each row stores only operational metadata:

```text
id
paymentId
reservationId
attemptNumber
source
status
environment
locale
safeResultCode
preflightExpiresAt
startedAt
submittedAt
completedAt
createdAt
updatedAt
```

Attempt numbers are reservation-wide and strictly ordered. This preserves one sequence even when an initial payment is rejected and the retry flow creates a new `Payment` row.

### Sources

```text
INITIAL_CHECKOUT
RETRY_PAGE
LIFECYCLE_ADJUSTMENT
```

Lifecycle-adjustment source is derived from the signed handoff-token shape. Initial versus retry source is derived from the same-origin request context and then validated against the stored payment purpose.

### Statuses

```text
STARTED
SUBMITTED
APPROVED
REJECTED
FAILED
UNKNOWN
```

New rows are persisted as `SUBMITTED` because creation occurs at the successful preflight boundary. `STARTED` remains available for recovery and compatibility if a future controlled flow needs to split reservation of an attempt number from provider submission; `STARTED` rows are not included in the admin total-attempt count.

## Result classification

The existing SDK diagnostic endpoint remains the source for safe local failures:

```text
TILOPAY_SDK_START_PAYMENT_NON_SUCCESS -> REJECTED
TILOPAY_SDK_START_PAYMENT_FAILED -> FAILED
```

The validated redirect remains authoritative and may replace a preliminary SDK classification:

```text
validated approval -> APPROVED
validated rejection -> REJECTED
consult unavailable / uncertain result -> UNKNOWN
safe validation or provider-processing failure -> FAILED
provider-approved payment with reservation-confirmation failure -> APPROVED with a safe confirmation-failure code
```

Only normalized allowlisted codes are stored. Card numbers, CVV, expiration values, credentials, raw provider payloads, and unbounded provider errors are excluded.

## Concurrency and safety

Attempt creation runs in a serializable transaction and retries bounded `P2002` or `P2034` conflicts. The transaction:

```text
- reloads the Payment and Reservation
- requires Payment.status = PENDING
- validates source against Payment.purpose
- rechecks the pending-reservation expiration or active lifecycle hold
- compares the current expiration with the validated preflight snapshot
- obtains the latest reservation-wide attempt number
- inserts exactly the next sequence number
```

The unique constraint on `(reservation_id, attempt_number)` protects ordering under concurrent requests.

Result updates never mutate `Payment`, `Reservation`, or provider evidence. They update only the latest attempt related to the validated payment. The validated provider redirect has authority over a preliminary SDK classification.

## Admin visibility

The existing payment-detail and reservation-detail routes now append a responsive, paginated, expandable attempt-history card.

Both views expose:

```text
total attempts
rejected/failed attempts
last-attempt time
last source
ordered attempt history
payment relation
source
status
environment
locale
started/completed timestamps
safe result code
```

The payment-detail route shows attempts for one `Payment`. The reservation-detail route aggregates the complete reservation-wide sequence across initial, retry, and lifecycle-adjustment payments.

The UI reuses existing centralized bilingual labels and statuses. No new visible feature-local copy or native browser UI was introduced.

## Schema and migration impact

```text
Prisma schema change: Yes
Migration: prisma/migrations/20260805213000_add_payment_submission_attempt_history/migration.sql
Seed change: No
New dependency: No
Environment-variable change: No
```

## Preserved contracts

```text
- Payment remains the financial source of truth.
- Payment approval remains server-validated through Tilopay consult and OrderHash checks.
- Reservation confirmation remains payment-driven and server-side.
- PaymentClientEvent remains the detailed safe SDK diagnostic record.
- Submission-attempt history is append-only during creation; no attempt is deleted.
- No card data or unsafe raw provider content is stored.
- No hard delete is introduced.
- No native alert(), confirm(), or prompt() is introduced.
- Phase 12 remains Not started.
- Package D remains deferred.
```

## Required acceptance matrix

### Migration and persistence

1. Run Prisma generation and schema validation successfully.
2. Apply the migration to a clean or current local/test database.
3. Verify both new enums and `payment_submission_attempts` exist in the configured `trp_booking` schema.
4. Verify both restrictive foreign keys and all declared indexes exist.
5. Verify the unique reservation-wide sequence constraint exists.
6. Verify no seed or environment-variable change is required.

### Initial checkout

7. Open an initial pending reservation without pressing Pay and verify no attempt is created.
8. Trigger only local Tilopay field validation and verify no attempt is created.
9. Submit valid local fields with an expired or invalid hold and verify the failed preflight creates no attempt.
10. Complete a successful preflight and verify attempt `1` is created as `INITIAL_CHECKOUT / SUBMITTED` immediately before provider invocation.
11. Approve the payment and verify the same attempt becomes `APPROVED` with completed time and safe code.
12. Reject the payment and verify the same attempt becomes `REJECTED` without exposing sensitive provider data.

### Retry page

13. Produce a retry-eligible rejected payment and open `/reservas/pago/reintentar` without submitting; verify no new attempt.
14. Submit the retry after successful preflight and verify the next reservation-wide attempt number uses source `RETRY_PAGE` even when a new `Payment` row was created.
15. Repeat a retry and verify sequence numbers remain unique and ordered.
16. Verify a local SDK non-success or thrown SDK error completes only the latest open attempt with a safe classification.

### Lifecycle adjustment

17. Open a valid lifecycle-adjustment link without submitting and verify no attempt is created.
18. Submit after successful preflight and verify the next reservation-wide attempt uses source `LIFECYCLE_ADJUSTMENT`.
19. Expire or release the lifecycle hold before preflight and verify no attempt is created.
20. Verify the active hold and preflight expiration snapshot are rechecked transactionally.
21. Approve, reject, and produce an uncertain consult result; verify `APPROVED`, `REJECTED`, and `UNKNOWN` respectively.

### Concurrency and authority

22. Send concurrent successful preflight requests for one reservation and verify unique monotonically increasing attempt numbers or safe rejection without duplicate numbers.
23. Replay an SDK diagnostic and verify it cannot create another attempt.
24. Replay a provider redirect and verify it does not create another attempt.
25. Record a preliminary SDK failure followed by a validated provider result and verify the validated provider classification wins.
26. Verify provider-result history persistence failure does not replace the existing safe payment redirect behavior.

### Admin and regression

27. Open payment detail and verify its attempt summary and expandable paginated history.
28. Open reservation detail and verify history aggregates attempts across all related Payment rows.
29. Verify total, rejected/failed count, last time, source, sequence, environment, locale, and safe code are correct.
30. Verify ES/EN, desktop/mobile layout, keyboard operation, accordion behavior, and pagination.
31. Verify existing payment, SDK-event, reservation, lifecycle, refund, and operational-history views remain unchanged.
32. Verify lint, production build, whitespace validation, and expected repository status.

## Acceptance closure

Package B was reported working and accepted on 2026-08-06 at `795a95fec81bc7ff3f177304f2df3df35c4d59e6`. The accepted head includes the follow-up that scopes the reservation-level attempt card to the **Payments and diagnostics** tab. Package C may proceed while Phase 12 remains inactive.
