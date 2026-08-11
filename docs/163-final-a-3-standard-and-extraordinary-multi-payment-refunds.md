# 163 — Final-A.3 Standard and Extraordinary Multi-Payment Refund Authorization

## Record

```text
Track: Post-Phase-12 / Pre-Phase-13 Final Improvement Track
Package: Final-A — Reservation financial correctness and effective stay value
Subphase: Final-A.3 — Standard and extraordinary multi-payment refund authorization
Status: Completed and accepted on 2026-08-11
Accepted head: 8d5884c4f536c0d9407fac2d0229b71105114453
Preparation date: 2026-08-11
Implementation base head: 9f4e04068726451ca87614dd99b1f10656510825
Previous subphase: Final-A.2 — Completed and accepted by owner commit
Final-A.2 accepted head: 9f4e04068726451ca87614dd99b1f10656510825
Strategy: docs/161-final-a-financial-correctness-strategy-and-roadmap.md
Next planned subphase: Final-A.4 — Negative DATE_CHANGE multi-payment integration
Phase 13: Not started
```

## Goal

Make standard-policy and extraordinary refund authorization operate against the Reservation-level
stay balance introduced in Final-A.2 while preserving one real `Refund` row per provider Payment.

A single admin authorization may therefore produce multiple child Refund rows.

Canonical example:

```text
Current stay value                         USD 195
INITIAL_RESERVATION captured Payment       USD 130
completed positive adjustment Payment      USD  65

logical extraordinary refund               USD 145

child Refund #1 -> initial Payment          USD 130
child Refund #2 -> adjustment Payment       USD  15
```

The admin authorizes one logical amount. The backend owns the deterministic provider allocation.

## Persistence Change

`Refund` gains:

```text
refundOperationKey String? @map("refund_operation_key")
```

with a non-unique index.

Migration:

```text
prisma/migrations/20260811151300_final_a_3_refund_operation_key/migration.sql
```

Historical Refund rows remain valid with `refundOperationKey = null`. No financial row is rewritten
or backfilled.

The existing `Refund.paymentId` relation remains mandatory. This is intentional because Tilopay
refund execution and reconciliation are tied to one concrete provider order.

## Logical Operation Keys

New standard operation:

```text
standard/<lifecycleRequestId>/<adminRequestId>
```

New extraordinary operation:

```text
extraordinary/<reservationId>/<adminRequestId>
```

Each provider child receives unique child request/idempotency keys containing the operation, leg
index, and source Payment ID.

This avoids the existing `Refund.clientRequestId @unique` constraint preventing multi-leg creation.

## Deterministic Allocation

New reusable module:

```text
lib/reservations/refund-allocation.ts
```

It consumes the already ordered `eligibleStayPayments` from
`lib/reservations/financial-summary.ts`.

Allocation remains:

```text
1. INITIAL_RESERVATION first.
2. Completed positive LIFECYCLE_ADJUSTMENT Payments after it.
3. Positive adjustments oldest capture first.
4. Skip Payments whose refundable balance is zero.
5. Consume one Payment completely before moving to the next.
```

The allocator fails if the logical amount exceeds the aggregate Reservation-level refundable stay
balance.

Examples:

```text
130 + 65; request 145
-> 130 + 15

130 + 65; request 195
-> 130 + 65

130 + 65; prior committed initial refund 20; request 145
-> 110 + 35

initial fully consumed; adjustment remaining 65; request 65
-> 65 from the completed adjustment Payment
```

`PENDING`, `PROCESSING`, `APPROVED`, and legacy `MANUAL` Refunds reserve balance through the
Final-A.2 financial summary. `FAILED` releases it.

## Standard-Policy Authorization

The cancellation request still provides the policy entitlement snapshot and retains
`sourcePaymentId` as historical context.

Final-A.3 no longer treats that source Payment as the only possible refund source.

Authorization now validates both independent limits:

```text
requested amount <= remaining standard-policy allowance
requested amount <= Reservation remaining refundable stay balance
```

For a Reservation whose current stay value is USD 195:

```text
100% policy -> up to USD 195
50% policy  -> up to USD 97.50
0% policy   -> not eligible
```

A USD 195 standard authorization can now create USD 130 + USD 65 provider Refund children.

The cancellation request row is still fenced/versioned once for the logical authorization.
Every allocated source Payment is fenced inside the same Serializable transaction.

## Extraordinary Authorization

Extraordinary authorization is now Reservation-level.

The authoritative inputs are:

```text
reservationId from route
amount
reason
processingMode
requestId
expectedReservationUpdatedAt
```

Legacy UI fields remain temporarily accepted as optional compatibility fields:

```text
paymentId?
expectedPaymentUpdatedAt?
```

They are no longer used to determine the eligible amount or allocation for a new operation.
Final-A.5 removes the single-Payment mental model from the admin presentation.

The Reservation may remain `CONFIRMED` or already be `CANCELLED`; extraordinary compensation still
does not change lifecycle status.

## Processing Mode

For an explicit admin operation:

```text
TILOPAY_API
-> every allocated child Payment must have a providerReference
-> otherwise the entire authorization fails before child Refund creation

TILOPAY_PORTAL_FALLBACK
-> every child uses portal fallback
```

One explicit logical operation never silently mixes API and portal modes.

## Provider Execution and Reconciliation

Provider execution remains child-level.

The normal admin Refund workflow was extended so a child may use either:

```text
INITIAL_RESERVATION Payment
or
completed positive DATE_CHANGE / STAY_EXTENSION adjustment Payment
```

A lifecycle-adjustment Payment is accepted here only when:

```text
purpose = LIFECYCLE_ADJUSTMENT
lifecycle request belongs to same Reservation
request type = DATE_CHANGE or STAY_EXTENSION
request status = COMPLETED
financialDifference > 0
Payment.amount = financialDifference
currency matches
```

Failed, expired, pending, compensated, zero, and unrelated adjustment payments remain ineligible.

Each child still executes/consults/reconciles against its own `Payment.providerReference`, amount,
and Tilopay evidence. Payment status changes only for the exact child Payment reconciled.

Final-A.3 does not aggregate provider success across siblings or claim success before evidence exists.

## Idempotency and Replay

The complete child set is created in one Serializable transaction.

Replay first searches by `refundOperationKey` and validates:

```text
aggregate amount
authorization type
lifecycle relation
processing mode
normalized reason
```

If the logical request differs, the replay fails closed.

Unique child request/idempotency keys provide the database conflict fence. A concurrent duplicate
that loses the Serializable/unique race reloads the existing operation instead of creating a second
set.

## Legacy Compatibility

Historical standard and extraordinary Refunds created before Final-A.3 keep:

```text
refundOperationKey = null
```

The implementation still recognizes the accepted Phase 11 legacy idempotency-key shapes on replay.
A legacy authorization is returned as a one-child operation rather than duplicated.

The API result keeps the existing compatibility field:

```text
refund
```

which points to the first provider child, and adds:

```text
refunds
refundOperationKey
requestedAmount
```

Existing admin code can therefore continue reading `result.refund` until Final-A.5 updates the UX.

## UI Boundary

Final-A.3 intentionally does not redesign the Refund admin section.

The existing UI may still send the legacy `paymentId` and `expectedPaymentUpdatedAt` fields and may
still visually calculate an extraordinary limit from one Payment. Those fields are accepted for
compatibility but are no longer authoritative server-side.

Final-A.5 owns:

```text
Reservation-level financial summary display
remaining refundable stay balance
logical operation grouping
provider-child presentation
multi-movement notification/operational-history polish
```

The backend/API capability introduced here can be validated independently before that UX change.

## Final-A.4 Boundary

Negative `DATE_CHANGE` still uses its Phase 11.5.5 single-source workflow in this subphase.

Final-A.4 will reuse `refund-allocation.ts` and the operation grouping contract for negative
Reservation-level stay corrections.

Failed-positive compensation remains intentionally separate and continues refunding the exact
failed adjustment Payment only.

## Final-A Test Strategy

Final-A.3 does not retain a dedicated per-subphase validator script. The temporary A.2 validator
and the initially prepared A.3 validator are removed before A.3 acceptance.

Automated business/regression tests for the allocation and financial-summary contracts are deferred
to Final-A.6 so the complete Final-A behavior is tested together after A.4 and A.5 are implemented.
Final-A.6 must cover at minimum:

```text
145 -> 130 + 15
195 -> 130 + 65
97.50 -> initial only
prior approved initial refund changes allocation
fully consumed initial Payment is skipped
PENDING Refund reserves balance
FAILED Refund releases balance
amount above aggregate balance is rejected
zero amount is rejected
standard / extraordinary / negative DATE_CHANGE integration
provider-child execution and reconciliation boundaries
```

A.3 itself remains gated by Prisma validation/migration status, lint/build, diff checks, and the
controlled functional Test scenarios below. Existing cross-cutting validators remain available but
no new one-off Final-A validator is added.

## Local/Test Acceptance Gate

Before accepting Final-A.3:

```text
[ ] npm run db:generate
[ ] npm run env:validate
[ ] npm run email:contract:validate
[ ] npm run airbnb:import-policy:validate
[ ] npm run airbnb:export-policy:validate
[ ] npm run airbnb:export-path:validate
[ ] npm run admin:calendar-display:validate
[ ] npm run db:validate
[ ] migration reviewed
[ ] npm run db:migrate:deploy
[ ] npm run db:migrate:status
[ ] npm run lint
[ ] npm run build
[ ] git diff --check
[ ] git status reviewed
```

Functional Test evidence must then cover at minimum:

```text
[ ] USD 145 extraordinary authorization over USD 130 + USD 65 creates 2 children: 130 + 15
[ ] replay with same request returns the same children
[ ] changed amount/reason/mode for same logical request is rejected
[ ] USD 195 standard 100% authorization can create 130 + 65
[ ] USD 97.50 standard 50% authorization remains one initial-Payment child
[ ] TILOPAY_API fails closed if any required allocated Payment lacks providerReference
[ ] each child can execute/consult/reconcile against its exact Tilopay order
[ ] reconciliation of one child does not mutate sibling Payment status
[ ] no Reservation lifecycle status change from extraordinary authorization
[ ] no duplicate Refund children under replay/concurrency
```

Provider execution against real sandbox orders should be performed only with controlled test data.
Do not create production transactions.

## Files Changed by Final-A.3

```text
prisma/schema.prisma
prisma/migrations/20260811151300_final_a_3_refund_operation_key/migration.sql
lib/reservations/refund-allocation.ts
lib/reservations/index.ts
lib/admin/refunds.ts
types/admin-refund.ts
app/api/admin/reservation-lifecycle-requests/[requestId]/refunds/route.ts
app/api/admin/reservations/[reservationId]/refunds/extraordinary/route.ts
package.json  # removes temporary Final-A per-subphase validator entries
README.md
docs/10-phases.md
docs/11-progress-log.md
docs/160-post-phase-12-pre-phase-13-final-improvement-track.md
docs/161-final-a-financial-correctness-strategy-and-roadmap.md
docs/162-final-a-2-central-financial-summary-and-cancellation-policy-correction.md
docs/163-final-a-3-standard-and-extraordinary-multi-payment-refunds.md
```

## Non-Goals

```text
- No Final-A.4 negative DATE_CHANGE multi-payment integration yet.
- No Final-A.5 Refund UX redesign/grouped operation presentation yet.
- No additional-charge Payment purpose from Final-D.
- No change to cancellation timing thresholds.
- No change to Tilopay credentials/provider endpoints.
- No Test Vercel scheduler activation.
- No Production resource/account work.
- Phase 13 remains Not started.
```

## Acceptance Note

The owner applied the Final-A.3 package and correction, `npm run build` passed, and the resulting
implementation was committed as:

```text
8d5884c4f536c0d9407fac2d0229b71105114453
fix(final-a): support multi-payment refund authorization
```

Per the Final-A test strategy, the complete automated financial/regression matrix remains deferred
to Final-A.6 rather than creating one-off test/validator scripts for A.3.

## Status After Implementation Package

```text
Final-A — In progress
Final-A.1 — Completed and accepted
Final-A.2 — Completed and accepted at 9f4e04068726451ca87614dd99b1f10656510825
Final-A.3 — Completed and accepted on 2026-08-11 at 8d5884c4f536c0d9407fac2d0229b71105114453
Final-A.4 — Implementation prepared; pending local validation and owner acceptance
Final-A.5 — Not started
Final-A.6 — Not started
Phase 13 — Not started
```
