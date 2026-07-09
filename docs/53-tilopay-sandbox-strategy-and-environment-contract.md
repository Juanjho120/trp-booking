# 53 — Tilopay Sandbox Strategy and Environment Contract

## Status

Completed as part of Phase 9.1.

## Purpose

This document starts Phase 9 — Tilopay Sandbox Integration.

Phase 9.1 is intentionally documentation-only. It defines the Tilopay sandbox strategy, environment variable contract, callback URL expectations, payment lifecycle boundaries, and security rules before writing provider integration code.

No Tilopay API calls, checkout redirects, Payment records, webhook handlers, reservation confirmation transitions, emails, schema changes, or migrations are added in this subphase.

## Starting point from Phase 8

Phase 8 completed the pre-payment reservation foundation:

```text
- Public reservation form.
- Server-side quote calculation.
- PENDING_PAYMENT reservation hold creation.
- ReservationGuest creation.
- 15-minute pending hold expiration.
- Availability revalidation before writing a pending hold.
- Payment handoff readiness validation.
- Expired pending hold cleanup to EXPIRED.
```

Phase 9 must build on top of that foundation.

## Core payment rule

A payment attempt may only start from an active pending reservation:

```text
Reservation.status = PENDING_PAYMENT
Reservation.expiresAt is not null
Reservation.expiresAt > now
payment handoff validation succeeds
```

A reservation must not become `CONFIRMED` until payment validation succeeds through a trusted server-side provider callback/webhook flow.

## Environment variable contract

The project will use server-side environment variables for Tilopay.

Proposed variable names:

```text
TILOPAY_ENVIRONMENT=sandbox
TILOPAY_BASE_URL=<provider sandbox API/base URL>
TILOPAY_MERCHANT_ID=<sandbox merchant identifier>
TILOPAY_API_KEY=<sandbox API key or equivalent credential>
TILOPAY_API_SECRET=<sandbox API secret or equivalent credential>
TILOPAY_WEBHOOK_SECRET=<shared callback/webhook validation secret if provided by Tilopay>
TILOPAY_SUCCESS_URL=https://<app-domain>/reservas/pago/exitoso
TILOPAY_CANCEL_URL=https://<app-domain>/reservas/pago/cancelado
TILOPAY_ERROR_URL=https://<app-domain>/reservas/pago/error
TILOPAY_WEBHOOK_URL=https://<app-domain>/api/payments/tilopay/webhook
```

Notes:

```text
- The exact Tilopay credential labels must be confirmed against the sandbox account/onboarding material before 9.2/9.4 implementation.
- The variable names above are the internal TRP Booking names.
- Provider-specific request field names must be mapped inside a server-side adapter later.
- No real credential values should be committed.
```

## Environment validation expectations

Phase 9.2 should validate:

```text
TILOPAY_ENVIRONMENT
- Required.
- Allowed values: sandbox, production.
- Phase 9 should use sandbox.

TILOPAY_BASE_URL
- Required.
- Must be HTTPS.
- Must not be a placeholder value.
- Must not be exposed to the client as NEXT_PUBLIC.

TILOPAY_MERCHANT_ID
- Required.
- Must not be empty.
- Must not be a placeholder value.

TILOPAY_API_KEY
- Required.
- Must not be empty.
- Must not be a placeholder value.

TILOPAY_API_SECRET
- Required.
- Must not be empty.
- Must not be a placeholder value.
- Must not be logged.

TILOPAY_WEBHOOK_SECRET
- Required when callback validation depends on a shared secret.
- Must not be logged.
- Must not be exposed to public responses.

TILOPAY_SUCCESS_URL
TILOPAY_CANCEL_URL
TILOPAY_ERROR_URL
TILOPAY_WEBHOOK_URL
- Required.
- Must be HTTPS outside local development.
- Must belong to the expected app domain in production.
```

## Local development URLs

Local development may use:

```text
TILOPAY_SUCCESS_URL=http://localhost:3000/reservas/pago/exitoso
TILOPAY_CANCEL_URL=http://localhost:3000/reservas/pago/cancelado
TILOPAY_ERROR_URL=http://localhost:3000/reservas/pago/error
TILOPAY_WEBHOOK_URL=http://localhost:3000/api/payments/tilopay/webhook
```

If Tilopay sandbox requires public callback URLs, local testing may require a secure tunnel or a deployed preview URL. That setup must not be committed to the repository.

## Production URL expectations

Production should use:

```text
TILOPAY_SUCCESS_URL=https://turefugioperfecto.com.gt/reservas/pago/exitoso
TILOPAY_CANCEL_URL=https://turefugioperfecto.com.gt/reservas/pago/cancelado
TILOPAY_ERROR_URL=https://turefugioperfecto.com.gt/reservas/pago/error
TILOPAY_WEBHOOK_URL=https://turefugioperfecto.com.gt/api/payments/tilopay/webhook
```

If the production domain changes before go-live, the environment variables must be updated without changing code.

## Payment attempt lifecycle

The intended Phase 9 lifecycle is:

```text
1. Guest creates a PENDING_PAYMENT reservation hold through Phase 8.
2. Server validates payment handoff readiness.
3. Server creates an internal Payment record for the pending reservation.
4. Server sends a server-side request to Tilopay to create/start checkout.
5. Server redirects or hands the guest off to the provider-approved checkout flow.
6. Tilopay redirects the guest back to a success, cancel, or error page.
7. Tilopay sends or supports a server-side callback/webhook/confirmation flow.
8. Server validates the callback/webhook using provider-approved validation.
9. Server updates Payment status according to the validated provider result.
10. Server sets Reservation.status = CONFIRMED only after validated successful payment.
11. Server leaves Reservation.status unchanged, EXPIRED, or moves to a documented failure/cancellation state when payment fails, expires, or is rejected.
```

## Payment status policy

TRP Booking should keep payment attempts auditable.

A future Payment record should be able to represent:

```text
PENDING
PROCESSING
SUCCEEDED
FAILED
REJECTED
EXPIRED
CANCELLED
REFUNDED
```

The existing Prisma schema/enums must be reviewed before adding or changing persisted statuses. If a schema change is needed, it must be introduced through a documented Prisma migration in the correct subphase.

## Reservation status policy

Reservation status transitions must remain strict:

```text
PENDING_PAYMENT -> CONFIRMED
```

is allowed only after validated successful payment.

```text
PENDING_PAYMENT -> EXPIRED
```

is allowed when the payment window expires.

```text
PENDING_PAYMENT -> CANCELLED
```

may be allowed later when a documented guest/admin cancellation flow exists.

No provider redirect page alone should confirm a reservation. Confirmation must depend on server-side payment validation.

## Security rules

Phase 9 must follow these rules:

```text
- Do not store card data.
- Do not log Tilopay API keys, secrets, tokens, signatures, or raw sensitive payloads.
- Do not expose Tilopay credentials to the browser.
- Do not use NEXT_PUBLIC for Tilopay secrets.
- Do not trust client-submitted totals.
- Recalculate and validate reservation totals server-side.
- Revalidate availability before payment handoff.
- Confirm reservations only after validated payment.
- Keep failed and rejected payment attempts auditable.
- Do not expose raw provider errors to guests.
```

## Public response rules

Public payment endpoints should return safe data only:

```text
- Generic user-facing error code.
- Safe redirect URL if the provider flow requires it.
- Public payment attempt status where appropriate.
- Reservation id only when needed and safe.
```

Public payment endpoints must not return:

```text
- Tilopay API credentials.
- Webhook secrets.
- Raw provider payloads.
- Raw provider error bodies.
- Internal admin notes.
- Stack traces.
```

## Operational callback pages

Future public pages may include:

```text
/reservas/pago/exitoso
/reservas/pago/cancelado
/reservas/pago/error
```

Those pages should not independently confirm reservations. They should display a safe status and rely on server-side payment validation for final confirmation.

## Webhook/callback route

Future server route:

```text
POST /api/payments/tilopay/webhook
```

Expected behavior:

```text
- Accept provider callback payload.
- Validate authenticity according to Tilopay sandbox documentation/account settings.
- Match the callback to an internal Payment record.
- Be idempotent.
- Avoid duplicate confirmation on repeated callbacks.
- Update Payment status from validated provider result.
- Set Reservation.status = CONFIRMED only after validated successful payment.
- Never expose provider secrets in the response.
```

## Idempotency expectations

Future payment and webhook code should be idempotent:

```text
- Repeated webhook calls for the same provider transaction should not double-confirm.
- Repeated payment handoff attempts should not create unlimited duplicate active payments for the same pending reservation.
- Already expired reservations should not start new payment attempts.
- Already confirmed reservations should not start new payment attempts.
```

## Out of scope for Phase 9.1

This subphase intentionally does not add:

```text
- lib/payments provider code.
- Tilopay HTTP client.
- Payment record creation.
- Checkout/session/redirect endpoint.
- Webhook endpoint.
- Success/cancel/error pages.
- Reservation CONFIRMED transitions.
- Resend emails.
- Admin reservation UI.
- Prisma schema changes.
- Prisma migrations.
- PMS behavior.
```

## Files added or updated

```text
docs/53-tilopay-sandbox-strategy-and-environment-contract.md
README.md
docs/10-phases.md
docs/11-progress-log.md
```

## Validation checklist

Because 9.1 is documentation-only, validate:

```bash
npm run lint
npm run build
```

Manual review checklist:

```text
- No Tilopay real credentials were committed.
- No provider endpoint was hardcoded outside documentation placeholders.
- No Payment records are created.
- No webhook route is implemented.
- No reservation confirmation logic was added.
- Phase 9.2 is clearly identified as the next step.
```

## Next subphase

```text
9.2 Tilopay environment validation
```

Phase 9.2 should implement the server-side validation helpers for the environment variables defined in this contract before any Tilopay API call is introduced.
