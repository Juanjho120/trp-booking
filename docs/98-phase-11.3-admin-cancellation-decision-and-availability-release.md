# 98 — Phase 11.3 Admin Cancellation Decision and Availability Release

## Phase Record

```text
Phase: Phase 11 — Cancellation, Refund, and Change Request Rules
Subphase: 11.3 Admin cancellation decision and availability release
Status: In progress — implementation prepared for local/test acceptance
Implementation base commit: 2495aa891fd26938550960f94fdbea700151350f
Previous completed subphase: 11.2 Lifecycle request persistence and audit foundation
11.2 accepted commit: 2495aa891fd26938550960f94fdbea700151350f
Next subphase after acceptance: 11.4 Refund authorization and Tilopay reconciliation
```

## Purpose

Add the protected administrative workflow for recording and deciding direct-reservation cancellation requests while preserving the separation between the operational cancellation and the later financial refund workflow.

This subphase uses the typed persistence introduced in 11.2. It does not add another Prisma migration.

## Scope

```text
- Record a cancellation request received through an approved support channel.
- Snapshot the confirmed reservation, selected source payment, and standard cancellation-policy result.
- Approve or reject the pending request through protected admin actions.
- Cancel the reservation and release its effective availability only after approval.
- Preserve idempotency, optimistic concurrency, serializable transactions, and AdminAuditLog history.
- Proactively skip pending/failed arrival-instruction notifications after cancellation.
- Show localized request history, policy outcome, and decision controls in reservation detail.
```

Explicitly excluded:

```text
- Creating or executing a Refund.
- Calling Tilopay processModification.
- Marking Payment as PARTIALLY_REFUNDED or REFUNDED.
- Sending RESERVATION_CANCELLED or REFUND_PROCESSED emails.
- Admin policy exceptions or arbitrary refund overrides.
- Guest self-service cancellation endpoints.
- Date-change or stay-extension execution.
- PMS behavior.
```

## Cancellation Request Creation

An authorized admin records the request from the reservation detail page.

Required input:

```text
- Support channel: EMAIL, PHONE, WHATSAPP, or OTHER.
- Requester name.
- Optional requester email.
- Optional requester phone.
- Guest-provided request note.
- Reservation updatedAt snapshot.
- Client-generated request UUID.
```

Server requirements:

```text
- The reservation exists.
- Reservation.status is CONFIRMED.
- confirmedAt is present.
- cancelledAt is null.
- A validated initial-reservation payment exists.
- The reservation updatedAt matches the browser snapshot.
- No active cancellation request already exists.
```

A request retry reuses the permanent key:

```text
reservation-cancellation/<reservationId>/<requestId>
```

The creation transaction persists the typed snapshots from 11.2 and records:

```text
RESERVATION_CANCELLATION_REQUEST_CREATED
```

## Standard Cancellation Policy Snapshot

Policy timing uses the property's configured check-in date and time in `America/Guatemala`.

```text
calculatedAt <= checkInAt - 168 hours
-> AT_LEAST_168_HOURS
-> 100%

checkInAt - 168 hours < calculatedAt <= checkInAt - 72 hours
-> BETWEEN_72_AND_168_HOURS
-> 50%

calculatedAt > checkInAt - 72 hours
-> LESS_THAN_72_HOURS
-> 0%
```

The implementation compares timestamps directly so the exact 168-hour and 72-hour boundaries are deterministic. `policyHoursBeforeCheckIn` remains an auditable decimal snapshot and is not used as the rounded decision input.

The standard policy amount is a snapshot only. It does not authorize or execute a provider refund. Remaining refundable limits and provider reconciliation belong to 11.4.

## Approval Decision

Approval runs in a serializable transaction and requires:

```text
- Request type is CANCELLATION.
- Request status is PENDING_REVIEW.
- Request version matches the browser snapshot.
- Request expectedReservationUpdatedAt matches the current reservation.
- Reservation remains CONFIRMED and not already cancelled.
- No policy exception is present.
```

Accepted state changes:

```text
Reservation.status: CONFIRMED -> CANCELLED
Reservation.cancelledAt: null -> decision timestamp
ReservationLifecycleRequest.status: PENDING_REVIEW -> COMPLETED
reviewedByAdminId: authenticated admin
reviewedAt / decidedAt / completedAt: decision timestamp
version: increment by 1
```

The transaction also records:

```text
RESERVATION_CANCELLATION_APPROVED
```

No Refund row is created. Audit metadata explicitly records that refund authorization and execution are false.

## Availability Release

Direct-reservation availability is derived from reservation state. After the approval transaction commits, a `CANCELLED` reservation no longer participates as a direct stay blocker and no longer produces dynamic preparation-buffer blockers.

The cancellation action does not delete:

```text
- Reservation history.
- Payment history.
- Existing preparation override history.
- Email history.
- Calendar or audit history.
```

No manual CalendarBlock is created or deleted to simulate cancellation.

## Arrival Instructions

Pending or failed `ARRIVAL_INSTRUCTIONS` rows are marked `SKIPPED` inside the approval transaction with the existing safe supersession diagnostic.

A notification already in `PROCESSING` is not rewritten by the cancellation transaction. The Phase 10 final delivery guard re-reads the reservation and skips delivery when the reservation is no longer `CONFIRMED`.

Previously `SENT` notifications remain unchanged for audit history.

## Rejection Decision

Rejection leaves the reservation and availability unchanged.

Accepted state changes:

```text
ReservationLifecycleRequest.status: PENDING_REVIEW -> REJECTED
reviewedByAdminId: authenticated admin
reviewedAt / decidedAt: decision timestamp
version: increment by 1
```

The transaction records:

```text
RESERVATION_CANCELLATION_REJECTED
```

A later cancellation request may be recorded because the rejected request is no longer active.

## Admin UI

Reservation detail gains a dedicated cancellation section that:

```text
- Uses centralized ES/EN copy.
- Localizes request statuses, support channels, and policy reason codes.
- Uses the shared Card, Button, Select, Sheet, and Snackbar foundation.
- Separates request creation from approval/rejection.
- Requires an explicit note for each request and decision.
- Warns that cancellation releases availability immediately.
- Warns that the displayed policy amount is not an executed refund.
- Does not use alert(), confirm(), prompt(), or a native select.
```

## API Routes

```text
POST /api/admin/reservations/[reservationId]/cancellation-requests
POST /api/admin/reservation-lifecycle-requests/[requestId]/decision
```

Both routes require an authorized admin session, strict Zod input, bounded values, safe error codes, and no raw Prisma/provider diagnostics in responses.

## Concurrency and Idempotency

```text
- Request creation uses a permanent client UUID and idempotency key.
- A reservation row fence serializes concurrent request creation.
- An active-request lookup prevents two open cancellation decisions.
- Decision updates compare request version and reservation updatedAt.
- Repeated successful APPROVE or REJECT submissions return the accepted outcome without applying it twice.
- Serialization conflicts become a safe stale-data response.
```

## Audit Actions

```text
RESERVATION_CANCELLATION_REQUEST_CREATED
RESERVATION_CANCELLATION_APPROVED
RESERVATION_CANCELLATION_REJECTED
```

Audit metadata is bounded and excludes card data, provider credentials, raw Tilopay responses, and unrestricted provider payloads.

## Validation Gate

Run in PowerShell from the repository root:

```powershell
npm run env:validate
npm run db:validate
npm run db:generate
npm run lint
npm run build
git diff --check
git status --short
```

No migration command is required for 11.3 because this implementation uses the accepted 11.2 schema.

## Manual Acceptance Matrix

### Request creation

```text
1. Confirmed reservation with approved payment creates one PENDING_REVIEW request.
2. Reload shows the same request and policy snapshot.
3. Retrying the same client request UUID does not create another row.
4. A different concurrent request is rejected while one request remains active.
5. A stale reservation updatedAt is rejected.
6. A non-confirmed reservation cannot create a request.
```

### Policy boundaries

```text
1. Exactly 168 hours before check-in -> 100%.
2. One millisecond after the 168-hour boundary -> 50%.
3. Exactly 72 hours before check-in -> 50%.
4. One millisecond after the 72-hour boundary -> 0%.
5. Same-day, after-check-in, and no-show timing -> 0%.
```

### Approval

```text
1. Approval changes Reservation to CANCELLED once.
2. cancelledAt is populated.
3. Request becomes COMPLETED and version increments.
4. Public availability releases the stay dates.
5. Dynamic preparation buffers are released.
6. Composed-listing availability is released consistently.
7. PENDING/FAILED arrival instructions become SKIPPED.
8. SENT notification history remains unchanged.
9. No Refund row is created.
10. Payment financial status remains unchanged.
11. Repeating approval does not cancel twice or duplicate audit history.
```

### Rejection

```text
1. Rejection changes only the request to REJECTED.
2. Reservation remains CONFIRMED.
3. Availability remains blocked.
4. Arrival notifications remain unchanged.
5. A new request can be recorded later.
6. Repeating rejection does not duplicate the decision.
```

### UI and localization

```text
1. Spanish and English show matching sections and actions.
2. Request status, channel, and policy reason are localized.
3. Sheets are keyboard accessible and closable.
4. Snackbars report safe success/error feedback.
5. No raw provider or Prisma error is shown.
6. Mobile and desktop layouts remain usable without horizontal overflow.
```

## Completion Boundary

Subphase 11.3 must be marked `Completed` only after the local/test validation matrix passes and the implementation commit is accepted.

After acceptance, Phase 11.4 may create idempotent Refund intents and validate Tilopay `processModification` through the documented sandbox test matrix. Cancellation must remain accepted even when a later refund attempt fails.
