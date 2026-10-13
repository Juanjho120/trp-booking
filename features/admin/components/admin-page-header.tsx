import type { ReactNode } from "react";

import { Badge } from "@/components/ui/badge";

import { AdminContextualHelp } from "./admin-contextual-help";

const adminPageHeaderBaseClassName = "mb-8 border-b border-border pb-6";
const adminPageHeaderDefaultClassName =
  `${adminPageHeaderBaseClassName} flex flex-col justify-between gap-5 md:flex-row md:items-end`;
const adminPageHeaderInlineClassName =
  `${adminPageHeaderBaseClassName} space-y-4`;
const adminPageHeaderTitleHelpClassName =
  "flex min-w-0 flex-wrap items-start gap-2";
const adminPageHeaderInlineTitleHelpClassName =
  "flex min-w-0 max-w-full flex-1 basis-full items-start gap-2 sm:basis-0";
const adminPageHeaderTitleClassName =
  "min-w-0 text-balance text-3xl font-semibold tracking-tight sm:text-4xl";
const adminPageHeaderInlineTitleClassName =
  `${adminPageHeaderTitleClassName} flex-1`;
const adminPageHeaderInlineHelpClassName = "shrink-0";
const adminPageHeaderInlineRowClassName =
  "flex min-w-0 flex-wrap items-start justify-between gap-x-4 gap-y-4";
const adminPageHeaderInlineActionsClassName =
  "flex w-full min-w-0 flex-wrap items-center gap-2 sm:w-auto";

type AdminPageHeaderVariant = "default" | "inlineActions";

export function AdminPageHeader({
  badge,
  title,
  description,
  actions,
  variant = "default",
}: Readonly<{
  badge?: string;
  title: string;
  description: string;
  actions?: ReactNode;
  variant?: AdminPageHeaderVariant;
}>) {
  if (variant === "inlineActions") {
    return (
      <header className={adminPageHeaderInlineClassName}>
        {badge ? (
          <Badge className="rounded-full" variant="secondary">
            {badge}
          </Badge>
        ) : null}
        <div className={adminPageHeaderInlineRowClassName}>
          <div className={adminPageHeaderInlineTitleHelpClassName}>
            <h1 className={adminPageHeaderInlineTitleClassName}>{title}</h1>
            <AdminContextualHelp
              align="start"
              className={adminPageHeaderInlineHelpClassName}
              content={description}
              side="bottom"
            />
          </div>
          {actions ? (
            <div className={adminPageHeaderInlineActionsClassName}>
              {actions}
            </div>
          ) : null}
        </div>
      </header>
    );
  }

  return (
    <header className={adminPageHeaderDefaultClassName}>
      <div className="max-w-3xl">
        {badge ? (
          <Badge className="mb-4 rounded-full" variant="secondary">
            {badge}
          </Badge>
        ) : null}
        <div className={adminPageHeaderTitleHelpClassName}>
          <h1 className={adminPageHeaderTitleClassName}>{title}</h1>
          <AdminContextualHelp align="start" content={description} side="bottom" />
        </div>
      </div>
      {actions ? <div className="shrink-0">{actions}</div> : null}
    </header>
  );
}
