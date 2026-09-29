# 210 — Final-G.5: Hosted final comparison, integrated regression and Final-G closure

## Record

```text
Project: TRP Booking
Package: Final-G — Performance audit and optimization
Subphase: Final-G.5 — Hosted final comparison, permanent performance evidence and Final-G closure
Status: Completed and accepted
Document date: 2026-09-29

Implementation/evidence base head:
8d8547ff5033f4e7c96cbad2efb67521c986ec07

Accepted G.1 baseline:
1623389b028be1b0391a2afce6e7c28244ad0fbf

Accepted G.2 feature head:
ecafa2f95314fe485b1e1cc2d6372c40f076964a

G.2 Hosted evidence head:
c09d8d04e0e49a1fdcc8bd2dd5aaeb96e350ed60

Accepted G.3 head:
e3bcc9709a355b2ce0c6284461f0f4249ad60a5e

Accepted G.4 head:
7090701b2dc37f4cbd6490f250984b6db9d53a58

Accepted G.5 evidence/gate head:
be8445a2c73a710e451da608fd9e669f8f412ab3

Accepted Final-G package head:
be8445a2c73a710e451da608fd9e669f8f412ab3

Final-G package: Completed and accepted on 2026-09-28
Final-G.1 — Completed and accepted on 2026-09-28
Final-G.2 — Completed and accepted on 2026-09-28
Final-G.3 — Completed and accepted on 2026-09-28
Final-G.4 — Completed and accepted on 2026-09-28
Final-G.5 — Completed and accepted on 2026-09-28 at be8445a2c73a710e451da608fd9e669f8f412ab3
Final-H — Completed and accepted on 2026-09-29 at 6922cf27e31e63fde071c0d0a810b141e44b9f90
Phase 13 — Next / Not started

Runtime feature changes: none
Schema changes: none
Migration changes: none
Dependency changes: none
Environment variable changes: none
Production resources: none
vercel.json remains {"crons":[]}
```

Final-G.5 received explicit owner acceptance: `Final-G.5 is approved.` Because G.1 through G.4 were
already completed and accepted, Final-G is now formally completed and accepted. This documentation
closure commit is later than the accepted evidence/gate head and does not replace
`be8445a2c73a710e451da608fd9e669f8f412ab3` as the accepted Final-G package head.

G.5 is an evidence, integrated-regression and documentation-closure subphase. It does not reopen the
accepted G.2, G.3 or G.4 architecture; it does not start Final-H or Phase 13.

## Frozen Architecture Carried Forward

The accepted Final-G architecture remains unchanged:

```text
G.2:
- stable public property/location/review data uses explicit cache/revalidation and mutation invalidation.
- live transactional availability, holds, reservations, payments, refunds and Admin data remain uncached.

G.3:
- client-side ES/EN architecture remains unchanged.
- listing/detail route graph split remains accepted.
- DayPicker and country flags remain static by accepted design.
- Tilopay checkout remains deferred from initial detail route cost.
- canonical Tilopay SDK URL, preconnect/preload, shared client SDK promise, server SDK-token cache,
  90-second margin, one in-flight refresh and intent warm-up remain accepted.
- /disponibilidad remains a public shell with tabs, one initially mounted active calendar and 60 live days.
- Next Image + Cloudinary architecture remains unchanged.

G.4:
- Admin direct route imports remain accepted.
- protected Admin data stays live/dynamic.
- no auth bypass and no stale Admin operational cache were added.
```

## Production Build Evidence

Command:

```text
npm run build
```

The first sandboxed attempt failed only because Turbopack could not fetch Google Fonts from
`fonts.googleapis.com`. The network-enabled rerun passed and produced the following final First Load
JS table.

### Public routes

| Route | G.1 baseline | Final-G build | Change vs G.1 | Notes |
| --- | ---: | ---: | ---: | --- |
| `/` | 311 kB | 313 kB | +0.6% | No material route-bundle regression. |
| `/alojamientos` | 479 kB | 311 kB | -35.1% | Accepted listing graph split preserved. |
| `/alojamientos/[slug]` | 479 kB | 371 kB | -22.5% | Accepted detail graph split + deferred Tilopay preserved. |
| `/disponibilidad` | 213 kB | 311 kB | +46.0% | Intentional richer public shell/tabs/CTA/locale context; judged with CLS and behavior, not bytes alone. |
| `/resenas` | 312 kB | 228 kB | -26.9% | Accepted review route split/cache state preserved. |
| Shared by all | 228 kB | 221 kB | -3.1% | Shared app floor remains lower than G.1. |

### Admin routes

G.1 Admin baseline was approximately 561 kB First Load JS for Admin pages. Final build evidence:

| Route | Final-G build | Reduction vs G.1 Admin baseline |
| --- | ---: | ---: |
| `/admin` | 320 kB | -43.0% |
| `/admin/reservations` | 343 kB | -38.9% |
| `/admin/calendar` | 324 kB | -42.2% |
| `/admin/payments` | 343 kB | -38.9% |
| `/admin/reviews` | 342 kB | -39.0% |
| `/admin/notifications` | 329 kB | -41.4% |
| `/admin/accommodations` | 322 kB | -42.6% |
| `/admin/location` | 329 kB | -41.4% |
| `/admin/catalogs` | 478 kB | -14.8% |
| `/admin/cron-jobs` | 329 kB | -41.4% |

`/admin/catalogs` remains legitimately heavier because its catalog-management client graph is larger,
but it no longer inherits the full broad Admin barrel graph.

### Deferred Tilopay manifest evidence

The final `.next/app-build-manifest.json` for `/alojamientos/[slug]/page` does not include any chunk
containing the Tilopay payment-field runtime markers:

```text
window.Tilopay
sdk_tpay
payFormTilopay
TILOPAY_SDK_SCRIPT_LOAD_ERROR
tlpy_cc_number
```

Those markers exist only in async chunks outside the initial detail route manifest. The Tilopay code
was deferred from the initial route cost; it was not removed.

## Hosted Public HTTP Timing

Target:

```text
https://trp-booking.juantzun.dev
```

Method:

```text
PowerShell/.NET HttpClient
AllowAutoRedirect=false
HttpCompletionOption.ResponseHeadersRead
5 sequential GET samples per canonical URL
No per-sample cache-busting query parameter
User agent: trp-final-g5-http-measure/1.0
```

`header_ms` is the runner response-header-time / TTFB-equivalent used throughout Final-G. It is not a
browser Navigation Timing field and is not RUM. First observed requests are reported as first
observed only; no serverless cold-start claim is made.

### Raw samples

| Route | Sample | Status | header_ms | total_ms | Bytes | x-vercel-cache | cache-control |
| --- | ---: | ---: | ---: | ---: | ---: | --- | --- |
| `/` | 1 | 200 | 382.0 | 418.2 | 95767 | HIT | public, must-revalidate, max-age=0 |
| `/` | 2 | 200 | 98.2 | 114.3 | 95767 | HIT | public, must-revalidate, max-age=0 |
| `/` | 3 | 200 | 108.2 | 120.9 | 95767 | HIT | public, must-revalidate, max-age=0 |
| `/` | 4 | 200 | 71.3 | 85.2 | 95767 | HIT | public, must-revalidate, max-age=0 |
| `/` | 5 | 200 | 79.3 | 93.2 | 95767 | HIT | public, must-revalidate, max-age=0 |
| `/alojamientos` | 1 | 200 | 243.6 | 254.0 | 71836 | PRERENDER | public, must-revalidate, max-age=0 |
| `/alojamientos` | 2 | 200 | 83.8 | 91.6 | 71836 | HIT | public, must-revalidate, max-age=0 |
| `/alojamientos` | 3 | 200 | 170.1 | 179.1 | 71808 | HIT | public, must-revalidate, max-age=0 |
| `/alojamientos` | 4 | 200 | 127.5 | 136.8 | 71808 | HIT | public, must-revalidate, max-age=0 |
| `/alojamientos` | 5 | 200 | 73.1 | 86.0 | 71808 | HIT | public, must-revalidate, max-age=0 |
| `/alojamientos/refugio-completo` | 1 | 200 | 3611.9 | 3624.1 | 84696 | MISS | no-store, must-revalidate, no-cache, max-age=0, private |
| `/alojamientos/refugio-completo` | 2 | 200 | 152.8 | 164.5 | 84696 | MISS | no-store, must-revalidate, no-cache, max-age=0, private |
| `/alojamientos/refugio-completo` | 3 | 200 | 113.0 | 124.9 | 84696 | MISS | no-store, must-revalidate, no-cache, max-age=0, private |
| `/alojamientos/refugio-completo` | 4 | 200 | 121.5 | 137.3 | 84696 | MISS | no-store, must-revalidate, no-cache, max-age=0, private |
| `/alojamientos/refugio-completo` | 5 | 200 | 117.6 | 129.8 | 84696 | MISS | no-store, must-revalidate, no-cache, max-age=0, private |
| `/disponibilidad` | 1 | 200 | 141.9 | 150.8 | 67943 | PRERENDER | public, must-revalidate, max-age=0 |
| `/disponibilidad` | 2 | 200 | 139.1 | 147.9 | 67915 | HIT | public, must-revalidate, max-age=0 |
| `/disponibilidad` | 3 | 200 | 110.1 | 118.9 | 67915 | HIT | public, must-revalidate, max-age=0 |
| `/disponibilidad` | 4 | 200 | 77.8 | 87.5 | 67915 | HIT | public, must-revalidate, max-age=0 |
| `/disponibilidad` | 5 | 200 | 90.0 | 99.0 | 67915 | HIT | public, must-revalidate, max-age=0 |
| `/resenas` | 1 | 200 | 1006.3 | 1010.1 | 42181 | MISS | no-store, must-revalidate, no-cache, max-age=0, private |
| `/resenas` | 2 | 200 | 184.5 | 188.5 | 42181 | MISS | no-store, must-revalidate, no-cache, max-age=0, private |
| `/resenas` | 3 | 200 | 111.1 | 115.3 | 42181 | MISS | no-store, must-revalidate, no-cache, max-age=0, private |
| `/resenas` | 4 | 200 | 113.3 | 114.0 | 42181 | MISS | no-store, must-revalidate, no-cache, max-age=0, private |
| `/resenas` | 5 | 200 | 117.0 | 121.6 | 42181 | MISS | no-store, must-revalidate, no-cache, max-age=0, private |

Representative safe `server-timing` samples:

```text
/ HIT sample: cfCacheStatus;desc="DYNAMIC"; cfEdge;dur=4,cfOrigin;dur=34
/alojamientos HIT sample: cfCacheStatus;desc="DYNAMIC"; cfEdge;dur=4,cfOrigin;dur=37
/alojamientos/refugio-completo MISS sample: cfCacheStatus;desc="DYNAMIC"; cfEdge;dur=3,cfOrigin;dur=130
/disponibilidad HIT sample: cfCacheStatus;desc="DYNAMIC"; cfEdge;dur=3,cfOrigin;dur=45
/resenas MISS sample: cfCacheStatus;desc="DYNAMIC"; cfEdge;dur=3,cfOrigin;dur=64
```

### Summary and comparison

| Route | G.1 median total | G.2 accepted median total | Final median total | G.1 -> Final | G.2 -> Final | Final cache evidence |
| --- | ---: | ---: | ---: | ---: | ---: | --- |
| `/` | ~1593 ms | ~159 ms | 114.3 ms | -92.8% | -28.1% | `HIT`, public revalidated shell |
| `/alojamientos` | ~1255 ms | ~91 ms | 136.8 ms | -89.1% | +50.3% absolute +45.8 ms | first `PRERENDER`, then `HIT` |
| `/alojamientos/refugio-completo` | ~2531 ms | ~181 ms | 137.3 ms | -94.6% | -24.1% | route `MISS`/`no-store`; stable data path warm |
| `/disponibilidad` | ~91 ms | ~92 ms | 118.9 ms | +30.7% absolute +27.9 ms | +29.2% absolute +26.9 ms | first `PRERENDER`, then `HIT`; richer public shell |
| `/resenas` | ~975 ms | ~118 ms | 121.6 ms | -87.5% | +3.1% | route `MISS`/`no-store`; cached review data path warm |

The public server/data-cache improvements remain materially better than G.1. Small absolute
differences versus G.2 on already-fast routes are documented but do not justify reopening accepted
architecture. `/disponibilidad` is no longer the minimal orphaned page from G.1; it now carries the
normal public shell, tabs, localization and CTA while keeping live availability out of stale caches.

## Lighthouse Lab Evidence

Method:

```text
npx --yes lighthouse@latest
Raw JSON reports: %TEMP%\trp-final-g5-lighthouse\*.json
Profiles: mobile default and --preset=desktop
Repository dependency changes: none
```

Lighthouse is lab evidence only. It is not RUM/field data and no INP value is invented.

| Route/report | Score | FCP | LCP | CLS | TBT | Speed Index | Transfer | Requests | Unused JS | Main thread | JS execution |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| `/` mobile | 69 | 2132 ms | 4595 ms | 0.000 | 365 ms | 5041 ms | 669155 B | 29 | 82.8 KiB | 1841 ms | 652 ms |
| `/` desktop | 96 | 882 ms | 1218 ms | 0.000 | 0 ms | 1001 ms | 1133448 B | 50 | 104.0 KiB | 444 ms | 107 ms |
| `/alojamientos` mobile | 76 | 2298 ms | 4996 ms | 0.000 | 134 ms | 3838 ms | 715938 B | 30 | 103.8 KiB | 1072 ms | 391 ms |
| `/alojamientos` desktop | 98 | 733 ms | 1016 ms | 0.000 | 0 ms | 759 ms | 693262 B | 33 | 104.1 KiB | 321 ms | 93 ms |
| `/alojamientos/refugio-completo` mobile | 85 | 980 ms | 3897 ms | 0.000 | 188 ms | 1931 ms | 785308 B | 37 | 160.8 KiB | 1765 ms | 956 ms |
| `/alojamientos/refugio-completo` desktop | 95 | 593 ms | 1433 ms | 0.000 | 0 ms | 858 ms | 828163 B | 41 | 160.7 KiB | 380 ms | 118 ms |
| `/disponibilidad` mobile | 85 | 1772 ms | 3979 ms | 0.000 | 137 ms | 2831 ms | 532103 B | 30 | 82.8 KiB | 1372 ms | 543 ms |
| `/disponibilidad` desktop | 98 | 754 ms | 933 ms | 0.000 | 0 ms | 1037 ms | 572257 B | 32 | 82.8 KiB | 437 ms | 178 ms |
| `/resenas` mobile | 84 | 1753 ms | 4227 ms | 0.000 | 96 ms | 2961 ms | 575465 B | 30 | 103.8 KiB | 1092 ms | 440 ms |
| `/resenas` desktop | 99 | 532 ms | 854 ms | 0.000 | 0 ms | 697 ms | 594361 B | 32 | 103.8 KiB | 324 ms | 107 ms |

Because the first home mobile TBT sample was high, a limited mobile rerun was captured outside Git:

| Rerun route | Score | FCP | LCP | CLS | TBT | Speed Index | Transfer | Requests | Main thread |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| `/` mobile rerun | 82 | 1910 ms | 4432 ms | 0.000 | 69 ms | 3089 ms | 669187 B | 29 | 1163 ms |
| `/disponibilidad` mobile rerun | 83 | 1768 ms | 3978 ms | 0.000 | 182 ms | 3013 ms | 532149 B | 30 | 1421 ms |
| `/resenas` mobile rerun | 77 | 2304 ms | 4771 ms | 0.000 | 154 ms | 3889 ms | 579617 B | 30 | 1094 ms |

### Lighthouse interpretation

| Metric area | G.1 baseline | Final-G result | Classification |
| --- | ---: | ---: | --- |
| `/disponibilidad` desktop CLS | ~0.327 | 0.000 | Improved; primary G.3 browser target preserved. |
| `/disponibilidad` mobile TBT | ~352 ms | 137 ms; rerun 182 ms | Improved. |
| `/disponibilidad` mobile LCP | ~3412 ms | 3979 ms; rerun 3978 ms | Regressed in lab but with CLS/TBT fixed and no functional regression. Owner review remains pending. |
| Detail mobile unused JS | ~218 KiB | 160.8 KiB | Improved. |
| Detail mobile main-thread work | ~2.4 s | 1.765 s | Improved. |
| Detail mobile TBT | ~298 ms | 188 ms | Improved. |
| Detail mobile LCP | ~2478 ms | 3897 ms | Regressed in this lab run; not enough alone to reopen accepted architecture. |
| Home mobile TBT | ~102 ms | 365 ms; rerun 69 ms | First sample regressed; rerun improved, treated as lab variance. |
| Home mobile LCP | ~3067 ms | 4595 ms; rerun 4432 ms | Regressed in lab and recorded as caveat. |
| Reviews mobile LCP | ~2633 ms | 4227 ms; rerun 4771 ms | Regressed in lab and recorded as caveat. |

Final-G.5 does not claim universal Lighthouse improvement. The accepted hard browser outcome
(`/disponibilidad` desktop CLS below 0.10) remains satisfied, the detail route retains the accepted
JS/main-thread reduction, and mobile LCP weaknesses are carried as lab-evidence caveats for owner
review rather than hidden or overcorrected by a new optimization cycle.

## `/disponibilidad` Behavior Verification

Evidence:

```text
Lighthouse final /disponibilidad desktop network requests containing /api/availability: 1
Lighthouse final /disponibilidad mobile network requests containing /api/availability: 1
Request URL: /api/availability?accommodationId=black-white-apartment&startDate=2026-09-29&endDate=2026-11-28
DEFAULT_VISIBLE_DAYS remains 60 in features/availability/components/public-availability-calendar.tsx.
tests/final-g/client-hydration-corrections.test.ts asserts one initial PublicAvailabilityCalendar in PublicAvailabilityPage.
```

The route still uses tabs and one active mounted calendar initially. Tab switching continues to mount
the active accommodation calendar and fetch that accommodation's live availability; no three mounted
calendar regression was found.

## `blocked-dates` Dynamic Endpoint Benchmark

Target:

```text
/api/availability/blocked-dates?startDate=2026-09-01&endDate=2026-10-01
```

Representative accommodations:

| Accommodation | Status | First total | Median header | Median total | Useful range | Bytes | Cache evidence |
| --- | --- | ---: | ---: | ---: | --- | ---: | --- |
| `black-white-apartment` | 200 x5 | 1608.2 ms | 1243.3 ms | 1243.4 ms | 1232.8-1608.2 ms | 251 | `MISS`; `public, must-revalidate, max-age=0` |
| `perfect-retreat-bungalow` | 200 x5 | 1255.8 ms | 1249.3 ms | 1249.8 ms | 1225.3-1292.2 ms | 150 | `MISS`; `public, must-revalidate, max-age=0` |
| `complete-retreat` | 200 x5 | 1228.3 ms | 1232.1 ms | 1232.2 ms | 1228.3-1256.4 ms | 246 | `MISS`; `public, must-revalidate, max-age=0` |

Safe server-timing sample:

```text
cfCacheStatus;desc="DYNAMIC"; cfEdge;dur=12,cfOrigin;dur=1408
```

The endpoint remains live/dynamic and no stale cache was introduced. Source inspection confirms the
accepted G.3 correction remains in place: `app/api/availability/blocked-dates/route.ts` derives
blocked dates from `getAvailabilityBlockingRecords(...)` and does not reintroduce the second direct
Reservation query.

## Tilopay Hardening Verification

No real charge or provider payment was created for G.5. Code/build evidence confirms:

```text
Canonical SDK URL:
https://app.tilopay.com/sdk/v2/sdk_tpay.min.js

No random Date.now cache busting is used for the Tilopay SDK script URL.
Client SDK resource hints remain preconnect/preload only.
Client SDK loading still uses one shared in-flight promise and retry-after-failure behavior.
Server SDK-token cache remains module-memory only.
TILOPAY_SDK_TOKEN_CACHE_SAFETY_BUFFER_MS remains 90_000.
expires_in parsing remains defensive for numeric, numeric-string and datetime forms.
One in-flight server refresh is reused per server instance.
Warm-up endpoint returns bounded readiness/source metadata only and never returns the token.
No token persistence, browser token storage, DB, KV or Redis token store was introduced.
Initial reservation, retry, additional-charge and lifecycle checkout surfaces still gate warm-up on a payable intent.
```

Owner accepted the perceived payment-preparation improvement during G.3. G.5 found no evidence that
requires recreating payment-flow acceptance.

## Admin Evidence Carried Forward

Final-G.4 owner Hosted validation is accepted and carried forward. No Admin runtime change was made
in G.5 and no owner re-test is required before G.5 owner review unless the owner requests it.

Accepted G.4 query timing evidence remains:

```text
Dashboard summary median: ~498.6 ms
Reservations default page median: ~511.4 ms
Calendar black-white September 2026 median: ~645.9 ms
```

Source checks confirm:

```text
Admin route entrypoints use direct imports rather than broad barrels.
Dashboard summary remains parallelized with Promise.all.
Reservations keep PAGE_SIZE plus safe page clamping.
Calendar correctness logic remains intact.
No unstable_cache, public-cache or revalidateTag was added to Admin operational data.
No auth bypass was added.
```

## Permanent Final-G Performance Summary

| Surface | G.1 baseline | Final-G result | Main intervention | Outcome |
| --- | ---: | ---: | --- | --- |
| Home HTTP | ~1593 ms median total | 114.3 ms | G.2 stable public cache/revalidation | Large server response improvement. |
| Listing HTTP | ~1255 ms median total | 136.8 ms | G.2 stable public cache/revalidation | Large server response improvement. |
| Detail HTTP | ~2531 ms median total | 137.3 ms | G.2 cached stable property data + request memoization | Large server response improvement. |
| Reviews HTTP | ~975 ms median total | 121.6 ms | G.2 cached published-review data path | Large server response improvement. |
| Listing JS | 479 kB | 311 kB | G.3 listing/detail graph split | -35.1%; target preserved. |
| Detail JS | 479 kB | 371 kB | G.3 graph split + deferred Tilopay checkout | -22.5%; target preserved. |
| `/disponibilidad` CLS desktop | ~0.327 | 0.000 | G.3 loading geometry + single active calendar shell | Primary browser target preserved. |
| `blocked-dates` | ~1.38-1.39 s accepted G.3 post-hardening median | ~1.23-1.25 s final median | G.3 duplicate Reservation query removal | Dynamic endpoint remains live and modestly faster. |
| Tilopay preparation UX | Previous Hosted owner evidence: 5-6s visible delay | Owner accepted materially faster G.3 UX | Canonical SDK URL, hints, shared promise, server token cache, warm-up | Accepted UX preserved; no real charge in G.5. |
| Admin JS | ~561 kB | 320-343 kB typical; catalogs 478 kB | G.4 direct Admin route imports | Typical Admin pages -38.9% to -43.0%; catalogs -14.8%. |

## Accepted Non-Changes

These are evidence-based non-changes, not omissions:

```text
- No framework migration.
- No broad i18n/Server Component rewrite.
- No /es or /en route tree.
- No custom Cloudinary loader.
- No speculative availability DB indexes.
- No stale Admin operational cache.
- No Redis/KV Tilopay token store.
- No RUM/Speed Insights instrumentation.
- No auth bypass.
- No Production scheduler.
- No Phase-13 provisioning.
```

## Environment Boundary Confirmation

```text
Local checkout .env: TRP_ENVIRONMENT="local".
Hosted validation target: https://trp-booking.juantzun.dev, the accepted stable Test deployment documented as TRP_ENVIRONMENT=test.
vercel.json: {"crons":[]}.
Phase 13 Production resources: absent / not started.
Production provider provisioning: not started.
```

Local and Hosted environment values are intentionally different. G.5 did not change environment
configuration.

## Final-G Permanent Regression Gate

G.5 formalizes the existing accepted Final-G targeted suite as a permanent gate:

```text
npm run final-g:validate
```

It executes:

```text
tsx --tsconfig tests/final-g/tsconfig.json tests/final-g/run.ts
```

The targeted suite remains 48/48. No tests were added merely to inflate the count.

## Validation Ledger

This accepted integrated regression ledger is finalized for the G.5 evidence/gate head
`be8445a2c73a710e451da608fd9e669f8f412ab3`:

```text
npm run final-g:validate — PASS, 48/48.
npm run final-a:validate — PASS, 44/44.
npm run final-b:validate — PASS, 38/38.
npm run final-c:validate — PASS, 41/41.
npm run final-d:validate — PASS, 66/66.
npm run final-e:validate — PASS, 88/88.
npm run final-f:validate — PASS, 125/125.
npm run env:validate — PASS.
npm run db:validate — PASS; Prisma configuration deprecation warning only.
npm run db:generate — PASS; Prisma configuration deprecation warning only.
npm run db:migrate:status — PASS after network-enabled rerun; initial sandbox attempt failed while opening the Supabase schema engine connection.
npm run lint — PASS.
npm run build — PASS after network-enabled rerun; initial sandbox attempt failed only on Google Fonts fetch.
git diff --check — PASS.
```

## Owner Acceptance Package

### What improved

```text
Public server response:
- Home, listing, detail and reviews are materially faster than G.1 HTTP medians.

Public JS/bundle:
- Listing and detail bundles remain materially lower than G.1.
- Reviews bundle remains lower than G.1.

Availability layout:
- Desktop CLS remains 0.000.
- Initial availability page loads one active calendar request, not three.

Payment initialization:
- Accepted G.3 Tilopay hardening is preserved.

Admin bundle:
- Typical Admin routes remain about 39%-43% lower than G.1 Admin baseline.
```

### What intentionally remained dynamic

```text
- availability
- blocked-dates
- holds
- reservations
- payments
- refunds
- private payment/review tokens
- Admin operational data
- provider/webhook state
```

### Remaining caveats

```text
- No field/RUM data is available.
- Lighthouse is lab evidence only and does not provide INP here.
- Provider/network variance remains.
- Serverless warm-instance behavior remains.
- Mobile Lighthouse LCP remains mixed and sometimes worse than G.1 despite HTTP, bundle, CLS and TBT wins.
```

### Regression status

Final-A through Final-G gates passed before owner acceptance. No runtime, schema, migration,
dependency, environment, scheduler or Production-resource change was introduced in G.5.

### Next step

```text
Final-H — Integrated final improvement-track regression and pre-Production closure
```

Final-H has since been completed and accepted on 2026-09-29 at 6922cf27e31e63fde071c0d0a810b141e44b9f90.

## Next State

```text
Final-F — Completed and accepted
Final-G — Completed and accepted on 2026-09-28
Final-G accepted package head — be8445a2c73a710e451da608fd9e669f8f412ab3
Final-G.1 — Completed and accepted
Final-G.2 — Completed and accepted
Final-G.3 — Completed and accepted
Final-G.4 — Completed and accepted
Final-G.5 — Completed and accepted on 2026-09-28 at be8445a2c73a710e451da608fd9e669f8f412ab3
Final-H — Completed and accepted on 2026-09-29 at 6922cf27e31e63fde071c0d0a810b141e44b9f90
Phase 13 — Next / Not started
```
