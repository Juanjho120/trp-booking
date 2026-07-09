# 10 — Project Phases

This document defines the official implementation phases for TRP Booking and tracks the current progress at a high level.

## Status Legend

```text
Not started — Work has not begun.
In progress — Work has started but the phase is not complete.
Completed — Deliverables are implemented and committed.
Deferred — Intentionally postponed.
```

## Current Phase

```text
Current phase: Phase 9 — Tilopay Sandbox Integration
Current subphase: 9.4 Payment handoff redirect/session foundation
Current focus: prepare the checkout handoff/session boundary after an internal Payment record exists, without confirming reservations, sending emails, or adding PMS features.
```

---

## Phase 8 — Reservation Flow

Status: **Completed**

Goal: Add the public direct reservation flow foundation using server-side validation, pending holds, guest details, seeded accommodation records, improved booking UX, manual locale selection, availability revalidation, and expired hold cleanup before payment integration.

Completed subphases:

```text
8.1 Reservation flow strategy and pending hold contract — Completed
8.2 Reservation quote and server-side pricing foundation — Completed
8.3 Public guest details and reservation request form — Completed
8.3.1 Initial seed and DB-backed accommodation source — Completed
8.3.2 Reservation form UX and manual locale switcher — Completed
8.4 Pending reservation creation and expiration handling — Completed
8.5 Availability revalidation before payment handoff — Completed
8.5.1 Pending hold expiration status cleanup — Completed
8.6 Phase 8 documentation update — Completed
```

Phase 8 closure result:

```text
- The public reservation form can calculate a server-side quote.
- The public reservation form can create real PENDING_PAYMENT reservation holds.
- Pending holds use a non-null expiresAt value and initially last 15 minutes.
- Availability blocks active pending holds while ignoring expired pending holds.
- Payment handoff readiness can be validated server-side for an active pending hold.
- Payment handoff validation recalculates quote, checks stored totals, and revalidates availability while excluding the reservation itself.
- A protected cron route marks expired PENDING_PAYMENT holds as EXPIRED.
- The reservation flow is ready for Phase 9 Tilopay sandbox integration.
```

---

## Phase 9 — Tilopay Sandbox Integration

Status: **In progress**

Goal: Add the Tilopay sandbox payment foundation on top of the completed Phase 8 reservation-flow foundation.

Subphase status:

```text
9.1 Tilopay sandbox strategy and environment contract — Completed
9.2 Tilopay environment validation — Completed
9.3 Payment record creation for pending reservations — Completed
9.4 Payment handoff redirect/session foundation — Not started
9.5 Tilopay webhook validation foundation — Not started
9.6 Confirm reservation only after validated payment — Not started
9.7 Phase 9 documentation update — Not started
```

Phase 9 rules:

```text
- Do not store card data.
- Keep all Tilopay credentials server-side only.
- Do not expose raw provider payloads in public API responses.
- Do not set Reservation.status = CONFIRMED until payment validation succeeds.
- Keep failed/rejected payment states auditable.
- Do not send Resend emails in Phase 9 unless explicitly moved from Phase 10.
- Do not add PMS features.
```

Phase 9.3 result:

```text
- POST /api/payments/attempts was added.
- lib/payments/payment-attempts.ts was added.
- types/payment-attempt.ts was added.
- features/payments/payment-attempt-copy.ts was added.
- The service validates payment handoff readiness before creating any Payment record.
- The service creates a Payment with provider = TILOPAY, status = PENDING, amount = validated reservation total, and currency = USD.
- The service reuses an existing pending Tilopay Payment for the same reservation when the amount and currency still match.
- Phase 9.3 does not call Tilopay, redirect to checkout, add webhooks, confirm reservations, send emails, add PMS behavior, or add migrations.
```

Phase 9.4 current scope:

```text
- Prepare the handoff/session boundary after a Payment record exists.
- Keep provider credentials server-side only.
- Do not store card data.
- Do not confirm reservations yet.
- Do not send emails yet.
- Do not add PMS features.
```

---

## Phase 10 — Email Notifications

Status: **Not started**

---

## Phase 11 — Cancellation, Refund, and Change Request Rules

Status: **Not started**

---

## Phase 12 — Production Readiness

Status: **Not started**
