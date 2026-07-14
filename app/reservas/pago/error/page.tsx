import { AlertTriangle } from "lucide-react";
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

export default async function PaymentErrorPage({
  searchParams,
}: Readonly<{
  searchParams: PaymentResultSearchParams;
}>) {
  const params = await searchParams;
  const reservationId = readParam(params, "reservationId");
  const paymentId = readParam(params, "paymentId");
  const code = readParam(params, "code");
  const paymentStatus = readParam(params, "paymentStatus");

  return (
    <main className="min-h-screen bg-background px-6 py-16">
      <section className="mx-auto grid max-w-2xl gap-6 rounded-[2rem] border border-destructive/30 bg-card p-6 text-center shadow-sm sm:p-8">
        <span className="mx-auto flex size-16 items-center justify-center rounded-full bg-destructive/10 text-destructive">
          <AlertTriangle aria-hidden="true" className="size-8" />
        </span>

        <div className="grid gap-3">
          <h1 className="text-2xl font-semibold tracking-tight text-foreground sm:text-3xl">
            No pudimos validar el pago
          </h1>
          <p className="text-sm leading-6 text-muted-foreground sm:text-base">
            El pago no pudo completarse de forma segura. La reservación no quedó confirmada.
          </p>
        </div>

        <dl className="grid gap-3 rounded-3xl border border-border/70 bg-background p-4 text-left text-sm">
          {code ? (
            <div className="grid gap-1">
              <dt className="font-medium text-foreground">Código</dt>
              <dd className="break-all text-muted-foreground">{code}</dd>
            </div>
          ) : null}

          {paymentStatus ? (
            <div className="grid gap-1">
              <dt className="font-medium text-foreground">Estado del pago</dt>
              <dd className="text-muted-foreground">{paymentStatus}</dd>
            </div>
          ) : null}

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
        </dl>

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
