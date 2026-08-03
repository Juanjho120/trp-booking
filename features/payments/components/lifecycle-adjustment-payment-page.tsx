"use client";

import { CalendarClock, CheckCircle2, Clock3, ShieldAlert } from "lucide-react";
import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";

import { SiteFooter, SiteHeader } from "@/components/layout";
import { Badge } from "@/components/ui/badge";
import { useLocale } from "@/features/i18n";
import { TilopaySdkCheckout } from "@/features/payments/components/tilopay-sdk-checkout";
import type {
  LifecycleAdjustmentHandoffErrorCode,
  LifecycleAdjustmentHandoffSummary,
} from "@/lib/payments/lifecycle-adjustment-handoff";
import type { TilopayRetryPaymentIssue } from "@/types/tilopay-retry-payment";

function formatRemaining(expiresAt: string): string {
  const milliseconds = new Date(expiresAt).getTime() - Date.now();

  if (milliseconds <= 0) {
    return "00:00";
  }

  const totalSeconds = Math.floor(milliseconds / 1_000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
}

function HoldCountdown({ expiresAt }: Readonly<{ expiresAt: string }>) {
  const [remaining, setRemaining] = useState(() => formatRemaining(expiresAt));

  useEffect(() => {
    const interval = window.setInterval(
      () => setRemaining(formatRemaining(expiresAt)),
      1_000,
    );
    return () => window.clearInterval(interval);
  }, [expiresAt]);

  return <span className="font-mono text-lg font-semibold">{remaining}</span>;
}

export function LifecycleAdjustmentPaymentPage({
  summary,
  errorCode = null,
  paymentResult,
  initialIssue,
}: Readonly<{
  summary: LifecycleAdjustmentHandoffSummary | null;
  errorCode?: LifecycleAdjustmentHandoffErrorCode | null;
  paymentResult: string | null;
  initialIssue: TilopayRetryPaymentIssue | null;
}>) {
  const { locale, messages, setLocale } = useLocale();
  const preferredLocaleAppliedRef = useRef(false);

  useEffect(() => {
    if (preferredLocaleAppliedRef.current || !summary) {
      return;
    }

    preferredLocaleAppliedRef.current = true;

    if (locale !== summary.locale) {
      setLocale(summary.locale);
    }
  }, [locale, setLocale, summary]);

  const copy = messages.payments.lifecycleAdjustment;
  const intlLocale = locale === "en" ? "en-US" : "es-GT";
  const completed = summary?.requestStatus === "COMPLETED";
  const approved =
    completed ||
    summary?.paymentStatus === "APPROVED" ||
    paymentResult === "approved";
  const errorMessage = errorCode ? copy.errors[errorCode] : null;
  const requestTypeLabel = summary
    ? copy.requestTypes[summary.requestType]
    : null;
  const formattedAmount = useMemo(
    () =>
      summary
        ? new Intl.NumberFormat(intlLocale, {
            style: "currency",
            currency: summary.currency,
          }).format(Number(summary.amount))
        : null,
    [intlLocale, summary],
  );
  const formatDate = (value: string) =>
    new Intl.DateTimeFormat(intlLocale, {
      dateStyle: "medium",
      timeZone: "UTC",
    }).format(new Date(`${value}T00:00:00.000Z`));

  return (
    <div className="min-h-screen bg-background text-foreground">
      <SiteHeader />
      <main className="px-6 py-12 sm:py-16">
        <section className="mx-auto grid max-w-2xl gap-6 rounded-[2rem] border border-primary/20 bg-card p-6 shadow-sm sm:p-8">
          <div className="grid gap-3 text-center">
            <span className="mx-auto flex size-12 items-center justify-center rounded-full bg-primary/10 text-primary">
              {approved ? (
                <CheckCircle2 aria-hidden="true" />
              ) : errorMessage ? (
                <ShieldAlert aria-hidden="true" />
              ) : (
                <CalendarClock aria-hidden="true" />
              )}
            </span>
            <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">
              {completed
                ? copy.completedTitle
                : approved
                  ? copy.approvedTitle
                  : errorMessage
                    ? copy.unavailableTitle
                    : copy.title}
            </h1>
            <p className="text-sm leading-6 text-muted-foreground sm:text-base">
              {completed
                ? copy.completedDescription
                : approved
                  ? copy.approvedDescription
                  : errorMessage ?? copy.description}
            </p>
          </div>

          {summary ? (
            <>
              <div className="grid gap-4 rounded-3xl border border-border/70 bg-background p-4 text-sm sm:p-5">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <Badge variant="secondary">{requestTypeLabel}</Badge>
                  <span className="text-lg font-semibold">{formattedAmount}</span>
                </div>
                <dl className="grid gap-3 sm:grid-cols-2">
                  <div>
                    <dt className="text-muted-foreground">{copy.originalDates}</dt>
                    <dd className="font-medium">
                      {formatDate(summary.originalCheckInDate)} —{" "}
                      {formatDate(summary.originalCheckOutDate)}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-muted-foreground">{copy.requestedDates}</dt>
                    <dd className="font-medium">
                      {formatDate(summary.requestedCheckInDate)} —{" "}
                      {formatDate(summary.requestedCheckOutDate)}
                    </dd>
                  </div>
                </dl>
                {!approved ? (
                  <div className="flex items-center justify-between gap-4 rounded-2xl bg-muted/40 p-4">
                    <span className="flex items-center gap-2 text-muted-foreground">
                      <Clock3 aria-hidden="true" className="size-4" />
                      {copy.holdRemaining}
                    </span>
                    <HoldCountdown expiresAt={summary.holdExpiresAt} />
                  </div>
                ) : null}
              </div>

              {!approved && summary.payable ? (
                <TilopaySdkCheckout
                  initialIssue={initialIssue}
                  reservationId={summary.token}
                />
              ) : null}

              <p className="text-center text-xs leading-5 text-muted-foreground">
                {completed
                  ? copy.completedNote
                  : approved
                    ? copy.approvedNote
                    : copy.securityNote}
              </p>
            </>
          ) : (
            <Link
              className="inline-flex h-11 items-center justify-center rounded-full bg-primary px-6 text-sm font-medium text-primary-foreground shadow-sm transition hover:bg-primary/90"
              href="/alojamientos"
            >
              {messages.common.viewAccommodations}
            </Link>
          )}
        </section>
      </main>
      <SiteFooter />
    </div>
  );
}
