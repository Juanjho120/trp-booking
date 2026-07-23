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
  AdminRefundAuthorizationResult,
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
const committedRefundStatuses = new Set(["PENDING", "PROCESSING", "APPROVED", "MANUAL"]);
const refundablePaymentStatuses = new Set(["APPROVED", "PARTIALLY_REFUNDED"]);

type RefundApiResponse<Result> = Readonly<{
  result?: Result;
  error?: Readonly<{ code?: AdminRefundErrorCode }>;
}>;

type AuthorizationDraft = Readonly<{
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
        (request) =>
          request.status === "COMPLETED" &&
          amountNumber(request.policy.refundAmount) > 0,
      ) ?? null,
    [reservation.cancellationRequests],
  );
  const sourcePayment = eligibleRequest
    ? reservation.payments.find(
        (payment) => payment.id === eligibleRequest.sourcePaymentId,
      ) ?? null
    : null;
  const committedAmount = eligibleRequest
    ? reservation.refunds
        .filter(
          (refund) =>
            refund.lifecycleRequestId === eligibleRequest.id &&
            committedRefundStatuses.has(refund.status),
        )
        .reduce((total, refund) => total + amountNumber(refund.amount), 0)
    : 0;
  const remainingPolicyAmount = eligibleRequest
    ? Math.max(
        0,
        amountNumber(eligibleRequest.policy.refundAmount) - committedAmount,
      )
    : 0;
  const [authorizationOpen, setAuthorizationOpen] = useState(false);
  const [authorizationRequestId, setAuthorizationRequestId] = useState("");
  const [authorizationDraft, setAuthorizationDraft] =
    useState<AuthorizationDraft>({
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
  const canAuthorize = Boolean(
    eligibleRequest &&
      sourcePayment &&
      reservation.status === "CANCELLED" &&
      refundablePaymentStatuses.has(sourcePayment.status) &&
      remainingPolicyAmount > 0,
  );
  const isBusy = busyAction !== null;

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
    return copy.processingModes[mode as keyof typeof copy.processingModes] ?? mode;
  }

  function errorMessage(code: AdminRefundErrorCode | undefined): string {
    return code
      ? (copy.errors[code] ?? copy.errors.ADMIN_REFUND_UNEXPECTED_ERROR)
      : copy.errors.ADMIN_REFUND_UNEXPECTED_ERROR;
  }

  function paymentForRefund(
    refund: AdminRefundSummary,
  ): AdminReservationDetailPayment | null {
    return reservation.payments.find((payment) => payment.id === refund.paymentId) ?? null;
  }

  function openAuthorization(): void {
    if (!eligibleRequest || !sourcePayment) return;

    clearFeedback();
    setAuthorizationRequestId(crypto.randomUUID());
    setAuthorizationDraft({
      amount: fixedAmount(remainingPolicyAmount),
      reason: "",
      processingMode: sourcePayment.providerReference
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
    setReconciliationDraft({
      outcome: "APPROVED",
      source:
        refund.processingMode === "TILOPAY_PORTAL_FALLBACK"
          ? "TILOPAY_PORTAL"
          : "TILOPAY_CONSULT",
      finalProcessingMode:
        refund.processingMode === "TILOPAY_PORTAL_FALLBACK"
          ? "TILOPAY_PORTAL_FALLBACK"
          : "TILOPAY_API",
      providerRefundId: refund.providerRefundId ?? "",
      note: "",
    });
    setReconciliationTarget(refund);
  }

  async function authorizeRefund(): Promise<void> {
    if (
      !eligibleRequest ||
      !sourcePayment ||
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
      const response = await fetch(
        `/api/admin/reservation-lifecycle-requests/${encodeURIComponent(
          eligibleRequest.id,
        )}/refunds`,
        {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({
            ...authorizationDraft,
            requestId: authorizationRequestId,
            expectedRequestVersion: eligibleRequest.version,
            expectedRequestUpdatedAt: eligibleRequest.updatedAt,
            expectedPaymentUpdatedAt: sourcePayment.updatedAt,
          }),
        },
      );
      const payload = (await response.json()) as RefundApiResponse<AdminRefundAuthorizationResult>;

      if (!response.ok || !payload.result) {
        setErrorFeedback(errorMessage(payload.error?.code));
        return;
      }

      setAuthorizationOpen(false);
      setSuccessFeedback(
        payload.result.alreadyProcessed
          ? copy.success.authorizationAlreadyExists
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
      const payload = (await response.json()) as RefundApiResponse<AdminRefundExecutionResult>;

      if (!response.ok || !payload.result) {
        setErrorFeedback(errorMessage(payload.error?.code));
        return;
      }

      setExecutionTarget(null);

      if (payload.result.refund.status === "FAILED") {
        setErrorFeedback(copy.success.executionFailedSafely);
      } else {
        setSuccessFeedback(copy.success.providerObserved);
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
      const payload = (await response.json()) as RefundApiResponse<AdminRefundConsultResult>;

      if (!response.ok || !payload.result) {
        setErrorFeedback(errorMessage(payload.error?.code));
        return;
      }

      setSuccessFeedback(copy.success.consulted);
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
      const payload = (await response.json()) as RefundApiResponse<AdminRefundReconciliationResult>;

      if (!response.ok || !payload.result) {
        setErrorFeedback(errorMessage(payload.error?.code));
        return;
      }

      setReconciliationTarget(null);
      setSuccessFeedback(
        payload.result.refund.status === "APPROVED"
          ? copy.success.reconciledApproved
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
          {canAuthorize ? (
            <Button onClick={openAuthorization} type="button">
              <ShieldCheck aria-hidden="true" />
              {copy.actions.authorize}
            </Button>
          ) : null}
        </CardHeader>
        <CardContent className="grid gap-5">
          {eligibleRequest ? (
            <div className="grid gap-4 rounded-2xl border border-border bg-muted/20 p-4 sm:grid-cols-2 xl:grid-cols-4">
              <DetailValue
                label={copy.labels.policyAmount}
                value={formatMoney(
                  eligibleRequest.policy.refundAmount,
                  eligibleRequest.policy.currency,
                )}
              />
              <DetailValue
                label={copy.labels.committedAmount}
                value={formatMoney(
                  fixedAmount(committedAmount),
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
                label={copy.labels.paymentStatus}
                value={sourcePayment ? statusLabel(sourcePayment.status) : copy.labels.unavailable}
              />
            </div>
          ) : (
            <p className="text-sm leading-6 text-muted-foreground">
              {reservation.status === "CANCELLED"
                ? copy.empty.noEligiblePolicy
                : copy.empty.cancellationRequired}
            </p>
          )}

          <p className="text-sm leading-6 text-muted-foreground">
            {copy.notes.separateLifecycle}
          </p>

          {reservation.refunds.length > 0 ? (
            <div className="grid gap-4">
              {reservation.refunds.map((refund) => (
                <RefundCard
                  busyAction={busyAction}
                  copy={copy}
                  formatDateTime={formatDateTime}
                  formatMoney={formatMoney}
                  key={refund.id}
                  modeLabel={modeLabel(refund.processingMode)}
                  apiExecutionEnabled={reservation.refundApiExecutionEnabled}
                  onConsult={() => void consultRefund(refund)}
                  onExecute={() => openExecution(refund)}
                  onReconcile={() => openReconciliation(refund)}
                  payment={paymentForRefund(refund)}
                  refund={refund}
                  statusLabel={statusLabel(refund.status)}
                />
              ))}
            </div>
          ) : eligibleRequest ? (
            <p className="text-sm text-muted-foreground">{copy.empty.noRefunds}</p>
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
            <SheetTitle>{copy.authorizationDialog.title}</SheetTitle>
            <SheetDescription>{copy.authorizationDialog.description}</SheetDescription>
          </SheetHeader>
          <div className="grid gap-5 overflow-y-auto px-6 py-2">
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
                <SelectTrigger><SelectValue /></SelectTrigger>
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
              {copy.authorizationDialog.warning}
            </div>
          </div>
          <SheetFooter>
            <Button disabled={isBusy} onClick={() => setAuthorizationOpen(false)} type="button" variant="outline">
              {copy.actions.close}
            </Button>
            <Button disabled={isBusy} onClick={() => void authorizeRefund()} type="button">
              {busyAction === "authorize" ? <Loader2 aria-hidden="true" className="animate-spin" /> : <ShieldCheck aria-hidden="true" />}
              {busyAction === "authorize" ? copy.actions.authorizing : copy.actions.confirmAuthorization}
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
                <DetailValue label={copy.labels.amount} value={formatMoney(executionTarget.amount, executionTarget.currency)} />
                <DetailValue label={copy.labels.refund} value={executionTarget.id} />
              </div>
            ) : null}
            <div className="rounded-2xl border border-destructive/30 bg-destructive/5 p-4 text-sm leading-6">
              {copy.executionDialog.warning}
            </div>
          </div>
          <SheetFooter>
            <Button disabled={isBusy} onClick={() => setExecutionTarget(null)} type="button" variant="outline">
              {copy.actions.close}
            </Button>
            <Button disabled={isBusy} onClick={() => void executeRefund()} type="button" variant="destructive">
              {busyAction?.startsWith("execute:") ? <Loader2 aria-hidden="true" className="animate-spin" /> : <RotateCcw aria-hidden="true" />}
              {busyAction?.startsWith("execute:") ? copy.actions.executing : copy.actions.executeSandbox}
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
            <SheetDescription>{copy.reconciliationDialog.description}</SheetDescription>
          </SheetHeader>
          <div className="grid gap-5 overflow-y-auto px-6 py-2">
            <FormField label={copy.labels.outcome}>
              <Select
                disabled={isBusy}
                onValueChange={(value) =>
                  setReconciliationDraft((current) => ({
                    ...current,
                    outcome: value as AdminRefundReconciliationOutcome,
                  }))
                }
                value={reconciliationDraft.outcome}
              >
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="APPROVED">{copy.outcomes.APPROVED}</SelectItem>
                  <SelectItem value="FAILED">{copy.outcomes.FAILED}</SelectItem>
                </SelectContent>
              </Select>
            </FormField>
            <FormField label={copy.labels.reconciliationSource}>
              <Select
                disabled={isBusy}
                onValueChange={(value) =>
                  setReconciliationDraft((current) => ({
                    ...current,
                    source: value as AdminRefundReconciliationSource,
                  }))
                }
                value={reconciliationDraft.source}
              >
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="TILOPAY_CONSULT">{copy.sources.TILOPAY_CONSULT}</SelectItem>
                  <SelectItem value="TILOPAY_PORTAL">{copy.sources.TILOPAY_PORTAL}</SelectItem>
                </SelectContent>
              </Select>
            </FormField>
            <FormField label={copy.labels.finalProcessingMode}>
              <Select
                disabled={isBusy}
                onValueChange={(value) =>
                  setReconciliationDraft((current) => ({
                    ...current,
                    finalProcessingMode: value as AdminRefundProcessingMode,
                  }))
                }
                value={reconciliationDraft.finalProcessingMode}
              >
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="TILOPAY_API">{copy.processingModes.TILOPAY_API}</SelectItem>
                  <SelectItem value="TILOPAY_PORTAL_FALLBACK">{copy.processingModes.TILOPAY_PORTAL_FALLBACK}</SelectItem>
                </SelectContent>
              </Select>
            </FormField>
            <FormField label={copy.labels.providerRefundId}>
              <input
                className={inputClassName}
                disabled={isBusy}
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
            <Button disabled={isBusy} onClick={() => setReconciliationTarget(null)} type="button" variant="outline">
              {copy.actions.close}
            </Button>
            <Button disabled={isBusy} onClick={() => void reconcileRefund()} type="button" variant={reconciliationDraft.outcome === "APPROVED" ? "destructive" : "default"}>
              {busyAction?.startsWith("reconcile:") ? <Loader2 aria-hidden="true" className="animate-spin" /> : <ShieldCheck aria-hidden="true" />}
              {busyAction?.startsWith("reconcile:") ? copy.actions.reconciling : copy.actions.confirmReconciliation}
            </Button>
          </SheetFooter>
        </SheetContent>
      </Sheet>
    </>
  );
}

function RefundCard({
  refund,
  payment,
  apiExecutionEnabled,
  copy,
  statusLabel,
  modeLabel,
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
  modeLabel: string;
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
  const canReconcile = refund.status === "PENDING" || refund.status === "PROCESSING";
  const requestedBy = refund.requestedByAdmin
    ? refund.requestedByAdmin.name
      ? `${refund.requestedByAdmin.name} · ${refund.requestedByAdmin.email}`
      : refund.requestedByAdmin.email
    : copy.labels.unavailable;

  return (
    <div className="rounded-2xl border border-border bg-muted/20 p-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-xs uppercase tracking-wide text-muted-foreground">{copy.labels.refund}</p>
          <p className="mt-1 break-all text-sm font-semibold">{refund.id}</p>
        </div>
        <Badge variant="outline">{statusLabel}</Badge>
      </div>
      <div className="mt-4 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <DetailValue label={copy.labels.amount} value={formatMoney(refund.amount, refund.currency)} />
        <DetailValue label={copy.labels.processingMode} value={modeLabel} />
        <DetailValue label={copy.labels.requestedBy} value={requestedBy} />
        <DetailValue label={copy.labels.createdAt} value={formatDateTime(refund.createdAt)} />
        <DetailValue label={copy.labels.payment} value={refund.paymentId} />
        <DetailValue label={copy.labels.providerOrder} value={payment?.providerReference ?? copy.labels.unavailable} />
        <DetailValue label={copy.labels.providerRefundId} value={refund.providerRefundId ?? copy.labels.unavailable} />
        <DetailValue label={copy.labels.updatedAt} value={formatDateTime(refund.updatedAt)} />
      </div>
      {refund.reason ? (
        <div className="mt-4 rounded-xl border border-border/70 bg-background/60 p-4">
          <DetailValue label={copy.labels.reason} value={refund.reason} />
        </div>
      ) : null}
      {refund.diagnostics ? (
        <div className="mt-4 grid gap-4 rounded-xl border border-border/70 bg-background/60 p-4 sm:grid-cols-2 xl:grid-cols-4">
          <DetailValue label={copy.labels.diagnosticSource} value={refund.diagnostics.source} />
          <DetailValue label={copy.labels.responseCode} value={refund.diagnostics.responseCode ?? copy.labels.unavailable} />
          <DetailValue label={copy.labels.resultClassification} value={refund.diagnostics.resultClassification ?? copy.labels.unavailable} />
          <DetailValue label={copy.labels.observedAt} value={formatDateTime(refund.diagnostics.observedAt)} />
          {refund.diagnostics.orderNumber ? (
            <DetailValue label={copy.labels.observedOrder} value={refund.diagnostics.orderNumber} />
          ) : null}
          {refund.diagnostics.amount ? (
            <DetailValue
              label={copy.labels.observedAmount}
              value={refund.diagnostics.currency
                ? formatMoney(refund.diagnostics.amount, refund.diagnostics.currency)
                : refund.diagnostics.amount}
            />
          ) : null}
          {refund.diagnostics.description ? (
            <div className="sm:col-span-2 xl:col-span-4">
              <DetailValue label={copy.labels.safeDescription} value={refund.diagnostics.description} />
            </div>
          ) : null}
        </div>
      ) : null}
      {canExecute || canConsult || canReconcile ? (
        <div className="mt-4 flex flex-wrap justify-end gap-3 border-t border-border/70 pt-4">
          {canConsult ? (
            <Button disabled={busyAction !== null} onClick={onConsult} type="button" variant="outline">
              {busyAction === `consult:${refund.id}` ? <Loader2 aria-hidden="true" className="animate-spin" /> : <RefreshCw aria-hidden="true" />}
              {busyAction === `consult:${refund.id}` ? copy.actions.consulting : copy.actions.consult}
            </Button>
          ) : null}
          {canReconcile ? (
            <Button disabled={busyAction !== null} onClick={onReconcile} type="button" variant="outline">
              <ExternalLink aria-hidden="true" />
              {copy.actions.reconcile}
            </Button>
          ) : null}
          {canExecute ? (
            <Button disabled={busyAction !== null} onClick={onExecute} type="button" variant="destructive">
              <RotateCcw aria-hidden="true" />
              {copy.actions.executeSandbox}
            </Button>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}

function FormField({ label, children }: Readonly<{ label: string; children: ReactNode }>) {
  return (
    <label className="grid gap-2 text-sm font-medium">
      <span>{label}</span>
      {children}
    </label>
  );
}

function DetailValue({ label, value }: Readonly<{ label: string; value: string }>) {
  return (
    <div className="min-w-0">
      <p className="text-xs uppercase tracking-wide text-muted-foreground">{label}</p>
      <p className="mt-1 break-words text-sm font-medium">{value}</p>
    </div>
  );
}
