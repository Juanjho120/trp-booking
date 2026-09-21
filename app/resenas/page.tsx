import type { Metadata } from "next";

import { PublicReviewsPage } from "@/features/reviews";
import { createSeoMetadata } from "@/config/seo";
import { getPublishedReviews } from "@/lib/reviews";
import { esMessages } from "@/messages";

type ReviewsPageProps = Readonly<{
  searchParams: Promise<{
    page?: string;
  }>;
}>;

export const dynamic = "force-dynamic";

export const metadata: Metadata = createSeoMetadata({
  title: esMessages.seo.reviews.title,
  description: esMessages.seo.reviews.description,
  path: "/resenas",
});

export default async function ReviewsPage({ searchParams }: ReviewsPageProps) {
  const params = await searchParams;
  const data = await getPublishedReviews({ page: Number(params.page) });

  return <PublicReviewsPage data={data} />;
}
