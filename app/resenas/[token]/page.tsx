import type { Metadata } from "next";

import { ReviewSubmissionPage } from "@/features/reviews/components/review-submission-page";
import {
  getReviewSubmissionSummary,
  ReviewSubmissionError,
} from "@/lib/reviews";
import type { ReviewSubmissionErrorCode } from "@/types/review-submission";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  robots: {
    index: false,
    follow: false,
  },
};

export default async function ReviewSubmissionRoute({
  params,
}: Readonly<{
  params: Promise<{ token: string }>;
}>) {
  const { token: encodedToken } = await params;

  try {
    const token = decodeURIComponent(encodedToken);
    const summary = await getReviewSubmissionSummary(token);

    return <ReviewSubmissionPage errorCode={null} summary={summary} />;
  } catch (error) {
    const errorCode: ReviewSubmissionErrorCode =
      error instanceof ReviewSubmissionError
        ? error.code
        : "REVIEW_SUBMISSION_UNEXPECTED_ERROR";

    return <ReviewSubmissionPage errorCode={errorCode} summary={null} />;
  }
}
