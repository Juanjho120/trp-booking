# 207 — Final-G.2: Public server/data/cache corrections

## Record

```text
Project: TRP Booking
Track: Post-Phase-12 / Pre-Phase-13 Final Improvement Track
Package: Final-G — Performance audit and optimization
Subphase: Final-G.2 — Public server/data/cache corrections
Status: Completed and accepted on 2026-09-28
Document date: 2026-09-28
Implementation base head: 2229d9dc02dd0f3fd19609aae02a911e1b403396
Accepted G.1 baseline head: 1623389b028be1b0391a2afce6e7c28244ad0fbf
Accepted feature head: ecafa2f95314fe485b1e1cc2d6372c40f076964a
Hosted performance/evidence head: c09d8d04e0e49a1fdcc8bd2dd5aaeb96e350ed60
Owner acceptance: Completed on 2026-09-28
Hosted performance validation: Completed and accepted
Hosted invalidation validation: Completed and accepted
Vercel for accepted feature head: SUCCESS
Final-G package: Active
Final-G.1: Completed and accepted on 2026-09-28
Final-G.2: Completed and accepted on 2026-09-28
Final-G.3: Completed and accepted on 2026-09-28 at e3bcc9709a355b2ce0c6284461f0f4249ad60a5e
Final-G.4: Next / Not started
Final-G.5: Not started
Final-H: Not started
Phase 13: Not started
Schema changes: none
Migration changes: none
Dependency changes: none
Environment variable changes: none
Production resources: none
vercel.json remains {"crons":[]}
```

G.2 implements the accepted G.1 corrections for stable public server/data caching only:

```text
G1-C1 — Addressed and accepted by G.2.
G1-C2 — Addressed and accepted by G.2.
G1-O3 — Addressed and accepted by G.2.
```

G.2 does not start G.3 client/hydration or image-path work, G.4 admin/query timing work, G.5 hosted
comparison/Final-G closure, Final-H, or Phase 13.

The following accepted G.1 findings were intentionally outside G.2. Final-G.3 later completed and
accepted G1-C3, G1-O1, G1-O2 and G1-O4; G1-O5 remains the G.4 admin/protected-route scope:

```text
G1-C3 — /disponibilidad hydration/layout cost; belongs to G.3.
G1-O1 — property-detail heavy client boundary; belongs to G.3.
G1-O2 — accommodation listing broad client boundary; belongs to G.3.
G1-O4 — home media/image payload; belongs to G.3.
G1-O5 — admin client bundle / protected-route timing; belongs to G.4.
```

## Accepted G.1 Baseline

Hosted G.1 median total response-time evidence:

| Route | G.1 rendering/cache evidence | G.1 median total |
| --- | --- | ---: |
| `/` | Dynamic `MISS`, `no-store` | ~1593 ms |
| `/alojamientos` | Dynamic `MISS`, `no-store` | ~1255 ms |
| `/alojamientos/refugio-completo` | Dynamic `MISS`, `no-store`; repeated property read candidate | ~2531 ms |
| `/resenas` | Dynamic `MISS`, `no-store` | ~975 ms |
| `/disponibilidad` | Static/PRERENDER then HIT | ~91 ms |

The G.2 Hosted performance validation preserved this G.1 baseline and accepted these median total
response times:

| Route | Accepted G.1 median total | Accepted G.2 Hosted median total | Accepted total-response improvement |
| --- | ---: | ---: | ---: |
| `/` | ~1593 ms | ~159 ms | ~90.0% |
| `/alojamientos` | ~1255 ms | ~91 ms | ~92.8% |
| `/alojamientos/refugio-completo` | ~2531 ms | ~181 ms | ~92.8% |
| `/resenas` | ~975 ms | ~118 ms | ~87.9% |
| `/disponibilidad` | ~91 ms | ~92 ms | No material improvement expected or claimed |

The accepted G.2 requirement was at least 35% median server/header-time reduction where caching
applied. G.2 exceeded that target substantially.

## Writer Inventory

Public property DTO writers found before caching:

| Data rendered publicly | Writer path | G.2 invalidation |
| --- | --- | --- |
| ES/EN names/descriptions, slug, guest/room/bath counts, base price, currency, check-in/check-out, preparation days | `lib/admin/accommodation-content.ts` | `revalidatePublicPropertiesCache({ slug })` after successful transaction and only when changed |
| Property photos, cover, sort order, alt text, soft deletion | `lib/admin/property-photos.ts` | `revalidatePublicPropertiesCache({ slug })` after successful mutation |
| Global amenity and house-rule catalog labels/icons/deletion | `lib/admin/catalogs.ts` | `revalidatePublicPropertiesCache()` after successful catalog mutation |
| Property-specific amenity/rule content and assignments | `lib/admin/amenities-house-rules.ts` | `revalidatePublicPropertiesCache({ slug })` after successful mutation |
| Preparation buffer settings rendered in public accommodation data | `lib/admin/preparation-buffer-management.ts` | `revalidatePublicPropertiesCache()` after successful change |

No active admin/server writer for public `Property.status`, `Property.deletedAt`, or composed-property
relations was found in the current runtime code. Because public reviews depend on active public
property eligibility, property-cache invalidation also invalidates the reviews cache by default.

Public location writers:

| Data rendered publicly | Writer path | G.2 invalidation |
| --- | --- | --- |
| Homepage public location ES/EN text and map embed URL | `lib/admin/public-location.ts` | `revalidatePublicLocationCache()` after successful transaction and only when changed |

Published review writers:

| Data rendered publicly | Writer path | G.2 invalidation |
| --- | --- | --- |
| `PENDING -> PUBLISHED`, `PUBLISHED -> HIDDEN`, `HIDDEN -> PUBLISHED` moderation state | `lib/admin/reviews.ts` | `revalidatePublicReviewsCache()` after successful runtime transaction |
| Active-property eligibility for public reviews | public property invalidation boundary | reviews are invalidated by `revalidatePublicPropertiesCache()` unless explicitly opted out |

## Cache Architecture

`lib/public-cache.ts` centralizes the public cache contract:

```text
Domains/tags:
- public-properties
- public-location
- public-reviews

Scope:
- tag/key parts include TRP_ENVIRONMENT through getPublicCacheEnvironmentScope()

Freshness:
- cross-request unstable_cache for stable server data
- explicit revalidateTag plus revalidatePath after successful mutations
- 300-second conservative time-based revalidation safety net
```

The data-read shape remains testable:

```text
raw query/mapper functions
-> injected Prisma clients keep deterministic tests uncached
-> runtime wrappers use the real server Prisma boundary with unstable_cache
```

No Prisma client, secret, auth/session state, private provider URL, token, payment data,
PushSubscription data, webhook secret, guest private token, or raw provider payload is serialized
into cache keys or cached DTOs.

The accommodation detail loader uses React request memoization around the cached slug loader so
`generateMetadata()` and the page body converge on the same request-level value while preserving
not-found behavior, canonical metadata, and cover-image metadata.

Published-review cache keys include normalized `page` and `pageSize`, so page 1 and page 2 cannot
share the same cached result.

## Deliberately Dynamic / Excluded Data

G.2 does not cache:

```text
/api/availability
availability
pending reservation holds
Reservation blocking state
lifecycle holds
quote outputs dependent on requested dates/current pricing state
date-sensitive quote results
transactional pricing state
Reservation state
Tilopay state
Payment/Refund state
admin pages
authenticated Admin pages
admin notification center/Web Push state
Web Push/notification state
Zoho webhook state
email processing
Airbnb sync state
```

`/disponibilidad` remains the accepted fast static shell with live dynamic availability API calls.
G.3 later completed and accepted the client/hydration, availability calendar layout, image-path and
bundle correction scope.

2026-09-28 G.3 hardening note: `/disponibilidad` now consumes the stable public accommodation DTO
for names, descriptions, public prices and slugs while keeping availability itself live. Therefore
`revalidatePublicPropertiesCache()` also revalidates `/disponibilidad` after public property
mutations.

## Runtime Files Changed

```text
lib/public-cache.ts
  Added centralized tag/path invalidation and environment-scoped cache helpers.

lib/properties/public.ts
lib/properties/index.ts
  Split raw public property readers from cached runtime wrappers and added request memoization for slug detail reads.

lib/public-location.ts
  Split raw public location reader from cached runtime wrapper.

lib/reviews/public-reviews.ts
  Split raw published-review reader from cached runtime wrapper and keyed cache by page/pageSize.

app/page.tsx
app/alojamientos/page.tsx
app/alojamientos/[slug]/page.tsx
app/resenas/page.tsx
  Removed unconditional force-dynamic behavior where the complete public data contract is now safe for cached rendering/data reads; added 300-second revalidate exports.

lib/admin/accommodation-content.ts
lib/admin/property-photos.ts
lib/admin/catalogs.ts
lib/admin/amenities-house-rules.ts
lib/admin/preparation-buffer-management.ts
lib/admin/public-location.ts
lib/admin/reviews.ts
  Added post-persistence cache invalidation for the public data each writer can affect.

tests/final-g/*
  Added deterministic Final-G targeted validation for the G.2 cache contract, invalidation coverage, sensitive-data exclusions, and G.3 boundary.
```

No schema, migration, dependency, environment, provider, cron, or Production-resource change was
introduced.

## Build Classification Evidence

Local `npm run build` after G.2:

| Route | G.1 classification | G.2 local build classification | Notes |
| --- | --- | --- | --- |
| `/` | Dynamic | Static, revalidate 5m | Stable property + location data cached/revalidated. |
| `/alojamientos` | Dynamic | Static, revalidate 5m | Stable property list cached/revalidated. |
| `/alojamientos/[slug]` | Dynamic | Dynamic | Stable property data uses cached slug loader plus request memoization; dynamic segment remains safe without forcing static labels. |
| `/disponibilidad` | Static | Static | Live availability remains outside the stable public-content cache. |
| `/resenas` | Dynamic | Dynamic | Route remains dynamic for search params/pagination; published-review data is cached by page/pageSize and revalidated after moderation. |

Route classification alone is not acceptance evidence. Hosted canonical repeated-URL timing and
owner-visible invalidation checks remain pending.

## Hosted Before/After Matrix

Hosted measurement was completed on 2026-09-28 after Vercel reported SUCCESS for
`ecafa2f95314fe485b1e1cc2d6372c40f076964a`.

Methodology:

```text
Target: https://trp-booking.juantzun.dev
Runner: PowerShell/.NET HttpClient
AllowAutoRedirect=false
HttpCompletionOption.ResponseHeadersRead
5 sequential GET samples per public route
Canonical URL reused for every sample; no per-sample cache-busting query parameter
Measured at: 2026-09-28T14:49:53-06:00
```

`header_ms` remains the runner response-header-time / TTFB-equivalent used by G.1. It is not a
browser Navigation Timing field and is not real-user data. First observed requests are reported as
first observed only; no serverless cold-start claim is made.

### Hosted G.2 Raw Samples

| Route | Sample | Status | header_ms | total_ms | Bytes | x-vercel-cache | cache-control | age | Server timing summary |
| --- | ---: | ---: | ---: | ---: | ---: | --- | --- | --- | --- |
| `/` | 1 | 200 | 880.8 | 904.4 | 95417 | PRERENDER | public, must-revalidate, max-age=0 | 0 | cfOrigin 405ms |
| `/` | 2 | 200 | 244.6 | 261.2 | 95417 | HIT | public, must-revalidate, max-age=0 | 0 | cfOrigin 190ms |
| `/` | 3 | 200 | 113.2 | 129.1 | 95417 | HIT | public, must-revalidate, max-age=0 | 1 | cfOrigin 70ms |
| `/` | 4 | 200 | 146.6 | 159.4 | 95417 | HIT | public, must-revalidate, max-age=0 | 1 | cfOrigin 98ms |
| `/` | 5 | 200 | 145.4 | 158.4 | 95417 | HIT | public, must-revalidate, max-age=0 | 2 | cfOrigin 102ms |
| `/alojamientos` | 1 | 200 | 174.0 | 186.8 | 71953 | PRERENDER | public, must-revalidate, max-age=0 | 0 | cfOrigin 130ms |
| `/alojamientos` | 2 | 200 | 68.8 | 78.0 | 71953 | HIT | public, must-revalidate, max-age=0 | 0 | cfOrigin 26ms |
| `/alojamientos` | 3 | 200 | 73.9 | 83.3 | 71953 | HIT | public, must-revalidate, max-age=0 | 0 | cfOrigin 30ms |
| `/alojamientos` | 4 | 200 | 84.8 | 93.9 | 71953 | HIT | public, must-revalidate, max-age=0 | 1 | cfOrigin 40ms |
| `/alojamientos` | 5 | 200 | 82.3 | 90.8 | 71953 | HIT | public, must-revalidate, max-age=0 | 1 | cfOrigin 33ms |
| `/alojamientos/refugio-completo` | 1 | 200 | 2303.0 | 2317.1 | 84151 | MISS | no-store, must-revalidate, no-cache, max-age=0, private | 0 | cfOrigin 2252ms |
| `/alojamientos/refugio-completo` | 2 | 200 | 144.7 | 155.5 | 84151 | MISS | no-store, must-revalidate, no-cache, max-age=0, private | 0 | cfOrigin 97ms |
| `/alojamientos/refugio-completo` | 3 | 200 | 171.5 | 182.5 | 84151 | MISS | no-store, must-revalidate, no-cache, max-age=0, private | 0 | cfOrigin 124ms |
| `/alojamientos/refugio-completo` | 4 | 200 | 132.3 | 158.9 | 84151 | MISS | no-store, must-revalidate, no-cache, max-age=0, private | 0 | cfOrigin 87ms |
| `/alojamientos/refugio-completo` | 5 | 200 | 170.0 | 181.2 | 84151 | MISS | no-store, must-revalidate, no-cache, max-age=0, private | 0 | cfOrigin 123ms |
| `/resenas` | 1 | 200 | 1013.9 | 1018.5 | 36565 | MISS | no-store, must-revalidate, no-cache, max-age=0, private | 0 | cfOrigin 969ms |
| `/resenas` | 2 | 200 | 119.2 | 123.8 | 36565 | MISS | no-store, must-revalidate, no-cache, max-age=0, private | 0 | cfOrigin 68ms |
| `/resenas` | 3 | 200 | 104.7 | 108.1 | 36565 | MISS | no-store, must-revalidate, no-cache, max-age=0, private | 0 | cfOrigin 61ms |
| `/resenas` | 4 | 200 | 100.4 | 103.9 | 36565 | MISS | no-store, must-revalidate, no-cache, max-age=0, private | 0 | cfOrigin 57ms |
| `/resenas` | 5 | 200 | 114.5 | 117.8 | 36565 | MISS | no-store, must-revalidate, no-cache, max-age=0, private | 0 | cfOrigin 67ms |
| `/disponibilidad` | 1 | 200 | 139.8 | 141.1 | 23137 | PRERENDER | public, must-revalidate, max-age=0 | 0 | cfOrigin 96ms |
| `/disponibilidad` | 2 | 200 | 90.7 | 91.8 | 23137 | HIT | public, must-revalidate, max-age=0 | 0 | cfOrigin 43ms |
| `/disponibilidad` | 3 | 200 | 99.8 | 100.4 | 23137 | HIT | public, must-revalidate, max-age=0 | 0 | cfOrigin 54ms |
| `/disponibilidad` | 4 | 200 | 80.6 | 80.6 | 23137 | HIT | public, must-revalidate, max-age=0 | 1 | cfOrigin 36ms |
| `/disponibilidad` | 5 | 200 | 90.2 | 90.6 | 23137 | HIT | public, must-revalidate, max-age=0 | 1 | cfOrigin 47ms |

### Hosted G.2 Summary

| Route | First observed total | Subsequent total range | Median header_ms | Median total_ms | Useful total range | Header improvement vs G.1 | Total improvement vs G.1 | Cache evidence |
| --- | ---: | --- | ---: | ---: | --- | ---: | ---: | --- |
| `/` | 904.4ms | 129.1-261.2ms | 146.6ms | 159.4ms | 129.1-904.4ms | 90.7% | 90.0% | `PRERENDER` then `HIT`; public revalidated shell |
| `/alojamientos` | 186.8ms | 78.0-93.9ms | 82.3ms | 90.8ms | 78.0-186.8ms | 93.4% | 92.8% | `PRERENDER` then `HIT`; public revalidated shell |
| `/alojamientos/refugio-completo` | 2317.1ms | 155.5-182.5ms | 170.0ms | 181.2ms | 155.5-2317.1ms | 87.3% | 92.8% | Route remains `MISS`/`no-store`; warm stable data path drops cfOrigin to ~87-124ms |
| `/resenas` | 1018.5ms | 103.9-123.8ms | 114.5ms | 117.8ms | 103.9-1018.5ms | 88.3% | 87.9% | Route remains `MISS`/`no-store`; warm published-review data path drops cfOrigin to ~57-68ms |
| `/disponibilidad` | 141.1ms | 80.6-100.4ms | 90.7ms | 91.8ms | 80.6-141.1ms | -1.7% | -1.3% | Regression/smoke route remains `PRERENDER` then `HIT` |

G.2 meets the primary target of at least 35% median header-time reduction on the routes covered by
the accepted cache architecture:

```text
/                              90.7% header-time reduction
/alojamientos                  93.4% header-time reduction
/alojamientos/refugio-completo 87.3% header-time reduction
/resenas                       88.3% header-time reduction
```

Header evidence also verifies the intended cache split:

```text
- `/` and `/alojamientos` are now served as public revalidated routes: first observed PRERENDER, then HIT.
- `/alojamientos/refugio-completo` remains route-level dynamic/no-store, matching the local build classification, but stable property data is materially faster on subsequent canonical requests.
- `/resenas` remains route-level dynamic/no-store because search params/pagination keep the route dynamic, but published-review data is materially faster on subsequent canonical requests.
- `/disponibilidad` remains the accepted fast static shell with no G.2 caching change; its live availability APIs remain outside this hosted document timing.
```

The accepted route/data-cache behavior is:

```text
`/` first observed -> PRERENDER; subsequent -> HIT.
`/alojamientos` first observed -> PRERENDER; subsequent -> HIT.
`/alojamientos/[slug]` remains route-level dynamic/no-store; stable property data is cached and repeated canonical requests fell to roughly 155-183 ms total.
`/resenas` remains route-level dynamic/no-store because of search params/pagination; published-review data is cached and repeated canonical requests fell to roughly 104-124 ms total.
`/disponibilidad` remains a static/prerendered shell plus live dynamic availability APIs; no stable-property cache is used for availability correctness.
```

The owner accepted the Hosted performance validation on 2026-09-28.

## Hosted Invalidation Acceptance

The owner completed the G.2 manual Hosted invalidation checks successfully.

```text
Property cache invalidation — PASS
- A visible public accommodation field was changed through the accepted Admin workflow.
- After successful save, the public accommodation route reflected the new value immediately.
- The owner did not need to wait for the 300-second TTL.
- This accepts the property mutation -> cache invalidation flow.

Review cache invalidation — PASS
- PUBLISHED -> HIDDEN made the review disappear promptly from /resenas.
- HIDDEN -> PUBLISHED made the review reappear promptly on /resenas.
- This accepts public review cache invalidation.

Availability regression — PASS
- /disponibilidad continued loading current/live availability normally after G.2.
- The stable public-content cache did not freeze or replace dynamic availability state.

Public location — covered by implementation/tests
- No separate manual Hosted public-location mutation was required for G.2 owner acceptance.
- The public-location invalidation contract remains covered by implementation and deterministic regression tests.
```

Accepted G.2 architecture is frozen as:

```text
Public property data:
- raw Prisma readers remain injectable/testable;
- runtime reads use unstable_cache;
- 300-second revalidation is only a safety net;
- successful Admin mutations explicitly invalidate;
- environment scope is included in cache tags/keys;
- `/`, `/alojamientos`, and detail stable property reads use this boundary.

Detail request memoization:
- metadata and page rendering share the cached slug loader through request-level React memoization;
- G1-C2 is resolved.

Public location:
- stable public location settings use the public-location cache domain and explicit mutation invalidation.

Published reviews:
- pagination inputs remain part of cache identity;
- public moderation eligibility remains preserved;
- publish/hide/republish invalidates;
- active-property public eligibility invalidation also invalidates public reviews.
```

## Targeted Regression Coverage

`tests/final-g/public-cache-corrections.test.ts` covers:

```text
central public cache domains/tags/paths/revalidate policy
raw/injectable property query path remains testable
detail route duplicate-read prevention through shared cached request loader
force-dynamic removal only on audited public routes
property content/photo/catalog/assignment/preparation invalidation
public location invalidation after successful transaction
review publish/hide/republish invalidation after successful runtime transaction
published-review page/pageSize key isolation
property invalidation also clears reviews by default
availability and quote paths do not use the stable public-content cache
cached public DTO selectors exclude private/transactional/provider data
no G.3 client/hydration/image-path changes enter G.2
```

## Validation Ledger

Implementation validation recorded before owner acceptance:

The Windows host Node.js runtime requires the same temporary non-repository `NODE_OPTIONS` shim used
in prior Final-G work so `tsx` can survive `node:os.userInfo()` returning `uv_os_get_passwd`.

```text
npx tsx --tsconfig tests/final-g/tsconfig.json tests/final-g/run.ts — PASS, 12/12
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
npm run build — PASS outside sandbox; initial sandbox attempt failed fetching Google Fonts from fonts.googleapis.com
git diff --check — PASS
```

Acceptance closure validation on 2026-09-28:

```text
npx tsx --tsconfig tests/final-g/tsconfig.json tests/final-g/run.ts — PASS, 12/12
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
npm run build — PASS outside sandbox; initial sandbox attempt failed fetching Google Fonts from fonts.googleapis.com
git diff --check — PASS; Windows working-tree line-ending warning only
```

## Next State

```text
Final-F — Completed and accepted
Final-G — Active
Final-G.1 — Completed and accepted on 2026-09-28 at 1623389b028be1b0391a2afce6e7c28244ad0fbf
Final-G.2 — Completed and accepted on 2026-09-28 at ecafa2f95314fe485b1e1cc2d6372c40f076964a
Final-G.2 Hosted evidence head — c09d8d04e0e49a1fdcc8bd2dd5aaeb96e350ed60
Final-G.3 — Completed and accepted on 2026-09-28 at e3bcc9709a355b2ce0c6284461f0f4249ad60a5e
Final-G.4 — Next / Not started
Final-G.5 — Not started
Final-H — Not started
Phase 13 — Not started
```
