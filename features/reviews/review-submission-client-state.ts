import type {
  ReviewSubmissionErrorCode,
  ReviewSubmissionOutcome,
  ReviewSubmissionSummaryState,
} from "@/types/review-submission";

export type ReviewSubmissionClientState =
  | ReviewSubmissionSummaryState
  | "SUBMITTED";

export type ReviewSubmissionTerminalCopyKind =
  | "already-submitted"
  | "expired"
  | "invalid"
  | "submitted"
  | "unavailable";

export function getInitialReviewSubmissionClientState(
  summaryState: ReviewSubmissionSummaryState | null,
): ReviewSubmissionClientState {
  return summaryState ?? "UNAVAILABLE";
}

export function resolveReviewSubmissionClientState(
  currentState: ReviewSubmissionClientState,
  result: Readonly<{
    errorCode?: ReviewSubmissionErrorCode | null;
    outcome?: ReviewSubmissionOutcome | null;
  }>,
): ReviewSubmissionClientState {
  if (result.outcome === "submitted") {
    return "SUBMITTED";
  }

  if (result.outcome === "already-submitted") {
    return "ALREADY_SUBMITTED";
  }

  switch (result.errorCode) {
    case "INVALID_REVIEW_INVITATION":
    case "REVIEW_INVITATION_UNAVAILABLE":
      return "UNAVAILABLE";
    case "REVIEW_INVITATION_EXPIRED":
      return "EXPIRED";
    default:
      return currentState;
  }
}

export function getReviewSubmissionTerminalCopyKind(
  clientState: ReviewSubmissionClientState,
  errorCode: ReviewSubmissionErrorCode | null,
): ReviewSubmissionTerminalCopyKind {
  if (clientState === "SUBMITTED") {
    return "submitted";
  }

  if (clientState === "ALREADY_SUBMITTED") {
    return "already-submitted";
  }

  if (clientState === "EXPIRED") {
    return "expired";
  }

  if (errorCode === "REVIEW_INVITATION_EXPIRED") {
    return "expired";
  }

  if (errorCode === "INVALID_REVIEW_INVITATION") {
    return "invalid";
  }

  return "unavailable";
}

export function readReviewSubmissionTokenFromPathname(
  pathname: string,
): string | null {
  const tokenSegment = pathname.split("/").filter(Boolean).pop();

  if (!tokenSegment || tokenSegment === "resenas") {
    return null;
  }

  try {
    return decodeURIComponent(tokenSegment);
  } catch {
    return null;
  }
}
