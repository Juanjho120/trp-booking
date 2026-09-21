"use client";

import {
  CheckCircle2,
  Clock3,
  ShieldAlert,
  Star,
} from "lucide-react";
import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";

import { SiteFooter, SiteHeader } from "@/components/layout";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { useLocale } from "@/features/i18n";
import type {
  ReviewSubmissionErrorCode,
  ReviewSubmissionOutcome,
  ReviewSubmissionSummary,
} from "@/types/review-submission";

const MAX_COMMENT_CODE_POINTS = 2_000;
const REVIEW_TIME_ZONE = "America/Guatemala";

type RatingValue = 1 | 2 | 3 | 4 | 5;

function getCommentCodePointCount(value: string): number {
  return Array.from(value.replace(/\r\n/g, "\n").trim()).length;
}

function terminalFromSummary(
  summary: ReviewSubmissionSummary | null,
): ReviewSubmissionOutcome | null {
  return summary?.state === "ALREADY_SUBMITTED" ? "already-submitted" : null;
}

export function ReviewSubmissionPage({
  summary,
  errorCode,
}: Readonly<{
  summary: ReviewSubmissionSummary | null;
  errorCode: ReviewSubmissionErrorCode | null;
}>) {
  const { locale, messages, setLocale } = useLocale();
  const preferredLocaleAppliedRef = useRef(false);
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const [rating, setRating] = useState<RatingValue | null>(null);
  const [comment, setComment] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [inlineError, setInlineError] =
    useState<ReviewSubmissionErrorCode | null>(null);
  const [terminalOutcome, setTerminalOutcome] =
    useState<ReviewSubmissionOutcome | null>(() =>
      terminalFromSummary(summary),
    );
  const copy = messages.reviews.submission;
  const intlLocale = locale === "en" ? "en-US" : "es-GT";
  const commentCount = getCommentCodePointCount(comment);
  const canSubmit =
    summary?.state === "ACTIVE" &&
    !terminalOutcome &&
    Boolean(accessToken) &&
    rating !== null &&
    commentCount >= 1 &&
    commentCount <= MAX_COMMENT_CODE_POINTS &&
    !isSubmitting;

  useEffect(() => {
    if (preferredLocaleAppliedRef.current || !summary) {
      return;
    }

    preferredLocaleAppliedRef.current = true;

    if (locale !== summary.locale) {
      setLocale(summary.locale);
    }
  }, [locale, setLocale, summary]);

  useEffect(() => {
    const tokenSegment = window.location.pathname
      .split("/")
      .filter(Boolean)
      .pop();

    setAccessToken(tokenSegment ? decodeURIComponent(tokenSegment) : null);
  }, []);

  const formattedExpiresAt = useMemo(() => {
    if (!summary?.expiresAt) {
      return null;
    }

    return new Intl.DateTimeFormat(intlLocale, {
      dateStyle: "medium",
      timeStyle: "short",
      timeZone: REVIEW_TIME_ZONE,
    }).format(new Date(summary.expiresAt));
  }, [intlLocale, summary?.expiresAt]);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!canSubmit || rating === null || !accessToken) {
      setInlineError("INVALID_REVIEW_SUBMISSION");
      return;
    }

    setIsSubmitting(true);
    setInlineError(null);

    try {
      const response = await fetch(`/api/reviews/${encodeURIComponent(accessToken)}`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          rating,
          comment,
          locale,
        }),
      });
      const payload = (await response.json()) as {
        result?: { outcome?: ReviewSubmissionOutcome };
        error?: { code?: ReviewSubmissionErrorCode };
      };

      if (response.ok && payload.result?.outcome) {
        setTerminalOutcome(payload.result.outcome);
        return;
      }

      setInlineError(
        payload.error?.code ?? "REVIEW_SUBMISSION_UNEXPECTED_ERROR",
      );
    } catch {
      setInlineError("REVIEW_SUBMISSION_UNEXPECTED_ERROR");
    } finally {
      setIsSubmitting(false);
    }
  }

  const active = summary?.state === "ACTIVE" && !terminalOutcome;
  const terminalTitle = terminalOutcome
    ? terminalOutcome === "submitted"
      ? copy.successTitle
      : copy.alreadySubmittedTitle
    : errorCode
      ? copy.invalidTitle
      : summary?.state === "ALREADY_SUBMITTED"
        ? copy.alreadySubmittedTitle
        : summary?.state === "EXPIRED"
          ? copy.expiredTitle
          : summary?.state === "UNAVAILABLE"
            ? copy.unavailableTitle
            : copy.invalidTitle;
  const terminalDescription = terminalOutcome
    ? terminalOutcome === "submitted"
      ? copy.successDescription
      : copy.alreadySubmittedDescription
    : errorCode
      ? copy.invalidDescription
      : summary?.state === "ALREADY_SUBMITTED"
        ? copy.alreadySubmittedDescription
        : summary?.state === "EXPIRED"
          ? copy.expiredDescription
          : summary?.state === "UNAVAILABLE"
            ? copy.unavailableDescription
            : copy.invalidDescription;

  return (
    <div className="min-h-screen bg-background text-foreground">
      <SiteHeader />
      <main className="px-6 py-12 sm:py-16">
        <section className="mx-auto grid max-w-3xl gap-6">
          <div className="grid gap-3 text-center">
            <span className="mx-auto flex size-12 items-center justify-center rounded-full bg-primary/10 text-primary">
              {active ? (
                <Star aria-hidden="true" />
              ) : terminalOutcome === "submitted" ||
                terminalOutcome === "already-submitted" ||
                summary?.state === "ALREADY_SUBMITTED" ? (
                <CheckCircle2 aria-hidden="true" />
              ) : (
                <ShieldAlert aria-hidden="true" />
              )}
            </span>
            <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">
              {active ? copy.title : terminalTitle}
            </h1>
            <p className="mx-auto max-w-2xl text-sm leading-6 text-muted-foreground sm:text-base">
              {active ? copy.description : terminalDescription}
            </p>
          </div>

          {active && summary ? (
            <Card className="rounded-3xl">
              <CardHeader>
                <CardTitle>{copy.formTitle}</CardTitle>
                <CardDescription>{copy.formDescription}</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="mb-5 grid gap-3 rounded-2xl border border-border/70 bg-muted/30 p-4 text-sm">
                  <div>
                    <p className="text-muted-foreground">
                      {copy.propertyLabel}
                    </p>
                    <p className="font-medium">{summary.propertyName}</p>
                  </div>
                  {formattedExpiresAt ? (
                    <div>
                      <p className="text-muted-foreground">
                        {copy.expiresAtLabel}
                      </p>
                      <p className="flex items-center gap-2 font-medium">
                        <Clock3 aria-hidden="true" className="size-4" />
                        {formattedExpiresAt}
                      </p>
                    </div>
                  ) : null}
                </div>

                <form className="grid gap-5" onSubmit={handleSubmit}>
                  <fieldset className="grid gap-3">
                    <legend className="text-sm font-medium">
                      {copy.ratingLabel}
                    </legend>
                    <p className="text-sm text-muted-foreground">
                      {copy.ratingDescription}
                    </p>
                    <div className="grid grid-cols-5 gap-2">
                      {([1, 2, 3, 4, 5] as const).map((value) => (
                        <button
                          aria-label={copy.ratingOptions[value]}
                          aria-pressed={rating === value}
                          className={`flex h-12 flex-col items-center justify-center rounded-2xl border text-sm font-semibold transition focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/30 ${
                            rating === value
                              ? "border-primary bg-primary text-primary-foreground"
                              : "border-border bg-background text-foreground hover:bg-muted"
                          }`}
                          key={value}
                          onClick={() => setRating(value)}
                          type="button"
                        >
                          <Star
                            aria-hidden="true"
                            className="size-4"
                            fill={rating === value ? "currentColor" : "none"}
                          />
                          <span>{value}</span>
                        </button>
                      ))}
                    </div>
                  </fieldset>

                  <div className="grid gap-2">
                    <label className="text-sm font-medium" htmlFor="comment">
                      {copy.commentLabel}
                    </label>
                    <textarea
                      className="min-h-36 resize-y rounded-2xl border border-border bg-background px-4 py-3 text-sm leading-6 outline-none transition placeholder:text-muted-foreground focus:border-primary focus:ring-3 focus:ring-primary/20"
                      id="comment"
                      maxLength={MAX_COMMENT_CODE_POINTS}
                      onChange={(event) => setComment(event.target.value)}
                      placeholder={copy.commentPlaceholder}
                      value={comment}
                    />
                    <div className="flex flex-col gap-1 text-xs text-muted-foreground sm:flex-row sm:items-center sm:justify-between">
                      <span>{copy.commentHelper}</span>
                      <span aria-live="polite">
                        {copy.characterCount
                          .replace("{count}", String(commentCount))
                          .replace(
                            "{max}",
                            String(MAX_COMMENT_CODE_POINTS),
                          )}
                      </span>
                    </div>
                  </div>

                  {inlineError ? (
                    <p
                      aria-live="polite"
                      className="rounded-2xl border border-destructive/20 bg-destructive/10 px-4 py-3 text-sm text-destructive"
                    >
                      {copy.errors[inlineError]}
                    </p>
                  ) : null}

                  <Button className="h-11 rounded-full" disabled={!canSubmit}>
                    {isSubmitting ? copy.submitting : copy.submit}
                  </Button>
                </form>

                <p className="mt-5 rounded-2xl border border-primary/15 bg-primary/5 p-4 text-sm leading-6 text-muted-foreground">
                  {copy.securityNote}
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid justify-items-center gap-4">
              <Button asChild className="rounded-full">
                <Link href="/alojamientos">{copy.backToAccommodations}</Link>
              </Button>
            </div>
          )}
        </section>
      </main>
      <SiteFooter />
    </div>
  );
}
