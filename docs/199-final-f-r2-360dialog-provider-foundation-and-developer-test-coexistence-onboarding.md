# 199 — Final-F.R2: 360dialog Provider Foundation And Developer/Test Coexistence Onboarding

## Record

```text
Project: TRP Booking
Track: Post-Phase-12 / Pre-Phase-13 Final Improvement Track
Package: Final-F — WhatsApp communication and staff alerts
Subphase: Final-F.R2 — 360dialog provider foundation + Developer/Test Coexistence onboarding
Status: Implementation completed but superseded before owner acceptance by Final-F.R3 architecture rebaseline
Document date: 2026-09-23
Implementation base head: e6dda44f15ba54d3e386d3f4f676ace8cab22441
Accepted architecture base: Final-F.R1 at 4c94db87ebd9df225944ce76c78f98462e4755d1
Schema changes: none
Migration changes: none
Dependency changes: none
Cron registrations: none; vercel.json remains {"crons":[]}
Final-F.R3: Architecture rebaseline documented; explicit owner acceptance pending
Final-F.R3 record: docs/200-final-f-r3-admin-web-push-public-whatsapp-architecture-rebaseline.md
Final-F.R4: Not started
Final-F.R5: Not started
Final-F.6 through Final-F.8: Not started
Final-G/H: Not started
Phase 13: Not started
```

This record implemented only the R2 foundation accepted by Final-F.R1. It did not receive owner
acceptance. As of the owner-directed Final-F.R3 architecture rebaseline, the former Developer/Test
360dialog Coexistence onboarding and Hosted Test provider acceptance path is superseded and must not
be pursued unless explicitly re-opened.

## Implemented Scope

Final-F.R2 added the server-side 360dialog foundation that the then-current R1 plan required before
the old R3/R4 migration work:

```text
- dedicated 360dialog provider boundary in lib/360dialog/provider.ts
- optional server-side D360 env validation in lib/env/server.ts
- ACK-only 360dialog webhook ingress at POST /api/360dialog/whatsapp/webhook
- Developer/Test onboarding provider probe script
- deterministic Final-F behavioral/source tests for provider config, auth, payload safety, probe, and zero-cron state
- Developer/Test Coexistence onboarding and Hosted Test validation checklist documentation
```

The webhook route validates configured Basic Auth and acceptable JSON, computes only bounded safe
diagnostics, and returns a 200 ACK. It intentionally does not persist inbound messages, statuses,
`smb_message_echoes`, or history-sync payloads, and it does not call any Twilio, Prisma, or message
processor path.

## Environment Contract

R2 introduces these server-side optional variables:

```text
D360_API_KEY
D360_WEBHOOK_BASE_URL
D360_WEBHOOK_USERNAME
D360_WEBHOOK_PASSWORD
D360_ONBOARDING_TO
D360_ONBOARDING_PROBE_BODY
```

Developer/Test expected values:

```text
TRP_ENVIRONMENT=test
D360_WEBHOOK_BASE_URL=https://trp-booking.juantzun.dev
D360_WEBHOOK_USERNAME=<high-entropy configured username>
D360_WEBHOOK_PASSWORD=<high-entropy configured password, 32+ visible ASCII chars>
D360_ONBOARDING_TO=+<explicit owner test recipient E.164>
```

The 360dialog webhook URL for Hosted Test is:

```text
https://trp-booking.juantzun.dev/api/360dialog/whatsapp/webhook
```

All D360 values remain server-side only. Do not expose the API key, Basic Auth credentials, WABA or
channel identifiers, phone numbers, provider payloads, or provider responses in browser-visible code,
logs, docs with real values, or database rows.

## Provider Boundary

The provider boundary uses the official 360dialog messages endpoint:

```text
POST https://waba-v2.360dialog.io/messages
Header: D360-API-KEY
Payload: messaging_product=whatsapp, recipient_type=individual, type=text
```

The onboarding probe is Local/Test only and refuses `TRP_ENVIRONMENT=production`. The configured
recipient is accepted as E.164 and submitted to 360dialog as the international number without the
leading plus sign.

The accepted provider response shape for the onboarding probe is the official messages-array shape:

```json
{
  "messaging_product": "whatsapp",
  "messages": [
    {
      "id": "<provider message id>",
      "message_status": "accepted"
    }
  ]
}
```

R2 reads the provider message id and optional provider status only from `messages[0].id` and
`messages[0].message_status`. Missing `messages[0].message_status` is safe and resolves to `null`.
Transport-level fetch failures such as a real network `TypeError("fetch failed")`, abort, or timeout
are normalized as retryable `D360_PROVIDER_TEMPORARY_FAILURE`; HTTP 401/403 remain non-retryable
unauthorized errors, 429 remains retryable rate-limited, 5xx remains retryable temporary failure,
400/404/422 remain non-retryable invalid request, and unknown programming/unclassified failures
remain unexpected.

Safe provider errors are normalized to:

```text
D360_PROVIDER_CONFIGURATION_ERROR
D360_PROVIDER_INVALID_REQUEST
D360_PROVIDER_UNAUTHORIZED
D360_PROVIDER_RATE_LIMITED
D360_PROVIDER_TEMPORARY_FAILURE
D360_PROVIDER_REJECTED
D360_PROVIDER_UNEXPECTED_ERROR
D360_PROVIDER_PROBE_NOT_ALLOWED
```

HTTP 401/403 map to unauthorized, 429 maps to retryable rate-limited, 5xx maps to retryable
temporary failure, and invalid request classes remain non-retryable.

## Webhook Boundary

Webhook security is:

```text
HTTPS
+ Basic Authorization with D360_WEBHOOK_USERNAME / D360_WEBHOOK_PASSWORD
+ constant-time credential comparison where practical
+ acceptable JSON body validation
+ bounded safe diagnostics
+ 200 ACK only after validation
```

Missing or invalid Basic Auth fails closed with safe 401 errors. Missing/invalid server config fails
with a safe 503. Malformed JSON fails with a safe 400. Authenticated unknown Meta-format payloads are
ACKed without persistence so provider verification and future fields do not break R2.

## Historical Developer/Test Coexistence Onboarding Checklist

This was the R2 Hosted Test acceptance checklist before R2 was superseded. It is preserved as a
historical record and must not be treated as a current onboarding gate unless explicitly re-opened.
The former checklist required completing the 360dialog / Meta Developer-Test setup with placeholder
values replaced only in provider/admin consoles or protected environment variables.

Prerequisites:

```text
- The Developer/Test number is already registered and actively used in WhatsApp Business App.
- The Developer/Test number has been active in WhatsApp Business App for at least 7 days.
- The latest WhatsApp Business App version is installed.
- The primary smartphone with the Developer/Test WhatsApp Business App has a working camera for QR.
- The developer company Meta Business Portfolio is available.
- Business information is available: legal/business name, address, website, and business phone.
- The future Tu Refugio Perfecto Production Meta Business Portfolio is not used for R2.
```

Owner-executable onboarding sequence:

```text
1. Sign in to or create the 360dialog Hub account.
2. Start Add Number / Embedded Signup.
3. Confirm the number is NOT already connected to WhatsApp Business Platform/API.
4. Confirm the number IS currently active in WhatsApp Business App.
5. Enter or select the Developer/Test WhatsApp Business App number.
6. Select/connect the developer company's Meta Business Portfolio.
7. Complete Meta/360dialog Embedded Signup.
8. Verify the number when requested.
9. Keep the primary phone available with WhatsApp Business App open.
10. Follow the in-app Coexistence prompt.
11. Scan the QR code from the primary phone.
12. Complete the WhatsApp Business Platform / 360dialog connection.
13. Confirm the same number remains functional in WhatsApp Business App.
14. Confirm the 360dialog channel/API is active.
```

History/contact sync boundary:

```text
- History/contact sync is optional for R2 and TRP must not depend on it.
- Prefer deferring history/contact sync if the onboarding UI allows deferral.
- If Meta/360dialog couples or requires the choice during onboarding, do not abort solely for that.
- Document exactly what Meta/360dialog performed.
- R2 must still not persist, import, or process those historical/contact events.
- The ACK-only webhook can safely receive authenticated payloads but does not store or process them.
```

Linked-device caveat:

```text
- Coexistence onboarding may unlink companion/linked devices.
- Supported devices can be relinked after onboarding.
- Do not promise unsupported desktop or companion-device behavior.
```

Operational keep-alive:

```text
- WhatsApp Business App must be opened at least once every 13 days to keep Coexistence active.
- This is an operational documentation requirement only; R2 adds no automation or reminders.
```

Hosted Test webhook setup:

```text
1. In 360dialog Hub, open the WhatsApp Channel / Channel Webhook configuration for the R2 number.
2. Configure URL:
   https://trp-booking.juantzun.dev/api/360dialog/whatsapp/webhook
3. Add the Authorization header:
   Basic base64(D360_WEBHOOK_USERNAME:D360_WEBHOOK_PASSWORD)
4. Confirm the verification code if requested by the Hub.
5. Click Test.
6. Expected authenticated Test result: HTTP 200.
7. Expected missing/invalid auth result: HTTP 401.
8. Expected R2 persistence result: no message, status, history, echo, contact, or staff-alert persistence.
```

Environment and probe setup:

```text
- Configure D360_API_KEY only in Vercel Test / local protected env.
- Configure D360_WEBHOOK_BASE_URL=https://trp-booking.juantzun.dev.
- Configure D360_WEBHOOK_USERNAME and D360_WEBHOOK_PASSWORD for Basic Auth.
- Configure D360_ONBOARDING_TO only with the explicit owner-controlled test recipient.
- Run the controlled onboarding provider probe only in Local/Test.
- Do not enable Production numbers, Production WABA, Production 360dialog channels, templates, or staff-alert automation during R2.
```

## Historical Hosted Test Acceptance Checklist

R2 owner acceptance did not occur. This former Hosted Test checklist is superseded by Final-F.R3 and
is preserved only as historical implementation context:

```text
- Developer/Test Coexistence number is onboarded through 360dialog.
- WhatsApp Business App remains usable for the same Developer/Test number.
- D360 webhook auth rejects missing/invalid Basic Auth.
- D360 webhook accepts authenticated provider verification/unknown payloads with 200 ACK.
- D360 onboarding probe sends one controlled text through the official messages endpoint.
- Provider response returns a nonblank provider message id.
- No inbound persistence, status convergence, smb_message_echoes persistence, history import, staff alerts, or admin reply migration is activated by R2.
- vercel.json remains {"crons":[]}.
- Owner explicitly accepts Final-F.R2.
```

## Explicit Non-Goals

R2 does not implement:

```text
- inbound guest message persistence through 360dialog
- status convergence through 360dialog
- smb_message_echoes persistence
- history import
- Reservation matching changes
- /admin/whatsapp provider migration
- admin outbound reply migration
- staff automatic alert delivery
- WhatsApp templates
- Twilio runtime/dependency removal
- schema migrations
- providerMessageSid/provider-neutral schema cleanup
- Final-F.R3, Final-F.R4, Final-F.6, Final-F.7, Final-F.8, Final-G, Final-H, or Phase 13
```

## Validation

Implementation validation:

```text
npx tsx --tsconfig tests/final-f/tsconfig.json tests/final-f/run.ts
-> initial direct run failed before loading project tests because the host Node/tsx bootstrap hit
   uv_os_get_passwd returned ENOMEM in os.userInfo().
-> rerun with a temporary process-only NODE_OPTIONS shim for process.geteuid passed 88/88,
   including nested `messages[0].message_status` response parsing and retryable fetch transport
   failure normalization coverage.

npm run db:validate
-> PASS; Prisma schema valid.

npm run db:migrate:status
-> initial sandboxed run reached the configured Supabase datasource but failed with a generic schema
   engine error.
-> rerun with network access passed; 25 migrations found and database schema is up to date.

npm run final-d:validate
-> PASS 66/66, run with the same temporary process-only NODE_OPTIONS shim because the local tsx
   bootstrap otherwise fails before tests load.

npm run final-e:validate
-> PASS 88/88, run with the same temporary process-only NODE_OPTIONS shim because the local tsx
   bootstrap otherwise fails before tests load.

npm run lint
-> PASS.

npm run build
-> initial sandboxed run failed only while fetching Google Fonts.
-> rerun with network access passed.

git diff --check
-> PASS.

vercel.json
-> remains {"crons":[]}.
```

No database schema or migration was changed by R2.

## References

Official provider references used for R2:

```text
360dialog Messages API: https://docs.360dialog.com/docs/messaging-api/api-reference/messages
360dialog Webhook docs: https://docs.360dialog.com/docs/messaging/webhook
360dialog Coexistence docs: https://docs.360dialog.com/docs/resources/phone-numbers/coexistence
360dialog Coexistence onboarding: https://docs.360dialog.com/docs/hub/embedded-signup/coexistence-onboarding
360dialog text messages: https://docs.360dialog.com/partner/messaging/sending-and-receiving-messages/text-messages
```
