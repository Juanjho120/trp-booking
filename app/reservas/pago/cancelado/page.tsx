import { CircleX } from "lucide-react";
import Link from "next/link";

type PaymentResultSearchParams = Promise<
  Readonly<Record<string, string | string[] | undefined>>
>;

function readParam(
  searchParams: Readonly<Record<string, string | string[] | undefined>>,
  key: string,
): string | null {
  const value = searchParams[key];

  if (Array.isArray(value)) {
    return value[0] ?? null;
  }

  return value ?? null;
}

export default async function CancelledPaymentPage({
  searchParams,
}: Readonly<{
  searchParams: PaymentResultSearchParams;
}>) {
  const params = await searchParams;
  const reservationId = readParam(params, "reservationId");
  const paymentStatus = readParam(params, "paymentStatus");

  return (
    <main className="min-h-screen bg-background px-6 py-16">
      <section className="mx-auto grid max-w-2xl gap-6 rounded-[2rem] border border-border/70 bg-card p-6 text-center shadow-sm sm:p-8">
        <span className="mx-auto flex size-16 items-center justify-center rounded-full bg-muted text-muted-foreground">
          <CircleX aria-hidden="true" className="size-8" />
        </span>

        <div className="grid gap-3">
          <h1 className="text-2xl font-semibold tracking-tight text-foreground sm:text-3xl">
            Pago no completado
          </h1>
          <p className="text-sm leading-6 text-muted-foreground sm:text-base">
            El pago fue cancelado o rechazado. La reservación no quedó confirmada.
          </p>
        </div>

        {(reservationId || paymentStatus) ? (
          <dl className="grid gap-3 rounded-3xl border border-border/70 bg-background p-4 text-left text-sm">
            {reservationId ? (
              <div className="grid gap-1">
                <dt className="font-medium text-foreground">Reservación</dt>
                <dd className="break-all text-muted-foreground">{reservationId}</dd>
              </div>
            ) : null}

            {paymentStatus ? (
              <div className="grid gap-1">
                <dt className="font-medium text-foreground">Estado del pago</dt>
                <dd className="text-muted-foreground">{paymentStatus}</dd>
              </div>
            ) : null}
          </dl>
        ) : null}

        <Link
          className="inline-flex h-11 items-center justify-center rounded-full bg-primary px-6 text-sm font-medium text-primary-foreground shadow-sm transition hover:bg-primary/90"
          href="/"
        >
          Intentar otra reservación
        </Link>
      </section>
    </main>
  );
}
