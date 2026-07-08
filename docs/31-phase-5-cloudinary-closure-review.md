# 31 — Phase 5 Cloudinary Closure Review

This document closes Phase 5 and confirms that Cloudinary is integrated as a real public image delivery foundation for TRP Booking.

## Phase

```text
Phase closed by this document: Phase 5 — Cloudinary Integration
Subphase completed by this document: 5.5 Phase 5 documentation update
Next phase: Phase 6 — Availability Calendar Foundation
Next subphase: 6.1 Availability strategy and booking calendar rules
```

## Closure Decision

Phase 5 is considered complete because Cloudinary is no longer only documented or configured.

The project now has:

```text
Cloudinary environment validation
Cloudinary SDK service foundation
Cloudinary deterministic accommodation image public IDs
Cloudinary delivery URL generation
Public accommodation listing images rendered from Cloudinary URLs
Public accommodation detail gallery images rendered from Cloudinary URLs
SEO/Open Graph image metadata capable of using Cloudinary URLs
next/image remote configuration for res.cloudinary.com
```

This is the minimum real product outcome required for Phase 5 closure.

## Completed Subphases

```text
5.1 Cloudinary strategy and environment foundation — Completed
5.2 Cloudinary environment validation — Completed
5.3 Cloudinary service foundation — Completed
5.4 Public accommodation images from Cloudinary — Completed
5.5 Phase 5 documentation update — Completed
```

## Files Added During Phase 5

```text
docs/27-cloudinary-strategy-and-environment.md
docs/28-cloudinary-environment-validation.md
docs/29-cloudinary-service-foundation.md
docs/30-public-accommodation-cloudinary-images.md
docs/31-phase-5-cloudinary-closure-review.md
lib/cloudinary/client.ts
lib/cloudinary/folders.ts
lib/cloudinary/delivery.ts
lib/cloudinary/accommodation-images.ts
lib/cloudinary/index.ts
```

## Files Updated During Phase 5

```text
.env.example
README.md
package.json
package-lock.json
next.config.ts
config/accommodations.ts
config/seo.ts
types/accommodation.ts
lib/env/server.ts
docs/10-phases.md
docs/11-progress-log.md
```

## Product Result

Public accommodation images now use Cloudinary as their primary delivery source.

Current public pages affected:

```text
/alojamientos
/alojamientos/apartamento-blanco-y-negro
/alojamientos/bungalow-refugio-perfecto
/alojamientos/refugio-completo
```

The listing page receives Cloudinary URLs through:

```text
accommodation.coverImage.src
```

The detail page receives Cloudinary URLs through:

```text
accommodation.coverImage.src
accommodation.galleryImages[].src
```

SEO/Open Graph metadata receives Cloudinary URLs through:

```text
createSeoMetadata({ imagePath })
defaultOpenGraphImage
```

## Cloudinary Public ID Convention

The active public ID convention is deterministic:

```text
{CLOUDINARY_UPLOAD_FOLDER}/accommodations/{propertySlug}/{sortOrder}-{imagePurpose}
```

Example with `CLOUDINARY_UPLOAD_FOLDER="trp-booking/dev"`:

```text
trp-booking/dev/accommodations/black-white-apartment/01-cover
trp-booking/dev/accommodations/black-white-apartment/02-gallery-01
trp-booking/dev/accommodations/black-white-apartment/03-gallery-02
trp-booking/dev/accommodations/black-white-apartment/04-gallery-03
```

Required current public IDs:

```text
trp-booking/{environment}/accommodations/black-white-apartment/01-cover
trp-booking/{environment}/accommodations/black-white-apartment/02-gallery-01
trp-booking/{environment}/accommodations/black-white-apartment/03-gallery-02
trp-booking/{environment}/accommodations/black-white-apartment/04-gallery-03

trp-booking/{environment}/accommodations/perfect-retreat-bungalow/01-cover
trp-booking/{environment}/accommodations/perfect-retreat-bungalow/02-gallery-01
trp-booking/{environment}/accommodations/perfect-retreat-bungalow/03-gallery-02
trp-booking/{environment}/accommodations/perfect-retreat-bungalow/04-gallery-03

trp-booking/{environment}/accommodations/complete-retreat/01-cover
trp-booking/{environment}/accommodations/complete-retreat/02-gallery-01
trp-booking/{environment}/accommodations/complete-retreat/03-gallery-02
trp-booking/{environment}/accommodations/complete-retreat/04-gallery-03
```

Replace `{environment}` with the environment folder selected in `CLOUDINARY_UPLOAD_FOLDER`, for example:

```text
dev
production
```

## Local Image Files After Phase 5

Local files under:

```text
public/images/accommodations
```

remain only as:

```text
Upload source references
Temporary rollback references
fallbackSrc metadata for traceability
```

They are not the primary rendered image source after Phase 5.4.

Do not treat Phase 5 as complete if a future regression returns the public pages to local image paths as the primary `src`.

## Environment Requirements

Required server-side values:

```text
CLOUDINARY_CLOUD_NAME
CLOUDINARY_API_KEY
CLOUDINARY_API_SECRET
CLOUDINARY_UPLOAD_FOLDER
```

Security rules:

```text
Do not expose CLOUDINARY_API_KEY as NEXT_PUBLIC.
Do not expose CLOUDINARY_API_SECRET as NEXT_PUBLIC.
Do not commit real Cloudinary credentials.
Keep provider calls server-side.
```

## What Phase 5 Intentionally Did Not Add

Phase 5 did not add:

```text
Admin image upload UI
Upload route handlers
Server actions for image upload
Cloudinary asset deletion
Cloudinary asset replacement workflow
Database image writes
Database migrations
Seeded PropertyImage records
Booking checkout
Tilopay integration
Resend integration
Airbnb iCal sync
Availability calendar logic
Reservation creation
PMS features
```

These remain deferred to their documented future phases or subphases.

## Validation Checklist

After applying Phase 5.5 closure files, run:

```powershell
npm run env:validate
npm run db:validate
npm run lint
npm run build
```

Manual visual validation for Phase 5 remains:

```text
Open /alojamientos.
Open /alojamientos/apartamento-blanco-y-negro.
Open /alojamientos/bungalow-refugio-perfecto.
Open /alojamientos/refugio-completo.
Confirm the rendered image requests use res.cloudinary.com.
Confirm the public pages do not render /images/accommodations as their primary image src.
```

## Next Phase Entry Criteria

Phase 6 can begin because:

```text
Public pages exist.
Accommodation content exists.
Admin authentication foundation exists.
Database schema foundation exists.
Cloudinary public image delivery is active.
```

Phase 6 must not introduce checkout, payment, email, or Airbnb iCal sync yet unless the phase plan is explicitly updated.

## Next Step

```text
Phase 6.1 — Availability strategy and booking calendar rules
```

Phase 6.1 should define availability rules before implementing date selection or reservation creation.
