# 04 — Database Model

## Overview

The database must support:

```text
Public accommodations
Composed listings
Images
Amenities
Rules
Reservations
Payments
Refunds
Manual blocks
External calendars
Airbnb iCal sync
Admin users
Email notifications
Audit/logging for critical operations
```

## Main Entities

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

## User

Admin user entity.

Suggested fields:

```text
id
name
email
role
createdAt
updatedAt
```

Initial role:

```text
ADMIN
```

## Property

Represents a reservable listing.

Suggested fields:

```text
id
nameEs
nameEn
slug
shortDescriptionEs
shortDescriptionEn
longDescriptionEs
longDescriptionEn
maxGuests
bedrooms
bathrooms
baseNightlyPrice
currency
status
checkInTime
checkOutTime
isComposed
createdAt
updatedAt
```

Suggested statuses:

```text
ACTIVE
INACTIVE
DRAFT
```

Initial records:

```text
Apartamento Blanco y Negro
Bungalow Refugio Perfecto
Refugio Completo
```

## PropertyComponent

Used when a listing is composed of other listings.

Example:

```text
Refugio Completo -> Apartamento Blanco y Negro
Refugio Completo -> Bungalow Refugio Perfecto
```

Suggested fields:

```text
id
parentPropertyId
componentPropertyId
createdAt
```

## PropertyImage

Suggested fields:

```text
id
propertyId
cloudinaryPublicId
url
secureUrl
altTextEs
altTextEn
sortOrder
isCover
createdAt
updatedAt
```

## Amenity

Suggested fields:

```text
id
nameEs
nameEn
icon
category
createdAt
updatedAt
```

## PropertyAmenity

Suggested fields:

```text
id
propertyId
amenityId
createdAt
```

## HouseRule

Suggested fields:

```text
id
titleEs
titleEn
descriptionEs
descriptionEn
category
createdAt
updatedAt
```

## PropertyRule

Suggested fields:

```text
id
propertyId
ruleId
createdAt
```

## Reservation

Suggested fields:

```text
id
propertyId
guestName
guestEmail
guestPhone
guestCountry
checkInDate
checkOutDate
arrivalTimeEstimate
guestCount
status
subtotal
cleaningFee
taxes
discounts
total
currency
expiresAt
confirmedAt
cancelledAt
createdAt
updatedAt
```

Suggested statuses:

```text
PENDING_PAYMENT
CONFIRMED
CANCELLED
REFUNDED
PARTIALLY_REFUNDED
EXPIRED
BLOCKED
```

Important:

- Dates must be validated on the server.
- Guest count must be validated against property capacity.
- Total must be calculated on the server.
- `arrivalTimeEstimate` is requested from the guest and later included as a reminder in confirmation emails.

- Confirmed reservation dates cannot be modified directly by guests.
- Admin-approved date changes or extensions must be availability-checked and audited.
- If a change increases the total, the additional payment must be collected or recorded before the updated dates are treated as confirmed.

## ReservationGuest

Optional if multiple guests need to be captured later.

Suggested fields:

```text
id
reservationId
name
email
phone
createdAt
updatedAt
```

For MVP, guest information can live directly in `Reservation`.

## Payment

Suggested fields:

```text
id
reservationId
provider
providerTransactionId
providerReference
status
amount
currency
paidAt
failedAt
rawPayload
createdAt
updatedAt
```

Suggested providers:

```text
TILOPAY
```

Suggested statuses:

```text
PENDING
APPROVED
REJECTED
FAILED
REFUNDED
PARTIALLY_REFUNDED
```

## Refund

Suggested fields:

```text
id
paymentId
providerRefundId
amount
currency
reason
status
rawPayload
createdAt
updatedAt
```

Suggested statuses:

```text
PENDING
APPROVED
FAILED
MANUAL
```

## CalendarBlock

Represents unavailable date ranges.

Suggested fields:

```text
id
propertyId
startDate
endDate
source
reason
reservationId
externalCalendarEventId
parentBlockId
isAdminOverrideAllowed
unlockedByAdminAt
unlockedByAdminId
adminOverrideReason
createdAt
updatedAt
```

Suggested sources:

```text
DIRECT_RESERVATION
AIRBNB
MANUAL_BLOCK
MAINTENANCE
COMPOSED_LISTING_DEPENDENCY
PREPARATION_BUFFER
```


### Preparation Buffer Blocks

Preparation buffer blocks are automatically generated unavailable date ranges around confirmed reservations and imported Airbnb bookings.

Initial buffer rules:

```text
Apartamento Blanco y Negro: 1 day before and 1 day after
Bungalow Refugio Perfecto: 2 days before and 2 days after
Refugio Completo: 2 days before and 2 days after
```

Preparation buffer records should use:

```text
source = PREPARATION_BUFFER
isAdminOverrideAllowed = true
```

If an admin manually unlocks a preparation buffer day, the system must keep the original record for auditability and set:

```text
unlockedByAdminAt
unlockedByAdminId
adminOverrideReason
```

Preparation buffer blocks must be included when calculating public availability and when exporting TRP Booking iCal feeds to Airbnb.

## ExternalCalendar

Stores external calendar configuration.

Suggested fields:

```text
id
propertyId
provider
name
importUrlEncrypted
exportToken
lastSyncedAt
status
createdAt
updatedAt
```

Important:

- Do not store raw iCal URLs with tokens in plaintext if avoidable.
- Do not expose iCal import URLs publicly.
- Export tokens must be unguessable.

Suggested provider:

```text
AIRBNB
```

Suggested statuses:

```text
ACTIVE
INACTIVE
ERROR
```

## ExternalCalendarEvent

Stores imported events from Airbnb iCal.

Suggested fields:

```text
id
externalCalendarId
providerEventUid
summary
startDate
endDate
rawPayload
createdAt
updatedAt
```


## ExternalCalendarSyncLog

Stores synchronization execution records for scheduled and manual Airbnb iCal imports.

Suggested fields:

```text
id
externalCalendarId
triggeredBy
status
startedAt
finishedAt
eventsImported
eventsRemoved
blocksCreated
blocksUpdated
errorCode
errorMessage
createdAt
```

Suggested `triggeredBy` values:

```text
CRON
ADMIN
SYSTEM
```

Suggested statuses:

```text
STARTED
SUCCESS
FAILED
PARTIAL_SUCCESS
```

Do not store full iCal URLs with tokens in sync logs.

## EmailNotification

Suggested fields:

```text
id
reservationId
type
recipient
locale
status
providerMessageId
sentAt
errorMessage
createdAt
updatedAt
```

Suggested types:

```text
RESERVATION_CONFIRMED
PAYMENT_APPROVED
PAYMENT_FAILED
RESERVATION_CANCELLED
RESERVATION_DATES_UPDATED
STAY_EXTENSION_CONFIRMED
REFUND_PROCESSED
ARRIVAL_INSTRUCTIONS
ADMIN_NEW_RESERVATION
```

## AdminAuditLog

Suggested fields:

```text
id
userId
action
entityType
entityId
metadata
createdAt
```

Use for critical admin actions:

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

## Setting

Suggested fields:

```text
id
key
value
createdAt
updatedAt
```

Settings can be used for operational configuration, but secrets should remain in environment variables or secure storage.

## Availability Model Notes

Availability must be calculated from:

```text
Confirmed direct reservations
Pending reservations that have not expired
Manual blocks
Imported Airbnb calendar blocks
Composed listing dependencies
Preparation buffer blocks
```

The system must prevent overlapping reservations and must re-check availability before payment and before confirming after payment webhook.


## Reservation Change and Extension Notes

For MVP, public self-service date modification is not supported.

Date changes are handled through admin authorization or cancellation plus a new reservation.

Rules:

```text
Confirmed reservation date changes must be admin-approved.
Availability must be checked again before approval.
Any additional cost must be paid or recorded before confirmation.
Any refund must follow the cancellation/refund policy.
All changes must be audited.
```

Stay extensions can be handled in one of two ways:

```text
Option A: update the existing reservation after availability and payment validation.
Option B: create a linked additional reservation for the extension dates.
```

The implementation should choose the simpler auditable option during the reservation phase.

## Soft Delete and Data Retention Policy

The project must not hard-delete operational, financial, reservation, payment, refund, or calendar history records.

Admin-facing deletion should use soft delete where historical consistency matters.

Recommended soft delete fields:

- deletedAt
- deletedById

Tables requiring soft delete:

- Property
- PropertyImage
- Amenity
- HouseRule
- ExternalCalendar
- CalendarBlock

Tables that must never be hard-deleted:

- Reservation
- ReservationGuest
- Payment
- Refund
- ExternalCalendarEvent
- ExternalCalendarSyncLog
