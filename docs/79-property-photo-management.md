# 79 — Property Photo Management

## Phase

```text
Phase: 9.11 — Admin MVP and Brand Identity Completion
Subphase: 9.11.3 — Property photo management
Status: Completed pending local validation and commit
Base commit: 9bc885750833c7e1bb964956fc4c86d70dfc4414
Next subphase: 9.11.4 — Amenities and house rules
```

## Purpose

Phase 9.11.3 adds a protected, Cloudinary-backed photo workflow for the three supported accommodations without expanding TRP Booking into a PMS.

The workflow reuses the existing `PropertyImage` model and the Cloudinary ownership boundary already established under:

```text
trp-booking/{environment}/accommodations/{propertySlug}
```

No Prisma schema migration is required.

## Admin route

```text
/admin/accommodations/[propertyId]/photos
```

The accommodations overview links to this route for each supported property.

## Supported operations

```text
Upload JPG, PNG, or WEBP images
Require bilingual Spanish and English alternative text
Show the current ordered gallery
Move a photo up or down
Select exactly one cover photo
Edit bilingual alternative text
Soft-delete a photo
Automatically promote the first remaining photo when the cover is deleted
```

The admin supports at most 40 active photos per property. Each file may be at most 10 MB.


## Local upload preview

Selecting a local JPG, PNG, or WEBP file creates a temporary browser object URL and displays the image inside the upload card before any Cloudinary request is prepared.

The preview:

```text
Does not upload bytes by itself
Uses the selected local File only
Preserves the filename and file-size summary
Is cleared after a successful upload or another selection
Revokes the temporary object URL when replaced or unmounted
```

This preview does not change provider validation, file-size limits, supported formats, or Cloudinary ownership rules.

## Signed direct upload architecture

The image bytes upload directly from the authorized admin browser to Cloudinary instead of passing through the Next.js server route.

Flow:

```text
1. The admin selects a local image and enters bilingual alt text.
2. POST /api/admin/property-photos with action prepare-upload validates property, file metadata, limits, and alt text.
3. The server generates a short-lived signed Cloudinary upload request for an owned public ID.
4. The browser uploads the file directly to Cloudinary.
5. The browser calls POST /api/admin/property-photos with action finalize-upload.
6. The server reads the asset from Cloudinary, verifies ownership, type, format, size, and upload age.
7. PropertyImage is created and PROPERTY_IMAGE_UPLOADED is audited.
```

Safe values returned to the browser:

```text
Cloudinary cloud name
Cloudinary API key
Timestamp
Signature
Owned public ID
overwrite = false
Cloudinary upload endpoint
```

`CLOUDINARY_API_SECRET` never leaves the server.

## Provider validation

Finalization does not trust the direct-upload response alone. The server retrieves the asset through the Cloudinary Admin API and validates:

```text
public_id equals the signed owned public ID
resource_type is image
type is upload
format is jpg, png, or webp
bytes do not exceed 10 MB
secure_url and url are present
created_at is recent enough for the active direct-upload flow
```

Raw Cloudinary errors are not exposed to administrators.

If Cloudinary succeeds but database finalization fails, the newly uploaded asset is removed on a best-effort basis to reduce orphaned uploads.

## Ordering and cover rules

Active images are persisted with sequential `sortOrder` values beginning at 1.

Reordering sends the complete active image ID list together with the gallery revision loaded by the page. Cover changes and soft deletion use the same revision. The server rejects stale or incomplete state and writes structural changes in serializable transactions.

Cover behavior:

```text
The first uploaded image becomes cover when a property has no active images.
Only one active image may be cover through the admin service.
Selecting a cover clears the previous active cover in the same transaction.
Deleting the cover promotes the first remaining ordered image.
Public listing and detail pages already prioritize isCover and sortOrder.
```

## Alternative text

Both languages are required for every image:

```text
altTextEs: 3–250 characters
altTextEn: 3–250 characters
```

Whitespace is normalized server-side. Updating alt text uses `expectedUpdatedAt` so an older browser state cannot silently overwrite a newer edit.

## Soft deletion

Deleting a photo updates:

```text
deletedAt
deletedById
isCover = false
```

The database record and audit history remain available. The Cloudinary asset is intentionally retained in this subphase because the record is soft-deleted and no restore/purge lifecycle has been approved yet.

The final active photo cannot be deleted because public accommodation rendering requires at least one active image.

## Audit actions

```text
PROPERTY_IMAGE_UPLOADED
PROPERTY_IMAGE_ALT_TEXT_UPDATED
PROPERTY_IMAGES_REORDERED
PROPERTY_IMAGE_COVER_CHANGED
PROPERTY_IMAGE_SOFT_DELETED
```

Audit metadata contains safe identifiers, order changes, cover changes, actor email, and deletion metadata. It does not contain credentials or raw provider payloads.

## API contract

```text
POST /api/admin/property-photos
  action: prepare-upload
  action: finalize-upload

PATCH /api/admin/property-photos
  action: update-alt
  action: reorder
  action: set-cover

DELETE /api/admin/property-photos
  propertyId
  imageId
  expectedRevision
```

Every operation requires the existing authorized admin session.

## Error feedback

All property-photo failures map to bilingual domain codes and use the shared destructive `AdminSnackbar`.

```text
ADMIN_UNAUTHORIZED
INVALID_PROPERTY_PHOTO_REQUEST
PROPERTY_PHOTO_PROPERTY_NOT_FOUND
PROPERTY_PHOTO_NOT_FOUND
PROPERTY_PHOTO_STALE
PROPERTY_PHOTO_LIMIT_REACHED
PROPERTY_PHOTO_MINIMUM_REQUIRED
PROPERTY_PHOTO_UNSUPPORTED_TYPE
PROPERTY_PHOTO_FILE_TOO_LARGE
PROPERTY_PHOTO_UPLOAD_EXPIRED
PROPERTY_PHOTO_PROVIDER_ERROR
PROPERTY_PHOTO_UNEXPECTED_ERROR
```

## Seed safety requirement

Once photos are admin-managed, rerunning the development seed must not overwrite bilingual alt text, order, cover selection, or restore soft-deleted photo records.

In `prisma/seed.ts`, the `PropertyImage` upsert keeps its complete `create` payload but uses:

```ts
// Property photos become admin-managed after the initial seed.
// Re-running the seed must not overwrite alt text, order, cover selection,
// or restore soft-deleted photo records.
update: {},
```

A clean database still receives the original image baseline through `create`.

## Scope boundary

Phase 9.11.3 does not add:

```text
Prisma migration
Amenity management
House-rule management
Price or currency editing
Property publication/status editing
Property composition editing
Reservation or payment actions
Email delivery
Cloudinary restore or permanent purge UI
Bulk image import
Image editing or cropping tools
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
1. Open /admin/accommodations and select Manage photos for each property.
2. Select JPG, PNG, and WEBP files and confirm the local preview appears before upload.
3. Upload the selected files with bilingual alt text and reject an unsupported type or file larger than 10 MB through an error snackbar.
4. Confirm the uploaded image appears on the public listing/detail after finalization.
5. Move images up and down and confirm the public gallery order changes.
6. Select a different cover and confirm the public card/detail uses it.
7. Edit alt text and verify the selected public locale uses the corresponding value.
8. Open the same photo in stale browser state and confirm the safe stale error.
9. Delete a non-cover image and confirm it disappears publicly while its DB row remains soft-deleted.
10. Delete the current cover and confirm the first remaining image is promoted.
11. Confirm the final active image cannot be deleted.
12. Confirm every mutation creates the expected AdminAuditLog action.
13. Confirm Cloudinary API secret and raw provider errors never appear in browser payloads.
```
