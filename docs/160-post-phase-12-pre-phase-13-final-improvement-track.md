# 160 — Post-Phase-12 / Pre-Phase-13 Final Improvement Track

## Track Record

```text
Project: TRP Booking
Track: Post-Phase-12 / Pre-Phase-13 Final Improvement Track
Status: Active — Final-A and Final-B completed and accepted; Final-C is in progress at Final-C.2
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
Following package: Final-C — Pricing rules: seasonal and length-of-stay — In progress at Final-C.2
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
Package: Final-C — In progress
Implementation base head: e7ce19c49c5cfd45e1cc08796ee897a2dce0d1ed
Current subphase: Final-C.2 — Pricing persistence foundation and migration — In progress
Final-C.1 status: Completed and accepted on 2026-08-25
Final-C.1 accepted strategy head: 16d8b0411e573aaaa6b510ddb27a9b5d9c666478
Final-C.1 record: docs/173-final-c-1-pricing-strategy-precedence-and-persistence-contract.md
Final-C.2 implementation base head: 030dec0d8681de18db746b9aae882cadd54db966
Final-C.2 status: In progress — Pricing persistence foundation and migration prepared for Local/Test validation
Final-C.2 record: docs/174-final-c-2-pricing-persistence-foundation-and-migration.md
Final-C.3 status: Not started — Central pricing engine and public quote/pending-reservation integration
Final-C.4 status: Not started — Admin pricing-rule management
Final-C.5 status: Not started — DATE_CHANGE/STAY_EXTENSION pricing integration
Final-C.6 status: Not started — Integrated regression and documentation closure
Next package after Final-C closure: Final-D — Additional charges and guest payment requests — Not started
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

Final-C.1 is completed and accepted. Final-C.2 now owns persistence/schema foundation only; runtime pricing remains unchanged until C.3/C.5.

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

## Goal

Allow admins to create auditable ancillary charges associated with a Reservation and collect them
through secure guest payment links without treating them as accommodation price.

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

## Goal

Allow one authentic guest review per eligible direct Reservation through a secure one-time link sent
after checkout.

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

Exact treatment of unusual lifecycle cases must be validated during Final-E implementation.

## Review access

The Reservation ID identifies ownership internally but is not itself a public credential.

Use:

```text
random opaque token
token hash persisted in database
private review URL contains raw token
one review per Reservation enforced by database uniqueness
```

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

## Admin moderation

Allow:

```text
publish
hide/unpublish
read original review
```

Do not allow admins to rewrite the guest's rating or comment as if it were the guest's own text.

## Scheduling boundary

Final-E may add a review-invitation scheduling job to the existing cron registry.

During this improvement track:

```text
Test Vercel scheduler registrations remain zero.
The review job can be executed manually in Test through the accepted cron/admin execution model.
```

Final-H must update the Phase 13 scheduler carry-forward so Production activation includes every
accepted job that exists after this track, rather than relying on the previous four-job count.

---

# Final-F — Twilio WhatsApp Communication and Staff Alerts

## Goal

Add WhatsApp as a second official guest communication channel while preserving email as the existing
transactional/human correspondence channel.

Final-F has two separate flows:

```text
A. Internal staff alerts
B. Guest <-> business-number conversations
```

They use Twilio but are not the same conversation.

## Environment strategy

### Final-F Test implementation

Use a developer-owned Twilio account and the Twilio Sandbox for WhatsApp where possible.

The Sandbox is for testing/discovery only and uses Twilio's shared Sandbox sender. It is not the
future Tu Refugio Perfecto company number.

### Phase 13 Production onboarding

Phase 13 must create/use the company-owned Twilio/Meta boundary and register the real business
WhatsApp sender.

Do not migrate or register the real company number during Final-F Test work.

## Current WhatsApp platform assumptions

As of track registration, the integration design assumes the current Twilio/WhatsApp rules:

```text
- An inbound guest message opens/resets a 24-hour customer-service window.
- Inside that window the business can reply with free-form messages.
- Outside that window a business-initiated message requires an approved WhatsApp Content Template.
- Business-initiated messaging requires explicit opt-in.
- Twilio sends inbound messages to an application webhook.
- Twilio status callbacks can report queued/sent/delivered/read/failed-type delivery state.
- Twilio signs webhooks; TRP must validate the Twilio signature server-side with the official SDK.
- The Twilio Sandbox supports testing inbound/outbound behavior but is not a Production sender.
```

These rules are external and can change. Final-F must re-check current official Twilio/Meta
documentation immediately before implementation/acceptance.

## F1 — Internal staff notification flow

Staff recipients are the personal WhatsApp numbers of the authorized Tu Refugio Perfecto
caretakers/administrators who opted in to operational alerts.

Recommended protected configuration:

```text
staff name
normalized WhatsApp phone
active/inactive
new-reservation alerts enabled
new-guest-message alerts enabled
```

Twilio account credentials and sender credentials remain server-side environment secrets; they are
not stored in the staff-recipient table.

### Automatic alert: new confirmed reservation

Trigger only after the normal payment-driven reservation confirmation commits.

```text
Payment APPROVED / Reservation CONFIRMED
-> create/reuse one internal WhatsApp alert intent per active staff recipient
-> send through Twilio using the permitted template/session contract
-> persist provider MessageSid + safe status
-> status callback updates delivery state
```

The alert should contain bounded operational context, for example:

```text
New reservation
Property
Guest display name
Check-in / check-out
Protected "Open reservation" admin link
```

Do not include card data, raw payment/provider data, private iCal values, or unnecessary sensitive
guest information.

### Automatic alert: guest sent a WhatsApp message

```text
Guest -> business WhatsApp sender
-> Twilio inbound webhook
-> validate X-Twilio-Signature
-> persist inbound message exactly once by provider MessageSid
-> resolve/create guest conversation
-> optionally link an unambiguous matching Reservation by normalized guest phone
-> mark conversation unread
-> create/reuse one staff alert per configured recipient
-> alert contains a protected "Open conversation" admin link
```

Staff alerts are notification-only.

**A caretaker must not reply to the guest by replying directly to the alert on the caretaker's
personal WhatsApp.**

If a known staff number sends a message back to the business sender, Final-F must identify it as a
staff-origin number before guest matching so it cannot create/contaminate a guest conversation. The
UI/copy should direct staff to TRP Admin for guest replies.

## F2 — Guest-to-business inbound flow

A guest can message the business WhatsApp number before, during, or after a Reservation.

```text
Guest WhatsApp
-> business WhatsApp sender registered with Twilio
-> Twilio POST webhook to TRP Booking
-> server verifies Twilio signature
-> normalize From / To / MessageSid / body / supported media metadata
-> idempotently persist inbound WhatsAppMessage
-> find/create WhatsAppConversation
-> auto-link Reservation only when phone matching is safe and unambiguous
-> otherwise leave conversation unlinked for admin review
-> display unread conversation in protected admin inbox
-> notify staff
```

A guest does not need a Reservation to contact the business. Unknown numbers therefore create an
unlinked guest conversation rather than being rejected.

## F3 — Admin inbox and reply flow

Recommended protected route:

```text
/admin/messages
or
/admin/whatsapp
```

Initial inbox capabilities:

```text
conversation list
unread indicator
guest phone / safe display identity
optional linked Reservation
last message/time
conversation history
inbound/outbound distinction
delivery/read/failure status
protected navigation to linked Reservation
reply composer
```

Only existing authorized ADMIN users may access/reply in the initial Final-F scope. A separate
messaging-agent RBAC role is not introduced unless explicitly approved later.

### Reply inside the 24-hour window

```text
Admin types reply in TRP Admin
-> server verifies authorization + conversation state
-> persist outbound intent/message
-> Twilio Programmable Messaging sends from the business WhatsApp sender
-> guest receives the message from the company number
-> Twilio status callbacks update sent/delivered/read/failed state
```

The caretaker's personal number is never the guest-facing sender.

### Reply outside the 24-hour window

Free-form reply is not sent.

The admin UI must explain that the customer-service window is closed and require an approved
WhatsApp Content Template appropriate to the actual use case.

```text
Admin selects allowed template
-> TRP sends template from company WhatsApp sender
-> if/when guest replies, a new 24-hour customer-service window opens
-> admin can then continue with normal free-form replies
```

Do not bypass this by stuffing free-form text into a template field.

## F4 — Staff alert template behavior

New-reservation and new-message alerts are business-initiated messages to staff personal numbers.

Therefore:

```text
- staff opt-in must be explicit and recorded
- Sandbox staff must join the Sandbox during Test
- Production alerts must use the then-current approved template/session rules
- alerts are idempotent so reservation callback replay or Twilio retry does not spam staff
```

## F5 — Provider security and resilience

Required:

```text
- validate X-Twilio-Signature with the official server-side Twilio SDK
- HTTPS webhooks in hosted Test/Production
- no raw Auth Token or credentials in logs/database/client bundles
- provider MessageSid uniqueness/idempotency
- status callbacks accepted out of order safely
- safe normalized failure codes/messages
- webhook retries must not duplicate messages/conversations/alerts
- bounded media handling if media is included
- no trust in client-provided phone/reservation relations
```

## F6 — Real company number decision

The owner intends the company number to become the Twilio WhatsApp sender in Production.

Current Twilio documentation states that migrating a number currently used by WhatsApp or the
WhatsApp Business App to Twilio/WhatsApp Business Platform requires releasing it from that app, and
the same number cannot continue to be used in the mobile/desktop WhatsApp Business App after that
migration.

Therefore the operational model after that Production migration is expected to be:

```text
Guests message the company WhatsApp number
-> Twilio receives the messages
-> TRP Admin inbox is where staff read/reply
-> Twilio sends replies from the same company number
```

Final-F implements and validates this architecture with Sandbox/Test. The real-number migration,
Meta/WABA setup, approved Production templates, and company-owned Twilio credentials remain Phase 13
work.

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
Current package — Final-C pricing rules: seasonal and length-of-stay — In progress
Current subphase — Final-C.2 Pricing persistence foundation and migration — In progress
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
Last completed package — Final-B admin external-calendar integrations
Last completed subphase — Final-C.1 pricing strategy, precedence and persistence contract — completed and accepted on 2026-08-25 at 16d8b0411e573aaaa6b510ddb27a9b5d9c666478
Final-A — Completed and accepted on 2026-08-12 at 66afbeacd6ee7d669cb4bc251c8416160fae3f49
Final-B — Completed and accepted on 2026-08-25 at 1fe06de8c55ab1563999b2db1d210bfc9a82c613
Final-B.1 — Completed and accepted on 2026-08-14 at 2627161d5b3960995be0f517682f84272431c291
Final-B.2 — Completed and accepted on 2026-08-25 at 530fe2f5f7a75bdbfb36ca6f202b8cb04afca98d
Final-B.3 — Completed and accepted on 2026-08-25 at 84e3f5158e76527a82b2b6655664ec9ab073ea44
Final-B.4 — Completed and accepted on 2026-08-25 at a3724f018449515363159ec9f23af892a21b24be
Final-B.5 — Completed and accepted on 2026-08-25 at bc6b3db1bec219913164ef267fe5279b19f49a27
Final-B.6 — Completed and accepted on 2026-08-25 at 1fe06de8c55ab1563999b2db1d210bfc9a82c613
Final-C — In progress; Final-C.1 completed and accepted
Final-C.1 — Completed and accepted on 2026-08-25 at 16d8b0411e573aaaa6b510ddb27a9b5d9c666478
Final-C.2 — In progress; persistence foundation and migration prepared for Local/Test validation
Final-C.3 — Not started
Final-C.4 — Not started
Final-C.5 — Not started
Final-C.6 — Not started
Final-D — Not started
Final-E — Not started
Final-F — Not started
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
