# 173 — Final-C.1 Pricing Strategy, Precedence and Persistence Contract

## Record

```text
Project: TRP Booking
Track: Post-Phase-12 / Pre-Phase-13 Final Improvement Track
Package: Final-C — Pricing rules: seasonal and length-of-stay
Subphase: Final-C.1 — Pricing strategy, precedence and persistence contract
Status: In progress — strategy prepared for owner acceptance
Preparation date: 2026-08-25
Implementation base head: e7ce19c49c5cfd45e1cc08796ee897a2dce0d1ed
Previous package: Final-B — Completed and accepted on 2026-08-25
Final-B accepted feature head: 1fe06de8c55ab1563999b2db1d210bfc9a82c613
Authoritative track plan: docs/160-post-phase-12-pre-phase-13-final-improvement-track.md
Next planned subphase after acceptance: Final-C.2 — Pricing persistence foundation and migration
Phase 13: Not started
```

## Purpose

Final-C.1 freezes the pricing domain before schema or runtime implementation begins. The purpose is
to prevent public quote pricing, pending-reservation pricing, DATE_CHANGE repricing and
STAY_EXTENSION added-night pricing from evolving into separate rule engines.

The current implementation has one effective nightly value: `Property.baseNightlyPrice`.
`calculateReservationQuote()` applies that value to every requested night, while lifecycle
DATE_CHANGE/STAY_EXTENSION pricing independently reads the same base value. Final-C replaces those
parallel calculations with one server-side pricing contract while preserving all accepted financial,
payment, refund, availability and lifecycle boundaries.

No schema, migration, API, admin UI, public UI or pricing runtime behavior is changed by C.1.

---

# 1. Current-State Findings

## Public quote

Current public quoting calculates:

```text
nightly rate = Property.baseNightlyPrice
subtotal = nightly rate * requested nights
cleaning fee = 0
taxes = 0
discounts = 0
total = subtotal
```

`ReservationQuote` currently exposes one `nightlyRate`, which is valid only because every night has
the same price today.

## Pending reservation

The pending-hold flow recalculates the server-side quote and persists accepted numeric totals on the
Reservation. It does not currently persist pricing-rule or per-night evidence.

## Lifecycle date mutation

Current behavior already has two distinct accepted contracts:

```text
DATE_CHANGE
- reprices the full requested stay at the current nightly price

STAY_EXTENSION
- preserves the existing confirmed amount
- prices only newly added nights at the current nightly price
```

Final-C must preserve this distinction.

## Persistence gap

`Reservation` and `ReservationLifecycleRequest` retain accepted numeric price totals, but there is no
versioned snapshot that explains which base/seasonal/LOS rate produced each newly priced night.

That gap must be closed prospectively without inventing evidence for historical rows.

---

# 2. Final-C Subphase Split

```text
Final-C.1 Pricing strategy, precedence and persistence contract
Final-C.2 Pricing persistence foundation and migration
Final-C.3 Central pricing engine and public quote/pending-reservation integration
Final-C.4 Admin pricing-rule management
Final-C.5 DATE_CHANGE/STAY_EXTENSION pricing integration
Final-C.6 Integrated regression and documentation closure
```

Rules:

```text
- C.1 freezes behavior only.
- C.2 introduces persistence and typed snapshot foundations without changing public pricing.
- C.3 makes the central pricing engine authoritative for public quotes and pending reservations.
- C.4 adds protected admin management of the two accepted rule types.
- C.5 removes lifecycle direct-base-price calculations and routes them through the same engine.
- C.6 owns the consolidated Final-C regression/Hosted Test/documentation gate.
```

---

# 3. Supported Pricing Types

Final-C supports exactly two rule categories in addition to the existing base price.

## Seasonal rate

A seasonal rule belongs to one Property and contains the equivalent of:

```text
id
propertyId
internal name/label
startDate
endDate
nightlyRate
isEnabled
deletedAt
createdAt
updatedAt
```

Date semantics:

```text
startDate = inclusive charged-night date
endDate   = exclusive charged-night date
```

A stay from December 20 through December 23 therefore prices charged nights December 20, 21 and 22.
Checkout date December 23 is not itself a charged night.

A seasonal value is an absolute nightly price. It is not a percentage, delta or discount amount.
It may be below, equal to or above `Property.baseNightlyPrice`.

## Length-of-stay rate

A LOS rule belongs to one Property and one supported minimum-night tier.

Supported tiers are frozen to:

```text
2
3
4
5
6
7
15
30
```

A LOS value is also an absolute nightly price.

One durable row per Property/tier is preferred so disable/restore/history can remain auditable
without creating competing rows for the same tier.

Eligibility selects the highest enabled configured `minimumNights` value less than or equal to the
relevant stay-length context.

Examples:

```text
1 night with only 2+ configured      -> no LOS rule; fall back to base unless seasonal
5 nights with 2+, 3+, 5+ configured -> 5+ LOS rule
10 nights with 2+, 7+, 15+          -> 7+ LOS rule
20 nights with 7+, 15+, 30+         -> 15+ LOS rule
32 nights with 15+, 30+             -> 30+ LOS rule
```

Missing tiers are skipped. A missing 7+ tier does not synthesize a price from 6+ or 15+.

---

# 4. Property Ownership and Composed Listing Boundary

Every pricing rule belongs directly to the Property being booked.

This includes:

```text
black-white-apartment
perfect-retreat-bungalow
complete-retreat
```

The composed `complete-retreat` accommodation has its own base/seasonal/LOS pricing configuration.
Do not calculate its price by adding or deriving prices from component accommodations.

Existing composed-listing availability dependency behavior remains unchanged and independent from
pricing ownership.

No rule from one Property may affect another Property.

---

# 5. Frozen Precedence Contract

Every charged night resolves to exactly one nightly price source.

```text
1. Matching enabled Seasonal rate for that night
2. Otherwise highest eligible enabled Length-of-Stay rate
3. Otherwise Property.baseNightlyPrice
```

This order is mandatory for public booking and lifecycle repricing.

## No stacking

Seasonal and LOS are overrides. They are not cumulative adjustments.

Forbidden behavior:

```text
base - LOS discount - seasonal discount
base + seasonal delta
LOS price then percentage seasonal adjustment
seasonal price then LOS adjustment
```

There is no arithmetic stacking in Final-C.

## Mixed stay example

Assume:

```text
Base rate:          USD 100
7+ LOS rate:        USD  85
Seasonal rate:      USD 130
Requested stay:     10 nights
Seasonal dates:     3 of those 10 nights
```

The resulting price is:

```text
3 seasonal nights * USD 130
7 non-seasonal nights * USD 85
```

The seasonal nights do not also receive the 7+ LOS value. The other nights use the 7+ tier because
the complete requested stay is 10 nights.

---

# 6. Seasonal Overlap Contract

Two enabled, non-deleted seasonal rules for the same Property must never overlap on charged-night
dates.

```text
Rule A: [2026-12-20, 2026-12-25)
Rule B: [2026-12-24, 2026-12-30) -> rejected
Rule C: [2026-12-25, 2026-12-30) -> allowed, adjacent but not overlapping
```

No arbitrary priority integer is introduced. Rejecting overlap keeps the price deterministic and
prevents an admin from unknowingly depending on record ordering.

C.2/C.4 must make overlap validation concurrency-safe. The intended direction is a Serializable
transaction with bounded retry around the overlap read/write instead of an application-only
check vulnerable to two concurrent creates.

Disabled or soft-deleted seasonal rows do not participate in active overlap resolution.

---

# 7. Money, Currency and Rounding

Final-C retains the existing USD pricing boundary.

```text
TRP stay-pricing currency: USD
Seasonal rule rate: USD
LOS rule rate: USD
```

Do not introduce currency conversion.

All price resolution and arithmetic must use integer cents after converting persisted decimal
nightly rates at the server boundary.

```text
resolved subtotal = sum(each charged night's integer-cent rate)
```

Do not multiply floating-point dollar values and round only at the end.

Final-C does not introduce or redesign:

```text
cleaning fees
taxes
discounts field semantics
additional charges
```

Those existing quote fields remain unchanged unless a later explicitly approved package changes
them.

---

# 8. Stay-Length Context

LOS eligibility needs one explicit stay-length context. The context differs by accepted operation.

## New/public reservation

```text
stay-length context = requested check-in through requested check-out
```

The selected LOS tier is based on the complete requested night count. Seasonal precedence is then
resolved independently for each night.

## DATE_CHANGE

The accepted lifecycle contract is full repricing.

```text
stay-length context = complete requested replacement stay
priced nights       = every requested replacement stay night
```

All requested nights use the current accepted seasonal/LOS/base rules.

The existing confirmed Reservation is not mutated until the lifecycle request completes under the
already accepted hold/payment/concurrency rules.

## STAY_EXTENSION

The accepted lifecycle contract is added-night pricing only.

```text
stay-length context = resulting total stay after extension
priced nights       = only newly added nights
```

This means an extension from six total nights to seven total nights may make the new seventh night
eligible for the configured 7+ LOS rate. The original six nights are not repriced and do not receive
a retroactive discount or surcharge.

For every added night:

```text
Seasonal matching added night -> seasonal rate
otherwise                     -> LOS tier for resulting total stay length
otherwise                     -> base rate
```

This preserves the original accepted financial contract while still letting added-night pricing
reflect the duration of the resulting stay.

---

# 9. Versioned Pricing Evidence

Final-C must persist enough immutable evidence to reconstruct a newly accepted price even after an
admin edits or disables rules.

Rule IDs alone are insufficient because the referenced rule may change later.

## Snapshot direction

Use a versioned JSON pricing snapshot with an explicit discriminator such as:

```text
version = FINAL_C_V1
```

The exact TypeScript type is frozen during C.2/C.3, but the snapshot must contain the equivalent of:

```text
version
currency
propertyId
checkInDate
checkOutDate
stayLengthContextNights
subtotal/total pricing evidence
per-night or contiguous-night resolution evidence
```

For each newly priced night/segment, retain immutable resolved evidence equivalent to:

```text
date/range
number of nights
resolved source: BASE | LENGTH_OF_STAY | SEASONAL
resolved nightly rate in cents
rule id when a rule supplied the price
seasonal date-range/rate evidence when seasonal applied
minimum-night tier/rate evidence when LOS applied
base nightly rate evidence when base applied
```

The snapshot is evidence, not a live relation that re-resolves historical prices.

## Reservation

New Final-C reservations persist their accepted pricing snapshot together with their existing numeric
subtotal/fees/taxes/discounts/total.

The existing numeric columns remain first-class financial values. The snapshot explains how the
accepted stay price was produced; it does not replace Payment/Refund accounting.

## ReservationLifecycleRequest

Lifecycle requests need independent immutable pricing evidence for:

```text
original accepted state
requested priced state
```

The current numeric original/requested snapshots remain valid and are not removed.

## Historical/legacy reservations

Existing reservations created before Final-C have no trustworthy rule-resolution history.

Rules:

```text
- do not backfill them using current pricing rules
- do not fabricate per-night historical rule IDs
- existing persisted numeric totals remain authoritative
- null/legacy pricing evidence is valid for untouched historical reservations
```

### Legacy DATE_CHANGE

A DATE_CHANGE may compute and persist a complete new `FINAL_C_V1` requested snapshot because the
replacement stay is being priced now. The original historical side remains represented by its
existing numeric snapshot and may have no Final-C pricing snapshot.

### Legacy STAY_EXTENSION

An extension must preserve the already accepted historical portion and price only the added nights.
The requested pricing evidence must therefore support the equivalent of:

```text
preserved historical stay segment
- original date range/night count
- persisted accepted subtotal/total evidence
- no fabricated historical rule source

plus

newly priced added-night segments
- normal FINAL_C_V1 seasonal/LOS/base resolution evidence
```

A later extension can preserve that combined accepted snapshot and append only the new added-night
resolution. A later full DATE_CHANGE may replace it with a complete newly priced requested snapshot.

---

# 10. Quote/API and Public Display Contract

The current `ReservationQuote.nightlyRate` assumes all nights have one rate. Final-C must not display
one rate as though it applied to every night when the quote is mixed.

C.3 must evolve the safe quote DTO to expose deterministic pricing breakdown evidence appropriate
for public display.

Required UX behavior:

```text
Uniform-rate stay
- existing simple nightly-rate presentation may remain

Mixed-rate stay
- do not show one misleading universal nightly rate
- show a localized nightly-rate breakdown or grouped pricing breakdown
- always show subtotal and total
```

The public DTO must not expose admin-only internal rule notes, audit metadata or deleted rule data.

All new visible labels/copy belong in `messages/es.ts` and `messages/en.ts`.

---

# 11. Central Pricing Engine Boundary

One server-side pricing service must become authoritative for every place that calculates a current
stay/night price.

Required consumers by Final-C closure:

```text
public reservation quote
pending reservation creation/reuse validation
DATE_CHANGE quote/approval/completion path
STAY_EXTENSION quote/approval/completion path
admin preview/read model where pricing calculation is needed
```

No consumer may independently reproduce seasonal/LOS precedence.

The engine accepts explicit Property/date/stay-length context and an injectable Prisma transaction
client where transactional lifecycle/pending-reservation operations require it.

Availability validation remains a separate concern. A valid price never implies availability.

---

# 12. Admin Pricing Management Boundary

Final-C adds a dedicated protected pricing surface under the existing accommodation-admin hierarchy.

Preferred route:

```text
/admin/accommodations/[propertyId]/pricing
```

The existing accommodation management card gains a localized Pricing action. The base nightly rate
is shown as reference data; Final-C does not need to merge pricing rules into the bilingual content
editor or preparation-buffer settings.

The page manages two sections:

```text
Seasonal rates
- list active/inactive rules
- create
- edit
- enable/disable
- soft delete/restore when supported by the accepted UI flow
- show date range and absolute nightly value

Length-of-stay rates
- show the frozen 2/3/4/5/6/7/15/30 tiers
- configure/update absolute nightly value
- enable/disable
- preserve durable tier identity/history
```

No native `alert()`, `confirm()` or `prompt()`.

Destructive operations use the existing styled project confirmation pattern when confirmation is
required.

All visible copy remains centralized in `messages/es.ts` and `messages/en.ts`.

---

# 13. Persistence Direction for C.2

Final-C.1 freezes the persistence responsibilities, while C.2 owns exact Prisma names/migration SQL.

The expected direction is equivalent to:

```text
SeasonalPricingRule
- Property relation
- internal label
- date-only start/end
- Decimal(10,2) nightly rate
- enabled flag
- soft delete
- timestamps

LengthOfStayPricingRule
- Property relation
- supported minimum-night tier
- Decimal(10,2) nightly rate
- enabled flag
- soft delete
- timestamps
- durable uniqueness for Property + tier

Reservation
- nullable versioned pricingSnapshot JSON for Final-C/newly repriced state

ReservationLifecycleRequest
- nullable originalPricingSnapshot JSON
- nullable requestedPricingSnapshot JSON
```

Historical rows remain nullable. The migration must not manufacture pricing snapshots from current
configuration.

C.2 must confirm exact index/constraint choices against PostgreSQL/Prisma before implementation.

---

# 14. Admin Mutation, Concurrency and Audit Contract

Every pricing mutation is server-authoritative and protected by the existing admin/session boundary.

Required validation includes:

```text
supported Property
supported LOS tier
valid date-only seasonal range
startDate < endDate
positive finite absolute nightly amount
accepted USD-only stay-pricing boundary
no active same-property seasonal overlap
expectedUpdatedAt optimistic concurrency for edits/toggles/restores
```

Where overlap or uniqueness requires read-then-write correctness, use transaction isolation strong
enough to prevent two concurrent admin requests from creating conflicting active state.

Pricing rules are operational business records. Do not hard-delete accepted history as a normal
admin action.

Audit evidence may include safe values such as:

```text
propertyId
ruleId
rule type
minimum-night tier
seasonal start/end dates
previous/new enabled state
previous/new nightly amount
actor identity
```

Do not place unrelated provider/payment secrets or raw request dumps into pricing audit metadata.

---

# 15. Interaction with Final-A Financial Correctness

Final-C changes how the stay price is calculated. It does not redefine what money was captured or
what is refundable.

The accepted Final-A contract remains authoritative:

```text
currentStayValue
capturedStayPayments
approvedOrReservedStayRefunds
remainingRefundableStayBalance
```

A successfully completed positive DATE_CHANGE/STAY_EXTENSION continues to affect current stay value
through the accepted lifecycle-adjustment/payment state, not by re-evaluating pricing rules later.

Changing a seasonal/LOS rule after a Reservation is confirmed must not alter:

```text
Reservation persisted accepted totals
currentStayValue derived from accepted movements
existing Payment amount
existing Refund authorization/history
historical lifecycle request price snapshots
```

---

# 16. Explicit Non-Goals

Final-C does not include:

```text
last-minute pricing or discounts
percentage discounts
coupon/promo codes
weekend/day-of-week rules
occupancy/demand pricing
channel-specific Airbnb vs direct rates
automatic component-price summing for complete-retreat
fee/tax redesign
cleaning-fee implementation
additional guest/service/damage/transport charges
refund-policy changes
currency conversion
Production infrastructure/provider work
Phase 13 scheduler activation
```

Additional charges remain Final-D.

---

# 17. Acceptance Matrix for Final-C

Final-C.6 must own one consolidated regression gate. Exact test-file organization is decided during
implementation; do not create one unrelated validator per subphase without need.

Minimum automated/integrated coverage:

## Base and LOS

```text
[ ] base-only quote remains unchanged when no rules exist
[ ] 1-night stay ignores LOS tiers
[ ] exact 2/3/4/5/6/7/15/30 thresholds select the matching configured tier
[ ] between thresholds selects highest eligible configured tier
[ ] missing tiers are skipped deterministically
[ ] disabled/deleted LOS rules are ignored
[ ] one Property's LOS rules never affect another Property
```

## Seasonal and precedence

```text
[ ] seasonal start date is inclusive
[ ] seasonal end date is exclusive
[ ] lower-than-base seasonal value works
[ ] higher-than-base seasonal value works
[ ] active same-property seasonal overlap is rejected
[ ] adjacent seasonal ranges are accepted
[ ] seasonal overrides LOS on matching nights
[ ] non-seasonal nights in the same stay use LOS or base fallback
[ ] disabled/deleted seasonal rules are ignored
[ ] one Property's seasonal rules never affect another Property
```

## Public quote/pending reservation

```text
[ ] one central engine produces the public quote
[ ] mixed-rate subtotal equals sum of integer-cent nightly resolutions
[ ] mixed-rate public UI never presents one misleading universal nightly rate
[ ] new pending Reservation persists accepted numeric totals plus versioned pricing evidence
[ ] pending-hold replay/reuse validates against the same authoritative quote
[ ] availability and guest validation remain unchanged
[ ] Tilopay amount continues to use the accepted Reservation total
```

## Historical stability

```text
[ ] editing/disabling/deleting a rule does not change an existing confirmed Reservation
[ ] pre-Final-C historical Reservation may remain without a pricing snapshot
[ ] migration does not fabricate historical rule evidence
[ ] persisted accepted numeric totals remain authoritative
```

## Lifecycle

```text
[ ] DATE_CHANGE reprices the complete requested stay with current rules
[ ] DATE_CHANGE LOS eligibility uses full requested stay length
[ ] DATE_CHANGE mixed seasonal/LOS pricing is deterministic
[ ] STAY_EXTENSION never reprices existing accepted nights
[ ] STAY_EXTENSION prices only added nights
[ ] STAY_EXTENSION LOS eligibility uses resulting total stay length
[ ] seasonal overrides LOS on an added extension night
[ ] legacy reservation extension preserves historical totals and appends new pricing evidence only
[ ] positive/zero/negative lifecycle financial branches remain coherent
[ ] Final-A refund/cancellation regressions remain green
```

## Admin/security/audit

```text
[ ] protected pricing route rejects non-admin access
[ ] all visible ES/EN copy remains centralized
[ ] rule validation rejects unsupported tiers, invalid ranges and invalid amounts
[ ] optimistic concurrency rejects stale edits
[ ] concurrent seasonal writes cannot create overlapping active ranges
[ ] admin mutations are auditable without unrelated secrets
[ ] destructive UX uses project components instead of native confirm
[ ] desktop/mobile admin pricing UI is usable for all three accommodations
```

## Technical closure

```text
[ ] Prisma generation/validation/migration status pass
[ ] Final-A regression gate passes
[ ] Final-B regression gate passes
[ ] Final-C consolidated gate passes
[ ] lint passes
[ ] build passes
[ ] git diff --check passes
[ ] Test remains TRP_ENVIRONMENT=test with zero Vercel cron registrations
[ ] Phase 13 remains Not started
```

---

# 18. C.1 Acceptance Rule

Final-C.1 is accepted only when the owner accepts this strategy and commits the reconciled tracking
documents.

Acceptance of C.1 freezes:

```text
seasonal + LOS only
absolute nightly values
seasonal > LOS > base precedence
no stacking
no same-property active seasonal overlap
highest eligible configured LOS tier
full-stay LOS context for new quote and DATE_CHANGE
resulting-total-stay LOS context for STAY_EXTENSION added nights
no repricing of existing extension nights
versioned prospective pricing evidence
no fabricated historical snapshots
central server-side pricing engine
property-owned pricing including independent complete-retreat pricing
admin pricing route under accommodation management
Final-C.6 consolidated acceptance gate
```

After C.1 acceptance, Final-C.2 may begin. No pricing behavior changes before that point.
