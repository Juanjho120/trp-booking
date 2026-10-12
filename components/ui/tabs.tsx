"use client";

import * as React from "react";
import { Tabs as TabsPrimitive } from "radix-ui";

import { cn } from "@/lib/utils";

const tabsListClassName =
  "inline-flex items-center justify-center rounded-2xl bg-muted p-1 text-muted-foreground";
const tabsTriggerBaseClassName =
  "inline-flex items-center justify-center whitespace-nowrap rounded-xl border border-transparent px-3 py-2 text-sm font-medium outline-none transition focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50 disabled:pointer-events-none disabled:opacity-50";
const tabsTriggerInactiveClassName =
  "text-muted-foreground hover:bg-background/80 hover:text-foreground";
const tabsTriggerInactiveDataClassName =
  "data-[state=inactive]:text-muted-foreground data-[state=inactive]:hover:bg-background/80 data-[state=inactive]:hover:text-foreground";
const tabsTriggerActiveClassName =
  "border-primary bg-primary text-primary-foreground shadow-md";
const tabsTriggerActiveDataClassName =
  "data-[state=active]:border-primary data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-md";
const tabsTriggerSubtleActiveDataClassName =
  "data-[state=active]:border-border/70 data-[state=active]:bg-background data-[state=active]:text-foreground data-[state=active]:shadow-sm";

type TabsTriggerVariant = "primary" | "subtle";

function Tabs({
  className,
  ...props
}: React.ComponentProps<typeof TabsPrimitive.Root>) {
  return (
    <TabsPrimitive.Root
      className={cn("min-w-0", className)}
      data-slot="tabs"
      {...props}
    />
  );
}

function TabsList({
  className,
  ...props
}: React.ComponentProps<typeof TabsPrimitive.List>) {
  return (
    <TabsPrimitive.List
      className={cn(tabsListClassName, className)}
      data-slot="tabs-list"
      {...props}
    />
  );
}

function TabsTrigger({
  className,
  variant = "primary",
  ...props
}: React.ComponentProps<typeof TabsPrimitive.Trigger> & {
  variant?: TabsTriggerVariant;
}) {
  return (
    <TabsPrimitive.Trigger
      className={cn(
        tabsTriggerBaseClassName,
        tabsTriggerInactiveDataClassName,
        variant === "primary"
          ? tabsTriggerActiveDataClassName
          : tabsTriggerSubtleActiveDataClassName,
        className,
      )}
      data-slot="tabs-trigger"
      {...props}
    />
  );
}

function TabsContent({
  className,
  ...props
}: React.ComponentProps<typeof TabsPrimitive.Content>) {
  return (
    <TabsPrimitive.Content
      className={cn(
        "min-w-0 outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50",
        className,
      )}
      data-slot="tabs-content"
      {...props}
    />
  );
}

export {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
  tabsListClassName,
  tabsTriggerActiveClassName,
  tabsTriggerBaseClassName,
  tabsTriggerInactiveClassName,
};
