# 204 - Final-F.7: Zoho Inbound Email Metadata And Admin Web Push

## Record

```text
Project: TRP Booking
Track: Post-Phase-12 / Pre-Phase-13 Final Improvement Track
Package: Final-F - Public WhatsApp Contact and Admin Notifications
Subphase: Final-F.7 - Zoho incoming-email bounded metadata and GUEST_EMAIL_RECEIVED Admin Web Push
Status: Completed and accepted on 2026-09-28
Document date: 2026-09-28
Implementation base head: f652ba1decaea98aaf63cb354c5297dd49db2d66
Accepted feature head: 3d32a5f2320f81ef08387f82cdf9157202c8cf95
Accepted architecture base: Final-F.R3 at be80af9b36f285c7669986e9c9b4d6676042f6f0
Previous accepted subphase: Final-F.6 completed and accepted on 2026-09-25 at 13e9249f54899de0863cdd6ab8747337319df3e5
Migration: 20260925210000_final_f_7_zoho_inbound_email_metadata
Migration application: Applied to developer-owned Local/Test database on 2026-09-25
Owner acceptance: Completed on 2026-09-28
Hosted Test: Completed and accepted
Vercel: SUCCESS
Final-F.8: Completed and accepted on 2026-09-28 at 13f0e0cf6904e34155dd754230f320ca6c214141
Final-G: Completed and accepted on 2026-09-28 at be8445a2c73a710e451da608fd9e669f8f412ab3
Final-H: Completed and accepted on 2026-09-29 at 6922cf27e31e63fde071c0d0a810b141e44b9f90
Phase 13: Not started historically after Final-F.7; currently Blocked / Not started until Final-I closes
```

Final-F.7 implements only bounded Zoho Mail incoming-email event metadata and
`GUEST_EMAIL_RECEIVED` ADMIN Web Push. It keeps Zoho Mail as the human mailbox and does not turn
TRP into an email client.

## Final-I.1 forward hardening note

On 2026-09-29, after Final-F.7 acceptance, the owner registered Final-I and identified a Zoho notification loop: TRP-origin transactional email delivered from the active sending domain to the Zoho admin mailbox could re-enter through the webhook and be classified as `GUEST_EMAIL_RECEIVED`. Final-I.1 preserves the accepted F.7 webhook architecture and expands internal-sender suppression to exact case-insensitive domains from `environmentConfig`: the active correspondence domain and the active transactional sending domain.

Suppressed internal sender events are ignored before reservation matching, `ZohoInboundEmailEvent`, `AdminNotification`, `AdminPushDelivery`, and Web Push delivery. External guest replies, recipient-domain checks, signature verification, Limited Data parsing, and SHA-256 raw-body idempotency remain unchanged.

## Implemented Scope

```text
- POST /api/integrations/zoho-mail/webhook
- dynamic node runtime route with request.text() raw-body handling
- 16 KB raw-body limit
- Base64 HMAC-SHA256 signature verification over the exact raw body
- first-request bootstrap using x-hook-secret plus ZOHO_MAIL_WEBHOOK_BOOTSTRAP_TOKEN, with optional signature verification when Zoho provides x-hook-signature during the initial Save/validation POST
- encrypted persisted hook secret per TRP business environment
- AES-256-GCM secret encryption bound with environment AAD
- bounded Limited Data parsing for subject/from/to/received-or-sent time, accepting but ignoring provider technical messageId metadata
- fail-closed rejection for body/html/content/summary/attachments/full headers/CC/BCC/thread/folder/raw payload fields
- safe forbidden-field category diagnostics for rejected full-content payloads, without raw keys or values
- ZohoMailWebhookConfiguration persistence
- ZohoInboundEmailEvent persistence with SHA-256 raw-payload fingerprint only
- AdminNotificationType.GUEST_EMAIL_RECEIVED
- idempotent zoho-mail-inbound/{sha256hex} deduplication key
- active AdminPushDelivery rows for new GUEST_EMAIL_RECEIVED notifications
- post-commit best-effort Web Push delivery using existing Admin Web Push pipeline
- deterministic exact guest-email to Reservation.guestEmail matching, case-insensitive, ranked by confirmed current stay, earliest upcoming stay, then latest recent completed stay
- safe target routing through resolveAdminNotificationTarget(...)
- notification-center bounded metadata display for authenticated admins
- secondary Open Zoho Mail action with stable web handoff to https://mail.zoho.com/ and best-effort sender-address clipboard copy
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

TRP accepts but ignores provider technical messageId metadata when Zoho includes it in Limited Data.
The provider message ID is not persisted, exposed, logged, returned, used for matching, used for Web
Push, or used as the deduplication key.

TRP does not store email bodies, HTML, content summaries, attachments, full headers, CC/BCC,
raw payloads, provider responses, provider message IDs, mailbox thread IDs, folder state, reply state, sent/drafts state,
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
- For ZOHO_MAIL_FULL_CONTENT_PAYLOAD only, the route may emit one concise server-side warning containing only the error code and a closed safe forbidden-field category.
- The persisted event fingerprint is SHA-256 of the verified exact raw Limited Data payload.
- The Admin push payload contains only safe title, safe body and internal targetPath.
```

After the first Zoho registration POST returned HTTP 200 and the hook secret was persisted, the
owner removed `ZOHO_MAIL_WEBHOOK_BOOTSTRAP_TOKEN` from Vercel Test, kept
`ZOHO_MAIL_WEBHOOK_ENCRYPTION_KEY` configured, and redeployed successfully. Real Zoho behavior showed
that attempting to edit the saved callback URL to remove `?bootstrap=...` triggers another unsigned
Save/validation request, which TRP correctly rejects once the webhook secret has already been
registered.

The accepted Test provider configuration may therefore retain the original `?bootstrap=<old-token>`
query parameter in the Zoho callback URL. After bootstrap cleanup, that residual query value is inert:
existing `ZohoMailWebhookConfiguration` prevents bootstrap provisioning, the bootstrap environment
credential no longer exists in runtime, and normal webhook authentication uses only the persisted
encrypted hook secret plus `x-hook-signature`. The residual URL token must not be described as an
active runtime credential after cleanup. Final-F.7 does not introduce a secret-rotation flow.

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

Final Hosted Test cleanup removed `ZOHO_MAIL_WEBHOOK_BOOTSTRAP_TOKEN` from Vercel Test after the
encrypted hook secret existed, retained `ZOHO_MAIL_WEBHOOK_ENCRYPTION_KEY`, and redeployed
successfully. Normal signed delivery continued with the persisted encrypted secret even though the
Zoho saved callback URL may still contain the old inert `?bootstrap=...` query parameter.

## Hosted Test Recipient-Filtering Evidence

After the bootstrap compatibility fix, Zoho outgoing webhook registration reached TRP and returned
HTTP 200 for a real external email sent to `reservas@juantzun.dev`. Hosted Test evidence still showed
no Android Web Push delivery, no `Nuevo correo de huésped` notification-center row and zero
`trp_booking.zoho_inbound_email_events` rows while an active ADMIN `AdminPushSubscription` existed.
That means the request was acknowledged before persistence and before the push pipeline.

The compatible ignored branch was recipient filtering: the implementation accepted only the three
public aliases as exact recipients, while the real Zoho Limited Data payload may expose the active
mailbox-normalized recipient address for the same correspondence domain. The fix keeps the public
aliases as intended Zoho trigger/filter addresses, but TRP runtime acceptance now uses exact parsed
recipient email-domain matching for the active correspondence domain. It accepts `juantzun.dev` in
Local/Test and `turefugioperfecto.com` in Production, case-insensitively, and rejects suffix tricks
such as `eviljuantzun.dev` or `juantzun.dev.attacker.example`.

## Hosted Test Payload-Shape Evidence

Hosted Test evidence confirmed the Zoho outgoing webhook is configured as:

```text
Entity: Mail
Condition Type: No conditions. All incoming emails
Limited Data List: ON
Status: Enabled
```

With that configuration, real incoming mail reliably triggered the webhook. The latest decisive
real delivery reached TRP and Vercel recorded:

```text
POST /api/integrations/zoho-mail/webhook -> HTTP 422
```

The safe structural diagnostic emitted exactly:

```text
[zoho-mail] webhook payload rejected { code: 'ZOHO_MAIL_FULL_CONTENT_PAYLOAD', fieldCategory: 'message_id' }
```

That proves the request passed webhook triggering, bootstrap/registered-secret handling, signature
verification and raw-body JSON parsing, then failed only inside the bounded Limited Data
payload-shape validator before `ZohoInboundEmailEvent`, `AdminNotification`, `AdminPushDelivery` or
Web Push delivery.

The provider behavior establishes that Zoho Mail may include technical `messageId` metadata in the
real Mail Limited Data payload even though Zoho documentation describes Limited Data as Subject,
From, To and time details. This provider message ID is technical metadata, not email body/content,
HTML, attachments, headers, thread state or mailbox replication data.

F.7 therefore now accepts keys that normalize to `messageid`, including `messageId`, `message_id`
and `message-id`, while ignoring the value completely. TRP does not persist, expose, log, return,
match on, push, serialize or use the provider message ID for deduplication. The existing SHA-256
raw-body fingerprint remains the event idempotency mechanism and the bounded persistence model is
unchanged.

The safe diagnostic mechanism remains active for still-forbidden payload-shape drift. The closed
forbidden structural category set is now: `attachment`, `body`, `content`, `headers`, `html`,
`folder`, `raw`, `summary`, `thread`, `cc`, `bcc` or `other_forbidden`. Diagnostics never retain or
emit original key names, field values, raw body, subject, sender, recipient, hook secret, signature,
bootstrap token, request headers, provider response or provider message ID value. Runtime rejection
for still-forbidden payloads remains unchanged: HTTP 422 and no persistence.

## Hosted Test Delivery And UX Evidence

Accepted Hosted Test Zoho configuration:

```text
Entity: Mail
Condition Type: No conditions. All incoming emails
Limited Data List: ON
Status: Enabled
```

A real Zoho Limited Data delivery successfully reached TRP as:

```text
POST /api/integrations/zoho-mail/webhook -> HTTP 200
```

After the provider `messageId` compatibility fix, Hosted Test evidence confirmed a real unmatched
external email flow succeeded end to end: Zoho delivered the Limited Data webhook, TRP accepted the
bounded payload, created the `ZohoInboundEmailEvent`, created `GUEST_EMAIL_RECEIVED`, created
`AdminPushDelivery`, delivered Web Push to an active ADMIN `AdminPushSubscription`, recorded delivery
status `SENT`, and left the notification target at `/admin/notifications` because no eligible
Reservation was attached.

Observed real server timing showed the inbound event and push send occurred approximately one second
apart. Initial `GUEST_EMAIL_RECEIVED` delivery is therefore immediate post-commit best effort and
does not depend on cron. The later physical Android display delay belongs to the browser/Web
Push/Android delivery layer, not to TRP scheduling.

Hosted Test evidence also confirmed a real exact Reservation match flow succeeded: an incoming email
whose parsed sender matched `Reservation.guestEmail` case-insensitively attached the expected
Reservation, routed the notification to `/admin/reservations/{reservationId}`, and delivered the
ADMIN push without persisting bodies, HTML, attachments, CC/BCC, full headers, raw payloads or
provider message IDs.

Hosted validation passed the deterministic CONFIRMED Reservation relevance strategy: current stay,
then earliest upcoming stay, then most recent completed stay within 30 calendar days. A tie at the
winning priority remains ambiguous and unlinked. Matching remains exact case-insensitive guest email
only, and non-CONFIRMED statuses never auto-link.

The final hardening records the owner privacy-boundary revision allowing `Reservation.guestName` in
ADMIN-only push titles using the accepted `event type · guestName · property` shape. Email
addresses, phones, payment data, email subject/body/content, provider IDs, tokens and secrets remain
excluded.

Hosted Android validation then tested the package-targeted web intent handoff for Zoho Mail. The
real Android TRP Admin PWA did not reliably open the Zoho Mail native application and instead fell
back to the browser at `https://mail.zoho.com/`. Android 12+ app-link and package resolution are
controlled by the target application and its domain association, and Zoho Mail does not expose a
supported public deep-link contract that TRP can rely on from a web/PWA surface. Final-F.7 therefore
uses the stable web handoff `https://mail.zoho.com/` for all clients. Opening Zoho Mail in the
browser is accepted behavior, and native Zoho app launch is not a Final-F acceptance requirement.
The handoff URL never includes subject, sender, recipient, body, secrets, signatures or bootstrap
values; sender-address copying remains the separate bounded clipboard action.

## Accepted Recipient And Sender Rules

The documented public aliases remain the intended Zoho outgoing-webhook trigger/filter addresses:

Local/Test intended aliases:

```text
admin@juantzun.dev
reservas@juantzun.dev
reservations@juantzun.dev
```

Production intended aliases:

```text
admin@turefugioperfecto.com
reservas@turefugioperfecto.com
reservations@turefugioperfecto.com
```

Runtime acceptance is intentionally domain-based, not exact-alias-based, because Zoho Limited Data
may expose the active mailbox-normalized recipient while the event was triggered by one of the
intended aliases. TRP accepts a registered webhook only when at least one parsed recipient email has
an exact active correspondence domain:

```text
Local/Test: juantzun.dev
Production: turefugioperfecto.com
```

Matching is case-insensitive after email parsing and compares the full domain only. It rejects
suffix and substring tricks such as:

```text
user@eviljuantzun.dev
user@juantzun.dev.attacker.example
user@example.com
```

Webhook events for recipients outside the active correspondence domain return HTTP 200 ignored with
the safe reason code `recipient_outside_correspondence_domain`. Senders from the active
correspondence domain are internal and return HTTP 200 ignored with the safe reason code
`internal_sender`. Ignored requests create no `ZohoInboundEmailEvent`, no `AdminNotification`, no
`AdminPushDelivery` and no best-effort Web Push attempt.

## Reservation Matching And Targets

Matching is intentionally narrow and deterministic:

```text
fromAddress lowercased
Reservation.guestEmail case-insensitive exact match
Reservation.status must be CONFIRMED
TRP business date is evaluated in America/Guatemala
priority 1: current stay, checkInDate <= businessToday <= checkOutDate
priority 2: earliest upcoming stay, checkInDate > businessToday
priority 3: latest recent completed stay, checkOutDate < businessToday and within the previous 30 calendar days
exactly one candidate in the winning priority -> reservationId attached
tie in the winning priority -> no reservation link
zero eligible candidates -> no reservation link
no subject/name/phone/body/fuzzy matching
no manual linking
```

The matcher never auto-links `PENDING_PAYMENT`, `CANCELLED`, `EXPIRED`, `BLOCKED`, `REFUNDED` or
`PARTIALLY_REFUNDED` reservations. Provider message IDs, email subjects, sender display names,
phone numbers and email bodies are not used for matching or deduplication.

Targets:

```text
unique Reservation match -> /admin/reservations/{reservationId}
no unique match -> /admin/notifications
```

## Notification Copy

Safe push copy:

```text
ES matched title: Nuevo correo de huésped · {guestName} · {propertyNameEs}
ES unmatched title: Nuevo correo de huésped
ES body: Toca para revisar la correspondencia.

EN matched title: New guest email · {guestName} · {propertyNameEn}
EN unmatched title: New guest email
EN body: Tap to review correspondence.
```

The owner-approved ADMIN lock-screen boundary permits `Reservation.guestName` in matched ADMIN push
titles. The push copy still does not include sender address, recipient address, subject, email body,
thread data, tokens, payment/refund data or provider diagnostics. `guestName` is not used for Zoho
matching and is included only after the server has attached a Reservation relation.

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

Executed during Hosted Test recipient-domain filtering hardening on 2026-09-25:

```text
git status --short --branch - PASS; starting branch main at cd602ee93a3c0b34c54b6a49ab013d9a6c32d1f0
git rev-parse HEAD - PASS; cd602ee93a3c0b34c54b6a49ab013d9a6c32d1f0
npx tsx --tsconfig tests/final-f/tsconfig.json tests/final-f/run.ts - PASS after elevated rerun; first sandbox run failed only with uv_os_get_passwd ENOMEM; Final-F targeted validation 109/109
npm run final-d:validate - PASS after elevated run; 66/66
npm run final-e:validate - PASS after elevated run; 88/88
npm run env:validate - PASS after elevated run
npm run db:validate - PASS; Prisma schema valid; Prisma 7 config deprecation warning only
npm run db:generate - PASS; Prisma Client v6.19.3 generated
npm run db:migrate:status - PASS after elevated rerun; first sandbox run failed with Schema engine error; 29 migrations found; database schema is up to date
npm run lint - PASS
npm run build - PASS after elevated rerun; first sandbox run failed only on Google Fonts fetch; /api/integrations/zoho-mail/webhook remains dynamic
vercel.json - PASS; { "crons": [] }
git diff --check - PASS
```

Executed during Hosted Test payload-shape diagnostic hardening on 2026-09-28:

```text
git status --short --branch - PASS; starting branch main at af8a2abbe88839a14a36e4cdcf078ae7d2293fda
git rev-parse HEAD - PASS; af8a2abbe88839a14a36e4cdcf078ae7d2293fda
npx tsx --tsconfig tests/final-f/tsconfig.json tests/final-f/run.ts - PASS after elevated rerun; first sandbox run failed only with uv_os_get_passwd ENOMEM; Final-F targeted validation 113/113
npm run final-d:validate - PASS after elevated run; 66/66
npm run final-e:validate - PASS after elevated run; 88/88
npm run env:validate - PASS after elevated run
npm run db:validate - PASS; Prisma schema valid; Prisma 7 config deprecation warning only
npm run db:generate - PASS; Prisma Client v6.19.3 generated
npm run db:migrate:status - PASS after elevated rerun; first sandbox run failed with Schema engine error; 29 migrations found; database schema is up to date
npm run lint - PASS
npm run build - PASS after elevated rerun; first sandbox run failed only on Google Fonts fetch; /api/integrations/zoho-mail/webhook remains dynamic
vercel.json - PASS; { "crons": [] }
git diff --check - PASS
```

Executed during Hosted Test provider-message-id compatibility fix on 2026-09-28:

```text
git status --short --branch - PASS; starting branch main at c827f57989512a097daa9d9a69c40ba78b15e7ed
git rev-parse HEAD - PASS; c827f57989512a097daa9d9a69c40ba78b15e7ed
npx tsx --tsconfig tests/final-f/tsconfig.json tests/final-f/run.ts - PASS after elevated rerun; first sandbox run failed only with uv_os_get_passwd ENOMEM; Final-F targeted validation 115/115
npm run final-d:validate - PASS after elevated run; 66/66
npm run final-e:validate - PASS after elevated run; 88/88
npm run env:validate - PASS after elevated run
npm run db:validate - PASS; Prisma schema valid; Prisma 7 config deprecation warning only
npm run db:generate - PASS; Prisma Client v6.19.3 generated
npm run db:migrate:status - PASS after elevated run; 29 migrations found; database schema is up to date
npm run lint - PASS after elevated run
npm run build - PASS after elevated run; slow filesystem warning only; /api/integrations/zoho-mail/webhook remains dynamic
vercel.json - PASS; { "crons": [] }
git diff --check - PASS
```

Executed during Final-F.7/F.6 reservation-matching, ADMIN title and Android Zoho handoff hardening on 2026-09-28:

```text
git status --short --branch - PASS; starting branch main at 86f431e241c7136d96c4bcab10bba73288555b1e
git rev-parse HEAD - PASS; 86f431e241c7136d96c4bcab10bba73288555b1e
npx tsx --tsconfig tests/final-f/tsconfig.json tests/final-f/run.ts - PASS after elevated rerun; first sandbox run failed only with uv_os_get_passwd ENOMEM; Final-F targeted validation 118/118
npm run final-d:validate - PASS after elevated run; 66/66
npm run final-e:validate - PASS after elevated run; 88/88
npm run env:validate - PASS after elevated run
npm run db:validate - PASS after elevated run; Prisma schema valid; Prisma 7 config deprecation warning only
npm run db:generate - PASS after elevated run; Prisma Client v6.19.3 generated
npm run db:migrate:status - PASS after elevated run; 29 migrations found; database schema is up to date
npm run lint - PASS after elevated run
npm run build - PASS after elevated run; slow filesystem warning only; /api/integrations/zoho-mail/webhook remains dynamic
vercel.json - PASS; { "crons": [] }
git diff --check - PASS; CRLF/LF warnings only, no whitespace errors
```

Executed during Android Zoho native-handoff removal on 2026-09-28:

```text
git status --short --branch - PASS; starting branch main at 0abdb8e17290ffe73ff247392bc1399366daf348
git rev-parse HEAD - PASS; 0abdb8e17290ffe73ff247392bc1399366daf348
npx tsx --tsconfig tests/final-f/tsconfig.json tests/final-f/run.ts - PASS after elevated run; Final-F targeted validation 118/118
npm run final-d:validate - PASS after elevated run; 66/66
npm run final-e:validate - PASS after elevated run; 88/88
npm run env:validate - PASS after elevated run
npm run db:validate - PASS after elevated run; Prisma schema valid; Prisma 7 config deprecation warning only
npm run db:generate - PASS after elevated run; Prisma Client v6.19.3 generated
npm run db:migrate:status - PASS after elevated run; 29 migrations found; database schema is up to date
npm run lint - PASS after elevated run
npm run build - PASS after elevated run; slow filesystem warning only; /api/integrations/zoho-mail/webhook remains dynamic
vercel.json - PASS; { "crons": [] }
git diff --check - PASS; CRLF/LF warnings only, no whitespace errors
```

Executed during Final-F.7 acceptance/documentation closure on 2026-09-28:

```text
git status --short --branch - PASS; starting branch main at 3d32a5f2320f81ef08387f82cdf9157202c8cf95
git rev-parse HEAD - PASS; 3d32a5f2320f81ef08387f82cdf9157202c8cf95
npx tsx --tsconfig tests/final-f/tsconfig.json tests/final-f/run.ts - PASS after elevated rerun; first sandbox run failed with uv_os_get_passwd ENOMEM; Final-F targeted validation 118/118
npm run final-d:validate - PASS after elevated rerun; first sandbox run failed with uv_os_get_passwd ENOMEM; 66/66
npm run final-e:validate - PASS after elevated rerun; first sandbox run failed with uv_os_get_passwd ENOMEM; 88/88
npm run env:validate - PASS after elevated rerun; first sandbox run failed with uv_os_get_passwd ENOMEM
npm run db:validate - PASS; Prisma schema valid; Prisma 7 config deprecation warning only
npm run db:migrate:status - PASS after elevated rerun; first sandbox run failed with Schema engine error; 29 migrations found; database schema is up to date
npm run lint - PASS
npm run build - PASS after elevated rerun; first sandbox run failed only on Google Fonts fetch; slow filesystem warning only
vercel.json - PASS; { "crons": [] }
git diff --check - PASS; CRLF/LF warnings only, no whitespace errors
```

## Owner Acceptance

Final-F.7 is completed and accepted by the owner on 2026-09-28 at accepted feature head:

```text
3d32a5f2320f81ef08387f82cdf9157202c8cf95
```

Accepted Hosted Test evidence includes successful real Zoho delivery, bounded Limited Data parsing
with technical `messageId` ignored, unmatched and matched `GUEST_EMAIL_RECEIVED` notifications,
`AdminPushDelivery` status `SENT`, immediate post-commit Web Push delivery independent from cron,
deterministic Reservation relevance ranking, owner-approved ADMIN-only `guestName` push titles,
stable web Zoho Mail handoff, Vercel SUCCESS for the accepted feature head, bootstrap-token removal
from Vercel Test, and continued normal signed delivery using the persisted encrypted hook secret.

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
Final-F.7: Completed and accepted on 2026-09-28 at 3d32a5f2320f81ef08387f82cdf9157202c8cf95
Final-F.8: Completed and accepted on 2026-09-28 at 13f0e0cf6904e34155dd754230f320ca6c214141
Final-G: Completed and accepted on 2026-09-28 at be8445a2c73a710e451da608fd9e669f8f412ab3
Final-H: Completed and accepted on 2026-09-29 at 6922cf27e31e63fde071c0d0a810b141e44b9f90
Phase 13: Not started historically after Final-F.7; currently Blocked / Not started until Final-I closes
```
