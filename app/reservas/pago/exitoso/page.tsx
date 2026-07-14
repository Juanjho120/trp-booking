import { CheckCircle2 } from "lucide-react";
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

export default async function SuccessfulPaymentPage({
  searchParams,
}: Readonly<{
  searchParams: PaymentResultSearchParams;
}>) {
  const params = await searchParams;
  const reservationId = readParam(params, "reservationId");
  const paymentId = readParam(params, "paymentId");
  const reservationStatus = readParam(params, "reservationStatus");
  const reservationConfirmed = readParam(params, "reservationConfirmed") === "true";

  return (
    <main className="min-h-screen bg-background px-6 py-16">
      <section className="mx-auto grid max-w-2xl gap-6 rounded-[2rem] border border-primary/20 bg-card p-6 text-center shadow-sm sm:p-8">
        <span className="mx-auto flex size-16 items-center justify-center rounded-full bg-primary/10 text-primary">
          <CheckCircle2 aria-hidden="true" className="size-8" />
        </span>

        <div className="grid gap-3">
          <h1 className="text-2xl font-semibold tracking-tight text-foreground sm:text-3xl">
            Pago aprobado
          </h1>
          <p className="text-sm leading-6 text-muted-foreground sm:text-base">
            Tu pago fue validado correctamente y la reservación quedó confirmada.
          </p>
        </div>

        <dl className="grid gap-3 rounded-3xl border border-border/70 bg-background p-4 text-left text-sm">
          {reservationId ? (
            <div className="grid gap-1">
              <dt className="font-medium text-foreground">Reservación</dt>
              <dd className="break-all text-muted-foreground">{reservationId}</dd>
            </div>
          ) : null}

          {paymentId ? (
            <div className="grid gap-1">
              <dt className="font-medium text-foreground">Pago</dt>
              <dd className="break-all text-muted-foreground">{paymentId}</dd>
            </div>
          ) : null}

          <div className="grid gap-1">
            <dt className="font-medium text-foreground">Estado</dt>
            <dd className="text-muted-foreground">
              {reservationConfirmed ? "Confirmada" : "Pendiente de confirmación"}
              {reservationStatus ? ` (${reservationStatus})` : ""}
            </dd>
          </div>
        </dl>

        <p className="text-xs leading-5 text-muted-foreground">
          En la siguiente fase se agregará el envío de correos con confirmación e instrucciones de llegada.
        </p>

        <Link
          className="inline-flex h-11 items-center justify-center rounded-full bg-primary px-6 text-sm font-medium text-primary-foreground shadow-sm transition hover:bg-primary/90"
          href="/"
        >
          Volver al inicio
        </Link>
      </section>
    </main>
  );
}
