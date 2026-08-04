"use client";

import {
  Check,
  Clock3,
  Copy,
  ExternalLink,
  Loader2,
  Mail,
  TriangleAlert,
  X,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { type ChangeEvent, useEffect, useState } from "react";

import { Button } from "@/components/ui/button";
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
  AdminDateMutationPaymentLinkEmailErrorCode,
  AdminDateMutationPaymentLinkEmailSendResult,
  AdminDateMutationPaymentLinkEmailState,
} from "@/types/admin-date-mutation-payment-link-email";
import type {
  AdminDateMutationDecision,
  AdminDateMutationDecisionResult,
  AdminDateMutationErrorCode,
  AdminDateMutationRequestSummary,
} from "@/types/admin-reservation-date-mutation";

import { AdminSnackbar } from "./admin-snackbar";

const textareaClassName =
  "min-h-28 w-full resize-y rounded-2xl border border-input bg-background px-3 py-3 text-sm leading-6 text-foreground shadow-xs outline-none transition focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50 disabled:cursor-not-allowed disabled:opacity-50";

type DecisionApiResponse = Readonly<{
  decisionResult?: AdminDateMutationDecisionResult;
  error?: Readonly<{ code?: AdminDateMutationErrorCode }>;
}>;

type PaymentEmailApiResponse = Readonly<{
  state?: AdminDateMutationPaymentLinkEmailState;
  result?: AdminDateMutationPaymentLinkEmailSendResult;
  error?: Readonly<{ code?: AdminDateMutationPaymentLinkEmailErrorCode }>;
}>;

function formatRemaining(expiresAt: string, now: number): string {
  const remaining = new Date(expiresAt).getTime() - now;

  if (remaining <= 0) {
    return "00:00";
  }

  const seconds = Math.floor(remaining / 1_000);
  return `${String(Math.floor(seconds / 60)).padStart(2, "0")}:${String(
    seconds % 60,
  ).padStart(2, "0")}`;
}

function HoldCountdown({
  expiresAt,
  now,
}: Readonly<{ expiresAt: string; now: number }>) {
  return (
    <span className="font-mono font-semibold">
      {formatRemaining(expiresAt, now)}
    </span>
  );
}

export function AdminReservationDateMutationDecisionControls({
  request,
}: Readonly<{
  request: AdminDateMutationRequestSummary;
}>) {
  const router = useRouter();
  const { messages } = useLocale();
  const copy = messages.admin.reservationsPage.dateMutation;
  const [open, setOpen] = useState(false);
  const [decision, setDecision] =
    useState<AdminDateMutationDecision>("APPROVE");
  const [decisionNote, setDecisionNote] = useState("");
  const [busy, setBusy] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [feedbackError, setFeedbackError] = useState(false);
  const [paymentEmailOpen, setPaymentEmailOpen] = useState(false);
  const [paymentEmailBusy, setPaymentEmailBusy] = useState(false);
  const [paymentEmailState, setPaymentEmailState] =
    useState<AdminDateMutationPaymentLinkEmailState | null>(null);
  const [paymentEmailRequestId, setPaymentEmailRequestId] = useState<
    string | null
  >(null);
  const [currentTime, setCurrentTime] = useState(() => Date.now());

  useEffect(() => {
    if (
      request.status !== "AWAITING_ADJUSTMENT_PAYMENT" ||
      !request.hold?.expiresAt
    ) {
      return;
    }

    const interval = window.setInterval(
      () => setCurrentTime(Date.now()),
      1_000,
    );
    return () => window.clearInterval(interval);
  }, [request.hold?.expiresAt, request.status]);

  function openDecision(nextDecision: AdminDateMutationDecision): void {
    setDecision(nextDecision);
    setDecisionNote("");
    setFeedback(null);
    setFeedbackError(false);
    setOpen(true);
  }

  async function submitDecision(): Promise<void> {
    if (busy || !decisionNote.trim()) {
      setFeedback(copy.errors.INVALID_ADMIN_DATE_MUTATION_REQUEST);
      setFeedbackError(true);
      return;
    }

    setBusy(true);
    setFeedback(null);
    setFeedbackError(false);

    try {
      const response = await fetch(
        `/api/admin/reservations/${encodeURIComponent(
          request.reservationId,
        )}/date-mutation-requests/${encodeURIComponent(
          request.id,
        )}/decision`,
        {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({
            decision,
            decisionNote,
            expectedRequestVersion: request.version,
            expectedReservationUpdatedAt:
              request.expectedReservationUpdatedAt,
          }),
        },
      );
      const payload = (await response.json()) as DecisionApiResponse;

      if (!response.ok || !payload.decisionResult) {
        const code = payload.error?.code;
        setFeedback(
          code
            ? (copy.errors[code] ??
                copy.errors.ADMIN_DATE_MUTATION_UNEXPECTED_ERROR)
            : copy.errors.ADMIN_DATE_MUTATION_UNEXPECTED_ERROR,
        );
        setFeedbackError(true);
        return;
      }

      setOpen(false);
      setFeedback(
        decision === "APPROVE"
          ? copy.success.requestApproved
          : copy.success.requestRejected,
      );
      router.refresh();
    } catch {
      setFeedback(copy.errors.ADMIN_DATE_MUTATION_UNEXPECTED_ERROR);
      setFeedbackError(true);
    } finally {
      setBusy(false);
    }
  }

  function paymentEmailEndpoint(): string {
    return `/api/admin/reservations/${encodeURIComponent(
      request.reservationId,
    )}/date-mutation-requests/${encodeURIComponent(
      request.id,
    )}/payment-link-email`;
  }

  async function openPaymentEmailDialog(): Promise<void> {
    if (paymentEmailBusy) return;
    setPaymentEmailBusy(true);
    setFeedback(null);
    setFeedbackError(false);
    try {
      const response = await fetch(paymentEmailEndpoint(), { method: "GET" });
      const payload = (await response.json()) as PaymentEmailApiResponse;
      if (!response.ok || !payload.state) {
        const code = payload.error?.code;
        setFeedback(
          code
            ? (copy.paymentEmail.errors[code] ??
                copy.paymentEmail.errors
                  .ADMIN_DATE_MUTATION_PAYMENT_EMAIL_UNEXPECTED_ERROR)
            : copy.paymentEmail.errors.ADMIN_DATE_MUTATION_PAYMENT_EMAIL_UNEXPECTED_ERROR,
        );
        setFeedbackError(true);
        return;
      }
      setPaymentEmailState(payload.state);
      setPaymentEmailRequestId(crypto.randomUUID());
      setPaymentEmailOpen(true);
    } catch {
      setFeedback(
        copy.paymentEmail.errors.ADMIN_DATE_MUTATION_PAYMENT_EMAIL_UNEXPECTED_ERROR,
      );
      setFeedbackError(true);
    } finally {
      setPaymentEmailBusy(false);
    }
  }

  async function sendPaymentLinkEmail(): Promise<void> {
    if (paymentEmailBusy || !paymentEmailRequestId) return;
    setPaymentEmailBusy(true);
    try {
      const response = await fetch(paymentEmailEndpoint(), {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ requestId: paymentEmailRequestId }),
      });
      const payload = (await response.json()) as PaymentEmailApiResponse;
      if (!response.ok || !payload.result) {
        const code = payload.error?.code;
        setFeedback(
          code
            ? (copy.paymentEmail.errors[code] ??
                copy.paymentEmail.errors
                  .ADMIN_DATE_MUTATION_PAYMENT_EMAIL_UNEXPECTED_ERROR)
            : copy.paymentEmail.errors.ADMIN_DATE_MUTATION_PAYMENT_EMAIL_UNEXPECTED_ERROR,
        );
        setFeedbackError(true);
        return;
      }
      const outcome = payload.result.outcome;
      setFeedback(
        outcome === "sent"
          ? copy.paymentEmail.success.sent
          : outcome === "queued"
            ? copy.paymentEmail.success.queued
            : outcome === "already-processed"
              ? copy.paymentEmail.success.alreadyProcessed
              : payload.result.retryScheduled
                ? copy.paymentEmail.success.failedRetryScheduled
                : copy.paymentEmail.success.failedTerminal,
      );
      setFeedbackError(outcome === "failed");
      setPaymentEmailOpen(false);
      setPaymentEmailState(payload.result.state);
      router.refresh();
    } catch {
      setFeedback(
        copy.paymentEmail.errors.ADMIN_DATE_MUTATION_PAYMENT_EMAIL_UNEXPECTED_ERROR,
      );
      setFeedbackError(true);
    } finally {
      setPaymentEmailBusy(false);
    }
  }

  async function copyPaymentLink(): Promise<void> {
    if (!request.paymentHandoffPath) {
      return;
    }

    try {
      await navigator.clipboard.writeText(
        `${window.location.origin}${request.paymentHandoffPath}`,
      );
      setFeedback(copy.success.paymentLinkCopied);
      setFeedbackError(false);
    } catch {
      setFeedback(copy.errors.ADMIN_DATE_MUTATION_UNEXPECTED_ERROR);
      setFeedbackError(true);
    }
  }

  const activeHold =
    request.status === "AWAITING_ADJUSTMENT_PAYMENT" &&
    request.hold?.status === "ACTIVE" &&
    new Date(request.hold.expiresAt).getTime() > currentTime &&
    request.paymentHandoffPath;

  return (
    <>
      <AdminSnackbar
        closeLabel={messages.admin.feedback.dismiss}
        message={feedback}
        onDismiss={() => setFeedback(null)}
        variant={feedbackError ? "error" : "success"}
      />

      {request.status === "PENDING_REVIEW" && !request.reviewExpired ? (
        <div className="mt-5 flex flex-wrap justify-end gap-2 border-t border-border/70 pt-4">
          <Button
            onClick={() => openDecision("REJECT")}
            type="button"
            variant="outline"
          >
            <X aria-hidden="true" />
            {copy.actions.reject}
          </Button>
          <Button onClick={() => openDecision("APPROVE")} type="button">
            <Check aria-hidden="true" />
            {copy.actions.approve}
          </Button>
        </div>
      ) : null}

      {activeHold ? (
        <div className="mt-5 grid gap-3 rounded-2xl border border-primary/20 bg-primary/5 p-4 text-sm">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <span className="flex items-center gap-2 font-medium">
              <Clock3 aria-hidden="true" className="size-4" />
              {copy.labels.holdRemaining}
            </span>
            <HoldCountdown
              expiresAt={request.hold!.expiresAt}
              now={currentTime}
            />
          </div>
          <div className="flex flex-wrap gap-2">
            <Button asChild size="sm" variant="outline">
              <a
                href={request.paymentHandoffPath!}
                rel="noreferrer"
                target="_blank"
              >
                <ExternalLink aria-hidden="true" />
                {copy.actions.openPaymentLink}
              </a>
            </Button>
            <Button onClick={copyPaymentLink} size="sm" type="button">
              <Copy aria-hidden="true" />
              {copy.actions.copyPaymentLink}
            </Button>
            <Button
              disabled={paymentEmailBusy}
              onClick={openPaymentEmailDialog}
              size="sm"
              type="button"
              variant="secondary"
            >
              {paymentEmailBusy ? (
                <Loader2 aria-hidden="true" className="animate-spin" />
              ) : (
                <Mail aria-hidden="true" />
              )}
              {paymentEmailBusy
                ? copy.actions.sendingPaymentLinkEmail
                : copy.actions.sendPaymentLinkEmail}
            </Button>
          </div>
          <p className="text-xs leading-5 text-muted-foreground">
            {copy.notes.paymentLink}
          </p>
        </div>
      ) : null}

      {request.decisionNote ? (
        <div className="mt-4 rounded-2xl border border-border/70 bg-background/60 p-4 text-sm">
          <p className="font-medium">{copy.labels.decisionNote}</p>
          <p className="mt-1 text-muted-foreground">{request.decisionNote}</p>
        </div>
      ) : null}

      <Sheet
        onOpenChange={(nextOpen: boolean) => {
          if (!nextOpen && !busy) {
            setOpen(false);
          }
        }}
        open={open}
      >
        <SheetContent closeLabel={messages.admin.feedback.dismiss}>
          <SheetHeader>
            <SheetTitle>
              {decision === "APPROVE"
                ? copy.decisionDialog.approveTitle
                : copy.decisionDialog.rejectTitle}
            </SheetTitle>
            <SheetDescription>
              {decision === "APPROVE"
                ? copy.decisionDialog.approveDescription
                : copy.decisionDialog.rejectDescription}
            </SheetDescription>
          </SheetHeader>
          <div className="grid gap-4 overflow-y-auto px-6 py-2">
            <label className="grid gap-2 text-sm font-medium">
              <span>{copy.labels.decisionNote}</span>
              <textarea
                className={textareaClassName}
                disabled={busy}
                maxLength={2_000}
                onChange={(event: ChangeEvent<HTMLTextAreaElement>) =>
                  setDecisionNote(event.target.value)
                }
                placeholder={copy.placeholders.decisionNote}
                value={decisionNote}
              />
            </label>
            {decision === "REJECT" ? (
              <div className="rounded-2xl border border-border bg-muted/20 p-4 text-sm leading-6 text-muted-foreground">
                {copy.decisionDialog.rejectionBoundary}
              </div>
            ) : null}
          </div>
          <SheetFooter>
            <Button
              disabled={busy}
              onClick={() => setOpen(false)}
              type="button"
              variant="outline"
            >
              {copy.actions.close}
            </Button>
            <Button disabled={busy} onClick={submitDecision} type="button">
              {busy ? <Loader2 aria-hidden="true" className="animate-spin" /> : null}
              {busy
                ? copy.actions.deciding
                : decision === "APPROVE"
                  ? copy.actions.confirmApprove
                  : copy.actions.confirmReject}
            </Button>
          </SheetFooter>
        </SheetContent>
      </Sheet>

      <Sheet
        onOpenChange={(nextOpen: boolean) => {
          if (!nextOpen && !paymentEmailBusy) setPaymentEmailOpen(false);
        }}
        open={paymentEmailOpen}
      >
        <SheetContent closeLabel={messages.admin.feedback.dismiss}>
          <SheetHeader>
            <SheetTitle>{copy.paymentEmail.dialog.title}</SheetTitle>
            <SheetDescription>
              {copy.paymentEmail.dialog.description}
            </SheetDescription>
          </SheetHeader>
          <div className="grid gap-4 overflow-y-auto px-6 py-2 text-sm leading-6">
            {paymentEmailState?.warning === "DUPLICATE_POSSIBLE" ? (
              <div className="flex gap-3 rounded-2xl border border-amber-500/40 bg-amber-500/10 p-4 text-amber-950 dark:text-amber-100">
                <TriangleAlert aria-hidden="true" className="mt-0.5 size-5 shrink-0" />
                <p>{copy.paymentEmail.dialog.duplicateWarning}</p>
              </div>
            ) : paymentEmailState?.warning === "DELIVERY_ACTIVE" ? (
              <div className="flex gap-3 rounded-2xl border border-amber-500/40 bg-amber-500/10 p-4 text-amber-950 dark:text-amber-100">
                <TriangleAlert aria-hidden="true" className="mt-0.5 size-5 shrink-0" />
                <p>{copy.paymentEmail.dialog.activeWarning}</p>
              </div>
            ) : paymentEmailState?.hasFailedDelivery ? (
              <div className="rounded-2xl border border-border bg-muted/20 p-4 text-muted-foreground">
                {copy.paymentEmail.dialog.failedDeliveryNote}
              </div>
            ) : null}
            <div className="rounded-2xl border border-border bg-muted/20 p-4 text-muted-foreground">
              {copy.paymentEmail.dialog.historyNote}
            </div>
          </div>
          <SheetFooter>
            <Button
              disabled={paymentEmailBusy}
              onClick={() => setPaymentEmailOpen(false)}
              type="button"
              variant="outline"
            >
              {copy.paymentEmail.dialog.cancel}
            </Button>
            <Button
              disabled={
                paymentEmailBusy ||
                paymentEmailState?.latestStatus === "PROCESSING"
              }
              onClick={sendPaymentLinkEmail}
              type="button"
            >
              {paymentEmailBusy ? (
                <Loader2 aria-hidden="true" className="animate-spin" />
              ) : (
                <Mail aria-hidden="true" />
              )}
              {paymentEmailBusy
                ? copy.actions.sendingPaymentLinkEmail
                : copy.paymentEmail.dialog.confirm}
            </Button>
          </SheetFooter>
        </SheetContent>
      </Sheet>
    </>
  );
}
