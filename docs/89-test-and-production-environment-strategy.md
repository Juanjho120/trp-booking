# 89 — Test and Production Environment Strategy

## Phase Record

```text
Phase: Phase 10 — Email Notifications
Context: Environment and provider-isolation follow-up during 10.4
Status: Completed; recipient-routing contract refined during Pre-Phase-12 Package F.3
Base commit: 263b2a396ed206beb12ca407bc67472cbbead3bf
Accepted commit: d3803fb7744c5d9836db7a37001b2753c3f4c8f8
Current refinement base: 4b4f1cfa93b1cdb483f098ffffb981236b4f90a5
Related strategy: docs/85-email-notification-strategy-and-phase-10-roadmap.md
Provider foundation: docs/86-email-persistence-and-resend-provider-foundation.md
Confirmation orchestration: docs/88-guest-admin-confirmation-notification-orchestration.md
F.3 implementation record: docs/130-pre-phase-12-package-f-3-transactional-reply-to-alignment.md
```

## Purpose

Define the canonical separation between local, planned stable test, and production runtime behavior. `TRP_ENVIRONMENT` is the business/runtime source of truth; `VERCEL_ENV` is deployment metadata only.

This document also defines the final recipient-routing boundary accepted for Package F.3: local guest delivery is isolated to a developer-controlled mailbox, while the `test` runtime contract behaves like production for guest recipients without using production infrastructure. The planned Vercel Test deployment itself does not exist yet and is Phase 12 work.

## Canonical Domains

```text
Planned stable test application: https://trp-booking.juantzun.dev (not deployed as of 2026-08-07)
Test Resend sending domain:    mail.trp-booking.juantzun.dev
Test human correspondence:     juantzun.dev
Test admin mailbox:            admin@juantzun.dev
Test Spanish human alias:      reservas@juantzun.dev
Test English human alias:      reservations@juantzun.dev

Production application:        https://turefugioperfecto.com
Production Resend domain:      mail.turefugioperfecto.com
Production correspondence:     turefugioperfecto.com
Production admin mailbox:      admin@turefugioperfecto.com
```

`turefugioperfecto.com.gt` is not an active project target.

## Environment Matrix

| TRP environment | Tilopay | Email mode | Guest physical recipient | Admin physical recipient | Subject prefix |
| --- | --- | --- | --- | --- | --- |
| `local` | sandbox | disabled or test | `EMAIL_TEST_RECIPIENT` | intended `juantzun.dev` admin recipient | `[LOCAL]` |
| `test` | sandbox | disabled or test | intended reservation recipient | intended `juantzun.dev` admin recipient | `[TEST]` |
| `production` | production | disabled or production | intended reservation recipient | intended `turefugioperfecto.com` admin recipient | none |

The intended recipient stored in `EmailNotification.recipient` never changes because of a local physical-delivery override.

### Local

```text
- Localhost application and Tilopay callback URLs are allowed.
- Tilopay must remain sandbox.
- Enabled email uses the personal test Resend account and mail.trp-booking.juantzun.dev.
- Guest-audience messages are physically redirected to EMAIL_TEST_RECIPIENT.
- Admin-audience messages are not redirected and go to EMAIL_ADMIN_RECIPIENTS on juantzun.dev.
- EMAIL_TEST_RECIPIENT is required only when local email delivery is enabled.
- Subjects are prefixed [LOCAL].
- The permanent email logo loads from Cloudinary and is not clickable when the email application base URL is localhost.
```

### Planned stable test runtime

The following is the accepted contract for the future stable Test deployment. It is not evidence that the deployment already exists. Phase 12 must create and validate it.

```text
- Planned application URL is https://trp-booking.juantzun.dev.
- Tilopay must remain sandbox.
- Enabled email uses the personal test Resend account and mail.trp-booking.juantzun.dev.
- Guest-audience messages are delivered to the email entered on the reservation.
- Admin-audience messages are delivered to configured juantzun.dev recipients.
- EMAIL_TEST_RECIPIENT must be empty.
- Subjects are prefixed [TEST].
- Reply-To uses reservas@juantzun.dev / reservations@juantzun.dev.
- The deployment may have VERCEL_ENV=production while TRP_ENVIRONMENT remains test.
```

The owner is responsible for using controlled addresses during demonstrations. Test delivery intentionally exercises the real recipient-routing behavior without using production provider accounts, production domains, or production payment credentials.

### Production

```text
- Application URL is https://turefugioperfecto.com or an explicitly approved subdomain.
- Tilopay must use production.
- Email may be disabled or production, never test.
- Sender addresses use mail.turefugioperfecto.com.
- Reply-To uses reservas@turefugioperfecto.com / reservations@turefugioperfecto.com.
- Guest and admin messages use their intended recipients.
- Admin recipients must use turefugioperfecto.com.
- EMAIL_TEST_RECIPIENT must be empty.
- No environment prefix is added to subjects.
- Production credentials belong to company-owned provider accounts.
```

## Audience-Aware Provider Contract

Every provider send request identifies its audience explicitly:

```text
audience = guest | admin
```

The provider must not infer audience from the recipient address. This avoids ambiguous cases such as a guest entering an address that happens to match an administrative mailbox.

Routing is resolved only at the provider boundary:

```text
local + guest  -> EMAIL_TEST_RECIPIENT
local + admin  -> intended recipient

test + guest   -> intended recipient
test + admin   -> intended recipient

prod + guest   -> intended recipient
prod + admin   -> intended recipient
```

No Prisma field, notification deduplication key, retry rule, or reservation/payment transition changes because of this routing policy.

## Zoho Mail Boundary

The personal Zoho organization on `juantzun.dev` is intentionally reusable across development projects. TRP Booking currently uses:

```text
admin@juantzun.dev
reservas@juantzun.dev
reservations@juantzun.dev
```

Other projects may use other aliases under the same personal domain without requiring TRP Booking to infer or own those aliases.

The environment validator therefore enforces the administrative mailbox **domain** rather than a single hardcoded local part:

```text
local/test admin recipients -> exact domain juantzun.dev
production admin recipients -> exact domain turefugioperfecto.com
```

TRP Booking's documented default remains `admin@juantzun.dev` for local/test.

## Resend Account Ownership

### Personal test account

```text
Purpose: local and stable-test automatic delivery
Verified domain: mail.trp-booking.juantzun.dev
Allowed TRP environments: local, test
```

The personal account must never become a production dependency.

### Future company account

```text
Purpose: production transactional delivery
Verified domain: mail.turefugioperfecto.com
Allowed TRP environment: production
```

No domain transfer from the personal account is required.

## Permanent Transactional Email Logo

The canonical public asset is:

```text
https://res.cloudinary.com/juan-tzun-portfolio/image/upload/v1784668172/trp-booking/brand/logo-primary.png
```

`EMAIL_BRAND_LOGO_URL` controls the image `src`. `EMAIL_PUBLIC_BASE_URL` controls application links.

```text
Local:
  img src -> Cloudinary
  logo href -> omitted when brand URL resolves to localhost/loopback

Test (once deployed):
  img src -> Cloudinary
  logo href -> https://trp-booking.juantzun.dev

Production:
  img src -> Cloudinary
  logo href -> https://turefugioperfecto.com
```

The image must always use public HTTPS and must never depend on localhost.

## Environment Examples

### Local development with real email delivery

```env
TRP_ENVIRONMENT="local"
TILOPAY_ENVIRONMENT="sandbox"
EMAIL_DELIVERY_MODE="test"
EMAIL_FROM_ES="Tu Refugio Perfecto Test <reservas@mail.trp-booking.juantzun.dev>"
EMAIL_FROM_EN="Tu Refugio Perfecto Test <reservations@mail.trp-booking.juantzun.dev>"
EMAIL_REPLY_TO_ES="reservas@juantzun.dev"
EMAIL_REPLY_TO_EN="reservations@juantzun.dev"
EMAIL_ADMIN_RECIPIENTS="admin@juantzun.dev"
EMAIL_ADMIN_LOCALE="es"
EMAIL_PUBLIC_BASE_URL="http://localhost:3000"
EMAIL_BRAND_LOGO_URL="https://res.cloudinary.com/juan-tzun-portfolio/image/upload/v1784668172/trp-booking/brand/logo-primary.png"
EMAIL_TEST_RECIPIENT="YOUR_PERSONAL_TEST_MAILBOX"
```

Only guest-audience messages use `EMAIL_TEST_RECIPIENT`; admin messages still go to `admin@juantzun.dev`.

### Planned stable test deployment — Phase 12

No stable Vercel Test deployment exists yet as of 2026-08-07. The values below remain the target configuration for Phase 12 bootstrap and validation.

```env
TRP_ENVIRONMENT="test"
TILOPAY_ENVIRONMENT="sandbox"
EMAIL_DELIVERY_MODE="test"
EMAIL_FROM_ES="Tu Refugio Perfecto Test <reservas@mail.trp-booking.juantzun.dev>"
EMAIL_FROM_EN="Tu Refugio Perfecto Test <reservations@mail.trp-booking.juantzun.dev>"
EMAIL_REPLY_TO_ES="reservas@juantzun.dev"
EMAIL_REPLY_TO_EN="reservations@juantzun.dev"
EMAIL_ADMIN_RECIPIENTS="admin@juantzun.dev"
EMAIL_ADMIN_LOCALE="es"
EMAIL_PUBLIC_BASE_URL="https://trp-booking.juantzun.dev"
EMAIL_BRAND_LOGO_URL="https://res.cloudinary.com/juan-tzun-portfolio/image/upload/v1784668172/trp-booking/brand/logo-primary.png"
EMAIL_TEST_RECIPIENT=""
```

### Future production

```env
TRP_ENVIRONMENT="production"
TILOPAY_ENVIRONMENT="production"
EMAIL_DELIVERY_MODE="production"
EMAIL_FROM_ES="Tu Refugio Perfecto <reservas@mail.turefugioperfecto.com>"
EMAIL_FROM_EN="Tu Refugio Perfecto <reservations@mail.turefugioperfecto.com>"
EMAIL_REPLY_TO_ES="reservas@turefugioperfecto.com"
EMAIL_REPLY_TO_EN="reservations@turefugioperfecto.com"
EMAIL_ADMIN_RECIPIENTS="admin@turefugioperfecto.com"
EMAIL_ADMIN_LOCALE="es"
EMAIL_PUBLIC_BASE_URL="https://turefugioperfecto.com"
EMAIL_BRAND_LOGO_URL="https://res.cloudinary.com/juan-tzun-portfolio/image/upload/v1784668172/trp-booking/brand/logo-primary.png"
EMAIL_TEST_RECIPIENT=""
```

## Validation Rules

```text
- TRP_ENVIRONMENT is required.
- local/test require Tilopay sandbox; production requires Tilopay production.
- local/test enabled email requires EMAIL_DELIVERY_MODE=test.
- production enabled email requires EMAIL_DELIVERY_MODE=production.
- local + enabled email requires EMAIL_TEST_RECIPIENT.
- test and production forbid EMAIL_TEST_RECIPIENT.
- local/test From uses mail.trp-booking.juantzun.dev.
- production From uses mail.turefugioperfecto.com.
- local/test Reply-To uses the exact approved juantzun.dev ES/EN aliases.
- production Reply-To uses the exact approved turefugioperfecto.com ES/EN aliases.
- local/test admin recipients use juantzun.dev.
- production admin recipients use turefugioperfecto.com.
- EMAIL_BRAND_LOGO_URL is public HTTPS and cannot use localhost or embedded credentials.
```

## Validation Gate

```text
npm run email:contract:validate
npm run env:validate
npm run lint
npm run build
git diff --check
```

No Prisma migration, database backfill, new email provider, inbound mailbox synchronization, or production credential is part of this refinement.
