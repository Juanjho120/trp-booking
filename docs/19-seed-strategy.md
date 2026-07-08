# 19 — Seed Strategy

This document originally closed Phase 3.5 and defined the initial seed strategy for accommodations, amenities, rules, and static content.

It has been updated after Phase 8.3.1 because the project now has a real Prisma seed script and DB-backed public accommodation reads.

## Phase

```text
Original phase: Phase 3 — Database Foundation
Original subphase: 3.5 Initial seed strategy for accommodations, amenities, rules, and static content
Implemented correction: Phase 8.3.1 Initial seed and DB-backed accommodation source
```

## Current Status

```text
The seed strategy is now implemented through prisma/seed.ts.
```

The seed script is deterministic and idempotent.

It can be run with:

```bash
npm run db:seed
```

## Seed Principles

Seed data must be:

```text
Deterministic
Idempotent
Safe to run multiple times
Aligned with Prisma unique keys
Free of secrets
Free of Airbnb iCal tokens
Free of provider credentials
```

A seed command must never create duplicate properties, amenities, house rules, or relationship rows.

## Seeded Tables

Phase 8.3.1 seeds:

```text
properties
property_components
property_images
amenities
property_amenities
house_rules
property_rules
```

The seed does not create:

```text
reservations
reservation_guests
payments
refunds
calendar_blocks
external_calendars
external_calendar_events
external_calendar_sync_logs
email_notifications
admin_audit_logs
settings
```

## Stable Keys and IDs

The seeded property IDs intentionally match the existing public accommodation IDs:

```text
black-white-apartment
perfect-retreat-bungalow
complete-retreat
```

This keeps the existing public contracts stable while the source of truth moves to the database.

Other stable keys:

```text
Property.slug
Amenity.key
HouseRule.key
Setting.key
```

## Property Seed Strategy

Seeded properties:

```text
Apartamento Blanco y Negro
Bungalow Refugio Perfecto
Refugio Completo
```

Mapping:

```text
nameEs/nameEn -> Property.nameEs/nameEn
slug -> Property.slug
shortDescriptionEs/En -> Property.shortDescriptionEs/En
longDescriptionEs/En -> Property.longDescriptionEs/En
maxGuests -> Property.maxGuests
bedrooms -> Property.bedrooms
bathrooms -> Property.bathrooms
baseNightlyPrice -> Property.baseNightlyPrice
preparationDaysBefore/After -> Property.preparationDaysBefore/After
isComposed -> Property.isComposed
```

Default seed values:

```text
Property.currency = "USD"
Property.status = "ACTIVE"
Property.checkInTime = "8:00 a.m."
Property.checkOutTime = null until final check-out policy is explicitly confirmed
```

## Property Composition Seed Strategy

`Refugio Completo` is seeded as a composed listing.

Seed relationships:

```text
complete-retreat -> black-white-apartment
complete-retreat -> perfect-retreat-bungalow
```

Database table:

```text
PropertyComponent
```

Idempotency rule:

```text
Use @@unique([parentPropertyId, componentPropertyId]).
```

## Amenity Seed Strategy

Amenities are seeded into:

```text
Amenity
```

Mapping:

```text
key -> Amenity.key
nameEs/nameEn -> Amenity.nameEs/nameEn
icon -> Amenity.icon
category -> Amenity.category
```

Idempotency rule:

```text
Use Amenity.key.
```

## Property Amenity Seed Strategy

Property amenity assignments are seeded into:

```text
PropertyAmenity
```

Idempotency rule:

```text
Use @@unique([propertyId, amenityId]).
```

## House Rule Seed Strategy

House rules are normalized into deterministic keys such as:

```text
max-guests-2
max-guests-4
max-guests-6
no-pets
quiet-hours
no-parties
no-smoking
no-alcohol
care-property
respect-both-listings
```

Database table:

```text
HouseRule
```

Idempotency rule:

```text
Use HouseRule.key.
```

## Property Rule Seed Strategy

Property rule assignments are seeded into:

```text
PropertyRule
```

Idempotency rule:

```text
Use @@unique([propertyId, ruleId]).
```

## Image Seed Strategy

Phase 8.3.1 seeds `PropertyImage` records.

Current image records use local fallback URLs from:

```text
public/images/accommodations
```

`cloudinaryPublicId` remains optional so Cloudinary-backed records can be persisted later without changing the public page contract.

Public pages read image records from the database after Phase 8.3.1.

## External Calendar Seed Strategy

External calendars are not seeded in Phase 8.3.1.

Reason:

```text
Real Airbnb iCal import URLs contain tokens and must not be committed.
Export feed tokens must be generated/stored securely.
```

Future behavior:

```text
ExternalCalendar records should be created through private admin configuration or secure environment-backed setup.
```

## Settings Seed Strategy

The `Setting` table can later store safe operational values.

Potential seed keys:

```text
site.defaultCurrency
site.defaultLocale
booking.pendingPaymentExpirationMinutes
booking.allowGuestDateChangeRequests
calendar.syncIntervalMinutes
```

No settings seed is part of Phase 8.3.1.

## Validation

After applying the implemented seed phase, run:

```bash
npm run db:generate
npm run db:validate
npm run db:migrate:status
npm run db:seed
npm run build
npm run env:validate
npm run lint
```
