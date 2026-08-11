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
  buildNegativeLifecycleRefundOperationKey,
} from "@/lib/reservations/lifecycle-adjustment-refunds";
import {
  createRefundNotificationIntents,
  deliverLifecycleNotificationsBestEffort,
} from "@/lib/email/lifecycle-notifications";
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
  AdminRefundConsultResult,
  AdminRefundExecutionResult,
  AdminRefundReconciliationResult,
  ConsultAdminRefundInput,
  ExecuteAdminRefundInput,
  ReconcileAdminRefundInput,
} from "@/types/admin-refund";

import { resolveAdminActor } from "./admin-actor";
import {
  AdminRefundError,
  toAdminRefundSummary,
} from "./refunds";

const RECONCILIATION_NOTE_MAX_LENGTH = 2_000;
const PROVIDER_REFERENCE_MAX_LENGTH = 180;
const SAFE_DESCRIPTION_MAX_LENGTH = 240;
const SAFE_CODE_MAX_LENGTH = 100;
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
const DATE_MUTATION_REQUEST_TYPES = new Set<ReservationLifecycleRequestType>([
  ReservationLifecycleRequestType.DATE_CHANGE,
  ReservationLifecycleRequestType.STAY_EXTENSION,
]);
const FAILED_COMPLETION_REQUEST_STATUSES =
  new Set<ReservationLifecycleRequestStatus>([
    ReservationLifecycleRequestStatus.FAILED,
    ReservationLifecycleRequestStatus.EXPIRED,
  ]);
const REFUNDABLE_PAYMENT_STATUS_SET = new Set<PaymentStatus>([
  ...REFUNDABLE_PAYMENT_STATUSES,
]);
const REFUND_PAYMENT_HISTORY_STATUS_SET = new Set<PaymentStatus>([
  ...REFUND_PAYMENT_HISTORY_STATUSES,
]);

const lifecycleRefundSummarySelect = {
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

const lifecycleRefundForActionSelect = {
  ...lifecycleRefundSummarySelect,
  lifecycleRequest: {
    select: {
      id: true,
      reservationId: true,
      sourcePaymentId: true,
      requestType: true,
      status: true,
      financialDifference: true,
      currency: true,
    },
  },
  payment: {
    select: {
      id: true,
      reservationId: true,
      lifecycleRequestId: true,
      purpose: true,
      providerReference: true,
      status: true,
      amount: true,
      currency: true,
      updatedAt: true,
      reservation: {
        select: {
          id: true,
          status: true,
          guestEmail: true,
          preferredLocale: true,
          updatedAt: true,
        },
      },
    },
  },
} satisfies Prisma.RefundSelect;

type LifecycleRefundForAction = Prisma.RefundGetPayload<{
  select: typeof lifecycleRefundForActionSelect;
}>;

type LifecycleRefundReconciliationTransactionResult = Readonly<{
  result: AdminRefundReconciliationResult;
  lifecycleNotificationIds: readonly string[];
}>;

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
    providerReference:
      typeof rawPayload.providerReference === "string"
        ? rawPayload.providerReference
        : null,
    amount: typeof rawPayload.amount === "string" ? rawPayload.amount : null,
    modificationType:
      typeof rawPayload.modificationType === "string"
        ? rawPayload.modificationType
        : null,
    resultClassification:
      typeof rawPayload.resultClassification === "string"
        ? rawPayload.resultClassification
        : null,
  } as const;
}

async function isLifecycleAdjustmentRefund(refundId: string): Promise<boolean> {
  const refund = await prisma.refund.findUnique({
    where: { id: refundId.trim() },
    select: { authorizationType: true },
  });

  return (
    refund?.authorizationType === RefundAuthorizationType.LIFECYCLE_ADJUSTMENT
  );
}

async function readRefundForAction(
  refundId: string,
): Promise<LifecycleRefundForAction> {
  const refund = await prisma.refund.findUnique({
    where: { id: refundId.trim() },
    select: lifecycleRefundForActionSelect,
  });

  if (!refund) {
    throw new AdminRefundError("ADMIN_REFUND_NOT_FOUND");
  }

  await assertLifecycleRefundRelationship(refund);
  return refund;
}

async function assertLifecycleRefundRelationship(
  refund: LifecycleRefundForAction,
): Promise<void> {
  const request = refund.lifecycleRequest;
  const difference = request?.financialDifference;

  if (
    refund.authorizationType !== RefundAuthorizationType.LIFECYCLE_ADJUSTMENT ||
    !request ||
    !difference ||
    refund.lifecycleRequestId !== request.id ||
    request.reservationId !== refund.payment.reservationId ||
    !DATE_MUTATION_REQUEST_TYPES.has(request.requestType) ||
    (refund.payment.reservation.status !== ReservationStatus.CONFIRMED &&
      refund.payment.reservation.status !== ReservationStatus.CANCELLED) ||
    refund.payment.currency !== refund.currency ||
    request.currency !== refund.currency ||
    !REFUND_PAYMENT_HISTORY_STATUS_SET.has(refund.payment.status)
  ) {
    throw new AdminRefundError("ADMIN_REFUND_PAYMENT_NOT_REFUNDABLE");
  }

  const negativeDifference = difference.lessThan(0);
  const failedPositiveCompletion = difference.greaterThan(0);

  if (negativeDifference) {
    if (request.status !== ReservationLifecycleRequestStatus.COMPLETED) {
      throw new AdminRefundError("ADMIN_REFUND_PAYMENT_NOT_REFUNDABLE");
    }

    if (refund.refundOperationKey === null) {
      if (
        refund.payment.purpose !== PaymentPurpose.INITIAL_RESERVATION ||
        request.sourcePaymentId !== refund.payment.id ||
        refund.payment.lifecycleRequestId !== null ||
        refund.amount.comparedTo(difference.abs()) !== 0
      ) {
        throw new AdminRefundError("ADMIN_REFUND_PAYMENT_NOT_REFUNDABLE");
      }
      return;
    }

    const expectedOperationKey =
      buildNegativeLifecycleRefundOperationKey(request.id);
    if (
      refund.refundOperationKey !== expectedOperationKey ||
      !refund.amount.greaterThan(0)
    ) {
      throw new AdminRefundError("ADMIN_REFUND_PAYMENT_NOT_REFUNDABLE");
    }

    let financialSummary;
    try {
      financialSummary = await getReservationFinancialSummary(
        request.reservationId,
      );
    } catch (error) {
      if (error instanceof ReservationFinancialSummaryError) {
        throw new AdminRefundError("ADMIN_REFUND_PAYMENT_NOT_REFUNDABLE");
      }
      throw error;
    }

    const eligiblePaymentIds = new Set(
      financialSummary.eligibleStayPayments.map((payment) => payment.paymentId),
    );
    if (!eligiblePaymentIds.has(refund.payment.id)) {
      throw new AdminRefundError("ADMIN_REFUND_PAYMENT_NOT_REFUNDABLE");
    }

    const operationRefunds = await prisma.refund.findMany({
      where: { refundOperationKey: expectedOperationKey },
      select: {
        id: true,
        paymentId: true,
        lifecycleRequestId: true,
        refundOperationKey: true,
        authorizationType: true,
        amount: true,
        currency: true,
      },
    });
    const seenPayments = new Set<string>();
    const operationTotal = operationRefunds.reduce((total, child) => {
      if (
        child.refundOperationKey !== expectedOperationKey ||
        child.lifecycleRequestId !== request.id ||
        child.authorizationType !== RefundAuthorizationType.LIFECYCLE_ADJUSTMENT ||
        child.currency !== request.currency ||
        !child.amount.greaterThan(0) ||
        !eligiblePaymentIds.has(child.paymentId) ||
        seenPayments.has(child.paymentId)
      ) {
        throw new AdminRefundError("ADMIN_REFUND_PAYMENT_NOT_REFUNDABLE");
      }
      seenPayments.add(child.paymentId);
      return total.add(child.amount).toDecimalPlaces(2);
    }, new Prisma.Decimal(0));

    if (
      operationRefunds.length === 0 ||
      !operationTotal.equals(difference.abs().toDecimalPlaces(2))
    ) {
      throw new AdminRefundError("ADMIN_REFUND_PAYMENT_NOT_REFUNDABLE");
    }

    return;
  }

  if (
    !failedPositiveCompletion ||
    !FAILED_COMPLETION_REQUEST_STATUSES.has(request.status) ||
    refund.payment.purpose !== PaymentPurpose.LIFECYCLE_ADJUSTMENT ||
    refund.payment.lifecycleRequestId !== request.id ||
    refund.amount.comparedTo(refund.payment.amount) !== 0
  ) {
    throw new AdminRefundError("ADMIN_REFUND_PAYMENT_NOT_REFUNDABLE");
  }
}

function assertPaymentCanReceiveApprovedRefund(
  refund: LifecycleRefundForAction,
): void {
  if (
    !REFUNDABLE_PAYMENT_STATUS_SET.has(refund.payment.status)
  ) {
    throw new AdminRefundError("ADMIN_REFUND_PAYMENT_NOT_REFUNDABLE");
  }
}

async function readRefundSummaryById(
  transaction: Prisma.TransactionClient,
  refundId: string,
) {
  const refund = await transaction.refund.findUnique({
    where: { id: refundId },
    select: lifecycleRefundSummarySelect,
  });

  if (!refund) {
    throw new AdminRefundError("ADMIN_REFUND_NOT_FOUND");
  }

  return toAdminRefundSummary(refund);
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

async function recordExecutionObservation(
  refund: LifecycleRefundForAction,
  observation: TilopayModificationObservation,
  actor: AdminActor,
  requestId: string,
) {
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
    async (transaction: Prisma.TransactionClient) => {
      const adminActor = await resolveAdminActor(transaction, actor);
      const updated = await transaction.refund.updateMany({
        where: { id: refund.id, status: RefundStatus.PROCESSING },
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
          entityId: refund.id,
          metadata: toSafeJson({
            actorEmail: adminActor.email,
            requestId,
            authorizationType: refund.authorizationType,
            lifecycleRequestId: refund.lifecycleRequestId,
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

      return readRefundSummaryById(transaction, refund.id);
    },
    { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
  );
}

async function recordExecutionFailure(
  refund: LifecycleRefundForAction,
  error: TilopayApiClientError,
  actor: AdminActor,
  requestId: string,
) {
  const observedAt = new Date();
  const uncertain = error.requestMayHaveReachedProvider;

  return prisma.$transaction(
    async (transaction: Prisma.TransactionClient) => {
      const adminActor = await resolveAdminActor(transaction, actor);
      const updated = await transaction.refund.updateMany({
        where: { id: refund.id, status: RefundStatus.PROCESSING },
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
          entityId: refund.id,
          metadata: {
            actorEmail: adminActor.email,
            requestId,
            authorizationType: refund.authorizationType,
            lifecycleRequestId: refund.lifecycleRequestId,
            failureCode: error.code,
            requestMayHaveReachedProvider: uncertain,
            paymentStatusChanged: false,
          },
        },
      });

      return readRefundSummaryById(transaction, refund.id);
    },
    { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
  );
}

export async function executeAdminLifecycleAdjustmentRefundIfApplicable(
  input: ExecuteAdminRefundInput,
  actor: AdminActor,
): Promise<AdminRefundExecutionResult | null> {
  if (!(await isLifecycleAdjustmentRefund(input.refundId))) {
    return null;
  }

  const env = getTilopayEnv();

  if (env.TILOPAY_ENVIRONMENT !== "sandbox") {
    throw new AdminRefundError("ADMIN_REFUND_API_SANDBOX_ONLY");
  }

  const refund = await readRefundForAction(input.refundId);

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

  const orderNumber = refund.payment.providerReference.trim();
  const startedAt = new Date();
  await prisma.$transaction(
    async (transaction: Prisma.TransactionClient) => {
      const adminActor = await resolveAdminActor(transaction, actor);
      const claim = await transaction.refund.updateMany({
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

      if (claim.count !== 1) {
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
            lifecycleRequestId: refund.lifecycleRequestId,
            paymentId: refund.payment.id,
            orderNumber,
            amount: refund.amount.toFixed(2),
            currency: refund.currency,
            authorizationType: refund.authorizationType,
            modificationType: "2",
            environment: env.TILOPAY_ENVIRONMENT,
          },
        },
      });
    },
    { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
  );

  try {
    const observation = await processTilopayModification({
      orderNumber,
      type: "2",
      amount: refund.amount.toFixed(2),
    });
    const summary = await recordExecutionObservation(
      refund,
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
      refund,
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
  if (!value?.trim()) return null;

  try {
    return new Prisma.Decimal(value.trim());
  } catch {
    return null;
  }
}

function candidateMatchesRefundIdentity(
  refund: LifecycleRefundForAction,
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
  refund: LifecycleRefundForAction,
  candidates: readonly TilopayConsultCandidate[],
) {
  if (!refund.providerRefundId?.trim()) {
    return {
      candidate: null,
      resultClassification: "CONSULT_REFERENCE_MISSING" as const,
    };
  }

  const identityMatches = candidates.filter((candidate) =>
    candidateMatchesRefundIdentity(refund, candidate),
  );

  if (identityMatches.length === 0) {
    return {
      candidate: null,
      resultClassification: "CONSULT_NO_MATCH" as const,
    };
  }

  for (const candidate of identityMatches) {
    const classification = classifyTilopayConsultCandidate(candidate);
    const amount = parseConsultAmount(candidate.amount);
    const amountMatches = amount !== null && amount.abs().equals(refund.amount);
    const typeMatches = isTilopayRefundConsultType(candidate.type);

    if (
      classification === "PROVIDER_ACCEPTED" &&
      amountMatches &&
      typeMatches
    ) {
      return { candidate, resultClassification: "PROVIDER_ACCEPTED" as const };
    }

    if (
      classification === "PROVIDER_REJECTED" &&
      amountMatches &&
      typeMatches
    ) {
      return { candidate, resultClassification: "PROVIDER_REJECTED" as const };
    }
  }

  return {
    candidate: identityMatches[0] ?? null,
    resultClassification: "CONSULT_MATCH_INCONCLUSIVE" as const,
  };
}

export async function consultAdminLifecycleAdjustmentRefundIfApplicable(
  input: ConsultAdminRefundInput,
  actor: AdminActor,
): Promise<AdminRefundConsultResult | null> {
  if (!(await isLifecycleAdjustmentRefund(input.refundId))) {
    return null;
  }

  const refund = await readRefundForAction(input.refundId);

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

  const orderNumber = refund.payment.providerReference.trim();

  try {
    const observation = await observeTilopayConsultTransaction(orderNumber);
    const evidence = classifyConsultEvidence(refund, observation.candidates);
    const candidate = evidence.candidate;
    const failureCode =
      evidence.resultClassification === "PROVIDER_ACCEPTED"
        ? "TILOPAY_REFUND_CONSULT_ACCEPTED"
        : evidence.resultClassification === "PROVIDER_REJECTED"
          ? "TILOPAY_REFUND_CONSULT_REJECTED"
          : "TILOPAY_REFUND_CONSULT_INCONCLUSIVE";

    const summary = await prisma.$transaction(
      async (transaction: Prisma.TransactionClient) => {
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
              lifecycleRequestId: refund.lifecycleRequestId,
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

    return { refund: summary, requiresReconciliation: true };
  } catch (error) {
    if (error instanceof AdminRefundError) throw error;
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

export async function reconcileAdminLifecycleAdjustmentRefundIfApplicable(
  input: ReconcileAdminRefundInput,
  actor: AdminActor,
): Promise<AdminRefundReconciliationResult | null> {
  if (!(await isLifecycleAdjustmentRefund(input.refundId))) {
    return null;
  }

  const transactionResult = await prisma.$transaction(
    async (
      transaction: Prisma.TransactionClient,
    ): Promise<LifecycleRefundReconciliationTransactionResult> => {
      const adminActor = await resolveAdminActor(transaction, actor);
      const refund = await transaction.refund.findUnique({
        where: { id: input.refundId.trim() },
        select: lifecycleRefundForActionSelect,
      });

      if (!refund) {
        throw new AdminRefundError("ADMIN_REFUND_NOT_FOUND");
      }

      assertLifecycleRefundRelationship(refund);

      if (
        input.outcome === "APPROVED" &&
        refund.status === RefundStatus.APPROVED
      ) {
        const cumulativeApprovedAmount = await sumRefundAmounts(transaction, {
          paymentId: refund.paymentId,
          status: { in: [...COMPLETED_REFUND_STATUSES] },
        });

        return {
          result: {
            refund: toAdminRefundSummary(refund),
            paymentStatus: refund.payment.status,
            cumulativeApprovedAmount: cumulativeApprovedAmount.toFixed(2),
            alreadyProcessed: true,
          },
          lifecycleNotificationIds: [],
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
          result: {
            refund: toAdminRefundSummary(refund),
            paymentStatus: refund.payment.status,
            cumulativeApprovedAmount: cumulativeApprovedAmount.toFixed(2),
            alreadyProcessed: true,
          },
          lifecycleNotificationIds: [],
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

      const diagnostics = toDiagnostics(refund.rawPayload);
      const providerRefundId = normalizeOptionalText(
        input.providerRefundId,
        PROVIDER_REFERENCE_MAX_LENGTH,
      );
      const hasConclusiveConsultEvidence = Boolean(
        diagnostics?.source === "tilopay_refund_consult" &&
          (diagnostics.resultClassification === "PROVIDER_ACCEPTED" ||
            diagnostics.resultClassification === "PROVIDER_REJECTED") &&
          diagnostics.providerReference &&
          isTilopayRefundConsultType(diagnostics.modificationType) &&
          diagnostics.amount,
      );

      if (hasConclusiveConsultEvidence && input.source !== "TILOPAY_CONSULT") {
        throw new AdminRefundError("ADMIN_REFUND_RECONCILIATION_CONFLICT");
      }

      if (input.source === "TILOPAY_CONSULT") {
        const expectedClassification =
          input.outcome === "APPROVED"
            ? "PROVIDER_ACCEPTED"
            : "PROVIDER_REJECTED";
        const observedAmount = parseConsultAmount(diagnostics?.amount ?? null);
        const amountMatches =
          observedAmount !== null && observedAmount.abs().equals(refund.amount);

        if (
          diagnostics?.source !== "tilopay_refund_consult" ||
          diagnostics.resultClassification !== expectedClassification ||
          !isTilopayRefundConsultType(diagnostics.modificationType) ||
          !diagnostics.providerReference ||
          providerRefundId !== diagnostics.providerReference ||
          !amountMatches
        ) {
          throw new AdminRefundError("ADMIN_REFUND_RECONCILIATION_CONFLICT");
        }
      }

      if (input.outcome === "APPROVED") {
        assertPaymentCanReceiveApprovedRefund(refund);
      }

      if (input.outcome === "APPROVED" && !providerRefundId) {
        throw new AdminRefundError("INVALID_ADMIN_REFUND_REQUEST");
      }

      const reconciledAt = new Date();
      const note = normalizeRequiredText(
        input.note,
        RECONCILIATION_NOTE_MAX_LENGTH,
      );
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
          data: { status: paymentStatus },
        });

        if (paymentUpdate.count !== 1) {
          throw new AdminRefundError("ADMIN_REFUND_STALE");
        }
      }

      const refundUpdate = await transaction.refund.updateMany({
        where: {
          id: refund.id,
          updatedAt: refund.updatedAt,
          status: { in: [RefundStatus.PENDING, RefundStatus.PROCESSING] },
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
            lifecycleNotificationCreated:
              lifecycleNotificationIntents.length > 0,
            lifecycleNotificationCount: lifecycleNotificationIntents.length,
            lifecycleNotificationIds:
              lifecycleNotificationIntents.map(({ id }) => id),
          },
        },
      });

      return {
        result: {
          refund: await readRefundSummaryById(transaction, refund.id),
          paymentStatus,
          cumulativeApprovedAmount: cumulativeApprovedAmount.toFixed(2),
          alreadyProcessed: false,
        },
        lifecycleNotificationIds:
          lifecycleNotificationIntents.map(({ id }) => id),
      };
    },
    { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
  );

  if (transactionResult.lifecycleNotificationIds.length > 0) {
    await deliverLifecycleNotificationsBestEffort(
      transactionResult.lifecycleNotificationIds,
    );
  }

  return transactionResult.result;
}
