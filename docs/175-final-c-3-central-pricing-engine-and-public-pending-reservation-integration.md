# 175 — Final-C.3 Central Pricing Engine and Public/Pending-Reservation Integration

## Record

```text
Project: TRP Booking
Track: Post-Phase-12 / Pre-Phase-13 Final Improvement Track
Package: Final-C — Pricing rules: seasonal and length-of-stay
Subphase: Final-C.3 — Central pricing engine and public quote/pending-reservation integration
Status: Completed and accepted on 2026-08-26
Preparation date: 2026-08-26
Acceptance date: 2026-08-26
Accepted implementation head: c8fc39d111d7b33ee4a375264c5a3c25030de185
Implementation base head: 2168262784b0a8213062b0d84ca9fe6069e98fc6
Previous subphase: Final-C.2 — Completed and accepted on 2026-08-26
Final-C.2 accepted head: 2168262784b0a8213062b0d84ca9fe6069e98fc6
Authoritative strategy: docs/173-final-c-1-pricing-strategy-precedence-and-persistence-contract.md
Persistence foundation: docs/174-final-c-2-pricing-persistence-foundation-and-migration.md
Next subphase: Final-C.4 — Admin pricing-rule management — In progress
Phase 13: Not started
```

## Purpose

Final-C.3 makes one central deterministic pricing engine authoritative for new public reservation
quotes and new/reused `PENDING_PAYMENT` reservation holds.

This subphase implements the accepted Final-C.1 precedence without expanding into the protected
admin management of C.4 or the DATE_CHANGE/STAY_EXTENSION repricing owned by C.5.

The frozen pricing rules are:

```text
Seasonal > Length-of-stay > Property.baseNightlyPrice
No stacking
Seasonal start date inclusive
Seasonal end date exclusive
LOS tier = highest enabled configured minimumNights <= complete requested stay length
Every configured value is an absolute nightly USD value
Every charged night resolves independently in integer cents
```

---

# 1. Central Engine Boundary

The pricing implementation is split into two server-owned layers:

```text
lib/pricing/engine.ts
  pure deterministic precedence, nightly resolution, cent arithmetic and snapshot construction

lib/pricing/repository.ts
  Property-scoped loading of active seasonal/LOS rules from Prisma/PostgreSQL
```

`lib/reservations/pricing.ts` remains the reservation quote boundary but no longer reproduces pricing
precedence. It validates the public reservation input, obtains the public Property metadata, delegates
the financial calculation to the central pricing boundary, and maps the result into the existing quote
contract.

Availability remains separate. A valid price does not imply that dates are available.

---

# 2. Rule Loading and Property Isolation

The pricing repository loads only the booked Property and only rules that are:

```text
isEnabled = true
deletedAt = null
```

Seasonal rows are additionally limited to ranges intersecting the requested stay. LOS rows are
limited to thresholds eligible for the supplied stay-length context.

No rule inheritance exists between the individual accommodations and `complete-retreat`.

The engine still fails closed if more than one supplied seasonal rule resolves the same charged
night. C.4 owns the protected Serializable mutation boundary that prevents a valid admin workflow
from creating such an overlap.

---

# 3. Per-Night Precedence and Cent Arithmetic

For every date `d` where:

```text
checkInDate <= d < checkOutDate
```

the engine resolves exactly one source:

```text
1. matching seasonal rule
2. otherwise selected LOS tier
3. otherwise Property.baseNightlyPrice
```

The subtotal is the sum of the resolved integer-cent values. No average or floating-point-derived
nightly amount is used to calculate the accepted stay value.

Adjacent nights with the same source/rule/rate are compressed only for snapshot storage; compression
does not change the arithmetic.

---

# 4. Public Quote Compatibility

The existing public quote remains non-binding and keeps its existing subtotal/fee/tax/discount/total
shape. `cleaningFee`, `taxes`, and `discounts` remain zero in this package, so the accepted total is
still the stay subtotal.

`nightlyRate` is now nullable:

```text
all charged nights have the same resolved numeric rate -> return that rate
mixed resolved nightly rates -> null
```

The reservation form renders the nightly-rate row only when a real universal nightly value exists.
It never displays a synthetic average for a mixed seasonal/LOS/base stay.

The public API does not return `ruleId` values or the internal pricing snapshot.

---

# 5. Pending Reservation Snapshot

Every newly created `PENDING_PAYMENT` Reservation stores both:

```text
accepted numeric columns
Reservation.pricingSnapshot = FINAL_C_V1
```

The snapshot records:

```text
Property
stay dates
stay-length context
priced-night count
subtotal/total cents
ordered pricing segments
source precedence used
specific rule identifiers/configured values when a rule applied
```

This evidence is internal. It is not part of the public quote or pending-hold API payload.

Historical reservations are not backfilled. A pre-C.3 row may legitimately keep
`pricingSnapshot = null`.

---

# 6. Pending-Hold Reuse and Price Changes

An active pending hold is not silently repriced.

Before reuse, TRP recalculates the same authoritative quote and compares its currency and accepted
numeric totals to the stored Reservation. Reuse is allowed only when they still match exactly.

If pricing rules changed after the hold was created:

```text
stored accepted totals != current authoritative quote
-> PENDING_HOLD_STALE
```

The old row is not mutated to the new price and no historical snapshot is fabricated.

The existing payment handoff remains an additional guard: it already validates the stored
Reservation totals against a fresh authoritative reservation quote before payment submission.
Tilopay therefore continues to receive the accepted Reservation total rather than a client-supplied
amount.

---

# 7. Explicit C.3 Boundaries

C.3 does not implement:

```text
admin CRUD for seasonal rules
admin CRUD for LOS tiers
seasonal-overlap mutation workflow
pricing preview in admin
DATE_CHANGE repricing
STAY_EXTENSION repricing
historical snapshot backfill
last-minute pricing
rule inheritance across composed accommodations
```

Those boundaries remain owned by C.4/C.5 or explicitly excluded by Final-C.1.

---

# 8. Permanent Regression Gate

C.3 introduces:

```text
npm run final-c:validate
```

The initial suite covers:

```text
base-only pricing
highest eligible LOS tier
missing LOS tiers
seasonal > LOS precedence
half-open seasonal boundaries
seasonal prices lower than base
mixed-rate integer-cent subtotal
safe universal-nightly detection
fail-closed seasonal overlap
FINAL_C_V1 snapshot evidence
Property-scoped active-rule loading contract
public quote delegation to the central engine
no public rule identifiers/snapshot
pending Reservation snapshot persistence
pending-hold authoritative-price reuse validation
no premature lifecycle repricing integration
```

Final-C.6 will consolidate the permanent Final-C acceptance matrix after C.4 and C.5 are complete.

---

# 9. Validation Gate Before Acceptance

Run:

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

C.3 is **Completed and accepted** after the full repository gate passed on 2026-08-26 and the owner advanced the track from accepted implementation head `c8fc39d111d7b33ee4a375264c5a3c25030de185`.

Final-C.4 is the active subphase. Phase 13 remains **Not started**.
