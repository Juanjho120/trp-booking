# 81 — Phase 9.11.4 UI Follow-up

## Status

```text
Phase: 9.11 — Admin MVP and Brand Identity Completion
Follow-up: 9.11.4 UI corrections
Status: Accepted and committed
Base implementation commit: 07dd7c03f19de77b0f18186c26986cd9e036213e
Accepted follow-up commit: ac4c8d96dbe1a80e481ebbc9046a3bf887a22a6e
Next follow-up: catalog creation/soft deletion and clear selected photo
```

## Accepted corrections

```text
Move shared amenity and house-rule catalogs out of property pages
Preview a selected property photo before uploading it
Replace free-text accommodation times with controlled selectors
```

No Prisma migration or dependency was required.

## Dedicated Catalogs navigation

```text
Catalogs → /admin/catalogs
Amenities → /admin/catalogs?catalog=amenities
House Rules → /admin/catalogs?catalog=house-rules
```

The property route `/admin/accommodations/[propertyId]/amenities-rules` manages only memberships.

## Property photo preview

The photo manager creates a temporary object URL when an admin selects a local file. The URL is revoked when the selection changes or the component unmounts. Successful upload clears the file and preview.

The catalog-lifecycle follow-up adds an explicit clear-selection control. Clearing the selected file resets the hidden file input and revokes the preview through the existing effect cleanup. The bilingual alternative-text drafts remain intact.

## Accommodation time selectors

`checkInTime` and optional `checkOutTime` use the styled Radix Select foundation and the shared canonical 30-minute contract. The API and service reject arbitrary free text.

## Validation

```powershell
npm run env:validate
npm run db:validate
npm run lint
npm run build
git diff --check
git status
```
