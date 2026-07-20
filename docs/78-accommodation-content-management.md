# 78 — Accommodation Content Management

## Phase

```text
Phase: 9.11 — Admin MVP and Brand Identity Completion
Subphase: 9.11.2 — Accommodation content management
Status: Completed and committed
Base commit: b5472e8b448f02b6778dcee9e344b2fd55839480
Implementation commit: bc19e7327cd96647fd760b1a551fc4ae9ffacde2
UI follow-up commit: 3dc5797aef1efc2942d68358bdc5d3b5b44cca4d
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

## Seed safety requirement

Once accommodation content is admin-managed, rerunning the development seed must not overwrite runtime edits or restore a soft-deleted property.

In `prisma/seed.ts`, the `Property` upsert must keep the complete `create` payload but use:

```ts
// Property content becomes admin-managed after the initial seed.
// Re-running the seed must not overwrite runtime edits or restore soft-deleted records.
update: {},
```

This change affects only existing Property rows. A clean database still receives the original baseline through `create`.

## Accepted UI follow-up

After the accommodation content workflow was accepted, two shared UI corrections were applied:

```text
- The public site header again exposes the ES/EN locale selector.
- The public header and footer consume the active locale instead of fixed Spanish messages.
- Success and error feedback share AdminSnackbar across accommodation content, preparation-buffer settings, and calendar mutations.
- Error snackbars use destructive styling, role="alert", assertive live-region semantics, four-second auto-dismiss, and manual dismissal.
- Persistent inline mutation-error blocks were removed from those administrative workflows.
```

These corrections did not change the database schema, authorization, validation, audit contract, editable fields, or public Property data source.

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
3. Confirm the ES/EN selector is visible in the public header and changes the public header, footer, listing, and detail copy together.
4. Open each content editor and switch ES/EN in the admin header.
5. Save a bilingual text change and verify the success snackbar.
6. Open /alojamientos and the affected detail route; confirm the DB-backed content changed.
7. Save capacity or arrival-time changes and confirm the public detail summary updates.
8. Open the same property in two tabs, save tab A, then save tab B; confirm tab B receives the stale-content error through the destructive admin snackbar.
9. Trigger a preparation-buffer or calendar mutation error and confirm it also uses the destructive admin snackbar.
10. Confirm slug, price, status, composition, photos, amenities, and rules are not editable.
11. Confirm preparation-buffer settings still save independently.
12. Confirm the audit row includes only changed fields and no secrets/provider payloads.
13. Run the seed against a non-empty development database and confirm existing admin-edited Property content is preserved after applying the required update: {} change.
```
