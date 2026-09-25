# 202 — Final-F.R5: Android Admin PWA Web Push Foundation

## Record

```text
Project: TRP Booking
Track: Post-Phase-12 / Pre-Phase-13 Final Improvement Track
Package: Final-F — Public WhatsApp Contact and Admin Notifications
Subphase: Final-F.R5 — Android Admin PWA/Web Push foundation
Status: Completed and accepted on 2026-09-25
Document date: 2026-09-25
Implementation base head: 126f807e9159b52fe44e374e33f2755186a649c7
Implementation head: f35354a775e8d744945d896da4e3c7f4787aed8e
Accepted implementation/hardening/validation head: 88616acf46645ccc01cc475f20a868d7c18dbadf
Accepted architecture base: Final-F.R3 at be80af9b36f285c7669986e9c9b4d6676042f6f0
Previous accepted subphase: Final-F.R4 completed and accepted on 2026-09-25 at ae0db63efdabfa3bc952a8a2a71220de231ebc18
Migration: 20260925170000_final_f_r5_admin_push_subscription
Migration application: Applied to developer-owned Local/Test database on 2026-09-25
Owner acceptance: Completed on 2026-09-25
Hosted Test: Completed and accepted
Vercel for accepted head: SUCCESS
Final-F.R5 acceptance: Completed
Final-F.6: Implementation completed; Hosted Test operational Web Push validation and explicit owner acceptance pending
Final-F.7: Next / Not started
Final-F.8: Not started
Final-G/H: Not started
Phase 13: Not started
```

This record implements only the R5 device/PWA/Web Push foundation. It does not create durable
`AdminNotification`, `AdminNotificationRead`, or `AdminPushDelivery` records, does not add business
event push triggers, does not add notification history/read state, does not add Zoho ingestion, and
does not start Final-F.6.

## Implemented Scope

```text
- app/manifest.ts using MetadataRoute.Manifest
- installed Admin PWA contract: TRP Admin, start_url /admin/notifications, scope /admin/, display standalone
- existing /brand/favicon-192.png and /brand/favicon-512.png reused as icons
- public/sw.js with only push and notificationclick handlers
- no service-worker fetch listener, offline caching, background sync, periodic sync, precache, CacheStorage, IndexedDB admin-data persistence, or localStorage persistence
- /sw.js served as application/javascript with no-cache/no-store headers
- web-push dependency and @types/web-push dev dependency
- optional WEB_PUSH_VAPID_PUBLIC_KEY, WEB_PUSH_VAPID_PRIVATE_KEY, WEB_PUSH_SUBJECT server-side env contract
- getWebPushEnv(): all absent disables safely, all valid enables, partial configuration fails closed
- AdminPushSubscription Prisma model and migration
- authenticated ADMIN config, status, register, revoke, and controlled test-push APIs
- /admin/notifications protected Admin page
- Admin navigation Notificaciones / Notifications item
- explicit user-gesture-only Notification.requestPermission flow
- current-device disable flow: backend revoke before browser unsubscribe
- controlled test notification with fixed ES/EN copy and /admin/notifications target
- 404/410 push-service responses deactivate the subscription
```

## Manifest Contract

```text
name: TRP Admin
short_name: TRP Admin
start_url: /admin/notifications
scope: /admin/
display: standalone
icons: /brand/favicon-192.png, /brand/favicon-512.png
maskable: not declared
```

The PWA remains the existing TRP Booking app under the same origin. R5 does not create a second app,
does not add public install UI, and does not add iOS/iPadOS-specific behavior.

## Web Push Environment

Accepted R5 env names:

```text
WEB_PUSH_VAPID_PUBLIC_KEY
WEB_PUSH_VAPID_PRIVATE_KEY
WEB_PUSH_SUBJECT
```

Rules:

```text
all three absent -> Web Push unavailable/disabled safely
all three valid -> Web Push enabled
partial/inconsistent configuration -> configuration error
WEB_PUSH_SUBJECT -> mailto:<valid email> or https://<valid public URL>
WEB_PUSH_VAPID_PRIVATE_KEY -> server-side secret only
```

Developer/Test uses developer-owned VAPID key material. Future Production belongs to Phase 13 and
must use company-owned key material. Once an environment has real subscriptions, the VAPID keypair
must not be rotated casually because browser subscriptions are tied to the application server key.

Owner setup command:

```text
npx web-push generate-vapid-keys
```

The private VAPID key must never be committed, pasted into docs, logged, placed in browser code, or
included in final reports.

## Persistence

R5 adds only:

```text
AdminPushSubscription
- id
- userId
- endpoint UNIQUE
- p256dhKey
- authKey
- active
- createdAt
- updatedAt
- lastUsedAt nullable
- revokedAt nullable
```

The relation is `User -> adminPushSubscriptions`. Endpoint and key material are capability/security
data and are not copied to `AdminAuditLog`, list DTOs, browser-visible text, URLs, query strings, or
logs.

R5 intentionally does not add:

```text
AdminNotification
AdminNotificationRead
AdminPushDelivery
```

Those belong to Final-F.6.

## API Contract

R5 adds:

```text
GET /api/admin/push/config
POST /api/admin/push/subscriptions
DELETE /api/admin/push/subscriptions
POST /api/admin/push/subscriptions/status
POST /api/admin/push/test
```

All routes are `runtime=nodejs`, `dynamic=force-dynamic`, ADMIN-authenticated, and no-store through
the shared admin API response helper. Mutation-style routes enforce same-origin admin mutation
checks and strict request schemas.

Register semantics:

```text
- ADMIN authenticated
- same-origin mutation
- endpoint must be HTTPS
- p256dh/auth must be present and bounded
- same-user re-register updates keys, active=true, revokedAt=null, lastUsedAt=now
- other-user endpoint conflict fails closed with ADMIN_PUSH_SUBSCRIPTION_OWNERSHIP_CONFLICT
```

Revoke semantics:

```text
- only endpoint + current ADMIN user can be revoked
- active=false
- revokedAt=now
- no hard delete
- already missing/inactive current-device state is safe/idempotent
```

Controlled test push:

```text
title: TRP Admin
ES body: Las notificaciones de este dispositivo están funcionando.
EN body: Notifications are working on this device.
targetPath: /admin/notifications
```

The browser cannot submit arbitrary notification title/body/target copy. 404/410 push-service
responses deactivate the subscription and return a safe error. R5 does not persist delivery history
or retries.

Independent review hardening corrected expired browser PushSubscription recovery: after a controlled
test push receives `ADMIN_PUSH_SUBSCRIPTION_EXPIRED`, the backend-deactivated subscription can now
be followed by local browser `unsubscribe()` and clean re-subscription without reactivating the same
expired endpoint in a loop. Manual current-device disable also remains available when the browser
still has a subscription but the server registration is inactive.

## `/admin/notifications`

The protected R5 page shows only current-device/PWA foundation state:

```text
- browser Web Push support
- server Web Push configuration status
- Notification.permission
- service worker state
- current browser subscription state
- server registration state
- browser vs standalone display mode
- Android Chromium installation guidance
- enable notifications
- disable current device
- send controlled test notification
```

Notification permission is requested only inside the explicit authenticated ADMIN action
`Activar notificaciones` / `Enable notifications`. It is not requested during page load, hydration,
login, or service-worker registration.

## Boundaries Preserved

```text
- no Final-F.6 work
- no AdminNotification/AdminNotificationRead/AdminPushDelivery
- no reservation/review/reminder business-event push triggers
- no Zoho webhook or GUEST_EMAIL_RECEIVED
- no notification history/read-unread persistence
- no retry/durable delivery queue
- no offline Admin mode
- no service-worker fetch handler
- no sensitive admin-data cache
- no Firebase/FCM/OneSignal/Pusher/Twilio/Meta/BSP dependency
- no public PWA install UI
- no iOS/iPadOS acceptance promise
- no Phase 13 or Production setup
- vercel.json remains {"crons":[]}
```

## Validation Ledger

Executed for the R5 implementation:

```text
git status --short --branch — PASS; starting branch main at 126f807e9159b52fe44e374e33f2755186a649c7
npm install web-push — PASS after elevated rerun; web-push 3.6.7
npm install --save-dev @types/web-push — PASS; @types/web-push 3.6.4
npm run db:format — PASS
npm run db:generate — PASS
npx tsx --tsconfig tests/final-f/tsconfig.json tests/final-f/run.ts — PASS after elevated rerun; Final-F targeted validation 57/57
npm run db:validate — PASS
npm run env:validate — PASS after elevated rerun; first sandbox run failed only with uv_os_get_passwd ENOMEM
npm run db:migrate:status — PASS after applying R5; Database schema is up to date with 27 migrations
npm run db:migrate:deploy — PASS; applied 20260925170000_final_f_r5_admin_push_subscription to developer-owned Local/Test database
npm run final-d:validate — PASS; 66/66
npm run final-e:validate — PASS; 88/88
npm run lint — PASS
npm run build — PASS after elevated rerun; first sandbox run failed only on Google Fonts network fetch, and an intermediate type error was corrected before the passing run
git diff --check — PASS; no whitespace errors
Vercel — SUCCESS for 88616acf46645ccc01cc475f20a868d7c18dbadf
Hosted Android Test — PASS by owner on 2026-09-25
```

`git diff --check` is run at final review time before commit.

## Hosted Test / Owner Acceptance

Final-F.R5 was explicitly accepted by the owner on 2026-09-25 at accepted
implementation/hardening/validation head `88616acf46645ccc01cc475f20a868d7c18dbadf`.
Vercel for the accepted head was SUCCESS.

Owner-validated Hosted Test evidence:

```text
- TRP Admin installed successfully on Android
- installed app opens the protected Admin experience
- /admin/notifications works
- Web Push browser support confirmed
- VAPID configuration works in stable Test
- notification permission granted through explicit user gesture
- Android browser/device PushSubscription created
- current device registered successfully in TRP
- controlled Web Push test notification delivered successfully
- no runtime errors observed
- tapping the test notification opens TRP Admin at /admin/notifications
- disabling the current device succeeds
- browser subscription becomes not subscribed after disable
- TRP server registration becomes not registered after disable
```

iOS/iPadOS remains Deferred and is not part of the R5 acceptance gate.

R5 acceptance does not claim integrated business-event push delivery. Durable operational
notifications, read/unread state, delivery history, retries, and business-event push acceptance
belong to Final-F.6 and Final-F.8.

The accepted installed PWA contract is:

```text
Installed app name: TRP Admin
start_url: /admin/notifications
scope: /admin/
display: standalone
icons: /brand/favicon-192.png and /brand/favicon-512.png
```

No separate frontend or native app was created; the same TRP Booking deployment provides the
installed Admin experience.

The accepted notification-click behavior remains bounded:

```text
Push payload: title, body, targetPath
targetPath: constrained to internal /admin paths
fallback: /admin/notifications
existing same-origin client -> navigate/focus target
otherwise -> openWindow(target)
```

Authentication continues through the existing middleware/Auth.js flow. There is no duplicate PWA
auth system and no arbitrary cross-origin navigation from push payloads.

The owner validated Disable successfully. R5 acceptance does not depend on leaving the current
Android subscription active after that test. Before Hosted Test of Final-F.6, ensure at least one
accepted Android ADMIN device is re-enabled/registered so real operational notifications can be
delivered. Do not claim the device was re-enabled unless independently confirmed.

## Documentation Authority

After R5 acceptance:

```text
docs/160 = authoritative Final Improvement Track roadmap
docs/200 = accepted authoritative Final-F architecture contract
docs/201 = accepted Final-F.R4 implementation/validation record
docs/202 = accepted Final-F.R5 implementation/validation record
```

## Next State

```text
Final-F.R3 — Completed and accepted on 2026-09-24
Final-F.R4 — Completed and accepted on 2026-09-25 at ae0db63efdabfa3bc952a8a2a71220de231ebc18
Final-F.R5 — Completed and accepted on 2026-09-25 at 88616acf46645ccc01cc475f20a868d7c18dbadf
Final-F.6 — Admin Web Push operational notifications — Implementation completed; Hosted Test operational Web Push validation and explicit owner acceptance pending
Final-F.7 — Zoho incoming-email bounded metadata and GUEST_EMAIL_RECEIVED Admin Web Push — Next / Not started
Final-F.8 — Android PWA/Web Push integrated regression, public WhatsApp contact acceptance and Final-F closure — Not started
Final-G/H — Not started
Phase 13 — Not started
```
