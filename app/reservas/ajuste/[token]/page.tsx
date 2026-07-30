import {
  getLifecycleAdjustmentHandoffSummary,
  LifecycleAdjustmentHandoffError,
} from "@/lib/payments/lifecycle-adjustment-handoff";
import { LifecycleAdjustmentPaymentPage } from "@/features/payments/components/lifecycle-adjustment-payment-page";
import {
  isTilopayRetryPaymentIssue,
  type TilopayRetryPaymentIssue,
} from "@/types/tilopay-retry-payment";

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

export default async function LifecycleAdjustmentRoute({
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
    const summary = await getLifecycleAdjustmentHandoffSummary(token);

    return (
      <LifecycleAdjustmentPaymentPage
        initialIssue={readPaymentIssue(query)}
        paymentResult={readParam(query, "paymentStatus")}
        summary={summary}
      />
    );
  } catch (error) {
    return (
      <LifecycleAdjustmentPaymentPage
        errorCode={
          error instanceof LifecycleAdjustmentHandoffError
            ? error.code
            : "INVALID_LIFECYCLE_ADJUSTMENT_HANDOFF"
        }
        initialIssue={null}
        paymentResult={readParam(query, "paymentStatus")}
        summary={null}
      />
    );
  }
}
