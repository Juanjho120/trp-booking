# 71 — Admin Preparation Buffer Settings and Auditable Overrides

## Phase

```text
Phase: Phase 9 — Tilopay Sandbox Integration
Subphase: 9.9 Admin preparation buffer settings and manual unlock behavior
Status: Completed
Next subphase: 9.10 Phase 9 documentation update and closure
```

## Goal

Add a protected admin layer for preparation-buffer configuration and individual-day unlocks while keeping direct-reservation buffers dynamic.

The implementation must not release reservation stay dates, materialize every direct buffer, send email, change guest dates, or add PMS behavior.

## Design Decision

Phase 9.9 selects:

```text
Option B — Dynamic preparation buffers plus auditable override records
```

Direct-reservation preparation buffers continue to be calculated from:

```text
Reservation.checkInDate
Reservation.checkOutDate
Property.preparationDaysBefore
Property.preparationDaysAfter
```

The project does not create a normal `PREPARATION_BUFFER` row for every confirmed reservation or pending hold.

## Override Representation

An unlocked direct-reservation preparation day is persisted as a one-day `CalendarBlock` record:

```text
source = PREPARATION_BUFFER
propertyId = reservation.propertyId
reservationId = confirmed reservation id
startDate = unlocked date
endDate = unlocked date + 1 day
isAdminOverrideAllowed = true
unlockedByAdminAt = unlock timestamp
unlockedByAdminId = authenticated admin user id
adminOverrideReason = required admin reason
```

This row represents an exception to a dynamic buffer. It is not an active blocking range.

The existing `CalendarBlock` fields are sufficient, so Phase 9.9 does not require a Prisma schema change or migration.

## Partial Unlock Behavior

Overrides are evaluated as half-open date ranges.

When a dynamic buffer contains an override range, the availability service subtracts only the overlapping portion.

Example:

```text
Dynamic buffer: [2026-08-20, 2026-08-22)
Unlocked day:   [2026-08-20, 2026-08-21)
Effective block:[2026-08-21, 2026-08-22)
```

This prevents a one-day override from suppressing the complete before-check-in or after-check-out buffer.

## Availability Rules

The effective direct-reservation buffer is:

```text
Dynamic buffer calculated from the current Property settings
minus same-reservation PREPARATION_BUFFER override/materialized ranges
```

Rules preserved:

```text
CONFIRMED reservations block stay dates and effective preparation buffers.
Active PENDING_PAYMENT holds block stay dates and dynamic preparation buffers.
Pending holds do not receive persisted override rows.
Expired pending holds do not block availability.
An override never releases the reservation stay.
Composed-listing dependency rules continue to apply.
Other reservations and calendar blocks can still keep an overridden date unavailable.
```

## iCal Consistency

The iCal export applies the same subtraction rule for confirmed direct reservations. Airbnb import sync also reads the current Property preparation values when creating or refreshing imported preparation blocks.

Therefore, once an operational `ExternalCalendar` exists:

```text
A confirmed stay remains exported.
Effective preparation buffers remain exported.
An admin-unlocked direct buffer day is omitted from the dynamic buffer export.
Pending holds remain excluded from iCal.
Other blocking sources can still export the same date as unavailable.
```

End-to-end iCal validation remains deferred until real external-calendar configuration and tokens exist. Phase 9.9 changes the calculation path but does not create `external_calendars` data or connect real Airbnb listings.

## Admin Configuration

The protected admin page allows values from 0 through 30 for:

```text
Property.preparationDaysBefore
Property.preparationDaysAfter
```

Existing defaults remain:

```text
black-white-apartment: 1 / 1
perfect-retreat-bungalow: 2 / 2
complete-retreat: 2 / 2
```

Configuration changes take effect dynamically for confirmed reservations and active pending holds.

## Auditability

The authenticated admin email is resolved to a `User` record with role `ADMIN`.

Configuration changes create an `AdminAuditLog` entry:

```text
action = PROPERTY_PREPARATION_BUFFER_UPDATED
entityType = Property
entityId = property id
metadata = actor email plus before/after values
```

Day unlocks create an `AdminAuditLog` entry:

```text
action = PREPARATION_BUFFER_DAY_UNLOCKED
entityType = CalendarBlock
entityId = override row id
metadata = reservation, property, date, buffer kind, reason, actor email
```

The override row also retains the unlock timestamp, admin user, and reason.

## Protected API

```text
GET   /api/admin/preparation-buffers
PATCH /api/admin/preparation-buffers
POST  /api/admin/preparation-buffers/unlock
```

All routes require an authenticated session with role `ADMIN`.

Requests are validated with Zod. API responses return safe error codes; localized UI text comes from `messages/es.ts` and `messages/en.ts`.

## UI Boundaries

The admin UI can:

```text
Review and update preparation days per accommodation.
Review future preparation days for confirmed direct reservations.
Enter a required reason and unlock one preparation day.
See who unlocked a day, when, and why.
```

The admin UI cannot:

```text
Confirm or cancel a reservation.
Release reservation stay dates.
Change guest reservation dates.
Create pending-hold overrides.
Process refunds.
Send emails.
Configure real Airbnb iCal connections.
Perform PMS operations.
```

## Implemented Files

```text
types/admin-preparation-buffer-management.ts
lib/admin/preparation-buffer-management.ts
lib/admin/index.ts
lib/availability/rules.ts
lib/availability/service.ts
lib/airbnb-ical/export-feed.ts
lib/airbnb-ical/sync-service.ts
app/api/admin/preparation-buffers/route.ts
app/api/admin/preparation-buffers/unlock/route.ts
app/admin/page.tsx
features/admin/components/admin-preparation-buffer-management.tsx
features/admin/components/admin-reservation-payment-review-shell.tsx
features/admin/index.ts
messages/es.ts
messages/en.ts
docs/71-admin-preparation-buffer-settings-and-overrides.md
```

## Manual Validation

### Settings

1. Open `/admin` with an authorized account.
2. Change one accommodation from its current values to another valid 0–30 combination.
3. Confirm the public calendar immediately reflects the new buffer range.
4. Confirm a `PROPERTY_PREPARATION_BUFFER_UPDATED` audit entry contains before/after values.
5. Restore the intended operational setting after the test.

### One-day override

1. Use a future `CONFIRMED` reservation with at least two buffer days on one side.
2. Unlock only one displayed preparation day and enter a reason.
3. Confirm the selected day disappears from that reservation's effective buffer.
4. Confirm the other buffer day remains unavailable.
5. Confirm the reservation stay dates remain unavailable.
6. Confirm the override row contains `reservation_id`, `unlocked_by_admin_at`, `unlocked_by_admin_id`, and `admin_override_reason`.
7. Confirm an audit entry with action `PREPARATION_BUFFER_DAY_UNLOCKED` exists.

### Composed listing

1. Unlock one buffer day from an individual accommodation reservation.
2. Confirm the override also removes that dynamic dependency from `complete-retreat`.
3. Confirm another independent block on the same day still keeps the composed listing unavailable.

### iCal

Do not create temporary `external_calendars` rows only for this phase. Validate the shared subtraction logic now and perform the real iCal end-to-end test when external-calendar operational configuration is implemented.

## Commands

```powershell
npm run db:generate
npm run db:validate
npm run lint
npm run build
```
