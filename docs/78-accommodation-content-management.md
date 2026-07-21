# 78 — Accommodation Content Management

## Phase

```text
Phase: 9.11 — Admin MVP and Brand Identity Completion
Subphase: 9.11.2 — Accommodation content management
Status: Completed pending local validation and commit
Base commit: b5472e8b448f02b6778dcee9e344b2fd55839480
Next subphase: 9.11.3 — Property photo management
```

## Purpose

Phase 9.11.2 turns the existing PostgreSQL `Property` content fields into a safe, bilingual admin workflow without expanding TRP Booking into a PMS.

The public accommodation listing and detail pages already query active, non-deleted `Property` rows through `lib/properties/public.ts`. A successful admin update therefore becomes the public source of truth immediately.

## Admin routes

```text
/admin/accommodations
/admin/accommodations/[propertyId]
PATCH /api/admin/accommodation-content
```

The main accommodations page now contains two intentionally separate areas:

```text
Public accommodation content
Preparation-buffer settings
```

Preparation settings continue using the existing API and audit behavior. The content editor does not change availability or buffer rules.

## Editable fields

```text
nameEs
nameEn
shortDescriptionEs
shortDescriptionEn
longDescriptionEs
longDescriptionEn
maxGuests
bedrooms
bathrooms
checkInTime
checkOutTime (optional)
```

Both languages are required for names and descriptions.

## Read-only and deferred fields

```text
id
slug
baseNightlyPrice
currency
status
isComposed
property component relationships
preparationDaysBefore
preparationDaysAfter
photos
amenities
house rules
```

Reasons:

- slug changes require a dedicated redirect and SEO contract;
- price/currency need a separate commercial and reservation-impact contract;
- status changes require publishing/deactivation rules;
- composition affects availability dependencies;
- preparation settings already have a dedicated audited workflow;
- photos belong to 9.11.3;
- amenities and rules belong to 9.11.4.

## Validation contract

The API uses a strict Zod object and the service repeats normalization and validation.

```text
Names: 2–120 characters
Short descriptions: 20–500 characters
Long descriptions: 50–5000 characters
maxGuests, bedrooms, bathrooms: integers from 1 through 20
checkInTime: required, 1–30 characters
checkOutTime: optional, maximum 30 characters
```

Single-line values are trimmed and internal whitespace is collapsed. Multiline descriptions preserve line breaks and normalize Windows line endings.

## Authorization and supported properties

The API requires the existing Auth.js admin session. Only the three IDs in `adminAccommodationIds` are editable.

Unsupported, missing, or soft-deleted properties return `ACCOMMODATION_CONTENT_PROPERTY_NOT_FOUND`.

There is no delete, restore, publish, or deactivate action in this subphase.

## Optimistic concurrency

Every update sends:

```text
expectedUpdatedAt
```

The service compares and atomically applies the update against the same `updatedAt` value. An older browser tab receives:

```text
ACCOMMODATION_CONTENT_STALE
HTTP 409
```

The user must reload before attempting another save. This prevents silent last-write-wins content loss.

## Audit contract

A successful changed update creates:

```text
action: PROPERTY_CONTENT_UPDATED
entityType: Property
entityId: property.id
```

Metadata includes:

```text
actorEmail
changedFields
before (changed fields only)
after (changed fields only)
```

Submitting an unchanged form does not create an audit row.


## Arrival and departure time selectors

The accommodation editor no longer accepts arbitrary free text for `checkInTime` or `checkOutTime`.

```text
Check-in: required styled selector
Check-out: optional styled selector with an explicit undefined option
Interval: 30 minutes
Stored format: canonical 12-hour value compatible with the existing Property columns
Visible option label: 24-hour HH:mm
```

The API and admin service both normalize and validate the selected value. Existing canonical seed values such as `8:00 a.m.` remain compatible, and no Prisma migration is required.

## Seed safety requirement

Once accommodation content is admin-managed, rerunning the development seed must not overwrite runtime edits or restore a soft-deleted property.

In `prisma/seed.ts`, the `Property` upsert must keep the complete `create` payload but use:

```ts
// Property content becomes admin-managed after the initial seed.
// Re-running the seed must not overwrite runtime edits or restore soft-deleted records.
update: {},
```

This change affects only existing Property rows. A clean database still receives the original baseline through `create`.

## Files

```text
app/admin/accommodations/page.tsx
app/admin/accommodations/[propertyId]/page.tsx
app/api/admin/accommodation-content/route.ts
features/admin/components/admin-accommodation-management.tsx
features/admin/components/admin-accommodation-content-editor.tsx
features/admin/components/admin-accommodation-settings.tsx
features/admin/index.ts
lib/admin/accommodation-content.ts
lib/admin/index.ts
types/admin-accommodation-content.ts
messages/es.ts
messages/en.ts
prisma/seed.ts (surgical update described above)
```

## Scope boundary

Phase 9.11.2 does not add:

```text
Prisma schema migration
photo upload, ordering, cover selection, or deletion
amenity editing
house-rule editing
price or currency editing
status publishing or deactivation
slug editing or redirect management
property composition editing
reservation/payment detail actions
email delivery
refund/cancellation workflows
PMS behavior
```

## Validation

```powershell
npm run env:validate
npm run db:validate
npm run lint
npm run build
git diff --check
```

Manual acceptance:

```text
1. Open /admin/accommodations as an allowlisted admin.
2. Confirm all three properties show content summaries and preparation settings.
3. Open each content editor and switch ES/EN in the admin header.
4. Save a bilingual text change and verify the success snackbar.
5. Open /alojamientos and the affected detail route; confirm the DB-backed content changed.
6. Select check-in and optional check-out values, save them, and confirm the public detail summary updates.
7. Open the same property in two tabs, save tab A, then save tab B; confirm tab B receives the stale-content error.
8. Confirm slug, price, status, composition, photos, amenities, and rules are not editable.
9. Confirm preparation-buffer settings still save independently.
10. Confirm the audit row includes only changed fields and no secrets/provider payloads.
11. Run the seed against a non-empty development database and confirm existing admin-edited Property content is preserved after applying the required update: {} change.
```
