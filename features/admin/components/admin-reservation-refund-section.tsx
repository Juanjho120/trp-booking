"use client";

import {
  CircleDollarSign,
  ExternalLink,
  Loader2,
  RefreshCw,
  RotateCcw,
  ShieldCheck,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { type ReactNode, useMemo, useState } from "react";

import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { useLocale } from "@/features/i18n";
import {
  groupAdminRefundsByOperation,
  type AdminRefundOperationGroup,
} from "@/features/admin/refund-operation-groups";
import type {
  AdminRefundAuthorizationResult,
  AdminRefundAuthorizationType,
  AdminRefundConsultResult,
  AdminRefundErrorCode,
  AdminRefundExecutionResult,
  AdminRefundProcessingMode,
  AdminRefundReconciliationOutcome,
  AdminRefundReconciliationResult,
  AdminRefundReconciliationSource,
  AdminRefundSummary,
} from "@/types/admin-refund";
import type {
  AdminReservationDetailData,
  AdminReservationDetailPayment,
} from "@/types/admin-reservation-detail";
import type { Locale } from "@/types/locale";

import {
  AdminRecordPagination,
  useAdminRecordPagination,
} from "./admin-record-pagination";
import { AdminSnackbar } from "./admin-snackbar";

const inputClassName =
  "h-11 w-full rounded-2xl border border-input bg-background px-3 text-sm text-foreground shadow-xs outline-none transition focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50 disabled:cursor-not-allowed disabled:opacity-50";
const textareaClassName =
  "min-h-28 w-full resize-y rounded-2xl border border-input bg-background px-3 py-3 text-sm leading-6 text-foreground shadow-xs outline-none transition focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50 disabled:cursor-not-allowed disabled:opacity-50";
const committedRefundStatuses = new Set([
  "PENDING",
  "PROCESSING",
  "APPROVED",
  "MANUAL",
]);

type RefundApiResponse<Result> = Readonly<{
  result?: Result;
  error?: Readonly<{ code?: AdminRefundErrorCode }>;
}>;

type AuthorizationDraft = Readonly<{
  authorizationType: AdminRefundAuthorizationType;
  amount: string;
  reason: string;
  processingMode: AdminRefundProcessingMode;
}>;

type ReconciliationDraft = Readonly<{
  outcome: AdminRefundReconciliationOutcome;
  source: AdminRefundReconciliationSource;
  finalProcessingMode: AdminRefundProcessingMode;
  providerRefundId: string;
  note: string;
}>;

function getIntlLocale(locale: Locale): string {
  return locale === "en" ? "en-US" : "es-GT";
}

function amountNumber(value: string): number {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function fixedAmount(value: number): string {
  return Math.max(0, Math.round(value * 100) / 100).toFixed(2);
}

function isRefundConsultType(value: string | null | undefined): boolean {
  const normalized = value?.trim().toLowerCase();
  return normalized === "2" || normalized === "refund";
}

export function AdminReservationRefundSection({
  reservation,
}: Readonly<{ reservation: AdminReservationDetailData }>) {
  const router = useRouter();
  const { locale, messages } = useLocale();
  const copy = messages.admin.reservationsPage.refunds;
  const intlLocale = getIntlLocale(locale);
  const eligibleRequest = useMemo(
    () =>
      reservation.cancellationRequests.find(
        (request) => request.status === "COMPLETED",
      ) ?? null,
    [reservation.cancellationRequests],
  );
  const financialSummary = reservation.financialSummary;
  const remainingRefundableStayBalance = financialSummary
    ? amountNumber(financialSummary.remainingRefundableStayBalance)
    : 0;
  const refundableStayPayments =
    financialSummary?.eligibleStayPayments.filter(
      (payment) => amountNumber(payment.remainingRefundableAmount) > 0,
    ) ?? [];
  const allRefundableStayPaymentsHaveProviderReference =
    refundableStayPayments.length > 0 &&
    refundableStayPayments.every((payment) =>
      Boolean(payment.providerReference),
    );
  const standardCommittedAmount = eligibleRequest
    ? reservation.refunds
        .filter(
          (refund) =>
            refund.lifecycleRequestId === eligibleRequest.id &&
            refund.authorizationType !== "EXTRAORDINARY" &&
            committedRefundStatuses.has(refund.status),
        )
        .reduce((total, refund) => total + amountNumber(refund.amount), 0)
    : 0;
  const remainingPolicyAmount = eligibleRequest
    ? Math.max(
        0,
        amountNumber(eligibleRequest.policy.refundAmount) -
          standardCommittedAmount,
      )
    : 0;
  const standardAuthorizationLimit = Math.min(
    remainingPolicyAmount,
    remainingRefundableStayBalance,
  );
  const [authorizationOpen, setAuthorizationOpen] = useState(false);
  const [authorizationRequestId, setAuthorizationRequestId] = useState("");
  const [authorizationDraft, setAuthorizationDraft] =
    useState<AuthorizationDraft>({
      authorizationType: "STANDARD_POLICY",
      amount: "0.00",
      reason: "",
      processingMode: "TILOPAY_API",
    });
  const [executionTarget, setExecutionTarget] =
    useState<AdminRefundSummary | null>(null);
  const [executionRequestId, setExecutionRequestId] = useState("");
  const [reconciliationTarget, setReconciliationTarget] =
    useState<AdminRefundSummary | null>(null);
  const [reconciliationRequestId, setReconciliationRequestId] = useState("");
  const [reconciliationDraft, setReconciliationDraft] =
    useState<ReconciliationDraft>({
      outcome: "APPROVED",
      source: "TILOPAY_CONSULT",
      finalProcessingMode: "TILOPAY_API",
      providerRefundId: "",
      note: "",
    });
  const [busyAction, setBusyAction] = useState<string | null>(null);
  const [errorFeedback, setErrorFeedback] = useState<string | null>(null);
  const [successFeedback, setSuccessFeedback] = useState<string | null>(null);
  const canAuthorizeStandard = Boolean(
    eligibleRequest &&
      financialSummary &&
      reservation.status === "CANCELLED" &&
      standardAuthorizationLimit > 0,
  );
  const canAuthorizeExtraordinary = Boolean(
    financialSummary &&
      (reservation.status === "CONFIRMED" ||
        reservation.status === "CANCELLED") &&
      remainingRefundableStayBalance > 0,
  );
  const isBusy = busyAction !== null;
  const reconciliationConsultClassification =
    reconciliationTarget?.diagnostics?.source === "tilopay_refund_consult"
      ? reconciliationTarget.diagnostics.resultClassification
      : null;
  const reconciliationConsultOutcome =
    reconciliationConsultClassification === "PROVIDER_ACCEPTED"
      ? "APPROVED"
      : reconciliationConsultClassification === "PROVIDER_REJECTED"
        ? "FAILED"
        : null;
  const hasConclusiveConsultEvidence = Boolean(
    reconciliationConsultOutcome &&
      reconciliationTarget?.diagnostics?.providerReference &&
      isRefundConsultType(
        reconciliationTarget.diagnostics.modificationType,
      ) &&
      reconciliationTarget.diagnostics.amount,
  );
  const refundOperationGroups = useMemo(
    () => groupAdminRefundsByOperation(reservation.refunds),
    [reservation.refunds],
  );
  const refundPagination = useAdminRecordPagination(refundOperationGroups);
  const paginationCopy = messages.admin.reservationsPage;
  const paginationLabels = {
    next: paginationCopy.actions.next,
    of: paginationCopy.labels.of,
    page: paginationCopy.labels.page,
    previous: paginationCopy.actions.previous,
    results: paginationCopy.labels.results,
  } as const;

  function clearFeedback(): void {
    setErrorFeedback(null);
    setSuccessFeedback(null);
  }

  function formatMoney(value: string, currency: string): string {
    return new Intl.NumberFormat(intlLocale, {
      style: "currency",
      currency,
    }).format(amountNumber(value));
  }

  function formatDateTime(value: string | null): string {
    if (!value) return copy.labels.unavailable;

    return new Intl.DateTimeFormat(intlLocale, {
      dateStyle: "medium",
      timeStyle: "short",
    }).format(new Date(value));
  }

  function statusLabel(status: string): string {
    return copy.statuses[status as keyof typeof copy.statuses] ?? status;
  }

  function modeLabel(mode: string): string {
    return (
      copy.processingModes[mode as keyof typeof copy.processingModes] ?? mode
    );
  }

  function authorizationTypeLabel(type: string): string {
    return (
      copy.authorizationTypes[
        type as keyof typeof copy.authorizationTypes
      ] ?? type
    );
  }

  function classificationLabel(classification: string): string {
    return (
      copy.resultClassifications[
        classification as keyof typeof copy.resultClassifications
      ] ?? classification
    );
  }

  function errorMessage(code: AdminRefundErrorCode | undefined): string {
    return code
      ? (copy.errors[code] ?? copy.errors.ADMIN_REFUND_UNEXPECTED_ERROR)
      : copy.errors.ADMIN_REFUND_UNEXPECTED_ERROR;
  }

  function paymentForRefund(
    refund: AdminRefundSummary,
  ): AdminReservationDetailPayment | null {
    return (
      reservation.payments.find(
        (payment) => payment.id === refund.paymentId,
      ) ?? null
    );
  }

  function isSplitRefundOperation(refund: AdminRefundSummary): boolean {
    return Boolean(
      refund.refundOperationKey &&
        reservation.refunds.filter(
          (candidate) =>
            candidate.refundOperationKey === refund.refundOperationKey,
        ).length > 1,
    );
  }

  function openAuthorization(
    authorizationType: AdminRefundAuthorizationType,
  ): void {
    if (
      !financialSummary ||
      (authorizationType === "STANDARD_POLICY" && !eligibleRequest)
    ) {
      return;
    }

    clearFeedback();
    setAuthorizationRequestId(crypto.randomUUID());
    setAuthorizationDraft({
      authorizationType,
      amount:
        authorizationType === "STANDARD_POLICY"
          ? fixedAmount(standardAuthorizationLimit)
          : "0.00",
      reason: "",
      processingMode: allRefundableStayPaymentsHaveProviderReference
        ? "TILOPAY_API"
        : "TILOPAY_PORTAL_FALLBACK",
    });
    setAuthorizationOpen(true);
  }

  function openExecution(refund: AdminRefundSummary): void {
    clearFeedback();
    setExecutionRequestId(crypto.randomUUID());
    setExecutionTarget(refund);
  }

  function openReconciliation(refund: AdminRefundSummary): void {
    clearFeedback();
    setReconciliationRequestId(crypto.randomUUID());
    const consultClassification =
      refund.diagnostics?.source === "tilopay_refund_consult"
        ? refund.diagnostics.resultClassification
        : null;
    const consultOutcome =
      consultClassification === "PROVIDER_ACCEPTED"
        ? "APPROVED"
        : consultClassification === "PROVIDER_REJECTED"
          ? "FAILED"
          : null;
    const useConsultEvidence = Boolean(
      consultOutcome &&
        refund.diagnostics?.providerReference &&
        isRefundConsultType(refund.diagnostics.modificationType) &&
        refund.diagnostics.amount,
    );

    setReconciliationDraft({
      outcome: useConsultEvidence ? (consultOutcome ?? "APPROVED") : "APPROVED",
      source: useConsultEvidence ? "TILOPAY_CONSULT" : "TILOPAY_PORTAL",
      finalProcessingMode: useConsultEvidence
        ? "TILOPAY_API"
        : "TILOPAY_PORTAL_FALLBACK",
      providerRefundId: useConsultEvidence
        ? (refund.diagnostics?.providerReference ?? "")
        : (refund.providerRefundId ?? ""),
      note: "",
    });
    setReconciliationTarget(refund);
  }

  async function authorizeRefund(): Promise<void> {
    const isExtraordinary =
      authorizationDraft.authorizationType === "EXTRAORDINARY";

    if (
      !financialSummary ||
      (!isExtraordinary && !eligibleRequest) ||
      isBusy ||
      !authorizationDraft.reason.trim() ||
      amountNumber(authorizationDraft.amount) <= 0
    ) {
      setErrorFeedback(copy.errors.INVALID_ADMIN_REFUND_REQUEST);
      return;
    }

    clearFeedback();
    setBusyAction("authorize");

    try {
      const url = isExtraordinary
        ? `/api/admin/reservations/${encodeURIComponent(
            reservation.id,
          )}/refunds/extraordinary`
        : `/api/admin/reservation-lifecycle-requests/${encodeURIComponent(
            eligibleRequest?.id ?? "",
          )}/refunds`;
      const body = isExtraordinary
        ? {
            amount: authorizationDraft.amount,
            reason: authorizationDraft.reason,
            processingMode: authorizationDraft.processingMode,
            requestId: authorizationRequestId,
            expectedReservationUpdatedAt: reservation.updatedAt,
          }
        : {
            ...authorizationDraft,
            requestId: authorizationRequestId,
            expectedRequestVersion: eligibleRequest?.version,
            expectedRequestUpdatedAt: eligibleRequest?.updatedAt,
          };
      const response = await fetch(url, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(body),
      });
      const payload =
        (await response.json()) as RefundApiResponse<AdminRefundAuthorizationResult>;

      if (!response.ok || !payload.result) {
        setErrorFeedback(errorMessage(payload.error?.code));
        return;
      }

      setAuthorizationOpen(false);
      setSuccessFeedback(
        payload.result.alreadyProcessed
          ? copy.success.authorizationAlreadyExists
          : payload.result.refunds.length > 1
            ? copy.success.authorizedOperation
            : copy.success.authorized,
      );
      router.refresh();
    } catch {
      setErrorFeedback(copy.errors.ADMIN_REFUND_UNEXPECTED_ERROR);
    } finally {
      setBusyAction(null);
    }
  }

  async function executeRefund(): Promise<void> {
    if (!executionTarget || isBusy) return;
    const payment = paymentForRefund(executionTarget);

    if (!payment) {
      setErrorFeedback(copy.errors.ADMIN_REFUND_PAYMENT_NOT_FOUND);
      return;
    }

    clearFeedback();
    setBusyAction(`execute:${executionTarget.id}`);

    try {
      const response = await fetch(
        `/api/admin/refunds/${encodeURIComponent(executionTarget.id)}/execute`,
        {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({
            requestId: executionRequestId,
            expectedRefundUpdatedAt: executionTarget.updatedAt,
            expectedPaymentUpdatedAt: payment.updatedAt,
          }),
        },
      );
      const payload =
        (await response.json()) as RefundApiResponse<AdminRefundExecutionResult>;

      if (!response.ok || !payload.result) {
        setErrorFeedback(errorMessage(payload.error?.code));
        return;
      }

      setExecutionTarget(null);

      const classification =
        payload.result.refund.diagnostics?.resultClassification;

      if (payload.result.refund.status === "FAILED") {
        setErrorFeedback(
          classification === "PROVIDER_REJECTED"
            ? copy.success.providerRejected
            : copy.success.executionFailedSafely,
        );
      } else {
        setSuccessFeedback(
          classification === "PROVIDER_ACCEPTED_PENDING_CONFIRMATION"
            ? copy.success.providerAcceptedPending
            : copy.success.providerUncertain,
        );
      }

      router.refresh();
    } catch {
      setErrorFeedback(copy.errors.ADMIN_REFUND_UNEXPECTED_ERROR);
    } finally {
      setBusyAction(null);
    }
  }

  async function consultRefund(refund: AdminRefundSummary): Promise<void> {
    if (isBusy) return;

    clearFeedback();
    setBusyAction(`consult:${refund.id}`);

    try {
      const response = await fetch(
        `/api/admin/refunds/${encodeURIComponent(refund.id)}/consult`,
        {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({
            requestId: crypto.randomUUID(),
            expectedRefundUpdatedAt: refund.updatedAt,
          }),
        },
      );
      const payload =
        (await response.json()) as RefundApiResponse<AdminRefundConsultResult>;

      if (!response.ok || !payload.result) {
        setErrorFeedback(errorMessage(payload.error?.code));
        return;
      }

      const classification =
        payload.result.refund.diagnostics?.resultClassification;

      setSuccessFeedback(
        classification === "PROVIDER_ACCEPTED"
          ? copy.success.consultedAccepted
          : classification === "PROVIDER_REJECTED"
            ? copy.success.consultedRejected
            : copy.success.consultedInconclusive,
      );
      router.refresh();
    } catch {
      setErrorFeedback(copy.errors.ADMIN_REFUND_UNEXPECTED_ERROR);
    } finally {
      setBusyAction(null);
    }
  }

  async function reconcileRefund(): Promise<void> {
    if (!reconciliationTarget || isBusy || !reconciliationDraft.note.trim()) {
      setErrorFeedback(copy.errors.INVALID_ADMIN_REFUND_REQUEST);
      return;
    }

    if (
      reconciliationDraft.outcome === "APPROVED" &&
      !reconciliationDraft.providerRefundId.trim()
    ) {
      setErrorFeedback(copy.errors.INVALID_ADMIN_REFUND_REQUEST);
      return;
    }

    const payment = paymentForRefund(reconciliationTarget);

    if (!payment) {
      setErrorFeedback(copy.errors.ADMIN_REFUND_PAYMENT_NOT_FOUND);
      return;
    }

    clearFeedback();
    setBusyAction(`reconcile:${reconciliationTarget.id}`);

    try {
      const response = await fetch(
        `/api/admin/refunds/${encodeURIComponent(
          reconciliationTarget.id,
        )}/reconcile`,
        {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({
            ...reconciliationDraft,
            providerRefundId:
              reconciliationDraft.providerRefundId.trim() || null,
            requestId: reconciliationRequestId,
            expectedRefundUpdatedAt: reconciliationTarget.updatedAt,
            expectedPaymentUpdatedAt: payment.updatedAt,
          }),
        },
      );
      const payload =
        (await response.json()) as RefundApiResponse<AdminRefundReconciliationResult>;

      if (!response.ok || !payload.result) {
        setErrorFeedback(errorMessage(payload.error?.code));
        return;
      }

      const splitOperation = isSplitRefundOperation(reconciliationTarget);
      setReconciliationTarget(null);
      setSuccessFeedback(
        payload.result.refund.status === "APPROVED"
          ? splitOperation
            ? copy.success.reconciledMovementApproved
            : copy.success.reconciledApproved
          : copy.success.reconciledFailed,
      );
      router.refresh();
    } catch {
      setErrorFeedback(copy.errors.ADMIN_REFUND_UNEXPECTED_ERROR);
    } finally {
      setBusyAction(null);
    }
  }

  return (
    <>
      <AdminSnackbar
        closeLabel={messages.admin.feedback.dismiss}
        message={errorFeedback ?? successFeedback}
        onDismiss={clearFeedback}
        variant={errorFeedback ? "error" : "success"}
      />

      <Card className="mt-6 border-border/70 bg-card shadow-sm">
        <CardHeader className="gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <div className="mb-2 flex items-center gap-2 text-sm font-medium text-muted-foreground">
              <CircleDollarSign aria-hidden="true" className="size-4" />
              {copy.badge}
            </div>
            <CardTitle>{copy.title}</CardTitle>
            <CardDescription>{copy.description}</CardDescription>
          </div>
          {canAuthorizeStandard || canAuthorizeExtraordinary ? (
            <div className="flex flex-wrap justify-end gap-2">
              {canAuthorizeStandard ? (
                <Button
                  onClick={() => openAuthorization("STANDARD_POLICY")}
                  type="button"
                >
                  <ShieldCheck aria-hidden="true" />
                  {copy.actions.authorizeStandard}
                </Button>
              ) : null}
              {canAuthorizeExtraordinary ? (
                <Button
                  onClick={() => openAuthorization("EXTRAORDINARY")}
                  type="button"
                  variant="outline"
                >
                  <CircleDollarSign aria-hidden="true" />
                  {copy.actions.authorizeExtraordinary}
                </Button>
              ) : null}
            </div>
          ) : null}
        </CardHeader>
        <CardContent className="grid gap-5">
          {financialSummary ? (
            <div className="grid gap-4 rounded-2xl border border-border bg-muted/20 p-4 sm:grid-cols-2 xl:grid-cols-5">
              <DetailValue
                label={copy.labels.currentStayValue}
                value={formatMoney(
                  financialSummary.currentStayValue,
                  financialSummary.currency,
                )}
              />
              <DetailValue
                label={copy.labels.capturedStayPayments}
                value={formatMoney(
                  financialSummary.capturedStayPayments,
                  financialSummary.currency,
                )}
              />
              <DetailValue
                label={copy.labels.committedStayRefunds}
                value={formatMoney(
                  financialSummary.committedStayRefunds,
                  financialSummary.currency,
                )}
              />
              <DetailValue
                label={copy.labels.approvedStayRefunds}
                value={formatMoney(
                  financialSummary.approvedStayRefunds,
                  financialSummary.currency,
                )}
              />
              <DetailValue
                label={copy.labels.remainingRefundableStayBalance}
                value={formatMoney(
                  financialSummary.remainingRefundableStayBalance,
                  financialSummary.currency,
                )}
              />
            </div>
          ) : (
            <p className="text-sm leading-6 text-muted-foreground">
              {copy.empty.noFinancialSummary}
            </p>
          )}

          {eligibleRequest ? (
            <div className="grid gap-4 rounded-2xl border border-border bg-background/60 p-4 sm:grid-cols-2 xl:grid-cols-4">
              <DetailValue
                label={copy.labels.policyPercentage}
                value={`${eligibleRequest.policy.refundPercentage}%`}
              />
              <DetailValue
                label={copy.labels.policyAmount}
                value={formatMoney(
                  eligibleRequest.policy.refundAmount,
                  eligibleRequest.policy.currency,
                )}
              />
              <DetailValue
                label={copy.labels.remainingAmount}
                value={formatMoney(
                  fixedAmount(remainingPolicyAmount),
                  eligibleRequest.policy.currency,
                )}
              />
              <DetailValue
                label={copy.labels.authorizationLimit}
                value={formatMoney(
                  fixedAmount(standardAuthorizationLimit),
                  eligibleRequest.policy.currency,
                )}
              />
            </div>
          ) : null}

          <p className="text-sm leading-6 text-muted-foreground">
            {copy.notes.separateLifecycle}
          </p>

          {refundOperationGroups.length > 0 ? (
            <>
              <Accordion
                className="grid gap-3"
                collapsible
                key={`${refundPagination.page}-${refundPagination.pageSize}`}
                type="single"
              >
                {refundPagination.pageItems.map((group) =>
                  group.refundOperationKey === null &&
                  group.refunds.length === 1 ? (
                    <RefundCard
                      apiExecutionEnabled={reservation.refundApiExecutionEnabled}
                      authorizationTypeLabel={authorizationTypeLabel(
                        group.refunds[0].authorizationType,
                      )}
                      busyAction={busyAction}
                      classificationLabel={classificationLabel}
                      copy={copy}
                      formatDateTime={formatDateTime}
                      formatMoney={formatMoney}
                      key={group.id}
                      modeLabel={modeLabel(group.refunds[0].processingMode)}
                      onConsult={() => void consultRefund(group.refunds[0])}
                      onExecute={() => openExecution(group.refunds[0])}
                      onReconcile={() => openReconciliation(group.refunds[0])}
                      payment={paymentForRefund(group.refunds[0])}
                      refund={group.refunds[0]}
                      statusLabel={statusLabel(group.refunds[0].status)}
                    />
                  ) : (
                    <RefundOperationCard
                      apiExecutionEnabled={reservation.refundApiExecutionEnabled}
                      authorizationTypeLabel={authorizationTypeLabel(
                        group.authorizationType,
                      )}
                      busyAction={busyAction}
                      classificationLabel={classificationLabel}
                      copy={copy}
                      formatDateTime={formatDateTime}
                      formatMoney={formatMoney}
                      group={group}
                      key={group.id}
                      modeLabel={modeLabel}
                      onConsult={(refund) => void consultRefund(refund)}
                      onExecute={openExecution}
                      onReconcile={openReconciliation}
                      paymentForRefund={paymentForRefund}
                      statusLabel={statusLabel}
                    />
                  ),
                )}
              </Accordion>
              <AdminRecordPagination
                labels={paginationLabels}
                onPageChange={refundPagination.setPage}
                onPageSizeChange={refundPagination.changePageSize}
                page={refundPagination.page}
                pageSize={refundPagination.pageSize}
                totalItems={refundPagination.totalItems}
                totalPages={refundPagination.totalPages}
              />
            </>
          ) : financialSummary || eligibleRequest ? (
            <p className="text-sm text-muted-foreground">
              {copy.empty.noRefunds}
            </p>
          ) : null}
        </CardContent>
      </Card>

      <Sheet
        onOpenChange={(open) => {
          if (!open && !isBusy) setAuthorizationOpen(false);
        }}
        open={authorizationOpen}
      >
        <SheetContent closeLabel={messages.admin.feedback.dismiss}>
          <SheetHeader>
            <SheetTitle>
              {authorizationDraft.authorizationType === "EXTRAORDINARY"
                ? copy.authorizationDialog.extraordinaryTitle
                : copy.authorizationDialog.title}
            </SheetTitle>
            <SheetDescription>
              {authorizationDraft.authorizationType === "EXTRAORDINARY"
                ? copy.authorizationDialog.extraordinaryDescription
                : copy.authorizationDialog.description}
            </SheetDescription>
          </SheetHeader>
          <div className="grid gap-5 overflow-y-auto px-6 py-2">
            <div className="grid gap-4 rounded-2xl border border-border bg-muted/30 p-4 sm:grid-cols-2">
              <DetailValue
                label={copy.labels.authorizationType}
                value={authorizationTypeLabel(
                  authorizationDraft.authorizationType,
                )}
              />
              <DetailValue
                label={copy.labels.authorizationLimit}
                value={formatMoney(
                  fixedAmount(
                    authorizationDraft.authorizationType === "EXTRAORDINARY"
                      ? remainingRefundableStayBalance
                      : standardAuthorizationLimit,
                  ),
                  financialSummary?.currency ??
                    eligibleRequest?.policy.currency ??
                    "USD",
                )}
              />
            </div>
            {authorizationDraft.authorizationType === "EXTRAORDINARY" ? (
              <div className="rounded-2xl border border-primary/30 bg-primary/5 p-4 text-sm leading-6">
                {copy.authorizationDialog.extraordinaryNotice}
              </div>
            ) : null}
            <FormField label={copy.labels.amount}>
              <input
                className={inputClassName}
                disabled={isBusy}
                inputMode="decimal"
                onChange={(event) =>
                  setAuthorizationDraft((current) => ({
                    ...current,
                    amount: event.target.value,
                  }))
                }
                value={authorizationDraft.amount}
              />
            </FormField>
            <FormField label={copy.labels.processingMode}>
              <Select
                disabled={isBusy}
                onValueChange={(value) =>
                  setAuthorizationDraft((current) => ({
                    ...current,
                    processingMode: value as AdminRefundProcessingMode,
                  }))
                }
                value={authorizationDraft.processingMode}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="TILOPAY_API">
                    {copy.processingModes.TILOPAY_API}
                  </SelectItem>
                  <SelectItem value="TILOPAY_PORTAL_FALLBACK">
                    {copy.processingModes.TILOPAY_PORTAL_FALLBACK}
                  </SelectItem>
                </SelectContent>
              </Select>
            </FormField>
            <FormField label={copy.labels.reason}>
              <textarea
                className={textareaClassName}
                disabled={isBusy}
                maxLength={2_000}
                onChange={(event) =>
                  setAuthorizationDraft((current) => ({
                    ...current,
                    reason: event.target.value,
                  }))
                }
                placeholder={copy.placeholders.reason}
                value={authorizationDraft.reason}
              />
            </FormField>
            <div className="rounded-2xl border border-border bg-muted/30 p-4 text-sm leading-6 text-muted-foreground">
              {authorizationDraft.authorizationType === "EXTRAORDINARY"
                ? copy.authorizationDialog.extraordinaryWarning
                : copy.authorizationDialog.warning}
            </div>
          </div>
          <SheetFooter>
            <Button
              disabled={isBusy}
              onClick={() => setAuthorizationOpen(false)}
              type="button"
              variant="outline"
            >
              {copy.actions.close}
            </Button>
            <Button
              disabled={isBusy}
              onClick={() => void authorizeRefund()}
              type="button"
            >
              {busyAction === "authorize" ? (
                <Loader2 aria-hidden="true" className="animate-spin" />
              ) : (
                <ShieldCheck aria-hidden="true" />
              )}
              {busyAction === "authorize"
                ? copy.actions.authorizing
                : copy.actions.confirmAuthorization}
            </Button>
          </SheetFooter>
        </SheetContent>
      </Sheet>

      <Sheet
        onOpenChange={(open) => {
          if (!open && !isBusy) setExecutionTarget(null);
        }}
        open={executionTarget !== null}
      >
        <SheetContent closeLabel={messages.admin.feedback.dismiss}>
          <SheetHeader>
            <SheetTitle>{copy.executionDialog.title}</SheetTitle>
            <SheetDescription>{copy.executionDialog.description}</SheetDescription>
          </SheetHeader>
          <div className="grid gap-5 overflow-y-auto px-6 py-2">
            {executionTarget ? (
              <div className="grid gap-4 rounded-2xl border border-border bg-muted/30 p-4 sm:grid-cols-2">
                <DetailValue
                  label={copy.labels.amount}
                  value={formatMoney(
                    executionTarget.amount,
                    executionTarget.currency,
                  )}
                />
                <DetailValue
                  label={copy.labels.refund}
                  value={executionTarget.id}
                />
              </div>
            ) : null}
            <div className="rounded-2xl border border-destructive/30 bg-destructive/5 p-4 text-sm leading-6">
              {copy.executionDialog.warning}
            </div>
          </div>
          <SheetFooter>
            <Button
              disabled={isBusy}
              onClick={() => setExecutionTarget(null)}
              type="button"
              variant="outline"
            >
              {copy.actions.close}
            </Button>
            <Button
              disabled={isBusy}
              onClick={() => void executeRefund()}
              type="button"
              variant="destructive"
            >
              {busyAction?.startsWith("execute:") ? (
                <Loader2 aria-hidden="true" className="animate-spin" />
              ) : (
                <RotateCcw aria-hidden="true" />
              )}
              {busyAction?.startsWith("execute:")
                ? copy.actions.executing
                : copy.actions.executeSandbox}
            </Button>
          </SheetFooter>
        </SheetContent>
      </Sheet>

      <Sheet
        onOpenChange={(open) => {
          if (!open && !isBusy) setReconciliationTarget(null);
        }}
        open={reconciliationTarget !== null}
      >
        <SheetContent closeLabel={messages.admin.feedback.dismiss}>
          <SheetHeader>
            <SheetTitle>{copy.reconciliationDialog.title}</SheetTitle>
            <SheetDescription>
              {copy.reconciliationDialog.description}
            </SheetDescription>
          </SheetHeader>
          <div className="grid gap-5 overflow-y-auto px-6 py-2">
            <FormField label={copy.labels.outcome}>
              <Select
                disabled={isBusy || hasConclusiveConsultEvidence}
                onValueChange={(value) =>
                  setReconciliationDraft((current) => ({
                    ...current,
                    outcome: value as AdminRefundReconciliationOutcome,
                  }))
                }
                value={reconciliationDraft.outcome}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="APPROVED">
                    {copy.outcomes.APPROVED}
                  </SelectItem>
                  <SelectItem value="FAILED">
                    {copy.outcomes.FAILED}
                  </SelectItem>
                </SelectContent>
              </Select>
            </FormField>
            <FormField label={copy.labels.reconciliationSource}>
              <Select
                disabled={isBusy || hasConclusiveConsultEvidence}
                onValueChange={(value) => {
                  const source = value as AdminRefundReconciliationSource;

                  setReconciliationDraft((current) =>
                    source === "TILOPAY_CONSULT" &&
                    hasConclusiveConsultEvidence &&
                    reconciliationConsultOutcome
                      ? {
                          ...current,
                          source,
                          outcome: reconciliationConsultOutcome,
                          finalProcessingMode: "TILOPAY_API",
                          providerRefundId:
                            reconciliationTarget?.diagnostics
                              ?.providerReference ?? "",
                        }
                      : {
                          ...current,
                          source: "TILOPAY_PORTAL",
                          finalProcessingMode: "TILOPAY_PORTAL_FALLBACK",
                          providerRefundId:
                            reconciliationTarget?.providerRefundId ?? "",
                        },
                  );
                }}
                value={reconciliationDraft.source}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {hasConclusiveConsultEvidence ? (
                    <SelectItem value="TILOPAY_CONSULT">
                      {copy.sources.TILOPAY_CONSULT}
                    </SelectItem>
                  ) : null}
                  <SelectItem value="TILOPAY_PORTAL">
                    {copy.sources.TILOPAY_PORTAL}
                  </SelectItem>
                </SelectContent>
              </Select>
            </FormField>
            <div className="rounded-2xl border border-border bg-muted/30 p-4">
              <DetailValue
                label={copy.labels.finalProcessingMode}
                value={modeLabel(reconciliationDraft.finalProcessingMode)}
              />
            </div>
            <FormField label={copy.labels.providerRefundId}>
              <input
                className={inputClassName}
                disabled={isBusy || hasConclusiveConsultEvidence}
                maxLength={180}
                onChange={(event) =>
                  setReconciliationDraft((current) => ({
                    ...current,
                    providerRefundId: event.target.value,
                  }))
                }
                placeholder={copy.placeholders.providerRefundId}
                value={reconciliationDraft.providerRefundId}
              />
            </FormField>
            {hasConclusiveConsultEvidence ? (
              <div className="rounded-2xl border border-primary/30 bg-primary/5 p-4 text-sm leading-6">
                {copy.reconciliationDialog.consultEvidenceLocked}
              </div>
            ) : null}
            <FormField label={copy.labels.reconciliationNote}>
              <textarea
                className={textareaClassName}
                disabled={isBusy}
                maxLength={2_000}
                onChange={(event) =>
                  setReconciliationDraft((current) => ({
                    ...current,
                    note: event.target.value,
                  }))
                }
                placeholder={copy.placeholders.reconciliationNote}
                value={reconciliationDraft.note}
              />
            </FormField>
            <div className="rounded-2xl border border-destructive/30 bg-destructive/5 p-4 text-sm leading-6">
              {copy.reconciliationDialog.warning}
            </div>
          </div>
          <SheetFooter>
            <Button
              disabled={isBusy}
              onClick={() => setReconciliationTarget(null)}
              type="button"
              variant="outline"
            >
              {copy.actions.close}
            </Button>
            <Button
              disabled={isBusy}
              onClick={() => void reconcileRefund()}
              type="button"
              variant={
                reconciliationDraft.outcome === "APPROVED"
                  ? "destructive"
                  : "default"
              }
            >
              {busyAction?.startsWith("reconcile:") ? (
                <Loader2 aria-hidden="true" className="animate-spin" />
              ) : (
                <ShieldCheck aria-hidden="true" />
              )}
              {busyAction?.startsWith("reconcile:")
                ? copy.actions.reconciling
                : copy.actions.confirmReconciliation}
            </Button>
          </SheetFooter>
        </SheetContent>
      </Sheet>
    </>
  );
}

function RefundOperationCard({
  group,
  apiExecutionEnabled,
  copy,
  authorizationTypeLabel,
  modeLabel,
  statusLabel,
  classificationLabel,
  formatMoney,
  formatDateTime,
  busyAction,
  paymentForRefund,
  onExecute,
  onConsult,
  onReconcile,
}: Readonly<{
  group: AdminRefundOperationGroup;
  apiExecutionEnabled: boolean;
  copy: ReturnType<typeof useLocale>["messages"]["admin"]["reservationsPage"]["refunds"];
  authorizationTypeLabel: string;
  modeLabel: (mode: string) => string;
  statusLabel: (status: string) => string;
  classificationLabel: (classification: string) => string;
  formatMoney: (value: string, currency: string) => string;
  formatDateTime: (value: string | null) => string;
  busyAction: string | null;
  paymentForRefund: (
    refund: AdminRefundSummary,
  ) => AdminReservationDetailPayment | null;
  onExecute: (refund: AdminRefundSummary) => void;
  onConsult: (refund: AdminRefundSummary) => void;
  onReconcile: (refund: AdminRefundSummary) => void;
}>) {
  const completedMovements = group.refunds.filter((refund) =>
    refund.status === "APPROVED" || refund.status === "MANUAL",
  ).length;

  return (
    <AccordionItem
      className="overflow-hidden rounded-2xl border border-border bg-muted/20 last:border-b"
      value={`operation:${group.id}`}
    >
      <AccordionTrigger className="px-4 py-3 hover:bg-muted/40 sm:px-5">
        <div className="grid min-w-0 flex-1 gap-3 pr-2 text-left sm:grid-cols-[minmax(0,1.4fr)_minmax(0,0.7fr)_minmax(0,0.9fr)_auto] sm:items-center">
          <div className="min-w-0">
            <p className="text-xs uppercase tracking-wide text-muted-foreground">
              {copy.labels.refundOperation}
            </p>
            <p className="mt-1 break-all text-sm font-semibold">
              {group.refundOperationKey ?? group.id}
            </p>
          </div>
          <div className="min-w-0">
            <p className="text-xs uppercase tracking-wide text-muted-foreground">
              {copy.labels.operationAmount}
            </p>
            <p className="mt-1 text-sm font-semibold">
              {formatMoney(group.requestedAmount, group.currency)}
            </p>
          </div>
          <div className="min-w-0">
            <p className="text-xs uppercase tracking-wide text-muted-foreground">
              {copy.labels.authorizationType}
            </p>
            <p className="mt-1 break-words text-sm font-medium">
              {authorizationTypeLabel}
            </p>
          </div>
          <Badge className="justify-self-start sm:justify-self-end" variant="secondary">
            {group.refunds.length} {copy.labels.providerMovements}
          </Badge>
        </div>
      </AccordionTrigger>
      <AccordionContent className="border-t border-border/70 px-4 pt-4 sm:px-5">
        <div className="grid gap-4 rounded-xl border border-border/70 bg-background/60 p-4 sm:grid-cols-2 xl:grid-cols-4">
          <DetailValue
            label={copy.labels.operationAmount}
            value={formatMoney(group.requestedAmount, group.currency)}
          />
          <DetailValue
            label={copy.labels.providerMovements}
            value={String(group.refunds.length)}
          />
          <DetailValue
            label={copy.labels.approvedMovements}
            value={`${completedMovements} / ${group.refunds.length}`}
          />
          <DetailValue
            label={copy.labels.authorizationType}
            value={authorizationTypeLabel}
          />
        </div>
        <p className="mt-4 text-sm leading-6 text-muted-foreground">
          {copy.notes.providerMovements}
        </p>
        <Accordion className="mt-4 grid gap-3" collapsible type="single">
          {group.refunds.map((refund) => (
            <RefundCard
              apiExecutionEnabled={apiExecutionEnabled}
              authorizationTypeLabel={authorizationTypeLabel}
              busyAction={busyAction}
              classificationLabel={classificationLabel}
              copy={copy}
              formatDateTime={formatDateTime}
              formatMoney={formatMoney}
              key={refund.id}
              modeLabel={modeLabel(refund.processingMode)}
              onConsult={() => onConsult(refund)}
              onExecute={() => onExecute(refund)}
              onReconcile={() => onReconcile(refund)}
              payment={paymentForRefund(refund)}
              refund={refund}
              statusLabel={statusLabel(refund.status)}
            />
          ))}
        </Accordion>
      </AccordionContent>
    </AccordionItem>
  );
}

function RefundCard({
  refund,
  payment,
  apiExecutionEnabled,
  copy,
  statusLabel,
  authorizationTypeLabel,
  modeLabel,
  classificationLabel,
  formatMoney,
  formatDateTime,
  busyAction,
  onExecute,
  onConsult,
  onReconcile,
}: Readonly<{
  refund: AdminRefundSummary;
  payment: AdminReservationDetailPayment | null;
  apiExecutionEnabled: boolean;
  copy: ReturnType<typeof useLocale>["messages"]["admin"]["reservationsPage"]["refunds"];
  statusLabel: string;
  authorizationTypeLabel: string;
  modeLabel: string;
  classificationLabel: (classification: string) => string;
  formatMoney: (value: string, currency: string) => string;
  formatDateTime: (value: string | null) => string;
  busyAction: string | null;
  onExecute: () => void;
  onConsult: () => void;
  onReconcile: () => void;
}>) {
  const canExecute =
    refund.status === "PENDING" &&
    refund.processingMode === "TILOPAY_API" &&
    apiExecutionEnabled &&
    Boolean(payment?.providerReference);
  const canConsult =
    refund.status === "PROCESSING" &&
    refund.processingMode === "TILOPAY_API" &&
    apiExecutionEnabled &&
    Boolean(payment?.providerReference);
  const canReconcile =
    refund.status === "PENDING" || refund.status === "PROCESSING";
  const requestedBy = refund.requestedByAdmin
    ? refund.requestedByAdmin.name
      ? `${refund.requestedByAdmin.name} · ${refund.requestedByAdmin.email}`
      : refund.requestedByAdmin.email
    : copy.labels.unavailable;

  return (
    <AccordionItem
      className="overflow-hidden rounded-2xl border border-border bg-muted/20 last:border-b"
      value={refund.id}
    >
      <AccordionTrigger className="px-4 py-3 hover:bg-muted/40 sm:px-5">
        <div className="grid min-w-0 flex-1 gap-3 pr-2 sm:grid-cols-[minmax(0,1.2fr)_minmax(0,0.8fr)_minmax(0,1fr)_auto] sm:items-center">
          <div className="min-w-0">
            <p className="text-xs uppercase tracking-wide text-muted-foreground">
              {copy.labels.refund}
            </p>
            <p className="mt-1 break-all text-sm font-semibold">{refund.id}</p>
          </div>
          <div className="min-w-0">
            <p className="text-xs uppercase tracking-wide text-muted-foreground">
              {copy.labels.amount}
            </p>
            <p className="mt-1 text-sm font-semibold">
              {formatMoney(refund.amount, refund.currency)}
            </p>
          </div>
          <div className="min-w-0">
            <p className="text-xs uppercase tracking-wide text-muted-foreground">
              {copy.labels.authorizationType}
            </p>
            <p className="mt-1 break-words text-sm font-medium">
              {authorizationTypeLabel}
            </p>
          </div>
          <Badge className="justify-self-start sm:justify-self-end" variant="outline">
            {statusLabel}
          </Badge>
        </div>
      </AccordionTrigger>
      <AccordionContent className="border-t border-border/70 px-4 pt-4 sm:px-5">
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <DetailValue
            label={copy.labels.amount}
            value={formatMoney(refund.amount, refund.currency)}
          />
          <DetailValue
            label={copy.labels.authorizationType}
            value={authorizationTypeLabel}
          />
          <DetailValue label={copy.labels.processingMode} value={modeLabel} />
          <DetailValue label={copy.labels.requestedBy} value={requestedBy} />
          <DetailValue
            label={copy.labels.createdAt}
            value={formatDateTime(refund.createdAt)}
          />
          <DetailValue label={copy.labels.payment} value={refund.paymentId} />
          <DetailValue
            label={copy.labels.providerOrder}
            value={payment?.providerReference ?? copy.labels.unavailable}
          />
          <DetailValue
            label={copy.labels.providerRefundId}
            value={refund.providerRefundId ?? copy.labels.unavailable}
          />
          <DetailValue
            label={copy.labels.updatedAt}
            value={formatDateTime(refund.updatedAt)}
          />
        </div>
        {refund.reason ? (
          <div className="mt-4 rounded-xl border border-border/70 bg-background/60 p-4">
            <DetailValue label={copy.labels.reason} value={refund.reason} />
          </div>
        ) : null}
        {refund.diagnostics ? (
          <div className="mt-4 grid gap-4 rounded-xl border border-border/70 bg-background/60 p-4 sm:grid-cols-2 xl:grid-cols-4">
            <DetailValue
              label={copy.labels.diagnosticSource}
              value={refund.diagnostics.source}
            />
            <DetailValue
              label={copy.labels.responseCode}
              value={
                refund.diagnostics.responseCode ?? copy.labels.unavailable
              }
            />
            <DetailValue
              label={copy.labels.resultClassification}
              value={
                refund.diagnostics.resultClassification
                  ? classificationLabel(
                      refund.diagnostics.resultClassification,
                    )
                  : copy.labels.unavailable
              }
            />
            <DetailValue
              label={copy.labels.observedAt}
              value={formatDateTime(refund.diagnostics.observedAt)}
            />
            {refund.diagnostics.orderNumber ? (
              <DetailValue
                label={copy.labels.observedOrder}
                value={refund.diagnostics.orderNumber}
              />
            ) : null}
            {refund.diagnostics.amount ? (
              <DetailValue
                label={copy.labels.observedAmount}
                value={
                  refund.diagnostics.currency
                    ? formatMoney(
                        refund.diagnostics.amount,
                        refund.diagnostics.currency,
                      )
                    : refund.diagnostics.amount
                }
              />
            ) : null}
            {refund.diagnostics.modificationType ? (
              <DetailValue
                label={copy.labels.modificationType}
                value={refund.diagnostics.modificationType}
              />
            ) : null}
            {refund.diagnostics.candidateCount !== null ? (
              <DetailValue
                label={copy.labels.candidateCount}
                value={String(refund.diagnostics.candidateCount)}
              />
            ) : null}
            {refund.diagnostics.description ? (
              <div className="sm:col-span-2 xl:col-span-4">
                <DetailValue
                  label={copy.labels.safeDescription}
                  value={refund.diagnostics.description}
                />
              </div>
            ) : null}
          </div>
        ) : null}
        {canExecute || canConsult || canReconcile ? (
          <div className="mt-4 flex flex-wrap justify-end gap-3 border-t border-border/70 pt-4">
            {canConsult ? (
              <Button
                disabled={busyAction !== null}
                onClick={onConsult}
                type="button"
                variant="outline"
              >
                {busyAction === `consult:${refund.id}` ? (
                  <Loader2 aria-hidden="true" className="animate-spin" />
                ) : (
                  <RefreshCw aria-hidden="true" />
                )}
                {busyAction === `consult:${refund.id}`
                  ? copy.actions.consulting
                  : copy.actions.consult}
              </Button>
            ) : null}
            {canReconcile ? (
              <Button
                disabled={busyAction !== null}
                onClick={onReconcile}
                type="button"
                variant="outline"
              >
                <ExternalLink aria-hidden="true" />
                {copy.actions.reconcile}
              </Button>
            ) : null}
            {canExecute ? (
              <Button
                disabled={busyAction !== null}
                onClick={onExecute}
                type="button"
                variant="destructive"
              >
                <RotateCcw aria-hidden="true" />
                {copy.actions.executeSandbox}
              </Button>
            ) : null}
          </div>
        ) : null}
      </AccordionContent>
    </AccordionItem>
  );
}

function FormField({
  label,
  children,
}: Readonly<{ label: string; children: ReactNode }>) {
  return (
    <label className="grid gap-2 text-sm font-medium">
      <span>{label}</span>
      {children}
    </label>
  );
}

function DetailValue({
  label,
  value,
}: Readonly<{ label: string; value: string }>) {
  return (
    <div className="min-w-0">
      <p className="text-xs uppercase tracking-wide text-muted-foreground">
        {label}
      </p>
      <p className="mt-1 break-words text-sm font-medium">{value}</p>
    </div>
  );
}
