import {
  AdditionalChargeStatus,
  GuestPaymentRequestStatus,
  PaymentProvider,
  PaymentPurpose,
  PaymentStatus,
  Prisma,
  ReservationStatus,
} from "@prisma/client";

import { dateOnlyFromDate } from "@/lib/availability/rules";
import { prisma } from "@/lib/db/prisma";
import {
  createAdditionalChargePaymentApprovedNotificationIntents,
} from "@/lib/email/additional-charge-notification-intents";
import { buildGuestPaymentRequestPaymentPath } from "@/lib/payments/guest-payment-request-link";
import {
  decryptGuestPaymentRequestAccessToken,
  hashGuestPaymentRequestAccessToken,
  isGuestPaymentRequestAccessToken,
} from "@/lib/payments/guest-payment-request-token";
import type { AdditionalChargeCategory } from "@/types/additional-charge";

const TRP_CURRENCY = "USD";
const REQUEST_PAYMENT_TRANSACTION_MAX_ATTEMPTS = 3;
const REQUEST_PAYMENT_TRANSACTION_RETRY_DELAY_MS = 75;

export type GuestPaymentRequestPaymentErrorCode =
  | "INVALID_GUEST_PAYMENT_REQUEST"
  | "GUEST_PAYMENT_REQUEST_EXPIRED"
  | "GUEST_PAYMENT_REQUEST_NOT_PAYABLE"
  | "GUEST_PAYMENT_REQUEST_PAYMENT_MISMATCH";

export class GuestPaymentRequestPaymentError extends Error {
  constructor(public readonly code: GuestPaymentRequestPaymentErrorCode) {
    super(code);
    this.name = "GuestPaymentRequestPaymentError";
  }
}

export type GuestPaymentRequestPaymentItemSummary = Readonly<{
  category: AdditionalChargeCategory;
  description: string;
  amount: string;
  currency: "USD";
}>;

export type GuestPaymentRequestPaymentSummary = Readonly<{
  requestStatus: "PENDING" | "PAID" | "EXPIRED" | "CANCELLED";
  paymentStatus:
    | "PENDING"
    | "APPROVED"
    | "REJECTED"
    | "FAILED"
    | "REFUNDED"
    | "PARTIALLY_REFUNDED"
    | null;
  propertyName: string;
  reservationReference: string;
  locale: "es" | "en";
  checkInDate: string;
  checkOutDate: string;
  totalAmount: string;
  currency: "USD";
  expiresAt: string;
  paidAt: string | null;
  cancelledAt: string | null;
  payable: boolean;
  items: readonly GuestPaymentRequestPaymentItemSummary[];
}>;

export type PreparedGuestPaymentRequestPayment = Readonly<{
  token: string;
  requestId: string;
  payment: Readonly<{
    id: string;
    reservationId: string;
    status: PaymentStatus;
    amount: Prisma.Decimal;
    currency: string;
    providerReference: string | null;
  }>;
  reservation: Readonly<{
    guestName: string;
    guestEmail: string;
    guestPhone: string | null;
    guestCountry: string | null;
  }>;
  locale: "es" | "en";
  expiresAt: string;
}>;

export type ApprovedGuestPaymentRequestPaymentResult = Readonly<{
  requestId: string;
  reservationId: string;
  reservationStatus: ReservationStatus;
  paidAt: string;
  alreadyPaid: boolean;
  notificationIds: readonly string[];
}>;

const paymentRequestPaymentSelect = {
  id: true,
  reservationId: true,
  status: true,
  totalAmount: true,
  currency: true,
  accessTokenHash: true,
  accessTokenEncrypted: true,
  expiresAt: true,
  createdByAdminId: true,
  paidAt: true,
  cancelledAt: true,
  createdAt: true,
  updatedAt: true,
  reservation: {
    select: {
      id: true,
      status: true,
      guestName: true,
      guestEmail: true,
      guestPhone: true,
      guestCountry: true,
      preferredLocale: true,
      checkInDate: true,
      checkOutDate: true,
      property: {
        select: {
          nameEs: true,
          nameEn: true,
        },
      },
    },
  },
  items: {
    select: {
      id: true,
      additionalChargeId: true,
      categorySnapshot: true,
      descriptionSnapshot: true,
      amountSnapshot: true,
      currencySnapshot: true,
      createdAt: true,
      additionalCharge: {
        select: {
          id: true,
          reservationId: true,
          status: true,
          amount: true,
          currency: true,
        },
      },
    },
    orderBy: { createdAt: "asc" as const },
  },
  payment: {
    select: {
      id: true,
      reservationId: true,
      guestPaymentRequestId: true,
      provider: true,
      purpose: true,
      status: true,
      amount: true,
      currency: true,
      providerReference: true,
      providerTransactionId: true,
      paidAt: true,
      failedAt: true,
      updatedAt: true,
    },
  },
} satisfies Prisma.GuestPaymentRequestSelect;

type GuestPaymentRequestPaymentRecord =
  Prisma.GuestPaymentRequestGetPayload<{
    select: typeof paymentRequestPaymentSelect;
  }>;

function waitForRequestPaymentRetry(attempt: number): Promise<void> {
  return new Promise((resolve) =>
    setTimeout(resolve, REQUEST_PAYMENT_TRANSACTION_RETRY_DELAY_MS * attempt),
  );
}

function isRequestPaymentSerializationFailure(error: unknown): boolean {
  return (
    error instanceof Prisma.PrismaClientKnownRequestError &&
    error.code === "P2034"
  );
}

async function runRequestPaymentTransactionWithRetry<T>(
  operation: (transaction: Prisma.TransactionClient) => Promise<T>,
): Promise<T> {
  for (
    let attempt = 1;
    attempt <= REQUEST_PAYMENT_TRANSACTION_MAX_ATTEMPTS;
    attempt += 1
  ) {
    try {
      return await prisma.$transaction(operation, {
        isolationLevel: Prisma.TransactionIsolationLevel.Serializable,
      });
    } catch (error) {
      if (
        !isRequestPaymentSerializationFailure(error) ||
        attempt === REQUEST_PAYMENT_TRANSACTION_MAX_ATTEMPTS
      ) {
        throw error;
      }

      await waitForRequestPaymentRetry(attempt);
    }
  }

  throw new GuestPaymentRequestPaymentError(
    "GUEST_PAYMENT_REQUEST_PAYMENT_MISMATCH",
  );
}

function normalizeLocale(value: string): "es" | "en" {
  return value === "en" ? "en" : "es";
}

function normalizeToken(rawToken: string): Readonly<{
  rawToken: string;
  tokenHash: string;
}> {
  const normalizedToken = rawToken.trim();

  if (!isGuestPaymentRequestAccessToken(normalizedToken)) {
    throw new GuestPaymentRequestPaymentError(
      "INVALID_GUEST_PAYMENT_REQUEST",
    );
  }

  return {
    rawToken: normalizedToken,
    tokenHash: hashGuestPaymentRequestAccessToken(normalizedToken),
  };
}

function amountCents(amount: Prisma.Decimal): number {
  const numericAmount = Number(amount.toString());

  if (!Number.isFinite(numericAmount) || numericAmount < 0) {
    throw new GuestPaymentRequestPaymentError(
      "GUEST_PAYMENT_REQUEST_PAYMENT_MISMATCH",
    );
  }

  const cents = Math.round(numericAmount * 100);

  if (!Number.isSafeInteger(cents)) {
    throw new GuestPaymentRequestPaymentError(
      "GUEST_PAYMENT_REQUEST_PAYMENT_MISMATCH",
    );
  }

  return cents;
}

function assertRequestPaymentIntegrity(
  request: GuestPaymentRequestPaymentRecord,
): void {
  if (
    request.currency !== TRP_CURRENCY ||
    request.items.length === 0 ||
    request.totalAmount.lessThanOrEqualTo(0)
  ) {
    throw new GuestPaymentRequestPaymentError(
      "GUEST_PAYMENT_REQUEST_PAYMENT_MISMATCH",
    );
  }

  const itemTotal = request.items.reduce(
    (total, item) => total.add(item.amountSnapshot),
    new Prisma.Decimal(0),
  );

  if (itemTotal.comparedTo(request.totalAmount) !== 0) {
    throw new GuestPaymentRequestPaymentError(
      "GUEST_PAYMENT_REQUEST_PAYMENT_MISMATCH",
    );
  }

  for (const item of request.items) {
    if (
      item.additionalCharge.id !== item.additionalChargeId ||
      item.currencySnapshot !== request.currency ||
      item.amountSnapshot.lessThanOrEqualTo(0) ||
      item.additionalCharge.amount.comparedTo(item.amountSnapshot) !== 0 ||
      item.additionalCharge.reservationId !== request.reservationId ||
      item.additionalCharge.currency !== request.currency
    ) {
      throw new GuestPaymentRequestPaymentError(
        "GUEST_PAYMENT_REQUEST_PAYMENT_MISMATCH",
      );
    }
  }

  if (!request.payment) {
    if (request.status === GuestPaymentRequestStatus.PAID) {
      throw new GuestPaymentRequestPaymentError(
        "GUEST_PAYMENT_REQUEST_PAYMENT_MISMATCH",
      );
    }

    return;
  }

  if (
    request.payment.reservationId !== request.reservationId ||
    request.payment.guestPaymentRequestId !== request.id ||
    request.payment.provider !== PaymentProvider.TILOPAY ||
    request.payment.purpose !== PaymentPurpose.ADDITIONAL_CHARGE ||
    request.payment.currency !== request.currency ||
    request.payment.amount.comparedTo(request.totalAmount) !== 0
  ) {
    throw new GuestPaymentRequestPaymentError(
      "GUEST_PAYMENT_REQUEST_PAYMENT_MISMATCH",
    );
  }

  if (
    request.status === GuestPaymentRequestStatus.PAID &&
    request.payment.status !== PaymentStatus.APPROVED
  ) {
    throw new GuestPaymentRequestPaymentError(
      "GUEST_PAYMENT_REQUEST_PAYMENT_MISMATCH",
    );
  }
}

function assertPayableRequest(
  request: GuestPaymentRequestPaymentRecord,
  now: Date,
): void {
  if (
    (request.status === GuestPaymentRequestStatus.PENDING ||
      request.status === GuestPaymentRequestStatus.EXPIRED) &&
    request.expiresAt <= now
  ) {
    throw new GuestPaymentRequestPaymentError(
      "GUEST_PAYMENT_REQUEST_EXPIRED",
    );
  }

  if (request.status !== GuestPaymentRequestStatus.PENDING) {
    throw new GuestPaymentRequestPaymentError(
      "GUEST_PAYMENT_REQUEST_NOT_PAYABLE",
    );
  }

  if (
    request.payment?.status === PaymentStatus.APPROVED ||
    request.payment?.status === PaymentStatus.REFUNDED ||
    request.payment?.status === PaymentStatus.PARTIALLY_REFUNDED
  ) {
    throw new GuestPaymentRequestPaymentError(
      "GUEST_PAYMENT_REQUEST_NOT_PAYABLE",
    );
  }

  const allChargesPending = request.items.every(
    (item) => item.additionalCharge.status === AdditionalChargeStatus.PENDING,
  );

  if (!allChargesPending) {
    throw new GuestPaymentRequestPaymentError(
      "GUEST_PAYMENT_REQUEST_NOT_PAYABLE",
    );
  }
}

async function expirePendingRequestByHash(
  tokenHash: string,
  now: Date,
  transaction: Prisma.TransactionClient | typeof prisma = prisma,
): Promise<void> {
  await transaction.guestPaymentRequest.updateMany({
    where: {
      accessTokenHash: tokenHash,
      status: GuestPaymentRequestStatus.PENDING,
      expiresAt: { lte: now },
    },
    data: {
      status: GuestPaymentRequestStatus.EXPIRED,
    },
  });
}

async function readRequestByToken(
  rawToken: string,
  options: Readonly<{
    expireOverduePending: boolean;
    transaction?: Prisma.TransactionClient;
  }> = { expireOverduePending: true },
): Promise<Readonly<{
  rawToken: string;
  tokenHash: string;
  request: GuestPaymentRequestPaymentRecord;
}>> {
  const token = normalizeToken(rawToken);
  const now = new Date();
  const client = options.transaction ?? prisma;

  if (options.expireOverduePending) {
    await expirePendingRequestByHash(token.tokenHash, now, client);
  }

  const request = await client.guestPaymentRequest.findUnique({
    where: { accessTokenHash: token.tokenHash },
    select: paymentRequestPaymentSelect,
  });

  if (!request) {
    throw new GuestPaymentRequestPaymentError(
      "INVALID_GUEST_PAYMENT_REQUEST",
    );
  }

  assertRequestPaymentIntegrity(request);

  return {
    ...token,
    request,
  };
}

function toPaymentSummaryStatus(
  payment: GuestPaymentRequestPaymentRecord["payment"],
): GuestPaymentRequestPaymentSummary["paymentStatus"] {
  return payment?.status ?? null;
}

function isRequestPayable(
  request: GuestPaymentRequestPaymentRecord,
  now: Date,
): boolean {
  try {
    assertPayableRequest(request, now);
    return true;
  } catch {
    return false;
  }
}

function reservationReference(reservationId: string): string {
  return reservationId.slice(-8).toUpperCase();
}

export async function getGuestPaymentRequestPaymentSummary(
  rawToken: string,
): Promise<GuestPaymentRequestPaymentSummary> {
  const now = new Date();
  const { request } = await readRequestByToken(rawToken, {
    expireOverduePending: true,
  });
  const locale = normalizeLocale(request.reservation.preferredLocale);

  return {
    requestStatus: request.status,
    paymentStatus: toPaymentSummaryStatus(request.payment),
    propertyName:
      locale === "en"
        ? request.reservation.property.nameEn
        : request.reservation.property.nameEs,
    reservationReference: reservationReference(request.reservationId),
    locale,
    checkInDate: dateOnlyFromDate(request.reservation.checkInDate),
    checkOutDate: dateOnlyFromDate(request.reservation.checkOutDate),
    totalAmount: request.totalAmount.toFixed(2),
    currency: TRP_CURRENCY,
    expiresAt: request.expiresAt.toISOString(),
    paidAt: request.paidAt?.toISOString() ?? null,
    cancelledAt: request.cancelledAt?.toISOString() ?? null,
    payable: isRequestPayable(request, now),
    items: request.items.map((item) => ({
      category: item.categorySnapshot as AdditionalChargeCategory,
      description: item.descriptionSnapshot,
      amount: item.amountSnapshot.toFixed(2),
      currency: TRP_CURRENCY,
    })),
  };
}

export async function prepareGuestPaymentRequestPayment(
  rawToken: string,
): Promise<PreparedGuestPaymentRequestPayment> {
  const token = normalizeToken(rawToken);

  try {
    return await runRequestPaymentTransactionWithRetry(
      async (transaction) => {
        await expirePendingRequestByHash(token.tokenHash, new Date(), transaction);
        const request = await transaction.guestPaymentRequest.findUnique({
          where: { accessTokenHash: token.tokenHash },
          select: paymentRequestPaymentSelect,
        });

        if (!request) {
          throw new GuestPaymentRequestPaymentError(
            "INVALID_GUEST_PAYMENT_REQUEST",
          );
        }

        assertRequestPaymentIntegrity(request);
        assertPayableRequest(request, new Date());

        let payment = request.payment;

        if (!payment) {
          payment = await transaction.payment.create({
            data: {
              reservationId: request.reservationId,
              guestPaymentRequestId: request.id,
              provider: PaymentProvider.TILOPAY,
              purpose: PaymentPurpose.ADDITIONAL_CHARGE,
              status: PaymentStatus.PENDING,
              amount: request.totalAmount,
              currency: request.currency,
            },
            select: paymentRequestPaymentSelect.payment.select,
          });

          await transaction.adminAuditLog.create({
            data: {
              userId: request.createdByAdminId,
              action: "GUEST_PAYMENT_REQUEST_PAYMENT_CREATED",
              entityType: "Payment",
              entityId: payment.id,
              metadata: {
                reservationId: request.reservationId,
                guestPaymentRequestId: request.id,
                chargeIds: request.items.map((item) => item.additionalChargeId),
                purpose: PaymentPurpose.ADDITIONAL_CHARGE,
                provider: PaymentProvider.TILOPAY,
                amountCents: amountCents(request.totalAmount),
                currency: request.currency,
                providerCalled: false,
              },
            },
          });
        } else if (
          payment.status === PaymentStatus.REJECTED ||
          payment.status === PaymentStatus.FAILED
        ) {
          payment = await transaction.payment.update({
            where: { id: payment.id },
            data: {
              status: PaymentStatus.PENDING,
              failedAt: null,
              providerTransactionId: null,
            },
            select: paymentRequestPaymentSelect.payment.select,
          });

          await transaction.adminAuditLog.create({
            data: {
              userId: request.createdByAdminId,
              action: "GUEST_PAYMENT_REQUEST_PAYMENT_RETRY_PREPARED",
              entityType: "Payment",
              entityId: payment.id,
              metadata: {
                reservationId: request.reservationId,
                guestPaymentRequestId: request.id,
                chargeIds: request.items.map((item) => item.additionalChargeId),
                purpose: PaymentPurpose.ADDITIONAL_CHARGE,
                amountCents: amountCents(request.totalAmount),
                currency: request.currency,
                providerCalled: false,
              },
            },
          });
        }

        return {
          token: token.rawToken,
          requestId: request.id,
          payment: {
            id: payment.id,
            reservationId: payment.reservationId,
            status: payment.status,
            amount: payment.amount,
            currency: payment.currency,
            providerReference: payment.providerReference,
          },
          reservation: {
            guestName: request.reservation.guestName,
            guestEmail: request.reservation.guestEmail,
            guestPhone: request.reservation.guestPhone,
            guestCountry: request.reservation.guestCountry,
          },
          locale: normalizeLocale(request.reservation.preferredLocale),
          expiresAt: request.expiresAt.toISOString(),
        };
      },
    );
  } catch (error) {
    if (error instanceof GuestPaymentRequestPaymentError) {
      throw error;
    }

    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2002"
    ) {
      throw new GuestPaymentRequestPaymentError(
        "GUEST_PAYMENT_REQUEST_NOT_PAYABLE",
      );
    }

    throw error;
  }
}

export async function resolveGuestPaymentRequestClientEventReservation(
  rawToken: string,
  paymentId: string,
): Promise<string> {
  const { request } = await readRequestByToken(rawToken, {
    expireOverduePending: false,
  });

  if (
    !request.payment ||
    request.payment.id !== paymentId ||
    request.status !== GuestPaymentRequestStatus.PENDING ||
    request.expiresAt <= new Date()
  ) {
    throw new GuestPaymentRequestPaymentError(
      "GUEST_PAYMENT_REQUEST_PAYMENT_MISMATCH",
    );
  }

  return request.reservationId;
}

export async function getGuestPaymentRequestPaymentPathForPayment(
  paymentId: string,
): Promise<string | null> {
  const payment = await prisma.payment.findUnique({
    where: { id: paymentId },
    select: {
      purpose: true,
      guestPaymentRequest: {
        select: {
          reservationId: true,
          accessTokenHash: true,
          accessTokenEncrypted: true,
        },
      },
    },
  });

  if (
    !payment ||
    payment.purpose !== PaymentPurpose.ADDITIONAL_CHARGE ||
    !payment.guestPaymentRequest
  ) {
    return null;
  }

  try {
    const rawToken = decryptGuestPaymentRequestAccessToken(
      payment.guestPaymentRequest.reservationId,
      payment.guestPaymentRequest.accessTokenEncrypted,
    );

    if (
      hashGuestPaymentRequestAccessToken(rawToken) !==
      payment.guestPaymentRequest.accessTokenHash
    ) {
      return null;
    }

    return buildGuestPaymentRequestPaymentPath(rawToken);
  } catch {
    return null;
  }
}

export async function markGuestPaymentRequestPaidFromApprovedPayment(
  input: Readonly<{
    paymentId: string;
    providerTransactionId: string;
    rawPayload?: Prisma.InputJsonObject;
    paidAt?: Date;
  }>,
): Promise<ApprovedGuestPaymentRequestPaymentResult> {
  return runRequestPaymentTransactionWithRetry(async (transaction) => {
    const now = input.paidAt ?? new Date();
    const payment = await transaction.payment.findUnique({
      where: { id: input.paymentId },
      select: {
        id: true,
        reservationId: true,
        guestPaymentRequestId: true,
        purpose: true,
        status: true,
        amount: true,
        currency: true,
        paidAt: true,
        reservation: {
          select: {
            status: true,
            guestEmail: true,
            preferredLocale: true,
          },
        },
        guestPaymentRequest: {
          select: {
            id: true,
            reservationId: true,
            status: true,
            totalAmount: true,
            currency: true,
            paidAt: true,
            items: {
              select: {
                additionalChargeId: true,
                amountSnapshot: true,
                currencySnapshot: true,
                additionalCharge: {
                  select: {
                    id: true,
                    reservationId: true,
                    status: true,
                    amount: true,
                    currency: true,
                  },
                },
              },
              orderBy: { createdAt: "asc" as const },
            },
          },
        },
      },
    });

    const request = payment?.guestPaymentRequest;

    if (
      !payment ||
      !request ||
      !payment.guestPaymentRequestId ||
      payment.purpose !== PaymentPurpose.ADDITIONAL_CHARGE ||
      payment.reservationId !== request.reservationId ||
      payment.guestPaymentRequestId !== request.id ||
      payment.currency !== request.currency ||
      payment.amount.comparedTo(request.totalAmount) !== 0
    ) {
      throw new GuestPaymentRequestPaymentError(
        "GUEST_PAYMENT_REQUEST_PAYMENT_MISMATCH",
      );
    }

    const itemTotal = request.items.reduce(
      (total, item) => total.add(item.amountSnapshot),
      new Prisma.Decimal(0),
    );

    if (
      request.currency !== TRP_CURRENCY ||
      request.items.length === 0 ||
      itemTotal.comparedTo(request.totalAmount) !== 0 ||
      request.items.some(
        (item) =>
          item.currencySnapshot !== request.currency ||
          item.additionalCharge.amount.comparedTo(item.amountSnapshot) !== 0 ||
          item.additionalCharge.reservationId !== request.reservationId ||
          item.additionalCharge.currency !== request.currency,
      )
    ) {
      throw new GuestPaymentRequestPaymentError(
        "GUEST_PAYMENT_REQUEST_PAYMENT_MISMATCH",
      );
    }

    if (request.status === GuestPaymentRequestStatus.PAID) {
      if (payment.status !== PaymentStatus.APPROVED || !request.paidAt) {
        throw new GuestPaymentRequestPaymentError(
          "GUEST_PAYMENT_REQUEST_PAYMENT_MISMATCH",
        );
      }

      return {
        requestId: request.id,
        reservationId: request.reservationId,
        reservationStatus: payment.reservation.status,
        paidAt: request.paidAt.toISOString(),
        alreadyPaid: true,
        notificationIds: [],
      };
    }

    if (
      request.status !== GuestPaymentRequestStatus.PENDING ||
      (
        payment.status !== PaymentStatus.PENDING &&
        payment.status !== PaymentStatus.APPROVED
      )
    ) {
      throw new GuestPaymentRequestPaymentError(
        "GUEST_PAYMENT_REQUEST_NOT_PAYABLE",
      );
    }

    const chargeIds = request.items.map((item) => item.additionalChargeId);
    const payableChargeCount = request.items.filter(
      (item) => item.additionalCharge.status === AdditionalChargeStatus.PENDING,
    ).length;

    if (payableChargeCount !== chargeIds.length) {
      throw new GuestPaymentRequestPaymentError(
        "GUEST_PAYMENT_REQUEST_NOT_PAYABLE",
      );
    }

    await transaction.payment.update({
      where: { id: payment.id },
      data: {
        status: PaymentStatus.APPROVED,
        paidAt: payment.paidAt ?? now,
        failedAt: null,
        providerTransactionId: input.providerTransactionId,
        ...(input.rawPayload ? { rawPayload: input.rawPayload } : {}),
      },
    });

    const paidCharges = await transaction.additionalCharge.updateMany({
      where: {
        id: { in: chargeIds },
        reservationId: request.reservationId,
        status: AdditionalChargeStatus.PENDING,
      },
      data: {
        status: AdditionalChargeStatus.PAID,
      },
    });

    if (paidCharges.count !== chargeIds.length) {
      throw new GuestPaymentRequestPaymentError(
        "GUEST_PAYMENT_REQUEST_NOT_PAYABLE",
      );
    }

    const paidRequest = await transaction.guestPaymentRequest.updateMany({
      where: {
        id: request.id,
        status: GuestPaymentRequestStatus.PENDING,
      },
      data: {
        status: GuestPaymentRequestStatus.PAID,
        paidAt: payment.paidAt ?? now,
      },
    });

    if (paidRequest.count !== 1) {
      throw new GuestPaymentRequestPaymentError(
        "GUEST_PAYMENT_REQUEST_NOT_PAYABLE",
      );
    }

    await transaction.adminAuditLog.create({
      data: {
        userId: null,
        action: "GUEST_PAYMENT_REQUEST_PAID",
        entityType: "GuestPaymentRequest",
        entityId: request.id,
        metadata: {
          reservationId: request.reservationId,
          guestPaymentRequestId: request.id,
          paymentId: payment.id,
          chargeIds,
          purpose: PaymentPurpose.ADDITIONAL_CHARGE,
          paymentStatus: PaymentStatus.APPROVED,
          requestStatus: GuestPaymentRequestStatus.PAID,
          chargeStatus: AdditionalChargeStatus.PAID,
          provider: PaymentProvider.TILOPAY,
          providerTransactionId: input.providerTransactionId,
          amountCents: amountCents(request.totalAmount),
          currency: request.currency,
          paidAt: (payment.paidAt ?? now).toISOString(),
          reservationTotalMutated: false,
          reservationPricingSnapshotMutated: false,
          reservationConfirmationAttempted: false,
          lifecycleMutationCompleted: false,
        },
      },
    });

    const notificationIntents =
      await createAdditionalChargePaymentApprovedNotificationIntents(
        transaction,
        {
          reservationId: request.reservationId,
          guestPaymentRequestId: request.id,
          guestEmail: payment.reservation.guestEmail,
          preferredLocale: payment.reservation.preferredLocale,
        },
      );

    return {
      requestId: request.id,
      reservationId: request.reservationId,
      reservationStatus: payment.reservation.status,
      paidAt: (payment.paidAt ?? now).toISOString(),
      alreadyPaid: false,
      notificationIds: notificationIntents
        .filter((notification) => notification.created)
        .map((notification) => notification.id),
    };
  });
}
