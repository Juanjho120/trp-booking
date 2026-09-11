import { AdditionalChargePaymentPage } from "@/features/payments/components/additional-charge-payment-page";
import {
  getGuestPaymentRequestPaymentSummary,
  GuestPaymentRequestPaymentError,
} from "@/lib/payments/guest-payment-request-payment";
import {
  isTilopayRetryPaymentIssue,
  type TilopayRetryPaymentIssue,
} from "@/types/tilopay-retry-payment";
import type { TilopayPaymentResultErrorCode } from "@/types/tilopay-payment-result";

export const dynamic = "force-dynamic";

type SearchParams = Promise<
  Readonly<Record<string, string | string[] | undefined>>
>;

function readParam(
  searchParams: Readonly<Record<string, string | string[] | undefined>>,
  key: string,
): string | null {
  const value = searchParams[key];
  return Array.isArray(value) ? (value[0] ?? null) : (value ?? null);
}

function readPaymentIssue(
  searchParams: Readonly<Record<string, string | string[] | undefined>>,
): TilopayRetryPaymentIssue | null {
  const value = readParam(searchParams, "paymentIssue");
  return isTilopayRetryPaymentIssue(value) ? value : null;
}

function readResultErrorCode(
  searchParams: Readonly<Record<string, string | string[] | undefined>>,
): Extract<
  TilopayPaymentResultErrorCode,
  "ADDITIONAL_CHARGE_PAYMENT_APPLICATION_FAILED"
> | null {
  const value = readParam(searchParams, "code");
  return value === "ADDITIONAL_CHARGE_PAYMENT_APPLICATION_FAILED"
    ? value
    : null;
}

export default async function AdditionalChargePaymentRoute({
  params,
  searchParams,
}: Readonly<{
  params: Promise<{ token: string }>;
  searchParams: SearchParams;
}>) {
  const { token: encodedToken } = await params;
  const query = await searchParams;

  try {
    const token = decodeURIComponent(encodedToken);
    const summary = await getGuestPaymentRequestPaymentSummary(token);

    return (
      <AdditionalChargePaymentPage
        errorCode={readResultErrorCode(query)}
        initialIssue={readPaymentIssue(query)}
        paymentResult={readParam(query, "paymentStatus")}
        summary={summary}
      />
    );
  } catch (error) {
    return (
      <AdditionalChargePaymentPage
        errorCode={
          error instanceof GuestPaymentRequestPaymentError
            ? error.code
            : "INVALID_GUEST_PAYMENT_REQUEST"
        }
        initialIssue={null}
        paymentResult={readParam(query, "paymentStatus")}
        summary={null}
      />
    );
  }
}
