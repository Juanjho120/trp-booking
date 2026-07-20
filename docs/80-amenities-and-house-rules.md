# 80 — Amenities and House Rules

## Phase

```text
Phase: 9.11 — Admin MVP and Brand Identity Completion
Subphase: 9.11.4 — Amenities and house rules
Status: Completed pending local validation and commit
Base commit: 9f5c10a6ca5812e0c6ea48852e1f673fb65df138
Next subphase: 9.11.5 — Reservation and payment detail views
```

## Purpose

Phase 9.11.4 adds protected bilingual administration for the amenities and house rules displayed on the three supported public accommodations.

The implementation reuses the existing models:

```text
Amenity
HouseRule
PropertyAmenity
PropertyRule
```

No Prisma schema migration is required.

## Admin route

```text
/admin/accommodations/[propertyId]/amenities-rules
```

The accommodations overview links to this route for each supported property.

## Supported operations

```text
Assign or unassign active amenities for one accommodation
Assign or unassign active house rules for one accommodation
Require at least one assigned amenity and one assigned rule
Edit amenity names in Spanish and English
Select an amenity icon from the approved typed icon catalog
Edit house-rule titles in Spanish and English
Edit public house-rule descriptions in Spanish and English
```

Catalog items are shared by the three accommodations: editing a name, icon, title, or description affects every accommodation using that item. Catalog keys and categories remain immutable. This MVP does not create arbitrary runtime keys because public rendering depends on the approved typed amenity/icon catalog and established rule ordering.

## Public behavior

Public accommodation queries already:

```text
Exclude soft-deleted Amenity and HouseRule records
Read PropertyAmenity and PropertyRule assignments
Read bilingual amenity names
Read approved amenity icon names
Read bilingual house-rule descriptions
```

Accepted admin changes therefore appear on the public accommodation detail page without copying values into static configuration.

## Typed amenity icons

`types/amenity.ts` exports the approved `amenityIconNames` tuple and derives `AmenityIconName` from it.

The admin selector accepts only:

```text
bath
bed
briefcase
car
chefHat
coffee
dumbbell
fan
flame
home
refrigerator
showerHead
treePalm
utensils
shieldCheck
wifi
users
```

The same `AmenityIcon` component used publicly is reused by the admin preview.

## Validation and concurrency

Amenity content validation:

```text
nameEs: 2–160 characters
nameEn: 2–160 characters
icon: approved typed icon only
```

House-rule content validation:

```text
titleEs: 2–160 characters
titleEn: 2–160 characters
descriptionEs: 3–500 characters
descriptionEn: 3–500 characters
```

Content updates use `expectedUpdatedAt`. An older tab cannot silently overwrite a newer catalog edit.

Assignment changes send the complete selected amenity and house-rule ID sets with a SHA-256 revision. The server repeats validation and writes the membership replacement in a serializable transaction.

## Assignment deletion boundary

Unassigning an item deletes only its replaceable membership row:

```text
PropertyAmenity
PropertyRule
```

The `Amenity` or `HouseRule` catalog record is not deleted, restored, or soft-deleted by this UI. `AdminAuditLog` preserves the before and after assignment sets.

This is intentionally different from deleting an admin-managed business catalog record. Catalog deletion remains outside this subphase.

## Audit actions

```text
AMENITY_CONTENT_UPDATED
HOUSE_RULE_CONTENT_UPDATED
PROPERTY_AMENITIES_RULES_UPDATED
```

Audit metadata includes safe identifiers, actor email, changed bilingual values, selected icon, and before/after assignment IDs. It does not contain secrets or raw provider payloads.

## API contract

```text
PATCH /api/admin/amenities-house-rules
  action: update-amenity
  action: update-house-rule
  action: update-assignments
```

Every action requires the existing authorized admin session.

## Error feedback

All failures map to bilingual domain codes and use the shared destructive `AdminSnackbar`.

```text
ADMIN_UNAUTHORIZED
INVALID_AMENITY_HOUSE_RULE_REQUEST
AMENITY_HOUSE_RULE_PROPERTY_NOT_FOUND
AMENITY_NOT_FOUND
HOUSE_RULE_NOT_FOUND
AMENITY_HOUSE_RULE_STALE
AMENITY_HOUSE_RULE_MINIMUM_REQUIRED
AMENITY_HOUSE_RULE_UNEXPECTED_ERROR
```

## Seed safety requirement

After this phase, rerunning the development seed must not overwrite admin-managed catalog content or restore intentionally removed default assignments.

Required `prisma/seed.ts` behavior:

```text
Amenity upsert update branch: update: {}
HouseRule upsert update branch: update: {}
Seed default PropertyAmenity rows only when that property has zero amenity assignments
Seed default PropertyRule rows only when that property has zero rule assignments
```

The admin requires at least one assignment in each domain, so a managed property continues to have a non-zero count and the seed does not restore removed defaults.

## Scope boundary

Phase 9.11.4 does not add:

```text
Prisma migration
Creation of arbitrary amenity or rule keys
Catalog soft-delete, restore, or purge UI
Amenity or rule ordering fields
Price or currency editing
Property publication/status editing
Property composition editing
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
1. Open the amenities/rules page for each supported property.
2. Assign and unassign amenities, keeping at least one selected.
3. Assign and unassign rules, keeping at least one selected.
4. Confirm zero selections are rejected through the destructive snackbar.
5. Edit Spanish and English amenity names and select another approved icon.
6. Edit Spanish and English house-rule titles and descriptions.
7. Open the same catalog item in stale browser state and confirm the stale error.
8. Open assignments in two tabs and confirm the older revision is rejected.
9. Confirm the public property page reflects assignments and selected locale.
10. Confirm every mutation creates the expected AdminAuditLog action.
11. Rerun the seed and confirm content and removed assignments are preserved.
```
