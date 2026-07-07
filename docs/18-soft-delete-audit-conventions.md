# 18 — Soft Delete and Audit Conventions

This document closes Phase 3.4 and defines the official soft delete, hard delete, retention, and audit conventions for TRP Booking.

## Phase

```text
Phase: Phase 3 — Database Foundation
Subphase completed by this document: 3.4 Soft delete and audit field conventions
Next subphase: 3.5 Initial seed strategy for accommodations, amenities, rules, and static content
```

## Goal

TRP Booking will handle reservations, payments, refunds, calendar availability, imported Airbnb calendar data, guest data, and admin actions.

Because of that, deletion behavior must be explicit.

The project must preserve historical consistency for:

```text
Reservation history
Payment history
Refund history
Calendar availability history
Airbnb sync troubleshooting
Email notification history
Admin audit history
```

## General Rule

```text
Do not hard-delete business-critical data.
```

Admin-facing delete actions must use soft delete unless this document explicitly allows hard delete for a table or relationship.

## Soft Delete Fields

Soft-deletable tables should use:

```text
deletedAt
deletedById
```

Optional admin reason fields may be added later only when the use case requires it.

Current Prisma schema already includes these fields where needed.

## Tables Requiring Soft Delete

These tables represent admin-managed records that may need to disappear from normal UI while preserving historical consistency:

```text
Property
PropertyImage
Amenity
HouseRule
ExternalCalendar
CalendarBlock
```

Expected behavior:

```text
deletedAt != null means the record should not appear in normal public or admin listing views.
deletedById should point to the admin user who performed the action when available.
Soft-deleted records should remain available for audit, troubleshooting, historical reservations, and sync diagnostics.
```

## Tables That Must Not Be Hard-Deleted

These records are operational, financial, or historical.

Application code must not call hard delete for:

```text
Reservation
ReservationGuest
Payment
Refund
ExternalCalendarEvent
ExternalCalendarSyncLog
EmailNotification
AdminAuditLog
```

Status transitions must be used instead of deletion.

Examples:

```text
Reservation -> CANCELLED / EXPIRED / REFUNDED / PARTIALLY_REFUNDED
Payment -> FAILED / REJECTED / REFUNDED / PARTIALLY_REFUNDED
Refund -> FAILED / APPROVED / MANUAL
EmailNotification -> FAILED / SKIPPED / SENT
```

## Join Tables and Relationship Tables

Relationship tables can use cascade or direct delete when they only represent a current association and do not carry independent business history.

Current relationship tables:

```text
PropertyComponent
PropertyAmenity
PropertyRule
```

Allowed behavior:

```text
PropertyComponent can be changed when composed listing structure changes, but the action must be audited.
PropertyAmenity can be changed when amenities are assigned or removed, but the action should be auditable when done from admin UI.
PropertyRule can be changed when rules are assigned or removed, but the action should be auditable when done from admin UI.
```

Important:

```text
Deleting a relationship must not delete the referenced Property, Amenity, or HouseRule.
```

## Property Image Deletion

`PropertyImage` is soft-deleted in the database.

Cloudinary physical deletion is intentionally deferred to the Cloudinary phase.

Final behavior should be:

```text
Admin removes image from listing.
System marks PropertyImage.deletedAt.
Image disappears from public UI.
Cloudinary asset deletion may be performed only when the Cloudinary phase defines safe behavior.
```

Do not assume Cloudinary hard delete exists before Phase 5.

## Calendar Block Deletion

`CalendarBlock` uses soft delete.

Special case: preparation buffers.

Preparation buffer blocks must not disappear silently.

When an admin unlocks a preparation buffer:

```text
deletedAt may be set if the block is no longer active.
unlockedByAdminAt must be set.
unlockedByAdminId should be set when an admin user exists.
adminOverrideReason should be captured when possible.
AdminAuditLog must record the operation.
```

The original block remains useful for understanding why the date was blocked and why it became available again.

## External Calendar Records

`ExternalCalendar` uses soft delete because it may contain provider configuration and historical sync relationships.

`ExternalCalendarEvent` and `ExternalCalendarSyncLog` must not be hard-deleted from application workflows because they are needed for:

```text
Airbnb iCal sync troubleshooting
Availability dispute review
Calendar block traceability
Historical import diagnostics
```

If data retention cleanup is ever needed later, it must be a separate explicit maintenance task with documentation.

## Reservation Date Changes and Stay Extensions

Confirmed reservation dates must not be changed without an audit trail.

Any admin-approved date change or stay extension must create an `AdminAuditLog` entry.

Required audit metadata should include safe values such as:

```text
previousCheckInDate
previousCheckOutDate
newCheckInDate
newCheckOutDate
previousTotal
newTotal
additionalAmountRequired
additionalAmountPaidOrRecorded
reason
```

Do not include secrets or unnecessary sensitive guest data in audit metadata.

## Critical Actions Requiring AdminAuditLog

The following actions must be audited:

```text
Cancel reservation
Change reservation dates
Approve stay extension
Issue refund
Record manual refund
Change property price
Change property status
Change iCal configuration
Force calendar sync
Create manual calendar block
Update manual calendar block
Soft-delete calendar block
Unlock preparation buffer
Soft-delete property
Soft-delete property image
Soft-delete amenity
Soft-delete house rule
Change composed listing relationships
Change property amenity assignments
Change property rule assignments
```

Audit log fields:

```text
userId
action
entityType
entityId
metadata
createdAt
```

`metadata` must contain only safe operational context.

## Forbidden Patterns

Do not implement:

```text
prisma.reservation.delete(...)
prisma.payment.delete(...)
prisma.refund.delete(...)
prisma.externalCalendarEvent.delete(...)
prisma.externalCalendarSyncLog.delete(...)
prisma.emailNotification.delete(...)
prisma.adminAuditLog.delete(...)
```

Do not expose destructive hard delete actions for these records in the admin UI.

## Allowed Cleanup

The following cleanup is allowed only when documented:

```text
Expired pending reservations may transition to EXPIRED.
Temporary non-business records may be removed if introduced later and explicitly documented.
Old logs may be archived only through a documented retention task.
```

No retention cleanup is part of Phase 3.4.

## Phase 3.4 Schema Review Result

No Prisma schema change was required in Phase 3.4.

The Phase 3.3 schema already includes:

```text
deletedAt / deletedById on Property
deletedAt / deletedById on PropertyImage
deletedAt / deletedById on Amenity
deletedAt / deletedById on HouseRule
deletedAt / deletedById on ExternalCalendar
deletedAt / deletedById on CalendarBlock
AdminAuditLog
Preparation buffer unlock fields on CalendarBlock
```

## Validation

After applying this documentation update, run:

```powershell
npm run db:validate
npm run env:validate
npm run lint
npm run build
```
