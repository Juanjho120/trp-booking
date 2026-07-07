# 28 — Cloudinary Environment Validation

This document closes Phase 5.2 and defines the server-side Cloudinary environment validation foundation for TRP Booking.

## Phase

```text
Phase: Phase 5 — Cloudinary Integration
Subphase completed by this document: 5.2 Cloudinary environment validation
Next subphase: 5.3 Cloudinary service foundation
```

## Goal

Phase 5.2 turns the Cloudinary variables documented in Phase 5.1 into validated server-side environment requirements.

The goal is intentionally limited:

```text
Extend server-side environment validation for Cloudinary variables.
Validate CLOUDINARY_CLOUD_NAME.
Validate CLOUDINARY_API_KEY.
Validate CLOUDINARY_API_SECRET.
Validate CLOUDINARY_UPLOAD_FOLDER.
Reject placeholder values.
Keep Cloudinary variables server-side only.
Do not install or call the Cloudinary SDK yet.
Do not upload images or add image management UI yet.
```

## Official Cloudinary Basis

Cloudinary's Node.js SDK can be configured with the required `cloud_name`, `api_key`, and `api_secret` values, either through `CLOUDINARY_URL` or through explicit configuration in code.

Cloudinary also documents that applications should not expose the API secret and should not commit local environment files containing secrets.

For authenticated upload requests, Cloudinary uses secure backend credentials and states that the API secret must never be exposed in client-side code.

TRP Booking follows this stricter server-side approach.

## Files Updated

```text
.env.example
lib/env/server.ts
README.md
docs/10-phases.md
docs/11-progress-log.md
```

## Files Added

```text
docs/28-cloudinary-environment-validation.md
```

## Validated Variables

The following variables are now part of `validateServerEnv`:

```text
CLOUDINARY_CLOUD_NAME
CLOUDINARY_API_KEY
CLOUDINARY_API_SECRET
CLOUDINARY_UPLOAD_FOLDER
```

This means `npm run env:validate` now requires real local Cloudinary values in `.env`.

## CLOUDINARY_CLOUD_NAME

Validation rules:

```text
Required.
Must not be a placeholder.
Must use lowercase letters, numbers, and hyphens only.
Must not contain whitespace, slashes, underscores, or URL text.
```

Accepted style examples:

```text
mycloud
trp-booking-dev
```

Do not use:

```text
CHANGE_ME_CLOUDINARY_CLOUD_NAME
https://res.cloudinary.com/mycloud
my_cloud
```

## CLOUDINARY_API_KEY

Validation rules:

```text
Required.
Must not be a placeholder.
Must be treated as server-side configuration.
Must not be exposed through NEXT_PUBLIC variables.
```

The API key is less sensitive than the API secret, but it should still stay in server-side validated config for this project.

## CLOUDINARY_API_SECRET

Validation rules:

```text
Required.
Must not be a placeholder.
Must be at least 8 characters long.
Must not contain whitespace.
Must remain server-side only.
Must never be exposed in TSX components, public messages, public config, or client bundles.
```

Do not commit this value.

Do not add:

```text
NEXT_PUBLIC_CLOUDINARY_API_SECRET
```

## CLOUDINARY_UPLOAD_FOLDER

Validation rules:

```text
Required.
Must not be a placeholder.
Must start with trp-booking/.
Must not start or end with a slash.
Must not contain empty path segments.
Must use lowercase letters, numbers, hyphens, and slashes only.
```

Recommended local value:

```text
trp-booking/dev
```

Recommended production value:

```text
trp-booking/production
```

Future accommodation image folders should continue below this root using the strategy from Phase 5.1:

```text
trp-booking/{environment}/accommodations/{propertySlug}
```

## Server-Side Helper

Phase 5.2 adds:

```text
CloudinaryEnv
getCloudinaryEnv
```

These are environment helpers only.

They do not import Cloudinary, configure the Cloudinary SDK, upload images, delete assets, write database records, or call provider APIs.

## Local Setup Requirement

After applying Phase 5.2, local `.env` must include real Cloudinary values before this command can pass:

```powershell
npm run env:validate
```

Example shape:

```text
CLOUDINARY_CLOUD_NAME="your-real-cloud-name"
CLOUDINARY_API_KEY="your-real-api-key"
CLOUDINARY_API_SECRET="your-real-api-secret"
CLOUDINARY_UPLOAD_FOLDER="trp-booking/dev"
```

Do not commit `.env`.

## What Phase 5.2 Does Not Do

Phase 5.2 does not add:

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

After adding real local Cloudinary values to `.env`, run:

```powershell
npm run env:validate
npm run db:validate
npm run lint
npm run build
```

Expected results:

```text
Environment variables are valid.
Prisma schema remains valid.
Lint passes.
Build passes.
```
