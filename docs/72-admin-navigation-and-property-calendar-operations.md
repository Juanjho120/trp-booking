# 72 — Admin Navigation and Property Calendar Operations

## Phase

```text
Phase: Phase 9 — Tilopay Sandbox Integration
Subphase: 9.9.1 Admin navigation and property calendar operations
Status: Completed
Closure base commit: 497ae635c69c6267c383ecd134847b64ab7caacf
Next phase: Phase 10 — Email Notifications
```

## Goal

Replace the vertically growing combined admin page with scalable module routes and provide a host-oriented property calendar for reviewing effective occupancy, adding manual blocks only on available ranges, releasing manual dates, and managing preparation-buffer exceptions.

The implementation remains a direct-booking admin, not a PMS.

## Admin Information Architecture

```text
/admin                 Compact dashboard and upcoming arrivals
/admin/reservations    Search, property/status filters, pagination
/admin/payments        Payments and SDK-event views, search, filters, pagination
/admin/calendar        Property occupancy calendar and date operations
/admin/accommodations  Preparation policy by accommodation
```

`app/admin/layout.tsx` owns authorization and renders a responsive sidebar. Each page loads only the data required by its module.

The sidebar applies the target active state immediately when clicked. `app/admin/loading.tsx` renders a content skeleton while the destination page completes its dynamic Prisma query, so navigation feedback is immediate without caching stale operational data.

## Calendar Model

The calendar renders a 42-day month grid for one selected accommodation and uses the existing availability service as the source of truth.

Displayed sources:

```text
DIRECT_RESERVATION
PENDING_PAYMENT
AIRBNB
MANUAL_BLOCK
MAINTENANCE
COMPOSED_LISTING_DEPENDENCY
PREPARATION_BUFFER
PREPARATION_BUFFER_OVERRIDE
```

Each entry includes its origin accommodation. Entries inherited through Refugio Completo dependency rules are visible but cannot be edited from the receiving accommodation.

## Action Matrix

| Effective source | Admin action |
| --- | --- |
| Available future date | Add a manual block |
| Any future date already blocked by another source | Not selectable for a new manual block |
| Manual block from selected accommodation | Release one selected day |
| Direct confirmed preparation buffer | Unlock one day |
| Persisted admin-unlockable preparation buffer | Unlock one day |
| Preparation override | Restore the buffer |
| Confirmed reservation stay | Read-only |
| Active pending-payment stay/buffer | Read-only |
| Airbnb booking block | Read-only |
| Inherited block from another accommodation | Read-only from the selected accommodation |
| Past date | Read-only |

A day remains unavailable while any effective blocking source remains. Manual range selection accepts only contiguous dates whose effective blocking count is zero. The server repeats the same availability check before persisting the block so stale UI cannot create a redundant or conflicting manual block.

## Manual Block Persistence

Manual blocks use the existing `CalendarBlock` model:

```text
source = MANUAL_BLOCK
propertyId = selected accommodation
startDate = inclusive range start
endDate = exclusive range end
reason = optional internal note
isAdminOverrideAllowed = true
deletedAt/deletedById = soft-delete history
```

New manual ranges cannot overlap an active blocker. Adjacent active manual ranges for the same property are normalized into one range.

Releasing a single day:

1. Soft-deletes the original block.
2. Creates a left replacement range when dates remain before the released day.
3. Creates a right replacement range when dates remain after the released day.
4. Writes an `AdminAuditLog` entry.

Audit actions:

```text
MANUAL_CALENDAR_BLOCK_CREATED
MANUAL_CALENDAR_BLOCK_DAY_RELEASED
```

## Preparation Buffer Operations

The normal direct-reservation buffer remains dynamic.

One-day unlock records continue to use `PREPARATION_BUFFER` rows with `unlockedByAdminAt` populated. The internal note is optional.

Supported relationships:

```text
Direct dynamic buffers linked by reservationId
Persisted imported/admin-unlockable buffers linked by reservationId or externalCalendarEventId + parentBlockId
PREPARATION_BUFFER_DAY_UNLOCKED audit entries
PREPARATION_BUFFER_DAY_RESTORED audit entries
Soft-delete restore behavior so the source buffer becomes effective again
```

Reservation stay dates are never released by a preparation override.

## Availability and iCal Consistency

`lib/availability/service.ts` and `lib/airbnb-ical/export-feed.ts` apply the same relationship-aware subtraction:

```text
active preparation buffer minus matching unlocked override ranges
```

For direct dynamic buffers, matching uses `reservationId`.

For persisted imported buffers, matching uses the source relation so an override cannot suppress an unrelated buffer.

The real Airbnb iCal end-to-end test remains deferred until operational `external_calendars` rows, import URLs, and export tokens exist.

## Search, Filters, and Pagination

```text
Reservations: guest name, guest email, reservation ID, property, status
Payments: payment ID, order/reference, provider transaction, reservation, guest, property, status
SDK events: payment ID, reservation ID, guest, safe SDK message, property
Calendar: guest, reservation, note, origin accommodation
```

Reservation and payment pages use server-side pagination with 20 records per page. Search, accommodation, and status controls share one responsive filter row.

Accommodation and status controls use the shared Radix design-system selector so the closed control and opened option panel are consistently styled.

## Select Component Contract

Visible select menus use `components/ui/select.tsx`, built on the installed Radix UI package and project Tailwind tokens.

Admin reservation/payment filters:

```text
- Keep server-rendered GET filtering and shareable URLs.
- Keep Radix uncontrolled with the applied query value as its keyed default.
- Synchronize changes into hidden form inputs.
- Use a non-empty internal all-options sentinel because Radix reserves the empty string for clearing selection.
```

Tilopay checkout and retry:

```text
- Render the Radix selector as the only visible payment-method control.
- Preserve the SDK-required field with id/name tlpy_payment_method inside payFormTilopay.
- Keep the technical native field hidden and synchronized.
- Dispatch a bubbling change event when the visible selection changes.
- Ignore empty or unsupported technical values so a valid visible selection is not cleared.
- Keep the normal checkout outside the reservation quote form.
- Reuse TilopaySdkCheckout for both normal checkout and retry.
```

`components/ui/native-select.tsx` was superseded and removed. No new dependency was required.

## Accepted Card Indicators

The shared checkout displays fixed acceptance indicators below the card-number input for:

```text
Visa
Mastercard
American Express
```

The list is informational and bilingual through `messages/es.ts` and `messages/en.ts`.

The existing dynamic brand detection remains separate: `Tilopay.getCardType()` continues to update the brand indicator shown inside the card-number field.

No external image dependency and no card-data handling were introduced.

## Admin Feedback

Successful calendar and accommodation-setting mutations render a fixed admin snackbar that dismisses automatically after four seconds and can also be closed manually.

Error feedback remains inline and persistent so operational failures are not missed.

## Superseded Architecture

The old combined-page files were removed so the repository contains only one admin architecture:

```text
features/admin/components/admin-reservation-payment-review-shell.tsx
features/admin/components/admin-preparation-buffer-management.tsx
features/admin/components/minimal-admin-shell.tsx
lib/admin/reservation-payment-review.ts
types/admin-reservation-payment-review.ts
components/ui/native-select.tsx
```

## Security and Boundaries

```text
All admin routes remain protected by Auth.js role ADMIN.
All mutations validate payloads with Zod.
Provider/card payloads are never exposed.
No manual reservation confirmation is added.
No cancellation, refund, date-change, email, or PMS operation is added.
No hard deletion of calendar or audit history is added.
No new dependency or Prisma migration was required.
Visible copy remains centralized in messages/es.ts and messages/en.ts.
```

## Accepted Validation

The implementation was accepted after local build and manual verification of:

```text
- Admin navigation and loading feedback
- Reservation/payment search, filters, and pagination
- Styled Radix select panels
- Normal Tilopay checkout
- Retry Tilopay checkout
- Hidden technical payment-method synchronization
- Visa/Mastercard/American Express indicators
- Admin snackbars
- Property calendar manual block creation/release
- Preparation-buffer unlock/restore
- Composed-listing inheritance
```

## Regression Checklist

### Navigation and modules

1. Open `/admin` and confirm it shows only the compact dashboard and upcoming arrivals.
2. Navigate to Reservations, Payments, Calendar, and Accommodations.
3. Confirm active navigation feedback and the route skeleton.
4. Confirm the responsive sidebar and ES/EN switching.

### Reservations and payments

1. Search and filter by supported fields.
2. Open every selector and verify the design-system panel.
3. Confirm clearing filters returns the unfiltered first page.
4. Confirm pagination preserves active filters and selected payment/event view.
5. Confirm safe diagnostics never expose card data.

### Tilopay checkout

1. Prepare a normal pending-reservation checkout.
2. Confirm the visible payment-method selector opens and the technical field is synchronized.
3. Confirm accepted-card indicators appear below the card-number field.
4. Repeat on `/reservas/pago/reintentar`.
5. Complete sandbox happy-path and retryable-error checks.

### Manual calendar blocks

1. Create a manual block across a fully available future range.
2. Confirm occupied/blocker dates cannot be selected.
3. Confirm a range cannot cross an unavailable day.
4. Confirm stale conflicting API submission returns `ADMIN_CALENDAR_RANGE_UNAVAILABLE`.
5. Release one day and verify range splitting plus audit history.

### Preparation buffers

1. Unlock one confirmed-reservation buffer day.
2. Confirm the stay remains blocked.
3. Confirm another independent blocker still keeps the date unavailable.
4. Restore the override and verify the buffer becomes effective again.
5. Confirm unlock/restore audit rows.

### Composed listing

1. Block an individual accommodation and confirm Refugio Completo inherits the block.
2. Block Refugio Completo and confirm both individual accommodations inherit it.
3. Confirm inherited entries show origin accommodation and remain read-only from the receiving calendar.

## Validation Commands

```powershell
npm run db:generate
npm run db:validate
npm run lint
npm run build
git diff --check
git status
```
