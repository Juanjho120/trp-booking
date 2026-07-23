# 96 — Phase 11.1 Cancellation Policy and Tilopay Refund Contract Correction

## Correction Record

```text
Phase: Phase 11 — Cancellation, Refund, and Change Request Rules
Related subphase: 11.1 Lifecycle strategy, policy, and provider boundary
Status: Completed — documentation-only correction
Correction date: 2026-07-23
Correction base commit: ca875bb01f649356262122bf06c2b92a9f3ef99d
Corrected strategy: docs/95-phase-11-lifecycle-strategy-and-roadmap.md
Next subphase: 11.2 Lifecycle request persistence and audit foundation
Provider behavior validation subphase: 11.4 Refund authorization and Tilopay reconciliation
```

## Purpose

Correct two omissions in the original Phase 11.1 strategy without advancing the implementation phase:

```text
1. Restore the cancellation policy that had already been approved for TRP Booking.
2. Record the official Tilopay processModification request contract already supplied for this project.
```

The previous statements that cancellation percentages were unapproved and that no official refund endpoint contract existed are superseded by this document and the corrected `docs/95-phase-11-lifecycle-strategy-and-roadmap.md`.

This correction adds no application code, Prisma change, migration, seed change, dependency, environment variable, visible UI/email copy, provider request, reservation/payment mutation, availability change, calendar mutation, or PMS behavior.

## Approved Cancellation Policy

TRP Booking charges 100% of the reservation total when the guest books.

The approved direct-booking cancellation matrix is:

```text
At least 7 days before check-in
-> Refund 100% of the policy-eligible captured amount

From 72 hours through less than 7 days before check-in
-> Refund 50% of the policy-eligible captured amount

Less than 72 hours before check-in
-> Refund 0%
```

Deterministic server-side interpretation:

```text
hoursBeforeCheckIn >= 168
-> refundPercentage = 100

72 <= hoursBeforeCheckIn < 168
-> refundPercentage = 50

hoursBeforeCheckIn < 72
-> refundPercentage = 0
```

The cancellation instant is evaluated against the property's configured check-in date/time in the `America/Guatemala` business timezone. Therefore:

```text
Exactly 168 hours before check-in -> 100%
Exactly 72 hours before check-in  -> 50%
Same day / after check-in / no-show -> 0% under the standard policy
```

A zero-refund outcome does not prevent the admin from recording the cancellation and releasing the stay operationally. Cancellation and refund remain separate decisions and transactions. A refund-provider failure never restores a cancelled reservation.

## Pricing Boundary

The current MVP pricing model keeps these values at zero:

```text
cleaningFee
taxes
discounts
```

The approved percentages can therefore be applied to the current captured reservation amount without a nonzero-fee allocation problem. Before the business introduces nonzero cleaning fees, taxes, discounts, or non-refundable processing charges, their cancellation treatment must be explicitly approved and documented.

No general admin-exception policy is introduced by this correction. A future exception path must require an authorized actor, explicit reason, policy snapshot, calculated standard outcome, approved override outcome, and audit history.

## Date Changes and Extensions

The existing approved rules remain unchanged:

```text
- Guests cannot freely edit confirmed dates from the public website.
- A guest must request prior authorization or cancel and create a new reservation under the cancellation policy.
- An approved date change requires final availability validation.
- A stay extension requires availability validation and additional payment when applicable.
```

## Official Tilopay Modification Contract

The project-supplied official Tilopay documentation defines:

```text
POST https://app.tilopay.com/api/v1/processModification
Authorization: Bearer <token obtained through the server-side Tilopay token flow>
Content-Type: application/json
```

Documented body fields:

```text
orderNumber
- Number of the previously submitted Tilopay order.

type
- 1 = Capture
- 2 = Refund
- 3 = Reversal

amount
- Amount to modify.

key
- Tilopay integration key associated with the merchant.
```

Provider example:

```json
{
  "orderNumber": "1214352",
  "type": "2",
  "amount": "1.00",
  "key": "api_key"
}
```

Tilopay credentials, bearer tokens, request authorization headers, and raw sensitive provider data must remain server-side and must never be committed or exposed to guests/admins.

## What Is Known Versus Deferred

Known from the official request documentation:

```text
- Endpoint URL
- HTTP method
- Bearer authentication requirement
- Request field names
- Refund type = 2
- Reversal type = 3
- Capture type = 1
```

Deferred to actual 11.4 tests:

```text
- Whether processModification is enabled in sandbox for the current merchant account
- Exact successful HTTP status and response body
- Provider refund/reversal identifier fields
- Exact authentication and validation error responses
- Full-refund behavior
- Partial-refund behavior
- Multiple cumulative partial refunds
- Over-refund rejection
- Zero, negative, malformed, or wrong-currency behavior
- Unknown order behavior
- Already refunded or already reversed behavior
- Difference between refund and reversal for TRP Booking transaction states
- Duplicate identical request behavior
- Provider idempotency guarantees or lack thereof
- Timeout and uncertain-result recovery
- Reconciliation through consult or consultTransactions
```

These observations will be supplied from real endpoint tests when 11.4 begins. No success field, error code, retry rule, or provider idempotency guarantee is invented in advance.

## 11.4 Test Matrix

The refund/reversal adapter must not be finalized until the following tests are executed where sandbox supports them:

```text
1. Valid full refund.
2. Valid partial refund.
3. Second valid partial refund below the remaining amount.
4. Partial refund equal to the exact remaining refundable amount.
5. Refund greater than the remaining refundable amount.
6. Duplicate identical request sent once sequentially and once concurrently.
7. Retry after client timeout where the provider result is initially unknown.
8. Zero amount.
9. Negative amount.
10. Invalid decimal/format.
11. Missing orderNumber, type, amount, or key.
12. Unknown orderNumber.
13. Invalid/expired bearer token.
14. Invalid merchant key.
15. Type 2 against an already fully refunded order.
16. Type 3 reversal against each provider-supported transaction state.
17. Reconciliation through the existing consult path.
18. Transaction-list reconciliation through consultTransactions when useful.
```

For every test, record the sanitized HTTP status, safe response shape, provider state, whether money/state changed, whether repeating the request changes the result again, and whether a provider reference can be persisted.

## Safe Execution Boundary

The future 11.4 flow must preserve this order:

```text
1. Validate admin authorization, reservation/payment state, policy snapshot, amount, and cumulative refundable limit.
2. Create an idempotent Refund intent as PENDING inside a database transaction.
3. Commit the transaction.
4. Call processModification after commit.
5. Confirm or reconcile the provider result.
6. Mark Refund APPROVED/FAILED according to the validated contract.
7. Update Payment to PARTIALLY_REFUNDED or REFUNDED only after confirmed cumulative reversal.
8. Never restore Reservation from CANCELLED because provider execution failed.
```

A merchant-portal operation remains available as an audited fallback or reconciliation path if the API is unavailable, disabled in sandbox/production, or returns an uncertain result. It is not the only assumed implementation path.

## Documentation Updates

```text
README.md
docs/10-phases.md
docs/11-progress-log.md
docs/95-phase-11-lifecycle-strategy-and-roadmap.md
docs/96-phase-11.1-cancellation-policy-and-tilopay-refund-contract-correction.md
```

## Validation

Because this correction is documentation-only, run the normal repository gate:

```powershell
npm run env:validate
npm run db:validate
npm run lint
npm run build
git diff --check
git status --short
```

The correction itself performs no endpoint test and makes no claim that `processModification` works in sandbox. That evidence belongs to 11.4.
