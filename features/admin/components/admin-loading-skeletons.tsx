import { Card, CardContent, CardHeader } from "@/components/ui/card";
import type { ReactNode } from "react";
import {
  ADMIN_CALENDAR_SKELETON_CELL_COUNT,
  ADMIN_CALENDAR_SKELETON_WEEKDAY_COUNT,
} from "@/features/admin/lib/admin-calendar-navigation";
import { cn } from "@/lib/utils";

function SkeletonLine({
  className,
}: Readonly<{
  className?: string;
}>) {
  return (
    <div
      aria-hidden="true"
      className={cn("rounded-full bg-muted", className)}
    />
  );
}

function AdminSkeletonStatus({
  label,
}: Readonly<{
  label: string;
}>) {
  return <p className="sr-only">{label}</p>;
}

function AdminSkeletonRoot({
  children,
  className,
  label,
}: Readonly<{
  children: ReactNode;
  className?: string;
  label: string;
}>) {
  return (
    <div
      aria-busy="true"
      className={cn(
        "animate-pulse space-y-6 motion-reduce:animate-none",
        className,
      )}
      role="status"
    >
      <AdminSkeletonStatus label={label} />
      {children}
    </div>
  );
}

function AdminSkeletonHeader() {
  return (
    <div className="border-b border-border pb-6">
      <SkeletonLine className="h-9 w-64 max-w-full sm:h-10" />
      <SkeletonLine className="mt-3 h-4 w-full max-w-2xl" />
    </div>
  );
}

function AdminSkeletonTabs({ count = 2 }: Readonly<{ count?: number }>) {
  return (
    <div className="-mx-1 overflow-hidden px-1 pb-2">
      <div className="inline-flex min-w-max gap-1 rounded-2xl border border-border/70 bg-muted/40 p-1.5">
        {Array.from({ length: count }, (_, index) => (
          <SkeletonLine className="h-10 w-28 rounded-xl" key={index} />
        ))}
      </div>
    </div>
  );
}

function AdminSkeletonFilters({ columns = 4 }: Readonly<{ columns?: number }>) {
  return (
    <Card className="border-border/70 bg-card shadow-sm">
      <CardContent className="grid gap-3 py-5 lg:grid-cols-4">
        {Array.from({ length: columns }, (_, index) => (
          <SkeletonLine
            className={cn("h-11 rounded-2xl", index === 0 && "lg:col-span-2")}
            key={index}
          />
        ))}
      </CardContent>
    </Card>
  );
}

function AdminSkeletonRows({ rows = 5 }: Readonly<{ rows?: number }>) {
  return (
    <div className="grid gap-3">
      {Array.from({ length: rows }, (_, index) => (
        <Card className="border-border/70 bg-card shadow-sm" key={index}>
          <CardContent className="grid gap-3 p-4 sm:grid-cols-[minmax(0,1.25fr)_minmax(0,0.8fr)_auto] sm:items-center sm:p-5">
            <div className="space-y-2">
              <SkeletonLine className="h-5 w-48 max-w-full" />
              <SkeletonLine className="h-4 w-36 max-w-full" />
            </div>
            <div className="space-y-2">
              <SkeletonLine className="h-5 w-32 max-w-full" />
              <SkeletonLine className="h-4 w-40 max-w-full" />
            </div>
            <SkeletonLine className="h-8 w-24 rounded-xl" />
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

function AdminSkeletonCards({
  count = 6,
  className,
}: Readonly<{
  count?: number;
  className?: string;
}>) {
  return (
    <div className={cn("grid gap-5 md:grid-cols-2 xl:grid-cols-3", className)}>
      {Array.from({ length: count }, (_, index) => (
        <Card className="border-border/70 bg-card shadow-sm" key={index}>
          <CardHeader className="space-y-3">
            <SkeletonLine className="size-10 rounded-2xl" />
            <SkeletonLine className="h-5 w-44 max-w-full" />
            <SkeletonLine className="h-4 w-32 max-w-full" />
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <SkeletonLine className="h-12 rounded-2xl" />
              <SkeletonLine className="h-12 rounded-2xl" />
              <SkeletonLine className="h-12 rounded-2xl" />
              <SkeletonLine className="h-12 rounded-2xl" />
            </div>
            <div className="grid gap-2">
              <SkeletonLine className="h-10 rounded-2xl" />
              <SkeletonLine className="h-10 rounded-2xl" />
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

export function AdminPaymentsPageSkeleton({
  includeHeader = true,
  label,
}: Readonly<{
  includeHeader?: boolean;
  label: string;
}>) {
  return (
    <AdminSkeletonRoot label={label}>
      {includeHeader ? <AdminSkeletonHeader /> : null}
      {includeHeader ? <AdminSkeletonTabs count={2} /> : null}
      <AdminSkeletonFilters columns={4} />
      <div className="flex items-center justify-between gap-3">
        <SkeletonLine className="h-4 w-28" />
        <SkeletonLine className="h-4 w-24" />
      </div>
      <AdminSkeletonRows rows={5} />
      <div className="flex items-center justify-between gap-3">
        <SkeletonLine className="h-10 w-28 rounded-2xl" />
        <SkeletonLine className="h-10 w-28 rounded-2xl" />
      </div>
    </AdminSkeletonRoot>
  );
}

export function AdminCatalogPageSkeleton({
  includeHeader = true,
  label,
}: Readonly<{
  includeHeader?: boolean;
  label: string;
}>) {
  return (
    <AdminSkeletonRoot label={label}>
      {includeHeader ? <AdminSkeletonHeader /> : null}
      {includeHeader ? <AdminSkeletonTabs count={2} /> : null}
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="space-y-3">
          <SkeletonLine className="h-8 w-56 max-w-full" />
          <SkeletonLine className="h-4 w-80 max-w-full" />
        </div>
        <SkeletonLine className="h-10 w-40 rounded-2xl" />
      </div>
      <AdminSkeletonCards count={4} className="xl:grid-cols-2" />
    </AdminSkeletonRoot>
  );
}

export function AdminCalendarRouteSkeleton({
  includeHeader = true,
  label,
}: Readonly<{
  includeHeader?: boolean;
  label: string;
}>) {
  return (
    <AdminSkeletonRoot label={label}>
      {includeHeader ? <AdminSkeletonHeader /> : null}
      <AdminSkeletonTabs count={3} />
      <Card className="overflow-hidden border-border/70 bg-card shadow-sm">
        <CardHeader className="space-y-4 border-b border-border">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="space-y-2">
              <SkeletonLine className="h-6 w-40" />
              <SkeletonLine className="h-4 w-52" />
            </div>
            <div className="flex gap-2">
              <SkeletonLine className="size-10 rounded-2xl" />
              <SkeletonLine className="h-10 w-20 rounded-2xl" />
              <SkeletonLine className="size-10 rounded-2xl" />
            </div>
          </div>
          <SkeletonLine className="h-11 w-full max-w-xl rounded-2xl" />
        </CardHeader>
        <CardContent className="p-0">
          <div className="grid grid-cols-7 border-b border-border bg-muted/20">
            {Array.from(
              { length: ADMIN_CALENDAR_SKELETON_WEEKDAY_COUNT },
              (_, index) => (
                <div className="px-1 py-3" key={index}>
                  <SkeletonLine className="mx-auto h-3 w-8" />
                </div>
              ),
            )}
          </div>
          <div className="grid grid-cols-7">
            {Array.from(
              { length: ADMIN_CALENDAR_SKELETON_CELL_COUNT },
              (_, index) => (
                <div
                  className="min-h-28 border-b border-r border-border bg-background p-2 sm:min-h-32"
                  key={index}
                >
                  <SkeletonLine className="size-7" />
                  <div className="mt-3 grid gap-2">
                    <SkeletonLine className="h-3" />
                    <SkeletonLine className="h-3 w-2/3" />
                  </div>
                </div>
              ),
            )}
          </div>
        </CardContent>
      </Card>
    </AdminSkeletonRoot>
  );
}

export function AdminCalendarIntegrationsSkeleton({
  label,
}: Readonly<{
  label: string;
}>) {
  return (
    <AdminSkeletonRoot label={label}>
      <AdminSkeletonHeader />
      <AdminSkeletonTabs count={3} />
      <Card className="border-border/70 bg-card shadow-sm">
        <CardHeader>
          <div className="flex items-center justify-between gap-3">
            <SkeletonLine className="h-6 w-56" />
            <SkeletonLine className="h-7 w-20 rounded-xl" />
          </div>
        </CardHeader>
        <CardContent className="grid gap-6 lg:grid-cols-2">
          {Array.from({ length: 2 }, (_, index) => (
            <div
              className="space-y-4 rounded-2xl border border-border/70 p-5"
              key={index}
            >
              <SkeletonLine className="size-10 rounded-2xl" />
              <SkeletonLine className="h-5 w-48" />
              <SkeletonLine className="h-11 rounded-2xl" />
              <SkeletonLine className="h-28 rounded-2xl" />
              <div className="flex flex-wrap gap-2">
                <SkeletonLine className="h-10 w-28 rounded-2xl" />
                <SkeletonLine className="h-10 w-32 rounded-2xl" />
              </div>
            </div>
          ))}
        </CardContent>
      </Card>
    </AdminSkeletonRoot>
  );
}

export function AdminAccommodationListSkeleton({
  label,
}: Readonly<{
  label: string;
}>) {
  return (
    <AdminSkeletonRoot label={label}>
      <AdminSkeletonHeader />
      <AdminSkeletonTabs count={2} />
      <AdminSkeletonCards count={3} />
    </AdminSkeletonRoot>
  );
}

export function AdminAccommodationEditorSkeleton({
  label,
  variant = "content",
}: Readonly<{
  label: string;
  variant?: "content" | "pricing" | "photos" | "amenities" | "arrival";
}>) {
  const tabCount = variant === "pricing" ? 4 : 0;
  const cardCount = variant === "photos" ? 4 : 3;

  return (
    <AdminSkeletonRoot label={label}>
      <AdminSkeletonHeader />
      {tabCount > 0 ? <AdminSkeletonTabs count={tabCount} /> : null}
      <div
        className={cn(
          "grid gap-6",
          variant === "arrival"
            ? "xl:grid-cols-[minmax(0,1.2fr)_minmax(20rem,0.8fr)]"
            : "xl:grid-cols-2",
        )}
      >
        {Array.from({ length: cardCount }, (_, index) => (
          <Card className="border-border/70 bg-card shadow-sm" key={index}>
            <CardHeader className="space-y-3">
              <SkeletonLine className="h-6 w-52 max-w-full" />
              <SkeletonLine className="h-4 w-64 max-w-full" />
            </CardHeader>
            <CardContent className="space-y-4">
              <SkeletonLine className="h-11 rounded-2xl" />
              <SkeletonLine className="h-24 rounded-2xl" />
              {variant === "photos" ? (
                <SkeletonLine className="aspect-[4/3] h-auto rounded-2xl" />
              ) : null}
              <div className="flex flex-wrap gap-2">
                <SkeletonLine className="h-10 w-28 rounded-2xl" />
                <SkeletonLine className="h-10 w-32 rounded-2xl" />
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </AdminSkeletonRoot>
  );
}

export function AdminGenericPageSkeleton({
  label,
}: Readonly<{
  label: string;
}>) {
  return (
    <AdminSkeletonRoot label={label}>
      <AdminSkeletonHeader />
      <AdminSkeletonCards count={6} />
    </AdminSkeletonRoot>
  );
}
