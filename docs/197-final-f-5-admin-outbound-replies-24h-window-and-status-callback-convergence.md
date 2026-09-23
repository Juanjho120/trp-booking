# Final-F.5 — Admin Outbound Replies, 24-Hour Service Window and Status Callbacks

## Record

```text
Project: TRP Booking
Track: Post-Phase-12 / Pre-Phase-13 Final Improvement Track
Package: Final-F — Twilio WhatsApp communication and staff alerts
Subphase: Final-F.5 — Admin outbound replies, 24-hour service-window enforcement and Twilio status callbacks
Status: Twilio-based implementation completed; superseded before owner acceptance by Final-F Architecture Revision R1
Implementation date: 2026-09-22
Implementation base head: 29e29283e002b11d4275465f05f4785d70eae3df
Superseded implementation head: 551199a3e562be7c7fd9861760c3e38cafbf0b15
Accepted Final-F.1 strategy head: d5db6a2605a03e75db7c16238a43cd5f79dde6d8
Accepted Final-F.2 provider/onboarding head: 03861cb2d5daef7cca8bb759d16a0ef050d86b41
Accepted Final-F.3 persistence foundation head: f0a465349b5217f7318146ad5b2de13f1d641a13
Accepted Final-F.4 admin inbox head: 7912b233f5cc8b8aa726f17aeb30eaa7d15ae291
F.5 migration: 20260922210000_final_f_5_whatsapp_outbound_idempotency
Migration count before F.5: 24
Migration count after F.5: 25
Permanent Final-F gate: not introduced
Final-F targeted validation: 71/71 PASS
Owner acceptance: Not performed; Twilio acceptance path superseded before owner acceptance
Superseding architecture record: docs/198-final-f-architecture-revision-360dialog-coexistence.md
Final-F.R2 through Final-F.R4: Not started
Final-F.6: Blocked until the R1-R4 correction track completes
Final-F.7 through Final-F.8: Not started
Final-G/H: Not started
Phase 13: Not started
```

## Supersession Notice

This implementation record remains historically accurate. The F.5 runtime reached implementation
completion and deterministic validation at 71/71, but the owner changed the target architecture
before Sandbox/Hosted Test acceptance. Therefore F.5 must not be marked accepted, and the previously
planned Twilio Sandbox outbound reply + status convergence owner acceptance test must not be run.

The reusable F.5 product/domain behavior to migrate to 360dialog/Meta is:

```text
- admin reply composer
- server 24-hour customer-service window enforcement
- clientRequestId idempotency
- durable outbound intent
- status convergence
- concurrency hardening
```

Provider-specific Twilio runtime, Twilio status callback handling, Twilio SID assumptions, and
Twilio provider send behavior are superseded by
`docs/198-final-f-architecture-revision-360dialog-coexistence.md`.

## Scope Implemented

Final-F.5 activates only the accepted outbound admin-reply branch for existing
WhatsApp conversations.

Implemented runtime:

```text
- Protected POST /api/admin/whatsapp/conversations/[conversationId]/messages.
- Admin authorization through getAdminSessionActor().
- Same-origin mutation guard through isValidAdminMutationOrigin().
- Body-only free-form replies; no media and no client-selected recipient.
- Server-side recipient resolution from WhatsAppConversation.guestPhoneE164.
- Twilio sender resolution from TWILIO_WHATSAPP_FROM.
- 1600-character maximum after boundary trimming; internal whitespace is preserved.
- Server-enforced 24-hour customer-service window from lastInboundAt + 24 hours.
- Exactly 24 hours after lastInboundAt is closed.
- customerServiceWindowExpiresAt remains display/reconciliation evidence, not authorization.
- Unlinked conversations may receive replies when the window is open.
- Outbound replies update lastMessageAt only.
- Outbound replies do not update lastInboundAt, customerServiceWindowStartedAt,
  customerServiceWindowExpiresAt, or unreadCount.
```

The admin inbox now exposes:

```text
- freeformReplyAllowed;
- freeformWindowExpiresAt;
- a reply composer at the bottom of the Chat tab;
- disabled/closed-window UX with the accepted template boundary explanation;
- success clearing + router.refresh() after the server accepts the send attempt.
```

## Persistence and Idempotency

The additive F.5 migration adds:

```text
WhatsAppMessage.clientRequestId String? @unique @map("client_request_id") @db.VarChar(120)
```

Database migration:

```text
20260922210000_final_f_5_whatsapp_outbound_idempotency
```

The migration adds nullable `client_request_id`, a nonblank check when present, and a unique index.
Inbound messages keep `clientRequestId = null`. Admin outbound messages require a nonblank
`clientRequestId`.

Accepted idempotency behavior:

```text
- Same clientRequestId + same conversationId + same normalized body reuses the existing row.
- Reused identical submissions do not create another WhatsAppMessage.
- Reused identical submissions do not call Twilio again.
- Same clientRequestId with different conversationId or body is rejected.
- Provider calls happen after the short database transaction commits.
- Provider failure keeps the durable outbound row and marks it FAILED with safe error evidence.
```

## Provider Flow

`lib/twilio/provider.ts` now includes `sendTwilioWhatsAppFreeformMessage()`.

Provider behavior:

```text
- Reuses server-side Twilio config resolution and WhatsApp address normalization.
- Sends from TWILIO_WHATSAPP_FROM.
- Sends to whatsapp:{WhatsAppConversation.guestPhoneE164}.
- Includes the canonical status callback URL when TWILIO_WEBHOOK_BASE_URL is configured.
- Validates provider MessageSid as ^(SM|MM)[0-9a-fA-F]{32}$.
- Treats missing/invalid provider MessageSid as a provider failure and does not persist it.
- Maps accepted/sending/queued to QUEUED, sent to SENT, delivered to DELIVERED,
  read to READ, failed to FAILED, and undelivered to UNDELIVERED.
```

`sendTwilioSandboxProviderProbe()` remains unchanged in scope and still enforces the F.2
Local/Test-only onboarding probe boundary.

## Status Callback Convergence

`POST /api/twilio/whatsapp/status` now keeps F.2 signature validation first, then invokes the F.5
outbound status convergence service.

Callback policy:

```text
- Invalid/missing signature and provider configuration errors keep the F.2 error behavior.
- Valid signed callbacks return 204 for processed, ignored, unknown, or duplicate provider events.
- Unknown provider MessageSid returns 204 without creating rows.
- Inbound WhatsAppMessage rows are ignored.
- No raw webhook payload, raw params JSON, ChannelStatusMessage, raw Twilio text, signature,
  Auth Token, or credentials are persisted.
- Temporary database failure after valid signature validation returns 5xx for Twilio retry.
```

Status convergence:

```text
- QUEUED -> SENT -> DELIVERED -> READ may progress and may jump forward.
- READ never regresses.
- DELIVERED does not regress to SENT or QUEUED.
- SENT does not regress to QUEUED.
- FAILED and UNDELIVERED are terminal for later ordinary success callbacks.
- Duplicate same-status callbacks are harmless.
- sentAt, deliveredAt, readAt, and failedAt are set when that callback class is first observed.
- Failure callbacks persist safe errorCode when available and a safe internal errorMessage.
```

## Independent Review Hardening

Independent review found three F.5 hardening gaps after the initial implementation:

```text
1. Sequential callback convergence was correct, but concurrent callbacks could race through a
   read + update sequence and regress the persisted state.
2. Browser retries generated a fresh clientRequestId per HTTP attempt, so an ambiguous successful
   send followed by retry could create a duplicate logical outbound message.
3. Replaying an already-committed PENDING outbound intent returned the row without recovering the
   safe case where Twilio had never been called.
```

Hardening completed:

```text
- Status callback convergence now runs in a bounded Serializable transaction with up to three
  retries on Prisma P2034 serialization conflicts.
- Each retry rereads the latest WhatsAppMessage state before computing monotonic status,
  timestamps, and safe failure evidence.
- First-observed sentAt, deliveredAt, readAt, and failedAt values are preserved under duplicate
  or concurrent callbacks; later duplicates do not replace an already-persisted timestamp.
- The admin reply composer now owns the logical clientRequestId for the current normalized body,
  keeps it across ambiguous retry of the same message, clears it only after success, and creates
  a new logical identifier when the body changes.
- Existing same-ID PENDING outbound intents with no providerMessageSid can be safely reclaimed by
  the same atomic PENDING -> PROCESSING claim used for new sends.
- Existing PROCESSING, QUEUED, SENT, DELIVERED, READ, FAILED, and UNDELIVERED same-ID replays are
  returned without a blind provider resend.
- Concurrent same-ID PENDING replays are claim-safe: exactly one caller may call Twilio and losers
  reload the current message state.
```

## Protected Admin UX

The `/admin/whatsapp` Chat tab now includes the reply composer below the latest-100 message history.

The closed-window message is:

```text
ES: La ventana de 24 horas está cerrada. Para volver a contactar al huésped se requiere una plantilla de WhatsApp aprobada.
EN: The 24-hour window is closed. Contacting the guest again requires an approved WhatsApp template.
```

No template selector, template send action, bypass, manual reservation linking, or optimistic fake
provider status was added.

## Explicitly Not Implemented

Final-F.5 does not add:

```text
- Final-F.6 operational staff WhatsApp alerts.
- StaffWhatsAppAlert creation or delivery.
- GUEST_WHATSAPP_RECEIVED staff alert dispatch.
- Retry worker or retry cron for outbound admin replies.
- WhatsApp Content Template sending.
- Sending outside the 24-hour window.
- Manual conversation/reservation link, unlink, or reassignment.
- Zoho inbound email ingestion.
- Outbound WhatsApp campaign/bulk messaging.
- Production sender purchase/registration, WABA/Meta onboarding, Production credentials, or template submission.
- Vercel cron registration.
- Permanent npm run final-f:validate gate.
- Final-F.6 through Final-F.8, Final-G/H, or Phase 13.
```

`vercel.json` remains:

```json
{
  "crons": []
}
```

## Historical Hosted Test Acceptance Plan

The owner Sandbox / Hosted Test validation plan for Twilio F.5 is no longer active. It remains only
as historical context because Final-F Architecture Revision R1 superseded Twilio before owner
acceptance. Do not execute the former Twilio Sandbox acceptance path for F.5.

## Validation Record

Executable validation completed:

```text
npm run db:format
Result: PASS — Prisma schema formatted
Note: Prisma emitted the existing package.json#prisma deprecation warning.

npm run db:generate
Result: PASS — Prisma Client generated successfully
Note: Prisma emitted the existing package.json#prisma deprecation warning.

npx tsx --tsconfig tests/final-f/tsconfig.json tests/final-f/run.ts
Result: PASS — 71/71 tests
Note: the same command failed inside the managed sandbox before loading project code with uv_os_get_passwd ENOMEM during the original F.5 implementation; it passed outside the sandbox. After the independent-review hardening, the same targeted suite passed at 71/71.

npm run db:validate
Result: PASS — Prisma schema valid
Note: Prisma emitted the existing package.json#prisma deprecation warning.

npm run db:migrate:deploy
Result: PASS — 25 migrations found; applied 20260922210000_final_f_5_whatsapp_outbound_idempotency
Note: the same command failed inside the managed sandbox with a Prisma Schema engine error before rerun outside the sandbox.

npm run db:migrate:status
Result: PASS — 25 migrations found; database schema is up to date
Note: the same command failed inside the managed sandbox with a Prisma Schema engine error before rerun outside the sandbox.

npm run final-d:validate
Result: PASS — 66/66 tests

npm run final-e:validate
Result: PASS — 88/88 tests

npm run lint
Result: PASS
Note: lint was rerun after the final type-narrowing fix.

npm run build
Result: PASS
Note: initial sandboxed build failed because Next/Turbopack could not fetch Google Fonts. The first network-enabled rerun reached type-check and found a real conversationId narrowing issue, which was fixed. The final network-enabled rerun compiled, type-checked, and generated static pages successfully, including /admin/whatsapp and /api/admin/whatsapp/conversations/[conversationId]/messages.

git diff --check
Result: PASS
Note: Git emitted working-copy LF/CRLF warnings only; no whitespace errors were reported.
```

## Owner Acceptance Status

Owner Sandbox / Hosted Test outbound reply + status convergence validation was not performed, and
explicit owner acceptance was not granted for the Twilio F.5 implementation. Final-F.5 must not be
marked accepted. Its reusable behavior must be migrated through the 360dialog/Meta correction track.

## Next Subphase

Final-F.R2 — 360dialog provider foundation + Developer/Test Coexistence onboarding — is the next
correction subphase but remains Not started until explicitly requested. Final-F.6 remains blocked
until Final-F.R1 through Final-F.R4 complete.
