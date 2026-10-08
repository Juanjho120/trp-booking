"use client";

import type { ComponentProps, FocusEvent, ReactNode } from "react";
import { useEffect, useId, useRef, useState } from "react";
import { CircleHelp } from "lucide-react";
import { Popover as PopoverPrimitive } from "radix-ui";

import { Button } from "@/components/ui/button";
import { useLocale } from "@/features/i18n";
import { cn } from "@/lib/utils";

type AdminContextualHelpProps = Readonly<{
  content: ReactNode;
  ariaLabel?: string;
  side?: ComponentProps<typeof PopoverPrimitive.Content>["side"];
  align?: ComponentProps<typeof PopoverPrimitive.Content>["align"];
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
  const contentId = useId();
  const [open, setOpen] = useState(false);
  const [pinnedOpen, setPinnedOpen] = useState(false);
  const closeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pinnedOpenRef = useRef(false);

  function clearCloseTimer(): void {
    if (closeTimerRef.current) {
      clearTimeout(closeTimerRef.current);
      closeTimerRef.current = null;
    }
  }

  function setPinned(nextPinnedOpen: boolean): void {
    pinnedOpenRef.current = nextPinnedOpen;
    setPinnedOpen(nextPinnedOpen);
  }

  function showHelp(): void {
    clearCloseTimer();
    setOpen(true);
  }

  function scheduleClose(): void {
    clearCloseTimer();
    if (pinnedOpen) {
      return;
    }
    closeTimerRef.current = setTimeout(() => {
      if (!pinnedOpenRef.current) {
        setOpen(false);
      }
    }, 120);
  }

  function handleActivation(): void {
    clearCloseTimer();
    if (pinnedOpen) {
      setPinned(false);
      setOpen(false);
      return;
    }
    setPinned(true);
    setOpen(true);
  }

  function handleFocus(event: FocusEvent<HTMLButtonElement>): void {
    if (event.currentTarget.matches(":focus-visible")) {
      showHelp();
    }
  }

  function handleOpenChange(nextOpen: boolean): void {
    clearCloseTimer();
    setOpen(nextOpen);
    if (!nextOpen) {
      setPinned(false);
    }
  }

  useEffect(() => {
    return () => {
      if (closeTimerRef.current) {
        clearTimeout(closeTimerRef.current);
      }
    };
  }, []);

  if (!content) {
    return null;
  }

  return (
    <PopoverPrimitive.Root onOpenChange={handleOpenChange} open={open}>
      <PopoverPrimitive.Anchor asChild>
        <Button
          aria-controls={contentId}
          aria-expanded={open}
          aria-haspopup="dialog"
          aria-label={label}
          className={cn(
            "size-10 rounded-full text-muted-foreground sm:size-7",
            className,
          )}
          onBlur={scheduleClose}
          onClick={handleActivation}
          onFocus={handleFocus}
          onMouseEnter={showHelp}
          onMouseLeave={scheduleClose}
          size="icon-xs"
          type="button"
          variant="ghost"
        >
          <CircleHelp aria-hidden="true" className="size-4" />
        </Button>
      </PopoverPrimitive.Anchor>
      <PopoverPrimitive.Portal>
        <PopoverPrimitive.Content
          align={align}
          className="z-50 max-w-[min(24rem,calc(100vw-2rem))] rounded-xl border border-border bg-popover px-3 py-2 text-sm leading-6 text-popover-foreground shadow-md outline-none data-[state=closed]:animate-out data-[state=open]:animate-in data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0"
          id={contentId}
          onCloseAutoFocus={(event) => {
            event.preventDefault();
          }}
          onMouseEnter={clearCloseTimer}
          onMouseLeave={scheduleClose}
          onOpenAutoFocus={(event) => {
            event.preventDefault();
          }}
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
