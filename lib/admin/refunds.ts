import {
  PaymentPurpose,
  PaymentStatus,
  Prisma,
  RefundProcessingMode,
  RefundStatus,
  ReservationLifecycleRequestStatus,
  ReservationLifecycleRequestType,
  ReservationStatus,
} from "@prisma/client";

import { prisma } from "@/lib/db/prisma";
import { getTilopayEnv } from "@/lib/env/server";
import {
  classifyTilopayConsultCandidate,
  classifyTilopayModificationObservation,
  observeTilopayConsultTransaction,
  processTilopayModification,
  TilopayApiClientError,
  type TilopayConsultCandidate,
  type TilopayModificationObservation,
} from "@/lib/payments";
import type { AdminActor } from "@/types/admin";
import type {
  AdminRefundAuthorizationResult,
  AdminRefundConsultResult,
  AdminRefundErrorCode,
  AdminRefundExecutionResult,
  AdminRefundReconciliationResult,
  AdminRefundSummary,
  ConsultAdminRefundInput,
  CreateAdminRefundInput,
  ExecuteAdminRefundInput,
  ReconcileAdminRefundInput,
} from "@/types/admin-refund";

import { resolveAdminActor } from "./admin-actor";

const REFUND_REASON_MAX_LENGTH = 2_000;
const RECONCILIATION_NOTE_MAX_LENGTH = 2_000;
const PROVIDER_REFERENCE_MAX_LENGTH = 180;
const SAFE_DESCRIPTION_MAX_LENGTH = 240;
const SAFE_CODE_MAX_LENGTH = 100;
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
const REFUNDABLE_PAYMENT_STATUSES = [
  PaymentStatus.APPROVED,
  PaymentStatus.PARTIALLY_REFUNDED,
] as const;
const REFUND_PAYMENT_HISTORY_STATUSES = [
  ...REFUNDABLE_PAYMENT_STATUSES,
  PaymentStatus.REFUNDED,
] as const;

const refundSummarySelect = {
  id: true,
  paymentId: true,
  lifecycleRequestId: true,
  clientRequestId: true,
  providerRefundId: true,
  amount: true,
  currency: true,
  reason: true,
  status: true,
  processingMode: true,
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
} satisfies Prisma.RefundSelect;

type RefundSummaryRecord = Prisma.RefundGetPayload<{
  select: typeof refundSummarySelect;
}>;

const lifecycleRequestForRefundSelect = {
  id: true,
  requestType: true,
  status: true,
  version: true,
  updatedAt: true,
  sourcePaymentId: true,
  currency: true,
  standardRefundPercentage: true,
  standardRefundAmount: true,
  approvedRefundPercentage: true,
  approvedRefundAmount: true,
  policyExceptionApplied: true,
  reservation: {
    select: {
      id: true,
      status: true,
      cancelledAt: true,
    },
  },
  sourcePayment: {
    select: {
      id: true,
      purpose: true,
      status: true,
      amount: true,
      currency: true,
      providerReference: true,
      updatedAt: true,
    },
  },
} satisfies Prisma.ReservationLifecycleRequestSelect;

type LifecycleRequestForRefund = Prisma.ReservationLifecycleRequestGetPayload<{
  select: typeof lifecycleRequestForRefundSelect;
}>;

const refundForActionSelect = {
  ...refundSummarySelect,
  payment: {
    select: {
      id: true,
      reservationId: true,
      purpose: true,
      providerReference: true,
      status: true,
      amount: true,
      currency: true,
      updatedAt: true,
      reservation: {
        select: {
          status: true,
        },
      },
    },
  },
} satisfies Prisma.RefundSelect;

type RefundForAction = Prisma.RefundGetPayload<{
  select: typeof refundForActionSelect;
}>;

export class AdminRefundError extends Error {
  constructor(public readonly code: AdminRefundErrorCode) {
    super(code);
    this.name = "AdminRefundError";
  }
}

function isJsonRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function normalizeRequiredText(value: string, maximumLength: number): string {
  return value.trim().replace(/\s+/g, " ").slice(0, maximumLength);
}

function normalizeOptionalText(
  value: string | null | undefined,
  maximumLength: number,
): string | null {
  if (!value) {
    return null;
  }

  const normalized = value.trim().replace(/\s+/g, " ");
  return normalized ? normalized.slice(0, maximumLength) : null;
}

function parsePositiveAmount(value: string): Prisma.Decimal {
  const normalized = value.trim();

  if (!/^\d{1,8}(?:\.\d{1,2})?$/.test(normalized)) {
    throw new AdminRefundError("INVALID_ADMIN_REFUND_REQUEST");
  }

  const amount = new Prisma.Decimal(normalized).toDecimalPlaces(2);

  if (!amount.greaterThan(0)) {
    throw new AdminRefundError("INVALID_ADMIN_REFUND_REQUEST");
  }

  return amount;
}

function toSafeJson(value: Record<string, unknown>): Prisma.InputJsonObject {
  return JSON.parse(JSON.stringify(value)) as Prisma.InputJsonObject;
}

function buildSafeDiagnostics(input: Readonly<{
  source: string;
  observedAt: string;
  httpStatus?: number | null;
  responseCode?: string | null;
  description?: string | null;
  providerReference?: string | null;
  orderNumber?: string | null;
  amount?: string | null;
  currency?: string | null;
  modificationType?: string | null;
  candidateCount?: number | null;
  resultClassification: string;
  responseShape?: Readonly<Record<string, unknown>> | null;
  requestId?: string;
  reconciliationSource?: string;
  note?: string;
}>): Prisma.InputJsonObject {
  return toSafeJson({
    safe: true,
    schemaVersion: 1,
    source: input.source,
    observedAt: input.observedAt,
    httpStatus: input.httpStatus ?? null,
    responseCode: normalizeOptionalText(input.responseCode, SAFE_CODE_MAX_LENGTH),
    description: normalizeOptionalText(
      input.description,
      SAFE_DESCRIPTION_MAX_LENGTH,
    ),
    providerReference: normalizeOptionalText(
      input.providerReference,
      PROVIDER_REFERENCE_MAX_LENGTH,
    ),
    orderNumber: normalizeOptionalText(
      input.orderNumber,
      PROVIDER_REFERENCE_MAX_LENGTH,
    ),
    amount: normalizeOptionalText(input.amount, 40),
    currency: normalizeOptionalText(input.currency, 10),
    modificationType: normalizeOptionalText(input.modificationType, 40),
    candidateCount:
      typeof input.candidateCount === "number" &&
      Number.isInteger(input.candidateCount) &&
      input.candidateCount >= 0
        ? input.candidateCount
        : null,
    resultClassification: input.resultClassification,
    responseShape: input.responseShape ?? null,
    requestId: input.requestId ?? null,
    reconciliationSource: input.reconciliationSource ?? null,
    note: normalizeOptionalText(input.note, RECONCILIATION_NOTE_MAX_LENGTH),
  });
}

function toDiagnostics(rawPayload: Prisma.JsonValue | null) {
  if (
    !isJsonRecord(rawPayload) ||
    rawPayload.safe !== true ||
    rawPayload.schemaVersion !== 1 ||
    typeof rawPayload.source !== "string"
  ) {
    return null;
  }

  return {
    source: rawPayload.source,
    observedAt:
      typeof rawPayload.observedAt === "string" ? rawPayload.observedAt : null,
    httpStatus:
      typeof rawPayload.httpStatus === "number" ? rawPayload.httpStatus : null,
    responseCode:
      typeof rawPayload.responseCode === "string"
        ? rawPayload.responseCode
        : null,
    description:
      typeof rawPayload.description === "string"
        ? rawPayload.description
        : null,
    providerReference:
      typeof rawPayload.providerReference === "string"
        ? rawPayload.providerReference
        : null,
    orderNumber:
      typeof rawPayload.orderNumber === "string" ? rawPayload.orderNumber : null,
    amount: typeof rawPayload.amount === "string" ? rawPayload.amount : null,
    currency:
      typeof rawPayload.currency === "string" ? rawPayload.currency : null,
    modificationType:
      typeof rawPayload.modificationType === "string"
        ? rawPayload.modificationType
        : null,
    candidateCount:
      typeof rawPayload.candidateCount === "number" &&
      Number.isInteger(rawPayload.candidateCount)
        ? rawPayload.candidateCount
        : null,
    resultClassification:
      typeof rawPayload.resultClassification === "string"
        ? rawPayload.resultClassification
        : null,
    responseShape: isJsonRecord(rawPayload.responseShape)
      ? rawPayload.responseShape
      : null,
  } as const;
}

function toAdminSummary(admin: Readonly<{ name: string | null; email: string }>) {
  return {
    name: normalizeOptionalText(admin.name, 160),
    email: normalizeRequiredText(admin.email, 254).toLowerCase(),
  };
}

export function toAdminRefundSummary(
  refund: RefundSummaryRecord,
): AdminRefundSummary {
  return {
    id: refund.id,
    paymentId: refund.paymentId,
    lifecycleRequestId: refund.lifecycleRequestId,
    requestedByAdmin: refund.requestedByAdmin
      ? toAdminSummary(refund.requestedByAdmin)
      : null,
    clientRequestId: refund.clientRequestId,
    amount: refund.amount.toFixed(2),
    currency: refund.currency,
    reason: refund.reason,
    status: refund.status,
    processingMode: refund.processingMode,
    providerRefundId: refund.providerRefundId,
    processingStartedAt: refund.processingStartedAt?.toISOString() ?? null,
    approvedAt: refund.approvedAt?.toISOString() ?? null,
    failedAt: refund.failedAt?.toISOString() ?? null,
    failureCode: refund.failureCode,
    diagnostics: toDiagnostics(refund.rawPayload),
    createdAt: refund.createdAt.toISOString(),
    updatedAt: refund.updatedAt.toISOString(),
  };
}

function buildRefundIdempotencyKey(
  lifecycleRequestId: string,
  requestId: string,
): string {
  return `refund-authorization/${lifecycleRequestId}/${requestId}`;
}

async function sumRefundAmounts(
  transaction: Prisma.TransactionClient,
  where: Prisma.RefundWhereInput,
): Promise<Prisma.Decimal> {
  const aggregate = await transaction.refund.aggregate({
    where,
    _sum: { amount: true },
  });

  return aggregate._sum.amount ?? new Prisma.Decimal(0);
}

function assertLifecycleRequestEligible(
  request: LifecycleRequestForRefund,
  input: CreateAdminRefundInput,
): asserts request is LifecycleRequestForRefund & {
  sourcePayment: NonNullable<LifecycleRequestForRefund["sourcePayment"]>;
  standardRefundPercentage: number;
  standardRefundAmount: Prisma.Decimal;
} {
  if (
    request.requestType !== ReservationLifecycleRequestType.CANCELLATION ||
    request.status !== ReservationLifecycleRequestStatus.COMPLETED
  ) {
    throw new AdminRefundError("ADMIN_REFUND_REQUEST_NOT_COMPLETED");
  }

  if (
    request.reservation.status !== ReservationStatus.CANCELLED ||
    !request.reservation.cancelledAt
  ) {
    throw new AdminRefundError("ADMIN_REFUND_RESERVATION_NOT_CANCELLED");
  }

  if (
    request.version !== input.expectedRequestVersion ||
    request.updatedAt.toISOString() !== input.expectedRequestUpdatedAt
  ) {
    throw new AdminRefundError("ADMIN_REFUND_STALE");
  }

  if (
    !request.sourcePayment ||
    request.sourcePaymentId !== request.sourcePayment.id ||
    request.sourcePayment.purpose !== PaymentPurpose.INITIAL_RESERVATION
  ) {
    throw new AdminRefundError("ADMIN_REFUND_PAYMENT_NOT_FOUND");
  }

  if (
    !REFUNDABLE_PAYMENT_STATUSES.includes(
      request.sourcePayment.status as (typeof REFUNDABLE_PAYMENT_STATUSES)[number],
    ) ||
    request.sourcePayment.updatedAt.toISOString() !==
      input.expectedPaymentUpdatedAt
  ) {
    throw new AdminRefundError("ADMIN_REFUND_PAYMENT_NOT_REFUNDABLE");
  }

  if (
    request.currency !== request.sourcePayment.currency ||
    request.standardRefundPercentage === null ||
    !request.standardRefundAmount ||
    request.policyExceptionApplied
  ) {
    throw new AdminRefundError("ADMIN_REFUND_POLICY_NOT_ELIGIBLE");
  }

  if (!request.standardRefundAmount.greaterThan(0)) {
    throw new AdminRefundError("ADMIN_REFUND_POLICY_NOT_ELIGIBLE");
  }
}

async function readRefundSummaryById(
  transaction: Prisma.TransactionClient,
  refundId: string,
): Promise<AdminRefundSummary> {
  const refund = await transaction.refund.findUnique({
    where: { id: refundId },
    select: refundSummarySelect,
  });

  if (!refund) {
    throw new AdminRefundError("ADMIN_REFUND_NOT_FOUND");
  }

  return toAdminRefundSummary(refund);
}

async function createRefundAuthorizationTransaction(
  input: CreateAdminRefundInput,
  actor: AdminActor,
): Promise<AdminRefundAuthorizationResult> {
  const lifecycleRequestId = input.lifecycleRequestId.trim();
  const requestId = input.requestId.trim();
  const idempotencyKey = buildRefundIdempotencyKey(
    lifecycleRequestId,
    requestId,
  );
  const amount = parsePositiveAmount(input.amount);

  return prisma.$transaction(
    async (transaction) => {
      const adminActor = await resolveAdminActor(transaction, actor);
      const existing = await transaction.refund.findUnique({
        where: { idempotencyKey },
        select: refundSummarySelect,
      });

      if (existing) {
        if (
          existing.lifecycleRequestId !== lifecycleRequestId ||
          existing.clientRequestId !== requestId ||
          !existing.amount.equals(amount)
        ) {
          throw new AdminRefundError("ADMIN_REFUND_UNEXPECTED_ERROR");
        }

        return {
          refund: toAdminRefundSummary(existing),
          alreadyProcessed: true,
        };
      }

      const lifecycleRequest =
        await transaction.reservationLifecycleRequest.findUnique({
          where: { id: lifecycleRequestId },
          select: lifecycleRequestForRefundSelect,
        });

      if (!lifecycleRequest) {
        throw new AdminRefundError(
          "ADMIN_REFUND_LIFECYCLE_REQUEST_NOT_FOUND",
        );
      }

      assertLifecycleRequestEligible(lifecycleRequest, input);
      const payment = lifecycleRequest.sourcePayment;
      const approvedPolicyAmount =
        lifecycleRequest.approvedRefundAmount ??
        lifecycleRequest.standardRefundAmount;
      const requestCommittedAmount = await sumRefundAmounts(transaction, {
        lifecycleRequestId,
        status: { in: [...COMMITTED_REFUND_STATUSES] },
      });
      const paymentCommittedAmount = await sumRefundAmounts(transaction, {
        paymentId: payment.id,
        status: { in: [...COMMITTED_REFUND_STATUSES] },
      });
      const remainingPolicyAmount = approvedPolicyAmount.sub(
        requestCommittedAmount,
      );
      const remainingPaymentAmount = payment.amount.sub(paymentCommittedAmount);

      if (amount.greaterThan(remainingPolicyAmount)) {
        throw new AdminRefundError("ADMIN_REFUND_AMOUNT_EXCEEDS_POLICY");
      }

      if (amount.greaterThan(remainingPaymentAmount)) {
        throw new AdminRefundError("ADMIN_REFUND_AMOUNT_EXCEEDS_PAYMENT");
      }

      if (
        input.processingMode === RefundProcessingMode.TILOPAY_API &&
        !payment.providerReference?.trim()
      ) {
        throw new AdminRefundError("ADMIN_REFUND_PAYMENT_NOT_FOUND");
      }

      const requestFence =
        await transaction.reservationLifecycleRequest.updateMany({
          where: {
            id: lifecycleRequest.id,
            version: input.expectedRequestVersion,
            updatedAt: lifecycleRequest.updatedAt,
            status: ReservationLifecycleRequestStatus.COMPLETED,
          },
          data: {
            approvedRefundPercentage:
              lifecycleRequest.approvedRefundPercentage ??
              lifecycleRequest.standardRefundPercentage,
            approvedRefundAmount: approvedPolicyAmount,
            version: { increment: 1 },
          },
        });

      const paymentFence = await transaction.payment.updateMany({
        where: {
          id: payment.id,
          updatedAt: payment.updatedAt,
          status: { in: [...REFUNDABLE_PAYMENT_STATUSES] },
        },
        data: {
          updatedAt: payment.updatedAt,
        },
      });

      if (requestFence.count !== 1 || paymentFence.count !== 1) {
        throw new AdminRefundError("ADMIN_REFUND_STALE");
      }

      const refund = await transaction.refund.create({
        data: {
          paymentId: payment.id,
          lifecycleRequestId: lifecycleRequest.id,
          requestedByAdminId: adminActor.id,
          clientRequestId: requestId,
          idempotencyKey,
          amount,
          currency: payment.currency,
          reason: normalizeRequiredText(input.reason, REFUND_REASON_MAX_LENGTH),
          status: RefundStatus.PENDING,
          processingMode: input.processingMode,
        },
        select: refundSummarySelect,
      });

      await transaction.adminAuditLog.create({
        data: {
          userId: adminActor.id,
          action: "REFUND_AUTHORIZED",
          entityType: "Refund",
          entityId: refund.id,
          metadata: {
            actorEmail: adminActor.email,
            reservationId: lifecycleRequest.reservation.id,
            lifecycleRequestId: lifecycleRequest.id,
            paymentId: payment.id,
            clientRequestId: requestId,
            amount: amount.toFixed(2),
            currency: payment.currency,
            processingMode: input.processingMode,
            approvedPolicyAmount: approvedPolicyAmount.toFixed(2),
            policyRemainingBefore: remainingPolicyAmount.toFixed(2),
            paymentRemainingBefore: remainingPaymentAmount.toFixed(2),
            providerCalled: false,
          },
        },
      });

      return {
        refund: toAdminRefundSummary(refund),
        alreadyProcessed: false,
      };
    },
    {
      isolationLevel: Prisma.TransactionIsolationLevel.Serializable,
    },
  );
}

export async function createAdminRefundAuthorization(
  input: CreateAdminRefundInput,
  actor: AdminActor,
): Promise<AdminRefundAuthorizationResult> {
  const lifecycleRequestId = input.lifecycleRequestId.trim();
  const requestId = input.requestId.trim();
  const requestedAmount = parsePositiveAmount(input.amount);
  const idempotencyKey = buildRefundIdempotencyKey(
    lifecycleRequestId,
    requestId,
  );

  try {
    return await createRefundAuthorizationTransaction(input, actor);
  } catch (error) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      (error.code === "P2002" || error.code === "P2034")
    ) {
      const existing = await prisma.refund.findUnique({
        where: { idempotencyKey },
        select: refundSummarySelect,
      });

      if (existing) {
        if (
          existing.lifecycleRequestId !== lifecycleRequestId ||
          existing.clientRequestId !== requestId ||
          !existing.amount.equals(requestedAmount) ||
          existing.processingMode !== input.processingMode
        ) {
          throw new AdminRefundError("ADMIN_REFUND_UNEXPECTED_ERROR");
        }

        return {
          refund: toAdminRefundSummary(existing),
          alreadyProcessed: true,
        };
      }

      throw new AdminRefundError("ADMIN_REFUND_STALE");
    }

    throw error;
  }
}

async function readRefundForAction(
  refundId: string,
): Promise<RefundForAction> {
  const refund = await prisma.refund.findUnique({
    where: { id: refundId.trim() },
    select: refundForActionSelect,
  });

  if (!refund) {
    throw new AdminRefundError("ADMIN_REFUND_NOT_FOUND");
  }

  return refund;
}

function assertRefundPaymentRelationship(refund: RefundForAction): void {
  if (
    refund.payment.purpose !== PaymentPurpose.INITIAL_RESERVATION ||
    refund.payment.reservation.status !== ReservationStatus.CANCELLED ||
    !REFUND_PAYMENT_HISTORY_STATUSES.includes(
      refund.payment.status as (typeof REFUND_PAYMENT_HISTORY_STATUSES)[number],
    ) ||
    refund.payment.currency !== refund.currency
  ) {
    throw new AdminRefundError("ADMIN_REFUND_PAYMENT_NOT_REFUNDABLE");
  }
}

function assertPaymentCanReceiveApprovedRefund(refund: RefundForAction): void {
  if (
    !REFUNDABLE_PAYMENT_STATUSES.includes(
      refund.payment.status as (typeof REFUNDABLE_PAYMENT_STATUSES)[number],
    )
  ) {
    throw new AdminRefundError("ADMIN_REFUND_PAYMENT_NOT_REFUNDABLE");
  }
}

async function recordExecutionObservation(
  refundId: string,
  observation: TilopayModificationObservation,
  actor: AdminActor,
  requestId: string,
): Promise<AdminRefundSummary> {
  const classification = classifyTilopayModificationObservation(observation);
  const parsedObservedAt = new Date(observation.observedAt);
  const observedAt = Number.isNaN(parsedObservedAt.getTime())
    ? new Date()
    : parsedObservedAt;
  const providerReference = normalizeOptionalText(
    observation.providerReference,
    PROVIDER_REFERENCE_MAX_LENGTH,
  );
  const failureCode =
    classification === "PROVIDER_ACCEPTED"
      ? "TILOPAY_REFUND_CONFIRMATION_PENDING"
      : classification === "PROVIDER_REJECTED"
        ? normalizeRequiredText(
            `TILOPAY_REFUND_REJECTED_${observation.responseCode ?? "UNKNOWN"}`,
            SAFE_CODE_MAX_LENGTH,
          )
        : "TILOPAY_REFUND_RESULT_UNCERTAIN";
  const resultClassification =
    classification === "PROVIDER_ACCEPTED"
      ? "PROVIDER_ACCEPTED_PENDING_CONFIRMATION"
      : classification;

  return prisma.$transaction(
    async (transaction) => {
      const adminActor = await resolveAdminActor(transaction, actor);
      const updated = await transaction.refund.updateMany({
        where: {
          id: refundId,
          status: RefundStatus.PROCESSING,
        },
        data:
          classification === "PROVIDER_REJECTED"
            ? {
                status: RefundStatus.FAILED,
                processingStartedAt: null,
                providerRefundId: providerReference,
                failedAt: observedAt,
                failureCode,
                rawPayload: buildSafeDiagnostics({
                  source: "tilopay_process_modification",
                  observedAt: observedAt.toISOString(),
                  httpStatus: observation.httpStatus,
                  responseCode: observation.responseCode,
                  description: observation.description,
                  providerReference,
                  modificationType: "2",
                  resultClassification,
                  responseShape: observation.responseShape,
                  requestId,
                }),
              }
            : {
                providerRefundId: providerReference,
                failureCode,
                rawPayload: buildSafeDiagnostics({
                  source: "tilopay_process_modification",
                  observedAt: observedAt.toISOString(),
                  httpStatus: observation.httpStatus,
                  responseCode: observation.responseCode,
                  description: observation.description,
                  providerReference,
                  modificationType: "2",
                  resultClassification,
                  responseShape: observation.responseShape,
                  requestId,
                }),
              },
      });

      if (updated.count !== 1) {
        throw new AdminRefundError("ADMIN_REFUND_STALE");
      }

      await transaction.adminAuditLog.create({
        data: {
          userId: adminActor.id,
          action: "REFUND_PROVIDER_RESPONSE_OBSERVED",
          entityType: "Refund",
          entityId: refundId,
          metadata: toSafeJson({
            actorEmail: adminActor.email,
            requestId,
            httpStatus: observation.httpStatus,
            providerOk: observation.ok,
            responseCode: observation.responseCode,
            providerReferenceObserved: Boolean(providerReference),
            responseShape: observation.responseShape,
            resultClassification,
            refundStatus:
              classification === "PROVIDER_REJECTED"
                ? RefundStatus.FAILED
                : RefundStatus.PROCESSING,
            paymentStatusChanged: false,
          }),
        },
      });

      return readRefundSummaryById(transaction, refundId);
    },
    { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
  );
}

async function recordExecutionFailure(
  refundId: string,
  error: TilopayApiClientError,
  actor: AdminActor,
  requestId: string,
): Promise<AdminRefundSummary> {
  const observedAt = new Date();
  const uncertain = error.requestMayHaveReachedProvider;

  return prisma.$transaction(
    async (transaction) => {
      const adminActor = await resolveAdminActor(transaction, actor);
      const updated = await transaction.refund.updateMany({
        where: {
          id: refundId,
          status: RefundStatus.PROCESSING,
        },
        data: uncertain
          ? {
              failureCode: "TILOPAY_REFUND_RESULT_UNCERTAIN",
              rawPayload: buildSafeDiagnostics({
                source: "tilopay_process_modification",
                observedAt: observedAt.toISOString(),
                description: error.code,
                resultClassification: "RESULT_UNCERTAIN",
                requestId,
              }),
            }
          : {
              status: RefundStatus.FAILED,
              processingStartedAt: null,
              failedAt: observedAt,
              failureCode: normalizeRequiredText(error.code, SAFE_CODE_MAX_LENGTH),
              rawPayload: buildSafeDiagnostics({
                source: "tilopay_process_modification",
                observedAt: observedAt.toISOString(),
                description: error.code,
                resultClassification: "FAILED_BEFORE_PROVIDER_REQUEST",
                requestId,
              }),
            },
      });

      if (updated.count !== 1) {
        throw new AdminRefundError("ADMIN_REFUND_STALE");
      }

      await transaction.adminAuditLog.create({
        data: {
          userId: adminActor.id,
          action: uncertain
            ? "REFUND_PROVIDER_RESULT_UNCERTAIN"
            : "REFUND_PROVIDER_EXECUTION_FAILED",
          entityType: "Refund",
          entityId: refundId,
          metadata: {
            actorEmail: adminActor.email,
            requestId,
            failureCode: error.code,
            requestMayHaveReachedProvider: uncertain,
            paymentStatusChanged: false,
          },
        },
      });

      return readRefundSummaryById(transaction, refundId);
    },
    { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
  );
}

export async function executeAdminTilopayRefund(
  input: ExecuteAdminRefundInput,
  actor: AdminActor,
): Promise<AdminRefundExecutionResult> {
  const env = getTilopayEnv();

  if (env.TILOPAY_ENVIRONMENT !== "sandbox") {
    throw new AdminRefundError("ADMIN_REFUND_API_SANDBOX_ONLY");
  }

  const refund = await readRefundForAction(input.refundId);
  assertRefundPaymentRelationship(refund);

  if (refund.status !== RefundStatus.PENDING) {
    if (
      refund.status === RefundStatus.PROCESSING ||
      refund.status === RefundStatus.APPROVED ||
      refund.status === RefundStatus.FAILED
    ) {
      return {
        refund: toAdminRefundSummary(refund),
        providerRequestSent: false,
        requiresReconciliation: refund.status === RefundStatus.PROCESSING,
        alreadyProcessed: true,
      };
    }

    throw new AdminRefundError("ADMIN_REFUND_NOT_PENDING");
  }

  assertPaymentCanReceiveApprovedRefund(refund);

  if (
    refund.processingMode !== RefundProcessingMode.TILOPAY_API ||
    !refund.payment.providerReference?.trim()
  ) {
    throw new AdminRefundError("ADMIN_REFUND_API_EXECUTION_NOT_ALLOWED");
  }

  if (
    refund.updatedAt.toISOString() !== input.expectedRefundUpdatedAt ||
    refund.payment.updatedAt.toISOString() !== input.expectedPaymentUpdatedAt
  ) {
    throw new AdminRefundError("ADMIN_REFUND_STALE");
  }

  const startedAt = new Date();
  const claimed = await prisma.$transaction(
    async (transaction) => {
      const adminActor = await resolveAdminActor(transaction, actor);
      const result = await transaction.refund.updateMany({
        where: {
          id: refund.id,
          status: RefundStatus.PENDING,
          updatedAt: refund.updatedAt,
        },
        data: {
          status: RefundStatus.PROCESSING,
          processingStartedAt: startedAt,
          failedAt: null,
          failureCode: null,
        },
      });

      if (result.count !== 1) {
        throw new AdminRefundError("ADMIN_REFUND_STALE");
      }

      await transaction.adminAuditLog.create({
        data: {
          userId: adminActor.id,
          action: "REFUND_PROVIDER_EXECUTION_STARTED",
          entityType: "Refund",
          entityId: refund.id,
          metadata: {
            actorEmail: adminActor.email,
            requestId: input.requestId,
            paymentId: refund.payment.id,
            orderNumber: refund.payment.providerReference,
            amount: refund.amount.toFixed(2),
            currency: refund.currency,
            modificationType: "2",
            environment: env.TILOPAY_ENVIRONMENT,
          },
        },
      });

      return true;
    },
    { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
  );

  if (!claimed) {
    throw new AdminRefundError("ADMIN_REFUND_STALE");
  }

  try {
    const observation = await processTilopayModification({
      orderNumber: refund.payment.providerReference,
      type: "2",
      amount: refund.amount.toFixed(2),
    });
    const summary = await recordExecutionObservation(
      refund.id,
      observation,
      actor,
      input.requestId,
    );

    return {
      refund: summary,
      providerRequestSent: true,
      requiresReconciliation: summary.status === RefundStatus.PROCESSING,
      alreadyProcessed: false,
    };
  } catch (error) {
    if (!(error instanceof TilopayApiClientError)) {
      throw error;
    }

    const summary = await recordExecutionFailure(
      refund.id,
      error,
      actor,
      input.requestId,
    );

    return {
      refund: summary,
      providerRequestSent: error.requestMayHaveReachedProvider,
      requiresReconciliation: error.requestMayHaveReachedProvider,
      alreadyProcessed: false,
    };
  }
}

function providerOrderNumberMatches(
  providerOrderNumber: string,
  expectedOrderNumber: string,
): boolean {
  const observed = providerOrderNumber.trim();
  const expected = expectedOrderNumber.trim();

  return observed === expected || observed.endsWith(`-${expected}`);
}

function parseConsultAmount(value: string | null): Prisma.Decimal | null {
  if (!value?.trim()) {
    return null;
  }

  try {
    return new Prisma.Decimal(value.trim());
  } catch {
    return null;
  }
}

function candidateMatchesRefundIdentity(
  refund: RefundForAction,
  candidate: TilopayConsultCandidate,
): boolean {
  const expectedProviderReference = refund.providerRefundId?.trim();

  if (
    !expectedProviderReference ||
    candidate.providerReference?.trim() !== expectedProviderReference
  ) {
    return false;
  }

  if (
    candidate.orderNumber &&
    refund.payment.providerReference &&
    !providerOrderNumberMatches(
      candidate.orderNumber,
      refund.payment.providerReference,
    )
  ) {
    return false;
  }

  if (
    candidate.currency &&
    candidate.currency.trim() !== refund.payment.currency
  ) {
    return false;
  }

  return true;
}

function classifyConsultEvidence(
  refund: RefundForAction,
  candidates: readonly TilopayConsultCandidate[],
): Readonly<{
  candidate: TilopayConsultCandidate | null;
  resultClassification:
    | "PROVIDER_ACCEPTED"
    | "PROVIDER_REJECTED"
    | "CONSULT_MATCH_INCONCLUSIVE"
    | "CONSULT_NO_MATCH"
    | "CONSULT_REFERENCE_MISSING";
}> {
  if (!refund.providerRefundId?.trim()) {
    return {
      candidate: null,
      resultClassification: "CONSULT_REFERENCE_MISSING",
    };
  }

  const identityMatches = candidates.filter((candidate) =>
    candidateMatchesRefundIdentity(refund, candidate),
  );

  if (identityMatches.length === 0) {
    return {
      candidate: null,
      resultClassification: "CONSULT_NO_MATCH",
    };
  }

  for (const candidate of identityMatches) {
    const providerClassification =
      classifyTilopayConsultCandidate(candidate);
    const amount = parseConsultAmount(candidate.amount);
    const amountMatches =
      amount !== null && amount.abs().equals(refund.amount);
    const typeMatches = candidate.type?.trim() === "2";

    if (
      providerClassification === "PROVIDER_ACCEPTED" &&
      amountMatches &&
      amount?.isNegative() &&
      typeMatches
    ) {
      return {
        candidate,
        resultClassification: "PROVIDER_ACCEPTED",
      };
    }

    if (
      providerClassification === "PROVIDER_REJECTED" &&
      amountMatches &&
      !amount?.isNegative() &&
      typeMatches
    ) {
      return {
        candidate,
        resultClassification: "PROVIDER_REJECTED",
      };
    }
  }

  return {
    candidate: identityMatches[0] ?? null,
    resultClassification: "CONSULT_MATCH_INCONCLUSIVE",
  };
}

export async function consultAdminTilopayRefund(
  input: ConsultAdminRefundInput,
  actor: AdminActor,
): Promise<AdminRefundConsultResult> {
  const refund = await readRefundForAction(input.refundId);
  assertRefundPaymentRelationship(refund);

  if (refund.status !== RefundStatus.PROCESSING) {
    throw new AdminRefundError("ADMIN_REFUND_NOT_PROCESSING");
  }

  if (refund.processingMode !== RefundProcessingMode.TILOPAY_API) {
    throw new AdminRefundError("ADMIN_REFUND_API_EXECUTION_NOT_ALLOWED");
  }

  if (
    refund.updatedAt.toISOString() !== input.expectedRefundUpdatedAt ||
    !refund.payment.providerReference?.trim()
  ) {
    throw new AdminRefundError("ADMIN_REFUND_STALE");
  }

  try {
    const observation = await observeTilopayConsultTransaction(
      refund.payment.providerReference,
    );
    const evidence = classifyConsultEvidence(refund, observation.candidates);
    const candidate = evidence.candidate;
    const failureCode =
      evidence.resultClassification === "PROVIDER_ACCEPTED"
        ? "TILOPAY_REFUND_CONSULT_ACCEPTED"
        : evidence.resultClassification === "PROVIDER_REJECTED"
          ? "TILOPAY_REFUND_CONSULT_REJECTED"
          : "TILOPAY_REFUND_CONSULT_INCONCLUSIVE";

    const summary = await prisma.$transaction(
      async (transaction) => {
        const adminActor = await resolveAdminActor(transaction, actor);
        const updated = await transaction.refund.updateMany({
          where: {
            id: refund.id,
            status: RefundStatus.PROCESSING,
            updatedAt: refund.updatedAt,
          },
          data: {
            failureCode,
            rawPayload: buildSafeDiagnostics({
              source: "tilopay_refund_consult",
              observedAt: observation.observedAt,
              responseCode: candidate?.responseCode ?? null,
              description: candidate?.description ?? null,
              providerReference:
                candidate?.providerReference ?? refund.providerRefundId,
              orderNumber: candidate?.orderNumber ?? null,
              amount: candidate?.amount ?? null,
              currency: candidate?.currency ?? null,
              modificationType: candidate?.type ?? null,
              candidateCount: observation.candidates.length,
              resultClassification: evidence.resultClassification,
              responseShape: observation.responseShape,
              requestId: input.requestId,
            }),
          },
        });

        if (updated.count !== 1) {
          throw new AdminRefundError("ADMIN_REFUND_STALE");
        }

        await transaction.adminAuditLog.create({
          data: {
            userId: adminActor.id,
            action: "REFUND_PROVIDER_CONSULT_OBSERVED",
            entityType: "Refund",
            entityId: refund.id,
            metadata: toSafeJson({
              actorEmail: adminActor.email,
              requestId: input.requestId,
              candidateCount: observation.candidates.length,
              matchedProviderReference: Boolean(candidate?.providerReference),
              responseCode: candidate?.responseCode ?? null,
              resultClassification: evidence.resultClassification,
              paymentStatusChanged: false,
            }),
          },
        });

        return readRefundSummaryById(transaction, refund.id);
      },
      { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
    );

    return {
      refund: summary,
      requiresReconciliation: true,
    };
  } catch (error) {
    if (error instanceof AdminRefundError) {
      throw error;
    }

    if (error instanceof TilopayApiClientError) {
      throw new AdminRefundError("ADMIN_REFUND_PROVIDER_UNAVAILABLE");
    }

    throw error;
  }
}

async function approvedRefundTotalExcluding(
  transaction: Prisma.TransactionClient,
  paymentId: string,
  refundId: string,
): Promise<Prisma.Decimal> {
  return sumRefundAmounts(transaction, {
    paymentId,
    id: { not: refundId },
    status: { in: [...COMPLETED_REFUND_STATUSES] },
  });
}

export async function reconcileAdminRefund(
  input: ReconcileAdminRefundInput,
  actor: AdminActor,
): Promise<AdminRefundReconciliationResult> {
  return prisma.$transaction(
    async (transaction) => {
      const adminActor = await resolveAdminActor(transaction, actor);
      const refund = await transaction.refund.findUnique({
        where: { id: input.refundId.trim() },
        select: refundForActionSelect,
      });

      if (!refund) {
        throw new AdminRefundError("ADMIN_REFUND_NOT_FOUND");
      }

      assertRefundPaymentRelationship(refund);

      if (
        input.outcome === "APPROVED" &&
        refund.status === RefundStatus.APPROVED
      ) {
        const cumulativeApprovedAmount = await sumRefundAmounts(transaction, {
          paymentId: refund.paymentId,
          status: { in: [...COMPLETED_REFUND_STATUSES] },
        });

        return {
          refund: toAdminRefundSummary(refund),
          paymentStatus: refund.payment.status,
          cumulativeApprovedAmount: cumulativeApprovedAmount.toFixed(2),
          alreadyProcessed: true,
        };
      }

      if (
        input.outcome === "FAILED" &&
        refund.status === RefundStatus.FAILED
      ) {
        const cumulativeApprovedAmount = await sumRefundAmounts(transaction, {
          paymentId: refund.paymentId,
          status: { in: [...COMPLETED_REFUND_STATUSES] },
        });

        return {
          refund: toAdminRefundSummary(refund),
          paymentStatus: refund.payment.status,
          cumulativeApprovedAmount: cumulativeApprovedAmount.toFixed(2),
          alreadyProcessed: true,
        };
      }

      if (
        refund.status !== RefundStatus.PENDING &&
        refund.status !== RefundStatus.PROCESSING
      ) {
        throw new AdminRefundError("ADMIN_REFUND_RECONCILIATION_CONFLICT");
      }

      if (
        refund.updatedAt.toISOString() !== input.expectedRefundUpdatedAt ||
        refund.payment.updatedAt.toISOString() !==
          input.expectedPaymentUpdatedAt
      ) {
        throw new AdminRefundError("ADMIN_REFUND_STALE");
      }

      if (
        (input.source === "TILOPAY_CONSULT" &&
          input.finalProcessingMode !== RefundProcessingMode.TILOPAY_API) ||
        (input.source === "TILOPAY_PORTAL" &&
          input.finalProcessingMode !==
            RefundProcessingMode.TILOPAY_PORTAL_FALLBACK)
      ) {
        throw new AdminRefundError("INVALID_ADMIN_REFUND_REQUEST");
      }

      const currentDiagnostics = toDiagnostics(refund.rawPayload);
      const providerRefundId = normalizeOptionalText(
        input.providerRefundId,
        PROVIDER_REFERENCE_MAX_LENGTH,
      );

      if (input.source === "TILOPAY_CONSULT") {
        const expectedClassification =
          input.outcome === "APPROVED"
            ? "PROVIDER_ACCEPTED"
            : "PROVIDER_REJECTED";
        const observedAmount = parseConsultAmount(
          currentDiagnostics?.amount ?? null,
        );
        const amountMatches =
          observedAmount !== null &&
          observedAmount.abs().equals(refund.amount);
        const signMatches =
          input.outcome === "APPROVED"
            ? Boolean(observedAmount?.isNegative())
            : Boolean(observedAmount && !observedAmount.isNegative());

        if (
          currentDiagnostics?.source !== "tilopay_refund_consult" ||
          currentDiagnostics.resultClassification !== expectedClassification ||
          currentDiagnostics.modificationType !== "2" ||
          !currentDiagnostics.providerReference ||
          providerRefundId !== currentDiagnostics.providerReference ||
          !amountMatches ||
          !signMatches
        ) {
          throw new AdminRefundError("ADMIN_REFUND_RECONCILIATION_CONFLICT");
        }
      }

      if (input.outcome === "APPROVED") {
        assertPaymentCanReceiveApprovedRefund(refund);
      }

      const reconciledAt = new Date();
      const note = normalizeRequiredText(
        input.note,
        RECONCILIATION_NOTE_MAX_LENGTH,
      );

      if (input.outcome === "APPROVED" && !providerRefundId) {
        throw new AdminRefundError("INVALID_ADMIN_REFUND_REQUEST");
      }

      let paymentStatus = refund.payment.status;
      let cumulativeApprovedAmount = await approvedRefundTotalExcluding(
        transaction,
        refund.paymentId,
        refund.id,
      );

      if (input.outcome === "APPROVED") {
        cumulativeApprovedAmount = cumulativeApprovedAmount.add(refund.amount);

        if (cumulativeApprovedAmount.greaterThan(refund.payment.amount)) {
          throw new AdminRefundError("ADMIN_REFUND_AMOUNT_EXCEEDS_PAYMENT");
        }

        paymentStatus = cumulativeApprovedAmount.equals(refund.payment.amount)
          ? PaymentStatus.REFUNDED
          : PaymentStatus.PARTIALLY_REFUNDED;

        const paymentUpdate = await transaction.payment.updateMany({
          where: {
            id: refund.payment.id,
            updatedAt: refund.payment.updatedAt,
            status: { in: [...REFUNDABLE_PAYMENT_STATUSES] },
          },
          data: {
            status: paymentStatus,
          },
        });

        if (paymentUpdate.count !== 1) {
          throw new AdminRefundError("ADMIN_REFUND_STALE");
        }
      }

      const refundUpdate = await transaction.refund.updateMany({
        where: {
          id: refund.id,
          updatedAt: refund.updatedAt,
          status: {
            in: [RefundStatus.PENDING, RefundStatus.PROCESSING],
          },
        },
        data:
          input.outcome === "APPROVED"
            ? {
                status: RefundStatus.APPROVED,
                processingMode: input.finalProcessingMode,
                processingStartedAt: null,
                providerRefundId,
                approvedAt: reconciledAt,
                failedAt: null,
                failureCode: null,
                rawPayload: buildSafeDiagnostics({
                  source: "refund_reconciliation",
                  observedAt: reconciledAt.toISOString(),
                  providerReference: providerRefundId,
                  resultClassification: "APPROVED",
                  requestId: input.requestId,
                  reconciliationSource: input.source,
                  note,
                }),
              }
            : {
                status: RefundStatus.FAILED,
                processingMode: input.finalProcessingMode,
                processingStartedAt: null,
                providerRefundId,
                approvedAt: null,
                failedAt: reconciledAt,
                failureCode: "REFUND_RECONCILED_FAILED",
                rawPayload: buildSafeDiagnostics({
                  source: "refund_reconciliation",
                  observedAt: reconciledAt.toISOString(),
                  providerReference: providerRefundId,
                  resultClassification: "FAILED",
                  requestId: input.requestId,
                  reconciliationSource: input.source,
                  note,
                }),
              },
      });

      if (refundUpdate.count !== 1) {
        throw new AdminRefundError("ADMIN_REFUND_STALE");
      }

      await transaction.adminAuditLog.create({
        data: {
          userId: adminActor.id,
          action:
            input.outcome === "APPROVED"
              ? "REFUND_RECONCILED_APPROVED"
              : "REFUND_RECONCILED_FAILED",
          entityType: "Refund",
          entityId: refund.id,
          metadata: {
            actorEmail: adminActor.email,
            requestId: input.requestId,
            reservationId: refund.payment.reservationId,
            lifecycleRequestId: refund.lifecycleRequestId,
            paymentId: refund.paymentId,
            amount: refund.amount.toFixed(2),
            currency: refund.currency,
            source: input.source,
            finalProcessingMode: input.finalProcessingMode,
            providerReferenceRecorded: Boolean(providerRefundId),
            paymentStatus,
            cumulativeApprovedAmount: cumulativeApprovedAmount.toFixed(2),
            reservationStatus: refund.payment.reservation.status,
            reservationRestored: false,
          },
        },
      });

      return {
        refund: await readRefundSummaryById(transaction, refund.id),
        paymentStatus,
        cumulativeApprovedAmount: cumulativeApprovedAmount.toFixed(2),
        alreadyProcessed: false,
      };
    },
    { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
  );
}

export async function getAdminRefundsForReservation(
  reservationId: string,
): Promise<readonly AdminRefundSummary[]> {
  const id = reservationId.trim();

  if (!id || id.length > 120) {
    return [];
  }

  const refunds = await prisma.refund.findMany({
    where: {
      payment: {
        reservationId: id,
      },
    },
    orderBy: [{ createdAt: "desc" }, { id: "desc" }],
    select: refundSummarySelect,
  });

  return refunds.map(toAdminRefundSummary);
}
