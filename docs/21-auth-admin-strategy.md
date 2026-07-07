# 21 — Auth.js Admin Strategy

This document closes Phase 4.1 and defines the initial authentication strategy for the TRP Booking admin area.

## Phase

```text
Phase: Phase 4 — Admin Authentication Foundation
Subphase completed by this document: 4.1 Auth.js strategy and admin access foundation
Next subphase: 4.2 Auth environment variables and validation
```

## Goal

TRP Booking needs a private admin area for the minimum operational features required by the direct booking website.

The admin area must eventually support:

```text
Manage accommodations
Manage images
Manage amenity and rule assignments
Review reservations
Review payments and refunds
Review calendar blocks
Force Airbnb iCal sync
Unlock preparation buffers
Review audit history
```

Phase 4.1 defines the authentication strategy only. It does not install Auth.js or add protected routes yet.

## Selected Strategy

Initial strategy:

```text
Auth.js / NextAuth
Google OAuth provider
JWT session strategy
Server-side admin allowlist
Custom sign-in page later in Phase 4
No Prisma adapter initially
No credentials/password login initially
```

## Why Google OAuth First

Google OAuth avoids building and storing a password-based login system in the first admin version.

This is preferred because:

```text
TRP Booking needs a small private admin area, not public user registration.
There is no guest account system in the current project scope.
Password storage and password reset flows are unnecessary at this stage.
Admin access can be controlled through an explicit server-side allowlist.
The database schema does not need Auth.js adapter tables immediately.
```

## Why Not Credentials Provider Initially

Credentials-based login is intentionally not selected for the first implementation.

Reason:

```text
It would require password hashing, password reset behavior, credential validation flows, lockout/rate-limit strategy, and additional security review.
```

That complexity is not needed for the current admin-only scope.

## Why JWT Sessions Initially

Initial session strategy:

```text
JWT
```

Reason:

```text
It avoids introducing Auth.js adapter tables before the migration strategy is explicitly started.
It keeps Phase 4 focused on route protection and admin identity.
It reduces coupling between Auth.js internals and the current Prisma schema.
```

The Prisma adapter can be evaluated later only through an explicit task.

## Prisma Adapter Deferred

The project already has Prisma, but Auth.js Prisma Adapter is intentionally deferred.

Reason:

```text
Phase 3 did not create or apply migrations.
Auth.js adapter tables would require additional database models and migrations.
The current admin scope can be implemented with JWT sessions and an allowlist.
```

Do not add `@auth/prisma-adapter` unless a later documented subphase explicitly requires it.

## Admin Allowlist

Admin access must be controlled by a server-side allowlist.

Planned environment variable:

```text
AUTH_ALLOWED_ADMIN_EMAILS
```

Expected format:

```text
admin@example.com,owner@example.com
```

Rules:

```text
Only allowlisted emails can access /admin routes.
Email comparison must be normalized to lowercase.
Do not expose the allowlist to the client.
Do not hardcode real admin emails in code or docs.
```

## Required Auth Environment Variables

Planned variables for Phase 4.2:

```text
AUTH_SECRET
AUTH_TRUST_HOST
AUTH_GOOGLE_ID
AUTH_GOOGLE_SECRET
AUTH_ALLOWED_ADMIN_EMAILS
```

Local development may also need:

```text
AUTH_URL
```

Production values must be configured in Vercel environment variables.

## Route Protection Strategy

No admin route should be visible without protection.

Protected route prefix:

```text
/admin
```

Planned behavior:

```text
Unauthenticated user visits /admin -> redirect to sign-in.
Authenticated but non-allowlisted user visits /admin -> show access denied or redirect to public home.
Allowlisted admin visits /admin -> allow access.
```

Implementation should use server-side checks.

## Public Routes Must Stay Public

The following routes must remain public:

```text
/
/alojamientos
/alojamientos/[slug]
/robots.txt
/sitemap.xml
```

Guest users must not need login to view accommodations or public content.

## Session Shape

The session should eventually include safe admin identity fields only:

```text
user.name
user.email
user.image
user.role
```

Initial role:

```text
ADMIN
```

Do not include secrets, provider tokens, raw OAuth responses, or internal database connection details in the client session.

## Custom Sign-In Page

A custom admin sign-in page should be introduced later in Phase 4.

Planned route:

```text
/admin/login
```

Rules:

```text
Use project design system components.
Do not use unstyled native browser UI.
Do not expose technical provider errors directly.
Use centralized copy/messages for user-facing labels and errors.
```

## Audit Considerations

Authentication events that may later require audit:

```text
Admin sign-in success
Admin sign-in denied
Admin sign-out
Admin allowlist mismatch
```

Audit implementation is deferred until the project has the final admin/auth persistence approach.

## What Phase 4.1 Does Not Do

Phase 4.1 does not add:

```text
next-auth dependency
Auth.js route handler
Google OAuth credentials
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

## Validation

After applying this documentation update, run:

```powershell
npm run db:validate
npm run env:validate
npm run lint
npm run build
```
