"use client";

import Link from "next/link";
import { Search } from "lucide-react";

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
import type { AdminReservationsPageData } from "@/types/admin-reservations";
import type { Locale } from "@/types/locale";

import { AdminPageHeader } from "./admin-page-header";

const reservationStatuses = [
  "PENDING_PAYMENT",
  "CONFIRMED",
  "CANCELLED",
  "REFUNDED",
  "PARTIALLY_REFUNDED",
  "EXPIRED",
  "BLOCKED",
] as const;

const inputClassName =
  "h-11 w-full rounded-2xl border border-input bg-background px-3 text-sm text-foreground shadow-xs outline-none transition placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50";

function getIntlLocale(locale: Locale): string {
  return locale === "en" ? "en-US" : "es-GT";
}

export function AdminReservationsPageView({
  data,
}: Readonly<{ data: AdminReservationsPageData }>) {
  const { locale, messages } = useLocale();
  const copy = messages.admin.reservationsPage;
  const statusCopy = messages.admin.statuses.reservation;
  const paymentStatusCopy = messages.admin.statuses.payment;
  const intlLocale = getIntlLocale(locale);

  function formatDate(value: string): string {
    return new Intl.DateTimeFormat(intlLocale, {
      dateStyle: "medium",
      timeZone: "UTC",
    }).format(new Date(`${value}T00:00:00.000Z`));
  }

  function formatMoney(value: string, currency: string): string {
    return new Intl.NumberFormat(intlLocale, {
      style: "currency",
      currency,
    }).format(Number(value));
  }

  function statusLabel(status: string): string {
    return statusCopy[status as keyof typeof statusCopy] ?? status;
  }

  function paymentStatusLabel(status: string | null): string {
    return status
      ? paymentStatusCopy[status as keyof typeof paymentStatusCopy] ?? status
      : copy.labels.unavailable;
  }

  function buildUrl(overrides: Record<string, string | number | undefined>): string {
    const params = new URLSearchParams();
    const values = {
      search: data.filters.search,
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
    return query ? `/admin/reservations?${query}` : "/admin/reservations";
  }

  return (
    <>
      <AdminPageHeader
        badge={copy.badge}
        description={copy.description}
        title={copy.title}
      />

      <Card className="mb-6 border-border/70 bg-card shadow-sm">
        <CardContent className="grid gap-5 py-5">
          <form className="flex flex-col gap-3 sm:flex-row" method="get">
            {data.filters.propertyId ? (
              <input name="propertyId" type="hidden" value={data.filters.propertyId} />
            ) : null}
            {data.filters.status ? (
              <input name="status" type="hidden" value={data.filters.status} />
            ) : null}
            <label className="relative flex-1">
              <span className="sr-only">{copy.labels.search}</span>
              <Search
                aria-hidden="true"
                className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground"
              />
              <input
                className={`${inputClassName} pl-10`}
                defaultValue={data.filters.search ?? ""}
                name="search"
                placeholder={copy.placeholders.search}
                type="search"
              />
            </label>
            <Button type="submit">{copy.actions.search}</Button>
            <Button asChild variant="outline">
              <Link href="/admin/reservations">{copy.actions.clear}</Link>
            </Button>
          </form>

          <div className="grid gap-3">
            <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
              {copy.labels.propertyFilter}
            </p>
            <div className="flex flex-wrap gap-2">
              <Button asChild size="sm" variant={!data.filters.propertyId ? "default" : "outline"}>
                <Link href={buildUrl({ propertyId: undefined, page: 1 })}>
                  {copy.filters.allProperties}
                </Link>
              </Button>
              {data.properties.map((property) => (
                <Button
                  asChild
                  key={property.id}
                  size="sm"
                  variant={data.filters.propertyId === property.id ? "default" : "outline"}
                >
                  <Link href={buildUrl({ propertyId: property.id, page: 1 })}>
                    {locale === "en" ? property.nameEn : property.nameEs}
                  </Link>
                </Button>
              ))}
            </div>
          </div>

          <div className="grid gap-3">
            <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
              {copy.labels.statusFilter}
            </p>
            <div className="flex flex-wrap gap-2">
              <Button asChild size="sm" variant={!data.filters.status ? "default" : "outline"}>
                <Link href={buildUrl({ status: undefined, page: 1 })}>
                  {copy.filters.allStatuses}
                </Link>
              </Button>
              {reservationStatuses.map((status) => (
                <Button
                  asChild
                  key={status}
                  size="sm"
                  variant={data.filters.status === status ? "default" : "outline"}
                >
                  <Link href={buildUrl({ status, page: 1 })}>{statusLabel(status)}</Link>
                </Button>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-muted-foreground">
          {copy.labels.results}: {data.pagination.totalItems}
        </p>
        <p className="text-sm text-muted-foreground">
          {copy.labels.page} {data.pagination.page} {copy.labels.of} {data.pagination.totalPages}
        </p>
      </div>

      {data.reservations.length > 0 ? (
        <div className="grid gap-4">
          {data.reservations.map((reservation) => (
            <Card className="border-border/70 bg-card shadow-sm" key={reservation.id} size="sm">
              <CardHeader>
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <CardTitle>{reservation.guestName}</CardTitle>
                    <CardDescription className="mt-1">
                      {locale === "en"
                        ? reservation.property.nameEn
                        : reservation.property.nameEs}
                    </CardDescription>
                  </div>
                  <Badge variant="outline">{statusLabel(reservation.status)}</Badge>
                </div>
              </CardHeader>
              <CardContent className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
                <div>
                  <p className="text-xs uppercase tracking-wide text-muted-foreground">
                    {copy.labels.dates}
                  </p>
                  <p className="mt-1 text-sm font-medium">
                    {formatDate(reservation.checkInDate)} — {formatDate(reservation.checkOutDate)}
                  </p>
                </div>
                <div>
                  <p className="text-xs uppercase tracking-wide text-muted-foreground">
                    {copy.labels.contact}
                  </p>
                  <p className="mt-1 break-all text-sm">{reservation.guestEmail}</p>
                  {reservation.guestPhone ? (
                    <p className="mt-1 text-sm text-muted-foreground">{reservation.guestPhone}</p>
                  ) : null}
                </div>
                <div>
                  <p className="text-xs uppercase tracking-wide text-muted-foreground">
                    {copy.labels.total}
                  </p>
                  <p className="mt-1 text-sm font-medium">
                    {formatMoney(reservation.total, reservation.currency)}
                  </p>
                  <p className="mt-1 text-sm text-muted-foreground">
                    {copy.labels.guests}: {reservation.guestCount}
                  </p>
                </div>
                <div>
                  <p className="text-xs uppercase tracking-wide text-muted-foreground">
                    {copy.labels.reservation}
                  </p>
                  <p className="mt-1 break-all text-sm">{reservation.id}</p>
                  <p className="mt-1 text-sm text-muted-foreground">
                    {copy.labels.latestPayment}: {paymentStatusLabel(reservation.latestPaymentStatus)}
                  </p>
                </div>
              </CardContent>
            </Card>
          ))}
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
    </>
  );
}
