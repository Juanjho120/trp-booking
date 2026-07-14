import { PaymentRetryPage } from "@/features/payments/components/payment-retry-page";
import {
  isTilopayRetryPaymentIssue,
  type TilopayRetryPaymentIssue,
} from "@/types/tilopay-retry-payment";

type PaymentRetrySearchParams = Promise<
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

function readPaymentIssue(
  searchParams: Readonly<Record<string, string | string[] | undefined>>,
): TilopayRetryPaymentIssue | null {
  const value = readParam(searchParams, "paymentIssue");

  return isTilopayRetryPaymentIssue(value) ? value : null;
}

export default async function RetryPaymentPage({
  searchParams,
}: Readonly<{
  searchParams: PaymentRetrySearchParams;
}>) {
  const params = await searchParams;

  return (
    <PaymentRetryPage
      paymentIssue={readPaymentIssue(params)}
      reservationId={readParam(params, "reservationId")}
    />
  );
}
