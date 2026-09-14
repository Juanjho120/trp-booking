import {
  AdditionalChargeCategory,
  AdditionalChargeStatus,
  GuestPaymentRequestStatus,
  PaymentPurpose,
  PaymentStatus,
  Prisma,
  RefundStatus,
  ReservationStatus,
} from "@prisma/client";

import { prisma } from "@/lib/db/prisma";
import { getTilopayEnv } from "@/lib/env/server";
import { createGuestPaymentRequestTokenMaterial } from "@/lib/payments/guest-payment-request-token";
import type { AdminActor } from "@/types/admin";
import type {
  AdminAdditionalChargeErrorCode,
  AdminAdditionalChargeManagement,
  AdminAdditionalChargeSummary,
  AdminGuestPaymentRequestSummary,
  CancelAdminAdditionalChargeInput,
  CancelAdminGuestPaymentRequestInput,
  CreateAdminAdditionalChargeInput,
  CreateAdminGuestPaymentRequestInput,
  UpdateAdminAdditionalChargeInput,
} from "@/types/admin-additional-charge";
import { GUEST_PAYMENT_REQUEST_EXPIRY_HOURS } from "@/types/additional-charge";

import { resolveAdminActor } from "./admin-actor";
import { toAdminRefundDiagnostics } from "./refunds";

const TRP_CURRENCY = "USD";
const DESCRIPTION_MAX_LENGTH = 1_000;
const INTERNAL_NOTE_MAX_LENGTH = 2_000;
const CLIENT_REQUEST_ID_MAX_LENGTH = 120;
const ELIGIBLE_RESERVATION_STATUSES = [
  ReservationStatus.CONFIRMED,
  ReservationStatus.CANCELLED,
] as const;
const ADDITIONAL_CHARGE_TRANSACTION_MAX_ATTEMPTS = 3;
const ADDITIONAL_CHARGE_TRANSACTION_RETRY_DELAY_MS = 75;
const ADDITIONAL_CHARGE_CAPTURED_PAYMENT_STATUSES = [
  PaymentStatus.APPROVED,
  PaymentStatus.PARTIALLY_REFUNDED,
  PaymentStatus.REFUNDED,
] as const;
const COMMITTED_REFUND_STATUSES = [
  RefundStatus.PENDING,
  RefundStatus.PROCESSING,
  RefundStatus.APPROVED,
  RefundStatus.MANUAL,
] as const;
const COMPLETED_REFUND_STATUSES = [
  RefundStatus.APPROVED,
  RefundStatus.MANUAL,
] as const;

function isAdditionalChargeSerializationFailure(error: unknown): boolean {
  return (
    error instanceof Prisma.PrismaClientKnownRequestError &&
    error.code === "P2034"
  );
}

async function waitForAdditionalChargeRetry(attempt: number): Promise<void> {
  await new Promise((resolve) =>
    setTimeout(resolve, ADDITIONAL_CHARGE_TRANSACTION_RETRY_DELAY_MS * attempt),
  );
}

async function runAdditionalChargeTransactionWithRetry<T>(
  operation: (transaction: Prisma.TransactionClient) => Promise<T>,
): Promise<T> {
  for (
    let attempt = 1;
    attempt <= ADDITIONAL_CHARGE_TRANSACTION_MAX_ATTEMPTS;
    attempt += 1
  ) {
    try {
      return await prisma.$transaction(operation, {
        isolationLevel: Prisma.TransactionIsolationLevel.Serializable,
      });
    } catch (error) {
      if (
        !isAdditionalChargeSerializationFailure(error) ||
        attempt === ADDITIONAL_CHARGE_TRANSACTION_MAX_ATTEMPTS
      ) {
        throw error;
      }

      await waitForAdditionalChargeRetry(attempt);
    }
  }

  throw new AdminAdditionalChargeError(
    "ADMIN_ADDITIONAL_CHARGE_UNEXPECTED_ERROR",
  );
}

const chargeSummarySelect = {
  id: true,
  reservationId: true,
  category: true,
  description: true,
  internalNote: true,
  amount: true,
  currency: true,
  status: true,
  cancelledAt: true,
  createdAt: true,
  updatedAt: true,
  createdByAdmin: {
    select: {
      name: true,
      email: true,
    },
  },
  paymentRequestItems: {
    select: {
      amountSnapshot: true,
      currencySnapshot: true,
      paymentRequest: {
        select: {
          id: true,
          status: true,
          expiresAt: true,
          payment: {
            select: {
              id: true,
              purpose: true,
              status: true,
              providerReference: true,
              updatedAt: true,
            },
          },
        },
      },
    },
    orderBy: { createdAt: "desc" as const },
  },
  refundAllocations: {
    select: {
      id: true,
      allocatedAmount: true,
      createdAt: true,
      refund: {
        select: {
          id: true,
          paymentId: true,
          authorizationType: true,
          clientRequestId: true,
          refundOperationKey: true,
          amount: true,
          currency: true,
          reason: true,
          status: true,
          processingMode: true,
          providerRefundId: true,
          processingStartedAt: true,
          approvedAt: true,
          failedAt: true,
          failureCode: true,
          rawPayload: true,
          createdAt: true,
          updatedAt: true,
          requestedByAdmin: {
            select: {
              name: true,
              email: true,
            },
          },
        },
      },
    },
    orderBy: { createdAt: "desc" as const },
  },
} satisfies Prisma.AdditionalChargeSelect;

const paymentRequestSummarySelect = {
  id: true,
  reservationId: true,
  status: true,
  totalAmount: true,
  currency: true,
  expiresAt: true,
  paidAt: true,
  cancelledAt: true,
  createdAt: true,
  updatedAt: true,
  clientRequestId: true,
  createdByAdmin: {
    select: {
      name: true,
      email: true,
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
    },
    orderBy: { createdAt: "asc" as const },
  },
  payment: {
    select: {
      id: true,
      purpose: true,
      status: true,
      providerReference: true,
      updatedAt: true,
    },
  },
} satisfies Prisma.GuestPaymentRequestSelect;

type ChargeRow = Prisma.AdditionalChargeGetPayload<{
  select: typeof chargeSummarySelect;
}>;

type PaymentRequestRow = Prisma.GuestPaymentRequestGetPayload<{
  select: typeof paymentRequestSummarySelect;
}>;

type EligibleReservation = Readonly<{
  id: string;
  status: ReservationStatus;
  confirmedAt: Date | null;
  currency: string;
  updatedAt: Date;
}>;

export class AdminAdditionalChargeError extends Error {
  constructor(public readonly code: AdminAdditionalChargeErrorCode) {
    super(code);
    this.name = "AdminAdditionalChargeError";
  }
}

function normalizeRequiredText(value: string, maxLength: number): string {
  const normalized = value.trim();

  if (!normalized || normalized.length > maxLength) {
    throw new AdminAdditionalChargeError(
      "INVALID_ADMIN_ADDITIONAL_CHARGE_REQUEST",
    );
  }

  return normalized;
}

function normalizeOptionalText(
  value: string | null | undefined,
  maxLength: number,
): string | null {
  const normalized = value?.trim() ?? "";

  if (!normalized) {
    return null;
  }

  if (normalized.length > maxLength) {
    throw new AdminAdditionalChargeError(
      "INVALID_ADMIN_ADDITIONAL_CHARGE_REQUEST",
    );
  }

  return normalized;
}

function parseAmount(value: string): Prisma.Decimal {
  const normalized = value.trim();

  if (!/^(?:0|[1-9]\d{0,7})(?:\.\d{1,2})?$/.test(normalized)) {
    throw new AdminAdditionalChargeError(
      "INVALID_ADMIN_ADDITIONAL_CHARGE_REQUEST",
    );
  }

  const amount = new Prisma.Decimal(normalized);

  if (amount.lte(0) || amount.gt("99999999.99")) {
    throw new AdminAdditionalChargeError(
      "INVALID_ADMIN_ADDITIONAL_CHARGE_REQUEST",
    );
  }

  return amount;
}

function normalizeClientRequestId(value: string): string {
  const normalized = value.trim();

  if (!normalized || normalized.length > CLIENT_REQUEST_ID_MAX_LENGTH) {
    throw new AdminAdditionalChargeError(
      "INVALID_ADMIN_ADDITIONAL_CHARGE_REQUEST",
    );
  }

  return normalized;
}

function parseExpectedUpdatedAt(value: string): Date {
  const parsed = new Date(value);

  if (!value.trim() || Number.isNaN(parsed.getTime())) {
    throw new AdminAdditionalChargeError(
      "INVALID_ADMIN_ADDITIONAL_CHARGE_REQUEST",
    );
  }

  return parsed;
}

function assertReservationEligible(reservation: EligibleReservation): void {
  if (
    !reservation.confirmedAt ||
    !ELIGIBLE_RESERVATION_STATUSES.includes(
      reservation.status as (typeof ELIGIBLE_RESERVATION_STATUSES)[number],
    ) ||
    reservation.currency !== TRP_CURRENCY
  ) {
    throw new AdminAdditionalChargeError(
      "ADMIN_ADDITIONAL_CHARGE_RESERVATION_NOT_ELIGIBLE",
    );
  }
}

async function fenceEligibleReservation(
  transaction: Prisma.TransactionClient,
  reservation: EligibleReservation,
): Promise<void> {
  const fence = await transaction.reservation.updateMany({
    where: {
      id: reservation.id,
      status: reservation.status,
      confirmedAt: { not: null },
      currency: TRP_CURRENCY,
      updatedAt: reservation.updatedAt,
    },
    data: {
      updatedAt: reservation.updatedAt,
    },
  });

  if (fence.count !== 1) {
    throw new AdminAdditionalChargeError(
      "ADMIN_ADDITIONAL_CHARGE_RESERVATION_NOT_ELIGIBLE",
    );
  }
}

function toAmountCents(amount: Prisma.Decimal): number {
  return amount.mul(100).toDecimalPlaces(0).toNumber();
}

function hasActiveRequest(row: ChargeRow, now: Date): string | null {
  return (
    row.paymentRequestItems.find(
      (item) =>
        item.paymentRequest.status === GuestPaymentRequestStatus.PENDING &&
        item.paymentRequest.expiresAt > now,
    )?.paymentRequest.id ?? null
  );
}

function isCapturedAdditionalChargePayment(
  payment: ChargeRow["paymentRequestItems"][number]["paymentRequest"]["payment"],
): payment is NonNullable<typeof payment> {
  return Boolean(
    payment &&
      payment.purpose === PaymentPurpose.ADDITIONAL_CHARGE &&
      ADDITIONAL_CHARGE_CAPTURED_PAYMENT_STATUSES.includes(
        payment.status as (typeof ADDITIONAL_CHARGE_CAPTURED_PAYMENT_STATUSES)[number],
      ),
  );
}

function sumRefundAllocations(
  row: ChargeRow,
  statuses: readonly RefundStatus[],
): Prisma.Decimal {
  return row.refundAllocations.reduce((total, allocation) => {
    if (
      allocation.refund.authorizationType !== "ADDITIONAL_CHARGE" ||
      allocation.refund.currency !== TRP_CURRENCY ||
      !statuses.includes(allocation.refund.status)
    ) {
      return total;
    }

    return total.add(allocation.allocatedAmount).toDecimalPlaces(2);
  }, new Prisma.Decimal(0));
}

function toChargeSummary(row: ChargeRow, now: Date): AdminAdditionalChargeSummary {
  const everRequested = row.paymentRequestItems.length > 0;
  const activePaymentRequestId = hasActiveRequest(row, now);
  const pending = row.status === AdditionalChargeStatus.PENDING;
  const capturedItem = row.paymentRequestItems.find((item) =>
    isCapturedAdditionalChargePayment(item.paymentRequest.payment),
  );
  const capturedPayment = capturedItem?.paymentRequest.payment ?? null;
  const capturedAmount = capturedItem?.amountSnapshot ?? new Prisma.Decimal(0);
  const committedRefundAmount = sumRefundAllocations(
    row,
    COMMITTED_REFUND_STATUSES,
  );
  const refundedAmount = sumRefundAllocations(row, COMPLETED_REFUND_STATUSES);
  const remainingRefundableAmount = capturedAmount
    .sub(committedRefundAmount)
    .toDecimalPlaces(2);
  const canRefund =
    capturedPayment !== null &&
    row.currency === TRP_CURRENCY &&
    capturedItem?.currencySnapshot === TRP_CURRENCY &&
    remainingRefundableAmount.greaterThan(0) &&
    (row.status === AdditionalChargeStatus.PAID ||
      row.status === AdditionalChargeStatus.PARTIALLY_REFUNDED);

  return {
    id: row.id,
    reservationId: row.reservationId,
    category: row.category,
    description: row.description,
    internalNote: row.internalNote,
    amount: row.amount.toFixed(2),
    currency: TRP_CURRENCY,
    status: row.status,
    createdByAdmin: row.createdByAdmin,
    cancelledAt: row.cancelledAt?.toISOString() ?? null,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
    everRequested,
    activePaymentRequestId,
    paidPaymentRequestId: capturedItem?.paymentRequest.id ?? null,
    paymentId: capturedPayment?.id ?? null,
    paymentUpdatedAt: capturedPayment?.updatedAt.toISOString() ?? null,
    providerReference: capturedPayment?.providerReference ?? null,
    capturedAmount: capturedAmount.toFixed(2),
    committedRefundAmount: committedRefundAmount.toFixed(2),
    refundedAmount: refundedAmount.toFixed(2),
    remainingRefundableAmount: remainingRefundableAmount.toFixed(2),
    canRefund,
    refundAllocations: row.refundAllocations.map((allocation) => ({
      id: allocation.id,
      refundId: allocation.refund.id,
      paymentId: allocation.refund.paymentId,
      allocatedAmount: allocation.allocatedAmount.toFixed(2),
      refundAmount: allocation.refund.amount.toFixed(2),
      currency: TRP_CURRENCY,
      authorizationType: allocation.refund.authorizationType,
      status: allocation.refund.status,
      processingMode: allocation.refund.processingMode,
      providerRefundId: allocation.refund.providerRefundId,
      reason: allocation.refund.reason,
      clientRequestId: allocation.refund.clientRequestId,
      refundOperationKey: allocation.refund.refundOperationKey,
      processingStartedAt:
        allocation.refund.processingStartedAt?.toISOString() ?? null,
      approvedAt: allocation.refund.approvedAt?.toISOString() ?? null,
      failedAt: allocation.refund.failedAt?.toISOString() ?? null,
      failureCode: allocation.refund.failureCode,
      diagnostics: toAdminRefundDiagnostics(allocation.refund.rawPayload),
      requestedByAdmin: allocation.refund.requestedByAdmin,
      createdAt: allocation.refund.createdAt.toISOString(),
      updatedAt: allocation.refund.updatedAt.toISOString(),
    })),
    canEdit: pending && !everRequested,
    canCancel: pending && activePaymentRequestId === null,
    canRequest: pending && activePaymentRequestId === null,
  };
}

function toPaymentRequestSummary(
  row: PaymentRequestRow,
  now: Date,
): AdminGuestPaymentRequestSummary {
  const effectiveStatus =
    row.status === GuestPaymentRequestStatus.PENDING && row.expiresAt <= now
      ? GuestPaymentRequestStatus.EXPIRED
      : row.status;
  const pendingAndActive =
    effectiveStatus === GuestPaymentRequestStatus.PENDING &&
    row.expiresAt > now;
  const hasAssociatedPayment = row.payment !== null;
  const hasApprovedPayment = row.payment?.status === PaymentStatus.APPROVED;

  return {
    id: row.id,
    reservationId: row.reservationId,
    status: effectiveStatus,
    totalAmount: row.totalAmount.toFixed(2),
    currency: TRP_CURRENCY,
    expiresAt: row.expiresAt.toISOString(),
    createdByAdmin: row.createdByAdmin,
    paidAt: row.paidAt?.toISOString() ?? null,
    cancelledAt: row.cancelledAt?.toISOString() ?? null,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
    canCancel: pendingAndActive && !hasAssociatedPayment,
    canCopyLink: pendingAndActive && !hasApprovedPayment,
    items: row.items.map((item) => ({
      id: item.id,
      additionalChargeId: item.additionalChargeId,
      category: item.categorySnapshot,
      description: item.descriptionSnapshot,
      amount: item.amountSnapshot.toFixed(2),
      currency: TRP_CURRENCY,
      createdAt: item.createdAt.toISOString(),
    })),
  };
}

async function expirePendingRequests(
  reservationId: string,
  transaction: Prisma.TransactionClient | typeof prisma = prisma,
  now: Date = new Date(),
): Promise<void> {
  await transaction.guestPaymentRequest.updateMany({
    where: {
      reservationId,
      status: GuestPaymentRequestStatus.PENDING,
      expiresAt: { lte: now },
    },
    data: {
      status: GuestPaymentRequestStatus.EXPIRED,
    },
  });
}

async function readReservation(
  transaction: Prisma.TransactionClient | typeof prisma,
  reservationId: string,
): Promise<EligibleReservation> {
  const reservation = await transaction.reservation.findUnique({
    where: { id: reservationId },
    select: {
      id: true,
      status: true,
      confirmedAt: true,
      currency: true,
      updatedAt: true,
    },
  });

  if (!reservation) {
    throw new AdminAdditionalChargeError(
      "ADMIN_ADDITIONAL_CHARGE_RESERVATION_NOT_FOUND",
    );
  }

  return reservation;
}

export async function getAdminAdditionalChargeManagement(
  reservationIdInput: string,
): Promise<AdminAdditionalChargeManagement> {
  const reservationId = reservationIdInput.trim();

  if (!reservationId) {
    throw new AdminAdditionalChargeError(
      "INVALID_ADMIN_ADDITIONAL_CHARGE_REQUEST",
    );
  }

  const now = new Date();
  await expirePendingRequests(reservationId, prisma, now);

  const reservation = await prisma.reservation.findUnique({
    where: { id: reservationId },
    select: {
      id: true,
      status: true,
      confirmedAt: true,
      currency: true,
      additionalCharges: {
        select: chargeSummarySelect,
        orderBy: { createdAt: "desc" },
      },
      guestPaymentRequests: {
        select: paymentRequestSummarySelect,
        orderBy: { createdAt: "desc" },
      },
    },
  });

  if (!reservation) {
    throw new AdminAdditionalChargeError(
      "ADMIN_ADDITIONAL_CHARGE_RESERVATION_NOT_FOUND",
    );
  }

  const eligible =
    reservation.confirmedAt !== null &&
    ELIGIBLE_RESERVATION_STATUSES.includes(
      reservation.status as (typeof ELIGIBLE_RESERVATION_STATUSES)[number],
    ) &&
    reservation.currency === TRP_CURRENCY;

  return {
    reservationId: reservation.id,
    reservationStatus: reservation.status,
    reservationConfirmedAt: reservation.confirmedAt?.toISOString() ?? null,
    currency: TRP_CURRENCY,
    canCreateCharge: eligible,
    refundApiExecutionEnabled: getTilopayEnv().TILOPAY_ENVIRONMENT === "sandbox",
    charges: reservation.additionalCharges.map((charge) =>
      toChargeSummary(charge, now),
    ),
    paymentRequests: reservation.guestPaymentRequests.map((request) =>
      toPaymentRequestSummary(request, now),
    ),
  };
}

export async function createAdminAdditionalCharge(
  input: CreateAdminAdditionalChargeInput,
  actor: AdminActor,
): Promise<AdminAdditionalChargeSummary> {
  const reservationId = input.reservationId.trim();
  const description = normalizeRequiredText(
    input.description,
    DESCRIPTION_MAX_LENGTH,
  );
  const internalNote = normalizeOptionalText(
    input.internalNote,
    INTERNAL_NOTE_MAX_LENGTH,
  );
  const amount = parseAmount(input.amount);

  return runAdditionalChargeTransactionWithRetry(
    async (transaction) => {
      const adminActor = await resolveAdminActor(transaction, actor);
      const reservation = await readReservation(transaction, reservationId);
      assertReservationEligible(reservation);
      await fenceEligibleReservation(transaction, reservation);

      const charge = await transaction.additionalCharge.create({
        data: {
          reservationId,
          category: input.category as AdditionalChargeCategory,
          description,
          internalNote,
          amount,
          currency: TRP_CURRENCY,
          status: AdditionalChargeStatus.PENDING,
          createdByAdminId: adminActor.id,
        },
        select: chargeSummarySelect,
      });

      await transaction.adminAuditLog.create({
        data: {
          userId: adminActor.id,
          action: "ADDITIONAL_CHARGE_CREATED",
          entityType: "AdditionalCharge",
          entityId: charge.id,
          metadata: {
            actorEmail: adminActor.email,
            reservationId,
            category: charge.category,
            amountCents: toAmountCents(charge.amount),
            currency: TRP_CURRENCY,
            status: charge.status,
          },
        },
      });

      return toChargeSummary(charge, new Date());
    },
  );
}

export async function updateAdminAdditionalCharge(
  input: UpdateAdminAdditionalChargeInput,
  actor: AdminActor,
): Promise<AdminAdditionalChargeSummary> {
  const chargeId = input.chargeId.trim();
  const expectedUpdatedAt = parseExpectedUpdatedAt(input.expectedUpdatedAt);
  const description = normalizeRequiredText(
    input.description,
    DESCRIPTION_MAX_LENGTH,
  );
  const internalNote = normalizeOptionalText(
    input.internalNote,
    INTERNAL_NOTE_MAX_LENGTH,
  );
  const amount = parseAmount(input.amount);

  return runAdditionalChargeTransactionWithRetry(
    async (transaction) => {
      const adminActor = await resolveAdminActor(transaction, actor);
      const existing = await transaction.additionalCharge.findUnique({
        where: { id: chargeId },
        select: chargeSummarySelect,
      });

      if (!existing) {
        throw new AdminAdditionalChargeError("ADMIN_ADDITIONAL_CHARGE_NOT_FOUND");
      }

      const reservation = await readReservation(
        transaction,
        existing.reservationId,
      );
      assertReservationEligible(reservation);

      if (
        existing.status !== AdditionalChargeStatus.PENDING ||
        existing.paymentRequestItems.length > 0
      ) {
        throw new AdminAdditionalChargeError(
          "ADMIN_ADDITIONAL_CHARGE_NOT_EDITABLE",
        );
      }

      if (existing.updatedAt.getTime() !== expectedUpdatedAt.getTime()) {
        throw new AdminAdditionalChargeError("ADMIN_ADDITIONAL_CHARGE_STALE");
      }

      const updated = await transaction.additionalCharge.updateMany({
        where: {
          id: chargeId,
          status: AdditionalChargeStatus.PENDING,
          updatedAt: expectedUpdatedAt,
        },
        data: {
          category: input.category as AdditionalChargeCategory,
          description,
          internalNote,
          amount,
        },
      });

      if (updated.count !== 1) {
        throw new AdminAdditionalChargeError("ADMIN_ADDITIONAL_CHARGE_STALE");
      }

      const charge = await transaction.additionalCharge.findUnique({
        where: { id: chargeId },
        select: chargeSummarySelect,
      });

      if (!charge || charge.paymentRequestItems.length > 0) {
        throw new AdminAdditionalChargeError(
          "ADMIN_ADDITIONAL_CHARGE_NOT_EDITABLE",
        );
      }

      await transaction.adminAuditLog.create({
        data: {
          userId: adminActor.id,
          action: "ADDITIONAL_CHARGE_UPDATED",
          entityType: "AdditionalCharge",
          entityId: charge.id,
          metadata: {
            actorEmail: adminActor.email,
            reservationId: charge.reservationId,
            category: charge.category,
            amountCents: toAmountCents(charge.amount),
            currency: TRP_CURRENCY,
          },
        },
      });

      return toChargeSummary(charge, new Date());
    },
  );
}

export async function cancelAdminAdditionalCharge(
  input: CancelAdminAdditionalChargeInput,
  actor: AdminActor,
): Promise<AdminAdditionalChargeSummary> {
  const chargeId = input.chargeId.trim();
  const expectedUpdatedAt = parseExpectedUpdatedAt(input.expectedUpdatedAt);
  const now = new Date();

  return runAdditionalChargeTransactionWithRetry(
    async (transaction) => {
      const adminActor = await resolveAdminActor(transaction, actor);
      const existing = await transaction.additionalCharge.findUnique({
        where: { id: chargeId },
        select: chargeSummarySelect,
      });

      if (!existing) {
        throw new AdminAdditionalChargeError("ADMIN_ADDITIONAL_CHARGE_NOT_FOUND");
      }

      await expirePendingRequests(existing.reservationId, transaction, now);

      if (existing.status !== AdditionalChargeStatus.PENDING) {
        throw new AdminAdditionalChargeError(
          "ADMIN_ADDITIONAL_CHARGE_NOT_EDITABLE",
        );
      }

      if (existing.updatedAt.getTime() !== expectedUpdatedAt.getTime()) {
        throw new AdminAdditionalChargeError("ADMIN_ADDITIONAL_CHARGE_STALE");
      }

      const activeRequest = await transaction.guestPaymentRequestItem.findFirst({
        where: {
          additionalChargeId: chargeId,
          paymentRequest: {
            status: GuestPaymentRequestStatus.PENDING,
            expiresAt: { gt: now },
          },
        },
        select: { paymentRequestId: true },
      });

      if (activeRequest) {
        throw new AdminAdditionalChargeError(
          "ADMIN_ADDITIONAL_CHARGE_ACTIVE_REQUEST",
        );
      }

      const cancelled = await transaction.additionalCharge.updateMany({
        where: {
          id: chargeId,
          status: AdditionalChargeStatus.PENDING,
          updatedAt: expectedUpdatedAt,
        },
        data: {
          status: AdditionalChargeStatus.CANCELLED,
          cancelledAt: now,
        },
      });

      if (cancelled.count !== 1) {
        throw new AdminAdditionalChargeError("ADMIN_ADDITIONAL_CHARGE_STALE");
      }

      const charge = await transaction.additionalCharge.findUnique({
        where: { id: chargeId },
        select: chargeSummarySelect,
      });

      if (!charge) {
        throw new AdminAdditionalChargeError("ADMIN_ADDITIONAL_CHARGE_NOT_FOUND");
      }

      await transaction.adminAuditLog.create({
        data: {
          userId: adminActor.id,
          action: "ADDITIONAL_CHARGE_CANCELLED",
          entityType: "AdditionalCharge",
          entityId: charge.id,
          metadata: {
            actorEmail: adminActor.email,
            reservationId: charge.reservationId,
            category: charge.category,
            amountCents: toAmountCents(charge.amount),
            currency: TRP_CURRENCY,
          },
        },
      });

      return toChargeSummary(charge, now);
    },
  );
}

function normalizeRequestCharges(
  input: CreateAdminGuestPaymentRequestInput,
): readonly Readonly<{ chargeId: string; expectedUpdatedAt: Date }>[] {
  if (input.charges.length === 0 || input.charges.length > 50) {
    throw new AdminAdditionalChargeError(
      "ADMIN_GUEST_PAYMENT_REQUEST_CHARGES_REQUIRED",
    );
  }

  const normalized = input.charges.map((charge) => ({
    chargeId: charge.chargeId.trim(),
    expectedUpdatedAt: parseExpectedUpdatedAt(charge.expectedUpdatedAt),
  }));
  const ids = normalized.map((charge) => charge.chargeId);

  if (ids.some((id) => !id) || new Set(ids).size !== ids.length) {
    throw new AdminAdditionalChargeError(
      "INVALID_ADMIN_ADDITIONAL_CHARGE_REQUEST",
    );
  }

  return normalized;
}

function requestMatchesChargeIds(
  request: PaymentRequestRow,
  chargeIds: readonly string[],
): boolean {
  const expected = [...chargeIds].sort();
  const actual = request.items.map((item) => item.additionalChargeId).sort();

  return (
    request.reservationId.length > 0 &&
    expected.length === actual.length &&
    expected.every((id, index) => id === actual[index])
  );
}

export async function createAdminGuestPaymentRequest(
  input: CreateAdminGuestPaymentRequestInput,
  actor: AdminActor,
): Promise<AdminGuestPaymentRequestSummary> {
  const reservationId = input.reservationId.trim();
  const clientRequestId = normalizeClientRequestId(input.clientRequestId);
  const requestedCharges = normalizeRequestCharges(input);
  const chargeIds = requestedCharges.map((charge) => charge.chargeId);
  const now = new Date();

  try {
    return await runAdditionalChargeTransactionWithRetry(
      async (transaction) => {
        const adminActor = await resolveAdminActor(transaction, actor);
        await expirePendingRequests(reservationId, transaction, now);

        const existingRequest = await transaction.guestPaymentRequest.findUnique({
          where: { clientRequestId },
          select: paymentRequestSummarySelect,
        });

        if (existingRequest) {
          if (
            existingRequest.reservationId !== reservationId ||
            !requestMatchesChargeIds(existingRequest, chargeIds)
          ) {
            throw new AdminAdditionalChargeError(
              "ADMIN_GUEST_PAYMENT_REQUEST_IDEMPOTENCY_CONFLICT",
            );
          }

          return toPaymentRequestSummary(existingRequest, now);
        }

        const reservation = await readReservation(transaction, reservationId);
        assertReservationEligible(reservation);
        await fenceEligibleReservation(transaction, reservation);

        const charges = await transaction.additionalCharge.findMany({
          where: {
            id: { in: chargeIds },
            reservationId,
          },
          select: chargeSummarySelect,
        });

        if (charges.length !== chargeIds.length) {
          throw new AdminAdditionalChargeError(
            "ADMIN_GUEST_PAYMENT_REQUEST_CHARGE_NOT_ELIGIBLE",
          );
        }

        const chargeById = new Map(charges.map((charge) => [charge.id, charge]));

        for (const requested of requestedCharges) {
          const charge = chargeById.get(requested.chargeId);

          if (
            !charge ||
            charge.status !== AdditionalChargeStatus.PENDING ||
            charge.currency !== TRP_CURRENCY ||
            charge.updatedAt.getTime() !== requested.expectedUpdatedAt.getTime()
          ) {
            throw new AdminAdditionalChargeError(
              "ADMIN_GUEST_PAYMENT_REQUEST_CHARGE_NOT_ELIGIBLE",
            );
          }

          const fence = await transaction.additionalCharge.updateMany({
            where: {
              id: charge.id,
              reservationId,
              status: AdditionalChargeStatus.PENDING,
              currency: TRP_CURRENCY,
              updatedAt: requested.expectedUpdatedAt,
            },
            data: {
              updatedAt: charge.updatedAt,
            },
          });

          if (fence.count !== 1) {
            throw new AdminAdditionalChargeError(
              "ADMIN_GUEST_PAYMENT_REQUEST_CHARGE_NOT_ELIGIBLE",
            );
          }
        }

        const activeMembership =
          await transaction.guestPaymentRequestItem.findFirst({
            where: {
              additionalChargeId: { in: chargeIds },
              paymentRequest: {
                status: GuestPaymentRequestStatus.PENDING,
                expiresAt: { gt: now },
              },
            },
            select: { additionalChargeId: true },
          });

        if (activeMembership) {
          throw new AdminAdditionalChargeError(
            "ADMIN_GUEST_PAYMENT_REQUEST_ACTIVE_CONFLICT",
          );
        }

        const orderedCharges = chargeIds.map((id) => {
          const charge = chargeById.get(id);

          if (!charge) {
            throw new AdminAdditionalChargeError(
              "ADMIN_GUEST_PAYMENT_REQUEST_CHARGE_NOT_ELIGIBLE",
            );
          }

          return charge;
        });
        const totalAmount = orderedCharges.reduce(
          (total, charge) => total.add(charge.amount),
          new Prisma.Decimal(0),
        );
        const requestCreatedAt = new Date();
        const expiresAt = new Date(
          requestCreatedAt.getTime() +
            GUEST_PAYMENT_REQUEST_EXPIRY_HOURS * 60 * 60 * 1_000,
        );
        const tokenMaterial =
          createGuestPaymentRequestTokenMaterial(reservationId);

        const request = await transaction.guestPaymentRequest.create({
          data: {
            reservationId,
            status: GuestPaymentRequestStatus.PENDING,
            totalAmount,
            currency: TRP_CURRENCY,
            accessTokenHash: tokenMaterial.tokenHash,
            accessTokenEncrypted: tokenMaterial.encryptedToken,
            expiresAt,
            createdByAdminId: adminActor.id,
            clientRequestId,
            createdAt: requestCreatedAt,
            items: {
              create: orderedCharges.map((charge) => ({
                additionalChargeId: charge.id,
                categorySnapshot: charge.category,
                descriptionSnapshot: charge.description,
                amountSnapshot: charge.amount,
                currencySnapshot: TRP_CURRENCY,
              })),
            },
          },
          select: paymentRequestSummarySelect,
        });

        await transaction.adminAuditLog.create({
          data: {
            userId: adminActor.id,
            action: "GUEST_PAYMENT_REQUEST_CREATED",
            entityType: "GuestPaymentRequest",
            entityId: request.id,
            metadata: {
              actorEmail: adminActor.email,
              reservationId,
              chargeIds,
              chargeCount: chargeIds.length,
              totalAmountCents: toAmountCents(totalAmount),
              currency: TRP_CURRENCY,
              status: request.status,
              expiresAt: expiresAt.toISOString(),
              clientRequestId,
            },
          },
        });

        return toPaymentRequestSummary(request, now);
      },
    );
  } catch (error) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      (error.code === "P2002" || error.code === "P2034")
    ) {
      const existing = await prisma.guestPaymentRequest.findUnique({
        where: { clientRequestId },
        select: paymentRequestSummarySelect,
      });

      if (
        existing &&
        existing.reservationId === reservationId &&
        requestMatchesChargeIds(existing, chargeIds)
      ) {
        return toPaymentRequestSummary(existing, new Date());
      }

      if (error.code === "P2002") {
        throw new AdminAdditionalChargeError(
          "ADMIN_GUEST_PAYMENT_REQUEST_IDEMPOTENCY_CONFLICT",
        );
      }

      throw new AdminAdditionalChargeError(
        "ADMIN_GUEST_PAYMENT_REQUEST_ACTIVE_CONFLICT",
      );
    }

    throw error;
  }
}

export async function cancelAdminGuestPaymentRequest(
  input: CancelAdminGuestPaymentRequestInput,
  actor: AdminActor,
): Promise<AdminGuestPaymentRequestSummary> {
  const requestId = input.requestId.trim();
  const expectedUpdatedAt = parseExpectedUpdatedAt(input.expectedUpdatedAt);
  const now = new Date();

  return runAdditionalChargeTransactionWithRetry(
    async (transaction) => {
      const adminActor = await resolveAdminActor(transaction, actor);
      const existing = await transaction.guestPaymentRequest.findUnique({
        where: { id: requestId },
        select: paymentRequestSummarySelect,
      });

      if (!existing) {
        throw new AdminAdditionalChargeError(
          "ADMIN_GUEST_PAYMENT_REQUEST_NOT_FOUND",
        );
      }

      if (
        existing.status !== GuestPaymentRequestStatus.PENDING ||
        existing.expiresAt <= now ||
        existing.payment
      ) {
        throw new AdminAdditionalChargeError(
          "ADMIN_GUEST_PAYMENT_REQUEST_NOT_CANCELLABLE",
        );
      }

      if (existing.updatedAt.getTime() !== expectedUpdatedAt.getTime()) {
        throw new AdminAdditionalChargeError(
          "ADMIN_GUEST_PAYMENT_REQUEST_STALE",
        );
      }

      const cancelled = await transaction.guestPaymentRequest.updateMany({
        where: {
          id: requestId,
          status: GuestPaymentRequestStatus.PENDING,
          expiresAt: { gt: now },
          payment: { is: null },
          updatedAt: expectedUpdatedAt,
        },
        data: {
          status: GuestPaymentRequestStatus.CANCELLED,
          cancelledAt: now,
        },
      });

      if (cancelled.count !== 1) {
        throw new AdminAdditionalChargeError(
          "ADMIN_GUEST_PAYMENT_REQUEST_STALE",
        );
      }

      const request = await transaction.guestPaymentRequest.findUnique({
        where: { id: requestId },
        select: paymentRequestSummarySelect,
      });

      if (!request) {
        throw new AdminAdditionalChargeError(
          "ADMIN_GUEST_PAYMENT_REQUEST_NOT_FOUND",
        );
      }

      await transaction.adminAuditLog.create({
        data: {
          userId: adminActor.id,
          action: "GUEST_PAYMENT_REQUEST_CANCELLED",
          entityType: "GuestPaymentRequest",
          entityId: request.id,
          metadata: {
            actorEmail: adminActor.email,
            reservationId: request.reservationId,
            chargeIds: request.items.map((item) => item.additionalChargeId),
            totalAmountCents: toAmountCents(request.totalAmount),
            currency: TRP_CURRENCY,
            status: request.status,
            cancelledAt: now.toISOString(),
          },
        },
      });

      return toPaymentRequestSummary(request, now);
    },
  );
}
