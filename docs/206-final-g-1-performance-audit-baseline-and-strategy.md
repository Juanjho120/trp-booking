# 206 — Final-G.1: Performance audit, baseline and strategy

## Record

```text
Project: TRP Booking
Track: Post-Phase-12 / Pre-Phase-13 Final Improvement Track
Package: Final-G — Performance audit and optimization
Subphase: Final-G.1 — Performance audit, reproducible baseline and evidence-based optimization strategy
Status: Completed and accepted on 2026-09-28
Document date: 2026-09-28
Implementation/audit base head: d92fd02d800dbc285d972afbfaf6b4fba359384b
Accepted audit/baseline head: 1623389b028be1b0391a2afce6e7c28244ad0fbf
Owner acceptance: Completed on 2026-09-28
Vercel for accepted head: SUCCESS
Final-F accepted feature head: 13f0e0cf6904e34155dd754230f320ca6c214141
Final-G package: Active
Final-G.1: Completed and accepted on 2026-09-28
Final-G.2: Completed and accepted on 2026-09-28 at ecafa2f95314fe485b1e1cc2d6372c40f076964a; Hosted evidence head c09d8d04e0e49a1fdcc8bd2dd5aaeb96e350ed60
Final-G.3: Completed and accepted on 2026-09-28 at e3bcc9709a355b2ce0c6284461f0f4249ad60a5e
Final-G.4: Next / Not started
Final-G.5: Not started
Final-H: Not started
Phase 13: Not started
Runtime feature changes: none
Schema changes: none
Migration changes: none
Dependency changes: none
Production resources: none
vercel.json remains {"crons":[]}
```

G.1 establishes the factual performance baseline for the accepted Final-F application and defines
the remaining evidence-driven Final-G sequence. The owner accepted this audit/baseline on
2026-09-28 at `1623389b028be1b0391a2afce6e7c28244ad0fbf`; this later documentation-only closure
does not replace that accepted G.1 audit/baseline head. G.1 does not implement broad optimizations,
does not start Final-H, and does not activate Phase 13.

## Historical Baseline Caveat

Repository search did not locate a persisted quantitative pre-Final-G artifact with usable
TTFB/LCP/INP/JS/RSC measurements. The search covered the active trackers, Final Improvement Track
records, and historical documentation references for `TTFB`, `LCP`, `INP`, `CLS`, `FCP`,
`Speed Index`, `First Load JS`, `x-vercel-cache`, `server_timing`, and performance-baseline text.

Relevant findings:

```text
docs/160-post-phase-12-pre-phase-13-final-improvement-track.md registered the baseline requirement.
docs/161-final-a-financial-correctness-strategy-and-roadmap.md repeated the baseline requirement.
No quantitative route timing or Core Web Vitals artifact was found.
```

No historical values were fabricated or reconstructed. The current accepted Final-F application at
`d92fd02d800dbc285d972afbfaf6b4fba359384b`, measured and accepted at
`1623389b028be1b0391a2afce6e7c28244ad0fbf`, is therefore the formal Final-G pre-optimization
baseline. Later Final-G comparisons must compare against this G.1 evidence unless the owner provides
an older measurement artifact.

## Route Set

Source inspection identified these current representative routes.

| Surface | Route | Rendering found in build | Notes |
| --- | --- | --- | --- |
| Public landing | `/` | Dynamic | Loads public accommodations and public location settings. |
| Accommodation listing | `/alojamientos` | Dynamic | Loads active public properties. |
| Accommodation detail | `/alojamientos/apartamento-blanco-y-negro`, `/alojamientos/bungalow-refugio-perfecto`, `/alojamientos/refugio-completo` | Dynamic | Representative measured route: `/alojamientos/refugio-completo`. |
| Public booking/availability | `/disponibilidad` and the booking form inside `/alojamientos/[slug]` | `/disponibilidad` static; APIs dynamic | `/disponibilidad` renders three client availability calendars that fetch `/api/availability`. |
| Public reviews | `/resenas` | Dynamic | Included because it is dynamic, public, and user-visible after Final-E. |
| Admin dashboard | `/admin` | Dynamic, protected | Requires existing ADMIN OAuth session. |
| Admin reservations | `/admin/reservations` | Dynamic, protected | Requires existing ADMIN OAuth session. |
| Admin calendar | `/admin/calendar` | Dynamic, protected | Requires existing ADMIN OAuth session. |

No distinct ES/EN route tree was found. Locale behavior is client-side through the shared locale
provider and the same route/rendering paths; therefore G.1 did not create separate HTTP route samples
for ES and EN.

## Hosted HTTP Baseline

Target deployment:

```text
https://trp-booking.juantzun.dev
```

Method:

```text
PowerShell/.NET HttpClient
AllowAutoRedirect=false
HttpCompletionOption.ResponseHeadersRead
5 sequential GET samples per public route
custom cache-busting query parameter used only for measurement identity
```

The `header_ms` value is a response-header-time / TTFB-equivalent from this runner. It is not a
browser Navigation Timing field and is not real-user data. First observed requests are reported as
first observed only; no serverless cold start is claimed.

This accepted hosted synthetic/server baseline is frozen for later Final-G comparison.

### Raw Samples

| Route | Sample | Status | header_ms | total_ms | Bytes | x-vercel-cache | cache-control | Server timing summary |
| --- | ---: | ---: | ---: | ---: | ---: | --- | --- | --- |
| `/` | 1 | 200 | 4751.5 | 4787.0 | 95173 | MISS | no-store, private | cfOrigin 4209ms |
| `/` | 2 | 200 | 1685.1 | 1708.8 | 95173 | MISS | no-store, private | cfOrigin 1630ms |
| `/` | 3 | 200 | 1540.9 | 1558.3 | 95173 | MISS | no-store, private | cfOrigin 1489ms |
| `/` | 4 | 200 | 1552.0 | 1566.0 | 95173 | MISS | no-store, private | cfOrigin 1494ms |
| `/` | 5 | 200 | 1579.3 | 1593.3 | 95173 | MISS | no-store, private | cfOrigin 1526ms |
| `/alojamientos` | 1 | 200 | 1327.7 | 1337.4 | 71709 | MISS | no-store, private | cfOrigin 1270ms |
| `/alojamientos` | 2 | 200 | 1215.3 | 1225.4 | 71709 | MISS | no-store, private | cfOrigin 1167ms |
| `/alojamientos` | 3 | 200 | 1228.2 | 1243.1 | 71709 | MISS | no-store, private | cfOrigin 1174ms |
| `/alojamientos` | 4 | 200 | 1243.3 | 1255.2 | 71709 | MISS | no-store, private | cfOrigin 1194ms |
| `/alojamientos` | 5 | 200 | 1324.8 | 1334.9 | 71709 | MISS | no-store, private | cfOrigin 1277ms |
| `/alojamientos/refugio-completo` | 1 | 200 | 1305.9 | 2277.8 | 85506 | MISS | no-store, private | cfOrigin 1248ms |
| `/alojamientos/refugio-completo` | 2 | 200 | 4855.7 | 4872.1 | 84274 | MISS | no-store, private | cfOrigin 4797ms |
| `/alojamientos/refugio-completo` | 3 | 200 | 1348.7 | 2531.4 | 85506 | MISS | no-store, private | cfOrigin 1291ms |
| `/alojamientos/refugio-completo` | 4 | 200 | 1332.7 | 2563.4 | 85506 | MISS | no-store, private | cfOrigin 1273ms |
| `/alojamientos/refugio-completo` | 5 | 200 | 1336.5 | 2507.1 | 85506 | MISS | no-store, private | cfOrigin 1282ms |
| `/disponibilidad` | 1 | 200 | 145.1 | 148.0 | 23137 | PRERENDER | public, must-revalidate, max-age=0 | cfOrigin 99ms |
| `/disponibilidad` | 2 | 200 | 74.7 | 76.0 | 23137 | HIT | public, must-revalidate, max-age=0 | cfOrigin 28ms |
| `/disponibilidad` | 3 | 200 | 92.7 | 93.7 | 23137 | HIT | public, must-revalidate, max-age=0 | cfOrigin 46ms |
| `/disponibilidad` | 4 | 200 | 79.7 | 80.4 | 23137 | HIT | public, must-revalidate, max-age=0 | cfOrigin 32ms |
| `/disponibilidad` | 5 | 200 | 89.2 | 90.6 | 23137 | HIT | public, must-revalidate, max-age=0 | cfOrigin 44ms |
| `/resenas` | 1 | 200 | 1196.4 | 1200.4 | 36645 | MISS | no-store, private | cfOrigin 1148ms |
| `/resenas` | 2 | 200 | 1013.8 | 1017.5 | 36645 | MISS | no-store, private | cfOrigin 967ms |
| `/resenas` | 3 | 200 | 974.6 | 974.8 | 36645 | MISS | no-store, private | cfOrigin 920ms |
| `/resenas` | 4 | 200 | 948.9 | 952.5 | 36645 | MISS | no-store, private | cfOrigin 899ms |
| `/resenas` | 5 | 200 | 956.2 | 959.8 | 36645 | MISS | no-store, private | cfOrigin 909ms |

### Summary

| Route | First observed total | Median header_ms | Median total_ms | Useful range total_ms | Cache evidence |
| --- | ---: | ---: | ---: | --- | --- |
| `/` | 4787.0ms | 1579.3ms | 1593.3ms | 1558.3-4787.0ms | Dynamic `MISS`, `no-store` |
| `/alojamientos` | 1337.4ms | 1243.3ms | 1255.2ms | 1225.4-1337.4ms | Dynamic `MISS`, `no-store` |
| `/alojamientos/refugio-completo` | 2277.8ms | 1336.5ms | 2531.4ms | 2277.8-4872.1ms | Dynamic `MISS`, `no-store`; one 4.9s outlier |
| `/disponibilidad` | 148.0ms | 89.2ms | 90.6ms | 76.0-148.0ms | `PRERENDER` then `HIT` |
| `/resenas` | 1200.4ms | 974.6ms | 974.8ms | 952.5-1200.4ms | Dynamic `MISS`, `no-store` |

Server-side public HTML is slowest on dynamic property/review routes. `/disponibilidad` proves the
deployment can serve a stable prerendered public route quickly; its remaining performance issues are
more likely client-side and API-waterfall related.

## Lighthouse Lab Baseline

Lighthouse was run as an ephemeral CLI through `npx --yes lighthouse@latest`; no project dependency
was added. Chrome was found at `C:\Program Files\Google\Chrome\Application\chrome.exe`. Raw JSON
reports were saved under `%TEMP%\trp-final-g1-lighthouse-*.json` and were not committed.

Lighthouse is lab evidence only. It is not RUM and does not provide real-user INP here. The owner
accepted this lab baseline as G.1 evidence; field Web Vitals remain unavailable without accepted RUM
or Speed Insights instrumentation.

| Route | Profile | Score | FCP | LCP | CLS | TBT | Speed Index | Transfer | Requests |
| --- | --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| `/` | mobile | 92 | 1153ms | 3067ms | 0.000 | 102ms | 3781ms | 647347 B | 27 |
| `/` | desktop | 93 | 778ms | 1349ms | 0.000 | 0ms | 1655ms | 1092337 B | 46 |
| `/alojamientos/refugio-completo` | mobile | 90 | 1220ms | 2478ms | 0.000 | 298ms | 3642ms | 735016 B | 31 |
| `/alojamientos/refugio-completo` | desktop | 98 | 360ms | 900ms | 0.000 | 0ms | 1318ms | 752895 B | 33 |
| `/disponibilidad` | mobile | 80 | 1807ms | 3412ms | 0.000 | 352ms | 4112ms | 375556 B | 23 |
| `/disponibilidad` | desktop | 84 | 305ms | 502ms | 0.327 | 1ms | 716ms | 375539 B | 23 |
| `/resenas` | mobile | 97 | 983ms | 2633ms | 0.000 | 60ms | 2261ms | 531469 B | 27 |
| `/resenas` | desktop | 99 | 428ms | 817ms | 0.000 | 0ms | 1026ms | 530482 B | 27 |

Major Lighthouse diagnostics:

```text
home mobile: unused JavaScript estimated 91 KiB; main-thread work 1.2s; JS execution 0.4s.
home desktop: unused JavaScript estimated 112 KiB; total transfer 1,067 KiB.
detail mobile/desktop: unused JavaScript estimated 218 KiB; mobile main-thread work 2.4s; JS execution 1.1s.
availability mobile: unused JavaScript estimated 91 KiB; main-thread work 1.7s; JS execution 0.9s.
availability desktop: CLS 0.327 despite fast static HTML.
reviews mobile: main-thread work 1.8s; JS execution 1.1s.
```

Largest image transfer evidence from mobile Lighthouse:

```text
home/detail use Next Image URLs that wrap Cloudinary source URLs.
The primary complete-retreat image was requested as /_next/image?...&w=750&q=75 and transferred about 67 KiB.
Home also loaded listing card images around 50 KiB and 39 KiB.
The current source URL is already Cloudinary-transformed with c_fill,f_auto,h_1200,q_auto,w_1600 before Next re-optimization.
```

## Field Web Vitals Availability

Field Web Vitals are unavailable in the current baseline.

Evidence:

```text
vercel CLI was not installed on PATH.
.vercel/project.json is not present in the checkout.
No @vercel/speed-insights package is declared.
No SpeedInsights component, reportWebVitals hook, web-vitals package, or analytics instrumentation was found.
```

G.1 therefore records no INP field value. Adding RUM instrumentation is a possible later owner
decision, but G.1 does not silently enable a paid service or add runtime packages.

## Build And Payload Audit

`npm run build` passed with Next.js 15.5.23 / Turbopack. The local build emitted a slow-filesystem
warning for `.next`; this is a local environment note, not hosted evidence.

Route classification and first-load JS highlights:

| Route group | Build classification | First Load JS |
| --- | --- | ---: |
| `/` | Dynamic | 311 kB |
| `/alojamientos` | Dynamic | 479 kB |
| `/alojamientos/[slug]` | Dynamic | 479 kB |
| `/disponibilidad` | Static | 213 kB |
| `/resenas` | Dynamic | 312 kB |
| `/admin` and most admin pages | Dynamic | 561 kB |
| Shared by all | n/a | 228 kB |

Largest generated chunks by uncompressed local file size:

```text
0886df99da817436.js — 561.1 KiB
10b8d9cf3e5d7f4d.js — 561.1 KiB
b641f1a27d96e56f.js — 384.3 KiB
6044f90f8b36dbf7.js — 335.1 KiB
0f7c6657817623d6.js — 184.1 KiB
d8d9f1e1fbcad06f.js — 100.6 KiB
```

The app build manifest shows:

```text
/alojamientos and /alojamientos/[slug] share large client chunks including 10b8d9cf3e5d7f4d.js and e20704bdcdf202be.js.
Admin routes share the same large admin client chunk set and first-load JS of 561 kB.
/disponibilidad avoids the property-page chunks and remains much smaller at 213 kB.
```

## Server And Data-Access Audit

| Route | Server component/service path | Prisma/fetch path | Dependency shape |
| --- | --- | --- | --- |
| `/` | `app/page.tsx` -> `HomePage` | `getPublicAccommodations()` + `getPublicLocationSettings()` | Two independent reads already parallelized with `Promise.all`. Public property read is dynamic/no-store. |
| `/alojamientos` | `app/alojamientos/page.tsx` -> `AccommodationsPage` | `getPublicAccommodations()` | One broad active-property read with images, amenities, rules, composed components. Stable content but forced dynamic. |
| `/alojamientos/[slug]` | `generateMetadata()` and page body | `getPublicAccommodationBySlug(slug)` twice | Same active property read is repeated once for metadata and once for page render. |
| `/disponibilidad` | Static server page -> 3 `PublicAvailabilityCalendar` client components | Each calendar calls `/api/availability`; API calls `getAvailabilityBlockingRecords()` | Static shell is fast, but hydration triggers three dynamic availability requests. Each API request resolves property mapping, then reads reservations/calendar blocks/lifecycle holds. |
| `/resenas` | `app/resenas/page.tsx` -> `PublicReviewsPage` | `getPublishedReviews()` | Sequential `review.count()` then `review.findMany()` with published active-property filter. Dynamic/no-store. |
| `/admin` | admin layout/auth -> `getAdminDashboardSummary()` | four counts + upcoming arrivals | Business reads are parallelized. Auth remains required and was not bypassed. |
| `/admin/reservations` | admin layout/auth -> `getAdminReservationsPage()` | properties + count in parallel, then paged reservations | List read depends on safe page clamp after count. |
| `/admin/calendar` | admin layout/auth -> `getAdminPropertyCalendar()` | properties, availability service, calendar-block details, overrides, reservation details | Several data-dependent phases; availability internals are partly parallelized after property mapping. |

Observed issues:

```text
Confirmed: public dynamic routes return no-store and consistently miss Vercel cache.
Strong evidence: property descriptive content is stable enough to consider caching/revalidation after invalidation rules are defined.
Confirmed: detail route repeats the same property lookup for metadata and page render.
Strong evidence: /disponibilidad has a client/API waterfall after a fast static shell.
Strong evidence: published reviews are stable after moderation but currently dynamic/no-store.
Suspected: admin first-load JS is broad because the shared AdminShell/admin component graph loads large chunks across all admin pages.
```

No external provider calls were found on representative public render paths. Availability and
transactional APIs correctly remain server-side and dynamic.

## Rendering And Cache Audit

Stable/cacheable candidates, subject to explicit invalidation rules:

```text
Property descriptive content: names, descriptions, guests, bedrooms, bathrooms, amenities, rules.
Property photos and Cloudinary delivery URL mapping.
Public location settings for the homepage location preview.
Published review listing once moderation changes are invalidated or revalidated.
Pricing configuration for quote calculation only if correctness-preserving cache invalidation is explicit.
```

Dynamic/correctness-sensitive data:

```text
availability and active holds
quote results and date-sensitive pricing
pending reservation holds
authenticated Admin pages
payments/refunds/additional charges
private guest payment/review tokens
Airbnb sync state and external-calendar secrets
email/push/Zoho operational state
```

Current rendering/caching state:

```text
/disponibilidad is static/prerendered and cached by Vercel.
/, /alojamientos, /alojamientos/[slug], and /resenas are force-dynamic.
No revalidate export or unstable_cache/cache wrapper was found on the audited public data reads.
Only app/admin/loading.tsx exists for admin route loading; no public loading.tsx or Suspense boundary was found for the audited public routes.
```

## Client And Hydration Audit

| Route | Client boundary | Reason | Payload/impact evidence | Candidate |
| --- | --- | --- | --- | --- |
| `/` | Hero, accommodation showcase, benefits, location, trust and CTA are client components because they read locale state. | Locale switcher/copy hydration. | 311 kB first-load; Lighthouse mobile LCP 3067ms and unused JS estimate 91 KiB. | Split static public sections into server-rendered shells with smaller locale/client islands, or introduce a server-locale strategy later. |
| `/alojamientos` | Entire `AccommodationsPage` is client. | Locale messages and links/images. | 479 kB first-load. | Server-render static listing markup and keep only locale switcher/navigation as client where possible. |
| `/alojamientos/[slug]` | Entire `PropertyDetailPage` is client; `ReservationRequestForm` imports DayPicker, phone flags and Tilopay checkout statically. | Gallery state, locale, booking form, payment handoff. | 479 kB first-load; Lighthouse detail unused JS 218 KiB; mobile main-thread 2.4s. | Split detail page into static server content plus gallery/form islands; lazy/dynamic load Tilopay checkout only after pending hold exists. |
| `/disponibilidad` | Three `PublicAvailabilityCalendar` client components. | Client fetch and render of availability windows. | Static HTML TTFB is fast; Lighthouse mobile score 80, TBT 352ms; desktop CLS 0.327. | Preserve static shell; reduce calendar hydration/CLS and consider server-seeded or streamed first availability window if evidence supports. |
| `/resenas` | Entire `PublicReviewsPage` is client. | Locale/date formatting and pagination UI. | 312 kB first-load; mobile JS execution 1.1s. | Server-render published reviews where possible; keep locale/date formatting strategy explicit. |
| `/admin/*` | Shared `AdminShell` and admin pages are client-heavy. | Interactive admin UI, filters, notifications, push controls. | 561 kB first-load across admin pages. | Later targeted admin chunk split after authenticated manual timing; do not weaken auth. |

## Images And Cloudinary Audit

Current path:

```text
Cloudinary source URL built in lib/cloudinary/delivery.ts and lib/properties/public.ts
-> Next Image remotePatterns allow the configured Cloudinary namespace
-> browser requests /_next/image?url=<Cloudinary transformed URL>&w=<responsive width>&q=75
```

Findings:

```text
next/image is used for public property images and brand images in audited routes.
Cloudinary URLs are already transformed to c_fill,f_auto,h_1200,q_auto,w_1600 before Next re-optimization.
Lighthouse observed WebP responses through /_next/image, so modern image format is being delivered.
Home/detail primary mobile image transfer was about 67 KiB at w=750,q=75.
The home route loads multiple above/below-the-fold property card images; the hero image uses priority.
No evidence yet justifies replacing Next Image with a direct Cloudinary loader in G.1.
```

Potential later test:

```text
Compare current Next Image proxy against a direct Cloudinary loader for the same hero/card images,
using identical routes and device profiles, before changing architecture.
```

## Suspense And Streaming Audit

| Candidate | Current behavior | Classification |
| --- | --- | --- |
| Public stable property pages | Page waits for property DB read before rendering. | Consider cache/revalidate before streaming; stable data should become faster rather than streamed late. |
| `/disponibilidad` availability windows | Static shell renders first; client calendars fetch after hydration. | Already decoupled from HTML TTFB; consider reducing client/API waterfall and CLS. |
| Booking form availability | Detail page ships and hydrates large form; blocked dates load in client effect. | Consider keeping form island but lazy-loading heavy payment checkout and narrowing static detail hydration. |
| Admin dashboard aggregates | Five business reads already parallelized; page waits for full summary. | Keep blocking unless manual admin timing proves need for Suspense. |
| Admin reservations | Count controls pagination; list follows count. | Potential parallel/streaming only after manual route timing and correctness review. |
| Admin calendar | Data-dependent calendar assembly. | Candidate for targeted query timing/manual measurement; avoid superficial skeletons. |

## Database And Index Audit

Existing relevant index coverage:

```text
Property: slug unique; indexes on status and deletedAt.
PropertyImage: index on propertyId, sortOrder; index on deletedAt.
PropertyAmenity/PropertyRule: unique property/relation pairs and relation indexes.
Reservation: index on propertyId, checkInDate, checkOutDate; index on status; index on guestEmail.
Review: indexes on propertyId, moderationStatus, submittedAt.
CalendarBlock: index on propertyId, startDate, endDate; indexes on source, reservationId, externalCalendarEventId, deletedAt.
LifecycleRequestHold: index on propertyId, startDate, endDate; index on status, expiresAt.
Payment: indexes on reservationId, lifecycleRequestId, purpose, provider/providerReference, status.
AdminNotification/AdminPushDelivery: indexes support notification center and retry processing.
ZohoInboundEmailEvent: eventFingerprint unique plus reservationId/receivedAt indexes.
```

Index candidates are not recommended for implementation in G.1. Possible later candidates require
query evidence:

| Candidate | Query shape | Current coverage | Evidence still required |
| --- | --- | --- | --- |
| Composite active public property lookup | `status=ACTIVE`, `deletedAt=null`, optionally `slug` | `slug` unique; separate status/deletedAt indexes | Measure actual hosted DB/query duration before adding composite index. |
| Published reviews ordering | `moderationStatus=PUBLISHED`, active property filter, order by `submittedAt desc, id desc` | separate `moderationStatus`, `submittedAt`, `propertyId` | Needed only if reviews route remains dynamic or grows large. |
| Admin reservations list | optional `status/propertyId/search`, order by `createdAt desc, id desc` | status, property/date, guestEmail | Search uses `contains` on id/name/email; index benefit is provider-specific and needs query plan evidence. |
| Availability range queries | property/date overlap on Reservation, CalendarBlock, LifecycleRequestHold | matching property/date indexes exist | Current evidence points first to repeated calls/waterfall, not missing indexes. |

## Admin Measurement Boundary

Automated authenticated admin browser timing was not performed because it would require the owner's
existing Google OAuth session. G.1 does not create auth bypasses and does not persist cookies/tokens.

Owner Hosted measurement checklist:

```text
Use the accepted Test deployment: https://trp-booking.juantzun.dev
Use an existing authenticated ADMIN Google session.
Chrome DevTools -> Network: disable cache, preserve log off, capture one first observed navigation and three reloads.
Chrome DevTools -> Performance: capture one reload trace per route on the same device/network.
Routes: /admin, /admin/reservations, /admin/calendar.
Record: HTTP status/redirect, document TTFB, total document time, DOMContentLoaded/load, transferred bytes, JS requests, largest chunks, obvious long tasks, and any route-specific API calls.
Do not export cookies, session tokens, request headers, guest-sensitive row data, PushSubscription values or provider secrets.
```

## Evidence-Ranked Bottlenecks

### Confirmed Bottlenecks

The owner accepted G1-C1, G1-C2, and G1-C3 as authoritative confirmed bottlenecks for subsequent
Final-G work.

| ID | Surface | Evidence | Bottleneck | User impact | Confidence | Candidate fix | Expected metric | Risk |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| G1-C1 | Public dynamic property/review pages | HTTP medians: `/` 1593ms total, `/alojamientos` 1255ms, `/resenas` 975ms; all `no-store`, `x-vercel-cache=MISS`. | Stable public content is served dynamically every request. | Slower first content on public pages. | Confirmed | Define correctness-safe cache/revalidate for property/location/review reads. | Median public TTFB/total response time. | Stale public content if invalidation is incomplete. |
| G1-C2 | Accommodation detail | Source shows `getPublicAccommodationBySlug()` in both `generateMetadata()` and page render. | Duplicate stable property read in one request. | Detail route TTFB and total response time are higher than necessary. | Confirmed | Per-request memoization/cache or shared route loader; preserve 404/metadata behavior. | Detail median TTFB and outlier reduction. | Metadata/page data mismatch if implemented carelessly. |
| G1-C3 | `/disponibilidad` | HTTP median 90.6ms static HIT, but Lighthouse mobile score 80, LCP 3412ms, TBT 352ms, desktop CLS 0.327. | Client-side calendar hydration/layout after a fast shell. | Availability page feels slow despite fast HTML. | Confirmed | Stabilize calendar layout and reduce hydration/API waterfall. | LCP/TBT/CLS. | Availability correctness and active holds must remain live. |

### Optimization Opportunities

The owner accepted G1-O1 through G1-O5 as evidence-ranked opportunities, with G1-O5 still requiring
authenticated owner measurement before protected-route corrections.

| ID | Surface | Evidence | Bottleneck | User impact | Confidence | Candidate fix | Expected metric | Risk |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| G1-O1 | Property detail client bundle | Build first-load 479 kB; Lighthouse detail unused JS 218 KiB; form statically imports DayPicker, phone flags and Tilopay checkout. | Large hydration boundary and heavy libraries on detail route. | Slower mobile interaction readiness. | Strong evidence | Split static detail from gallery/form islands; lazy-load Tilopay checkout only after pending hold. | First Load JS, TBT, JS execution. | Booking/payment flow must remain unchanged. |
| G1-O2 | Accommodation listing page | Entire page is client; first-load 479 kB. | Listing content mostly static but hydrates as a full client page. | Extra JS for browsing accommodations. | Strong evidence | Server-render listing cards with smaller locale/client islands. | First Load JS, mobile main-thread. | ES/EN copy behavior must remain correct. |
| G1-O3 | Reviews page | Sequential count then findMany; entire page client; dynamic no-store. | Stable published reviews pay DB and hydration cost every request. | Slower public social-proof page. | Strong evidence | Cache/revalidate published review listing after moderation; consider safe count/list parallelization. | TTFB and JS execution. | Moderation must invalidate promptly. |
| G1-O4 | Home images/payload | Lighthouse desktop transfer about 1,067 KiB; multiple `_next/image` Cloudinary card images. | Media payload plus dynamic HTML. | LCP and transfer on landing. | Strong evidence | After server/cache fixes, compare image sizing/direct Cloudinary loader versus current Next Image. | LCP and transferred bytes. | Avoid losing responsive image behavior. |
| G1-O5 | Admin client bundle | Build reports 561 kB first-load for admin pages. | Broad shared admin client graph. | Admin pages may feel heavy on Android PWA. | Suspected / needs authenticated measurement | Owner DevTools timing, then split route-specific admin components if needed. | Admin JS bytes, long tasks. | Avoid breaking protected admin workflows. |

### Non-Issues / Not First Targets

| Surface | Evidence | Decision |
| --- | --- | --- |
| Framework rewrite | Next can serve `/disponibilidad` as static HIT in ~90ms median; lab scores are generally acceptable outside targeted mobile/client issues. | No evidence supports replacing Next.js/App Router. |
| Next Image immediate replacement | Lighthouse shows WebP delivery and modest primary image transfer around 67 KiB mobile. | Do not replace image path before direct comparison. |
| Availability DB indexes | Existing property/date indexes cover the observed overlap query shape. | First investigate repeated calls/waterfall and client behavior. |
| Admin bypass automation | Admin routes require OAuth and protected sessions. | No auth bypass; use owner manual measurement checklist. |

2026-09-28 closure note: Final-G.3 completed and accepted G1-C3, G1-O1, G1-O2 and G1-O4 at
`e3bcc9709a355b2ce0c6284461f0f4249ad60a5e`. No image-loader architecture change was justified by
the accepted evidence, so the Next Image + Cloudinary boundary remains in place. G1-O5 remains the
G.4 admin/protected-route measurement and correction scope.

## Proposed Remaining Final-G Sequence

The owner accepted this remaining sequence. Final-G should remain small and evidence-driven:

```text
Final-G.2 — Public server/data/cache corrections
  Addresses G1-C1, G1-C2, G1-O3.
  Expected metrics: lower median TTFB for /, /alojamientos, /alojamientos/[slug], /resenas.
  Risks: stale property/review content; must define invalidation/revalidation before coding.

Final-G.3 — Client/hydration and image-path corrections
  Addresses G1-C3, G1-O1, G1-O2, G1-O4.
  Expected metrics: lower First Load JS, mobile TBT/JS execution, availability CLS, and route LCP where image/payload evidence supports it.
  Risks: ES/EN locale behavior, booking form, payment handoff, availability correctness.

Final-G.4 — Admin/query timing and targeted protected-route corrections
  Addresses G1-O5 and any owner-measured admin bottlenecks.
  Expected metrics: admin route document timing, JS bytes, long tasks, and query phases.
  Risks: Auth/Admin authorization and operational workflows.

Final-G.5 — Hosted comparison, permanent performance evidence and Final-G closure
  Re-runs G.1 HTTP/Lighthouse/admin checklist after accepted changes.
  Expected metrics: documented before/after deltas; no Final-A/B/C/D/E/F regression.
  Risks: avoid marking performance accepted without owner review.
```

Do not implement these subphases automatically. Final-G.2 was explicitly requested and implemented in docs/207. Final-G.3 was explicitly requested and implemented in docs/208. Do not implement Final-G.4 automatically.

## Performance Budgets And Acceptance Targets

Reference Core Web Vitals thresholds:

```text
LCP good: <= 2.5s; needs improvement: <= 4.0s; poor: > 4.0s.
INP good: <= 200ms; needs improvement: <= 500ms; poor: > 500ms.
CLS good: <= 0.1; needs improvement: <= 0.25; poor: > 0.25.
```

TRP-specific Final-G targets derived from this baseline:

```text
Reduce median hosted header time for dynamic public content routes by at least 35% where cache/revalidation is accepted.
Eliminate the duplicate detail property read or prove it is no longer present through source/test evidence.
Keep /disponibilidad HTML static/prerendered while reducing Lighthouse desktop CLS below 0.10 and improving mobile LCP/TBT from the G.1 baseline.
Reduce /alojamientos and /alojamientos/[slug] First Load JS from 479 kB by at least 20% if page/client splitting is accepted.
Do not regress availability correctness, active hold behavior, quote/pricing correctness, payment/refund flows, Auth/Admin authorization, Airbnb, email, reviews, Final-F notifications/Web Push, Zoho inbound metadata, or ES/EN behavior.
Do not use Lighthouse score alone as acceptance evidence.
```

## Regression Boundary

Performance work must preserve:

```text
reservation availability
active pending holds
composed-listing blocking rules
pricing rules and quote correctness
financial correctness
Auth/Admin authorization
Tilopay
Airbnb import/export behavior
email delivery and retry behavior
reviews/invitations/moderation
Final-F notification center/Web Push
Zoho inbound metadata privacy
ES/EN visible behavior
```

Caching must never serve stale transactional state where correctness requires live data.

## Validation Ledger

The host Node.js runtime returned `uv_os_get_passwd` / `ENOMEM` when `tsx` called
`node:os.userInfo()`. `tsx`-based commands were therefore executed with a temporary non-repository
`NODE_OPTIONS` shim that reads the username from environment variables; the initial unshimmed
`npm run final-a:validate` attempt failed before loading any test code. Network-dependent commands
that require external provider access were retried outside the sandbox when needed.

```text
npm run final-a:validate — PASS, 44/44
npm run final-b:validate — PASS, 38/38
npm run final-c:validate — PASS, 41/41
npm run final-d:validate — PASS, 66/66
npm run final-e:validate — PASS, 88/88
npm run final-f:validate — PASS, 125/125
npm run env:validate — PASS
npm run db:validate — PASS
npm run db:generate — PASS
npm run db:migrate:status — PASS outside sandbox; initial sandbox attempt returned a Prisma Schema engine error with no detail
npm run lint — PASS
npm run build — PASS outside sandbox; initial sandbox attempt failed fetching Google Fonts
git diff --check — PASS
```

Acceptance closure validation on 2026-09-28:

```text
npm run final-a:validate — PASS, 44/44
npm run final-b:validate — PASS, 38/38
npm run final-c:validate — PASS, 41/41
npm run final-d:validate — PASS, 66/66
npm run final-e:validate — PASS, 88/88
npm run final-f:validate — PASS, 125/125
npm run env:validate — PASS
npm run db:validate — PASS
npm run db:migrate:status — PASS outside sandbox; initial sandbox attempt returned a Prisma Schema engine error with no detail
npm run lint — PASS
npm run build — PASS outside sandbox; initial sandbox attempt failed fetching Google Fonts
git diff --check — PASS
```

G.1 added no runtime feature, schema, migration, dependency, environment variable, cron, or
Production-resource change.

## Next State

```text
Final-F — Completed and accepted
Final-G — Active
Final-G.1 — Completed and accepted on 2026-09-28 at 1623389b028be1b0391a2afce6e7c28244ad0fbf
Final-G.2 — Completed and accepted on 2026-09-28 at ecafa2f95314fe485b1e1cc2d6372c40f076964a; Hosted evidence head c09d8d04e0e49a1fdcc8bd2dd5aaeb96e350ed60
Final-G.3 — Completed and accepted on 2026-09-28 at e3bcc9709a355b2ce0c6284461f0f4249ad60a5e
Final-G.4 — Next / Not started
Final-G.5 — Not started
Final-H — Not started
Phase 13 — Not started
```
