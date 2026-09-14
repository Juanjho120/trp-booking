"use client";

import {
  ExternalLink,
  Loader2,
  RefreshCw,
  RotateCcw,
  ShieldCheck,
} from "lucide-react";
import { type ReactNode } from "react";

import {
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
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
import type { useLocale } from "@/features/i18n";
import type {
  AdminRefundProcessingMode,
  AdminRefundReconciliationOutcome,
  AdminRefundReconciliationSource,
  AdminRefundSummary,
} from "@/types/admin-refund";

export type AdminRefundOperationalCopy =
  ReturnType<typeof useLocale>["messages"]["admin"]["reservationsPage"]["refunds"];

export type AdminRefundOperationalPayment = Readonly<{
  id: string;
  providerReference: string | null;
  updatedAt: string;
}>;

export type AdminRefundReconciliationDraft = Readonly<{
  outcome: AdminRefundReconciliationOutcome;
  source: AdminRefundReconciliationSource;
  finalProcessingMode: AdminRefundProcessingMode;
  providerRefundId: string;
  note: string;
}>;

type Detail = Readonly<{
  label: string;
  value: string;
}>;

const inputClassName =
  "h-11 w-full rounded-2xl border border-input bg-background px-3 text-sm text-foreground shadow-xs outline-none transition focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50 disabled:cursor-not-allowed disabled:opacity-50";
const textareaClassName =
  "min-h-28 w-full resize-y rounded-2xl border border-input bg-background px-3 py-3 text-sm leading-6 text-foreground shadow-xs outline-none transition focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50 disabled:cursor-not-allowed disabled:opacity-50";

export function isRefundConsultType(value: string | null | undefined): boolean {
  const normalized = value?.trim().toLowerCase();
  return normalized === "2" || normalized === "refund";
}

export function refundConsultOutcome(
  refund: AdminRefundSummary | null,
): AdminRefundReconciliationOutcome | null {
  const classification =
    refund?.diagnostics?.source === "tilopay_refund_consult"
      ? refund.diagnostics.resultClassification
      : null;

  if (classification === "PROVIDER_ACCEPTED") {
    return "APPROVED";
  }

  if (classification === "PROVIDER_REJECTED") {
    return "FAILED";
  }

  return null;
}

export function hasConclusiveRefundConsultEvidence(
  refund: AdminRefundSummary | null,
): boolean {
  return Boolean(
    refundConsultOutcome(refund) &&
      refund?.diagnostics?.providerReference &&
      isRefundConsultType(refund.diagnostics.modificationType) &&
      refund.diagnostics.amount,
  );
}

export function initialRefundReconciliationDraft(
  refund: AdminRefundSummary,
): AdminRefundReconciliationDraft {
  const consultOutcome = refundConsultOutcome(refund);
  const useConsultEvidence = hasConclusiveRefundConsultEvidence(refund);

  return {
    outcome: useConsultEvidence ? (consultOutcome ?? "APPROVED") : "APPROVED",
    source: useConsultEvidence ? "TILOPAY_CONSULT" : "TILOPAY_PORTAL",
    finalProcessingMode: useConsultEvidence
      ? "TILOPAY_API"
      : "TILOPAY_PORTAL_FALLBACK",
    providerRefundId: useConsultEvidence
      ? (refund.diagnostics?.providerReference ?? "")
      : (refund.providerRefundId ?? ""),
    note: "",
  };
}

export function AdminRefundOperationCard({
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
  extraDetails = [],
  onExecute,
  onConsult,
  onReconcile,
}: Readonly<{
  refund: AdminRefundSummary;
  payment: AdminRefundOperationalPayment | null;
  apiExecutionEnabled: boolean;
  copy: AdminRefundOperationalCopy;
  statusLabel: string;
  authorizationTypeLabel: string;
  modeLabel: string;
  classificationLabel: (classification: string) => string;
  formatMoney: (value: string, currency: string) => string;
  formatDateTime: (value: string | null) => string;
  busyAction: string | null;
  extraDetails?: readonly Detail[];
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
          {extraDetails.map((detail) => (
            <DetailValue
              key={`${detail.label}:${detail.value}`}
              label={detail.label}
              value={detail.value}
            />
          ))}
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

export function AdminRefundExecutionSheet({
  copy,
  closeLabel,
  refund,
  isBusy,
  busyAction,
  formatMoney,
  onClose,
  onConfirm,
}: Readonly<{
  copy: AdminRefundOperationalCopy;
  closeLabel: string;
  refund: AdminRefundSummary | null;
  isBusy: boolean;
  busyAction: string | null;
  formatMoney: (value: string, currency: string) => string;
  onClose: () => void;
  onConfirm: () => void;
}>) {
  return (
    <Sheet
      onOpenChange={(open) => {
        if (!open && !isBusy) onClose();
      }}
      open={refund !== null}
    >
      <SheetContent closeLabel={closeLabel}>
        <SheetHeader>
          <SheetTitle>{copy.executionDialog.title}</SheetTitle>
          <SheetDescription>{copy.executionDialog.description}</SheetDescription>
        </SheetHeader>
        <div className="grid gap-5 overflow-y-auto px-6 py-2">
          {refund ? (
            <div className="grid gap-4 rounded-2xl border border-border bg-muted/30 p-4 sm:grid-cols-2">
              <DetailValue
                label={copy.labels.amount}
                value={formatMoney(refund.amount, refund.currency)}
              />
              <DetailValue label={copy.labels.refund} value={refund.id} />
            </div>
          ) : null}
          <div className="rounded-2xl border border-destructive/30 bg-destructive/5 p-4 text-sm leading-6">
            {copy.executionDialog.warning}
          </div>
        </div>
        <SheetFooter>
          <Button
            disabled={isBusy}
            onClick={onClose}
            type="button"
            variant="outline"
          >
            {copy.actions.close}
          </Button>
          <Button
            disabled={isBusy}
            onClick={onConfirm}
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
  );
}

export function AdminRefundReconciliationSheet({
  copy,
  closeLabel,
  refund,
  draft,
  isBusy,
  busyAction,
  hasConclusiveConsultEvidence,
  consultOutcome,
  modeLabel,
  setDraft,
  onClose,
  onConfirm,
}: Readonly<{
  copy: AdminRefundOperationalCopy;
  closeLabel: string;
  refund: AdminRefundSummary | null;
  draft: AdminRefundReconciliationDraft;
  isBusy: boolean;
  busyAction: string | null;
  hasConclusiveConsultEvidence: boolean;
  consultOutcome: AdminRefundReconciliationOutcome | null;
  modeLabel: (mode: string) => string;
  setDraft: (
    update: (
      current: AdminRefundReconciliationDraft,
    ) => AdminRefundReconciliationDraft,
  ) => void;
  onClose: () => void;
  onConfirm: () => void;
}>) {
  return (
    <Sheet
      onOpenChange={(open) => {
        if (!open && !isBusy) onClose();
      }}
      open={refund !== null}
    >
      <SheetContent closeLabel={closeLabel}>
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
                setDraft((current) => ({
                  ...current,
                  outcome: value as AdminRefundReconciliationOutcome,
                }))
              }
              value={draft.outcome}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="APPROVED">
                  {copy.outcomes.APPROVED}
                </SelectItem>
                <SelectItem value="FAILED">{copy.outcomes.FAILED}</SelectItem>
              </SelectContent>
            </Select>
          </FormField>
          <FormField label={copy.labels.reconciliationSource}>
            <Select
              disabled={isBusy || hasConclusiveConsultEvidence}
              onValueChange={(value) => {
                const source = value as AdminRefundReconciliationSource;

                setDraft((current) =>
                  source === "TILOPAY_CONSULT" &&
                  hasConclusiveConsultEvidence &&
                  consultOutcome
                    ? {
                        ...current,
                        source,
                        outcome: consultOutcome,
                        finalProcessingMode: "TILOPAY_API",
                        providerRefundId:
                          refund?.diagnostics?.providerReference ?? "",
                      }
                    : {
                        ...current,
                        source: "TILOPAY_PORTAL",
                        finalProcessingMode: "TILOPAY_PORTAL_FALLBACK",
                        providerRefundId: refund?.providerRefundId ?? "",
                      },
                );
              }}
              value={draft.source}
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
              value={modeLabel(draft.finalProcessingMode)}
            />
          </div>
          <FormField label={copy.labels.providerRefundId}>
            <input
              className={inputClassName}
              disabled={isBusy || hasConclusiveConsultEvidence}
              maxLength={180}
              onChange={(event) =>
                setDraft((current) => ({
                  ...current,
                  providerRefundId: event.target.value,
                }))
              }
              placeholder={copy.placeholders.providerRefundId}
              value={draft.providerRefundId}
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
                setDraft((current) => ({
                  ...current,
                  note: event.target.value,
                }))
              }
              placeholder={copy.placeholders.reconciliationNote}
              value={draft.note}
            />
          </FormField>
          <div className="rounded-2xl border border-destructive/30 bg-destructive/5 p-4 text-sm leading-6">
            {copy.reconciliationDialog.warning}
          </div>
        </div>
        <SheetFooter>
          <Button
            disabled={isBusy}
            onClick={onClose}
            type="button"
            variant="outline"
          >
            {copy.actions.close}
          </Button>
          <Button
            disabled={isBusy}
            onClick={onConfirm}
            type="button"
            variant={draft.outcome === "APPROVED" ? "destructive" : "default"}
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
