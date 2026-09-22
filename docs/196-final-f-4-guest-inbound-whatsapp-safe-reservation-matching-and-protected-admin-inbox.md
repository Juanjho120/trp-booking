# Final-F.4 — Guest Inbound WhatsApp, Safe Reservation Matching and Protected Admin Inbox

## Record

```text
Project: TRP Booking
Track: Post-Phase-12 / Pre-Phase-13 Final Improvement Track
Package: Final-F — Twilio WhatsApp communication and staff alerts
Subphase: Final-F.4 — Guest inbound WhatsApp, safe Reservation matching and protected admin inbox
Status: Implementation completed; owner Sandbox/Hosted Test inbound + admin-inbox validation and explicit acceptance pending
Implementation date: 2026-09-22
Implementation base head: 24e6d58060d62cf89924ddb75af29738fddf4dd1
Implementation head: this commit
Accepted Final-F.1 strategy head: d5db6a2605a03e75db7c16238a43cd5f79dde6d8
Accepted Final-F.2 provider/onboarding head: 03861cb2d5daef7cca8bb759d16a0ef050d86b41
Accepted Final-F.3 persistence foundation head: f0a465349b5217f7318146ad5b2de13f1d641a13
Schema/migration changes: none
Permanent Final-F gate: not introduced
Final-F.5: Next only after F.4 owner acceptance; Not started
Final-F.6 through Final-F.8: Not started
Final-G/H: Not started
Phase 13: Not started
```

Final-F.4 activates the accepted F.1/F.2/F.3 inbound guest WhatsApp boundary without advancing to
admin replies, status-callback convergence, staff alert creation, Zoho ingestion, cron registration,
or Production sender work.

## Scope Implemented

Inbound Twilio webhook behavior:

```text
POST /api/twilio/whatsapp/inbound
-> validateTwilioWebhookRequest()
-> use validation.payload.params only
-> processInboundWhatsAppWebhook()
-> return exactly 200 text/xml <Response></Response> for signed handled requests
```

Implemented details:

```text
- Valid signed inbound payloads are parsed from MessageSid, From, To, Body, NumMedia, and MediaContentType0..N.
- MessageSid is required and follows the accepted SM/MM hexadecimal contract.
- From and To are normalized through the accepted Twilio WhatsApp address helper.
- To must match TWILIO_WHATSAPP_FROM before any database persistence.
- Active StaffWhatsAppRecipient phone identity is checked before guest matching.
- Active staff senders are ACKed but do not create guest conversations, messages, Reservation links, or staff alerts.
- Inactive staff recipient rows do not exclude guest persistence.
- Guest conversations are created/reused by guestPhoneE164.
- Inbound messages are persisted idempotently by providerMessageSid.
- Duplicate/retry delivery does not create another WhatsAppMessage or increment unreadCount again.
- Prisma P2002 providerMessageSid conflicts converge to duplicate ACK behavior.
- New inbound messages increment unreadCount once and set lastMessageAt, lastInboundAt, customerServiceWindowStartedAt, and customerServiceWindowExpiresAt.
- The 24-hour customer-service-window timestamp foundation is maintained for future F.5 server enforcement.
- Reservation matching uses only normalized Reservation.guestPhone values.
- Exactly one normalized Reservation.guestPhone match links the conversation.
- Zero or multiple matches remain unlinked.
- Existing conversation reservationId is preserved and never reassigned by a new inbound message.
- Text bodies are persisted only in WhatsAppMessage.body.
- Media-only inbound messages are accepted when NumMedia > 0.
- Media persistence stores only conservative metadata: count and content types.
- Media URLs, attachment bytes, raw webhook payloads, signatures, Auth Token, and provider credentials are not persisted.
```

Protected admin inbox:

```text
- Adds /admin/whatsapp under the existing protected ADMIN layout.
- Adds admin navigation copy/icon for WhatsApp.
- Adds a server-side admin read model for conversation list, selected conversation, and ordered message history.
- The read model excludes providerMessageSid, raw webhook payloads, signatures, credentials, and media URLs.
- The list is ordered by lastMessageAt DESC and stable id.
- The selected conversation shows normalized guest phone, unread count, link state, optional safe Reservation/property summary, timestamps, messages, and media indicators.
- Linked reservations expose a protected admin Reservation link.
- Unlinked or ambiguous conversations remain visibly unlinked.
- Opening /admin/whatsapp is read-only and does not mutate unreadCount.
- Adds a protected same-origin ADMIN PATCH endpoint to mark a conversation read by setting unreadCount = 0.
- Mark-read is idempotent.
```

## Independent Review Corrections

An independent review after the initial Final-F.4 implementation found two hardening issues. This
correction keeps Final-F.4 in the same status:

```text
Implementation completed;
owner Sandbox/Hosted Test inbound + admin-inbox validation and explicit acceptance pending
```

Corrections applied:

```text
1. Admin history originally used ASC + take 100, which selected the oldest 100 messages.
   It now queries the latest 100 messages with createdAt DESC / id DESC and reverses them in
   application code so the admin inbox displays the selected window in chronological order.

2. Initial inbound implementation handled provider MessageSid uniqueness but did not converge
   concurrent first-conversation guestPhoneE164 races. It now distinguishes providerMessageSid
   P2002 from guestPhoneE164 P2002, retries guestPhoneE164/Serializable transaction conflicts
   with a bounded 3-attempt budget, and still propagates exhausted/unknown database failures as
   temporary webhook failures for Twilio retry.
```

## Hosted Test Candidate-Matching Correction

Hosted Test validation confirmed that inbound WhatsApp persistence and `/admin/whatsapp` worked,
but exposed a real reservation-matching visibility issue: the same guest phone appeared in more than
one existing Reservation, the conversation correctly remained unlinked, and the admin inbox did not
surface the safe Reservation candidates for operator review. A code review also found that the
normalization used for `Reservation.guestPhone` was not compatible with historical/national-only
rows.

The correction preserves the accepted Final-F.4 conservative matching rule:

```text
- exactly 1 Reservation candidate -> link transactionally during inbound persistence;
- 0 Reservation candidates -> keep WhatsAppConversation.reservationId null;
- 2+ Reservation candidates -> keep WhatsAppConversation.reservationId null;
- never choose latest/confirmed/name/property/status as a tiebreaker.
```

Phone normalization now uses one shared server-safe helper for both inbound automatic matching and
admin candidate discovery:

```text
- current booking flow rows continue to store guestPhone as countryDialCode + guestPhoneLocal and
  guestCountry as the explicit ISO2 country context;
- current international rows such as "+502 5555 1234" + GT normalize to +50255551234;
- legacy national rows such as "5555 1234" + GT normalize to +50255551234;
- national rows without guestCountry remain unmatched;
- invalid country values remain unmatched;
- international rows can normalize without country inference;
- no environment, locale, business location, or default country is used as a fallback.
```

The admin read model now dynamically exposes safe `candidateReservations` for the selected
conversation without mutating data during GET/read operations. Candidate DTOs include only bounded
operational fields (`id`, guest name, safe property names, dates, status, guest phone, and safe
timestamps) and exclude financial/provider evidence. Existing linked conversations keep their
persisted `reservationId`; other phone candidates may be shown as context, but the read model does
not reassign the conversation.

The admin UI now distinguishes:

```text
- linked Reservation: "Reservación vinculada";
- one unlinked candidate: "Posible reservación";
- multiple unlinked candidates: "Reservaciones asociadas a este teléfono (N)";
- zero candidates: "No se encontraron reservaciones asociadas a este teléfono."
```

This correction does not add manual link/unlink/reassign, reply composer, outbound WhatsApp,
status persistence, staff alerts, Zoho behavior, cron registration, schema changes, migrations, or
Final-F.5 behavior. Final-F.4 remains:

```text
Implementation completed;
owner Sandbox/Hosted Test inbound + admin-inbox validation and explicit acceptance pending
```

Technical dependency cleanup before owner acceptance declared `libphonenumber-js` as a direct npm
dependency because `lib/reservations/phone-normalization.ts` imports `libphonenumber-js/core` and
`libphonenumber-js/metadata.min.json` directly for country-aware Reservation phone normalization.
This did not change matching behavior, admin inbox behavior, schema, migrations, provider code, or
the Final-F.4 acceptance status.

## Hosted Test Admin Inbox Tabs UX Correction

Owner Hosted Test validation confirmed that candidate Reservation discovery now works, including
multiple associated Reservations for the same guest phone. The remaining UX issue was that the
selected conversation panel stacked the common conversation header, all candidate Reservation cards,
and the full chat history in one vertical flow, making `/admin/whatsapp` excessively tall whenever
several Reservations share the phone.

This correction keeps the common conversation header always visible outside tab-specific content:

```text
- guest WhatsApp phone;
- linked/unlinked badge;
- linked property summary when applicable;
- last inbound timestamp;
- 24-hour service-window expiry;
- protected Open reservation action when linked;
- protected Mark as read action.
```

Below that header, the selected conversation now reuses the shared `components/ui/tabs.tsx`
implementation with exactly two tabs:

```text
1. Chat
2. Reservaciones asociadas (N) / Associated reservations (N)
```

The Chat tab is selected by default and contains the read-only no-reply note plus the existing
latest-100 chronological message history, including empty state, timestamps, statuses, and media
indicators. Switching from one conversation to another resets the tab lifecycle to Chat using the
selected `conversation.id` as the component boundary; tab state is not stored in the database and no
tab query parameter is introduced.

The Associated Reservations tab always displays the total unique Reservation count in the tab label,
including `(0)`. The count is derived from unique IDs across `candidateReservations` plus the linked
`conversation.reservation` when present, so a linked Reservation duplicated in the candidate list is
counted once. A linked Reservation whose phone no longer matches the current candidate set is still
shown and counted because it remains the persisted association for the conversation. Zero candidates
still show the existing safe empty state.

No reservation matching, inbound persistence, Twilio signature validation, MessageSid idempotency,
staff sender discrimination, status callback behavior, schema, migration, provider call, outbound
WhatsApp, reply composer, manual link/unlink/reassign, staff alert, Zoho behavior, cron, or Final-F.5
behavior changed. Final-F.4 remains:

```text
Implementation completed;
owner Sandbox/Hosted Test validation and explicit acceptance pending
```

## Explicitly Not Implemented

Final-F.4 does not add:

```text
- Final-F.5 admin outbound replies.
- Reply composer or textarea in /admin/whatsapp.
- Twilio outbound sends from the admin inbox.
- Status callback persistence or status convergence.
- Outbound WhatsAppMessage creation.
- 24-hour-window send enforcement beyond the timestamp foundation.
- WhatsApp Content Template sending.
- StaffWhatsAppAlert creation for GUEST_WHATSAPP_RECEIVED.
- Staff alert delivery, retry worker, or scheduler.
- Zoho incoming-email webhook behavior.
- Vercel cron registration.
- Prisma schema changes or migrations.
- Permanent npm run final-f:validate gate.
- Production sender purchase/registration, WABA/Meta onboarding, Production credentials, or template submission.
- Final-F.5 through Final-F.8, Final-G/H, or Phase 13.
```

`POST /api/twilio/whatsapp/status` remains signed ACK-only:

```text
validateTwilioWebhookRequest()
-> 204 No Content
```

`vercel.json` remains:

```json
{
  "crons": []
}
```

## Validation Record

Implementation validation was run from base head:

```text
24e6d58060d62cf89924ddb75af29738fddf4dd1
```

Executable validation completed:

```text
npx tsx --tsconfig tests/final-f/tsconfig.json tests/final-f/run.ts
Result: PASS — 49/49 tests
Note: the same command failed inside the managed sandbox before loading project code with uv_os_get_passwd ENOMEM; it passed when rerun outside the sandbox with the same working tree.

npm run db:generate
Result: PASS — Prisma Client generated successfully
Note: Prisma emitted the existing package.json#prisma deprecation warning.

npm run db:validate
Result: PASS — Prisma schema valid
Note: Prisma emitted the existing package.json#prisma deprecation warning.

npm run db:migrate:status
Result: PASS — 24 migrations found; database schema is up to date
Note: the same command failed inside the managed sandbox with a Prisma Schema engine error before rerun outside the sandbox.

npm run final-d:validate
Result: PASS — 66/66 tests
Note: the same command failed inside the managed sandbox before loading project code with uv_os_get_passwd ENOMEM; it passed when rerun outside the sandbox.

npm run final-e:validate
Result: PASS — 88/88 tests
Note: the same command failed inside the managed sandbox before loading project code with uv_os_get_passwd ENOMEM; it passed when rerun outside the sandbox.

npm run lint
Result: PASS

npm run build
Result: PASS
Note: initial sandboxed build failed because Next/Turbopack could not fetch Google Fonts; rerun outside the sandbox compiled, type-checked, and generated static pages successfully, including /admin/whatsapp and /api/admin/whatsapp/conversations/[conversationId]/read.

git diff --check
Result: PASS
Note: Git emitted working-copy LF/CRLF warnings only; no whitespace errors were reported.
```

Automated tests are deterministic and do not use real Twilio credentials, real phone numbers, raw
provider webhook payloads, or provider sends.

## Owner Acceptance Status

Owner Sandbox / Hosted Test validation remains pending for F.4.

Required owner-facing acceptance evidence still pending:

```text
- Real signed Sandbox inbound reaches Hosted Test and is persisted idempotently.
- Active staff sender exclusion is confirmed in Hosted Test when applicable.
- /admin/whatsapp displays the inbound conversation and safe message history.
- Optional Reservation matching remains conservative and visibly unlinked when ambiguous.
- Mark-read works through the protected admin operation.
- Status callbacks continue to ACK without persistence.
```

Final-F.4 must not be marked accepted until that validation and explicit owner acceptance occur.

## Next Subphase

Final-F.5 — Admin outbound replies, 24-hour service-window enforcement and Twilio status callbacks —
is the next planned subphase after F.4 acceptance, but remains Not started.
