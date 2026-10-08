"use client";

import type { ReactNode } from "react";
import { useRef, useState } from "react";
import { CircleHelp } from "lucide-react";
import { Popover as PopoverPrimitive } from "radix-ui";

import { Button } from "@/components/ui/button";
import { useLocale } from "@/features/i18n";
import { cn } from "@/lib/utils";

type AdminContextualHelpProps = Readonly<{
  content: ReactNode;
  ariaLabel?: string;
  side?: React.ComponentProps<typeof PopoverPrimitive.Content>["side"];
  align?: React.ComponentProps<typeof PopoverPrimitive.Content>["align"];
  className?: string;
}>;

export function AdminContextualHelp({
  align = "start",
  ariaLabel,
  className,
  content,
  side = "top",
}: AdminContextualHelpProps) {
  const { messages } = useLocale();
  const label = ariaLabel ?? messages.admin.feedback.help;
  const [open, setOpen] = useState(false);
  const closeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  if (!content) {
    return null;
  }

  function clearCloseTimer(): void {
    if (closeTimerRef.current) {
      clearTimeout(closeTimerRef.current);
      closeTimerRef.current = null;
    }
  }

  function showHelp(): void {
    clearCloseTimer();
    setOpen(true);
  }

  function scheduleClose(): void {
    clearCloseTimer();
    closeTimerRef.current = setTimeout(() => setOpen(false), 120);
  }

  return (
    <PopoverPrimitive.Root onOpenChange={setOpen} open={open}>
      <PopoverPrimitive.Trigger asChild>
        <Button
          aria-label={label}
          className={cn("size-7 rounded-full text-muted-foreground", className)}
          onBlur={scheduleClose}
          onFocus={showHelp}
          onMouseEnter={showHelp}
          onMouseLeave={scheduleClose}
          size="icon-xs"
          type="button"
          variant="ghost"
        >
          <CircleHelp aria-hidden="true" className="size-4" />
        </Button>
      </PopoverPrimitive.Trigger>
      <PopoverPrimitive.Portal>
        <PopoverPrimitive.Content
          align={align}
          className="z-50 max-w-sm rounded-xl border border-border bg-popover px-3 py-2 text-sm leading-6 text-popover-foreground shadow-md outline-none data-[state=closed]:animate-out data-[state=open]:animate-in data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0"
          onMouseEnter={clearCloseTimer}
          onMouseLeave={scheduleClose}
          side={side}
          sideOffset={8}
        >
          {content}
          <PopoverPrimitive.Arrow className="fill-popover" />
        </PopoverPrimitive.Content>
      </PopoverPrimitive.Portal>
    </PopoverPrimitive.Root>
  );
}
