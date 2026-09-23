# Final-F.3 — WhatsApp Conversation/Message + Staff Recipient/Alert Persistence Foundation

## Record

```text
Project: TRP Booking
Track: Post-Phase-12 / Pre-Phase-13 Final Improvement Track
Package: Final-F — Twilio WhatsApp communication and staff alerts
Subphase: Final-F.3 — WhatsApp conversation/message persistence + staff-recipient / staff-alert persistence foundation
Status: Completed and accepted on 2026-09-22
Implementation date: 2026-09-22
Implementation base head: 673e43c4d3f8f25a9aee5ee196552574637776dd
Initial implementation head: ee6194f2d51969aae56aab2b5351314326c3ed8a
Accepted implementation/validation head: f0a465349b5217f7318146ad5b2de13f1d641a13
Accepted Final-F.1 strategy head: d5db6a2605a03e75db7c16238a43cd5f79dde6d8
Accepted Final-F.2 provider/onboarding head: 03861cb2d5daef7cca8bb759d16a0ef050d86b41
Foundation migration: 20260922170000_final_f_3_whatsapp_persistence_foundation
Corrective migration: 20260922193000_final_f_3_correct_twilio_message_sid_constraints
Migration count before F.3: 22
Migration count after F.3 foundation: 23
Migration count: 24
MessageSid accepted contract: ^(SM|MM)[0-9a-fA-F]{32}$
Final-F targeted validation: 19/19 PASS
Owner acceptance: Completed on 2026-09-22
Historical next at F.3 acceptance: Final-F.4 — Next / Not started at the time; later completed and accepted
Historical later subphases at F.3 acceptance: Final-F.5 through Final-F.8 — Not started at the time
Final-G/H: Not started
Phase 13: Not started
```

## R1 Architecture Context

This record remains the accepted Final-F.3 persistence/domain foundation. Its historical Twilio SID
naming and `GUEST_WHATSAPP_RECEIVED` enum/schema artifacts are not current target architecture.
Provider-neutral cleanup and the active six-alert contract are governed by
`docs/198-final-f-architecture-revision-360dialog-coexistence.md`.

## Owner Acceptance

The owner explicitly accepted Final-F.3 on 2026-09-22.

Accepted implementation/validation head:

```text
f0a465349b5217f7318146ad5b2de13f1d641a13
```

Accepted implementation history:

```text
Implementation base:
673e43c4d3f8f25a9aee5ee196552574637776dd

Initial implementation head:
ee6194f2d51969aae56aab2b5351314326c3ed8a

Initial foundation migration:
20260922170000_final_f_3_whatsapp_persistence_foundation

Independent-review corrective migration:
20260922193000_final_f_3_correct_twilio_message_sid_constraints

Accepted implementation/validation head:
f0a465349b5217f7318146ad5b2de13f1d641a13
```

## Scope Implemented

Final-F.3 adds a dormant persistence foundation for the accepted Final-F.1/F.2 WhatsApp and staff-alert strategy.

Implemented schema foundation:

```text
WhatsAppMessageDirection:
  INBOUND
  OUTBOUND

WhatsAppMessageStatus:
  RECEIVED
  PENDING
  PROCESSING
  QUEUED
  SENT
  DELIVERED
  READ
  FAILED
  UNDELIVERED
  SKIPPED

StaffWhatsAppAlertType:
  RESERVATION_CONFIRMED
  RESERVATION_CANCELLED
  CHECK_IN_MINUS_48H
  CHECK_OUT_MINUS_6H
  REVIEW_SUBMITTED
  GUEST_WHATSAPP_RECEIVED
  GUEST_EMAIL_RECEIVED

StaffWhatsAppAlertStatus:
  PENDING
  PROCESSING
  QUEUED
  SENT
  DELIVERED
  READ
  FAILED
  UNDELIVERED
  SKIPPED

WhatsAppConversation
WhatsAppMessage
StaffWhatsAppRecipient
StaffWhatsAppAlert
```

No operational WhatsApp behavior was activated.

## Persistence Details

`WhatsAppConversation` stores one durable guest WhatsApp conversation shell by normalized E.164 guest phone:

```text
guestPhoneE164 UNIQUE
reservationId nullable
unreadCount
lastMessageAt
lastInboundAt
customerServiceWindowStartedAt
customerServiceWindowExpiresAt
createdAt
updatedAt
```

The Reservation relation is nullable and uses `ON DELETE SET NULL`; automatic matching remains future Final-F.4 work and was not activated.

`WhatsAppMessage` stores future guest/admin conversation message evidence:

```text
conversationId
direction
status
body nullable
providerMessageSid UNIQUE nullable
mediaCount
mediaMetadata
attemptCount
lastAttemptAt
nextAttemptAt
processingStartedAt
sentAt
deliveredAt
readAt
failedAt
errorCode
errorMessage
createdAt
updatedAt
```

The model intentionally has no raw webhook payload column.

`StaffWhatsAppRecipient` stores future opted-in staff recipients:

```text
name
phoneE164 UNIQUE
active
optedInAt
reservationConfirmedEnabled
reservationCancelledEnabled
checkInReminderEnabled
checkOutReminderEnabled
reviewSubmittedEnabled
guestWhatsAppReceivedEnabled
guestEmailReceivedEnabled
createdAt
updatedAt
```

Recipients default inactive and per-alert toggles default false. A database check prevents `active = true` without `optedInAt`.

The accepted model supports multiple different `StaffWhatsAppRecipient` rows, one per unique E.164
phone number. `phoneE164 @unique` means one durable recipient record per phone, not one staff
recipient globally. Future activation/reactivation should reuse the same row for that phone rather
than creating duplicates.

`StaffWhatsAppAlert` stores future durable staff-alert intents:

```text
recipientId
reservationId nullable
reviewId nullable
sourceWhatsAppMessageId nullable
type
status
deduplicationKey UNIQUE
recipientPhoneE164Snapshot
scheduledFor
reservation date/time snapshots
attemptCount
lastAttemptAt
nextAttemptAt
processingStartedAt
providerMessageSid UNIQUE nullable
sentAt
deliveredAt
readAt
failedAt
errorCode
errorMessage
createdAt
updatedAt
```

The optional source relations support the accepted seven alert classes without creating alerts yet.

## Database Invariants

The F.3 migration is additive DDL only. It does not insert, update, delete, truncate, backfill, or mutate historical Reservation, Review, EmailNotification, Twilio, payment, refund, calendar, or Final-E/D data.

Key database constraints and indexes:

```text
whatsapp_conversations.guest_phone_e164:
  E.164 check
  UNIQUE
  optional Reservation relation

whatsapp_conversations.unread_count:
  nonnegative check

whatsapp_conversations.customer_service_window_*:
  expiresAt must be after startedAt when both are present

whatsapp_messages.provider_message_sid:
  Twilio MessageSid shape check: ^(SM|MM)[0-9a-fA-F]{32}$
  UNIQUE nullable

whatsapp_messages.media_count:
  nonnegative check

whatsapp_messages.attempt_count:
  nonnegative check

whatsapp_messages.body/media:
  body or media required
  no raw Twilio webhook payload column

staff_whatsapp_recipients.name:
  nonblank check

staff_whatsapp_recipients.phone_e164:
  E.164 check
  UNIQUE

staff_whatsapp_recipients.active:
  active requires optedInAt
  one durable row per phoneE164
  per-event preferences

staff_whatsapp_alerts.deduplication_key:
  nonblank check
  UNIQUE

staff_whatsapp_alerts.recipient_phone_e164_snapshot:
  E.164 check

staff_whatsapp_alerts.provider_message_sid:
  Twilio MessageSid shape check: ^(SM|MM)[0-9a-fA-F]{32}$
  UNIQUE nullable

staff_whatsapp_alerts.attempt_count:
  nonnegative check

staff_whatsapp_alerts:
  dedicated WhatsApp durable intent
  recipient phone snapshot
  nullable Reservation relation
  nullable Review relation
  nullable source WhatsAppMessage relation
  retry metadata

retry/status lookup indexes:
  whatsapp_messages(status, next_attempt_at)
  staff_whatsapp_alerts(status, next_attempt_at)
```

Foreign keys:

```text
WhatsAppConversation -> Reservation: ON DELETE SET NULL
WhatsAppMessage -> WhatsAppConversation: ON DELETE CASCADE
StaffWhatsAppAlert -> StaffWhatsAppRecipient: ON DELETE RESTRICT
StaffWhatsAppAlert -> Reservation: ON DELETE SET NULL
StaffWhatsAppAlert -> Review: ON DELETE SET NULL
StaffWhatsAppAlert -> WhatsAppMessage source: ON DELETE SET NULL
```

## Independent Review Correction

An independent review found that the already-applied foundation migration used a provider MessageSid
check that was too broad after the `SM` prefix and did not support valid `MM` Twilio Message SIDs.

The applied foundation migration
`20260922170000_final_f_3_whatsapp_persistence_foundation` was not modified. The additive corrective
migration `20260922193000_final_f_3_correct_twilio_message_sid_constraints` replaces only:

```text
whatsapp_messages_provider_message_sid_check
staff_whatsapp_alerts_provider_message_sid_check
```

with the accepted SQL-equivalent contract:

```text
provider_message_sid IS NULL OR provider_message_sid ~ '^(SM|MM)[0-9a-fA-F]{32}$'
```

The correction changes no unique indexes, no nullability, and no data. No operational rows existed in
the Final-F.3 tables when the correction was applied, and no runtime webhook/provider behavior changed.

## Explicitly Not Implemented

Final-F.3 does not include:

```text
Twilio inbound webhook persistence
Twilio status callback persistence/convergence
guest phone to Reservation matching
staff phone identity runtime checks
guest conversation creation from webhook requests
/admin/whatsapp
admin inbox read model
admin outbound replies
24-hour customer-service-window UX
staff alert creation
staff alert delivery
staff alert retry worker
Zoho inbound email ingestion
Vercel cron registration
Production sender purchase/registration
WABA/Meta onboarding
Production Twilio credential or template submission
npm run final-f:validate
Final-F.4 through Final-F.8
Final-G/H
Phase 13
```

The accepted F.2 webhook endpoints remain signed ACK-only:

```text
POST /api/twilio/whatsapp/inbound -> empty Messaging TwiML after valid signature
POST /api/twilio/whatsapp/status -> 204 No Content after valid signature
```

`vercel.json` remains:

```json
{
  "crons": []
}
```

## Validation Record

Validation started from `main` at:

```text
673e43c4d3f8f25a9aee5ee196552574637776dd
```

Initial repository checks:

```text
git fetch origin
Result: PASS

git rev-parse HEAD
Result: 673e43c4d3f8f25a9aee5ee196552574637776dd

git rev-parse origin/main
Result: 673e43c4d3f8f25a9aee5ee196552574637776dd

git branch --show-current
Result: main
```

Executable validation completed so far:

```text
npm run db:format
Result: PASS
Note: Prisma emitted the existing package.json#prisma deprecation warning.

npm run db:validate
Result: PASS — Prisma schema valid
Note: Prisma emitted the existing package.json#prisma deprecation warning.

npm run db:generate
Result: PASS — Prisma Client generated successfully
Note: Prisma emitted the existing package.json#prisma deprecation warning.

npm run db:migrate:deploy
Result: PASS — 23 migrations found; 20260922170000_final_f_3_whatsapp_persistence_foundation applied successfully
Note: the same command failed inside the managed sandbox with a Prisma Schema engine error before rerun outside the sandbox.

npm run db:migrate:status
Result: PASS — 23 migrations found; database schema is up to date
Note: the same command failed inside the managed sandbox with a Prisma Schema engine error before rerun outside the sandbox.

npx tsx --tsconfig tests/final-f/tsconfig.json tests/final-f/run.ts
Result: PASS — 18/18 tests
Note: the same command failed inside the managed sandbox before loading project code with uv_os_get_passwd ENOMEM; it passed when rerun outside the sandbox with the same working tree.

npm run final-d:validate
Result: PASS — 66/66 tests
Note: executed outside the managed sandbox because tsx failed there before loading project code with uv_os_get_passwd ENOMEM.

npm run final-e:validate
Result: PASS — 88/88 tests
Note: executed outside the managed sandbox because tsx failed there before loading project code with uv_os_get_passwd ENOMEM. Final-E source-contract tests were updated to require the accepted Final-E migration while allowing later package migrations.

npm run lint
Result: PASS

npm run build
Result: PASS
Note: initial sandboxed build failed because Next/Turbopack could not fetch Google Fonts; rerun outside the sandbox compiled, type-checked, generated static pages, and included the accepted Twilio webhook routes.

git diff --check
Result: PASS
Note: Git emitted LF/CRLF working-copy warnings only.
```

Independent-review corrective validation completed on 2026-09-22 from the initial F.3 implementation
head `ee6194f2d51969aae56aab2b5351314326c3ed8a` with only the corrective migration, source-contract
test update, and this documentation update in scope:

```text
npx tsx --tsconfig tests/final-f/tsconfig.json tests/final-f/run.ts
Result: PASS — 19/19 tests
Note: the same command failed inside the managed sandbox before loading project code with uv_os_get_passwd ENOMEM; it passed when rerun outside the sandbox with the same working tree.

npm run db:generate
Result: PASS — Prisma Client generated successfully
Note: Prisma emitted the existing package.json#prisma deprecation warning.

npm run db:validate
Result: PASS — Prisma schema valid
Note: Prisma emitted the existing package.json#prisma deprecation warning.

npm run db:migrate:deploy
Result: PASS — 24 migrations found; 20260922193000_final_f_3_correct_twilio_message_sid_constraints applied successfully
Note: executed outside the managed sandbox for DB connectivity / Prisma schema-engine reliability.

npm run db:migrate:status
Result: PASS — 24 migrations found; database schema is up to date
Note: executed outside the managed sandbox for DB connectivity / Prisma schema-engine reliability.

Final-F.3 operational row-count verification
Result: PASS — whatsapp_conversations = 0; whatsapp_messages = 0; staff_whatsapp_recipients = 0; staff_whatsapp_alerts = 0

npm run final-d:validate
Result: PASS — 66/66 tests
Note: executed outside the managed sandbox because tsx failed there before loading project code with uv_os_get_passwd ENOMEM.

npm run final-e:validate
Result: PASS — 88/88 tests
Note: executed outside the managed sandbox because tsx failed there before loading project code with uv_os_get_passwd ENOMEM.

npm run lint
Result: PASS

npm run build
Result: PASS
Note: initial sandboxed build failed because Next/Turbopack could not fetch Google Fonts; rerun outside the sandbox compiled, type-checked, and generated static pages successfully.

vercel.json
Result: PASS — { "crons": [] }

Vercel
Result: SUCCESS
```

## Operational Row Check

After the initial F.3 `db:migrate:deploy` and again after the corrective `db:migrate:deploy`,
implementation validation confirmed zero rows in:

```text
whatsapp_conversations = 0
whatsapp_messages = 0
staff_whatsapp_recipients = 0
staff_whatsapp_alerts = 0
```

## Next Subphase

Final-F.4 — Guest inbound WhatsApp, safe Reservation matching and protected admin inbox — is the next subphase and remains Not started.

Do not begin Final-F.4 until explicitly requested.
