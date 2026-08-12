# 166 — Final-A.6 Integrated Acceptance and Documentation Closure

## Record

```text
Track: Post-Phase-12 / Pre-Phase-13 Final Improvement Track
Package: Final-A — Reservation financial correctness and effective stay value
Subphase: Final-A.6 — Integrated acceptance and documentation closure
Status: Implementation prepared — pending local/Test validation and owner acceptance
Preparation date: 2026-08-12
Implementation base head: 4117435dd52f6278a205e314db95d336ce0f7662
Previous subphase: Final-A.5 — Completed and accepted on 2026-08-12
Final-A.5 accepted head: 4117435dd52f6278a205e314db95d336ce0f7662
Strategy: docs/161-final-a-financial-correctness-strategy-and-roadmap.md
Phase 13: Not started
```

## Goal

Provide one durable, repeatable, non-destructive regression gate for the complete Final-A financial
contract and reconcile Final-A documentation around the accepted A.1 through A.5 implementation.

Final-A.6 does not add a new business capability. It verifies that the financial source of truth,
refund allocation, negative DATE_CHANGE handling, provider-child boundaries, admin presentation,
transactional email copy, and operational-history correlation continue to work together.

Final-A remains **In progress** until the owner runs the complete A.6 gate successfully and explicitly
accepts the package.

## Permanent Validation Command

Final-A.6 adds one package-level command:

```text
npm run final-a:validate
```

Implementation:

```text
tsx tests/final-a/run.ts
```

No Jest, Vitest, or additional testing dependency is introduced. The project already uses `tsx` and
`node:assert/strict` for executable contract validators, so Final-A.6 follows that established
lightweight pattern.

The temporary A.2/A.3 validation scripts used while those intermediate packages were being built are
not restored. A.6 is the durable final regression gate for the complete accepted Final-A behavior.

## Test Safety Boundary

`npm run final-a:validate` is intentionally deterministic and non-destructive.

It does **not**:

```text
- connect to Supabase
- insert/update/delete real reservations, payments, refunds, or audit rows
- call Tilopay
- call Resend
- send email
- execute a Vercel cron
- require Production credentials
- provision or mutate any Production resource
```

Financial fixtures are in memory. The negative DATE_CHANGE transaction tests use an in-memory
`Prisma.TransactionClient`-shaped fixture only for the repository operations exercised by the
accepted allocator. Provider/concurrency boundaries that require a real database or network are
covered by source-contract assertions plus the normal Local/Test operational gate.

## Automated Suite Layout

```text
tests/final-a/harness.ts
tests/final-a/fixtures.ts
tests/final-a/financial-summary-and-policy.test.ts
tests/final-a/refund-allocation-and-negative-lifecycle.test.ts
tests/final-a/admin-and-email.test.ts
tests/final-a/source-contract.test.ts
tests/final-a/run.ts
```

The initial A.6 package contains 44 deterministic assertions grouped into four suites.

### Financial summary and cancellation policy

Covers:

```text
- original-only Reservation
- completed positive DATE_CHANGE
- completed positive STAY_EXTENSION
- zero adjustment exclusion
- failed positive completion plus compensation exclusion
- negative correction with gross capture preserved and refund balance reduced
- committed PENDING / PROCESSING / APPROVED / MANUAL refund reservation
- FAILED refund balance release
- Final-D additional-charge placeholders remain isolated at zero
- deterministic initial-payment-first ordering
- duplicate initial payment failure
- mismatched positive adjustment failure
- current stay value exceeding captured stay funds failure
- exact >=168h / 72..<168h / <72h policy thresholds
- USD 195 policy amounts: USD 195 / USD 97.50 / USD 0
```

### Refund allocation and negative lifecycle

Covers:

```text
- extraordinary USD 145 -> USD 130 initial + USD 15 adjustment
- full USD 195 -> USD 130 + USD 65
- USD 97.50 standard policy stays on the initial Payment when available
- prior approved refund reallocates only remaining balance
- pending refund reserves balance
- failed refund releases balance
- fully consumed initial Payment spills into completed adjustment Payment
- zero and aggregate over-refund rejection
- negative DATE_CHANGE creates one logical multi-payment operation
- child processing mode remains exact-Payment based
- replay returns existing negative-operation children without duplication
- mismatched persisted replay fails closed
- negative amount above aggregate refundable balance fails closed
- stable lifecycle-negative operation key
```

### Admin, notification, and localization regression

Covers:

```text
- operation-oriented admin grouping
- historical null operation keys remain independent
- guest split-operation refund email confirms only the current child
- guest split-operation email does not expose internal refundOperationKey
- admin split-operation email includes safe operation correlation
- ES/EN split-operation copy remains aligned
- single-child refund keeps ordinary completed copy
- negative DATE_CHANGE email shows the complete logical negative difference
- ES/EN message object shape parity
- new Final-A admin/email copy exists in both locales
```

### Source and transaction boundary contracts

Covers the invariants that must remain visible in the accepted implementation:

```text
- standard/extraordinary authorization uses ReservationFinancialSummary + allocator
- every allocated Payment leg is fenced with its own updatedAt
- refund operation keys and child idempotency keys remain stable
- standard/extraordinary authorization remains Serializable
- P2002/P2034 replay/concurrency handling remains present
- Tilopay execute/consult/reconcile stays bound to one child Refund and its exact Payment/order
- negative DATE_CHANGE uses Reservation-level summary + deterministic allocator
- failed-positive compensation remains bound to the exact adjustment Payment amount
- negative completion authorizes Refund children before mutating Reservation pricing/dates
- admin authorization payload does not restore paymentId/expectedPaymentUpdatedAt as authority
- admin groups siblings but keeps child execute/consult/reconcile actions
- split-operation email context and aggregate negative status remain enabled
- Prisma keeps nullable indexed refund_operation_key
```

## Final-A Acceptance Matrix Mapping

The strategy matrix in `docs/161-final-a-financial-correctness-strategy-and-roadmap.md` remains the
acceptance source of truth.

A.6 maps it as follows:

```text
A1-A14   executable financial-summary / allocator fixtures
A15-A19  executable cumulative-balance fixtures + source contracts
A20      executable negative-operation replay test + operation-key contracts
A21      Serializable / version-fence / P2002-P2034 source contracts
A22-A24  child Refund / exact Payment provider source contracts
A25      extraordinary workflow remains Reservation-status independent by accepted A.3 implementation
A26-A27  lifecycle source contracts plus existing normal build/regression gate
A28      executable ES/EN message and email tests
A29      bounded safe presentation/email inputs and normal lint/build review
A30      db validation/status + Final-A suite + lint + build + diff/status gate
```

A.6 deliberately does not fake a successful provider network call or mutate shared Test data merely
to increase test count. Real provider behavior remains controlled Test evidence and the accepted
Tilopay reconciliation workflow remains unchanged.

## Full Local Acceptance Gate

Run from the repository root after applying the A.6 package:

```text
npm run db:validate
npm run db:migrate:status
npm run final-a:validate
npm run lint
npm run build
git diff --check
git status --short
```

Expected database result:

```text
- Prisma schema validates.
- Existing A.3 refund_operation_key migration remains the latest Final-A schema change.
- A.6 introduces no migration.
```

Expected Final-A validator result:

```text
Final-A validation passed: 44/44 tests.
```

The exact console line is produced by the lightweight Final-A test harness after every registered
assertion completes successfully.

## Controlled Test Review

Because A.6 adds only tests and documentation, it does not require manufacturing new financial
transactions in the shared Test database before commit.

Before final owner acceptance, review the already deployed/current Test admin behavior when suitable
sample data exists:

```text
[ ] Reservation-level financial summary remains visible and coherent.
[ ] Existing split Refund operation shows siblings grouped together.
[ ] Each child still exposes independent execute / consult / reconcile controls.
[ ] Operational history still correlates siblings through refundOperationKey.
[ ] Existing refund emails preserve child-level provider evidence and split-operation wording.
[ ] No Test scheduler registration was added.
[ ] No Production resource was introduced.
```

If no safe existing split-operation record exists, do not create a real financial/provider mutation
solely to satisfy this documentation item. The automated fixture and accepted A.3-A.5 implementation
remain the repeatable regression evidence.

## A.5 Acceptance Reconciliation

The owner reported a clean local gate/build and committed Final-A.5 without errors on 2026-08-12.
The resulting remote head is:

```text
4117435dd52f6278a205e314db95d336ce0f7662
feat(final-a): integrate reservation-level refund UX
```

Final-A.6 therefore records that head as the accepted A.5 boundary.

## Documentation State in This Package

This package updates the authoritative trackers to:

```text
Final-A.1 — Completed and accepted
Final-A.2 — Completed and accepted
Final-A.3 — Completed and accepted
Final-A.4 — Completed and accepted
Final-A.5 — Completed and accepted at 4117435dd52f6278a205e314db95d336ce0f7662
Final-A.6 — Implementation prepared; pending local/Test validation and owner acceptance
Final-A — In progress
Final-B — Not started
Phase 13 — Not started
```

The trackers intentionally do **not** mark Final-A completed before the owner runs the A.6 gate.
After a successful A.6 commit and explicit acceptance, a final tracker reconciliation can record the
accepted A.6 head, close Final-A, and make Final-B the next package.

## Files Added or Changed by Final-A.6

```text
package.json
tests/final-a/harness.ts
tests/final-a/fixtures.ts
tests/final-a/financial-summary-and-policy.test.ts
tests/final-a/refund-allocation-and-negative-lifecycle.test.ts
tests/final-a/admin-and-email.test.ts
tests/final-a/source-contract.test.ts
tests/final-a/run.ts
README.md
docs/10-phases.md
docs/11-progress-log.md
docs/160-post-phase-12-pre-phase-13-final-improvement-track.md
docs/161-final-a-financial-correctness-strategy-and-roadmap.md
docs/165-final-a-5-admin-refund-ux-notification-and-operational-history.md
docs/166-final-a-6-integrated-acceptance-and-documentation-closure.md
```

## Non-Goals

```text
- No Final-B implementation.
- No Final-C pricing rules.
- No Final-D additional charges.
- No Final-E reviews.
- No Final-F Twilio/WhatsApp implementation.
- No Final-G optimization.
- No Final-H closure.
- No new Prisma model/migration.
- No Production account, credential, DNS, scheduler, database, payment, email, media, or WhatsApp work.
- Phase 13 remains Not started.
```

## Status After A.6 Implementation Package

```text
Final-A — In progress
Final-A.1 — Completed and accepted
Final-A.2 — Completed and accepted
Final-A.3 — Completed and accepted
Final-A.4 — Completed and accepted
Final-A.5 — Completed and accepted on 2026-08-12 at 4117435dd52f6278a205e314db95d336ce0f7662
Final-A.6 — Implementation prepared; pending local/Test validation and owner acceptance
Final-B — Not started
Phase 13 — Not started
```
