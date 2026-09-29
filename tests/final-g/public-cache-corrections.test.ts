import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";

import { test } from "./harness";

const ROOT = process.cwd();

function readSource(relativePath: string): string {
  return readFileSync(path.join(ROOT, relativePath), "utf8");
}

function readExistingSources(relativePaths: readonly string[]): string {
  return relativePaths
    .filter((relativePath) => existsSync(path.join(ROOT, relativePath)))
    .map(readSource)
    .join("\n");
}

function assertInOrder(source: string, first: string, second: string): void {
  const firstIndex = source.indexOf(first);
  const secondIndex = source.indexOf(second);

  assert.notEqual(firstIndex, -1, `Missing source marker: ${first}`);
  assert.notEqual(secondIndex, -1, `Missing source marker: ${second}`);
  assert.equal(
    firstIndex < secondIndex,
    true,
    `Expected "${first}" to appear before "${second}".`,
  );
}

test("G.2 central public cache contract defines scoped domains, tags, paths and safety-net revalidation", () => {
  const source = readSource("lib/public-cache.ts");

  assert.match(source, /PUBLIC_CACHE_REVALIDATE_SECONDS = 300/);
  assert.match(source, /properties: "public-properties"/);
  assert.match(source, /location: "public-location"/);
  assert.match(source, /reviews: "public-reviews"/);
  assert.match(source, /process\.env\.TRP_ENVIRONMENT/);
  assert.match(source, /revalidateTag\(getPublicCacheTag\(PUBLIC_CACHE_DOMAINS\.properties\)\)/);
  assert.match(source, /revalidateTag\(getPublicCacheTag\(PUBLIC_CACHE_DOMAINS\.location\)\)/);
  assert.match(source, /revalidateTag\(getPublicCacheTag\(PUBLIC_CACHE_DOMAINS\.reviews\)\)/);
  assert.match(source, /revalidatePath\("\/"\)/);
  assert.match(source, /revalidatePath\("\/alojamientos"\)/);
  assert.match(source, /revalidatePath\("\/disponibilidad"\)/);
  assert.match(source, /revalidatePath\("\/alojamientos\/\[slug\]", "page"\)/);
  assert.match(source, /revalidatePath\("\/resenas"\)/);
});

test("G.2 public property readers keep raw injectable queries and cache only the runtime Prisma path", () => {
  const source = readSource("lib/properties/public.ts");

  assert.match(source, /export async function getPublicAccommodationsRaw/);
  assert.match(source, /export async function getPublicAccommodationByIdRaw/);
  assert.match(source, /export async function getPublicAccommodationBySlugRaw/);
  assert.match(source, /const getCachedPublicAccommodations = unstable_cache/);
  assert.match(source, /const getCachedPublicAccommodationById = unstable_cache/);
  assert.match(source, /const getCachedPublicAccommodationBySlug = unstable_cache/);
  assert.match(source, /if \(options\.prismaClient\) \{\s*return getPublicAccommodationsRaw\(options\);/s);
  assert.match(source, /if \(options\.prismaClient\) \{\s*return getPublicAccommodationByIdRaw\(accommodationId, options\);/s);
  assert.match(source, /if \(options\.prismaClient\) \{\s*return getPublicAccommodationBySlugRaw\(slug, options\);/s);
});

test("G.2 detail route removes unconditional dynamic rendering and shares the cached slug loader", () => {
  const route = readSource("app/alojamientos/[slug]/page.tsx");
  const publicProperties = readSource("lib/properties/public.ts");

  assert.doesNotMatch(route, /force-dynamic/);
  assert.match(route, /export const revalidate = 300/);
  assert.equal(
    (route.match(/getPublicAccommodationBySlug\(slug\)/g) ?? []).length,
    2,
  );
  assert.match(publicProperties, /const getRequestMemoizedPublicAccommodationBySlug = cache\(/);
  assert.match(publicProperties, /getCachedPublicAccommodationBySlug\(/);
});

test("G.2 public routes remove force-dynamic only on the audited cacheable public pages", () => {
  for (const relativePath of [
    "app/page.tsx",
    "app/alojamientos/page.tsx",
    "app/alojamientos/[slug]/page.tsx",
    "app/resenas/page.tsx",
  ]) {
    const source = readSource(relativePath);

    assert.doesNotMatch(source, /force-dynamic/);
    assert.match(source, /export const revalidate = 300/);
  }

  assert.equal(existsSync(path.join(ROOT, "app/disponibilidad/page.tsx")), true);
  assert.doesNotMatch(readSource("app/disponibilidad/page.tsx"), /public-cache|unstable_cache/);
  assert.match(readSource("app/disponibilidad/page.tsx"), /export const revalidate = 300/);
});

test("G.2 property content, photo, catalog, assignment and preparation mutations invalidate public properties", () => {
  const sources = readExistingSources([
    "lib/admin/accommodation-content.ts",
    "lib/admin/property-photos.ts",
    "lib/admin/catalogs.ts",
    "lib/admin/amenities-house-rules.ts",
    "lib/admin/preparation-buffer-management.ts",
  ]);

  assert.match(sources, /revalidatePublicPropertiesCache/);
  assert.match(readSource("lib/admin/accommodation-content.ts"), /slug: result\.property\.slug/);
  assert.match(readSource("lib/admin/property-photos.ts"), /slug: settings\.property\.slug/);
  assert.match(readSource("lib/admin/amenities-house-rules.ts"), /slug: settings\.property\.slug/);
  assert.match(readSource("lib/admin/catalogs.ts"), /revalidatePublicPropertiesCache\(\)/);
  assert.match(readSource("lib/admin/preparation-buffer-management.ts"), /revalidatePublicPropertiesCache\(\)/);
});

test("G.2 public location mutation invalidates the location cache after a successful transaction", () => {
  const source = readSource("lib/admin/public-location.ts");

  assert.match(source, /revalidatePublicLocationCache/);
  assertInOrder(
    source,
    "const result = await prisma.$transaction",
    "revalidatePublicLocationCache();",
  );
});

test("G.2 review moderation invalidates published-review cache for runtime publish, hide and republish", () => {
  const source = readSource("lib/admin/reviews.ts");

  assert.match(source, /const shouldRevalidatePublicCache = !options\.prismaClient/);
  assert.match(source, /revalidatePublicReviewsCache\(\)/);
  assertInOrder(
    source,
    "const review = await prismaClient.$transaction",
    "revalidatePublicReviewsCache();",
  );
  assert.match(source, /PENDING[\s\S]*PUBLISHED/);
  assert.match(source, /PUBLISHED[\s\S]*HIDDEN/);
  assert.match(source, /HIDDEN[\s\S]*PUBLISHED/);
});

test("G.2 published reviews cache key is isolated by page and pageSize while raw pagination stays injectable", () => {
  const source = readSource("lib/reviews/public-reviews.ts");

  assert.match(source, /export async function getPublishedReviewsRaw/);
  assert.match(source, /pageSize = normalizePageSize\(input\.pageSize\)/);
  assert.match(source, /async \(environmentScope: string, page: number, pageSize: number\)/);
  assert.match(source, /\{ page, pageSize \}/);
  assert.match(source, /normalizePage\(input\.page\),\s*normalizePageSize\(input\.pageSize\)/s);
  assert.match(source, /if \(options\.prismaClient\) \{\s*return getPublishedReviewsRaw\(input, options\);/s);
});

test("G.2 property invalidation also clears reviews because active property visibility gates public reviews", () => {
  const source = readSource("lib/public-cache.ts");

  assert.match(source, /includeReviews\?: boolean/);
  assert.match(source, /if \(input\.includeReviews \?\? true\) \{/);
  assert.match(source, /revalidatePublicReviewsCache\(\)/);
});

test("G.2 availability and quote paths do not use the stable public-content cache", () => {
  const source = readExistingSources([
    "lib/availability/service.ts",
    "app/api/availability/route.ts",
    "app/api/availability/blocked-dates/route.ts",
    "app/api/reservations/quote/route.ts",
    "app/api/reservations/pending-hold/route.ts",
  ]);

  assert.doesNotMatch(source, /public-cache|PUBLIC_CACHE_DOMAINS|unstable_cache|revalidateTag/);
});

test("G.2 cached public DTO selectors exclude private, transactional and provider data", () => {
  const publicProperties = readSource("lib/properties/public.ts");
  const publicReviews = readSource("lib/reviews/public-reviews.ts");
  const publicLocation = readSource("lib/public-location.ts");
  const combined = [publicProperties, publicReviews, publicLocation].join("\n");

  assert.doesNotMatch(combined, /guestEmail|guestPhone|accessToken|tokenHash|encrypted|Payment|Refund|Reservation|AdminNotification|AdminPushDelivery|ZohoInboundEmailEvent|providerReference|tilopay/i);
  assert.match(publicProperties, /baseNightlyPrice/);
  assert.match(publicReviews, /rating: true/);
  assert.match(publicReviews, /comment: true/);
  assert.match(publicLocation, /publicLocationEs/);
});

test("G.2 does not introduce G.3 client hydration or image-path changes", () => {
  const source = readExistingSources([
    "features/properties/components/property-detail-page.tsx",
    "features/properties/components/accommodations-page.tsx",
    "features/availability/components/public-availability-calendar.tsx",
    "next.config.ts",
  ]);

  assert.doesNotMatch(source, /next\/dynamic|ssr:\s*false|cloudinaryLoader|loaderFile/);
  assert.match(readSource("vercel.json"), /"crons": \[\]/);
});
