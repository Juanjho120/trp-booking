"use client";

import {
  CheckCircle2,
  Clock3,
  ReceiptText,
  ShieldAlert,
  XCircle,
} from "lucide-react";
import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";

import { SiteFooter, SiteHeader } from "@/components/layout";
import { Badge } from "@/components/ui/badge";
import { useLocale } from "@/features/i18n";
import { scrollPaymentFormIntoViewportCenter } from "@/features/payments/components/payment-form-auto-scroll";
import { TilopaySdkCheckout } from "@/features/payments/components/tilopay-sdk-checkout";
import type {
  GuestPaymentRequestPaymentErrorCode,
  GuestPaymentRequestPaymentSummary,
} from "@/lib/payments/guest-payment-request-payment";
import type { TilopayPaymentResultErrorCode } from "@/types/tilopay-payment-result";
import type { TilopayRetryPaymentIssue } from "@/types/tilopay-retry-payment";

const TRP_PAYMENT_TIME_ZONE = "America/Guatemala";

type AdditionalChargePaymentPageErrorCode =
  | GuestPaymentRequestPaymentErrorCode
  | Extract<
      TilopayPaymentResultErrorCode,
      "ADDITIONAL_CHARGE_PAYMENT_APPLICATION_FAILED"
    >;

export function AdditionalChargePaymentPage({
  summary,
  errorCode = null,
  paymentResult,
  initialIssue,
}: Readonly<{
  summary: GuestPaymentRequestPaymentSummary | null;
  errorCode?: AdditionalChargePaymentPageErrorCode | null;
  paymentResult: string | null;
  initialIssue: TilopayRetryPaymentIssue | null;
}>) {
  const { locale, messages, setLocale } = useLocale();
  const preferredLocaleAppliedRef = useRef(false);
  const paymentSectionRef = useRef<HTMLDivElement>(null);
  const [paymentToken, setPaymentToken] = useState<string | null>(null);

  useEffect(() => {
    if (preferredLocaleAppliedRef.current || !summary) {
      return;
    }

    preferredLocaleAppliedRef.current = true;

    if (locale !== summary.locale) {
      setLocale(summary.locale);
    }
  }, [locale, setLocale, summary]);

  useEffect(() => {
    const tokenSegment = window.location.pathname
      .split("/")
      .filter(Boolean)
      .pop();
    setPaymentToken(tokenSegment ? decodeURIComponent(tokenSegment) : null);
  }, []);

  const copy = messages.payments.additionalCharge;
  const intlLocale = locale === "en" ? "en-US" : "es-GT";
  const paid = summary?.requestStatus === "PAID";
  const approvedButNotApplied =
    !paid && summary?.paymentStatus === "APPROVED";
  const errorMessage = errorCode
    ? copy.errors[errorCode]
    : approvedButNotApplied
      ? copy.errors.ADDITIONAL_CHARGE_PAYMENT_APPLICATION_FAILED
      : null;
  const expired = summary?.requestStatus === "EXPIRED";
  const cancelled = summary?.requestStatus === "CANCELLED";
  const rejected =
    !paid &&
    !expired &&
    !cancelled &&
    (paymentResult === "rejected" ||
      paymentResult === "failed" ||
      summary?.paymentStatus === "REJECTED" ||
      summary?.paymentStatus === "FAILED");
  const payable = Boolean(
    summary?.payable && paymentToken && !paid && !expired && !cancelled,
  );
  const title = errorMessage
    ? copy.unavailableTitle
    : paid
      ? copy.paidTitle
      : expired
        ? copy.expiredTitle
        : cancelled
          ? copy.cancelledTitle
          : rejected
            ? copy.retryTitle
            : copy.title;
  const description = errorMessage
    ? errorMessage
    : paid
      ? copy.paidDescription
      : expired
        ? copy.expiredDescription
        : cancelled
          ? copy.cancelledDescription
          : rejected
            ? copy.retryDescription
            : copy.description;
  const formattedTotal = useMemo(
    () =>
      summary
        ? new Intl.NumberFormat(intlLocale, {
            style: "currency",
            currency: summary.currency,
          }).format(Number(summary.totalAmount))
        : null,
    [intlLocale, summary],
  );
  const formatMoney = (amount: string, currency: string) =>
    new Intl.NumberFormat(intlLocale, {
      style: "currency",
      currency,
    }).format(Number(amount));
  const formatDate = (value: string) =>
    new Intl.DateTimeFormat(intlLocale, {
      dateStyle: "medium",
      timeZone: "UTC",
    }).format(new Date(`${value}T00:00:00.000Z`));
  const formatDateTime = (value: string) =>
    new Intl.DateTimeFormat(intlLocale, {
      dateStyle: "medium",
      timeStyle: "short",
      timeZone: TRP_PAYMENT_TIME_ZONE,
    }).format(new Date(value));

  return (
    <div className="min-h-screen bg-background text-foreground">
      <SiteHeader />
      <main className="px-6 py-12 sm:py-16">
        <section className="mx-auto grid max-w-3xl gap-6">
          <div className="grid gap-3 text-center">
            <span className="mx-auto flex size-12 items-center justify-center rounded-full bg-primary/10 text-primary">
              {errorMessage || expired || cancelled ? (
                <ShieldAlert aria-hidden="true" />
              ) : paid ? (
                <CheckCircle2 aria-hidden="true" />
              ) : rejected ? (
                <XCircle aria-hidden="true" />
              ) : (
                <ReceiptText aria-hidden="true" />
              )}
            </span>
            <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">
              {title}
            </h1>
            <p className="mx-auto max-w-2xl text-sm leading-6 text-muted-foreground sm:text-base">
              {description}
            </p>
          </div>

          {summary ? (
            <>
              <div className="grid gap-4 rounded-3xl border border-border/70 bg-card p-4 shadow-sm sm:p-5">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge variant="secondary">
                      {copy.requestStatuses[summary.requestStatus]}
                    </Badge>
                    {summary.paymentStatus ? (
                      <Badge variant="outline">
                        {copy.paymentStatuses[summary.paymentStatus]}
                      </Badge>
                    ) : null}
                  </div>
                  <span className="text-xl font-semibold tabular-nums">
                    {formattedTotal}
                  </span>
                </div>

                <dl className="grid gap-3 text-sm sm:grid-cols-2">
                  <div>
                    <dt className="text-muted-foreground">
                      {copy.labels.accommodation}
                    </dt>
                    <dd className="font-medium">{summary.propertyName}</dd>
                  </div>
                  <div>
                    <dt className="text-muted-foreground">
                      {copy.labels.reservationReference}
                    </dt>
                    <dd className="font-medium">
                      {summary.reservationReference}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-muted-foreground">
                      {copy.labels.confirmedDates}
                    </dt>
                    <dd className="font-medium">
                      {formatDate(summary.checkInDate)} -{" "}
                      {formatDate(summary.checkOutDate)}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-muted-foreground">
                      {paid ? copy.labels.paidAt : copy.labels.expiresAt}
                    </dt>
                    <dd className="font-medium">
                      {paid && summary.paidAt
                        ? formatDateTime(summary.paidAt)
                        : formatDateTime(summary.expiresAt)}
                    </dd>
                  </div>
                </dl>
              </div>

              <div className="grid gap-3 rounded-3xl border border-border/70 bg-card p-4 shadow-sm sm:p-5">
                <div className="flex items-center justify-between gap-3">
                  <h2 className="text-lg font-semibold">
                    {copy.sections.lineItems}
                  </h2>
                  <span className="text-sm font-medium text-muted-foreground">
                    {summary.items.length}
                  </span>
                </div>
                <div className="grid gap-2">
                  {summary.items.map((item, index) => (
                    <div
                      className="flex flex-col gap-2 rounded-2xl border border-border/60 bg-background p-3 text-sm sm:flex-row sm:items-start sm:justify-between"
                      key={`${item.category}-${index}`}
                    >
                      <div className="min-w-0">
                        <p className="font-medium">
                          {copy.categories[item.category]}
                        </p>
                        <p className="mt-1 break-words text-muted-foreground">
                          {item.description}
                        </p>
                      </div>
                      <span className="shrink-0 font-semibold tabular-nums">
                        {formatMoney(item.amount, item.currency)}
                      </span>
                    </div>
                  ))}
                </div>
                <div className="flex items-center justify-between border-t border-border pt-3">
                  <span className="font-medium">{copy.labels.total}</span>
                  <span className="text-lg font-semibold tabular-nums">
                    {formattedTotal}
                  </span>
                </div>
              </div>

              {payable ? (
                <div className="rounded-3xl border border-primary/15 bg-primary/5 p-4 text-sm leading-6 text-muted-foreground">
                  <p className="flex items-center gap-2 font-medium text-foreground">
                    <Clock3 aria-hidden="true" className="size-4" />
                    {copy.labels.linkAvailableUntil}
                  </p>
                  <p className="mt-1">{formatDateTime(summary.expiresAt)}</p>
                </div>
              ) : null}

              {payable ? (
                <div className="scroll-mt-24" ref={paymentSectionRef}>
                  <TilopaySdkCheckout
                    initialIssue={initialIssue}
                    onPaymentFormReady={() =>
                      scrollPaymentFormIntoViewportCenter(
                        paymentSectionRef.current,
                      )
                    }
                    reservationId={paymentToken ?? ""}
                  />
                </div>
              ) : null}

              <p className="text-center text-xs leading-5 text-muted-foreground">
                {paid
                  ? copy.paidNote
                  : payable
                    ? copy.securityNote
                    : copy.unavailableNote}
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
