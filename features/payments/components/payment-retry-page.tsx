"use client";

import Link from "next/link";

import { SiteFooter, SiteHeader } from "@/components/layout";
import { useLocale } from "@/features/i18n";
import { TilopaySdkCheckout } from "@/features/payments/components/tilopay-sdk-checkout";
import type { TilopayRetryPaymentIssue } from "@/types/tilopay-retry-payment";

type PaymentRetryPageProps = Readonly<{
  reservationId: string | null;
  paymentIssue: TilopayRetryPaymentIssue | null;
}>;

export function PaymentRetryPage({ reservationId, paymentIssue }: PaymentRetryPageProps) {
  const { messages } = useLocale();
  const copy = messages.payments.tilopaySdk.retryPage;

  return (
    <div className="min-h-screen bg-background text-foreground">
      <SiteHeader />
      <main className="px-6 py-16">
        <section className="mx-auto grid max-w-2xl gap-6 rounded-[2rem] border border-primary/20 bg-card p-6 shadow-sm sm:p-8">
          <div className="grid gap-3 text-center">
            <h1 className="text-2xl font-semibold tracking-tight text-foreground sm:text-3xl">
              {reservationId ? copy.page.title : copy.page.missingReservationTitle}
            </h1>
            <p className="text-sm leading-6 text-muted-foreground sm:text-base">
              {reservationId ? copy.page.description : copy.page.missingReservationDescription}
            </p>
          </div>

          {reservationId ? (
            <>
              <dl className="grid gap-3 rounded-3xl border border-border/70 bg-background p-4 text-left text-sm">
                <div className="grid gap-1">
                  <dt className="font-medium text-foreground">
                    {messages.reservations.pendingHold.reservationId}
                  </dt>
                  <dd className="break-all text-muted-foreground">{reservationId}</dd>
                </div>
              </dl>

              <TilopaySdkCheckout initialIssue={paymentIssue} reservationId={reservationId} />

              <p className="text-center text-xs leading-5 text-muted-foreground">
                {copy.page.supportNote}
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
