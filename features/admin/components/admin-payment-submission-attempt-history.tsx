"use client";

import { useParams } from "next/navigation";

import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { useLocale } from "@/features/i18n";
import type { AdminPaymentSubmissionAttemptHistory } from "@/types/admin-payment-submission-attempt";
import type {
  PaymentSubmissionAttemptSource,
  PaymentSubmissionAttemptStatus,
} from "@/types/payment-submission-attempt";

import { AdminAdditionalChargesSection } from "./admin-additional-charges-section";
import {
  AdminRecordPagination,
  useAdminRecordPagination,
} from "./admin-record-pagination";

type AdminPaymentSubmissionAttemptHistoryProps = Readonly<{
  history: AdminPaymentSubmissionAttemptHistory;
}>;

export function AdminPaymentSubmissionAttemptHistory({
  history,
}: AdminPaymentSubmissionAttemptHistoryProps) {
  const params = useParams<{ reservationId?: string | string[] }>();
  const { locale, messages } = useLocale();
  const paymentCopy = messages.admin.paymentsPage;
  const reservationCopy = messages.admin.reservationsPage;
  const notificationLabels = reservationCopy.notifications.labels;
  const historyCopy = reservationCopy.operationalHistory;
  const paymentStatuses = messages.admin.statuses.payment;
  const pagination = useAdminRecordPagination(history.attempts);
  const intlLocale = locale === "en" ? "en-US" : "es-GT";
  const reservationId = Array.isArray(params.reservationId)
    ? (params.reservationId[0] ?? "")
    : (params.reservationId ?? "");
  const paginationLabels = {
    next: reservationCopy.actions.next,
    of: reservationCopy.labels.of,
    page: reservationCopy.labels.page,
    previous: reservationCopy.actions.previous,
    results: reservationCopy.labels.results,
  } as const;

  function formatDateTime(value: string | null): string {
    if (!value) {
      return paymentCopy.labels.unavailable;
    }

    return new Intl.DateTimeFormat(intlLocale, {
      dateStyle: "medium",
      timeStyle: "short",
    }).format(new Date(value));
  }

  function sourceLabel(source: PaymentSubmissionAttemptSource): string {
    switch (source) {
      case "RETRY_PAGE":
        return messages.payments.retry.page.title;
      case "LIFECYCLE_ADJUSTMENT":
        return messages.payments.lifecycleAdjustment.title;
      case "ADDITIONAL_CHARGE":
        return reservationCopy.additionalCharges.title;
      case "INITIAL_CHECKOUT":
      default:
        return messages.payments.tilopaySdk.title;
    }
  }

  function statusLabel(status: PaymentSubmissionAttemptStatus): string {
    switch (status) {
      case "STARTED":
        return historyCopy.statuses.PROCESSING;
      case "SUBMITTED":
        return paymentStatuses.PENDING;
      case "APPROVED":
        return paymentStatuses.APPROVED;
      case "REJECTED":
        return paymentStatuses.REJECTED;
      case "FAILED":
        return paymentStatuses.FAILED;
      case "UNKNOWN":
        return historyCopy.events.REFUND_PROVIDER_RESULT_UNCERTAIN.title;
      default:
        return paymentCopy.labels.unavailable;
    }
  }

  return (
    <>
      {reservationId ? (
        <AdminAdditionalChargesSection reservationId={reservationId} />
      ) : null}

      <Card className="mt-6 border-border/70 bg-card shadow-sm">
        <CardHeader>
          <CardTitle>
            {paymentCopy.title} · {notificationLabels.attempts}
          </CardTitle>
          <CardDescription>{historyCopy.description}</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-6">
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <SummaryValue
              label={notificationLabels.attempts}
              value={String(history.totalAttempts)}
            />
            <SummaryValue
              label={`${paymentStatuses.REJECTED} / ${paymentStatuses.FAILED}`}
              value={String(history.rejectedOrFailedAttempts)}
            />
            <SummaryValue
              label={notificationLabels.lastAttempt}
              value={formatDateTime(history.lastAttemptAt)}
            />
            <SummaryValue
              label={notificationLabels.origin}
              value={
                history.lastSource
                  ? sourceLabel(history.lastSource)
                  : paymentCopy.labels.unavailable
              }
            />
          </div>

          {history.attempts.length > 0 ? (
            <>
              <Accordion
                className="grid gap-3"
                collapsible
                key={`${pagination.page}-${pagination.pageSize}`}
                type="single"
              >
                {pagination.pageItems.map((attempt) => (
                  <AccordionItem
                    className="overflow-hidden rounded-2xl border border-border bg-muted/20 last:border-b"
                    key={attempt.id}
                    value={attempt.id}
                  >
                    <AccordionTrigger className="px-4 py-3 hover:bg-muted/40 sm:px-5">
                      <div className="grid min-w-0 flex-1 gap-3 pr-2 sm:grid-cols-[minmax(0,1.2fr)_minmax(0,1fr)_auto] sm:items-center">
                        <div className="min-w-0">
                          <p className="break-all text-sm font-semibold">
                            {notificationLabels.attempts} #{attempt.attemptNumber}
                          </p>
                          <p className="mt-1 truncate text-sm text-muted-foreground">
                            {sourceLabel(attempt.source)}
                          </p>
                        </div>
                        <p className="truncate text-sm text-muted-foreground">
                          {formatDateTime(attempt.startedAt)}
                        </p>
                        <Badge
                          className="justify-self-start sm:justify-self-end"
                          variant="outline"
                        >
                          {statusLabel(attempt.status)}
                        </Badge>
                      </div>
                    </AccordionTrigger>
                    <AccordionContent className="border-t border-border/70 px-4 pt-4 sm:px-5">
                      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
                        <DetailValue
                          label={paymentCopy.labels.payment}
                          value={attempt.paymentId}
                        />
                        <DetailValue
                          label={notificationLabels.origin}
                          value={sourceLabel(attempt.source)}
                        />
                        <DetailValue
                          label={paymentCopy.labels.statusFilter}
                          value={statusLabel(attempt.status)}
                        />
                        <DetailValue
                          label={paymentCopy.labels.environment}
                          value={attempt.environment}
                        />
                        <DetailValue
                          label={notificationLabels.locale}
                          value={
                            messages.admin.reservationsPage.notifications.locales[
                              attempt.locale
                            ]
                          }
                        />
                        <DetailValue
                          label={paymentCopy.labels.createdAt}
                          value={formatDateTime(attempt.startedAt)}
                        />
                        <DetailValue
                          label={historyCopy.labels.expiresAt}
                          value={formatDateTime(attempt.preflightExpiresAt)}
                        />
                        <DetailValue
                          label={notificationLabels.lastAttempt}
                          value={formatDateTime(attempt.completedAt)}
                        />
                        <DetailValue
                          label={historyCopy.labels.errorCode}
                          value={
                            attempt.safeResultCode ??
                            paymentCopy.labels.unavailable
                          }
                        />
                      </div>
                    </AccordionContent>
                  </AccordionItem>
                ))}
              </Accordion>
              <AdminRecordPagination
                labels={paginationLabels}
                onPageChange={pagination.setPage}
                onPageSizeChange={pagination.changePageSize}
                page={pagination.page}
                pageSize={pagination.pageSize}
                totalItems={pagination.totalItems}
                totalPages={pagination.totalPages}
              />
            </>
          ) : (
            <p className="text-sm text-muted-foreground">
              {historyCopy.empty}
            </p>
          )}
        </CardContent>
      </Card>
    </>
  );
}

function SummaryValue({
  label,
  value,
}: Readonly<{ label: string; value: string }>) {
  return (
    <div className="rounded-2xl border border-border/70 bg-muted/20 p-4">
      <p className="text-xs uppercase tracking-wide text-muted-foreground">
        {label}
      </p>
      <p className="mt-2 break-words text-lg font-semibold">{value}</p>
    </div>
  );
}

function DetailValue({
  label,
  value,
}: Readonly<{ label: string; value: string }>) {
  return (
    <div className="min-w-0">
      <p className="text-xs uppercase tracking-wide text-muted-foreground">
        {label}
      </p>
      <p className="mt-1 break-words text-sm font-medium">{value}</p>
    </div>
  );
}
