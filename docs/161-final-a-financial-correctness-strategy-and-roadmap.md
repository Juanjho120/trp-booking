# 161 — Final-A.1 Financial Correctness Strategy and Roadmap

## Record

```text
Track: Post-Phase-12 / Pre-Phase-13 Final Improvement Track
Package: Final-A — Reservation financial correctness and effective stay value
Subphase: Final-A.1 — Financial source-of-truth and refund-allocation contract
Status: Completed and accepted on 2026-08-11
Accepted head: 19531568752a44446d0802d6581262260b881aaf
Preparation date: 2026-08-11
Repository review head: e57e2ce09c8cec69fc951a5d19976d499231c92a
Track plan: docs/160-post-phase-12-pre-phase-13-final-improvement-track.md
Phase 12: Completed and accepted
Phase 13: Not started
```

## Purpose

Freeze the financial source of truth and provider-allocation rules required to fix the confirmed
Final-A defect before changing application code.

The correction must handle the Reservation as one stay contract while preserving the fact that
Tilopay captured that contract through one or more independent payment transactions.

The implementation must not rewrite historical `Payment.amount`, collapse separate provider orders,
or pretend that a later paid stay adjustment changed the original Tilopay transaction.

## Confirmed Defect

Accepted reproduction:

```text
Initial Reservation total:                  USD 130
INITIAL_RESERVATION Payment:                USD 130 APPROVED

Completed positive DATE_CHANGE/EXTENSION:   USD  65
LIFECYCLE_ADJUSTMENT Payment:               USD  65 APPROVED

Current Reservation.total:                  USD 195

Requested extraordinary refund:             USD 145
Current behavior:                           rejected against the original USD 130 Payment
Required reservation-level behavior:        USD 145 is financially eligible when no other
                                            committed refunds have consumed that balance
```

The provider cannot receive a single USD 145 refund against the original USD 130 order. The
reservation-level authorization therefore has to allocate the logical refund over the real captured
payment transactions.

For the example above the accepted deterministic allocation is:

```text
INITIAL_RESERVATION payment       USD 130 refund leg
first completed positive adjustment USD 15 refund leg
-----------------------------------------------------
logical extraordinary refund      USD 145
```

## Repository Findings

The review was performed against:

```text
e57e2ce09c8cec69fc951a5d19976d499231c92a
docs(final-track): register Final-A through Final-H
```

### 1. Cancellation policy is capped by the initial Payment

`lib/admin/reservation-cancellation.ts` currently loads only one
`INITIAL_RESERVATION` Payment.

`calculateCancellationPolicy()` calculates:

```text
eligibleCapturedAmount = min(Reservation.total, initial Payment.amount)
standardRefundAmount = eligibleCapturedAmount * policy percentage
```

After a paid positive adjustment:

```text
Reservation.total = 195
initial Payment.amount = 130
policy base = 130   <-- incorrect
```

The timing matrix itself is correct. The amount base is not.

### 2. Extraordinary refund is tied to one initial Payment

`lib/admin/refunds.ts` currently requires the extraordinary request to provide one `paymentId`,
requires that Payment to have `purpose = INITIAL_RESERVATION`, and calculates:

```text
remainingPaymentAmount =
  Payment.amount - committed Refund amounts for that Payment
```

The same file creates one `Refund` linked to that one Payment.

That is the direct reason a USD 145 refund is rejected against a USD 130 initial payment even when
the Reservation has a second successfully captured USD 65 stay-adjustment Payment.

### 3. Standard refund execution is also Payment-local

The standard-policy path snapshots an initial source Payment and enforces both:

```text
remaining policy allowance
remaining source-Payment balance
```

A 100% policy refund after the accepted USD 130 + USD 65 example would therefore also be unable to
return the complete USD 195 stay value through the current authorization path.

### 4. Negative DATE_CHANGE has the same structural limitation

`lib/admin/reservation-date-mutation.ts` currently checks the negative financial difference only
against the remaining balance of `request.sourcePayment`, which is the initial Payment.

`lib/reservations/lifecycle-adjustment-refunds.ts` then requires the negative-difference Refund to
be created against that exact `INITIAL_RESERVATION` Payment.

A later negative DATE_CHANGE can therefore fail incorrectly after earlier refunds or positive
adjustments even when the Reservation still has refundable captured stay money in another completed
adjustment Payment.

### 5. Positive completion already updates the correct stay contract

`lib/reservations/date-mutation-completion.ts` already applies the requested pricing snapshot to the
Reservation only after the exact positive `LIFECYCLE_ADJUSTMENT` Payment is approved and final
completion succeeds.

Successful completion updates:

```text
Reservation.subtotal
Reservation.cleaningFee
Reservation.taxes
Reservation.discounts
Reservation.total
```

Therefore `Reservation.total` is already the authoritative current stay contract value after a
successful positive, zero, or negative date mutation.

A positive adjustment Payment whose final mutation fails does not update `Reservation.total` and
must remain outside the effective-stay payment pool. Its existing exact compensating Refund path is
preserved.

### 6. Provider refund execution is necessarily per Payment

`Refund.paymentId` is mandatory.

Provider execution uses the selected Refund's exact Payment and
`Payment.providerReference`/Tilopay order number. Reconciliation also changes the financial status
of that exact Payment only.

This is correct and must remain true.

Final-A therefore separates:

```text
reservation-level authorization / balance
from
provider-level Refund legs
```

### 7. Admin UI currently exposes a single-Payment balance

`features/admin/components/admin-reservation-refund-section.tsx` currently chooses one
`extraordinaryPayment`, calculates refunds only for that Payment, and displays its remaining amount.

The admin should instead authorize against the Reservation's remaining refundable stay balance.

The provider split is an implementation detail that should be shown transparently after
authorization, not a reason to make the admin manually calculate the Reservation-level entitlement.

---

## Final-A Financial Source of Truth

Create one centralized reservation financial-summary service.

The exact file name is frozen as:

```text
lib/reservations/financial-summary.ts
```

The public typed contract may be placed in the same module or a dedicated type file if the
implementation remains clearer.

The summary must provide the equivalent of:

```text
reservationId
currency

originalStayAmount
currentStayValue

capturedStayPayments
committedStayRefunds
approvedStayRefunds
remainingRefundableStayBalance

eligibleStayPayments[]
```

Each eligible payment entry must provide enough server-side data to authorize/fence an allocation:

```text
paymentId
purpose
amount
currency
status
providerReference presence
paidAt / deterministic ordering timestamp
remainingRefundableAmount
owning lifecycle request when applicable
```

Future Final-D additional charges are explicitly excluded from these values.

## Current Stay Value

Authoritative rule:

```text
currentStayValue = Reservation.total
```

Do not reconstruct the current contractual stay value only by summing Payments.

Reasons:

```text
- DATE_CHANGE can fully reprice the stay.
- Negative DATE_CHANGE reduces Reservation.total and creates a separate refund movement.
- STAY_EXTENSION increases Reservation.total only after successful completion.
- Failed positive completion leaves Reservation.total unchanged.
- Historical Payment/Refund rows remain financial evidence, not a replacement for current stay
  contract state.
```

`originalStayAmount` is anchored to the validated initial stay/payment snapshot and exists for audit
and presentation. It does not override `Reservation.total`.

## Eligible Stay-Payment Pool

A Payment contributes to the stay-payment pool only when it represents captured money for the
currently accepted stay lifecycle.

### INITIAL_RESERVATION

Eligible when:

```text
purpose = INITIAL_RESERVATION
same Reservation
currency matches Reservation.currency
status in APPROVED / PARTIALLY_REFUNDED / REFUNDED
payment is the validated captured initial Reservation payment
```

### LIFECYCLE_ADJUSTMENT

Eligible only when all of the following are true:

```text
purpose = LIFECYCLE_ADJUSTMENT
same Reservation
currency matches Reservation.currency
status in APPROVED / PARTIALLY_REFUNDED / REFUNDED
linked lifecycle request is DATE_CHANGE or STAY_EXTENSION
linked lifecycle request status = COMPLETED
linked lifecycle request financialDifference > 0
Payment.amount equals the accepted positive financialDifference
```

This excludes:

```text
PENDING adjustment payments
REJECTED/FAILED adjustment payments
approved adjustment payments whose final mutation failed
approved adjustment payments whose request became FAILED/EXPIRED
compensated failed-positive payments
unrelated future additional-charge payments
```

The existing compensation path for a failed positive adjustment remains bound to that exact
adjustment Payment and is not reclassified as stay value.

## Refund-Balance Contract

Committed Refund statuses remain:

```text
PENDING
PROCESSING
APPROVED
MANUAL
```

`FAILED` remains historical evidence but releases reserved refund balance.

For each eligible stay Payment:

```text
paymentRemaining =
  max(0, Payment.amount - committed Refund amounts for that Payment)
```

Reservation-level refundable stay balance:

```text
remainingRefundableStayBalance =
  sum(paymentRemaining for every eligible stay Payment)
```

Approved/refunded reporting uses `APPROVED` and historical `MANUAL` as the completed financial
movement set.

No authorization may exceed the aggregate remaining stay balance.

Provider reconciliation must still independently ensure that Refunds assigned to one Payment never
exceed that individual Payment's amount.

---

## Deterministic Multi-Payment Allocation

One logical standard, extraordinary, or negative-difference authorization may produce one or more
provider Refund rows.

Allocation order is frozen as:

```text
1. INITIAL_RESERVATION Payment first.
2. Completed positive LIFECYCLE_ADJUSTMENT Payments next.
3. Adjustment Payments ordered oldest capture first.
4. Fully consumed Payments are skipped.
```

Within deterministic ties use stable persisted ordering such as:

```text
paidAt
createdAt
id
```

The allocator consumes each Payment's remaining balance before moving to the next Payment.

Example:

```text
Initial remaining:       130
Adjustment #1 remaining:  65
Requested refund:        145

leg #1 -> Initial:       130
leg #2 -> Adjustment #1: 15
```

Example after a prior USD 20 extraordinary Refund against the initial Payment:

```text
Initial remaining:       110
Adjustment #1 remaining:  65
Requested refund:        145

leg #1 -> Initial:       110
leg #2 -> Adjustment #1: 35
```

The complete set of child Refund authorizations is created atomically in one Serializable database
transaction. Either every leg is authorized or none is.

Provider network calls continue to occur only after authorization commits and remain one exact call
per Refund/payment order.

## Why Initial-Payment-First

This order preserves the maximum amount of accepted Phase 11 behavior:

```text
- A refund that still fits completely inside the initial Payment behaves as it does today.
- Only the amount that cannot fit in the initial Payment spills into completed adjustment Payments.
- Existing historical initial-payment refund expectations remain stable.
- Provider order selection is deterministic and replay-safe.
```

---

## Refund Operation Grouping

`Refund` remains the provider-level financial movement.

Do not introduce a second full refund aggregate table in Final-A.

Instead add one nullable grouping key:

```text
Refund.refundOperationKey String?
database column: refund_operation_key
indexed, not unique
```

Purpose:

```text
- associate multiple provider Refund legs with one logical admin/automatic authorization
- support deterministic replay
- group the admin UI
- preserve the exact Payment relation on every Refund
- keep historical Refund rows valid without destructive backfill
```

Historical rows may remain `refundOperationKey = null`.

New operation keys are stable and bounded.

Conceptual forms:

```text
standard/<cancellationRequestId>/<adminRequestId>
extraordinary/<reservationId>/<adminRequestId>
lifecycle-negative/<lifecycleRequestId>
```

Each child Refund receives its own unique child idempotency/client key containing the operation key
and `paymentId`.

The same logical operation cannot be replayed with a different amount, authorization type, reason,
processing mode, Reservation/lifecycle request, or allocation set.

## Provider Processing Mode

### Explicit admin standard/extraordinary authorization

If the admin selects:

```text
TILOPAY_API
```

every allocated Payment leg must have a usable provider order reference. Otherwise authorization
fails closed and the admin may choose the explicit portal-fallback mode.

If the admin selects:

```text
TILOPAY_PORTAL_FALLBACK
```

all child Refund rows use that mode.

Do not silently mix provider API and portal modes inside one admin authorization.

### Automatic negative DATE_CHANGE

Preserve the existing evidence-safe behavior:

```text
Payment has provider reference -> TILOPAY_API
Payment lacks provider reference -> TILOPAY_PORTAL_FALLBACK
```

Because the negative lifecycle operation is system-created after an approved admin lifecycle
decision, each child may derive the safe processing mode from its exact source Payment.

---

## Cancellation Policy Correction

The 100% / 50% / 0% timing matrix remains unchanged.

Freeze:

```text
standardPolicyAmount =
  Reservation.total * policyPercentage / 100
```

rounded to two decimals.

Do not cap the policy entitlement by the initial Payment.

Example:

```text
current Reservation.total = 195

>=168 hours -> 195.00
72..<168     -> 97.50
<72          -> 0.00
```

The policy amount and captured balance remain independent gates.

A standard refund authorization must satisfy both:

```text
requested amount <= remaining standard-policy allowance
requested amount <= remaining refundable stay balance
```

The existing cancellation request may continue storing the initial `sourcePaymentId` as historical
source context. That field no longer means that all standard Refund legs must be linked to that one
Payment.

## Extraordinary Refund Correction

The admin authorizes compensation against the Reservation, not a manually selected Payment.

The request contract should no longer require the client to select:

```text
paymentId
expectedPaymentUpdatedAt
```

The server derives and fences the eligible stay-payment pool.

The admin supplies:

```text
reservationId from route
amount
reason
processingMode
requestId
expectedReservationUpdatedAt
```

The amount may exceed the remaining initial-Payment balance as long as it does not exceed the
Reservation's aggregate refundable stay balance.

Extraordinary Refunds remain independent from cancellation and do not change Reservation status.

## Negative DATE_CHANGE Correction

A negative financial difference is a Reservation-level stay-price correction.

The negative completion transaction must:

```text
validate current Reservation and requested snapshot
validate aggregate refundable stay balance
allocate abs(financialDifference) across eligible stay Payments
create every LIFECYCLE_ADJUSTMENT Refund leg atomically
apply the requested Reservation dates/pricing
complete the lifecycle request
preserve arrival-instruction and lifecycle-notification behavior
```

The Refund legs all retain:

```text
authorizationType = LIFECYCLE_ADJUSTMENT
lifecycleRequestId = current negative DATE_CHANGE request
refundOperationKey = lifecycle-negative/<current request id>
```

A child Refund may be linked to:

```text
the initial Payment
or
a prior completed positive adjustment Payment
```

The existing failed-positive compensation path remains different:

```text
one exact compensation Refund
against the failed request's exact approved adjustment Payment
```

Do not allocate compensation across other stay Payments.

---

## Admin UX Contract

The Reservation refund section must stop presenting an arbitrary single Payment as the
Reservation-level limit.

Add a safe financial summary showing the equivalent of:

```text
Current stay value
Captured stay payments
Committed/refunded stay amount
Remaining refundable stay balance
```

Standard authorization shows:

```text
policy percentage
policy amount
remaining policy allowance
remaining refundable stay balance
```

Extraordinary authorization shows:

```text
remaining refundable stay balance
outside-policy warning
no-cancellation warning
```

The admin enters one logical amount.

After authorization, if the amount spans multiple Payments, the UI groups the child Refund rows by
`refundOperationKey` and clearly shows each provider movement.

Provider execute / consult / reconcile actions remain per child Refund because each child maps to one
real Tilopay order.

## Guest/Admin Refund Notifications

Final-A preserves the existing evidence rule:

```text
no REFUND_PROCESSED notification before a child Refund is reconciled APPROVED
```

A logical operation split across multiple provider payments can therefore produce multiple
provider-movement refund confirmations as each real movement is reconciled.

Final-A.5 must make the copy explicit enough that the guest/admin can understand that one requested
refund may be returned in more than one payment-provider movement.

Do not claim that a sibling Refund succeeded before its own reconciliation evidence exists.

---

## Concurrency and Idempotency

All Reservation-level authorization/allocation operations must use Serializable transactions.

At authorization time:

```text
- re-read Reservation state
- re-read eligible stay Payments
- re-read committed Refunds
- calculate summary and allocation inside the transaction
- fence selected Payment rows
- create all child Refund rows atomically
```

Replay uses `refundOperationKey` plus exact child idempotency keys.

Concurrent authorizations must not allow:

```text
aggregate committed Refunds > aggregate eligible stay captures
per-Payment committed Refunds > Payment.amount
standard committed Refunds > policy allowance
duplicate child Refunds for one operation
```

Provider execution/reconciliation remains separately fenced by Refund/Payment `updatedAt` and
existing provider evidence rules.

---

## Final-A Subphase Roadmap

```text
Final-A.1 Financial source-of-truth and refund-allocation contract
  Status: Completed and accepted on 2026-08-11 at 19531568752a44446d0802d6581262260b881aaf
  Scope: this document and tracker activation only
  Application code/schema changes: none

Final-A.2 Central financial summary and cancellation-policy correction
  Status: Completed and accepted on 2026-08-11 at 9f4e04068726451ca87614dd99b1f10656510825
  Record: docs/162-final-a-2-central-financial-summary-and-cancellation-policy-correction.md
  Scope:
  - lib/reservations/financial-summary.ts
  - Reservation-level financial projection
  - current Reservation.total cancellation base
  - initial regression coverage
  - no multi-payment Refund creation yet

Final-A.3 Standard and extraordinary multi-payment refund authorization
  Status: Completed and accepted on 2026-08-11 at 8d5884c4f536c0d9407fac2d0229b71105114453
  Record: docs/163-final-a-3-standard-and-extraordinary-multi-payment-refunds.md
  Scope:
  - Refund.refundOperationKey migration
  - deterministic allocation helper
  - standard/extraordinary authorization across eligible stay Payments
  - API/type changes
  - existing per-child Tilopay execution/reconciliation preserved

Final-A.4 Negative DATE_CHANGE multi-payment integration
  Status: Implementation prepared; pending local validation and owner acceptance
  Record: docs/164-final-a-4-negative-date-change-multi-payment-integration.md
  Scope:
  - aggregate balance validation
  - multi-leg LIFECYCLE_ADJUSTMENT Refund creation
  - prior completed positive adjustment Payments eligible
  - failed-positive compensation remains exact and unchanged

Final-A.5 Admin UX, notification copy, and operational-history integration
  Status: Not started
  Scope:
  - Reservation financial summary in admin
  - logical Refund grouping
  - provider-leg visibility
  - ES/EN copy
  - refund notification clarity
  - protected operational-history coherence

Final-A.6 Integrated acceptance and documentation closure
  Status: Not started
  Scope:
  - full Final-A regression matrix
  - hosted Test validation where required
  - documentation reconciliation
  - advance track to Final-B only after explicit acceptance
```

## Cross-Track Performance Baseline

The Final Improvement Track requires a small performance baseline before or at the start of Final-A.

Final-A.1 does not change runtime code, so baseline capture may occur immediately after this strategy
commit and before Final-A.2 acceptance.

At minimum preserve representative hosted Test observations for:

```text
public landing
Apartamento Blanco y Negro
Bungalow Refugio Perfecto
Refugio Completo
public booking/availability interaction
admin dashboard/reservations/calendar through an authenticated browser
```

This evidence is not a Final-A performance gate. Optimization remains Final-G.

## Final-A Acceptance Matrix

Final-A.6 must prove at minimum:

```text
A1  Original-only Reservation keeps current accepted behavior.
A2  Completed positive DATE_CHANGE contributes its captured adjustment Payment.
A3  Completed positive STAY_EXTENSION contributes its captured adjustment Payment.
A4  Failed positive completion does not contribute its adjustment Payment.
A5  Zero adjustment does not create a new captured Payment.
A6  Negative adjustment reduces Reservation.total and creates exact refund leg(s).
A7  Cancellation policy on USD 130 + USD 65 uses USD 195.
A8  50% cancellation on USD 195 produces USD 97.50 policy amount.
A9  100% standard refund can allocate USD 130 + USD 65.
A10 Extraordinary USD 145 on USD 130 + USD 65 authorizes USD 130 + USD 15.
A11 Prior partial Refunds alter allocation without exceeding aggregate balance.
A12 Fully consumed initial Payment is skipped and a completed adjustment can fund later Refunds.
A13 Pending/processing Refunds reserve balance.
A14 FAILED Refunds release reserved balance.
A15 Standard policy allowance ignores EXTRAORDINARY consumption but captured balance still limits
    actual new Refund authorization.
A16 Negative DATE_CHANGE can allocate across multiple eligible stay Payments.
A17 Failed-positive compensation remains against the exact failed adjustment Payment only.
A18 Per-Payment approved Refund total never exceeds Payment.amount.
A19 Aggregate committed stay Refund total never exceeds eligible captured stay balance.
A20 Replay returns the same operation/children.
A21 Concurrent authorizations cannot over-allocate.
A22 Tilopay API execution still uses each child Payment's exact provider order.
A23 Consult evidence still matches child amount/order/type/reference.
A24 Payment status changes only for the child Payment actually reconciled.
A25 Reservation lifecycle status remains independent from extraordinary financial compensation.
A26 Existing cancellation availability release remains unchanged.
A27 Existing arrival/lifecycle email rules remain unchanged except explicit multi-movement copy.
A28 ES/EN admin financial labels and errors remain equivalent.
A29 No raw provider/card/private values are exposed.
A30 env/db/migration/lint/build/diff/status validation passes.
```

## Explicit Non-Goals

```text
- No Final-B iCal admin implementation.
- No Final-C pricing rules.
- No Final-D additional charges.
- No Final-E reviews.
- No Final-F Twilio/WhatsApp implementation.
- No Final-G performance optimization.
- No Phase 13 resource or scheduler activation.
- No change to cancellation timing thresholds.
- No change to the public 15-minute hold.
- No change to the lifecycle 60-minute hold.
- No card-data handling.
- No hard deletion or financial-history rewrite.
```

## Files Reviewed for This Strategy

```text
AGENTS.md
README.md
docs/10-phases.md
docs/11-progress-log.md
docs/101-phase-11.4.2-extraordinary-refund-authorization-and-consult-evidence-lock.md
docs/112-phase-11.5.5-negative-and-compensating-lifecycle-refunds.md
docs/160-post-phase-12-pre-phase-13-final-improvement-track.md
prisma/schema.prisma
lib/admin/reservation-cancellation.ts
lib/admin/refunds.ts
lib/admin/reservation-date-mutation.ts
lib/admin/lifecycle-adjustment-refund-workflow.ts
lib/admin/reservation-detail.ts
lib/reservations/date-mutation-completion.ts
lib/reservations/negative-date-mutation-completion.ts
lib/reservations/lifecycle-adjustment-refunds.ts
lib/email/lifecycle-notifications.ts
features/admin/components/admin-reservation-refund-section.tsx
types/admin-refund.ts
types/admin-reservation-detail.ts
app/api/admin/reservations/[reservationId]/refunds/extraordinary/route.ts
app/api/admin/reservation-lifecycle-requests/[requestId]/refunds/route.ts
```

## Acceptance Boundary for Final-A.1

This subphase is documentation/contract only.

No application code, Prisma schema, migration, dependency, environment variable, provider request,
Test scheduler, or Production resource is changed by Final-A.1.

Acceptance result:

```text
Final-A.1 -> Completed and accepted on 2026-08-11
Accepted head -> 19531568752a44446d0802d6581262260b881aaf
Final-A.2 -> Completed and accepted at 9f4e04068726451ca87614dd99b1f10656510825
Final-A.2 record -> docs/162-final-a-2-central-financial-summary-and-cancellation-policy-correction.md
Final-A.3 -> Completed and accepted on 2026-08-11 at 8d5884c4f536c0d9407fac2d0229b71105114453
Final-A.3 record -> docs/163-final-a-3-standard-and-extraordinary-multi-payment-refunds.md
Final-A.4 -> Current implementation/validation package
Final-A.4 record -> docs/164-final-a-4-negative-date-change-multi-payment-integration.md
Phase 13 -> Not started
```
