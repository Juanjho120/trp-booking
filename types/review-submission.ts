export type ReviewSubmissionLocale = "es" | "en";

export type ReviewSubmissionSummaryState =
  | "ACTIVE"
  | "ALREADY_SUBMITTED"
  | "EXPIRED"
  | "UNAVAILABLE";

export type ReviewSubmissionSummary = Readonly<{
  state: ReviewSubmissionSummaryState;
  locale: ReviewSubmissionLocale;
  propertyName: string | null;
  expiresAt: string | null;
}>;

export type ReviewSubmissionErrorCode =
  | "INVALID_REVIEW_INVITATION"
  | "INVALID_REVIEW_SUBMISSION"
  | "REVIEW_INVITATION_EXPIRED"
  | "REVIEW_INVITATION_UNAVAILABLE"
  | "REVIEW_SUBMISSION_UNEXPECTED_ERROR";

export type ReviewSubmissionOutcome = "submitted" | "already-submitted";

export type ReviewSubmissionResult = Readonly<{
  outcome: ReviewSubmissionOutcome;
}>;
