import type { AdminRefundSummary } from "@/types/admin-refund";

export type AdminRefundOperationGroup = Readonly<{
  id: string;
  refundOperationKey: string | null;
  authorizationType: string;
  lifecycleRequestId: string | null;
  currency: string;
  requestedAmount: string;
  refunds: readonly [AdminRefundSummary, ...AdminRefundSummary[]];
}>;

function amountToCents(value: string): number {
  const normalized = value.trim();
  const match = /^(\d+)(?:\.(\d{1,2}))?$/.exec(normalized);

  if (!match) {
    return 0;
  }

  const whole = Number(match[1]);
  const fraction = Number((match[2] ?? "").padEnd(2, "0"));

  if (!Number.isSafeInteger(whole) || !Number.isSafeInteger(fraction)) {
    return 0;
  }

  const cents = whole * 100 + fraction;
  return Number.isSafeInteger(cents) ? cents : 0;
}

function centsToAmount(value: number): string {
  return (value / 100).toFixed(2);
}

export function groupAdminRefundsByOperation(
  refunds: readonly AdminRefundSummary[],
): readonly AdminRefundOperationGroup[] {
  const groups = new Map<string, AdminRefundSummary[]>();

  for (const refund of refunds) {
    const groupId = refund.refundOperationKey ?? `legacy/${refund.id}`;
    const current = groups.get(groupId);

    if (current) {
      current.push(refund);
    } else {
      groups.set(groupId, [refund]);
    }
  }

  return Array.from(groups.entries()).map(([id, children]) => {
    const first = children[0];
    const requestedAmount = children.reduce(
      (total, refund) => total + amountToCents(refund.amount),
      0,
    );

    return {
      id,
      refundOperationKey: first.refundOperationKey,
      authorizationType: first.authorizationType,
      lifecycleRequestId: first.lifecycleRequestId,
      currency: first.currency,
      requestedAmount: centsToAmount(requestedAmount),
      refunds: children as [AdminRefundSummary, ...AdminRefundSummary[]],
    };
  });
}
