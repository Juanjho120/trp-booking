# 89 — Test and Production Environment Strategy

## Phase Record

```text
Phase: Phase 10 — Email Notifications
Context: Environment and provider-isolation follow-up during 10.4
Status: Completed; recipient-routing contract refined during Pre-Phase-12 Package F.3; deployment/provider ownership refined in Phase 12.1
Base commit: 263b2a396ed206beb12ca407bc67472cbbead3bf
Accepted commit: d3803fb7744c5d9836db7a37001b2753c3f4c8f8
Current refinement base: 4b4f1cfa93b1cdb483f098ffffb981236b4f90a5
Related strategy: docs/85-email-notification-strategy-and-phase-10-roadmap.md
Provider foundation: docs/86-email-persistence-and-resend-provider-foundation.md
Confirmation orchestration: docs/88-guest-admin-confirmation-notification-orchestration.md
F.3 implementation record: docs/130-pre-phase-12-package-f-3-transactional-reply-to-alignment.md
Phase 12.1 environment/deployment record: docs/136-phase-12.1-test-deployment-and-environment-strategy.md
```

## Purpose

Define the canonical separation between Local, Test, and Production runtime behavior and provider ownership. `TRP_ENVIRONMENT` is the business/runtime source of truth; `VERCEL_ENV` is deployment metadata only.

Package F.3 owns recipient routing. Phase 12.1 now freezes the deployment split: Phase 12 creates and validates only the developer-owned Test deployment, while Phase 13 provisions the company-owned Production stack and performs go-live. The Vercel Test deployment does not exist yet as of 2026-08-10.

## Canonical Domains

```text
Planned stable test application: https://trp-booking.juantzun.dev (not deployed as of 2026-08-10)
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

## Provider Ownership Matrix

| Resource | Local | Test — Phase 12 | Production — Phase 13 |
| --- | --- | --- | --- |
| Vercel | none | new TRP Booking project in the developer's existing personal account | new company-owned account/project |
| Application domain | `localhost:3000` | `trp-booking.juantzun.dev` | `turefugioperfecto.com` |
| Supabase/PostgreSQL | developer-owned database used by the portfolio project | same database as Local | new company-owned Supabase account/project |
| Tilopay | existing sandbox account | same sandbox account as Local | new company-owned production account/credentials |
| Resend | existing personal account | same account/domain as Local | new company-owned account/domain |
| Zoho Mail | existing `juantzun.dev` organization | same organization/aliases as Local | new company-owned organization for `turefugioperfecto.com` |
| Cloudinary | existing personal account | same account/assets as Local | new company-owned account |
| Admin Google/Auth.js identity | developer-owned Local setup | developer-owned Test setup/callback configuration | company Gmail/Google identity |
| `CRON_SECRET` | Local secret | new Test-only secret | new Production-only secret |
| Airbnb inbound iCal | development/controlled use | real listing iCal URLs | real listing iCal URLs |
| TRP outbound iCal | local endpoint | Test endpoint used for controlled real-Airbnb validation | Production endpoint used by live listings |

### Shared Local/Test infrastructure decision

Local and Test deliberately share the same developer-owned database and provider accounts listed above. No dedicated Test Supabase, Resend, Zoho, Cloudinary, or Tilopay account is created in Phase 12.

The owner explicitly accepts responsibility for controlling Local/Test data while the Test outbound iCal is connected to real Airbnb listings. Phase 12.1 does **not** add environment-based reservation partitioning, database separation, or iCal filtering. Such a change requires a future explicit request.

### Test DNS boundary

The existing `juantzun.dev` email configuration is reused. Phase 12 does not redo Zoho MX/SPF/DKIM/DMARC or the existing Resend sending-domain configuration. The only new DNS work expected for Test is the application-domain record needed to attach `trp-booking.juantzun.dev` to the Vercel Test project.

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

### Stable Test runtime — Phase 12

The following is the accepted contract for the Test deployment. It is not evidence that the deployment already exists. Phase 12.2 must create the Vercel project and first deployment, and later Phase 12 subphases validate the hosted integrations.

```text
- Planned application URL is https://trp-booking.juantzun.dev.
- Hosting is a new TRP Booking project in the developer's existing personal Vercel account.
- Database is the same developer-owned Supabase database used by Local.
- Tilopay remains the same sandbox account used by Local.
- Enabled email uses the same personal Resend account and mail.trp-booking.juantzun.dev.
- Human correspondence uses the same juantzun.dev Zoho organization and aliases.
- Cloudinary uses the same personal account/assets as Local.
- Test has its own CRON_SECRET.
- Real Airbnb inbound iCal URLs are configured for hosted sync validation.
- TRP Booking exposes a Test outbound iCal for controlled validation against the real Airbnb listings.
- Guest-audience messages are delivered to the email entered on the reservation.
- Admin-audience messages are delivered to configured juantzun.dev recipients.
- EMAIL_TEST_RECIPIENT must be empty.
- Subjects are prefixed [TEST].
- Reply-To uses reservas@juantzun.dev / reservations@juantzun.dev.
- The deployment may have VERCEL_ENV=production while TRP_ENVIRONMENT remains test.
- No separate Local/Test database or iCal partition is introduced.
```

The owner is responsible for using controlled addresses during demonstrations. Test delivery intentionally exercises the real recipient-routing behavior without using production provider accounts, production domains, or production payment credentials.

### Production

```text
- Production is Phase 13 work and starts only after successful Phase 12 Test closure.
- Application URL is https://turefugioperfecto.com or an explicitly approved subdomain.
- Vercel, Supabase, Tilopay, Resend, Zoho, and Cloudinary use new company-owned accounts.
- Admin Auth.js/Google login uses a company-owned Gmail/Google identity.
- Production DNS for the application and email providers is configured under turefugioperfecto.com.
- Tilopay must use production credentials from the company account.
- Email may be disabled or production, never test.
- Sender addresses use mail.turefugioperfecto.com.
- Reply-To uses reservas@turefugioperfecto.com / reservations@turefugioperfecto.com.
- Guest and admin messages use their intended recipients.
- Admin recipients must use turefugioperfecto.com.
- EMAIL_TEST_RECIPIENT must be empty.
- Production has its own CRON_SECRET.
- No environment prefix is added to subjects.
- No developer-owned Local/Test provider credential becomes a Production dependency.
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
Purpose: Local and Phase 12 Test automatic delivery
Verified domain: mail.trp-booking.juantzun.dev
Allowed TRP environments: local, test
```

The personal account must never become a production dependency.

### Phase 13 company account

```text
Purpose: production transactional delivery
Verified domain: mail.turefugioperfecto.com
Allowed TRP environment: production
```

No domain transfer from the personal account is required.

## Transactional Email Logo Ownership

Local and Test currently use the developer-owned public asset:

```text
https://res.cloudinary.com/juan-tzun-portfolio/image/upload/v1784668172/trp-booking/brand/logo-primary.png
```

`EMAIL_BRAND_LOGO_URL` controls the image `src`. `EMAIL_PUBLIC_BASE_URL` controls application links.

```text
Local:
  img src -> current developer-owned Cloudinary asset
  logo href -> omitted when brand URL resolves to localhost/loopback

Test (once deployed):
  img src -> same developer-owned Cloudinary asset as Local
  logo href -> https://trp-booking.juantzun.dev

Production — Phase 13:
  img src -> company-owned Cloudinary asset
  logo href -> https://turefugioperfecto.com
```

Phase 13 must upload/migrate the approved production brand asset to the company-owned Cloudinary account and update `EMAIL_BRAND_LOGO_URL` before go-live. Every environment's logo URL must use public HTTPS and must never depend on localhost.

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

### Stable Test deployment — Phase 12

No Vercel Test deployment exists yet as of 2026-08-10. The values below remain the target configuration; 12.2 creates the project/deployment and later Phase 12 subphases validate it.

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

### Future Production — Phase 13

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
EMAIL_BRAND_LOGO_URL="<company-owned public HTTPS logo URL>"
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

Phase 12.1 is documentation-only: no Prisma migration, database backfill, provider account, DNS record, secret, deployment, inbound mailbox synchronization, or application code is changed by this refinement.
