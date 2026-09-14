import assert from "node:assert/strict";

import {
  AdditionalChargeStatus,
  GuestPaymentRequestStatus,
  PaymentProvider,
  PaymentPurpose,
  PaymentStatus,
  PaymentSubmissionSource,
  PaymentSubmissionStatus,
  Prisma,
  ReservationStatus,
} from "@prisma/client";

import { prisma } from "@/lib/db/prisma";
import {
  createTilopayOrderHash,
  type TilopayOrderHashInput,
} from "@/lib/payments/tilopay-order-hash";
import { hashGuestPaymentRequestAccessToken } from "@/lib/payments/guest-payment-request-token";

import { test } from "./harness";

const VALID_TOKEN = "0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef";
const WRONG_TOKEN = "fedcba9876543210fedcba9876543210fedcba9876543210fedcba9876543210";
const BASE_NOW = new Date("2026-09-11T12:00:00.000Z");
const TEST_GUEST_EMAIL = "guest.final-d4.behavior@juantzun.dev";
const CLIENT_EVENT_VALUE_INDEX = {
  paymentMethodId: 7,
  paymentMethodName: 8,
  paymentMethodType: 9,
  detectedCardBrand: 10,
  sdkMessage: 11,
  preflightStatus: 13,
} as const;

type MockReservation = {
  id: string;
  status: ReservationStatus;
  guestName: string;
  guestEmail: string;
  guestPhone: string | null;
  guestCountry: string | null;
  preferredLocale: string;
  checkInDate: Date;
  checkOutDate: Date;
  total: Prisma.Decimal;
  pricingSnapshot: Prisma.InputJsonObject;
  property: {
    nameEs: string;
    nameEn: string;
  };
};

type MockAdditionalCharge = {
  id: string;
  reservationId: string;
  category: "CLEANING" | "DAMAGE" | "TRANSPORT";
  description: string;
  amount: Prisma.Decimal;
  currency: string;
  status: AdditionalChargeStatus;
};

type MockGuestPaymentRequestItem = {
  id: string;
  paymentRequestId: string;
  additionalChargeId: string;
  categorySnapshot: "CLEANING" | "DAMAGE" | "TRANSPORT";
  descriptionSnapshot: string;
  amountSnapshot: Prisma.Decimal;
  currencySnapshot: string;
  createdAt: Date;
};

type MockGuestPaymentRequest = {
  id: string;
  reservationId: string;
  status: GuestPaymentRequestStatus;
  totalAmount: Prisma.Decimal;
  currency: string;
  accessTokenHash: string;
  accessTokenEncrypted: string;
  expiresAt: Date;
  createdByAdminId: string;
  paidAt: Date | null;
  cancelledAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
};

type MockPayment = {
  id: string;
  reservationId: string;
  guestPaymentRequestId: string | null;
  provider: PaymentProvider;
  purpose: PaymentPurpose;
  status: PaymentStatus;
  amount: Prisma.Decimal;
  currency: string;
  providerReference: string | null;
  providerTransactionId: string | null;
  paidAt: Date | null;
  failedAt: Date | null;
  rawPayload: Prisma.InputJsonValue | null;
  createdAt: Date;
  updatedAt: Date;
};

type MockPaymentSubmissionAttempt = {
  id: string;
  paymentId: string;
  reservationId: string;
  attemptNumber: number;
  source: PaymentSubmissionSource;
  status: PaymentSubmissionStatus;
  environment: string;
  locale: string;
  safeResultCode: string | null;
  preflightExpiresAt: Date | null;
  startedAt: Date;
  submittedAt: Date | null;
  completedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
};

type MockLifecycleRequest = {
  id: string;
  reservationId: string;
  status: string;
  completedAt: Date | null;
};

type MockLifecycleHold = {
  id: string;
  lifecycleRequestId: string;
  status: string;
  expiresAt: Date;
};

type MockAuditLog = {
  action: string;
  entityType: string;
  entityId: string | null;
  metadata: Prisma.InputJsonValue | null;
};

type MockClientEvent = {
  paymentId: string;
  reservationId: string;
  values: readonly unknown[];
};

type MockState = {
  reservations: MockReservation[];
  additionalCharges: MockAdditionalCharge[];
  guestPaymentRequests: MockGuestPaymentRequest[];
  guestPaymentRequestItems: MockGuestPaymentRequestItem[];
  payments: MockPayment[];
  paymentSubmissionAttempts: MockPaymentSubmissionAttempt[];
  lifecycleRequests: MockLifecycleRequest[];
  lifecycleHolds: MockLifecycleHold[];
  auditLogs: MockAuditLog[];
  clientEvents: MockClientEvent[];
  nextPaymentSequence: number;
  nextAttemptSequence: number;
};

type MockStore = {
  current: MockState;
};

type MockPrismaShape = {
  $transaction: <T>(
    operation: (transaction: MockPrismaShape) => Promise<T>,
    options?: unknown,
  ) => Promise<T>;
  $executeRaw: (
    strings: TemplateStringsArray,
    ...values: readonly unknown[]
  ) => Promise<number>;
  guestPaymentRequest: {
    findUnique: (args: { where: Record<string, unknown> }) => Promise<unknown>;
    updateMany: (args: {
      where: Record<string, unknown>;
      data: Record<string, unknown>;
    }) => Promise<{ count: number }>;
  };
  payment: {
    create: (args: { data: Record<string, unknown> }) => Promise<unknown>;
    findUnique: (args: { where: Record<string, unknown> }) => Promise<unknown>;
    findFirst: (args: { where: Record<string, unknown> }) => Promise<unknown>;
    update: (args: {
      where: Record<string, unknown>;
      data: Record<string, unknown>;
    }) => Promise<unknown>;
  };
  additionalCharge: {
    updateMany: (args: {
      where: Record<string, unknown>;
      data: Record<string, unknown>;
    }) => Promise<{ count: number }>;
  };
  adminAuditLog: {
    create: (args: { data: Record<string, unknown> }) => Promise<unknown>;
  };
  paymentSubmissionAttempt: {
    findFirst: (args: {
      where: Record<string, unknown>;
      orderBy?: unknown;
    }) => Promise<unknown>;
    create: (args: { data: Record<string, unknown> }) => Promise<unknown>;
    update: (args: {
      where: Record<string, unknown>;
      data: Record<string, unknown>;
    }) => Promise<unknown>;
    updateMany: (args: {
      where: Record<string, unknown>;
      data: Record<string, unknown>;
    }) => Promise<{ count: number }>;
  };
};

type D4Modules = Readonly<{
  payments: typeof import("@/lib/payments/guest-payment-request-payment");
  attempts: typeof import("@/lib/payments/payment-submission-attempts");
  clientEvents: typeof import("@/lib/payments/tilopay-sdk-client-events");
  result: typeof import("@/lib/payments/tilopay-payment-result");
  sdkSession: typeof import("@/lib/payments/tilopay-sdk-session");
  sdkSessionRoute: typeof import("@/app/api/payments/tilopay/sdk-session/route");
}>;

let modulesPromise: Promise<D4Modules> | null = null;

function money(value: string | number): Prisma.Decimal {
  return new Prisma.Decimal(value).toDecimalPlaces(2);
}

function cloneDate(value: Date | null): Date | null {
  return value ? new Date(value.getTime()) : null;
}

function cloneJson<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}

function cloneState(state: MockState): MockState {
  return {
    reservations: state.reservations.map((reservation) => ({
      ...reservation,
      checkInDate: new Date(reservation.checkInDate.getTime()),
      checkOutDate: new Date(reservation.checkOutDate.getTime()),
      total: money(reservation.total.toFixed(2)),
      pricingSnapshot: cloneJson(reservation.pricingSnapshot),
      property: { ...reservation.property },
    })),
    additionalCharges: state.additionalCharges.map((charge) => ({
      ...charge,
      amount: money(charge.amount.toFixed(2)),
    })),
    guestPaymentRequests: state.guestPaymentRequests.map((request) => ({
      ...request,
      totalAmount: money(request.totalAmount.toFixed(2)),
      expiresAt: new Date(request.expiresAt.getTime()),
      paidAt: cloneDate(request.paidAt),
      cancelledAt: cloneDate(request.cancelledAt),
      createdAt: new Date(request.createdAt.getTime()),
      updatedAt: new Date(request.updatedAt.getTime()),
    })),
    guestPaymentRequestItems: state.guestPaymentRequestItems.map((item) => ({
      ...item,
      amountSnapshot: money(item.amountSnapshot.toFixed(2)),
      createdAt: new Date(item.createdAt.getTime()),
    })),
    payments: state.payments.map((payment) => ({
      ...payment,
      amount: money(payment.amount.toFixed(2)),
      paidAt: cloneDate(payment.paidAt),
      failedAt: cloneDate(payment.failedAt),
      rawPayload: cloneJson(payment.rawPayload),
      createdAt: new Date(payment.createdAt.getTime()),
      updatedAt: new Date(payment.updatedAt.getTime()),
    })),
    paymentSubmissionAttempts: state.paymentSubmissionAttempts.map(
      (attempt) => ({
        ...attempt,
        preflightExpiresAt: cloneDate(attempt.preflightExpiresAt),
        startedAt: new Date(attempt.startedAt.getTime()),
        submittedAt: cloneDate(attempt.submittedAt),
        completedAt: cloneDate(attempt.completedAt),
        createdAt: new Date(attempt.createdAt.getTime()),
        updatedAt: new Date(attempt.updatedAt.getTime()),
      }),
    ),
    lifecycleRequests: state.lifecycleRequests.map((request) => ({
      ...request,
      completedAt: cloneDate(request.completedAt),
    })),
    lifecycleHolds: state.lifecycleHolds.map((hold) => ({
      ...hold,
      expiresAt: new Date(hold.expiresAt.getTime()),
    })),
    auditLogs: cloneJson(state.auditLogs),
    clientEvents: state.clientEvents.map((event) => ({
      ...event,
      values: [...event.values],
    })),
    nextPaymentSequence: state.nextPaymentSequence,
    nextAttemptSequence: state.nextAttemptSequence,
  };
}

function requestTokenHash(token = VALID_TOKEN): string {
  return hashGuestPaymentRequestAccessToken(token);
}

function baseState(
  options: Readonly<{
    token?: string;
    requestStatus?: GuestPaymentRequestStatus;
    paymentStatus?: PaymentStatus | null;
    chargeStatus?: AdditionalChargeStatus;
    expiresAt?: Date;
    totalAmount?: string;
    chargeAmounts?: readonly string[];
    paymentAmount?: string;
    reservationStatus?: ReservationStatus;
    paidAt?: Date | null;
  }> = {},
): MockState {
  const token = options.token ?? VALID_TOKEN;
  const requestStatus = options.requestStatus ?? GuestPaymentRequestStatus.PENDING;
  const chargeAmounts = options.chargeAmounts ?? ["12.50", "17.50"];
  const chargeStatus = options.chargeStatus ?? AdditionalChargeStatus.PENDING;
  const totalAmount =
    options.totalAmount ??
    chargeAmounts
      .reduce((total, value) => total.add(value), new Prisma.Decimal(0))
      .toFixed(2);
  const paymentStatus = options.paymentStatus ?? null;
  const expiresAt =
    options.expiresAt ?? new Date(BASE_NOW.getTime() + 7 * 24 * 60 * 60 * 1_000);
  const paidAt =
    options.paidAt === undefined
      ? requestStatus === GuestPaymentRequestStatus.PAID
        ? new Date("2026-09-12T12:00:00.000Z")
        : null
      : options.paidAt;
  const charges = chargeAmounts.map((amount, index) => ({
    id: `charge-${index + 1}`,
    reservationId: "reservation-final-d4",
    category: index === 0 ? "TRANSPORT" : "CLEANING",
    description: index === 0 ? "Airport pickup" : "Extra cleaning",
    amount: money(amount),
    currency: "USD",
    status: requestStatus === GuestPaymentRequestStatus.PAID
      ? AdditionalChargeStatus.PAID
      : chargeStatus,
  })) satisfies MockAdditionalCharge[];

  return {
    reservations: [
      {
        id: "reservation-final-d4",
        status: options.reservationStatus ?? ReservationStatus.CONFIRMED,
        guestName: "Final D Guest",
        guestEmail: TEST_GUEST_EMAIL,
        guestPhone: "+50255550101",
        guestCountry: "GT",
        preferredLocale: "es",
        checkInDate: new Date("2026-10-01T00:00:00.000Z"),
        checkOutDate: new Date("2026-10-04T00:00:00.000Z"),
        total: money("390.00"),
        pricingSnapshot: { version: "FINAL_C_V1", total: "390.00" },
        property: {
          nameEs: "Bungalow Lago",
          nameEn: "Lake Bungalow",
        },
      },
    ],
    additionalCharges: charges,
    guestPaymentRequests: [
      {
        id: "request-final-d4",
        reservationId: "reservation-final-d4",
        status: requestStatus,
        totalAmount: money(totalAmount),
        currency: "USD",
        accessTokenHash: requestTokenHash(token),
        accessTokenEncrypted: "encrypted-final-d4-token",
        expiresAt,
        createdByAdminId: "admin-final-d4",
        paidAt,
        cancelledAt:
          requestStatus === GuestPaymentRequestStatus.CANCELLED
            ? new Date("2026-09-11T11:00:00.000Z")
            : null,
        createdAt: new Date("2026-09-11T10:00:00.000Z"),
        updatedAt: new Date("2026-09-11T10:00:00.000Z"),
      },
    ],
    guestPaymentRequestItems: charges.map((charge, index) => ({
      id: `item-${index + 1}`,
      paymentRequestId: "request-final-d4",
      additionalChargeId: charge.id,
      categorySnapshot: charge.category,
      descriptionSnapshot: charge.description,
      amountSnapshot: money(charge.amount.toFixed(2)),
      currencySnapshot: "USD",
      createdAt: new Date(BASE_NOW.getTime() + index * 1_000),
    })),
    payments:
      paymentStatus === null
        ? []
        : [
            {
              id: "payment-existing",
              reservationId: "reservation-final-d4",
              guestPaymentRequestId: "request-final-d4",
              provider: PaymentProvider.TILOPAY,
              purpose: PaymentPurpose.ADDITIONAL_CHARGE,
              status: paymentStatus,
              amount: money(options.paymentAmount ?? totalAmount),
              currency: "USD",
              providerReference: "TRP-D4-EXISTING",
              providerTransactionId:
                paymentStatus === PaymentStatus.APPROVED
                  ? "transaction-existing"
                  : null,
              paidAt,
              failedAt:
                paymentStatus === PaymentStatus.REJECTED ||
                paymentStatus === PaymentStatus.FAILED
                  ? new Date("2026-09-11T11:30:00.000Z")
                  : null,
              rawPayload: null,
              createdAt: new Date("2026-09-11T10:15:00.000Z"),
              updatedAt: new Date("2026-09-11T10:15:00.000Z"),
            },
          ],
    paymentSubmissionAttempts: [],
    lifecycleRequests: [
      {
        id: "lifecycle-final-d4",
        reservationId: "reservation-final-d4",
        status: "APPROVED",
        completedAt: null,
      },
    ],
    lifecycleHolds: [
      {
        id: "hold-final-d4",
        lifecycleRequestId: "lifecycle-final-d4",
        status: "ACTIVE",
        expiresAt: new Date("2026-09-11T13:00:00.000Z"),
      },
    ],
    auditLogs: [],
    clientEvents: [],
    nextPaymentSequence: 1,
    nextAttemptSequence: 1,
  };
}

function compareDate(
  actual: Date,
  expected: Record<string, unknown> | undefined,
): boolean {
  if (!expected) {
    return true;
  }

  const lte = expected.lte;
  const gt = expected.gt;

  if (lte instanceof Date && actual.getTime() > lte.getTime()) {
    return false;
  }

  if (gt instanceof Date && actual.getTime() <= gt.getTime()) {
    return false;
  }

  return true;
}

function maybeString(value: unknown): string | undefined {
  return typeof value === "string" ? value : undefined;
}

function whereIdIn(value: unknown): readonly string[] | null {
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

function requestItemsFor(
  state: MockState,
  paymentRequestId: string,
): Array<MockGuestPaymentRequestItem & { additionalCharge: MockAdditionalCharge }> {
  return state.guestPaymentRequestItems
    .filter((item) => item.paymentRequestId === paymentRequestId)
    .sort((first, second) => first.createdAt.getTime() - second.createdAt.getTime())
    .map((item) => {
      const additionalCharge = state.additionalCharges.find(
        (charge) => charge.id === item.additionalChargeId,
      );

      if (!additionalCharge) {
        throw new Error("Missing additional charge fixture");
      }

      return {
        ...item,
        additionalCharge,
      };
    });
}

function paymentForRequest(
  state: MockState,
  requestId: string,
): MockPayment | null {
  return (
    state.payments.find((payment) => payment.guestPaymentRequestId === requestId) ??
    null
  );
}

function enrichRequest(
  state: MockState,
  request: MockGuestPaymentRequest,
): unknown {
  const reservation = state.reservations.find(
    (candidate) => candidate.id === request.reservationId,
  );

  if (!reservation) {
    throw new Error("Missing reservation fixture");
  }

  return {
    ...request,
    reservation,
    items: requestItemsFor(state, request.id),
    payment: paymentForRequest(state, request.id),
  };
}

function enrichPayment(state: MockState, payment: MockPayment): unknown {
  const reservation = state.reservations.find(
    (candidate) => candidate.id === payment.reservationId,
  );
  const guestPaymentRequest = payment.guestPaymentRequestId
    ? state.guestPaymentRequests.find(
        (request) => request.id === payment.guestPaymentRequestId,
      )
    : null;

  if (!reservation) {
    throw new Error("Missing payment reservation fixture");
  }

  return {
    ...payment,
    reservation,
    guestPaymentRequest: guestPaymentRequest
      ? {
          ...guestPaymentRequest,
          items: requestItemsFor(state, guestPaymentRequest.id),
        }
      : null,
  };
}

function matchesPaymentWhere(
  payment: MockPayment,
  where: Record<string, unknown>,
): boolean {
  if (maybeString(where.id) && payment.id !== where.id) {
    return false;
  }

  if (where.provider && payment.provider !== where.provider) {
    return false;
  }

  if (maybeString(where.reservationId) && payment.reservationId !== where.reservationId) {
    return false;
  }

  const providerReference = where.providerReference;

  if (
    typeof providerReference === "object" &&
    providerReference !== null &&
    "in" in providerReference
  ) {
    const references = (providerReference as { in?: unknown }).in;

    if (
      !Array.isArray(references) ||
      !payment.providerReference ||
      !references.includes(payment.providerReference)
    ) {
      return false;
    }
  }

  return true;
}

function matchesAttemptWhere(
  attempt: MockPaymentSubmissionAttempt,
  where: Record<string, unknown>,
): boolean {
  if (maybeString(where.id) && attempt.id !== where.id) {
    return false;
  }

  if (maybeString(where.paymentId) && attempt.paymentId !== where.paymentId) {
    return false;
  }

  if (
    maybeString(where.reservationId) &&
    attempt.reservationId !== where.reservationId
  ) {
    return false;
  }

  const status = where.status;

  if (
    typeof status === "object" &&
    status !== null &&
    "in" in status &&
    Array.isArray((status as { in?: unknown }).in)
  ) {
    return (status as { in: PaymentSubmissionStatus[] }).in.includes(
      attempt.status,
    );
  }

  return true;
}

function sortAttemptsDescending(
  attempts: readonly MockPaymentSubmissionAttempt[],
): MockPaymentSubmissionAttempt[] {
  return [...attempts].sort((first, second) => {
    if (second.attemptNumber !== first.attemptNumber) {
      return second.attemptNumber - first.attemptNumber;
    }

    return second.id.localeCompare(first.id);
  });
}

function createMockPrisma(store: MockStore): MockPrismaShape {
  const client = {
    async $transaction<T>(
      operation: (transaction: MockPrismaShape) => Promise<T>,
    ): Promise<T> {
      const before = cloneState(store.current);

      try {
        return await operation(client);
      } catch (error) {
        store.current = before;
        throw error;
      }
    },
    async $executeRaw(
      _strings: TemplateStringsArray,
      ...values: readonly unknown[]
    ): Promise<number> {
      store.current.clientEvents.push({
        paymentId: String(values[1]),
        reservationId: String(values[2]),
        values,
      });
      return 1;
    },
    guestPaymentRequest: {
      async findUnique(args: { where: Record<string, unknown> }): Promise<unknown> {
        const request = maybeString(args.where.accessTokenHash)
          ? store.current.guestPaymentRequests.find(
              (candidate) =>
                candidate.accessTokenHash === args.where.accessTokenHash,
            )
          : store.current.guestPaymentRequests.find(
              (candidate) => candidate.id === args.where.id,
            );

        return request ? enrichRequest(store.current, request) : null;
      },
      async updateMany(args: {
        where: Record<string, unknown>;
        data: Record<string, unknown>;
      }): Promise<{ count: number }> {
        let count = 0;

        for (const request of store.current.guestPaymentRequests) {
          if (
            maybeString(args.where.id) &&
            request.id !== args.where.id
          ) {
            continue;
          }

          if (
            maybeString(args.where.accessTokenHash) &&
            request.accessTokenHash !== args.where.accessTokenHash
          ) {
            continue;
          }

          if (
            args.where.status &&
            request.status !== args.where.status
          ) {
            continue;
          }

          if (
            !compareDate(
              request.expiresAt,
              args.where.expiresAt as Record<string, unknown> | undefined,
            )
          ) {
            continue;
          }

          if (args.data.status) {
            request.status = args.data.status as GuestPaymentRequestStatus;
          }

          if (args.data.paidAt instanceof Date) {
            request.paidAt = args.data.paidAt;
          }

          count += 1;
        }

        return { count };
      },
    },
    payment: {
      async create(args: { data: Record<string, unknown> }): Promise<unknown> {
        const payment: MockPayment = {
          id: `payment-created-${store.current.nextPaymentSequence}`,
          reservationId: String(args.data.reservationId),
          guestPaymentRequestId: String(args.data.guestPaymentRequestId),
          provider: args.data.provider as PaymentProvider,
          purpose: args.data.purpose as PaymentPurpose,
          status: args.data.status as PaymentStatus,
          amount: args.data.amount as Prisma.Decimal,
          currency: String(args.data.currency),
          providerReference: null,
          providerTransactionId: null,
          paidAt: null,
          failedAt: null,
          rawPayload: null,
          createdAt: BASE_NOW,
          updatedAt: BASE_NOW,
        };

        store.current.nextPaymentSequence += 1;
        store.current.payments.push(payment);

        return enrichPayment(store.current, payment);
      },
      async findUnique(args: { where: Record<string, unknown> }): Promise<unknown> {
        const payment = store.current.payments.find(
          (candidate) => candidate.id === args.where.id,
        );

        return payment ? enrichPayment(store.current, payment) : null;
      },
      async findFirst(args: { where: Record<string, unknown> }): Promise<unknown> {
        const payment = store.current.payments.find((candidate) =>
          matchesPaymentWhere(candidate, args.where),
        );

        return payment ? enrichPayment(store.current, payment) : null;
      },
      async update(args: {
        where: Record<string, unknown>;
        data: Record<string, unknown>;
      }): Promise<unknown> {
        const payment = store.current.payments.find(
          (candidate) => candidate.id === args.where.id,
        );

        if (!payment) {
          throw new Error("Payment fixture not found");
        }

        Object.assign(payment, {
          ...args.data,
          amount: args.data.amount instanceof Prisma.Decimal
            ? args.data.amount
            : payment.amount,
        });

        return enrichPayment(store.current, payment);
      },
    },
    additionalCharge: {
      async updateMany(args: {
        where: Record<string, unknown>;
        data: Record<string, unknown>;
      }): Promise<{ count: number }> {
        let count = 0;
        const ids = whereIdIn(args.where.id);

        for (const charge of store.current.additionalCharges) {
          if (ids && !ids.includes(charge.id)) {
            continue;
          }

          if (
            maybeString(args.where.reservationId) &&
            charge.reservationId !== args.where.reservationId
          ) {
            continue;
          }

          if (args.where.status && charge.status !== args.where.status) {
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
      async create(args: { data: Record<string, unknown> }): Promise<unknown> {
        store.current.auditLogs.push({
          action: String(args.data.action),
          entityType: String(args.data.entityType),
          entityId: maybeString(args.data.entityId) ?? null,
          metadata: (args.data.metadata ?? null) as Prisma.InputJsonValue | null,
        });

        return store.current.auditLogs.at(-1) ?? null;
      },
    },
    paymentSubmissionAttempt: {
      async findFirst(args: {
        where: Record<string, unknown>;
        orderBy?: unknown;
      }): Promise<unknown> {
        const attempt = sortAttemptsDescending(
          store.current.paymentSubmissionAttempts.filter((candidate) =>
            matchesAttemptWhere(candidate, args.where),
          ),
        )[0];

        return attempt ?? null;
      },
      async create(args: { data: Record<string, unknown> }): Promise<unknown> {
        const attempt: MockPaymentSubmissionAttempt = {
          id: `attempt-${store.current.nextAttemptSequence}`,
          paymentId: String(args.data.paymentId),
          reservationId: String(args.data.reservationId),
          attemptNumber: Number(args.data.attemptNumber),
          source: args.data.source as PaymentSubmissionSource,
          status: args.data.status as PaymentSubmissionStatus,
          environment: String(args.data.environment),
          locale: String(args.data.locale),
          safeResultCode: null,
          preflightExpiresAt:
            args.data.preflightExpiresAt instanceof Date
              ? args.data.preflightExpiresAt
              : null,
          startedAt:
            args.data.startedAt instanceof Date ? args.data.startedAt : BASE_NOW,
          submittedAt:
            args.data.submittedAt instanceof Date
              ? args.data.submittedAt
              : null,
          completedAt: null,
          createdAt: BASE_NOW,
          updatedAt: BASE_NOW,
        };

        store.current.nextAttemptSequence += 1;
        store.current.paymentSubmissionAttempts.push(attempt);

        return attempt;
      },
      async update(args: {
        where: Record<string, unknown>;
        data: Record<string, unknown>;
      }): Promise<unknown> {
        const attempt = store.current.paymentSubmissionAttempts.find(
          (candidate) => candidate.id === args.where.id,
        );

        if (!attempt) {
          throw new Error("Payment submission attempt fixture not found");
        }

        Object.assign(attempt, args.data);
        return attempt;
      },
      async updateMany(args: {
        where: Record<string, unknown>;
        data: Record<string, unknown>;
      }): Promise<{ count: number }> {
        let count = 0;

        for (const attempt of store.current.paymentSubmissionAttempts) {
          if (!matchesAttemptWhere(attempt, args.where)) {
            continue;
          }

          Object.assign(attempt, args.data);
          count += 1;
        }

        return { count };
      },
    },
  } satisfies MockPrismaShape;

  return client;
}

function installMockPrisma(state: MockState): MockStore {
  const store = { current: state };
  const mockClient = createMockPrisma(store);
  const target = prisma as unknown as MockPrismaShape;

  Object.assign(target, mockClient);

  return store;
}

async function d4Modules(): Promise<D4Modules> {
  modulesPromise ??= Promise.all([
    import("@/lib/payments/guest-payment-request-payment"),
    import("@/lib/payments/payment-submission-attempts"),
    import("@/lib/payments/tilopay-sdk-client-events"),
    import("@/lib/payments/tilopay-payment-result"),
    import("@/lib/payments/tilopay-sdk-session"),
    import("@/app/api/payments/tilopay/sdk-session/route"),
  ]).then(([payments, attempts, clientEvents, result, sdkSession, sdkSessionRoute]) => ({
    payments,
    attempts,
    clientEvents,
    result,
    sdkSession,
    sdkSessionRoute,
  }));

  return modulesPromise;
}

function assertRequestError(
  error: unknown,
  expectedCode:
    | "INVALID_GUEST_PAYMENT_REQUEST"
    | "GUEST_PAYMENT_REQUEST_EXPIRED"
    | "GUEST_PAYMENT_REQUEST_NOT_PAYABLE"
    | "GUEST_PAYMENT_REQUEST_PAYMENT_MISMATCH",
): boolean {
  return (
    error instanceof Error &&
    error.name === "GuestPaymentRequestPaymentError" &&
    "code" in error &&
    error.code === expectedCode
  );
}

function assertSdkSessionError(
  error: unknown,
  expectedCode:
    | "TILOPAY_SDK_TOKEN_UNAVAILABLE"
    | "GUEST_PAYMENT_REQUEST_PAYMENT_MISMATCH",
): boolean {
  return (
    error instanceof Error &&
    error.name === "TilopaySdkSessionError" &&
    "code" in error &&
    error.code === expectedCode
  );
}

function assertNoRawTokenStored(state: MockState, token = VALID_TOKEN): void {
  const persisted = JSON.stringify(state);

  assert.equal(
    persisted.includes(token),
    false,
    "raw guest-payment token must not be present in mocked persistence",
  );
}

function assertNoTokenPrefixStored(state: MockState, token = VALID_TOKEN): void {
  const persisted = JSON.stringify(state);

  assert.equal(
    persisted.includes(token.slice(0, 16)),
    false,
    "guest-payment token prefixes must not be present in mocked persistence",
  );
}

function latestClientEventValues(state: MockState): readonly unknown[] {
  const event = state.clientEvents.at(-1);

  assert.ok(event, "expected a captured payment_client_events write");

  return event.values;
}

function preserveTilopayEnv(): () => void {
  const keys = [
    "TRP_ENVIRONMENT",
    "DATABASE_URL",
    "DIRECT_URL",
    "AUTH_SECRET",
    "AUTH_TRUST_HOST",
    "AUTH_GOOGLE_ID",
    "AUTH_GOOGLE_SECRET",
    "AUTH_ALLOWED_ADMIN_EMAILS",
    "EXTERNAL_CALENDAR_ENCRYPTION_KEY",
    "CLOUDINARY_CLOUD_NAME",
    "CLOUDINARY_API_KEY",
    "CLOUDINARY_API_SECRET",
    "CLOUDINARY_UPLOAD_FOLDER",
    "TILOPAY_ENVIRONMENT",
    "TILOPAY_API_KEY",
    "TILOPAY_API_USER",
    "TILOPAY_API_PASSWORD",
    "TILOPAY_REDIRECT_URL",
    "TILOPAY_SUCCESS_URL",
    "TILOPAY_CANCEL_URL",
    "TILOPAY_ERROR_URL",
    "TILOPAY_WEBHOOK_URL",
    "EMAIL_DELIVERY_MODE",
    "VERCEL_ENV",
  ] as const;
  const previous = new Map<string, string | undefined>();

  for (const key of keys) {
    previous.set(key, process.env[key]);
  }

  process.env.TRP_ENVIRONMENT = "local";
  process.env.DATABASE_URL =
    "postgresql://user:password@localhost:5432/trp_booking?schema=trp_booking";
  process.env.DIRECT_URL =
    "postgresql://user:password@localhost:5432/trp_booking?schema=trp_booking";
  process.env.AUTH_SECRET = "final-d4-test-auth-secret-at-least-32-chars";
  process.env.AUTH_TRUST_HOST = "true";
  process.env.AUTH_GOOGLE_ID = "final-d4-google-id";
  process.env.AUTH_GOOGLE_SECRET = "final-d4-google-secret";
  process.env.AUTH_ALLOWED_ADMIN_EMAILS = "admin@juantzun.dev";
  process.env.EXTERNAL_CALENDAR_ENCRYPTION_KEY =
    Buffer.alloc(32, 7).toString("base64");
  process.env.CLOUDINARY_CLOUD_NAME = "trpbookingtest";
  process.env.CLOUDINARY_API_KEY = "123456789012345";
  process.env.CLOUDINARY_API_SECRET = "final-d4-cloudinary-secret";
  process.env.CLOUDINARY_UPLOAD_FOLDER = "trp-booking/final-d4";
  process.env.TILOPAY_ENVIRONMENT = "sandbox";
  process.env.TILOPAY_API_KEY = "final-d4-api-key";
  process.env.TILOPAY_API_USER = "final-d4-api-user";
  process.env.TILOPAY_API_PASSWORD = "final-d4-api-password";
  process.env.TILOPAY_REDIRECT_URL =
    "http://localhost:3000/api/payments/tilopay/redirect";
  process.env.TILOPAY_SUCCESS_URL =
    "http://localhost:3000/reservas/pago/exitoso";
  process.env.TILOPAY_CANCEL_URL =
    "http://localhost:3000/reservas/pago/cancelado";
  process.env.TILOPAY_ERROR_URL =
    "http://localhost:3000/reservas/pago/error";
  process.env.TILOPAY_WEBHOOK_URL =
    "http://localhost:3000/api/payments/tilopay/webhook";
  process.env.EMAIL_DELIVERY_MODE = "disabled";
  process.env.VERCEL_ENV = "development";

  return () => {
    for (const [key, value] of previous) {
      if (value === undefined) {
        delete process.env[key];
      } else {
        process.env[key] = value;
      }
    }
  };
}

function tilopayRedirectUrl(input: Readonly<{
  providerReference: string;
  responseCode: "1" | "51";
  transactionId: string;
  auth: string;
  amount: string;
  email?: string;
}>): string {
  const hashInput: TilopayOrderHashInput = {
    orderHash: "",
    orderId: input.transactionId,
    externalOrderId: input.providerReference,
    amount: input.amount,
    currency: "USD",
    responseCode: input.responseCode,
    auth: input.auth,
    email: input.email ?? TEST_GUEST_EMAIL,
  };
  const orderHash = createTilopayOrderHash(hashInput).hex;
  const url = new URL("https://example.test/api/payments/tilopay/redirect");

  url.searchParams.set("responseCode", input.responseCode);
  url.searchParams.set("orderNumber", input.providerReference);
  url.searchParams.set("orderId", input.transactionId);
  url.searchParams.set("auth", input.auth);
  url.searchParams.set("amount", input.amount);
  url.searchParams.set("currency", "USD");
  url.searchParams.set("email", input.email ?? TEST_GUEST_EMAIL);
  url.searchParams.set("OrderHash", orderHash);

  return url.toString();
}

function installTilopayFetch(input: Readonly<{
  providerReference: string;
  responseCode: "1" | "51";
  transactionId: string;
  auth: string;
  amount: string;
  email?: string;
}>): () => void {
  const originalFetch = globalThis.fetch;

  globalThis.fetch = async (resource: RequestInfo | URL) => {
    const url =
      typeof resource === "string"
        ? resource
        : resource instanceof URL
          ? resource.toString()
          : resource.url;

    if (url.endsWith("/login")) {
      return new Response(
        JSON.stringify({ access_token: "final-d4-token", token_type: "Bearer" }),
        { status: 200 },
      );
    }

    if (url.endsWith("/consult")) {
      return new Response(
        JSON.stringify({
          response: {
            responseCode: input.responseCode,
            description:
              input.responseCode === "1" ? "Approved" : "Insufficient funds",
            external_order_id: input.providerReference,
            orderId: input.transactionId,
            amount: input.amount,
            currency: "USD",
            email: input.email ?? TEST_GUEST_EMAIL,
            auth: input.auth,
          },
        }),
        { status: 200 },
      );
    }

    throw new Error(`Unexpected Tilopay mock fetch URL: ${url}`);
  };

  return () => {
    globalThis.fetch = originalFetch;
  };
}

function installTilopaySdkFetch(
  outcome:
    | "success"
    | "http-error"
    | "invalid-json"
    | "missing-access-token"
    | "network-error" = "success",
): () => void {
  const originalFetch = globalThis.fetch;

  globalThis.fetch = async (resource: RequestInfo | URL) => {
    const url =
      typeof resource === "string"
        ? resource
        : resource instanceof URL
          ? resource.toString()
          : resource.url;

    if (!url.endsWith("/loginSdk")) {
      throw new Error(`Unexpected Tilopay SDK mock fetch URL: ${url}`);
    }

    if (outcome === "network-error") {
      throw new Error("Simulated Tilopay SDK login network failure");
    }

    if (outcome === "http-error") {
      return new Response(JSON.stringify({ error: "unavailable" }), {
        status: 503,
      });
    }

    if (outcome === "invalid-json") {
      return new Response("not-json", { status: 200 });
    }

    if (outcome === "missing-access-token") {
      return new Response(JSON.stringify({ token_type: "Bearer" }), {
        status: 200,
      });
    }

    return new Response(
      JSON.stringify({
        access_token: "final-d4-sdk-access-token",
        token_type: "Bearer",
      }),
      { status: 200 },
    );
  };

  return () => {
    globalThis.fetch = originalFetch;
  };
}

function setProviderReference(
  state: MockState,
  paymentId: string,
  providerReference: string,
): void {
  const payment = state.payments.find((candidate) => candidate.id === paymentId);

  assert.ok(payment);
  payment.providerReference = providerReference;
}

function decodeReturnData(value: string): Record<string, unknown> {
  return JSON.parse(Buffer.from(value, "base64").toString("utf8")) as Record<
    string,
    unknown
  >;
}

test("D.4 behavior resolves only a valid pending unexpired token to a payable guest summary", async () => {
  const store = installMockPrisma(baseState());
  const { payments } = await d4Modules();

  const summary = await payments.getGuestPaymentRequestPaymentSummary(VALID_TOKEN);

  assert.equal(summary.requestStatus, "PENDING");
  assert.equal(summary.payable, true);
  assert.equal(summary.totalAmount, "30.00");
  assert.equal(summary.currency, "USD");
  assert.equal(summary.items.length, 2);
  assert.equal("requestId" in summary, false);
  assert.equal("reservationId" in summary, false);
  assert.equal("guestEmail" in summary, false);

  await assert.rejects(
    () => payments.getGuestPaymentRequestPaymentSummary(WRONG_TOKEN),
    (error: unknown) =>
      assertRequestError(error, "INVALID_GUEST_PAYMENT_REQUEST"),
  );
  assertNoRawTokenStored(store.current);
});

test("D.4 behavior expires overdue pending requests and blocks checkout for expired links", async () => {
  const store = installMockPrisma(
    baseState({
      expiresAt: new Date("2026-09-10T12:00:00.000Z"),
    }),
  );
  const { payments } = await d4Modules();

  const summary = await payments.getGuestPaymentRequestPaymentSummary(VALID_TOKEN);

  assert.equal(summary.requestStatus, "EXPIRED");
  assert.equal(summary.payable, false);
  assert.equal(
    store.current.guestPaymentRequests[0]?.status,
    GuestPaymentRequestStatus.EXPIRED,
  );
  await assert.rejects(
    () => payments.prepareGuestPaymentRequestPayment(VALID_TOKEN),
    (error: unknown) =>
      assertRequestError(error, "GUEST_PAYMENT_REQUEST_EXPIRED"),
  );
  assert.equal(store.current.payments.length, 0);
  assertNoRawTokenStored(store.current);
});

test("D.4 behavior does not reopen checkout for cancelled or paid requests", async () => {
  const { payments } = await d4Modules();

  for (const state of [
    baseState({ requestStatus: GuestPaymentRequestStatus.CANCELLED }),
    baseState({
      requestStatus: GuestPaymentRequestStatus.PAID,
      paymentStatus: PaymentStatus.APPROVED,
      chargeStatus: AdditionalChargeStatus.PAID,
    }),
  ]) {
    const store = installMockPrisma(state);
    const summary = await payments.getGuestPaymentRequestPaymentSummary(VALID_TOKEN);

    assert.equal(summary.payable, false);
    await assert.rejects(
      () => payments.prepareGuestPaymentRequestPayment(VALID_TOKEN),
      (error: unknown) =>
        assertRequestError(error, "GUEST_PAYMENT_REQUEST_NOT_PAYABLE"),
    );
    assertNoRawTokenStored(store.current);
  }
});

test("D.4 behavior creates exactly one immutable USD ADDITIONAL_CHARGE payment per request", async () => {
  const store = installMockPrisma(baseState());
  const { payments } = await d4Modules();

  const first = await payments.prepareGuestPaymentRequestPayment(VALID_TOKEN);
  const second = await payments.prepareGuestPaymentRequestPayment(VALID_TOKEN);
  const storedPayment = store.current.payments[0];

  assert.ok(storedPayment);
  assert.equal(first.payment.id, second.payment.id);
  assert.equal(store.current.payments.length, 1);
  assert.equal(storedPayment.purpose, PaymentPurpose.ADDITIONAL_CHARGE);
  assert.equal(storedPayment.currency, "USD");
  assert.equal(storedPayment.amount.toFixed(2), "30.00");
  assert.equal(storedPayment.guestPaymentRequestId, "request-final-d4");
  assert.equal(storedPayment.reservationId, "reservation-final-d4");
  assertNoRawTokenStored(store.current);
});

test("D.4 behavior creates an ADDITIONAL_CHARGE Tilopay SDK session without returning the raw request token", async () => {
  const restoreEnv = preserveTilopayEnv();
  const restoreFetch = installTilopaySdkFetch("success");
  const store = installMockPrisma(baseState());
  const { sdkSession } = await d4Modules();

  try {
    const session = await sdkSession.createTilopaySdkSession({
      reservationId: VALID_TOKEN,
      locale: "es",
    });
    const storedPayment = store.current.payments[0];
    const returnData = decodeReturnData(session.initConfig.returnData);

    assert.ok(storedPayment);
    assert.equal(store.current.payments.length, 1);
    assert.equal(storedPayment.purpose, PaymentPurpose.ADDITIONAL_CHARGE);
    assert.equal(storedPayment.currency, "USD");
    assert.equal(storedPayment.amount.toFixed(2), "30.00");
    assert.equal(storedPayment.guestPaymentRequestId, "request-final-d4");
    assert.equal(storedPayment.providerReference, session.providerReference);
    assert.equal(session.paymentId, storedPayment.id);
    assert.equal(session.reservationId, "guest-payment-request");
    assert.equal(session.phaseBoundary, "ADDITIONAL_CHARGE_CHECKOUT_READY");
    assert.equal(session.existingPaymentAttempt, false);
    assert.equal(session.amount.amount, "30.00");
    assert.equal(session.amount.amountCents, 3000);
    assert.equal(session.currency, "USD");
    assert.equal(session.initConfig.token, "final-d4-sdk-access-token");
    assert.equal(session.initConfig.orderNumber, session.providerReference);
    assert.equal(returnData.paymentId, session.paymentId);
    assert.equal(returnData.orderNumber, session.providerReference);
    assert.equal(returnData.reservationId, "guest-payment-request");
    assert.equal(JSON.stringify(session).includes(VALID_TOKEN), false);
    assertNoRawTokenStored(store.current);
  } finally {
    restoreFetch();
    restoreEnv();
  }
});

test("D.4 behavior reuses an existing ADDITIONAL_CHARGE Payment for the Tilopay SDK session", async () => {
  const restoreEnv = preserveTilopayEnv();
  const restoreFetch = installTilopaySdkFetch("success");
  const store = installMockPrisma(
    baseState({ paymentStatus: PaymentStatus.PENDING }),
  );
  const { sdkSession } = await d4Modules();

  try {
    const session = await sdkSession.createTilopaySdkSession({
      reservationId: VALID_TOKEN,
      locale: "en",
    });

    assert.equal(store.current.payments.length, 1);
    assert.equal(session.paymentId, "payment-existing");
    assert.equal(session.providerReference, "TRP-D4-EXISTING");
    assert.equal(session.existingPaymentAttempt, true);
    assert.equal(session.amount.amount, "30.00");
    assert.equal(session.currency, "USD");
    assert.equal(session.initConfig.language, "en");
    assert.equal(session.initConfig.returnData.includes(VALID_TOKEN), false);
    assertNoRawTokenStored(store.current);
  } finally {
    restoreFetch();
    restoreEnv();
  }
});

test("D.4 behavior maps Tilopay SDK provider login failures to a typed unavailable error", async () => {
  const restoreEnv = preserveTilopayEnv();
  const { sdkSession } = await d4Modules();

  try {
    for (const outcome of [
      "network-error",
      "http-error",
      "invalid-json",
      "missing-access-token",
    ] as const) {
      const restoreFetch = installTilopaySdkFetch(outcome);
      const store = installMockPrisma(baseState());

      try {
        await assert.rejects(
          () =>
            sdkSession.createTilopaySdkSession({
              reservationId: VALID_TOKEN,
              locale: "es",
            }),
          (error: unknown) =>
            assertSdkSessionError(error, "TILOPAY_SDK_TOKEN_UNAVAILABLE"),
        );
        assert.equal(store.current.payments.length, 1);
        assertNoRawTokenStored(store.current);
      } finally {
        restoreFetch();
      }
    }
  } finally {
    restoreEnv();
  }
});

test("D.4 behavior returns the expected SDK-session API status for known Tilopay token failures", async () => {
  const restoreEnv = preserveTilopayEnv();
  const restoreFetch = installTilopaySdkFetch("invalid-json");
  const store = installMockPrisma(baseState());
  const { sdkSessionRoute } = await d4Modules();

  try {
    const response = await sdkSessionRoute.POST(
      new Request("https://example.test/api/payments/tilopay/sdk-session", {
        body: JSON.stringify({
          reservationId: VALID_TOKEN,
          locale: "es",
        }),
        method: "POST",
      }),
    );
    const payload = (await response.json()) as {
      error?: { code?: string; message?: string };
    };

    assert.equal(response.status, 502);
    assert.equal(payload.error?.code, "TILOPAY_SDK_TOKEN_UNAVAILABLE");
    assert.notEqual(payload.error?.code, "TILOPAY_SDK_SESSION_UNEXPECTED_ERROR");
    assert.equal(store.current.payments.length, 1);
    assertNoRawTokenStored(store.current);
  } finally {
    restoreFetch();
    restoreEnv();
  }
});

test("D.4 behavior keeps rejected provider outcomes pending and retryable with audit history", async () => {
  const restoreEnv = preserveTilopayEnv();
  const providerReference = "TRP-D4-REJECTED";
  const providerInput = {
    providerReference,
    responseCode: "51" as const,
    transactionId: "transaction-rejected",
    auth: "AUTH-REJECTED",
    amount: "30.00",
  };
  const restoreFetch = installTilopayFetch(providerInput);
  const store = installMockPrisma(baseState());
  const { attempts, payments, result } = await d4Modules();

  try {
    const prepared = await payments.prepareGuestPaymentRequestPayment(VALID_TOKEN);
    setProviderReference(store.current, prepared.payment.id, providerReference);

    const attempt = await attempts.createPaymentSubmissionAttempt({
      paymentId: prepared.payment.id,
      reservationReference: VALID_TOKEN,
      source: PaymentSubmissionSource.ADDITIONAL_CHARGE,
      environment: "local",
      locale: "es",
      preflightExpiresAt: prepared.expiresAt,
    });
    const processed = await result.processTilopayPaymentRedirect(
      tilopayRedirectUrl(providerInput),
    );

    await attempts.finalizePaymentSubmissionAttempt({
      paymentId: processed.paymentId,
      status: processed.paymentStatus,
      safeResultCode: "TILOPAY_INSUFFICIENT_FUNDS",
    });

    assert.equal(attempt.reservationId, "reservation-final-d4");
    assert.equal(attempt.source, PaymentSubmissionSource.ADDITIONAL_CHARGE);
    assert.equal(processed.paymentStatus, "REJECTED");
    assert.equal(processed.phaseBoundary, "ADDITIONAL_CHARGE_PAYMENT_REQUEST_PENDING");
    assert.equal(
      store.current.guestPaymentRequests[0]?.status,
      GuestPaymentRequestStatus.PENDING,
    );
    assert.deepEqual(
      store.current.additionalCharges.map((charge) => charge.status),
      [AdditionalChargeStatus.PENDING, AdditionalChargeStatus.PENDING],
    );
    assert.equal(store.current.paymentSubmissionAttempts.length, 1);
    assert.equal(
      store.current.paymentSubmissionAttempts[0]?.status,
      PaymentSubmissionStatus.REJECTED,
    );
    assert.equal(
      store.current.paymentSubmissionAttempts[0]?.safeResultCode,
      "TILOPAY_INSUFFICIENT_FUNDS",
    );

    const retry = await payments.prepareGuestPaymentRequestPayment(VALID_TOKEN);

    assert.equal(retry.payment.id, prepared.payment.id);
    assert.equal(store.current.payments.length, 1);
    assert.equal(store.current.payments[0]?.status, PaymentStatus.PENDING);
    assertNoRawTokenStored(store.current);
  } finally {
    restoreFetch();
    restoreEnv();
  }
});

test("D.4 behavior keeps failed SDK outcomes pending and records client events without raw tokens", async () => {
  const store = installMockPrisma(baseState());
  const { attempts, clientEvents, payments } = await d4Modules();
  const prepared = await payments.prepareGuestPaymentRequestPayment(VALID_TOKEN);

  await attempts.createPaymentSubmissionAttempt({
    paymentId: prepared.payment.id,
    reservationReference: VALID_TOKEN,
    source: PaymentSubmissionSource.ADDITIONAL_CHARGE,
    environment: "sandbox",
    locale: "es",
    preflightExpiresAt: prepared.expiresAt,
  });
  await clientEvents.recordTilopaySdkClientEvent({
    paymentId: prepared.payment.id,
    reservationId: VALID_TOKEN,
    eventType: "TILOPAY_SDK_START_PAYMENT_FAILED",
    environment: "sandbox",
    locale: "es",
    paymentMethodId: "card",
    paymentMethodName: "Card",
    paymentMethodType: "card",
    detectedCardBrand: "visa",
    sdkMessage: "Please enter a valid card number",
    sdkPayload: {
      rawTokenCandidate: VALID_TOKEN,
      cardNumber: "4111111111111111",
      safeDiagnostic: `sdk failed for ${VALID_TOKEN}`,
    },
    preflightStatus: "READY_FOR_PAYMENT",
    preflightExpiresAt: prepared.expiresAt,
  });

  assert.equal(
    store.current.guestPaymentRequests[0]?.status,
    GuestPaymentRequestStatus.PENDING,
  );
  assert.deepEqual(
    store.current.additionalCharges.map((charge) => charge.status),
    [AdditionalChargeStatus.PENDING, AdditionalChargeStatus.PENDING],
  );
  assert.equal(
    store.current.paymentSubmissionAttempts[0]?.status,
    PaymentSubmissionStatus.FAILED,
  );
  assert.equal(store.current.clientEvents[0]?.reservationId, "reservation-final-d4");
  assertNoRawTokenStored(store.current);
});

test("D.4 behavior drops guest-payment tokens from SDK event text diagnostics", async () => {
  const store = installMockPrisma(baseState());
  const { attempts, clientEvents, payments } = await d4Modules();
  const prepared = await payments.prepareGuestPaymentRequestPayment(VALID_TOKEN);
  const tokenCrossingShortTextBoundary = `${"x".repeat(154)}${VALID_TOKEN}`;
  const tokenCrossingMessageBoundary = `${"x".repeat(984)}${VALID_TOKEN}`;
  const tokenCrossingPayloadBoundary = `${"x".repeat(484)}${VALID_TOKEN}`;

  await attempts.createPaymentSubmissionAttempt({
    paymentId: prepared.payment.id,
    reservationReference: VALID_TOKEN,
    source: PaymentSubmissionSource.ADDITIONAL_CHARGE,
    environment: "sandbox",
    locale: "es",
    preflightExpiresAt: prepared.expiresAt,
  });
  await clientEvents.recordTilopaySdkClientEvent({
    paymentId: prepared.payment.id,
    reservationId: VALID_TOKEN,
    eventType: "TILOPAY_SDK_START_PAYMENT_FAILED",
    environment: "sandbox",
    locale: "es",
    paymentMethodId: `pm-${VALID_TOKEN}`,
    paymentMethodName: `Card ${VALID_TOKEN}`,
    paymentMethodType: `type-${VALID_TOKEN}`,
    detectedCardBrand: `brand-${VALID_TOKEN}`,
    sdkMessage: tokenCrossingMessageBoundary,
    sdkPayload: {
      safeLookingDiagnostic: tokenCrossingPayloadBoundary,
    },
    preflightStatus: tokenCrossingShortTextBoundary,
    preflightExpiresAt: prepared.expiresAt,
  });

  const values = latestClientEventValues(store.current);

  assert.equal(values[CLIENT_EVENT_VALUE_INDEX.paymentMethodId], null);
  assert.equal(values[CLIENT_EVENT_VALUE_INDEX.paymentMethodName], null);
  assert.equal(values[CLIENT_EVENT_VALUE_INDEX.paymentMethodType], null);
  assert.equal(values[CLIENT_EVENT_VALUE_INDEX.detectedCardBrand], null);
  assert.equal(values[CLIENT_EVENT_VALUE_INDEX.sdkMessage], null);
  assert.equal(values[CLIENT_EVENT_VALUE_INDEX.preflightStatus], null);
  assert.equal(store.current.clientEvents[0]?.reservationId, "reservation-final-d4");
  assertNoRawTokenStored(store.current);
  assertNoTokenPrefixStored(store.current);
});

test("D.4 behavior drops guest-payment tokens from direct string SDK payloads", async () => {
  const store = installMockPrisma(baseState());
  const { attempts, clientEvents, payments } = await d4Modules();
  const prepared = await payments.prepareGuestPaymentRequestPayment(VALID_TOKEN);
  const tokenCrossingPayloadBoundary = `${"x".repeat(984)}${VALID_TOKEN}`;

  await attempts.createPaymentSubmissionAttempt({
    paymentId: prepared.payment.id,
    reservationReference: VALID_TOKEN,
    source: PaymentSubmissionSource.ADDITIONAL_CHARGE,
    environment: "sandbox",
    locale: "es",
    preflightExpiresAt: prepared.expiresAt,
  });
  await clientEvents.recordTilopaySdkClientEvent({
    paymentId: prepared.payment.id,
    reservationId: VALID_TOKEN,
    eventType: "TILOPAY_SDK_START_PAYMENT_NON_SUCCESS",
    environment: "sandbox",
    locale: "es",
    paymentMethodId: "card",
    paymentMethodName: "Card",
    paymentMethodType: "card",
    detectedCardBrand: "visa",
    sdkMessage: "SDK returned a non-success status",
    sdkPayload: tokenCrossingPayloadBoundary,
    preflightStatus: "READY_FOR_PAYMENT",
    preflightExpiresAt: prepared.expiresAt,
  });

  assert.equal(store.current.clientEvents[0]?.reservationId, "reservation-final-d4");
  assertNoRawTokenStored(store.current);
  assertNoTokenPrefixStored(store.current);
});

test("D.4 behavior drops guest-payment tokens from Error SDK payload diagnostics", async () => {
  const store = installMockPrisma(baseState());
  const { attempts, clientEvents, payments } = await d4Modules();
  const prepared = await payments.prepareGuestPaymentRequestPayment(VALID_TOKEN);
  const tokenCrossingMessageBoundary = `${"x".repeat(984)}${VALID_TOKEN}`;
  const sdkError = new Error(tokenCrossingMessageBoundary);

  sdkError.name = `TokenizedError-${VALID_TOKEN}`;

  await attempts.createPaymentSubmissionAttempt({
    paymentId: prepared.payment.id,
    reservationReference: VALID_TOKEN,
    source: PaymentSubmissionSource.ADDITIONAL_CHARGE,
    environment: "sandbox",
    locale: "es",
    preflightExpiresAt: prepared.expiresAt,
  });
  await clientEvents.recordTilopaySdkClientEvent({
    paymentId: prepared.payment.id,
    reservationId: VALID_TOKEN,
    eventType: "TILOPAY_SDK_START_PAYMENT_FAILED",
    environment: "sandbox",
    locale: "es",
    paymentMethodId: "card",
    paymentMethodName: "Card",
    paymentMethodType: "card",
    detectedCardBrand: "visa",
    sdkMessage: "SDK error received",
    sdkPayload: sdkError,
    preflightStatus: "READY_FOR_PAYMENT",
    preflightExpiresAt: prepared.expiresAt,
  });

  assert.equal(store.current.clientEvents[0]?.reservationId, "reservation-final-d4");
  assertNoRawTokenStored(store.current);
  assertNoTokenPrefixStored(store.current);
});

test("D.4 behavior applies approved provider evidence without mutating stay or lifecycle state and is idempotent", async () => {
  const restoreEnv = preserveTilopayEnv();
  const providerReference = "TRP-D4-APPROVED";
  const providerInput = {
    providerReference,
    responseCode: "1" as const,
    transactionId: "transaction-approved",
    auth: "AUTH-APPROVED",
    amount: "30.00",
  };
  const restoreFetch = installTilopayFetch(providerInput);
  const store = installMockPrisma(baseState());
  const { payments, result } = await d4Modules();

  try {
    const prepared = await payments.prepareGuestPaymentRequestPayment(VALID_TOKEN);
    const beforeReservation = cloneState(store.current).reservations[0];
    const beforeLifecycleRequests = cloneState(store.current).lifecycleRequests;
    const beforeLifecycleHolds = cloneState(store.current).lifecycleHolds;

    setProviderReference(store.current, prepared.payment.id, providerReference);

    const processed = await result.processTilopayPaymentRedirect(
      tilopayRedirectUrl(providerInput),
    );
    const auditCountAfterFirstApproval = store.current.auditLogs.length;
    const replay = await result.processTilopayPaymentRedirect(
      tilopayRedirectUrl(providerInput),
    );
    const reservation = store.current.reservations[0];
    const payment = store.current.payments[0];
    const request = store.current.guestPaymentRequests[0];

    assert.ok(beforeReservation);
    assert.ok(reservation);
    assert.ok(payment);
    assert.ok(request);
    assert.equal(processed.paymentStatus, "APPROVED");
    assert.equal(processed.phaseBoundary, "ADDITIONAL_CHARGE_PAYMENT_REQUEST_PAID");
    assert.equal(replay.phaseBoundary, "ADDITIONAL_CHARGE_PAYMENT_REQUEST_PAID");
    assert.equal(payment.status, PaymentStatus.APPROVED);
    assert.equal(request.status, GuestPaymentRequestStatus.PAID);
    assert.ok(request.paidAt);
    assert.deepEqual(
      store.current.additionalCharges.map((charge) => charge.status),
      [AdditionalChargeStatus.PAID, AdditionalChargeStatus.PAID],
    );
    assert.equal(reservation.status, beforeReservation.status);
    assert.equal(reservation.total.toFixed(2), beforeReservation.total.toFixed(2));
    assert.deepEqual(reservation.pricingSnapshot, beforeReservation.pricingSnapshot);
    assert.deepEqual(store.current.lifecycleRequests, beforeLifecycleRequests);
    assert.deepEqual(store.current.lifecycleHolds, beforeLifecycleHolds);
    assert.equal(store.current.auditLogs.length, auditCountAfterFirstApproval);
    assertNoRawTokenStored(store.current);
  } finally {
    restoreFetch();
    restoreEnv();
  }
});

test("D.4 behavior rejects payment/request/charge evidence mismatches and rolls back the application", async () => {
  const store = installMockPrisma(
    baseState({
      paymentStatus: PaymentStatus.PENDING,
      paymentAmount: "29.99",
    }),
  );
  const { payments } = await d4Modules();

  await assert.rejects(
    () =>
      payments.markGuestPaymentRequestPaidFromApprovedPayment({
        paymentId: "payment-existing",
        providerTransactionId: "transaction-mismatch",
      }),
    (error: unknown) =>
      assertRequestError(error, "GUEST_PAYMENT_REQUEST_PAYMENT_MISMATCH"),
  );
  assert.equal(store.current.payments[0]?.status, PaymentStatus.PENDING);
  assert.equal(
    store.current.guestPaymentRequests[0]?.status,
    GuestPaymentRequestStatus.PENDING,
  );

  store.current.payments[0]!.amount = money("30.00");
  store.current.additionalCharges[0]!.amount = money("13.00");

  await assert.rejects(
    () =>
      payments.markGuestPaymentRequestPaidFromApprovedPayment({
        paymentId: "payment-existing",
        providerTransactionId: "transaction-charge-mismatch",
      }),
    (error: unknown) =>
      assertRequestError(error, "GUEST_PAYMENT_REQUEST_PAYMENT_MISMATCH"),
  );
  assert.equal(store.current.payments[0]?.status, PaymentStatus.PENDING);
  assert.equal(store.current.additionalCharges[0]?.status, AdditionalChargeStatus.PENDING);
  assertNoRawTokenStored(store.current);
});
