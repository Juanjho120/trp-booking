# 22 — Auth Environment Validation

This document closes Phase 4.2 and defines the Auth.js environment variable validation foundation for TRP Booking.

## Phase

```text
Phase: Phase 4 — Admin Authentication Foundation
Subphase completed by this document: 4.2 Auth environment variables and validation
Next subphase: 4.3 Auth.js configuration
```

## Goal

Before installing and configuring Auth.js, the project must define and validate the server-side variables required by the selected admin authentication strategy.

The selected strategy from Phase 4.1 is:

```text
Auth.js / NextAuth
Google OAuth provider
JWT session strategy
Server-side admin allowlist
No Prisma adapter initially
No credentials/password login initially
```

## Variables Added

The project now documents these variables in `.env.example`:

```text
AUTH_SECRET
AUTH_TRUST_HOST
AUTH_GOOGLE_ID
AUTH_GOOGLE_SECRET
AUTH_ALLOWED_ADMIN_EMAILS
AUTH_URL
```

## Required Variables

Required for local validation:

```text
AUTH_SECRET
AUTH_GOOGLE_ID
AUTH_GOOGLE_SECRET
AUTH_ALLOWED_ADMIN_EMAILS
```

`AUTH_TRUST_HOST` defaults to `false` in validation when not present, but it is still documented explicitly.

`AUTH_URL` is optional.

## AUTH_SECRET

`AUTH_SECRET` must be a cryptographically strong secret with at least 32 characters.

Generate one locally with:

```powershell
node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"
```

Do not commit this value.

## AUTH_TRUST_HOST

`AUTH_TRUST_HOST` must be either:

```text
true
false
```

Local development can use:

```text
false
```

Vercel/production can use:

```text
true
```

Auth.js can infer trusted host behavior on supported hosting providers, but this project keeps the value explicit for validation clarity.

## Google OAuth Variables

Required Google OAuth variables:

```text
AUTH_GOOGLE_ID
AUTH_GOOGLE_SECRET
```

These values come from the Google Cloud OAuth client configuration.

Do not commit these values.

Do not add them to public client-side config.

## Admin Allowlist

`AUTH_ALLOWED_ADMIN_EMAILS` is a comma-separated list:

```text
admin@example.com,owner@example.com
```

Real values must use the actual admin email addresses.

Validation rules:

```text
Must include at least one email.
All entries must be valid email addresses.
Email addresses are normalized to lowercase.
example.com placeholders are rejected.
Duplicate emails are removed by validation.
```

## Optional AUTH_URL

`AUTH_URL` is optional.

Typical local value when needed:

```text
http://localhost:3000
```

Production value when needed:

```text
https://turefugioperfecto.com.gt
```

Auth.js v5 usually infers the host from request headers, so this should only be set when needed.

## Files Changed

```text
.env.example
lib/env/server.ts
docs/22-auth-environment-validation.md
```

## Validation

After adding real local values to `.env`, run:

```powershell
npm run env:validate
npm run db:validate
npm run lint
npm run build
```

Expected env validation result:

```text
Environment variables are valid.
```

## What Phase 4.2 Does Not Do

Phase 4.2 does not add:

```text
next-auth dependency
Auth.js route handler
Google OAuth implementation
middleware
admin pages
admin login UI
Prisma adapter
database migrations
booking checkout
Tilopay
Cloudinary
Resend
Airbnb iCal sync
PMS features
```

These belong to later subphases or phases.
