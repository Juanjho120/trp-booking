# 198 — Final-F Architecture Revision R1: 360dialog + Meta Coexistence

## Record

```text
Project: TRP Booking
Track: Post-Phase-12 / Pre-Phase-13 Final Improvement Track
Package: Final-F — WhatsApp communication and staff alerts
Revision: Final-F.R1 — 360dialog + Meta Coexistence architecture revision
Status: Architecture revision documented; explicit owner acceptance pending
Document date: 2026-09-23
Starting head: 551199a3e562be7c7fd9861760c3e38cafbf0b15
Runtime/schema/dependency changes: none
Authoritative provider architecture: 360dialog + Meta WhatsApp Cloud API + WhatsApp Business App Coexistence
Final-F.R2: Not started
Final-F.R3: Not started
Final-F.R4: Not started
Final-F.6: Blocked until the R1-R4 correction track completes
Final-F.7 through Final-F.8: Not started
Final-G/H: Not started
Phase 13: Not started
```

This document supersedes the provider-specific Twilio target decisions in the accepted Final-F.1 and
Final-F.2 historical records. It does not revoke the fact that Final-F.1 and Final-F.2 were accepted
when Twilio was the approved provider strategy, and it does not rewrite repository history. From R1
forward, this document is the authoritative Final-F provider-architecture record.

## Owner Decision

The owner has changed the Final-F target architecture from Twilio to:

```text
360dialog
+
Meta WhatsApp Cloud API
+
WhatsApp Business App Coexistence
```

Twilio is discarded completely from the target Final-F architecture. TRP must not keep a split model
where guest messaging uses 360dialog and staff alerts use Twilio. The target is:

```text
360dialog for guest messaging
+
360dialog for staff automatic alerts
```

## Historical Supersession

The following records remain historically accurate:

```text
docs/193-final-f-1-twilio-whatsapp-staff-alert-strategy-onboarding-and-security-contract.md
docs/194-final-f-2-twilio-sandbox-provider-foundation-webhook-signature-validation-and-test-onboarding.md
```

They record accepted work that really happened. However, their Twilio provider decisions, Twilio
number-acquisition strategy, `X-Twilio-Signature` webhook model, Twilio Sandbox onboarding path,
Twilio templates, and Twilio runtime target are superseded by this R1 document.

Final-F.5 at `551199a3e562be7c7fd9861760c3e38cafbf0b15` was implemented but never owner-accepted.
It is now classified as:

```text
Twilio-based implementation completed,
but superseded before owner acceptance by
Final-F Architecture Revision R1.
```

Do not run the previously planned Twilio Sandbox owner acceptance test for Final-F.5. Reusable F.5
product/domain behavior must migrate to 360dialog/Meta rather than be discarded.

## Target Guest Messaging Architecture

The guest-facing human messaging flow becomes:

```text
Guest
<-> same official business WhatsApp number
<-> WhatsApp Business App
+
Meta WhatsApp Cloud API via 360dialog
<-> TRP Booking
```

WhatsApp Business App is the primary human messaging interface and the primary native notification
source for human guest messages. Staff may receive native WhatsApp notifications, read guest
messages, and reply from WhatsApp Business App.

`/admin/whatsapp` is retained, but its role changes to:

```text
- protected historical conversation view
- Reservation operational context
- phone-based Reservation candidates
- unread/internal TRP context
- alternative reply channel
- delivery/status evidence
```

`/admin/whatsapp` is not the only human channel and does not replace WhatsApp Business App. Admins
may reply from TRP when convenient, but the official app remains the primary human surface.

## Coexistence Event Model

The target Coexistence behavior is:

```text
messages sent via Cloud API
-> appear automatically in WhatsApp Business App

messages sent by staff from WhatsApp Business App
-> smb_message_echoes webhook
-> TRP persists/synchronizes them
```

Future provider migration must support these event families:

```text
- standard inbound messages webhook
- statuses webhook
- smb_message_echoes
```

`history` onboarding sync may be evaluated as an optional controlled import. It is not mandatory to
activate automatically. Future R2/R3 work must decide whether to import history, how to deduplicate
it, how to distinguish imported history, and how to avoid duplicate existing Test data.

`smb_app_state_sync` is not a core TRP requirement and must not be introduced without a documented
need.

## smb_message_echoes Semantics

Future provider migration must persist staff replies sent from WhatsApp Business App as TRP outbound
history:

```text
staff sends message from WhatsApp Business App
-> 360dialog/Meta smb_message_echoes
-> OUTBOUND WhatsAppMessage in TRP
```

Requirements:

```text
- idempotent by provider message id
- do not call provider again
- do not create a second outbound send
- preserve chronological conversation history
```

This is required so `/admin/whatsapp` remains useful even when human replies happen primarily in
WhatsApp Business App.

## Staff Automatic Alerts

`GUEST_WHATSAPP_RECEIVED` is removed from active target behavior. WhatsApp Business App itself
provides the native notification for human guest messages, so TRP must not generate a second
WhatsApp alert to staff for every guest bubble. Do not introduce AI classification or replacement
guest-message alerting.

Final-F now has exactly six active operational staff alert classes:

```text
RESERVATION_CONFIRMED
RESERVATION_CANCELLED
CHECK_IN_MINUS_48H
CHECK_OUT_MINUS_6H
REVIEW_SUBMITTED
GUEST_EMAIL_RECEIVED
```

These are TRP-generated operational events that WhatsApp Business App cannot know by itself. Their
target delivery provider is 360dialog / Meta Cloud API, not Twilio.

Current schema still contains:

```text
StaffWhatsAppAlertType.GUEST_WHATSAPP_RECEIVED
StaffWhatsAppRecipient.guestWhatsAppReceivedEnabled
```

R1 performs no schema change. For now, those fields are classified as legacy / deprecated /
inactive. Final-F.6 must not generate `GUEST_WHATSAPP_RECEIVED`. Physical schema cleanup can be
evaluated during the provider migration; do not create a destructive migration solely for
documentation cleanliness.

Staff automatic alerts remain WhatsApp business-initiated communication and must preserve:

```text
- explicit StaffWhatsAppRecipient opt-in
- active/inactive status
- per-event preferences
- one recipient row per E.164 phone
- durable StaffWhatsAppAlert intent
- post-commit provider delivery
- provider failure never rolling back the business event
```

360dialog/Meta templates are required whenever platform policy requires them. Operational alert
templates should be submitted as Utility where the content qualifies; Meta retains final template
classification authority.

## Staff Inbound Identity

Known active staff phone numbers must be recognized before guest matching. If a staff member replies
to an automated staff alert, TRP must not create or contaminate a guest conversation.

Staff alert copy should continue directing staff to the correct TRP Admin operational area when
appropriate.

## Provider-Neutral Persistence Direction

The Final-F.3 domain foundation remains conceptually reusable:

```text
- WhatsAppConversation
- WhatsAppMessage
- StaffWhatsAppRecipient
- StaffWhatsAppAlert
- retry/status metadata
```

Future migration should identify and clean provider-specific naming or constraints, including:

```text
- providerMessageSid
- Twilio SID-specific constraints
- Twilio-specific naming
```

Conceptually these should become:

```text
providerMessageId
```

or an equivalent provider-neutral contract. R1 does not implement that migration.

## Reusable Final-F.4 and Final-F.5 Product Behavior

Final-F.4 remains completed and accepted. The product behavior remains accepted:

```text
- /admin/whatsapp
- guest conversation history
- safe phone normalization
- Reservation matching/candidates
- tabs
- unread
- mark-read
- message history
```

The Twilio-specific transport/webhook implementation beneath F.4 is superseded and must be replaced
during the correction track. Do not revoke F.4 owner acceptance.

Final-F.5 was superseded before owner acceptance. The reusable F.5 product/domain behavior is:

```text
- admin reply composer
- server 24-hour customer-service window enforcement
- clientRequestId idempotency
- durable outbound intent
- status convergence
- concurrency hardening
```

These must migrate to 360dialog/Meta rather than be discarded.

## Environment Architecture

Local/Test will use a real WhatsApp Business App phone number owned by the developer company. It
must belong to the developer company's:

```text
- Meta Business Portfolio
- WhatsApp Business Account / Coexistence setup
- 360dialog channel/subscription
```

Use it for controlled external-integration development and testing. Hosted Test remains the
authoritative real-provider acceptance environment. Local should continue supporting deterministic
mocks by default. Real Local provider use must be explicit and controlled and may require a public
tunnel/webhook.

Production will use a different real WhatsApp Business App number owned by Tu Refugio Perfecto. It
must belong to Tu Refugio Perfecto's own:

```text
- Meta Business Portfolio
- WhatsApp Business Account
- 360dialog channel/subscription
```

No Developer/Test credentials, phone numbers, channel IDs, WABA IDs, or API keys may be reused in
Production. No fallback from Production to Test is allowed.

Future runtime config must separate environments conceptually:

```text
provider = 360dialog

Test:
developer-company channel/API credentials
developer-company phone/WABA identifiers

Production:
TRP channel/API credentials
TRP phone/WABA identifiers
```

Do not hardcode phone numbers, API keys, WABA IDs, or channel identifiers in source code. R1 does
not freeze exact environment variable names unless they already exist.

## Phone Number Acquisition

360dialog does not serve as the telephony provider for a normal Coexistence phone number. For
Coexistence, TRP/developer must bring a valid business-owned phone number.

Preferred number type:

```text
regular mobile/SIM/eSIM business number
```

The number must be capable of activation in WhatsApp Business App. For Coexistence, the number must
be actively used in WhatsApp Business App before onboarding according to current 360dialog/Meta
eligibility requirements.

Meta may expose eligible `+1 555` numbers during Embedded Signup. These are not suitable for TRP
Coexistence because they are platform-only, cannot be used in WhatsApp Business App, are
non-portable, and are not appropriate for long-term production. Do not choose a 555 number for
Developer Coexistence or Production.

The owner may use the Developer WhatsApp Business App number for other development projects. One
number has one shared WhatsApp conversation namespace/provider channel. Reusing the same dev number
across multiple concurrent projects can mix contacts, conversation history, webhook events, and test
traffic. TRP architecture must not assume exclusive global ownership of that developer phone unless
explicitly configured. If simultaneous multi-project usage becomes necessary, use a controlled
shared provider gateway/routing layer or separate test numbers. Do not implement such routing in R1.

## Webhook Security Revision

Twilio-specific `X-Twilio-Signature` validation is no longer the target architecture.

The future 360dialog target should use:

```text
HTTPS
+
high-entropy configured webhook authentication header/secret
+
strict expected provider payload parsing
```

The 360dialog outbound API key remains server-side only. Do not expose the D360 API key, webhook
secret, WABA credentials, phone identifiers, channel identifiers, or provider secrets to browser
code, logs, or database rows. Exact implementation belongs to R2.

Future webhook parsing must support Meta-format payloads:

```text
object
entry[]
changes[]
value
```

Required event families:

```text
messages
statuses
smb_message_echoes
```

Unknown/evolving fields must be ignored safely. Never persist the entire raw payload casually.

## 24-Hour Window

For messages sent from TRP through Cloud API:

```text
inside active customer-service window
-> free-form API reply allowed

outside window
-> approved template required
```

Do not bypass Meta policy. WhatsApp Business App remains the human app-side conversation surface
under Coexistence.

## Database Data Preservation

R1 must not delete current Twilio/F.4/F.5 Test evidence. Future provider migration must preserve
data safely or explicitly document any Test-only cleanup requiring owner approval. No Production
destructive operation is allowed.

## Revised Correction Sequence

The correction track before Final-F.6 is:

```text
Final-F.R1 —
360dialog + Meta Coexistence architecture revision
(documentation-only)

Final-F.R2 —
360dialog provider foundation
+ Developer/Test Coexistence onboarding

Final-F.R3 —
guest messaging transport migration:
standard inbound messages
provider-neutral message identity
statuses
smb_message_echoes
optional controlled history sync boundary

Final-F.R4 —
admin outbound reply migration
24h API enforcement
status convergence
Twilio runtime/dependency decommission

Final-F.6 —
six operational staff WhatsApp alerts via 360dialog
```

Final-F.R2, Final-F.R3, Final-F.R4, and Final-F.6 are not started by R1. Final-F.7 and Final-F.8
remain after Final-F.6 as appropriate.

## Explicit Non-Goals for R1

R1 does not implement:

```text
- 360dialog runtime provider calls
- Meta webhook parsing
- Coexistence onboarding automation
- schema changes
- migrations
- package/dependency changes
- Twilio runtime removal
- staff alert delivery
- WhatsApp template submission
- phone-number purchase
- public tunnel setup
- history sync import
- destructive cleanup
- Final-F.R2, R3, R4, F.6, F.7, F.8, Final-G, Final-H, or Phase 13
```
