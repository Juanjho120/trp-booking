"use client";

import Link from "next/link";
import type { ComponentProps, ReactNode } from "react";

import {
  tabsListClassName,
  tabsTriggerActiveClassName,
  tabsTriggerBaseClassName,
} from "@/components/ui/tabs";
import { cn } from "@/lib/utils";

type AdminLinkTabListProps = Readonly<{
  "aria-label": string;
  children: ReactNode;
  className?: string;
  listClassName?: string;
}>;

type AdminLinkTabProps = Readonly<
  {
    active: boolean;
    children: ReactNode;
    className?: string;
  } & Pick<ComponentProps<typeof Link>, "href">
>;

function AdminLinkTabList({
  "aria-label": ariaLabel,
  children,
  className,
  listClassName,
}: AdminLinkTabListProps) {
  return (
    <nav
      aria-label={ariaLabel}
      className={cn("-mx-1 overflow-x-auto px-1 pb-2", className)}
    >
      <div
        className={cn(
          tabsListClassName,
          "h-auto w-max max-w-full justify-start gap-1 border border-border/70 bg-muted/40 p-1.5",
          listClassName,
        )}
      >
        {children}
      </div>
    </nav>
  );
}

function AdminLinkTab({
  active,
  children,
  className,
  href,
}: AdminLinkTabProps) {
  return (
    <Link
      aria-current={active ? "page" : undefined}
      className={cn(
        tabsTriggerBaseClassName,
        "min-h-10 shrink-0 text-muted-foreground",
        active && tabsTriggerActiveClassName,
        className,
      )}
      href={href}
    >
      {children}
    </Link>
  );
}

export { AdminLinkTab, AdminLinkTabList };
