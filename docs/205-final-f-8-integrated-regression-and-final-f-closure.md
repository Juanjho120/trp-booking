# 205 — Final-F.8: Integrated regression and Final-F closure

## Record

```text
Project: TRP Booking
Track: Post-Phase-12 / Pre-Phase-13 Final Improvement Track
Package: Final-F — Public WhatsApp Contact and Admin Notifications
Subphase: Final-F.8 — Android PWA/Web Push integrated regression, public WhatsApp contact acceptance and Final-F documentation closure
Status: Implementation completed; Hosted integrated regression + explicit owner acceptance pending
Document date: 2026-09-28
Implementation base head: c5a41d8a01b7772f7a75c7c0ae382e3df92ff13e
Implementation/regression preparation head: this commit; SHA reported after push
Final-F.R3 accepted architecture head: be80af9b36f285c7669986e9c9b4d6676042f6f0
Final-F.R4 accepted implementation/validation head: ae0db63efdabfa3bc952a8a2a71220de231ebc18
Final-F.R5 accepted implementation/hardening/validation head: 88616acf46645ccc01cc475f20a868d7c18dbadf
Final-F.6 accepted implementation/hardening/visual-validation head: 13e9249f54899de0863cdd6ab8747337319df3e5
Final-F.7 accepted feature head: 3d32a5f2320f81ef08387f82cdf9157202c8cf95
Permanent Final-F validation command: npm run final-f:validate
Runtime feature expansion: none
No schema changes
No migration changes
No dependency changes
No Production resources
vercel.json remains {"crons":[]}
Final-G: Not started
Final-H: Not started
Phase 13: Not started
```

Final-F.8 is a regression and closure-preparation subphase. It does not reopen Final-F.7, does not
change the accepted Final-F.7 feature head, and does not mark Final-F.8 or the Final-F package as
accepted before Hosted integrated regression and explicit owner acceptance.

## Implementation Summary

Final-F.8 adds the permanent package gate:

```text
npm run final-f:validate
```

The command runs the deterministic Final-F suite:

```text
tsx --tsconfig tests/final-f/tsconfig.json tests/final-f/run.ts
```

The suite remains non-destructive and does not perform real Supabase writes, real Web Push provider
calls, real Zoho webhook calls, WhatsApp provider calls, Production credential access, Production
resource provisioning, or Vercel cron execution.

A focused integrated F.8 regression test was added to assert the final accepted architecture as one
package instead of duplicating every lower-level R4/R5/F.6/F.7 assertion.

## Integrated Automated Coverage

The Final-F integrated closure coverage asserts:

```text
- Public WhatsApp remains a public-only wa.me path using NEXT_PUBLIC_WHATSAPP_PHONE_E164.
- ES/EN initial WhatsApp messages remain localized.
- Admin surfaces do not render the public floating WhatsApp action.
- /admin/whatsapp and backend WhatsApp provider routes remain absent.
- Android Admin PWA manifest, service worker registration, /admin/notifications start URL, and ADMIN-only push APIs remain in place.
- Notification permission remains behind an explicit ADMIN action.
- Service worker behavior remains bounded to push and notificationclick, with no fetch cache, offline admin mode, IndexedDB, or background sync expansion.
- iOS/iPadOS remain Deferred.
- The accepted AdminNotificationType set is exactly RESERVATION_CONFIRMED, RESERVATION_CANCELLED, CHECK_IN_MINUS_48H, CHECK_OUT_MINUS_6H, REVIEW_SUBMITTED, and GUEST_EMAIL_RECEIVED.
- GUEST_WHATSAPP_RECEIVED remains absent/inactive.
- Reservation-linked ADMIN push titles keep the accepted event type · guestName · property shape.
- Push content excludes guest phone, review comments, payment/refund data, tokens, provider IDs/secrets, subscription keys, and VAPID private key material.
- Immediate best-effort Web Push remains post-commit, while cron processing remains fallback/recovery only.
- Zoho Limited Data messageId remains accepted and ignored.
- Zoho Mail handoff remains the stable web URL https://mail.zoho.com/ with bounded sender-address clipboard copy.
```

## Hosted Acceptance Matrix

Do not mark Final-F.8 or Final-F accepted until the owner completes the Hosted matrix below.

### Public WhatsApp regression

```text
[ ] Public landing floating WhatsApp button is visible.
[ ] Public contact/WhatsApp action is visible.
[ ] ES link opens the correct WhatsApp Business destination with ES initial text.
[ ] EN link opens the correct WhatsApp Business destination with EN initial text.
[ ] Admin pages do not show the floating public WhatsApp action.
[ ] /admin/whatsapp remains unavailable.
```

### Android TRP Admin regression

```text
[ ] PWA remains installed/launchable.
[ ] Google OAuth ADMIN login works.
[ ] /admin/notifications opens.
[ ] Default tab behavior remains correct.
[ ] Current device remains registered.
[ ] Web Push permission remains granted.
[ ] Active subscription is shown.
[ ] Controlled test push works.
```

### Operational notification regression

```text
[ ] At least one representative Reservation-linked operational notification reaches Android.
[ ] Lock-screen title includes guestName + property.
[ ] Notification target opens the expected Reservation.
[ ] Notification-center history/unread/read still works.
```

Existing accepted F.6 evidence may be reused for notification classes that are not practical to
regenerate manually unless a new regression is suspected.

### Zoho inbound regression

```text
[ ] External incoming email webhook returns HTTP 200.
[ ] Unmatched email creates GUEST_EMAIL_RECEIVED and targets /admin/notifications.
[ ] Matched email links the expected Reservation.
[ ] Multiple-Reservation relevance ranking remains correct.
[ ] Android Web Push arrives without manual cron.
[ ] Notification history contains bounded email metadata only.
[ ] Abrir Zoho Mail opens the stable web destination.
[ ] No email body/html/attachment/header data is persisted.
```

## Final-F Boundaries Preserved

Final-F.8 does not add or restore:

```text
- Production resources
- WhatsApp backend/provider
- /admin/whatsapp
- STAFF role
- native Android application
- Firebase/FCM/OneSignal/Pusher
- iOS/iPadOS acceptance
- offline Admin mode
- mailbox sync
- Zoho OAuth/IMAP/SMTP
- Vercel scheduler registration
- schema changes
- migrations
```

Final-F.7 remains completed and accepted at
`3d32a5f2320f81ef08387f82cdf9157202c8cf95`. The accepted feature head is not changed by this
F.8 preparation.

## Validation Ledger

```text
npm run final-f:validate — PASS 125/125 after sandbox-only uv_os_get_passwd ENOMEM retry outside sandbox
npm run final-d:validate — PASS 66/66
npm run final-e:validate — PASS 88/88
npm run final-a:validate — PASS 44/44
npm run final-b:validate — PASS 38/38
npm run final-c:validate — PASS 41/41
npm run env:validate — PASS; environment variables are valid
npm run db:validate — PASS; Prisma schema is valid
npm run db:generate — PASS; Prisma Client generated
npm run db:migrate:status — PASS outside sandbox; sandbox attempt failed with schema engine error while reaching Supabase; outside-sandbox result: 29 migrations found, database schema up to date
npm run lint — PASS
npm run build — PASS outside sandbox; sandbox attempt failed only because Google Fonts fetch was blocked by restricted network
git diff --check — PASS
```

Automated Final-F regression count: 125/125.

## Next State

```text
Final-F.7 — Completed and accepted on 2026-09-28 at 3d32a5f2320f81ef08387f82cdf9157202c8cf95
Final-F.8 — Implementation completed; Hosted integrated regression + explicit owner acceptance pending
Final-F package — Not yet accepted as complete
Final-G — Not started
Final-H — Not started
Phase 13 — Not started
```
