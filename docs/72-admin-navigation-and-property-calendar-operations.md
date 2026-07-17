# 72 — Admin Navigation and Property Calendar Operations

## Phase

```text
Phase: Phase 9 — Tilopay Sandbox Integration
Subphase: 9.9.1 Admin navigation and property calendar operations
Status: In progress until local build and manual validation pass
Base commit: 88aeae3596f2a511acf3125773089b20055e53ff
Next subphase: 9.10 Phase 9 documentation update and closure
```

## Goal

Replace the vertically growing combined admin page with scalable module routes and provide a host-oriented property calendar for reviewing effective occupancy, adding independent manual blocks, releasing manual dates, and managing preparation-buffer exceptions.

The implementation must remain a direct-booking admin, not a PMS.

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

New manual ranges cannot overlap an active blocker. Adjacent active manual ranges for the same property are normalized into one range. Releasing a single day:

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

Phase 9.9.1 supports:

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

Reservation and payment pages use server-side pagination with 20 records per page. Search, accommodation, and status controls share one responsive filter row; accommodation and status use styled design-system selects.

## Superseded Files

The following files belong to the old combined-page architecture and must be removed when applying this delivery:

```text
features/admin/components/admin-reservation-payment-review-shell.tsx
features/admin/components/admin-preparation-buffer-management.tsx
features/admin/components/minimal-admin-shell.tsx
lib/admin/reservation-payment-review.ts
types/admin-reservation-payment-review.ts
```

Keeping them would leave two admin architectures and unused business/query code in the repository.

## Admin Feedback

Successful calendar and accommodation-setting mutations render a fixed admin snackbar that dismisses automatically after four seconds and can also be closed manually. Error feedback remains inline and persistent so operational failures are not missed.

## Security and Boundaries

```text
All admin routes remain protected by Auth.js role ADMIN.
All mutations validate payloads with Zod.
Provider/card payloads are never exposed.
No manual reservation confirmation is added.
No cancellation, refund, date-change, email, or PMS operation is added.
No hard deletion of calendar or audit history is added.
No new dependency or Prisma migration is required.
Visible copy remains centralized in messages/es.ts and messages/en.ts.
```

## Manual Validation

### Navigation and loading boundaries

1. Open `/admin` and confirm it shows only the compact dashboard and upcoming arrivals.
2. Navigate through the responsive sidebar to Reservations, Payments, Calendar, and Accommodations.
3. Confirm the active navigation item is highlighted.
4. On mobile, confirm the sidebar opens as a styled sheet and closes after navigation.
5. Confirm ES/EN switching updates every admin module.

### Reservations

1. Search by guest name, email, and reservation ID.
2. Filter by each accommodation and status.
3. Confirm clearing filters returns the unfiltered first page.
4. With more than 20 records, confirm previous/next pagination preserves active filters.

### Payments and SDK events

1. Switch between Payments and Events SDK.
2. Search by order/reference, transaction, reservation, guest, and safe SDK message as applicable.
3. Filter payments by property and status.
4. Confirm safe diagnostics never show card number, CVV, expiration, or tokenized card data.
5. Confirm pagination preserves the selected view and filters.

### Accommodation settings

1. Open `/admin/accommodations`.
2. Change one preparation policy, save it, and confirm the public calendar reflects it.
3. Confirm `PROPERTY_PREPARATION_BUFFER_UPDATED` records before/after values.
4. Restore the intended policy.

### Manual calendar blocks

1. Select an accommodation and a fully available future range.
2. Create the block without a note and confirm the success snackbar dismisses automatically.
3. Confirm the selected property and composed dependent listings become unavailable.
4. Confirm dates occupied by a direct reservation, active hold, Airbnb block, manual block, maintenance block, or preparation buffer cannot be selected in range mode.
5. Attempt to span an unavailable day between two available dates and confirm the range is rejected.
6. Submit a stale or conflicting range directly to the API and confirm it returns `ADMIN_CALENDAR_RANGE_UNAVAILABLE`.
7. Create an adjacent available range and confirm effective manual coverage is normalized.
8. Release one day in the middle of a multi-day manual block.
9. Confirm the released day is available only when no other blocker applies, and the days on both sides remain manually blocked.
10. Confirm audit rows exist for creation and release.

### Preparation buffers

1. Use a future confirmed reservation with at least two buffer days.
2. Unlock one buffer day without a note.
3. Confirm the selected day is removed only from that buffer and the stay remains blocked.
4. Confirm another independent blocker still keeps the date unavailable.
5. Restore the override and confirm the preparation buffer becomes effective again.
6. Confirm unlock and restore audit rows.
7. When imported Airbnb data is operational later, repeat with an admin-unlockable persisted imported buffer.

### Composed listing

1. Block an individual accommodation and confirm Refugio Completo inherits the block.
2. Block Refugio Completo and confirm both individual accommodations inherit it.
3. Confirm inherited entries show their origin accommodation and are read-only from the receiving calendar.

## Validation Commands

```powershell
npm run db:generate
npm run db:validate
npm run lint
npm run build
git diff --check
git status
```
