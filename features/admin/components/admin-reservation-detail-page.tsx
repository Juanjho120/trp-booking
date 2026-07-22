"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  ExternalLink,
  Loader2,
  RotateCcw,
  Send,
} from "lucide-react";
import { useState } from "react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
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
import { AdminSnackbar } from "./admin-snackbar";

const manuallyResendableTypes = new Set([
  "RESERVATION_CONFIRMED",
  "ADMIN_NEW_RESERVATION",
]);
const manuallyResendableStatuses = new Set(["PENDING", "FAILED", "SENT"]);

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
  reservation,
}: Readonly<{ reservation: AdminReservationDetailData }>) {
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
  const intlLocale = getIntlLocale(locale);
  const [manualResendTarget, setManualResendTarget] =
    useState<ManualResendTarget | null>(null);
  const [busyNotificationId, setBusyNotificationId] = useState<string | null>(
    null,
  );
  const [errorFeedback, setErrorFeedback] = useState<string | null>(null);
  const [successFeedback, setSuccessFeedback] = useState<string | null>(null);
  const isBusy = busyNotificationId !== null;

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
    return notificationCopy.types[type as keyof typeof notificationCopy.types] ?? type;
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

  const propertyName =
    locale === "en" ? reservation.property.nameEn : reservation.property.nameEs;
  const resendTargetWasSent =
    manualResendTarget?.notification.status === "SENT";

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

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1.2fr)_minmax(20rem,0.8fr)]">
        <div className="grid gap-6">
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
                  emphasized
                  label={requestCopy.quoteRows.total}
                  value={formatMoney(reservation.total, reservation.currency)}
                />
              </dl>
            </CardContent>
          </Card>
        </div>

        <Card className="h-fit border-border/70 bg-card shadow-sm">
          <CardHeader>
            <CardTitle>{paymentCopy.title}</CardTitle>
            <CardDescription>{paymentCopy.description}</CardDescription>
          </CardHeader>
          <CardContent>
            {reservation.payments.length > 0 ? (
              <div className="grid gap-4">
                {reservation.payments.map((payment) => (
                  <div
                    className="rounded-2xl border border-border bg-muted/20 p-4"
                    key={payment.id}
                  >
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div>
                        <p className="break-all text-sm font-medium">
                          {payment.id}
                        </p>
                        <p className="mt-1 text-sm text-muted-foreground">
                          {formatMoney(payment.amount, payment.currency)}
                        </p>
                      </div>
                      <Badge variant="outline">
                        {paymentStatusLabel(payment.status)}
                      </Badge>
                    </div>
                    <div className="mt-4 grid gap-3 text-sm">
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
                    <Button asChild className="mt-4 w-full" variant="outline">
                      <Link
                        href={`/admin/payments/${encodeURIComponent(payment.id)}`}
                      >
                        {messages.common.viewDetails}
                        <ExternalLink aria-hidden="true" />
                      </Link>
                    </Button>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">
                {paymentCopy.empty.noPayments}
              </p>
            )}
          </CardContent>
        </Card>
      </div>

      <Card className="mt-6 border-border/70 bg-card shadow-sm">
        <CardHeader>
          <CardTitle>{notificationCopy.title}</CardTitle>
          <CardDescription>{notificationCopy.description}</CardDescription>
        </CardHeader>
        <CardContent>
          {reservation.emailNotifications.length > 0 ? (
            <div className="grid gap-4">
              {reservation.emailNotifications.map((notification) => (
                <EmailNotificationCard
                  actionLabel={
                    notification.status === "SENT"
                      ? notificationCopy.actions.sendAgain
                      : notificationCopy.actions.retryNow
                  }
                  busy={busyNotificationId === notification.id}
                  canResend={canManuallyResend(
                    notification,
                    reservation.status,
                  )}
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
              ))}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">
              {notificationCopy.empty}
            </p>
          )}
        </CardContent>
      </Card>

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
    <div className="rounded-2xl border border-border bg-muted/20 p-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-xs uppercase tracking-wide text-muted-foreground">
            {labels.type}
          </p>
          <p className="mt-1 break-words text-sm font-semibold">{typeLabel}</p>
        </div>
        <Badge variant="outline">{statusLabel}</Badge>
      </div>

      <div className="mt-4 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
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
