# 19 — Seed Strategy

This document closes Phase 3.5 and defines the initial seed strategy for accommodations, amenities, rules, and static content.

## Phase

```text
Phase: Phase 3 — Database Foundation
Subphase completed by this document: 3.5 Initial seed strategy for accommodations, amenities, rules, and static content
Next subphase: 3.6 Database documentation update
```

## Goal

TRP Booking already has typed static content used by the public website.

Phase 3.5 defines how that content should later become deterministic database seed data without creating duplicates or introducing inconsistent records.

This phase does not create a seed script yet.

## Current Static Sources

Current source files:

```text
config/accommodations.ts
config/amenities.ts
messages/es.ts
messages/en.ts
types/accommodation.ts
types/amenity.ts
```

The current public website still reads from typed config.

The database seed script will be introduced later only after migrations are created and reviewed.

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

## Stable Unique Keys

The seed strategy depends on stable unique fields.

Current stable keys:

```text
Property.slug
Amenity.key
HouseRule.key
Setting.key
```

`HouseRule.key` was added during Phase 3.5 because the previous schema could not support deterministic idempotent rule upserts.

## Property Seed Strategy

Properties should be seeded from `config/accommodations.ts`.

Mapping:

```text
Accommodation.name.es -> Property.nameEs
Accommodation.name.en -> Property.nameEn
Accommodation.slug.es -> Property.slug
Accommodation.shortDescription.es -> Property.shortDescriptionEs
Accommodation.shortDescription.en -> Property.shortDescriptionEn
Accommodation.longDescription.es -> Property.longDescriptionEs
Accommodation.longDescription.en -> Property.longDescriptionEn
Accommodation.maxGuests -> Property.maxGuests
Accommodation.bedrooms -> Property.bedrooms
Accommodation.bathrooms -> Property.bathrooms
Accommodation.baseNightlyPriceUsd -> Property.baseNightlyPrice
Accommodation.preparationBuffer.daysBefore -> Property.preparationDaysBefore
Accommodation.preparationBuffer.daysAfter -> Property.preparationDaysAfter
Accommodation.kind === "composed" -> Property.isComposed
```

Default seed values:

```text
Property.currency = "USD"
Property.status = "ACTIVE"
Property.checkInTime = "08:00"
Property.checkOutTime = null until final check-out policy is explicitly confirmed
```

Initial seeded properties:

```text
apartamento-blanco-y-negro
bungalow-refugio-perfecto
refugio-completo
```

## Property Composition Seed Strategy

`Refugio Completo` must be seeded as a composed listing.

Seed relationship:

```text
Refugio Completo -> Apartamento Blanco y Negro
Refugio Completo -> Bungalow Refugio Perfecto
```

Database table:

```text
PropertyComponent
```

Idempotency rule:

```text
Use @@unique([parentPropertyId, componentPropertyId]).
```

The seed script should resolve property IDs by `Property.slug`.

## Amenity Seed Strategy

Amenities should be seeded from `config/amenities.ts`.

Mapping:

```text
AmenityDefinition.key -> Amenity.key
AmenityDefinition.label.es -> Amenity.nameEs
AmenityDefinition.label.en -> Amenity.nameEn
AmenityDefinition.icon -> Amenity.icon
```

Default seed values:

```text
Amenity.category = null until a category taxonomy is explicitly defined
```

Idempotency rule:

```text
Use Amenity.key.
```

## Property Amenity Seed Strategy

Property amenity assignments should be seeded from:

```text
Accommodation.amenityKeys
```

Database table:

```text
PropertyAmenity
```

Idempotency rule:

```text
Use @@unique([propertyId, amenityId]).
```

The seed script should:

```text
Resolve Property by slug.
Resolve Amenity by key.
Create missing relationship rows.
Remove obsolete seed-managed relationship rows only if a later seed ownership policy explicitly allows it.
```

## House Rule Seed Strategy

Current static rules live inside each accommodation as localized lists.

To seed rules safely, rules must be normalized into deterministic keys.

The seed script should use stable keys such as:

```text
max-guests
no-pets
quiet-hours
no-parties
no-smoking
no-alcohol
care-property
follow-both-accommodations-rules
```

Database table:

```text
HouseRule
```

Mapping:

```text
rule.key -> HouseRule.key
rule.title.es -> HouseRule.titleEs
rule.title.en -> HouseRule.titleEn
rule.description.es -> HouseRule.descriptionEs
rule.description.en -> HouseRule.descriptionEn
rule.category -> HouseRule.category
```

Idempotency rule:

```text
Use HouseRule.key.
```

## Property Rule Seed Strategy

Property rule assignments should be seeded according to the rules listed per accommodation.

Database table:

```text
PropertyRule
```

Idempotency rule:

```text
Use @@unique([propertyId, ruleId]).
```

The seed script should resolve:

```text
Property by slug
HouseRule by key
```

## Image Seed Strategy

Images should not be seeded into `PropertyImage` yet.

Reason:

```text
The current images are static files under public/images.
Cloudinary integration belongs to Phase 5.
PropertyImage records require final Cloudinary behavior before they become authoritative.
```

Until Phase 5:

```text
Public pages may continue reading static image data from config/accommodations.ts.
```

## External Calendar Seed Strategy

External calendars should not be seeded yet.

Reason:

```text
Airbnb iCal integration belongs to Phase 7.
The real iCal import URLs contain tokens and must not be committed.
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

No settings seed script is part of Phase 3.5.

## What Phase 3.5 Does Not Do

Phase 3.5 does not add:

```text
Seed scripts
Migrations
Database writes
Admin UI
Auth.js
Cloudinary
Resend
Tilopay
Airbnb iCal sync
Reservation checkout
PMS features
```

## Validation

After applying this phase, run:

```powershell
npm run db:validate
npm run env:validate
npm run lint
npm run build
```
