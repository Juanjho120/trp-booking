"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  CalendarClock,
  CreditCard,
  ExternalLink,
  History,
  Loader2,
  Mail,
  RefreshCcw,
  RotateCcw,
  Send,
  ShieldCheck,
} from "lucide-react";
import { useMemo, useState } from "react";

import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { siteConfig } from "@/config/site";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useLocale } from "@/features/i18n";
import type {
  AdminEmailNotificationResendErrorCode,
  AdminEmailNotificationResendResult,
} from "@/types/admin-email-notification-resend";
import type {
  AdminReservationDetailData,
  AdminReservationDetailEmailNotification,
} from "@/types/admin-reservation-detail";
import type { Locale } from "@/types/locale";

import { AdminPageHeader } from "./admin-page-header";
import {
  AdminRecordPagination,
  useAdminRecordPagination,
} from "./admin-record-pagination";
import { AdminReservationCancellationSection } from "./admin-reservation-cancellation-section";
import { AdminReservationDateMutationSection } from "./admin-reservation-date-mutation-section";
import { AdminReservationLifecycleAdjustmentRefundSection } from "./admin-reservation-lifecycle-adjustment-refund-section";
import { AdminReservationOperationalHistorySection } from "./admin-reservation-operational-history-section";
import { AdminReservationRefundSection } from "./admin-reservation-refund-section";
import { AdminSnackbar } from "./admin-snackbar";
import type {
  AdminPaymentSubmissionAttemptHistory as AdminPaymentSubmissionAttemptHistoryData,
} from "@/types/admin-payment-submission-attempt";
import { AdminPaymentSubmissionAttemptHistory } from "./admin-payment-submission-attempt-history";

const manuallyResendableTypes = new Set([
  "RESERVATION_CONFIRMED",
  "ADMIN_NEW_RESERVATION",
]);
const manuallyResendableStatuses = new Set(["PENDING", "FAILED", "SENT"]);
const effectiveRefundStatuses = new Set(["APPROVED", "MANUAL"]);

type ManualResendTarget = Readonly<{
  notification: AdminReservationDetailEmailNotification;
  requestId: string;
}>;

type ManualResendApiResponse = Readonly<{
  result?: AdminEmailNotificationResendResult;
  error?: Readonly<{
    code?: AdminEmailNotificationResendErrorCode;
  }>;
}>;

function getIntlLocale(locale: Locale): string {
  return locale === "en" ? "en-US" : "es-GT";
}

function canManuallyResend(
  notification: AdminReservationDetailEmailNotification,
  reservationStatus: string,
): boolean {
  return (
    reservationStatus === "CONFIRMED" &&
    manuallyResendableTypes.has(notification.type) &&
    manuallyResendableStatuses.has(notification.status) &&
    (notification.status === "SENT" || !notification.hasManualResends)
  );
}

export function AdminReservationDetailPage({
  paymentAttemptHistory,
  reservation,
}: Readonly<{
  paymentAttemptHistory: AdminPaymentSubmissionAttemptHistoryData;
  reservation: AdminReservationDetailData;
}>) {
  const router = useRouter();
  const { locale, messages } = useLocale();
  const reservationCopy = messages.admin.reservationsPage;
  const paymentCopy = messages.admin.paymentsPage;
  const requestCopy = messages.reservations.request;
  const pendingCopy = messages.reservations.pendingHold;
  const reservationStatuses = messages.admin.statuses.reservation;
  const paymentStatuses = messages.admin.statuses.payment;
  const emailNotificationStatuses = messages.admin.statuses.emailNotification;
  const notificationCopy = reservationCopy.notifications;
  const correspondenceCopy = reservationCopy.correspondence;
  const intlLocale = getIntlLocale(locale);
  const [manualResendTarget, setManualResendTarget] =
    useState<ManualResendTarget | null>(null);
  const [busyNotificationId, setBusyNotificationId] = useState<string | null>(
    null,
  );
  const [errorFeedback, setErrorFeedback] = useState<string | null>(null);
  const [successFeedback, setSuccessFeedback] = useState<string | null>(null);
  const isBusy = busyNotificationId !== null;
  const paymentPagination = useAdminRecordPagination(reservation.payments);
  const emailNotificationGroups = useMemo(() => {
    const guest: AdminReservationDetailEmailNotification[] = [];
    const administration: AdminReservationDetailEmailNotification[] = [];

    reservation.emailNotifications.forEach((notification) => {
      if (notification.type.startsWith("ADMIN_")) {
        administration.push(notification);
      } else {
        guest.push(notification);
      }
    });

    return { administration, guest } as const;
  }, [reservation.emailNotifications]);
  const guestEmailPagination = useAdminRecordPagination(
    emailNotificationGroups.guest,
  );
  const adminEmailPagination = useAdminRecordPagination(
    emailNotificationGroups.administration,
  );
  const defaultEmailGroup =
    emailNotificationGroups.guest.length > 0 ? "guest" : "administration";
  const paginationLabels = {
    next: reservationCopy.actions.next,
    of: reservationCopy.labels.of,
    page: reservationCopy.labels.page,
    previous: reservationCopy.actions.previous,
    results: reservationCopy.labels.results,
  } as const;

  function formatDate(value: string): string {
    return new Intl.DateTimeFormat(intlLocale, {
      dateStyle: "medium",
      timeZone: "UTC",
    }).format(new Date(`${value}T00:00:00.000Z`));
  }

  function formatDateTime(value: string | null): string {
    if (!value) {
      return reservationCopy.labels.unavailable;
    }

    return new Intl.DateTimeFormat(intlLocale, {
      dateStyle: "medium",
      timeStyle: "short",
    }).format(new Date(value));
  }

  function formatMoney(value: string, currency: string): string {
    return new Intl.NumberFormat(intlLocale, {
      style: "currency",
      currency,
    }).format(Number(value));
  }

  function reservationStatusLabel(status: string): string {
    return (
      reservationStatuses[status as keyof typeof reservationStatuses] ?? status
    );
  }

  function paymentStatusLabel(status: string): string {
    return paymentStatuses[status as keyof typeof paymentStatuses] ?? status;
  }

  function emailNotificationStatusLabel(status: string): string {
    return (
      emailNotificationStatuses[
        status as keyof typeof emailNotificationStatuses
      ] ?? status
    );
  }

  function emailNotificationTypeLabel(type: string): string {
    return (
      notificationCopy.types[type as keyof typeof notificationCopy.types] ?? type
    );
  }

  function emailNotificationLocaleLabel(value: string): string {
    return (
      notificationCopy.locales[value as keyof typeof notificationCopy.locales] ??
      value
    );
  }

  function emailNotificationOriginLabel(value: string): string {
    return (
      notificationCopy.origins[value as keyof typeof notificationCopy.origins] ??
      value
    );
  }

  function clearFeedback(): void {
    setErrorFeedback(null);
    setSuccessFeedback(null);
  }

  function copyTextWithSelection(value: string): boolean {
    if (typeof document === "undefined") {
      return false;
    }

    const textarea = document.createElement("textarea");
    textarea.value = value;
    textarea.setAttribute("readonly", "");
    textarea.style.position = "fixed";
    textarea.style.inset = "0 auto auto 0";
    textarea.style.opacity = "0";
    textarea.style.pointerEvents = "none";
    document.body.appendChild(textarea);
    textarea.focus();
    textarea.select();

    try {
      return document.execCommand("copy");
    } catch {
      return false;
    } finally {
      document.body.removeChild(textarea);
    }
  }

  async function copyGuestEmailForZoho(): Promise<void> {
    clearFeedback();

    let copied = false;

    if (navigator.clipboard && window.isSecureContext) {
      try {
        await navigator.clipboard.writeText(reservation.guestEmail);
        copied = true;
      } catch {
        copied = copyTextWithSelection(reservation.guestEmail);
      }
    } else {
      copied = copyTextWithSelection(reservation.guestEmail);
    }

    if (copied) {
      setSuccessFeedback(correspondenceCopy.success.copied);
    } else {
      setErrorFeedback(correspondenceCopy.errors.copyFailed);
    }
  }

  function openManualResend(
    notification: AdminReservationDetailEmailNotification,
  ): void {
    clearFeedback();
    setManualResendTarget({
      notification,
      requestId: crypto.randomUUID(),
    });
  }

  function manualResendErrorMessage(
    code: AdminEmailNotificationResendErrorCode | undefined,
  ): string {
    return code
      ? notificationCopy.errors[code] ??
          notificationCopy.errors.ADMIN_EMAIL_NOTIFICATION_UNEXPECTED_ERROR
      : notificationCopy.errors.ADMIN_EMAIL_NOTIFICATION_UNEXPECTED_ERROR;
  }

  function manualResendSuccessMessage(
    result: AdminEmailNotificationResendResult,
  ): string {
    if (result.outcome === "sent") {
      return notificationCopy.success.sent;
    }

    if (result.outcome === "already-processed") {
      return notificationCopy.success.alreadyProcessed;
    }

    if (result.outcome === "failed") {
      return result.retryScheduled
        ? notificationCopy.success.failedRetryScheduled
        : notificationCopy.success.failedTerminal;
    }

    return notificationCopy.success.queued;
  }

  async function confirmManualResend(): Promise<void> {
    if (!manualResendTarget || isBusy) {
      return;
    }

    clearFeedback();
    setBusyNotificationId(manualResendTarget.notification.id);

    try {
      const response = await fetch(
        `/api/admin/email-notifications/${encodeURIComponent(
          manualResendTarget.notification.id,
        )}/resend`,
        {
          method: "POST",
          headers: {
            "content-type": "application/json",
          },
          body: JSON.stringify({
            reservationId: reservation.id,
            expectedUpdatedAt: manualResendTarget.notification.updatedAt,
            requestId: manualResendTarget.requestId,
          }),
        },
      );
      const payload = (await response.json()) as ManualResendApiResponse;

      if (!response.ok || !payload.result) {
        setErrorFeedback(manualResendErrorMessage(payload.error?.code));
        return;
      }

      const feedback = manualResendSuccessMessage(payload.result);

      if (payload.result.outcome === "failed") {
        setErrorFeedback(feedback);
      } else {
        setSuccessFeedback(feedback);
      }

      setManualResendTarget(null);
      router.refresh();
    } catch {
      setErrorFeedback(
        notificationCopy.errors.ADMIN_EMAIL_NOTIFICATION_UNEXPECTED_ERROR,
      );
    } finally {
      setBusyNotificationId(null);
    }
  }

  function renderEmailNotification(
    notification: AdminReservationDetailEmailNotification,
  ) {
    return (
      <EmailNotificationCard
        actionLabel={
          notification.status === "SENT"
            ? notificationCopy.actions.sendAgain
            : notificationCopy.actions.retryNow
        }
        busy={busyNotificationId === notification.id}
        canResend={canManuallyResend(notification, reservation.status)}
        formatDateTime={formatDateTime}
        key={notification.id}
        labels={notificationCopy.labels}
        localeLabel={emailNotificationLocaleLabel(notification.locale)}
        notification={notification}
        onRequestResend={() => openManualResend(notification)}
        originLabel={emailNotificationOriginLabel(notification.origin)}
        sendingLabel={notificationCopy.actions.sending}
        statusLabel={emailNotificationStatusLabel(notification.status)}
        typeLabel={emailNotificationTypeLabel(notification.type)}
        unavailableLabel={reservationCopy.labels.unavailable}
      />
    );
  }

  const propertyName =
    locale === "en" ? reservation.property.nameEn : reservation.property.nameEs;
  const resendTargetWasSent =
    manualResendTarget?.notification.status === "SENT";
  const standardRefundReservation: AdminReservationDetailData = {
    ...reservation,
    refunds: reservation.refunds.filter(
      (refund) => refund.authorizationType !== "LIFECYCLE_ADJUSTMENT",
    ),
  };
  const effectiveRefundAmount = reservation.refunds
    .filter(
      (refund) =>
        refund.currency === reservation.currency &&
        effectiveRefundStatuses.has(refund.status),
    )
    .reduce((total, refund) => total + Number(refund.amount), 0);
  const netReservationTotal = Math.max(
    0,
    Number(reservation.total) - effectiveRefundAmount,
  );

  return (
    <>
      <AdminPageHeader
        actions={
          <Button asChild variant="outline">
            <Link href="/admin/reservations">
              <ArrowLeft aria-hidden="true" />
              {reservationCopy.title}
            </Link>
          </Button>
        }
        badge={reservationStatusLabel(reservation.status)}
        description={reservationCopy.description}
        title={`${reservationCopy.title} · ${reservation.id}`}
      />

      <AdminSnackbar
        closeLabel={messages.admin.feedback.dismiss}
        message={errorFeedback ?? successFeedback}
        onDismiss={clearFeedback}
        variant={errorFeedback ? "error" : "success"}
      />

      <Tabs className="mt-6" defaultValue="reservation">
        <div className="-mx-1 overflow-x-auto px-1 pb-2">
          <TabsList
            aria-label={reservationCopy.title}
            className="inline-flex h-auto min-w-full justify-start gap-1 rounded-2xl border border-border/70 bg-muted/40 p-1.5"
          >
            <TabsTrigger className="min-h-10 shrink-0 gap-2" value="reservation">
              <ShieldCheck aria-hidden="true" className="size-4 shrink-0" />
              {reservationCopy.labels.reservation}
            </TabsTrigger>
            <TabsTrigger className="min-h-10 shrink-0 gap-2" value="financial">
              <CreditCard aria-hidden="true" className="size-4 shrink-0" />
              {paymentCopy.title}
            </TabsTrigger>
            <TabsTrigger className="min-h-10 shrink-0 gap-2" value="emails">
              <Mail aria-hidden="true" className="size-4 shrink-0" />
              {notificationCopy.title}
            </TabsTrigger>
            <TabsTrigger className="min-h-10 shrink-0 gap-2" value="lifecycle">
              <ShieldCheck aria-hidden="true" className="size-4 shrink-0" />
              {reservationCopy.cancellation.badge}
            </TabsTrigger>
            <TabsTrigger className="min-h-10 shrink-0 gap-2" value="refunds">
              <RefreshCcw aria-hidden="true" className="size-4 shrink-0" />
              {reservationCopy.refunds.badge}
            </TabsTrigger>
            <TabsTrigger className="min-h-10 shrink-0 gap-2" value="changes">
              <CalendarClock aria-hidden="true" className="size-4 shrink-0" />
              {reservationCopy.dateMutation.title}
            </TabsTrigger>
            <TabsTrigger className="min-h-10 shrink-0 gap-2" value="history">
              <History aria-hidden="true" className="size-4 shrink-0" />
              {reservationCopy.operationalHistory.badge}
            </TabsTrigger>
          </TabsList>
        </div>

        <TabsContent
          className="mt-4 data-[state=inactive]:hidden sm:mt-6"
          forceMount
          value="reservation"
        >
          <Card className="border-border/70 bg-card shadow-sm">
            <CardHeader>
              <CardTitle>{reservation.guestName}</CardTitle>
              <CardDescription>{propertyName}</CardDescription>
            </CardHeader>
            <CardContent className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
              <DetailValue
                label={reservationCopy.labels.reservation}
                value={reservation.id}
              />
              <DetailValue
                label={requestCopy.fields.checkInDate}
                value={formatDate(reservation.checkInDate)}
              />
              <DetailValue
                label={requestCopy.fields.checkOutDate}
                value={formatDate(reservation.checkOutDate)}
              />
              <DetailValue
                label={requestCopy.fields.guestEmail}
                value={reservation.guestEmail}
              />
              <DetailValue
                label={requestCopy.fields.guestPhone}
                value={
                  reservation.guestPhone ?? reservationCopy.labels.unavailable
                }
              />
              <DetailValue
                label={requestCopy.fields.guestCountry}
                value={
                  reservation.guestCountry ?? reservationCopy.labels.unavailable
                }
              />
              <DetailValue
                label={reservationCopy.labels.guests}
                value={String(reservation.guestCount)}
              />
              <DetailValue
                label={requestCopy.fields.arrivalTimeEstimate}
                value={
                  reservation.arrivalTimeEstimate ??
                  reservationCopy.labels.unavailable
                }
              />
              <DetailValue
                label={paymentCopy.labels.createdAt}
                value={formatDateTime(reservation.createdAt)}
              />
              {reservation.expiresAt ? (
                <DetailValue
                  label={pendingCopy.expiresAt}
                  value={formatDateTime(reservation.expiresAt)}
                />
              ) : null}
            </CardContent>
          </Card>

          <ReservationPricingBreakdownCard
              breakdown={reservation.pricingBreakdown}
              formatDate={formatDate}
              formatMoney={formatMoney}
            />

          <Card className="mt-6 border-border/70 bg-card shadow-sm">
            <CardHeader>
              <CardTitle>{correspondenceCopy.title}</CardTitle>
              <CardDescription>{correspondenceCopy.description}</CardDescription>
            </CardHeader>
            <CardContent className="flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
              <div className="min-w-0">
                <p className="text-xs uppercase tracking-wide text-muted-foreground">
                  {requestCopy.fields.guestEmail}
                </p>
                <p className="mt-1 break-all text-sm font-medium">
                  {reservation.guestEmail}
                </p>
                <p className="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground">
                  {correspondenceCopy.helper}
                </p>
              </div>

              <Button asChild className="w-full shrink-0 sm:w-auto">
                <a
                  href={siteConfig.correspondence.zohoMailWebUrl}
                  onClick={() => void copyGuestEmailForZoho()}
                  rel="noopener noreferrer"
                  target="_blank"
                >
                  <Mail aria-hidden="true" />
                  <span className="hidden sm:inline">
                    {correspondenceCopy.actions.openDesktop}
                  </span>
                  <span className="sm:hidden">
                    {correspondenceCopy.actions.openMobile}
                  </span>
                  <ExternalLink aria-hidden="true" />
                </a>
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent
          className="mt-4 data-[state=inactive]:hidden sm:mt-6"
          forceMount
          value="financial"
        >
          <div className="grid gap-6 xl:grid-cols-[minmax(0,1.2fr)_minmax(20rem,0.8fr)]">
            <Card className="border-border/70 bg-card shadow-sm">
              <CardHeader>
                <CardTitle>{requestCopy.quoteTitle}</CardTitle>
              </CardHeader>
              <CardContent>
                <dl className="grid gap-4 sm:grid-cols-2">
                  <MoneyRow
                    label={requestCopy.quoteRows.subtotal}
                    value={formatMoney(
                      reservation.subtotal,
                      reservation.currency,
                    )}
                  />
                  <MoneyRow
                    label={requestCopy.quoteRows.cleaningFee}
                    value={formatMoney(
                      reservation.cleaningFee,
                      reservation.currency,
                    )}
                  />
                  <MoneyRow
                    label={requestCopy.quoteRows.taxes}
                    value={formatMoney(reservation.taxes, reservation.currency)}
                  />
                  <MoneyRow
                    label={requestCopy.quoteRows.discounts}
                    value={formatMoney(
                      reservation.discounts,
                      reservation.currency,
                    )}
                  />
                  <MoneyRow
                    label={reservationCopy.refunds.badge}
                    value={formatMoney(
                      (-effectiveRefundAmount).toFixed(2),
                      reservation.currency,
                    )}
                  />
                  <MoneyRow
                    emphasized
                    label={requestCopy.quoteRows.total}
                    value={formatMoney(
                      netReservationTotal.toFixed(2),
                      reservation.currency,
                    )}
                  />
                </dl>
              </CardContent>
            </Card>

            <Card className="h-fit border-border/70 bg-card shadow-sm">
              <CardHeader>
                <CardTitle>{paymentCopy.title}</CardTitle>
                <CardDescription>{paymentCopy.description}</CardDescription>
              </CardHeader>
              <CardContent>
                {reservation.payments.length > 0 ? (
                  <>
                    <Accordion
                      className="grid gap-3"
                      collapsible
                      key={`${paymentPagination.page}-${paymentPagination.pageSize}`}
                      type="single"
                    >
                      {paymentPagination.pageItems.map((payment) => (
                        <AccordionItem
                          className="overflow-hidden rounded-2xl border border-border bg-muted/20 last:border-b"
                          key={payment.id}
                          value={payment.id}
                        >
                          <AccordionTrigger className="px-4 py-3 hover:bg-muted/40 sm:px-5">
                            <div className="grid min-w-0 flex-1 gap-3 pr-2 sm:grid-cols-[minmax(0,1.2fr)_minmax(0,0.8fr)_auto] sm:items-center">
                              <div className="min-w-0">
                                <p className="break-all text-sm font-semibold">
                                  {payment.id}
                                </p>
                                <p className="mt-1 truncate text-sm text-muted-foreground">
                                  {payment.providerReference ??
                                    paymentCopy.labels.unavailable}
                                </p>
                              </div>
                              <p className="text-sm font-semibold">
                                {formatMoney(payment.amount, payment.currency)}
                              </p>
                              <Badge
                                className="justify-self-start sm:justify-self-end"
                                variant="outline"
                              >
                                {paymentStatusLabel(payment.status)}
                              </Badge>
                            </div>
                          </AccordionTrigger>
                          <AccordionContent className="border-t border-border/70 px-4 pt-4 sm:px-5">
                            <div className="grid gap-4 sm:grid-cols-2">
                              <DetailValue
                                label={paymentCopy.labels.order}
                                value={
                                  payment.providerReference ??
                                  paymentCopy.labels.unavailable
                                }
                              />
                              <DetailValue
                                label={paymentCopy.labels.createdAt}
                                value={formatDateTime(payment.createdAt)}
                              />
                            </div>
                            <div className="mt-4 flex justify-end">
                              <Button asChild variant="outline">
                                <Link
                                  href={`/admin/payments/${encodeURIComponent(
                                    payment.id,
                                  )}`}
                                >
                                  {messages.common.viewDetails}
                                  <ExternalLink aria-hidden="true" />
                                </Link>
                              </Button>
                            </div>
                          </AccordionContent>
                        </AccordionItem>
                      ))}
                    </Accordion>
                    <AdminRecordPagination
                      labels={paginationLabels}
                      onPageChange={paymentPagination.setPage}
                      onPageSizeChange={paymentPagination.changePageSize}
                      page={paymentPagination.page}
                      pageSize={paymentPagination.pageSize}
                      totalItems={paymentPagination.totalItems}
                      totalPages={paymentPagination.totalPages}
                    />
                  </>
                ) : (
                  <p className="text-sm text-muted-foreground">
                    {paymentCopy.empty.noPayments}
                  </p>
                )}
              </CardContent>
            </Card>
          </div>
          <AdminPaymentSubmissionAttemptHistory
            history={paymentAttemptHistory}
          />
        </TabsContent>

        <TabsContent
          className="mt-4 data-[state=inactive]:hidden sm:mt-6"
          forceMount
          value="emails"
        >
          <Card className="border-border/70 bg-card shadow-sm">
            <CardHeader>
              <CardTitle>{notificationCopy.title}</CardTitle>
              <CardDescription>{notificationCopy.description}</CardDescription>
            </CardHeader>
            <CardContent>
              {reservation.emailNotifications.length > 0 ? (
                <Tabs defaultValue={defaultEmailGroup}>
                  <div className="-mx-1 overflow-x-auto px-1 pb-2">
                    <TabsList
                      aria-label={notificationCopy.title}
                      className="inline-flex h-auto min-w-full justify-start gap-1 rounded-2xl border border-border/70 bg-muted/40 p-1.5 sm:min-w-0"
                    >
                      <TabsTrigger
                        className="min-h-10 shrink-0 gap-2"
                        value="guest"
                      >
                        <Mail aria-hidden="true" className="size-4 shrink-0" />
                        {reservationCopy.labels.guests}
                        <Badge variant="secondary">
                          {emailNotificationGroups.guest.length}
                        </Badge>
                      </TabsTrigger>
                      <TabsTrigger
                        className="min-h-10 shrink-0 gap-2"
                        value="administration"
                      >
                        <ShieldCheck
                          aria-hidden="true"
                          className="size-4 shrink-0"
                        />
                        {messages.footer.adminEmailLabel}
                        <Badge variant="secondary">
                          {emailNotificationGroups.administration.length}
                        </Badge>
                      </TabsTrigger>
                    </TabsList>
                  </div>

                  <TabsContent
                    className="mt-4 data-[state=inactive]:hidden"
                    forceMount
                    value="guest"
                  >
                    {emailNotificationGroups.guest.length > 0 ? (
                      <>
                        <Accordion
                          className="grid gap-3"
                          collapsible
                          key={`guest-${guestEmailPagination.page}-${guestEmailPagination.pageSize}`}
                          type="single"
                        >
                          {guestEmailPagination.pageItems.map(
                            renderEmailNotification,
                          )}
                        </Accordion>
                        <AdminRecordPagination
                          labels={paginationLabels}
                          onPageChange={guestEmailPagination.setPage}
                          onPageSizeChange={
                            guestEmailPagination.changePageSize
                          }
                          page={guestEmailPagination.page}
                          pageSize={guestEmailPagination.pageSize}
                          totalItems={guestEmailPagination.totalItems}
                          totalPages={guestEmailPagination.totalPages}
                        />
                      </>
                    ) : (
                      <EmailGroupEmptyState
                        label={reservationCopy.labels.results}
                      />
                    )}
                  </TabsContent>

                  <TabsContent
                    className="mt-4 data-[state=inactive]:hidden"
                    forceMount
                    value="administration"
                  >
                    {emailNotificationGroups.administration.length > 0 ? (
                      <>
                        <Accordion
                          className="grid gap-3"
                          collapsible
                          key={`administration-${adminEmailPagination.page}-${adminEmailPagination.pageSize}`}
                          type="single"
                        >
                          {adminEmailPagination.pageItems.map(
                            renderEmailNotification,
                          )}
                        </Accordion>
                        <AdminRecordPagination
                          labels={paginationLabels}
                          onPageChange={adminEmailPagination.setPage}
                          onPageSizeChange={
                            adminEmailPagination.changePageSize
                          }
                          page={adminEmailPagination.page}
                          pageSize={adminEmailPagination.pageSize}
                          totalItems={adminEmailPagination.totalItems}
                          totalPages={adminEmailPagination.totalPages}
                        />
                      </>
                    ) : (
                      <EmailGroupEmptyState
                        label={reservationCopy.labels.results}
                      />
                    )}
                  </TabsContent>
                </Tabs>
              ) : (
                <p className="text-sm text-muted-foreground">
                  {notificationCopy.empty}
                </p>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent
          className="mt-4 data-[state=inactive]:hidden sm:mt-6"
          forceMount
          value="lifecycle"
        >
          <div className="-mt-6">
            <AdminReservationCancellationSection reservation={reservation} />
          </div>
        </TabsContent>

        <TabsContent
          className="mt-4 data-[state=inactive]:hidden sm:mt-6"
          forceMount
          value="refunds"
        >
          <div className="-mt-6">
            <AdminReservationRefundSection
              reservation={standardRefundReservation}
            />
            <AdminReservationLifecycleAdjustmentRefundSection
              reservation={reservation}
            />
          </div>
        </TabsContent>

        <TabsContent
          className="mt-4 data-[state=inactive]:hidden sm:mt-6"
          forceMount
          value="changes"
        >
          <div className="-mt-6">
            <AdminReservationDateMutationSection reservation={reservation} />
          </div>
        </TabsContent>

        <TabsContent
          className="mt-4 data-[state=inactive]:hidden sm:mt-6"
          forceMount
          value="history"
        >
          <div className="-mt-6">
            <AdminReservationOperationalHistorySection
              reservation={reservation}
            />
          </div>
        </TabsContent>
      </Tabs>

      <Sheet
        onOpenChange={(open) => {
          if (!open && !isBusy) {
            setManualResendTarget(null);
          }
        }}
        open={manualResendTarget !== null}
      >
        <SheetContent closeLabel={messages.admin.feedback.dismiss}>
          <SheetHeader>
            <SheetTitle>
              {resendTargetWasSent
                ? notificationCopy.dialog.sendAgainTitle
                : notificationCopy.dialog.retryTitle}
            </SheetTitle>
            <SheetDescription>
              {resendTargetWasSent
                ? notificationCopy.dialog.sendAgainDescription
                : notificationCopy.dialog.retryDescription}
            </SheetDescription>
          </SheetHeader>

          <div className="grid gap-4 overflow-y-auto px-6 py-2 text-sm leading-6">
            <div className="rounded-2xl border border-border bg-muted/30 p-4">
              <p className="text-xs uppercase tracking-wide text-muted-foreground">
                {notificationCopy.dialog.recipientLabel}
              </p>
              <p className="mt-1 break-all font-medium">
                {manualResendTarget?.notification.recipient}
              </p>
            </div>
            <p className="text-muted-foreground">
              {notificationCopy.dialog.historyNote}
            </p>
            <p className="text-muted-foreground">
              {notificationCopy.dialog.automaticSuppressionNote}
            </p>
            {resendTargetWasSent ? (
              <p className="rounded-2xl border border-destructive/30 bg-destructive/5 p-4 text-foreground">
                {notificationCopy.dialog.duplicateWarning}
              </p>
            ) : null}
          </div>

          <SheetFooter>
            <Button
              disabled={isBusy}
              onClick={() => setManualResendTarget(null)}
              type="button"
              variant="outline"
            >
              {notificationCopy.actions.cancel}
            </Button>
            <Button
              disabled={isBusy}
              onClick={() => void confirmManualResend()}
              type="button"
              variant={resendTargetWasSent ? "destructive" : "default"}
            >
              {isBusy ? (
                <Loader2 aria-hidden="true" className="animate-spin" />
              ) : resendTargetWasSent ? (
                <Send aria-hidden="true" />
              ) : (
                <RotateCcw aria-hidden="true" />
              )}
              {isBusy
                ? notificationCopy.actions.sending
                : resendTargetWasSent
                  ? notificationCopy.actions.sendAgain
                  : notificationCopy.actions.retryNow}
            </Button>
          </SheetFooter>
        </SheetContent>
      </Sheet>
    </>
  );
}

function EmailGroupEmptyState({ label }: Readonly<{ label: string }>) {
  return (
    <div className="rounded-2xl border border-dashed border-border bg-muted/10 px-4 py-8 text-center text-sm text-muted-foreground">
      {label}: 0
    </div>
  );
}

function EmailNotificationCard({
  notification,
  typeLabel,
  statusLabel,
  localeLabel,
  originLabel,
  labels,
  unavailableLabel,
  formatDateTime,
  canResend,
  actionLabel,
  sendingLabel,
  busy,
  onRequestResend,
}: Readonly<{
  notification: AdminReservationDetailEmailNotification;
  typeLabel: string;
  statusLabel: string;
  localeLabel: string;
  originLabel: string;
  labels: {
    type: string;
    recipient: string;
    locale: string;
    origin: string;
    requestedBy: string;
    requestedAt: string;
    parentNotification: string;
    createdAt: string;
    status: string;
    attempts: string;
    lastAttempt: string;
    nextAttempt: string;
    scheduledFor: string;
    sentAt: string;
    providerMessageId: string;
    errorCode: string;
    errorMessage: string;
  };
  unavailableLabel: string;
  formatDateTime: (value: string | null) => string;
  canResend: boolean;
  actionLabel: string;
  sendingLabel: string;
  busy: boolean;
  onRequestResend: () => void;
}>) {
  const hasError = notification.errorCode || notification.errorMessage;
  const requestedBy = notification.requestedByAdmin
    ? notification.requestedByAdmin.name
      ? `${notification.requestedByAdmin.name} · ${notification.requestedByAdmin.email}`
      : notification.requestedByAdmin.email
    : unavailableLabel;

  return (
    <AccordionItem
      className="overflow-hidden rounded-2xl border border-border bg-muted/20 last:border-b"
      value={notification.id}
    >
      <AccordionTrigger className="px-4 py-3 hover:bg-muted/40 sm:px-5">
        <div className="grid min-w-0 flex-1 gap-3 pr-2 sm:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)_auto] sm:items-center">
          <div className="min-w-0">
            <p className="text-xs uppercase tracking-wide text-muted-foreground">
              {labels.type}
            </p>
            <p className="mt-1 break-words text-sm font-semibold">
              {typeLabel}
            </p>
          </div>
          <div className="min-w-0">
            <p className="text-xs uppercase tracking-wide text-muted-foreground">
              {labels.recipient}
            </p>
            <p className="mt-1 break-all text-sm font-medium">
              {notification.recipient}
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2 sm:justify-end">
            <Badge variant="outline">{statusLabel}</Badge>
            <span className="text-xs text-muted-foreground">
              {labels.attempts}: {notification.attemptCount}
            </span>
          </div>
        </div>
      </AccordionTrigger>
      <AccordionContent className="border-t border-border/70 px-4 pt-4 sm:px-5">
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <DetailValue label={labels.recipient} value={notification.recipient} />
          <DetailValue label={labels.locale} value={localeLabel} />
          <DetailValue label={labels.origin} value={originLabel} />
          <DetailValue
            label={labels.createdAt}
            value={formatDateTime(notification.createdAt)}
          />
          <DetailValue label={labels.status} value={statusLabel} />
          <DetailValue
            label={labels.attempts}
            value={String(notification.attemptCount)}
          />
          <DetailValue
            label={labels.lastAttempt}
            value={formatDateTime(notification.lastAttemptAt)}
          />
          <DetailValue
            label={labels.nextAttempt}
            value={formatDateTime(notification.nextAttemptAt)}
          />
          <DetailValue
            label={labels.scheduledFor}
            value={formatDateTime(notification.scheduledFor)}
          />
          <DetailValue
            label={labels.sentAt}
            value={formatDateTime(notification.sentAt)}
          />
          <DetailValue
            label={labels.providerMessageId}
            value={notification.providerMessageId ?? unavailableLabel}
          />
          {notification.origin === "MANUAL" ? (
            <>
              <DetailValue label={labels.requestedBy} value={requestedBy} />
              <DetailValue
                label={labels.requestedAt}
                value={formatDateTime(notification.requestedAt)}
              />
              <DetailValue
                label={labels.parentNotification}
                value={notification.parentNotificationId ?? unavailableLabel}
              />
            </>
          ) : null}
        </div>

        {hasError ? (
          <div className="mt-4 grid gap-4 rounded-xl border border-border/70 bg-background/60 p-4 sm:grid-cols-2">
            <DetailValue
              label={labels.errorCode}
              value={notification.errorCode ?? unavailableLabel}
            />
            <DetailValue
              label={labels.errorMessage}
              value={notification.errorMessage ?? unavailableLabel}
            />
          </div>
        ) : null}

        {canResend ? (
          <div className="mt-4 flex justify-end border-t border-border/70 pt-4">
            <Button
              disabled={busy}
              onClick={onRequestResend}
              type="button"
              variant={notification.status === "SENT" ? "outline" : "default"}
            >
              {busy ? (
                <Loader2 aria-hidden="true" className="animate-spin" />
              ) : notification.status === "SENT" ? (
                <Send aria-hidden="true" />
              ) : (
                <RotateCcw aria-hidden="true" />
              )}
              {busy ? sendingLabel : actionLabel}
            </Button>
          </div>
        ) : null}
      </AccordionContent>
    </AccordionItem>
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

function MoneyRow({
  label,
  value,
  emphasized = false,
}: Readonly<{ label: string; value: string; emphasized?: boolean }>) {
  return (
    <div
      className={
        emphasized
          ? "flex items-center justify-between gap-4 rounded-2xl bg-primary/10 p-4 font-semibold"
          : "flex items-center justify-between gap-4 rounded-2xl border border-border/70 p-4"
      }
    >
      <dt className="text-sm text-muted-foreground">{label}</dt>
      <dd className="text-sm font-semibold text-foreground">{value}</dd>
    </div>
  );
}

function ReservationPricingBreakdownCard({
  breakdown,
  formatDate,
  formatMoney,
}: Readonly<{
  breakdown: AdminReservationDetailData["pricingBreakdown"];
  formatDate: (value: string) => string;
  formatMoney: (value: string, currency: string) => string;
}>) {
  const { locale, messages } = useLocale();
  const copy = messages.admin.reservationsPage.pricingBreakdown;

  function previousDate(value: string): string {
    const date = new Date(`${value}T00:00:00.000Z`);
    date.setUTCDate(date.getUTCDate() - 1);
    return date.toISOString().slice(0, 10);
  }

  function sourceLabel(
    segment: NonNullable<
      AdminReservationDetailData["pricingBreakdown"]
    >["segments"][number],
  ): string {
    if (segment.kind === "PRESERVED_LEGACY_STAY") {
      return copy.sources.PRESERVED_LEGACY_STAY;
    }

    if (segment.source === "SEASONAL") {
      return segment.seasonalRuleName
        ? `${copy.sources.SEASONAL} · ${segment.seasonalRuleName}`
        : copy.sources.SEASONAL;
    }

    if (
      segment.source === "LENGTH_OF_STAY" &&
      segment.minimumNights !== null
    ) {
      return copy.sources.LENGTH_OF_STAY.replace(
        "{minimumNights}",
        String(segment.minimumNights),
      );
    }

    return copy.sources.BASE;
  }

  return (
    <Card className="mt-6 border-border/70 bg-card shadow-sm">
      <CardHeader>
        <CardTitle>{copy.title}</CardTitle>
        <CardDescription>{copy.description}</CardDescription>
      </CardHeader>

      <CardContent>
        {!breakdown ? (
          <p className="text-sm leading-6 text-muted-foreground">
            {copy.unavailable}
          </p>
        ) : (
          <div className="space-y-4">
            <div className="flex items-center justify-between gap-4 rounded-2xl border border-primary/20 bg-primary/5 p-4">
              <span className="text-sm text-muted-foreground">
                {copy.subtotal}
              </span>
              <span className="text-lg font-semibold tabular-nums">
                {formatMoney(breakdown.subtotal, breakdown.currency)}
              </span>
            </div>

            <div className="grid gap-3">
              {breakdown.segments.map((segment, index) => (
                <div
                  className="grid gap-3 rounded-2xl border border-border/70 bg-muted/20 p-4 lg:grid-cols-[minmax(0,1fr)_auto]"
                  key={`${segment.startDate}-${segment.endDate}-${index}`}
                >
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <Badge variant="secondary">
                        {sourceLabel(segment)}
                      </Badge>
                    </div>

                    <p className="mt-3 text-sm font-medium">
                      {formatDate(segment.startDate)} —{" "}
                      {formatDate(previousDate(segment.endDate))}
                    </p>

                    <p className="mt-1 text-sm text-muted-foreground">
                      {segment.nightlyRate
                        ? copy.nightsAtRate
                            .replace(
                              "{nights}",
                              String(segment.nights),
                            )
                            .replace(
                              "{rate}",
                              formatMoney(
                                segment.nightlyRate,
                                breakdown.currency,
                              ),
                            )
                        : copy.legacyNights.replace(
                            "{nights}",
                            String(segment.nights),
                          )}
                    </p>
                  </div>

                  <div className="lg:text-right">
                    <p className="text-xs text-muted-foreground">
                      {copy.segmentSubtotal}
                    </p>
                    <p className="mt-1 font-semibold tabular-nums">
                      {formatMoney(
                        segment.subtotal,
                        breakdown.currency,
                      )}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
