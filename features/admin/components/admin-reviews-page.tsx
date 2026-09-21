"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { ExternalLink, Star } from "lucide-react";
import { useRef, useState } from "react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { useLocale } from "@/features/i18n";
import type {
  AdminReviewErrorCode,
  AdminReviewModerationStatus,
  AdminReviewRow,
  AdminReviewsPageData,
  AdminReviewTargetStatus,
} from "@/types/admin-reviews";
import type { Locale } from "@/types/locale";

import { AdminPageHeader } from "./admin-page-header";
import { AdminSnackbar } from "./admin-snackbar";

const reviewStatuses = ["PENDING", "PUBLISHED", "HIDDEN"] as const;
const ALL_FILTER_VALUE = "__all__";

type ModerationTarget = Readonly<{
  review: AdminReviewRow;
  targetStatus: AdminReviewTargetStatus;
}>;

type ModerationResponse =
  | Readonly<{ review: AdminReviewRow }>
  | Readonly<{ error: { code: AdminReviewErrorCode | string } }>;

function getIntlLocale(locale: Locale): string {
  return locale === "en" ? "en-US" : "es-GT";
}

function isErrorResponse(
  response: ModerationResponse,
): response is { error: { code: string } } {
  return "error" in response;
}

function targetForReview(
  review: AdminReviewRow,
): AdminReviewTargetStatus | null {
  if (review.moderationStatus === "PENDING") return "PUBLISHED";
  if (review.moderationStatus === "PUBLISHED") return "HIDDEN";
  if (review.moderationStatus === "HIDDEN") return "PUBLISHED";
  return null;
}

export function AdminReviewsPageView({
  data,
}: Readonly<{ data: AdminReviewsPageData }>) {
  const router = useRouter();
  const { locale, messages } = useLocale();
  const copy = messages.admin.reviewsPage;
  const [moderationTarget, setModerationTarget] =
    useState<ModerationTarget | null>(null);
  const [busyReviewId, setBusyReviewId] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const propertyFilterInputRef = useRef<HTMLInputElement>(null);
  const statusFilterInputRef = useRef<HTMLInputElement>(null);
  const intlLocale = getIntlLocale(locale);

  function statusLabel(status: AdminReviewModerationStatus): string {
    return copy.statuses[status];
  }

  function propertyName(review: AdminReviewRow): string {
    return locale === "en" ? review.property.nameEn : review.property.nameEs;
  }

  function formatDateTime(value: string | null): string {
    if (!value) return copy.labels.unavailable;

    return new Intl.DateTimeFormat(intlLocale, {
      dateStyle: "medium",
      timeStyle: "short",
      timeZone: "America/Guatemala",
    }).format(new Date(value));
  }

  function buildUrl(
    overrides: Record<string, string | number | undefined>,
  ): string {
    const params = new URLSearchParams();
    const values = {
      propertyId: data.filters.propertyId,
      status: data.filters.status,
      page: data.filters.page,
      ...overrides,
    };

    Object.entries(values).forEach(([key, value]) => {
      if (value !== undefined && value !== "" && value !== 1) {
        params.set(key, String(value));
      }
    });

    const query = params.toString();
    return query ? `/admin/reviews?${query}` : "/admin/reviews";
  }

  function resolveError(code: string): string {
    if (code in copy.errors) {
      return copy.errors[code as keyof typeof copy.errors];
    }

    return copy.errors.ADMIN_REVIEW_UNEXPECTED_ERROR;
  }

  function successForTarget(targetStatus: AdminReviewTargetStatus): string {
    if (!moderationTarget) return copy.feedback.published;
    if (moderationTarget.review.moderationStatus === "HIDDEN") {
      return copy.feedback.republished;
    }

    return targetStatus === "HIDDEN"
      ? copy.feedback.hidden
      : copy.feedback.published;
  }

  async function submitModeration(): Promise<void> {
    if (!moderationTarget) {
      return;
    }

    setBusyReviewId(moderationTarget.review.id);
    setSuccessMessage(null);
    setErrorMessage(null);

    try {
      const response = await fetch(
        `/api/admin/reviews/${encodeURIComponent(
          moderationTarget.review.id,
        )}/moderation`,
        {
          method: "PATCH",
          headers: {
            accept: "application/json",
            "content-type": "application/json",
          },
          body: JSON.stringify({
            targetStatus: moderationTarget.targetStatus,
            expectedUpdatedAt: moderationTarget.review.updatedAt,
          }),
        },
      );
      const payload = (await response.json()) as ModerationResponse;

      if (!response.ok || isErrorResponse(payload)) {
        const code = isErrorResponse(payload)
          ? payload.error.code
          : "ADMIN_REVIEW_UNEXPECTED_ERROR";
        setErrorMessage(resolveError(code));
        router.refresh();
        return;
      }

      setSuccessMessage(successForTarget(moderationTarget.targetStatus));
      setModerationTarget(null);
      router.refresh();
    } catch {
      setErrorMessage(copy.errors.ADMIN_REVIEW_UNEXPECTED_ERROR);
    } finally {
      setBusyReviewId(null);
    }
  }

  function actionLabel(
    review: AdminReviewRow,
    targetStatus: AdminReviewTargetStatus,
  ): string {
    if (review.moderationStatus === "HIDDEN") return copy.actions.republish;
    return targetStatus === "HIDDEN" ? copy.actions.hide : copy.actions.publish;
  }

  const dialogTitle =
    moderationTarget?.review.moderationStatus === "HIDDEN"
      ? copy.dialog.republishTitle
      : moderationTarget?.targetStatus === "HIDDEN"
        ? copy.dialog.hideTitle
        : copy.dialog.publishTitle;

  return (
    <>
      <AdminPageHeader
        badge={copy.badge}
        description={copy.description}
        title={copy.title}
      />

      <Card className="mb-6 border-border/70 bg-card shadow-sm">
        <CardContent className="py-5">
          <form
            className="grid gap-3 md:grid-cols-[minmax(12rem,0.8fr)_minmax(12rem,0.8fr)_auto_auto] md:items-end"
            method="get"
          >
            <div className="grid gap-2 text-sm font-medium">
              <span className="sr-only" id="reviews-property-filter-label">
                {copy.labels.property}
              </span>
              <Select
                defaultValue={data.filters.propertyId ?? ALL_FILTER_VALUE}
                key={`property:${data.filters.propertyId ?? "all"}`}
                onValueChange={(value) => {
                  if (propertyFilterInputRef.current) {
                    propertyFilterInputRef.current.value =
                      value === ALL_FILTER_VALUE ? "" : value;
                  }
                }}
              >
                <SelectTrigger aria-labelledby="reviews-property-filter-label">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={ALL_FILTER_VALUE}>
                    {copy.filters.allProperties}
                  </SelectItem>
                  {data.properties.map((property) => (
                    <SelectItem key={property.id} value={property.id}>
                      {locale === "en" ? property.nameEn : property.nameEs}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <input
                defaultValue={data.filters.propertyId ?? ""}
                key={`property-input:${data.filters.propertyId ?? "all"}`}
                name="propertyId"
                ref={propertyFilterInputRef}
                type="hidden"
              />
            </div>

            <div className="grid gap-2 text-sm font-medium">
              <span className="sr-only" id="reviews-status-filter-label">
                {copy.labels.status}
              </span>
              <Select
                defaultValue={data.filters.status ?? ALL_FILTER_VALUE}
                key={`status:${data.filters.status ?? "all"}`}
                onValueChange={(value) => {
                  if (statusFilterInputRef.current) {
                    statusFilterInputRef.current.value =
                      value === ALL_FILTER_VALUE ? "" : value;
                  }
                }}
              >
                <SelectTrigger aria-labelledby="reviews-status-filter-label">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={ALL_FILTER_VALUE}>
                    {copy.filters.allStatuses}
                  </SelectItem>
                  {reviewStatuses.map((status) => (
                    <SelectItem key={status} value={status}>
                      {statusLabel(status)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <input
                defaultValue={data.filters.status ?? ""}
                key={`status-input:${data.filters.status ?? "all"}`}
                name="status"
                ref={statusFilterInputRef}
                type="hidden"
              />
            </div>

            <Button type="submit">{copy.actions.confirm}</Button>
            <Button asChild variant="outline">
              <Link href="/admin/reviews">{copy.actions.clear}</Link>
            </Button>
          </form>
        </CardContent>
      </Card>

      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-muted-foreground">
          {copy.labels.results}: {data.pagination.totalItems}
        </p>
        <p className="text-sm text-muted-foreground">
          {copy.labels.page} {data.pagination.page} {copy.labels.of}{" "}
          {data.pagination.totalPages}
        </p>
      </div>

      {data.reviews.length > 0 ? (
        <div className="grid gap-4">
          {data.reviews.map((review) => {
            const targetStatus = targetForReview(review);

            return (
              <Card
                className="border-border/70 bg-card shadow-sm"
                key={review.id}
              >
                <CardContent className="grid gap-5 p-5">
                  <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <Badge variant="outline">
                          {statusLabel(review.moderationStatus)}
                        </Badge>
                        <span className="flex items-center gap-1 text-sm font-medium text-foreground">
                          {Array.from({ length: review.rating }).map(
                            (_, index) => (
                              <Star
                                aria-hidden="true"
                                className="size-4 fill-primary text-primary"
                                key={index}
                              />
                            ),
                          )}
                        </span>
                      </div>
                      <h2 className="mt-3 text-xl font-semibold tracking-tight">
                        {review.guestDisplayName}
                      </h2>
                      <p className="mt-1 text-sm text-muted-foreground">
                        {propertyName(review)}
                      </p>
                    </div>

                    <div className="flex flex-wrap gap-2">
                      <Button asChild variant="outline">
                        <Link
                          href={`/admin/reservations/${encodeURIComponent(
                            review.reservationId,
                          )}`}
                        >
                          {copy.labels.reservation}
                          <ExternalLink aria-hidden="true" />
                        </Link>
                      </Button>
                      {targetStatus ? (
                        <Button
                          disabled={busyReviewId !== null}
                          onClick={() =>
                            setModerationTarget({ review, targetStatus })
                          }
                          type="button"
                        >
                          {actionLabel(review, targetStatus)}
                        </Button>
                      ) : null}
                    </div>
                  </div>

                  <p className="whitespace-pre-wrap rounded-2xl border border-border/70 bg-muted/20 p-4 text-sm leading-6">
                    {review.comment}
                  </p>

                  <div className="grid gap-3 text-sm sm:grid-cols-2 xl:grid-cols-4">
                    <ReviewMetric
                      label={copy.labels.submittedAt}
                      value={formatDateTime(review.submittedAt)}
                    />
                    <ReviewMetric
                      label={copy.labels.publishedAt}
                      value={formatDateTime(review.publishedAt)}
                    />
                    <ReviewMetric
                      label={copy.labels.moderatedAt}
                      value={formatDateTime(review.moderatedAt)}
                    />
                    <ReviewMetric
                      label={copy.labels.moderatedBy}
                      value={
                        review.moderatedByAdmin?.email ??
                        copy.labels.unavailable
                      }
                    />
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      ) : (
        <Card className="border-dashed bg-muted/20 shadow-none">
          <CardContent className="py-10 text-center text-sm text-muted-foreground">
            {copy.empty.noResults}
          </CardContent>
        </Card>
      )}

      <div className="mt-6 flex items-center justify-between gap-3">
        <Button
          asChild={data.pagination.page > 1}
          disabled={data.pagination.page <= 1}
          variant="outline"
        >
          {data.pagination.page > 1 ? (
            <Link href={buildUrl({ page: data.pagination.page - 1 })}>
              {copy.actions.previous}
            </Link>
          ) : (
            <span>{copy.actions.previous}</span>
          )}
        </Button>
        <Button
          asChild={data.pagination.page < data.pagination.totalPages}
          disabled={data.pagination.page >= data.pagination.totalPages}
          variant="outline"
        >
          {data.pagination.page < data.pagination.totalPages ? (
            <Link href={buildUrl({ page: data.pagination.page + 1 })}>
              {copy.actions.next}
            </Link>
          ) : (
            <span>{copy.actions.next}</span>
          )}
        </Button>
      </div>

      <Sheet
        onOpenChange={(open) => {
          if (!open && busyReviewId === null) {
            setModerationTarget(null);
          }
        }}
        open={moderationTarget !== null}
      >
        <SheetContent closeLabel={copy.actions.cancel}>
          <SheetHeader>
            <SheetTitle>{dialogTitle}</SheetTitle>
            <SheetDescription>{copy.dialog.description}</SheetDescription>
          </SheetHeader>
          {moderationTarget ? (
            <div className="mx-6 mt-4 grid gap-2 rounded-2xl border border-border/70 bg-muted/20 p-4 text-sm">
              <p className="font-semibold">
                {moderationTarget.review.guestDisplayName}
              </p>
              <p className="text-muted-foreground">
                {propertyName(moderationTarget.review)}
              </p>
              <p className="line-clamp-4 whitespace-pre-wrap">
                {moderationTarget.review.comment}
              </p>
            </div>
          ) : null}
          <SheetFooter className="mt-6">
            <Button
              disabled={busyReviewId !== null}
              onClick={() => setModerationTarget(null)}
              type="button"
              variant="outline"
            >
              {copy.actions.cancel}
            </Button>
            <Button
              disabled={busyReviewId !== null}
              onClick={() => void submitModeration()}
              type="button"
            >
              {copy.actions.confirm}
            </Button>
          </SheetFooter>
        </SheetContent>
      </Sheet>

      <AdminSnackbar
        closeLabel={copy.actions.cancel}
        message={successMessage}
        onDismiss={() => setSuccessMessage(null)}
      />
      <AdminSnackbar
        closeLabel={copy.actions.cancel}
        message={errorMessage}
        onDismiss={() => setErrorMessage(null)}
        variant="error"
      />
    </>
  );
}

function ReviewMetric({
  label,
  value,
}: Readonly<{ label: string; value: string }>) {
  return (
    <div className="rounded-2xl border border-border/60 bg-background px-3 py-2">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="mt-1 break-words font-medium text-foreground">{value}</p>
    </div>
  );
}
