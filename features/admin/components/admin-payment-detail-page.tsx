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
import type { AdminPaymentDetailData } from "@/types/admin-payment-detail";
import type { Locale } from "@/types/locale";

import { AdminPageHeader } from "./admin-page-header";

function getIntlLocale(locale: Locale): string {
  return locale === "en" ? "en-US" : "es-GT";
}

export function AdminPaymentDetailPage({
  payment,
}: Readonly<{ payment: AdminPaymentDetailData }>) {
  const { locale, messages } = useLocale();
  const paymentCopy = messages.admin.paymentsPage;
  const reservationCopy = messages.admin.reservationsPage;
  const requestCopy = messages.reservations.request;
  const paymentStatuses = messages.admin.statuses.payment;
  const reservationStatuses = messages.admin.statuses.reservation;
  const eventStatuses = messages.admin.statuses.paymentClientEvent;
  const intlLocale = getIntlLocale(locale);

  function formatDate(value: string): string {
    return new Intl.DateTimeFormat(intlLocale, {
      dateStyle: "medium",
      timeZone: "UTC",
    }).format(new Date(`${value}T00:00:00.000Z`));
  }

  function formatDateTime(value: string | null): string {
    if (!value) {
      return paymentCopy.labels.unavailable;
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

  function paymentStatusLabel(status: string): string {
    return paymentStatuses[status as keyof typeof paymentStatuses] ?? status;
  }

  function reservationStatusLabel(status: string): string {
    return (
      reservationStatuses[status as keyof typeof reservationStatuses] ?? status
    );
  }

  function eventLabel(eventType: string): string {
    return eventStatuses[eventType as keyof typeof eventStatuses] ?? eventType;
  }

  const propertyName =
    locale === "en"
      ? payment.reservation.property.nameEn
      : payment.reservation.property.nameEs;

  return (
    <>
      <AdminPageHeader
        actions={
          <Button asChild variant="outline">
            <Link href="/admin/payments">
              <ArrowLeft aria-hidden="true" />
              {paymentCopy.tabs.payments}
            </Link>
          </Button>
        }
        badge={paymentStatusLabel(payment.status)}
        description={paymentCopy.description}
        title={`${paymentCopy.tabs.payments} · ${payment.id}`}
      />

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1.1fr)_minmax(20rem,0.9fr)]">
        <div className="grid gap-6">
          <Card className="border-border/70 bg-card shadow-sm">
            <CardHeader>
              <CardTitle>{payment.reservation.guestName}</CardTitle>
              <CardDescription>{propertyName}</CardDescription>
            </CardHeader>
            <CardContent className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
              <DetailValue
                label={paymentCopy.labels.payment}
                value={payment.id}
              />
              <DetailValue
                label={paymentCopy.labels.amount}
                value={formatMoney(payment.amount, payment.currency)}
              />
              <DetailValue
                label={paymentCopy.labels.order}
                value={
                  payment.providerReference ?? paymentCopy.labels.unavailable
                }
              />
              <DetailValue
                label={paymentCopy.diagnostics.tilopayTransaction}
                value={
                  payment.providerTransactionId ??
                  paymentCopy.labels.unavailable
                }
              />
              <DetailValue
                label={paymentCopy.labels.createdAt}
                value={formatDateTime(payment.createdAt)}
              />
              <DetailValue
                label={paymentCopy.labels.reservation}
                value={payment.reservation.id}
              />
            </CardContent>
          </Card>

          <Card className="border-border/70 bg-card shadow-sm">
            <CardHeader>
              <CardTitle>{paymentCopy.labels.safeDiagnostics}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
                {Object.entries(payment.diagnostics).map(([key, value]) => (
                  <DetailValue
                    key={key}
                    label={
                      paymentCopy.diagnostics[
                        key as keyof typeof paymentCopy.diagnostics
                      ]
                    }
                    value={value ?? paymentCopy.labels.unavailable}
                  />
                ))}
              </div>
            </CardContent>
          </Card>

          <Card className="border-border/70 bg-card shadow-sm">
            <CardHeader>
              <CardTitle>{paymentCopy.tabs.events}</CardTitle>
              <CardDescription>{paymentCopy.description}</CardDescription>
            </CardHeader>
            <CardContent>
              {payment.clientEvents.length > 0 ? (
                <div className="grid gap-4">
                  {payment.clientEvents.map((event) => (
                    <div
                      className="rounded-2xl border border-border bg-muted/20 p-4"
                      key={event.id}
                    >
                      <div className="flex flex-wrap items-start justify-between gap-3">
                        <p className="text-sm font-medium">
                          {eventLabel(event.eventType)}
                        </p>
                        <Badge variant="outline">
                          {formatDateTime(event.createdAt)}
                        </Badge>
                      </div>
                      <div className="mt-4 grid gap-4 sm:grid-cols-2">
                        <DetailValue
                          label={paymentCopy.labels.environment}
                          value={
                            event.environment ?? paymentCopy.labels.unavailable
                          }
                        />
                        <DetailValue
                          label={paymentCopy.labels.sdkMessage}
                          value={
                            event.sdkMessage ?? paymentCopy.labels.unavailable
                          }
                        />
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">
                  {paymentCopy.empty.noEvents}
                </p>
              )}
            </CardContent>
          </Card>
        </div>

        <Card className="h-fit border-border/70 bg-card shadow-sm">
          <CardHeader>
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <CardTitle>{reservationCopy.title}</CardTitle>
                <CardDescription className="mt-1">
                  {payment.reservation.guestName} · {propertyName}
                </CardDescription>
              </div>
              <Badge variant="outline">
                {reservationStatusLabel(payment.reservation.status)}
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="grid gap-5">
            <DetailValue
              label={reservationCopy.labels.reservation}
              value={payment.reservation.id}
            />
            <DetailValue
              label={reservationCopy.labels.dates}
              value={`${formatDate(payment.reservation.checkInDate)} — ${formatDate(
                payment.reservation.checkOutDate,
              )}`}
            />
            <DetailValue
              label={requestCopy.fields.guestEmail}
              value={payment.reservation.guestEmail}
            />
            <DetailValue
              label={reservationCopy.labels.guests}
              value={String(payment.reservation.guestCount)}
            />
            <DetailValue
              label={reservationCopy.labels.total}
              value={formatMoney(
                payment.reservation.total,
                payment.reservation.currency,
              )}
            />
            <Button asChild variant="outline">
              <Link
                href={`/admin/reservations/${encodeURIComponent(
                  payment.reservation.id,
                )}`}
              >
                {messages.common.viewDetails}
                <ExternalLink aria-hidden="true" />
              </Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    </>
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
