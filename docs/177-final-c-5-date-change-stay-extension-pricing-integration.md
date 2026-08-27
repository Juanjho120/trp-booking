# 177 — Final-C.5 DATE_CHANGE / STAY_EXTENSION Pricing Integration

## Record

```text
Project: TRP Booking
Track: Post-Phase-12 / Pre-Phase-13 Final Improvement Track
Package: Final-C — Pricing rules: seasonal and length-of-stay
Subphase: Final-C.5 — DATE_CHANGE/STAY_EXTENSION pricing integration
Status: In progress — implementation prepared for validation
Preparation date: 2026-08-27
Implementation base head: 0a57b9772da55a78e8d445dc06ea2b738b412f11
Previous subphase: Final-C.4 — Completed and accepted on 2026-08-27
Final-C.4 accepted head: 0a57b9772da55a78e8d445dc06ea2b738b412f11
Authoritative strategy: docs/173-final-c-1-pricing-strategy-precedence-and-persistence-contract.md
Persistence foundation: docs/174-final-c-2-pricing-persistence-foundation-and-migration.md
Central pricing engine: docs/175-final-c-3-central-pricing-engine-and-public-pending-reservation-integration.md
Admin pricing management: docs/176-final-c-4-admin-pricing-rule-management.md
Next planned subphase after acceptance: Final-C.6 — Integrated regression and documentation closure
Phase 13: Not started
```

## Purpose

Final-C.5 removes the remaining lifecycle-specific direct `Property.baseNightlyPrice`
calculation and routes `DATE_CHANGE` and `STAY_EXTENSION` through the same Final-C pricing
repository/engine already authoritative for public quotes and pending reservations.

This subphase preserves the accepted lifecycle distinction:

```text
DATE_CHANGE
- full requested replacement stay is repriced now
- LOS context = complete requested replacement stay
- every requested replacement night uses current Seasonal > LOS > base precedence

STAY_EXTENSION
- already accepted stay value is not repriced
- only newly added nights are priced now
- LOS context = resulting total stay length after extension
- each added night still uses Seasonal > LOS > base precedence
```

Final-A payment, hold, refund, concurrency and completion branches remain unchanged except that
they now carry and promote immutable Final-C pricing evidence together with the already accepted
numeric totals.

---

# 1. Central Lifecycle Pricing Boundary

New module:

```text
lib/pricing/lifecycle.ts
```

The module delegates current rate resolution to:

```text
resolvePropertyStayPricing(...)
```

It does not duplicate seasonal matching, LOS tier selection or precedence logic.

The lifecycle module owns only operation-specific composition:

```text
DATE_CHANGE
-> ask central pricing repository to price the full requested range

STAY_EXTENSION
-> ask central pricing repository to price [originalCheckOut, requestedCheckOut)
-> pass resulting total stay nights as stayLengthContextNights
-> preserve already accepted pricing evidence
-> append only the newly resolved segments
```

`lib/admin/reservation-date-mutation.ts` no longer reads `baseNightlyPrice` to calculate lifecycle
quotes.

---

# 2. DATE_CHANGE Contract

At lifecycle request creation:

```text
original numeric snapshot
= current confirmed Reservation numeric values

originalPricingSnapshot
= current Reservation.pricingSnapshot when present
= null for untouched pre-Final-C reservations

requested numeric snapshot
= full current Final-C price for requested replacement stay

requestedPricingSnapshot
= complete FINAL_C_V1 snapshot for requested replacement stay
```

A legacy reservation is allowed to have:

```text
originalPricingSnapshot = null
requestedPricingSnapshot = complete FINAL_C_V1
```

No current rule is used to invent historical evidence for the original reservation.

The financial difference remains:

```text
requestedTotal - original Reservation.total
```

Therefore the existing Final-A branches remain authoritative:

```text
positive -> hold + lifecycle adjustment payment
zero     -> immediate transactional completion after approval
negative -> lifecycle adjustment refund allocation/completion
```

---

# 3. STAY_EXTENSION Contract

An extension never reprices existing accepted nights.

Example:

```text
accepted stay: 6 nights
requested extension: 7 nights total
priced range now: only night 7
LOS context: 7 total nights
```

If a 7+ LOS rule exists, the added night can use that tier while the original six nights retain
the immutable evidence and amount under which they were accepted.

Seasonal precedence remains per added night:

```text
matching active Seasonal rule -> Seasonal
otherwise eligible LOS tier    -> LOS using resulting total stay length
otherwise                       -> Property base nightly rate
```

Requested numeric values remain additive:

```text
requestedSubtotal = accepted Reservation.subtotal + added-night subtotal
requestedTotal    = accepted Reservation.total + added-night total
financialDifference = requestedTotal - accepted Reservation.total
```

Existing cleaning fee, taxes and discounts are preserved for `STAY_EXTENSION` exactly as before.

---

# 4. Legacy Reservation Evidence

Final-C.2 already defined the special segment:

```text
PRESERVED_LEGACY_STAY
```

C.5 now activates that foundation for legacy extensions.

When a confirmed reservation has no `Reservation.pricingSnapshot`, the requested extension snapshot
contains:

```text
PRESERVED_LEGACY_STAY
- exact original [checkIn, checkOut) boundary
- original night count
- persisted accepted subtotal cents
- persisted accepted total cents
- no ruleId
- no BASE / LOS / SEASONAL claim

plus

normal RESOLVED_RATE segment(s)
- only for newly added nights
- immutable current base/LOS/seasonal evidence
```

No historical rule source is fabricated.

---

# 5. Repeated Extensions

After a first extension completes, its requested snapshot becomes the accepted
`Reservation.pricingSnapshot`.

A later extension:

```text
reads that accepted combined snapshot
verifies its Property/date/numeric boundaries still match the Reservation
preserves every accepted prior segment unchanged
prices only the next newly added range
appends the newly resolved segment(s)
```

This means a legacy reservation can safely evolve from:

```text
legacy accepted segment
+ extension 1 resolved evidence
+ extension 2 resolved evidence
+ ...
```

without retroactively repricing any accepted night.

A later full `DATE_CHANGE` remains allowed to replace the combined evidence with one newly priced
complete requested `FINAL_C_V1` snapshot because full replacement repricing is the already accepted
DATE_CHANGE contract.

---

# 6. Snapshot Integrity and Fail-Closed Behavior

`lib/pricing/lifecycle.ts` validates accepted `FINAL_C_V1` snapshots before reusing them for an
extension.

Validation includes the equivalent of:

```text
version/currency/Property
range and night count
contiguous segment coverage
segment amount arithmetic
snapshot subtotal arithmetic
snapshot total arithmetic
accepted Reservation date boundary
accepted Reservation subtotal/total match
```

If a non-null persisted snapshot disagrees with the accepted Reservation, extension pricing fails
closed rather than silently replacing or fabricating history.

Untouched historical reservations remain valid through the explicit null-snapshot legacy path.

---

# 7. Lifecycle Request Persistence

`ReservationLifecycleRequest` already contains the C.2 columns:

```text
original_pricing_snapshot
requested_pricing_snapshot
```

C.5 now persists them when a DATE_CHANGE/STAY_EXTENSION request is created.

No new Prisma migration is required by C.5.

The numeric lifecycle fields remain authoritative and are retained unchanged:

```text
originalSubtotal
originalCleaningFee
originalTaxes
originalDiscounts
originalTotal

requestedSubtotal
requestedCleaningFee
requestedTaxes
requestedDiscounts
requestedTotal
financialDifference
```

Pricing JSON is evidence, not a replacement for those financial columns.

---

# 8. Completion Promotion

Both completion implementations now require a valid `requestedPricingSnapshot` and promote it to the
confirmed Reservation in the same transactional update as the requested dates and numeric totals:

```text
lib/reservations/date-mutation-completion.ts
- POSITIVE branch after approved adjustment payment
- ZERO branch after admin approval

lib/reservations/negative-date-mutation-completion.ts
- NEGATIVE branch after accepted refund allocation workflow
```

Successful completion writes the equivalent of:

```text
Reservation.checkInDate       = requested check-in
Reservation.checkOutDate      = requested check-out
Reservation numeric pricing   = requested numeric snapshot
Reservation.pricingSnapshot   = requestedPricingSnapshot
```

Idempotent completed-state checks also verify that the Reservation pricing snapshot structurally
matches the requested lifecycle snapshot.

PostgreSQL JSON object key order is not treated as semantic evidence; snapshot comparison is
structural.

---

# 9. Final-A Boundaries Preserved

C.5 does not redesign:

```text
lifecycle request states
review expiration
availability validation
optimistic/serializable concurrency fences
positive adjustment holds
Tilopay lifecycle adjustment payments
zero-difference completion
negative multi-payment refund allocation
arrival-instruction supersession
lifecycle notifications
admin operational audit
```

The existing financial branch is still calculated from the persisted decimal
`financialDifference`.

The only new financial input is the amount produced by the already accepted central Final-C pricing
contract.

---

# 10. Automated Coverage

New targeted suite file:

```text
tests/final-c/lifecycle-pricing.test.ts
```

Coverage includes:

```text
DATE_CHANGE full current-rule repricing
DATE_CHANGE LOS context uses complete requested stay
STAY_EXTENSION prices only newly added nights
STAY_EXTENSION LOS context uses resulting total stay length
Seasonal override remains stronger than LOS for added nights
modern accepted snapshot is preserved when extending
legacy extension creates PRESERVED_LEGACY_STAY without ruleId
later extension preserves prior combined evidence and appends only new nights
inconsistent persisted accepted evidence fails closed
snapshot comparison ignores JSON object key ordering
```

`tests/final-c/source-contract.test.ts` now additionally guards:

```text
lifecycle delegates to resolvePropertyStayPricing
admin lifecycle creation delegates to resolveLifecyclePricing
no direct baseNightlyPrice calculation remains in reservation-date-mutation.ts
original/requested pricing snapshots are persisted
both completion implementations promote requestedPricingSnapshot to Reservation
```

The Final-C runner includes the new lifecycle-pricing test file.

---

# 11. Expected Validation Gate

Repository validation for C.5:

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

No new database migration is expected.

Targeted manual Test validation should cover at least:

```text
1. DATE_CHANGE where current pricing produces a positive difference
2. DATE_CHANGE where current pricing produces zero difference when practical
3. DATE_CHANGE where current pricing produces a negative difference
4. STAY_EXTENSION crossing into a higher LOS tier
5. STAY_EXTENSION whose added night is covered by Seasonal pricing
6. one legacy/no-pricing-snapshot extension if safe test data is available
7. successful completion persists requested pricing evidence on Reservation
8. no regression in Final-A payment/refund/hold behavior
```

Full consolidated Final-C Hosted Test/regression/documentation closure remains Final-C.6.

---

# 12. Scope Boundaries

C.5 does not add:

```text
new pricing rule types
stacked discounts
percentage discounts
weekend rules
extra-person fees
admin manual rate override on lifecycle requests
additional guest charges
Phase 13 infrastructure
```

Additional charges remain Final-D.

---

# 13. Current Decision

Final-C.5 implementation is prepared for repository validation and targeted lifecycle acceptance.

Until that validation is accepted:

```text
Final-C.5 — In progress
Final-C.6 — Not started
Final-D — Not started
Phase 13 — Not started
```

Final-C.6 begins only after explicit C.5 acceptance.
