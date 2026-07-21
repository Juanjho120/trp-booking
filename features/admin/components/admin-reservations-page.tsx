"use client";

import Link from "next/link";
import { ExternalLink, Search } from "lucide-react";
import { useRef } from "react";

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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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

const ALL_FILTER_VALUE = "__all__";
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
  const reservationStatusCopy = messages.admin.statuses.reservation;
  const paymentStatusCopy = messages.admin.statuses.payment;
  const intlLocale = getIntlLocale(locale);
  const propertyFilterInputRef = useRef<HTMLInputElement>(null);
  const statusFilterInputRef = useRef<HTMLInputElement>(null);

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

  function reservationStatusLabel(status: string): string {
    return (
      reservationStatusCopy[status as keyof typeof reservationStatusCopy] ??
      status
    );
  }

  function paymentStatusLabel(status: string | null): string {
    return status
      ? (paymentStatusCopy[status as keyof typeof paymentStatusCopy] ?? status)
      : copy.labels.unavailable;
  }

  function buildUrl(
    overrides: Record<string, string | number | undefined>,
  ): string {
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
        <CardContent className="py-5">
          <form
            className="grid gap-3 lg:grid-cols-[minmax(16rem,1fr)_minmax(12rem,0.65fr)_minmax(12rem,0.65fr)_auto_auto] lg:items-end"
            method="get"
          >
            <label className="relative">
              <span className="sr-only">{copy.labels.search}</span>
              <Search
                aria-hidden="true"
                className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground"
              />
              <input
                className={`${inputClassName} pl-10`}
                defaultValue={data.filters.search ?? ""}
                key={`search:${data.filters.search ?? ""}`}
                name="search"
                placeholder={copy.placeholders.search}
                type="search"
              />
            </label>

            <div className="grid gap-2 text-sm font-medium">
              <span className="sr-only" id="reservations-property-filter-label">
                {copy.labels.propertyFilter}
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
                <SelectTrigger aria-labelledby="reservations-property-filter-label">
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
              <span className="sr-only" id="reservations-status-filter-label">
                {copy.labels.statusFilter}
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
                <SelectTrigger aria-labelledby="reservations-status-filter-label">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={ALL_FILTER_VALUE}>
                    {copy.filters.allStatuses}
                  </SelectItem>
                  {reservationStatuses.map((status) => (
                    <SelectItem key={status} value={status}>
                      {reservationStatusLabel(status)}
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

            <Button type="submit">{copy.actions.search}</Button>
            <Button asChild variant="outline">
              <Link href="/admin/reservations">{copy.actions.clear}</Link>
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

      {data.reservations.length > 0 ? (
        <div className="grid gap-4">
          {data.reservations.map((reservation) => (
            <Card
              className="border-border/70 bg-card shadow-sm"
              key={reservation.id}
              size="sm"
            >
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
                  <Badge variant="outline">
                    {reservationStatusLabel(reservation.status)}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
                <SummaryValue
                  label={copy.labels.dates}
                  value={`${formatDate(reservation.checkInDate)} — ${formatDate(
                    reservation.checkOutDate,
                  )}`}
                />
                <div>
                  <SummaryValue
                    label={copy.labels.contact}
                    value={reservation.guestEmail}
                  />
                  {reservation.guestPhone ? (
                    <p className="mt-1 text-sm text-muted-foreground">
                      {reservation.guestPhone}
                    </p>
                  ) : null}
                </div>
                <div>
                  <SummaryValue
                    label={copy.labels.total}
                    value={formatMoney(reservation.total, reservation.currency)}
                  />
                  <p className="mt-1 text-sm text-muted-foreground">
                    {copy.labels.guests}: {reservation.guestCount}
                  </p>
                </div>
                <div>
                  <SummaryValue
                    label={copy.labels.reservation}
                    value={reservation.id}
                  />
                  <p className="mt-1 text-sm text-muted-foreground">
                    {copy.labels.latestPayment}:{" "}
                    {paymentStatusLabel(reservation.latestPaymentStatus)}
                  </p>
                </div>
                <div className="flex justify-end sm:col-span-2 xl:col-span-4">
                  <Button asChild variant="outline">
                    <Link
                      href={`/admin/reservations/${encodeURIComponent(
                        reservation.id,
                      )}`}
                    >
                      {messages.common.viewDetails}
                      <ExternalLink aria-hidden="true" />
                    </Link>
                  </Button>
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

function SummaryValue({
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
