# 81 — Phase 9.11.4 UI Follow-up

## Status

```text
Phase: 9.11 — Admin MVP and Brand Identity Completion
Follow-up: 9.11.4 UI corrections
Status: Pending local validation and commit
Base implementation commit: 07dd7c03f19de77b0f18186c26986cd9e036213e
Next subphase after acceptance: 9.11.5 — Reservation and payment detail views
```

## Purpose

This follow-up addresses three accepted usability observations without changing the Phase 9.11.4 domain scope:

```text
Move shared amenity and house-rule catalogs out of property pages
Preview a selected property photo before uploading it
Replace free-text accommodation times with controlled selectors
```

No Prisma migration or dependency is required.

## Dedicated Catalogs navigation

The admin sidebar adds:

```text
Catalogs → /admin/catalogs
```

The route uses two button-style tabs, matching the compact selector pattern used by the admin calendar:

```text
Amenities → /admin/catalogs?catalog=amenities
House Rules → /admin/catalogs?catalog=house-rules
```

Shared catalog content is edited only from this route. Catalog keys and categories remain immutable.

## Property assignment boundary

The route below remains property-specific:

```text
/admin/accommodations/[propertyId]/amenities-rules
```

It now manages only the selected amenity and house-rule memberships for that accommodation. It preserves the minimum of one assigned amenity and one assigned rule, optimistic assignment revisions, serializable transactions, and `PROPERTY_AMENITIES_RULES_UPDATED` auditing.

## Catalog API boundary

```text
PATCH /api/admin/catalogs
  update-amenity
  update-house-rule

PATCH /api/admin/amenities-house-rules
  update-assignments
```

Catalog updates preserve `expectedUpdatedAt`, typed amenity icons, bilingual validation, `AMENITY_CONTENT_UPDATED`, and `HOUSE_RULE_CONTENT_UPDATED`.

## Property photo preview

The photo manager creates a temporary object URL when an admin selects a local file. The upload form displays that local image before requesting a Cloudinary signature.

The URL is revoked when the file changes or the component is unmounted. A successful upload clears the file and therefore clears the preview.

The preview does not bypass server validation or change the 40-photo, 10 MB, JPG/PNG/WEBP, ownership, or finalization rules.

## Accommodation time selectors

`checkInTime` and optional `checkOutTime` use the existing styled Radix Select foundation.

```text
Available values: every 30 minutes across the day
Displayed labels: HH:mm
Stored values: canonical 12-hour strings compatible with existing data
Check-in: required
Check-out: optional through an explicit no-time option
```

The API and service both validate and normalize the time values. Arbitrary free text is rejected.

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
1. Confirm Catalogs appears in desktop and mobile admin navigation.
2. Confirm Amenities and House Rules buttons switch the selected catalog.
3. Confirm global catalog edits remain bilingual and auditable.
4. Confirm accommodation pages still manage assignments only.
5. Select a local property image and confirm the preview appears before upload.
6. Replace the selected file and confirm the preview updates.
7. Upload the file and confirm the preview clears.
8. Confirm check-in and check-out accept only listed 30-minute values.
9. Confirm check-out can be explicitly left undefined.
10. Confirm public arrival copy reflects the saved check-in value.
```
