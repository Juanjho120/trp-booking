# 68 — Phase 9 Admin and Preparation Buffers Roadmap

## Status

Planning document added before continuing Phase 9.

## Purpose

This document fixes the Phase 9 roadmap gap that appeared after payment validation, retry handling, localized payment result pages, and booking-flow UX improvements were implemented.

The project should not continue by memory. This document defines the next Phase 9 subphases before starting admin review, automatic preparation buffers, admin buffer settings, or Phase 10 email notifications.

## Current Repository Contrast

### Current official phase docs before this update

The existing phase plan still points to:

```text
Current phase: Phase 9 — Tilopay Sandbox Integration
Current subphase: 9.7 Phase 9 documentation update
```

It only lists Phase 9.1 through Phase 9.7, where 9.7 is documentation closure.

The existing progress log also still treats 9.7 as documentation closure and recommends closing Phase 9 documentation before Phase 10 emails.

### What changed after 9.6

After 9.6, the codebase continued hardening the sandbox payment flow:

```text
- strict Tilopay OrderHash validation
- Tilopay preflight validation
- expired-confirmation prevention
- Tilopay SDK client failure tracking
- retryable payment error routing
- centralized retry copy and field feedback
- localized payment/reservation statuses on payment result pages
- auto-scroll UX for quote, pending reservation, and payment sections
```

Those changes are part of Phase 9 payment hardening and should be documented before Phase 10.

## Corrected Phase 9 Roadmap

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

## Phase 9.7 — Admin Reservation and Payment Review

### Goal

Review the current admin foundation after the public payment flow and confirm what minimal operational visibility is needed before adding preparation-buffer behavior.

### Scope

```text
- Review direct reservations in admin.
- Review payment records in admin.
- Review safe Tilopay diagnostics.
- Confirm payment-driven reservation confirmation remains the only confirmation path.
- Confirm admin does not expose card data.
```

### Reservation visibility checklist

```text
Reservation ID
Accommodation
Guest details already collected by the public flow
Check-in date
Check-out date
Guest count
Total and currency
Reservation.status
expiresAt
confirmedAt
createdAt
updatedAt
```

### Payment visibility checklist

```text
Payment ID
Reservation ID
provider
providerReference / orderNumber
Payment.status
amount and currency
safe Tilopay diagnostic payload
createdAt
updatedAt
```

### Not allowed

```text
Manual confirmation that bypasses server-side payment validation
Card number, CVV, expiration date, or token storage
PMS features
Email sending
Refund workflows unless explicitly planned later
```

## Phase 9.8 — Automatic Preparation Buffers in Availability

### Goal

Make availability block preparation buffers automatically for reservations that currently block public availability.

### Existing documented rules

Preparation buffer defaults:

```text
Apartamento Blanco y Negro: 1 day before and 1 day after
Bungalow Refugio Perfecto: 2 days before and 2 days after
Refugio Completo: 2 days before and 2 days after
```

Range convention:

```text
Before check-in buffer: [checkInDate - daysBefore, checkInDate)
After check-out buffer: [checkOutDate, checkOutDate + daysAfter)
```

### Required behavior

```text
1. Active PENDING_PAYMENT reservation with expiresAt > now:
   - Blocks stay dates.
   - Blocks preparation buffers temporarily.

2. Expired PENDING_PAYMENT reservation:
   - Does not block stay dates.
   - Does not block preparation buffers.

3. CONFIRMED reservation:
   - Blocks stay dates.
   - Blocks preparation buffers in a stable way.

4. EXPIRED reservation:
   - Does not block stay dates.
   - Does not block preparation buffers.
```

### Technical recommendation for 9.8

Use dynamic availability calculation first.

Do not materialize PENDING_PAYMENT preparation buffers into `calendar_blocks` yet.

Reason:

```text
PENDING_PAYMENT holds expire automatically.
If temporary buffers are materialized in calendar_blocks, the system also needs cleanup/unlock logic for expired holds.
Dynamic calculation keeps Phase 9.8 smaller and safer.
```

Expected availability approach:

```text
- Read CONFIRMED reservations.
- Read active PENDING_PAYMENT reservations where expiresAt > now.
- Ignore expired holds.
- Use buildPreparationBufferRanges() or equivalent availability rule helpers.
- Merge stay blocks and preparation-buffer blocks into blocked dates.
- Keep composed listing dependency rules active.
```

### Not included in 9.8

```text
Admin configuration for daysBefore/daysAfter
Manual unlock of a buffer
Persistent buffer block materialization for pending holds
Email notifications
PMS behavior
```

## Phase 9.9 — Admin Preparation Buffer Settings and Manual Unlock Behavior

### Goal

Add the admin layer that makes preparation buffers configurable and manually unlockable after the dynamic buffer rules are correct.

### Scope

```text
- Configure daysBefore/daysAfter per accommodation.
- Keep current defaults for existing accommodations.
- Allow admin to unlock only preparation-buffer days.
- Do not unlock the reservation itself.
- Preserve auditability of admin changes.
```

### Default settings

```text
Apartamento Blanco y Negro: before=1, after=1
Bungalow Refugio Perfecto: before=2, after=2
Refugio Completo: before=2, after=2
```

### Design decision needed before implementation

9.9 must decide whether confirmed buffers are represented as:

```text
Option A — materialized calendar_blocks
- Useful for manual unlock.
- Closer to admin calendar behavior.
- Requires idempotent creation and soft-unlock logic.

Option B — dynamic buffers plus admin override records
- Avoids creating extra blocks for every reservation.
- Requires a dedicated override model or equivalent rule table.
- Must still be auditable.
```

No implementation should start until this decision is explicitly documented.

## Phase 9.10 — Phase 9 Documentation Update and Closure

### Goal

Close Phase 9 only after:

```text
- 9.7 admin review is completed or explicitly deferred.
- 9.8 dynamic preparation buffers are implemented and validated.
- 9.9 admin buffer settings/unlock behavior is implemented or explicitly moved to a later phase.
- Phase 9 docs reflect the final payment, retry, admin, and buffer behavior.
```

### Required documentation updates at closure

```text
docs/10-phases.md
docs/11-progress-log.md
README.md, if it contains phase/status continuity notes
Any Phase 9 payment/admin/buffer docs added during implementation
```

## Validation Notes

After applying documentation-only changes:

```text
No build is required for Markdown-only changes, but npm run build may still be run for confidence.
```

Before implementing 9.8:

```text
Review docs/32-availability-strategy-and-calendar-rules.md.
Review lib/availability/rules.ts.
Review the current availability service.
Review reservation status and expiration handling.
```

Before implementing 9.9:

```text
Review admin architecture.
Review calendar_blocks schema and soft-delete/unlock behavior.
Decide between materialized blocks and dynamic overrides.
Document the decision before writing code.
```
