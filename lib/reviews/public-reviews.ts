import {
  PropertyStatus,
  ReviewModerationStatus,
  type Prisma,
  type PrismaClient,
} from "@prisma/client";
import { unstable_cache } from "next/cache";

import { prisma } from "@/lib/db/prisma";
import {
  getPublicCacheEnvironmentScope,
  getPublicCacheKeyParts,
  getPublicCacheTag,
  PUBLIC_CACHE_DOMAINS,
  PUBLIC_CACHE_REVALIDATE_SECONDS,
} from "@/lib/public-cache";
import type {
  PublicReviewItem,
  PublicReviewsPageData,
} from "@/types/public-review";

export const PUBLIC_REVIEW_PAGE_SIZE = 12;
const PUBLIC_REVIEW_MAX_PAGE_SIZE = 50;

const publicReviewSelect = {
  rating: true,
  comment: true,
  submittedAt: true,
  guestDisplayName: true,
  property: {
    select: {
      nameEs: true,
      nameEn: true,
      slug: true,
    },
  },
} satisfies Prisma.ReviewSelect;

type PublicReviewRecord = Prisma.ReviewGetPayload<{
  select: typeof publicReviewSelect;
}>;

type PublicReviewPrismaClient = Pick<PrismaClient, "review">;

function assertServerSidePublicReviewQuery(): void {
  if (typeof window !== "undefined") {
    throw new Error("Public review queries must remain server-side only.");
  }
}

function normalizePage(value: number | undefined): number {
  return Number.isInteger(value) && (value ?? 0) > 0 ? value! : 1;
}

function normalizePageSize(value: number | undefined): number {
  if (!Number.isInteger(value) || (value ?? 0) <= 0) {
    return PUBLIC_REVIEW_PAGE_SIZE;
  }

  return Math.min(value!, PUBLIC_REVIEW_MAX_PAGE_SIZE);
}

function toPublicReviewItem(row: PublicReviewRecord): PublicReviewItem {
  return {
    rating: row.rating,
    comment: row.comment,
    submittedAt: row.submittedAt.toISOString(),
    guestDisplayName: row.guestDisplayName,
    property: {
      nameEs: row.property.nameEs,
      nameEn: row.property.nameEn,
      slug: row.property.slug,
    },
  };
}

export async function getPublishedReviewsRaw(
  input: Readonly<{ page?: number; pageSize?: number }> = {},
  options: Readonly<{ prismaClient?: PublicReviewPrismaClient }> = {},
): Promise<PublicReviewsPageData> {
  assertServerSidePublicReviewQuery();

  const prismaClient = options.prismaClient ?? prisma;
  const requestedPage = normalizePage(input.page);
  const pageSize = normalizePageSize(input.pageSize);
  const where: Prisma.ReviewWhereInput = {
    moderationStatus: ReviewModerationStatus.PUBLISHED,
    property: {
      status: PropertyStatus.ACTIVE,
      deletedAt: null,
    },
  };
  const totalItems = await prismaClient.review.count({ where });
  const totalPages = Math.max(1, Math.ceil(totalItems / pageSize));
  const page = Math.min(requestedPage, totalPages);
  const reviews = await prismaClient.review.findMany({
    where,
    orderBy: [{ submittedAt: "desc" }, { id: "desc" }],
    skip: (page - 1) * pageSize,
    take: pageSize,
    select: publicReviewSelect,
  });

  return {
    generatedAt: new Date().toISOString(),
    pagination: {
      page,
      pageSize,
      totalItems,
      totalPages,
    },
    reviews: reviews.map(toPublicReviewItem),
  };
}

const getCachedPublishedReviews = unstable_cache(
  async (environmentScope: string, page: number, pageSize: number) => {
    void environmentScope;

    return getPublishedReviewsRaw(
      { page, pageSize },
      { prismaClient: prisma },
    );
  },
  [...getPublicCacheKeyParts(PUBLIC_CACHE_DOMAINS.reviews, "published")],
  {
    revalidate: PUBLIC_CACHE_REVALIDATE_SECONDS,
    tags: [getPublicCacheTag(PUBLIC_CACHE_DOMAINS.reviews)],
  },
);

export async function getPublishedReviews(
  input: Readonly<{ page?: number; pageSize?: number }> = {},
  options: Readonly<{ prismaClient?: PublicReviewPrismaClient }> = {},
): Promise<PublicReviewsPageData> {
  if (options.prismaClient) {
    return getPublishedReviewsRaw(input, options);
  }

  return getCachedPublishedReviews(
    getPublicCacheEnvironmentScope(),
    normalizePage(input.page),
    normalizePageSize(input.pageSize),
  );
}
