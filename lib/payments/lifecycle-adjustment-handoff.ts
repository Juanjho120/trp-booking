import {
  createCipheriv,
  createDecipheriv,
  createHash,
  randomBytes,
} from "crypto";

import {
  LifecycleRequestHoldStatus,
  PaymentProvider,
  PaymentPurpose,
  PaymentStatus,
  Prisma,
  ReservationLifecycleRequestStatus,
  ReservationLifecycleRequestType,
  ReservationStatus,
} from "@prisma/client";

import { dateOnlyFromDate } from "@/lib/availability/rules";
import { prisma } from "@/lib/db/prisma";
import { validateServerEnv } from "@/lib/env/server";
import { expireLifecycleAdjustmentRequestIfNeeded } from "@/lib/reservations/lifecycle-adjustment-holds";
import type { DateOnlyString } from "@/types/availability";

const TOKEN_PREFIX = "lah1.";
const TOKEN_CONTEXT = "trp-booking/lifecycle-adjustment-handoff/v1";
const TOKEN_IV_BYTES = 12;
const TOKEN_TAG_BYTES = 16;
const TOKEN_MAX_LENGTH = 4_096;

export type LifecycleAdjustmentHandoffErrorCode =
  | "INVALID_LIFECYCLE_ADJUSTMENT_HANDOFF"
  | "LIFECYCLE_ADJUSTMENT_HANDOFF_EXPIRED"
  | "LIFECYCLE_ADJUSTMENT_NOT_PAYABLE"
  | "LIFECYCLE_ADJUSTMENT_PAYMENT_MISMATCH";

export class LifecycleAdjustmentHandoffError extends Error {
  constructor(public readonly code: LifecycleAdjustmentHandoffErrorCode) {
    super(code);
    this.name = "LifecycleAdjustmentHandoffError";
  }
}

type LifecycleAdjustmentTokenPayload = Readonly<{
  version: 1;
  purpose: "LIFECYCLE_ADJUSTMENT";
  lifecycleRequestId: string;
  holdId: string;
  paymentId: string;
  expiresAt: string;
}>;

export type LifecycleAdjustmentHandoffSummary = Readonly<{
  token: string;
  reservationId: string;
  lifecycleRequestId: string;
  paymentId: string;
  requestType: "DATE_CHANGE" | "STAY_EXTENSION";
  requestStatus: "AWAITING_ADJUSTMENT_PAYMENT" | "COMPLETED";
  completedAt: string | null;
  paymentStatus:
    | "PENDING"
    | "APPROVED"
    | "REJECTED"
    | "FAILED"
    | "REFUNDED"
    | "PARTIALLY_REFUNDED";
  amount: string;
  currency: string;
  originalCheckInDate: DateOnlyString;
  originalCheckOutDate: DateOnlyString;
  requestedCheckInDate: DateOnlyString;
  requestedCheckOutDate: DateOnlyString;
  guestName: string;
  guestEmail: string;
  locale: "es" | "en";
  holdExpiresAt: string;
  payable: boolean;
}>;

export type PreparedLifecycleAdjustmentPayment = Readonly<{
  token: string;
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

function getEncryptionKey(): Buffer {
  const secret = validateServerEnv().AUTH_SECRET;
  return createHash("sha256")
    .update(`${TOKEN_CONTEXT}:${secret}`, "utf8")
    .digest();
}

function parsePayload(value: unknown): LifecycleAdjustmentTokenPayload {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new LifecycleAdjustmentHandoffError(
      "INVALID_LIFECYCLE_ADJUSTMENT_HANDOFF",
    );
  }

  const record = value as Record<string, unknown>;
  const expiresAt =
    typeof record.expiresAt === "string" ? new Date(record.expiresAt) : null;

  if (
    record.version !== 1 ||
    record.purpose !== "LIFECYCLE_ADJUSTMENT" ||
    typeof record.lifecycleRequestId !== "string" ||
    !record.lifecycleRequestId ||
    typeof record.holdId !== "string" ||
    !record.holdId ||
    typeof record.paymentId !== "string" ||
    !record.paymentId ||
    !expiresAt ||
    Number.isNaN(expiresAt.getTime())
  ) {
    throw new LifecycleAdjustmentHandoffError(
      "INVALID_LIFECYCLE_ADJUSTMENT_HANDOFF",
    );
  }

  return {
    version: 1,
    purpose: "LIFECYCLE_ADJUSTMENT",
    lifecycleRequestId: record.lifecycleRequestId,
    holdId: record.holdId,
    paymentId: record.paymentId,
    expiresAt: expiresAt.toISOString(),
  };
}

export function isLifecycleAdjustmentHandoffToken(value: string): boolean {
  return value.trim().startsWith(TOKEN_PREFIX);
}

export function createLifecycleAdjustmentHandoffToken(
  payload: Omit<LifecycleAdjustmentTokenPayload, "version" | "purpose">,
): string {
  const normalized = parsePayload({
    version: 1,
    purpose: "LIFECYCLE_ADJUSTMENT",
    ...payload,
  });
  const iv = randomBytes(TOKEN_IV_BYTES);
  const cipher = createCipheriv("aes-256-gcm", getEncryptionKey(), iv);
  cipher.setAAD(Buffer.from(TOKEN_CONTEXT, "utf8"));
  const encrypted = Buffer.concat([
    cipher.update(JSON.stringify(normalized), "utf8"),
    cipher.final(),
  ]);
  const tag = cipher.getAuthTag();

  return `${TOKEN_PREFIX}${Buffer.concat([iv, tag, encrypted]).toString(
    "base64url",
  )}`;
}

export function readLifecycleAdjustmentHandoffToken(
  token: string,
): LifecycleAdjustmentTokenPayload {
  const normalizedToken = token.trim();

  if (
    !isLifecycleAdjustmentHandoffToken(normalizedToken) ||
    normalizedToken.length > TOKEN_MAX_LENGTH
  ) {
    throw new LifecycleAdjustmentHandoffError(
      "INVALID_LIFECYCLE_ADJUSTMENT_HANDOFF",
    );
  }

  try {
    const packed = Buffer.from(
      normalizedToken.slice(TOKEN_PREFIX.length),
      "base64url",
    );

    if (packed.length <= TOKEN_IV_BYTES + TOKEN_TAG_BYTES) {
      throw new Error("invalid token size");
    }

    const iv = packed.subarray(0, TOKEN_IV_BYTES);
    const tag = packed.subarray(
      TOKEN_IV_BYTES,
      TOKEN_IV_BYTES + TOKEN_TAG_BYTES,
    );
    const encrypted = packed.subarray(TOKEN_IV_BYTES + TOKEN_TAG_BYTES);
    const decipher = createDecipheriv("aes-256-gcm", getEncryptionKey(), iv);
    decipher.setAAD(Buffer.from(TOKEN_CONTEXT, "utf8"));
    decipher.setAuthTag(tag);
    const decrypted = Buffer.concat([
      decipher.update(encrypted),
      decipher.final(),
    ]).toString("utf8");

    return parsePayload(JSON.parse(decrypted) as unknown);
  } catch (error) {
    if (error instanceof LifecycleAdjustmentHandoffError) {
      throw error;
    }

    throw new LifecycleAdjustmentHandoffError(
      "INVALID_LIFECYCLE_ADJUSTMENT_HANDOFF",
    );
  }
}

function toRequestType(
  requestType: ReservationLifecycleRequestType,
): "DATE_CHANGE" | "STAY_EXTENSION" {
  if (
    requestType !== ReservationLifecycleRequestType.DATE_CHANGE &&
    requestType !== ReservationLifecycleRequestType.STAY_EXTENSION
  ) {
    throw new LifecycleAdjustmentHandoffError(
      "INVALID_LIFECYCLE_ADJUSTMENT_HANDOFF",
    );
  }

  return requestType;
}

function toLocale(value: string): "es" | "en" {
  return value === "en" ? "en" : "es";
}

async function readValidatedHandoffRecord(
  token: string,
  options: Readonly<{
    allowRetryablePayment: boolean;
    allowCompleted: boolean;
  }>,
) {
  const payload = readLifecycleAdjustmentHandoffToken(token);
  await expireLifecycleAdjustmentRequestIfNeeded(payload.lifecycleRequestId);

  const request = await prisma.reservationLifecycleRequest.findUnique({
    where: { id: payload.lifecycleRequestId },
    select: {
      id: true,
      reservationId: true,
      requestType: true,
      status: true,
      completedAt: true,
      financialDifference: true,
      currency: true,
      originalCheckInDate: true,
      originalCheckOutDate: true,
      requestedCheckInDate: true,
      requestedCheckOutDate: true,
      originalPreferredLocale: true,
      hold: {
        select: {
          id: true,
          status: true,
          expiresAt: true,
        },
      },
      reservation: {
        select: {
          status: true,
          guestName: true,
          guestEmail: true,
          guestPhone: true,
          guestCountry: true,
        },
      },
      adjustmentPayments: {
        where: { id: payload.paymentId },
        select: {
          id: true,
          reservationId: true,
          lifecycleRequestId: true,
          provider: true,
          purpose: true,
          status: true,
          amount: true,
          currency: true,
          providerReference: true,
        },
      },
    },
  });

  const payment = request?.adjustmentPayments[0];
  const financialDifference = request?.financialDifference;
  const requestedCheckInDate = request?.requestedCheckInDate;
  const requestedCheckOutDate = request?.requestedCheckOutDate;

  if (
    !request ||
    !payment ||
    !request.hold ||
    request.hold.id !== payload.holdId ||
    payment.id !== payload.paymentId ||
    payment.reservationId !== request.reservationId ||
    payment.lifecycleRequestId !== request.id ||
    payment.provider !== PaymentProvider.TILOPAY ||
    payment.purpose !== PaymentPurpose.LIFECYCLE_ADJUSTMENT ||
    !financialDifference ||
    financialDifference.lessThanOrEqualTo(0) ||
    payment.amount.comparedTo(financialDifference) !== 0 ||
    payment.currency !== request.currency ||
    !requestedCheckInDate ||
    !requestedCheckOutDate ||
    request.reservation.status !== ReservationStatus.CONFIRMED
  ) {
    throw new LifecycleAdjustmentHandoffError(
      "LIFECYCLE_ADJUSTMENT_PAYMENT_MISMATCH",
    );
  }

  const now = new Date();

  const activeState =
    request.status ===
      ReservationLifecycleRequestStatus.AWAITING_ADJUSTMENT_PAYMENT &&
    request.hold.status === LifecycleRequestHoldStatus.ACTIVE &&
    request.hold.expiresAt > now;
  const completedState =
    options.allowCompleted &&
    request.status === ReservationLifecycleRequestStatus.COMPLETED &&
    request.hold.status === LifecycleRequestHoldStatus.RELEASED &&
    payment.status === PaymentStatus.APPROVED;

  if (
    new Date(payload.expiresAt) <= now ||
    (!activeState && !completedState)
  ) {
    throw new LifecycleAdjustmentHandoffError(
      "LIFECYCLE_ADJUSTMENT_HANDOFF_EXPIRED",
    );
  }

  const safelyRetryableFailure =
    payment.status === PaymentStatus.FAILED && !payment.providerReference;
  const accepted =
    payment.status === PaymentStatus.PENDING ||
    (options.allowRetryablePayment &&
      (payment.status === PaymentStatus.REJECTED || safelyRetryableFailure));

  if (!accepted) {
    if (payment.status === PaymentStatus.APPROVED) {
      return { payload, request, payment, alreadyApproved: true };
    }

    throw new LifecycleAdjustmentHandoffError(
      "LIFECYCLE_ADJUSTMENT_NOT_PAYABLE",
    );
  }

  return { payload, request, payment, alreadyApproved: false };
}

export async function getLifecycleAdjustmentHandoffSummary(
  token: string,
): Promise<LifecycleAdjustmentHandoffSummary> {
  const record = await readValidatedHandoffRecord(token, {
    allowRetryablePayment: true,
    allowCompleted: true,
  });
  const { request, payment } = record;

  return {
    token,
    reservationId: request.reservationId,
    lifecycleRequestId: request.id,
    paymentId: payment.id,
    requestType: toRequestType(request.requestType),
    requestStatus:
      request.status === ReservationLifecycleRequestStatus.COMPLETED
        ? "COMPLETED"
        : "AWAITING_ADJUSTMENT_PAYMENT",
    completedAt: request.completedAt?.toISOString() ?? null,
    paymentStatus: payment.status,
    amount: payment.amount.toFixed(2),
    currency: payment.currency,
    originalCheckInDate: dateOnlyFromDate(request.originalCheckInDate),
    originalCheckOutDate: dateOnlyFromDate(request.originalCheckOutDate),
    requestedCheckInDate: dateOnlyFromDate(request.requestedCheckInDate!),
    requestedCheckOutDate: dateOnlyFromDate(request.requestedCheckOutDate!),
    guestName: request.reservation.guestName,
    guestEmail: request.reservation.guestEmail,
    locale: toLocale(request.originalPreferredLocale),
    holdExpiresAt: request.hold!.expiresAt.toISOString(),
    payable:
      request.status ===
        ReservationLifecycleRequestStatus.AWAITING_ADJUSTMENT_PAYMENT &&
      request.hold!.status === LifecycleRequestHoldStatus.ACTIVE &&
      payment.status !== PaymentStatus.APPROVED,
  };
}

export async function prepareLifecycleAdjustmentPayment(
  token: string,
): Promise<PreparedLifecycleAdjustmentPayment> {
  const initial = await readValidatedHandoffRecord(token, {
    allowRetryablePayment: true,
    allowCompleted: false,
  });

  if (initial.alreadyApproved) {
    throw new LifecycleAdjustmentHandoffError(
      "LIFECYCLE_ADJUSTMENT_NOT_PAYABLE",
    );
  }

  let payment = initial.payment;

  if (
    payment.status === PaymentStatus.REJECTED ||
    (payment.status === PaymentStatus.FAILED &&
      !payment.providerReference)
  ) {
    payment = await prisma.$transaction(
      async (transaction) => {
        const currentRequest = await transaction.reservationLifecycleRequest.findUnique({
          where: { id: initial.request.id },
          select: {
            id: true,
            reservationId: true,
            requestType: true,
            createdByAdminId: true,
            reviewedByAdminId: true,
            status: true,
            financialDifference: true,
            currency: true,
            hold: { select: { status: true, expiresAt: true } },
            adjustmentPayments: {
              where: {
                purpose: PaymentPurpose.LIFECYCLE_ADJUSTMENT,
                status: {
                  in: [PaymentStatus.PENDING, PaymentStatus.APPROVED],
                },
              },
              orderBy: [{ createdAt: "desc" }, { id: "desc" }],
              select: {
                id: true,
                reservationId: true,
                lifecycleRequestId: true,
                provider: true,
                purpose: true,
                status: true,
                amount: true,
                currency: true,
                providerReference: true,
              },
            },
          },
        });

        if (
          !currentRequest?.hold ||
          currentRequest.status !==
            ReservationLifecycleRequestStatus.AWAITING_ADJUSTMENT_PAYMENT ||
          currentRequest.hold.status !== LifecycleRequestHoldStatus.ACTIVE ||
          currentRequest.hold.expiresAt <= new Date() ||
          !currentRequest.financialDifference ||
          currentRequest.financialDifference.lessThanOrEqualTo(0)
        ) {
          throw new LifecycleAdjustmentHandoffError(
            "LIFECYCLE_ADJUSTMENT_HANDOFF_EXPIRED",
          );
        }

        const approved = currentRequest.adjustmentPayments.find(
          (candidate) => candidate.status === PaymentStatus.APPROVED,
        );

        if (approved) {
          throw new LifecycleAdjustmentHandoffError(
            "LIFECYCLE_ADJUSTMENT_NOT_PAYABLE",
          );
        }

        const existingPending = currentRequest.adjustmentPayments.find(
          (candidate) => candidate.status === PaymentStatus.PENDING,
        );

        if (existingPending) {
          return existingPending;
        }

        const createdPayment = await transaction.payment.create({
          data: {
            reservationId: currentRequest.reservationId,
            lifecycleRequestId: currentRequest.id,
            provider: PaymentProvider.TILOPAY,
            purpose: PaymentPurpose.LIFECYCLE_ADJUSTMENT,
            status: PaymentStatus.PENDING,
            amount: currentRequest.financialDifference,
            currency: currentRequest.currency,
          },
          select: {
            id: true,
            reservationId: true,
            lifecycleRequestId: true,
            provider: true,
            purpose: true,
            status: true,
            amount: true,
            currency: true,
            providerReference: true,
          },
        });

        await transaction.adminAuditLog.create({
          data: {
            userId:
              currentRequest.reviewedByAdminId ??
              currentRequest.createdByAdminId,
            action: "LIFECYCLE_ADJUSTMENT_PAYMENT_CREATED",
            entityType: "Payment",
            entityId: createdPayment.id,
            metadata: {
              source: "guest_retry_within_active_hold",
              reservationId: currentRequest.reservationId,
              lifecycleRequestId: currentRequest.id,
              requestType: currentRequest.requestType,
              purpose: PaymentPurpose.LIFECYCLE_ADJUSTMENT,
              amount: currentRequest.financialDifference.toFixed(2),
              currency: currentRequest.currency,
              providerCalled: false,
            },
          },
        });

        return createdPayment;
      },
      { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
    );
  }

  const currentToken = createLifecycleAdjustmentHandoffToken({
    lifecycleRequestId: initial.request.id,
    holdId: initial.request.hold!.id,
    paymentId: payment.id,
    expiresAt: initial.request.hold!.expiresAt.toISOString(),
  });

  return {
    token: currentToken,
    payment,
    reservation: initial.request.reservation,
    locale: toLocale(initial.request.originalPreferredLocale),
    expiresAt: initial.request.hold!.expiresAt.toISOString(),
  };
}

export async function resolveLifecycleAdjustmentClientEventReservation(
  token: string,
  paymentId: string,
): Promise<string> {
  const record = await readValidatedHandoffRecord(token, {
    allowRetryablePayment: true,
    allowCompleted: false,
  });

  if (record.payment.id !== paymentId) {
    throw new LifecycleAdjustmentHandoffError(
      "LIFECYCLE_ADJUSTMENT_PAYMENT_MISMATCH",
    );
  }

  return record.request.reservationId;
}
