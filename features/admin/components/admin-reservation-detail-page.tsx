"use client";

import Link from "next/link";
import { ArrowLeft, ExternalLink } from "lucide-react";

import { Badge } from "@/components/ui/badge";
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
  AdminReservationDetailData,
  AdminReservationDetailEmailNotification,
} from "@/types/admin-reservation-detail";
import type { Locale } from "@/types/locale";

import { AdminPageHeader } from "./admin-page-header";

function getIntlLocale(locale: Locale): string {
  return locale === "en" ? "en-US" : "es-GT";
}

export function AdminReservationDetailPage({
  reservation,
}: Readonly<{ reservation: AdminReservationDetailData }>) {
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

  const propertyName =
    locale === "en" ? reservation.property.nameEn : reservation.property.nameEs;

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
                  formatDateTime={formatDateTime}
                  key={notification.id}
                  labels={notificationCopy.labels}
                  localeLabel={emailNotificationLocaleLabel(notification.locale)}
                  notification={notification}
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
    </>
  );
}

function EmailNotificationCard({
  notification,
  typeLabel,
  statusLabel,
  localeLabel,
  labels,
  unavailableLabel,
  formatDateTime,
}: Readonly<{
  notification: AdminReservationDetailEmailNotification;
  typeLabel: string;
  statusLabel: string;
  localeLabel: string;
  labels: {
    type: string;
    recipient: string;
    locale: string;
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
}>) {
  const hasError = notification.errorCode || notification.errorMessage;

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
          ? "flex items-center justify-between gap-4 rounded-2xl bg-muted px-4 py-3 sm:col-span-2"
          : "flex items-center justify-between gap-4 border-b border-border/60 pb-3"
      }
    >
      <dt className="text-sm text-muted-foreground">{label}</dt>
      <dd
        className={
          emphasized ? "text-base font-semibold" : "text-sm font-medium"
        }
      >
        {value}
      </dd>
    </div>
  );
}
