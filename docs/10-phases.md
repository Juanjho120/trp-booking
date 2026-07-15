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
Current subphase: 9.10 Phase 9 documentation update and closure
Current focus: close Phase 9 after admin review, dynamic preparation buffers, and auditable admin override behavior were implemented.
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
9.7 Admin reservation and payment review — Completed
9.8 Automatic preparation buffers in availability — Completed
9.9 Admin preparation buffer settings and manual unlock behavior — Completed
9.10 Phase 9 documentation update and closure — In progress
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
- Payment result pages distinguish payment status from reservation status.
- Payment and reservation statuses are localized.
- The public reservation flow auto-scrolls to the relevant quote, pending reservation, and payment areas.
- This subphase still does not send Resend emails or add PMS behavior.
```

Phase 9.7 result:

```text
- The protected admin page shows read-only operational visibility for direct reservations and payments.
- Safe Tilopay diagnostics and SDK client events are available without exposing card data.
- Admin review copy is centralized in messages/es.ts and messages/en.ts.
- Reservation and payment statuses shown in admin are localized.
- The admin dashboard uses the shared client locale switcher so ES/EN admin copy changes in place.
- The admin page does not include actions to manually confirm, cancel, refund, or modify reservations.
- Payment-driven confirmation remains the only confirmation path.
- No migrations, emails, PMS behavior, or preparation-buffer changes were added.
```

Phase 9.8 goal:

```text
Make availability evaluate automatic preparation buffers for CONFIRMED reservations and active PENDING_PAYMENT holds without requiring admin configuration yet.
```

Phase 9.8 result:

```text
- CONFIRMED reservations dynamically block stay dates plus preparation buffers.
- PENDING_PAYMENT reservations dynamically block stay dates plus preparation buffers only while expiresAt > now.
- PENDING_PAYMENT rows with expiresAt = null are not active holds and do not block availability.
- EXPIRED reservations and expired pending holds do not block stay dates or preparation buffers.
- Buffer values are read from Property.preparationDaysBefore and Property.preparationDaysAfter.
- Composed-listing dependency rules remain active for stay and buffer ranges.
- Pending and confirmed direct-reservation buffers are not materialized into calendar_blocks in 9.8.
- Confirmed buffers continue to be represented in Airbnb iCal exports, including buffers that intersect the export-window boundary while the stay itself falls outside it.
- No admin buffer configuration, new manual unlock behavior, migration, visible copy, email, or PMS behavior was added.
```

Phase 9.9 goal:

```text
Add the admin layer that makes preparation buffers configurable and manually unlockable after the dynamic buffer rules are correct.
```

Phase 9.9 result:

```text
- Option B was selected: dynamic direct-reservation buffers plus auditable override records.
- Admin can configure Property.preparationDaysBefore and Property.preparationDaysAfter from 0 through 30.
- Current defaults remain 1/1, 2/2, and 2/2 until changed by admin.
- A one-day unlocked PREPARATION_BUFFER CalendarBlock records the reservation, date, admin, timestamp, and reason.
- Partial overrides subtract only the selected day from the dynamic buffer.
- Reservation stay dates remain blocked.
- AdminAuditLog records configuration changes and unlock actions.
- Public availability and iCal export use the same effective-buffer subtraction.
- Airbnb import sync reads current Property buffer values when it creates or refreshes imported preparation blocks.
- No Prisma migration, email, guest date modification, pending-buffer persistence, or PMS behavior was added.
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
