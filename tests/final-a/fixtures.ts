import {
  PaymentPurpose,
  PaymentStatus,
  Prisma,
  RefundStatus,
  ReservationLifecycleRequestStatus,
  ReservationLifecycleRequestType,
} from "@prisma/client";

import type {
  ReservationFinancialLifecycleSnapshot,
  ReservationFinancialPaymentSnapshot,
  ReservationFinancialRefundSnapshot,
  ReservationFinancialSnapshot,
} from "../../lib/reservations/financial-summary";
import type { AdminRefundSummary } from "../../types/admin-refund";

export const FINAL_A_BASE_DATE = new Date("2026-08-01T12:00:00.000Z");

export function money(value: string | number): Prisma.Decimal {
  return new Prisma.Decimal(value).toDecimalPlaces(2);
}

export function financialRefund(
  id: string,
  amount: string,
  status: RefundStatus,
  currency = "USD",
): ReservationFinancialRefundSnapshot {
  return {
    id,
    amount: money(amount),
    currency,
    status,
  };
}

export function lifecycleSnapshot(input: Readonly<{
  id: string;
  reservationId?: string;
  difference: string;
  status?: ReservationLifecycleRequestStatus;
  type?: ReservationLifecycleRequestType;
  currency?: string;
}>): ReservationFinancialLifecycleSnapshot {
  return {
    id: input.id,
    reservationId: input.reservationId ?? "reservation-final-a",
    requestType: input.type ?? ReservationLifecycleRequestType.STAY_EXTENSION,
    status: input.status ?? ReservationLifecycleRequestStatus.COMPLETED,
    financialDifference: money(input.difference),
    currency: input.currency ?? "USD",
  };
}

export function financialPayment(input: Readonly<{
  id: string;
  reservationId?: string;
  purpose?: PaymentPurpose;
  status?: PaymentStatus;
  amount: string;
  currency?: string;
  providerReference?: string | null;
  lifecycleRequest?: ReservationFinancialLifecycleSnapshot | null;
  paidAtOffsetHours?: number | null;
  createdAtOffsetMinutes?: number;
  refunds?: readonly ReservationFinancialRefundSnapshot[];
}>): ReservationFinancialPaymentSnapshot {
  const reservationId = input.reservationId ?? "reservation-final-a";
  const lifecycleRequest = input.lifecycleRequest ?? null;
  const paidAt =
    input.paidAtOffsetHours === null
      ? null
      : new Date(
          FINAL_A_BASE_DATE.getTime() +
            (input.paidAtOffsetHours ?? 0) * 60 * 60 * 1_000,
        );
  const createdAt = new Date(
    FINAL_A_BASE_DATE.getTime() +
      (input.createdAtOffsetMinutes ?? 0) * 60 * 1_000,
  );

  return {
    id: input.id,
    reservationId,
    lifecycleRequestId: lifecycleRequest?.id ?? null,
    purpose: input.purpose ?? PaymentPurpose.INITIAL_RESERVATION,
    status: input.status ?? PaymentStatus.APPROVED,
    amount: money(input.amount),
    currency: input.currency ?? "USD",
    providerReference:
      input.providerReference === undefined
        ? `TRP-${input.id}`
        : input.providerReference,
    paidAt,
    createdAt,
    updatedAt: new Date(createdAt.getTime() + 1_000),
    lifecycleRequest,
    refunds: input.refunds ?? [],
  };
}

export function financialSnapshot(input: Readonly<{
  total: string;
  payments: readonly ReservationFinancialPaymentSnapshot[];
  reservationId?: string;
  currency?: string;
}>): ReservationFinancialSnapshot {
  return {
    id: input.reservationId ?? "reservation-final-a",
    total: money(input.total),
    currency: input.currency ?? "USD",
    payments: input.payments,
  };
}

export function adminRefund(input: Readonly<{
  id: string;
  paymentId: string;
  amount: string;
  operationKey?: string | null;
  authorizationType?: string;
  lifecycleRequestId?: string | null;
  currency?: string;
  status?: string;
}>): AdminRefundSummary {
  return {
    id: input.id,
    paymentId: input.paymentId,
    lifecycleRequestId: input.lifecycleRequestId ?? null,
    refundOperationKey: input.operationKey ?? null,
    requestedByAdmin: {
      name: "TRP Admin",
      email: "admin@example.com",
    },
    clientRequestId: `request-${input.id}`,
    authorizationType: input.authorizationType ?? "EXTRAORDINARY",
    amount: input.amount,
    currency: input.currency ?? "USD",
    reason: "Final-A regression fixture",
    status: input.status ?? "PENDING",
    processingMode: "TILOPAY_API",
    providerRefundId: null,
    processingStartedAt: null,
    approvedAt: null,
    failedAt: null,
    failureCode: null,
    diagnostics: null,
    createdAt: FINAL_A_BASE_DATE.toISOString(),
    updatedAt: FINAL_A_BASE_DATE.toISOString(),
  };
}
