import type { ReactNode } from "react";

import { Badge } from "@/components/ui/badge";

import { AdminContextualHelp } from "./admin-contextual-help";

export function AdminPageHeader({
  badge,
  title,
  description,
  actions,
}: Readonly<{
  badge?: string;
  title: string;
  description: string;
  actions?: ReactNode;
}>) {
  return (
    <header className="mb-8 flex flex-col justify-between gap-5 border-b border-border pb-6 md:flex-row md:items-end">
      <div className="max-w-3xl">
        {badge ? (
          <Badge className="mb-4 rounded-full" variant="secondary">
            {badge}
          </Badge>
        ) : null}
        <div className="flex flex-wrap items-start gap-2">
          <h1 className="min-w-0 text-balance text-3xl font-semibold tracking-tight sm:text-4xl">
            {title}
          </h1>
          <AdminContextualHelp align="start" content={description} side="bottom" />
        </div>
      </div>
      {actions ? <div className="shrink-0">{actions}</div> : null}
    </header>
  );
}
