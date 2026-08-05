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
import { type ChangeEvent, type ReactNode, useMemo, useState } from "react";

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
import type {
  AdminDateMutationDecisionResult,
  AdminDateMutationErrorCode,
  AdminDateMutationRequestSummary,
} from "@/types/admin-reservation-date-mutation";
import type {
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

import { AdminSnackbar } from "./admin-snackbar";

const inputClassName =
  "h-11 w-full rounded-2xl border border-input bg-background px-3 text-sm text-foreground shadow-xs outline-none transition focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50 disabled:cursor-not-allowed disabled:opacity-50";
const textareaClassName =
  "min-h-28 w-full resize-y rounded-2xl border border-input bg-background px-3 py-3 text-sm leading-6 text-foreground shadow-xs outline-none transition focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50 disabled:cursor-not-allowed disabled:opacity-50";

type RefundApiResponse<Result> = Readonly<{
  result?: Result;
  error?: Readonly<{ code?: AdminRefundErrorCode }>;
}>;

type DateMutationDecisionApiResponse = Readonly<{
  decisionResult?: AdminDateMutationDecisionResult;
  error?: Readonly<{ code?: AdminDateMutationErrorCode }>;
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

function isRefundConsultType(value: string | null | undefined): boolean {
  const normalized = value?.trim().toLowerCase();
  return normalized === "2" || normalized === "refund";
}

export function AdminReservationLifecycleAdjustmentRefundSection({
  reservation,
}: Readonly<{ reservation: AdminReservationDetailData }>) {
  const router = useRouter();
  const { locale, messages } = useLocale();
  const refundCopy = messages.admin.reservationsPage.refunds;
  const dateMutationCopy = messages.admin.reservationsPage.dateMutation;
  const intlLocale = getIntlLocale(locale);
  const refunds = useMemo<readonly AdminRefundSummary[]>(
    () =>
      reservation.refunds.filter(
        (refund) => refund.authorizationType === "LIFECYCLE_ADJUSTMENT",
      ),
    [reservation.refunds],
  );
  const pendingNegativeRequests = useMemo<
    readonly AdminDateMutationRequestSummary[]
  >(
    () =>
      reservation.dateMutationRequests.filter(
        (request) =>
          request.status === "APPROVED" &&
          Number(request.financialDifference) < 0,
      ),
    [reservation.dateMutationRequests],
  );
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

  if (refunds.length === 0 && pendingNegativeRequests.length === 0) {
    return null;
  }

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
    if (!value) return refundCopy.labels.unavailable;

    return new Intl.DateTimeFormat(intlLocale, {
      dateStyle: "medium",
      timeStyle: "short",
    }).format(new Date(value));
  }

  function statusLabel(status: string): string {
    return (
      refundCopy.statuses[status as keyof typeof refundCopy.statuses] ?? status
    );
  }

  function modeLabel(mode: string): string {
    return (
      refundCopy.processingModes[
        mode as keyof typeof refundCopy.processingModes
      ] ?? mode
    );
  }

  function classificationLabel(classification: string): string {
    return (
      refundCopy.resultClassifications[
        classification as keyof typeof refundCopy.resultClassifications
      ] ?? classification
    );
  }

  function errorMessage(code: AdminRefundErrorCode | undefined): string {
    return code
      ? (refundCopy.errors[code] ??
          refundCopy.errors.ADMIN_REFUND_UNEXPECTED_ERROR)
      : refundCopy.errors.ADMIN_REFUND_UNEXPECTED_ERROR;
  }

  function dateMutationErrorMessage(
    code: AdminDateMutationErrorCode | undefined,
  ): string {
    return code
      ? (dateMutationCopy.errors[code] ??
          dateMutationCopy.errors.ADMIN_DATE_MUTATION_UNEXPECTED_ERROR)
      : dateMutationCopy.errors.ADMIN_DATE_MUTATION_UNEXPECTED_ERROR;
  }

  function paymentForRefund(
    refund: AdminRefundSummary,
  ): AdminReservationDetailPayment | null {
    return (
      reservation.payments.find((payment) => payment.id === refund.paymentId) ??
      null
    );
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

  async function retryNegativeCompletion(requestId: string): Promise<void> {
    const lifecycleRequest = reservation.dateMutationRequests.find(
      (request) => request.id === requestId,
    );

    if (!lifecycleRequest || isBusy) return;

    const decisionNote =
      lifecycleRequest.decisionNote ?? lifecycleRequest.requestNote;

    if (!decisionNote?.trim()) {
      setErrorFeedback(
        dateMutationCopy.errors.INVALID_ADMIN_DATE_MUTATION_REQUEST,
      );
      return;
    }

    clearFeedback();
    setBusyAction(`complete:${requestId}`);

    try {
      const response = await fetch(
        `/api/admin/reservations/${encodeURIComponent(
          reservation.id,
        )}/date-mutation-requests/${encodeURIComponent(requestId)}/decision`,
        {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({
            decision: "APPROVE",
            decisionNote,
            expectedRequestVersion: lifecycleRequest.version,
            expectedReservationUpdatedAt:
              lifecycleRequest.expectedReservationUpdatedAt,
          }),
        },
      );
      const payload =
        (await response.json()) as DateMutationDecisionApiResponse;

      if (!response.ok || !payload.decisionResult) {
        setErrorFeedback(dateMutationErrorMessage(payload.error?.code));
        return;
      }

      setSuccessFeedback(dateMutationCopy.success.requestApproved);
      router.refresh();
    } catch {
      setErrorFeedback(
        dateMutationCopy.errors.ADMIN_DATE_MUTATION_UNEXPECTED_ERROR,
      );
    } finally {
      setBusyAction(null);
    }
  }

  async function executeRefund(): Promise<void> {
    if (!executionTarget || isBusy) return;
    const payment = paymentForRefund(executionTarget);

    if (!payment) {
      setErrorFeedback(refundCopy.errors.ADMIN_REFUND_PAYMENT_NOT_FOUND);
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
            ? refundCopy.success.providerRejected
            : refundCopy.success.executionFailedSafely,
        );
      } else {
        setSuccessFeedback(
          classification === "PROVIDER_ACCEPTED_PENDING_CONFIRMATION"
            ? refundCopy.success.providerAcceptedPending
            : refundCopy.success.providerUncertain,
        );
      }

      router.refresh();
    } catch {
      setErrorFeedback(refundCopy.errors.ADMIN_REFUND_UNEXPECTED_ERROR);
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
          ? refundCopy.success.consultedAccepted
          : classification === "PROVIDER_REJECTED"
            ? refundCopy.success.consultedRejected
            : refundCopy.success.consultedInconclusive,
      );
      router.refresh();
    } catch {
      setErrorFeedback(refundCopy.errors.ADMIN_REFUND_UNEXPECTED_ERROR);
    } finally {
      setBusyAction(null);
    }
  }

  async function reconcileRefund(): Promise<void> {
    if (!reconciliationTarget || isBusy || !reconciliationDraft.note.trim()) {
      setErrorFeedback(refundCopy.errors.INVALID_ADMIN_REFUND_REQUEST);
      return;
    }

    if (
      reconciliationDraft.outcome === "APPROVED" &&
      !reconciliationDraft.providerRefundId.trim()
    ) {
      setErrorFeedback(refundCopy.errors.INVALID_ADMIN_REFUND_REQUEST);
      return;
    }

    const payment = paymentForRefund(reconciliationTarget);

    if (!payment) {
      setErrorFeedback(refundCopy.errors.ADMIN_REFUND_PAYMENT_NOT_FOUND);
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

      setReconciliationTarget(null);
      setSuccessFeedback(
        payload.result.refund.status === "APPROVED"
          ? refundCopy.success.reconciledApproved
          : refundCopy.success.reconciledFailed,
      );
      router.refresh();
    } catch {
      setErrorFeedback(refundCopy.errors.ADMIN_REFUND_UNEXPECTED_ERROR);
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
        <CardHeader>
          <div className="mb-2 flex items-center gap-2 text-sm font-medium text-muted-foreground">
            <CircleDollarSign aria-hidden="true" className="size-4" />
            {dateMutationCopy.badge}
          </div>
          <CardTitle>{`${dateMutationCopy.title} · ${refundCopy.title}`}</CardTitle>
          <CardDescription>{dateMutationCopy.description}</CardDescription>
        </CardHeader>
        <CardContent>
          <Accordion className="grid gap-3" collapsible type="single">
            {pendingNegativeRequests.map((request) => (
              <AccordionItem
                className="overflow-hidden rounded-2xl border border-border bg-muted/20"
                key={request.id}
                value={`request:${request.id}`}
              >
                <AccordionTrigger className="px-4 py-3 hover:bg-muted/40 sm:px-5">
                  <div className="grid min-w-0 flex-1 gap-2 pr-2 text-left sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center">
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <Badge variant="outline">
                          {dateMutationCopy.requestTypes[request.requestType]}
                        </Badge>
                        <Badge variant="secondary">
                          {dateMutationCopy.statuses[
                            request.status as keyof typeof dateMutationCopy.statuses
                          ] ?? request.status}
                        </Badge>
                      </div>
                      <p className="mt-2 break-all text-sm font-semibold">
                        {request.id}
                      </p>
                    </div>
                    <div className="text-left sm:text-right">
                      <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                        {dateMutationCopy.labels.financialDifference}
                      </p>
                      <p className="mt-1 text-sm font-semibold">
                        {formatMoney(
                          Math.abs(Number(request.financialDifference)).toFixed(
                            2,
                          ),
                          request.requested.pricing.currency,
                        )}
                      </p>
                    </div>
                  </div>
                </AccordionTrigger>
                <AccordionContent className="border-t border-border/70 px-4 pt-4 sm:px-5">
                  <div className="grid gap-4 sm:grid-cols-2">
                    <DetailValue
                      label={dateMutationCopy.labels.financialDifference}
                      value={formatMoney(
                        Math.abs(Number(request.financialDifference)).toFixed(2),
                        request.requested.pricing.currency,
                      )}
                    />
                    <DetailValue
                      label={dateMutationCopy.labels.requestType}
                      value={dateMutationCopy.requestTypes[request.requestType]}
                    />
                  </div>
                  <div className="mt-4 flex justify-end border-t border-border/70 pt-4">
                    <Button
                      disabled={isBusy}
                      onClick={() => void retryNegativeCompletion(request.id)}
                      type="button"
                    >
                      {busyAction === `complete:${request.id}` ? (
                        <Loader2 aria-hidden="true" className="animate-spin" />
                      ) : (
                        <ShieldCheck aria-hidden="true" />
                      )}
                      {busyAction === `complete:${request.id}`
                        ? dateMutationCopy.actions.deciding
                        : dateMutationCopy.actions.confirmApprove}
                    </Button>
                  </div>
                </AccordionContent>
              </AccordionItem>
            ))}

            {refunds.map((refund) => {
              const payment = paymentForRefund(refund);
              const canExecute =
                refund.status === "PENDING" &&
                refund.processingMode === "TILOPAY_API" &&
                reservation.refundApiExecutionEnabled &&
                Boolean(payment?.providerReference);
              const canConsult =
                refund.status === "PROCESSING" &&
                refund.processingMode === "TILOPAY_API" &&
                reservation.refundApiExecutionEnabled &&
                Boolean(payment?.providerReference);
              const canReconcile =
                refund.status === "PENDING" || refund.status === "PROCESSING";
              const requestedBy = refund.requestedByAdmin
                ? refund.requestedByAdmin.name
                  ? `${refund.requestedByAdmin.name} · ${refund.requestedByAdmin.email}`
                  : refund.requestedByAdmin.email
                : refundCopy.labels.unavailable;

              return (
                <AccordionItem
                  className="overflow-hidden rounded-2xl border border-border bg-muted/20"
                  key={refund.id}
                  value={`refund:${refund.id}`}
                >
                  <AccordionTrigger className="px-4 py-3 hover:bg-muted/40 sm:px-5">
                    <div className="grid min-w-0 flex-1 gap-2 pr-2 text-left sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center">
                      <div className="min-w-0">
                        <p className="break-all text-sm font-semibold">
                          {refund.id}
                        </p>
                        <p className="mt-1 text-sm text-muted-foreground">
                          {modeLabel(refund.processingMode)}
                        </p>
                      </div>
                      <div className="flex flex-wrap items-center gap-2 sm:justify-end">
                        <p className="text-sm font-semibold">
                          {formatMoney(refund.amount, refund.currency)}
                        </p>
                        <Badge variant="outline">
                          {statusLabel(refund.status)}
                        </Badge>
                      </div>
                    </div>
                  </AccordionTrigger>
                  <AccordionContent className="border-t border-border/70 px-4 pt-4 sm:px-5">
                    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
                      <DetailValue
                        label={refundCopy.labels.amount}
                        value={formatMoney(refund.amount, refund.currency)}
                      />
                      <DetailValue
                        label={refundCopy.labels.authorizationType}
                        value={`${dateMutationCopy.badge} · ${refundCopy.badge}`}
                      />
                      <DetailValue
                        label={refundCopy.labels.processingMode}
                        value={modeLabel(refund.processingMode)}
                      />
                      <DetailValue
                        label={refundCopy.labels.requestedBy}
                        value={requestedBy}
                      />
                      <DetailValue
                        label={refundCopy.labels.createdAt}
                        value={formatDateTime(refund.createdAt)}
                      />
                      <DetailValue
                        label={refundCopy.labels.payment}
                        value={refund.paymentId}
                      />
                      <DetailValue
                        label={refundCopy.labels.providerOrder}
                        value={
                          payment?.providerReference ??
                          refundCopy.labels.unavailable
                        }
                      />
                      <DetailValue
                        label={refundCopy.labels.providerRefundId}
                        value={
                          refund.providerRefundId ?? refundCopy.labels.unavailable
                        }
                      />
                    </div>

                    {refund.reason ? (
                      <div className="mt-4 rounded-xl border border-border/70 bg-background/60 p-4">
                        <DetailValue
                          label={refundCopy.labels.reason}
                          value={refund.reason}
                        />
                      </div>
                    ) : null}

                    {refund.diagnostics ? (
                      <div className="mt-4 grid gap-4 rounded-xl border border-border/70 bg-background/60 p-4 sm:grid-cols-2 xl:grid-cols-4">
                        <DetailValue
                          label={refundCopy.labels.diagnosticSource}
                          value={refund.diagnostics.source}
                        />
                        <DetailValue
                          label={refundCopy.labels.responseCode}
                          value={
                            refund.diagnostics.responseCode ??
                            refundCopy.labels.unavailable
                          }
                        />
                        <DetailValue
                          label={refundCopy.labels.resultClassification}
                          value={
                            refund.diagnostics.resultClassification
                              ? classificationLabel(
                                  refund.diagnostics.resultClassification,
                                )
                              : refundCopy.labels.unavailable
                          }
                        />
                        <DetailValue
                          label={refundCopy.labels.observedAt}
                          value={formatDateTime(refund.diagnostics.observedAt)}
                        />
                      </div>
                    ) : null}

                    {canExecute || canConsult || canReconcile ? (
                      <div className="mt-4 flex flex-wrap justify-end gap-3 border-t border-border/70 pt-4">
                        {canConsult ? (
                          <Button
                            disabled={isBusy}
                            onClick={() => void consultRefund(refund)}
                            type="button"
                            variant="outline"
                          >
                            {busyAction === `consult:${refund.id}` ? (
                              <Loader2
                                aria-hidden="true"
                                className="animate-spin"
                              />
                            ) : (
                              <RefreshCw aria-hidden="true" />
                            )}
                            {busyAction === `consult:${refund.id}`
                              ? refundCopy.actions.consulting
                              : refundCopy.actions.consult}
                          </Button>
                        ) : null}
                        {canReconcile ? (
                          <Button
                            disabled={isBusy}
                            onClick={() => openReconciliation(refund)}
                            type="button"
                            variant="outline"
                          >
                            <ExternalLink aria-hidden="true" />
                            {refundCopy.actions.reconcile}
                          </Button>
                        ) : null}
                        {canExecute ? (
                          <Button
                            disabled={isBusy}
                            onClick={() => openExecution(refund)}
                            type="button"
                            variant="destructive"
                          >
                            <RotateCcw aria-hidden="true" />
                            {refundCopy.actions.executeSandbox}
                          </Button>
                        ) : null}
                      </div>
                    ) : null}
                  </AccordionContent>
                </AccordionItem>
              );
            })}
          </Accordion>
        </CardContent>
      </Card>

      <Sheet
        onOpenChange={(open: boolean) => {
          if (!open && !isBusy) setExecutionTarget(null);
        }}
        open={executionTarget !== null}
      >
        <SheetContent closeLabel={messages.admin.feedback.dismiss}>
          <SheetHeader>
            <SheetTitle>{refundCopy.executionDialog.title}</SheetTitle>
            <SheetDescription>
              {refundCopy.executionDialog.description}
            </SheetDescription>
          </SheetHeader>
          <div className="grid gap-5 overflow-y-auto px-6 py-2">
            {executionTarget ? (
              <div className="grid gap-4 rounded-2xl border border-border bg-muted/30 p-4 sm:grid-cols-2">
                <DetailValue
                  label={refundCopy.labels.amount}
                  value={formatMoney(
                    executionTarget.amount,
                    executionTarget.currency,
                  )}
                />
                <DetailValue
                  label={refundCopy.labels.refund}
                  value={executionTarget.id}
                />
              </div>
            ) : null}
            <div className="rounded-2xl border border-destructive/30 bg-destructive/5 p-4 text-sm leading-6">
              {refundCopy.executionDialog.warning}
            </div>
          </div>
          <SheetFooter>
            <Button
              disabled={isBusy}
              onClick={() => setExecutionTarget(null)}
              type="button"
              variant="outline"
            >
              {refundCopy.actions.close}
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
                ? refundCopy.actions.executing
                : refundCopy.actions.executeSandbox}
            </Button>
          </SheetFooter>
        </SheetContent>
      </Sheet>

      <Sheet
        onOpenChange={(open: boolean) => {
          if (!open && !isBusy) setReconciliationTarget(null);
        }}
        open={reconciliationTarget !== null}
      >
        <SheetContent closeLabel={messages.admin.feedback.dismiss}>
          <SheetHeader>
            <SheetTitle>{refundCopy.reconciliationDialog.title}</SheetTitle>
            <SheetDescription>
              {refundCopy.reconciliationDialog.description}
            </SheetDescription>
          </SheetHeader>
          <div className="grid gap-5 overflow-y-auto px-6 py-2">
            <FormField label={refundCopy.labels.outcome}>
              <Select
                disabled={isBusy || hasConclusiveConsultEvidence}
                onValueChange={(value: string) =>
                  setReconciliationDraft((current: ReconciliationDraft) => ({
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
                    {refundCopy.outcomes.APPROVED}
                  </SelectItem>
                  <SelectItem value="FAILED">
                    {refundCopy.outcomes.FAILED}
                  </SelectItem>
                </SelectContent>
              </Select>
            </FormField>

            <FormField label={refundCopy.labels.reconciliationSource}>
              <Select
                disabled={isBusy || hasConclusiveConsultEvidence}
                onValueChange={(value: string) => {
                  const source = value as AdminRefundReconciliationSource;

                  setReconciliationDraft((current: ReconciliationDraft) =>
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
                      {refundCopy.sources.TILOPAY_CONSULT}
                    </SelectItem>
                  ) : null}
                  <SelectItem value="TILOPAY_PORTAL">
                    {refundCopy.sources.TILOPAY_PORTAL}
                  </SelectItem>
                </SelectContent>
              </Select>
            </FormField>

            <div className="rounded-2xl border border-border bg-muted/30 p-4">
              <DetailValue
                label={refundCopy.labels.finalProcessingMode}
                value={modeLabel(reconciliationDraft.finalProcessingMode)}
              />
            </div>

            <FormField label={refundCopy.labels.providerRefundId}>
              <input
                className={inputClassName}
                disabled={isBusy || hasConclusiveConsultEvidence}
                maxLength={180}
                onChange={(event: ChangeEvent<HTMLInputElement>) =>
                  setReconciliationDraft((current: ReconciliationDraft) => ({
                    ...current,
                    providerRefundId: event.target.value,
                  }))
                }
                placeholder={refundCopy.placeholders.providerRefundId}
                value={reconciliationDraft.providerRefundId}
              />
            </FormField>

            {hasConclusiveConsultEvidence ? (
              <div className="rounded-2xl border border-primary/30 bg-primary/5 p-4 text-sm leading-6">
                {refundCopy.reconciliationDialog.consultEvidenceLocked}
              </div>
            ) : null}

            <FormField label={refundCopy.labels.reconciliationNote}>
              <textarea
                className={textareaClassName}
                disabled={isBusy}
                maxLength={2_000}
                onChange={(event: ChangeEvent<HTMLTextAreaElement>) =>
                  setReconciliationDraft((current: ReconciliationDraft) => ({
                    ...current,
                    note: event.target.value,
                  }))
                }
                placeholder={refundCopy.placeholders.reconciliationNote}
                value={reconciliationDraft.note}
              />
            </FormField>

            <div className="rounded-2xl border border-destructive/30 bg-destructive/5 p-4 text-sm leading-6">
              {refundCopy.reconciliationDialog.warning}
            </div>
          </div>
          <SheetFooter>
            <Button
              disabled={isBusy}
              onClick={() => setReconciliationTarget(null)}
              type="button"
              variant="outline"
            >
              {refundCopy.actions.close}
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
                ? refundCopy.actions.reconciling
                : refundCopy.actions.confirmReconciliation}
            </Button>
          </SheetFooter>
        </SheetContent>
      </Sheet>
    </>
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
