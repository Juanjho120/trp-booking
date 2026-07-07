# 25 — Minimal Admin Shell

This document closes Phase 4.5 and defines the first protected admin shell for TRP Booking.

## Phase

```text
Phase: Phase 4 — Admin Authentication Foundation
Subphase completed by this document: 4.5 Minimal admin shell
Next subphase: 4.6 Phase 4 documentation update
```

## Goal

Phase 4.5 adds the first minimal `/admin` page now that Phase 4.4 protects the admin route namespace.

The goal is intentionally limited:

```text
Create a protected admin landing page.
Confirm an allowlisted admin can enter /admin.
Show safe session identity information.
Provide a sign-out action.
Show placeholders for future documented admin modules.
Do not add operational booking, payment, calendar, image, email, or iCal features yet.
```

## Files Added

```text
app/admin/page.tsx
features/admin/index.ts
features/admin/components/minimal-admin-shell.tsx
docs/25-minimal-admin-shell.md
```

## Files Updated

```text
messages/es.ts
messages/en.ts
README.md
docs/10-phases.md
docs/11-progress-log.md
```

## Protected Admin Page

The first admin page now exists at:

```text
/admin
```

This route remains protected by the existing middleware from Phase 4.4:

```text
middleware.ts
```

The page also performs a defensive server-side Auth.js session check before rendering.

Required session role:

```text
session.user.role = ADMIN
```

If the required role is missing, the page redirects away from the admin area.

## Minimal Shell Contents

The shell includes:

```text
Private admin header
Brand identifier
Public-site link
Auth.js sign-out button
Admin session card
Future admin module placeholder cards
Phase guardrail notes
```

The session card may show:

```text
session.user.name
session.user.email
```

It does not expose:

```text
AUTH_SECRET
AUTH_GOOGLE_SECRET
provider access tokens
raw OAuth responses
database connection strings
server-side allowlist contents
```

## Sign-Out Behavior

The admin shell includes a server action that uses Auth.js `signOut`.

Current post-sign-out redirect target:

```text
/
```

No custom admin login UI is added in this subphase.

## Centralized Admin Copy

Admin shell labels and descriptions are centralized in:

```text
messages/es.ts
messages/en.ts
```

This avoids hardcoding admin-facing UI copy directly in TSX components.

## SEO / Indexing

The `/admin` page metadata includes:

```text
robots.index = false
robots.follow = false
```

Admin pages should not be indexed by search engines.

## Future Module Placeholders

The shell shows placeholders for future documented areas:

```text
Accommodations
Direct reservations
Payments and refunds
Images
Emails
iCal synchronization
```

These are visual placeholders only.

They do not implement operational actions, database writes, provider integrations, or PMS behavior.

## Public Routes Must Remain Public

The following public routes must continue to work without login:

```text
/
/alojamientos
/alojamientos/[slug]
/robots.txt
/sitemap.xml
```

Guest users must not need an account to browse public content.

## What Phase 4.5 Does Not Do

Phase 4.5 does not add:

```text
booking checkout
reservation management
payment management
refund management
calendar management
preparation buffer management
Cloudinary image management
Resend email sending
Tilopay integration
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

Recommended manual checks:

```text
Signed-out /admin redirects to Auth.js sign-in.
Allowlisted Google admin can open /admin.
The /admin page renders the minimal shell.
Sign out returns to the public home page.
Public routes remain available without login.
```

Expected command results:

```text
Environment variables are valid.
Prisma schema is valid.
Lint passes.
Build passes.
```
