# 130 — Pre-Phase 12 Package F.3 Transactional Reply-To and Recipient Routing Alignment

## Phase Record

```text
Track: Pre-Phase-12 Improvement Track
Package: F — Zoho Mail guest correspondence bridge
Subpackage: F.3 — Transactional Reply-To and environment-aware recipient routing
Status: In progress — original round-trip matrix passed; routing refinement pending reduced regression
Base commit: fceed7e21bd41cb09169b26979f42d2f7bfa26da
Initial F.3 implementation commit: 4b4f1cfa93b1cdb483f098ffffb981236b4f90a5
F.2 acceptance: Completed
Next after F.3 acceptance: F.4 — Reservation-to-Zoho navigation
Phase 12: Not started
```

## Purpose

Align automatic transactional delivery with the Zoho human-correspondence boundary without turning Zoho into the transactional provider or TRP Booking into a mailbox client.

The original F.3 implementation separated technical Resend sender addresses from human Reply-To aliases. The first full ES/EN E2E matrix passed successfully. During acceptance, two refinements were identified and are incorporated into this package before formal closure:

```text
1. Use the permanent Cloudinary brand asset consistently and avoid a localhost logo hyperlink in delivered local emails.
2. Differentiate local safety routing from stable-test routing so test can exercise real guest recipients while local remains isolated.
```

## Accepted Provider Boundary

```text
Automatic transactional delivery -> Resend
Human guest correspondence       -> Zoho Mail
Transactional history            -> EmailNotification in TRP Booking
Human mailbox history            -> Zoho Mail
```

Resend keeps the technical sender domains:

```text
local/test:
  reservas@mail.trp-booking.juantzun.dev
  reservations@mail.trp-booking.juantzun.dev

production:
  reservas@mail.turefugioperfecto.com
  reservations@mail.turefugioperfecto.com
```

Human Reply-To addresses remain:

```text
local/test ES: reservas@juantzun.dev
local/test EN: reservations@juantzun.dev
production ES: reservas@turefugioperfecto.com
production EN: reservations@turefugioperfecto.com
```

## Original F.3 Acceptance Already Completed

The owner completed the original matrix successfully before this refinement. The accepted evidence includes:

```text
- ES automatic Resend message delivered successfully.
- EN automatic Resend message delivered successfully.
- ES From remained the technical Resend sender.
- EN From remained the technical Resend sender.
- ES Reply-To resolved to reservas@juantzun.dev.
- EN Reply-To resolved to reservations@juantzun.dev.
- Replies reached the Zoho mailbox.
- Zoho replies preserved the matching ES/EN public alias.
- SPF passed.
- DKIM passed.
- DMARC passed.
- EmailNotification intended-recipient persistence remained intact.
- Retry/history behavior remained intact.
```

Those tests do not need to be repeated in full after the refinement. Only the reduced regression matrix in this document remains before F.3 formal acceptance.

## Refinement A — Explicit Email Audience

Provider routing must not infer whether an email is administrative by comparing recipient strings.

`EmailProviderSendInput` now carries:

```ts
audience: "guest" | "admin"
```

Each current dispatcher resolves this from its domain type:

```text
Reservation confirmation dispatcher
  RESERVATION_CONFIRMED -> guest
  ARRIVAL_INSTRUCTIONS -> guest
  ADMIN_NEW_RESERVATION -> admin

Lifecycle dispatcher
  uses lifecycle-notification-contract.ts audience metadata

Lifecycle-adjustment payment dispatcher
  DATE_CHANGE_PAYMENT_REQUIRED -> guest
  STAY_EXTENSION_PAYMENT_REQUIRED -> guest
  ADMIN_*_PAYMENT_LINK_DELIVERY_STATUS -> admin
```

This is intentionally a provider-boundary concern only. No audience field is added to Prisma and no `EmailNotification` migration is required.

## Refinement B — Environment-Aware Physical Recipient Routing

### Local

```text
TRP_ENVIRONMENT=local
EMAIL_DELIVERY_MODE=test
```

Routing:

```text
guest audience
  intended recipient remains persisted
  physical delivery -> EMAIL_TEST_RECIPIENT

admin audience
  intended recipient remains persisted
  physical delivery -> intended EMAIL_ADMIN_RECIPIENTS address
```

The normal TRP local admin mailbox is:

```text
admin@juantzun.dev
```

`EMAIL_TEST_RECIPIENT` is required only for enabled local delivery and should be a personal mailbox controlled by the developer. It is intentionally not documented with a real personal address.

Local subjects use:

```text
[LOCAL] <original subject>
```

### Stable test

```text
TRP_ENVIRONMENT=test
EMAIL_DELIVERY_MODE=test
```

Routing:

```text
guest audience -> intended reservation email
admin audience -> intended juantzun.dev admin email
EMAIL_TEST_RECIPIENT -> must be empty
```

Stable-test subjects use:

```text
[TEST] <original subject>
```

This lets the stable test deployment exercise production-like recipient routing while retaining complete infrastructure isolation:

```text
Tilopay sandbox
personal test Resend account
mail.trp-booking.juantzun.dev
juantzun.dev Zoho organization
non-production database/environment
```

The owner is responsible for using controlled guest addresses during demos.

### Production

```text
TRP_ENVIRONMENT=production
EMAIL_DELIVERY_MODE=production
```

Routing:

```text
guest audience -> intended reservation email
admin audience -> intended turefugioperfecto.com admin email
EMAIL_TEST_RECIPIENT -> empty
subject prefix -> none
```

No production operational variable, provider account, DNS record, or mailbox is changed by this patch.

## Admin Recipient Domain Contract

The shared personal Zoho organization may be reused by future personal projects with project-specific aliases. Therefore local/test validation constrains the **domain**, not a single local part:

```text
local/test EMAIL_ADMIN_RECIPIENTS -> exact domain juantzun.dev
production EMAIL_ADMIN_RECIPIENTS -> exact domain turefugioperfecto.com
```

TRP Booking continues to use this documented default:

```text
admin@juantzun.dev
```

## Refinement C — Permanent Brand Logo

Canonical asset:

```text
https://res.cloudinary.com/juan-tzun-portfolio/image/upload/v1784668172/trp-booking/brand/logo-primary.png
```

The implementation already separates:

```text
EMAIL_BRAND_LOGO_URL -> image src
EMAIL_PUBLIC_BASE_URL -> application links
```

The acceptance observation was caused by the shared layout wrapping the correct Cloudinary image in a link to `EMAIL_PUBLIC_BASE_URL`. In local that produced:

```text
img src = Cloudinary
anchor href = http://localhost:3000/
```

The refined shared layout now behaves as follows:

```text
local:
  img src -> Cloudinary
  logo link -> omitted for localhost/loopback brand URLs

test:
  img src -> Cloudinary
  logo link -> https://trp-booking.juantzun.dev

production:
  img src -> Cloudinary
  logo link -> https://turefugioperfecto.com
```

No template-specific logo fork is introduced. Reservation, arrival, lifecycle, refund, and lifecycle-adjustment templates continue to use the shared layout and `EMAIL_BRAND_LOGO_URL`.

## Environment Contract

### Local example

```env
TRP_ENVIRONMENT="local"
EMAIL_DELIVERY_MODE="test"
EMAIL_FROM_ES="Tu Refugio Perfecto Test <reservas@mail.trp-booking.juantzun.dev>"
EMAIL_FROM_EN="Tu Refugio Perfecto Test <reservations@mail.trp-booking.juantzun.dev>"
EMAIL_REPLY_TO_ES="reservas@juantzun.dev"
EMAIL_REPLY_TO_EN="reservations@juantzun.dev"
EMAIL_ADMIN_RECIPIENTS="admin@juantzun.dev"
EMAIL_PUBLIC_BASE_URL="http://localhost:3000"
EMAIL_BRAND_LOGO_URL="https://res.cloudinary.com/juan-tzun-portfolio/image/upload/v1784668172/trp-booking/brand/logo-primary.png"
EMAIL_TEST_RECIPIENT="<personal local test mailbox>"
```

### Stable test example

```env
TRP_ENVIRONMENT="test"
EMAIL_DELIVERY_MODE="test"
EMAIL_FROM_ES="Tu Refugio Perfecto Test <reservas@mail.trp-booking.juantzun.dev>"
EMAIL_FROM_EN="Tu Refugio Perfecto Test <reservations@mail.trp-booking.juantzun.dev>"
EMAIL_REPLY_TO_ES="reservas@juantzun.dev"
EMAIL_REPLY_TO_EN="reservations@juantzun.dev"
EMAIL_ADMIN_RECIPIENTS="admin@juantzun.dev"
EMAIL_PUBLIC_BASE_URL="https://trp-booking.juantzun.dev"
EMAIL_BRAND_LOGO_URL="https://res.cloudinary.com/juan-tzun-portfolio/image/upload/v1784668172/trp-booking/brand/logo-primary.png"
EMAIL_TEST_RECIPIENT=""
```

### Future production example

```env
TRP_ENVIRONMENT="production"
EMAIL_DELIVERY_MODE="production"
EMAIL_FROM_ES="Tu Refugio Perfecto <reservas@mail.turefugioperfecto.com>"
EMAIL_FROM_EN="Tu Refugio Perfecto <reservations@mail.turefugioperfecto.com>"
EMAIL_REPLY_TO_ES="reservas@turefugioperfecto.com"
EMAIL_REPLY_TO_EN="reservations@turefugioperfecto.com"
EMAIL_ADMIN_RECIPIENTS="admin@turefugioperfecto.com"
EMAIL_PUBLIC_BASE_URL="https://turefugioperfecto.com"
EMAIL_BRAND_LOGO_URL="https://res.cloudinary.com/juan-tzun-portfolio/image/upload/v1784668172/trp-booking/brand/logo-primary.png"
EMAIL_TEST_RECIPIENT=""
```

## Files in the Refinement Patch

```text
AGENTS.md
README.md
.env.example
config/site.ts
emails/components/email-layout.tsx
lib/env/server.ts
lib/email/resend-provider.ts
lib/email/reservation-confirmation-notifications.ts
lib/email/lifecycle-notifications.ts
lib/email/lifecycle-adjustment-payment-notifications.ts
types/email-provider.ts
scripts/validate-email-reply-to-contract.ts
docs/89-test-and-production-environment-strategy.md
docs/90-transactional-email-brand-logo-hosting.md
docs/130-pre-phase-12-package-f-3-transactional-reply-to-alignment.md
```

No Prisma schema, migration, dependency, message catalog, reservation/payment transition, or production provider configuration is changed.

## Static Validation

Run after applying the patch:

```text
npm run email:contract:validate
npm run env:validate
npm run lint
npm run build
git diff --check
```

The contract script covers:

```text
- local valid routing configuration
- stable test valid routing configuration
- production valid routing configuration
- local EMAIL_TEST_RECIPIENT required
- test EMAIL_TEST_RECIPIENT rejected
- production EMAIL_TEST_RECIPIENT rejected
- Reply-To environment isolation
- From sending-domain isolation
- admin-recipient domain isolation
- local guest physical override
- local admin direct routing
- stable-test guest/admin direct routing
- production guest/admin direct routing
- [LOCAL] / [TEST] / no-prefix subject behavior
```

## Reduced Functional Regression Matrix

Because the original full F.3 ES/EN round-trip matrix already passed, only these checks remain:

| # | Check | Expected |
| --- | --- | --- |
| 1 | `npm run email:contract:validate` | PASS |
| 2 | `npm run env:validate`, `npm run lint`, `npm run build`, `git diff --check` | PASS |
| 3 | Local guest transactional email | physically reaches `EMAIL_TEST_RECIPIENT`; subject begins `[LOCAL]` |
| 4 | Local admin notification | physically reaches `admin@juantzun.dev`, not `EMAIL_TEST_RECIPIENT`; subject begins `[LOCAL]` |
| 5 | Local logo | loads from Cloudinary and has no localhost clickable logo link |
| 6 | Stable test guest transactional email | reaches email entered in reservation; subject begins `[TEST]` |
| 7 | Stable test admin notification | reaches `admin@juantzun.dev` |
| 8 | Stable test logo | loads from Cloudinary and links to `https://trp-booking.juantzun.dev` |
| 9 | One stable-test guest reply smoke test | Reply targets matching `reservas@juantzun.dev` or `reservations@juantzun.dev` and reaches Zoho |
| 10 | Authentication smoke test | SPF, DKIM, and DMARC remain PASS |
| 11 | Persistence | `EmailNotification.recipient` remains intended recipient even when local guest delivery is overridden |
| 12 | Production isolation | no production runtime value or provider account changed |

It is not necessary to repeat both complete ES and EN round trips because those were already accepted before this routing refinement.

## Acceptance Gate

F.3 can be formally closed after the reduced matrix passes and evidence confirms:

```text
- explicit guest/admin audience reaches every current provider send path
- local guest safety routing works
- local admin routing bypasses the guest safety mailbox
- stable test uses real intended guest recipients
- stable test admin remains centralized in Zoho
- production contract remains unchanged
- permanent Cloudinary logo renders correctly
- local delivered logo no longer links to localhost
- Reply-To routing remains accepted
- SPF/DKIM/DMARC remain accepted
- EmailNotification persistence/retry behavior remains unchanged
```

The official trackers (`docs/10-phases.md`, `docs/11-progress-log.md`, and `docs/121-pre-phase-12-improvement-track.md`) remain unchanged in this refinement bundle and are updated only in the formal F.3 acceptance closure so they do not claim completion before the reduced regression passes.

After that closure, update those official trackers and continue with:

```text
F.4 — Reservation-to-Zoho navigation
```

Phase 12 remains **Not started**.
