import { revalidatePath, revalidateTag } from "next/cache";

export const PUBLIC_CACHE_REVALIDATE_SECONDS = 300;

export const PUBLIC_CACHE_DOMAINS = {
  properties: "public-properties",
  location: "public-location",
  reviews: "public-reviews",
} as const;

export type PublicCacheDomain =
  (typeof PUBLIC_CACHE_DOMAINS)[keyof typeof PUBLIC_CACHE_DOMAINS];

const PUBLIC_CACHE_SCOPE_PREFIX = "trp-public";
const UNKNOWN_ENVIRONMENT = "unknown";

export function getPublicCacheEnvironmentScope(): string {
  const environment = process.env.TRP_ENVIRONMENT?.trim();

  return environment || UNKNOWN_ENVIRONMENT;
}

export function getPublicCacheTag(domain: PublicCacheDomain): string {
  return [
    PUBLIC_CACHE_SCOPE_PREFIX,
    getPublicCacheEnvironmentScope(),
    domain,
  ].join(":");
}

export function getPublicCacheKeyParts(
  domain: PublicCacheDomain,
  ...parts: readonly string[]
): readonly string[] {
  return [
    PUBLIC_CACHE_SCOPE_PREFIX,
    getPublicCacheEnvironmentScope(),
    domain,
    ...parts,
  ];
}

export function revalidatePublicReviewsCache(): void {
  revalidateTag(getPublicCacheTag(PUBLIC_CACHE_DOMAINS.reviews));
  revalidatePath("/resenas");
}

export function revalidatePublicLocationCache(): void {
  revalidateTag(getPublicCacheTag(PUBLIC_CACHE_DOMAINS.location));
  revalidatePath("/");
}

export function revalidatePublicPropertiesCache(
  input: Readonly<{ slug?: string | null; includeReviews?: boolean }> = {},
): void {
  revalidateTag(getPublicCacheTag(PUBLIC_CACHE_DOMAINS.properties));
  revalidatePath("/");
  revalidatePath("/alojamientos");

  if (input.slug) {
    revalidatePath(`/alojamientos/${input.slug}`);
  } else {
    revalidatePath("/alojamientos/[slug]", "page");
  }

  if (input.includeReviews ?? true) {
    revalidatePublicReviewsCache();
  }
}
