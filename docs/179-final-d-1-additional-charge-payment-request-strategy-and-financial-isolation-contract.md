# 179 — Final-D.1 Additional-Charge / Payment-Request Strategy and Financial-Isolation Contract

## Record

```text
Project: TRP Booking
Track: Post-Phase-12 / Pre-Phase-13 Final Improvement Track
Package: Final-D — Additional charges and guest payment requests
Subphase: Final-D.1 — Additional-charge/payment-request strategy and financial-isolation contract
Status: Completed and accepted on 2026-08-31
Preparation date: 2026-08-28
Acceptance date: 2026-08-31
Implementation base head: 0839b2935fdc2349d23de6ce6b38177504e514c6
Accepted strategy head: 3dc4fa7d81d65244a94e7e43726e2f12591e578f
Previous package: Final-C — Completed and accepted on 2026-08-28
Final-C accepted feature head: dca50f51abe1836d3b678b762693219143b12099
Authoritative track plan: docs/160-post-phase-12-pre-phase-13-final-improvement-track.md
Next subphase: Final-D.2 — Persistence foundation and migration — In progress
Phase 13: Not started
```

## Purpose

Final-D.1 freezes the ancillary-charge and guest-payment-request domain before any schema, payment,
email or UI implementation begins.

Final-D must let an authorized admin record money owed outside the accepted accommodation price,
group one or more unpaid charges into a guest payment request, deliver one private expiring link and
collect that exact request through the existing Tilopay foundation.

The package must preserve the financial boundary accepted in Final-A and the pricing boundary
accepted in Final-C:

```text
Reservation.total / currentStayValue = accommodation contract
AdditionalCharge = separate ancillary obligation
GuestPaymentRequest = collection envelope for one or more ancillary obligations
Payment purpose ADDITIONAL_CHARGE = captured ancillary money
```

Additional charges never silently become stay price and never alter the 100% / 50% / 0%
cancellation-policy base.

D.1 changes documentation only. It does not change Prisma, runtime code, public/admin UI, email
delivery, Tilopay behavior or Production infrastructure.

---

# 1. Repository Findings at D.1 Start

The repository review was performed at:

```text
0839b2935fdc2349d23de6ce6b38177504e514c6
docs(final-c): close pricing package
```

## Payment purpose is currently stay-only

`PaymentPurpose` currently contains:

```text
INITIAL_RESERVATION
LIFECYCLE_ADJUSTMENT
```

`PaymentSubmissionSource` likewise has no ancillary-charge branch.

Final-D therefore requires an explicit ancillary purpose instead of reusing either existing value.

## Payment remains Reservation-owned

`Payment.reservationId` is mandatory. This is correct for Final-D: every ancillary payment remains
owned by one Reservation for audit/navigation, while a dedicated payment-request relation explains
why that money was collected.

## Existing Tilopay checkout already has two business branches

The SDK/session and confirmation paths already distinguish:

```text
INITIAL_RESERVATION
LIFECYCLE_ADJUSTMENT
```

Final-D should extend that branching deliberately rather than route an ancillary payment through
reservation confirmation or date-mutation completion.

## Final-A already reserved financial-summary fields

`ReservationFinancialSummary` already exposes:

```text
additionalChargeGrossAmount
additionalChargeCapturedAmount
additionalChargeRefundedAmount
```

They currently return zero. Final-D will make them authoritative from persisted ancillary movements
without adding ancillary amounts to `currentStayValue`.

## No AdditionalCharge / GuestPaymentRequest persistence exists yet

There is currently no durable model for:

```text
ancillary charge line items
payment-request grouping
private payment-request access token
charge-to-request history
charge-level refund allocation
```

Final-D must add those concepts prospectively without rewriting existing Reservation/Payment/Refund
history.

---

# 2. Frozen Final-D Subphase Split

```text
Final-D.1 Additional-charge/payment-request strategy and financial-isolation contract
Final-D.2 Persistence foundation and migration
Final-D.3 Admin charge management and payment-request creation
Final-D.4 Private guest payment link and Tilopay collection
Final-D.5 Additional-charge refunds and financial-summary integration
Final-D.6 Email delivery and protected operational UX/history
Final-D.7 Integrated regression and documentation closure
```

Rules:

```text
- D.1 freezes behavior only.
- D.2 introduces enums/models/relations/migration without activating checkout.
- D.3 adds protected admin creation/edit/cancel/grouping and secure request-token creation.
- D.4 reuses Tilopay for the private ancillary checkout and marks requests/charges paid only from
  validated provider evidence.
- D.5 adds ancillary refund allocation plus the Final-A financial-summary values.
- D.6 completes guest email delivery, admin presentation and operational-history integration.
- D.7 owns the consolidated Final-D regression/Hosted Test/documentation gate.
```

No later D subphase may weaken this contract without first updating and explicitly re-accepting the
strategy.

---

# 3. Supported Charge Categories

Final-D supports exactly the categories already registered in the master track:

```text
CLEANING
DAMAGE
TRANSPORT
LATE_CHECKOUT
EXTRA_SERVICE
OTHER
```

These are typed domain values. Public/admin labels are localized through `messages/es.ts` and
`messages/en.ts`.

The category is classification, not pricing logic. It does not change Reservation pricing or create
an automatic refund policy.

Each charge also has a required human-readable description. The description is guest-visible when
the charge is included in a payment request, so the admin UI must state that clearly. An optional
internal note may be stored separately and must never be exposed through the guest link or guest
email.

---

# 4. AdditionalCharge Business Contract

The persistence model introduced in D.2 must represent the equivalent of:

```text
id
reservationId
category
description                 guest-visible
internalNote                optional, admin-only
amount
currency
status
createdByAdminId
createdAt
updatedAt
cancelledAt                 when applicable
```

Frozen initial statuses:

```text
PENDING
PAID
PARTIALLY_REFUNDED
REFUNDED
CANCELLED
```

Meaning:

```text
PENDING
- valid unpaid obligation
- may be selected for a payment request

PAID
- the exact request containing the charge has validated APPROVED ancillary Payment evidence

PARTIALLY_REFUNDED
- paid charge with approved ancillary refund allocation below the original charge amount

REFUNDED
- approved ancillary refund allocations equal the original charge amount

CANCELLED
- unpaid obligation intentionally voided by an authorized admin
```

Do not use a separate `PAYMENT_REQUESTED` charge status. Whether a pending charge is currently inside
an active payment request is request/item state and must not be conflated with the charge's financial
state.

## Mutation boundary

A PENDING charge may be edited while it has never been included in a payment request.

After it has participated in a request, its amount/category/guest description become immutable
historical facts. If an amount or description is wrong after that point:

```text
- cancel the still-unpaid request when necessary
- cancel the incorrect charge
- create a new corrected charge
```

Do not rewrite a charge that has already been presented to the guest in a historical request.

A PAID/PARTIALLY_REFUNDED/REFUNDED charge is never edited or cancelled.

---

# 5. Reservation Eligibility Boundary

Final-D does not require a PMS-style checked-in/checked-out state.

A new ancillary charge/payment request may be created only for a real direct Reservation that was
successfully confirmed at some point:

```text
Reservation.confirmedAt != null
current Reservation.status in CONFIRMED | CANCELLED
```

This permits legitimate post-stay obligations to remain associated with the original Reservation
even if its lifecycle later became CANCELLED, while excluding never-confirmed holds/expired rows.

Explicitly reject new charges for:

```text
PENDING_PAYMENT
EXPIRED
BLOCKED
historical compatibility REFUNDED/PARTIALLY_REFUNDED reservation states
```

Reservation cancellation does not automatically void or refund an ancillary charge. Ancillary
obligations have their own explicit admin state because a transport/service/damage obligation may
already have been delivered or incurred.

The admin may explicitly cancel any still-unpaid request/charge when the business obligation no
longer applies.

---

# 6. Money and Currency

Final-D keeps the accepted USD-only direct-booking boundary.

```text
AdditionalCharge.currency = USD
GuestPaymentRequest.currency = USD
Payment.purpose = ADDITIONAL_CHARGE -> USD
```

No currency conversion is introduced.

All server calculations use integer cents at calculation/comparison boundaries. Persisted monetary
columns remain Decimal(10,2) consistent with the existing schema.

Charge amount requirements:

```text
amount > 0
maximum two decimal places
safe conversion to integer cents
```

Do not derive an ancillary charge from `Property.baseNightlyPrice`, seasonal/LOS pricing, taxes,
cleaning-fee quote fields or Reservation.total.

A `CLEANING` ancillary category is conceptually different from the existing
`Reservation.cleaningFee` accommodation quote column. Final-D must not silently backfill or reuse
that column.

---

# 7. GuestPaymentRequest Contract

One payment request is an immutable collection envelope for one or more charge snapshots.

The request must represent the equivalent of:

```text
id
reservationId
status
totalAmount
currency
accessTokenHash
accessTokenEncrypted
expiresAt
createdByAdminId
clientRequestId / idempotency key
paidAt
cancelledAt
createdAt
updatedAt
```

Frozen initial statuses:

```text
PENDING
PAID
EXPIRED
CANCELLED
```

Do not add `SENT` as a payment-request status. Email delivery state belongs to `EmailNotification`;
a request remains a valid payable obligation even if one delivery attempt fails.

## Payment-request item evidence

Grouping must use durable request-item rows rather than a mutable array or a single foreign key on
AdditionalCharge.

Each item persists the equivalent of:

```text
paymentRequestId
additionalChargeId
category snapshot
description snapshot
amount snapshot
currency snapshot
createdAt
```

The snapshot prevents later UI/email history from depending on mutable current charge content.

The request total is frozen as:

```text
sum(request item amount snapshots)
```

It is never recalculated from current charge rows during checkout.

---

# 8. Grouping and Re-Request Rules

Admin may group one or more charges only when all selected charges:

```text
belong to the same Reservation
status = PENDING
currency = USD
are not currently included in another PENDING unexpired request
match the versions read by the admin operation
```

Request creation is one Serializable transaction.

A charge may appear in more than one historical request only when every earlier request containing
that charge is EXPIRED or CANCELLED and the charge itself is still PENDING.

This supports:

```text
request expires -> same still-valid charge can be re-requested
admin cancels request -> same still-valid charge can be re-requested
```

A PAID request is immutable and its charges cannot be re-requested.

A request's line items/total cannot be edited in place. To change the requested set or amount:

```text
cancel the unpaid request
make allowed charge changes / create corrected charge
create a new request with a new token and immutable item snapshots
```

---

# 9. Private Payment-Link Security Contract

Reservation ID, guest email, Payment ID and payment-request ID are identifiers, not public
credentials.

Final-D uses a random opaque request token.

Frozen direction:

```text
- generate cryptographically random token
- URL contains raw token
- persist SHA-256 hash for lookup/validation
- persist an AES-256-GCM encrypted copy only so an authorized resend and future Final-F WhatsApp
  action can reproduce the same still-valid private link
- never store raw plaintext token
- never log raw token
```

The encrypted value must reuse/generalize an accepted server-side encryption envelope rather than
introducing browser-visible encryption keys.

Token validation requires all of:

```text
hash matches one request
request status = PENDING
expiresAt > now
request/payment/charge snapshot integrity passes
```

Recommended and frozen initial expiry:

```text
168 hours / 7 days from payment-request creation
```

Why 7 days:

```text
- unlike a lifecycle date-change hold, no inventory hold requires a 60-minute deadline
- damage/service/transport collection may reasonably require multiple days
- the link remains bounded and revocable
- an expired still-valid charge can be placed in a new request
```

Expired/cancelled/paid links may show a safe localized terminal state but must not reopen checkout.

No cron job is required solely to expire these links. Server reads/actions may converge an overdue
PENDING request to EXPIRED before continuing.

---

# 10. Tilopay Payment Boundary

Final-D extends the existing payment domain explicitly:

```text
PaymentPurpose.ADDITIONAL_CHARGE
PaymentSubmissionSource.ADDITIONAL_CHARGE
```

A GuestPaymentRequest has one logical Payment record for its Tilopay collection. Existing payment
submission-attempt history may record multiple browser/provider attempts against that Payment.

The Payment amount/currency must exactly equal the immutable payment-request total/currency.

## Checkout branch

The central Tilopay SDK/session flow must distinguish three business purposes:

```text
INITIAL_RESERVATION
LIFECYCLE_ADJUSTMENT
ADDITIONAL_CHARGE
```

The new branch validates the private payment-request token and loads guest billing identity from the
owning Reservation, while the amount comes only from the request snapshot.

## Approved provider result

A validated APPROVED ancillary Payment must atomically:

```text
mark GuestPaymentRequest PAID
set request paidAt
mark every included still-PENDING AdditionalCharge PAID
preserve Reservation.status
preserve Reservation.total
preserve Reservation pricingSnapshot
preserve lifecycle requests/holds
```

It must not call the normal Reservation confirmation transition and must not invoke date-mutation
completion.

Repeated provider callbacks are idempotent and return the already-paid request state.

## Rejected / failed result

A rejected/failed payment attempt does not cancel the business obligation.

```text
GuestPaymentRequest stays PENDING while not expired/cancelled
AdditionalCharge rows stay PENDING
Payment / submission-attempt history remains auditable
```

An eligible retry reuses the accepted payment-request/payment identity under existing provider
safety rules.

---

# 11. Financial Isolation and Final-A Summary Integration

The Final-A stay pool remains unchanged:

```text
eligible stay Payments:
- INITIAL_RESERVATION
- completed positive LIFECYCLE_ADJUSTMENT only
```

`ADDITIONAL_CHARGE` Payments are explicitly excluded from:

```text
currentStayValue
capturedStayPayments
committedStayRefunds
approvedStayRefunds
remainingRefundableStayBalance
standard cancellation-policy amount
DATE_CHANGE/STAY_EXTENSION stay pricing
```

Final-D activates the reserved ancillary summary values.

Frozen definitions:

```text
additionalChargeGrossAmount
= sum original amount of every non-CANCELLED ancillary charge

additionalChargeCapturedAmount
= sum captured ADDITIONAL_CHARGE Payment amounts whose status represents captured history
  (APPROVED / PARTIALLY_REFUNDED / REFUNDED)

additionalChargeRefundedAmount
= sum approved/manual Refund amounts allocated to ADDITIONAL_CHARGE Payments
```

Final-D may additionally expose a clearly named outstanding amount if useful to admin UI, but it
must be derived from authoritative charge/request/payment state and must not alter the stay pool.

`Reservation.total` remains the accepted accommodation contract value. Do not increment it when an
ancillary payment succeeds.

---

# 12. Ancillary Refund Contract

Final-D does not apply the stay cancellation matrix to ancillary charges.

There is no automatic category-level refund entitlement in the initial contract. Refunds are an
explicit authorized admin action against a paid ancillary obligation.

Add a dedicated authorization discriminator equivalent to:

```text
RefundAuthorizationType.ADDITIONAL_CHARGE
```

Because one GuestPaymentRequest can contain several charges while one Refund remains tied to one
real provider Payment, D.2/D.5 require charge-level refund-allocation evidence.

Persistence direction:

```text
AdditionalChargeRefundAllocation
- refundId
- additionalChargeId
- allocatedAmount
- createdAt
```

Rules:

```text
- selected charges must belong to the Refund's ADDITIONAL_CHARGE Payment Request
- only PAID/PARTIALLY_REFUNDED charges are refund candidates
- allocation per charge cannot exceed its remaining captured amount
- total allocations must equal Refund.amount
- committed Refund statuses reserve each selected charge's remaining balance
- FAILED Refund releases reserved balance while preserving history
- charge becomes PARTIALLY_REFUNDED / REFUNDED only from approved/manual reconciliation evidence
```

The existing evidence-safe Tilopay refund execution/reconciliation remains provider-payment-local.
Do not manufacture a refund success from admin intent alone.

An ancillary refund never changes `Reservation.total` or Reservation lifecycle status.

---

# 13. Email Delivery Contract

Email is the initial delivery channel for a newly created payment request.

D.6 introduces a dedicated guest transactional notification type rather than disguising the request
as a reservation/lifecycle payment email.

Required guest content:

```text
property / reservation context
localized charge category labels
immutable guest-visible charge descriptions
line amounts
request total
request expiry
private HTTPS payment link
support contact
```

Do not expose:

```text
internal notes
admin IDs
raw audit metadata
provider diagnostics
Payment IDs
raw token outside the intended private URL
card data
```

Notification intent is created transactionally with the accepted payment request; provider delivery
starts only after commit and follows the existing retry/idempotency/Test routing foundation.

Email failure never invalidates the payment request.

Manual resend may reuse the same encrypted still-valid token. Resend is rejected after the request
is PAID, CANCELLED or EXPIRED.

Final-F may later add an authorized WhatsApp delivery action that reuses the exact same still-valid
private link. Final-D does not integrate Twilio/WhatsApp.

---

# 14. Admin UX Boundary

Final-D remains inside the existing protected Reservation detail workflow; it does not add a general
accounts-receivable or PMS billing module.

Preferred placement:

```text
Reservation detail -> Financial tab -> Additional charges
```

Admin must be able to:

```text
create PENDING charge
edit a never-requested PENDING charge
cancel an unpaid eligible charge
select one or more PENDING charges
create one payment request
view request status, amount, expiry and delivery state
copy/resend the private link only through protected server-authorized actions
cancel an unpaid request
view Payment/payment-attempt evidence
initiate eligible ancillary refund(s)
view refund reconciliation/history
```

The UI must distinguish clearly:

```text
Accommodation / stay value
Additional charges
Captured ancillary payments
Ancillary refunds
Outstanding ancillary balance
```

No admin may manually mark a request/charge PAID without validated provider evidence.

No native `alert()`, `confirm()` or `prompt()`.

All new visible ES/EN copy remains centralized in `messages/es.ts` and `messages/en.ts`.

---

# 15. Guest Payment Page Boundary

The private link opens a dedicated guest-safe payment-request page.

The page shows only the bounded context needed to understand and pay the request:

```text
brand
property/reservation reference safe for the guest
charge line items
request total
expiry state
Tilopay checkout when payable
success / retryable failure / expired / cancelled / already-paid state
support contact
```

The private token is the authorization credential for this narrow payment action. It does not grant
access to admin Reservation detail, full payment history, refunds, guest data or lifecycle actions.

The page must not expose one user's charge/request through a different valid token.

---

# 16. Concurrency and Idempotency

All financial/request state transitions are server-authoritative.

Required Serializable operations include at minimum:

```text
payment-request creation from selected charges
request cancellation when it releases charges for re-request
ancillary-payment completion after provider approval
ancillary refund authorization/allocation
```

Payment-request creation must re-read/fence:

```text
Reservation eligibility
selected charge IDs/status/updatedAt
active request membership
currency/amount snapshots
client request idempotency
```

Concurrency must prevent:

```text
same PENDING charge in two simultaneously active payment requests
duplicate payment request from one client request
request total different from item snapshot sum
Payment amount different from request total
double PAID transition
double ancillary refund allocation
committed ancillary refunds above captured ancillary money
```

Provider calls stay outside database transactions.

---

# 17. Persistence Direction for D.2

D.1 freezes responsibilities; D.2 owns exact Prisma names, indexes and migration SQL after reviewing
PostgreSQL/Prisma constraints.

Expected direction is equivalent to:

```text
AdditionalChargeCategory enum
AdditionalChargeStatus enum
GuestPaymentRequestStatus enum

AdditionalCharge
GuestPaymentRequest
GuestPaymentRequestItem
AdditionalChargeRefundAllocation

PaymentPurpose += ADDITIONAL_CHARGE
PaymentSubmissionSource += ADDITIONAL_CHARGE
Payment += optional unique GuestPaymentRequest relation
RefundAuthorizationType += ADDITIONAL_CHARGE
EmailNotificationType += dedicated ancillary payment-request notification type
EmailNotification += optional GuestPaymentRequest relation when required for safe rendering/history
User += required created-by relations
Reservation += ancillary charge / payment-request relations
```

D.2 must preserve existing rows without fabricated ancillary history. New relations are nullable on
existing Payment/Refund/EmailNotification rows where compatibility requires it.

Migration must not alter existing Reservation totals, Payment purposes or Refund authorization types.

---

# 18. Audit and Security Contract

Protected admin mutations write bounded `AdminAuditLog` evidence.

Expected actions include equivalents of:

```text
ADDITIONAL_CHARGE_CREATED
ADDITIONAL_CHARGE_UPDATED
ADDITIONAL_CHARGE_CANCELLED
GUEST_PAYMENT_REQUEST_CREATED
GUEST_PAYMENT_REQUEST_CANCELLED
ADDITIONAL_CHARGE_REFUND_AUTHORIZED
```

Audit metadata may include safe identifiers, categories, cents amounts, request status and actor.

Never log/persist in audit metadata:

```text
raw payment-request token
encrypted token ciphertext when not needed
Tilopay credentials
card data
raw provider payload
full request body
```

Guest/public APIs must return bounded localized errors and never raw Prisma/Tilopay/crypto failures.

---

# 19. Explicit Non-Goals

Final-D does not introduce:

```text
PMS folios / general ledger / accounts receivable
arbitrary invoice engine
recurring/subscription charges
cash or bank-transfer reconciliation
split-tender payment request
currency conversion
percentage-based ancillary pricing
automatic damage assessment
automatic cancellation fees
automatic ancillary refunds from stay cancellation policy
changes to Final-C seasonal/LOS pricing
changes to Reservation.total for ancillary captures
Production Tilopay credentials or provider accounts
Twilio/WhatsApp delivery (Final-F)
Phase 13 scheduler/go-live work
```

---

# 20. Final-D Acceptance Matrix

Final-D.7 owns one consolidated gate. Minimum coverage:

## Charge domain

```text
[ ] supported categories are typed/localized
[ ] never-confirmed Reservation cannot receive a charge
[ ] previously confirmed CONFIRMED/CANCELLED Reservation can receive an eligible charge
[ ] positive USD amount validation
[ ] guest description/internal-note security boundary
[ ] never-requested PENDING charge edit works
[ ] historically requested/paid charge cannot be rewritten
[ ] unpaid eligible charge can be explicitly cancelled
```

## Grouping / request

```text
[ ] one charge -> one request
[ ] multiple charges -> exact summed request
[ ] cross-Reservation grouping rejected
[ ] same charge cannot enter two active requests concurrently
[ ] request item snapshot remains immutable
[ ] expired/cancelled request permits valid PENDING charge re-request
[ ] request replay/idempotency does not duplicate rows
[ ] request token is not persisted/logged in plaintext
[ ] invalid/expired/cancelled/paid token cannot start a new checkout
```

## Payment

```text
[ ] ADDITIONAL_CHARGE purpose is distinct from stay/lifecycle Payments
[ ] SDK amount equals immutable request amount
[ ] approved evidence atomically marks request and charges paid
[ ] approved ancillary Payment does not call reservation confirmation/date-mutation completion
[ ] rejected/failed attempt leaves obligation retryable while request is valid
[ ] redirect/provider replay is idempotent
[ ] Reservation.total/status/pricingSnapshot remain unchanged
```

## Financial isolation

```text
[ ] currentStayValue unchanged by ancillary charge/payment
[ ] standard cancellation base unchanged by ancillary charge/payment
[ ] remainingRefundableStayBalance excludes ancillary Payments
[ ] additionalChargeGrossAmount is correct
[ ] additionalChargeCapturedAmount is correct
[ ] additionalChargeRefundedAmount is correct
```

## Refunds

```text
[ ] refund is bounded by selected paid ancillary charge balance
[ ] refund allocations sum exactly to provider Refund amount
[ ] concurrent refund authorization cannot over-allocate one charge/payment
[ ] failed refund releases reserved ancillary balance
[ ] approved partial/full reconciliation updates charge state correctly
[ ] ancillary refund does not mutate Reservation lifecycle or stay value
```

## Email / UX / security

```text
[ ] ES/EN payment-request email shows safe immutable line items and expiry
[ ] email failure does not invalidate payable request
[ ] resend reuses only a still-valid protected link
[ ] admin Financial tab separates stay vs ancillary money
[ ] private guest page exposes no admin/internal/provider data
[ ] no native alert/confirm/prompt
[ ] no raw token/provider/card/secret exposure
[ ] existing Final-A and Final-C regression gates remain compatible
```

---

# 21. Current Decision

```text
Final-D — In progress
Final-D.1 — Completed and accepted on 2026-08-31
Final-D.1 accepted strategy head — 3dc4fa7d81d65244a94e7e43726e2f12591e578f
Implementation base — 0839b2935fdc2349d23de6ce6b38177504e514c6
Final-D.2 — In progress; persistence foundation and migration prepared for Local/Test validation
Final-E — Not started
Phase 13 — Not started
```

D.1 is completed and accepted. Final-D.2 now owns the persistence foundation and migration; runtime charge/payment behavior remains deferred to D.3 and later subphases.
