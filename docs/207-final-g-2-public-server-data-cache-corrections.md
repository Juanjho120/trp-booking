# 207 — Final-G.2: Public server/data/cache corrections

## Record

```text
Project: TRP Booking
Track: Post-Phase-12 / Pre-Phase-13 Final Improvement Track
Package: Final-G — Performance audit and optimization
Subphase: Final-G.2 — Public server/data/cache corrections
Status: Implementation completed; Hosted performance validation + owner acceptance pending
Document date: 2026-09-28
Implementation base head: 2229d9dc02dd0f3fd19609aae02a911e1b403396
Accepted G.1 baseline head: 1623389b028be1b0391a2afce6e7c28244ad0fbf
Final-G package: Active
Final-G.1: Completed and accepted on 2026-09-28
Final-G.2: Implementation completed; Hosted performance/invalidation validation + owner acceptance pending
Final-G.3: Not started
Final-G.4: Not started
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
G1-C1 — stable public content was dynamic/no-store on every request.
G1-C2 — accommodation detail repeated the same property read in metadata and page rendering.
G1-O3 — published reviews paid dynamic DB/server cost between moderation changes.
```

G.2 does not start G.3 client/hydration or image-path work, G.4 admin/query timing work, G.5 hosted
comparison/Final-G closure, Final-H, or Phase 13. It does not mark G.2 accepted.

## Accepted G.1 Baseline

Hosted G.1 median total response-time evidence:

| Route | G.1 rendering/cache evidence | G.1 median total |
| --- | --- | ---: |
| `/` | Dynamic `MISS`, `no-store` | ~1593 ms |
| `/alojamientos` | Dynamic `MISS`, `no-store` | ~1255 ms |
| `/alojamientos/refugio-completo` | Dynamic `MISS`, `no-store`; repeated property read candidate | ~2531 ms |
| `/resenas` | Dynamic `MISS`, `no-store` | ~975 ms |
| `/disponibilidad` | Static/PRERENDER then HIT | ~91 ms |

The G.2 implementation must be compared against this baseline only after Vercel deploys the G.2
commit and the owner runs the canonical repeated-URL Hosted Test measurement. No Hosted after-value
is recorded in this implementation commit.

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
pending reservation holds
Reservation blocking state
lifecycle holds
quote outputs dependent on requested dates/current pricing state
Tilopay state
Payment/Refund state
admin pages
admin notification center/Web Push state
Zoho webhook state
email processing
Airbnb sync state
```

`/disponibilidad` remains the accepted fast static shell with live dynamic availability API calls.
G.3 owns client/hydration, availability calendar layout, image-path, and bundle corrections.

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

| Route | G.1 median total | G.2 Hosted after | Status |
| --- | ---: | --- | --- |
| `/` | ~1593 ms | Pending | Await Vercel deployment and canonical repeated-URL measurement. |
| `/alojamientos` | ~1255 ms | Pending | Await Vercel deployment and canonical repeated-URL measurement. |
| `/alojamientos/refugio-completo` | ~2531 ms | Pending | Await Vercel deployment and canonical repeated-URL measurement. |
| `/resenas` | ~975 ms | Pending | Await Vercel deployment and canonical repeated-URL measurement. |
| `/disponibilidad` | ~91 ms | Pending smoke only | Must remain live/correct with dynamic availability APIs. |

Required Hosted functional checks still pending:

```text
Property public content invalidates promptly after a successful Admin mutation.
Public location invalidates promptly after a successful Admin mutation.
Published reviews update promptly after publish/hide/republish moderation.
/disponibilidad continues to reflect live blocking state/API behavior.
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

## Next State

```text
Final-F — Completed and accepted
Final-G — Active
Final-G.1 — Completed and accepted on 2026-09-28 at 1623389b028be1b0391a2afce6e7c28244ad0fbf
Final-G.2 — Implementation completed; Hosted performance/invalidation validation + owner acceptance pending
Final-G.3 — Not started
Final-G.4 — Not started
Final-G.5 — Not started
Final-H — Not started
Phase 13 — Not started
```
