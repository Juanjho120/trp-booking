import {
  PaymentResultPage,
} from "@/features/payments/components/payment-result-page";

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

  return (
    <PaymentResultPage
      code={readParam(params, "code")}
      paymentId={readParam(params, "paymentId")}
      paymentStatus={readParam(params, "paymentStatus")}
      reservationConfirmed={readParam(params, "reservationConfirmed") === "true"}
      reservationId={readParam(params, "reservationId")}
      reservationStatus={readParam(params, "reservationStatus")}
      resultType="cancel"
    />
  );
}
