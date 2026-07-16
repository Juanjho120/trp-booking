"use client";

import Link from "next/link";
import { useState } from "react";
import { ChevronDown, Search } from "lucide-react";

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
import type { AdminPaymentsPageData, AdminPaymentsView } from "@/types/admin-payments";
import type { Locale } from "@/types/locale";

import { AdminPageHeader } from "./admin-page-header";

const paymentStatuses = [
  "PENDING",
  "APPROVED",
  "REJECTED",
  "FAILED",
  "REFUNDED",
  "PARTIALLY_REFUNDED",
] as const;

const inputClassName =
  "h-11 w-full rounded-2xl border border-input bg-background px-3 text-sm text-foreground shadow-xs outline-none transition placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50";

function getIntlLocale(locale: Locale): string {
  return locale === "en" ? "en-US" : "es-GT";
}

export function AdminPaymentsPageView({
  data,
}: Readonly<{ data: AdminPaymentsPageData }>) {
  const { locale, messages } = useLocale();
  const copy = messages.admin.paymentsPage;
  const statusCopy = messages.admin.statuses;
  const intlLocale = getIntlLocale(locale);
  const view = data.filters.view ?? "payments";
  const [expandedDiagnostics, setExpandedDiagnostics] = useState<ReadonlySet<string>>(
    () => new Set(),
  );

  function toggleDiagnostics(paymentId: string) {
    setExpandedDiagnostics((current) => {
      const next = new Set(current);

      if (next.has(paymentId)) {
        next.delete(paymentId);
      } else {
        next.add(paymentId);
      }

      return next;
    });
  }

  function formatDateTime(value: string | null): string {
    if (!value) {
      return copy.labels.unavailable;
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
    return statusCopy.payment[
      status as keyof typeof statusCopy.payment
    ] ?? status;
  }

  function eventLabel(eventType: string): string {
    return statusCopy.paymentClientEvent[
      eventType as keyof typeof statusCopy.paymentClientEvent
    ] ?? eventType;
  }

  function buildUrl(overrides: Record<string, string | number | undefined>): string {
    const params = new URLSearchParams();
    const values = {
      view,
      search: data.filters.search,
      propertyId: data.filters.propertyId,
      status: data.filters.status,
      page: data.filters.page,
      ...overrides,
    };

    Object.entries(values).forEach(([key, value]) => {
      if (
        value !== undefined &&
        value !== "" &&
        value !== 1 &&
        !(key === "view" && value === "payments")
      ) {
        params.set(key, String(value));
      }
    });

    const query = params.toString();
    return query ? `/admin/payments?${query}` : "/admin/payments";
  }

  function ViewTab({ target }: Readonly<{ target: AdminPaymentsView }>) {
    return (
      <Button asChild variant={view === target ? "default" : "outline"}>
        <Link href={buildUrl({ view: target, status: undefined, page: 1 })}>
          {copy.tabs[target]}
        </Link>
      </Button>
    );
  }

  return (
    <>
      <AdminPageHeader
        badge={copy.badge}
        description={copy.description}
        title={copy.title}
      />

      <div className="mb-5 flex flex-wrap gap-2">
        <ViewTab target="payments" />
        <ViewTab target="events" />
      </div>

      <Card className="mb-6 border-border/70 bg-card shadow-sm">
        <CardContent className="grid gap-5 py-5">
          <form className="flex flex-col gap-3 sm:flex-row" method="get">
            {view === "events" ? <input name="view" type="hidden" value="events" /> : null}
            {data.filters.propertyId ? (
              <input name="propertyId" type="hidden" value={data.filters.propertyId} />
            ) : null}
            {view === "payments" && data.filters.status ? (
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
                placeholder={view === "payments" ? copy.placeholders.payments : copy.placeholders.events}
                type="search"
              />
            </label>
            <Button type="submit">{copy.actions.search}</Button>
            <Button asChild variant="outline">
              <Link href={view === "events" ? "/admin/payments?view=events" : "/admin/payments"}>
                {copy.actions.clear}
              </Link>
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

          {view === "payments" ? (
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
                {paymentStatuses.map((status) => (
                  <Button
                    asChild
                    key={status}
                    size="sm"
                    variant={data.filters.status === status ? "default" : "outline"}
                  >
                    <Link href={buildUrl({ status, page: 1 })}>
                      {paymentStatusLabel(status)}
                    </Link>
                  </Button>
                ))}
              </div>
            </div>
          ) : null}
        </CardContent>
      </Card>

      <div className="mb-4 flex flex-wrap items-center justify-between gap-3 text-sm text-muted-foreground">
        <p>{copy.labels.results}: {data.pagination.totalItems}</p>
        <p>{copy.labels.page} {data.pagination.page} {copy.labels.of} {data.pagination.totalPages}</p>
      </div>

      {view === "payments" ? (
        data.payments.length > 0 ? (
          <div className="grid gap-4">
            {data.payments.map((payment) => (
              <Card className="border-border/70 bg-card shadow-sm" key={payment.id} size="sm">
                <CardHeader>
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <CardTitle>{payment.guestName}</CardTitle>
                      <CardDescription className="mt-1">
                        {locale === "en" ? payment.property.nameEn : payment.property.nameEs}
                      </CardDescription>
                    </div>
                    <Badge variant="outline">{paymentStatusLabel(payment.status)}</Badge>
                  </div>
                </CardHeader>
                <CardContent className="grid gap-4">
                  <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
                    <div>
                      <p className="text-xs uppercase tracking-wide text-muted-foreground">{copy.labels.amount}</p>
                      <p className="mt-1 text-sm font-medium">{formatMoney(payment.amount, payment.currency)}</p>
                    </div>
                    <div>
                      <p className="text-xs uppercase tracking-wide text-muted-foreground">{copy.labels.order}</p>
                      <p className="mt-1 break-all text-sm">{payment.providerReference ?? copy.labels.unavailable}</p>
                    </div>
                    <div>
                      <p className="text-xs uppercase tracking-wide text-muted-foreground">{copy.labels.reservation}</p>
                      <p className="mt-1 break-all text-sm">{payment.reservationId}</p>
                    </div>
                    <div>
                      <p className="text-xs uppercase tracking-wide text-muted-foreground">{copy.labels.createdAt}</p>
                      <p className="mt-1 text-sm">{formatDateTime(payment.createdAt)}</p>
                    </div>
                  </div>
                  <div className="rounded-2xl border border-border bg-muted/20 p-4">
                    <Button
                      aria-expanded={expandedDiagnostics.has(payment.id)}
                      className="w-full justify-between"
                      onClick={() => toggleDiagnostics(payment.id)}
                      type="button"
                      variant="ghost"
                    >
                      {copy.labels.safeDiagnostics}
                      <ChevronDown
                        aria-hidden="true"
                        className={expandedDiagnostics.has(payment.id) ? "rotate-180 transition" : "transition"}
                      />
                    </Button>
                    {expandedDiagnostics.has(payment.id) ? (
                      <dl className="mt-4 grid gap-3 text-sm sm:grid-cols-2 xl:grid-cols-3">
                        {Object.entries(payment.diagnostics).map(([key, value]) => (
                          <div key={key}>
                            <dt className="text-xs uppercase tracking-wide text-muted-foreground">
                              {copy.diagnostics[key as keyof typeof copy.diagnostics]}
                            </dt>
                            <dd className="mt-1 break-words">{value ?? copy.labels.unavailable}</dd>
                          </div>
                        ))}
                      </dl>
                    ) : null}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <Card className="border-dashed bg-muted/20 shadow-none">
            <CardContent className="py-10 text-center text-sm text-muted-foreground">
              {copy.empty.noPayments}
            </CardContent>
          </Card>
        )
      ) : data.events.length > 0 ? (
        <div className="grid gap-4">
          {data.events.map((event) => (
            <Card className="border-border/70 bg-card shadow-sm" key={event.id} size="sm">
              <CardHeader>
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <CardTitle>{eventLabel(event.eventType)}</CardTitle>
                    <CardDescription className="mt-1">
                      {locale === "en" ? event.property.nameEn : event.property.nameEs} · {event.guestName}
                    </CardDescription>
                  </div>
                  <Badge variant="outline">{formatDateTime(event.createdAt)}</Badge>
                </div>
              </CardHeader>
              <CardContent className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
                <div>
                  <p className="text-xs uppercase tracking-wide text-muted-foreground">{copy.labels.payment}</p>
                  <p className="mt-1 break-all text-sm">{event.paymentId}</p>
                </div>
                <div>
                  <p className="text-xs uppercase tracking-wide text-muted-foreground">{copy.labels.reservation}</p>
                  <p className="mt-1 break-all text-sm">{event.reservationId}</p>
                </div>
                <div>
                  <p className="text-xs uppercase tracking-wide text-muted-foreground">{copy.labels.environment}</p>
                  <p className="mt-1 text-sm">{event.environment ?? copy.labels.unavailable}</p>
                </div>
                <div>
                  <p className="text-xs uppercase tracking-wide text-muted-foreground">{copy.labels.sdkMessage}</p>
                  <p className="mt-1 text-sm">{event.sdkMessage ?? copy.labels.unavailable}</p>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <Card className="border-dashed bg-muted/20 shadow-none">
          <CardContent className="py-10 text-center text-sm text-muted-foreground">
            {copy.empty.noEvents}
          </CardContent>
        </Card>
      )}

      <div className="mt-6 flex items-center justify-between gap-3">
        <Button asChild={data.pagination.page > 1} disabled={data.pagination.page <= 1} variant="outline">
          {data.pagination.page > 1 ? (
            <Link href={buildUrl({ page: data.pagination.page - 1 })}>{copy.actions.previous}</Link>
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
            <Link href={buildUrl({ page: data.pagination.page + 1 })}>{copy.actions.next}</Link>
          ) : (
            <span>{copy.actions.next}</span>
          )}
        </Button>
      </div>
    </>
  );
}
