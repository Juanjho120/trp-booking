import {
  Prisma,
  ReviewModerationStatus as PrismaReviewModerationStatus,
  type PrismaClient,
} from "@prisma/client";

import {
  adminAccommodationIds,
  isAdminAccommodationId,
} from "@/lib/admin/accommodations";
import { resolveAdminActor } from "@/lib/admin/admin-actor";
import { prisma } from "@/lib/db/prisma";
import type { AdminActor } from "@/types/admin";
import {
  ADMIN_REVIEW_MODERATION_STATUSES,
  type AdminReviewErrorCode,
  type AdminReviewFilters,
  type AdminReviewModerationStatus,
  type AdminReviewRow,
  type AdminReviewsPageData,
  type ModerateAdminReviewInput,
} from "@/types/admin-reviews";

const ADMIN_REVIEW_PAGE_SIZE = 20;

const adminReviewSelect = {
  id: true,
  reservationId: true,
  rating: true,
  comment: true,
  guestDisplayName: true,
  moderationStatus: true,
  submittedAt: true,
  publishedAt: true,
  moderatedAt: true,
  updatedAt: true,
  property: {
    select: {
      id: true,
      nameEs: true,
      nameEn: true,
    },
  },
  moderatedByAdmin: {
    select: {
      name: true,
      email: true,
    },
  },
} satisfies Prisma.ReviewSelect;

type AdminReviewRecord = Prisma.ReviewGetPayload<{
  select: typeof adminReviewSelect;
}>;

type AdminReviewPrismaClient = Pick<
  PrismaClient,
  "$transaction" | "property" | "review"
>;

export class AdminReviewError extends Error {
  constructor(public readonly code: AdminReviewErrorCode) {
    super(code);
    this.name = "AdminReviewError";
  }
}

function normalizePage(value: number | undefined): number {
  return Number.isInteger(value) && (value ?? 0) > 0 ? value! : 1;
}

function normalizeReviewStatus(
  value: string | undefined,
): AdminReviewModerationStatus | undefined {
  return ADMIN_REVIEW_MODERATION_STATUSES.includes(
    value as AdminReviewModerationStatus,
  )
    ? (value as AdminReviewModerationStatus)
    : undefined;
}

function parseExpectedUpdatedAt(value: string): Date {
  const parsed = new Date(value);

  if (!value.trim() || Number.isNaN(parsed.getTime())) {
    throw new AdminReviewError("INVALID_ADMIN_REVIEW_REQUEST");
  }

  return parsed;
}

function toAdminReviewRow(row: AdminReviewRecord): AdminReviewRow {
  return {
    id: row.id,
    reservationId: row.reservationId,
    rating: row.rating,
    comment: row.comment,
    guestDisplayName: row.guestDisplayName,
    moderationStatus: row.moderationStatus as AdminReviewModerationStatus,
    submittedAt: row.submittedAt.toISOString(),
    publishedAt: row.publishedAt?.toISOString() ?? null,
    moderatedAt: row.moderatedAt?.toISOString() ?? null,
    updatedAt: row.updatedAt.toISOString(),
    property: row.property,
    moderatedByAdmin: row.moderatedByAdmin,
  };
}

function isAllowedReviewTransition(
  currentStatus: PrismaReviewModerationStatus,
  targetStatus: PrismaReviewModerationStatus,
): boolean {
  return (
    (currentStatus === PrismaReviewModerationStatus.PENDING &&
      targetStatus === PrismaReviewModerationStatus.PUBLISHED) ||
    (currentStatus === PrismaReviewModerationStatus.PUBLISHED &&
      targetStatus === PrismaReviewModerationStatus.HIDDEN) ||
    (currentStatus === PrismaReviewModerationStatus.HIDDEN &&
      targetStatus === PrismaReviewModerationStatus.PUBLISHED)
  );
}

function isReviewSerializationConflict(error: unknown): boolean {
  return (
    error instanceof Prisma.PrismaClientKnownRequestError &&
    error.code === "P2034"
  );
}

export async function getAdminReviewsPage(
  input: AdminReviewFilters,
  options: Readonly<{ prismaClient?: AdminReviewPrismaClient }> = {},
): Promise<AdminReviewsPageData> {
  const prismaClient = options.prismaClient ?? prisma;
  const requestedPage = normalizePage(input.page);
  const status = normalizeReviewStatus(input.status);
  const propertyId = isAdminAccommodationId(input.propertyId)
    ? input.propertyId
    : undefined;
  const where: Prisma.ReviewWhereInput = {
    ...(status ? { moderationStatus: status } : {}),
    ...(propertyId ? { propertyId } : {}),
  };

  const [properties, totalItems] = await Promise.all([
    prismaClient.property.findMany({
      where: {
        id: { in: [...adminAccommodationIds] },
        deletedAt: null,
      },
      orderBy: { nameEs: "asc" },
      select: {
        id: true,
        nameEs: true,
        nameEn: true,
      },
    }),
    prismaClient.review.count({ where }),
  ]);
  const totalPages = Math.max(1, Math.ceil(totalItems / ADMIN_REVIEW_PAGE_SIZE));
  const page = Math.min(requestedPage, totalPages);
  const reviews = await prismaClient.review.findMany({
    where,
    orderBy: [{ submittedAt: "desc" }, { id: "desc" }],
    skip: (page - 1) * ADMIN_REVIEW_PAGE_SIZE,
    take: ADMIN_REVIEW_PAGE_SIZE,
    select: adminReviewSelect,
  });

  return {
    generatedAt: new Date().toISOString(),
    properties,
    filters: {
      page,
      propertyId,
      status,
    },
    pagination: {
      page,
      pageSize: ADMIN_REVIEW_PAGE_SIZE,
      totalItems,
      totalPages,
    },
    reviews: reviews.map(toAdminReviewRow),
  };
}

export async function moderateAdminReview(
  input: ModerateAdminReviewInput,
  actor: AdminActor,
  options: Readonly<{
    now?: Date;
    prismaClient?: AdminReviewPrismaClient;
  }> = {},
): Promise<AdminReviewRow> {
  const reviewId = input.reviewId.trim();
  const expectedUpdatedAt = parseExpectedUpdatedAt(input.expectedUpdatedAt);
  const now = options.now ?? new Date();
  const prismaClient = options.prismaClient ?? prisma;
  const targetStatus = input.targetStatus as PrismaReviewModerationStatus;

  if (
    !reviewId ||
    (targetStatus !== PrismaReviewModerationStatus.PUBLISHED &&
      targetStatus !== PrismaReviewModerationStatus.HIDDEN)
  ) {
    throw new AdminReviewError("INVALID_ADMIN_REVIEW_REQUEST");
  }

  try {
    return await prismaClient.$transaction(
      async (transaction) => {
        const adminActor = await resolveAdminActor(transaction, actor);
        const existing = await transaction.review.findUnique({
          where: { id: reviewId },
          select: adminReviewSelect,
        });

        if (!existing) {
          throw new AdminReviewError("ADMIN_REVIEW_NOT_FOUND");
        }

        if (existing.updatedAt.toISOString() !== input.expectedUpdatedAt) {
          throw new AdminReviewError("ADMIN_REVIEW_STALE");
        }

        if (
          !isAllowedReviewTransition(
            existing.moderationStatus,
            targetStatus,
          )
        ) {
          throw new AdminReviewError("ADMIN_REVIEW_INVALID_TRANSITION");
        }

        const nextPublishedAt =
          targetStatus === PrismaReviewModerationStatus.PUBLISHED
            ? existing.publishedAt ?? now
            : existing.publishedAt;

        const updated = await transaction.review.updateMany({
          where: {
            id: existing.id,
            moderationStatus: existing.moderationStatus,
            updatedAt: expectedUpdatedAt,
          },
          data: {
            moderationStatus: targetStatus,
            publishedAt: nextPublishedAt,
            moderatedAt: now,
            moderatedByAdminId: adminActor.id,
          },
        });

        if (updated.count !== 1) {
          throw new AdminReviewError("ADMIN_REVIEW_STALE");
        }

        await transaction.adminAuditLog.create({
          data: {
            userId: adminActor.id,
            action: "REVIEW_MODERATION_STATUS_CHANGED",
            entityType: "Review",
            entityId: existing.id,
            metadata: {
              actorEmail: adminActor.email,
              reviewId: existing.id,
              reservationId: existing.reservationId,
              previousStatus: existing.moderationStatus,
              newStatus: targetStatus,
              moderatedAt: now.toISOString(),
              publishedAt: nextPublishedAt?.toISOString() ?? null,
            },
          },
        });

        const refreshed = await transaction.review.findUnique({
          where: { id: existing.id },
          select: adminReviewSelect,
        });

        if (!refreshed) {
          throw new AdminReviewError("ADMIN_REVIEW_NOT_FOUND");
        }

        return toAdminReviewRow(refreshed);
      },
      { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
    );
  } catch (error) {
    if (error instanceof AdminReviewError) {
      throw error;
    }

    if (isReviewSerializationConflict(error)) {
      throw new AdminReviewError("ADMIN_REVIEW_STALE");
    }

    throw new AdminReviewError("ADMIN_REVIEW_UNEXPECTED_ERROR");
  }
}
