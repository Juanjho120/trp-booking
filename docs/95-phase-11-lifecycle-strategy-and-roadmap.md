# 95 — Phase 11 Lifecycle Strategy and Roadmap

## Phase Record

```text
Phase: Phase 11 — Cancellation, Refund, and Change Request Rules
Subphase: 11.1 Lifecycle strategy, policy, and provider boundary
Status: Completed
Strategy date: 2026-07-23
Base commit: 00e23979aec894b1ff953a89b9297744e71a4a21
Previous closure: docs/94-phase-10-validation-and-documentation-closure.md
Next subphase after acceptance: 11.2 Lifecycle request persistence and audit foundation
```

## Purpose

Define the complete Phase 11 business-transition sequence before adding cancellation endpoints, refund execution, reservation date mutations, stay-extension payments, lifecycle request forms, or new notification orchestration.

Phase 11 must add safe, auditable, idempotent lifecycle operations without weakening the accepted booking rules:

```text
- Only validated payment confirms a reservation.
- Guests do not edit confirmed reservation dates directly from the public website.
- Date changes require prior authorization or cancellation and a new reservation according to the applicable policy.
- A stay extension requires availability validation and additional payment when applicable.
- TRP Booking remains a direct-booking engine; TAMIAS remains the PMS.
```

Subphase 11.1 is documentation-only. It adds no application code, Prisma schema change, migration, seed change, dependency, environment variable, provider credential, public/admin visible copy, provider request, reservation/payment mutation, calendar mutation, or email delivery.

## Repository Findings

The current Prisma schema already anticipates part of the lifecycle domain:

```text
ReservationStatus
- PENDING_PAYMENT
- CONFIRMED
- CANCELLED
- REFUNDED
- PARTIALLY_REFUNDED
- EXPIRED
- BLOCKED

PaymentStatus
- PENDING
- APPROVED
- REJECTED
- FAILED
- REFUNDED
- PARTIALLY_REFUNDED

RefundStatus
- PENDING
- APPROVED
- FAILED
- MANUAL
```

Existing models and fields include:

```text
Reservation.cancelledAt
Payment.refunds
Refund.paymentId
Refund.providerRefundId
Refund.amount
Refund.currency
Refund.reason
Refund.status
Refund.rawPayload
AdminAuditLog
```

The email enum already reserves these future notification types:

```text
RESERVATION_CANCELLED
RESERVATION_DATES_UPDATED
STAY_EXTENSION_CONFIRMED
REFUND_PROCESSED
```

However, the repository does not yet provide:

```text
- A typed cancellation decision/request record
- A typed date-change or stay-extension request record
- Old/new date and price snapshots
- Request status, reviewer, decision, and completion timestamps
- A relation between adjustment payments and the lifecycle request that caused them
- A temporary availability hold for a requested date change awaiting additional payment
- Approved cancellation/refund policy windows or percentages
- A verified automated Tilopay refund/reversal adapter
- Admin cancellation, refund, date-change, or extension mutation actions
- Lifecycle notification templates or orchestration
```

The current admin reservation and payment details are intentionally read-only. Phase 11 must add explicit guarded actions rather than converting delivery/payment metadata into generic editable forms.

## Core State-Ownership Decision

Reservation state and financial state must remain separate.

### Reservation owns the stay lifecycle

```text
PENDING_PAYMENT
-> CONFIRMED after validated payment
-> CANCELLED after an authorized cancellation

CONFIRMED
-> remains CONFIRMED after an authorized date change or stay extension
```

For new Phase 11 flows, `Reservation.status` must not be changed to `PARTIALLY_REFUNDED` merely because money was returned while the stay remains active. Current availability rules treat `CONFIRMED` as the active direct-reservation blocker; replacing it with a financial status could release occupied dates incorrectly.

Phase 11.2 must therefore review the existing `ReservationStatus.REFUNDED` and `ReservationStatus.PARTIALLY_REFUNDED` values and choose one safe compatibility action:

```text
- Retain them only for historical compatibility and do not use them in new flows, or
- Remove/deprecate them through a data-safe migration if no persisted rows depend on them.
```

The selected action must not reinterpret existing data silently.

### Payment and Refund own the financial lifecycle

```text
Payment.APPROVED
-> Payment.PARTIALLY_REFUNDED after confirmed cumulative partial reversal
-> Payment.REFUNDED after the full captured amount is confirmed reversed
```

`Refund` records each individual reversal attempt/result. A cancellation can exist without a refund, and a refund can exist as a price adjustment while the reservation remains confirmed.

## Cancellation Contract

Initial Phase 11 cancellation authority is administrative.

```text
- A guest cannot directly mutate or cancel a confirmed reservation through an unauthenticated public endpoint.
- The guest contacts the approved reservations-support channel.
- An authorized admin records the request, reason, source channel, policy decision, and financial decision.
- Only an active direct Reservation with the accepted source status may transition.
- The transition uses server-side validation, optimistic concurrency, idempotency, and a serializable transaction.
- Reservation.status becomes CANCELLED and cancelledAt is set once.
- Operational and financial history is never hard-deleted.
```

Cancellation and refund are separate decisions:

```text
Cancellation accepted
-> release the stay operationally
-> preserve the cancellation even if a later refund attempt fails

Refund amount greater than zero
-> create a separate auditable refund workflow
-> process/reconcile it independently
```

The cancellation transaction must also make pending arrival communication ineligible. The accepted Phase 10 final delivery guard already skips a non-confirmed reservation; Phase 11 may proactively mark eligible pending/failed arrival notifications as `SKIPPED` for clearer history, without rewriting `SENT` rows.

Pending-payment reservations already expire automatically. An admin cancellation action for an active hold is not part of the initial confirmed-reservation cancellation MVP unless a concrete operational need is approved.

## Cancellation Policy Boundary

No cancellation percentages, cutoff hours, or automatic refund amounts are currently approved. Phase 11 must not invent or hardcode them.

Before 11.3 implementation acceptance, the business policy must define:

```text
- Free-cancellation cutoff, if any
- Partial-refund windows, if any
- Non-refundable window, if any
- Same-day, after-check-in, and no-show behavior
- Treatment of cleaning fee, taxes, discounts, and payment-processing costs
- Admin exception authority and required reason
- Whether cancellation is allowed after the stay has started
- Guest-facing policy wording in Spanish and English
```

Until that matrix is approved, the system may support only an explicit admin-entered decision and amount; it must not calculate a policy outcome automatically.

## Tilopay Refund and Reversal Boundary

Official public Tilopay material reviewed on 2026-07-23 describes merchant-portal reversals with these operational characteristics:

```text
- The merchant initiates the reversal through the Tilopay platform.
- A reversal may be total or partial.
- Cumulative reversals cannot exceed the original transaction amount.
- The public terms describe a 60-day provider window from transaction registration.
- Cardholder credit timing depends on the issuing bank.
```

The 60-day value is a provider operational boundary, not the guest cancellation policy. The merchant agreement and account-specific configuration remain authoritative and must be verified before production processing.

The reviewed public SDK page does not expose a verified refund endpoint contract that TRP Booking can safely implement now. Phase 11 must therefore use this initial provider strategy:

```text
Initial MVP
-> Admin authorizes the refund in TRP Booking
-> TRP Booking creates a PENDING refund record
-> Authorized operator executes the reversal in the Tilopay merchant portal
-> Admin records/reconciles the provider reference and confirmed result

Future automated adapter
-> Allowed only after official endpoint, authentication, idempotency, sandbox behavior, and response contract are obtained and validated
```

No endpoint, payload field, or provider status may be guessed from undocumented examples.

## Refund Invariants

Every refund workflow must enforce:

```text
- Payment must have a validated APPROVED/PARTIALLY_REFUNDED financial state.
- Refund amount must be positive and use the payment currency.
- Approved plus in-flight refund amounts must not exceed the captured amount.
- Repeated submissions use a client request ID and permanent database uniqueness.
- Provider/manual action occurs outside the transaction that creates the refund intent.
- Provider failure becomes a safe auditable failure and never restores a cancelled reservation.
- Payment status changes only after the reversal result is confirmed.
- Raw provider payloads, credentials, headers, and card data are not shown or newly persisted.
- Historical refund attempts are not overwritten or deleted.
```

`RefundStatus.MANUAL` currently mixes processing method with lifecycle status. Phase 11.2 must normalize this contract, preferably by separating:

```text
Refund status
- PENDING
- PROCESSING or AWAITING_CONFIRMATION when required
- APPROVED
- FAILED

Refund processing mode/origin
- TILOPAY_PORTAL
- TILOPAY_API (future only)
- OFFLINE_EXCEPTION (only if explicitly approved)
```

Exact enum names belong to 11.2, but status and processing method must not remain semantically conflated.

## Authorized Date-Change Contract

A confirmed reservation's dates cannot be edited directly by the guest.

Initial Phase 11 flow:

```text
Guest requests a change through an approved support channel
-> Admin records the request and requested dates
-> Server validates dates, property, current reservation state, availability, and pricing
-> Admin approves or rejects
-> Required financial adjustment is resolved
-> Final transaction revalidates availability and applies the dates
```

Required rules:

```text
- Current dates remain unchanged until the change is completed.
- Old dates, new dates, old pricing, new pricing, and the calculated difference are snapshotted.
- The current reservation remains the source of truth and preserves its ID/history.
- Availability checks must exclude only the current reservation's own effective range while still respecting every other blocker.
- Composed-listing dependencies and preparation buffers apply to the requested range.
- Final completion revalidates availability in a serializable transaction.
- A stale tab or repeated request cannot apply the same change twice.
- Existing arrival-instruction date/version guards supersede stale pending delivery after a completed date change.
```

## Price-Difference and Additional-Payment Contract

A date change or stay extension must be priced server-side.

```text
new confirmed total - current confirmed total = financial difference
```

Behavior:

```text
Positive difference
-> Additional payment is required
-> Requested dates receive a temporary change-request hold
-> Reservation dates are not changed until the adjustment payment is APPROVED
-> Expired/failed adjustment payment leaves the original reservation unchanged

Zero difference
-> Admin may complete the authorized change after final availability validation

Negative difference
-> Admin completes the authorized operational change after final availability validation
-> Any approved return of funds uses the separate partial-refund workflow
-> Refund failure does not silently restore the old dates
```

Phase 11.2 must add a typed payment purpose and/or lifecycle-request relation so an adjustment payment is distinguishable from the initial reservation payment.

The exact repricing rule remains a business decision that must be approved before 11.5 implementation:

```text
- Reprice the complete requested stay using current pricing rules, or
- Preserve an approved original-rate basis and price only changed/added nights, or
- Use another explicitly documented server-side policy.
```

The implementation must not accept an arbitrary client-supplied total.

## Temporary Change-Request Hold

A positive-difference change cannot wait for payment without protecting the requested dates.

Phase 11.2 must define a temporary hold that:

```text
- Belongs to one lifecycle request
- Stores requested check-in/check-out and expiration
- Blocks requested stay dates and preparation buffers
- Applies composed-listing dependency rules
- Does not replace the original confirmed reservation's current blockers
- Expires automatically when payment is not completed
- Becomes inactive when the change completes, is rejected, is withdrawn, or expires
```

The hold should be evaluated through the availability domain rather than creating an unrelated manual block. Its expiration duration may reuse the existing 15-minute payment-hold value only after that choice is explicitly accepted for change requests.

## Stay-Extension Contract

A stay extension is a specialized authorized date change.

```text
- The requested check-in remains unchanged.
- The requested check-out is later than the current check-out.
- Availability is validated before approval.
- Preparation buffers and composed dependencies are recalculated.
- A positive price difference requires an approved additional payment before completion.
- The original reservation remains unchanged when availability or payment fails.
- Extension history remains linked to the reservation and requesting/admin actors.
```

The same flow applies when the guest is already at the property, provided the current stay has not ended and the requested dates remain available. Phase 11 must not add housekeeping, task assignment, room operations, or other PMS behavior.

## Request Intake Boundary

TRP Booking currently has no guest account or verified reservation-management token.

Therefore the initial MVP uses admin-recorded requests received through approved support channels such as email, phone, or WhatsApp. This satisfies the approved rule that the guest requests authorization without creating insecure self-service mutation.

Explicitly deferred unless separately approved:

```text
- Public reservation-management portal
- Guest login/account system
- Reservation lookup using only reference plus email
- Unauthenticated cancellation/change endpoints
- Signed management-link/token lifecycle
- One-time email verification workflow
```

A future public request form may submit a request without applying a mutation, but it requires a separately approved identity-verification and abuse-prevention design.

## Lifecycle Request and Audit Requirements

Phase 11.2 must persist enough typed information to reconstruct every decision:

```text
- Reservation and request type
- Request channel and requester identity/contact snapshot
- Guest-provided reason or request note
- Original status/date/guest/price snapshot where relevant
- Requested date/guest/price snapshot where relevant
- Calculated financial difference
- Policy decision and bounded internal reason code
- Admin reviewer and timestamps
- Completion/failure/withdrawal/expiration timestamps
- Client request ID and permanent idempotency key
- Related initial/adjustment Payment and Refund records
- Optimistic reservation version or expectedUpdatedAt
```

Do not use unrestricted JSON as the only source of truth for dates, amounts, status, and relationships. `AdminAuditLog.metadata` may preserve bounded before/after context, but typed domain columns must own transition-critical data.

## Concurrency and Transaction Rules

Every lifecycle mutation must:

```text
1. Authenticate and authorize the admin.
2. Validate a bounded typed request with Zod.
3. Normalize dates, amounts, currency, recipient, and reason values server-side.
4. Re-read the current Reservation/Payment/request state.
5. Verify expectedUpdatedAt/version and idempotency key.
6. Revalidate availability and refundable amounts when applicable.
7. Commit typed state changes and AdminAuditLog in a serializable transaction.
8. Run Tilopay/Resend calls only after commit.
9. Record safe normalized external-operation results.
10. Preserve the accepted operational transition even when a later notification fails.
```

No native `alert()`, `confirm()`, or `prompt()` may be used. Admin decisions require styled accessible project components and centralized bilingual copy.

## Notification Contract

Lifecycle emails are enabled only after their underlying transition is accepted.

Planned Phase 11.6 notifications:

```text
RESERVATION_CANCELLED
- Trigger: cancellation transaction committed
- Must state cancellation outcome without promising an unconfirmed refund

REFUND_PROCESSED
- Trigger: refund/reversal confirmed
- Must include confirmed amount/currency and safe processing guidance

RESERVATION_DATES_UPDATED
- Trigger: authorized date change completed
- Must show old and new stay dates

STAY_EXTENSION_CONFIRMED
- Trigger: authorized extension and any required additional payment completed
- Must show new check-out and confirmed total/difference as approved
```

Rules:

```text
- Notification intent is created transactionally with the successful lifecycle event.
- Resend runs only after commit through the accepted Phase 10 worker/provider foundation.
- Permanent database deduplication remains required.
- Notification failure never reverses cancellation, refund confirmation, date change, extension, or payment state.
- Subjects and visible copy remain centralized in messages/es.ts and messages/en.ts.
- Guest output uses Reservation.preferredLocale.
- No raw provider payload, card data, internal notes, or PMS-only content is included.
```

## Explicit Phase 11 Roadmap

### 11.1 — Lifecycle strategy, policy, and provider boundary

Status: **Completed**

```text
- Inspect current schema, reservation/payment states, refund model, availability rules, admin detail boundaries, and email foundation.
- Preserve the approved guest date-change and stay-extension rules.
- Separate stay lifecycle state from payment/refund state.
- Define the initial admin-mediated cancellation/refund/change boundary.
- Define the manual Tilopay portal strategy until an official refund API contract is verified.
- Define concurrency, idempotency, audit, availability, pricing, and notification boundaries.
- Record unresolved policy decisions without inventing percentages or deadlines.
```

### 11.2 — Lifecycle request persistence and audit foundation

Status: **Not started**

```text
- Add typed cancellation and date-change/stay-extension request persistence.
- Add request statuses, snapshots, actors, timestamps, idempotency, and optimistic concurrency.
- Add typed payment purpose/request linkage for adjustment payments.
- Add temporary change-request hold persistence and availability evaluation.
- Normalize Refund lifecycle status versus processing mode.
- Review/deprecate Reservation refund statuses safely.
- Add migrations and regenerate Prisma Client.
- Do not add lifecycle mutation UI, provider reversal execution, or emails yet.
```

### 11.3 — Admin cancellation decision and availability release

Status: **Not started**

```text
- Add protected cancellation request/decision UI to reservation detail.
- Require reason, policy outcome, expected reservation version, and explicit confirmation.
- Transition eligible confirmed direct reservations to CANCELLED once.
- Preserve audit history and release dynamic availability/preparation buffers.
- Supersede pending arrival delivery safely.
- Do not execute or promise a refund implicitly.
```

### 11.4 — Refund authorization and Tilopay reconciliation

Status: **Not started**

```text
- Add full/partial refund authorization with cumulative refundable-amount validation.
- Create idempotent PENDING refund records before external action.
- Support initial merchant-portal processing and provider-reference reconciliation.
- Update Payment financial status only after confirmed reversal.
- Keep cancellation/date-change state independent from refund failure.
- Add safe recovery and bounded operational diagnostics.
- Do not guess an undocumented Tilopay API endpoint.
```

### 11.5 — Authorized date changes and stay extensions

Status: **Not started**

```text
- Add admin-recorded requests with old/new snapshots and decision history.
- Revalidate availability, composed dependencies, and preparation buffers.
- Reprice server-side using the approved pricing policy.
- Create temporary requested-date holds while positive differences await payment.
- Reuse Tilopay for linked adjustment payments.
- Apply dates only after required payment approval and final serializable revalidation.
- Route negative differences through the separate partial-refund workflow when approved.
```

### 11.6 — Lifecycle notifications and admin operational history

Status: **Not started**

```text
- Add bilingual cancellation, refund, date-update, and extension templates.
- Create permanent idempotent intents only after the matching transition commits.
- Reuse post-commit Resend delivery, retry, test routing, and safe admin history.
- Show typed lifecycle request, payment-adjustment, and refund history in protected reservation detail.
- Keep guest self-service mutation and generic metadata editing out of scope.
```

### 11.7 — Validation and documentation closure

Status: **Not started**

```text
- Validate state transitions, policy decisions, idempotency, concurrency, availability, buffers, and financial limits.
- Validate positive/zero/negative date-change differences and hold expiration.
- Validate full/partial/manual refund reconciliation and failure isolation.
- Validate bilingual lifecycle notifications and duplicate prevention.
- Consolidate README and official trackers.
- Record remaining production/provider/legal-policy readiness items.
```

## Decisions Required Before Mutation Implementation

The strategy does not block the persistence foundation, but these decisions must be approved before their corresponding mutation subphase:

```text
Cancellation/refund policy
- Cutoff windows and refund percentages
- Fee/tax/cleaning/discount treatment
- Same-day, no-show, and after-check-in rules
- Admin exception authority

Date-change pricing
- Full repricing versus preserved original-rate basis
- Negative-difference refund behavior
- Change-request hold duration
- Maximum allowed future date and request lifetime

Operational intake
- Approved support channels
- Whether a secure public request-only flow belongs in Phase 11 or later
```

Legal/consumer-policy wording must be reviewed for the business's operating jurisdiction before production publication. This strategy is an engineering contract, not a substitute for legal review.

## Validation Gate for 11.1

```text
- AGENTS.md reviewed.
- README.md reviewed.
- docs/10-phases.md reviewed.
- docs/11-progress-log.md reviewed.
- docs/94-phase-10-validation-and-documentation-closure.md reviewed.
- Current base commit verified as 00e23979aec894b1ff953a89b9297744e71a4a21.
- Current ReservationStatus, PaymentStatus, RefundStatus, Refund model, and email notification types reviewed.
- Current availability rule that confirmed reservations block dates reviewed.
- Existing admin reservation/payment detail read-only boundary reviewed.
- Existing guest date-change and stay-extension decisions preserved.
- Official public Tilopay reversal material reviewed without inventing an API contract.
- No application code changed.
- No Prisma schema or migration changed.
- No dependency or environment variable changed.
- No visible application copy changed.
- No provider request, reservation/payment mutation, calendar mutation, or email delivery added.
- No PMS behavior added.
```

Run the documentation delivery gate after applying the files:

```powershell
npm run env:validate
npm run db:validate
npm run lint
npm run build
git diff --check
git status --short
```

## Files Updated by 11.1

```text
README.md
docs/10-phases.md
docs/11-progress-log.md
docs/95-phase-11-lifecycle-strategy-and-roadmap.md
```
