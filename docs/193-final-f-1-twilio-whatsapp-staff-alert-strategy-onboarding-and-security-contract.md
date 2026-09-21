# 193 — Final-F.1 Twilio/WhatsApp + Staff-Alert Strategy, Onboarding, Templates and Security Contract

## Record

```text
Project: TRP Booking
Track: Post-Phase-12 / Pre-Phase-13 Final Improvement Track
Package: Final-F — Twilio WhatsApp communication and staff alerts
Subphase: Final-F.1 — Twilio/WhatsApp + staff-alert strategy, onboarding, templates and security contract
Status: Completed and accepted on 2026-09-21
Implementation base head: c6dbe2309f0cd373701fc9444f7f15879692f423
Accepted implementation head: d5db6a2605a03e75db7c16238a43cd5f79dde6d8
Document date: 2026-09-21
Runtime/schema/dependency changes: none
Next subphase: Final-F.2 — Twilio Sandbox provider foundation, webhook signature validation and Test onboarding — Next / Not started
Final-G: Not started
Final-H: Not started
Phase 13: Not started
```

Final-F.1 is documentation-only. This document is the authoritative Final-F strategy contract after
explicit owner acceptance on 2026-09-21. It starts Final-F at the strategy level only and does not
implement Twilio, Zoho, schema, routes, UI, cron, secrets, or provider calls.

## Owner Acceptance

The owner explicitly accepted Final-F.1 on 2026-09-21.

Accepted implementation head:

```text
d5db6a2605a03e75db7c16238a43cd5f79dde6d8
```

The owner accepted this F.1 contract as the authoritative strategy boundary for future Final-F
subphases, including:

```text
- Sandbox/Test first strategy.
- Future use of a new phone number purchased through Twilio for Production.
- Separation between guest WhatsApp communication and staff alerts.
- /admin/whatsapp as the future canonical protected route.
- The seven mandatory staff-alert classes.
- E.164, explicit opt-in, and per-event preferences for staff recipients.
- Official X-Twilio-Signature validation using the server-side Twilio SDK helper.
- Durable intents and provider delivery after commit.
- WhatsApp 24-hour customer-service window enforcement.
- Content Templates for outbound guest communication outside the 24-hour window.
- Zoho remaining the mailbox owner.
- Persistence only of inbound-email metadata needed for alerting.
- The messageId/idempotency discovery gate for Final-F.7.
- Provider-error isolation from business state.
- Privacy and logging limits.
- Local/Test versus Production/Phase 13 separation.
- Final-F.2 through Final-F.8 remaining pending and not started.
```

Final-F as a package remains active. Final-F.2 is the next subphase and remains Not started until
explicitly requested. Final-G, Final-H, and Phase 13 remain Not started.

## Goal

Final-F adds two related but separate capabilities:

```text
A. Guest <-> Tu Refugio Perfecto WhatsApp communication

B. Internal staff operational alerts through WhatsApp
```

They both use Twilio, but they are not the same conversation.

Guest-facing WhatsApp:

```text
Guest
<-> official Tu Refugio Perfecto WhatsApp sender
<-> Twilio
<-> TRP Booking
<-> protected admin inbox
```

Staff alerts:

```text
TRP operational event
-> durable StaffWhatsAppAlert
-> Twilio
-> personal WhatsApp of opted-in staff member
```

Staff personal numbers are alert recipients only. They are never the guest-facing sender and must
never become the reply channel for guest support.

## Owner Onboarding Context

The owner is new to Twilio.

Current owner/provider facts:

```text
- A Twilio account already exists.
- No dedicated company phone number exists yet.
- The chosen Production strategy is to buy a new phone number directly from Twilio specifically for
  Tu Refugio Perfecto.
- The number has not been purchased yet.
```

Final-F must be implemented with step-by-step onboarding language. It must not assume the owner
already knows Twilio Console navigation, Account SID/Auth Token handling, Messaging Services,
WhatsApp Senders, WABA, Meta Business Portfolio, Content Templates, Content SID, the Sandbox,
webhooks, status callbacks, `X-Twilio-Signature`, or the 24-hour customer service window.

## Glossary

```text
Twilio Console
  Twilio's web dashboard where the owner configures account settings, Sandbox/Test settings,
  senders, templates, callbacks, phone numbers, and credentials.

Account SID
  Twilio account identifier. It is not the Auth Token, but it still belongs in server-side config.

Auth Token
  Twilio account secret used by the server and by Twilio SDK request validation. It must never be
  pasted into docs, client code, logs, database rows, screenshots, or test fixtures.

Messaging Service
  A Twilio messaging configuration layer that can group senders and callback behavior. Content
  Templates require Messaging Service support in Twilio's current WhatsApp template flow.

WhatsApp Sender
  A phone number registered through Twilio/Meta to send and receive WhatsApp Business Platform
  messages.

WABA
  WhatsApp Business Account. It belongs to the Meta/Twilio onboarding boundary for real WhatsApp
  senders.

Meta Business Portfolio
  The Meta business identity used during WhatsApp sender registration and verification.

Content Templates
  Twilio's template mechanism for WhatsApp-approved business-initiated messages, especially outside
  the 24-hour customer service window.

Content SID
  Twilio identifier for a Content Template. Out-of-window sends must use the approved Content SID
  path rather than free-form Body text.

Sandbox / Try out WhatsApp
  Twilio's shared testing environment for WhatsApp. It supports functional integration tests without
  a registered WhatsApp Sender or WABA, but it is not the future company number.

Webhooks
  HTTP callbacks from Twilio or Zoho to TRP Booking when inbound messages, status changes, or email
  events happen.

Status callbacks
  Twilio callbacks for outbound message state changes such as sent, delivered, read, failed, or
  undelivered.

X-Twilio-Signature
  Twilio's webhook signature header. Final-F endpoints must validate it with the official server-side
  Twilio SDK helper.

Customer service window
  WhatsApp's 24-hour window opened or reset by an inbound user message. Free-form replies are
  allowed inside the window; outside it, approved templates are required.
```

## Provider Assumptions Revalidated On 2026-09-21

Final-F.1 was checked against current official Twilio and Zoho documentation on 2026-09-21. Provider
rules can change, so every material onboarding or acceptance step must re-check official docs.

Current Twilio contract:

```text
- Twilio Sandbox is intended for testing/discovery.
- Sandbox does not require a WABA or registered WhatsApp Sender.
- Sandbox supports inbound and outbound functional testing.
- Sandbox supports an inbound webhook URL and a status callback URL.
- Sandbox recipients must join the Sandbox.
- Sandbox association expires after three days.
- Sandbox business-initiated messages are limited to the Sandbox's pre-approved templates.
- Custom Production WhatsApp templates require the real registered sender/template approval path.
- Inbound user WhatsApp messages open/reset a 24-hour customer service window.
- Free-form replies are allowed inside that window.
- Outside the window, an approved WhatsApp template is required.
- A real WhatsApp sender can use a Twilio phone number or a compatible non-Twilio number.
```

For this project, the chosen path is a new Twilio-purchased number. No existing personal/business
WhatsApp number is migrated.

Current Zoho contract:

```text
- Zoho Mail Developer Space supports webhooks for real-time integration events.
- Outgoing Webhooks can be configured for incoming mail events.
- Limited Data List for email currently documents only Subject, From, To, and time.
- Zoho Mail APIs assign a unique messageId to every email and use messageId for message-specific
  API operations.
- Zoho webhook validation uses x-hook-secret from the first request and x-hook-signature on
  subsequent requests, with Base64(HMAC-SHA256(secret, raw full request body)).
```

## Frozen Final-F Subphase Split

```text
Final-F.1
Twilio/WhatsApp + staff-alert strategy,
onboarding, templates and security contract

Final-F.2
Twilio Sandbox provider foundation,
webhook signature validation and Test onboarding

Final-F.3
WhatsApp conversation/message persistence
+ staff-recipient / staff-alert persistence foundation

Final-F.4
Guest inbound WhatsApp,
safe Reservation matching
and protected admin inbox

Final-F.5
Admin outbound replies,
24-hour service-window enforcement
and Twilio status callbacks

Final-F.6
Operational staff WhatsApp alerts:
- reservation confirmed
- reservation cancelled
- check-in -48h
- check-out -6h
- review submitted
- guest WhatsApp message received

Final-F.7
Zoho incoming-email webhook metadata
+ guest-email-received staff alert

Final-F.8
Integrated Sandbox/Hosted-Test regression
and Final-F documentation closure
```

Final-F.2 is not started by this document.

## Production-Number Decision

The Production decision is frozen:

```text
Tu Refugio Perfecto will use a new phone number purchased directly from Twilio.
That number will later be registered as the official WhatsApp Sender.
It is not currently used by WhatsApp or WhatsApp Business App.
No migration of an existing WhatsApp number is required.
```

Do not freeze yet:

```text
- country
- area code
- number type
- exact E.164 number
```

Although the business is in Guatemala, Final-F must not assume a suitable `+502` number can be
purchased through Twilio. The future selection must verify current Twilio inventory, WhatsApp sender
compatibility, SMS and/or Voice OTP capability, regulatory requirements, Meta/Twilio onboarding
compatibility, and business ownership.

F.1 does not buy the number, register the sender, create a WABA, create a Meta Business Portfolio,
submit Production templates, or configure Production credentials. Phase 13 remains the expected
company-owned Production onboarding boundary.

## Test/Sandbox Strategy

Final-F Test implementation uses the Twilio WhatsApp Sandbox/testing environment first.

Sandbox is sufficient to validate:

```text
- Twilio SDK integration
- inbound webhook
- official signature validation
- outbound API call
- status callbacks
- provider MessageSid capture
- 24-hour-window behavior
- conversation persistence
- admin inbox flow
- staff recipient routing
- alert intent persistence
- retry behavior
- idempotency
- Sandbox-supported template mechanics
```

Sandbox is not evidence of:

```text
- company real sender registration
- Meta business verification
- company display-name approval
- real Production Content Template approval
- real Production number ownership
- Production delivery reputation/limits
```

Final-F Test keeps the existing Test scheduler safety boundary unless an accepted later subphase
explicitly changes it. `vercel.json` must not be changed in F.1.

## Guest WhatsApp Architecture

Canonical protected admin route for Final-F guest messaging:

```text
/admin/whatsapp
```

Only authorized existing ADMIN users may access it in Final-F. No new messaging-agent role is added
unless separately approved.

Initial capabilities:

```text
- conversation list
- unread indicator
- safe guest identity / normalized phone
- optional linked Reservation
- last message/time
- message history
- inbound/outbound distinction
- delivery/read/failure state
- link to Reservation
- reply composer
```

A guest does not need an existing Reservation. Unknown external numbers create or reuse an unlinked
guest `WhatsAppConversation`. Automatic Reservation linkage may use normalized guest phone only when
matching is unambiguous under the active matching rule. Ambiguous or zero matches remain unlinked.

Staff phone identity must be checked before guest phone matching. If a known active staff number
sends a WhatsApp message to the business sender, TRP must not create a guest conversation, must not
link that message to a Reservation as a guest, and must not contaminate guest messaging history.

## WhatsApp Message Persistence And Media

Unlike human email, TRP owns the WhatsApp admin inbox. Guest WhatsApp text storage is allowed and
required for the protected conversation experience.

Security boundary:

```text
- message bodies are protected server/database data only
- message bodies are never public
- message bodies are not casually logged
- message bodies are not copied into unrelated audit metadata
- provider credentials are never persisted with messages
- raw Twilio webhook payloads are not persisted unless a later subphase proves a narrow sanitized
  need
```

Initial media scope is conservative:

```text
Text messages: supported.
Inbound media: persist safe provider metadata only at first, such as media count/type/provider URL
metadata where safe.
Attachment bytes: not mirrored or downloaded into TRP during initial Final-F.
Admin UI: show that media was received without pretending local retention exists.
Outbound media: out of initial scope unless explicitly approved later.
```

Provider media URLs can be temporary or access-controlled by Twilio and must be handled as sensitive
metadata, not as durable public assets.

## Mandatory Staff Alerts

Exactly seven staff alert classes are frozen:

```text
RESERVATION_CONFIRMED
RESERVATION_CANCELLED
CHECK_IN_MINUS_48H
CHECK_OUT_MINUS_6H
REVIEW_SUBMITTED
GUEST_WHATSAPP_RECEIVED
GUEST_EMAIL_RECEIVED
```

These alerts are operational notifications only. They do not derive financial truth, do not mutate
Reservation/Payment/Refund/Review business state, and must not roll back business transactions when
Twilio is unavailable.

## Seven Event Contracts

### RESERVATION_CONFIRMED

Business meaning:

```text
Reservation confirmed = payment successfully approved and Reservation actually became CONFIRMED.
```

Trigger:

```text
payment APPROVED
+ Reservation CONFIRMED
+ normal business transaction COMMIT
-> one durable alert intent per eligible staff recipient
-> post-commit immediate best-effort Twilio delivery
```

Reuse the accepted reservation-confirmation source of truth: `Reservation.status` changes from
`PENDING_PAYMENT` to `CONFIRMED` after validated provider payment, with `confirmedAt` set and
`expiresAt` cleared. Do not alert merely because a Reservation row was created. Provider failure
must never rollback payment or reservation confirmation.

Alert content:

```text
New confirmed reservation
property
safe guest display name
check-in
check-out
protected admin link
```

Conceptual idempotency key:

```text
reservation-confirmed/{reservationId}/{staffRecipientId}
```

### RESERVATION_CANCELLED

Trigger only after the actual cancellation commits:

```text
Reservation -> CANCELLED
+ business cancellation committed
-> durable staff alert
-> post-commit best-effort delivery
```

Do not alert for requested, failed, withdrawn, or rejected cancellation flows. Pending future
check-in/check-out reminders for a cancelled Reservation must become ineligible or superseded.

Alert content:

```text
Reservation cancelled
property
safe guest display name
dates
protected admin link
```

Conceptual idempotency key:

```text
reservation-cancelled/{reservationId}/{staffRecipientId}
```

### CHECK_IN_MINUS_48H

Canonical timestamp:

```text
checkInAt = Reservation.checkInDate + Property.checkInTime in America/Guatemala
scheduledFor = checkInAt - 48 hours
```

Scheduler eligibility:

```text
now >= checkInAt - 48h
AND
now < checkInAt
```

This permits bounded late catch-up if a scheduled/manual execution is delayed. Once the actual
check-in time passes, the reminder is stale and must not send.

Compatible Reservation evidence:

```text
- Reservation.status === CONFIRMED
- Reservation.confirmedAt is present
- Reservation.cancelledAt is null
- Reservation.checkInDate/checkOutDate are current persisted dates
- Property.checkInTime is current and parses through the accepted Guatemala time helpers
- Reservation is not PENDING_PAYMENT, EXPIRED, BLOCKED, CANCELLED, REFUNDED, or PARTIALLY_REFUNDED
```

The schema explicitly marks `REFUNDED` and `PARTIALLY_REFUNDED` as historical compatibility states,
and active stays must remain `CONFIRMED`. Therefore staff stay reminders use current active
`CONFIRMED` Reservation state rather than the broader post-checkout review-eligibility
compatibility rules.

Conceptual idempotency key:

```text
checkin-48h/{reservationId}/{currentCheckInSnapshot}/{staffRecipientId}
```

### CHECK_OUT_MINUS_6H

Canonical timestamp:

```text
checkOutAt = Reservation.checkOutDate + Property.checkOutTime in America/Guatemala
scheduledFor = checkOutAt - 6 hours
```

Scheduler eligibility:

```text
now >= checkOutAt - 6h
AND
now < checkOutAt
```

Use the same active-stay eligibility evidence as check-in. Null/blank/invalid `Property.checkOutTime`
fails closed. Do not send after checkout has already passed.

Conceptual idempotency key:

```text
checkout-6h/{reservationId}/{currentCheckOutSnapshot}/{staffRecipientId}
```

### REVIEW_SUBMITTED

Source of truth is Final-E's accepted private guest review submission.

Conceptual flow:

```text
Review created PENDING
+ ReviewInvitation CONSUMED
+ existing Final-E durable ADMIN_REVIEW_SUBMITTED email behavior
+ staff WhatsApp alert intent(s)
-> COMMIT
-> immediate best-effort WhatsApp delivery
```

Twilio delivery must not be part of the Serializable review transaction. Twilio failure must not
rollback Review creation, reactivate ReviewInvitation, or affect `ADMIN_REVIEW_SUBMITTED` email.

Alert content:

```text
New review
property
safe guestDisplayName
rating
/admin/reviews link
```

Do not include the entire comment by default.

Conceptual idempotency key:

```text
review-submitted/{reviewId}/{staffRecipientId}
```

### GUEST_WHATSAPP_RECEIVED

Conceptual flow:

```text
Guest WhatsApp
-> Twilio inbound webhook
-> validate X-Twilio-Signature
-> idempotently persist inbound WhatsAppMessage by provider MessageSid
-> resolve/create WhatsAppConversation
-> safe optional Reservation linkage
-> mark unread
-> create one staff alert intent per enabled recipient
-> commit
-> best-effort staff WhatsApp alert delivery
```

No Twilio provider send runs inside the inbound persistence transaction.

Alert content:

```text
New guest WhatsApp message
safe guest/phone identity
property/reservation only if unambiguous
/admin/whatsapp link
```

Conceptual idempotency key:

```text
guest-whatsapp/{twilioMessageSid}/{staffRecipientId}
```

### GUEST_EMAIL_RECEIVED

Applies to human emails received at configured administrative/public correspondence addresses.

Known Local/Test aliases currently include:

```text
admin@juantzun.dev
reservas@juantzun.dev
reservations@juantzun.dev
```

Future Production equivalents remain under:

```text
turefugioperfecto.com
```

Runtime logic must not hardcode those addresses; accepted environment/configuration boundaries remain
authoritative.

Alert content:

```text
New guest email
From
To alias
Subject
received time
Open Zoho Mail
optional safe Reservation link
```

No email body, HTML, or attachments appear in WhatsApp staff alerts.

Conceptual idempotency key:

```text
guest-email/{stableZohoMessageId}/{staffRecipientId}
```

## Date-Change And Stale Reminder Handling

A reminder must never send using stale Reservation dates/times.

If check-in/check-out dates or property times change after an alert intent was scheduled:

```text
old intent: superseded or skipped before delivery
new current dates: produce the correct current reminder intent
```

Pre-send revalidation is mandatory. The delivery processor must reload the current Reservation,
current Property time, current status/cancellation evidence, and the intent's target snapshot before
sending. If the snapshot no longer matches current state, the intent must not be sent.

## Staff Recipient And Opt-In Contract

Conceptual model for F.3:

```text
StaffWhatsAppRecipient

id
name
phoneE164
active
optedInAt

reservationConfirmedEnabled
reservationCancelledEnabled
checkInReminderEnabled
checkOutReminderEnabled
reviewSubmittedEnabled
guestEmailReceivedEnabled
guestWhatsAppReceivedEnabled

createdAt
updatedAt
```

Requirements:

```text
- phone normalized to E.164
- no duplicate active phone
- explicit opt-in required
- active/inactive state
- per-event preferences
- admin managed
- no Twilio credentials in this table
- no hardcoded personal staff phones in source code
```

Production staff alerts are business-initiated WhatsApp communication, so no staff alert can be sent
without active recorded opt-in. Sandbox staff recipients must explicitly join the Sandbox before
controlled tests.

Staff alert copy must instruct recipients to open TRP Admin to respond to guests. Staff must not
reply directly to alert messages from their personal WhatsApp.

## Twilio Webhook Security

All inbound and status callback endpoints must validate `X-Twilio-Signature`.

Required implementation direction for F.2/F.5:

```text
- use the official server-side Twilio SDK validation helper
- do not implement a custom approximation of Twilio's signature algorithm
- validate against the exact externally visible webhook URL configured in Twilio
- preserve request parameter/body semantics required by Twilio
- support evolving parameter sets
- handle form and JSON webhook variants according to Twilio SDK requirements
- reject invalid signatures before persistence, matching, or alert creation
```

Behind Vercel/proxies, do not blindly trust arbitrary forwarded host/proto headers from untrusted
clients. F.2 must validate hosted Test signature behavior with a real Twilio request.

Expected server-side secrets conceptually:

```text
TWILIO_ACCOUNT_SID
TWILIO_AUTH_TOKEN
TWILIO_WHATSAPP_FROM
```

Exact names can be finalized in F.2. The Auth Token is server-side only: no client exposure, no
database persistence, no logs, no docs, no fixtures, no screenshots.

## Templates And 24-Hour Window

Outbound guest replies:

```text
Inside active 24-hour customer-service window:
authorized admin -> free-form reply allowed -> durable outbound message/intent -> Twilio send
-> MessageSid persisted -> status callbacks update delivery state

Outside 24 hours:
free-form reply blocked server-side
approved Content Template required
```

The UI may disable controls, but the server must enforce the window. Never bypass template rules by
injecting arbitrary free-form text into template variables.

Status callbacks must model at least:

```text
queued
sent
delivered
read
failed
undelivered
```

Callbacks may repeat, arrive out of order, and arrive after retries. State convergence must be
idempotent and order-safe. `MessageSid` is the provider identity for callback correlation.

## Staff Alert Delivery Architecture

Use the durable-intent pattern already proven by email and other provider flows:

```text
business event
-> same business transaction where practical:
   create/reuse StaffWhatsAppAlert intent per recipient
-> COMMIT
-> immediate best-effort Twilio send
-> SENT / provider state
```

Provider failure:

```text
business event stays committed
alert FAILED/PENDING
retry metadata persists
processor retries later
```

Never send through Twilio inside Reservation, Review, payment, refund, cancellation, or inbound
webhook persistence transactions.

Do not reuse the email processor. Use a dedicated WhatsApp processor conceptually named:

```text
PROCESS_WHATSAPP_NOTIFICATIONS
```

Responsibilities:

```text
- retry due outbound guest messages
- retry due staff alerts
- recover stale PROCESSING claims
- respect max attempts
- never duplicate provider sends
```

Conceptual scheduler:

```text
SCHEDULE_STAFF_RESERVATION_ALERTS
```

Responsibilities:

```text
- check-in -48h intent creation/convergence
- check-out -6h intent creation/convergence
- stale/superseded schedule convergence
```

Keep reminder intent creation/scheduling separate from physical delivery where practical. Production
cron activation is not part of F.1.

## Zoho Webhook Metadata Boundary

Previous accepted Zoho architecture remains true:

```text
Resend = automatic transactional email
Zoho = human mailbox/replies/threading
TRP EmailNotification = automatic email delivery history
TRP does not become a general email inbox
```

Final-F.1 revises only the bounded event-metadata boundary required for staff alerts.

Zoho continues to own:

```text
message body
HTML
attachments
thread history
mailbox search
inbox
sent folder
drafts
human replies
spam filtering
retention
```

TRP may receive and persist only bounded metadata needed to detect a new inbound human email,
deduplicate the event, optionally match a Reservation safely, and create staff alerts.

## Zoho Outgoing Webhook Contract

F.7 target:

```text
Zoho Mail incoming email
-> Zoho Outgoing Webhook
-> protected TRP webhook endpoint
```

Use provider-supported conditions so only relevant incoming mail triggers the integration. Use
Limited Data List where compatible with the required idempotency/security contract.

Current documentation says Limited Data List sends:

```text
Subject
From
To
time
```

Do not assume it contains `messageId`.

## Zoho Idempotency Discovery Gate

Strong idempotency needs a stable provider event/message identifier. F.1 must not invent a fake
deduplication strategy such as `hash(subject + from + time)` because two legitimate emails can
collide.

F.7 must empirically determine the safest supported path:

```text
1. Verify whether actual Limited Data payload includes a stable messageId.

2. If not, determine whether an official Zoho Custom Function can emit:
   messageId
   Subject
   From
   To
   receivedTime
   and exclude body/HTML/attachments.

3. If that cannot be done safely, evaluate accepting the provider's full webhook transiently
   server-side while:
   - validating signature first where technically possible
   - extracting only stable metadata/messageId
   - never persisting body/HTML/attachments
   - never logging raw payload
   - discarding excess content immediately.

4. If no provider-supported secure/idempotent approach is available:
   STOP and return to owner before shipping F.7.
```

Do not introduce Zoho OAuth merely for this alert unless provider discovery proves webhook-only
behavior insufficient and the owner explicitly approves it.

## Zoho Webhook Signature

Current provider contract:

```text
first webhook registration request:
x-hook-secret is supplied

subsequent requests:
x-hook-signature

signature:
Base64(HMAC-SHA256(x-hook-secret, raw full request body))
```

Requirements:

```text
- capture/store x-hook-secret only in deployment secret storage
- never commit it
- never persist it in application tables
- validate signature before trusting event data
- use constant-time signature comparison
- never log raw webhook body
- return HTTP 200 to the initial configuration POST only after safely handling the setup request
```

F.7 owns the operational setup/runbook.

## Email-To-Reservation Matching

Do not trust webhook-provided reservation relations.

Possible matching:

```text
normalized From email -> Reservation.guestEmail
```

Automatic link only if unambiguous under an explicitly defined current/relevant reservation rule.
Zero matches or multiple matches remain unlinked, and staff still receive the alert. Never silently
choose an arbitrary Reservation.

## Provider Failure Isolation And Webhook Acknowledgement

Twilio outage must not break:

```text
payment confirmation
reservation confirmation
cancellation
review submission
Zoho webhook acknowledgement once durable processing succeeds
```

Business state and communication state are separate.

Inbound Twilio/Zoho webhooks should:

```text
validate
normalize
persist idempotently
create internal intents
commit
respond promptly
```

Provider delivery of staff alerts should be post-commit where possible. Do not hold provider
webhook responses open while doing unrelated expensive work.

## Privacy And Logging

Safe logs may include:

```text
internal event type
internal row ID
safe provider error code
masked phone
status
attempt count
```

Do not log:

```text
Auth Token
full phone unnecessarily
guest WhatsApp body
raw webhook body
Zoho full email body
x-hook-secret
x-hook-signature
private reservation/payment/review tokens
card data
Tilopay raw data
refund provider evidence
email body/HTML/attachments
```

Staff alert content must be minimal operational context only.

## Environment Boundaries

```text
Local/Test:
- developer-owned Twilio account may be used for Sandbox/Test validation
- Twilio Sandbox/Test before real sender
- no Production sender purchase/registration
- no Production WABA/Meta onboarding
- no Production templates
- no Production scheduler activation

Production / Phase 13:
- company-owned Twilio boundary
- real company phone number purchase
- real WhatsApp Sender registration
- Meta Business Portfolio / WABA
- business verification
- Production Content Templates
- Production credentials
- Production scheduler activation
```

Final-F does not move Production resources into Test work.

## F.2 Owner Onboarding Handoff

F.2 should guide the owner through:

```text
1. Open correct Twilio testing/Sandbox area.
2. Activate WhatsApp testing environment.
3. Join from owner's WhatsApp via QR/join flow.
4. Identify Account SID without sharing secret publicly.
5. Locate Auth Token without putting it in chat/docs.
6. Configure local/Vercel Test secrets.
7. Configure hosted inbound webhook.
8. Configure status callback.
9. Send first controlled inbound WhatsApp.
10. Verify signature in TRP.
11. Persist first inbound message.
12. Send first controlled outbound reply.
13. Receive Twilio status callbacks.
14. Add at least one controlled staff recipient.
15. Test a controlled staff alert.
```

F.1 does not execute those steps.

## Explicit Non-Goals For F.1

F.1 does not:

```text
- install twilio npm package
- change package.json
- change Prisma schema
- add migration
- create API routes
- create webhook routes
- create WhatsApp UI
- buy phone number
- register WhatsApp sender
- create WABA
- create Meta Business Portfolio
- submit templates
- configure Twilio secrets
- configure Zoho webhook
- alter DNS
- send WhatsApp
- send email
- mutate DB
- activate cron
- edit vercel.json
- start F.2
- start Final-G/H
- start Phase 13
```

## Acceptance Matrix

| # | Criterion | F.1 result |
|---|---|---|
| 1 | Final-E remains completed/accepted. | Yes. |
| 2 | Final-F officially activated only at strategy level. | Yes. |
| 3 | F.1 is docs-only. | Yes. |
| 4 | F.2-F.8 split frozen. | Yes. |
| 5 | Owner-new-to-Twilio onboarding requirement explicit. | Yes. |
| 6 | New Twilio-purchased company-number decision explicit. | Yes. |
| 7 | Actual number purchase deferred. | Yes. |
| 8 | No +502/inventory assumption. | Yes. |
| 9 | Sandbox is Test boundary. | Yes. |
| 10 | Sandbox limitations explicit. | Yes. |
| 11 | 24h service window explicit. | Yes. |
| 12 | Template boundary explicit. | Yes. |
| 13 | Seven staff alerts frozen. | Yes. |
| 14 | Reservation-confirmed trigger tied to paid confirmation. | Yes. |
| 15 | Cancellation trigger tied to committed cancellation. | Yes. |
| 16 | Check-in -48h canonical timestamp frozen. | Yes. |
| 17 | Check-out -6h canonical timestamp frozen. | Yes. |
| 18 | America/Guatemala timezone explicit. | Yes. |
| 19 | Stale date-change reminder protection explicit. | Yes. |
| 20 | Review-submitted alert additive to Final-E. | Yes. |
| 21 | Guest-WhatsApp-received alert frozen. | Yes. |
| 22 | Zoho guest-email alert frozen. | Yes. |
| 23 | Zoho remains mailbox owner. | Yes. |
| 24 | No email body persistence. | Yes. |
| 25 | Zoho Limited Data/messageId ambiguity explicitly deferred to provider probe. | Yes. |
| 26 | No unsafe hash-based fake email idempotency. | Yes. |
| 27 | Zoho webhook HMAC contract documented. | Yes. |
| 28 | Twilio official SDK signature validation required. | Yes. |
| 29 | Staff recipient E.164/opt-in/preferences frozen. | Yes. |
| 30 | Staff numbers checked before guest matching. | Yes. |
| 31 | Unknown guest numbers may create unlinked conversations. | Yes. |
| 32 | Ambiguous reservation matching fails safe. | Yes. |
| 33 | Canonical admin inbox route chosen. | Yes: `/admin/whatsapp`. |
| 34 | WhatsApp body persistence privacy boundary defined. | Yes. |
| 35 | Conservative media scope defined. | Yes. |
| 36 | Durable-intent / post-commit send pattern frozen. | Yes. |
| 37 | Twilio failure cannot rollback business state. | Yes. |
| 38 | Retry processor separated from email processor. | Yes. |
| 39 | Reminder scheduler separated from physical delivery. | Yes. |
| 40 | No provider credentials in DB/client/logs. | Yes. |
| 41 | No runtime/schema/dependency changes. | Yes. |
| 42 | Final-G/H remain Not started. | Yes. |
| 43 | Phase 13 remains Not started. | Yes. |

## Official Provider-Reference Inventory

Checked against official documentation on 2026-09-21:

Twilio:

```text
- WhatsApp Business Platform with Twilio:
  https://www.twilio.com/docs/whatsapp/api
- Test WhatsApp messaging with the Sandbox:
  https://www.twilio.com/docs/whatsapp/sandbox
- Quickstart: Send and receive WhatsApp messages:
  https://www.twilio.com/docs/whatsapp/quickstart
- Key Concepts and Terms for WhatsApp Business Platform:
  https://www.twilio.com/docs/whatsapp/key-concepts
- Register WhatsApp senders using Self Sign-up:
  https://www.twilio.com/docs/whatsapp/self-sign-up
- Send WhatsApp notification messages with templates:
  https://www.twilio.com/docs/whatsapp/tutorial/send-whatsapp-notification-messages-templates
- Twilio webhook security / request validation:
  https://www.twilio.com/docs/usage/webhooks/webhooks-security
- Message status callbacks:
  https://www.twilio.com/docs/messaging/guides/outbound-message-status-in-status-callbacks
- Phone-number regulatory/availability guidance:
  https://www.twilio.com/docs/phone-numbers/regulatory/getting-started
```

Zoho:

```text
- Zoho Mail Developer Space:
  https://www.zoho.com/mail/help/developer-space.html
- Configure webhooks to integrate external applications:
  https://www.zoho.com/mail/help/dev-platform/webhook.html
- Zoho Mail Email Messages API:
  https://www.zoho.com/mail/help/api/email-api.html
- Zoho Mail REST APIs Getting Started / Message ID:
  https://www.zoho.com/mail/help/api/getting-started-with-api.html
- Zoho Mail Get Email Content / messageId URL contract:
  https://www.zoho.com/mail/help/api/get-email-content.html
```
