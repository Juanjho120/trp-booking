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
Current subphase: 9.7 Admin reservation and payment review
Current focus: review minimal admin visibility for direct reservations, payment states, safe Tilopay diagnostics, and operational guardrails before adding preparation-buffer behavior.
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

---

## Phase 9 — Tilopay Sandbox Integration

Status: **In progress**

Goal: Add the Tilopay sandbox payment foundation on top of the completed Phase 8 reservation-flow foundation, then close the remaining operational gaps needed before Phase 10 email notifications.

Subphase status:

```text
9.1 Tilopay sandbox strategy and environment contract — Completed
9.2 Tilopay environment validation — Completed
9.3 Payment record creation for pending reservations — Completed
9.4 Tilopay SDK V2 checkout foundation — Completed
9.5 Tilopay redirect, consult, and OrderHash V2 validation foundation — Completed
9.6 Confirm reservation only after validated payment — Completed
9.6.1 Tilopay sandbox hardening, retryable payment errors, status localization, and checkout UX — Completed
9.7 Admin reservation and payment review — Not started
9.8 Automatic preparation buffers in availability — Not started
9.9 Admin preparation buffer settings and manual unlock behavior — Not started
9.10 Phase 9 documentation update and closure — Not started
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

Phase 9.6 result:

```text
- A payment-driven reservation confirmation service was added.
- Reservation.status becomes CONFIRMED only after Payment.status is APPROVED.
- Confirmation is idempotent when the reservation is already CONFIRMED.
- Reservation.confirmedAt is set.
- Reservation.expiresAt is cleared after confirmation.
- Rejected and failed payments do not confirm reservations.
- No emails, migrations, admin UI, refunds, or PMS behavior were added.
```

Phase 9.6.1 result:

```text
- Tilopay sandbox hardening continued after the initial 9.6 confirmation service.
- Retryable Tilopay payment issues were mapped to safe public messages.
- The payment retry page was aligned with centralized i18n messages.
- Payment result pages now distinguish payment status from reservation status.
- Payment and reservation statuses are localized.
- The public reservation flow now auto-scrolls to the relevant quote, pending reservation, and payment areas.
- This subphase still does not send Resend emails or add PMS behavior.
```

Phase 9.7 goal:

```text
Review the existing admin foundation for safe operational visibility into direct reservations and payments before changing buffer behavior.
```

Phase 9.7 boundaries:

```text
Allowed:
- Show direct reservations and payment status visibility needed for support/debugging.
- Show safe Tilopay references and operational diagnostics.
- Preserve payment-driven confirmation as the only confirmation path.

Not allowed:
- Confirm reservations manually by bypassing payment validation.
- Store or expose card data.
- Add PMS behavior.
- Send Phase 10 emails.
```

Phase 9.8 goal:

```text
Make availability evaluate automatic preparation buffers for CONFIRMED reservations and active PENDING_PAYMENT holds without requiring admin configuration yet.
```

Phase 9.8 strategy:

```text
Use dynamic availability calculation first.
Do not materialize PENDING_PAYMENT preparation buffers into calendar_blocks yet.
Expired holds must not block stay dates or preparation buffers.
Document any decision before materializing confirmed buffers.
```

Phase 9.9 goal:

```text
Add admin preparation buffer settings and manual unlock behavior after the dynamic buffer rules are correct.
```

Phase 9.9 boundaries:

```text
- Configure daysBefore/daysAfter per accommodation.
- Keep current defaults: 1/1 for Apartamento Blanco y Negro, 2/2 for Bungalow Refugio Perfecto, 2/2 for Refugio Completo.
- Allow manual unlock of preparation-buffer blocks without releasing the reservation itself.
- Preserve auditability.
- Decide and document whether confirmed buffers become calendar_blocks or whether unlocks are stored as overrides.
```

Phase 9.10 goal:

```text
Close Phase 9 documentation after admin review, dynamic preparation buffers, and admin buffer-setting decisions are documented.
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
