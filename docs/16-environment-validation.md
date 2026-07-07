# 16 — Environment Validation

This document defines the Phase 3.2 environment variable validation foundation for TRP Booking.

## Phase

```text
Phase: Phase 3 — Database Foundation
Subphase completed by this document: 3.2 Environment variable validation foundation
Next subphase: 3.3 Initial Prisma schema for core booking domain
```

## Goal

The project must validate server-side environment variables before database-dependent tasks run.

Environment validation exists to:

```text
Fail fast when required variables are missing.
Avoid confusing Prisma or database errors caused by empty configuration.
Avoid exposing raw secret values to users.
Keep server-only configuration separate from public client values.
Document expected local setup clearly.
```

## Files Added

```text
lib/env/server.ts
scripts/validate-env.ts
docs/16-environment-validation.md
```

## Package Changes

Dependencies added:

```text
zod
```

Dev dependencies added:

```text
tsx
```

Scripts added:

```text
env:validate
```

## Required Variables

Current required server-side variables:

```text
DATABASE_URL
DIRECT_URL
```

Both values must:

```text
Use a PostgreSQL connection string.
Point to the Supabase development database.
Include schema=trp_booking.
Remain local or stored in deployment environment variables.
Never be committed with real values.
```

## Local Validation

Run:

```powershell
npm run env:validate
```

Expected successful output:

```text
Environment variables are valid.
```

If validation fails, the script prints the variable names and safe messages only. It must not print real secrets.

## Relationship with Prisma

The environment validation script does not connect to the database and does not create tables.

It only validates that the expected environment variables exist and follow the required shape.

Use this command for Prisma schema validation:

```powershell
npm run db:validate
```

## What Phase 3.2 Does Not Do

Phase 3.2 does not add:

```text
Prisma models
Migrations
Seed scripts
Admin UI
Auth.js
Cloudinary
Resend
Tilopay
Airbnb iCal sync
Reservation checkout
PMS features
```

These items belong to later subphases.
