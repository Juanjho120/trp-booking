# 176 — Final-C.4 Admin Pricing-Rule Management

## Record

```text
Project: TRP Booking
Track: Post-Phase-12 / Pre-Phase-13 Final Improvement Track
Package: Final-C — Pricing rules: seasonal and length-of-stay
Subphase: Final-C.4 — Admin pricing-rule management
Status: Completed and accepted
Preparation date: 2026-08-27
Acceptance date: 2026-08-27
Implementation base head: c8fc39d111d7b33ee4a375264c5a3c25030de185
Accepted head: 0a57b9772da55a78e8d445dc06ea2b738b412f11
Previous subphase: Final-C.3 — Completed and accepted on 2026-08-26
Final-C.3 accepted head: c8fc39d111d7b33ee4a375264c5a3c25030de185
Authoritative strategy: docs/173-final-c-1-pricing-strategy-precedence-and-persistence-contract.md
Persistence foundation: docs/174-final-c-2-pricing-persistence-foundation-and-migration.md
Central pricing engine: docs/175-final-c-3-central-pricing-engine-and-public-pending-reservation-integration.md
Next planned subphase after acceptance: Final-C.5 — DATE_CHANGE/STAY_EXTENSION pricing integration
Phase 13: Not started
```

## Purpose

Final-C.4 adds the protected administrative surface that configures the seasonal and
length-of-stay pricing records introduced by C.2 and consumed by the central C.3 pricing engine.

The admin surface is intentionally scoped to pricing configuration. It does not alter reservation
financial history, lifecycle requests, payments, refunds, availability, preparation buffers or
Airbnb calendar behavior.

---

# 1. Admin Route and Accommodation Entry Point

The dedicated protected route is:

```text
/admin/accommodations/[propertyId]/pricing
```

Each accommodation card gains a localized Pricing action next to the existing content, photo,
amenity/rule and arrival-instruction actions.

The page shows the Property base nightly price as read-only reference data. Base-price editing is
not moved into Final-C.4; seasonal and LOS rule management remain separate from the bilingual
content editor and preparation-buffer settings.

All new visible copy is centralized in:

```text
messages/es.ts
messages/en.ts
```

No native `alert()`, `confirm()` or `prompt()` is used.

---

# 2. Seasonal Pricing Management

The page supports:

```text
create
edit
enable
disable
soft delete
restore
```

A seasonal record contains:

```text
internal name
startDate inclusive
endDate exclusive
absolute nightly USD value
enabled state
soft-delete state
updatedAt concurrency token
```

Normal delete never hard-deletes the business record. Soft delete sets the record disabled and
retains it for audit/history.

Restore intentionally returns a rule as:

```text
deletedAt = null
isEnabled = false
```

The admin must explicitly review and enable the restored rule. This prevents a restored historical
range from unexpectedly taking effect before overlap validation and human review.

---

# 3. Seasonal Overlap and Concurrency Contract

An enabled non-deleted seasonal rule may not overlap another enabled non-deleted rule for the same
Property.

Every seasonal create/edit/enable/delete/restore mutation runs through a bounded Serializable
transaction boundary. Read-then-write overlap checks therefore cannot be bypassed by two concurrent
admin requests that both observed the old state.

Accepted overlap semantics remain:

```text
existing [2026-12-20, 2026-12-25)
new      [2026-12-24, 2026-12-30) -> rejected
new      [2026-12-25, 2026-12-30) -> accepted
```

`expectedUpdatedAt` provides optimistic concurrency for edits, toggles, deletes and restores.

Serializable transaction conflicts are retried once. A repeated conflict fails with a bounded
admin-safe conflict code rather than silently overwriting another mutation.

---

# 4. Length-of-Stay Management

The UI always exposes the frozen Final-C tiers:

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

Each tier owns one durable Property/tier identity.

The admin can:

```text
configure the absolute nightly value
update the value
enable the configured tier
disable the configured tier
```

There is no LOS hard-delete or replacement-record workflow in C.4. Saving an unconfigured tier
creates its durable record. Saving an existing tier updates that same record under
`expectedUpdatedAt` concurrency.

Unsupported tiers fail closed.

---

# 5. Admin Pricing Preview

C.4 adds a protected pricing preview on the same page.

The preview accepts:

```text
Property
check-in date
check-out date
```

It calculates the full requested stay using the exact central `calculateStayPricing` engine from
C.3 and the current enabled/non-deleted rules.

The preview shows safe operational evidence only:

```text
night count
uniform nightly rate when one exists
mixed-rate state when applicable
subtotal
resolved date segments
BASE / LENGTH_OF_STAY / SEASONAL source
resolved nightly value
segment subtotal
```

The preview does not create or modify a Reservation and does not persist a pricing snapshot.

Unlike the public quote, the admin preview may inspect an existing supported Property that is DRAFT
or INACTIVE. This does not relax the public C.3 requirement that new public quotes resolve only an
ACTIVE Property.

---

# 6. API and Security Boundary

Pricing mutations use protected admin API routes with:

```text
admin session actor
same-origin validation
strict Zod payload validation
Property allowlist validation
server-side amount/date/tier validation
server-authoritative concurrency checks
bounded admin-safe error codes
no provider/request raw payload persistence
```

Invalid JSON returns the normal invalid-request response and never leaks parser/runtime details.

The preview endpoint uses the same admin session + same-origin boundary because it exposes current
private pricing configuration behavior.

---

# 7. Audit Contract

Every successful pricing mutation writes `AdminAuditLog` evidence.

Seasonal audit actions cover:

```text
SEASONAL_PRICING_RULE_CREATED
SEASONAL_PRICING_RULE_UPDATED
SEASONAL_PRICING_RULE_ENABLED_CHANGED
SEASONAL_PRICING_RULE_SOFT_DELETED
SEASONAL_PRICING_RULE_RESTORED
```

LOS audit actions cover:

```text
LOS_PRICING_RULE_CREATED
LOS_PRICING_RULE_UPDATED
LOS_PRICING_RULE_ENABLED_CHANGED
```

Metadata is limited to safe business evidence such as Property/rule identity, dates, tier, previous
and new enabled state, and previous/new nightly values. No payment, Airbnb, email or provider
secrets are introduced into pricing audit metadata.

---

# 8. Explicit C.4 Boundaries

C.4 does not implement:

```text
DATE_CHANGE repricing
STAY_EXTENSION repricing
lifecycle pricing snapshots
base-nightly-rate editing
percentage discounts
last-minute pricing
coupon/promo codes
weekend/day-of-week pricing
demand pricing
currency conversion
hard deletion of pricing history
Production infrastructure
```

DATE_CHANGE/STAY_EXTENSION integration remains Final-C.5.

---

# 9. Permanent Regression Gate

The existing:

```text
npm run final-c:validate
```

is expanded for C.4.

The C.4 additions protect at least:

```text
admin session + same-origin mutation boundary
strict request validation
Serializable seasonal mutation boundary
same-Property active overlap rejection
restore-disabled behavior
frozen LOS tier contract
durable LOS identity/no delete workflow
pricing AdminAuditLog actions
admin preview delegation to the C.3 engine
localized pricing action/route
no native confirm/alert/prompt in pricing UI
Final-C.5 lifecycle integration remains deferred
```

---

# 10. Validation Gate Before Acceptance

After applying the C.4 implementation commit, run:

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

Manual admin validation must also confirm all three supported accommodations can independently:

```text
open Pricing from the accommodation card
create an active seasonal rule
reject an overlapping active seasonal range
edit a seasonal rule
activate/deactivate a seasonal rule
soft-delete and restore it disabled
configure/update LOS tiers
activate/deactivate configured LOS tiers
preview base-only, LOS and seasonal/mixed ranges
avoid cross-Property pricing contamination
```

Final-C.4 is **Completed and accepted** on 2026-08-27 at `0a57b9772da55a78e8d445dc06ea2b738b412f11`. The owner confirmed the implementation worked without errors and explicitly advanced the track to Final-C.5.

Final-C.5 is the active subphase. Phase 13 remains **Not started**.
