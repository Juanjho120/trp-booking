# 130 — Pre-Phase-12 Package F.3 Transactional Reply-To Alignment

## Package Record

```text
Track: Pre-Phase-12 Improvement Track
Package: F — Zoho guest correspondence and reservation navigation
Subpackage: F.3 Transactional Reply-To alignment
Status: Implementation prepared — owner validation and acceptance pending
Implementation base head: fceed7e21bd41cb09169b26979f42d2f7bfa26da
Previous subpackage: F.2 Test Zoho Mail setup and DNS validation
Previous closure: docs/129-pre-phase-12-package-f-2-acceptance-closure.md
Next subpackage after acceptance: F.4 Reservation-to-Zoho navigation
Phase 12: Not started and not activated
```

## Goal

Route replies to automatic local/test Resend emails into the validated Zoho Mail
aliases created and accepted in F.2 while preserving the technical Resend sending
subdomain and the existing transactional email pipeline.

The accepted boundary is:

```text
Automatic delivery
TRP Booking -> Resend -> recipient

Local/test From
Spanish: Tu Refugio Perfecto Test <reservas@mail.trp-booking.juantzun.dev>
English: Tu Refugio Perfecto Test <reservations@mail.trp-booking.juantzun.dev>

Local/test Reply-To
Spanish: reservas@juantzun.dev
English: reservations@juantzun.dev

Human reply
Recipient -> Zoho Mail -> admin@juantzun.dev mailbox through the matching alias
```

Production remains a future isolated organization:

```text
Production From
Spanish: Tu Refugio Perfecto <reservas@mail.turefugioperfecto.com>
English: Tu Refugio Perfecto <reservations@mail.turefugioperfecto.com>

Production Reply-To
Spanish: reservas@turefugioperfecto.com
English: reservations@turefugioperfecto.com
```

F.3 does not configure the production Zoho organization or modify production DNS.

## Scope

Included:

```text
- Model the human correspondence domain separately from the Resend sending domain.
- Keep EMAIL_FROM_ES and EMAIL_FROM_EN on the verified Resend sending subdomain.
- Route local/test EMAIL_REPLY_TO_ES to reservas@juantzun.dev.
- Route local/test EMAIL_REPLY_TO_EN to reservations@juantzun.dev.
- Preserve future production Reply-To addresses under turefugioperfecto.com.
- Enforce the exact approved ES/EN Reply-To aliases in server-side environment
  validation.
- Add a focused executable environment-contract regression script.
- Update .env.example without committing secrets or changing real deployment values.
- Centralize normal local/test administrative delivery and test-mode physical delivery in
  the Zoho mailbox `admin@juantzun.dev`.
```

Excluded:

```text
- No EmailNotification schema or behavior change.
- No Prisma migration.
- No dependency addition or version change.
- No Resend provider pipeline rewrite.
- No inbound Resend receiving or webhook.
- No Zoho API, OAuth, IMAP, SMTP credential, password, or mailbox synchronization.
- No reservation UI change.
- No production Zoho setup or DNS change.
- No F.4 reservation-to-Zoho navigation work.
```

## Implementation

### `config/site.ts`

Environment configuration now distinguishes three concepts explicitly:

```text
applicationDomain
sendingDomain
correspondenceDomain
```

Local/test:

```text
applicationDomain: trp-booking.juantzun.dev
sendingDomain: mail.trp-booking.juantzun.dev
correspondenceDomain: juantzun.dev
```

Production:

```text
applicationDomain: turefugioperfecto.com
sendingDomain: mail.turefugioperfecto.com
correspondenceDomain: turefugioperfecto.com
```

The separation prevents the human mailbox domain from being confused with the
technical Resend domain.

### `lib/env/server.ts`

The existing `EMAIL_FROM_*` guard remains unchanged in intent:

```text
local/test From -> exact mail.trp-booking.juantzun.dev domain
production From -> exact mail.turefugioperfecto.com domain
```

F.3 replaces the previous local/test Reply-To rule that required the technical Resend
subdomain with an exact correspondence-address contract:

```text
local/test
EMAIL_REPLY_TO_ES = reservas@juantzun.dev
EMAIL_REPLY_TO_EN = reservations@juantzun.dev

production
EMAIL_REPLY_TO_ES = reservas@turefugioperfecto.com
EMAIL_REPLY_TO_EN = reservations@turefugioperfecto.com
```

The validator intentionally checks the complete approved address, not only the domain.
This prevents an accidental `admin@`, technical `mail.` address, production address,
or swapped locale alias from being deployed as the transactional Reply-To.

### `.env.example`

The local/test template now documents:

```text
EMAIL_FROM_ES="Tu Refugio Perfecto Test <reservas@mail.trp-booking.juantzun.dev>"
EMAIL_FROM_EN="Tu Refugio Perfecto Test <reservations@mail.trp-booking.juantzun.dev>"
EMAIL_REPLY_TO_ES="reservas@juantzun.dev"
EMAIL_REPLY_TO_EN="reservations@juantzun.dev"
EMAIL_ADMIN_RECIPIENTS="admin@juantzun.dev"
EMAIL_TEST_RECIPIENT="admin@juantzun.dev"
```

Normal local/test operation therefore uses the single Zoho mailbox as the physical
destination for administrative notifications and all test-mode deliveries. The
intended guest/admin recipient remains preserved by the existing transactional
persistence contract even though `EMAIL_DELIVERY_MODE=test` redirects physical
delivery to `EMAIL_TEST_RECIPIENT`.

No real API key, mailbox password, MFA material, or deployment secret is included.

### Focused contract validation

New script:

```text
scripts/validate-email-reply-to-contract.ts
```

New npm command:

```text
npm run email:contract:validate
```

The script covers:

```text
1. Local accepts test Resend From + Zoho Reply-To.
2. Test accepts test Resend From + Zoho Reply-To.
3. Production accepts production Resend From + production Zoho Reply-To.
4. Test rejects the pre-F.3 technical Reply-To address.
5. Test rejects a production Reply-To address.
6. Test rejects an unintended local part such as admin@juantzun.dev.
7. Production rejects a test Reply-To address.
8. Test still rejects From on the human correspondence domain.
9. Production still rejects From outside the production Resend sending domain.
```

No test framework or dependency is added; the script uses the existing `tsx` runtime
and Node assertions.

## Operational Deployment Steps

After copying and reviewing the implementation, update only the local/test environment
values.

### Local `.env`

Normal local/test values:

```text
EMAIL_REPLY_TO_ES=reservas@juantzun.dev
EMAIL_REPLY_TO_EN=reservations@juantzun.dev
EMAIL_ADMIN_RECIPIENTS=admin@juantzun.dev
EMAIL_TEST_RECIPIENT=admin@juantzun.dev
```

Keep:

```text
EMAIL_FROM_ES=Tu Refugio Perfecto Test <reservas@mail.trp-booking.juantzun.dev>
EMAIL_FROM_EN=Tu Refugio Perfecto Test <reservations@mail.trp-booking.juantzun.dev>
```

### Stable test deployment / Vercel

Update the test project's environment variables:

```text
EMAIL_REPLY_TO_ES=reservas@juantzun.dev
EMAIL_REPLY_TO_EN=reservations@juantzun.dev
EMAIL_ADMIN_RECIPIENTS=admin@juantzun.dev
EMAIL_TEST_RECIPIENT=admin@juantzun.dev
```

Do not change:

```text
TRP_ENVIRONMENT=test
EMAIL_DELIVERY_MODE=test
EMAIL_FROM_ES / EMAIL_FROM_EN
RESEND_API_KEY
production environment variables
```

`EMAIL_TEST_RECIPIENT=admin@juantzun.dev` is the normal stable-test value. For the
one-time F.3 external round-trip acceptance only, temporarily override it with an
external mailbox controlled by the owner, execute the ES/EN reply tests, and restore
`admin@juantzun.dev` immediately afterwards.

Redeploy the stable test deployment after the environment values are saved.

## Technical Validation

Run from the repository root after copying the bundle:

```text
npm run email:contract:validate
npm run env:validate
npm run lint
npm run build
git diff --check
```

`npm run env:validate` uses the actual local `.env`, so it should be run after replacing
the old local/test Reply-To values.

## Owner Functional Matrix

F.3 is not accepted merely because the environment validator passes. Execute real
transactional delivery through the already accepted application flow.

| # | Scenario | Expected result | Status |
| --- | --- | --- | --- |
| 1 | ES automatic email delivered through Resend | Delivery succeeds in test mode | `_____` |
| 2 | ES message From header | `reservas@mail.trp-booking.juantzun.dev` | `_____` |
| 3 | ES message Reply-To header | `reservas@juantzun.dev` | `_____` |
| 4 | Recipient selects Reply on ES message | Composer targets `reservas@juantzun.dev` | `_____` |
| 5 | ES human reply sent | Arrives in Zoho through `reservas@juantzun.dev` | `_____` |
| 6 | Zoho reply to ES conversation | From remains `reservas@juantzun.dev` | `_____` |
| 7 | EN automatic email delivered through Resend | Delivery succeeds in test mode | `_____` |
| 8 | EN message From header | `reservations@mail.trp-booking.juantzun.dev` | `_____` |
| 9 | EN message Reply-To header | `reservations@juantzun.dev` | `_____` |
| 10 | Recipient selects Reply on EN message | Composer targets `reservations@juantzun.dev` | `_____` |
| 11 | EN human reply sent | Arrives in Zoho through `reservations@juantzun.dev` | `_____` |
| 12 | Zoho reply to EN conversation | From remains `reservations@juantzun.dev` | `_____` |
| 13 | SPF/DKIM/DMARC for automatic Resend message | Existing sending-domain authentication remains valid | `_____` |
| 14 | EmailNotification history | Existing persistence/history remains unchanged | `_____` |
| 15 | Normal test mailbox centralization | `EMAIL_ADMIN_RECIPIENTS` and normal `EMAIL_TEST_RECIPIENT` are `admin@juantzun.dev` | `_____` |
| 16 | Test recipient routing | Intended recipient remains persisted while physical test delivery follows `EMAIL_TEST_RECIPIENT` | `_____` |
| 17 | Production isolation | No production secret, DNS, mailbox, or deployed environment value changed | `_____` |

For the F.3 round-trip acceptance only, temporarily set `EMAIL_TEST_RECIPIENT` to an
external mailbox you control, trigger one ES and one EN automatic notification, inspect
the received headers, select Reply, and send the response. The response must arrive in
Zoho at the matching alias. After both tests pass, restore
`EMAIL_TEST_RECIPIENT=admin@juantzun.dev` so normal local/test traffic remains
centralized in the single Zoho mailbox.

## Acceptance Gate

F.3 may be marked completed and accepted only after:

```text
1. The focused contract validation passes.
2. Local/test environment validation passes with the Zoho Reply-To aliases.
3. Lint and build pass.
4. Real ES Resend delivery preserves the technical From address.
5. Real ES Reply-To points to reservas@juantzun.dev.
6. A real ES reply reaches Zoho and can be answered from reservas@juantzun.dev.
7. Real EN Resend delivery preserves the technical From address.
8. Real EN Reply-To points to reservations@juantzun.dev.
9. A real EN reply reaches Zoho and can be answered from reservations@juantzun.dev.
10. Normal local/test administrative recipient is `admin@juantzun.dev`.
11. Normal local/test physical test recipient is `admin@juantzun.dev` after the
    external acceptance override is restored.
12. Existing test-recipient isolation remains intact.
13. Existing EmailNotification history/retry behavior remains intact.
14. No production operational configuration is changed.
15. No secret, OAuth credential, IMAP credential, or mailbox content is committed.
```

## Documentation Status

The official phase trackers already identify F.3 as the next package. This delivery
adds the implementation record but intentionally does not mark F.3 completed before
real owner validation. After the matrix passes, the F.3 acceptance closure must update
`docs/10-phases.md`, `docs/11-progress-log.md`,
`docs/121-pre-phase-12-improvement-track.md`, and the Package F strategy/status to make
F.4 the next package.

## Handoff

Do not begin F.4 until F.3 is functionally accepted.

The immediate owner action after applying this bundle is:

```text
1. Set the normal local/test Reply-To, admin recipient, and test recipient values.
2. Run email:contract:validate, env:validate, lint, and build.
3. Redeploy stable test with the F.3 values.
4. Temporarily point EMAIL_TEST_RECIPIENT to an external mailbox and redeploy for the
   ES/EN automatic-email round-trip acceptance.
5. Execute Resend -> external mailbox -> Reply -> Zoho for both locales.
6. Restore EMAIL_TEST_RECIPIENT=admin@juantzun.dev and redeploy stable test.
7. Confirm a normal test notification now arrives in the Zoho admin mailbox.
8. Report the matrix results for F.3 acceptance closure.
```
