# 80 — Amenities and House Rules

## Phase

```text
Phase: 9.11 — Admin MVP and Brand Identity Completion
Subphase: 9.11.4 — Amenities and house rules
Status: Completed; catalog lifecycle follow-up pending local validation and commit
Base commit: 9f5c10a6ca5812e0c6ea48852e1f673fb65df138
Base implementation commit: 07dd7c03f19de77b0f18186c26986cd9e036213e
Accepted UI follow-up commit: ac4c8d96dbe1a80e481ebbc9046a3bf887a22a6e
Next subphase: 9.11.5 — Reservation and payment detail views
```

## Purpose

Phase 9.11.4 provides protected bilingual administration for the amenities and house rules displayed on the supported public accommodations.

The implementation reuses the existing models:

```text
Amenity
HouseRule
PropertyAmenity
PropertyRule
```

No Prisma schema migration is required.

## Admin routes

```text
/admin/catalogs?catalog=amenities
/admin/catalogs?catalog=house-rules
/admin/accommodations/[propertyId]/amenities-rules
```

`/admin/catalogs` is available from the dedicated **Catalogs** sidebar item. Two tab-style buttons separate the shared Amenity and House Rule catalogs.

The property-specific route manages assignments only.

## Supported operations

```text
From the property assignment page:
Assign or unassign active amenities for one accommodation
Assign or unassign active house rules for one accommodation
Require at least one assigned amenity and one assigned rule

From the shared Catalogs page:
Create amenities with bilingual names and an approved icon
Edit amenity names and approved icon
Soft-delete amenities
Create house rules with bilingual titles and descriptions
Edit house-rule titles and descriptions
Soft-delete house rules
```

New items are initially unassigned. The admin assigns them from each accommodation's assignment route.

## Runtime keys

The server creates a stable lowercase slug key from the English amenity name or English house-rule title. The technical key is not entered manually by the admin.

When the generated key already exists, the server appends a numeric suffix while preserving the database unique constraint. Existing keys remain immutable after creation.

The built-in amenity key tuple remains available for seed ordering and autocomplete, while the public `AmenityKey` contract accepts server-created runtime keys. Runtime items that are not present in the preferred built-in order appear after the known entries.

## Public behavior

Public accommodation queries:

```text
Exclude soft-deleted Amenity and HouseRule records
Read PropertyAmenity and PropertyRule assignments
Read bilingual amenity names
Read approved amenity icon names
Read bilingual house-rule descriptions
```

Accepted admin changes therefore appear publicly without copying values into static configuration.

## Typed amenity icons

Amenity creation and editing accept only the approved `amenityIconNames` values. The same `AmenityIcon` component is reused in public pages and the admin preview.

## Validation and concurrency

Amenity validation:

```text
nameEs: 2–160 characters
nameEn: 2–160 characters
icon: approved typed icon only
```

House-rule validation:

```text
titleEs: 2–160 characters
titleEn: 2–160 characters
descriptionEs: 3–500 characters
descriptionEn: 3–500 characters
```

Content updates and deletions use `expectedUpdatedAt`. An older tab cannot overwrite or delete a newer catalog version.

Assignment changes continue to send the complete selected amenity and house-rule ID sets with a SHA-256 revision. Membership replacement remains serializable.

## Soft-delete behavior

Deleting a catalog item performs one serializable transaction:

```text
Validate the current updatedAt value
Identify assigned accommodations
Verify every affected accommodation will retain another active item in that domain
Delete replaceable PropertyAmenity or PropertyRule memberships
Set deletedAt and deletedById on the catalog record
Create an AdminAuditLog record
```

Deletion is rejected when it would leave any accommodation with zero active amenity assignments or zero active house-rule assignments.

No catalog row is hard-deleted. Restore and permanent purge remain outside this phase.

## Audit actions

```text
AMENITY_CREATED
AMENITY_CONTENT_UPDATED
AMENITY_SOFT_DELETED
HOUSE_RULE_CREATED
HOUSE_RULE_CONTENT_UPDATED
HOUSE_RULE_SOFT_DELETED
PROPERTY_AMENITIES_RULES_UPDATED
```

Audit metadata contains safe identifiers, actor email, bilingual values, selected icon, affected property IDs, and deletion timestamp. It does not contain secrets or provider payloads.

## API contract

```text
POST /api/admin/catalogs
  action: create-amenity
  action: create-house-rule

PATCH /api/admin/catalogs
  action: update-amenity
  action: update-house-rule

DELETE /api/admin/catalogs
  action: delete-amenity
  action: delete-house-rule

PATCH /api/admin/amenities-house-rules
  action: update-assignments
```

Every action requires the existing authorized admin session and strict Zod validation.

## Seed safety

Amenity and HouseRule upserts in `prisma/seed.ts` continue to use `update: {}`. Rerunning the seed does not overwrite runtime content or restore soft-deleted catalog rows.

Default assignments are inserted only when the property currently has zero assignments. Because deletion refuses to remove the final active assignment, normal seed reruns do not restore deliberately removed memberships.

## Scope boundary

Phase 9.11.4 still does not add:

```text
Prisma migration
Catalog restore or permanent purge
Amenity or rule ordering fields
Price, currency, or property publication editing
Reservation or payment actions
Email delivery
PMS behavior
```

## Validation

```powershell
npm run env:validate
npm run db:validate
npm run lint
npm run build
git diff --check
git status
```

Manual acceptance:

```text
1. Create an amenity and confirm it appears unassigned in every property assignment page.
2. Assign the amenity and confirm the public page displays it with the selected icon and locale.
3. Edit the amenity in one tab and confirm a stale update/delete is rejected from another tab.
4. Soft-delete an amenity with safe remaining assignments and confirm it disappears publicly and administratively.
5. Attempt to delete the final amenity of a property and confirm the operation is rejected.
6. Repeat creation, editing, assignment, and soft deletion for house rules.
7. Confirm the expected AdminAuditLog action for every mutation.
8. Rerun the development seed and confirm created content, edits, soft deletion, and assignment changes are preserved.
```
