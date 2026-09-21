import {
  PropertyStatus,
  ReviewModerationStatus,
  type Prisma,
  type PrismaClient,
} from "@prisma/client";

import { prisma } from "@/lib/db/prisma";
import type {
  PublicReviewItem,
  PublicReviewsPageData,
} from "@/types/public-review";

const PUBLIC_REVIEW_PAGE_SIZE = 12;

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

export async function getPublishedReviews(
  input: Readonly<{ page?: number }> = {},
  options: Readonly<{ prismaClient?: PublicReviewPrismaClient }> = {},
): Promise<PublicReviewsPageData> {
  assertServerSidePublicReviewQuery();

  const prismaClient = options.prismaClient ?? prisma;
  const requestedPage = normalizePage(input.page);
  const where: Prisma.ReviewWhereInput = {
    moderationStatus: ReviewModerationStatus.PUBLISHED,
    property: {
      status: PropertyStatus.ACTIVE,
      deletedAt: null,
    },
  };
  const totalItems = await prismaClient.review.count({ where });
  const totalPages = Math.max(1, Math.ceil(totalItems / PUBLIC_REVIEW_PAGE_SIZE));
  const page = Math.min(requestedPage, totalPages);
  const reviews = await prismaClient.review.findMany({
    where,
    orderBy: [{ submittedAt: "desc" }, { id: "desc" }],
    skip: (page - 1) * PUBLIC_REVIEW_PAGE_SIZE,
    take: PUBLIC_REVIEW_PAGE_SIZE,
    select: publicReviewSelect,
  });

  return {
    generatedAt: new Date().toISOString(),
    pagination: {
      page,
      pageSize: PUBLIC_REVIEW_PAGE_SIZE,
      totalItems,
      totalPages,
    },
    reviews: reviews.map(toPublicReviewItem),
  };
}
