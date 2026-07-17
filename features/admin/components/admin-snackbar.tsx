"use client";

import { useEffect, useRef } from "react";
import { CheckCircle2, X } from "lucide-react";

import { Button } from "@/components/ui/button";

const AUTO_DISMISS_MS = 4_000;

type AdminSnackbarProps = Readonly<{
  closeLabel: string;
  message: string | null;
  onDismiss: () => void;
}>;

export function AdminSnackbar({
  closeLabel,
  message,
  onDismiss,
}: AdminSnackbarProps) {
  const onDismissRef = useRef(onDismiss);

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
      className="fixed bottom-5 right-5 z-[70] flex w-[min(92vw,24rem)] items-start gap-3 rounded-2xl border border-primary/30 bg-background p-4 text-sm text-foreground shadow-xl"
      role="status"
    >
      <CheckCircle2 aria-hidden="true" className="mt-0.5 size-5 shrink-0 text-primary" />
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
