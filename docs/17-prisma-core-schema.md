# 17 — Prisma Core Schema

This document describes the Phase 3.3 initial Prisma schema for the TRP Booking core booking domain.

## Phase

```text
Phase: Phase 3 — Database Foundation
Subphase completed by this document: 3.3 Initial Prisma schema for core booking domain
Next subphase: 3.4 Soft delete and audit field conventions
```

## Goal

Phase 3.3 adds the first Prisma model structure for the core booking domain.

It converts the documented database entities from `docs/04-database-model.md` into a first Prisma schema that can be validated before migrations are created.

## Important Boundary

Phase 3.3 does not create or apply migrations.

It only updates:

```text
prisma/schema.prisma
```

Migrations will be created after the schema is reviewed and the soft delete / audit conventions are confirmed.

## Models Added

```text
User
Property
PropertyComponent
PropertyImage
Amenity
PropertyAmenity
HouseRule
PropertyRule
Reservation
ReservationGuest
Payment
Refund
CalendarBlock
ExternalCalendar
ExternalCalendarEvent
ExternalCalendarSyncLog
EmailNotification
AdminAuditLog
Setting
```

## Enums Added

```text
UserRole
PropertyStatus
ReservationStatus
PaymentProvider
PaymentStatus
RefundStatus
CalendarBlockSource
ExternalCalendarProvider
ExternalCalendarStatus
CalendarSyncTriggeredBy
CalendarSyncStatus
EmailNotificationType
EmailNotificationStatus
```

## Property Composition

`PropertyComponent` supports composed listings.

Initial business rule:

```text
Refugio Completo -> Apartamento Blanco y Negro
Refugio Completo -> Bungalow Refugio Perfecto
```

The schema allows this relationship without treating the composed listing as a separate physical unit.

## Preparation Buffer Support

`Property` includes:

```text
preparationDaysBefore
preparationDaysAfter
```

`CalendarBlock` supports:

```text
source = PREPARATION_BUFFER
isAdminOverrideAllowed
unlockedByAdminAt
unlockedByAdminId
adminOverrideReason
```

This supports the documented rules:

```text
Apartamento Blanco y Negro: 1 day before and 1 day after
Bungalow Refugio Perfecto: 2 days before and 2 days after
Refugio Completo: 2 days before and 2 days after
```

## Audit Foundation

The schema includes:

```text
AdminAuditLog
```

This model is intended for critical admin operations such as:

```text
Cancel reservation
Change reservation dates
Approve stay extension
Issue refund
Change property price
Change iCal configuration
Force calendar sync
Block dates manually
Unlock preparation buffer
Delete images
```

## Data Retention

The schema includes soft delete fields on admin-managed business records where historical consistency matters.

Records related to reservations, payments, refunds, imported calendar events, sync logs, and audit logs are not designed for hard deletion.

Phase 3.4 will review and document these conventions more explicitly before migrations are created.

## Validation

After applying this phase, run:

```powershell
npm run db:validate
npm run env:validate
npm run lint
npm run build
```

Expected Prisma validation result:

```text
The schema at prisma\schema.prisma is valid
```
