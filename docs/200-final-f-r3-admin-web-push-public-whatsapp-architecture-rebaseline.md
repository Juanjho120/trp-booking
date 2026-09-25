# 200 — Final-F.R3: Admin Web Push + Public WhatsApp Architecture Rebaseline

## Record

```text
Project: TRP Booking
Track: Post-Phase-12 / Pre-Phase-13 Final Improvement Track
Package: Final-F — Public WhatsApp Contact and Admin Notifications
Subphase: Final-F.R3 — Admin Web Push + public WhatsApp architecture rebaseline
Status: Completed and accepted on 2026-09-24
Document date: 2026-09-24
Architecture rebaseline starting head: 26e197c851e6305b848eb9da76ae1a89912500c5
Accepted documentation/architecture head: be80af9b36f285c7669986e9c9b4d6676042f6f0
Runtime changes: none
Schema changes: none
Migration changes: none
Dependency changes: none
Owner acceptance: Completed on 2026-09-24
Final-F.R4: Completed and accepted on 2026-09-25 at ae0db63efdabfa3bc952a8a2a71220de231ebc18
Final-F.R5: Completed and accepted on 2026-09-25 at 88616acf46645ccc01cc475f20a868d7c18dbadf
Final-F.6: Implementation completed; Hosted Test operational Web Push validation and explicit owner acceptance pending
Final-F.7: Not started
Final-F.8: Not started
Final-G/H: Not started
Phase 13: Not started
```

This document records the owner's accepted Final-F architecture decision. It is documentation-only
and does not implement the future runtime cleanup, public floating WhatsApp contact, PWA surface,
Web Push, schema changes, provider removal, or notification center.

As of the owner's explicit 2026-09-24 acceptance, this document is the current authoritative
Final-F architecture contract for the decisions revised by R3.

## R4 Continuation Note

Final-F.R4 has since completed and accepted the R3-directed backend WhatsApp/provider decommission
and public WhatsApp contact scope on 2026-09-25 at
`ae0db63efdabfa3bc952a8a2a71220de231ebc18`. Local/Test cleanup migration is applied. The accepted
R4 implementation/validation record is:

```text
docs/201-final-f-r4-whatsapp-backend-decommission-and-public-whatsapp-contact.md
```

## Owner Acceptance

Final-F.R3 was completed and accepted by the owner on 2026-09-24.

```text
Accepted documentation/architecture head: be80af9b36f285c7669986e9c9b4d6676042f6f0
Vercel for accepted head: SUCCESS
```

The owner accepted the rebaseline to public human WhatsApp Business App contact for guests,
Android Admin Web Push as an additional ADMIN notification channel beside existing admin email,
ADMIN-only authorization, Android/current-Chromium PWA acceptance, iOS/iPadOS Deferred treatment,
standard Web Push + VAPID direction, shared email/push target resolution, the six ADMIN
notification classes, privacy-bounded lock-screen copy, durable delivery semantics, and the
revised Final-F sequence with Final-F.R4 as the next implementation step. R4 has since been
completed and accepted on 2026-09-25; Final-F.R5 has since been completed and accepted on
2026-09-25 at `88616acf46645ccc01cc475f20a868d7c18dbadf` after Vercel SUCCESS and owner
Hosted Android Test acceptance.

## Owner Decision

The owner explicitly rebaselined Final-F away from backend WhatsApp provider integration:

```text
- abandon WhatsApp API as a TRP backend target
- abandon Twilio WhatsApp, 360dialog, Gupshup, Meta Cloud API, and Coexistence as target providers
- use WhatsApp Business App directly as the human guest-facing communication channel
- add a public floating WhatsApp button that opens the official number through a wa.me / compatible deep link
- replace former automatic WhatsApp alert targets with Android Admin Web Push for ADMIN operational notifications
- keep only ADMIN users; do not introduce STAFF
- keep existing admin email notifications in parallel with Web Push
- add a protected notification center at /admin/notifications
- validate only Android + current Chromium-based browser for Final-F mobile/PWA acceptance
- defer iOS/iPadOS outside current Final-F acceptance
```

## Historical Treatment

Final-F.R1 remains historically completed and accepted on 2026-09-23 at:

```text
4c94db87ebd9df225944ce76c78f98462e4755d1
```

R1 accepted the 360dialog + Meta Coexistence architecture at the time. R3 supersedes that target
architecture but does not rewrite the fact that R1 was accepted.

Final-F.R2 was implemented at:

```text
4e5d7dee3444dfbb427468a1c2ebbf6a94b70e5c
```

and hardened at:

```text
26e197c851e6305b848eb9da76ae1a89912500c5
```

R2 did not receive owner acceptance. Its official status is:

```text
Implementation completed but superseded before owner acceptance by Final-F.R3 architecture rebaseline.
```

The old planned R3/R4 360dialog migration scope never started and is replaced by the sequence below.
Historical records `docs/193` through `docs/199` remain accurate records of accepted or implemented
work that occurred.

## Documentation Authority

`docs/160-post-phase-12-pre-phase-13-final-improvement-track.md` remains the authoritative roadmap
for the full Final Improvement Track.

This record is the accepted Final-F.R3 architecture rebaseline record. It prevails for R3-revised
decisions over the earlier R1/R2 future target guidance in:

```text
docs/198-final-f-architecture-revision-360dialog-coexistence.md
docs/199-final-f-r2-360dialog-provider-foundation-and-developer-test-coexistence-onboarding.md
```

## Guest-Facing Architecture

The new guest communication architecture is:

```text
TRP public website
-> floating WhatsApp button
-> official WhatsApp Business App number
-> human guest/admin conversation
```

Final-F no longer targets backend WhatsApp processing:

```text
- no backend WhatsApp provider
- no WhatsApp webhook
- no guest conversation persistence
- no phone-to-Reservation matching
- no /admin/whatsapp target surface
- no replies from TRP
- no service-window logic
- no WhatsApp provider status tracking
```

The Test/Developer number and future Production number may differ. The guest-facing number is public
and is not a secret. The future public floating action must use `wa.me` or a WhatsApp-compatible
deep link with localized ES/EN initial text.

## Admin Notification Architecture

The new admin notification architecture is:

```text
TRP business event
-> durable AdminNotification
-> commit
-> email admin + Web Push admin
```

Existing admin email notifications remain in place. Web Push is an additional ADMIN channel, not a
replacement for email. The same current administrators receive both channels.

Final-F.R3 does not add `STAFF`, does not change `UserRole`, and does not introduce a second admin
identity model. Future implementation must reuse:

```text
- Auth.js / Google OAuth
- ADMIN_ROLE
- AUTH_ALLOWED_ADMIN_EMAILS
- User
- getAdminSessionActor()
- resolveAdminActor()
- resolveAdminNotificationRouting() / EMAIL_ADMIN_RECIPIENTS
```

## Notification Target Contract

Email and Push must not calculate destinations independently. Future implementation must introduce
or use a shared resolver equivalent to:

```text
resolveAdminNotificationTarget(...)
```

Reservation events target:

```text
/admin/reservations/{reservationId}
```

Review submitted targets:

```text
/admin/reviews
```

`GUEST_EMAIL_RECEIVED` receives its exact target during Final-F.7 according to the accepted
Zoho/admin-email contract. When an existing admin email has a CTA/link, Push must reuse the same
destination resolver.

## Android-Only PWA Scope

Final-F mobile/PWA acceptance targets only:

```text
Android + current Chromium-based browser
```

The PWA is added to the existing TRP Booking web app. It is not a separate app and not a mobile
rewrite. The future installed experience starts at:

```text
/admin/notifications
```

Initial PWA/Web Push scope:

```text
- web manifest
- Android app icons
- service worker
- Web Push
- notification click handling
- /admin/notifications
- installation guidance
- enable notifications for current device
- disable notifications for current device
```

iOS/iPadOS are explicitly deferred and are not implemented or acceptance-tested in current Final-F.
Do not promise iOS support in Final-F.

## PWA Non-Goals

The PWA does not introduce:

```text
- a native mobile app
- a separate PWA login
- offline admin data
- background sync requirement
- sensitive admin-data cache
- broad mobile UI rewrite
- complex notification workflow/inbox
```

## Authentication And Authorization

The same Google OAuth/Auth.js admin session protects `/admin/notifications`. Only `ADMIN` can:

```text
- open the notification center
- register a PushSubscription
- revoke a PushSubscription
- receive Admin Web Push
```

A subscription belongs to:

```text
User ADMIN + browser/device
```

One admin may register multiple devices.

## Future Persistence Direction

Exact schema belongs to future implementation subphases. The conceptual model is:

```text
AdminPushSubscription:
id, userId, endpoint unique, p256dh, auth, active, createdAt, updatedAt, lastUsedAt, revokedAt

AdminNotification:
id, type, reservationId nullable, reviewId nullable, deduplicationKey unique, title, body,
targetPath, createdAt

AdminNotificationRead:
notificationId, userId, readAt

AdminPushDelivery:
notificationId, subscriptionId, status, attemptCount, lastAttemptAt, nextAttemptAt,
processingStartedAt, errorCode, errorMessage, createdAt, updatedAt
```

Push subscription endpoints and keys are protected server/database data. They must never be logged
or exposed beyond the authenticated subscribing browser.

## Web Push Provider Contract

Future implementation targets the standard Web Push protocol with VAPID:

```text
WEB_PUSH_VAPID_PUBLIC_KEY
WEB_PUSH_VAPID_PRIVATE_KEY
WEB_PUSH_SUBJECT
```

No Firebase project is required by the accepted architecture. No Twilio, Meta, 360dialog, or Gupshup
provider is part of the R3 target. A small server-side library such as `web-push` may be introduced
later if appropriate.

## Permission Contract

Notification permission must be requested only from an explicit ADMIN gesture:

```text
Activar notificaciones
```

Do not prompt automatically on page load or login. Subscription creation happens only after
authenticated ADMIN consent.

## Push Privacy

Lock-screen notification content must remain bounded. Do not include by default:

```text
- full guest email
- guest phone
- payment amounts
- sensitive payment/refund information
- full review comment
- tokens
- private URLs
```

Preferred push copy shape:

```text
event type + safe property/context + "Toca para ver detalles"
```

Full operational details remain behind Admin authentication.

## Active Notification Classes

Final-F targets exactly six ADMIN operational notification classes:

```text
RESERVATION_CONFIRMED
RESERVATION_CANCELLED
CHECK_IN_MINUS_48H
CHECK_OUT_MINUS_6H
REVIEW_SUBMITTED
GUEST_EMAIL_RECEIVED
```

They are Admin Web Push events, not backend WhatsApp alert events. `GUEST_WHATSAPP_RECEIVED` remains
permanently removed/inactive because guest WhatsApp communication is outside the TRP backend.

## Delivery Semantics

Future Web Push delivery follows the durable-intent pattern:

```text
business event
-> create/reuse AdminNotification
-> COMMIT
-> immediate best-effort Web Push
-> retry metadata persists for retryable failure
```

Push failure must never roll back Reservation, Review, cancellation, email ingestion, or any other
source business state. Invalid or expired PushSubscriptions must be safely deactivated.

## Notification Center

Future `/admin/notifications` initial scope:

```text
- latest notifications
- unread/read state
- mark read
- open target
- install guidance
- current device push status
- enable notifications
- disable current device
```

No complex inbox/workflow and no offline requirement are included in current Final-F.

## Revised Final-F Sequence

```text
Final-F.R3 —
Architecture rebaseline: Public WhatsApp Business App + Android Admin Web Push
— documentation-only
— completed and accepted on 2026-09-24
— accepted documentation/architecture head be80af9b36f285c7669986e9c9b4d6676042f6f0

Final-F.R4 —
WhatsApp backend/provider decommission
- remove /admin/whatsapp
- provider/schema cleanup
- public floating WhatsApp contact
— completed and accepted on 2026-09-25 at ae0db63efdabfa3bc952a8a2a71220de231ebc18

Final-F.R5 —
Android Admin PWA/Web Push foundation
- manifest/service worker/VAPID
- AdminPushSubscription
- /admin/notifications
- controlled Android Test push
— completed and accepted on 2026-09-25 at 88616acf46645ccc01cc475f20a868d7c18dbadf

Final-F.6 —
Admin Web Push operational notifications for:
RESERVATION_CONFIRMED
RESERVATION_CANCELLED
CHECK_IN_MINUS_48H
CHECK_OUT_MINUS_6H
REVIEW_SUBMITTED
- durable AdminNotification delivery/retry
- reminder scheduling
— Implementation completed; Hosted Test operational Web Push validation and explicit owner acceptance pending

Final-F.7 —
Zoho incoming-email bounded metadata
- GUEST_EMAIL_RECEIVED Admin Web Push
— Not started

Final-F.8 —
Android PWA/Web Push integrated regression
- public WhatsApp contact acceptance
- Final-F documentation closure
— Not started

Final-G Performance Audit —
unchanged / Not started

Final-H Integrated Regression —
unchanged in status; the active checklist is reconciled in `docs/160` from the superseded
provider/API checklist to the accepted public-WhatsApp + Android-push contract

Phase 13 —
Not started
```

## R4 Future Cleanup Contract

Do not execute cleanup in R3. R4 is expected to remove or decommission:

```text
- twilio npm dependency
- lib/twilio/**
- /api/twilio/**
- Twilio scripts/envs
- lib/360dialog/**
- /api/360dialog/**
- D360 scripts/envs
- /admin/whatsapp
- guest WhatsApp admin UI
- Twilio/360dialog Final-F runtime tests
- WhatsAppConversation
- WhatsAppMessage
- StaffWhatsAppRecipient
- StaffWhatsAppAlert
- provider-specific unused enums/constraints
```

Historical migration files remain immutable. If schema removal is accepted, R4 must add a new
cleanup migration instead of deleting old migrations. Phase 13 has not started, so there is no
Production destructive operation. Test data cleanup must still be documented.

## Existing Behavior To Preserve

R3 and future implementation must preserve:

```text
- Auth.js
- ADMIN-only authorization
- email system
- existing admin email notifications
- admin-email durable intents/retries
- Reservation/Review source-of-truth behavior
- Final-D and Final-E permanent regression gates
- Test vercel.json with zero cron registrations
- existing public/admin design system
```

## Explicit Non-Goals For R3

R3 does not implement:

```text
- runtime behavior
- Prisma schema changes
- migrations
- dependency changes
- Twilio/360dialog removal
- public floating WhatsApp contact
- PWA manifest/service worker
- Web Push
- /admin/notifications
- notification-center UI
- Android validation
- any future Final-F subphase work, Final-G, Final-H, or Phase 13
```
