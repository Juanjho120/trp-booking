# 47 — Initial Seed and DB-backed Accommodation Source

## Phase

```text
Phase 8.3.1 — Initial seed and DB-backed accommodation source
```

## Purpose

This corrective subphase moves TRP Booking away from using hardcoded public accommodation data as the primary source of truth before Phase 8.4 starts writing pending reservations.

The project already had database tables and an initial migration, but the public accommodation listing, detail page, quote service, and parts of availability still depended on typed configuration data.

That is not acceptable before reservation writes.

## Why This Correction Exists

Phase 8.4 must create `Reservation` records using real `propertyId` values.

Therefore, the database must already contain the public accommodation catalog that reservations reference:

```text
properties
property_components
property_images
amenities
property_amenities
house_rules
property_rules
```

The public flow must read that same database data instead of relying on duplicated hardcoded objects.

## Delivered Files

```text
prisma/seed.ts
package.json
lib/properties/public.ts
lib/properties/index.ts
types/accommodation.ts
app/alojamientos/page.tsx
app/alojamientos/[slug]/page.tsx
features/properties/components/accommodations-page.tsx
features/properties/components/property-detail-page.tsx
lib/reservations/pricing.ts
app/api/reservations/quote/route.ts
lib/availability/rules.ts
lib/availability/service.ts
docs/47-initial-seed-and-db-backed-accommodation-source.md
README.md
docs/10-phases.md
docs/11-progress-log.md
```

## Seeded Tables

The seed script creates deterministic, idempotent records for:

```text
properties
property_components
property_images
amenities
property_amenities
house_rules
property_rules
```

The seed intentionally does not create:

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

Those tables either represent transactional data or require later admin/provider configuration.

## Seed Identity Decision

The seeded property IDs intentionally match the existing public accommodation IDs:

```text
black-white-apartment
perfect-retreat-bungalow
complete-retreat
```

This keeps the existing public form, quote contract, availability dependency rules, and future reservation creation flow stable while the source of truth moves to Prisma.

## Seeded Properties

The seed creates:

```text
Apartamento Blanco y Negro
Bungalow Refugio Perfecto
Refugio Completo
```

`Refugio Completo` is marked as a composed listing through `property_components`:

```text
complete-retreat -> black-white-apartment
complete-retreat -> perfect-retreat-bungalow
```

## Seeded Public Catalog Data

The seed creates:

```text
- property names and slugs
- short and long descriptions
- max guest counts
- bedroom and bathroom counts
- base nightly prices in USD
- check-in policy time
- preparation buffer days
- public image records
- amenity records and property relationships
- house rule records and property relationships
```

## DB-backed Public Reads

The new server-side query boundary is:

```text
lib/properties/public.ts
```

It exposes:

```text
getPublicAccommodations
getPublicAccommodationById
getPublicAccommodationBySlug
```

These functions are server-side only and use Prisma.

The public listing route now loads accommodations from Prisma:

```text
app/alojamientos/page.tsx
```

The public detail route and SEO metadata now load each accommodation by database slug:

```text
app/alojamientos/[slug]/page.tsx
```

## DB-backed Quote Source

`lib/reservations/pricing.ts` now reads the selected accommodation through:

```text
getPublicAccommodationById
```

That means pricing and guest capacity come from the seeded `properties` table instead of `config/accommodations.ts`.

The public quote endpoint still returns a non-binding quote and still does not create reservations.

## DB-backed Availability Source

`lib/availability/service.ts` now resolves properties by the seeded database property IDs.

It also reads preparation buffer policies from:

```text
properties.preparationDaysBefore
properties.preparationDaysAfter
```

This keeps availability aligned with the same records that reservations will reference in Phase 8.4.

The composed listing dependency rules still remain typed domain rules because they define behavior, not display catalog content.

## Why No Migration Is Included

No schema change is required in this subphase.

The required tables already exist from:

```text
docs/46-database-migration-bootstrap-correction.md
```

This subphase adds data and code that reads from the existing schema.

## External Calendar Data Boundary

`external_calendars` is not seeded in Phase 8.3.1.

Real Airbnb iCal import URLs and export feed tokens require protected configuration handling and must not be committed.

That belongs to a later subphase for calendar configuration/admin setup.

## How to Apply

After copying the files, run:

```bash
npm run db:generate
npm run db:validate
npm run db:migrate:status
npm run db:seed
npm run build
npm run env:validate
npm run lint
```

## Out of Scope

Phase 8.3.1 does not add:

```text
reservation writes
pending holds
checkout sessions
Tilopay payment intents
Tilopay redirects
Tilopay webhooks
Resend emails
external calendar configuration
real Airbnb iCal URLs
admin calendar UI
admin accommodation catalog UI
deployment configuration
PMS features
```

## Handoff to Phase 8.4

After this subphase is applied and seeded successfully, Phase 8.4 can create pending reservations against real database records.

Phase 8.4 must:

```text
1. Validate request input.
2. Recalculate the quote from database property data.
3. Recheck availability from database property/calendar/reservation data.
4. Create a Reservation with status = PENDING_PAYMENT.
5. Set expiresAt to a non-null value.
6. Avoid confirming the reservation before payment validation.
```
