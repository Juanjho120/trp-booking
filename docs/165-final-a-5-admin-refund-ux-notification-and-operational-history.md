# 165 — Final-A.5 Admin Refund UX, Notification, and Operational-History Integration

## Record

```text
Track: Post-Phase-12 / Pre-Phase-13 Final Improvement Track
Package: Final-A — Reservation financial correctness and effective stay value
Subphase: Final-A.5 — Admin UX, notification copy, and operational-history integration
Status: Implementation prepared — pending local/Test validation and owner acceptance
Preparation date: 2026-08-11
Implementation base head: 1c5ea765543e46b89beb64ecb3c06141e8efd8e4
Previous subphase: Final-A.4 — Completed and accepted on 2026-08-11
Final-A.4 accepted head: 1c5ea765543e46b89beb64ecb3c06141e8efd8e4
Strategy: docs/161-final-a-financial-correctness-strategy-and-roadmap.md
Next planned subphase: Final-A.6 — Integrated acceptance and documentation closure
Phase 13: Not started
```

## Goal

Make the accepted Final-A.2 through Final-A.4 financial model visible and understandable to an
administrator without reintroducing Payment-local business logic in the browser.

Final-A.5 is a presentation, notification-copy, and protected-history integration package. It does
not change the financial authorization rules accepted by Final-A.2/A.3 or the negative DATE_CHANGE
completion rules accepted by Final-A.4.

The admin must reason about one Reservation-level stay contract while still being able to operate
each real provider Refund movement independently.

## Reservation Financial Summary in Admin

`getAdminReservationDetail()` now reuses the authoritative:

```text
lib/reservations/financial-summary.ts
```

and serializes a safe admin projection containing:

```text
currentStayValue
capturedStayPayments
committedStayRefunds
approvedStayRefunds
remainingRefundableStayBalance
eligibleStayPayments[]
```

The admin UI does not reconstruct the financial source of truth from visible Payments or Refunds.
The service computes it server-side from the same centralized summary used by refund authorization.

A Reservation that does not yet have an eligible captured initial stay Payment may expose:

```text
financialSummary = null
```

without breaking the reservation detail page. Financial inconsistencies other than the expected
missing-initial-payment state continue to fail closed instead of being silently hidden.

## Standard Refund Presentation

The standard-policy panel continues showing the accepted cancellation-policy entitlement:

```text
policy percentage
policy amount
remaining policy allowance
```

and adds the independent Reservation-level financial cap:

```text
remaining refundable stay balance
```

The maximum amount that can be proposed by the UI is therefore:

```text
min(remaining policy allowance, remaining refundable stay balance)
```

The backend remains authoritative and revalidates both limits inside its Serializable transaction.

## Extraordinary Refund Presentation

Extraordinary refund authorization no longer asks the browser to select or reason about one
`Payment` as the Reservation limit.

The UI now uses:

```text
Reservation remainingRefundableStayBalance
```

as the displayed financial boundary and stops sending the legacy compatibility fields:

```text
paymentId
expectedPaymentUpdatedAt
```

for a new extraordinary authorization.

Those optional API fields remain accepted temporarily by the backend for compatibility with older
clients, but the current admin UI no longer depends on them.

The same cleanup is applied to standard authorization: the admin client no longer sends a stale
single-Payment version fence. The server derives and fences every Payment actually used by the
allocation.

## Processing-Mode Default

Final-A.5 does not duplicate the deterministic refund allocator in client code.

For the initial UI suggestion only:

```text
all still-refundable eligible stay Payments have providerReference
-> suggest TILOPAY_API

otherwise
-> suggest TILOPAY_PORTAL_FALLBACK
```

The administrator may still select a mode explicitly. Final-A.3/A.4 backend validation remains the
source of truth for the concrete allocated Payments and fails closed when `TILOPAY_API` cannot be
used for every child required by the requested amount.

## Logical Refund Operation Grouping

New client-safe presentation helper:

```text
features/admin/refund-operation-groups.ts
```

groups Refund rows by:

```text
Refund.refundOperationKey
```

Historical rows with `refundOperationKey = null` remain one independent legacy entry.

For a new logical operation such as:

```text
extraordinary/<reservationId>/<requestId>
```

or:

```text
lifecycle-negative/<lifecycleRequestId>
```

the admin sees one operation containing all provider movements.

Example:

```text
Refund operation
  requested amount: USD 145
  provider movements: 2

  movement #1
    Payment initial
    USD 130
    own status / Tilopay order / execute / consult / reconcile

  movement #2
    completed positive adjustment Payment
    USD 15
    own status / Tilopay order / execute / consult / reconcile
```

Pagination is operation-oriented rather than child-oriented so siblings are not split across admin
pages as unrelated records.

Provider operations remain child-level. Final-A.5 does not create a fake provider aggregate or send
one USD 145 request against a USD 130 Tilopay order.

## Reservation Detail Payment Visibility

Before Final-A.5, the standard/extraordinary Refund section received a projection that filtered the
Reservation Payments down to `INITIAL_RESERVATION` only.

That is incompatible with Final-A.3 because a standard or extraordinary child may legitimately be
linked to a completed positive `LIFECYCLE_ADJUSTMENT` Payment.

Final-A.5 keeps all Reservation Payments available to the Refund presentation while continuing to
filter lifecycle-adjustment Refund rows into their dedicated lifecycle section.

This allows each standard/extraordinary provider child to resolve its exact Payment and Tilopay order
for execute / consult / reconcile controls.

## Lifecycle-Adjustment Refund Presentation

The lifecycle Refund section now paginates and displays negative DATE_CHANGE Refund children by
logical operation rather than treating every child as an unrelated top-level record.

Pending negative completion requests remain their own operational entry.

Failed-positive compensation remains one exact Refund against its failed adjustment Payment and is
not merged with the multi-payment negative DATE_CHANGE contract.

## Reconciliation Feedback

When a child of a split operation reaches `APPROVED`, admin feedback no longer implies that the whole
logical refund has completed.

Single-child / legacy operation:

```text
refund approved
```

Multi-child operation:

```text
this provider movement approved
siblings retain their independent state
```

This is presentation-only. The underlying provider evidence and Payment status transitions remain
per Refund child exactly as accepted in Final-A.3/A.4.

## Refund-Processed Email Clarity

Notification intent creation and deduplication remain unchanged:

```text
one REFUND_PROCESSED intent per approved Refund.id
one ADMIN_REFUND_PROCESSED intent per approved Refund.id / configured admin recipient
```

Final-A.5 adds safe operation context at delivery time only when the approved Refund belongs to a
multi-child `refundOperationKey`.

The context contains:

```text
logical operation key
provider movement count
currently approved movement count
logical requested amount = sum(child amounts)
```

Guest email:

```text
- confirms the exact approved child amount
- shows the logical operation amount and approved-movement progress
- does not expose the internal operation key
- explicitly states that the message does not confirm sibling movements
```

Admin email additionally shows the safe logical operation key for correlation.

No email is sent for a child before that child has the accepted provider/reconciliation evidence
required by the existing `REFUND_PROCESSED` workflow.

## Negative DATE_CHANGE Completion Email

Before Final-A.5, the date-change completion template obtained refund information from only one
related Refund row.

That becomes ambiguous after Final-A.4 because:

```text
negative difference = USD 145
child #1 = USD 130
child #2 = USD 15
```

The date-change completion email now uses the authoritative negative `financialDifference` for the
logical refund amount and derives a conservative aggregate Refund status across all lifecycle
Refund children.

Therefore it can report:

```text
refund amount: USD 145
status: pending / processing / approved / failed as safely aggregated
```

instead of accidentally presenting one provider leg as the entire price correction.

## Protected Operational History

`Refund.refundOperationKey` is added to the protected operational-history projection.

Every Refund/history event continues referencing the exact child Refund and Payment, while the
operation key gives administrators a safe correlation field for siblings generated by one logical
authorization.

No new mutable history endpoint is introduced. Operational history remains read-only.

## Copy and Localization

All new visible copy is centralized in:

```text
messages/es.ts
messages/en.ts
```

The package replaces remaining single-Payment wording where the accepted Final-A source of truth is
Reservation-level, including:

```text
- extraordinary refund limit
- negative DATE_CHANGE insufficient-balance error
- empty refundable-balance states
- grouped operation labels
- provider-movement explanation
- split-operation reconciliation feedback
- split-operation email clarification
- operational-history operation label
```

No new visible strings are introduced through a feature-local copy file.

## Persistence and Provider Boundary

Final-A.5 introduces:

```text
no Prisma schema change
no migration
no new enum
no provider API change
no environment variable
no dependency
no scheduler registration
```

The `refund_operation_key` persistence introduced by Final-A.3 is reused as-is.

## Final-A Test Strategy

Final-A.5 adds **no per-subphase validation script and no standalone business-test suite**.

The owner-approved Final-A workflow remains:

```text
Final-A.2 through Final-A.5
-> implementation + normal technical gates

Final-A.6
-> automated financial/regression tests
-> integrated Local/Test acceptance
-> documentation closure
```

Final-A.6 must test the final behavior rather than preserving separate temporary validator scripts
for intermediate subphases.

## Local Acceptance Gate

Before accepting Final-A.5:

```text
[ ] npm run db:validate
[ ] npm run db:migrate:status
[ ] npm run lint
[ ] npm run build
[ ] git diff --check
[ ] git status reviewed
```

No new migration should appear for Final-A.5.

Controlled UI/email review before A.6 should verify at minimum:

```text
[ ] Reservation financial summary shows current stay value, captured payments, committed/approved refunds, and remaining refundable balance
[ ] standard authorization max respects both policy allowance and Reservation refundable balance
[ ] extraordinary authorization no longer presents one Payment as its financial limit
[ ] a USD 145 operation over USD 130 + USD 65 displays one logical operation with USD 130 + USD 15 children
[ ] each child still has independent execute / consult / reconcile controls
[ ] lifecycle-negative siblings appear under the same logical operation
[ ] operational history shows refundOperationKey on grouped child events
[ ] first approved child email does not claim sibling success
[ ] later approved sibling email reports updated operation progress
[ ] negative DATE_CHANGE completion email shows the complete negative difference, not one child amount
[ ] ES and EN presentation remain aligned
```

The full automated matrix, concurrency regression, financial fixture coverage, and integrated Test
acceptance remain Final-A.6.

## Files Changed by Final-A.5

```text
features/admin/refund-operation-groups.ts
features/admin/components/admin-reservation-detail-page.tsx
features/admin/components/admin-reservation-refund-section.tsx
features/admin/components/admin-reservation-lifecycle-adjustment-refund-section.tsx
features/admin/components/admin-reservation-operational-history-section.tsx
lib/admin/reservation-detail.ts
lib/admin/reservation-operational-history.ts
lib/email/lifecycle-notifications.ts
emails/lifecycle-email-templates.tsx
emails/lifecycle-template-data.ts
types/admin-reservation-detail.ts
types/admin-reservation-operational-history.ts
types/lifecycle-email-template.ts
messages/es.ts
messages/en.ts
README.md
docs/10-phases.md
docs/11-progress-log.md
docs/160-post-phase-12-pre-phase-13-final-improvement-track.md
docs/161-final-a-financial-correctness-strategy-and-roadmap.md
docs/164-final-a-4-negative-date-change-multi-payment-integration.md
docs/165-final-a-5-admin-refund-ux-notification-and-operational-history.md
```

## Non-Goals

```text
- No Final-A.6 automated financial/regression suite yet.
- No Final-B external-calendar admin work.
- No Final-C pricing-rule implementation.
- No Final-D additional-charge Payment purpose.
- No change to cancellation 100% / 50% / 0% timing thresholds.
- No new Tilopay transaction model or API endpoint.
- No Test Vercel scheduler activation.
- No Production account/resource work.
- Phase 13 remains Not started.
```

## Status After Implementation Package

```text
Final-A — In progress
Final-A.1 — Completed and accepted
Final-A.2 — Completed and accepted at 9f4e04068726451ca87614dd99b1f10656510825
Final-A.3 — Completed and accepted at 8d5884c4f536c0d9407fac2d0229b71105114453
Final-A.4 — Completed and accepted at 1c5ea765543e46b89beb64ecb3c06141e8efd8e4
Final-A.5 — Implementation prepared; pending local/Test validation and owner acceptance
Final-A.6 — Not started
Phase 13 — Not started
```
