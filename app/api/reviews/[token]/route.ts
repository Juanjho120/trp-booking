import { NextResponse } from "next/server";

import {
  ReviewSubmissionError,
  submitReviewSubmission,
} from "@/lib/reviews";
import type {
  ReviewSubmissionErrorCode,
  ReviewSubmissionResult,
} from "@/types/review-submission";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const noStoreHeaders = {
  "Cache-Control": "no-store",
} as const;

function statusForError(code: ReviewSubmissionErrorCode): number {
  switch (code) {
    case "INVALID_REVIEW_SUBMISSION":
      return 400;
    case "INVALID_REVIEW_INVITATION":
      return 404;
    case "REVIEW_INVITATION_EXPIRED":
      return 410;
    case "REVIEW_INVITATION_UNAVAILABLE":
      return 410;
    case "REVIEW_SUBMISSION_UNEXPECTED_ERROR":
      return 500;
  }
}

function statusForResult(result: ReviewSubmissionResult): number {
  return result.outcome === "submitted" ? 201 : 200;
}

async function readJson(request: Request): Promise<unknown> {
  try {
    return await request.json();
  } catch {
    throw new ReviewSubmissionError("INVALID_REVIEW_SUBMISSION");
  }
}

export async function POST(
  request: Request,
  { params }: Readonly<{ params: Promise<{ token: string }> }>,
) {
  const { token: encodedToken } = await params;

  try {
    const token = decodeURIComponent(encodedToken);
    const body = await readJson(request);
    const result = await submitReviewSubmission(token, body);

    return NextResponse.json(
      { result },
      {
        status: statusForResult(result),
        headers: noStoreHeaders,
      },
    );
  } catch (error) {
    const code =
      error instanceof ReviewSubmissionError
        ? error.code
        : "REVIEW_SUBMISSION_UNEXPECTED_ERROR";

    return NextResponse.json(
      { error: { code } },
      {
        status: statusForError(code),
        headers: noStoreHeaders,
      },
    );
  }
}
