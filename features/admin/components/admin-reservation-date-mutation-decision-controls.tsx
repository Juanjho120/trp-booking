"use client";

import {
  Check,
  Clock3,
  Copy,
  ExternalLink,
  Loader2,
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

function formatRemaining(expiresAt: string): string {
  const remaining = new Date(expiresAt).getTime() - Date.now();

  if (remaining <= 0) {
    return "00:00";
  }

  const seconds = Math.floor(remaining / 1_000);
  return `${String(Math.floor(seconds / 60)).padStart(2, "0")}:${String(
    seconds % 60,
  ).padStart(2, "0")}`;
}

function HoldCountdown({ expiresAt }: Readonly<{ expiresAt: string }>) {
  const [remaining, setRemaining] = useState(() => formatRemaining(expiresAt));

  useEffect(() => {
    const interval = window.setInterval(
      () => setRemaining(formatRemaining(expiresAt)),
      1_000,
    );
    return () => window.clearInterval(interval);
  }, [expiresAt]);

  return <span className="font-mono font-semibold">{remaining}</span>;
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
            <HoldCountdown expiresAt={request.hold!.expiresAt} />
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
    </>
  );
}
