"use client";

import {
  Ban,
  CalendarX2,
  CheckCircle2,
  Clock3,
  Loader2,
  Plus,
  XCircle,
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
  AdminCancellationDecision,
  AdminCancellationDecisionResult,
  AdminCancellationRequestSummary,
  AdminReservationCancellationErrorCode,
} from "@/types/admin-reservation-cancellation";
import type { AdminReservationDetailData } from "@/types/admin-reservation-detail";
import type { Locale } from "@/types/locale";

import { AdminSnackbar } from "./admin-snackbar";

const inputClassName =
  "h-11 w-full rounded-2xl border border-input bg-background px-3 text-sm text-foreground shadow-xs outline-none transition focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50 disabled:cursor-not-allowed disabled:opacity-50";
const textareaClassName =
  "min-h-28 w-full resize-y rounded-2xl border border-input bg-background px-3 py-3 text-sm leading-6 text-foreground shadow-xs outline-none transition focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50 disabled:cursor-not-allowed disabled:opacity-50";
const activeRequestStatuses = new Set(["PENDING_REVIEW", "APPROVED"]);

type CreateCancellationApiResponse = Readonly<{
  cancellationRequest?: AdminCancellationRequestSummary;
  error?: Readonly<{
    code?: AdminReservationCancellationErrorCode;
  }>;
}>;

type DecisionApiResponse = Readonly<{
  result?: AdminCancellationDecisionResult;
  error?: Readonly<{
    code?: AdminReservationCancellationErrorCode;
  }>;
}>;

type CancellationDraft = Readonly<{
  channel: "EMAIL" | "PHONE" | "WHATSAPP" | "OTHER";
  requesterName: string;
  requesterEmail: string;
  requesterPhone: string;
  requestNote: string;
}>;

type DecisionTarget = Readonly<{
  request: AdminCancellationRequestSummary;
  decision: AdminCancellationDecision;
}>;

function getIntlLocale(locale: Locale): string {
  return locale === "en" ? "en-US" : "es-GT";
}

function toInitialDraft(
  reservation: AdminReservationDetailData,
): CancellationDraft {
  return {
    channel: "EMAIL",
    requesterName: reservation.guestName,
    requesterEmail: reservation.guestEmail,
    requesterPhone: reservation.guestPhone ?? "",
    requestNote: "",
  };
}

export function AdminReservationCancellationSection({
  reservation,
}: Readonly<{
  reservation: AdminReservationDetailData;
}>) {
  const router = useRouter();
  const { locale, messages } = useLocale();
  const copy = messages.admin.reservationsPage.cancellation;
  const intlLocale = getIntlLocale(locale);
  const [createOpen, setCreateOpen] = useState(false);
  const [createRequestId, setCreateRequestId] = useState("");
  const [draft, setDraft] = useState<CancellationDraft>(() =>
    toInitialDraft(reservation),
  );
  const [decisionTarget, setDecisionTarget] =
    useState<DecisionTarget | null>(null);
  const [decisionNote, setDecisionNote] = useState("");
  const [busyAction, setBusyAction] = useState<"create" | "decision" | null>(
    null,
  );
  const [errorFeedback, setErrorFeedback] = useState<string | null>(null);
  const [successFeedback, setSuccessFeedback] = useState<string | null>(null);
  const activeRequest = useMemo(
    () =>
      reservation.cancellationRequests.find((request) =>
        activeRequestStatuses.has(request.status),
      ) ?? null,
    [reservation.cancellationRequests],
  );
  const canCreateRequest =
    reservation.status === "CONFIRMED" && activeRequest === null;
  const isBusy = busyAction !== null;

  function clearFeedback(): void {
    setErrorFeedback(null);
    setSuccessFeedback(null);
  }

  function formatDateTime(value: string | null): string {
    if (!value) {
      return copy.labels.unavailable;
    }

    return new Intl.DateTimeFormat(intlLocale, {
      dateStyle: "medium",
      timeStyle: "short",
    }).format(new Date(value));
  }

  function formatMoney(value: string, currency: string): string {
    return new Intl.NumberFormat(intlLocale, {
      style: "currency",
      currency,
    }).format(Number(value));
  }

  function formatHours(value: string): string {
    return new Intl.NumberFormat(intlLocale, {
      maximumFractionDigits: 2,
    }).format(Number(value));
  }

  function statusLabel(status: string): string {
    return copy.statuses[status as keyof typeof copy.statuses] ?? status;
  }

  function channelLabel(channel: string): string {
    return copy.channels[channel as keyof typeof copy.channels] ?? channel;
  }

  function policyReasonLabel(reasonCode: string): string {
    return (
      copy.policyReasons[reasonCode as keyof typeof copy.policyReasons] ??
      reasonCode
    );
  }

  function errorMessage(
    code: AdminReservationCancellationErrorCode | undefined,
  ): string {
    return code
      ? (copy.errors[code] ?? copy.errors.ADMIN_CANCELLATION_UNEXPECTED_ERROR)
      : copy.errors.ADMIN_CANCELLATION_UNEXPECTED_ERROR;
  }

  function openCreateRequest(): void {
    clearFeedback();
    setDraft(toInitialDraft(reservation));
    setCreateRequestId(crypto.randomUUID());
    setCreateOpen(true);
  }

  function openDecision(
    request: AdminCancellationRequestSummary,
    decision: AdminCancellationDecision,
  ): void {
    clearFeedback();
    setDecisionNote("");
    setDecisionTarget({ request, decision });
  }

  async function createCancellationRequest(): Promise<void> {
    if (isBusy || !draft.requesterName.trim() || !draft.requestNote.trim()) {
      setErrorFeedback(copy.errors.INVALID_ADMIN_CANCELLATION_REQUEST);
      return;
    }

    clearFeedback();
    setBusyAction("create");

    try {
      const response = await fetch(
        `/api/admin/reservations/${encodeURIComponent(
          reservation.id,
        )}/cancellation-requests`,
        {
          method: "POST",
          headers: {
            "content-type": "application/json",
          },
          body: JSON.stringify({
            channel: draft.channel,
            requesterName: draft.requesterName,
            requesterEmail: draft.requesterEmail.trim() || null,
            requesterPhone: draft.requesterPhone.trim() || null,
            requestNote: draft.requestNote,
            expectedReservationUpdatedAt: reservation.updatedAt,
            requestId: createRequestId,
          }),
        },
      );
      const payload = (await response.json()) as CreateCancellationApiResponse;

      if (!response.ok || !payload.cancellationRequest) {
        setErrorFeedback(errorMessage(payload.error?.code));
        return;
      }

      setCreateOpen(false);
      setSuccessFeedback(copy.success.requestCreated);
      router.refresh();
    } catch {
      setErrorFeedback(copy.errors.ADMIN_CANCELLATION_UNEXPECTED_ERROR);
    } finally {
      setBusyAction(null);
    }
  }

  async function decideCancellationRequest(): Promise<void> {
    if (!decisionTarget || isBusy || !decisionNote.trim()) {
      setErrorFeedback(copy.errors.INVALID_ADMIN_CANCELLATION_REQUEST);
      return;
    }

    clearFeedback();
    setBusyAction("decision");

    try {
      const response = await fetch(
        `/api/admin/reservation-lifecycle-requests/${encodeURIComponent(
          decisionTarget.request.id,
        )}/decision`,
        {
          method: "POST",
          headers: {
            "content-type": "application/json",
          },
          body: JSON.stringify({
            reservationId: reservation.id,
            decision: decisionTarget.decision,
            decisionNote,
            expectedRequestVersion: decisionTarget.request.version,
            expectedReservationUpdatedAt:
              decisionTarget.request.expectedReservationUpdatedAt,
          }),
        },
      );
      const payload = (await response.json()) as DecisionApiResponse;

      if (!response.ok || !payload.result) {
        setErrorFeedback(errorMessage(payload.error?.code));
        return;
      }

      setDecisionTarget(null);
      setSuccessFeedback(
        payload.result.decision === "APPROVE"
          ? payload.result.alreadyProcessed
            ? copy.success.alreadyCancelled
            : copy.success.cancelled
          : payload.result.alreadyProcessed
            ? copy.success.alreadyRejected
            : copy.success.rejected,
      );
      router.refresh();
    } catch {
      setErrorFeedback(copy.errors.ADMIN_CANCELLATION_UNEXPECTED_ERROR);
    } finally {
      setBusyAction(null);
    }
  }

  const approving = decisionTarget?.decision === "APPROVE";

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
              <CalendarX2 aria-hidden="true" className="size-4" />
              {copy.badge}
            </div>
            <CardTitle>{copy.title}</CardTitle>
            <CardDescription>{copy.description}</CardDescription>
          </div>
          {canCreateRequest ? (
            <Button onClick={openCreateRequest} type="button">
              <Plus aria-hidden="true" />
              {copy.actions.createRequest}
            </Button>
          ) : null}
        </CardHeader>
        <CardContent className="grid gap-5">
          <div className="rounded-2xl border border-border bg-muted/20 p-4 text-sm leading-6 text-muted-foreground">
            <p>{copy.notes.policyCalculation}</p>
            <p className="mt-2">{copy.notes.refundSeparate}</p>
            <p className="mt-2">{copy.notes.availabilityRelease}</p>
          </div>

          {!canCreateRequest && reservation.status !== "CONFIRMED" ? (
            <div className="flex items-start gap-3 rounded-2xl border border-border bg-muted/20 p-4 text-sm">
              <Ban aria-hidden="true" className="mt-0.5 size-4 shrink-0" />
              <p>{copy.states.reservationNotEligible}</p>
            </div>
          ) : null}

          {activeRequest ? (
            <div className="flex items-start gap-3 rounded-2xl border border-amber-500/30 bg-amber-500/5 p-4 text-sm">
              <Clock3 aria-hidden="true" className="mt-0.5 size-4 shrink-0" />
              <p>{copy.states.activeRequest}</p>
            </div>
          ) : null}

          {reservation.cancellationRequests.length > 0 ? (
            <div className="grid gap-4">
              {reservation.cancellationRequests.map((request) => (
                <CancellationRequestCard
                  canDecide={
                    request.status === "PENDING_REVIEW" &&
                    reservation.status === "CONFIRMED"
                  }
                  channelLabel={channelLabel(request.channel)}
                  copy={copy}
                  formatDateTime={formatDateTime}
                  formatHours={formatHours}
                  formatMoney={formatMoney}
                  key={request.id}
                  onApprove={() => openDecision(request, "APPROVE")}
                  onReject={() => openDecision(request, "REJECT")}
                  policyReasonLabel={policyReasonLabel(request.policy.reasonCode)}
                  request={request}
                  statusLabel={statusLabel(request.status)}
                />
              ))}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">{copy.empty}</p>
          )}
        </CardContent>
      </Card>

      <Sheet
        onOpenChange={(open) => {
          if (!open && !isBusy) {
            setCreateOpen(false);
          }
        }}
        open={createOpen}
      >
        <SheetContent closeLabel={messages.admin.feedback.dismiss}>
          <SheetHeader>
            <SheetTitle>{copy.createDialog.title}</SheetTitle>
            <SheetDescription>{copy.createDialog.description}</SheetDescription>
          </SheetHeader>

          <div className="grid gap-5 overflow-y-auto px-6 py-2">
            <FormField label={copy.labels.channel}>
              <Select
                disabled={isBusy}
                onValueChange={(value) =>
                  setDraft((current) => ({
                    ...current,
                    channel: value as CancellationDraft["channel"],
                  }))
                }
                value={draft.channel}
              >
                <SelectTrigger aria-label={copy.labels.channel}>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(copy.channels).map(([value, label]) => (
                    <SelectItem key={value} value={value}>
                      {label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </FormField>

            <FormField label={copy.labels.requesterName}>
              <input
                className={inputClassName}
                disabled={isBusy}
                maxLength={160}
                onChange={(event) =>
                  setDraft((current) => ({
                    ...current,
                    requesterName: event.target.value,
                  }))
                }
                type="text"
                value={draft.requesterName}
              />
            </FormField>

            <FormField label={copy.labels.requesterEmail}>
              <input
                className={inputClassName}
                disabled={isBusy}
                maxLength={254}
                onChange={(event) =>
                  setDraft((current) => ({
                    ...current,
                    requesterEmail: event.target.value,
                  }))
                }
                type="email"
                value={draft.requesterEmail}
              />
            </FormField>

            <FormField label={copy.labels.requesterPhone}>
              <input
                className={inputClassName}
                disabled={isBusy}
                maxLength={40}
                onChange={(event) =>
                  setDraft((current) => ({
                    ...current,
                    requesterPhone: event.target.value,
                  }))
                }
                type="tel"
                value={draft.requesterPhone}
              />
            </FormField>

            <FormField label={copy.labels.requestReason}>
              <textarea
                className={textareaClassName}
                disabled={isBusy}
                maxLength={2_000}
                onChange={(event) =>
                  setDraft((current) => ({
                    ...current,
                    requestNote: event.target.value,
                  }))
                }
                placeholder={copy.placeholders.requestReason}
                value={draft.requestNote}
              />
            </FormField>

            <div className="rounded-2xl border border-border bg-muted/30 p-4 text-sm leading-6 text-muted-foreground">
              {copy.createDialog.policyNote}
            </div>
          </div>

          <SheetFooter>
            <Button
              disabled={isBusy}
              onClick={() => setCreateOpen(false)}
              type="button"
              variant="outline"
            >
              {copy.actions.close}
            </Button>
            <Button
              disabled={isBusy}
              onClick={() => void createCancellationRequest()}
              type="button"
            >
              {busyAction === "create" ? (
                <Loader2 aria-hidden="true" className="animate-spin" />
              ) : (
                <Plus aria-hidden="true" />
              )}
              {busyAction === "create"
                ? copy.actions.creating
                : copy.actions.createRequest}
            </Button>
          </SheetFooter>
        </SheetContent>
      </Sheet>

      <Sheet
        onOpenChange={(open) => {
          if (!open && !isBusy) {
            setDecisionTarget(null);
          }
        }}
        open={decisionTarget !== null}
      >
        <SheetContent closeLabel={messages.admin.feedback.dismiss}>
          <SheetHeader>
            <SheetTitle>
              {approving
                ? copy.decisionDialog.approveTitle
                : copy.decisionDialog.rejectTitle}
            </SheetTitle>
            <SheetDescription>
              {approving
                ? copy.decisionDialog.approveDescription
                : copy.decisionDialog.rejectDescription}
            </SheetDescription>
          </SheetHeader>

          <div className="grid gap-5 overflow-y-auto px-6 py-2">
            {decisionTarget ? (
              <div className="rounded-2xl border border-border bg-muted/30 p-4 text-sm">
                <DetailValue
                  label={copy.labels.policyOutcome}
                  value={policyReasonLabel(
                    decisionTarget.request.policy.reasonCode,
                  )}
                />
                <div className="mt-4">
                  <DetailValue
                    label={copy.labels.standardRefund}
                    value={formatMoney(
                      decisionTarget.request.policy.refundAmount,
                      decisionTarget.request.policy.currency,
                    )}
                  />
                </div>
              </div>
            ) : null}

            <FormField label={copy.labels.decisionNote}>
              <textarea
                className={textareaClassName}
                disabled={isBusy}
                maxLength={2_000}
                onChange={(event) => setDecisionNote(event.target.value)}
                placeholder={copy.placeholders.decisionNote}
                value={decisionNote}
              />
            </FormField>

            <div
              className={
                approving
                  ? "rounded-2xl border border-destructive/30 bg-destructive/5 p-4 text-sm leading-6"
                  : "rounded-2xl border border-border bg-muted/30 p-4 text-sm leading-6"
              }
            >
              {approving
                ? copy.decisionDialog.approveWarning
                : copy.decisionDialog.rejectWarning}
            </div>
          </div>

          <SheetFooter>
            <Button
              disabled={isBusy}
              onClick={() => setDecisionTarget(null)}
              type="button"
              variant="outline"
            >
              {copy.actions.close}
            </Button>
            <Button
              disabled={isBusy}
              onClick={() => void decideCancellationRequest()}
              type="button"
              variant={approving ? "destructive" : "default"}
            >
              {busyAction === "decision" ? (
                <Loader2 aria-hidden="true" className="animate-spin" />
              ) : approving ? (
                <CheckCircle2 aria-hidden="true" />
              ) : (
                <XCircle aria-hidden="true" />
              )}
              {busyAction === "decision"
                ? copy.actions.processing
                : approving
                  ? copy.actions.confirmApprove
                  : copy.actions.confirmReject}
            </Button>
          </SheetFooter>
        </SheetContent>
      </Sheet>
    </>
  );
}

function CancellationRequestCard({
  request,
  copy,
  statusLabel,
  channelLabel,
  policyReasonLabel,
  formatDateTime,
  formatMoney,
  formatHours,
  canDecide,
  onApprove,
  onReject,
}: Readonly<{
  request: AdminCancellationRequestSummary;
  copy: ReturnType<typeof useLocale>["messages"]["admin"]["reservationsPage"]["cancellation"];
  statusLabel: string;
  channelLabel: string;
  policyReasonLabel: string;
  formatDateTime: (value: string | null) => string;
  formatMoney: (value: string, currency: string) => string;
  formatHours: (value: string) => string;
  canDecide: boolean;
  onApprove: () => void;
  onReject: () => void;
}>) {
  const requesterContact =
    request.requesterEmail ?? request.requesterPhone ?? copy.labels.unavailable;
  const createdBy = request.createdByAdmin.name
    ? `${request.createdByAdmin.name} · ${request.createdByAdmin.email}`
    : request.createdByAdmin.email;
  const reviewedBy = request.reviewedByAdmin
    ? request.reviewedByAdmin.name
      ? `${request.reviewedByAdmin.name} · ${request.reviewedByAdmin.email}`
      : request.reviewedByAdmin.email
    : copy.labels.unavailable;

  return (
    <div className="rounded-2xl border border-border bg-muted/20 p-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-xs uppercase tracking-wide text-muted-foreground">
            {copy.labels.request}
          </p>
          <p className="mt-1 break-all text-sm font-semibold">{request.id}</p>
        </div>
        <Badge variant="outline">{statusLabel}</Badge>
      </div>

      <div className="mt-4 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <DetailValue label={copy.labels.channel} value={channelLabel} />
        <DetailValue
          label={copy.labels.requestedAt}
          value={formatDateTime(request.requestedAt)}
        />
        <DetailValue label={copy.labels.requesterName} value={request.requesterName} />
        <DetailValue label={copy.labels.requesterContact} value={requesterContact} />
        <DetailValue label={copy.labels.createdBy} value={createdBy} />
        <DetailValue label={copy.labels.policyOutcome} value={policyReasonLabel} />
        <DetailValue
          label={copy.labels.hoursBeforeCheckIn}
          value={formatHours(request.policy.hoursBeforeCheckIn)}
        />
        <DetailValue
          label={copy.labels.standardRefund}
          value={formatMoney(
            request.policy.refundAmount,
            request.policy.currency,
          )}
        />
        <DetailValue
          label={copy.labels.policyCalculatedAt}
          value={formatDateTime(request.policy.calculatedAt)}
        />
        <DetailValue
          label={copy.labels.checkInAt}
          value={formatDateTime(request.policy.checkInAt)}
        />
        <DetailValue label={copy.labels.reviewedBy} value={reviewedBy} />
        <DetailValue
          label={copy.labels.decidedAt}
          value={formatDateTime(request.decidedAt)}
        />
      </div>

      {request.requestNote ? (
        <div className="mt-4 rounded-xl border border-border/70 bg-background/60 p-4">
          <DetailValue label={copy.labels.requestReason} value={request.requestNote} />
        </div>
      ) : null}

      {request.decisionNote ? (
        <div className="mt-4 rounded-xl border border-border/70 bg-background/60 p-4">
          <DetailValue label={copy.labels.decisionNote} value={request.decisionNote} />
        </div>
      ) : null}

      <p className="mt-4 text-sm leading-6 text-muted-foreground">
        {copy.notes.refundSeparate}
      </p>

      {canDecide ? (
        <div className="mt-4 flex flex-wrap justify-end gap-3 border-t border-border/70 pt-4">
          <Button onClick={onReject} type="button" variant="outline">
            <XCircle aria-hidden="true" />
            {copy.actions.reject}
          </Button>
          <Button onClick={onApprove} type="button" variant="destructive">
            <CheckCircle2 aria-hidden="true" />
            {copy.actions.approve}
          </Button>
        </div>
      ) : null}
    </div>
  );
}

function FormField({
  label,
  children,
}: Readonly<{
  label: string;
  children: ReactNode;
}>) {
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
}: Readonly<{
  label: string;
  value: string;
}>) {
  return (
    <div className="min-w-0">
      <p className="text-xs uppercase tracking-wide text-muted-foreground">
        {label}
      </p>
      <p className="mt-1 break-words text-sm font-medium">{value}</p>
    </div>
  );
}
