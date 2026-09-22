# Final-F.2 — Twilio Sandbox Provider Foundation, Webhook Signature Validation and Test Onboarding

Status: Completed and accepted on 2026-09-22
Implementation date: 2026-09-21
Implementation base head: `ba47dc9f22f4d61a01c13066f84e15ae8ad549f7`
Initial implementation head: `13e6dcadc9fa8930cd8166aebb8049093ce6fa3c`
Accepted implementation/validation head: `03861cb2d5daef7cca8bb759d16a0ef050d86b41`
Owner acceptance: Completed on 2026-09-22
Next subphase: Final-F.3 — WhatsApp conversation/message persistence + staff-recipient / staff-alert persistence foundation — Next / Not started
Phase 13: Not started

## Scope Implemented

Final-F.2 adds the smallest runtime/provider layer needed to begin Twilio WhatsApp Sandbox onboarding safely:

- official Twilio Node SDK dependency: `twilio@6.1.1`;
- optional server-side Twilio environment recognition in `lib/env/server.ts`;
- server-only provider foundation in `lib/twilio/provider.ts`;
- `whatsapp:+E.164` address normalization;
- provider config resolution that fails safely when Twilio is absent or incomplete;
- canonical webhook URL resolution through `TWILIO_WEBHOOK_BASE_URL`;
- official SDK-based `X-Twilio-Signature` validation for form-urlencoded webhook payloads;
- official SDK-based `validateRequestWithBody` validation for JSON/bodySHA256 webhook payloads;
- minimal signed ACK endpoints:
  - `POST /api/twilio/whatsapp/inbound`;
  - `POST /api/twilio/whatsapp/status`;
- bounded safe diagnostics for signed webhooks without raw payload, message body, or phone-number echo;
- Twilio-compatible successful webhook acknowledgements:
  - inbound signed requests return empty Messaging TwiML (`<Response></Response>`) as XML;
  - signed status callbacks return `204 No Content`;
- Local/Test-only manual Sandbox provider probe script:
  - `scripts/final-f-2-twilio-sandbox-probe.ts`;
- deterministic targeted tests in `tests/final-f`.

## Explicit Non-Goals Preserved

Final-F.2 does not add:

- Prisma schema changes or migrations;
- WhatsAppConversation persistence;
- WhatsAppMessage persistence;
- StaffWhatsAppRecipient or StaffAlert persistence;
- guest/reservation matching;
- `/admin/whatsapp`;
- guest conversation creation;
- admin outbound replies;
- 24-hour service-window UX;
- operational staff-alert scheduling or sending;
- Zoho webhook behavior;
- Production sender purchase/registration;
- WABA/Meta onboarding;
- Production Twilio credentials;
- Production template submission;
- Vercel cron registration;
- a permanent `npm run final-f:validate` gate.

`vercel.json` remains with an empty `crons` array.

## Official Twilio Documentation Revalidated

The implementation follows the official Twilio documentation revalidated on 2026-09-21:

- Twilio WhatsApp Sandbox: <https://www.twilio.com/docs/whatsapp/sandbox>
- Try out WhatsApp onboarding: <https://www.twilio.com/docs/usage/trials/try-out-whatsapp>
- WhatsApp API overview: <https://www.twilio.com/docs/whatsapp/api>
- Messaging webhooks/status callbacks: <https://www.twilio.com/docs/usage/webhooks/messaging-webhooks>
- Webhook request security: <https://www.twilio.com/docs/usage/webhooks/webhooks-security>
- Twilio Node webhook helpers: <https://github.com/twilio/twilio-node/blob/main/src/webhooks/webhooks.ts>

Key applied requirements:

- validate `X-Twilio-Signature` with the official Twilio SDK helper;
- use the exact externally visible URL configured in Twilio;
- include query params in the canonical signed URL;
- validate form-urlencoded parameters as Twilio sends them;
- validate JSON payloads through `bodySHA256` and the raw request body;
- reject missing or invalid signatures before business processing;
- keep Twilio credentials server-side only.

## Environment Contract

The following variables are optional until Sandbox onboarding is performed:

```text
TWILIO_ACCOUNT_SID
TWILIO_AUTH_TOKEN
TWILIO_WHATSAPP_FROM
TWILIO_WEBHOOK_BASE_URL
TWILIO_ONBOARDING_TO
TWILIO_ONBOARDING_PROBE_BODY
```

Test configuration target:

```text
TRP_ENVIRONMENT=test
TWILIO_WEBHOOK_BASE_URL=https://trp-booking.juantzun.dev
TWILIO_WHATSAPP_FROM=whatsapp:+<sandbox_sender_e164>
TWILIO_ONBOARDING_TO=whatsapp:+<explicit_owner_test_recipient_e164>
```

Secrets remain server-side only. No `NEXT_PUBLIC_*` Twilio value is permitted.

`TWILIO_WEBHOOK_BASE_URL` must be a canonical origin only. The app appends the inbound/status route path and any query string from the incoming request; it does not trust Host or forwarded headers for signed URL construction.

## Test Onboarding Runbook

Owner/manual Hosted Test onboarding was completed during acceptance. The accepted setup path was:

1. In Twilio Console, use Try out WhatsApp or the legacy WhatsApp Sandbox page.
2. Join the Sandbox from the explicit owner-controlled test WhatsApp recipient.
3. Configure the Vercel Test environment variables listed above.
4. Configure the Twilio Sandbox inbound webhook as:

```text
https://trp-booking.juantzun.dev/api/twilio/whatsapp/inbound
```

5. Configure the Twilio Sandbox status callback as:

```text
https://trp-booking.juantzun.dev/api/twilio/whatsapp/status
```

6. If a controlled provider send is needed, run locally/Test only:

```text
npx tsx scripts/final-f-2-twilio-sandbox-probe.ts
```

The probe requires `TWILIO_ONBOARDING_TO`. It refuses Production and does not hardcode a phone number.

Manual Sandbox/Hosted Test validation passed on 2026-09-22 with explicit owner acceptance.

## Runtime Behavior

Inbound and status routes:

- return `503` when Twilio config is absent or incomplete;
- return `400` for a missing Twilio signature;
- return `403` for an invalid Twilio signature;
- return Twilio-facing ACKs only after official SDK signature validation succeeds;
- return `200` with `Content-Type: text/xml; charset=utf-8` and empty Messaging TwiML for the inbound webhook;
- return `204 No Content` for the status callback;
- may reduce signed payloads to bounded internal diagnostics such as message SID/status, body length, presence booleans, and extra-param count;
- do not expose diagnostics in successful Twilio-facing ACK responses;
- do not persist payloads;
- do not log raw payloads;
- do not echo guest message body or phone numbers in the ACK.

## Validation Record

Executable validation completed for this implementation:

```text
npx tsx --tsconfig tests/final-f/tsconfig.json tests/final-f/run.ts
Result: PASS — 9/9 tests
Note: the same command failed inside the managed sandbox before loading project code with uv_os_get_passwd ENOMEM; it passed when rerun outside the sandbox with the same working tree.

npm run final-e:validate
Result: PASS — 88/88 tests
Note: executed outside the managed sandbox because tsx failed there before loading project code with uv_os_get_passwd ENOMEM.

npm run db:validate
Result: PASS — Prisma schema valid
Note: Prisma emitted the existing package.json#prisma deprecation warning.

npm run lint
Result: PASS

npm run build
Result: PASS
Note: initial sandboxed build failed because Next could not fetch Google Fonts; rerun outside the sandbox compiled, type-checked, generated static pages, and included /api/twilio/whatsapp/inbound and /api/twilio/whatsapp/status.

git diff --check
Result: PASS
Note: Git emitted LF/CRLF working-copy warnings only.
```

No real Twilio credentials, real phone numbers, webhook bodies, or provider payloads were used in automated tests.

## Owner Acceptance

Final-F.2 was completed and explicitly accepted by the owner on 2026-09-22.

Accepted implementation/validation head:

```text
03861cb2d5daef7cca8bb759d16a0ef050d86b41
```

Final-F.3 is the next subphase and remains Not started.

## Hosted Test / Sandbox Acceptance Evidence

The owner completed real Twilio Sandbox / Hosted Test validation on 2026-09-22.

Evidence recorded without Account SID values, Auth Token, owner phone number, Sandbox join code,
raw webhook payload, full Twilio headers, or other secrets:

```text
Twilio Sandbox join
PASS

Inbound WhatsApp message sent by owner to Sandbox
PASS

Inbound message visible in Twilio Messaging Logs
PASS

Twilio Debugger showed no webhook error
PASS

Twilio -> TRP inbound webhook
PASS

X-Twilio-Signature validation on Hosted Test
PASS

TRP inbound Twilio-compatible acknowledgement
200
Content-Type: text/xml; charset=utf-8
<Response></Response>
PASS

Primary Compliance Profile
Initially blocked outbound provider use with:
HTTP 401
Twilio code 20003
Primary compliance profile not approved

Owner completed Twilio Trust Hub / KYC process
Primary Compliance Profile approved
PASS

Controlled Sandbox provider probe
npx tsx scripts/final-f-2-twilio-sandbox-probe.ts
PASS

Outbound WhatsApp received successfully by owner
PASS

Twilio status callbacks reached Hosted Test
POST /api/twilio/whatsapp/status
204 No Content
multiple callbacks observed in Vercel
PASS
```

The Trust Hub / Primary Compliance Profile issue was a Twilio provider onboarding blocker, not a TRP
code defect.

The real provider Hosted Test validation is separate from the automated validation above. Automated
tests validated deterministic local behavior without real Twilio credentials, phone numbers, webhook
payloads, or provider payloads; Hosted Test validated the real Twilio Sandbox, signature, inbound
TwiML ACK, outbound probe, and status-callback behavior.
