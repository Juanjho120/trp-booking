# 68 — Phase 9 Admin and Preparation Buffers Roadmap

## Status

Phase 9 roadmap completed and closed on 2026-07-17.

Closure implementation base commit:

```text
497ae635c69c6267c383ecd134847b64ab7caacf
```

## Purpose

This document records how Phase 9 separated payment validation, admin visibility, preparation buffers, admin overrides, scalable calendar operations, and the later Phase 10 email work into explicit boundaries.

## Final Phase 9 Roadmap

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
9.9.1 Admin navigation and property calendar operations — Completed
9.10 Phase 9 documentation update and closure — Completed
```

## Phase 9.7 — Admin Reservation and Payment Review

### Result

The protected admin area provides safe operational visibility into reservations, payments, Tilopay diagnostics, and SDK client events.

It does not provide manual confirmation, cancellation, refund, date-change, email, or PMS actions.

Admin copy and visible statuses remain localized through `messages/es.ts` and `messages/en.ts`.

## Phase 9.8 — Automatic Preparation Buffers in Availability

### Preparation buffer defaults

```text
Apartamento Blanco y Negro: 1 day before and 1 day after
Bungalow Refugio Perfecto: 2 days before and 2 days after
Refugio Completo: 2 days before and 2 days after
```

### Range convention

```text
Before check-in buffer: [checkInDate - daysBefore, checkInDate)
After check-out buffer: [checkOutDate, checkOutDate + daysAfter)
```

### Implemented behavior

```text
1. Active PENDING_PAYMENT reservation with expiresAt > now:
   - Blocks stay dates.
   - Blocks preparation buffers temporarily.

2. Expired PENDING_PAYMENT reservation:
   - Does not block stay dates.
   - Does not block preparation buffers.

3. PENDING_PAYMENT reservation with expiresAt = null:
   - Is not a valid active hold.
   - Does not block stay dates or buffers.

4. CONFIRMED reservation:
   - Blocks stay dates.
   - Blocks preparation buffers dynamically.

5. EXPIRED reservation:
   - Does not block stay dates or buffers.
```

### Technical decisions

```text
- Dynamic availability calculation remains the strategy.
- PENDING_PAYMENT buffers are not materialized in calendar_blocks.
- CONFIRMED direct-reservation buffers remain dynamic.
- Buffer values come from Property.preparationDaysBefore and Property.preparationDaysAfter.
- The composed-listing dependency graph remains active.
- Persisted PREPARATION_BUFFER rows suppress a direct dynamic buffer only when linked to the same source relation.
- Airbnb iCal exports exclude pending holds.
- Future Airbnb iCal exports include confirmed buffer calculations.
```

## Phase 9.9 — Admin Preparation Buffer Settings and Manual Unlock Behavior

### Final result

Phase 9.9 selected Option B:

```text
Dynamic direct-reservation buffers plus auditable override records
```

Implemented behavior:

```text
- Admin can configure daysBefore/daysAfter per accommodation from 0 through 30.
- Existing defaults remain 1/1, 2/2, and 2/2 until changed.
- Confirmed direct-reservation buffers remain dynamic.
- A one-day PREPARATION_BUFFER CalendarBlock records each manual unlock.
- The override is linked to its source and records admin, timestamp, and optional note.
- Availability subtracts only the override range from the matching buffer.
- Reservation stay dates remain blocked.
- Composed-listing behavior remains active.
- iCal export applies the same override subtraction when an operational feed exists.
- Property changes, unlocks, and restores create AdminAuditLog records.
```

Persistence decision:

```text
No dedicated override model was required.
The normal direct buffer is not materialized.
Only the exception is persisted in CalendarBlock.
```

Boundaries preserved:

```text
No pending-hold override rows
No release of reservation stay dates
No guest date changes
No confirmation/cancellation/refund actions
No emails
No PMS behavior
No Prisma migration
```

## Phase 9.9.1 — Admin Navigation and Property Calendar Operations

### Final result

```text
- Shared protected admin layout with responsive sidebar, optimistic active state, and route loading feedback.
- Compact dashboard with links to dedicated modules.
- Dedicated reservation and payment routes with server-side search, pagination, and fully styled Radix filters.
- Dedicated accommodation preparation-settings route.
- Property calendar scoped to one selected accommodation.
- Effective blockers show origin accommodation and composed-listing inheritance.
- MANUAL_BLOCK ranges are accepted only when every selected future date is available.
- Manual-block creation repeats availability validation server-side.
- Manual notes remain optional.
- Manual release uses soft deletion and preserves left/right range fragments.
- Direct dynamic and persisted imported preparation buffers support one-day unlock overrides.
- Overrides can be restored from the calendar.
- Reservation stays, active holds, Airbnb booking blocks, and inherited records remain read-only where appropriate.
- Successful mutations use auto-dismissing snackbars; errors remain inline.
- All writes preserve AdminAuditLog history.
```

Select and checkout decisions:

```text
- Visible selectors use components/ui/select.tsx based on Radix.
- Admin GET filters synchronize Radix values into hidden form inputs.
- Tilopay keeps the SDK-required tlpy_payment_method field hidden and synchronized.
- Empty or unsupported technical field changes do not clear a valid visible payment method.
- The normal pending-reservation checkout is isolated from the quote form.
- Normal checkout and retry checkout reuse TilopaySdkCheckout.
- Visa, Mastercard, and American Express acceptance indicators appear below the card-number field.
```

Debt-control decisions:

```text
- Reuse CalendarBlock for MANUAL_BLOCK records and PREPARATION_BUFFER overrides.
- Do not add a duplicate availability model.
- Do not materialize every direct-reservation buffer.
- Do not retain the old combined admin shell or list-based buffer architecture.
- No Prisma migration or new dependency was required.
```

## Phase 9.10 — Phase 9 Documentation Update and Closure

### Result

```text
- Phase 9.9.1 was accepted as completed.
- Official phase and progress trackers were moved to Phase 10.
- README and Phase 9 operational documents now reflect the final payment, retry, admin, select, calendar, and buffer behavior.
- A dedicated Phase 9 closure/handoff document was added.
- No code, migration, credentials, or visible application copy was introduced by 9.10.
```

## Deferred Operational iCal Work

The calculation path is consistent, but the real Airbnb iCal end-to-end test remains deferred because the project intentionally has no operational `ExternalCalendar` rows, raw export tokens, or real Airbnb import URLs yet.

This item belongs to production-readiness work and must be completed using secure configuration without committing secrets.

## Handoff to Phase 10

Phase 10 must remain focused on email notifications:

```text
- Resend provider/environment contract
- Bilingual templates
- Reservation confirmation delivery
- Minimum admin notification
- Idempotency and duplicate-send prevention
- Delivery auditability
- Safe failure handling
```

Phase 10 must not weaken payment-driven confirmation or introduce PMS behavior.
