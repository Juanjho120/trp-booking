# 201 — Final-F.R4: WhatsApp Backend Decommission And Public WhatsApp Contact

## Record

```text
Project: TRP Booking
Track: Post-Phase-12 / Pre-Phase-13 Final Improvement Track
Package: Final-F — Public WhatsApp Contact and Admin Notifications
Subphase: Final-F.R4 — WhatsApp backend/provider decommission, provider/schema cleanup and public floating WhatsApp contact
Status: Completed and accepted on 2026-09-25
Document date: 2026-09-25
Implementation base head: e30acaf3e26d823172316bac4fdd79daf3cbf411
Accepted implementation/validation head: ae0db63efdabfa3bc952a8a2a71220de231ebc18
Accepted architecture base: Final-F.R3 at be80af9b36f285c7669986e9c9b4d6676042f6f0
Cleanup migration: 20260924130000_final_f_r4_remove_whatsapp_backend
Cleanup migration application date: 2026-09-25
Owner acceptance: Completed on 2026-09-25
Hosted Test: Completed and accepted by owner
Vercel for accepted head: SUCCESS
Runtime WhatsApp providers: removed from active TRP backend
Admin WhatsApp inbox: removed from active admin navigation/routes
Public WhatsApp contact: implemented through NEXT_PUBLIC_WHATSAPP_PHONE_E164 and wa.me links
Cron registrations: none; vercel.json remains {"crons":[]}
Final-F.R5: Completed and accepted on 2026-09-25 at 88616acf46645ccc01cc475f20a868d7c18dbadf
Final-F.6: Next / Not started
Final-F.7 through Final-F.8: Not started
Final-G/H: Not started
Phase 13: Not started
```

This record implements only the R4 cleanup and public-contact scope authorized by the accepted
Final-F.R3 architecture rebaseline. It does not start Final-F.R5, does not add Android PWA/Web Push,
does not add `/admin/notifications`, and does not implement `AdminNotification`.

## Owner Acceptance

Final-F.R4 was accepted by the owner on 2026-09-25 at implementation/validation head
`ae0db63efdabfa3bc952a8a2a71220de231ebc18`. Hosted Test and Vercel validation for that head were
completed successfully.

Accepted Hosted Test evidence:

```text
- public floating WhatsApp button visible
- public Contact/WhatsApp link visible
- configured Test WhatsApp Business App number correct
- ES initial message correct
- EN initial message correct
- Android/current Chromium opens WhatsApp correctly
- desktop/web opens the compatible WhatsApp destination correctly
- Admin does not show the public floating action
- /admin/whatsapp is removed
- obsolete Twilio/360dialog backend endpoints are removed
- guest WhatsApp communication remains outside the TRP backend
```

iOS/iPadOS testing remains Deferred and is not part of the accepted R4 evidence.

Accepted R4 outcome:

```text
Guest WhatsApp:
TRP public website
-> public WhatsApp action
-> official WhatsApp Business App number
-> human conversation
```

Accepted backend state:

```text
Twilio WhatsApp runtime: removed
360dialog runtime: removed
WhatsApp backend webhook: removed
WhatsApp provider status callbacks: removed
/admin/whatsapp: removed
Admin WhatsApp APIs: removed
guest WhatsApp conversation persistence: removed
phone-to-Reservation matching: removed
24-hour service-window logic: removed
TRP outbound guest WhatsApp replies: removed
staff WhatsApp alerts: removed
```

## Implemented Scope

Final-F.R4 decommissions the obsolete backend WhatsApp/provider branch and leaves WhatsApp as a
human guest-facing channel through the public website:

```text
- removed active Twilio WhatsApp runtime, webhook routes and probe script
- removed active 360dialog runtime, webhook route and probe script
- removed the protected /admin/whatsapp page, admin WhatsApp API routes, admin WhatsApp helpers and admin WhatsApp DTO type
- removed the Admin sidebar WhatsApp item and centralized Admin WhatsApp page copy
- removed dormant WhatsAppConversation, WhatsAppMessage, StaffWhatsAppRecipient and StaffWhatsAppAlert Prisma models
- removed provider-specific WhatsApp enums that no longer have active runtime scope
- removed the direct npm twilio dependency from package.json/package-lock.json
- created a new cleanup migration instead of editing historical migrations
- added a public NEXT_PUBLIC_WHATSAPP_PHONE_E164 contract and config utility
- added a floating public WhatsApp action with localized ES/EN initial text and wa.me URL generation
- preserved ReservationLifecycleRequestChannel.WHATSAPP as a human lifecycle request channel label
```

Historical Final-F.1 through Final-F.5, R1 and R2 documents and migrations remain immutable audit
records. R4 removes their superseded active runtime target from the current application.

## Database Cleanup

The R4 cleanup migration is:

```text
prisma/migrations/20260924130000_final_f_r4_remove_whatsapp_backend/migration.sql
```

It drops only the superseded backend WhatsApp tables and provider-specific enum types:

```text
WhatsAppConversation
WhatsAppMessage
StaffWhatsAppRecipient
StaffWhatsAppAlert
WhatsAppMessageDirection
WhatsAppMessageStatus
StaffWhatsAppAlertType
StaffWhatsAppAlertStatus

staff_whatsapp_alerts
staff_whatsapp_recipients
whatsapp_messages
whatsapp_conversations
staff_whatsapp_alert_status
staff_whatsapp_alert_type
whatsapp_message_status
whatsapp_message_direction
```

It does not drop or alter Reservations, Reviews, lifecycle request channels, payments, refunds,
email notifications, pricing, calendars, reviews, or any Phase 13/Production resource. Developer/Test
historical WhatsApp evidence is intentionally removed from the active Local/Test schema when this
migration is applied; historical evidence remains in git history, historical docs and historical
migrations. Historical WhatsApp Test data in those removed tables was intentionally discarded. Phase
13 remains Not started and no Production database exists under this track.

Local/Test environment sanity checks confirmed `TRP_ENVIRONMENT=local`, schema `trp_booking`, and a
non-production target. After explicit owner authorization, `npm run db:migrate:deploy` applied the
R4 cleanup migration on 2026-09-25, and `npm run db:migrate:status` confirmed the database schema is
up to date with 26 migrations.

## Public Contact Contract

R4 adds the public build-time configuration key:

```text
NEXT_PUBLIC_WHATSAPP_PHONE_E164
```

Rules:

```text
- value is public by design and is not a secret
- value must be formatted as +<E.164>
- Local/Test and Production may use different numbers
- Local/Test may use the developer/test WhatsApp Business App number
- Production should use Tu Refugio Perfecto's official WhatsApp Business App number
- values may differ by environment
- no number is hardcoded in git
- Vercel changes require redeployment because NEXT_PUBLIC values are build-time public config
- when missing or invalid, the floating WhatsApp action and optional footer link do not render
- wa.me URL is generated client-side
- localized ES/EN initial messages are used
```

The public helper accepts only valid `+E.164`, strips the leading plus only for the `wa.me` URL, and
adds localized ES/EN initial text through `messages/es.ts` and `messages/en.ts`. No real public
WhatsApp number is hardcoded in git.

The accepted shared public UI component is `PublicWhatsAppFloatingAction`. It is fixed bottom/right,
uses mobile safe-area handling, provides an accessible target of at least 44px, uses a localized
aria label, opens an external `wa.me` URL with `target="_blank"` and `rel="noopener noreferrer"`,
and is wired through shared public `SiteFooter` surfaces. The accepted public surfaces are Home,
Accommodations, Property detail, and Public reviews. The optional footer WhatsApp contact is part of
R4. Admin surfaces remain excluded.

## Preserved Boundaries

R4 intentionally preserves these boundaries:

```text
- no Final-F.R5 work
- no PWA, service worker, manifest, Web Push, VAPID, PushSubscription or AdminNotification work
- no /admin/notifications route
- no Twilio, 360dialog, Gupshup, Meta Cloud API or Coexistence backend behavior
- no guest WhatsApp webhook, persistence, status tracking, reply composer, service-window logic or phone-to-Reservation matching
- no STAFF role or UserRole change
- no Production provider/account/DNS/database activation
- no Vercel cron registration; vercel.json remains {"crons":[]}
```

Critical preserved boundary:

```text
ReservationLifecycleRequestChannel.WHATSAPP remains preserved.
```

The correct accepted statement is that backend/API WhatsApp integration was removed while human
WhatsApp communication remains a valid lifecycle-request channel.

## Validation Ledger

Executed during the R4 implementation run:

```text
git status --short --branch — PASS after elevated Git read; branch main, dirty only with R4 implementation changes
git rev-parse HEAD — PASS; e30acaf3e26d823172316bac4fdd79daf3cbf411
npm uninstall twilio — PASS; package manifests updated by npm
npm run db:format — PASS
npx tsx --tsconfig tests/final-f/tsconfig.json tests/final-f/run.ts — PASS after elevated rerun; Final-F targeted validation passed 24/24
npm run db:validate — PASS
npm run db:generate — PASS
npm run db:migrate:status — PASS before deploy; reported pending 20260924130000_final_f_r4_remove_whatsapp_backend
npm run db:migrate:deploy — PASS after explicit owner authorization; applied 20260924130000_final_f_r4_remove_whatsapp_backend
npm run db:migrate:status — PASS after deploy; Database schema is up to date with 26 migrations
npm run env:validate — PASS
npm run final-d:validate — PASS after explicitly authorized test-only D.6 active-request fixture stabilization; 66/66
npm run final-e:validate — PASS; 88/88
npm run lint — PASS
npm run build — PASS after elevated rerun; first sandbox run failed only on Google Fonts network fetch
git diff --check — PASS; Windows LF/CRLF conversion warnings only
Vercel — SUCCESS for ae0db63efdabfa3bc952a8a2a71220de231ebc18
Hosted Test — PASS by owner on 2026-09-25
```

Additional validation note:

```text
The authorized D.6 fixture stabilization is test-only. It keeps active PENDING payment-request resend coverage modeled as unexpired without changing runtime eligibility behavior.
```

## Documentation Authority

The accepted documentation authority after R4 closure is:

```text
docs/160 = authoritative Final Improvement Track roadmap
docs/200 = accepted authoritative Final-F architecture contract
docs/201 = accepted Final-F.R4 implementation/validation record
```

Historical docs `193` through `199` remain historical records.

## Next State

```text
Final-F.R3 — Completed and accepted on 2026-09-24
Final-F.R4 — Completed and accepted on 2026-09-25 at ae0db63efdabfa3bc952a8a2a71220de231ebc18
Final-F.R5 — Android Admin PWA/Web Push foundation — Completed and accepted on 2026-09-25 at 88616acf46645ccc01cc475f20a868d7c18dbadf
Final-F.6 — Admin Web Push operational notifications — Next / Not started
Final-F.7 — Zoho incoming-email bounded metadata and GUEST_EMAIL_RECEIVED Admin Web Push — Not started
Final-F.8 — Android PWA/Web Push integrated regression, public WhatsApp contact acceptance and Final-F closure — Not started
Final-G/H — Not started
Phase 13 — Not started
```
