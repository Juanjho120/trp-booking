# 178 — Final-C.6 Integrated Regression and Documentation Closure

## Record

```text
Project: TRP Booking
Track: Post-Phase-12 / Pre-Phase-13 Final Improvement Track
Package: Final-C — Pricing rules: seasonal and length-of-stay
Subphase: Final-C.6 — Integrated regression and documentation closure
Status: Completed and accepted on 2026-08-28
Preparation date: 2026-08-27
Acceptance date: 2026-08-28
Implementation base head: 4fd36fd25484adda7d24a7df4da3c1738835474c
Final-C.6 closure-gate commit: 1391b69a6bb591cc7d4e8a68b577ea8bda4fb8fe
Final-C accepted feature head: dca50f51abe1836d3b678b762693219143b12099
Previous subphase: Final-C.5 — Completed and accepted on 2026-08-27
Final-C.5 feature head: a88b26c0e2782daad7ea3215eb5b12f8f5124806
Final-C.5 accepted head: 4fd36fd25484adda7d24a7df4da3c1738835474c
Authoritative strategy: docs/173-final-c-1-pricing-strategy-precedence-and-persistence-contract.md
Persistence foundation: docs/174-final-c-2-pricing-persistence-foundation-and-migration.md
Central pricing engine: docs/175-final-c-3-central-pricing-engine-and-public-pending-reservation-integration.md
Admin pricing management: docs/176-final-c-4-admin-pricing-rule-management.md
Lifecycle pricing integration: docs/177-final-c-5-date-change-stay-extension-pricing-integration.md
Final-C status: Completed and accepted on 2026-08-28
Next package after Final-C acceptance: Final-D — Additional charges and guest payment requests
Phase 13: Not started
```

## Purpose

Final-C.6 owns the single consolidated acceptance gate required by the Final-C.1 contract. It does
not introduce a new pricing type or another pricing engine. It verifies that the already implemented
Final-C behavior is coherent across persistence, public quoting, pending reservations, protected
admin management and lifecycle repricing before Final-C is allowed to close.

This subphase keeps one permanent automated entry point:

```bash
npm run final-c:validate
```

C.6 extends that existing gate rather than creating a parallel validator.

---

# 1. Final-C Scope Being Closed

Final-C contains exactly:

```text
Final-C.1 Pricing strategy, precedence and persistence contract
Final-C.2 Pricing persistence foundation and migration
Final-C.3 Central pricing engine and public quote/pending-reservation integration
Final-C.4 Admin pricing-rule management
Final-C.5 DATE_CHANGE/STAY_EXTENSION pricing integration
Final-C.6 Integrated regression and documentation closure
```

Supported price sources remain:

```text
Seasonal absolute nightly rate
Length-of-stay absolute nightly rate
Property.baseNightlyPrice fallback
```

Frozen precedence remains:

```text
1. matching active Seasonal rate
2. otherwise highest eligible active LOS tier
3. otherwise Property.baseNightlyPrice
```

No stacking is introduced.

---

# 2. Consolidated Automated Gate

Existing Final-C files remain part of the same runner:

```text
tests/final-c/admin-pricing.test.ts
tests/final-c/lifecycle-pricing.test.ts
tests/final-c/pricing-engine.test.ts
tests/final-c/source-contract.test.ts
```

C.6 adds:

```text
tests/final-c/integrated-acceptance.test.ts
```

and updates:

```text
tests/final-c/run.ts
```

The expected registered-test count becomes:

```text
41 tests
```

The new C.6 coverage intentionally fills gaps from the C.1 acceptance matrix instead of duplicating
all prior tests.

---

# 3. Base and LOS Acceptance

The consolidated gate must establish:

```text
[x] base-only calculation remains deterministic when no rule is supplied
[x] one-night stay ignores LOS tiers
[x] exact 2/3/4/5/6/7/15/30 thresholds select the matching configured tier
[x] between-threshold stays choose the highest eligible configured tier
[x] missing tiers are skipped deterministically
[x] repository filters disabled/deleted LOS rows
[x] rules remain scoped to the requested Property
```

The C.6 threshold test exercises every frozen tier in one permanent regression matrix.

---

# 4. Seasonal and Precedence Acceptance

The consolidated gate verifies:

```text
[x] seasonal start date is inclusive
[x] seasonal end date is exclusive
[x] seasonal values below base remain valid
[x] seasonal values above base remain valid
[x] overlapping active seasonal rules fail closed
[x] adjacent seasonal ranges remain valid
[x] seasonal overrides LOS only for matching nights
[x] non-seasonal nights fall back to LOS/base
[x] repository filters disabled/deleted seasonal rows
[x] seasonal configuration remains Property-scoped
```

No arbitrary priority field or row-order tie breaker is introduced.

---

# 5. Public Quote and Pending Reservation Acceptance

The consolidated source/runtime contracts retain:

```text
[x] public quote delegates to the central pricing repository/engine
[x] mixed-rate subtotal is the integer-cent sum of resolved nights
[x] mixed-rate UI does not present one misleading universal nightly rate
[x] pending Reservation persists numeric totals plus FINAL_C_V1 pricing evidence
[x] pending-hold reuse revalidates against the authoritative quote
[x] guest validation remains in the existing pending-hold boundary
[x] availability validation remains independent from pricing
[x] accepted Reservation total remains the persisted financial amount
```

The public DTO continues to exclude internal pricing-rule IDs and audit evidence.

---

# 6. Historical Stability Acceptance

Final-C remains prospective.

The C.2 migration is guarded so that it:

```text
creates nullable pricing JSON columns
creates Seasonal/LOS persistence
performs no historical Reservation pricing UPDATE
seeds no Seasonal/LOS pricing rules
fabricates no historical pricing snapshot
```

For historical reservations:

```text
persisted numeric totals remain authoritative
null Reservation.pricingSnapshot remains valid until a new pricing event occurs
legacy extension uses PRESERVED_LEGACY_STAY
no historical BASE/LOS/SEASONAL rule source is invented
```

Editing, disabling or deleting a live rule therefore cannot mutate an already accepted Reservation
snapshot or numeric total.

---

# 7. Lifecycle Acceptance

C.5 is accepted at:

```text
4fd36fd25484adda7d24a7df4da3c1738835474c
```

The consolidated gate retains the following invariants:

```text
DATE_CHANGE
- reprices the complete requested replacement stay
- uses full requested stay length for LOS eligibility
- uses Seasonal > LOS > base on every requested night
- freezes requested pricing evidence on the lifecycle request

STAY_EXTENSION
- never reprices accepted nights
- prices only [originalCheckOut, requestedCheckOut)
- uses resulting total stay length for LOS eligibility
- preserves accepted modern snapshot segments
- preserves legacy totals through PRESERVED_LEGACY_STAY
- appends only newly priced evidence
```

Completion remains integrated with the accepted Final-A financial branches:

```text
positive difference -> adjustment hold/payment path
zero difference     -> transactional zero completion
negative difference -> multi-payment refund allocation/completion
```

All successful completion branches promote the frozen requested pricing snapshot to
`Reservation.pricingSnapshot` together with requested dates and numeric totals.

---

# 8. Admin / Security / Audit Acceptance

The permanent Final-C gate continues to guard:

```text
admin session requirement
same-origin mutation validation
supported LOS tier set only
positive absolute amounts
valid half-open seasonal date ranges
expectedUpdatedAt optimistic concurrency
Serializable seasonal overlap protection
bounded transaction retry
P2034 conflict handling
P2002 durable uniqueness handling
safe AdminAuditLog evidence
localized ES/EN admin pricing UI
no native alert()/confirm()/prompt()
```

The dedicated admin route remains:

```text
/admin/accommodations/[propertyId]/pricing
```

`complete-retreat` remains an independently priced Property; it does not derive a price by summing
its component accommodations.

---

# 9. Repository Validation Gate

Run from the repository root after applying the C.6 package:

```bash
npm run db:generate
npm run db:validate
npm run db:migrate:status
npm run final-a:validate
npm run final-b:validate
npm run final-c:validate
npm run lint
npm run build
git diff --check
```

Expected Final-C test result:

```text
Final-C validation passed: 41/41 tests.
```

No new database migration is expected in C.6.

---

# 10. Hosted Test Acceptance Matrix

Final-C cannot be marked completed merely because the TypeScript/build gate is green. C.6 owns a
controlled Hosted Test smoke on the existing Test environment.

Environment boundary:

```text
Domain: trp-booking.juantzun.dev
TRP_ENVIRONMENT=test
Vercel scheduler registrations: zero
Production resources: untouched
```

Minimum Hosted Test matrix:

```text
A. Admin pricing access
- authenticated admin can open Pricing for each of the three accommodations
- non-admin/unauthenticated access remains rejected by the protected boundary
- desktop and mobile layouts remain usable

B. Property isolation
- Apartment preview uses only Apartment pricing
- Bungalow preview uses only Bungalow pricing
- Complete Retreat preview uses only Complete Retreat pricing
- Complete Retreat price is not auto-derived from component prices

C. LOS
- configure/use at least one safe Test LOS tier
- exact threshold selects that tier
- below threshold falls back correctly
- disable restores fallback behavior

D. Seasonal
- configure/use one safe Test seasonal range
- inclusive start/exclusive end behavior is visible in preview
- seasonal overrides LOS on covered nights
- adjacent range is accepted when exercised
- overlapping active range is rejected

E. Public quote / pending hold
- uniform stay still shows a valid nightly rate
- mixed stay hides a misleading universal nightly rate and keeps subtotal/total correct
- pending hold persists the server-authoritative amount and pricing evidence

F. Lifecycle
- one DATE_CHANGE uses current Final-C rules
- one STAY_EXTENSION prices added nights only
- if safe Test data permits, exercise an LOS threshold or Seasonal added night
- successful completion keeps the accepted Final-A payment/refund branch coherent

G. Cleanup
- remove/disable temporary Test pricing rules as appropriate
- confirm no unrelated Property pricing changed
- confirm Test environment remains scheduler-free
```

C.6 does not require changing Production pricing or connecting any new provider.

---

# 11. Accepted Closure Evidence

Final-C.6 and Final-C are completed and accepted.

Accepted evidence:

```text
Final-C.6 closure-gate commit:
1391b69a6bb591cc7d4e8a68b577ea8bda4fb8fe

Final-C accepted feature head:
dca50f51abe1836d3b678b762693219143b12099

Permanent Final-C regression:
- npm run final-c:validate: 41/41 PASS

Repository / integration gate:
- required Final-C repository validation matrix: PASS
- existing Final-A regression remained compatible
- existing Final-B regression remained compatible
- Prisma validation/migration status remained valid
- lint/build validation passed during Final-C implementation and refinement
- no Final-C database migration was introduced by C.6

Hosted Test / functional acceptance:
- all three supported Properties remained pricing-isolated
- base-only pricing passed
- LOS pricing and threshold behavior passed
- Seasonal pricing passed
- Seasonal > LOS > Base precedence passed
- mixed Seasonal / LOS pricing passed
- public mixed-rate behavior passed
- pending-reservation pricing evidence passed
- DATE_CHANGE repricing passed
- STAY_EXTENSION added-night pricing passed
- accepted reservation pricing remained historical and snapshot-backed
- Test remained TRP_ENVIRONMENT=test
- Test remained scheduler-free

Final accepted refinements:
- admin Pricing UI refinement accepted
- accepted pricing breakdown exposed in Reservation admin detail
- guest quote pricing breakdown accepted
- reservation-confirmation pricing summary accepted
- Pricing Preview and Seasonal date pickers aligned with the established booking calendar design
- Pricing Preview datepicker clipping corrected
- desktop LOS two-column layout accepted
- desktop Pricing Preview layout refinement accepted
- mobile behavior remained unchanged for the final responsive refinements

Owner acceptance:
- full Final-C acceptance matrix confirmed passed
- final Pricing UX refinements confirmed working
- Final-C explicitly accepted for official closure on 2026-08-28
```

No Production infrastructure was touched and Phase 13 remains Not started.

---

# 12. Scope Boundary

C.6 does not add:

```text
last-minute pricing
percentage discounts
coupon/promo codes
weekend pricing
occupancy/demand pricing
channel-specific pricing
additional guest charges
new payment providers
Final-D additional charges
Final-E reviews
Final-F WhatsApp communication
Final-G optimization
Phase 13 infrastructure
```

Final-D remains the next package after explicit Final-C acceptance.

---

# 13. Current Decision

```text
Final-C.1 — Completed and accepted
Final-C.2 — Completed and accepted
Final-C.3 — Completed and accepted
Final-C.4 — Completed and accepted
Final-C.5 — Completed and accepted at 4fd36fd25484adda7d24a7df4da3c1738835474c
Final-C.6 — Completed and accepted on 2026-08-28
Final-C — Completed and accepted on 2026-08-28
Final-C accepted feature head — dca50f51abe1836d3b678b762693219143b12099
Final-D — Next / Not started
Phase 13 — Not started
```

Final-C.6 is **Completed and accepted**.

Final-C — Pricing rules: seasonal and length-of-stay — is **Completed and accepted** on
2026-08-28 at accepted feature head:

```text
dca50f51abe1836d3b678b762693219143b12099
```

The next package is:

```text
Final-D — Additional charges and guest payment requests — Next / Not started
```

No Final-D implementation is started by this closure. Phase 13 remains **Not started** and remains
blocked until Final-H is completed and the owner explicitly accepts the complete Final Improvement
Track.
