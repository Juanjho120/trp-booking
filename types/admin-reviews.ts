import type { AdminPagination, AdminPropertyOption } from "@/types/admin";

export const ADMIN_REVIEW_MODERATION_STATUSES = [
  "PENDING",
  "PUBLISHED",
  "HIDDEN",
] as const;

export type AdminReviewModerationStatus =
  (typeof ADMIN_REVIEW_MODERATION_STATUSES)[number];

export const ADMIN_REVIEW_TARGET_STATUSES = [
  "PUBLISHED",
  "HIDDEN",
] as const;

export type AdminReviewTargetStatus =
  (typeof ADMIN_REVIEW_TARGET_STATUSES)[number];

export const ADMIN_REVIEW_ERROR_CODES = [
  "ADMIN_UNAUTHORIZED",
  "ADMIN_REVIEW_ORIGIN_INVALID",
  "INVALID_ADMIN_REVIEW_REQUEST",
  "ADMIN_REVIEW_NOT_FOUND",
  "ADMIN_REVIEW_STALE",
  "ADMIN_REVIEW_INVALID_TRANSITION",
  "ADMIN_REVIEW_UNEXPECTED_ERROR",
] as const;

export type AdminReviewErrorCode = (typeof ADMIN_REVIEW_ERROR_CODES)[number];

export type AdminReviewRow = Readonly<{
  id: string;
  reservationId: string;
  rating: number;
  comment: string;
  guestDisplayName: string;
  moderationStatus: AdminReviewModerationStatus;
  submittedAt: string;
  publishedAt: string | null;
  moderatedAt: string | null;
  updatedAt: string;
  property: AdminPropertyOption;
  moderatedByAdmin: Readonly<{
    name: string | null;
    email: string;
  }> | null;
}>;

export type AdminReviewFilters = Readonly<{
  status?: string;
  propertyId?: string;
  page?: number;
}>;

export type AdminReviewsPageData = Readonly<{
  generatedAt: string;
  properties: readonly AdminPropertyOption[];
  filters: Readonly<{
    status?: AdminReviewModerationStatus;
    propertyId?: string;
    page: number;
  }>;
  pagination: AdminPagination;
  reviews: readonly AdminReviewRow[];
}>;

export type ModerateAdminReviewInput = Readonly<{
  reviewId: string;
  targetStatus: AdminReviewTargetStatus;
  expectedUpdatedAt: string;
}>;
