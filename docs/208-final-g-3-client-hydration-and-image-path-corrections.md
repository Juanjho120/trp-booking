# 208 — Final-G.3: Client/hydration and image-path corrections

## Record

```text
Project: TRP Booking
Track: Post-Phase-12 / Pre-Phase-13 Final Improvement Track
Package: Final-G — Performance audit and optimization
Subphase: Final-G.3 — Client/hydration and image-path corrections
Status: Hardening implemented; Hosted owner revalidation + acceptance pending
Document date: 2026-09-28
Implementation base head: b190bb45275a72c8c0126ae646e5d3112255dccd
Accepted G.1 baseline head: 1623389b028be1b0391a2afce6e7c28244ad0fbf
Accepted G.2 feature head: ecafa2f95314fe485b1e1cc2d6372c40f076964a
G.2 Hosted evidence head: c09d8d04e0e49a1fdcc8bd2dd5aaeb96e350ed60
Final-G package: Active
Final-G.1: Completed and accepted on 2026-09-28
Final-G.2: Completed and accepted on 2026-09-28
Final-G.3: Hardening implemented; Hosted owner revalidation + acceptance pending
Final-G.4: Not started
Final-G.5: Not started
Final-H: Not started
Phase 13: Not started
Schema changes: none
Migration changes: none
Dependency changes: none
Environment variable changes: none
Production resources: none
Admin runtime behavior: unchanged
vercel.json remains {"crons":[]}
```

G.3 addresses the accepted G.1 findings owned by the client/hydration and image-path subphase:

```text
G1-C3 — /disponibilidad hydration/layout cost.
G1-O1 — property-detail heavy client boundary.
G1-O2 — accommodation listing broad client boundary.
G1-O4 — home media/image payload investigation.
```

G.3 does not start G.4 admin/query timing, G.5 hosted comparison/Final-G closure, Final-H, or
Phase 13.

## Frozen Safety Boundary

The accepted ES/EN architecture remains client-side and unchanged:

```text
features/i18n/use-locale.tsx remains the source of client locale state.
The localStorage key remains trp-booking.locale.
The custom event remains trp-booking:locale-change.
The storage event listener remains in place.
LocaleSwitcher behavior remains unchanged.
No locale cookies, middleware locale routing, /es or /en route trees, i18n framework,
server-session locale, or wholesale Server Component conversion was introduced.
```

The booking form remains visible on the property detail page. G.3 does not hide the form behind a
manual "load booking form" action.

## Baseline Build Before Runtime Edits

Per the G.3 contract, `npm run build` was run before changing runtime code. The sandbox attempt was
blocked by Google Fonts network access; the same build passed outside the sandbox. The post-G.2
First Load JS baseline was:

| Route group | Post-G.2 baseline First Load JS |
| --- | ---: |
| `/` | 311 kB |
| `/alojamientos` | 479 kB |
| `/alojamientos/[slug]` | 479 kB |
| `/disponibilidad` | 213 kB |
| `/resenas` | 312 kB |
| `/admin` and most admin pages | 561 kB |
| Shared by all | 228 kB |

Build-manifest inspection showed that `/alojamientos` and `/alojamientos/[slug]` both pulled the
same broad property client graph through the `features/properties` barrel import. The listing route
therefore paid for the detail route's reservation/payment graph even though the listing UI does not
need that functionality.

## Implementation

### Listing/detail graph split

The public listing and detail route server files now import their client pages directly:

```text
app/alojamientos/page.tsx
  imports AccommodationsPage from features/properties/components/accommodations-page

app/alojamientos/[slug]/page.tsx
  imports PropertyDetailPage from features/properties/components/property-detail-page
```

The `features/properties` barrel remains available for existing consumers, but these two public
routes no longer force each other into the same initial client graph.

### Deferred Tilopay checkout branch

`ReservationRequestForm` no longer imports `TilopaySdkCheckout` statically. Instead:

```text
ReservationRequestForm initial graph
-> keeps quote, blocked-date, pending-hold and form UX intact
-> preloads the Tilopay checkout component as soon as pending-hold creation starts
-> renders the checkout only after a pending hold exists
-> keeps the existing auto-scroll through onPaymentFormReady
```

The external Tilopay SDK lifecycle remains in `features/payments/components/tilopay-sdk-checkout.tsx`
and remains the shared checkout boundary for all runtime consumers:

```text
session creation
SDK script loading
Tilopay.Init
payment preflight
Tilopay.startPayment
client telemetry
retry/error handling
```

Runtime consumer inventory after the owner hardening pass:

```text
Initial reservation payment:
  features/reservations/components/reservation-request-form.tsx
  dynamically imports TilopaySdkCheckout after pending-hold creation starts.

Payment retry:
  features/payments/components/payment-retry-page.tsx
  renders TilopaySdkCheckout directly for retry handoff.

Additional/service-charge private payment:
  features/payments/components/additional-charge-payment-page.tsx
  renders TilopaySdkCheckout for GuestPaymentRequest ancillary collection.

Lifecycle/date-change payment:
  features/payments/components/lifecycle-adjustment-payment-page.tsx
  renders TilopaySdkCheckout for approved lifecycle adjustment handoff.
```

Local build-manifest evidence after the split:

```text
/alojamientos/page route chunks: listing-specific chunks only, no property-detail route chunk.
/alojamientos/[slug]/page route chunks: detail/form chunks, but no deferred Tilopay checkout chunk.
Tilopay payment-field code (tlpy_cc_number/window.Tilopay) is emitted in async chunk 8209c5ba6f79410d.js and is absent from the initial detail route manifest.
```

### Availability loading geometry and formatter

`PublicAvailabilityCalendar` now renders a loading skeleton that reserves the same responsive grid
shape as the loaded 60-day window:

```text
grid-cols-2 on small screens
sm:grid-cols-3
lg:grid-cols-4
min-h-20 day-card geometry
role="status" loading label
aria-hidden skeleton cards
```

The live availability contract remains unchanged:

```text
DEFAULT_VISIBLE_DAYS remains 60.
The component still fetches /api/availability with the same accommodation/date-range semantics.
AbortController behavior remains in place.
Retry/error behavior remains in place.
Availability and active holds remain live dynamic data.
```

`formatCalendarDate()` now uses one module-level `Intl.DateTimeFormat("es-GT", ...)` instance rather
than constructing a formatter for every day card render.

## Final-G.3 Hardening After Owner Hosted Findings

Owner Hosted validation after the initial G.3 implementation found three guest-facing issues:

```text
H1 — /disponibilidad was not integrated into the public shell and rendered all three calendars.
H2 — Tilopay card fields had a visible 5-6 second preparation delay on shared checkout surfaces.
H3 — DayPicker was visible immediately, but /api/availability/blocked-dates took about 2 seconds.
```

This hardening pass is part of Final-G.3, not a new numbered subphase. Final-G.4, Final-G.5,
Final-H and Phase 13 remain Not started.

### Public /disponibilidad shell and tabs

`/disponibilidad` now follows the normal public-site pattern:

```text
app/disponibilidad/page.tsx
  -> getPublicAccommodations()
  -> PublicAvailabilityPage
  -> SiteHeader
  -> localized main content
  -> SiteFooter
```

The page now consumes the accepted G.2 cached public accommodation DTO for stable presentation data
only: accommodation id, localized name, localized description, public price, public slug and guest
capacity. Live availability remains outside the G.2 stable-content cache and still comes from
`/api/availability`.

Public navigation now includes:

```text
ES: Disponibilidad -> /disponibilidad
EN: Availability -> /disponibilidad
```

Visible availability copy moved into `messages/es.ts` and `messages/en.ts`; the former
feature-local `features/availability/copy.ts` file was removed. The page no longer says booking or
payment is disabled. The footer note was also reconciled so the availability page shell does not
reintroduce obsolete "coming soon" booking/payment wording.

Tabs use the existing Radix/shadcn `Tabs` primitives. Only the active accommodation renders
`PublicAvailabilityCalendar`, so initial load no longer mounts/fetches all three 60-day calendars.
Each active tab shows a bounded summary plus the CTA:

```text
ES: Ver alojamiento y reservar
EN: View accommodation and book
Target: /alojamientos/{slug}
```

Because `/disponibilidad` now consumes stable public accommodation data, public property invalidation
also revalidates `/disponibilidad` through `revalidatePublicPropertiesCache()`. The availability API
itself remains force-dynamic/live.

### Shared Tilopay initialization hardening

The Tilopay SDK loader is hardened in the shared `TilopaySdkCheckout` boundary used by initial
reservation, retry, additional-charge and lifecycle-adjustment checkout surfaces.

The SDK script URL is now canonical:

```text
https://app.tilopay.com/sdk/v2/sdk_tpay.min.js
```

The previous random cache-busting URL (`?v=${Date.now()}`) was removed. No accepted Tilopay contract
in the repository requires a random SDK query string, and randomizing the URL prevented normal browser
reuse of the public SDK resource.

When `TilopaySdkCheckout` mounts, it now adds safe resource hints only:

```text
preconnect: https://app.tilopay.com
preload script: https://app.tilopay.com/sdk/v2/sdk_tpay.min.js
```

This does not call `Tilopay.Init`, does not call `/api/payments/tilopay/sdk-session`, does not create
a Payment, and does not prepare a provider token before the accepted user action. The explicit
`Prepare secure payment` flow remains authoritative.

SDK loading now converges on one shared in-flight promise:

```text
window.Tilopay already available -> resolve immediately
SDK currently loading -> reuse the same promise
SDK failed to load -> clear the promise and remove the failed script tag so retry is possible
SDK not loaded -> append one canonical script tag
```

Server-side SDK-session creation still validates payable state before provider token acquisition.
After each branch has prepared a valid payable target, `ensurePaymentProviderReference(...)` and
`requestTilopaySdkToken()` run concurrently because they are independent at that point:

```text
initial reservation branch: after createPaymentAttemptForPendingReservation + Payment lookup
additional/service-charge branch: after prepareGuestPaymentRequestPayment
lifecycle branch: after prepareLifecycleAdjustmentPayment
```

No token caching was added. The provider token lifetime was not assumed or guessed.

Safe pre-hardening public SDK-resource measurement, without tokens or payment data:

| URL | Samples | Status | Timing | Bytes |
| --- | ---: | --- | --- | ---: |
| canonical SDK URL | 3 | 200 | first 707.4ms; warm 367.0ms / 363.7ms | 42926 |
| cache-busted SDK URL sample | 3 | 200 | 349.4ms / 373.9ms / 364.3ms | 42926 |

The visible 5-6 second checkout delay could not be fully decomposed in repository-only validation
because that requires valid Hosted Test handoffs for initial reservation, additional charge and retry
payment. Those measurements remain in the owner Hosted revalidation checklist below.

### Blocked-dates route optimization

Before code changes, Hosted Test `blocked-dates` samples for the current visible month confirmed the
owner-observed latency:

| Accommodation | Samples | Status | Time range | Median-ish observation | Bytes |
| --- | ---: | --- | ---: | ---: | ---: |
| `black-white-apartment` | 3 | 200 | 1661.9-2179.6ms | about 1686.6ms | 251 |
| `perfect-retreat-bungalow` | 3 | 200 | 1628.7-1724.4ms | about 1718.9ms | 150 |
| `complete-retreat` | 3 | 200 | 1609.2-1803.5ms | about 1654.4ms | 246 |

The route previously called `getAvailabilityBlockingRecords(...)` and then performed a separate
Reservation query through `getReservationBlockedDates(...)`. Deterministic regression coverage now
proves that `getAvailabilityBlockingRecords(...)` already emits the required direct reservation
blocking records with:

```text
CONFIRMED direct reservations
active PENDING_PAYMENT holds
expired PENDING_PAYMENT exclusion
checkout-date exclusivity
preparation buffers
complete-retreat blocking child accommodations
child accommodation blocking complete-retreat
CalendarBlock records
LifecycleRequestHold records
admin-unlocked preparation buffer suppression
```

`/api/availability/blocked-dates` now derives `blockedDates` from the already-fetched availability
blocking records and removes the second Reservation DB round trip. Availability remains fully live:
no long-lived cache, no ISR, no stale transactional state, no change to eager client fetch on mount
or month change.

Hosted post-deploy measurement is still pending because this commit has not yet deployed at the time
of this documentation update.

### Post-hardening local build evidence

`npm run build` was rerun after the owner-finding hardening changes. The current local build keeps
the accepted listing/detail bundle improvements within normal build-output variance:

| Route group | Post-G.2 baseline | G.3 accepted feature build | G.3 hardening build | Hardening assessment |
| --- | ---: | ---: | ---: | --- |
| `/` | 311 kB | 303 kB | 304 kB | No material regression. |
| `/alojamientos` | 479 kB | 311 kB | 312 kB | Still about 34.9% lower than Post-G.2. |
| `/alojamientos/[slug]` | 479 kB | 371 kB | 372 kB | Still about 22.3% lower than Post-G.2. |
| `/disponibilidad` | 213 kB | 214 kB | 311 kB | Intentional hardening tradeoff for the full public shell, tabs and localized page UX; CLS revalidation remains pending Hosted owner review. |
| `/resenas` | 312 kB | 219 kB | 219 kB | No material regression. |
| `/admin` and most admin pages | 561 kB | 550 kB | 552 kB | Incidental; G.4 not started. |
| Shared by all | 228 kB | 220 kB | 230 kB | No material public target regression found. |

The hardening request froze the accepted `/alojamientos` and `/alojamientos/[slug]` route-graph
improvements and `/disponibilidad` desktop CLS target; it did not require keeping the orphaned
availability page's smaller bundle after integrating the normal public shell. Hosted CLS and
single-initial-calendar behavior still require post-deploy owner revalidation.

### DayPicker and country flags

DayPicker and country flags remain static in the reservation form. This is intentional.

```text
DayPicker and country flags remain static because the route-level target was already met after
the safe route-graph split and Tilopay checkout deferral, and lazy-loading the date/country controls
would risk slower first interaction in the booking form without stronger evidence.
```

### Image-path decision

No image loader architecture change was made in G.3.

Accepted G.1 evidence already showed that the current path delivered WebP through Next Image with
the primary mobile image around 67 KiB, and no new evidence during G.3 justified replacing the
accepted Next Image + Cloudinary remote-pattern boundary. G.3 therefore keeps:

```text
Cloudinary source URLs
Next Image responsive sizing
configured Cloudinary remotePatterns
no custom loaderFile
no direct Cloudinary loader switch
```

Home route First Load JS still improved incidentally from the route-graph split, but no home image
runtime behavior was changed.

## Local Build Evidence After Implementation

`npm run build` after G.3 passed outside the sandbox. The sandbox build remains blocked by Google
Fonts network access.

| Route group | Post-G.2 baseline | G.3 local build | Change |
| --- | ---: | ---: | ---: |
| `/` | 311 kB | 303 kB | 2.6% lower |
| `/alojamientos` | 479 kB | 311 kB | 35.1% lower |
| `/alojamientos/[slug]` | 479 kB | 371 kB | 22.5% lower |
| `/disponibilidad` | 213 kB | 214 kB | 0.5% higher |
| `/resenas` | 312 kB | 219 kB | 29.8% lower |
| `/admin` and most admin pages | 561 kB | 550 kB | incidental; G.4 not started |
| Shared by all | 228 kB | 220 kB | 3.5% lower |

The G.3 listing and detail target was to reduce `/alojamientos` and `/alojamientos/[slug]` First
Load JS from 479 kB by at least 20% if page/client splitting was safe. The local build meets that
target:

```text
/alojamientos: 35.1% lower
/alojamientos/[slug]: 22.5% lower
```

The `/disponibilidad` JS change is a deliberate small tradeoff for stable loading geometry and the
accepted CLS correction path. Hosted Lighthouse desktop CLS validation remains pending.

## Hosted Lighthouse Evidence After G.3

Hosted target:

```text
https://trp-booking.juantzun.dev
```

Method:

```text
npx --yes lighthouse@latest
Lighthouse version: 13.5.0
Chrome: C:\Program Files\Google\Chrome\Application\chrome.exe
Profiles: default mobile and --preset=desktop
Routes: /, /alojamientos, /alojamientos/refugio-completo, /disponibilidad
Raw JSON reports: %TEMP%\trp-final-g3-lighthouse\*.json
Repository dependency changes: none
```

The raw Lighthouse JSON reports remain outside Git. Lighthouse remains lab evidence only; the
performance score is recorded as contextual information only and is not the G.3 acceptance basis. No
RUM or field INP data was collected, and no INP value is invented here.

| Route | Profile | Score | FCP | LCP | CLS | TBT | Speed Index | Transfer | Requests | Unused JS | Main thread | JS execution |
| --- | --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| `/` | mobile | 81 | 2100ms | 4706ms | 0.000 | 38ms | 2466ms | 664915 B | 30 | 103 KiB | 1251ms | 414ms |
| `/` | desktop | 98 | 804ms | 1070ms | 0.000 | 5ms | 833ms | 1100855 B | 49 | 82 KiB | 465ms | 176ms |
| `/alojamientos` | mobile | 85 | 1765ms | 4033ms | 0.000 | 110ms | 2741ms | 702111 B | 31 | 82 KiB | 1271ms | 524ms |
| `/alojamientos` | desktop | 99 | 323ms | 963ms | 0.000 | 0ms | 461ms | 666838 B | 35 | 82 KiB | 275ms | 102ms |
| `/alojamientos/refugio-completo` | mobile | 88 | 1392ms | 3533ms | 0.000 | 89ms | 4426ms | 771114 B | 37 | 179 KiB | 1677ms | 612ms |
| `/alojamientos/refugio-completo` | desktop | 98 | 530ms | 1090ms | 0.000 | 1ms | 705ms | 789116 B | 39 | 179 KiB | 466ms | 183ms |
| `/disponibilidad` | mobile | 82 | 1749ms | 3530ms | 0.000 | 286ms | 4036ms | 377154 B | 24 | 82 KiB | 1242ms | 450ms |
| `/disponibilidad` | desktop | 100 | 400ms | 707ms | 0.000 | 0ms | 789ms | 381243 B | 24 | 82 KiB | 392ms | 85ms |

### G.1 Comparison

| Route/profile | G.1 baseline | G.3 hosted result | Result |
| --- | --- | --- | --- |
| `/` mobile LCP | ~3067ms | 4706ms | Regressed in this lab run. Not a G.3 hard target; do not chase without additional evidence. |
| `/` mobile TBT | ~102ms | 38ms | Improved by about 63%. |
| `/` mobile unused JS | ~91 KiB | 103 KiB | Slightly higher in Lighthouse diagnostics. |
| `/alojamientos/refugio-completo` mobile LCP | ~2478ms | 3533ms | Regressed in this lab run. |
| `/alojamientos/refugio-completo` mobile TBT | ~298ms | 89ms | Improved by about 70%. |
| `/alojamientos/refugio-completo` mobile unused JS | ~218 KiB | 179 KiB | Improved by about 18%. |
| `/alojamientos/refugio-completo` mobile main-thread work | ~2.4s | 1.677s | Improved by about 30%. |
| `/disponibilidad` mobile LCP | ~3412ms | 3530ms | Effectively similar / slightly worse by about 3.5%. |
| `/disponibilidad` mobile TBT | ~352ms | 286ms | Improved by about 19%. |
| `/disponibilidad` desktop CLS | ~0.327 | 0.000 | PASS. Primary G.3 hard target `< 0.10` is met. |

`/alojamientos` did not have an accepted G.1 Lighthouse baseline row, so the G.3 Lighthouse values
are recorded as new contextual evidence only.

### Hosted Lighthouse Assessment

The primary G.3 hosted performance target passes:

```text
/disponibilidad desktop CLS: 0.000, below the < 0.10 target.
```

Mobile availability behavior is mixed but acceptable for this evidence pass: LCP is effectively in
the same lab range as G.1 while TBT improves from ~352ms to 286ms. Detail mobile shows the intended
JavaScript/main-thread improvement but a worse lab LCP in this single run. Because G.3 was explicitly
not a task to chase Lighthouse by changing runtime behavior, no additional implementation change was
made from these lab results.

## Hosted Bundle And Manifest Evidence

The accepted local build evidence remains the bundle evidence for G.3:

| Route group | Post-G.2 baseline | G.3 local build | Change |
| --- | ---: | ---: | ---: |
| `/` | 311 kB | 303 kB | 2.6% lower |
| `/alojamientos` | 479 kB | 311 kB | 35.1% lower |
| `/alojamientos/[slug]` | 479 kB | 371 kB | 22.5% lower |
| `/disponibilidad` | 213 kB | 214 kB | 0.5% higher |
| `/resenas` | 312 kB | 219 kB | 29.8% lower |

The current `.next/app-build-manifest.json` still shows that the property-detail initial route
manifest does not include the deferred Tilopay payment-field chunk. The detail route's initial
client chunk `c8c67909dbe80e05.js` references the async chunk `8209c5ba6f79410d.js`.

Deferred Tilopay chunk evidence:

```text
Async chunk: static/chunks/8209c5ba6f79410d.js
Size: 12575 bytes
Contains: TilopaySdkCheckout, tlpy_cc_number, tlpy_cvv, window.Tilopay, TILOPAY_SDK_SCRIPT_LOAD_ERROR
Absent from initial /alojamientos/[slug]/page manifest: yes
```

This code was moved out of the initial property-detail route cost; it was not removed.

## Hosted G.2 Server-Performance Smoke After G.3

Method:

```text
PowerShell/.NET HttpClient
AllowAutoRedirect=false
HttpCompletionOption.ResponseHeadersRead
5 sequential GET samples per canonical route
No cache-busting query parameters
```

| Route | Status | First observed total | Median header_ms | Median total_ms | Useful total range | Bytes | Cache evidence | G.2 accepted median reference | Smoke result |
| --- | --- | ---: | ---: | ---: | --- | ---: | --- | ---: | --- |
| `/` | 200 x5 | 535.2ms | 82.0ms | 97.7ms | 85.3-535.2ms | 95999 | `STALE`, age ~308-309 | ~159ms | No material regression; faster median. |
| `/alojamientos` | 200 x5 | 87.8ms | 79.1ms | 87.9ms | 87.3-246.2ms | 71798 | mostly `STALE`, one `HIT` | ~91ms | No material regression. |
| `/alojamientos/refugio-completo` | 200 x5 | 168.1ms | 118.7ms | 148.2ms | 128.6-174.8ms | 84441 | `MISS`, `no-store` | ~181ms | No material regression; faster median. |
| `/resenas` | 200 x5 | 981.4ms | 121.9ms | 126.3ms | 115.3-981.4ms | 42098 | `MISS`, `no-store` | ~118ms | Median remains comparable; first sample outlier only. |
| `/disponibilidad` | 200 x5 | 88.9ms | 80.3ms | 87.4ms | 86.4-90.4ms | 62162 | `HIT`, age ~166-168 | ~92ms document timing | No material regression; faster median. |

Observed headers confirm G.2 cache behavior remains active for stable public pages and the static
availability shell. No material server-performance regression was found, so no runtime investigation
or optimization was started.

## Targeted Regression Coverage

`tests/final-g` now covers the accepted G.2 cache contract plus G.3 client/hydration boundaries:

```text
G.2 cache and invalidation behavior remains covered.
Locale architecture remains localStorage/event/storage based.
No locale cookies, middleware locale routing, /es or /en route trees were added.
Property listing/detail client pages were not wholesale-converted to Server Components.
Listing route no longer imports through the broad properties barrel.
Listing component does not depend on reservation/payment/DayPicker/phone/Tilopay code.
Detail route still renders the booking form directly.
Tilopay checkout is dynamically imported, preloaded during pending-hold creation and rendered after pendingHold exists.
Tilopay SDK session/preflight/telemetry/start-payment lifecycle remains intact.
No blanket next/dynamic or ssr:false escape was added.
Availability keeps the 60-day live API behavior while reserving loaded grid geometry during loading.
Availability page uses SiteHeader/SiteFooter, public navigation ES/EN entries, centralized messages, tabs, one initial calendar and property-detail CTAs.
Public property invalidation revalidates /disponibilidad when stable accommodation data changes.
Tilopay uses the canonical SDK URL, no random Date.now cache-busting, safe preconnect/preload, shared in-flight loading and retry-after-failure.
All runtime Tilopay checkout consumers remain on the shared component.
Blocked-dates derives from availability records without a second Reservation query and preserves reservation, dependency, CalendarBlock, lifecycle-hold and preparation-buffer semantics.
Availability date formatting uses one stable formatter instead of per-day construction.
DayPicker and country-flag static choice is documented.
Next Image/Cloudinary loader architecture is intentionally unchanged.
Admin runtime behavior, Vercel crons, G.4, G.5, Final-H and Phase 13 remain untouched.
```

## Validation Ledger

The Windows host Node.js runtime may require the same temporary non-repository `NODE_OPTIONS` shim
used in prior Final-G work so `tsx` can survive `node:os.userInfo()` returning
`uv_os_get_passwd`. Network-dependent commands that fetch external resources may require the same
outside-sandbox execution used by G.1/G.2.

```text
npx tsx --tsconfig tests/final-g/tsconfig.json tests/final-g/run.ts — PASS, 31/31.
npm run final-a:validate — PASS, 44/44.
npm run final-b:validate — PASS, 38/38.
npm run final-c:validate — PASS, 41/41.
npm run final-d:validate — PASS, 66/66.
npm run final-e:validate — PASS, 88/88.
npm run final-f:validate — PASS, 125/125.
npm run env:validate — PASS.
npm run db:validate — PASS; Prisma reported the existing package.json#prisma deprecation warning.
npm run db:generate — PASS; Prisma reported the existing package.json#prisma deprecation warning.
npm run db:migrate:status — PASS outside sandbox after the sandbox schema-engine run failed without detail; 29 migrations found and database schema is up to date.
npm run lint — PASS.
npm run build — PASS outside sandbox after the sandbox build failed only on blocked Google Fonts fetches.
git diff --check — PASS; Windows LF-to-CRLF working-copy warnings only.
```

Hosted evidence documentation update validation:

```text
npx tsx --tsconfig tests/final-g/tsconfig.json tests/final-g/run.ts — PASS, 25/25.
git diff --check — PASS; Windows LF-to-CRLF working-copy warning only for docs/208.
```

Final-G.3 hardening validation:

```text
npx tsx --tsconfig tests/final-g/tsconfig.json tests/final-g/run.ts — PASS, 31/31 using the temporary non-repository NODE_OPTIONS shim for the Windows Node/tsx os.userInfo issue.
```

## Hosted Acceptance Pending

G.3 is not accepted yet.

Remaining Hosted/owner checks:

```text
Availability page:
- /disponibilidad appears in public navigation.
- Header and footer match the public website.
- ES -> EN -> ES works and reload preserves selected locale through the existing localStorage behavior.
- All three accommodation tabs exist.
- Only the active accommodation calendar is visible.
- Switching tabs works.
- Page is materially shorter vertically.
- Property details/prices are correct.
- CTA opens the correct accommodation detail page.
- Live availability remains correct.
- No major layout jump returns.

DayPicker / blocked dates:
- First opening remains immediate.
- Blocked nights arrive materially faster after deployment.
- Blocked nights are correct.
- Changing month remains correct.
- No selectable blocked-date regression appears.

Tilopay:
- Initial reservation payment.
- Additional/service-charge payment.
- Retry payment.
- Lifecycle adjustment if a safe Test case exists.
- Prepare secure payment no longer has the previous typical 5-6 second visible delay.
- Card fields render correctly.
- Visa/Mastercard/Amex UI remains.
- No real charge is required merely for hardening validation.

Post-deploy evidence still needed:
- /disponibilidad desktop Lighthouse CLS < 0.10.
- Initial /disponibilidad page load issues only one availability API request for the active tab.
- Repeat blocked-dates benchmark and compare before/after median.
- Repeat Tilopay staged timings per surface.
Verify ES/EN locale switching and persistence still work.
Owner acceptance remains pending.
```

## Next State

```text
Final-F — Completed and accepted
Final-G — Active
Final-G.1 — Completed and accepted on 2026-09-28 at 1623389b028be1b0391a2afce6e7c28244ad0fbf
Final-G.2 — Completed and accepted on 2026-09-28 at ecafa2f95314fe485b1e1cc2d6372c40f076964a
Final-G.2 Hosted evidence head — c09d8d04e0e49a1fdcc8bd2dd5aaeb96e350ed60
Final-G.3 — Hardening implemented; Hosted owner revalidation + acceptance pending
Final-G.4 — Not started
Final-G.5 — Not started
Final-H — Not started
Phase 13 — Not started
```
