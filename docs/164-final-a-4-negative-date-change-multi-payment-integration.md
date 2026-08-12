# 164 — Final-A.4 Negative DATE_CHANGE Multi-Payment Integration

## Record

```text
Track: Post-Phase-12 / Pre-Phase-13 Final Improvement Track
Package: Final-A — Reservation financial correctness and effective stay value
Subphase: Final-A.4 — Negative DATE_CHANGE multi-payment integration
Status: Completed and accepted on 2026-08-11
Accepted head: 1c5ea765543e46b89beb64ecb3c06141e8efd8e4
Preparation date: 2026-08-11
Implementation base head: 8d5884c4f536c0d9407fac2d0229b71105114453
Previous subphase: Final-A.3 — Completed and accepted
Final-A.3 accepted head: 8d5884c4f536c0d9407fac2d0229b71105114453
Strategy: docs/161-final-a-financial-correctness-strategy-and-roadmap.md
Next planned subphase: Final-A.5 — Admin UX, notification copy, and operational-history integration
Phase 13: Not started
```

## Goal

Make a negative date-mutation financial correction operate against the Reservation-level eligible
stay-payment pool instead of assuming that the full refund must fit inside the original
`INITIAL_RESERVATION` Payment.

Final-A.4 reuses the financial summary and deterministic allocator accepted in Final-A.2/A.3.

Canonical example:

```text
INITIAL_RESERVATION captured Payment             USD 130
prior completed positive adjustment Payment      USD  65
current captured stay pool                        USD 195

negative DATE_CHANGE financialDifference         USD -145

child LIFECYCLE_ADJUSTMENT Refund #1             USD 130 -> initial Payment
child LIFECYCLE_ADJUSTMENT Refund #2             USD  15 -> prior adjustment Payment
                                                  -------
logical negative-difference refund                USD 145
```

The requested dates/pricing and every Refund child are committed in the same Serializable lifecycle
completion transaction.

## Existing Defect Removed

Before Final-A.4, the negative branch performed both of these single-payment assumptions:

```text
admin decision balance check:
  sourcePayment.amount - committed Refunds on sourcePayment

negative completion:
  create one Refund for abs(financialDifference) against sourcePayment
```

`sourcePayment` is the historical validated initial Payment. After a successfully completed positive
DATE_CHANGE/STAY_EXTENSION, additional captured stay money can exist in one or more completed
`LIFECYCLE_ADJUSTMENT` Payments. The old negative path ignored that money.

Final-A.4 replaces that amount boundary with the Reservation financial summary.

## Reservation-Level Balance Validation

The decision/completion path now resolves:

```text
getReservationFinancialSummary(reservationId, transaction)
```

and validates:

```text
financialSummary.currency == lifecycle request currency
validated sourcePayment == first/initial eligible stay Payment
remainingRefundableStayBalance >= abs(financialDifference)
```

Committed `PENDING`, `PROCESSING`, `APPROVED`, and legacy `MANUAL` Refunds continue reserving the
available balance through the central summary. `FAILED` Refunds continue releasing it.

## Negative Refund Operation

New negative operations use the Final-A.1 frozen grouping key:

```text
lifecycle-negative/<lifecycleRequestId>
```

Each provider child has its own permanent client/idempotency key:

```text
lifecycle-negative/<lifecycleRequestId>/<legNumber>/<paymentId>
```

Every child keeps:

```text
authorizationType = LIFECYCLE_ADJUSTMENT
lifecycleRequestId = current negative request
refundOperationKey = lifecycle-negative/<current request id>
amount = deterministic allocator leg amount
status = PENDING
processingMode = TILOPAY_API when that exact Payment has providerReference,
                 otherwise TILOPAY_PORTAL_FALLBACK
```

Automatic negative operations may therefore contain API and portal-fallback children when the
underlying historical Payments require different safe provider handling. The processing mode remains
a property of the exact provider movement, not the logical Reservation operation.

## Deterministic Allocation

Final-A.4 reuses:

```text
lib/reservations/refund-allocation.ts
```

The order remains unchanged:

```text
1. INITIAL_RESERVATION Payment first.
2. Prior completed positive LIFECYCLE_ADJUSTMENT Payments next.
3. Oldest positive adjustment capture first.
4. Skip fully consumed Payments.
5. Consume each Payment's remaining refundable balance before moving to the next.
```

No new pricing, refund-order, or policy rule is introduced.

## Atomic Completion Contract

The existing negative approval route already executes inside a bounded Serializable transaction.
Within that same transaction Final-A.4 now performs:

```text
PENDING_REVIEW -> APPROVED
final request/Reservation snapshot validation
final timing validation
final availability and preparation-buffer validation
Reservation-level refundable-balance validation
deterministic multi-payment allocation
create every PENDING LIFECYCLE_ADJUSTMENT Refund child
apply requested Reservation dates and pricing
APPROVED -> COMPLETED
supersede/recreate arrival-instruction intent as applicable
create lifecycle notification intents
write bounded audit records
```

Any failure rolls the complete mutation back. A partial set of negative Refund children cannot be
committed independently from the Reservation date/pricing mutation.

## Result Compatibility

The negative completion result keeps the historical first-child fields:

```text
paymentId
refundId
```

and adds operation-aware fields:

```text
paymentIds[]
refundIds[]
refundOperationKey
requestedRefundAmount
```

The first child remains the initial-payment-first allocation leg whenever that Payment has remaining
balance. Existing internal callers that only use completion/alreadyProcessed behavior remain valid.

## Replay and Historical Compatibility

New operations validate the complete `lifecycle-negative/<requestId>` child set:

```text
- every child belongs to the same lifecycle request
- every child is LIFECYCLE_ADJUSTMENT
- every child currency matches
- every child amount is positive
- every paymentId belongs to the central eligible stay-payment pool
- no Payment is duplicated in the operation
- aggregate child amount == abs(financialDifference)
```

Historical pre-Final-A.4 negative completions remain accepted with their original single Refund:

```text
refundOperationKey = null
idempotencyKey = lifecycle-adjustment/negative-difference/<requestId>
paymentId = historical initial source Payment
amount = abs(financialDifference)
```

Final-A.4 does not backfill or rewrite those records.

## Provider Execute / Consult / Reconcile Boundary

`lib/admin/lifecycle-adjustment-refund-workflow.ts` previously required every negative lifecycle
Refund to:

```text
use INITIAL_RESERVATION Payment
match request.sourcePaymentId
carry the full abs(financialDifference) amount
```

That gate now supports two safe forms:

```text
1. Historical legacy single initial-Payment Refund.
2. Final-A.4 grouped child under lifecycle-negative/<requestId>.
```

For the grouped form, the workflow validates the complete sibling operation and confirms each child
Payment belongs to `getReservationFinancialSummary(...).eligibleStayPayments` before provider work.

Execution, consult, and reconciliation remain one exact provider transaction per child. Payment
status is still changed only by conclusive reconciliation for that exact Payment.

## Failed-Positive Compensation Is Intentionally Unchanged

A positive adjustment Payment whose final Reservation mutation fails remains outside the effective
stay-payment pool because its lifecycle request never reached `COMPLETED`.

Its compensation still creates exactly one Refund:

```text
authorizationType = LIFECYCLE_ADJUSTMENT
paymentId = exact failed request's approved adjustment Payment
amount = exact adjustment Payment amount
refundOperationKey = null
```

Final-A.4 does not allocate failed-positive compensation across unrelated stay Payments.

## Audit / Notification Boundary

The completion audit now records bounded operation context:

```text
refundId                 # first child compatibility
refundIds[]
refundPaymentIds[]
refundOperationKey
refundRequestedAmount
refundLegCount
```

No raw provider payload, credential, card data, or private header is added.

Existing lifecycle notification timing remains unchanged. Final-A.5 owns the user-facing copy and
grouped Refund presentation so one logical refund split across provider movements is clear to admins
and guests.

## Final-A Test Strategy

Final-A.4 adds **no new validation script and no per-subphase business-test suite**.

Per the owner-approved workflow, complete automated financial/regression coverage is implemented in
Final-A.6 after A.4 and A.5 are finished. That suite must include negative operations spanning the
initial Payment and one or more prior completed positive adjustment Payments.

A.4 itself is gated by compilation/static project validation and a controlled functional smoke only.

## Local Acceptance Gate

No Prisma schema or migration changes are introduced by Final-A.4. The Final-A.3 migration remains
the authoritative `refund_operation_key` persistence change.

Run:

```text
npm run db:validate
npm run db:migrate:status
npm run lint
npm run build
git diff --check
git status --short
```

Controlled functional evidence should verify one negative date change whose refund uses more than
one eligible stay Payment, without manufacturing Production provider evidence. Full automated cases
remain Final-A.6.

## Files Changed by Final-A.4

```text
lib/admin/reservation-date-mutation.ts
lib/admin/lifecycle-adjustment-refund-workflow.ts
lib/reservations/lifecycle-adjustment-refunds.ts
lib/reservations/negative-date-mutation-completion.ts
README.md
docs/10-phases.md
docs/11-progress-log.md
docs/160-post-phase-12-pre-phase-13-final-improvement-track.md
docs/161-final-a-financial-correctness-strategy-and-roadmap.md
docs/163-final-a-3-standard-and-extraordinary-multi-payment-refunds.md
docs/164-final-a-4-negative-date-change-multi-payment-integration.md
```

## Non-Goals

```text
- No Final-A.5 admin financial-summary/refund-operation UI redesign.
- No Final-A.6 automated financial/regression suite yet.
- No new validation script.
- No Prisma schema/migration/dependency/environment change.
- No cancellation-threshold change.
- No pricing-rule work from Final-C.
- No additional-charge work from Final-D.
- No provider credential or endpoint change.
- No Test scheduler activation.
- No Production infrastructure/account work.
- Phase 13 remains Not started.
```

## Status After Implementation Package

```text
Final-A — In progress
Final-A.1 — Completed and accepted
Final-A.2 — Completed and accepted at 9f4e04068726451ca87614dd99b1f10656510825
Final-A.3 — Completed and accepted at 8d5884c4f536c0d9407fac2d0229b71105114453
Final-A.4 — Completed and accepted on 2026-08-11 at 1c5ea765543e46b89beb64ecb3c06141e8efd8e4
Final-A.5 — Current implementation/validation package
Final-A.6 — Not started
Phase 13 — Not started
```
