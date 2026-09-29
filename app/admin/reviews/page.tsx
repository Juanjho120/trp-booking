import type { Metadata } from "next";

import { AdminReviewsPageView } from "@/features/admin/components/admin-reviews-page";
import { getAdminReviewsPage } from "@/lib/admin/reviews";
import { esMessages } from "@/messages";

type AdminReviewsPageProps = Readonly<{
  searchParams: Promise<{
    status?: string;
    propertyId?: string;
    page?: string;
  }>;
}>;

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: esMessages.admin.reviewsPage.seoTitle,
  robots: {
    index: false,
    follow: false,
  },
};

export default async function AdminReviewsPage({
  searchParams,
}: AdminReviewsPageProps) {
  const params = await searchParams;
  const data = await getAdminReviewsPage({
    status: params.status,
    propertyId: params.propertyId,
    page: Number(params.page),
  });

  return <AdminReviewsPageView data={data} />;
}
