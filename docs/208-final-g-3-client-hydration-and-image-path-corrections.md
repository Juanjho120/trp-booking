# 208 — Final-G.3: Client/hydration and image-path corrections

## Record

```text
Project: TRP Booking
Track: Post-Phase-12 / Pre-Phase-13 Final Improvement Track
Package: Final-G — Performance audit and optimization
Subphase: Final-G.3 — Client/hydration and image-path corrections
Status: Implementation completed; Hosted Lighthouse/functional validation + owner acceptance pending
Document date: 2026-09-28
Implementation base head: b190bb45275a72c8c0126ae646e5d3112255dccd
Accepted G.1 baseline head: 1623389b028be1b0391a2afce6e7c28244ad0fbf
Accepted G.2 feature head: ecafa2f95314fe485b1e1cc2d6372c40f076964a
G.2 Hosted evidence head: c09d8d04e0e49a1fdcc8bd2dd5aaeb96e350ed60
Final-G package: Active
Final-G.1: Completed and accepted on 2026-09-28
Final-G.2: Completed and accepted on 2026-09-28
Final-G.3: Implementation completed; Hosted Lighthouse/functional validation + owner acceptance pending
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
and is unchanged:

```text
session creation
SDK script loading
Tilopay.Init
payment preflight
Tilopay.startPayment
client telemetry
retry/error handling
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
npx tsx --tsconfig tests/final-g/tsconfig.json tests/final-g/run.ts — PASS, 25/25.
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

## Hosted Acceptance Pending

G.3 is not accepted yet.

Remaining Hosted/owner checks:

```text
Run comparable Hosted Lighthouse checks for /disponibilidad, /alojamientos and /alojamientos/refugio-completo.
Verify /disponibilidad desktop CLS target below 0.10.
Verify booking form UX, pending-hold creation, checkout preload, Tilopay form rendering and payment handoff on Hosted Test.
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
Final-G.3 — Implementation completed; Hosted Lighthouse/functional validation + owner acceptance pending
Final-G.4 — Not started
Final-G.5 — Not started
Final-H — Not started
Phase 13 — Not started
```
