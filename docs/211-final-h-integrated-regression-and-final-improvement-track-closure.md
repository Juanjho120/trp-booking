# 211 — Final-H: Integrated regression and final improvement-track closure

## Record

```text
Project: TRP Booking
Track: Post-Phase-12 / Pre-Phase-13 Final Improvement Track
Package: Final-H — Integrated regression and final improvement-track closure
Status: Integrated regression/security hardening/evidence completed; owner acceptance pending
Document date: 2026-09-29

Implementation/evidence base: 3c1b3e24e0a835928615e015840e708a310a182a
Final-H security hardening dependency head: badbda7831a16986c0471b455b4b0124b15e5268

Final-G accepted package head: be8445a2c73a710e451da608fd9e669f8f412ab3

Final-A: Completed and accepted
Final-B: Completed and accepted
Final-C: Completed and accepted
Final-D: Completed and accepted
Final-E: Completed and accepted
Final-F: Completed and accepted
Final-G: Completed and accepted on 2026-09-28
Final-H status: Integrated regression/security hardening/evidence completed; owner acceptance pending

Post-Phase-12 / Pre-Phase-13 Final Improvement Track: Active
Phase 13: Not started

Runtime feature changes: none expected for Final-H evidence work
Schema changes: none
Migration changes: none
Dependency changes: scoped dependency security hardening
Environment variable changes: none
Production resources: none
Test scheduler: remains {"crons":[]}
```

Final-H is the final evidence and regression gate before Phase 13 may be planned. It does not start
Phase 13, does not provision Production resources, does not self-accept Final-H, and does not mark
the complete Final Improvement Track accepted. Owner approval remains required for:

```text
Final-H and complete Final Improvement Track
```

## Scope

Final-H is primarily evidence, regression and reconciliation work:

```text
- run all permanent Final-A through Final-G gates;
- add a focused Final-H cross-package invariant gate;
- verify Test/Production isolation;
- reconcile the Production scheduler carry-forward registry;
- record Production carry-forwards for Phase 13;
- run safe Hosted Test public smoke;
- run security/dependency review without blind upgrades;
- reconcile current-state documentation;
- prepare the owner acceptance package.
```

No product feature, schema, migration, broad architecture change, scheduler activation or
Production-resource provisioning belongs to Final-H.

## Integrated Regression Strategy

The permanent package gates remain the primary evidence for the deep domain matrices:

```text
Final-A — financial correctness, effective stay value, standard/extraordinary/compensating refunds.
Final-B — protected Airbnb iCal configuration, import/export, token rotation and loop prevention.
Final-C — base/seasonal/length-of-stay pricing, precedence, historical quote stability and lifecycle pricing.
Final-D — additional charges, GuestPaymentRequest payment collection, refunds and financial isolation.
Final-E — review invitation eligibility, scheduling/email, one-time private submission, moderation and public output.
Final-F — public WhatsApp contact, Android Admin PWA/Web Push, Zoho bounded inbound metadata and notification center.
Final-G — public cache, client/hydration, Tilopay performance hardening, Admin route imports and performance evidence.
```

Final-H adds only cross-package closure checks that are not already adequately covered by A-G:

```text
- permanent scripts A-H exist;
- accepted package heads/statuses are reconciled;
- Final-H is evidence-complete but owner acceptance remains pending;
- Phase 13 remains Not started;
- vercel.json remains {"crons":[]};
- six Production scheduler jobs are inventoried;
- superseded WhatsApp backend/provider route files remain absent;
- ADMIN-only user model and six notification classes remain exact;
- iOS/iPadOS Web Push remains Deferred;
- public/live availability remains force-dynamic where transactional correctness requires it;
- Admin operational state remains uncached;
- Tilopay SDK/token cache remains server-only and persistence-free;
- security headers and Admin middleware/same-origin protections remain present.
```

## Financial Regression Evidence

Final-A, Final-C and Final-D remain the accepted evidence for the combined financial model:

```text
- original booking payment;
- positive DATE_CHANGE;
- zero DATE_CHANGE;
- negative DATE_CHANGE;
- positive STAY_EXTENSION;
- cancellation after positive paid adjustment;
- standard refund;
- extraordinary refund;
- compensating refund;
- multiple captured stay-payment legs;
- additional charges and GuestPaymentRequest collection;
- additional-charge refund;
- stay financial balance vs additional-charge balance isolation;
- cancellation policy applies to effective stay value, not unrelated additional charges.
```

Final-H found no reason to rewrite the financial model. Any future Production issue must preserve the
accepted separation between stay value and ancillary charges.

## Pricing Regression Evidence

Final-C remains the accepted pricing evidence for:

```text
- base price;
- seasonal pricing;
- configured length-of-stay thresholds;
- seasonal-over-LOS precedence;
- historical quote stability;
- new quote current-pricing behavior;
- DATE_CHANGE repricing;
- STAY_EXTENSION repricing;
- pending hold and payment amount consistency.
```

No pricing redesign is introduced by Final-H.

## Calendar Regression Evidence

Final-B plus the existing availability/Final-G gates remain the accepted evidence for:

```text
- protected Airbnb import URL management;
- connection test;
- manual sync;
- inbound sync;
- TRP outbound iCal Copy URL;
- outbound token rotation;
- old token invalidation;
- Airbnb loop prevention;
- composed-listing parent/child blocking semantics;
- manual blocks;
- maintenance blocks;
- preparation buffers;
- preparation override;
- live availability.
```

Final-H does not perform uncontrolled destructive external-calendar tests and does not alter real
provider connections.

## Review Workflow Regression Evidence

Final-E remains the accepted evidence for:

```text
- post-checkout eligibility;
- invitation timing;
- REVIEW_INVITATION email creation and delivery path;
- private one-time review token;
- successful one-time submission;
- replay rejection;
- expiration;
- publish;
- hide;
- public review output;
- property isolation;
- moderation invalidation;
- no private guest data in public review output.
```

## Public WhatsApp Final Architecture

Accepted current target:

```text
Guest -> public TRP site -> floating WhatsApp contact -> WhatsApp Business App -> human administrators
```

Final-H carries forward:

```text
- environment-aware public WhatsApp number through NEXT_PUBLIC_WHATSAPP_PHONE_E164;
- localized ES/EN initial WhatsApp messages;
- mobile/Android compatible wa.me handoff;
- desktop/web compatible wa.me handoff;
- Guest WhatsApp remains outside the TRP backend.
```

Superseded backend/provider architecture remains absent from active runtime route files:

```text
- no guest WhatsApp webhook runtime route file;
- no guest WhatsApp persistence in active Prisma schema;
- no guest/admin TRP chat UI route file;
- no active /admin/whatsapp page file;
- no active Twilio WhatsApp route/runtime file;
- no active 360dialog route/runtime file;
- no Meta Cloud API runtime;
- no Gupshup runtime;
- no GUEST_WHATSAPP_RECEIVED notification type.
```

Historical records remain historical and are not deleted or rewritten.

## Android Admin PWA / Web Push

Accepted target remains Android plus current Chromium-based browser. iOS/iPadOS Web Push remains
Deferred and must not fail Final-H.

Accepted ADMIN notification classes remain exactly:

```text
RESERVATION_CONFIRMED
RESERVATION_CANCELLED
CHECK_IN_MINUS_48H
CHECK_OUT_MINUS_6H
REVIEW_SUBMITTED
GUEST_EMAIL_RECEIVED
```

Final-H preserves:

```text
- ADMIN OAuth/Auth.js boundary;
- no STAFF role;
- explicit authenticated user gesture for notification permission;
- PushSubscription registration and device disable/revoke;
- notification center, read/unread and recent history;
- push click targets;
- invalid subscription cleanup;
- durable notification intent;
- delivery retry/recovery;
- Web Push failure does not roll back business transactions;
- privacy-bounded notification title/body;
- no token/private payment/guest-sensitive content leakage.
```

## Zoho Inbound Email

Accepted bounded architecture remains:

```text
- Zoho mailbox remains the human mailbox;
- TRP ingests bounded incoming-webhook metadata only;
- GUEST_EMAIL_RECEIVED creates an ADMIN notification;
- raw-body SHA-256 fingerprint remains the idempotency mechanism;
- primary address: admin@juantzun.dev;
- aliases: reservas@juantzun.dev and reservations@juantzun.dev.
```

TRP must not persist:

```text
email body, HTML, attachments, full headers, raw payload, mailbox inbox/sent/drafts,
human replies or spam state.
```

The temporary bootstrap-token registration contract remains closed over the accepted Final-F.7
behavior; bootstrap tokens must not reappear in runtime logs, database records, Push payloads or
application responses.

## Tilopay Regression

Final-H preserves the accepted Tilopay behavior without creating a real charge for this gate:

```text
- initial reservation checkout;
- payment retry;
- additional charge checkout;
- lifecycle adjustment checkout;
- canonical SDK URL: https://app.tilopay.com/sdk/v2/sdk_tpay.min.js;
- no Date.now SDK cache busting;
- SDK preload/preconnect;
- shared SDK load promise;
- server SDK-token cache;
- expires_in defensive parsing;
- 90-second safety margin;
- one in-flight token refresh;
- intent-based warm-up;
- no token browser persistence;
- no token DB/KV/Redis persistence.
```

Final-H does not guarantee a sub-second provider initialization time. Provider/network/serverless
variance remains an accepted caveat.

## Final-G Performance Boundaries

Final-H preserves the accepted Final-G closure:

```text
- public stable cache architecture;
- explicit invalidation;
- listing/detail graph split;
- one availability calendar initially;
- /disponibilidad CLS correction;
- blocked-dates duplicate-query correction;
- Tilopay performance hardening;
- Admin direct route imports;
- Admin no-stale-cache boundary.
```

Full optimization work is not reopened. Normal Lighthouse/provider/network variance does not start a
new optimization package.

## Existing Platform Smoke Scope

Final-H safe smoke covers only non-destructive public routes:

```text
/
/alojamientos
/alojamientos/refugio-completo
/disponibilidad
/resenas
```

No destructive reservation, payment, refund, email, Airbnb, Zoho or Web Push operation is created
solely for Final-H smoke. Accepted owner evidence from Final-A through Final-G remains valid unless
a new defect is discovered.

## Authoritative Scheduler / Cron Registry

The current source of truth is `lib/cron/registry.ts`, not the older Phase-12 four-job list. Test
keeps `vercel.json` as:

```json
{
  "crons": []
}
```

The authoritative Production carry-forward registry for Phase 13 is:

| Logical job | Route/handler | Purpose | Cadence | Manual support | Idempotency/recovery behavior | Required env/secrets | Production Vercel cron |
| --- | --- | --- | --- | --- | --- | --- | --- |
| `SYNC_AIRBNB_CALENDARS` | `sync-airbnb-calendars` / `syncConfiguredAirbnbIcalImports` | Sync configured Airbnb inbound iCal calendars into TRP blocking state. | `*/30 * * * *` | Admin/manual trigger through cron console and shared registry trigger source. | Per-calendar sync logs, safe partial success, source ownership and loop-prevention rules. | `CRON_SECRET`; encrypted ExternalCalendar import URL data. | Yes, activate in Phase 13 only. |
| `EXPIRE_PENDING_RESERVATION_HOLDS` | `expire-pending-reservation-holds` / `expirePendingReservationHolds` + `expireDueLifecycleAdjustmentHolds` | Expire public pending-payment holds and lifecycle adjustment holds. | `*/5 * * * *` | Admin/manual trigger through cron console. | State-transition based expiration; reruns process only eligible active holds. | `CRON_SECRET`; database. | Yes, activate in Phase 13 only. |
| `PROCESS_EMAIL_NOTIFICATIONS` | `process-email-notifications` / `processEmailNotifications` | Process/retry transactional email notifications. | `*/5 * * * *` | Admin/manual trigger through cron console. | EmailNotification statuses, delivery attempts, bounded errors and retry recovery. | `CRON_SECRET`; Resend/email env. | Yes, activate in Phase 13 only. |
| `SCHEDULE_ARRIVAL_INSTRUCTIONS` | `schedule-arrival-instructions` / `scheduleArrivalInstructionsNotifications` | Create eligible arrival-instruction email intents. | `*/30 * * * *` | Admin/manual trigger through cron console. | Deduplicated email intent creation and safe partial success. | `CRON_SECRET`; email env. | Yes, activate in Phase 13 only. |
| `SCHEDULE_REVIEW_INVITATIONS` | `schedule-review-invitations` / `scheduleReviewInvitations` | Create eligible review invitations and REVIEW_INVITATION email intents. | `*/30 * * * *` | Admin/manual trigger through cron console. | ReviewInvitation lifecycle and EmailNotification deduplication prevent duplicate invitations. | `CRON_SECRET`; email env and review token crypto config. | Yes, activate in Phase 13 only. |
| `PROCESS_ADMIN_PUSH_NOTIFICATIONS` | `process-admin-push-notifications` / `processAdminPushNotifications` | Retry/recover ADMIN Web Push delivery attempts. | `*/5 * * * *` | Admin/manual trigger through cron console. | AdminPushDelivery state machine, invalid subscription cleanup and bounded retry. | `CRON_SECRET`; Web Push VAPID env. | Yes, activate in Phase 13 only. |

Review invitation scheduling did add a Production cron carry-forward. Final-F Web Push did add
scheduled recovery work through `process-admin-push-notifications`. Final-H does not register either
job in Test.

## Production Carry-Forward Registry

Final-H carries these Phase-13 tasks forward. Do not perform these actions in Final-H.

### Infrastructure

```text
- company-owned Vercel;
- company-owned Supabase;
- company-owned Tilopay;
- company-owned Resend;
- company-owned Zoho;
- company-owned Cloudinary;
- company Google/Auth identity;
- Production DNS for turefugioperfecto.com and email domains.
```

### App/runtime

```text
- TRP_ENVIRONMENT=production;
- Production OAuth/Auth.js callback/domain setup;
- Production database and migrations;
- Production media asset ownership;
- Production email sender/domain;
- Production Tilopay credentials;
- public WhatsApp Business App number/contact;
- Production cron activation from the six-job registry above;
- Production Node runtime satisfying Node >=20.9.0. This lower bound is required by the accepted
  sharp@0.35.4 security floor; configure and verify the Production Vercel Node runtime before
  Production build/deployment, and do not downgrade sharp merely to support an older Node runtime;
- Production secrets and key rotation.
```

### Operational readiness

```text
- current dependency/security audit;
- Production CSP finalization;
- monitoring/logging/alerting;
- Supabase Production backup/PITR;
- RPO/RTO;
- restore rehearsal;
- provider migration;
- controlled go-live.
```

## Environment Isolation Audit

Accepted environment state:

```text
Local: TRP_ENVIRONMENT=local
Hosted Test: TRP_ENVIRONMENT=test
Production: not provisioned / not active
```

Do not infer TRP business environment only from `VERCEL_ENV`. The Hosted Test site may be a Vercel
production deployment while still being `TRP_ENVIRONMENT=test`.

Final-H confirms:

```text
- Test remains on the developer-owned stack;
- Local/Test sharing remains deliberate accepted architecture;
- Production must not reuse developer-owned provider accounts;
- Test scheduler remains disabled;
- no secret values are recorded in this document.
```

## Security Review

Security review categories for Final-H:

### Blockers before Phase 13

```text
No active dependency/security blocker remains after the 2026-09-29 scoped dependency hardening
and local/Test validation listed below.

The original pre-hardening dependency audit blocker is preserved under "Resolved during Final-H
hardening" and must not be erased from the record. Final-H still requires owner acceptance before
the package and complete improvement track can close.
```

### Resolved during Final-H hardening

Pre-hardening audit:

```text
npm audit --omit=dev completed on 2026-09-29 against starting head
8dab9ae8690d357e112d164cfdf292831d8a9205 and exited 1 with the previously recorded
production blocker summary:
1 critical
6 high
```

Bounded advisory table from the pre-fix audit:

| Package | Advisory | Severity | Affected range | Installed version / dependency path | Direct | Patched version / action |
| --- | --- | --- | --- | --- | --- | --- |
| `next` | Unauthenticated RCE on Windows-hosted servers | critical | `>=13.4.0 <15.5.24` | `next@15.5.23` at root | Yes | `next@15.5.26` |
| `next` | Unauthenticated RCE in Image Optimization API when AVIF files are used | critical | `>=10.0.0 <15.5.24` | `next@15.5.23` at root | Yes | `next@15.5.26` |
| `next` | Next bundled `postcss` advisory | critical | `9.3.4-canary.0 - 16.3.0-preview.10` | `next@15.5.23` at root | Yes | `next@15.5.26` plus `postcss@8.5.23` override |
| `next` | Next optional `sharp` advisory | critical | `9.3.4-canary.0 - 16.3.0-preview.10` | `next@15.5.23` at root | Yes | `next@15.5.26` plus `sharp@0.35.4` override |
| `sharp` | Inherited libvips vulnerabilities | high | `<0.35.0` | `sharp@0.34.5` under `next` optional dependency | Transitive | `sharp@0.35.4` override |
| `sharp` | Inherited libheif vulnerabilities | high | `<0.35.4` | `sharp@0.34.5` under `next` optional dependency | Transitive | `sharp@0.35.4` override |
| `postcss` | CSS stringify `</style>` escaping issue | moderate | `<8.5.10` | `next/node_modules/postcss@8.4.31`; top-level `postcss@8.5.21` | Transitive | `postcss@8.5.23` override |
| `postcss` | Source map arbitrary file read / information disclosure | high | `<=8.5.11` | `next/node_modules/postcss@8.4.31`; top-level `postcss@8.5.21` | Transitive | `postcss@8.5.23` override |
| `postcss` | Incomplete fix follow-up for source-map issue | moderate | `<=8.5.22` | `next/node_modules/postcss@8.4.31`; top-level `postcss@8.5.21` | Transitive | `postcss@8.5.23` override |
| `postcss` | Previous source-map auto-loading path traversal | high | `<=8.5.17` | `next/node_modules/postcss@8.4.31`; top-level `postcss@8.5.21` | Transitive | `postcss@8.5.23` override |
| `nanoid` | Custom generators can loop indefinitely when size is zero | high | `<3.3.18` | `nanoid@3.3.16` under `postcss` | Transitive | `nanoid@3.3.18` override |
| `prisma` | Prisma config dependency advisory | high | `6.13.0-dev.1 - 8.1.0-dev.4` | `prisma@6.19.3` | Yes | No Prisma major upgrade; targeted `@prisma/config > deepmerge-ts` override |
| `@prisma/config` | DeepmergeTS recursive object stack exhaustion | high | `6.13.0-dev.1 - 8.1.0-dev.4` | `@prisma/config@6.19.3` under `prisma` | Transitive | `deepmerge-ts@8.0.2` override |
| `deepmerge-ts` | Stack exhaustion when merging recursive object graphs | high | `<8.0.0` | `deepmerge-ts@7.1.5` under `@prisma/config` | Transitive | `deepmerge-ts@8.0.2` override |

Applied dependency changes:

```text
next: 15.5.23 -> 15.5.26
eslint-config-next: 15.5.23 -> 15.5.26
sharp: 0.34.5 -> 0.35.4 via a narrow npm override
postcss: 8.4.31 / 8.5.21 -> 8.5.23 via a narrow npm override
nanoid: 3.3.16 -> 3.3.18 via a narrow npm override
@prisma/config > deepmerge-ts: 7.1.5 -> 8.0.2 via a targeted npm override
prisma and @prisma/client remain 6.19.3
React remains unchanged
No npm audit fix --force, Next major upgrade or Prisma major upgrade was performed
```

Resolved dependency tree:

```text
npm ls next — next@15.5.26; next-auth@5.0.0-beta.32 dedupes to next@15.5.26
npm ls sharp — sharp@0.35.4 overridden under next@15.5.26
npm ls postcss — all resolved instances are postcss@8.5.23
npm ls nanoid — nanoid@3.3.18 under postcss@8.5.23
npm ls deepmerge-ts — deepmerge-ts@8.0.2 under @prisma/config@6.19.3
npm ls prisma @prisma/client @prisma/config — prisma@6.19.3 and @prisma/client@6.19.3 remain; @prisma/config@6.19.3 uses the targeted override
```

Post-hardening audit:

```text
npm audit --omit=dev — PASS after elevated registry access; found 0 vulnerabilities.
The sandboxed audit attempt failed because the npm audit endpoint/cache could not be reached or
written from the restricted environment; it did not report a vulnerability.
```

### Phase-13 carry-forward

```text
- Production CSP finalization after Production domains/providers are known.
- Company-owned provider account provisioning and secret rotation.
- Supabase Production backup/PITR and restore rehearsal.
- Production monitoring, alerting and incident-response runbooks.
- Production scheduler recurrence validation.
```

### Accepted/no action

```text
- Existing security headers remain configured in next.config.ts.
- Admin route middleware remains scoped to /admin/:path*.
- Admin mutation same-origin checks remain present.
- Private token handling remains owned by accepted Final-B/D/E/F crypto contracts.
- Tilopay credential and SDK-token handling remains server-side.
- Web Push VAPID private key material and PushSubscription endpoint/key data remain server/database data.
```

No dependency was blindly upgraded in Final-H. The remediated blocker used exact patch-line Next
alignment and narrow npm overrides for vulnerable transitive packages.

## Validation Ledger

Final-H target ledger:

```text
npm run final-a:validate — PASS, 44/44.
npm run final-b:validate — PASS, 38/38.
npm run final-c:validate — PASS, 41/41.
npm run final-d:validate — PASS, 66/66.
npm run final-e:validate — PASS, 88/88.
npm run final-f:validate — PASS, 125/125 after reconciling its stale forward-looking
  Final-F.8 documentation expectation to the current post-Final-G / Final-H evidence state.
npm run final-g:validate — PASS, 48/48.
npm run final-h:validate — PASS, 20/20.
npm run env:validate — PASS.
npm run db:validate — PASS; Prisma package.json#prisma deprecation warning only.
npm run db:generate — PASS; Prisma package.json#prisma deprecation warning only.
npm run db:migrate:status — PASS after elevated network/database access; 29 migrations found
  and database schema is up to date. The sandboxed attempt failed with a Prisma Schema engine error.
npm run lint — PASS.
npm run build — PASS after elevated network access for Google Fonts. The sandboxed attempt failed
  only because Inter and Geist Mono could not be fetched from fonts.googleapis.com.
npm audit --omit=dev — PASS after elevated registry access; found 0 vulnerabilities.
npm ls next — PASS; next@15.5.26.
npm ls sharp — PASS; sharp@0.35.4 overridden under next.
npm ls postcss — PASS; all resolved instances are postcss@8.5.23.
npm ls nanoid — PASS; nanoid@3.3.18.
npm ls deepmerge-ts — PASS; deepmerge-ts@8.0.2 under @prisma/config.
npm ls prisma @prisma/client @prisma/config — PASS; Prisma remains 6.19.3.
git diff --check — PASS; Windows LF-to-CRLF working-copy warnings only, no whitespace errors.
Vercel GitHub combined status for badbda7831a16986c0471b455b4b0124b15e5268 — SUCCESS.
Hosted smoke for badbda7831a16986c0471b455b4b0124b15e5268 — PASS:
  / — HTTP 200, x-vercel-cache PRERENDER.
  /alojamientos — HTTP 200, x-vercel-cache PRERENDER.
  /alojamientos/refugio-completo — HTTP 200, x-vercel-cache MISS and no-store/private.
  /disponibilidad — HTTP 200, x-vercel-cache PRERENDER.
  /resenas — HTTP 200, x-vercel-cache MISS and no-store/private.
  /admin — HTTP 307 to /api/auth/signin with callbackUrl, preserving the authentication boundary.
  /sw.js — HTTP 200, application/javascript, no-store.
  representative /_next/image Cloudinary image — HTTP 200, image/png, x-vercel-cache HIT.
```

Expected accepted counts before Final-H-specific checks:

```text
Final-A — 44/44
Final-B — 38/38
Final-C — 41/41
Final-D — 66/66
Final-E — 88/88
Final-F — 125/125
Final-G — 48/48
```

Final-H targeted gate:

```text
npm run final-h:validate — expected focused cross-package closure invariants only.
```

## Hosted Test Smoke

Target:

```text
https://trp-booking.juantzun.dev
```

Safe non-destructive public-route smoke:

| Route | Expected status | Cache behavior to verify | Result |
| --- | ---: | --- | --- |
| `/` | 200 | public revalidated shell / HIT or PRERENDER/HIT acceptable | PASS — 5/5 HTTP 200. First observed `x-vercel-cache=PRERENDER`; subsequent requests `HIT`. Median header/total 107.8 ms / 122.3 ms. Bytes 95,790. `cache-control: public, must-revalidate, max-age=0`; `age: 0`. |
| `/alojamientos` | 200 | public revalidated shell / HIT or PRERENDER/HIT acceptable | PASS — 5/5 HTTP 200. First observed `PRERENDER`; subsequent requests `HIT`. Median header/total 79.2 ms / 88.8 ms. Bytes 71,836. `cache-control: public, must-revalidate, max-age=0`; `age: 0`. |
| `/alojamientos/refugio-completo` | 200 | detail may remain route-level dynamic/no-store while stable data path is warm | PASS — 5/5 HTTP 200. All samples `x-vercel-cache=MISS` with `cache-control: no-store, must-revalidate, no-cache, max-age=0, private`, matching dynamic route-level behavior. Median header/total 144.9 ms / 158.1 ms after two slower first observations. Bytes 84,696. |
| `/disponibilidad` | 200 | public shell cached; availability API remains live/dynamic | PASS — 5/5 HTTP 200. First observed `PRERENDER`; subsequent requests `HIT`. Median header/total 84.8 ms / 95.0 ms. Bytes 67,915-67,943. `cache-control: public, must-revalidate, max-age=0`; `age: 0`. |
| `/resenas` | 200 | route may remain dynamic/no-store while published-review data path is cached | PASS — 5/5 HTTP 200. All samples `x-vercel-cache=MISS` with `cache-control: no-store, must-revalidate, no-cache, max-age=0, private`, matching dynamic route-level behavior. Median header/total 121.6 ms / 127.2 ms. Bytes 42,181. |

No destructive Hosted flow is required for Final-H unless a new unresolved issue appears.

## Final Owner Acceptance Package

### Packages accepted

```text
Final-A through Final-G are completed and accepted.
Final-G accepted package head: be8445a2c73a710e451da608fd9e669f8f412ab3.
Final-H is not accepted yet.
```

### Final-H integrated regression

```text
Permanent A-G gates plus the focused Final-H gate passed:
Final-A 44/44; Final-B 38/38; Final-C 41/41; Final-D 66/66; Final-E 88/88;
Final-F 125/125; Final-G 48/48; Final-H 20/20.

Dependency audit blocker is resolved by scoped Final-H hardening; owner acceptance remains pending.
Vercel deployment and safe Hosted smoke for the hardening commit passed.
```

### Hosted Test state

```text
Public non-destructive smoke is healthy for /, /alojamientos, /alojamientos/refugio-completo,
/disponibilidad and /resenas: all sampled requests returned HTTP 200. The /admin authentication
boundary returned HTTP 307 to sign-in, /sw.js returned HTTP 200 no-store JavaScript, and a
representative Next Image / Cloudinary image returned HTTP 200.
Owner-accepted Hosted evidence from Final-A through Final-G remains carried forward.
```

### Security state

```text
No npm audit dependency/security blocker remains open after the scoped hardening pass.
Phase-13 security carry-forwards remain documented rather than executed in Final-H.
```

### Scheduler registry

The six-job registry in this document is the authoritative Production scheduler carry-forward for
Phase 13. Test remains with zero Vercel crons.

### Production carry-forwards

The Phase-13 checklist above is complete enough to start Phase-13 planning only after explicit owner
acceptance. It includes verifying that the company-owned Production Vercel runtime satisfies
Node >=20.9.0 for the accepted sharp@0.35.4 security floor before Production build/deployment.

### Known accepted caveats

```text
- no Production resources yet;
- no field/RUM performance data;
- iOS Web Push deferred;
- provider/network/serverless variance;
- Production scheduler recurrence evidence belongs to Phase 13;
- Production Node runtime verification for Node >=20.9.0 belongs to Phase 13;
- Production backup/restore rehearsal belongs to Phase 13;
- Production CSP finalization belongs to Phase 13 once domains/providers are final.
```

### Decision required

Owner approval of:

```text
Final-H and complete Final Improvement Track
```

Do not self-accept.

## Phase 13 Gate

Phase 13 cannot start until:

```text
Final-H integrated regression passes
documentation is reconciled
Production carry-forwards are complete
no applicable blocker remains open
owner explicitly accepts Final-H
owner explicitly accepts the complete Final Improvement Track
```

Only after that may Phase 13 be planned or started.

## Next State

```text
Phase 12 — Completed and accepted
Final-A — Completed and accepted
Final-B — Completed and accepted
Final-C — Completed and accepted
Final-D — Completed and accepted
Final-E — Completed and accepted
Final-F — Completed and accepted
Final-G — Completed and accepted
Final-H — Integrated regression/security hardening/evidence completed; owner acceptance pending
Post-Phase-12 / Pre-Phase-13 Final Improvement Track — Active
Phase 13 — Not started
```
