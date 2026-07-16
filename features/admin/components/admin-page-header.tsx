import type { ReactNode } from "react";

import { Badge } from "@/components/ui/badge";

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
        <h1 className="text-balance text-3xl font-semibold tracking-tight sm:text-4xl">
          {title}
        </h1>
        <p className="mt-3 text-sm leading-6 text-muted-foreground sm:text-base">
          {description}
        </p>
      </div>
      {actions ? <div className="shrink-0">{actions}</div> : null}
    </header>
  );
}
