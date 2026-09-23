# 199 — Final-F.R2: 360dialog Provider Foundation And Developer/Test Coexistence Onboarding

## Record

```text
Project: TRP Booking
Track: Post-Phase-12 / Pre-Phase-13 Final Improvement Track
Package: Final-F — WhatsApp communication and staff alerts
Subphase: Final-F.R2 — 360dialog provider foundation + Developer/Test Coexistence onboarding
Status: Implementation completed; Developer/Test 360dialog Coexistence onboarding + Hosted Test provider validation + explicit owner acceptance pending
Document date: 2026-09-23
Implementation base head: e6dda44f15ba54d3e386d3f4f676ace8cab22441
Accepted architecture base: Final-F.R1 at 4c94db87ebd9df225944ce76c78f98462e4755d1
Schema changes: none
Migration changes: none
Dependency changes: none
Cron registrations: none; vercel.json remains {"crons":[]}
Final-F.R3: Not started
Final-F.R4: Not started
Final-F.6: Blocked until R2-R4 complete / Not started
Final-G/H: Not started
Phase 13: Not started
```

This record implements only the R2 foundation accepted by Final-F.R1. It does not accept R2 yet;
owner Developer/Test onboarding, Hosted Test provider validation, and explicit owner acceptance
remain pending.

## Implemented Scope

Final-F.R2 adds the server-side 360dialog foundation needed before the R3/R4 migration work:

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

## Developer/Test Coexistence Onboarding Checklist

Before Hosted Test acceptance, complete the 360dialog / Meta Developer-Test setup with placeholder
values replaced only in provider/admin consoles or protected environment variables:

```text
1. Confirm the Developer/Test WhatsApp Business App number is a real business-owned mobile/SIM/eSIM-capable number.
2. Confirm the number is active in WhatsApp Business App and eligible for Coexistence onboarding.
3. Use the developer company's Meta Business Portfolio and WABA, not the future Production portfolio.
4. Complete 360dialog Coexistence onboarding for the Developer/Test number.
5. Configure D360_API_KEY only in Vercel Test / local protected env.
6. Configure the Hosted Test webhook URL:
   https://trp-booking.juantzun.dev/api/360dialog/whatsapp/webhook
7. Configure webhook Basic Auth with D360_WEBHOOK_USERNAME and D360_WEBHOOK_PASSWORD.
8. Configure D360_WEBHOOK_BASE_URL=https://trp-booking.juantzun.dev.
9. Configure D360_ONBOARDING_TO only with the explicit owner-controlled test recipient.
10. Run the controlled onboarding provider probe only in Local/Test.
11. Verify inbound webhook delivery receives safe 200 ACK responses.
12. Do not enable Production numbers, Production WABA, Production 360dialog channels, templates, or staff-alert automation during R2.
```

## Hosted Test Acceptance Checklist

R2 owner acceptance remains pending until Hosted Test confirms:

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
-> rerun with a temporary process-only NODE_OPTIONS shim for process.geteuid passed 86/86.

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
