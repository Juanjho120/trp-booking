"use client";

import Link from "next/link";
import { ExternalLink, Search } from "lucide-react";
import { useRef } from "react";

import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
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
import { useLocale } from "@/features/i18n";
import type {
  AdminPaymentsPageData,
  AdminPaymentsView,
} from "@/types/admin-payments";
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

const ALL_FILTER_VALUE = "__all__";
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
  const propertyFilterInputRef = useRef<HTMLInputElement>(null);
  const statusFilterInputRef = useRef<HTMLInputElement>(null);

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
    return (
      statusCopy.payment[status as keyof typeof statusCopy.payment] ?? status
    );
  }

  function eventLabel(eventType: string): string {
    return (
      statusCopy.paymentClientEvent[
        eventType as keyof typeof statusCopy.paymentClientEvent
      ] ?? eventType
    );
  }

  function buildUrl(
    overrides: Record<string, string | number | undefined>,
  ): string {
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
        <CardContent className="py-5">
          <form
            className={
              view === "payments"
                ? "grid gap-3 lg:grid-cols-[minmax(16rem,1fr)_minmax(12rem,0.65fr)_minmax(12rem,0.65fr)_auto_auto] lg:items-end"
                : "grid gap-3 lg:grid-cols-[minmax(16rem,1fr)_minmax(12rem,0.65fr)_auto_auto] lg:items-end"
            }
            method="get"
          >
            {view === "events" ? (
              <input name="view" type="hidden" value="events" />
            ) : null}

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
                placeholder={
                  view === "payments"
                    ? copy.placeholders.payments
                    : copy.placeholders.events
                }
                type="search"
              />
            </label>

            <div className="grid gap-2 text-sm font-medium">
              <span className="sr-only" id="payments-property-filter-label">
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
                <SelectTrigger aria-labelledby="payments-property-filter-label">
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

            {view === "payments" ? (
              <div className="grid gap-2 text-sm font-medium">
                <span className="sr-only" id="payments-status-filter-label">
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
                  <SelectTrigger aria-labelledby="payments-status-filter-label">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={ALL_FILTER_VALUE}>
                      {copy.filters.allStatuses}
                    </SelectItem>
                    {paymentStatuses.map((status) => (
                      <SelectItem key={status} value={status}>
                        {paymentStatusLabel(status)}
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
            ) : null}

            <Button type="submit">{copy.actions.search}</Button>
            <Button asChild variant="outline">
              <Link
                href={
                  view === "events"
                    ? "/admin/payments?view=events"
                    : "/admin/payments"
                }
              >
                {copy.actions.clear}
              </Link>
            </Button>
          </form>
        </CardContent>
      </Card>

      <div className="mb-4 flex flex-wrap items-center justify-between gap-3 text-sm text-muted-foreground">
        <p>
          {copy.labels.results}: {data.pagination.totalItems}
        </p>
        <p>
          {copy.labels.page} {data.pagination.page} {copy.labels.of}{" "}
          {data.pagination.totalPages}
        </p>
      </div>

      {view === "payments" ? (
        data.payments.length > 0 ? (
          <Accordion className="grid gap-3" collapsible type="single">
            {data.payments.map((payment) => {
              const propertyName =
                locale === "en"
                  ? payment.property.nameEn
                  : payment.property.nameEs;

              return (
                <AccordionItem
                  className="overflow-hidden rounded-2xl border border-border/70 bg-card shadow-sm"
                  key={payment.id}
                  value={payment.id}
                >
                  <AccordionTrigger className="px-4 py-3 sm:px-5 sm:py-4">
                    <div className="grid min-w-0 gap-3 sm:grid-cols-[minmax(0,1.25fr)_minmax(0,0.8fr)_auto] sm:items-center">
                      <div className="min-w-0">
                        <p className="truncate text-sm font-semibold sm:text-base">
                          {payment.guestName}
                        </p>
                        <p className="mt-0.5 truncate text-sm text-muted-foreground">
                          {propertyName}
                        </p>
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-semibold">
                          {formatMoney(payment.amount, payment.currency)}
                        </p>
                        <p className="mt-0.5 truncate text-sm text-muted-foreground">
                          {payment.providerReference ?? copy.labels.unavailable}
                        </p>
                      </div>
                      <Badge className="justify-self-start sm:justify-self-end" variant="outline">
                        {paymentStatusLabel(payment.status)}
                      </Badge>
                    </div>
                  </AccordionTrigger>
                  <AccordionContent className="border-t border-border/70 px-4 pt-4 sm:px-5">
                    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
                      <SummaryValue
                        label={copy.labels.order}
                        value={
                          payment.providerReference ?? copy.labels.unavailable
                        }
                      />
                      <SummaryValue
                        label={copy.labels.reservation}
                        value={payment.reservationId}
                      />
                      <SummaryValue
                        label={copy.labels.createdAt}
                        value={formatDateTime(payment.createdAt)}
                      />
                      <SummaryValue
                        label={copy.labels.amount}
                        value={formatMoney(payment.amount, payment.currency)}
                      />
                    </div>

                    <div className="mt-4 rounded-2xl border border-border bg-muted/20 p-4">
                      <p className="text-sm font-semibold">
                        {copy.labels.safeDiagnostics}
                      </p>
                      <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
                        {Object.entries(payment.diagnostics).map(
                          ([key, value]) => (
                            <SummaryValue
                              key={key}
                              label={
                                copy.diagnostics[
                                  key as keyof typeof copy.diagnostics
                                ]
                              }
                              value={value ?? copy.labels.unavailable}
                            />
                          ),
                        )}
                      </div>
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
              );
            })}
          </Accordion>
        ) : (
          <EmptyState message={copy.empty.noPayments} />
        )
      ) : data.events.length > 0 ? (
        <Accordion className="grid gap-3" collapsible type="single">
          {data.events.map((event) => {
            const propertyName =
              locale === "en"
                ? event.property.nameEn
                : event.property.nameEs;

            return (
              <AccordionItem
                className="overflow-hidden rounded-2xl border border-border/70 bg-card shadow-sm"
                key={event.id}
                value={event.id}
              >
                <AccordionTrigger className="px-4 py-3 sm:px-5 sm:py-4">
                  <div className="grid min-w-0 gap-3 sm:grid-cols-[minmax(0,1.25fr)_minmax(0,0.8fr)_auto] sm:items-center">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold sm:text-base">
                        {eventLabel(event.eventType)}
                      </p>
                      <p className="mt-0.5 truncate text-sm text-muted-foreground">
                        {propertyName} · {event.guestName}
                      </p>
                    </div>
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium">
                        {event.paymentId}
                      </p>
                      <p className="mt-0.5 truncate text-sm text-muted-foreground">
                        {event.environment ?? copy.labels.unavailable}
                      </p>
                    </div>
                    <Badge className="justify-self-start sm:justify-self-end" variant="outline">
                      {formatDateTime(event.createdAt)}
                    </Badge>
                  </div>
                </AccordionTrigger>
                <AccordionContent className="border-t border-border/70 px-4 pt-4 sm:px-5">
                  <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
                    <SummaryValue
                      label={copy.labels.payment}
                      value={event.paymentId}
                    />
                    <SummaryValue
                      label={copy.labels.reservation}
                      value={event.reservationId}
                    />
                    <SummaryValue
                      label={copy.labels.environment}
                      value={event.environment ?? copy.labels.unavailable}
                    />
                    <SummaryValue
                      label={copy.labels.sdkMessage}
                      value={event.sdkMessage ?? copy.labels.unavailable}
                    />
                  </div>
                  <div className="mt-4 flex justify-end">
                    <Button asChild variant="outline">
                      <Link
                        href={`/admin/payments/${encodeURIComponent(
                          event.paymentId,
                        )}`}
                      >
                        {messages.common.viewDetails}
                        <ExternalLink aria-hidden="true" />
                      </Link>
                    </Button>
                  </div>
                </AccordionContent>
              </AccordionItem>
            );
          })}
        </Accordion>
      ) : (
        <EmptyState message={copy.empty.noEvents} />
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

function EmptyState({ message }: Readonly<{ message: string }>) {
  return (
    <Card className="border-dashed bg-muted/20 shadow-none">
      <CardContent className="py-10 text-center text-sm text-muted-foreground">
        {message}
      </CardContent>
    </Card>
  );
}
