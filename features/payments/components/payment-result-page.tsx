"use client";

import { AlertTriangle, CheckCircle2, CircleX } from "lucide-react";
import Link from "next/link";

import { SiteFooter, SiteHeader } from "@/components/layout";
import { useLocale } from "@/features/i18n";

export type PaymentResultType = "success" | "cancel" | "error";

type PaymentResultPageProps = Readonly<{
  resultType: PaymentResultType;
  reservationId: string | null;
  paymentId: string | null;
  paymentStatus: string | null;
  reservationStatus: string | null;
  reservationConfirmed: boolean;
  code: string | null;
}>;

function ResultIcon({ resultType }: Readonly<{ resultType: PaymentResultType }>) {
  if (resultType === "success") {
    return (
      <span className="mx-auto flex size-16 items-center justify-center rounded-full bg-primary/10 text-primary">
        <CheckCircle2 aria-hidden="true" className="size-8" />
      </span>
    );
  }

  if (resultType === "cancel") {
    return (
      <span className="mx-auto flex size-16 items-center justify-center rounded-full bg-muted text-muted-foreground">
        <CircleX aria-hidden="true" className="size-8" />
      </span>
    );
  }

  return (
    <span className="mx-auto flex size-16 items-center justify-center rounded-full bg-destructive/10 text-destructive">
      <AlertTriangle aria-hidden="true" className="size-8" />
    </span>
  );
}

function normalizeDisplayValue(value: string | null): string | null {
  return value?.trim() ? value.trim() : null;
}

type PaymentResultCopy = Readonly<{
  success: Readonly<{
    title: string;
    description: string;
  }>;
  cancel: Readonly<{
    title: string;
    description: string;
  }>;
  error: Readonly<{
    title: string;
    description: string;
  }>;
}>;

function getResultCopy(
  resultType: PaymentResultType,
  copy: PaymentResultCopy,
): PaymentResultCopy["success"] {
  if (resultType === "success") {
    return copy.success;
  }

  if (resultType === "cancel") {
    return copy.cancel;
  }

  return copy.error;
}

export function PaymentResultPage({
  resultType,
  reservationId,
  paymentId,
  paymentStatus,
  reservationStatus,
  reservationConfirmed,
  code,
}: PaymentResultPageProps) {
  const { messages } = useLocale();
  const resultCopy = getResultCopy(resultType, messages.payments.result);
  const isSuccess = resultType === "success";
  const normalizedPaymentStatus = normalizeDisplayValue(paymentStatus);
  const normalizedReservationStatus = normalizeDisplayValue(reservationStatus);
  const normalizedCode = normalizeDisplayValue(code);

  const title = resultCopy.title;
  const description = resultCopy.description;
  const borderClassName = isSuccess ? "border-primary/20" : "border-destructive/30";

  return (
    <div className="min-h-screen bg-background text-foreground">
      <SiteHeader />
      <main className="px-6 py-16">
        <section
          className={`mx-auto grid max-w-2xl gap-6 rounded-[2rem] border ${borderClassName} bg-card p-6 text-center shadow-sm sm:p-8`}
        >
          <ResultIcon resultType={resultType} />

          <div className="grid gap-3">
            <h1 className="text-2xl font-semibold tracking-tight text-foreground sm:text-3xl">
              {title}
            </h1>
            <p className="text-sm leading-6 text-muted-foreground sm:text-base">
              {description}
            </p>
          </div>

          <dl className="grid gap-3 rounded-3xl border border-border/70 bg-background p-4 text-left text-sm">
            {reservationId ? (
              <div className="grid gap-1">
                <dt className="font-medium text-foreground">
                  {messages.reservations.pendingHold.reservationId}
                </dt>
                <dd className="break-all text-muted-foreground">{reservationId}</dd>
              </div>
            ) : null}

            {paymentId ? (
              <div className="grid gap-1">
                <dt className="font-medium text-foreground">
                  {messages.payments.tilopaySdk.paymentMethod}
                </dt>
                <dd className="break-all text-muted-foreground">{paymentId}</dd>
              </div>
            ) : null}

            {normalizedPaymentStatus ? (
              <div className="grid gap-1">
                <dt className="font-medium text-foreground">
                  {messages.reservations.pendingHold.status}
                </dt>
                <dd className="text-muted-foreground">{normalizedPaymentStatus}</dd>
              </div>
            ) : null}

            {normalizedReservationStatus ? (
              <div className="grid gap-1">
                <dt className="font-medium text-foreground">
                  {messages.reservations.pendingHold.status}
                </dt>
                <dd className="text-muted-foreground">
                  {normalizedReservationStatus}
                  {reservationConfirmed ? "" : ` · ${messages.errors.payment.failed}`}
                </dd>
              </div>
            ) : null}

            {normalizedCode ? (
              <div className="grid gap-1">
                <dt className="font-medium text-foreground">
                  {messages.reservations.pendingHold.status}
                </dt>
                <dd className="break-all text-muted-foreground">{normalizedCode}</dd>
              </div>
            ) : null}
          </dl>

          <Link
            className="inline-flex h-11 items-center justify-center rounded-full bg-primary px-6 text-sm font-medium text-primary-foreground shadow-sm transition hover:bg-primary/90"
            href="/alojamientos"
          >
            {messages.common.viewAccommodations}
          </Link>
        </section>
      </main>
      <SiteFooter />
    </div>
  );
}
