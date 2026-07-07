# 24 — Admin Route Protection

This document closes Phase 4.4 and defines the first protected route foundation for the TRP Booking admin area.

## Phase

```text
Phase: Phase 4 — Admin Authentication Foundation
Subphase completed by this document: 4.4 Admin route protection foundation
Next subphase: 4.5 Minimal admin shell
```

## Goal

Phase 4.4 protects the `/admin` route namespace before any admin UI or operational admin actions are exposed.

The route protection uses the strategy selected and implemented in the previous Phase 4 subphases:

```text
Auth.js / NextAuth
Google OAuth provider
JWT session strategy
Server-side admin allowlist
No Prisma adapter initially
No credentials/password login initially
```

## Files Added

```text
middleware.ts
docs/24-admin-route-protection.md
```

## Files Updated

```text
auth.ts
README.md
docs/10-phases.md
docs/11-progress-log.md
```

## Protected Route Namespace

The protected admin namespace is:

```text
/admin
/admin/*
```

The middleware matcher is intentionally limited to:

```text
/admin/:path*
```

This keeps the public website routes open and avoids forcing authentication for guests browsing accommodations or marketing pages.

## Unauthenticated Admin Access

When an unauthenticated user tries to access `/admin` or any nested admin route, the middleware redirects to the Auth.js sign-in endpoint:

```text
/api/auth/signin
```

The original admin URL is preserved with `callbackUrl` so an allowed admin can return to the requested admin route after signing in.

## Authenticated Non-Admin Access

When an authenticated user does not have the safe `ADMIN` role in the Auth.js session, the middleware redirects away from the admin namespace.

Current redirect target:

```text
/
```

This avoids exposing admin routes to signed-in users who are not allowlisted.

## Allowlisted Admin Access

Allowlisted admin users are allowed through the middleware when the session contains:

```text
session.user.role = ADMIN
```

The role is assigned through the Auth.js JWT/session callbacks only when the normalized session email is still present in the server-side allowlist.

## Stale Role Protection

Phase 4.4 also updates the JWT/session callbacks so stale admin roles are not kept when:

```text
An admin email is removed from AUTH_ALLOWED_ADMIN_EMAILS
A token still exists from a previous allowlisted session
The current token email no longer matches the server-side allowlist
```

When the email is no longer allowlisted, the callbacks clear the role instead of preserving a previous `ADMIN` value.

## Intentional Current Limitation

Phase 4.4 does not create an admin page yet.

This means an allowlisted admin may still reach a Next.js not-found result for `/admin` until Phase 4.5 adds the minimal admin shell.

This is intentional because Phase 4.4 only establishes protection before UI exposure.

## Public Routes Must Remain Public

The following public routes must continue to work without login:

```text
/
/alojamientos
/alojamientos/[slug]
/robots.txt
/sitemap.xml
```

Guest users must not need an account to view public accommodation content.

## What Phase 4.4 Does Not Do

Phase 4.4 does not add:

```text
admin pages
admin layout
admin login UI
booking checkout
reservation management
payment management
calendar management
Cloudinary
Resend
Tilopay
Airbnb iCal sync
Prisma adapter
Auth.js database tables
database migrations
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
Environment variables are valid.
Prisma schema is valid.
Lint passes.
Build passes.
```
