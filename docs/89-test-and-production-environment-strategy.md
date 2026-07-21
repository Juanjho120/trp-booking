# 89 — Test and Production Environment Strategy

## Phase Record

```text
Phase: Phase 10 — Email Notifications
Context: Environment and provider-isolation follow-up during 10.4
Status: Implementation prepared; pending local validation and commit
Base commit: 263b2a396ed206beb12ca407bc67472cbbead3bf
Related strategy: docs/85-email-notification-strategy-and-phase-10-roadmap.md
Provider foundation: docs/86-email-persistence-and-resend-provider-foundation.md
Confirmation orchestration: docs/88-guest-admin-confirmation-notification-orchestration.md
```

## Purpose

Define an explicit separation between local, test, and production business/runtime environments so that deployment-platform metadata does not accidentally select payment or email provider behavior.

This document is the canonical source for the current domain, Resend-account, and environment matrix. It supersedes older `.com.gt` domain examples and any earlier rule that treated `VERCEL_ENV=production` as equivalent to the Tu Refugio Perfecto production business environment.

## Canonical Domains

```text
Production public application
https://turefugioperfecto.com

Stable test application
https://trp-booking.juantzun.dev

Test Resend sending domain
mail.trp-booking.juantzun.dev

Production Resend sending domain
mail.turefugioperfecto.com
```

`turefugioperfecto.com.gt` is no longer an active project target. New application URLs, sender addresses, reply-to addresses, provider validation, and documentation must not introduce that domain.

## Source of Truth

New server-side variable:

```env
TRP_ENVIRONMENT="local|test|production"
```

`TRP_ENVIRONMENT` controls the allowed business/runtime provider matrix. `VERCEL_ENV` remains useful deployment metadata, but it must not be the only signal used to decide whether Tilopay or Resend is operating against test or production resources.

This distinction is required because the stable test application may use a Vercel production deployment and custom domain while still being:

```env
TRP_ENVIRONMENT="test"
TILOPAY_ENVIRONMENT="sandbox"
EMAIL_DELIVERY_MODE="test"
```

## Environment Matrix

| TRP environment | Public application URL | Tilopay | Email mode | Resend account | Verified sending domain |
| --- | --- | --- | --- | --- | --- |
| `local` | `http://localhost:3000` or test URL for public email assets | `sandbox` | `disabled` or `test` | Personal test account | `mail.trp-booking.juantzun.dev` |
| `test` | `https://trp-booking.juantzun.dev` | `sandbox` | `disabled` or `test` | Personal test account | `mail.trp-booking.juantzun.dev` |
| `production` | `https://turefugioperfecto.com` | `production` | `disabled` or `production` | Tu Refugio Perfecto company account | `mail.turefugioperfecto.com` |

### Local

```text
- Localhost URLs are allowed for the application and Tilopay callbacks.
- The deployed test URL is also allowed when email content needs publicly reachable images and links.
- Tilopay must remain sandbox.
- Email may remain disabled for normal development.
- Real email tests use the personal test Resend account and EMAIL_DELIVERY_MODE=test.
- Every provider delivery is redirected to EMAIL_TEST_RECIPIENT.
```

### Test

```text
- The canonical application URL is https://trp-booking.juantzun.dev.
- Tilopay must remain sandbox.
- Email may be disabled or test, never production.
- Sender addresses must use the exact verified domain mail.trp-booking.juantzun.dev.
- Reply-to addresses must remain under the isolated test sending domain.
- The intended guest/admin recipient remains persisted, but Resend receives only EMAIL_TEST_RECIPIENT.
- The deployment may have VERCEL_ENV=production without becoming the TRP production environment.
```

### Production

```text
- The canonical application URL is https://turefugioperfecto.com or an explicitly approved subdomain.
- Tilopay must use production.
- Email may be disabled or production, never test.
- Sender addresses must use the exact verified sending domain mail.turefugioperfecto.com.
- Reply-to addresses may use turefugioperfecto.com or an approved subdomain.
- EMAIL_TEST_RECIPIENT must be empty.
- Actual intended guest/admin recipients are delivered.
- Production credentials belong to company-owned provider accounts.
```

## Resend Account Ownership

### Personal test account

```text
Owner: current personal development account
Purpose: local and deployed test delivery only
Verified domain: mail.trp-booking.juantzun.dev
API key scope: test project only
Allowed modes: EMAIL_DELIVERY_MODE=test
Real recipient routing: EMAIL_TEST_RECIPIENT only
```

The personal account must never verify or send from the production domain. It must not store the future production API key or become an operational dependency for the business.

### Future company account

```text
Owner: Tu Refugio Perfecto company account
Purpose: production transactional delivery
Verified domain: mail.turefugioperfecto.com
API key scope: production project only
Allowed mode: EMAIL_DELIVERY_MODE=production
Real recipient routing: intended guest/admin addresses
```

There is no need to transfer the personal test domain to the company account. Production should be added and verified independently in the company account when the business deployment is ready.

## Why Sending Subdomains Are Separate

The public application hostname and the email sending domain serve different purposes:

```text
Application test: trp-booking.juantzun.dev
Email test:       mail.trp-booking.juantzun.dev

Application prod: turefugioperfecto.com
Email prod:       mail.turefugioperfecto.com
```

This keeps provider DNS records isolated, avoids coupling the website hostname to email return-path configuration, and separates test sender reputation from future production sender reputation.

## Cloudflare DNS Contract for Test Resend

The domain added to the personal Resend account is:

```text
mail.trp-booking.juantzun.dev
```

Resend generates the authoritative SPF, DKIM, and return-path records. Their values must be copied exactly; repository documentation must never contain a live DKIM key or provider credential.

When the Cloudflare DNS zone is `juantzun.dev`, Cloudflare record names are relative to that zone. Typical generated full names map as follows:

```text
Resend full hostname                            Cloudflare Name
send.mail.trp-booking.juantzun.dev             send.mail.trp-booking
resend._domainkey.mail.trp-booking.juantzun.dev resend._domainkey.mail.trp-booking
```

The Resend dashboard remains the source of truth for record type, host/name, content/value, and MX priority. Do not invent values or reuse examples from another domain.

Cloudflare rules:

```text
- MX and TXT records remain DNS-only.
- Any Resend verification/tracking CNAME must use DNS only, not the orange-cloud proxy.
- Confirm the final hostname preview before saving because Cloudflare appends juantzun.dev automatically.
- Do not duplicate an existing SPF record at the same hostname; merge only when explicitly required by the DNS/provider configuration.
```

## Environment Examples

### Local development without email delivery

```env
TRP_ENVIRONMENT="local"
TILOPAY_ENVIRONMENT="sandbox"
EMAIL_DELIVERY_MODE="disabled"
EMAIL_PUBLIC_BASE_URL="http://localhost:3000"
```

No Resend API key is required while delivery is disabled.

### Local development with real test delivery

```env
TRP_ENVIRONMENT="local"
TILOPAY_ENVIRONMENT="sandbox"
EMAIL_DELIVERY_MODE="test"
RESEND_API_KEY="re_LOCAL_TEST_KEY"
EMAIL_FROM_ES="Tu Refugio Perfecto Test <reservas@mail.trp-booking.juantzun.dev>"
EMAIL_FROM_EN="Tu Refugio Perfecto Test <reservations@mail.trp-booking.juantzun.dev>"
EMAIL_REPLY_TO_ES="reservas@mail.trp-booking.juantzun.dev"
EMAIL_REPLY_TO_EN="reservations@mail.trp-booking.juantzun.dev"
EMAIL_ADMIN_RECIPIENTS="your-admin-test-address@your-domain.example"
EMAIL_ADMIN_LOCALE="es"
EMAIL_PUBLIC_BASE_URL="https://trp-booking.juantzun.dev"
EMAIL_TEST_RECIPIENT="your-safe-test-inbox@your-domain.example"
```

Using the deployed test base URL during local email tests is recommended because email clients cannot load a logo or follow links from the developer's localhost. The application itself may still run locally.

### Stable Vercel test deployment

```env
TRP_ENVIRONMENT="test"
TILOPAY_ENVIRONMENT="sandbox"
EMAIL_DELIVERY_MODE="test"
RESEND_API_KEY="re_VERCEL_TEST_KEY"
EMAIL_FROM_ES="Tu Refugio Perfecto Test <reservas@mail.trp-booking.juantzun.dev>"
EMAIL_FROM_EN="Tu Refugio Perfecto Test <reservations@mail.trp-booking.juantzun.dev>"
EMAIL_REPLY_TO_ES="reservas@mail.trp-booking.juantzun.dev"
EMAIL_REPLY_TO_EN="reservations@mail.trp-booking.juantzun.dev"
EMAIL_ADMIN_RECIPIENTS="your-admin-test-address@your-domain.example"
EMAIL_ADMIN_LOCALE="es"
EMAIL_PUBLIC_BASE_URL="https://trp-booking.juantzun.dev"
EMAIL_TEST_RECIPIENT="your-safe-test-inbox@your-domain.example"
```

All Tilopay callback URLs in this environment must also use `https://trp-booking.juantzun.dev`.

### Future production

```env
TRP_ENVIRONMENT="production"
TILOPAY_ENVIRONMENT="production"
EMAIL_DELIVERY_MODE="production"
RESEND_API_KEY="re_COMPANY_PRODUCTION_KEY"
EMAIL_FROM_ES="Tu Refugio Perfecto <reservas@mail.turefugioperfecto.com>"
EMAIL_FROM_EN="Tu Refugio Perfecto <reservations@mail.turefugioperfecto.com>"
EMAIL_REPLY_TO_ES="reservas@turefugioperfecto.com"
EMAIL_REPLY_TO_EN="reservations@turefugioperfecto.com"
EMAIL_ADMIN_RECIPIENTS="admin@turefugioperfecto.com"
EMAIL_ADMIN_LOCALE="es"
EMAIL_PUBLIC_BASE_URL="https://turefugioperfecto.com"
EMAIL_TEST_RECIPIENT=""
```

The production values are a future contract only. Do not create or reuse production credentials in the current personal test account.

## Validation Rules Added

```text
- TRP_ENVIRONMENT is required.
- local/test require TILOPAY_ENVIRONMENT=sandbox.
- production requires TILOPAY_ENVIRONMENT=production.
- local/test enabled email requires EMAIL_DELIVERY_MODE=test.
- production enabled email requires EMAIL_DELIVERY_MODE=production.
- test mode requires EMAIL_TEST_RECIPIENT.
- production mode forbids EMAIL_TEST_RECIPIENT.
- test application URLs use trp-booking.juantzun.dev outside localhost.
- production application URLs use turefugioperfecto.com.
- test From addresses use the exact verified domain mail.trp-booking.juantzun.dev.
- production From addresses use the exact verified domain mail.turefugioperfecto.com.
- VERCEL_ENV no longer selects the TRP business environment.
- Missing or invalid admin routing falls back to the test admin address outside production and never to a production recipient.
```

## Operational Migration to the Company Account

When production becomes ready:

```text
1. Create the Tu Refugio Perfecto company Resend account.
2. Add and verify mail.turefugioperfecto.com in that account.
3. Create a production-only Resend API key.
4. Configure only the Vercel production environment with the company key and production sender values.
5. Keep the personal account, test domain, and test API key isolated from production.
6. Run environment validation before deployment.
7. Send controlled production smoke tests before enabling real reservation traffic.
```

The test deployment continues to use the personal account and test domain. No domain transfer is required.

## Delivered Files

```text
AGENTS.md
README.md
.env.example
config/site.ts
lib/env/server.ts
lib/email/reservation-confirmation-notifications.ts
docs/89-test-and-production-environment-strategy.md
```

## Validation Gate

Run locally after copying the files:

```text
npm run env:validate
npm run lint
npm run build
git diff --check
```

Validate these scenarios separately:

```text
1. TRP_ENVIRONMENT=local + EMAIL_DELIVERY_MODE=disabled succeeds without a Resend key.
2. TRP_ENVIRONMENT=local + EMAIL_DELIVERY_MODE=test accepts localhost or the deployed test URL.
3. TRP_ENVIRONMENT=test + VERCEL_ENV=production + Tilopay sandbox + email test succeeds.
4. Test configuration rejects production sender domains and EMAIL_DELIVERY_MODE=production.
5. Production configuration rejects sandbox Tilopay, test email mode, test senders, and EMAIL_TEST_RECIPIENT.
6. No active configuration or canonical project identity references turefugioperfecto.com.gt.
```

## Explicit Non-Goals

This environment follow-up does not add:

```text
- a new Prisma migration
- new database fields
- a second email provider
- Resend webhook processing
- retry cron behavior
- admin delivery-history UI
- manual resend behavior
- production API keys or DNS secrets
- production-domain verification in the personal account
- cancellation, refund, change-request, or PMS behavior
```
