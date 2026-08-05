"use client";

import {
  CalendarClock,
  Clock3,
  CreditCard,
  History,
  Mail,
  RefreshCcw,
  ShieldCheck,
} from "lucide-react";
import type { ReactNode } from "react";

import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { useLocale } from "@/features/i18n";
import type { AdminReservationDetailData } from "@/types/admin-reservation-detail";
import type {
  AdminReservationOperationalHistoryCategory,
  AdminReservationOperationalHistoryEvent,
} from "@/types/admin-reservation-operational-history";
import type { Locale } from "@/types/locale";

function getIntlLocale(locale: Locale): string {
  return locale === "en" ? "en-US" : "es-GT";
}

function categoryIcon(
  category: AdminReservationOperationalHistoryCategory,
): ReactNode {
  switch (category) {
    case "RESERVATION":
      return <ShieldCheck aria-hidden="true" className="size-4" />;
    case "REQUEST":
      return <CalendarClock aria-hidden="true" className="size-4" />;
    case "HOLD":
      return <Clock3 aria-hidden="true" className="size-4" />;
    case "PAYMENT":
      return <CreditCard aria-hidden="true" className="size-4" />;
    case "REFUND":
      return <RefreshCcw aria-hidden="true" className="size-4" />;
    case "EMAIL":
      return <Mail aria-hidden="true" className="size-4" />;
    case "RECOVERY":
      return <History aria-hidden="true" className="size-4" />;
  }
}

export function AdminReservationOperationalHistorySection({
  reservation,
}: Readonly<{
  reservation: AdminReservationDetailData;
}>) {
  const { locale, messages } = useLocale();
  const copy = messages.admin.reservationsPage.operationalHistory;
  const notificationCopy = messages.admin.reservationsPage.notifications;
  const intlLocale = getIntlLocale(locale);

  function formatDateTime(value: string): string {
    return new Intl.DateTimeFormat(intlLocale, {
      dateStyle: "medium",
      timeStyle: "short",
    }).format(new Date(value));
  }

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

  function statusLabel(value: string): string {
    return copy.statuses[value as keyof typeof copy.statuses] ?? value;
  }

  function eventCopy(event: AdminReservationOperationalHistoryEvent) {
    return copy.events[event.eventType];
  }

  function actorLabel(event: AdminReservationOperationalHistoryEvent): string {
    if (event.actor.kind === "SYSTEM") {
      return copy.actor.system;
    }

    return event.actor.name ?? event.actor.email ?? copy.actor.system;
  }

  function requestTypeLabel(value: string): string {
    return copy.requestTypes[value as keyof typeof copy.requestTypes] ?? value;
  }

  function paymentPurposeLabel(value: string): string {
    return (
      copy.paymentPurposes[value as keyof typeof copy.paymentPurposes] ?? value
    );
  }

  function refundAuthorizationTypeLabel(value: string): string {
    return (
      copy.refundAuthorizationTypes[
        value as keyof typeof copy.refundAuthorizationTypes
      ] ?? value
    );
  }

  function notificationTypeLabel(value: string): string {
    return (
      notificationCopy.types[value as keyof typeof notificationCopy.types] ??
      value
    );
  }

  function notificationLocaleLabel(value: string): string {
    return (
      notificationCopy.locales[
        value as keyof typeof notificationCopy.locales
      ] ?? value
    );
  }

  function notificationOriginLabel(value: string): string {
    return (
      notificationCopy.origins[
        value as keyof typeof notificationCopy.origins
      ] ?? value
    );
  }

  return (
    <Card className="mt-6 border-border/70 bg-card shadow-sm">
      <CardHeader>
        <div className="mb-2 flex items-center gap-2 text-sm font-medium text-muted-foreground">
          <History aria-hidden="true" className="size-4" />
          {copy.badge}
        </div>
        <CardTitle>{copy.title}</CardTitle>
        <CardDescription>{copy.description}</CardDescription>
      </CardHeader>
      <CardContent>
        {reservation.operationalHistory.length > 0 ? (
          <ol className="grid gap-4" aria-label={copy.listAriaLabel}>
            {reservation.operationalHistory.map((event) => {
              const localizedEvent = eventCopy(event);
              const relations = event.relations.map((item) => ({
                ...item,
                label:
                  copy.relationKinds[
                    item.kind as keyof typeof copy.relationKinds
                  ] ?? item.kind,
              }));

              return (
                <li
                  className="rounded-2xl border border-border bg-muted/10 p-4 sm:p-5"
                  key={event.id}
                >
                  <div className="flex items-start gap-3 sm:gap-4">
                    <div className="mt-0.5 flex size-9 shrink-0 items-center justify-center rounded-full border border-border bg-background">
                      {categoryIcon(event.category)}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <Badge variant="outline">
                          {categoryIcon(event.category)}
                          {copy.categories[event.category]}
                        </Badge>
                        {event.status ? (
                          <Badge variant="secondary">
                            {statusLabel(event.status)}
                          </Badge>
                        ) : null}
                      </div>

                      <h3 className="mt-3 text-base font-semibold">
                        {localizedEvent.title}
                      </h3>
                      <p className="mt-1 text-sm leading-6 text-muted-foreground">
                        {localizedEvent.description}
                      </p>
                      <p className="mt-2 text-sm font-medium">
                        {formatDateTime(event.occurredAt)}
                      </p>

                      <dl className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
                        <HistoryDetail
                          label={copy.labels.actor}
                          value={actorLabel(event)}
                        />
                        <HistoryDetail
                          label={copy.labels.reference}
                          value={`${
                            copy.referenceKinds[event.reference.kind]
                          }: ${event.reference.id}`}
                        />
                        {event.requestType ? (
                          <HistoryDetail
                            label={copy.labels.requestType}
                            value={requestTypeLabel(event.requestType)}
                          />
                        ) : null}
                        {event.paymentPurpose ? (
                          <HistoryDetail
                            label={copy.labels.paymentPurpose}
                            value={paymentPurposeLabel(event.paymentPurpose)}
                          />
                        ) : null}
                        {event.refundAuthorizationType ? (
                          <HistoryDetail
                            label={copy.labels.refundAuthorizationType}
                            value={refundAuthorizationTypeLabel(
                              event.refundAuthorizationType,
                            )}
                          />
                        ) : null}
                        {event.amount && event.currency ? (
                          <HistoryDetail
                            label={copy.labels.amount}
                            value={formatMoney(event.amount, event.currency)}
                          />
                        ) : null}
                        {event.notificationType ? (
                          <HistoryDetail
                            label={copy.labels.notificationType}
                            value={notificationTypeLabel(event.notificationType)}
                          />
                        ) : null}
                        {event.recipient ? (
                          <HistoryDetail
                            label={copy.labels.recipient}
                            value={event.recipient}
                          />
                        ) : null}
                        {event.locale ? (
                          <HistoryDetail
                            label={copy.labels.locale}
                            value={notificationLocaleLabel(event.locale)}
                          />
                        ) : null}
                        {event.origin ? (
                          <HistoryDetail
                            label={copy.labels.origin}
                            value={notificationOriginLabel(event.origin)}
                          />
                        ) : null}
                        {event.attemptCount !== null ? (
                          <HistoryDetail
                            label={copy.labels.attempts}
                            value={String(event.attemptCount)}
                          />
                        ) : null}
                        {event.nextAttemptAt ? (
                          <HistoryDetail
                            label={copy.labels.nextAttempt}
                            value={formatDateTime(event.nextAttemptAt)}
                          />
                        ) : null}
                        {event.expiresAt ? (
                          <HistoryDetail
                            label={copy.labels.expiresAt}
                            value={formatDateTime(event.expiresAt)}
                          />
                        ) : null}
                        {event.scheduledFor ? (
                          <HistoryDetail
                            label={copy.labels.scheduledFor}
                            value={formatDateTime(event.scheduledFor)}
                          />
                        ) : null}
                        {event.errorCode ? (
                          <HistoryDetail
                            label={copy.labels.errorCode}
                            value={event.errorCode}
                          />
                        ) : null}
                        {event.providerReference ? (
                          <HistoryDetail
                            label={copy.labels.providerReference}
                            value={event.providerReference}
                          />
                        ) : null}
                        {event.originalCheckInDate &&
                        event.originalCheckOutDate ? (
                          <HistoryDetail
                            label={copy.labels.originalDates}
                            value={`${formatDate(
                              event.originalCheckInDate,
                            )} — ${formatDate(event.originalCheckOutDate)}`}
                          />
                        ) : null}
                        {event.requestedCheckInDate &&
                        event.requestedCheckOutDate ? (
                          <HistoryDetail
                            label={copy.labels.requestedDates}
                            value={`${formatDate(
                              event.requestedCheckInDate,
                            )} — ${formatDate(event.requestedCheckOutDate)}`}
                          />
                        ) : null}
                        {relations.map((item) => (
                          <HistoryDetail
                            key={`${event.id}/${item.kind}/${item.id}`}
                            label={item.label}
                            value={item.id}
                          />
                        ))}
                      </dl>
                    </div>
                  </div>
                </li>
              );
            })}
          </ol>
        ) : (
          <p className="text-sm text-muted-foreground">{copy.empty}</p>
        )}
      </CardContent>
    </Card>
  );
}

function HistoryDetail({
  label,
  value,
}: Readonly<{
  label: string;
  value: string;
}>) {
  return (
    <div className="min-w-0">
      <dt className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
        {label}
      </dt>
      <dd className="mt-1 break-words text-sm">{value}</dd>
    </div>
  );
}
