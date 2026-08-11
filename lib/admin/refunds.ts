import {
  PaymentPurpose,
  PaymentStatus,
  Prisma,
  RefundAuthorizationType,
  RefundProcessingMode,
  RefundStatus,
  ReservationLifecycleRequestStatus,
  ReservationLifecycleRequestType,
  ReservationStatus,
} from "@prisma/client";

import { prisma } from "@/lib/db/prisma";
import {
  getReservationFinancialSummary,
  ReservationFinancialSummaryError,
} from "@/lib/reservations/financial-summary";
import {
  allocateReservationRefund,
  ReservationRefundAllocationError,
  type ReservationRefundAllocation,
} from "@/lib/reservations/refund-allocation";
import {
  createRefundNotificationIntents,
  deliverLifecycleNotificationsBestEffort,
} from "@/lib/email";
import { getTilopayEnv } from "@/lib/env/server";
import {
  classifyTilopayConsultCandidate,
  classifyTilopayModificationObservation,
  isTilopayRefundConsultType,
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
  CreateAdminExtraordinaryRefundInput,
  CreateAdminRefundInput,
  CreateAdminStandardRefundInput,
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
  refundOperationKey: true,
  clientRequestId: true,
  authorizationType: true,
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

type RefundSummaryLike = Omit<RefundSummaryRecord, "refundOperationKey"> &
  Readonly<{ refundOperationKey?: string | null }>;

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
      lifecycleRequestId: true,
      providerReference: true,
      status: true,
      amount: true,
      currency: true,
      updatedAt: true,
      lifecycleRequest: {
        select: {
          id: true,
          reservationId: true,
          requestType: true,
          status: true,
          financialDifference: true,
          currency: true,
        },
      },
      reservation: {
        select: {
          id: true,
          status: true,
          updatedAt: true,
          guestEmail: true,
          preferredLocale: true,
        },
      },
    },
  },
} satisfies Prisma.RefundSelect;

type RefundForAction = Prisma.RefundGetPayload<{
  select: typeof refundForActionSelect;
}>;

type RefundReconciliationTransactionResult = Readonly<{
  reconciliationResult: AdminRefundReconciliationResult;
  notificationIds: readonly string[];
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
  refund: RefundSummaryLike,
): AdminRefundSummary {
  return {
    id: refund.id,
    paymentId: refund.paymentId,
    lifecycleRequestId: refund.lifecycleRequestId,
    refundOperationKey: refund.refundOperationKey ?? null,
    requestedByAdmin: refund.requestedByAdmin
      ? toAdminSummary(refund.requestedByAdmin)
      : null,
    clientRequestId: refund.clientRequestId,
    authorizationType: refund.authorizationType,
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

function buildLegacyStandardRefundIdempotencyKey(
  lifecycleRequestId: string,
  requestId: string,
): string {
  return `refund-authorization/${lifecycleRequestId}/${requestId}`;
}

function buildLegacyExtraordinaryRefundIdempotencyKey(
  reservationId: string,
  paymentId: string,
  requestId: string,
): string {
  return `refund-extraordinary/${reservationId}/${paymentId}/${requestId}`;
}

function buildStandardRefundOperationKey(
  lifecycleRequestId: string,
  requestId: string,
): string {
  return `standard/${lifecycleRequestId}/${requestId}`;
}

function buildExtraordinaryRefundOperationKey(
  reservationId: string,
  requestId: string,
): string {
  return `extraordinary/${reservationId}/${requestId}`;
}

function buildRefundChildRequestId(
  requestId: string,
  legIndex: number,
  paymentId: string,
): string {
  return `${requestId}/${String(legIndex).padStart(3, "0")}/${paymentId}`;
}

function buildRefundChildIdempotencyKey(
  operationKey: string,
  legIndex: number,
  paymentId: string,
): string {
  return `refund/${operationKey}/${String(legIndex).padStart(3, "0")}/${paymentId}`;
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

function assertStandardLifecycleRequestEligible(
  request: LifecycleRequestForRefund,
  input: CreateAdminStandardRefundInput,
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
    request.sourcePayment.purpose !== PaymentPurpose.INITIAL_RESERVATION ||
    !REFUND_PAYMENT_HISTORY_STATUSES.includes(
      request.sourcePayment.status as (typeof REFUND_PAYMENT_HISTORY_STATUSES)[number],
    )
  ) {
    throw new AdminRefundError("ADMIN_REFUND_PAYMENT_NOT_FOUND");
  }

  if (
    request.currency !== request.sourcePayment.currency ||
    request.standardRefundPercentage === null ||
    !request.standardRefundAmount
  ) {
    throw new AdminRefundError("ADMIN_REFUND_POLICY_NOT_ELIGIBLE");
  }
}

function mapFinancialSummaryError(
  error: ReservationFinancialSummaryError | ReservationRefundAllocationError,
): AdminRefundError {
  if (
    error instanceof ReservationRefundAllocationError &&
    error.code === "RESERVATION_REFUND_ALLOCATION_INSUFFICIENT_BALANCE"
  ) {
    return new AdminRefundError("ADMIN_REFUND_AMOUNT_EXCEEDS_PAYMENT");
  }

  if (
    error instanceof ReservationFinancialSummaryError &&
    (error.code === "RESERVATION_FINANCIAL_SUMMARY_NOT_FOUND" ||
      error.code === "RESERVATION_FINANCIAL_SUMMARY_INITIAL_PAYMENT_NOT_FOUND")
  ) {
    return new AdminRefundError("ADMIN_REFUND_PAYMENT_NOT_FOUND");
  }

  return new AdminRefundError("ADMIN_REFUND_UNEXPECTED_ERROR");
}

async function buildRefundAllocation(
  transaction: Prisma.TransactionClient,
  reservationId: string,
  amount: Prisma.Decimal,
): Promise<Readonly<{
  allocation: ReservationRefundAllocation;
  currency: string;
  remainingRefundableStayBalance: Prisma.Decimal;
}>> {
  try {
    const summary = await getReservationFinancialSummary(
      reservationId,
      transaction,
    );
    const allocation = allocateReservationRefund(
      amount,
      summary.eligibleStayPayments,
    );

    return {
      allocation,
      currency: summary.currency,
      remainingRefundableStayBalance: summary.remainingRefundableStayBalance,
    };
  } catch (error) {
    if (
      error instanceof ReservationFinancialSummaryError ||
      error instanceof ReservationRefundAllocationError
    ) {
      throw mapFinancialSummaryError(error);
    }

    throw error;
  }
}

function assertApiModeSupportedByAllocation(
  allocation: ReservationRefundAllocation,
  processingMode: RefundProcessingMode | string,
): void {
  if (
    processingMode === RefundProcessingMode.TILOPAY_API &&
    allocation.legs.some((leg) => !leg.providerReference?.trim())
  ) {
    throw new AdminRefundError("ADMIN_REFUND_PAYMENT_NOT_FOUND");
  }
}

async function fenceAllocatedPayments(
  transaction: Prisma.TransactionClient,
  allocation: ReservationRefundAllocation,
): Promise<void> {
  for (const leg of allocation.legs) {
    const fence = await transaction.payment.updateMany({
      where: {
        id: leg.paymentId,
        updatedAt: leg.expectedPaymentUpdatedAt,
        status: { in: [...REFUNDABLE_PAYMENT_STATUSES] },
      },
      data: {
        updatedAt: leg.expectedPaymentUpdatedAt,
      },
    });

    if (fence.count !== 1) {
      throw new AdminRefundError("ADMIN_REFUND_STALE");
    }
  }
}

async function createRefundChildren(
  transaction: Prisma.TransactionClient,
  input: Readonly<{
    operationKey: string;
    allocation: ReservationRefundAllocation;
    lifecycleRequestId: string | null;
    authorizationType: RefundAuthorizationType;
    requestedByAdminId: string;
    logicalRequestId: string;
    reason: string;
    processingMode: RefundProcessingMode;
  }>,
): Promise<readonly RefundSummaryRecord[]> {
  const children: RefundSummaryRecord[] = [];

  for (const [index, leg] of input.allocation.legs.entries()) {
    const child = await transaction.refund.create({
      data: {
        paymentId: leg.paymentId,
        lifecycleRequestId: input.lifecycleRequestId,
        refundOperationKey: input.operationKey,
        requestedByAdminId: input.requestedByAdminId,
        clientRequestId: buildRefundChildRequestId(
          input.logicalRequestId,
          index,
          leg.paymentId,
        ),
        idempotencyKey: buildRefundChildIdempotencyKey(
          input.operationKey,
          index,
          leg.paymentId,
        ),
        authorizationType: input.authorizationType,
        amount: leg.amount,
        currency: leg.currency,
        reason: input.reason,
        status: RefundStatus.PENDING,
        processingMode: input.processingMode,
      },
      select: refundSummarySelect,
    });
    children.push(child);
  }

  return children;
}

function toAuthorizationResult(
  refunds: readonly RefundSummaryRecord[],
  requestedAmount: Prisma.Decimal,
  operationKey: string | null,
  alreadyProcessed: boolean,
): AdminRefundAuthorizationResult {
  if (refunds.length === 0) {
    throw new AdminRefundError("ADMIN_REFUND_UNEXPECTED_ERROR");
  }

  const summaries = refunds.map(toAdminRefundSummary);

  return {
    refund: summaries[0],
    refunds: summaries,
    refundOperationKey: operationKey,
    requestedAmount: requestedAmount.toFixed(2),
    alreadyProcessed,
  };
}

async function readExistingOperation(
  transaction: Pick<Prisma.TransactionClient, "refund">,
  input: Readonly<{
    operationKey: string;
    requestedAmount: Prisma.Decimal;
    authorizationType: RefundAuthorizationType;
    lifecycleRequestId: string | null;
    processingMode: RefundProcessingMode | string;
    reason: string;
  }>,
): Promise<AdminRefundAuthorizationResult | null> {
  const existing = await transaction.refund.findMany({
    where: { refundOperationKey: input.operationKey },
    orderBy: [{ clientRequestId: "asc" }, { id: "asc" }],
    select: refundSummarySelect,
  });

  if (existing.length === 0) {
    return null;
  }

  const total = existing.reduce(
    (sum, refund) => sum.add(refund.amount).toDecimalPlaces(2),
    new Prisma.Decimal(0),
  );
  const normalizedReason = normalizeRequiredText(
    input.reason,
    REFUND_REASON_MAX_LENGTH,
  );

  if (
    !total.equals(input.requestedAmount) ||
    existing.some(
      (refund) =>
        refund.authorizationType !== input.authorizationType ||
        refund.lifecycleRequestId !== input.lifecycleRequestId ||
        refund.processingMode !== input.processingMode ||
        refund.reason !== normalizedReason,
    )
  ) {
    throw new AdminRefundError("ADMIN_REFUND_UNEXPECTED_ERROR");
  }

  return toAuthorizationResult(
    existing,
    input.requestedAmount,
    input.operationKey,
    true,
  );
}

async function readLegacyStandardAuthorization(
  transaction: Pick<Prisma.TransactionClient, "refund">,
  lifecycleRequestId: string,
  requestId: string,
  amount: Prisma.Decimal,
  processingMode: RefundProcessingMode | string,
): Promise<AdminRefundAuthorizationResult | null> {
  const existing = await transaction.refund.findUnique({
    where: {
      idempotencyKey: buildLegacyStandardRefundIdempotencyKey(
        lifecycleRequestId,
        requestId,
      ),
    },
    select: refundSummarySelect,
  });

  if (!existing) {
    return null;
  }

  if (
    existing.lifecycleRequestId !== lifecycleRequestId ||
    existing.authorizationType !== RefundAuthorizationType.STANDARD_POLICY ||
    !existing.amount.equals(amount) ||
    existing.processingMode !== processingMode
  ) {
    throw new AdminRefundError("ADMIN_REFUND_UNEXPECTED_ERROR");
  }

  return toAuthorizationResult([existing], amount, null, true);
}

async function readLegacyExtraordinaryAuthorization(
  transaction: Pick<Prisma.TransactionClient, "refund">,
  input: CreateAdminExtraordinaryRefundInput,
  amount: Prisma.Decimal,
): Promise<AdminRefundAuthorizationResult | null> {
  const paymentId = input.paymentId?.trim();

  if (!paymentId) {
    return null;
  }

  const existing = await transaction.refund.findUnique({
    where: {
      idempotencyKey: buildLegacyExtraordinaryRefundIdempotencyKey(
        input.reservationId.trim(),
        paymentId,
        input.requestId.trim(),
      ),
    },
    select: refundSummarySelect,
  });

  if (!existing) {
    return null;
  }

  if (
    existing.lifecycleRequestId !== null ||
    existing.paymentId !== paymentId ||
    existing.authorizationType !== RefundAuthorizationType.EXTRAORDINARY ||
    !existing.amount.equals(amount) ||
    existing.processingMode !== input.processingMode
  ) {
    throw new AdminRefundError("ADMIN_REFUND_UNEXPECTED_ERROR");
  }

  return toAuthorizationResult([existing], amount, null, true);
}

async function createStandardRefundAuthorizationTransaction(
  input: CreateAdminStandardRefundInput,
  actor: AdminActor,
): Promise<AdminRefundAuthorizationResult> {
  const lifecycleRequestId = input.lifecycleRequestId.trim();
  const requestId = input.requestId.trim();
  const operationKey = buildStandardRefundOperationKey(
    lifecycleRequestId,
    requestId,
  );
  const amount = parsePositiveAmount(input.amount);
  const normalizedReason = normalizeRequiredText(
    input.reason,
    REFUND_REASON_MAX_LENGTH,
  );

  return prisma.$transaction(
    async (transaction) => {
      const existingOperation = await readExistingOperation(transaction, {
        operationKey,
        requestedAmount: amount,
        authorizationType: RefundAuthorizationType.STANDARD_POLICY,
        lifecycleRequestId,
        processingMode: input.processingMode,
        reason: normalizedReason,
      });

      if (existingOperation) {
        return existingOperation;
      }

      const legacy = await readLegacyStandardAuthorization(
        transaction,
        lifecycleRequestId,
        requestId,
        amount,
        input.processingMode,
      );

      if (legacy) {
        return legacy;
      }

      const adminActor = await resolveAdminActor(transaction, actor);
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

      assertStandardLifecycleRequestEligible(lifecycleRequest, input);
      const standardPolicyAmount = lifecycleRequest.standardRefundAmount;
      const standardCommittedAmount = await sumRefundAmounts(transaction, {
        lifecycleRequestId,
        authorizationType: {
          in: [
            RefundAuthorizationType.LEGACY_UNSPECIFIED,
            RefundAuthorizationType.STANDARD_POLICY,
          ],
        },
        status: { in: [...COMMITTED_REFUND_STATUSES] },
      });
      const policyDifference = standardPolicyAmount.sub(standardCommittedAmount);
      const remainingPolicyAmount = policyDifference.greaterThan(0)
        ? policyDifference
        : new Prisma.Decimal(0);

      if (
        lifecycleRequest.policyExceptionApplied ||
        !standardPolicyAmount.greaterThan(0) ||
        amount.greaterThan(remainingPolicyAmount)
      ) {
        throw new AdminRefundError(
          lifecycleRequest.policyExceptionApplied ||
            !standardPolicyAmount.greaterThan(0)
            ? "ADMIN_REFUND_POLICY_NOT_ELIGIBLE"
            : "ADMIN_REFUND_AMOUNT_EXCEEDS_POLICY",
        );
      }

      const financial = await buildRefundAllocation(
        transaction,
        lifecycleRequest.reservation.id,
        amount,
      );

      if (financial.currency !== lifecycleRequest.currency) {
        throw new AdminRefundError("ADMIN_REFUND_UNEXPECTED_ERROR");
      }

      assertApiModeSupportedByAllocation(
        financial.allocation,
        input.processingMode,
      );

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
            approvedRefundAmount:
              lifecycleRequest.approvedRefundAmount ?? standardPolicyAmount,
            version: { increment: 1 },
          },
        });

      if (requestFence.count !== 1) {
        throw new AdminRefundError("ADMIN_REFUND_STALE");
      }

      await fenceAllocatedPayments(transaction, financial.allocation);
      const refunds = await createRefundChildren(transaction, {
        operationKey,
        allocation: financial.allocation,
        lifecycleRequestId: lifecycleRequest.id,
        authorizationType: RefundAuthorizationType.STANDARD_POLICY,
        requestedByAdminId: adminActor.id,
        logicalRequestId: requestId,
        reason: normalizedReason,
        processingMode: input.processingMode as RefundProcessingMode,
      });

      await transaction.adminAuditLog.create({
        data: {
          userId: adminActor.id,
          action: "REFUND_AUTHORIZED",
          entityType: "Refund",
          entityId: refunds[0].id,
          metadata: {
            actorEmail: adminActor.email,
            reservationId: lifecycleRequest.reservation.id,
            reservationStatus: lifecycleRequest.reservation.status,
            lifecycleRequestId: lifecycleRequest.id,
            clientRequestId: requestId,
            refundOperationKey: operationKey,
            refundIds: refunds.map((refund) => refund.id),
            paymentIds: financial.allocation.legs.map((leg) => leg.paymentId),
            legAmounts: financial.allocation.legs.map((leg) =>
              leg.amount.toFixed(2),
            ),
            amount: amount.toFixed(2),
            currency: financial.currency,
            authorizationType: RefundAuthorizationType.STANDARD_POLICY,
            processingMode: input.processingMode,
            standardPolicyAmount: standardPolicyAmount.toFixed(2),
            standardPolicyCommittedBefore: standardCommittedAmount.toFixed(2),
            policyRemainingBefore: remainingPolicyAmount.toFixed(2),
            stayRefundableBalanceBefore:
              financial.remainingRefundableStayBalance.toFixed(2),
            outsideCancellationPolicy: false,
            providerCalled: false,
          },
        },
      });

      return toAuthorizationResult(refunds, amount, operationKey, false);
    },
    {
      isolationLevel: Prisma.TransactionIsolationLevel.Serializable,
    },
  );
}

async function createExtraordinaryRefundAuthorizationTransaction(
  input: CreateAdminExtraordinaryRefundInput,
  actor: AdminActor,
): Promise<AdminRefundAuthorizationResult> {
  const reservationId = input.reservationId.trim();
  const requestId = input.requestId.trim();
  const operationKey = buildExtraordinaryRefundOperationKey(
    reservationId,
    requestId,
  );
  const amount = parsePositiveAmount(input.amount);
  const normalizedReason = normalizeRequiredText(
    input.reason,
    REFUND_REASON_MAX_LENGTH,
  );

  return prisma.$transaction(
    async (transaction) => {
      const existingOperation = await readExistingOperation(transaction, {
        operationKey,
        requestedAmount: amount,
        authorizationType: RefundAuthorizationType.EXTRAORDINARY,
        lifecycleRequestId: null,
        processingMode: input.processingMode,
        reason: normalizedReason,
      });

      if (existingOperation) {
        return existingOperation;
      }

      const legacy = await readLegacyExtraordinaryAuthorization(
        transaction,
        input,
        amount,
      );

      if (legacy) {
        return legacy;
      }

      const reservation = await transaction.reservation.findUnique({
        where: { id: reservationId },
        select: {
          id: true,
          status: true,
          updatedAt: true,
          currency: true,
        },
      });

      if (!reservation) {
        throw new AdminRefundError("ADMIN_REFUND_PAYMENT_NOT_FOUND");
      }

      if (
        reservation.status !== ReservationStatus.CONFIRMED &&
        reservation.status !== ReservationStatus.CANCELLED
      ) {
        throw new AdminRefundError("ADMIN_REFUND_RESERVATION_NOT_ELIGIBLE");
      }

      if (
        reservation.updatedAt.toISOString() !==
        input.expectedReservationUpdatedAt
      ) {
        throw new AdminRefundError("ADMIN_REFUND_STALE");
      }

      const financial = await buildRefundAllocation(
        transaction,
        reservation.id,
        amount,
      );

      if (financial.currency !== reservation.currency) {
        throw new AdminRefundError("ADMIN_REFUND_UNEXPECTED_ERROR");
      }

      assertApiModeSupportedByAllocation(
        financial.allocation,
        input.processingMode,
      );

      const reservationFence = await transaction.reservation.updateMany({
        where: {
          id: reservation.id,
          updatedAt: reservation.updatedAt,
          status: {
            in: [ReservationStatus.CONFIRMED, ReservationStatus.CANCELLED],
          },
        },
        data: {
          updatedAt: reservation.updatedAt,
        },
      });

      if (reservationFence.count !== 1) {
        throw new AdminRefundError("ADMIN_REFUND_STALE");
      }

      await fenceAllocatedPayments(transaction, financial.allocation);
      const adminActor = await resolveAdminActor(transaction, actor);
      const refunds = await createRefundChildren(transaction, {
        operationKey,
        allocation: financial.allocation,
        lifecycleRequestId: null,
        authorizationType: RefundAuthorizationType.EXTRAORDINARY,
        requestedByAdminId: adminActor.id,
        logicalRequestId: requestId,
        reason: normalizedReason,
        processingMode: input.processingMode as RefundProcessingMode,
      });

      await transaction.adminAuditLog.create({
        data: {
          userId: adminActor.id,
          action: "REFUND_EXTRAORDINARY_AUTHORIZED",
          entityType: "Refund",
          entityId: refunds[0].id,
          metadata: {
            actorEmail: adminActor.email,
            reservationId,
            reservationStatus: reservation.status,
            lifecycleRequestId: null,
            clientRequestId: requestId,
            refundOperationKey: operationKey,
            refundIds: refunds.map((refund) => refund.id),
            paymentIds: financial.allocation.legs.map((leg) => leg.paymentId),
            legAmounts: financial.allocation.legs.map((leg) =>
              leg.amount.toFixed(2),
            ),
            amount: amount.toFixed(2),
            currency: financial.currency,
            authorizationType: RefundAuthorizationType.EXTRAORDINARY,
            processingMode: input.processingMode,
            standardPolicyAmount: null,
            standardPolicyCommittedBefore: null,
            policyRemainingBefore: null,
            stayRefundableBalanceBefore:
              financial.remainingRefundableStayBalance.toFixed(2),
            outsideCancellationPolicy: true,
            reservationCancelledByRefund: false,
            providerCalled: false,
          },
        },
      });

      return toAuthorizationResult(refunds, amount, operationKey, false);
    },
    {
      isolationLevel: Prisma.TransactionIsolationLevel.Serializable,
    },
  );
}

async function findExistingAuthorizationAfterConflict(
  input: CreateAdminRefundInput,
  requestedAmount: Prisma.Decimal,
): Promise<AdminRefundAuthorizationResult | null> {
  const operationKey =
    input.authorizationType === "EXTRAORDINARY"
      ? buildExtraordinaryRefundOperationKey(
          input.reservationId.trim(),
          input.requestId.trim(),
        )
      : buildStandardRefundOperationKey(
          input.lifecycleRequestId.trim(),
          input.requestId.trim(),
        );
  const lifecycleRequestId =
    input.authorizationType === "EXTRAORDINARY"
      ? null
      : input.lifecycleRequestId.trim();
  const authorizationType =
    input.authorizationType === "EXTRAORDINARY"
      ? RefundAuthorizationType.EXTRAORDINARY
      : RefundAuthorizationType.STANDARD_POLICY;
  const existingOperation = await readExistingOperation(prisma, {
    operationKey,
    requestedAmount,
    authorizationType,
    lifecycleRequestId,
    processingMode: input.processingMode,
    reason: input.reason,
  });

  if (existingOperation) {
    return existingOperation;
  }

  return input.authorizationType === "EXTRAORDINARY"
    ? readLegacyExtraordinaryAuthorization(prisma, input, requestedAmount)
    : readLegacyStandardAuthorization(
        prisma,
        input.lifecycleRequestId.trim(),
        input.requestId.trim(),
        requestedAmount,
        input.processingMode,
      );
}

export async function createAdminRefundAuthorization(
  input: CreateAdminRefundInput,
  actor: AdminActor,
): Promise<AdminRefundAuthorizationResult> {
  const requestedAmount = parsePositiveAmount(input.amount);

  try {
    return input.authorizationType === "EXTRAORDINARY"
      ? await createExtraordinaryRefundAuthorizationTransaction(input, actor)
      : await createStandardRefundAuthorizationTransaction(input, actor);
  } catch (error) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      (error.code === "P2002" || error.code === "P2034")
    ) {
      const existing = await findExistingAuthorizationAfterConflict(
        input,
        requestedAmount,
      );

      if (existing) {
        return existing;
      }

      throw new AdminRefundError("ADMIN_REFUND_STALE");
    }

    throw error;
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

function isCompletedPositiveStayAdjustmentPayment(
  refund: RefundForAction,
): boolean {
  const lifecycleRequest = refund.payment.lifecycleRequest;
  const difference = lifecycleRequest?.financialDifference;

  return Boolean(
    refund.payment.purpose === PaymentPurpose.LIFECYCLE_ADJUSTMENT &&
      refund.payment.lifecycleRequestId &&
      lifecycleRequest &&
      refund.payment.lifecycleRequestId === lifecycleRequest.id &&
      lifecycleRequest.reservationId === refund.payment.reservationId &&
      lifecycleRequest.currency === refund.payment.currency &&
      (lifecycleRequest.requestType ===
        ReservationLifecycleRequestType.DATE_CHANGE ||
        lifecycleRequest.requestType ===
          ReservationLifecycleRequestType.STAY_EXTENSION) &&
      lifecycleRequest.status === ReservationLifecycleRequestStatus.COMPLETED &&
      difference &&
      difference.greaterThan(0) &&
      refund.payment.amount.equals(difference),
  );
}

function assertRefundPaymentRelationship(refund: RefundForAction): void {
  const reservationStatusAllowed =
    refund.authorizationType === RefundAuthorizationType.EXTRAORDINARY
      ? refund.payment.reservation.status === ReservationStatus.CONFIRMED ||
        refund.payment.reservation.status === ReservationStatus.CANCELLED
      : refund.payment.reservation.status === ReservationStatus.CANCELLED;

  if (!reservationStatusAllowed) {
    throw new AdminRefundError(
      refund.authorizationType === RefundAuthorizationType.EXTRAORDINARY
        ? "ADMIN_REFUND_RESERVATION_NOT_ELIGIBLE"
        : "ADMIN_REFUND_RESERVATION_NOT_CANCELLED",
    );
  }

  const eligibleStayPayment =
    (refund.payment.purpose === PaymentPurpose.INITIAL_RESERVATION &&
      refund.payment.lifecycleRequestId === null) ||
    isCompletedPositiveStayAdjustmentPayment(refund);

  if (
    !eligibleStayPayment ||
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
  authorizationType: RefundAuthorizationType,
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
            authorizationType,
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
  authorizationType: RefundAuthorizationType,
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
            authorizationType,
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
            authorizationType: refund.authorizationType,
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
      refund.authorizationType,
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
      refund.authorizationType,
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
    const typeMatches = isTilopayRefundConsultType(candidate.type);

    if (
      providerClassification === "PROVIDER_ACCEPTED" &&
      amountMatches &&
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
              authorizationType: refund.authorizationType,
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
  const transactionResult = await prisma.$transaction(
    async (transaction): Promise<RefundReconciliationTransactionResult> => {
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
          reconciliationResult: {
            refund: toAdminRefundSummary(refund),
            paymentStatus: refund.payment.status,
            cumulativeApprovedAmount: cumulativeApprovedAmount.toFixed(2),
            alreadyProcessed: true,
          },
          notificationIds: [],
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
          reconciliationResult: {
            refund: toAdminRefundSummary(refund),
            paymentStatus: refund.payment.status,
            cumulativeApprovedAmount: cumulativeApprovedAmount.toFixed(2),
            alreadyProcessed: true,
          },
          notificationIds: [],
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
      const hasConclusiveConsultEvidence = Boolean(
        currentDiagnostics?.source === "tilopay_refund_consult" &&
          (currentDiagnostics.resultClassification === "PROVIDER_ACCEPTED" ||
            currentDiagnostics.resultClassification === "PROVIDER_REJECTED") &&
          currentDiagnostics.providerReference &&
          isTilopayRefundConsultType(currentDiagnostics.modificationType) &&
          currentDiagnostics.amount,
      );

      if (
        hasConclusiveConsultEvidence &&
        input.source !== "TILOPAY_CONSULT"
      ) {
        throw new AdminRefundError("ADMIN_REFUND_RECONCILIATION_CONFLICT");
      }

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
        const typeMatches = isTilopayRefundConsultType(
          currentDiagnostics?.modificationType ?? null,
        );

        if (
          currentDiagnostics?.source !== "tilopay_refund_consult" ||
          currentDiagnostics.resultClassification !== expectedClassification ||
          !typeMatches ||
          !currentDiagnostics.providerReference ||
          providerRefundId !== currentDiagnostics.providerReference ||
          !amountMatches
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

      const lifecycleNotificationIntents =
        input.outcome === "APPROVED"
          ? await createRefundNotificationIntents(transaction, {
              reservationId: refund.payment.reservationId,
              lifecycleRequestId: refund.lifecycleRequestId,
              refundId: refund.id,
              guestEmail: refund.payment.reservation.guestEmail,
              preferredLocale: refund.payment.reservation.preferredLocale,
            })
          : [];

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
            authorizationType: refund.authorizationType,
            source: input.source,
            finalProcessingMode: input.finalProcessingMode,
            providerReferenceRecorded: Boolean(providerRefundId),
            paymentStatus,
            cumulativeApprovedAmount: cumulativeApprovedAmount.toFixed(2),
            reservationStatus: refund.payment.reservation.status,
            reservationRestored: false,
            lifecycleNotificationCreated: input.outcome === "APPROVED",
            lifecycleNotificationCount: lifecycleNotificationIntents.length,
            lifecycleNotificationIds: lifecycleNotificationIntents.map(
              ({ id }) => id,
            ),
          },
        },
      });

      return {
        reconciliationResult: {
          refund: await readRefundSummaryById(transaction, refund.id),
          paymentStatus,
          cumulativeApprovedAmount: cumulativeApprovedAmount.toFixed(2),
          alreadyProcessed: false,
        },
        notificationIds: lifecycleNotificationIntents.map(({ id }) => id),
      };
    },
    { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
  );

  await deliverLifecycleNotificationsBestEffort(
    transactionResult.notificationIds,
  );

  return transactionResult.reconciliationResult;
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
