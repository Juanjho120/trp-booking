import type { AdminPagination } from "@/types/admin";

export type PublicReviewItem = Readonly<{
  rating: number;
  comment: string;
  submittedAt: string;
  guestDisplayName: string;
  property: Readonly<{
    nameEs: string;
    nameEn: string;
    slug: string;
  }>;
}>;

export type PublicReviewsPageData = Readonly<{
  generatedAt: string;
  pagination: AdminPagination;
  reviews: readonly PublicReviewItem[];
}>;
