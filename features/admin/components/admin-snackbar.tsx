"use client";

import { useEffect, useRef } from "react";
import { AlertCircle, CheckCircle2, X } from "lucide-react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const AUTO_DISMISS_MS = 4_000;

export type AdminSnackbarVariant = "success" | "error";

type AdminSnackbarProps = Readonly<{
  closeLabel: string;
  message: string | null;
  onDismiss: () => void;
  variant?: AdminSnackbarVariant;
}>;

export function AdminSnackbar({
  closeLabel,
  message,
  onDismiss,
  variant = "success",
}: AdminSnackbarProps) {
  const onDismissRef = useRef(onDismiss);
  const isError = variant === "error";
  const StatusIcon = isError ? AlertCircle : CheckCircle2;

  useEffect(() => {
    onDismissRef.current = onDismiss;
  }, [onDismiss]);

  useEffect(() => {
    if (!message) {
      return;
    }

    const timeoutId = window.setTimeout(
      () => onDismissRef.current(),
      AUTO_DISMISS_MS,
    );

    return () => window.clearTimeout(timeoutId);
  }, [message]);

  if (!message) {
    return null;
  }

  return (
    <div
      aria-atomic="true"
      aria-live={isError ? "assertive" : "polite"}
      className={cn(
        "fixed bottom-5 right-5 z-[70] flex w-[min(92vw,24rem)] items-start gap-3 rounded-2xl border bg-background p-4 text-sm text-foreground shadow-xl",
        isError ? "border-destructive/40" : "border-primary/30",
      )}
      role={isError ? "alert" : "status"}
    >
      <StatusIcon
        aria-hidden="true"
        className={cn(
          "mt-0.5 size-5 shrink-0",
          isError ? "text-destructive" : "text-primary",
        )}
      />

      <p className="min-w-0 flex-1 leading-6">{message}</p>

      <Button
        aria-label={closeLabel}
        className="-mr-1 -mt-1 shrink-0"
        onClick={onDismiss}
        size="icon-sm"
        type="button"
        variant="ghost"
      >
        <X aria-hidden="true" />
      </Button>
    </div>
  );
}