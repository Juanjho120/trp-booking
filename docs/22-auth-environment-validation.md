# 22 — Auth Environment Validation

This document closes Phase 4.2 and defines the Auth.js environment variable validation foundation for TRP Booking.

## Phase

```text
Phase: Phase 4 — Admin Authentication Foundation
Subphase completed by this document: 4.2 Auth environment variables and validation
Updated during: 4.6 Phase 4 documentation update
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

The project documents these variables in `.env.example`:

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

`AUTH_TRUST_HOST` is explicitly documented and should be set to `true` for local development once Auth.js routes and `/admin` middleware are enabled.

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

Recommended local value after Phase 4.4 and Phase 4.5:

```text
true
```

Reason:

```text
/admin uses Auth.js middleware and Auth.js session/sign-in routes.
With AUTH_TRUST_HOST=false, Auth.js can reject localhost requests with UntrustedHost.
```

Vercel/production should also use:

```text
true
```

Only use `false` in a deliberately verified environment that does not require Auth.js to trust request host headers.

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

Auth.js v5 usually infers the host from request headers when trusted host is enabled, so this should only be set when needed.

## Files Changed

```text
.env.example
lib/env/server.ts
docs/22-auth-environment-validation.md
```

## Phase 4.6 Correction

During Phase 4.5 manual testing, `/admin` produced an Auth.js `UntrustedHost` error when local `.env` used:

```text
AUTH_TRUST_HOST=false
```

The working local value is:

```text
AUTH_TRUST_HOST=true
```

This document and `.env.example` were corrected during Phase 4.6 so future setup follows the working value.

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

Manual Auth.js check after Phase 4.5:

```text
/admin should redirect unauthenticated users to Auth.js sign-in.
Allowlisted Google admin users should be able to render the protected admin shell.
```

## What Phase 4.2 Does Not Do

Phase 4.2 did not add:

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
