# 07 — Airbnb iCal Sync

## Purpose

TRP Booking must stay synchronized with Airbnb calendars to avoid overbooking.

The system must:

```text
Import Airbnb availability into TRP Booking
Export TRP Booking reservations to Airbnb
Allow manual sync from admin
Run scheduled sync every 30 minutes
Respect automatic preparation buffer blocks
```

## Reservable Listings

```text
Apartamento Blanco y Negro
Bungalow Refugio Perfecto
Refugio Completo
```

`Refugio Completo` is a composed listing that includes both individual accommodations.

## Import Direction

```text
Airbnb -> TRP Booking
```

Each Airbnb listing provides an iCal export URL.

Important:

- These URLs include tokens.
- They must not be committed to the repository.
- They must not be placed in public documentation.
- They should be stored privately through admin configuration, encrypted database storage, or secure environment configuration.

## Export Direction

```text
TRP Booking -> Airbnb
```

TRP Booking must generate an iCal export URL per listing so Airbnb can import direct reservations and block the corresponding dates.

Suggested endpoint:

```text
/api/ical/[token]
```

Requirements:

```text
Use unguessable tokens
Export only unavailable reservation/block dates
Do not expose admin data
Return valid text/calendar content
```

## Scheduled Sync

Production scheduler:

```text
Vercel Pro Cron
Every 30 minutes
```

Endpoint:

```text
/api/cron/sync-airbnb-calendars
```

Security:

```text
Must validate CRON_SECRET
Must log sync results
Must not expose raw tokens in logs
```

## Manual Sync

Admin panel must include a button:

```text
Force Airbnb Sync
```

It should:

```text
Run sync for all active external calendars
Show success or error summary
Update lastSyncedAt
Create admin audit log
```

## Availability Rules

### Direct Reservation for Apartment

```text
Reserve Apartamento Blanco y Negro
-> Block Apartamento Blanco y Negro
-> Block Refugio Completo
```

### Direct Reservation for Bungalow

```text
Reserve Bungalow Refugio Perfecto
-> Block Bungalow Refugio Perfecto
-> Block Refugio Completo
```

### Direct Reservation for Complete Listing

```text
Reserve Refugio Completo
-> Block Refugio Completo
-> Block Apartamento Blanco y Negro
-> Block Bungalow Refugio Perfecto
```

## Airbnb Import Rules

### Airbnb Apartment Occupied

```text
Airbnb event for Apartamento Blanco y Negro
-> Block Apartamento Blanco y Negro
-> Block Refugio Completo
```

### Airbnb Bungalow Occupied

```text
Airbnb event for Bungalow Refugio Perfecto
-> Block Bungalow Refugio Perfecto
-> Block Refugio Completo
```

### Airbnb Complete Listing Occupied

```text
Airbnb event for Refugio Completo
-> Block Refugio Completo
-> Block Apartamento Blanco y Negro
-> Block Bungalow Refugio Perfecto
```


## Preparation Buffer Blocks

Preparation buffer blocks must be applied to confirmed direct reservations and imported Airbnb bookings.

Initial rules:

```text
Apartamento Blanco y Negro: 1 day before and 1 day after
Bungalow Refugio Perfecto: 2 days before and 2 days after
Refugio Completo: 2 days before and 2 days after
```

Preparation buffer blocks must be treated as unavailable dates in TRP Booking.

They must also be included in exported TRP Booking iCal feeds so Airbnb can block those days as unavailable.

Admin users can manually unlock preparation buffer days when operationally convenient. Once unlocked, those dates should become available again unless another reservation, Airbnb event, manual block, maintenance block, or composed listing dependency still blocks them.

Manual unlocks must be audited and should trigger or affect the next exported iCal feed.

## Availability Check Timing

Availability must be checked:

```text
When displaying dates
Before creating pending reservation
Before starting payment
When receiving payment webhook
Before confirming reservation
```

## Pending Reservation Holds

When a guest starts checkout, create a `PENDING_PAYMENT` reservation that temporarily holds the dates.

Recommended expiration:

```text
15 minutes
```

If payment is not completed in time, the reservation expires and dates become available again.

## Sync Logs

Track:

```text
Sync start time
Sync end time
Calendar processed
Events imported
Events removed or no longer present
Preparation buffer blocks created or updated
Preparation buffer blocks manually unlocked
Errors
lastSyncedAt
```

## iCal Limitations

Airbnb iCal synchronization is not always instant. The system must be designed to reduce risk:

```text
Use frequent import sync every 30 minutes
Allow manual sync
Create temporary holds during checkout
Re-check availability before confirmation
Export direct reservations and preparation buffer blocks to Airbnb as soon as confirmed
```
