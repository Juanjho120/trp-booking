# 15 — Database Foundation

This document defines the initial Prisma and Supabase/PostgreSQL foundation for TRP Booking.

## Phase

```text
Phase: Phase 3 — Database Foundation
Subphase completed by this document: 3.1 Prisma and Supabase foundation setup
Next subphase: 3.2 Environment variable validation foundation
```

## Database Target

Development database target:

```text
Supabase organization/project: portfolio-lab
PostgreSQL schema: trp_booking
```

Production database target:

```text
A separate Supabase project will be created later when TRP Booking starts handling real reservations, real guests, payments, and operational data.
```

## Prisma Version Decision

TRP Booking starts with Prisma 6.x for the initial foundation.

Reason:

```text
The project currently prioritizes stability and predictable setup.
Prisma 7 introduces breaking setup changes that require a driver adapter and a different client workflow.
Those changes should not be introduced accidentally during Phase 3.1.
```

Rule:

```text
Do not upgrade to Prisma 7 without a dedicated migration task, documentation update, and validation plan.
```

## Files Added

```text
prisma/schema.prisma
prisma/migrations/.gitkeep
.env.example
```

## Package Changes

Dependencies added:

```text
@prisma/client
```

Dev dependencies added:

```text
prisma
```

Scripts added:

```text
db:validate
db:format
db:generate
db:studio
```

## Environment Variables

Required local variables:

```text
DATABASE_URL
DIRECT_URL
```

Rules:

```text
Do not commit real values.
Do not commit Supabase passwords.
Do not commit iCal URLs.
Do not commit provider secrets.
Use .env.example only as a placeholder template.
```

## Supabase Schema Convention

The development database should use the PostgreSQL schema:

```text
trp_booking
```

Both `DATABASE_URL` and `DIRECT_URL` should include:

```text
schema=trp_booking
```

## Local Setup Steps

After applying the Phase 3.1 files:

```powershell
npm install
Copy-Item .env.example .env
```

Then fill `.env` with local development values from Supabase.

Validate Prisma:

```powershell
npm run db:validate
```

Validate the project:

```powershell
npm run lint
npm run build
```

## What Phase 3.1 Does Not Do

Phase 3.1 does not add:

```text
Application Prisma client helper
Database models
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
