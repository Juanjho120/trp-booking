# 27 — Cloudinary Strategy and Environment

This document closes Phase 5.1 and defines the Cloudinary integration strategy and environment foundation for TRP Booking.

## Phase

```text
Phase: Phase 5 — Cloudinary Integration
Subphase completed by this document: 5.1 Cloudinary strategy and environment foundation
Next subphase: 5.2 Cloudinary environment validation
```

## Goal

Phase 5.1 defines how TRP Booking will use Cloudinary before adding SDK code, upload flows, database writes, or image management UI.

The goal is intentionally limited:

```text
Review the documented Cloudinary scope.
Define which Cloudinary variables will be required.
Define server-only usage rules for Cloudinary credentials.
Define image ownership, folder naming, and public delivery expectations.
Do not upload images or add image management UI yet.
Do not add booking, payment, email, calendar, iCal, or PMS features.
```

## Official Cloudinary Basis

Cloudinary's Node.js SDK can be configured with `cloud_name`, `api_key`, and `api_secret` either through `CLOUDINARY_URL` or through explicit configuration in code.

Important Cloudinary security guidance:

```text
Do not expose the API secret.
Do not commit local environment files containing secrets.
URL generation only requires the cloud name; the API key and API secret are not required for delivery URL generation.
Signed uploads use a backend-generated signature based on the product environment API secret.
Unsigned uploads require an upload preset and are easier to trigger from any client that knows the preset name.
```

TRP Booking will follow the stricter server-side approach for admin-managed accommodation images.

## Phase 5.1 Decisions

### 1. Cloudinary Scope

Cloudinary will be used for:

```text
Accommodation image storage
Accommodation image delivery
Responsive image transformations
SEO-friendly accommodation gallery delivery
Future admin-managed image upload and replacement workflows
```

Cloudinary will not be used in Phase 5.1 for:

```text
Guest uploads
Reservation checkout
Payments
Refunds
Email attachments
Airbnb iCal sync
PMS-style media management
```

### 2. Server-Only Credentials

The following values must remain server-side only:

```text
CLOUDINARY_API_KEY
CLOUDINARY_API_SECRET
```

Do not create these as:

```text
NEXT_PUBLIC_CLOUDINARY_API_KEY
NEXT_PUBLIC_CLOUDINARY_API_SECRET
```

No provider secret should be exposed in public JavaScript bundles, TSX components, public messages, client-side config, or committed documentation.

### 3. Environment Variables

Phase 5.1 adds placeholder entries to `.env.example` only.

Planned variables:

```text
CLOUDINARY_CLOUD_NAME
CLOUDINARY_API_KEY
CLOUDINARY_API_SECRET
CLOUDINARY_UPLOAD_FOLDER
```

The selected style uses separate variables instead of a single `CLOUDINARY_URL` because it keeps validation explicit and easier to document by field.

Phase 5.2 will add server-side validation for these values.

### 4. Upload Folder Strategy

Use one top-level product folder per environment:

```text
trp-booking/dev
trp-booking/production
```

Expected future folder pattern for accommodation assets:

```text
trp-booking/{environment}/accommodations/{propertySlug}
```

Examples:

```text
trp-booking/dev/accommodations/apartamento-blanco-y-negro
trp-booking/dev/accommodations/bungalow-refugio-perfecto
trp-booking/dev/accommodations/refugio-completo
```

This keeps development assets separate from production assets and avoids mixing TRP Booking assets with unrelated Cloudinary assets.

### 5. Public ID Strategy

Future uploads should use deterministic, readable `public_id` values when possible.

Recommended pattern:

```text
{folder}/{sortOrder}-{imagePurpose}
```

Examples:

```text
trp-booking/dev/accommodations/apartamento-blanco-y-negro/01-cover
trp-booking/dev/accommodations/bungalow-refugio-perfecto/02-bedroom
trp-booking/dev/accommodations/refugio-completo/03-gallery
```

Avoid storing random provider-only names when a stable property and image purpose are known.

### 6. Database Mapping Expectations

The current documented `PropertyImage` model expects Cloudinary-backed image metadata.

Future persistence should map to the existing documented fields before proposing new columns:

```text
cloudinaryPublicId
url
secureUrl
altTextEs
altTextEn
sortOrder
isCover
```

Do not add database columns during Phase 5.1.

Do not create or apply migrations during Phase 5.1.

### 7. Delivery Strategy

Public pages should eventually use secure Cloudinary delivery URLs for accommodation images.

Delivery must support:

```text
Responsive image sizes
Optimized formats
Stable alt text in Spanish and English
Cover image selection
Gallery ordering
```

Public delivery URLs are not secrets.

However, admin upload credentials, API secret, upload signatures, and provider configuration must remain server-side.

### 8. Upload Strategy

TRP Booking should prefer signed/admin-controlled uploads for production admin workflows.

Reason:

```text
The admin shell is protected.
Accommodation images are business-managed assets, not public guest uploads.
Signed uploads keep sensitive configuration on the server.
Unsigned presets can be triggered by any client that knows the preset name and are not the preferred production path for this use case.
```

Unsigned upload presets may be documented later only if a specific controlled use case requires them.

### 9. Deletion and Replacement Strategy

Future image replacement should preserve auditability at the TRP Booking data layer.

Recommended direction for later subphases:

```text
Deactivate or replace image records intentionally.
Avoid losing reservation or business history.
Delete Cloudinary assets only when the application has a clear admin action and the DB state is already consistent.
Do not hard-delete business-critical records unless documentation explicitly allows it.
```

Cloudinary asset deletion mechanics are not implemented in Phase 5.1.

## Files Added

```text
docs/27-cloudinary-strategy-and-environment.md
```

## Files Updated

```text
.env.example
README.md
docs/10-phases.md
docs/11-progress-log.md
```

## What Phase 5.1 Does Not Do

Phase 5.1 does not add:

```text
cloudinary npm package
Cloudinary SDK configuration code
Cloudinary service class
Upload route handler
Server actions for image upload
Admin image management UI
Database migrations
Database writes
Seed data
Image persistence
Cloudinary API calls
Booking checkout
Tilopay
Resend
Airbnb iCal sync
PMS features
```

These remain deferred to their documented subphases or later phases.

## Validation

After applying this update, run:

```powershell
npm run env:validate
npm run db:validate
npm run lint
npm run build
```

Expected results:

```text
Existing environment variables remain valid.
Prisma schema remains valid.
Lint passes.
Build passes.
```

Note:

```text
Phase 5.1 adds Cloudinary placeholders to .env.example but does not validate them yet.
Phase 5.2 will update server-side environment validation for Cloudinary.
```
