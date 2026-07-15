"use client";

import Link from "next/link";
import { signOut } from "next-auth/react";
import type { ReactNode } from "react";
import {
  AlertTriangle,
  CalendarDays,
  CreditCard,
  DatabaseZap,
  Home,
  LogOut,
  ShieldCheck,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { siteConfig } from "@/config/site";
import { LocaleSwitcher, useLocale } from "@/features/i18n";
import type { Locale } from "@/types/locale";
import type {
  AdminPaymentClientEventSummary,
  AdminPaymentSummary,
  AdminReservationPaymentReview,
  AdminReservationSummary,
  AdminStatusCount,
} from "@/types/admin-reservation-payment-review";


type AdminReservationPaymentReviewShellProps = Readonly<{
  adminName: string;
  adminEmail: string | null;
  review: AdminReservationPaymentReview;
}>;

type BadgeVariant = "default" | "secondary" | "destructive" | "outline";
type StatusDomain = "reservation" | "payment";

type StatCardProps = Readonly<{
  icon: typeof CalendarDays;
  label: string;
  value: number;
  children?: ReactNode;
}>;

function getIntlLocale(locale: Locale): string {
  return locale === "en" ? "en-US" : "es-GT";
}

function getStatusVariant(status: string | null): BadgeVariant {
  if (!status) {
    return "outline";
  }

  if (["CONFIRMED", "APPROVED"].includes(status)) {
    return "default";
  }

  if (["PENDING", "PENDING_PAYMENT"].includes(status)) {
    return "secondary";
  }

  if (["REJECTED", "FAILED", "EXPIRED", "CANCELLED"].includes(status)) {
    return "destructive";
  }

  return "outline";
}

function StatCard({ icon: Icon, label, value, children }: StatCardProps) {
  return (
    <Card className="border-border/70 bg-card shadow-sm">
      <CardHeader>
        <div className="mb-4 flex size-11 items-center justify-center rounded-2xl bg-primary/10 text-primary">
          <Icon aria-hidden="true" className="size-5" />
        </div>
        <CardTitle>{label}</CardTitle>
        <CardDescription className="text-3xl font-semibold text-foreground">
          {value}
        </CardDescription>
      </CardHeader>
      {children ? <CardContent>{children}</CardContent> : null}
    </Card>
  );
}

function InfoRow({ label, value }: Readonly<{ label: string; value: ReactNode }>) {
  return (
    <div className="grid gap-1">
      <dt className="text-xs font-medium uppercase tracking-[0.18em] text-muted-foreground">
        {label}
      </dt>
      <dd className="break-words text-sm text-foreground">{value}</dd>
    </div>
  );
}

export function AdminReservationPaymentReviewShell({
  adminName,
  adminEmail,
  review,
}: AdminReservationPaymentReviewShellProps) {
  const { locale, messages } = useLocale();
  const copy = messages.admin.review;
  const shellCopy = messages.admin.shell;
  const intlLocale = getIntlLocale(locale);

  function formatDateTime(value: string | null): string {
    if (!value) {
      return copy.labels.unavailable;
    }

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

  function formatMoney(amount: string, currency: string): string {
    return new Intl.NumberFormat(intlLocale, {
      style: "currency",
      currency,
    }).format(Number(amount));
  }

  function displayValue(value: string | null | undefined): string {
    return value?.trim() ? value : copy.labels.unavailable;
  }

  function translateReservationStatus(status: string | null): string {
    if (!status) {
      return copy.labels.unavailable;
    }

    return copy.statuses.reservation[status as keyof typeof copy.statuses.reservation] ?? status;
  }

  function translatePaymentStatus(status: string | null): string {
    if (!status) {
      return copy.labels.unavailable;
    }

    return copy.statuses.payment[status as keyof typeof copy.statuses.payment] ?? status;
  }

  function translateStatus(status: string | null, domain: StatusDomain): string {
    return domain === "reservation" ? translateReservationStatus(status) : translatePaymentStatus(status);
  }

  function translateClientEventType(eventType: string): string {
    return (
      copy.statuses.paymentClientEvent[
        eventType as keyof typeof copy.statuses.paymentClientEvent
      ] ?? eventType
    );
  }

  function StatusBadge({
    domain,
    status,
  }: Readonly<{
    domain: StatusDomain;
    status: string | null;
  }>) {
    return <Badge variant={getStatusVariant(status)}>{translateStatus(status, domain)}</Badge>;
  }

  function StatusCounts({
    counts,
    domain,
  }: Readonly<{
    counts: readonly AdminStatusCount[];
    domain: StatusDomain;
  }>) {
    if (counts.length === 0) {
      return <p className="text-xs text-muted-foreground">{copy.labels.unavailable}</p>;
    }

    return (
      <div className="flex flex-wrap gap-2">
        {counts.map((item) => (
          <Badge key={item.status} variant={getStatusVariant(item.status)}>
            {translateStatus(item.status, domain)}: {item.count}
          </Badge>
        ))}
      </div>
    );
  }

  function ReservationCard({ reservation }: Readonly<{ reservation: AdminReservationSummary }>) {
    return (
      <Card className="border-border/70 bg-card shadow-sm" size="sm">
        <CardHeader>
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <CardTitle>{reservation.propertyName}</CardTitle>
              <CardDescription className="mt-1 break-all">
                {copy.labels.reservation}: {reservation.id}
              </CardDescription>
            </div>
            <StatusBadge domain="reservation" status={reservation.status} />
          </div>
        </CardHeader>
        <CardContent>
          <dl className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <InfoRow label={copy.labels.guest} value={reservation.guestName} />
            <InfoRow label={copy.labels.guestEmail} value={reservation.guestEmail} />
            <InfoRow label={copy.labels.guestPhone} value={displayValue(reservation.guestPhone)} />
            <InfoRow label={copy.labels.guestCountry} value={displayValue(reservation.guestCountry)} />
            <InfoRow
              label={copy.labels.dates}
              value={`${formatDate(reservation.checkInDate)} — ${formatDate(reservation.checkOutDate)}`}
            />
            <InfoRow label={copy.labels.guestCount} value={reservation.guestCount} />
            <InfoRow
              label={copy.labels.total}
              value={formatMoney(reservation.total, reservation.currency)}
            />
            <InfoRow
              label={copy.labels.latestPaymentStatus}
              value={<StatusBadge domain="payment" status={reservation.latestPaymentStatus} />}
            />
            <InfoRow label={copy.labels.expiresAt} value={formatDateTime(reservation.expiresAt)} />
            <InfoRow label={copy.labels.confirmedAt} value={formatDateTime(reservation.confirmedAt)} />
            <InfoRow label={copy.labels.createdAt} value={formatDateTime(reservation.createdAt)} />
          </dl>
        </CardContent>
      </Card>
    );
  }

  function PaymentCard({ payment }: Readonly<{ payment: AdminPaymentSummary }>) {
    const diagnostics = payment.diagnostics;

    return (
      <Card className="border-border/70 bg-card shadow-sm" size="sm">
        <CardHeader>
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <CardTitle>{payment.propertyName}</CardTitle>
              <CardDescription className="mt-1 break-all">
                {copy.labels.payment}: {payment.id}
              </CardDescription>
            </div>
            <StatusBadge domain="payment" status={payment.status} />
          </div>
        </CardHeader>
        <CardContent>
          <dl className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <InfoRow label={copy.labels.reservation} value={payment.reservationId} />
            <InfoRow label={copy.labels.guest} value={payment.guestName} />
            <InfoRow label={copy.labels.provider} value={payment.provider} />
            <InfoRow label={copy.labels.providerReference} value={displayValue(payment.providerReference)} />
            <InfoRow
              label={copy.labels.providerTransactionId}
              value={displayValue(payment.providerTransactionId)}
            />
            <InfoRow label={copy.labels.total} value={formatMoney(payment.amount, payment.currency)} />
            <InfoRow label={copy.labels.paidAt} value={formatDateTime(payment.paidAt)} />
            <InfoRow label={copy.labels.failedAt} value={formatDateTime(payment.failedAt)} />
            <InfoRow label={copy.labels.createdAt} value={formatDateTime(payment.createdAt)} />
            <InfoRow label={copy.labels.updatedAt} value={formatDateTime(payment.updatedAt)} />
          </dl>

          <div className="mt-5 rounded-3xl border border-border bg-muted/30 p-4">
            <p className="text-sm font-medium text-foreground">{copy.labels.diagnostics}</p>
            <dl className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              <InfoRow label={copy.labels.providerCode} value={displayValue(diagnostics.providerCode)} />
              <InfoRow
                label={copy.labels.providerMessage}
                value={displayValue(diagnostics.providerMessage)}
              />
              <InfoRow label={copy.labels.authorization} value={displayValue(diagnostics.authorization)} />
              <InfoRow label={copy.labels.providerOrder} value={displayValue(diagnostics.providerOrder)} />
              <InfoRow
                label={copy.labels.tilopayTransaction}
                value={displayValue(diagnostics.tilopayTransaction)}
              />
              <InfoRow
                label={copy.labels.orderHashStatus}
                value={displayValue(diagnostics.orderHashStatus)}
              />
            </dl>
          </div>
        </CardContent>
      </Card>
    );
  }

  function ClientEventCard({ event }: Readonly<{ event: AdminPaymentClientEventSummary }>) {
    return (
      <Card className="border-border/70 bg-card shadow-sm" size="sm">
        <CardHeader>
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <CardTitle>{translateClientEventType(event.eventType)}</CardTitle>
              <CardDescription className="mt-1 break-all">
                {copy.labels.payment}: {event.paymentId}
              </CardDescription>
            </div>
            <Badge variant="outline">{formatDateTime(event.createdAt)}</Badge>
          </div>
        </CardHeader>
        <CardContent>
          <dl className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <InfoRow label={copy.labels.reservation} value={event.reservationId} />
            <InfoRow label={copy.labels.environment} value={displayValue(event.environment)} />
            <InfoRow label={copy.labels.locale} value={displayValue(event.locale)} />
            <InfoRow
              label={copy.labels.paymentMethod}
              value={displayValue(event.paymentMethodName ?? event.paymentMethodType)}
            />
            <InfoRow label={copy.labels.cardBrand} value={displayValue(event.detectedCardBrand)} />
            <InfoRow label={copy.labels.sdkMessage} value={displayValue(event.sdkMessage)} />
            <InfoRow label={copy.labels.preflightStatus} value={displayValue(event.preflightStatus)} />
            <InfoRow
              label={copy.labels.preflightExpiresAt}
              value={formatDateTime(event.preflightExpiresAt)}
            />
          </dl>
        </CardContent>
      </Card>
    );
  }

  function EmptyState({ message }: Readonly<{ message: string }>) {
    return (
      <Card className="border-dashed border-border/70 bg-muted/20 shadow-none" size="sm">
        <CardContent className="py-8 text-center text-sm text-muted-foreground">{message}</CardContent>
      </Card>
    );
  }

  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="border-b border-border/70 bg-background/95 backdrop-blur-xl">
        <div className="mx-auto flex min-h-20 max-w-7xl flex-col justify-between gap-4 px-6 py-5 sm:flex-row sm:items-center lg:px-8">
          <div className="flex items-center gap-3">
            <div className="flex size-11 items-center justify-center rounded-2xl bg-primary text-sm font-semibold text-primary-foreground shadow-sm">
              TRP
            </div>
            <div>
              <p className="text-sm font-semibold text-foreground">
                {shellCopy.brandLabel}
              </p>
              <p className="text-xs text-muted-foreground">{siteConfig.internalName}</p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <LocaleSwitcher />
            <Button asChild className="rounded-full" variant="outline">
              <Link href="/">
                <Home aria-hidden="true" />
                {copy.labels.publicSite}
              </Link>
            </Button>
            <Button
              className="rounded-full"
              onClick={() => {
                void signOut({ redirectTo: "/" });
              }}
              type="button"
              variant="secondary"
            >
              <LogOut aria-hidden="true" />
              {copy.labels.signOut}
            </Button>
          </div>
        </div>
      </header>

      <main>
        <section className="bg-[radial-gradient(circle_at_top_left,_hsl(var(--primary)/0.12),_transparent_32rem)] py-16">
          <div className="mx-auto max-w-7xl px-6 lg:px-8">
            <Badge className="rounded-full" variant="secondary">
              {copy.badge}
            </Badge>
            <div className="mt-6 grid gap-8 lg:grid-cols-[1.4fr_0.8fr] lg:items-end">
              <div className="max-w-3xl">
                <h1 className="text-balance text-4xl font-semibold tracking-tight sm:text-5xl">
                  {copy.title}
                </h1>
                <p className="mt-5 text-lg leading-8 text-muted-foreground">
                  {copy.description}
                </p>
                <p className="mt-4 text-sm leading-6 text-muted-foreground">
                  {copy.labels.generatedAt}: {formatDateTime(review.generatedAt)}
                </p>
              </div>

              <Card className="border-border/70 bg-card/95 shadow-sm">
                <CardHeader>
                  <CardTitle>{shellCopy.sessionCard.title}</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">
                      {copy.labels.signedInAs}
                    </p>
                    <p className="mt-1 text-base font-medium text-foreground">{adminName}</p>
                    {adminEmail ? (
                      <p className="mt-1 text-sm text-muted-foreground">{adminEmail}</p>
                    ) : null}
                  </div>
                  <div className="rounded-2xl border border-border bg-muted/35 p-4 text-sm leading-6 text-muted-foreground">
                    {shellCopy.sessionCard.protectionNote}
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </section>

        <section className="py-12">
          <div className="mx-auto max-w-7xl space-y-6 px-6 lg:px-8">
            <div>
              <h2 className="text-2xl font-semibold tracking-tight">{copy.sections.stats}</h2>
              <p className="mt-2 text-sm leading-6 text-muted-foreground">{copy.notes.readOnly}</p>
            </div>
            <div className="grid gap-6 lg:grid-cols-3">
              <StatCard
                icon={CalendarDays}
                label={copy.labels.totalReservations}
                value={review.stats.totalReservations}
              >
                <StatusCounts counts={review.stats.reservationStatuses} domain="reservation" />
              </StatCard>
              <StatCard icon={CreditCard} label={copy.labels.totalPayments} value={review.stats.totalPayments}>
                <StatusCounts counts={review.stats.paymentStatuses} domain="payment" />
              </StatCard>
              <StatCard
                icon={DatabaseZap}
                label={copy.labels.totalClientEvents}
                value={review.stats.totalClientEvents}
              />
            </div>
          </div>
        </section>

        <section className="pb-12">
          <div className="mx-auto max-w-7xl space-y-6 px-6 lg:px-8">
            <h2 className="text-2xl font-semibold tracking-tight">{copy.sections.reservations}</h2>
            <div className="grid gap-4">
              {review.reservations.length > 0 ? (
                review.reservations.map((reservation) => (
                  <ReservationCard key={reservation.id} reservation={reservation} />
                ))
              ) : (
                <EmptyState message={copy.labels.noReservations} />
              )}
            </div>
          </div>
        </section>

        <section className="pb-12">
          <div className="mx-auto max-w-7xl space-y-6 px-6 lg:px-8">
            <div>
              <h2 className="text-2xl font-semibold tracking-tight">{copy.sections.payments}</h2>
              <p className="mt-2 text-sm leading-6 text-muted-foreground">
                {copy.notes.paymentDrivenConfirmation}
              </p>
            </div>
            <div className="grid gap-4">
              {review.payments.length > 0 ? (
                review.payments.map((payment) => <PaymentCard key={payment.id} payment={payment} />)
              ) : (
                <EmptyState message={copy.labels.noPayments} />
              )}
            </div>
          </div>
        </section>

        <section className="pb-12">
          <div className="mx-auto max-w-7xl space-y-6 px-6 lg:px-8">
            <div>
              <h2 className="text-2xl font-semibold tracking-tight">{copy.sections.clientEvents}</h2>
              <p className="mt-2 text-sm leading-6 text-muted-foreground">
                {copy.notes.safeDiagnostics}
              </p>
            </div>
            <div className="grid gap-4">
              {review.clientEvents.length > 0 ? (
                review.clientEvents.map((event) => <ClientEventCard event={event} key={event.id} />)
              ) : (
                <EmptyState message={copy.labels.noClientEvents} />
              )}
            </div>
          </div>
        </section>

        <section className="pb-16">
          <div className="mx-auto max-w-7xl px-6 lg:px-8">
            <Card className="border-border/70 bg-muted/35 shadow-sm">
              <CardHeader>
                <div className="mb-4 flex size-11 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                  <ShieldCheck aria-hidden="true" className="size-5" />
                </div>
                <CardTitle>{copy.sections.guardrails}</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                  {copy.guardrails.map((item) => (
                    <div
                      className="rounded-3xl border border-border bg-background p-5 text-sm leading-6 text-muted-foreground"
                      key={item}
                    >
                      <AlertTriangle aria-hidden="true" className="mb-3 size-4 text-primary" />
                      {item}
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </section>
      </main>
    </div>
  );
}
