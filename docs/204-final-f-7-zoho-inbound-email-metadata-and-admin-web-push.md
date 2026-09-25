# 204 - Final-F.7: Zoho Inbound Email Metadata And Admin Web Push

## Record

```text
Project: TRP Booking
Track: Post-Phase-12 / Pre-Phase-13 Final Improvement Track
Package: Final-F - Public WhatsApp Contact and Admin Notifications
Subphase: Final-F.7 - Zoho incoming-email bounded metadata and GUEST_EMAIL_RECEIVED Admin Web Push
Status: Implementation completed; Zoho Test webhook onboarding + Hosted inbound-email Web Push validation + owner acceptance pending
Document date: 2026-09-25
Implementation base head: f652ba1decaea98aaf63cb354c5297dd49db2d66
Accepted architecture base: Final-F.R3 at be80af9b36f285c7669986e9c9b4d6676042f6f0
Previous accepted subphase: Final-F.6 completed and accepted on 2026-09-25 at 13e9249f54899de0863cdd6ab8747337319df3e5
Migration: 20260925210000_final_f_7_zoho_inbound_email_metadata
Migration application: Applied to developer-owned Local/Test database on 2026-09-25
Owner acceptance: Pending
Hosted Test: Pending
Final-F.8: Not started
Final-G/H: Not started
Phase 13: Not started
```

Final-F.7 implements only bounded Zoho Mail incoming-email event metadata and
`GUEST_EMAIL_RECEIVED` ADMIN Web Push. It keeps Zoho Mail as the human mailbox and does not turn
TRP into an email client.

## Implemented Scope

```text
- POST /api/integrations/zoho-mail/webhook
- dynamic node runtime route with request.text() raw-body handling
- 16 KB raw-body limit
- Base64 HMAC-SHA256 signature verification over the exact raw body
- first-request bootstrap using x-hook-secret plus ZOHO_MAIL_WEBHOOK_BOOTSTRAP_TOKEN, with optional signature verification when Zoho provides x-hook-signature during the initial Save/validation POST
- encrypted persisted hook secret per TRP business environment
- AES-256-GCM secret encryption bound with environment AAD
- bounded Limited Data parsing for subject/from/to/received-or-sent time
- fail-closed rejection for body/html/content/summary/attachments/full headers/CC/BCC/thread/folder/raw payload fields
- ZohoMailWebhookConfiguration persistence
- ZohoInboundEmailEvent persistence with SHA-256 raw-payload fingerprint only
- AdminNotificationType.GUEST_EMAIL_RECEIVED
- idempotent zoho-mail-inbound/{sha256hex} deduplication key
- active AdminPushDelivery rows for new GUEST_EMAIL_RECEIVED notifications
- post-commit best-effort Web Push delivery using existing Admin Web Push pipeline
- exact guest-email to Reservation.guestEmail matching, case-insensitive, unique-only
- safe target routing through resolveAdminNotificationTarget(...)
- notification-center bounded metadata display for authenticated admins
- secondary Open Zoho Mail action with best-effort sender-address clipboard copy
```

## Mailbox Boundary Preserved

Zoho Mail owns:

```text
human inbox
sent mail
threads
replies
drafts
attachments
spam handling
search
retention
mobile mailbox UX
```

TRP stores only:

```text
fromAddress
toAddress
subject
receivedAt
eventFingerprint digest
optional unique Reservation match
optional generated AdminNotification relation
createdAt
```

TRP does not store email bodies, HTML, content summaries, attachments, full headers, CC/BCC,
raw payloads, provider responses, mailbox thread IDs, folder state, reply state, sent/drafts state,
mailbox search, or mailbox retention data.

## Security Contract

```text
- ZOHO_MAIL_WEBHOOK_ENCRYPTION_KEY is exactly 32 random bytes in canonical Base64.
- ZOHO_MAIL_WEBHOOK_BOOTSTRAP_TOKEN is temporary, random, server-side and used only for first registration.
- During first Zoho outgoing-webhook registration only, the bootstrap token is placed in the callback URL query string as https://trp-booking.juantzun.dev/api/integrations/zoho-mail/webhook?bootstrap=<temporary-token>.
- The temporary callback URL with ?bootstrap=... must be treated as a credential.
- The bootstrap token must never be logged, persisted in the database, returned in API responses, included in Web Push/service-worker payloads, or exposed to application clients.
- Absent Zoho webhook env values make the integration unavailable safely.
- x-hook-secret is accepted only during first bootstrap when no persisted config exists.
- The bootstrap query token is compared in constant time.
- The first bootstrap accepts an absent x-hook-signature only when no persisted config exists and the high-entropy bootstrap credential plus non-empty x-hook-secret are valid.
- If Zoho provides `x-hook-signature` during bootstrap, TRP verifies it against the exact raw body.
- After configuration persistence, `x-hook-signature` is strictly mandatory.
- Once a config exists, the persisted decrypted hook secret is authoritative.
- Bootstrap query params cannot overwrite an existing persisted secret.
- A subsequently supplied x-hook-secret cannot overwrite the persisted encrypted secret.
- No secret-rotation flow exists in Final-F.7.
- Signatures are checked before JSON parsing.
- The route never logs raw payloads, headers, hook secrets, signatures, bodies, attachments or provider responses.
- The persisted event fingerprint is SHA-256 of the verified exact raw Limited Data payload.
- The Admin push payload contains only safe title, safe body and internal targetPath.
```

After the first Zoho registration POST returns HTTP 200 and the hook secret has been persisted,
the owner must edit the Zoho outgoing webhook and replace the callback URL with the clean URL:

```text
https://trp-booking.juantzun.dev/api/integrations/zoho-mail/webhook
```

Only after the clean URL is saved successfully should the owner remove
`ZOHO_MAIL_WEBHOOK_BOOTSTRAP_TOKEN` from Vercel Test and redeploy. The persisted encrypted
`x-hook-secret` then remains authoritative for normal requests.

## Hosted Test Bootstrap Evidence

During Hosted Test onboarding, the first real Zoho Mail Save attempt reached TRP but returned HTTP 401.
That response mapped to `ZOHO_MAIL_SIGNATURE_MISSING`: the callback URL carried the expected
`bootstrap` value and Zoho supplied `x-hook-secret`, but the initial Save/validation POST omitted
`x-hook-signature`. This demonstrates that Zoho's initial Save/validation POST may omit
`x-hook-signature` even though normal deliveries are signed.

For first registration only, TRP therefore authenticates the bootstrap with the temporary
high-entropy `ZOHO_MAIL_WEBHOOK_BOOTSTRAP_TOKEN` plus the supplied non-empty `x-hook-secret`. If Zoho
does provide `x-hook-signature` during that bootstrap request, TRP still verifies it against the
exact raw body. After `ZohoMailWebhookConfiguration` exists for the environment, every registered
webhook request must include a valid `x-hook-signature`; missing signatures remain HTTP 401 and
invalid signatures remain HTTP 403.

## Accepted Recipient And Sender Rules

Local/Test accepted recipients:

```text
admin@juantzun.dev
reservas@juantzun.dev
reservations@juantzun.dev
```

Production accepted recipients:

```text
admin@turefugioperfecto.com
reservas@turefugioperfecto.com
reservations@turefugioperfecto.com
```

Webhook events for other recipients return 200 ignored. Senders from the active correspondence
domain are internal and also return 200 ignored.

## Reservation Matching And Targets

Matching is intentionally narrow:

```text
fromAddress lowercased
Reservation.guestEmail case-insensitive exact match
exactly one matching Reservation -> reservationId attached
zero or multiple matches -> no reservation link
no subject/name/phone/body/fuzzy matching
no manual linking
```

Targets:

```text
unique Reservation match -> /admin/reservations/{reservationId}
no unique match -> /admin/notifications
```

## Notification Copy

Safe push copy:

```text
ES matched title: Nuevo correo de huésped · {property}
ES unmatched title: Nuevo correo de huésped
ES body: Toca para revisar la correspondencia.

EN matched title: New guest email · {property}
EN unmatched title: New guest email
EN body: Tap to review correspondence.
```

The push copy does not include sender address, recipient address, subject, guest name, email body,
thread data, tokens, payment/refund data or provider diagnostics.

## Persistence

The F.7 migration is:

```text
prisma/migrations/20260925210000_final_f_7_zoho_inbound_email_metadata/migration.sql
```

It adds:

```text
AdminNotificationType.GUEST_EMAIL_RECEIVED
ZohoMailWebhookConfiguration
ZohoInboundEmailEvent
AdminNotification.zohoInboundEmailEventId
```

The expected Local/Test migration count after deployment is 29.

## Validation Ledger

Executed during implementation and final validation:

```text
git status --short --branch - PASS; starting branch main at f652ba1decaea98aaf63cb354c5297dd49db2d66
git rev-parse HEAD - PASS; f652ba1decaea98aaf63cb354c5297dd49db2d66
npm run db:format - PASS
npx tsx --tsconfig tests/final-f/tsconfig.json tests/final-f/run.ts - PASS after elevated rerun; first sandbox run failed only with uv_os_get_passwd ENOMEM; Final-F targeted validation 103/103
npm run final-d:validate - PASS after elevated rerun; first sandbox run failed only with uv_os_get_passwd ENOMEM; 66/66
npm run final-e:validate - PASS after elevated rerun; first sandbox run failed only with uv_os_get_passwd ENOMEM; 88/88
npm run env:validate - PASS after elevated rerun; first sandbox run failed only with uv_os_get_passwd ENOMEM
npm run db:validate - PASS
npm run db:generate - PASS; Prisma Client v6.19.3 generated
npm run db:migrate:status - PASS after elevated rerun as expected pending state; first sandbox run failed in schema engine; 29 migrations found and 20260925210000_final_f_7_zoho_inbound_email_metadata pending
npm run db:migrate:deploy - PASS after elevated rerun; applied 20260925210000_final_f_7_zoho_inbound_email_metadata to developer-owned Local/Test database
npm run db:migrate:status - PASS after elevated rerun; 29 migrations found; database schema is up to date
npm run lint - PASS
npm run build - PASS after elevated rerun; sandbox run failed only on Google Fonts fetch
git diff --check - PASS
```

Executed during bootstrap-security/documentation hardening on 2026-09-25:

```text
git status --short --branch - PASS; starting branch main at 094daf028302ed9eac2dc50f82bddb18174bdcc4
git rev-parse HEAD - PASS; 094daf028302ed9eac2dc50f82bddb18174bdcc4
npx tsx --tsconfig tests/final-f/tsconfig.json tests/final-f/run.ts - PASS after elevated run; Final-F targeted validation 107/107
npm run final-d:validate - PASS after elevated run; 66/66
npm run final-e:validate - PASS after elevated run; 88/88
npm run env:validate - PASS after elevated run
npm run db:validate - PASS
npm run db:generate - PASS; Prisma Client v6.19.3 generated
npm run db:migrate:status - PASS after elevated run; 29 migrations found; database schema is up to date
npm run lint - PASS
npm run build - PASS after elevated run; /api/integrations/zoho-mail/webhook remains dynamic
git diff --check - PASS
```

Executed during Hosted Test bootstrap compatibility fix on 2026-09-25:

```text
git status --short --branch - PASS; starting branch main at 699dad7c51f4ae648bd8ec3e58ca225924d55dfc
git rev-parse HEAD - PASS; 699dad7c51f4ae648bd8ec3e58ca225924d55dfc
npx tsx --tsconfig tests/final-f/tsconfig.json tests/final-f/run.ts - PASS after elevated run; Final-F targeted validation 108/108
npm run final-d:validate - PASS after elevated run; 66/66
npm run final-e:validate - PASS after elevated run; 88/88
npm run env:validate - PASS after elevated run
npm run db:validate - PASS
npm run db:generate - PASS; Prisma Client v6.19.3 generated
npm run db:migrate:status - PASS after elevated run; 29 migrations found; database schema is up to date
npm run lint - PASS
npm run build - PASS after elevated run; /api/integrations/zoho-mail/webhook remains dynamic
git diff --check - PASS
```

## Pending Hosted Test / Owner Acceptance

Final-F.7 must not be marked accepted until the owner completes the Hosted Test flow:

```text
- configure ZOHO_MAIL_WEBHOOK_ENCRYPTION_KEY in Vercel Test
- configure temporary ZOHO_MAIL_WEBHOOK_BOOTSTRAP_TOKEN in Vercel Test
- configure Zoho Mail outgoing webhook with Entity Mail, Limited Data List enabled and the temporary callback URL https://trp-booking.juantzun.dev/api/integrations/zoho-mail/webhook?bootstrap=<temporary-token>
- complete first bootstrap request
- after HTTP 200, replace the Zoho callback URL with https://trp-booking.juantzun.dev/api/integrations/zoho-mail/webhook
- save the clean Zoho callback URL successfully
- remove ZOHO_MAIL_WEBHOOK_BOOTSTRAP_TOKEN from Vercel Test and redeploy
- send an external test email to an accepted correspondence recipient
- confirm GUEST_EMAIL_RECEIVED Admin Web Push delivery
- confirm notification-center bounded metadata
- confirm matched/unmatched target behavior
- confirm Zoho Mail opens for human follow-up
- confirm no mailbox body/html/attachment/header data is persisted
- explicit owner acceptance
```

## Boundaries Preserved

```text
- no /admin/emails
- no mailbox sync
- no IMAP
- no SMTP sending
- no Zoho REST polling
- no OAuth mailbox access
- no inbox/sent/drafts/reply/thread/search replication
- no attachments
- no email body/html/rendering
- no Resend admin "email-about-email"
- no outbound WhatsApp
- no staff alerts
- no cron changes
- vercel.json remains {"crons":[]}
- no Production resources
- no Final-F.8
- no Final-G/H
- no Phase 13
```

## Next State

```text
Final-F.7: Implementation completed; Zoho Test webhook onboarding + Hosted inbound-email Web Push validation + owner acceptance pending
Final-F.8: Not started
Final-G/H: Not started
Phase 13: Not started
```
