import assert from "node:assert/strict";

import {
  PaymentPurpose,
  Prisma,
  RefundAuthorizationType,
  RefundProcessingMode,
  RefundStatus,
} from "@prisma/client";

import {
  buildNegativeLifecycleRefundOperationKey,
  createNegativeLifecycleAdjustmentRefundInTransaction,
  LifecycleAdjustmentRefundError,
  type RefundPaymentSnapshot,
} from "../../lib/reservations/lifecycle-adjustment-refunds";
import {
  allocateReservationRefund,
  ReservationRefundAllocationError,
} from "../../lib/reservations/refund-allocation";
import { buildReservationFinancialSummary } from "../../lib/reservations/financial-summary";
import {
  FINAL_A_BASE_DATE,
  financialPayment,
  financialRefund,
  financialSnapshot,
  lifecycleSnapshot,
  money,
} from "./fixtures";
import { test } from "./harness";

function standardFinancialSummary(input: Readonly<{
  initialRefunds?: readonly ReturnType<typeof financialRefund>[];
  adjustmentRefunds?: readonly ReturnType<typeof financialRefund>[];
}> = {}) {
  const request = lifecycleSnapshot({
    id: "extension-65",
    difference: "65.00",
  });

  return buildReservationFinancialSummary(
    financialSnapshot({
      total: "195.00",
      payments: [
        financialPayment({
          id: "initial-130",
          amount: "130.00",
          refunds: input.initialRefunds,
        }),
        financialPayment({
          id: "adjustment-65",
          purpose: PaymentPurpose.LIFECYCLE_ADJUSTMENT,
          amount: "65.00",
          lifecycleRequest: request,
          refunds: input.adjustmentRefunds,
          paidAtOffsetHours: 2,
        }),
      ],
    }),
  );
}

function allocationAmounts(
  amount: string,
  summary = standardFinancialSummary(),
): readonly Readonly<{ paymentId: string; amount: string }>[] {
  return allocateReservationRefund(
    money(amount),
    summary.eligibleStayPayments,
  ).legs.map((leg) => ({
    paymentId: leg.paymentId,
    amount: leg.amount.toFixed(2),
  }));
}

test("A.3 extraordinary USD 145 allocates USD 130 initial + USD 15 adjustment", () => {
  assert.deepEqual(allocationAmounts("145.00"), [
    { paymentId: "initial-130", amount: "130.00" },
    { paymentId: "adjustment-65", amount: "15.00" },
  ]);
});

test("A.3 full USD 195 refund spans the complete captured stay pool", () => {
  assert.deepEqual(allocationAmounts("195.00"), [
    { paymentId: "initial-130", amount: "130.00" },
    { paymentId: "adjustment-65", amount: "65.00" },
  ]);
});

test("A.3 50 percent standard-policy amount remains inside initial payment when possible", () => {
  assert.deepEqual(allocationAmounts("97.50"), [
    { paymentId: "initial-130", amount: "97.50" },
  ]);
});

test("A.3 cumulative approved refund protection reallocates only the remaining initial balance", () => {
  const summary = standardFinancialSummary({
    initialRefunds: [
      financialRefund("already-approved", "20.00", RefundStatus.APPROVED),
    ],
  });

  assert.equal(summary.remainingRefundableStayBalance.toFixed(2), "175.00");
  assert.deepEqual(allocationAmounts("145.00", summary), [
    { paymentId: "initial-130", amount: "110.00" },
    { paymentId: "adjustment-65", amount: "35.00" },
  ]);
});

test("A.3 pending refund reserves balance and prevents double authorization", () => {
  const summary = standardFinancialSummary({
    initialRefunds: [
      financialRefund("pending", "30.00", RefundStatus.PENDING),
    ],
  });

  assert.equal(summary.remainingRefundableStayBalance.toFixed(2), "165.00");
  assert.deepEqual(allocationAmounts("145.00", summary), [
    { paymentId: "initial-130", amount: "100.00" },
    { paymentId: "adjustment-65", amount: "45.00" },
  ]);
});

test("A.3 failed refund releases the reserved balance", () => {
  const summary = standardFinancialSummary({
    initialRefunds: [
      financialRefund("failed", "30.00", RefundStatus.FAILED),
    ],
  });

  assert.equal(summary.remainingRefundableStayBalance.toFixed(2), "195.00");
  assert.deepEqual(allocationAmounts("145.00", summary), [
    { paymentId: "initial-130", amount: "130.00" },
    { paymentId: "adjustment-65", amount: "15.00" },
  ]);
});

test("A.3 fully consumed initial payment spills entirely into completed adjustment", () => {
  const summary = standardFinancialSummary({
    initialRefunds: [
      financialRefund("initial-consumed", "130.00", RefundStatus.APPROVED),
    ],
  });

  assert.deepEqual(allocationAmounts("65.00", summary), [
    { paymentId: "adjustment-65", amount: "65.00" },
  ]);
});

test("A.3 allocator rejects zero and aggregate over-refund", () => {
  const summary = standardFinancialSummary();

  assert.throws(
    () => allocateReservationRefund(money("0.00"), summary.eligibleStayPayments),
    (error: unknown) =>
      error instanceof ReservationRefundAllocationError &&
      error.code === "RESERVATION_REFUND_ALLOCATION_INVALID_AMOUNT",
  );

  assert.throws(
    () =>
      allocateReservationRefund(
        money("195.01"),
        summary.eligibleStayPayments,
      ),
    (error: unknown) =>
      error instanceof ReservationRefundAllocationError &&
      error.code === "RESERVATION_REFUND_ALLOCATION_INSUFFICIENT_BALANCE",
  );
});

type StoredRefund = {
  id: string;
  paymentId: string;
  lifecycleRequestId: string | null;
  refundOperationKey: string | null;
  authorizationType: RefundAuthorizationType;
  amount: Prisma.Decimal;
  currency: string;
  status: RefundStatus;
  processingMode: RefundProcessingMode;
  idempotencyKey: string;
  clientRequestId: string;
  reason: string;
  createdAt: Date;
};

type RefundCreateData = Omit<StoredRefund, "id" | "createdAt"> &
  Readonly<{
    requestedByAdminId: string;
  }>;

class NegativeRefundTransactionFixture {
  readonly refunds: StoredRefund[] = [];
  readonly auditEntries: Record<string, unknown>[] = [];
  private nextRefundId = 1;

  readonly reservation: Readonly<{
    findUnique: (input: Readonly<{ where: Readonly<{ id: string }> }>) =>
      Promise<ReturnType<typeof financialSnapshot> | null>;
  }>;

  readonly refund: Readonly<{
    findMany: (input: Readonly<{
      where: Readonly<{ refundOperationKey: string }>;
    }>) => Promise<StoredRefund[]>;
    findUnique: (input: Readonly<{
      where: Readonly<{ idempotencyKey: string }>;
    }>) => Promise<StoredRefund | null>;
    aggregate: (input: Readonly<{
      where: Readonly<{
        paymentId: string;
        status: Readonly<{ in: readonly RefundStatus[] }>;
      }>;
    }>) => Promise<Readonly<{ _sum: Readonly<{ amount: Prisma.Decimal | null }> }>>;
    create: (input: Readonly<{
      data: RefundCreateData;
    }>) => Promise<StoredRefund>;
  }>;

  readonly adminAuditLog: Readonly<{
    create: (input: Readonly<{ data: Record<string, unknown> }>) =>
      Promise<Record<string, unknown>>;
  }>;

  constructor(
    private readonly snapshot: ReturnType<typeof financialSnapshot>,
  ) {
    this.reservation = {
      findUnique: async ({ where }) =>
        where.id === this.snapshot.id ? this.snapshot : null,
    };

    this.refund = {
      findMany: async ({ where }) =>
        this.refunds
          .filter(
            (refund) =>
              refund.refundOperationKey === where.refundOperationKey,
          )
          .sort(
            (left, right) =>
              left.createdAt.getTime() - right.createdAt.getTime() ||
              left.id.localeCompare(right.id),
          ),
      findUnique: async ({ where }) =>
        this.refunds.find(
          (refund) => refund.idempotencyKey === where.idempotencyKey,
        ) ?? null,
      aggregate: async ({ where }) => {
        const committedStatuses = new Set(where.status.in);
        const amount = this.refunds
          .filter(
            (refund) =>
              refund.paymentId === where.paymentId &&
              committedStatuses.has(refund.status),
          )
          .reduce(
            (total, refund) => total.add(refund.amount).toDecimalPlaces(2),
            money("0.00"),
          );

        return { _sum: { amount } };
      },
      create: async ({ data }) => {
        const refund: StoredRefund = {
          id: `negative-refund-${this.nextRefundId}`,
          paymentId: data.paymentId,
          lifecycleRequestId: data.lifecycleRequestId,
          refundOperationKey: data.refundOperationKey,
          authorizationType: data.authorizationType,
          amount: data.amount.toDecimalPlaces(2),
          currency: data.currency,
          status: data.status,
          processingMode: data.processingMode,
          idempotencyKey: data.idempotencyKey,
          clientRequestId: data.clientRequestId,
          reason: data.reason,
          createdAt: new Date(
            FINAL_A_BASE_DATE.getTime() + this.nextRefundId * 1_000,
          ),
        };
        this.nextRefundId += 1;
        this.refunds.push(refund);
        return refund;
      },
    };

    this.adminAuditLog = {
      create: async ({ data }) => {
        this.auditEntries.push(data);
        return data;
      },
    };
  }
}

function negativeRefundFixture(input: Readonly<{
  difference?: string;
  adjustmentProviderReference?: string | null;
}> = {}) {
  const reservationId = "reservation-negative";
  const lifecycleRequestId = "date-change-negative";
  const positiveRequest = lifecycleSnapshot({
    id: "positive-before-negative",
    reservationId,
    difference: "65.00",
  });
  const initial = financialPayment({
    id: "initial-negative",
    reservationId,
    amount: "130.00",
    providerReference: "TRP-INITIAL-ORDER",
  });
  const adjustment = financialPayment({
    id: "adjustment-negative",
    reservationId,
    purpose: PaymentPurpose.LIFECYCLE_ADJUSTMENT,
    amount: "65.00",
    lifecycleRequest: positiveRequest,
    paidAtOffsetHours: 2,
    providerReference: input.adjustmentProviderReference ?? null,
  });
  const snapshot = financialSnapshot({
    reservationId,
    total: "195.00",
    payments: [initial, adjustment],
  });
  const sourcePayment: RefundPaymentSnapshot = {
    id: initial.id,
    reservationId,
    lifecycleRequestId: null,
    purpose: initial.purpose,
    status: initial.status,
    amount: initial.amount,
    currency: initial.currency,
    providerReference: initial.providerReference,
    updatedAt: initial.updatedAt,
  };

  return {
    lifecycleRequestId,
    reservationId,
    sourcePayment,
    difference: money(input.difference ?? "-145.00"),
    transaction: new NegativeRefundTransactionFixture(snapshot),
  } as const;
}

test("A.4 negative DATE_CHANGE creates one logical multi-payment refund operation", async () => {
  const fixture = negativeRefundFixture();
  const result = await createNegativeLifecycleAdjustmentRefundInTransaction(
    fixture.transaction as unknown as Prisma.TransactionClient,
    {
      lifecycleRequestId: fixture.lifecycleRequestId,
      reservationId: fixture.reservationId,
      requestedByAdminId: "admin-final-a",
      sourcePayment: fixture.sourcePayment,
      financialDifference: fixture.difference,
      currency: "USD",
      reason: "Approved negative date change",
      now: new Date("2026-08-12T12:00:00.000Z"),
    },
  );

  assert.equal(
    result.refundOperationKey,
    `lifecycle-negative/${fixture.lifecycleRequestId}`,
  );
  assert.equal(result.requestedAmount, "145.00");
  assert.equal(result.alreadyProcessed, false);
  assert.deepEqual(
    result.refunds.map((refund) => ({
      paymentId: refund.paymentId,
      amount: refund.amount,
      processingMode: refund.processingMode,
    })),
    [
      {
        paymentId: "initial-negative",
        amount: "130.00",
        processingMode: "TILOPAY_API",
      },
      {
        paymentId: "adjustment-negative",
        amount: "15.00",
        processingMode: "TILOPAY_PORTAL_FALLBACK",
      },
    ],
  );
  assert.equal(fixture.transaction.refunds.length, 2);
  assert.equal(fixture.transaction.auditEntries.length, 2);
});

test("A.4 negative refund operation replay is idempotent and creates no duplicate children", async () => {
  const fixture = negativeRefundFixture({
    adjustmentProviderReference: "TRP-ADJUSTMENT-ORDER",
  });
  const input = {
    lifecycleRequestId: fixture.lifecycleRequestId,
    reservationId: fixture.reservationId,
    requestedByAdminId: "admin-final-a",
    sourcePayment: fixture.sourcePayment,
    financialDifference: fixture.difference,
    currency: "USD",
    reason: "Approved negative date change",
    now: new Date("2026-08-12T12:00:00.000Z"),
  } as const;

  const first = await createNegativeLifecycleAdjustmentRefundInTransaction(
    fixture.transaction as unknown as Prisma.TransactionClient,
    input,
  );
  const second = await createNegativeLifecycleAdjustmentRefundInTransaction(
    fixture.transaction as unknown as Prisma.TransactionClient,
    input,
  );

  assert.equal(first.alreadyProcessed, false);
  assert.equal(second.alreadyProcessed, true);
  assert.equal(fixture.transaction.refunds.length, 2);
  assert.equal(fixture.transaction.auditEntries.length, 2);
  assert.deepEqual(
    second.refunds.map((refund) => refund.refundId),
    first.refunds.map((refund) => refund.refundId),
  );
});

test("A.4 negative replay fails closed if persisted operation children no longer match logical amount", async () => {
  const fixture = negativeRefundFixture();
  const input = {
    lifecycleRequestId: fixture.lifecycleRequestId,
    reservationId: fixture.reservationId,
    requestedByAdminId: "admin-final-a",
    sourcePayment: fixture.sourcePayment,
    financialDifference: fixture.difference,
    currency: "USD",
    reason: "Approved negative date change",
    now: new Date("2026-08-12T12:00:00.000Z"),
  } as const;

  await createNegativeLifecycleAdjustmentRefundInTransaction(
    fixture.transaction as unknown as Prisma.TransactionClient,
    input,
  );
  const secondChild = fixture.transaction.refunds[1];
  assert.ok(secondChild);
  secondChild.amount = money("14.00");

  await assert.rejects(
    () =>
      createNegativeLifecycleAdjustmentRefundInTransaction(
        fixture.transaction as unknown as Prisma.TransactionClient,
        input,
      ),
    (error: unknown) =>
      error instanceof LifecycleAdjustmentRefundError &&
      error.code === "ADMIN_DATE_MUTATION_COMPLETION_CONFLICT",
  );
});

test("A.4 negative DATE_CHANGE rejects aggregate refund above effective captured stay balance", async () => {
  const fixture = negativeRefundFixture({ difference: "-195.01" });

  await assert.rejects(
    () =>
      createNegativeLifecycleAdjustmentRefundInTransaction(
        fixture.transaction as unknown as Prisma.TransactionClient,
        {
          lifecycleRequestId: fixture.lifecycleRequestId,
          reservationId: fixture.reservationId,
          requestedByAdminId: "admin-final-a",
          sourcePayment: fixture.sourcePayment,
          financialDifference: fixture.difference,
          currency: "USD",
          reason: "Invalid excessive negative date change",
          now: new Date("2026-08-12T12:00:00.000Z"),
        },
      ),
    (error: unknown) =>
      error instanceof LifecycleAdjustmentRefundError &&
      error.code === "ADMIN_DATE_MUTATION_REFUND_BALANCE_INSUFFICIENT",
  );
});

test("A.4 negative operation key is stable and trims lifecycle request id", () => {
  assert.equal(
    buildNegativeLifecycleRefundOperationKey("  lifecycle-123  "),
    "lifecycle-negative/lifecycle-123",
  );
});
