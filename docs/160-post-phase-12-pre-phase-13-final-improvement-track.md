# 160 — Post-Phase-12 / Pre-Phase-13 Final Improvement Track

## Track Record

```text
Project: TRP Booking
Track: Post-Phase-12 / Pre-Phase-13 Final Improvement Track
Status: Active — Final-A, Final-B, Final-C, Final-D and Final-E completed and accepted; Final-F is Active with Final-F.1 completed and accepted on 2026-09-21; Final-F.2 is completed and accepted on 2026-09-22 at 03861cb2d5daef7cca8bb759d16a0ef050d86b41; Final-G and Final-H remain Not started
Registration date: 2026-08-11
Registration base head: dac105088d2c46be05a900abed3dfe83e608e964
Previous gate: Phase 12 — Completed and accepted
Previous authoritative closure: docs/159-phase-12.10-phase-12-validation-and-closure.md
Next numbered phase: Phase 13 — Production Infrastructure, Deployment & Go-Live — Not started
Phase 13 activation: blocked until Final-H is completed and this track is explicitly accepted
```

## Purpose

Complete one final owner-approved improvement round before Production without reopening Phase 12
and without silently starting Phase 13.

The track addresses seven owner-requested areas:

```text
1. Admin-managed Airbnb iCal configuration and TRP outbound feed copy/rotation.
2. Reservation review invitations and one-time guest review submission.
3. Twilio WhatsApp guest communication plus internal staff notifications.
4. Financial-correctness bug for refunds/cancellation after paid positive stay adjustments.
5. Seasonal and length-of-stay pricing rules.
6. Additional guest charges and payment requests.
7. Public/admin performance investigation and optimization.
```

The work is grouped into Packages Final-A through Final-H so financial invariants are corrected
before new pricing and charge behavior is added.

## Global Track Boundaries

```text
- Phase 12 remains closed.
- Phase 13 remains Not started.
- Test remains TRP_ENVIRONMENT=test.
- Test Vercel scheduler registration remains disabled.
- No Production provider account, credential, DNS cutover, payment credential, database,
  media account, WhatsApp sender, or public go-live is introduced by registering this track.
- Production ownership rules accepted in Phase 12 remain unchanged.
- All public/admin visible copy remains centralized in messages/es.ts and messages/en.ts.
- No native alert(), confirm(), or prompt() UI.
- No raw provider errors, private iCal URLs, tokens, Twilio credentials, auth values, or card data
  may be exposed through public/admin output or logs.
- Existing audit, idempotency, soft-delete, transaction, and evidence-based financial rules remain
  mandatory.
```

## Package Order

```text
Final-A — Reservation financial correctness and effective stay value
Final-B — Admin external-calendar integrations
Final-C — Pricing rules: seasonal and length-of-stay
Final-D — Additional charges and guest payment requests
Final-E — Reservation reviews and post-checkout invitation
Final-F — Twilio WhatsApp communication and staff alerts
Final-G — Performance audit and optimization
Final-H — Integrated regression and final improvement-track closure
```

The order is intentional:

```text
Final-A establishes the financial source of truth.
Final-C and Final-D must build on that corrected financial contract.
Final-B is operationally independent and can follow the financial correction safely.
Final-E reuses the existing reservation/email/cron foundation.
Final-F introduces the largest new external communication integration.
Final-G optimizes the final feature set instead of optimizing an intermediate state.
Final-H is the last gate before Phase 13 may be planned.
```

## Cross-Track Performance Baseline

Before or at the beginning of Final-A, capture a small hosted Test performance baseline without
changing behavior.

At minimum record representative cold/warm observations for:

```text
- public landing
- accommodation listing/detail
- public booking/availability
- admin dashboard
- admin reservations
- admin calendar
```

Record, when available:

```text
- TTFB
- LCP
- INP
- transferred JS/RSC payload
- image request behavior
- obvious server/Prisma query latency
```

This is evidence only. Optimization work belongs to Final-G unless a severe blocking defect is
discovered earlier.

---

# Final-A — Reservation Financial Correctness and Effective Stay Value

## Current Final-A Status

```text
Final-A — Completed and accepted on 2026-08-12 at 66afbeacd6ee7d669cb4bc251c8416160fae3f49
Final-A.1 Financial source-of-truth and refund-allocation contract — Completed and accepted on 2026-08-11 at 19531568752a44446d0802d6581262260b881aaf
Final-A.2 Central financial summary and cancellation-policy correction — Completed and accepted on 2026-08-11 at 9f4e04068726451ca87614dd99b1f10656510825
Final-A.3 Standard and extraordinary multi-payment refund authorization — Completed and accepted on 2026-08-11 at 8d5884c4f536c0d9407fac2d0229b71105114453
Final-A.4 Negative DATE_CHANGE multi-payment integration — Completed and accepted on 2026-08-11 at 1c5ea765543e46b89beb64ecb3c06141e8efd8e4
Final-A.5 Admin UX, notification copy, and operational-history integration — Completed and accepted on 2026-08-12 at 4117435dd52f6278a205e314db95d336ce0f7662
Final-A.6 Integrated acceptance and documentation closure — Completed and accepted on 2026-08-12 at 66afbeacd6ee7d669cb4bc251c8416160fae3f49
Strategy/roadmap: docs/161-final-a-financial-correctness-strategy-and-roadmap.md
Final-A.2 record: docs/162-final-a-2-central-financial-summary-and-cancellation-policy-correction.md
Final-A.3 record: docs/163-final-a-3-standard-and-extraordinary-multi-payment-refunds.md
Final-A.4 record: docs/164-final-a-4-negative-date-change-multi-payment-integration.md
Final-A.5 record: docs/165-final-a-5-admin-refund-ux-notification-and-operational-history.md
Final-A.6 record: docs/166-final-a-6-integrated-acceptance-and-documentation-closure.md
```

Final-A.1 freezes the Reservation-level financial source of truth, eligible stay-payment pool,
deterministic initial-payment-first allocation, provider-level Refund-leg boundary, and the
minimal `Refund.refundOperationKey` grouping contract before implementation begins.

## Goal

Correct the existing refund/cancellation defect where a reservation that has a successfully paid
positive date-change or stay-extension adjustment is still treated as if only its original Payment
amount were financially relevant.

## Confirmed defect scenario

```text
Original confirmed stay:       USD 130
Approved positive adjustment:  USD  65
Adjustment payment:            APPROVED
Date change/extension:          COMPLETED
Current stay contract value:   USD 195

Extraordinary refund request:  USD 145
Current incorrect behavior:    rejected because 145 > original 130
Required behavior:             allowed if all other refund/balance rules pass
```

## Financial contract to introduce

Create one centralized financial summary/service for a Reservation. Exact implementation names are
decided during Final-A code review, but the domain contract must expose the equivalent of:

```text
originalStayAmount
approvedCompletedPositiveStayAdjustments
currentStayValue
capturedStayPayments
approvedOrReservedStayRefunds
remainingRefundableStayBalance
additionalChargeGrossAmount
additionalChargeCapturedAmount
additionalChargeRefundedAmount
```

Key rules:

```text
- A completed positive DATE_CHANGE/STAY_EXTENSION with its exact APPROVED
  LIFECYCLE_ADJUSTMENT Payment increases currentStayValue.
- An adjustment payment that was approved but whose date mutation never completed does not increase
  currentStayValue; its compensation remains a separate Refund path.
- Refund authorization is bounded by the effective captured balance, not only the original Payment.
- Payment and Refund history remain separate records; do not rewrite the original Payment amount.
- The summary is derived from authoritative persisted movements and accepted lifecycle state.
```

## Cancellation policy base after adjustments

The existing 100% / 50% / 0% timing matrix remains unchanged.

The amount base changes to the current effective stay contract value after successfully completed
paid adjustments.

Example:

```text
Current stay value: USD 195

100% policy window -> policy amount = USD 195
50% policy window  -> policy amount = USD 97.50
0% policy window   -> policy amount = USD 0
```

Policy entitlement and captured balance remain independent protections. The amount that may
actually be newly refunded is still capped by the remaining captured stay balance after relevant
committed/approved refunds.

## Separation required for Final-D

Additional service/damage/transport charges introduced later must not automatically increase the
stay cancellation-policy base.

Example:

```text
Current stay value:              USD 195
Paid airport transport charge:   USD  30
Total money collected:           USD 225

Stay cancellation-policy base:   USD 195
Additional-charge handling:      separate policy/state
```

## Final-A acceptance

Final-A must include regression for:

```text
- original-only reservation
- completed positive DATE_CHANGE
- completed positive STAY_EXTENSION
- zero adjustment
- negative adjustment
- failed positive completion with compensation
- extraordinary refund across multiple stay Payments
- standard cancellation/refund after a positive adjustment
- cumulative refund protection
- concurrency/idempotency
- existing Tilopay reconciliation
- ES/EN admin display
```

---

# Final-B — Admin External-Calendar Integrations

## Status

```text
Package: Final-B — Completed and accepted on 2026-08-25
Implementation base head: 0927feb18be35b8d96aca0205a75ee19445f15d4
Final-B.6 status: Completed and accepted on 2026-08-25
Final-B.1 status: Completed and accepted on 2026-08-14 at 2627161d5b3960995be0f517682f84272431c291
Final-B.2 implementation base head: 2627161d5b3960995be0f517682f84272431c291
Final-B.2 status: Completed and accepted on 2026-08-25 at 530fe2f5f7a75bdbfb36ca6f202b8cb04afca98d
Final-B.2 accepted head: 530fe2f5f7a75bdbfb36ca6f202b8cb04afca98d
Final-B.3 implementation base head: 530fe2f5f7a75bdbfb36ca6f202b8cb04afca98d
Final-B.3 status: Completed and accepted on 2026-08-25
Final-B.3 accepted head: 84e3f5158e76527a82b2b6655664ec9ab073ea44
Final-B.4 implementation base head: 84e3f5158e76527a82b2b6655664ec9ab073ea44
Final-B.4 status: Completed and accepted on 2026-08-25 at a3724f018449515363159ec9f23af892a21b24be
Final-B.4 accepted head: a3724f018449515363159ec9f23af892a21b24be
Final-B.5 implementation base head: a3724f018449515363159ec9f23af892a21b24be
Final-B.5 status: Completed and accepted on 2026-08-25 at bc6b3db1bec219913164ef267fe5279b19f49a27
Final-B.5 accepted head: bc6b3db1bec219913164ef267fe5279b19f49a27
Final-B.6 implementation base head: bc6b3db1bec219913164ef267fe5279b19f49a27
Final-B.6 accepted feature head: 1fe06de8c55ab1563999b2db1d210bfc9a82c613
Final-B accepted feature head: 1fe06de8c55ab1563999b2db1d210bfc9a82c613
Final-B.1 authoritative record: docs/167-final-b-1-external-calendar-admin-strategy-and-security-contract.md
Final-B.2 authoritative record: docs/168-final-b-2-outbound-token-encrypted-persistence-and-rotation-foundation.md
Final-B.3 status: Completed and accepted on 2026-08-25 at 84e3f5158e76527a82b2b6655664ec9ab073ea44
Final-B.3 authoritative record: docs/169-final-b-3-admin-external-calendar-read-model-and-integration-ui.md
Final-B.4 authoritative record: docs/170-final-b-4-airbnb-inbound-configuration-and-operational-actions.md
Final-B.5 authoritative record: docs/171-final-b-5-trp-outbound-copy-rotation-and-export-controls.md
Final-B.6 authoritative record: docs/172-final-b-6-integrated-acceptance-regression-and-documentation-closure.md
Following package after Final-B closure: Final-C — Pricing rules: seasonal and length-of-stay — subsequently completed and accepted on 2026-08-28 at dca50f51abe1836d3b678b762693219143b12099
Phase 13: Not started
```

## Goal

Allow an authorized admin to configure and operate the accepted Airbnb iCal integration without
editing private environment configuration manually, while keeping provider URLs/tokens encrypted,
public feed lookup hash-based, synchronization auditable, and existing Test integrations compatible
during migration.

## Frozen Subphase Split

```text
Final-B.1 External-calendar admin strategy and security contract
Final-B.2 Outbound-token encrypted persistence and rotation foundation
Final-B.3 Admin external-calendar read model and integration UI
Final-B.4 Airbnb inbound configuration and operational actions
Final-B.5 TRP outbound Copy URL / Rotate URL / export controls
Final-B.6 Integrated acceptance, regression and documentation closure
```

Final-B does not create one validation script per subphase. Final-B.6 owns the consolidated
regression gate.

## Existing Foundation Confirmed by Final-B.1

Current `ExternalCalendar` already stores the accepted operational state:

```text
provider = AIRBNB
direction
name
importUrlEncrypted
exportTokenHash
exportTokenLastRotatedAt
isImportEnabled
isExportEnabled
status
import/export timestamps
safe failure diagnostics
soft-delete relation
event history
sync history
```

The review also confirmed the current transitional gaps:

```text
- importUrlEncrypted exists but the default runtime still resolves inbound URLs from
  AIRBNB_ICAL_IMPORT_URLS_JSON; no DB secret encryption/decryption runtime exists yet.
- exportTokenHash correctly protects public lookup but cannot recover the original raw token for
  a protected Copy URL action.
- current inbound URL validation accepts arbitrary HTTP/HTTPS URLs, which must be narrowed before
  URLs can be submitted from admin UI.
- ExternalCalendar does not yet enforce one property/provider row.
- the existing admin calendar has no integration-configuration surface.
```

## Frozen Security/Persistence Direction

Final-B.1 freezes:

```text
- one durable AIRBNB ExternalCalendar row per property/provider
- dedicated EXTERNAL_CALENDAR_ENCRYPTION_KEY
- AES-256-GCM authenticated encryption using Node built-in crypto
- property/purpose-bound additional authenticated data
- inbound Airbnb URL stored only as encrypted data
- outbound raw token stored as SHA-256 hash + encrypted copy
- no automatic migration of legacy env URLs
- no automatic rotation of existing hash-only Test outbound tokens
- HTTPS/Airbnb-specific URL validation plus redirect validation before server-side fetch
- no secrets in ordinary admin read models, logs, audit metadata, or error responses
- protected /admin/calendar/integrations route
- independent API authentication plus same-origin checks for secret/mutation operations
- DB-first inbound resolver with temporary env fallback during B.4
- one-at-a-time outbound rotation of the three real Test integrations in B.5
- removal of the legacy Test env fallback only after controlled migration in B.6
```

## Admin UX Boundary

The protected admin location is:

```text
/admin/calendar/integrations
```

Selector buttons are shown for all supported accommodations. Exactly one selected-accommodation integration card is mounted at a time, using the same default/outline selection pattern as the admin property calendar. Switching accommodation replaces the visible card and discards unsaved client-only secret input from the previously selected card. The selected card contains:

```text
Airbnb -> TRP Booking
- password-style URL entry/replacement
- configured state only after save; never return stored plaintext
- Test connection
- Sync now
- import enable/disable
- safe status, last sync, last successful sync, safe failure diagnostic

TRP Booking -> Airbnb
- export configured state
- Copy URL
- Generate/Rotate URL
- export enable/disable
- last rotation
- last feed generation/request timestamp
```

Existing hash-only Test feeds remain valid after B.2. Copy URL stays unavailable until a deliberate
rotation creates the encrypted raw-token copy.

## Compatibility Boundary

Inbound migration is staged:

```text
B.2 -> encryption foundation only; current env-backed sync remains compatible
B.3 -> safe read model shows DATABASE_ENCRYPTED / LEGACY_ENV / NONE
B.4 -> DB-first resolver + temporary legacy env fallback; explicit admin save migrates each URL
B.5 -> deliberate one-at-a-time outbound rotation/copy rollout
B.6 -> remove legacy AIRBNB_ICAL_IMPORT_URLS_JSON from Test/runtime after all three migrations pass
```

No feed/token/URL is changed automatically by a schema migration.

## Scheduler Boundary

Test retains:

```json
{
  "crons": []
}
```

Final-B does not activate scheduler registrations. The existing sync job and cron registry remain
available for manual/admin execution, while Phase 13 remains the Production scheduler boundary.

## Authoritative Contract

The complete review, SSRF boundary, encryption envelope, read-model exclusions, API contract,
audit action names, Test Connection semantics, Sync Now semantics, Copy URL handling, controlled
rotation plan, and Final-B.6 acceptance matrix are frozen in:

```text
docs/167-final-b-1-external-calendar-admin-strategy-and-security-contract.md
```

Do not implement B.2 through B.6 in a way that weakens that contract without first updating and
explicitly re-accepting the strategy.

---

# Final-C — Pricing Rules: Seasonal and Length-of-Stay

## Status

```text
Package: Final-C — Completed and accepted on 2026-08-28
Accepted feature head: dca50f51abe1836d3b678b762693219143b12099
Implementation base head: e7ce19c49c5cfd45e1cc08796ee897a2dce0d1ed
Final-C.6 status: Completed and accepted on 2026-08-28
Final-C.6 closure-gate commit: 1391b69a6bb591cc7d4e8a68b577ea8bda4fb8fe
Final-C.1 status: Completed and accepted on 2026-08-25
Final-C.1 accepted strategy head: 16d8b0411e573aaaa6b510ddb27a9b5d9c666478
Final-C.1 record: docs/173-final-c-1-pricing-strategy-precedence-and-persistence-contract.md
Final-C.2 implementation base head: 030dec0d8681de18db746b9aae882cadd54db966
Final-C.2 status: Completed and accepted on 2026-08-26 — Pricing persistence foundation and migration
Final-C.2 accepted head: 2168262784b0a8213062b0d84ca9fe6069e98fc6
Final-C.2 record: docs/174-final-c-2-pricing-persistence-foundation-and-migration.md
Final-C.3 implementation base head: 2168262784b0a8213062b0d84ca9fe6069e98fc6
Final-C.3 status: Completed and accepted on 2026-08-26
Final-C.3 accepted head: c8fc39d111d7b33ee4a375264c5a3c25030de185
Final-C.3 record: docs/175-final-c-3-central-pricing-engine-and-public-pending-reservation-integration.md
Final-C.4 implementation base head: c8fc39d111d7b33ee4a375264c5a3c25030de185
Final-C.4 status: Completed and accepted on 2026-08-27
Final-C.4 accepted head: 0a57b9772da55a78e8d445dc06ea2b738b412f11
Final-C.4 record: docs/176-final-c-4-admin-pricing-rule-management.md
Final-C.5 implementation base head: 0a57b9772da55a78e8d445dc06ea2b738b412f11
Final-C.5 status: Completed and accepted on 2026-08-27
Final-C.5 feature head: a88b26c0e2782daad7ea3215eb5b12f8f5124806
Final-C.5 accepted head: 4fd36fd25484adda7d24a7df4da3c1738835474c
Final-C.5 record: docs/177-final-c-5-date-change-stay-extension-pricing-integration.md
Final-C.6 implementation base head: 4fd36fd25484adda7d24a7df4da3c1738835474c
Final-C.6 accepted feature head: dca50f51abe1836d3b678b762693219143b12099
Final-C.6 record: docs/178-final-c-6-integrated-regression-and-documentation-closure.md
Final-C status: Completed and accepted on 2026-08-28
Final-C accepted feature head: dca50f51abe1836d3b678b762693219143b12099
Following package: Final-D — Additional charges and guest payment requests — Completed and accepted on 2026-09-18 at fd75663bb28be8a95b15c341eaa51f74e521241b
Phase 13: Not started
```

## Goal

Allow administrators to configure pricing beyond `Property.baseNightlyPrice` while keeping quotes,
payments, date changes, cancellation/refund logic, and historical reservations deterministic.

## Frozen Subphase Split

```text
Final-C.1 Pricing strategy, precedence and persistence contract
Final-C.2 Pricing persistence foundation and migration
Final-C.3 Central pricing engine and public quote/pending-reservation integration
Final-C.4 Admin pricing-rule management
Final-C.5 DATE_CHANGE/STAY_EXTENSION pricing integration
Final-C.6 Integrated regression and documentation closure
```

Final-C.1 through Final-C.6 are completed and accepted. Final-C.5 was accepted at `4fd36fd25484adda7d24a7df4da3c1738835474c` after the lifecycle pricing implementation and the snapshot-narrowing correction. Final-C.6 completed the consolidated 41/41 regression, Hosted Test, owner acceptance, and documentation closure gate. The accepted Final-C feature head is `dca50f51abe1836d3b678b762693219143b12099`.

## Included Pricing Types

```text
Seasonal rate
- per-property date range
- explicit absolute nightly rate
- may be lower or higher than the base nightly rate

Length-of-stay rate
- per-property minimum-night tier
- explicit absolute nightly rate
- supported tiers: 2, 3, 4, 5, 6, 7, 15, 30 nights
```

Length-of-stay uses highest-eligible-tier semantics:

```text
10 nights -> highest configured eligible tier up to 10, normally 7+
20 nights -> highest configured eligible tier up to 20, normally 15+
32 nights -> highest configured eligible tier up to 32, normally 30+
```

Unconfigured tiers are skipped; they do not inherit a fabricated rate.

## Frozen Precedence

Pricing resolves every charged night independently using one source only:

```text
1. matching active Seasonal rate for that night
2. otherwise highest eligible active Length-of-Stay rate for the stay-length context
3. otherwise Property.baseNightlyPrice
```

Seasonal and LOS rates are overrides, not additive discounts. They never stack, sum, or multiply.
A mixed stay may therefore contain seasonal-priced nights and LOS/base-priced nights in the same
quote.

Active seasonal ranges for the same property must not overlap. Adjacent ranges are valid.

## Lifecycle Pricing Boundary

```text
New/public reservation
- LOS eligibility uses the complete requested stay length.
- Every requested night is priced under the frozen precedence contract.

DATE_CHANGE
- Full requested stay is repriced using current accepted rules.
- LOS eligibility uses the complete requested stay length.
- Existing accepted dates/pricing remain unchanged until the lifecycle request completes.

STAY_EXTENSION
- Existing accepted stay value and already-paid nights are never repriced.
- Only added nights are priced using current accepted rules.
- LOS eligibility for the added nights uses the resulting total stay length after extension.
- Seasonal still overrides LOS for each added night.
```

## Historical Pricing Boundary

Accepted numeric totals remain authoritative for historical reservations. Final-C must never
retroactively price old stays with today's rules or fabricate historical rule evidence.

New Final-C reservations persist versioned pricing evidence sufficient to reconstruct the accepted
quote. Lifecycle requests preserve independent original/requested pricing evidence. A legacy
reservation without historical pricing evidence may use a bounded preserved-total segment when an
extension appends newly priced nights; a full DATE_CHANGE creates new requested pricing evidence
without rewriting the historical original values.

## Scope Boundary

Final-C is limited to seasonal pricing and length-of-stay nightly-rate tiers.

Explicitly excluded:

```text
last-minute pricing/discounts
percentage discount rules
coupon/promo codes
weekend pricing
occupancy/demand pricing
channel-specific pricing
automatic composed-listing price derivation
fees/tax redesign
additional charges (Final-D)
```

Detailed invariants, proposed persistence direction, concurrency/audit rules, UI boundary, pricing
snapshot contract and acceptance matrix are authoritative in:

```text
docs/173-final-c-1-pricing-strategy-precedence-and-persistence-contract.md
docs/174-final-c-2-pricing-persistence-foundation-and-migration.md
```

---

# Final-D — Additional Charges and Guest Payment Requests

## Status

```text
Package: Final-D — Completed and accepted on 2026-09-18
Implementation base head: 0839b2935fdc2349d23de6ce6b38177504e514c6
Accepted feature head: fd75663bb28be8a95b15c341eaa51f74e521241b
Permanent regression: npm run final-d:validate — 66/66 PASS
Following package: Final-E — Reservation reviews and post-checkout invitation — Completed and accepted on 2026-09-21 at 3843a6637300201bcb44b7ed235952afda02d880; Final-F is Active with Final-F.1 completed and accepted on 2026-09-21 at d5db6a2605a03e75db7c16238a43cd5f79dde6d8
Final-D.1 status: Completed and accepted on 2026-08-31
Final-D.1 accepted strategy head: 3dc4fa7d81d65244a94e7e43726e2f12591e578f
Final-D.1 record: docs/179-final-d-1-additional-charge-payment-request-strategy-and-financial-isolation-contract.md
Final-D.2 implementation base head: 3dc4fa7d81d65244a94e7e43726e2f12591e578f
Final-D.2 status: Completed and accepted on 2026-08-31
Final-D.2 accepted head: 74ac3011eb22277a896d81c92897f1bee6a4d51b
Final-D.2 record: docs/180-final-d-2-additional-charge-persistence-foundation-and-migration.md
Final-D.3 implementation base head: 74ac3011eb22277a896d81c92897f1bee6a4d51b
Final-D.3 status: Completed and accepted on 2026-08-31
Final-D.3 accepted head: 6a0d909fc325f4e8925677041be34c77c023c42b
Final-D.3 record: docs/181-final-d-3-admin-charge-management-and-payment-request-creation.md
Final-D.4 implementation base head: 6a0d909fc325f4e8925677041be34c77c023c42b
Final-D.4 status: Completed and accepted on 2026-09-14 at 7d996fd20db42b2560df11f7e00d7a5e9cc0d18c — Private guest payment link and Tilopay collection
Final-D.4 accepted implementation head: 7d996fd20db42b2560df11f7e00d7a5e9cc0d18c
Final-D.4 record: docs/182-final-d-4-private-guest-payment-link-and-tilopay-collection.md
Final-D.5 implementation base head: 63f55e22d03270bce0d27be2197373e3ce3e5de8
Final-D.5 status: Completed and accepted on 2026-09-17 at 06b3de23fbae23a77b58b432760abf12afd5a6c7 — Additional-charge refunds and financial-summary integration
Final-D.5 accepted implementation head: 06b3de23fbae23a77b58b432760abf12afd5a6c7
Final-D.5 record: docs/183-final-d-5-additional-charge-refunds-and-financial-summary-integration.md
Final-D.6 implementation base head: 1f3f30f63c0198afa219df9feea4f415cbc1ccd2
Final-D.6 status: Completed and accepted on 2026-09-18 at 965045c697a9bfd0a3318db9396b15214a0cd066 — Email delivery and protected operational UX/history
Final-D.6 accepted implementation head: 965045c697a9bfd0a3318db9396b15214a0cd066
Final-D.6 record: docs/184-final-d-6-email-delivery-and-protected-operational-ux-history.md
Final-D.7 implementation base head: 0a511f4b87c3d8556593f9d48909a71d7bfab14c
Final-D.7 status: Completed and accepted on 2026-09-18 at fd75663bb28be8a95b15c341eaa51f74e521241b — Integrated regression and documentation closure
Final-D.7 accepted implementation/validation head: fd75663bb28be8a95b15c341eaa51f74e521241b
Final-D.7 record: docs/185-final-d-7-integrated-regression-and-documentation-closure.md
Phase 13: Not started
```

## Goal

Allow admins to create auditable ancillary charges associated with a Reservation and collect them
through secure guest payment links without treating them as accommodation price.

## Frozen Subphase Split

```text
Final-D.1 Additional-charge/payment-request strategy and financial-isolation contract
Final-D.2 Persistence foundation and migration
Final-D.3 Admin charge management and payment-request creation
Final-D.4 Private guest payment link and Tilopay collection
Final-D.5 Additional-charge refunds and financial-summary integration
Final-D.6 Email delivery and protected operational UX/history
Final-D.7 Integrated regression and documentation closure
```

Final-D.1 is authoritative in `docs/179-final-d-1-additional-charge-payment-request-strategy-and-financial-isolation-contract.md`. D.2 through D.7 must not weaken that contract without an explicit strategy update and owner acceptance.

## Initial charge categories

```text
CLEANING
DAMAGE
TRANSPORT
LATE_CHECKOUT
EXTRA_SERVICE
OTHER
```

The domain may use typed enums with localized labels.

## Charge lifecycle

An AdditionalCharge should contain the equivalent of:

```text
reservation
category
description/reason
amount/currency
status
createdBy
timestamps
refundability/policy metadata as required
audit history
```

## Payment-request model

Do not require one Tilopay checkout for every individual line item.

Allow one or more pending charges to be grouped into one guest Payment Request.

Example:

```text
Airport transport     USD 25
Late checkout         USD 15
--------------------------------
Payment Request       USD 40
```

A later damage charge can become a separate request.

## Payment link

Recommended flow:

```text
Admin creates/selects charge(s)
-> server validates current reservation/charge state
-> Payment Request is created idempotently
-> guest receives a private expiring payment link
-> existing Tilopay SDK/payment validation foundation is reused
-> successful provider evidence marks the payment request/charges paid
```

Email is the initial delivery channel. After Final-F is accepted, an eligible WhatsApp delivery
action may reuse the same private payment request link.

## Financial isolation

Additional charges must be distinguishable from stay payments, for example through a dedicated
Payment purpose or equivalent relation.

They do not automatically increase:

```text
Reservation currentStayValue
standard cancellation-policy base
date-change stay pricing
```

Refundability of an additional charge depends on that charge's own business state, not the stay's
100% / 50% / 0% cancellation matrix.

---

# Final-E — Reservation Reviews and Post-Checkout Invitation

## Current Final-E Status

```text
Package: Final-E — Completed and accepted on 2026-09-21 at 3843a6637300201bcb44b7ed235952afda02d880
Final-E.1 — Review/invitation strategy, eligibility and security contract — Completed and accepted on 2026-09-18
Final-E.1 implementation base head: 2c9802b07ebf60e8953f32226962669eaf01cfc2
Final-E.1 accepted strategy head: e83ad8443bd533715058e701769b10c2d5505436
Final-E.1 record: docs/186-final-e-1-review-invitation-strategy-eligibility-and-security-contract.md
Final-E.2 — Review/invitation persistence foundation and migration — Completed and accepted on 2026-09-18 at f77938c5606ed636b697dc1af41c111a22ba1593
Final-E.2 implementation base head: 2e1b26850c55364db8450fafc2bb35c6d89a2c3b
Final-E.2 accepted implementation head: f77938c5606ed636b697dc1af41c111a22ba1593
Final-E.2 record: docs/187-final-e-2-review-invitation-persistence-foundation-and-migration.md
Final-E.3 — Eligibility and invitation/token lifecycle foundation — Completed and accepted on 2026-09-18 at c67d2a59a8bec9ba84ca36c37fc0ddfbbf250030
Final-E.3 implementation base head: 6cc737c1e846563069b5f71cbd60b34064ffc160
Final-E.3 accepted implementation head: c67d2a59a8bec9ba84ca36c37fc0ddfbbf250030
Final-E.3 record: docs/188-final-e-3-eligibility-and-invitation-token-lifecycle-foundation.md
Final-E.4 — Review-invitation scheduling, cron integration and email delivery — Completed and accepted on 2026-09-18 at e8d4e8e771dbbdb32250d03dea09f2c2c02a1dc1
Final-E.4 implementation base head: 19199e6382b4daa7651417c37c1958ad59300373
Final-E.4 accepted implementation head: e8d4e8e771dbbdb32250d03dea09f2c2c02a1dc1
Final-E.4 record: docs/189-final-e-4-review-invitation-scheduling-cron-and-email-delivery.md
Final-E.5 — Private guest review submission — Completed and accepted on 2026-09-21 at f37f4802219aeb80d10f92b406e0a4847b10f15d
Final-E.5 implementation base head: 2baddeb520c01cd860a73f84a22bd4ec5d0a148c
Final-E.5 accepted implementation head: f37f4802219aeb80d10f92b406e0a4847b10f15d
Final-E.5 record: docs/190-final-e-5-private-guest-review-submission.md
Final-E.6 — Admin moderation and public published-review presentation — Completed and accepted on 2026-09-21 at 82f1c27ba2af41d9ade9f8f57348bf66e18f800f
Final-E.6 implementation base head: 2b56d43d60da3558ce692e18f4756f1c862bcb17
Final-E.6 accepted implementation head: 82f1c27ba2af41d9ade9f8f57348bf66e18f800f
Final-E.6 record: docs/191-final-e-6-admin-moderation-and-public-published-review-presentation.md
Final-E.7 — Integrated regression and documentation closure — Completed and accepted on 2026-09-21 at 3843a6637300201bcb44b7ed235952afda02d880
Final-E.7 implementation base head: 4df7cbc07b6ae9789a62f568d1e3ab69a808d596
Final-E permanent regression: npm run final-e:validate — 88/88 accepted
Final-E.7 record: docs/192-final-e-7-integrated-regression-and-documentation-closure.md
Final-F: Active — Final-F.1 completed and accepted on 2026-09-21 at d5db6a2605a03e75db7c16238a43cd5f79dde6d8
Final-F.1 record: docs/193-final-f-1-twilio-whatsapp-staff-alert-strategy-onboarding-and-security-contract.md
Final-F.2: Completed and accepted on 2026-09-22 at 03861cb2d5daef7cca8bb759d16a0ef050d86b41
Final-F.2 implementation base: ba47dc9f22f4d61a01c13066f84e15ae8ad549f7
Final-F.2 record: docs/194-final-f-2-twilio-sandbox-provider-foundation-webhook-signature-validation-and-test-onboarding.md
Final-G/H: Not started
Phase 13: Not started
```

## Goal

Allow one authentic guest review per eligible direct Reservation through a secure one-time link sent
after checkout.

## Frozen Final-E Subphase Split

```text
Final-E.1 Review/invitation strategy, eligibility and security contract
Final-E.2 Review/invitation persistence foundation and migration
Final-E.3 Eligibility and invitation/token lifecycle foundation
Final-E.4 Review-invitation scheduling, cron integration and email delivery
Final-E.5 Private guest review submission
Final-E.6 Admin moderation and public published-review presentation
Final-E.7 Integrated regression and documentation closure
```

Rules:

```text
- E.1 is docs-only.
- E.2 persistence only; no guest flow activation.
- E.2 may add REVIEW_INVITATION schema/enum/relation support, but must not create operational ReviewInvitation or REVIEW_INVITATION EmailNotification rows.
- E.3 is dormant domain foundation only: checkout/eligibility calculation, 7-day candidate policy, expiration logic, token generation/hash/encryption/decryption, lifecycle helpers, idempotent ensure primitives and terminal convergence helpers.
- E.3 must not register a cron, expose a public route, create REVIEW_INVITATION EmailNotification rows, deliver email, or install an automatic operational caller that creates invitations in normal runtime.
- E.4 activates review-invitation scheduling and email delivery together, including cron registry integration, manual Test execution, REVIEW_INVITATION notification config, renderer/dispatcher support, retry eligibility and private URL reconstruction.
- E.4 must add processor/dispatcher support before or in the same changeset where any operational path can create REVIEW_INVITATION notification rows.
- E.4 preserves the transactional rule: a newly operationally created ReviewInvitation and its REVIEW_INVITATION EmailNotification intent are created in the same business transaction, and provider delivery occurs after commit.
- E.5 implements only the private guest review submission route and one-time token consumption.
- E.6 adds admin moderation and public published-review presentation.
- E.7 owns final-e:validate and package closure.
- npm run final-e:validate is created only in E.7.
```

## Eligibility

Initial contract:

```text
Reservation is a real direct Reservation row
Reservation was confirmed
Reservation was not cancelled before the stay
checkout time has passed
review does not already exist
invitation is eligible 2 hours after the property's configured checkout time
timezone = America/Guatemala
```

Final-E.1 freezes the implementable eligibility contract:

```text
checkoutAt = Reservation.checkOutDate + Property.checkOutTime in America/Guatemala
eligibleAt = checkoutAt + 2 hours

null/blank/invalid Property.checkOutTime
=> fail closed
=> no invitation is created

cancelledAt == null
=> eligible subject to all other rules

cancelledAt < checkoutAt
=> ineligible

cancelledAt >= checkoutAt
=> may remain eligible as an unusual lifecycle compatibility case because checkout had already
   been reached
```

The scheduler catch-up policy is prospective and bounded:

```text
eligibleAt <= now
eligibleAt >= now - 7 days
```

No unbounded historical backfill is part of the initial Final-E contract.

## Review access

The Reservation ID identifies ownership internally but is not itself a public credential.

Use:

```text
random opaque token
token hash persisted in database
private review URL contains raw token
one review per Reservation enforced by database uniqueness
```

Email retries require a recoverable encrypted token copy:

```text
raw token:
- 256-bit random
- only in the intended private URL / immediate server handling
- never persisted plaintext
- never logged

token hash:
- SHA-256
- persisted for lookup

encrypted token:
- AES-256-GCM envelope
- persisted only to reproduce the same still-valid URL for email retry
- purpose/AAD = REVIEW_INVITATION
```

Do not reuse the `GUEST_PAYMENT_REQUEST` crypto purpose.

The public endpoint resolves the token safely to the Reservation/Review invitation.

## Guest flow

```text
checkout time + 2 hours
-> eligible review invitation is scheduled/created
-> existing email foundation sends one review invitation
-> guest opens private review URL
-> rating + comment form is shown
-> server validates the still-valid token and reservation eligibility
-> review is inserted atomically
-> token/invitation becomes consumed
-> replay of the same URL cannot create or edit another review
```

Recommended invitation expiration:

```text
30 days after invitation
```

Expiration is 30 days from ReviewInvitation creation, not from Reservation creation, confirmation,
check-in or checkout. Overdue ACTIVE invitations may converge to EXPIRED at read/action boundary; no
expiry-only cron is required.

## Review content

Initial public review data:

```text
rating: 1 through 5
comment
submittedAt
safe guest display name, e.g. first name + last initial
property
```

Do not expose guest email, phone, provider data, or reservation financial data.

Guest display name is a persisted safe snapshot derived at submission:

```text
one token name: Juan -> Juan
multiple tokens: Juan Jose Tzun -> Juan T.
```

Normalize whitespace and use first token plus first grapheme/letter of the final token. Do not
publish the full Reservation.guestName automatically.

## Admin moderation

Allow:

```text
publish
hide/unpublish
read original review
```

Do not allow admins to rewrite the guest's rating or comment as if it were the guest's own text.

Moderation statuses are:

```text
PENDING
PUBLISHED
HIDDEN
```

Initial Review submission is PENDING. Only PUBLISHED reviews may be exposed publicly.

## Scheduling boundary

Final-E may add a review-invitation scheduling job to the existing cron registry.

During this improvement track:

```text
Test Vercel scheduler registrations remain zero.
The review job can be executed manually in Test through the accepted cron/admin execution model.
```

Final-H must update the Phase 13 scheduler carry-forward so Production activation includes every
accepted job that exists after this track, rather than relying on the previous four-job count.

The complete E.1 strategy, migration direction, email relation contract, cron/manual execution
contract, security/privacy boundary, non-goals and acceptance matrix are frozen in:

```text
docs/186-final-e-1-review-invitation-strategy-eligibility-and-security-contract.md
```

---

# Final-F — Twilio WhatsApp Communication and Staff Alerts

## Current Final-F Status

```text
Package: Final-F — Active
Final-F.1 — Twilio/WhatsApp + staff-alert strategy, onboarding, templates and security contract — Completed and accepted on 2026-09-21 at d5db6a2605a03e75db7c16238a43cd5f79dde6d8
Final-F.1 implementation base head: c6dbe2309f0cd373701fc9444f7f15879692f423
Final-F.1 accepted implementation head: d5db6a2605a03e75db7c16238a43cd5f79dde6d8
Final-F.1 record: docs/193-final-f-1-twilio-whatsapp-staff-alert-strategy-onboarding-and-security-contract.md
Final-F.2 — Twilio Sandbox provider foundation, webhook signature validation and Test onboarding — Completed and accepted on 2026-09-22 at 03861cb2d5daef7cca8bb759d16a0ef050d86b41
Final-F.2 implementation base head: ba47dc9f22f4d61a01c13066f84e15ae8ad549f7
Final-F.2 initial implementation head: 13e6dcadc9fa8930cd8166aebb8049093ce6fa3c
Final-F.2 accepted implementation/validation head: 03861cb2d5daef7cca8bb759d16a0ef050d86b41
Final-F.2 record: docs/194-final-f-2-twilio-sandbox-provider-foundation-webhook-signature-validation-and-test-onboarding.md
Final-F.3 — WhatsApp conversation/message persistence + staff-recipient / staff-alert persistence foundation — Next / Not started
Final-F.4 — Guest inbound WhatsApp, safe Reservation matching and protected admin inbox — Not started
Final-F.5 — Admin outbound replies, 24-hour service-window enforcement and Twilio status callbacks — Not started
Final-F.6 — Operational staff WhatsApp alerts — Not started
Final-F.7 — Zoho incoming-email webhook metadata + guest-email-received staff alert — Not started
Final-F.8 — Integrated Sandbox/Hosted-Test regression and Final-F documentation closure — Not started
Final-G: Not started
Final-H: Not started
Phase 13: Not started
```

## Goal

Add WhatsApp as a second official guest communication channel and add internal staff operational
alerts while preserving email as the existing transactional/human correspondence channel.

Final-F has two separate flows:

```text
A. Guest <-> Tu Refugio Perfecto WhatsApp communication
B. Internal staff operational alerts through WhatsApp
```

They use Twilio but are not the same conversation. Staff personal numbers are alert recipients only
and are never the guest-facing sender.

## Frozen Subphase Split

```text
Final-F.1 Twilio/WhatsApp + staff-alert strategy, onboarding, templates and security contract
Final-F.2 Twilio Sandbox provider foundation, webhook signature validation and Test onboarding
Final-F.3 WhatsApp conversation/message persistence + staff-recipient / staff-alert persistence foundation
Final-F.4 Guest inbound WhatsApp, safe Reservation matching and protected admin inbox
Final-F.5 Admin outbound replies, 24-hour service-window enforcement and Twilio status callbacks
Final-F.6 Operational staff WhatsApp alerts:
  - reservation confirmed
  - reservation cancelled
  - check-in -48h
  - check-out -6h
  - review submitted
  - guest WhatsApp message received
Final-F.7 Zoho incoming-email webhook metadata + guest-email-received staff alert
Final-F.8 Integrated Sandbox/Hosted-Test regression and Final-F documentation closure
```

## Final-F.1 Strategy Summary

The authoritative F.1 strategy, onboarding, template, webhook, staff-alert, Zoho metadata, retry,
scheduler, privacy, and non-goal contract is:

```text
docs/193-final-f-1-twilio-whatsapp-staff-alert-strategy-onboarding-and-security-contract.md
```

Key frozen decisions:

```text
- The owner is new to Twilio; Final-F onboarding must be step-by-step.
- A Twilio account already exists.
- No dedicated company phone number exists yet.
- The Production company WhatsApp number will be a new number purchased directly through Twilio.
- No existing personal/business WhatsApp number will be migrated.
- The exact country/area code/number type/E.164 number is not frozen; future purchase must verify
  current Twilio inventory, WhatsApp compatibility, OTP capability, regulatory requirements,
  Meta/Twilio onboarding compatibility, and business ownership.
- Final-F Test uses Twilio WhatsApp Sandbox/testing first.
- No number purchase, WhatsApp Sender registration, WABA, Meta Business Portfolio, Production
  template submission, Production credential, DNS, or Production scheduler activation happens in
  Final-F.1.
- Phase 13 remains the company-owned Production Twilio/Meta onboarding boundary.
- Twilio credentials remain server-side only.
- Twilio webhooks must be validated with the official server-side Twilio SDK helper.
- Staff phone identity must be checked before guest matching.
- Canonical protected admin inbox route is `/admin/whatsapp`.
- Seven staff alert classes are mandatory: RESERVATION_CONFIRMED, RESERVATION_CANCELLED,
  CHECK_IN_MINUS_48H, CHECK_OUT_MINUS_6H, REVIEW_SUBMITTED, GUEST_WHATSAPP_RECEIVED, and
  GUEST_EMAIL_RECEIVED.
- Zoho remains the human mailbox; TRP only ingests bounded inbound-email event metadata for staff
  alerts.
```

---

# Final-G — Performance Audit and Optimization

## Goal

Identify why TRP Booking pages feel slow and make evidence-based improvements without assuming that
a framework rewrite is necessary.

Next.js does not make a route fast automatically. Dynamic server rendering, sequential database
queries, large client bundles, image delivery, and request waterfalls can still make an App Router
application slow.

## Investigation order

Compare the initial cross-track baseline with the final feature set.

Review:

```text
- route TTFB
- LCP and INP
- cold vs warm hosted requests
- Prisma query count/duration
- sequential awaits that can be parallelized
- dynamic rendering that is unnecessary
- cache/revalidation opportunities for public property content
- client components / hydration boundaries
- JS/RSC payload size
- Cloudinary + Next Image request path
- image dimensions/quality/formats
- Suspense/loading boundaries
- availability calls blocking otherwise cacheable public content
```

## Likely optimization directions

Only after measurement:

```text
- cache/revalidate stable property content, amenities, rules, photos, published reviews, and
  pricing configuration where correctness permits
- keep date-sensitive availability and transactional state dynamic
- parallelize independent server data access
- use Suspense/streaming so slow availability does not unnecessarily block the public shell
- reduce unnecessary client boundaries and shipped JavaScript
- evaluate direct Cloudinary optimized delivery/custom loader versus the current Next image path
  using measured results
- add indexes/query changes only when query evidence supports them
```

Do not replace Next.js with Angular merely because a current route is slow. The final decision must
come from measured bottlenecks and accepted improvements.

---

# Final-H — Integrated Regression and Track Closure

## Goal

Validate the complete final feature set, reconcile Production carry-forwards, close this
inter-phase track, and only then allow Phase 13 planning to begin.

## Required regression domains

```text
Financial
- original booking payment
- positive/zero/negative date mutation
- cancellation after positive adjustment
- standard and extraordinary refunds
- compensating refund
- additional charges/payment requests
- cumulative stay/additional-charge balance separation

Pricing
- base price
- seasonal rules
- each configured length-of-stay threshold
- overlap/precedence contract
- historical quote stability
- date-change and extension repricing

Calendars
- protected Airbnb import URL management
- connection test/sync
- TRP outbound copy/rotation
- old-token invalidation
- Airbnb loop prevention and composed-listing behavior

Reviews
- post-checkout timing
- email invitation
- one-time token
- replay rejection
- publish/hide
- safe public output

WhatsApp
- Sandbox inbound webhook
- signature validation
- guest conversation creation/linking
- staff alert
- admin reply
- provider status callback
- 24-hour-window behavior
- known staff-number separation
- idempotency/retry
- no credential exposure

Performance
- compare baseline vs final hosted metrics
- no correctness regression caused by caching/streaming/image changes

Existing platform regression
- Auth/admin
- email
- Airbnb
- Tilopay
- cron manual execution
- availability/buffers
- ES/EN/responsive/accessibility
- security headers and dependency audit
```

## Scheduler reconciliation

Final-H must enumerate the actual accepted cron registry after Final-E.

The previous Phase 12 Production carry-forward listed four jobs. If review invitation scheduling
adds a fifth accepted job, Phase 13 documentation/configuration must use the new authoritative
registry rather than the old four-job list.

Test continues with zero Vercel scheduler registrations until Phase 13.

## Phase 13 gate after Final-H

Phase 13 may be planned only when:

```text
Final-A through Final-G are completed and accepted
Final-H integrated regression passes
documentation is reconciled
Production carry-forwards are updated
no applicable blocker remains open
the owner explicitly accepts this Final Improvement Track
```

Phase 13 still owns:

```text
- company-owned Vercel/Supabase/Tilopay/Resend/Zoho/Cloudinary
- company-owned Twilio/Meta WhatsApp sender and real business-number onboarding
- company Google/Auth identity
- Production DNS/email cutover
- environment-aware Vercel scheduler activation
- real scheduler recurrence/SCHEDULED evidence
- comprehensive Production CSP
- Production monitoring/log retention/alerting
- Supabase Production backup/PITR/RPO/RTO/restore rehearsal
- current dependency/security audit
- final Production provider/media migration
- controlled public go-live
```

## Current Track Status

```text
Phase 12 — Completed and accepted
Post-Phase-12 / Pre-Phase-13 Final Improvement Track — Active
Last completed package — Final-E Reservation reviews and post-checkout invitation — Completed and accepted on 2026-09-21 at 3843a6637300201bcb44b7ed235952afda02d880
Current package — Final-F Twilio WhatsApp communication and staff alerts — Active
Current subphase — Final-F.3 WhatsApp conversation/message persistence + staff-recipient / staff-alert persistence foundation — Next / Not started
Final-F.1 implementation base — c6dbe2309f0cd373701fc9444f7f15879692f423
Final-F.1 accepted implementation head — d5db6a2605a03e75db7c16238a43cd5f79dde6d8
Final-F.1 record — docs/193-final-f-1-twilio-whatsapp-staff-alert-strategy-onboarding-and-security-contract.md
Final-F.2 — Completed and accepted on 2026-09-22 at 03861cb2d5daef7cca8bb759d16a0ef050d86b41
Final-F.2 implementation base — ba47dc9f22f4d61a01c13066f84e15ae8ad549f7
Final-F.2 record — docs/194-final-f-2-twilio-sandbox-provider-foundation-webhook-signature-validation-and-test-onboarding.md
Final-D implementation base — 0839b2935fdc2349d23de6ce6b38177504e514c6
Final-D.1 status — Completed and accepted on 2026-08-31 at 3dc4fa7d81d65244a94e7e43726e2f12591e578f
Final-D.1 record — docs/179-final-d-1-additional-charge-payment-request-strategy-and-financial-isolation-contract.md
Final-D.2 implementation base — 3dc4fa7d81d65244a94e7e43726e2f12591e578f
Final-D.2 status — Completed and accepted on 2026-08-31 at 74ac3011eb22277a896d81c92897f1bee6a4d51b
Final-D.2 record — docs/180-final-d-2-additional-charge-persistence-foundation-and-migration.md
Final-D.3 implementation base — 74ac3011eb22277a896d81c92897f1bee6a4d51b
Final-D.3 status — Completed and accepted on 2026-08-31 at 6a0d909fc325f4e8925677041be34c77c023c42b
Final-D.3 record — docs/181-final-d-3-admin-charge-management-and-payment-request-creation.md
Final-D.4 implementation base — 6a0d909fc325f4e8925677041be34c77c023c42b
Final-D.4 status — Completed and accepted on 2026-09-14 at 7d996fd20db42b2560df11f7e00d7a5e9cc0d18c — Private guest payment link and Tilopay collection
Final-D.4 accepted implementation head — 7d996fd20db42b2560df11f7e00d7a5e9cc0d18c
Final-D.4 record — docs/182-final-d-4-private-guest-payment-link-and-tilopay-collection.md
Final-D.5 implementation base — 63f55e22d03270bce0d27be2197373e3ce3e5de8
Final-D.5 status — Completed and accepted on 2026-09-17 at 06b3de23fbae23a77b58b432760abf12afd5a6c7 — Additional-charge refunds and financial-summary integration
Final-D.5 accepted implementation head — 06b3de23fbae23a77b58b432760abf12afd5a6c7
Final-D.5 record — docs/183-final-d-5-additional-charge-refunds-and-financial-summary-integration.md
Final-D.6 implementation base — 1f3f30f63c0198afa219df9feea4f415cbc1ccd2
Final-D.6 status — Completed and accepted on 2026-09-18 at 965045c697a9bfd0a3318db9396b15214a0cd066 — Email delivery and protected operational UX/history
Final-D.6 accepted implementation head — 965045c697a9bfd0a3318db9396b15214a0cd066
Final-D.6 record — docs/184-final-d-6-email-delivery-and-protected-operational-ux-history.md
Final-D.7 implementation base — 0a511f4b87c3d8556593f9d48909a71d7bfab14c
Final-D.7 status — Completed and accepted on 2026-09-18 at fd75663bb28be8a95b15c341eaa51f74e521241b — Integrated regression and documentation closure
Final-D.7 accepted implementation/validation head — fd75663bb28be8a95b15c341eaa51f74e521241b
Final-D.7 record — docs/185-final-d-7-integrated-regression-and-documentation-closure.md
Final-D status — Completed and accepted on 2026-09-18 at fd75663bb28be8a95b15c341eaa51f74e521241b
Final-D accepted feature head — fd75663bb28be8a95b15c341eaa51f74e521241b
Final-D permanent regression — npm run final-d:validate — 66/66 PASS
Final-E.1 implementation base — 2c9802b07ebf60e8953f32226962669eaf01cfc2
Final-E.1 status — Completed and accepted on 2026-09-18
Final-E.1 accepted strategy head — e83ad8443bd533715058e701769b10c2d5505436
Final-E.1 record — docs/186-final-e-1-review-invitation-strategy-eligibility-and-security-contract.md
Final-E.2 implementation base — 2e1b26850c55364db8450fafc2bb35c6d89a2c3b
Final-E.2 status — Completed and accepted on 2026-09-18 at f77938c5606ed636b697dc1af41c111a22ba1593
Final-E.2 accepted implementation head — f77938c5606ed636b697dc1af41c111a22ba1593
Final-E.2 record — docs/187-final-e-2-review-invitation-persistence-foundation-and-migration.md
Final-E.3 — Completed and accepted on 2026-09-18 at c67d2a59a8bec9ba84ca36c37fc0ddfbbf250030
Final-E.3 implementation base — 6cc737c1e846563069b5f71cbd60b34064ffc160
Final-E.3 accepted implementation head — c67d2a59a8bec9ba84ca36c37fc0ddfbbf250030
Final-E.3 record — docs/188-final-e-3-eligibility-and-invitation-token-lifecycle-foundation.md
Final-E.4 — Completed and accepted on 2026-09-18 at e8d4e8e771dbbdb32250d03dea09f2c2c02a1dc1
Final-E.4 implementation base — 19199e6382b4daa7651417c37c1958ad59300373
Final-E.4 accepted implementation head — e8d4e8e771dbbdb32250d03dea09f2c2c02a1dc1
Final-E.4 record — docs/189-final-e-4-review-invitation-scheduling-cron-and-email-delivery.md
Final-E.5 — Completed and accepted on 2026-09-21 at f37f4802219aeb80d10f92b406e0a4847b10f15d
Final-E.6 — Completed and accepted on 2026-09-21 at 82f1c27ba2af41d9ade9f8f57348bf66e18f800f
Final-E.6 implementation base — 2b56d43d60da3558ce692e18f4756f1c862bcb17
Final-E.6 accepted implementation head — 82f1c27ba2af41d9ade9f8f57348bf66e18f800f
Final-E.6 record — docs/191-final-e-6-admin-moderation-and-public-published-review-presentation.md
Final-E.7 — Completed and accepted on 2026-09-21 at 3843a6637300201bcb44b7ed235952afda02d880
Final-E.7 implementation base — 4df7cbc07b6ae9789a62f568d1e3ab69a808d596
Final-E permanent regression — npm run final-e:validate — 88/88 accepted
Final-E.7 record — docs/192-final-e-7-integrated-regression-and-documentation-closure.md
Final-C implementation base — e7ce19c49c5cfd45e1cc08796ee897a2dce0d1ed
Final-C.1 accepted strategy head — 16d8b0411e573aaaa6b510ddb27a9b5d9c666478
Final-C.1 record — docs/173-final-c-1-pricing-strategy-precedence-and-persistence-contract.md
Final-C.2 implementation base — 030dec0d8681de18db746b9aae882cadd54db966
Final-C.2 record — docs/174-final-c-2-pricing-persistence-foundation-and-migration.md
Final-B implementation base — 0927feb18be35b8d96aca0205a75ee19445f15d4
Final-B.1 accepted head — 2627161d5b3960995be0f517682f84272431c291
Final-B.1 record — docs/167-final-b-1-external-calendar-admin-strategy-and-security-contract.md
Final-B.2 accepted head — 530fe2f5f7a75bdbfb36ca6f202b8cb04afca98d
Final-B.2 record — docs/168-final-b-2-outbound-token-encrypted-persistence-and-rotation-foundation.md
Final-B.3 implementation base — 530fe2f5f7a75bdbfb36ca6f202b8cb04afca98d
Final-B.3 accepted head — 84e3f5158e76527a82b2b6655664ec9ab073ea44
Final-B.4 implementation base — 84e3f5158e76527a82b2b6655664ec9ab073ea44
Final-B.4 accepted head — a3724f018449515363159ec9f23af892a21b24be
Final-B.5 implementation base — a3724f018449515363159ec9f23af892a21b24be
Final-B.5 accepted head — bc6b3db1bec219913164ef267fe5279b19f49a27
Final-B.6 implementation base — bc6b3db1bec219913164ef267fe5279b19f49a27
Final-B.6 accepted feature head — 1fe06de8c55ab1563999b2db1d210bfc9a82c613
Final-B accepted feature head — 1fe06de8c55ab1563999b2db1d210bfc9a82c613
Final-B.3 record — docs/169-final-b-3-admin-external-calendar-read-model-and-integration-ui.md
Final-B.4 record — docs/170-final-b-4-airbnb-inbound-configuration-and-operational-actions.md
Final-B.5 record — docs/171-final-b-5-trp-outbound-copy-rotation-and-export-controls.md
Final-B.6 record — docs/172-final-b-6-integrated-acceptance-regression-and-documentation-closure.md
Last completed package — Final-E reservation reviews and post-checkout invitation — completed and accepted on 2026-09-21 at 3843a6637300201bcb44b7ed235952afda02d880
Last accepted subphase — Final-F.2 Twilio Sandbox provider foundation, webhook signature validation and Test onboarding — completed and accepted on 2026-09-22 at 03861cb2d5daef7cca8bb759d16a0ef050d86b41
Current package — Final-F Twilio WhatsApp communication and staff alerts — Active
Current subphase — Final-F.3 WhatsApp conversation/message persistence + staff-recipient / staff-alert persistence foundation — Next / Not started
Final-F.1 record — docs/193-final-f-1-twilio-whatsapp-staff-alert-strategy-onboarding-and-security-contract.md
Final-F.2 — Completed and accepted on 2026-09-22 at 03861cb2d5daef7cca8bb759d16a0ef050d86b41
Final-F.2 implementation base — ba47dc9f22f4d61a01c13066f84e15ae8ad549f7
Final-F.2 record — docs/194-final-f-2-twilio-sandbox-provider-foundation-webhook-signature-validation-and-test-onboarding.md
Final-A — Completed and accepted on 2026-08-12 at 66afbeacd6ee7d669cb4bc251c8416160fae3f49
Final-B — Completed and accepted on 2026-08-25 at 1fe06de8c55ab1563999b2db1d210bfc9a82c613
Final-B.1 — Completed and accepted on 2026-08-14 at 2627161d5b3960995be0f517682f84272431c291
Final-B.2 — Completed and accepted on 2026-08-25 at 530fe2f5f7a75bdbfb36ca6f202b8cb04afca98d
Final-B.3 — Completed and accepted on 2026-08-25 at 84e3f5158e76527a82b2b6655664ec9ab073ea44
Final-B.4 — Completed and accepted on 2026-08-25 at a3724f018449515363159ec9f23af892a21b24be
Final-B.5 — Completed and accepted on 2026-08-25 at bc6b3db1bec219913164ef267fe5279b19f49a27
Final-B.6 — Completed and accepted on 2026-08-25 at 1fe06de8c55ab1563999b2db1d210bfc9a82c613
Final-C — Completed and accepted on 2026-08-28 at dca50f51abe1836d3b678b762693219143b12099
Final-C.1 — Completed and accepted on 2026-08-25 at 16d8b0411e573aaaa6b510ddb27a9b5d9c666478
Final-C.2 — Completed and accepted on 2026-08-26 at 2168262784b0a8213062b0d84ca9fe6069e98fc6
Final-C.3 — Completed and accepted on 2026-08-26 at c8fc39d111d7b33ee4a375264c5a3c25030de185
Final-C.4 — Completed and accepted on 2026-08-27 at 0a57b9772da55a78e8d445dc06ea2b738b412f11
Final-C.5 — Completed and accepted on 2026-08-27 at 4fd36fd25484adda7d24a7df4da3c1738835474c
Final-C.6 — Completed and accepted on 2026-08-28 at dca50f51abe1836d3b678b762693219143b12099; closure-gate commit 1391b69a6bb591cc7d4e8a68b577ea8bda4fb8fe; implementation base 4fd36fd25484adda7d24a7df4da3c1738835474c; record: docs/178-final-c-6-integrated-regression-and-documentation-closure.md
Final-D — Completed and accepted on 2026-09-18 at fd75663bb28be8a95b15c341eaa51f74e521241b
Final-D.1 — Completed and accepted on 2026-08-31 at 3dc4fa7d81d65244a94e7e43726e2f12591e578f
Final-D.2 — Completed and accepted on 2026-08-31 at 74ac3011eb22277a896d81c92897f1bee6a4d51b
Final-D.3 — Completed and accepted on 2026-08-31 at 6a0d909fc325f4e8925677041be34c77c023c42b — Admin charge management and payment-request creation
Final-D.4 — Completed and accepted on 2026-09-14 at 7d996fd20db42b2560df11f7e00d7a5e9cc0d18c — Private guest payment link and Tilopay collection; implementation base 6a0d909fc325f4e8925677041be34c77c023c42b; record docs/182-final-d-4-private-guest-payment-link-and-tilopay-collection.md
Final-D.5 — Completed and accepted on 2026-09-17 at 06b3de23fbae23a77b58b432760abf12afd5a6c7 — Additional-charge refunds and financial-summary integration; implementation base 63f55e22d03270bce0d27be2197373e3ce3e5de8; record docs/183-final-d-5-additional-charge-refunds-and-financial-summary-integration.md
Final-D.6 — Completed and accepted on 2026-09-18 at 965045c697a9bfd0a3318db9396b15214a0cd066 — Email delivery and protected operational UX/history; record docs/184-final-d-6-email-delivery-and-protected-operational-ux-history.md
Final-D.7 — Completed and accepted on 2026-09-18 at fd75663bb28be8a95b15c341eaa51f74e521241b — Integrated regression and documentation closure; record docs/185-final-d-7-integrated-regression-and-documentation-closure.md
Final-D permanent regression — npm run final-d:validate — 66/66 PASS
Final-E — Completed and accepted on 2026-09-21 at 3843a6637300201bcb44b7ed235952afda02d880
Final-E.1 — Completed and accepted on 2026-09-18 at e83ad8443bd533715058e701769b10c2d5505436
Final-E.2 — Completed and accepted on 2026-09-18 at f77938c5606ed636b697dc1af41c111a22ba1593
Final-E.3 — Completed and accepted on 2026-09-18 at c67d2a59a8bec9ba84ca36c37fc0ddfbbf250030
Final-E.4 — Completed and accepted on 2026-09-18 at e8d4e8e771dbbdb32250d03dea09f2c2c02a1dc1
Final-E.5 — Completed and accepted on 2026-09-21 at f37f4802219aeb80d10f92b406e0a4847b10f15d
Final-E.6 — Completed and accepted on 2026-09-21 at 82f1c27ba2af41d9ade9f8f57348bf66e18f800f
Final-E.7 — Completed and accepted on 2026-09-21 at 3843a6637300201bcb44b7ed235952afda02d880
Final-E permanent regression — npm run final-e:validate — 88/88 accepted
Final-F — Active
Final-F.1 — Completed and accepted on 2026-09-21 at d5db6a2605a03e75db7c16238a43cd5f79dde6d8; record: docs/193-final-f-1-twilio-whatsapp-staff-alert-strategy-onboarding-and-security-contract.md
Final-F.2 — Completed and accepted on 2026-09-22 at 03861cb2d5daef7cca8bb759d16a0ef050d86b41; record: docs/194-final-f-2-twilio-sandbox-provider-foundation-webhook-signature-validation-and-test-onboarding.md
Final-G — Not started
Final-H — Not started
Phase 13 — Not started
```

## Working Rule for This Track

Before proposing or implementing each package:

```text
1. Review the latest remote repository head with cache-busting.
2. Review AGENTS.md, README.md, docs/10-phases.md, docs/11-progress-log.md.
3. Review this document: docs/160-post-phase-12-pre-phase-13-final-improvement-track.md.
4. Review the package-specific existing code/schema/docs.
5. Freeze any unresolved package-specific contract before implementation.
6. Preserve all accepted Phase 12 environment/Production boundaries.
7. Validate and document package acceptance before advancing to the next package.
```
