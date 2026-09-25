# 203 - Final-F.6: Admin Web Push Operational Notifications

## Record

```text
Project: TRP Booking
Track: Post-Phase-12 / Pre-Phase-13 Final Improvement Track
Package: Final-F - Public WhatsApp Contact and Admin Notifications
Subphase: Final-F.6 - Admin Web Push operational notifications
Status: Implementation completed; Hosted operational validation passed; final visual acceptance and explicit owner acceptance pending
Document date: 2026-09-25
Implementation base head: b328d3f3dff6e0fd19303dad225454bc9af4126f
Accepted architecture base: Final-F.R3 at be80af9b36f285c7669986e9c9b4d6676042f6f0
Previous accepted subphase: Final-F.R5 completed and accepted on 2026-09-25 at 88616acf46645ccc01cc475f20a868d7c18dbadf
Migration: 20260925190000_final_f_6_admin_operational_notifications
Migration application: Applied to developer-owned Local/Test database on 2026-09-25
Owner acceptance: Pending
Hosted Test: Completed successfully by owner on 2026-09-25
Final-F.7: Not started
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

## Independent Review Hardening

The pre-Hosted-Test hardening pass corrected the following issues without adding schema changes,
migrations, dependencies, Vercel cron registrations, Final-F.7 runtime, or new notification types:

```text
- stale PROCESSING deliveries at the maximum attempt count are terminally recovered instead of remaining stuck;
- mark-read preserves the original per-admin read timestamp;
- F.6 timing, retry, read-state, target, deduplication and provider-classification behavior now has executable behavioral coverage.
```

## Hosted Operational Validation And Visual Refinement

Hosted operational validation passed on 2026-09-25. The owner confirmed:

```text
- operational RESERVATION_CONFIRMED push received
- notification target opened correctly
- history rendered
- mark-read persisted correctly
- manual PROCESS_ADMIN_PUSH_NOTIFICATIONS job executed correctly
- no runtime errors observed
```

Before explicit Final-F.6 acceptance, the owner requested a final visual refinement of
`/admin/notifications`: recent notification history and device/Web Push configuration are split
into the accepted `notifications` and `configuration` tabs while preserving the existing backend,
delivery, target, read-state and device-management behavior.

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
delivery rows. It does not add `GUEST_EMAIL_RECEIVED`; that remains Final-F.7 scope.

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
npm run db:migrate:status - PASS after elevated rerun; 28 migrations; database schema up to date
npm run lint - PASS
npm run build - PASS after elevated rerun
git diff --check - PASS; no whitespace errors
```

## Acceptance State

Implementation is completed in the repository, but Final-F.6 is not accepted yet. Hosted
operational Web Push validation passed on 2026-09-25; final visual acceptance and explicit owner
acceptance remain pending.

Next subphase:

```text
Final-F.7 - Zoho incoming-email bounded metadata and GUEST_EMAIL_RECEIVED Admin Web Push - Not started
```
