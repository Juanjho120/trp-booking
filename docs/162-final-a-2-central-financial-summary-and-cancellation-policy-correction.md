# 162 — Final-A.2 Central Financial Summary and Cancellation-Policy Correction

## Record

```text
Track: Post-Phase-12 / Pre-Phase-13 Final Improvement Track
Package: Final-A — Reservation financial correctness and effective stay value
Subphase: Final-A.2 — Central financial summary and cancellation-policy correction
Status: Implementation prepared — pending local/Test validation and owner acceptance
Preparation date: 2026-08-11
Implementation base head: 19531568752a44446d0802d6581262260b881aaf
Previous subphase: Final-A.1 — Completed and accepted by owner commit
Final-A.1 accepted head: 19531568752a44446d0802d6581262260b881aaf
Strategy: docs/161-final-a-financial-correctness-strategy-and-roadmap.md
Next planned subphase: Final-A.3 — Standard and extraordinary multi-payment refund authorization
Phase 13: Not started
```

## Goal

Introduce the centralized Reservation financial summary frozen in Final-A.1 and correct the
cancellation-policy amount base without yet changing Refund persistence, the standard/extraordinary
authorization API, or Tilopay provider execution.

This subphase fixes the first concrete financial defect:

```text
initial stay/payment              USD 130
completed positive adjustment     USD  65
current Reservation.total         USD 195

old 100% cancellation base        USD 130
new 100% cancellation base        USD 195

old 50% cancellation base         USD  65
new 50% cancellation base         USD  97.50
```

The existing 168-hour / 72-hour timing thresholds do not change.

## Implementation

### Central financial summary

New file:

```text
lib/reservations/financial-summary.ts
```

The service reads authoritative Reservation, Payment, lifecycle-request, and Refund state and
returns:

```text
reservationId
currency
originalStayAmount
approvedCompletedPositiveStayAdjustments
currentStayValue
capturedStayPayments
committedStayRefunds
approvedStayRefunds
remainingRefundableStayBalance
additionalChargeGrossAmount
additionalChargeCapturedAmount
additionalChargeRefundedAmount
eligibleStayPayments[]
```

The additional-charge values remain zero in Final-A.2. Final-D owns their future implementation.

### Current stay contract value

The service preserves the Final-A.1 source-of-truth rule:

```text
currentStayValue = Reservation.total
```

The current stay contract is not reconstructed by summing provider Payments.

### Eligible initial Payment

Exactly one captured initial Payment must exist:

```text
purpose = INITIAL_RESERVATION
lifecycleRequestId = null
same Reservation
currency matches Reservation
status in APPROVED / PARTIALLY_REFUNDED / REFUNDED
```

No captured initial Payment produces a dedicated financial-summary error that the cancellation
boundary maps to the existing:

```text
ADMIN_CANCELLATION_SOURCE_PAYMENT_NOT_FOUND
```

Multiple captured initial Payments fail closed as an inconsistent financial state.

### Eligible completed positive adjustment Payment

A lifecycle Payment contributes to captured stay value only when:

```text
purpose = LIFECYCLE_ADJUSTMENT
same Reservation
currency matches
status in APPROVED / PARTIALLY_REFUNDED / REFUNDED
linked lifecycle request = DATE_CHANGE or STAY_EXTENSION
linked lifecycle request status = COMPLETED
financialDifference > 0
Payment.amount = financialDifference
paidAt exists
```

The summary excludes:

```text
PENDING adjustment Payments
rejected/failed Payments
approved Payments whose final mutation failed
FAILED/EXPIRED lifecycle requests
zero/negative lifecycle branches
future additional-charge Payments
```

A duplicate captured positive Payment for the same completed lifecycle request fails closed.

### Refund accounting

Committed balance continues to include:

```text
PENDING
PROCESSING
APPROVED
MANUAL
```

Approved/completed reporting includes:

```text
APPROVED
MANUAL
```

`FAILED` Refund rows remain historical evidence but do not reserve balance.

Per eligible stay Payment:

```text
remainingRefundableAmount =
  Payment.amount - committed Refund amount
```

Reservation aggregate:

```text
remainingRefundableStayBalance =
  sum(remainingRefundableAmount)
```

Any committed Refund total exceeding its exact Payment amount fails closed.

### Deterministic payment ordering

The summary already returns eligible stay Payments in the allocation order frozen for Final-A.3:

```text
1. INITIAL_RESERVATION
2. completed positive LIFECYCLE_ADJUSTMENT Payments
3. oldest capture first
4. createdAt and id as stable tie-breakers
```

Final-A.2 does not create multi-payment Refunds. It only establishes the reusable ordered pool.

## Cancellation Correction

`lib/admin/reservation-cancellation.ts` no longer owns a separate Payment query or caps policy
entitlement with the initial Payment amount.

After the existing Reservation optimistic/Serializable fence, cancellation creation obtains the
central financial summary in the same transaction.

The policy calculation now requires:

```text
summary.reservationId = Reservation.id
summary.currency = Reservation.currency
summary.currentStayValue = Reservation.total
one eligible INITIAL_RESERVATION Payment
```

Policy amount:

```text
standardRefundAmount =
  summary.currentStayValue * refundPercentage / 100
```

The helper lives in:

```text
lib/reservations/cancellation-policy.ts
calculateStandardCancellationPolicyAmount()
```

Examples:

```text
USD 195 * 100% = USD 195.00
USD 195 *  50% = USD  97.50
USD 195 *   0% = USD   0.00
```

The cancellation request still stores:

```text
sourcePaymentId = validated INITIAL_RESERVATION Payment id
```

This is retained only as historical/source context. Final-A.3 will remove the assumption that every
standard Refund must be created against that one Payment.

## Audit Evidence

`RESERVATION_CANCELLATION_REQUEST_CREATED` adds bounded numeric financial evidence:

```text
policyBaseAmount
capturedStayPayments
committedStayRefunds
remainingRefundableStayBalance
eligibleStayPaymentCount
```

No provider payload, card value, credential, token, or private URL is added.

## Export Boundary

`lib/reservations/index.ts` exports the new financial summary service and types so later Final-A
subphases can reuse one contract instead of recreating financial calculations.

## Validation Script

New validation:

```text
scripts/validate-final-a-2-financial-summary.ts
npm run final-a:financial-summary:validate
```

The deterministic validation covers:

```text
- original-only Reservation
- completed positive STAY_EXTENSION
- completed positive DATE_CHANGE
- zero adjustment exclusion
- failed positive completion plus compensation exclusion
- PENDING Refund reservation of balance
- FAILED Refund release of balance
- negative/current-contract example with committed refund
- initial-payment-first ordering
- 100% of USD 195 = USD 195.00
- 50% of USD 195 = USD 97.50
- 0% of USD 195 = USD 0.00
- missing initial Payment fails with the dedicated source-payment error
- duplicate initial Payment fails closed
- mismatched completed positive adjustment fails closed
```

## Scope Boundaries

Final-A.2 intentionally does not change:

```text
Prisma schema
database migrations
Refund.paymentId
standard Refund authorization API
extraordinary Refund authorization API
Tilopay processModification
Tilopay consult/reconciliation
negative DATE_CHANGE Refund allocation
admin Refund UI
guest/admin visible copy
email templates
Phase 13 resources
Test scheduler registration
```

Therefore a corrected cancellation request may now freeze a USD 195 policy amount while the existing
pre-A.3 standard Refund authorization still cannot allocate USD 195 across a USD 130 initial Payment
plus a USD 65 adjustment Payment.

That remaining provider-allocation limitation is the exact scope of Final-A.3 and is not hidden or
treated as an A.2 regression.

## Files Added

```text
lib/reservations/financial-summary.ts
scripts/validate-final-a-2-financial-summary.ts
docs/162-final-a-2-central-financial-summary-and-cancellation-policy-correction.md
```

## Files Updated

```text
README.md
package.json
lib/admin/reservation-cancellation.ts
lib/reservations/cancellation-policy.ts
lib/reservations/index.ts
docs/10-phases.md
docs/11-progress-log.md
docs/160-post-phase-12-pre-phase-13-final-improvement-track.md
docs/161-final-a-financial-correctness-strategy-and-roadmap.md
```

## Required Local Validation

```powershell
npm run final-a:financial-summary:validate
npm run env:validate
npm run email:contract:validate
npm run airbnb:import-policy:validate
npm run airbnb:export-policy:validate
npm run airbnb:export-path:validate
npm run admin:calendar-display:validate
npm run db:validate
npm run db:migrate:status
npm run lint
npm run build
git diff --check
git status --short
```

No migration command is required because Final-A.2 does not change `prisma/schema.prisma`.

## Required Functional Validation

Use a controlled Test Reservation with a successfully completed positive date change or extension.

Required evidence:

```text
current Reservation.total = USD 195.00
eligible captured stay Payments = USD 130.00 + USD 65.00
cancellation created >=168 hours before check-in:
  standardRefundPercentage = 100
  standardRefundAmount = USD 195.00

separate controlled case 72..<168 hours:
  standardRefundPercentage = 50
  standardRefundAmount = USD 97.50

less than 72 hours:
  standardRefundPercentage = 0
  standardRefundAmount = USD 0.00
```

An original-only Reservation must retain its previous correct behavior.

Do not execute a USD 195 standard Refund as part of Final-A.2 acceptance. Multi-payment provider
allocation belongs to Final-A.3.

## Cross-Track Performance Baseline

The Final Improvement Track performance baseline remains evidence-only and must be captured before
Final-A.2 is finally accepted or explicitly carried into the immediately following validation
checkpoint.

No optimization belongs to this subphase.

## Acceptance Boundary

Do not mark Final-A.2 completed until the owner supplies the required validation evidence.

Expected next state after acceptance:

```text
Final-A.1 — Completed and accepted
Final-A.2 — Completed and accepted
Final-A.3 — In progress / next
Final-A — In progress
Phase 13 — Not started
```
