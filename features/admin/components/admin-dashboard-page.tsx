"use client";

import Link from "next/link";
import {
  AlertTriangle,
  BedDouble,
  CalendarClock,
  CalendarX2,
  CreditCard,
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
import { useLocale } from "@/features/i18n";
import type { AdminDashboardSummary } from "@/types/admin-dashboard";
import type { Locale } from "@/types/locale";

import { AdminPageHeader } from "./admin-page-header";

const statDefinitions = [
  {
    key: "confirmed",
    href: "/admin/reservations?status=CONFIRMED",
    icon: BedDouble,
  },
  {
    key: "pending",
    href: "/admin/reservations?status=PENDING_PAYMENT",
    icon: CalendarClock,
  },
  {
    key: "paymentIssues",
    href: "/admin/payments",
    icon: CreditCard,
  },
  {
    key: "manualBlocks",
    href: "/admin/calendar",
    icon: CalendarX2,
  },
] as const;

function getIntlLocale(locale: Locale): string {
  return locale === "en" ? "en-US" : "es-GT";
}

export function AdminDashboardPage({
  summary,
}: Readonly<{ summary: AdminDashboardSummary }>) {
  const { locale, messages } = useLocale();
  const copy = messages.admin.dashboard;
  const intlLocale = getIntlLocale(locale);
  const statValues = {
    confirmed: summary.stats.upcomingConfirmedReservations,
    pending: summary.stats.activePendingReservations,
    paymentIssues: summary.stats.paymentIssues,
    manualBlocks: summary.stats.activeManualBlocks,
  };

  function formatDate(value: string): string {
    return new Intl.DateTimeFormat(intlLocale, {
      dateStyle: "medium",
      timeZone: "UTC",
    }).format(new Date(`${value}T00:00:00.000Z`));
  }

  return (
    <>
      <AdminPageHeader
        badge={copy.badge}
        description={copy.description}
        title={copy.title}
      />

      <section aria-labelledby="dashboard-summary-title">
        <h2 className="sr-only" id="dashboard-summary-title">
          {copy.sections.summary}
        </h2>
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {statDefinitions.map((definition) => {
            const Icon = definition.icon;
            const statCopy = copy.stats[definition.key];

            return (
              <Card className="border-border/70 bg-card shadow-sm" key={definition.key}>
                <CardHeader>
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex size-10 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                      <Icon aria-hidden="true" className="size-5" />
                    </div>
                    <Badge variant="outline">{statValues[definition.key]}</Badge>
                  </div>
                  <CardTitle className="pt-3">{statCopy.label}</CardTitle>
                  <CardDescription>{statCopy.description}</CardDescription>
                </CardHeader>
                <CardContent>
                  <Button asChild className="w-full" variant="outline">
                    <Link href={definition.href}>{copy.actions.review}</Link>
                  </Button>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </section>

      <section className="mt-8" aria-labelledby="upcoming-arrivals-title">
        <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
          <div>
            <h2 className="text-xl font-semibold" id="upcoming-arrivals-title">
              {copy.sections.upcomingArrivals}
            </h2>
            <p className="mt-1 text-sm text-muted-foreground">
              {copy.upcomingArrivalsDescription}
            </p>
          </div>
          <Button asChild variant="outline">
            <Link href="/admin/reservations">{copy.actions.viewAll}</Link>
          </Button>
        </div>

        {summary.upcomingArrivals.length > 0 ? (
          <div className="grid gap-3">
            {summary.upcomingArrivals.map((arrival) => (
              <Card className="border-border/70 bg-card shadow-sm" key={arrival.id} size="sm">
                <CardContent className="grid gap-4 py-4 sm:grid-cols-[1fr_auto] sm:items-center">
                  <div>
                    <p className="font-medium text-foreground">{arrival.guestName}</p>
                    <p className="mt-1 text-sm text-muted-foreground">
                      {locale === "en" ? arrival.property.nameEn : arrival.property.nameEs}
                    </p>
                  </div>
                  <div className="text-sm sm:text-right">
                    <p className="font-medium text-foreground">
                      {formatDate(arrival.checkInDate)} — {formatDate(arrival.checkOutDate)}
                    </p>
                    <p className="mt-1 text-muted-foreground">
                      {copy.labels.guests}: {arrival.guestCount}
                    </p>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <Card className="border-dashed bg-muted/20 shadow-none">
            <CardContent className="flex items-center gap-3 py-8 text-sm text-muted-foreground">
              <AlertTriangle aria-hidden="true" className="size-4" />
              {copy.empty.upcomingArrivals}
            </CardContent>
          </Card>
        )}
      </section>
    </>
  );
}
