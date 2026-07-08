# 30 — Public Accommodation Cloudinary Images

This document closes Phase 5.4 and records the implementation that switches public accommodation image rendering from local files to Cloudinary delivery URLs.

## Phase

```text
Phase: Phase 5 — Cloudinary Integration
Subphase completed by this document: 5.4 Public accommodation images from Cloudinary
Next subphase: 5.5 Phase 5 documentation update
```

## Goal

Phase 5.4 turns the Cloudinary foundation into product behavior.

The public listing and public accommodation detail pages should now receive Cloudinary delivery URLs through the existing accommodation image configuration instead of rendering local `public/images/accommodations` paths as the primary image source.

## Files Added

```text
lib/cloudinary/accommodation-images.ts
docs/30-public-accommodation-cloudinary-images.md
```

## Files Updated

```text
README.md
docs/10-phases.md
docs/11-progress-log.md
next.config.ts
config/accommodations.ts
config/seo.ts
lib/cloudinary/index.ts
types/accommodation.ts
```

## Public Rendering Change

The public accommodation configuration now builds image records with:

```text
cloudinaryPublicId
src
fallbackSrc
alt
```

The primary rendered field remains:

```text
src
```

But after Phase 5.4, `src` is a Cloudinary delivery URL generated from a deterministic Cloudinary public ID.

The local path remains only in:

```text
fallbackSrc
```

This keeps the local file reference available as a temporary upload source or rollback reference without using it as the primary rendered image path.

## Cloudinary URL Generation

The helper lives in:

```text
lib/cloudinary/accommodation-images.ts
```

It uses:

```text
getCloudinaryUploadFolder()
buildAccommodationImagePublicId()
buildCloudinaryImageUrl()
```

The public ID pattern remains:

```text
trp-booking/{environment}/accommodations/{propertySlug}/{sortOrder}-{imagePurpose}
```

The rendered delivery URL is generated with Cloudinary transformations:

```text
width: 1600
height: 1200
crop: fill
quality: auto
format: auto
```

## Required Cloudinary Assets

Before visual QA, upload or verify these Cloudinary assets exist under the active `CLOUDINARY_UPLOAD_FOLDER`.

If local development uses:

```text
CLOUDINARY_UPLOAD_FOLDER=trp-booking/dev
```

Then the expected public IDs are:

```text
trp-booking/dev/accommodations/black-white-apartment/01-cover
trp-booking/dev/accommodations/black-white-apartment/02-gallery-01
trp-booking/dev/accommodations/black-white-apartment/03-gallery-02
trp-booking/dev/accommodations/black-white-apartment/04-gallery-03

trp-booking/dev/accommodations/perfect-retreat-bungalow/01-cover
trp-booking/dev/accommodations/perfect-retreat-bungalow/02-gallery-01
trp-booking/dev/accommodations/perfect-retreat-bungalow/03-gallery-02
trp-booking/dev/accommodations/perfect-retreat-bungalow/04-gallery-03

trp-booking/dev/accommodations/complete-retreat/01-cover
trp-booking/dev/accommodations/complete-retreat/02-gallery-01
trp-booking/dev/accommodations/complete-retreat/03-gallery-02
trp-booking/dev/accommodations/complete-retreat/04-gallery-03
```

For production, use the same pattern with:

```text
CLOUDINARY_UPLOAD_FOLDER=trp-booking/production
```

## next/image Configuration

`next.config.ts` now allows images from:

```text
https://res.cloudinary.com/**
```

This is required because public pages still use `next/image` for optimized image rendering.

## SEO Image Update

`config/seo.ts` now uses a Cloudinary-generated complete-retreat cover image as the default Open Graph image.

Accommodation detail metadata already passes the accommodation cover image, so those pages also use Cloudinary URLs after this subphase.

## What Phase 5.4 Does Not Do

Phase 5.4 does not add:

```text
Admin image upload UI
Upload route handlers
Server actions for image upload
Database writes
Database migrations
Seed data
Cloudinary asset deletion
Cloudinary asset replacement
Cloudinary folder cleanup
Booking checkout
Tilopay
Resend
Airbnb iCal sync
PMS features
```

Admin upload and image replacement remain future operational features.

## Validation

Run:

```powershell
npm run env:validate
npm run db:validate
npm run lint
npm run build
```

Manual visual QA:

```text
Open /alojamientos.
Open each /alojamientos/[slug] page.
Inspect the rendered image URLs.
Confirm the primary image URLs come from res.cloudinary.com.
Confirm the pages do not visually depend on /images/accommodations local paths.
```

If images do not appear, verify the Cloudinary public IDs exist under the active `CLOUDINARY_UPLOAD_FOLDER`.

## Next Step

```text
Phase 5.5 — Phase 5 documentation update
```

Phase 5.5 should close Phase 5 only after the public Cloudinary image rendering has been validated in the product.
