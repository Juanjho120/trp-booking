# 54 — Tilopay Environment Validation

## Status

Completed as part of Phase 9.2.

## Local build correction

Next.js sets `NODE_ENV=production` during `npm run build`, even when the build is running locally.

For that reason, Tilopay callback URL validation must not rely only on `NODE_ENV` to decide whether `localhost` URLs are allowed.

The validation now uses `VERCEL_ENV=production` to identify a real production deployment. This allows local builds with localhost callback URLs while still enforcing HTTPS and production mode for real Vercel production deployments.

## Purpose

This subphase implements the server-side environment validation required before adding any Tilopay API calls.

Phase 9.2 validates the corrected `TILOPAY_*` contract defined in `docs/53-tilopay-sandbox-strategy-and-environment-contract.md`.

No Tilopay checkout, Payment record creation, redirect, webhook handler, reservation confirmation, email delivery, schema change, or migration is added in this subphase.

## Files added or updated

```text
.env.example
lib/env/server.ts
docs/53-tilopay-sandbox-strategy-and-environment-contract.md
docs/54-tilopay-environment-validation.md
README.md
docs/10-phases.md
docs/11-progress-log.md
```

## Sandbox credential mapping

The Tilopay sandbox panel exposes:

```text
Api Key
Api User
Api Password
```

TRP Booking maps those values to:

```text
Api Key      -> TILOPAY_API_KEY
Api User     -> TILOPAY_API_USER
Api Password -> TILOPAY_API_PASSWORD
```

## Environment variables validated

Phase 9.2 adds validation for:

```text
TILOPAY_ENVIRONMENT
TILOPAY_API_KEY
TILOPAY_API_USER
TILOPAY_API_PASSWORD
TILOPAY_SUCCESS_URL
TILOPAY_CANCEL_URL
TILOPAY_ERROR_URL
TILOPAY_WEBHOOK_URL
```

## Validation rules

```text
TILOPAY_ENVIRONMENT
- Required.
- Must be sandbox or production.
- Must be production when VERCEL_ENV=production.

TILOPAY_API_KEY
- Required.
- Maps to Api Key in the Tilopay sandbox panel.
- Must not be a known placeholder.
- Must not contain whitespace.

TILOPAY_API_USER
- Required.
- Maps to Api User in the Tilopay sandbox panel.
- Must not be a known placeholder.
- Must not contain whitespace.

TILOPAY_API_PASSWORD
- Required.
- Maps to Api Password in the Tilopay sandbox panel.
- Must not be a known placeholder.
- Must not contain whitespace.
- Must not be logged.

TILOPAY_SUCCESS_URL
TILOPAY_CANCEL_URL
TILOPAY_ERROR_URL
TILOPAY_WEBHOOK_URL
- Required.
- Must be valid URLs.
- Must use HTTPS outside local development.
- Local development may use localhost URLs.
- Local `npm run build` may use localhost URLs because VERCEL_ENV is not production locally.
```

## Local development example

Use real sandbox values from Platform Integrations. Do not commit them.

```env
TILOPAY_ENVIRONMENT=sandbox
TILOPAY_API_KEY=<Api Key from Tilopay sandbox>
TILOPAY_API_USER=<Api User from Tilopay sandbox>
TILOPAY_API_PASSWORD=<Api Password from Tilopay sandbox>
TILOPAY_SUCCESS_URL=http://localhost:3000/reservas/pago/exitoso
TILOPAY_CANCEL_URL=http://localhost:3000/reservas/pago/cancelado
TILOPAY_ERROR_URL=http://localhost:3000/reservas/pago/error
TILOPAY_WEBHOOK_URL=http://localhost:3000/api/payments/tilopay/webhook
```

## Production example

```env
TILOPAY_ENVIRONMENT=production
TILOPAY_API_KEY=<production Api Key from Tilopay>
TILOPAY_API_USER=<production Api User from Tilopay>
TILOPAY_API_PASSWORD=<production Api Password from Tilopay>
TILOPAY_SUCCESS_URL=https://turefugioperfecto.com.gt/reservas/pago/exitoso
TILOPAY_CANCEL_URL=https://turefugioperfecto.com.gt/reservas/pago/cancelado
TILOPAY_ERROR_URL=https://turefugioperfecto.com.gt/reservas/pago/error
TILOPAY_WEBHOOK_URL=https://turefugioperfecto.com.gt/api/payments/tilopay/webhook
```

## Server-only helper

`lib/env/server.ts` exposes:

```ts
getTilopayEnv()
```

The helper must remain server-side only. It must not be imported into client components.

## Out of scope

Phase 9.2 intentionally does not add:

```text
- Tilopay API calls.
- Payment records.
- Checkout redirects.
- Success/cancel/error pages.
- Webhook route.
- Reservation confirmation.
- Resend emails.
- Admin payment UI.
- Prisma schema changes.
- Prisma migrations.
- PMS behavior.
```

## Validation checklist

Run after adding local Tilopay variables to `.env`:

```bash
npm run env:validate
npm run lint
npm run build
```

Expected successful env validation output:

```text
Environment variables are valid.
```

## Next subphase

```text
9.3 Payment record creation for pending reservations
```
