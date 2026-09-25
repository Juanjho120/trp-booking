# 203 - Final-F.6: Admin Web Push Operational Notifications

## Record

```text
Project: TRP Booking
Track: Post-Phase-12 / Pre-Phase-13 Final Improvement Track
Package: Final-F - Public WhatsApp Contact and Admin Notifications
Subphase: Final-F.6 - Admin Web Push operational notifications
Status: Completed and accepted on 2026-09-25
Document date: 2026-09-25
Implementation base head: b328d3f3dff6e0fd19303dad225454bc9af4126f
Implementation head: b9b2c8c26fbd3ace06ae67c66684b3d789604c35
Hardening head: d6040a1dde8b94b4fe65494aa8f8be186e647554
Accepted implementation/hardening/visual-validation head: 13e9249f54899de0863cdd6ab8747337319df3e5
Accepted architecture base: Final-F.R3 at be80af9b36f285c7669986e9c9b4d6676042f6f0
Previous accepted subphase: Final-F.R5 completed and accepted on 2026-09-25 at 88616acf46645ccc01cc475f20a868d7c18dbadf
Migration: 20260925190000_final_f_6_admin_operational_notifications
Migration application: Applied to developer-owned Local/Test database on 2026-09-25
Owner acceptance: Completed on 2026-09-25
Hosted Test: Completed and accepted
Visual validation: Completed and accepted
Vercel: SUCCESS
Final-F.7: Implementation completed; Zoho Test webhook onboarding + Hosted inbound-email Web Push validation + owner acceptance pending
Final-F.8: Not started
Final-G/H: Not started
Phase 13: Not started
```

Final-F.6 implements only durable ADMIN operational Web Push notifications on top of the accepted
Final-F.R5 Android Admin PWA/Web Push foundation. It does not implement Zoho ingestion,
`GUEST_EMAIL_RECEIVED`, outbound WhatsApp, staff alerts, offline Admin behavior, Production setup,
or Phase 13.

## Implemented Scope

```text
- AdminNotificationType values:
  RESERVATION_CONFIRMED
  RESERVATION_CANCELLED
  CHECK_IN_MINUS_48H
  CHECK_OUT_MINUS_6H
  REVIEW_SUBMITTED
- AdminNotification durable history records
- AdminNotificationRead per-admin read state
- AdminPushDelivery durable delivery queue
- idempotent deduplication keys for source events and reminders
- active AdminPushSubscription delivery rows created with each new notification
- shared admin target resolver reused by Web Push and existing admin email CTAs
- reservation confirmation hook
- approved reservation cancellation hook
- review submitted hook
- check-in minus 48 hours reminder scheduler
- check-out minus 6 hours reminder scheduler
- protected /admin/notifications history/read UX beside the R5 device controls
- protected mark-read API
- internal cron registry entry and protected scheduled route for push processing
- retry, stale PROCESSING recovery, subscription-expiry handling and delivery-time ADMIN authorization checks
```

The lock-screen payload remains intentionally small:

```text
title: localized event label + property name
body: localized "Tap/Toca para ver details" copy
targetPath: internal Admin path only
```

It does not include guest names, guest emails, guest phone numbers, review comments, payment
amounts, tokens, PushSubscription endpoints, subscription keys, provider bodies, or VAPID private
key material.

`GUEST_EMAIL_RECEIVED` remains reserved for Final-F.7 and is not implemented by F.6.
`GUEST_WHATSAPP_RECEIVED` remains permanently inactive because guest WhatsApp is outside the TRP
backend after the accepted R3/R4 rebaseline.

## Independent Review Hardening

The pre-Hosted-Test hardening pass corrected the following issues without adding schema changes,
migrations, dependencies, Vercel cron registrations, Final-F.7 runtime, or new notification types:

```text
- stale PROCESSING deliveries at the maximum attempt count are terminally recovered instead of remaining stuck;
- mark-read preserves the original per-admin read timestamp;
- F.6 timing, retry, read-state, target, deduplication and provider-classification behavior now has executable behavioral coverage.
```

## Hosted Operational Validation And Visual Acceptance

Hosted operational validation passed and was accepted by the owner on 2026-09-25. The accepted
evidence is:

```text
- Android TRP Admin device active and registered
- operational RESERVATION_CONFIRMED Web Push delivered successfully
- privacy-bounded notification copy displayed correctly
- tapping the notification opened the expected /admin/reservations/{reservationId} target
- notification appeared in /admin/notifications durable history
- unread state displayed correctly
- mark-as-read worked
- read state remained durable after reload
- PROCESS_ADMIN_PUSH_NOTIFICATIONS executed manually from Admin cron jobs
- manual job completed without runtime errors
- no Vercel scheduler was required
- no runtime errors observed
```

The owner accepted the final `/admin/notifications` visual state after the tab refinement:

```text
Tabs:
1. Notificaciones recientes / Recent notifications
2. Configuración / Configuration

Default tab:
fully configured installed device -> Notificaciones recientes
incomplete device setup -> Configuración

Manual selection:
explicit admin tab selection takes precedence over asynchronous device-state refresh

Accepted Configuration order:
1. Instalación Android
2. Dispositivo actual
3. Compatibilidad del navegador
4. Configuración Web Push
5. Permiso del navegador
6. Service worker
7. Suscripción del navegador
8. Registro en TRP
9. Modo de visualización

Removed from active UI:
Alcance operativo
Target aceptado
```

## Persistence

The F.6 migration is:

```text
prisma/migrations/20260925190000_final_f_6_admin_operational_notifications/migration.sql
```

It adds:

```text
AdminNotification
AdminNotificationRead
AdminPushDelivery
AdminNotificationType
AdminPushDeliveryStatus
CronJobKey.PROCESS_ADMIN_PUSH_NOTIFICATIONS
```

It preserves the R5 `AdminPushSubscription` model and uses it as the subscription target for
delivery rows. `AdminNotification` is the durable notification-center source of truth.
`AdminNotificationRead` remains keyed by `(notificationId, userId)`, so one ADMIN reading a
notification does not affect another ADMIN. The original `readAt` timestamp remains stable after
repeated mark-read requests. F.6 does not add `GUEST_EMAIL_RECEIVED`; that remains Final-F.7 scope.

## Accepted Delivery, Retry, Reminder And Target Semantics

Final-F.6 freezes the operational Web Push flow as:

```text
business event
-> durable AdminNotification
-> durable AdminPushDelivery rows
-> COMMIT
-> existing admin email best-effort
-> Web Push best-effort
-> durable retry owns recovery
```

Web Push failure never rolls back reservation confirmation, cancellation, or review submission.

Accepted retry semantics:

```text
max attempts = 5
attempt 1 failure -> +5 minutes
attempt 2 failure -> +15 minutes
attempt 3 failure -> +1 hour
attempt 4 failure -> +6 hours
attempt 5 failure -> terminal

stale PROCESSING attemptCount < 5 -> FAILED, nextAttemptAt = now, retry eligible
stale PROCESSING attemptCount >= 5 -> FAILED, nextAttemptAt = null, terminal max-attempt state

404/410 -> subscription deactivated, delivery SKIPPED, no retry
429/5xx -> retryable
other provider 4xx -> non-retryable failure
```

Accepted reminder semantics:

```text
CHECK_IN_MINUS_48H
CHECK_OUT_MINUS_6H
timezone/business convention: America/Guatemala / UTC-6
due rule: target > now AND target - now <= reminder window
exactly 48h before check-in -> due
after check-in -> not due
exactly 6h before checkout -> due
after checkout -> not due
deduplication includes the stay timing snapshot so legitimate DATE_CHANGE/STAY_EXTENSION timing changes can create a new reminder
```

Accepted target contract:

```text
Email and Push share the same Admin target resolver.
Reservation-related notifications -> /admin/reservations/{reservationId}
Review submitted -> /admin/reviews
Unexpected/non-admin targets -> /admin/notifications
```

Accepted notification-center scope:

```text
/admin/notifications
latest 50 notifications
newest first
per-admin unread/read
mark read
open target
no complex inbox/workflow
```

## Cron Boundary

Final-F.6 registers the internal cron job:

```text
process-admin-push-notifications
```

The protected route is:

```text
/api/cron/process-admin-push-notifications
```

`vercel.json` remains:

```json
{
  "crons": []
}
```

No Vercel scheduler registration is added in this subphase.

Manual execution in Test is accepted through the Admin cron jobs surface. Production scheduler
activation remains Phase 13.

## Boundaries Preserved

```text
- no Final-F.7 work
- no GUEST_EMAIL_RECEIVED
- no Zoho incoming-email ingestion
- no guest email metadata Admin Web Push
- no outbound WhatsApp
- no Twilio, 360dialog, Meta Cloud API, Gupshup or BSP provider reactivation
- no STAFF role
- no manual reservation linking
- no offline Admin cache or service-worker fetch handling
- no Production provider/account/DNS/database activation
- vercel.json remains {"crons":[]}
```

## Validation Ledger

Executed for the F.6 implementation:

```text
git status --short --branch - PASS; starting branch main at b328d3f3dff6e0fd19303dad225454bc9af4126f
git rev-parse HEAD - PASS; b328d3f3dff6e0fd19303dad225454bc9af4126f
npx tsx --tsconfig tests/final-f/tsconfig.json tests/final-f/run.ts - PASS after elevated rerun; Final-F targeted validation 81/81
npm run env:validate - PASS after elevated rerun; first sandbox run failed only with uv_os_get_passwd ENOMEM
npm run db:format - PASS
npm run db:validate - PASS
npm run db:generate - PASS
npm run db:migrate:status - PASS after applying F.6; database schema up to date with 28 migrations
npm run db:migrate:deploy - PASS; applied 20260925190000_final_f_6_admin_operational_notifications to developer-owned Local/Test database
npm run final-d:validate - PASS after elevated rerun; 66/66
npm run final-e:validate - PASS after elevated rerun and F.6 compatibility hardening; 88/88
npm run lint - PASS
npm run build - PASS after elevated rerun; first sandbox run failed only on Google Fonts network fetch
git diff --check - PASS; no whitespace errors
```

The initial `npm run db:migrate:status` run before applying the migration correctly reported
`20260925190000_final_f_6_admin_operational_notifications` as pending in the developer-owned
Local/Test database. After applying it with `npm run db:migrate:deploy`, the post-deploy status
reported the database schema up to date.

Hardening validation refresh:

```text
npx tsx --tsconfig tests/final-f/tsconfig.json tests/final-f/run.ts - PASS after elevated rerun; Final-F targeted validation 81/81
npm run final-d:validate - PASS after elevated rerun; 66/66
npm run final-e:validate - PASS after elevated rerun; 88/88
npm run env:validate - PASS after elevated rerun; environment variables are valid
npm run db:validate - PASS
npm run db:generate - PASS; Prisma Client v6.19.3 generated
npm run db:migrate:status - PASS after elevated rerun; 28 migrations; database schema up to date
npm run lint - PASS
npm run build - PASS after elevated rerun; sandbox run failed on Google Fonts network fetch, and an intermediate type error was corrected before the final passing run
git diff --check - PASS; no whitespace errors
```

Visual-refinement validation refresh:

```text
npx tsx --tsconfig tests/final-f/tsconfig.json tests/final-f/run.ts - PASS after elevated rerun; first sandbox run failed only with uv_os_get_passwd ENOMEM; Final-F targeted validation 86/86
npm run final-d:validate - PASS after elevated rerun; 66/66
npm run final-e:validate - PASS after elevated rerun; 88/88
npm run env:validate - PASS after elevated rerun; environment variables are valid
npm run db:validate - PASS
npm run db:generate - PASS
npm run db:migrate:status - PASS after elevated rerun; 28 migrations; database schema up to date
npm run lint - PASS
npm run build - PASS after elevated rerun
git diff --check - PASS; no whitespace errors
Vercel - SUCCESS
Hosted operational validation - PASS by owner
Final visual validation - PASS by owner
```

## Acceptance State

Final-F.6 is completed and accepted on 2026-09-25. `docs/203` is the accepted Final-F.6
implementation/validation record.

Next subphase:

```text
Final-F.7 - Zoho incoming-email bounded metadata and GUEST_EMAIL_RECEIVED Admin Web Push - Implementation completed; Zoho Test webhook onboarding + Hosted inbound-email Web Push validation + owner acceptance pending
```

## Documentation Authority

```text
docs/160 = authoritative Final Improvement Track roadmap
docs/200 = accepted authoritative Final-F architecture contract
docs/201 = accepted Final-F.R4 implementation/validation record
docs/202 = accepted Final-F.R5 implementation/validation record
docs/203 = accepted Final-F.6 implementation/validation record
```
