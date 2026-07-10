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
Current subphase: 9.6 Confirm reservation only after validated payment
Current focus: move a reservation from PENDING_PAYMENT to CONFIRMED only after Payment.status is APPROVED through validated Tilopay redirect, consult, and OrderHash V2 checks.
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

Goal: Add the Tilopay sandbox payment foundation on top of the completed Phase 8 reservation-flow foundation.

Subphase status:

```text
9.1 Tilopay sandbox strategy and environment contract — Completed
9.2 Tilopay environment validation — Completed
9.3 Payment record creation for pending reservations — Completed
9.4 Tilopay SDK V2 checkout foundation — Completed
9.5 Tilopay redirect, consult, and OrderHash V2 validation foundation — Completed
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

Phase 9.4 result:

```text
- Tilopay SDK V2 is the preferred checkout foundation.
- POST /api/payments/tilopay/sdk-session was added.
- The public reservation flow can prepare a Tilopay SDK session after a pending reservation hold exists.
- The SDK is rendered inside the TRP Booking experience.
- The backend calls /loginSdk server-side and returns safe SDK init configuration.
- The payment form fields required by Tilopay are rendered in the browser but are not stored or sent to the TRP Booking backend.
- Phase 9.4 does not confirm reservations, send emails, add Prisma migrations, or add PMS behavior.
```

Phase 9.5 result:

```text
- TILOPAY_REDIRECT_URL was introduced as the SDK callback URL.
- GET /api/payments/tilopay/redirect was added.
- Tilopay /consult is called server-side after the redirect.
- OrderHash V2 HMAC-SHA256 validation was added.
- Payment.status can move from PENDING to APPROVED, REJECTED, or FAILED.
- Reservation.status remains PENDING_PAYMENT in this subphase.
- No emails, migrations, admin UI, refunds, or PMS behavior were added.
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
