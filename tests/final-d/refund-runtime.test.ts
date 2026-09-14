import assert from "node:assert/strict";

import {
  AdditionalChargeStatus,
  GuestPaymentRequestStatus,
  PaymentPurpose,
  PaymentStatus,
  Prisma,
  RefundAuthorizationType,
  RefundProcessingMode,
  RefundStatus,
  ReservationStatus,
  UserRole,
} from "@prisma/client";

import { prisma } from "@/lib/db/prisma";
import {
  AdminRefundError,
  createAdminRefundAuthorization,
  executeAdminTilopayRefund,
  reconcileAdminRefund,
} from "@/lib/admin/refunds";
import type { AdminActor } from "@/types/admin";
import type { CreateAdminAdditionalChargeRefundInput } from "@/types/admin-refund";

import { test } from "./harness";

const D5_NOW = new Date("2026-09-14T12:00:00.000Z");
const ACTOR: AdminActor = {
  id: "actor-final-d5",
  email: "admin.final-d5@juantzun.dev",
  name: "Final D5 Admin",
};

type D5Reservation = {
  id: string;
  status: ReservationStatus;
  total: Prisma.Decimal;
  pricingSnapshot: Prisma.InputJsonObject;
  updatedAt: Date;
  guestEmail: string;
  preferredLocale: string;
};

type D5Charge = {
  id: string;
  reservationId: string;
  amount: Prisma.Decimal;
  currency: string;
  status: AdditionalChargeStatus;
  updatedAt: Date;
};

type D5GuestPaymentRequest = {
  id: string;
  reservationId: string;
  status: GuestPaymentRequestStatus;
  totalAmount: Prisma.Decimal;
  currency: string;
};

type D5GuestPaymentRequestItem = {
  paymentRequestId: string;
  additionalChargeId: string;
  amountSnapshot: Prisma.Decimal;
  currencySnapshot: string;
};

type D5Payment = {
  id: string;
  reservationId: string;
  guestPaymentRequestId: string | null;
  purpose: PaymentPurpose;
  status: PaymentStatus;
  amount: Prisma.Decimal;
  currency: string;
  providerReference: string | null;
  updatedAt: Date;
};

type D5Refund = {
  id: string;
  paymentId: string;
  lifecycleRequestId: string | null;
  refundOperationKey: string | null;
  requestedByAdminId: string | null;
  clientRequestId: string | null;
  idempotencyKey: string | null;
  authorizationType: RefundAuthorizationType;
  amount: Prisma.Decimal;
  currency: string;
  reason: string | null;
  status: RefundStatus;
  processingMode: RefundProcessingMode;
  providerRefundId: string | null;
  processingStartedAt: Date | null;
  approvedAt: Date | null;
  failedAt: Date | null;
  failureCode: string | null;
  rawPayload: Prisma.InputJsonValue | null;
  createdAt: Date;
  updatedAt: Date;
};

type D5Allocation = {
  id: string;
  refundId: string;
  additionalChargeId: string;
  allocatedAmount: Prisma.Decimal;
  createdAt: Date;
};

type D5User = {
  id: string;
  email: string;
  name: string | null;
  role: UserRole;
};

type D5AuditLog = {
  action: string;
  entityType: string;
  entityId: string | null;
  metadata: Prisma.InputJsonValue | null;
};

type D5State = {
  reservations: D5Reservation[];
  charges: D5Charge[];
  paymentRequests: D5GuestPaymentRequest[];
  requestItems: D5GuestPaymentRequestItem[];
  payments: D5Payment[];
  refunds: D5Refund[];
  allocations: D5Allocation[];
  users: D5User[];
  auditLogs: D5AuditLog[];
  emailNotificationIds: string[];
  nextRefundSequence: number;
  nextAllocationSequence: number;
  inTransaction: boolean;
  providerCalls: Array<Readonly<{ url: string; inTransaction: boolean }>>;
};

type D5Store = {
  current: D5State;
};

function money(value: string | number): Prisma.Decimal {
  return new Prisma.Decimal(value).toDecimalPlaces(2);
}

function cloneDate(value: Date | null): Date | null {
  return value ? new Date(value.getTime()) : null;
}

function cloneJson<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}

function cloneState(state: D5State): D5State {
  return {
    reservations: state.reservations.map((reservation) => ({
      ...reservation,
      total: money(reservation.total.toFixed(2)),
      pricingSnapshot: cloneJson(reservation.pricingSnapshot),
      updatedAt: new Date(reservation.updatedAt.getTime()),
    })),
    charges: state.charges.map((charge) => ({
      ...charge,
      amount: money(charge.amount.toFixed(2)),
      updatedAt: new Date(charge.updatedAt.getTime()),
    })),
    paymentRequests: state.paymentRequests.map((request) => ({
      ...request,
      totalAmount: money(request.totalAmount.toFixed(2)),
    })),
    requestItems: state.requestItems.map((item) => ({
      ...item,
      amountSnapshot: money(item.amountSnapshot.toFixed(2)),
    })),
    payments: state.payments.map((payment) => ({
      ...payment,
      amount: money(payment.amount.toFixed(2)),
      updatedAt: new Date(payment.updatedAt.getTime()),
    })),
    refunds: state.refunds.map((refund) => ({
      ...refund,
      amount: money(refund.amount.toFixed(2)),
      processingStartedAt: cloneDate(refund.processingStartedAt),
      approvedAt: cloneDate(refund.approvedAt),
      failedAt: cloneDate(refund.failedAt),
      rawPayload: cloneJson(refund.rawPayload),
      createdAt: new Date(refund.createdAt.getTime()),
      updatedAt: new Date(refund.updatedAt.getTime()),
    })),
    allocations: state.allocations.map((allocation) => ({
      ...allocation,
      allocatedAmount: money(allocation.allocatedAmount.toFixed(2)),
      createdAt: new Date(allocation.createdAt.getTime()),
    })),
    users: state.users.map((user) => ({ ...user })),
    auditLogs: cloneJson(state.auditLogs),
    emailNotificationIds: [...state.emailNotificationIds],
    nextRefundSequence: state.nextRefundSequence,
    nextAllocationSequence: state.nextAllocationSequence,
    inTransaction: state.inTransaction,
    providerCalls: [...state.providerCalls],
  };
}

function baseD5State(
  options: Readonly<{
    chargeStatuses?: readonly AdditionalChargeStatus[];
    paymentStatus?: PaymentStatus;
    paymentPurpose?: PaymentPurpose;
    requestStatus?: GuestPaymentRequestStatus;
    requestId?: string;
    chargeAmounts?: readonly string[];
    paymentAmount?: string;
    providerReference?: string | null;
  }> = {},
): D5State {
  const chargeAmounts = options.chargeAmounts ?? ["100.00"];
  const requestId = options.requestId ?? "request-final-d5";
  const requestTotal = chargeAmounts
    .reduce((sum, value) => sum.add(value), new Prisma.Decimal(0))
    .toFixed(2);
  const chargeStatuses =
    options.chargeStatuses ??
    chargeAmounts.map(() => AdditionalChargeStatus.PAID);

  return {
    reservations: [
      {
        id: "reservation-final-d5",
        status: ReservationStatus.CONFIRMED,
        total: money("390.00"),
        pricingSnapshot: { version: "FINAL_C_V1", total: "390.00" },
        updatedAt: D5_NOW,
        guestEmail: "guest.final-d5@juantzun.dev",
        preferredLocale: "es",
      },
    ],
    charges: chargeAmounts.map((amount, index) => ({
      id: `charge-${index + 1}`,
      reservationId: "reservation-final-d5",
      amount: money(amount),
      currency: "USD",
      status: chargeStatuses[index] ?? AdditionalChargeStatus.PAID,
      updatedAt: new Date(D5_NOW.getTime() + index * 1_000),
    })),
    paymentRequests: [
      {
        id: requestId,
        reservationId: "reservation-final-d5",
        status: options.requestStatus ?? GuestPaymentRequestStatus.PAID,
        totalAmount: money(requestTotal),
        currency: "USD",
      },
    ],
    requestItems: chargeAmounts.map((amount, index) => ({
      paymentRequestId: requestId,
      additionalChargeId: `charge-${index + 1}`,
      amountSnapshot: money(amount),
      currencySnapshot: "USD",
    })),
    payments: [
      {
        id: "payment-final-d5",
        reservationId: "reservation-final-d5",
        guestPaymentRequestId: requestId,
        purpose: options.paymentPurpose ?? PaymentPurpose.ADDITIONAL_CHARGE,
        status: options.paymentStatus ?? PaymentStatus.APPROVED,
        amount: money(options.paymentAmount ?? requestTotal),
        currency: "USD",
        providerReference:
          options.providerReference === undefined
            ? "TILOPAY-ORDER-FINAL-D5"
            : options.providerReference,
        updatedAt: D5_NOW,
      },
    ],
    refunds: [],
    allocations: [],
    users: [],
    auditLogs: [],
    emailNotificationIds: [],
    nextRefundSequence: 1,
    nextAllocationSequence: 1,
    inTransaction: false,
    providerCalls: [],
  };
}

function maybeString(value: unknown): string | undefined {
  return typeof value === "string" ? value : undefined;
}

function idIn(value: unknown): readonly string[] | null {
  if (
    typeof value === "object" &&
    value !== null &&
    "in" in value &&
    Array.isArray((value as { in?: unknown }).in)
  ) {
    return (value as { in: string[] }).in;
  }

  return null;
}

function statusIn<T extends string>(value: unknown): readonly T[] | null {
  if (
    typeof value === "object" &&
    value !== null &&
    "in" in value &&
    Array.isArray((value as { in?: unknown }).in)
  ) {
    return (value as { in: T[] }).in;
  }

  return null;
}

function enrichPaymentForAuthorization(
  state: D5State,
  payment: D5Payment,
): unknown {
  const request = state.paymentRequests.find(
    (candidate) => candidate.id === payment.guestPaymentRequestId,
  );

  return {
    ...payment,
    guestPaymentRequest: request
      ? {
          ...request,
          items: state.requestItems
            .filter((item) => item.paymentRequestId === request.id)
            .map((item) => ({
              ...item,
              additionalCharge: state.charges.find(
                (charge) => charge.id === item.additionalChargeId,
              ),
            })),
        }
      : null,
  };
}

function enrichRefundSummary(state: D5State, refund: D5Refund): unknown {
  const requestedByAdmin = refund.requestedByAdminId
    ? state.users.find((user) => user.id === refund.requestedByAdminId) ?? null
    : null;

  return {
    id: refund.id,
    paymentId: refund.paymentId,
    lifecycleRequestId: refund.lifecycleRequestId,
    refundOperationKey: refund.refundOperationKey,
    clientRequestId: refund.clientRequestId,
    authorizationType: refund.authorizationType,
    providerRefundId: refund.providerRefundId,
    amount: refund.amount,
    currency: refund.currency,
    reason: refund.reason,
    status: refund.status,
    processingMode: refund.processingMode,
    processingStartedAt: refund.processingStartedAt,
    approvedAt: refund.approvedAt,
    failedAt: refund.failedAt,
    failureCode: refund.failureCode,
    rawPayload: refund.rawPayload,
    createdAt: refund.createdAt,
    updatedAt: refund.updatedAt,
    requestedByAdmin: requestedByAdmin
      ? {
          name: requestedByAdmin.name,
          email: requestedByAdmin.email,
        }
      : null,
  };
}

function enrichRefundForAction(state: D5State, refund: D5Refund): unknown {
  const payment = state.payments.find(
    (candidate) => candidate.id === refund.paymentId,
  );
  const reservation = payment
    ? state.reservations.find(
        (candidate) => candidate.id === payment.reservationId,
      )
    : null;

  if (!payment || !reservation) {
    throw new Error("Missing refund action fixture");
  }

  return {
    ...enrichRefundSummary(state, refund),
    payment: {
      ...payment,
      lifecycleRequestId: null,
      lifecycleRequest: null,
      reservation,
    },
  };
}

function refundMatchesWhere(refund: D5Refund, where: Record<string, unknown>): boolean {
  if (maybeString(where.id) && refund.id !== where.id) return false;

  const id = where.id;
  if (
    typeof id === "object" &&
    id !== null &&
    "not" in id &&
    refund.id === (id as { not?: unknown }).not
  ) {
    return false;
  }

  if (maybeString(where.paymentId) && refund.paymentId !== where.paymentId) {
    return false;
  }

  if (
    maybeString(where.refundOperationKey) &&
    refund.refundOperationKey !== where.refundOperationKey
  ) {
    return false;
  }

  const statuses = statusIn<RefundStatus>(where.status);
  if (statuses && !statuses.includes(refund.status)) return false;

  if (where.authorizationType && refund.authorizationType !== where.authorizationType) {
    return false;
  }

  if (
    where.lifecycleRequestId !== undefined &&
    refund.lifecycleRequestId !== where.lifecycleRequestId
  ) {
    return false;
  }

  return true;
}

function allocationMatchesWhere(
  state: D5State,
  allocation: D5Allocation,
  where: Record<string, unknown>,
): boolean {
  if (maybeString(where.refundId) && allocation.refundId !== where.refundId) {
    return false;
  }

  const refundId = where.refundId;
  if (
    typeof refundId === "object" &&
    refundId !== null &&
    "not" in refundId &&
    allocation.refundId === (refundId as { not?: unknown }).not
  ) {
    return false;
  }

  const chargeId = maybeString(where.additionalChargeId);
  if (chargeId && allocation.additionalChargeId !== chargeId) return false;

  const chargeIds = idIn(where.additionalChargeId);
  if (chargeIds && !chargeIds.includes(allocation.additionalChargeId)) {
    return false;
  }

  const refundWhere = where.refund as Record<string, unknown> | undefined;
  if (refundWhere) {
    const refund = state.refunds.find(
      (candidate) => candidate.id === allocation.refundId,
    );

    if (!refund || !refundMatchesWhere(refund, refundWhere)) {
      return false;
    }
  }

  return true;
}

function installD5Prisma(state: D5State): D5Store {
  const store = { current: state };
  const client = {
    async $transaction<T>(operation: (transaction: typeof client) => Promise<T>) {
      const before = cloneState(store.current);
      const previous = store.current.inTransaction;
      store.current.inTransaction = true;

      try {
        return await operation(client);
      } catch (error) {
        store.current = before;
        throw error;
      } finally {
        store.current.inTransaction = previous;
      }
    },
    user: {
      async upsert(args: {
        where: { email: string };
        update: { name?: string; role: UserRole };
        create: { email: string; name: string | null; role: UserRole };
      }) {
        let user = store.current.users.find(
          (candidate) => candidate.email === args.where.email,
        );

        if (!user) {
          user = {
            id: `user-${store.current.users.length + 1}`,
            email: args.create.email,
            name: args.create.name,
            role: args.create.role,
          };
          store.current.users.push(user);
        } else {
          user.name = args.update.name ?? user.name;
          user.role = args.update.role;
        }

        return {
          id: user.id,
          email: user.email,
          name: user.name,
        };
      },
    },
    payment: {
      async findUnique(args: { where: { id?: string } }) {
        const payment = store.current.payments.find(
          (candidate) => candidate.id === args.where.id,
        );

        return payment
          ? enrichPaymentForAuthorization(store.current, payment)
          : null;
      },
      async updateMany(args: {
        where: Record<string, unknown>;
        data: Record<string, unknown>;
      }) {
        let count = 0;

        for (const payment of store.current.payments) {
          if (maybeString(args.where.id) && payment.id !== args.where.id) {
            continue;
          }

          const statuses = statusIn<PaymentStatus>(args.where.status);
          if (statuses && !statuses.includes(payment.status)) continue;

          if (
            args.where.updatedAt instanceof Date &&
            payment.updatedAt.getTime() !== args.where.updatedAt.getTime()
          ) {
            continue;
          }

          if (
            args.where.purpose &&
            payment.purpose !== args.where.purpose
          ) {
            continue;
          }

          if (args.data.status) payment.status = args.data.status as PaymentStatus;
          if (args.data.updatedAt instanceof Date) payment.updatedAt = args.data.updatedAt;
          count += 1;
        }

        return { count };
      },
    },
    refund: {
      async findMany(args: { where: Record<string, unknown> }) {
        const refunds = store.current.refunds
          .filter((refund) => refundMatchesWhere(refund, args.where))
          .sort((left, right) => left.id.localeCompare(right.id));

        return refunds.map((refund) => ({
          ...enrichRefundSummary(store.current, refund),
          additionalChargeAllocations: store.current.allocations
            .filter((allocation) => allocation.refundId === refund.id)
            .sort((left, right) =>
              left.additionalChargeId.localeCompare(right.additionalChargeId),
            )
            .map((allocation) => ({
              additionalChargeId: allocation.additionalChargeId,
              allocatedAmount: allocation.allocatedAmount,
            })),
        }));
      },
      async findUnique(args: { where: { id?: string } }) {
        const refund = store.current.refunds.find(
          (candidate) => candidate.id === args.where.id,
        );

        if (!refund) return null;

        return enrichRefundForAction(store.current, refund);
      },
      async create(args: { data: Record<string, unknown> }) {
        const refund: D5Refund = {
          id: `refund-${store.current.nextRefundSequence}`,
          paymentId: String(args.data.paymentId),
          lifecycleRequestId: null,
          refundOperationKey: maybeString(args.data.refundOperationKey) ?? null,
          requestedByAdminId: maybeString(args.data.requestedByAdminId) ?? null,
          clientRequestId: maybeString(args.data.clientRequestId) ?? null,
          idempotencyKey: maybeString(args.data.idempotencyKey) ?? null,
          authorizationType: args.data.authorizationType as RefundAuthorizationType,
          amount: args.data.amount as Prisma.Decimal,
          currency: String(args.data.currency),
          reason: maybeString(args.data.reason) ?? null,
          status: args.data.status as RefundStatus,
          processingMode: args.data.processingMode as RefundProcessingMode,
          providerRefundId: null,
          processingStartedAt: null,
          approvedAt: null,
          failedAt: null,
          failureCode: null,
          rawPayload: null,
          createdAt: D5_NOW,
          updatedAt: D5_NOW,
        };
        const nested = args.data.additionalChargeAllocations as
          | { create?: Array<{ additionalChargeId: string; allocatedAmount: Prisma.Decimal }> }
          | undefined;

        store.current.nextRefundSequence += 1;
        store.current.refunds.push(refund);

        for (const allocation of nested?.create ?? []) {
          store.current.allocations.push({
            id: `allocation-${store.current.nextAllocationSequence}`,
            refundId: refund.id,
            additionalChargeId: allocation.additionalChargeId,
            allocatedAmount: allocation.allocatedAmount,
            createdAt: D5_NOW,
          });
          store.current.nextAllocationSequence += 1;
        }

        return enrichRefundSummary(store.current, refund);
      },
      async updateMany(args: {
        where: Record<string, unknown>;
        data: Record<string, unknown>;
      }) {
        let count = 0;

        for (const refund of store.current.refunds) {
          if (!refundMatchesWhere(refund, args.where)) continue;

          if (
            args.where.updatedAt instanceof Date &&
            refund.updatedAt.getTime() !== args.where.updatedAt.getTime()
          ) {
            continue;
          }

          Object.assign(refund, args.data);
          count += 1;
        }

        return { count };
      },
      async aggregate(args: { where: Record<string, unknown> }) {
        const amount = store.current.refunds
          .filter((refund) => refundMatchesWhere(refund, args.where))
          .reduce(
            (sum, refund) => sum.add(refund.amount).toDecimalPlaces(2),
            new Prisma.Decimal(0),
          );

        return { _sum: { amount } };
      },
    },
    additionalChargeRefundAllocation: {
      async findMany(args: { where: Record<string, unknown> }) {
        return store.current.allocations
          .filter((allocation) =>
            allocationMatchesWhere(store.current, allocation, args.where),
          )
          .map((allocation) => ({
            additionalChargeId: allocation.additionalChargeId,
            allocatedAmount: allocation.allocatedAmount,
            additionalCharge: store.current.charges.find(
              (charge) => charge.id === allocation.additionalChargeId,
            ),
          }));
      },
      async aggregate(args: { where: Record<string, unknown> }) {
        const allocatedAmount = store.current.allocations
          .filter((allocation) =>
            allocationMatchesWhere(store.current, allocation, args.where),
          )
          .reduce(
            (sum, allocation) =>
              sum.add(allocation.allocatedAmount).toDecimalPlaces(2),
            new Prisma.Decimal(0),
          );

        return { _sum: { allocatedAmount } };
      },
    },
    additionalCharge: {
      async updateMany(args: {
        where: Record<string, unknown>;
        data: Record<string, unknown>;
      }) {
        let count = 0;
        const ids = idIn(args.where.id);

        for (const charge of store.current.charges) {
          if (maybeString(args.where.id) && charge.id !== args.where.id) continue;
          if (ids && !ids.includes(charge.id)) continue;
          if (
            maybeString(args.where.reservationId) &&
            charge.reservationId !== args.where.reservationId
          ) {
            continue;
          }

          const statuses = statusIn<AdditionalChargeStatus>(args.where.status);
          if (statuses && !statuses.includes(charge.status)) continue;

          if (
            args.where.updatedAt instanceof Date &&
            charge.updatedAt.getTime() !== args.where.updatedAt.getTime()
          ) {
            continue;
          }

          if (args.data.status) {
            charge.status = args.data.status as AdditionalChargeStatus;
          }

          count += 1;
        }

        return { count };
      },
    },
    adminAuditLog: {
      async create(args: { data: Record<string, unknown> }) {
        store.current.auditLogs.push({
          action: String(args.data.action),
          entityType: String(args.data.entityType),
          entityId: maybeString(args.data.entityId) ?? null,
          metadata: (args.data.metadata ?? null) as Prisma.InputJsonValue | null,
        });

        return store.current.auditLogs.at(-1) ?? null;
      },
    },
  };

  Object.assign(prisma as unknown as object, client);
  return store;
}

function ensureD5Env(): void {
  process.env.TRP_ENVIRONMENT = "local";
  process.env.AUTH_SECRET = "final-d5-test-auth-secret-at-least-32-chars";
  process.env.AUTH_GOOGLE_ID = "final-d5-google-id";
  process.env.AUTH_GOOGLE_SECRET = "final-d5-google-secret";
  process.env.NEXT_PUBLIC_SITE_URL = "http://localhost:3000";
  process.env.DATABASE_URL ??= "postgresql://example.invalid/final-d5";
  process.env.DIRECT_URL ??= "postgresql://example.invalid/final-d5";
  process.env.CLOUDINARY_CLOUD_NAME = "final-d5-cloud";
  process.env.CLOUDINARY_API_KEY = "final-d5-cloudinary-key";
  process.env.CLOUDINARY_API_SECRET = "final-d5-cloudinary-secret";
  process.env.CLOUDINARY_UPLOAD_FOLDER = "trp-booking/final-d5";
  process.env.TILOPAY_ENVIRONMENT = "sandbox";
  process.env.TILOPAY_API_KEY = "final-d5-api-key";
  process.env.TILOPAY_API_USER = "final-d5-api-user";
  process.env.TILOPAY_API_PASSWORD = "final-d5-api-password";
}

function refundInput(
  store: D5Store,
  overrides: Partial<CreateAdminAdditionalChargeRefundInput> = {},
): CreateAdminAdditionalChargeRefundInput {
  const charge = store.current.charges[0];
  const payment = store.current.payments[0];

  assert.ok(charge);
  assert.ok(payment);

  return {
    reservationId: "reservation-final-d5",
    paymentId: payment.id,
    authorizationType: "ADDITIONAL_CHARGE",
    amount: "40.00",
    reason: "Ancillary refund evidence",
    processingMode: "TILOPAY_PORTAL_FALLBACK",
    requestId: "request-refund-final-d5",
    expectedPaymentUpdatedAt: payment.updatedAt.toISOString(),
    allocations: [
      {
        additionalChargeId: charge.id,
        amount: "40.00",
        expectedChargeUpdatedAt: charge.updatedAt.toISOString(),
      },
    ],
    ...overrides,
  };
}

async function assertRejectsWithCode(
  action: () => Promise<unknown>,
  code: string,
): Promise<void> {
  await assert.rejects(
    action,
    (error) => error instanceof AdminRefundError && error.code === code,
  );
}

function installTilopayFetch(
  store: D5Store,
  result: "accepted" | "rejected",
): () => void {
  const originalFetch = globalThis.fetch;

  globalThis.fetch = (async (url: string | URL) => {
    const href = String(url);
    store.current.providerCalls.push({
      url: href,
      inTransaction: store.current.inTransaction,
    });

    if (href.endsWith("/login")) {
      return Response.json({
        access_token: "final-d5-api-token",
        token_type: "Bearer",
      });
    }

    if (href.endsWith("/processModification")) {
      return Response.json(
        result === "accepted"
          ? {
              response: {
                responseCode: "1101",
                description: "Transaction is approved",
                transactionId: "provider-refund-final-d5",
              },
            }
          : {
              response: {
                responseCode: "12",
                description: "Transaction rejected",
                transactionId: "provider-refund-rejected-final-d5",
              },
            },
        { status: result === "accepted" ? 200 : 400 },
      );
    }

    return Response.json({}, { status: 404 });
  }) as typeof fetch;

  return () => {
    globalThis.fetch = originalFetch;
  };
}

test("D.5 runtime authorization creates charge-level allocations and replays idempotently", async () => {
  ensureD5Env();
  const store = installD5Prisma(baseD5State());
  const input = refundInput(store);

  const result = await createAdminRefundAuthorization(input, ACTOR);
  const replay = await createAdminRefundAuthorization(input, ACTOR);

  assert.equal(result.refund.authorizationType, "ADDITIONAL_CHARGE");
  assert.equal(result.refund.status, "PENDING");
  assert.equal(result.refund.amount, "40.00");
  assert.equal(store.current.refunds.length, 1);
  assert.equal(store.current.allocations.length, 1);
  assert.equal(store.current.allocations[0]?.additionalChargeId, "charge-1");
  assert.equal(store.current.allocations[0]?.allocatedAmount.toFixed(2), "40.00");
  assert.equal(replay.alreadyProcessed, true);
  assert.equal(store.current.refunds.length, 1);
});

test("D.5 runtime authorization enforces charge eligibility, payment/request scope, and exact allocation", async () => {
  ensureD5Env();

  for (const status of [
    AdditionalChargeStatus.PENDING,
    AdditionalChargeStatus.CANCELLED,
    AdditionalChargeStatus.REFUNDED,
  ]) {
    const store = installD5Prisma(
      baseD5State({ chargeStatuses: [status] }),
    );

    await assertRejectsWithCode(
      () => createAdminRefundAuthorization(refundInput(store), ACTOR),
      "INVALID_ADMIN_REFUND_REQUEST",
    );
  }

  const crossRequest = installD5Prisma(baseD5State());
  crossRequest.current.requestItems[0] = {
    ...crossRequest.current.requestItems[0]!,
    paymentRequestId: "other-request",
  };
  await assertRejectsWithCode(
    () => createAdminRefundAuthorization(refundInput(crossRequest), ACTOR),
    "ADMIN_REFUND_PAYMENT_NOT_REFUNDABLE",
  );

  const wrongPayment = installD5Prisma(
    baseD5State({ paymentPurpose: PaymentPurpose.INITIAL_RESERVATION }),
  );
  await assertRejectsWithCode(
    () => createAdminRefundAuthorization(refundInput(wrongPayment), ACTOR),
    "ADMIN_REFUND_PAYMENT_NOT_REFUNDABLE",
  );

  const multi = installD5Prisma(
    baseD5State({ chargeAmounts: ["30.00", "70.00"] }),
  );
  const result = await createAdminRefundAuthorization(
    refundInput(multi, {
      amount: "100.00",
      allocations: multi.current.charges.map((charge) => ({
        additionalChargeId: charge.id,
        amount: charge.amount.toFixed(2),
        expectedChargeUpdatedAt: charge.updatedAt.toISOString(),
      })),
    }),
    ACTOR,
  );

  assert.equal(result.refund.amount, "100.00");
  assert.deepEqual(
    multi.current.allocations.map((allocation) =>
      allocation.allocatedAmount.toFixed(2),
    ),
    ["30.00", "70.00"],
  );

  const over = installD5Prisma(baseD5State());
  await assertRejectsWithCode(
    () =>
      createAdminRefundAuthorization(
        refundInput(over, {
          amount: "101.00",
          allocations: [
            {
              additionalChargeId: "charge-1",
              amount: "101.00",
              expectedChargeUpdatedAt:
                over.current.charges[0]!.updatedAt.toISOString(),
            },
          ],
        }),
        ACTOR,
      ),
    "ADMIN_REFUND_AMOUNT_EXCEEDS_PAYMENT",
  );
});

test("D.5 runtime authorization reserves pending allocations and releases failed attempts", async () => {
  ensureD5Env();
  const store = installD5Prisma(baseD5State());
  const first = await createAdminRefundAuthorization(refundInput(store), ACTOR);

  await assertRejectsWithCode(
    () =>
      createAdminRefundAuthorization(
        refundInput(store, {
          requestId: "request-refund-final-d5-overlap",
          amount: "70.00",
          allocations: [
            {
              additionalChargeId: "charge-1",
              amount: "70.00",
              expectedChargeUpdatedAt:
                store.current.charges[0]!.updatedAt.toISOString(),
            },
          ],
        }),
        ACTOR,
      ),
    "ADMIN_REFUND_AMOUNT_EXCEEDS_PAYMENT",
  );

  store.current.refunds[0] = {
    ...store.current.refunds[0]!,
    status: RefundStatus.FAILED,
  };

  const second = await createAdminRefundAuthorization(
    refundInput(store, {
      requestId: "request-refund-final-d5-after-failed",
      amount: "100.00",
      allocations: [
        {
          additionalChargeId: "charge-1",
          amount: "100.00",
          expectedChargeUpdatedAt:
            store.current.charges[0]!.updatedAt.toISOString(),
        },
      ],
    }),
    ACTOR,
  );

  assert.equal(first.refund.status, "PENDING");
  assert.equal(second.refund.amount, "100.00");
  assert.equal(store.current.refunds.length, 2);
});

test("D.5 runtime execution uses the shared Tilopay provider pipeline outside authorization transaction", async () => {
  ensureD5Env();
  const store = installD5Prisma(baseD5State());
  const authorization = await createAdminRefundAuthorization(
    refundInput(store, {
      processingMode: "TILOPAY_API",
    }),
    ACTOR,
  );
  const restoreFetch = installTilopayFetch(store, "accepted");

  try {
    const result = await executeAdminTilopayRefund(
      {
        refundId: authorization.refund.id,
        requestId: "execute-final-d5",
        expectedRefundUpdatedAt: store.current.refunds[0]!.updatedAt.toISOString(),
        expectedPaymentUpdatedAt:
          store.current.payments[0]!.updatedAt.toISOString(),
      },
      ACTOR,
    );

    assert.equal(result.providerRequestSent, true);
    assert.equal(result.refund.status, "PROCESSING");
    assert.equal(store.current.payments[0]?.status, PaymentStatus.APPROVED);
    assert.equal(store.current.charges[0]?.status, AdditionalChargeStatus.PAID);
    assert.equal(store.current.reservations[0]?.status, ReservationStatus.CONFIRMED);
    assert.equal(store.current.reservations[0]?.total.toFixed(2), "390.00");
    assert.equal(
      store.current.providerCalls.some(
        (call) => call.url.endsWith("/processModification") && call.inTransaction,
      ),
      false,
    );
  } finally {
    restoreFetch();
  }
});

test("D.5 runtime execution records provider rejection as FAILED without stay mutations", async () => {
  ensureD5Env();
  const store = installD5Prisma(baseD5State());
  const authorization = await createAdminRefundAuthorization(
    refundInput(store, {
      processingMode: "TILOPAY_API",
    }),
    ACTOR,
  );
  const restoreFetch = installTilopayFetch(store, "rejected");

  try {
    const result = await executeAdminTilopayRefund(
      {
        refundId: authorization.refund.id,
        requestId: "execute-rejected-final-d5",
        expectedRefundUpdatedAt: store.current.refunds[0]!.updatedAt.toISOString(),
        expectedPaymentUpdatedAt:
          store.current.payments[0]!.updatedAt.toISOString(),
      },
      ACTOR,
    );

    assert.equal(result.refund.status, "FAILED");
    assert.equal(store.current.payments[0]?.status, PaymentStatus.APPROVED);
    assert.equal(store.current.charges[0]?.status, AdditionalChargeStatus.PAID);
    assert.equal(store.current.reservations[0]?.pricingSnapshot.version, "FINAL_C_V1");
  } finally {
    restoreFetch();
  }
});

test("D.5 runtime reconciliation updates ancillary payment and charge state without lifecycle notifications", async () => {
  ensureD5Env();
  const store = installD5Prisma(baseD5State());
  const partial = await createAdminRefundAuthorization(refundInput(store), ACTOR);

  const partialResult = await reconcileAdminRefund(
    {
      refundId: partial.refund.id,
      outcome: "APPROVED",
      source: "TILOPAY_PORTAL",
      finalProcessingMode: "TILOPAY_PORTAL_FALLBACK",
      providerRefundId: "portal-refund-partial-final-d5",
      note: "Portal evidence for partial ancillary refund.",
      requestId: "reconcile-partial-final-d5",
      expectedRefundUpdatedAt: store.current.refunds[0]!.updatedAt.toISOString(),
      expectedPaymentUpdatedAt: store.current.payments[0]!.updatedAt.toISOString(),
    },
    ACTOR,
  );

  assert.equal(partialResult.paymentStatus, PaymentStatus.PARTIALLY_REFUNDED);
  assert.equal(store.current.payments[0]?.status, PaymentStatus.PARTIALLY_REFUNDED);
  assert.equal(store.current.charges[0]?.status, AdditionalChargeStatus.PARTIALLY_REFUNDED);

  const full = await createAdminRefundAuthorization(
    refundInput(store, {
      requestId: "request-refund-final-d5-full",
      amount: "60.00",
      allocations: [
        {
          additionalChargeId: "charge-1",
          amount: "60.00",
          expectedChargeUpdatedAt:
            store.current.charges[0]!.updatedAt.toISOString(),
        },
      ],
    }),
    ACTOR,
  );
  const fullResult = await reconcileAdminRefund(
    {
      refundId: full.refund.id,
      outcome: "APPROVED",
      source: "TILOPAY_PORTAL",
      finalProcessingMode: "TILOPAY_PORTAL_FALLBACK",
      providerRefundId: "portal-refund-full-final-d5",
      note: "Portal evidence for remaining ancillary refund.",
      requestId: "reconcile-full-final-d5",
      expectedRefundUpdatedAt: store.current.refunds[1]!.updatedAt.toISOString(),
      expectedPaymentUpdatedAt: store.current.payments[0]!.updatedAt.toISOString(),
    },
    ACTOR,
  );
  const replay = await reconcileAdminRefund(
    {
      refundId: full.refund.id,
      outcome: "APPROVED",
      source: "TILOPAY_PORTAL",
      finalProcessingMode: "TILOPAY_PORTAL_FALLBACK",
      providerRefundId: "portal-refund-full-final-d5",
      note: "Replay should be idempotent.",
      requestId: "reconcile-full-final-d5-replay",
      expectedRefundUpdatedAt: "stale-but-ignored-after-approval",
      expectedPaymentUpdatedAt: "stale-but-ignored-after-approval",
    },
    ACTOR,
  );

  assert.equal(fullResult.paymentStatus, PaymentStatus.REFUNDED);
  assert.equal(replay.alreadyProcessed, true);
  assert.equal(store.current.payments[0]?.status, PaymentStatus.REFUNDED);
  assert.equal(store.current.charges[0]?.status, AdditionalChargeStatus.REFUNDED);
  assert.equal(store.current.emailNotificationIds.length, 0);
  assert.equal(store.current.reservations[0]?.status, ReservationStatus.CONFIRMED);
  assert.equal(store.current.reservations[0]?.total.toFixed(2), "390.00");
});

test("D.5 runtime reconciliation handles multi-charge and failed outcomes independently", async () => {
  ensureD5Env();
  const store = installD5Prisma(
    baseD5State({ chargeAmounts: ["70.00", "30.00"] }),
  );
  const multi = await createAdminRefundAuthorization(
    refundInput(store, {
      amount: "80.00",
      allocations: [
        {
          additionalChargeId: "charge-1",
          amount: "70.00",
          expectedChargeUpdatedAt:
            store.current.charges[0]!.updatedAt.toISOString(),
        },
        {
          additionalChargeId: "charge-2",
          amount: "10.00",
          expectedChargeUpdatedAt:
            store.current.charges[1]!.updatedAt.toISOString(),
        },
      ],
    }),
    ACTOR,
  );

  await reconcileAdminRefund(
    {
      refundId: multi.refund.id,
      outcome: "APPROVED",
      source: "TILOPAY_PORTAL",
      finalProcessingMode: "TILOPAY_PORTAL_FALLBACK",
      providerRefundId: "portal-refund-multi-final-d5",
      note: "Portal evidence for multi-charge ancillary refund.",
      requestId: "reconcile-multi-final-d5",
      expectedRefundUpdatedAt: store.current.refunds[0]!.updatedAt.toISOString(),
      expectedPaymentUpdatedAt: store.current.payments[0]!.updatedAt.toISOString(),
    },
    ACTOR,
  );

  assert.deepEqual(
    store.current.charges.map((charge) => charge.status),
    [AdditionalChargeStatus.REFUNDED, AdditionalChargeStatus.PARTIALLY_REFUNDED],
  );

  const failed = await createAdminRefundAuthorization(
    refundInput(store, {
      requestId: "request-refund-final-d5-failed",
      amount: "20.00",
      allocations: [
        {
          additionalChargeId: "charge-2",
          amount: "20.00",
          expectedChargeUpdatedAt:
            store.current.charges[1]!.updatedAt.toISOString(),
        },
      ],
    }),
    ACTOR,
  );

  await reconcileAdminRefund(
    {
      refundId: failed.refund.id,
      outcome: "FAILED",
      source: "TILOPAY_PORTAL",
      finalProcessingMode: "TILOPAY_PORTAL_FALLBACK",
      providerRefundId: null,
      note: "Portal confirmed this ancillary refund did not complete.",
      requestId: "reconcile-failed-final-d5",
      expectedRefundUpdatedAt: store.current.refunds[1]!.updatedAt.toISOString(),
      expectedPaymentUpdatedAt: store.current.payments[0]!.updatedAt.toISOString(),
    },
    ACTOR,
  );

  assert.equal(store.current.refunds[1]?.status, RefundStatus.FAILED);
  assert.equal(store.current.charges[1]?.status, AdditionalChargeStatus.PARTIALLY_REFUNDED);
  assert.equal(store.current.payments[0]?.status, PaymentStatus.PARTIALLY_REFUNDED);
  assert.equal(store.current.emailNotificationIds.length, 0);
});
