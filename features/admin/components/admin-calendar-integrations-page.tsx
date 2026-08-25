"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import {
  ArrowLeft,
  ArrowRight,
  CheckCircle2,
  CloudDownload,
  CloudUpload,
  Copy,
  Database,
  Eye,
  EyeOff,
  Loader2,
  KeyRound,
  Power,
  RefreshCw,
  RotateCw,
  Save,
  ShieldCheck,
  TestTube2,
  TriangleAlert,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { useLocale } from "@/features/i18n";
import type {
  AdminExternalCalendarErrorCode,
  AdminExternalCalendarInboundStatus,
  AdminExternalCalendarIntegration,
  AdminExternalCalendarIntegrationsPageData,
  AdminExternalCalendarOutboundStatus,
} from "@/types/admin-external-calendar-integration";
import type { Locale } from "@/types/locale";

import { AdminPageHeader } from "./admin-page-header";
import { AdminSnackbar } from "./admin-snackbar";

type CalendarApiResponse = Readonly<{
  error?: Readonly<{ code?: AdminExternalCalendarErrorCode }>;
  url?: string;
}>;

const secretInputClassName =
  "h-11 w-full rounded-2xl border border-input bg-background px-3 pr-11 text-sm text-foreground shadow-xs outline-none transition placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50";

function getIntlLocale(locale: Locale): string {
  return locale === "en" ? "en-US" : "es-GT";
}

function formatDateTime(
  value: string | null,
  locale: Locale,
  unavailable: string,
): string {
  if (!value) {
    return unavailable;
  }

  return new Intl.DateTimeFormat(getIntlLocale(locale), {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "America/Guatemala",
  }).format(new Date(value));
}

function inboundBadgeVariant(
  status: AdminExternalCalendarInboundStatus,
): "default" | "secondary" | "destructive" | "outline" {
  if (status === "ERROR") {
    return "destructive";
  }

  if (status === "HEALTHY") {
    return "default";
  }

  if (status === "WARNING" || status === "LEGACY_ENV_MIGRATION_REQUIRED") {
    return "outline";
  }

  return "secondary";
}

function outboundBadgeVariant(
  status: AdminExternalCalendarOutboundStatus,
): "default" | "secondary" | "outline" {
  if (status === "READY") {
    return "default";
  }

  if (status === "ROTATION_REQUIRED") {
    return "outline";
  }

  return "secondary";
}

function DetailRow({
  label,
  value,
}: Readonly<{
  label: string;
  value: string;
}>) {
  return (
    <div className="grid gap-1 border-b border-border/60 py-3 last:border-b-0 sm:grid-cols-[minmax(0,11rem)_1fr] sm:gap-4">
      <dt className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
        {label}
      </dt>
      <dd className="break-words text-sm text-foreground sm:text-right">{value}</dd>
    </div>
  );
}

function SyncEvidence({
  integration,
}: Readonly<{
  integration: AdminExternalCalendarIntegration;
}>) {
  const { locale, messages } = useLocale();
  const copy = messages.admin.calendarIntegrations;
  const sync = integration.latestSync;

  if (!sync) {
    return (
      <p className="rounded-2xl border border-dashed border-border bg-muted/20 p-4 text-sm text-muted-foreground">
        {copy.notes.noSyncEvidence}
      </p>
    );
  }

  return (
    <div className="rounded-2xl border border-border/70 bg-muted/20 p-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-sm font-medium">{copy.labels.latestResult}</p>
        <Badge variant={sync.status === "FAILED" ? "destructive" : "secondary"}>
          {copy.syncStatuses[sync.status]}
        </Badge>
      </div>
      <p className="mt-2 text-xs text-muted-foreground">
        {copy.labels.triggeredBy}: {copy.syncTriggers[sync.triggeredBy]} · {" "}
        {formatDateTime(sync.finishedAt ?? sync.startedAt, locale, copy.values.unavailable)}
      </p>
      <dl className="mt-4 grid grid-cols-2 gap-3 text-sm sm:grid-cols-3">
        {[
          [copy.labels.eventsImported, sync.eventsImported],
          [copy.labels.eventsUpdated, sync.eventsUpdated],
          [copy.labels.eventsRemoved, sync.eventsRemoved],
          [copy.labels.eventsSkipped, sync.eventsSkipped],
          [copy.labels.blocksCreated, sync.blocksCreated],
          [copy.labels.blocksUpdated, sync.blocksUpdated],
        ].map(([label, value]) => (
          <div className="rounded-xl border border-border/60 bg-background p-3" key={String(label)}>
            <dt className="text-xs text-muted-foreground">{label}</dt>
            <dd className="mt-1 font-medium text-foreground">{value}</dd>
          </div>
        ))}
      </dl>
    </div>
  );
}

function IntegrationCard({
  integration,
}: Readonly<{
  integration: AdminExternalCalendarIntegration;
}>) {
  const { locale, messages } = useLocale();
  const copy = messages.admin.calendarIntegrations;
  const propertyName =
    locale === "en" ? integration.property.nameEn : integration.property.nameEs;
  const router = useRouter();
  const [candidateUrl, setCandidateUrl] = useState("");
  const [showCandidate, setShowCandidate] = useState(false);
  const [rotationConfirmationOpen, setRotationConfirmationOpen] = useState(false);
  const [busyAction, setBusyAction] = useState<string | null>(null);
  const [errorFeedback, setErrorFeedback] = useState<string | null>(null);
  const [successFeedback, setSuccessFeedback] = useState<string | null>(null);
  const encodedPropertyId = encodeURIComponent(integration.property.id);
  const basePath = `/api/admin/calendar-integrations/${encodedPropertyId}/airbnb`;
  const hasCandidate = candidateUrl.trim().length > 0;

  function errorMessage(code?: AdminExternalCalendarErrorCode): string {
    if (code && code in copy.errors) {
      return copy.errors[code as keyof typeof copy.errors];
    }
    return copy.errors.ADMIN_EXTERNAL_CALENDAR_UNEXPECTED_ERROR;
  }

  async function executeInboundAction(
    key: string,
    request: () => Promise<Response>,
    successMessage: string,
    options: Readonly<{ clearCandidate?: boolean; refresh?: boolean }> = {},
  ) {
    setBusyAction(key);
    setErrorFeedback(null);
    setSuccessFeedback(null);
    try {
      const response = await request();
      const payload = (await response.json()) as CalendarApiResponse;
      if (!response.ok) {
        setErrorFeedback(errorMessage(payload.error?.code));
        return;
      }
      if (options.clearCandidate) {
        setCandidateUrl("");
        setShowCandidate(false);
      }
      setSuccessFeedback(successMessage);
      if (options.refresh !== false) {
        router.refresh();
      }
    } catch {
      setErrorFeedback(copy.errors.ADMIN_EXTERNAL_CALENDAR_UNEXPECTED_ERROR);
    } finally {
      setBusyAction(null);
    }
  }

  async function executeOutboundMutation(
    key: string,
    request: () => Promise<Response>,
    successMessage: string,
  ): Promise<boolean> {
    setBusyAction(key);
    setErrorFeedback(null);
    setSuccessFeedback(null);

    try {
      const response = await request();
      const payload = (await response.json()) as CalendarApiResponse;

      if (!response.ok) {
        setErrorFeedback(errorMessage(payload.error?.code));
        return false;
      }

      setSuccessFeedback(successMessage);
      router.refresh();
      return true;
    } catch {
      setErrorFeedback(copy.errors.ADMIN_EXTERNAL_CALENDAR_UNEXPECTED_ERROR);
      return false;
    } finally {
      setBusyAction(null);
    }
  }

  async function copyOutboundUrl(): Promise<void> {
    setBusyAction("copy-export");
    setErrorFeedback(null);
    setSuccessFeedback(null);

    try {
      const response = await fetch(`${basePath}/export-url/copy`, {
        method: "POST",
      });
      const payload = (await response.json()) as CalendarApiResponse;

      if (!response.ok) {
        setErrorFeedback(errorMessage(payload.error?.code));
        return;
      }

      if (!payload.url || !navigator.clipboard?.writeText) {
        setErrorFeedback(copy.errors.clipboardFailed);
        return;
      }

      try {
        await navigator.clipboard.writeText(payload.url);
      } catch {
        setErrorFeedback(copy.errors.clipboardFailed);
        return;
      }

      setSuccessFeedback(copy.success.exportUrlCopied);
    } catch {
      setErrorFeedback(copy.errors.ADMIN_EXTERNAL_CALENDAR_UNEXPECTED_ERROR);
    } finally {
      setBusyAction(null);
    }
  }

  async function mutateOutboundToken(
    operation: "GENERATE" | "ROTATE",
  ): Promise<boolean> {
    if (!integration.updatedAt) {
      setErrorFeedback(copy.errors.ADMIN_EXTERNAL_CALENDAR_NOT_FOUND);
      return false;
    }

    return executeOutboundMutation(
      operation === "GENERATE" ? "generate-export" : "rotate-export",
      () =>
        fetch(`${basePath}/export-url/rotate`, {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({
            operation,
            expectedUpdatedAt: integration.updatedAt,
          }),
        }),
      operation === "GENERATE"
        ? copy.success.exportTokenGenerated
        : copy.success.exportTokenRotated,
    );
  }

  return (
    <>
      <Card className="border-border/70 bg-card shadow-sm">
      <AdminSnackbar
        closeLabel={messages.admin.feedback.dismiss}
        message={errorFeedback ?? successFeedback}
        onDismiss={() => {
          setErrorFeedback(null);
          setSuccessFeedback(null);
        }}
        variant={errorFeedback ? "error" : "success"}
      />
      <CardHeader className="border-b border-border/70">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <CardTitle>{propertyName}</CardTitle>
            <CardDescription>{copy.cards.description}</CardDescription>
          </div>
          <Badge variant="outline">{copy.values.airbnb}</Badge>
        </div>
      </CardHeader>
      <CardContent className="grid gap-6 p-5 lg:grid-cols-2 lg:p-6">
        <section className="min-w-0 rounded-2xl border border-border/70 p-4 sm:p-5">
          <div className="flex items-start gap-3">
            <span className="flex size-10 shrink-0 items-center justify-center rounded-2xl bg-muted">
              <CloudDownload aria-hidden="true" className="size-5" />
            </span>
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <h2 className="font-semibold">{copy.directions.inbound.title}</h2>
                <Badge variant={inboundBadgeVariant(integration.inboundStatus)}>
                  {copy.inboundStatuses[integration.inboundStatus]}
                </Badge>
              </div>
              <p className="mt-1 text-sm leading-6 text-muted-foreground">
                {copy.directions.inbound.description}
              </p>
            </div>
          </div>

          <dl className="mt-5">
            <DetailRow
              label={copy.labels.configuration}
              value={
                integration.importConfigured
                  ? copy.values.configured
                  : copy.values.notConfigured
              }
            />
            <DetailRow
              label={copy.labels.importState}
              value={
                integration.isImportEnabled
                  ? copy.values.enabled
                  : copy.values.disabled
              }
            />
            <DetailRow
              label={copy.labels.secretSource}
              value={copy.importSources[integration.importSecretSource]}
            />
            <DetailRow
              label={copy.labels.lastSync}
              value={formatDateTime(
                integration.lastSyncAt,
                locale,
                copy.values.unavailable,
              )}
            />
            <DetailRow
              label={copy.labels.lastSuccessfulSync}
              value={formatDateTime(
                integration.lastSuccessfulSyncAt,
                locale,
                copy.values.unavailable,
              )}
            />
          </dl>

          <div className="mt-5 rounded-2xl border border-border/70 bg-muted/15 p-4">
            <label className="text-sm font-medium" htmlFor={`airbnb-import-${integration.property.id}`}>
              {copy.labels.airbnbImportUrl}
            </label>
            <p className="mt-1 text-xs leading-5 text-muted-foreground">
              {copy.notes.importUrlInput}
            </p>
            <div className="relative mt-3">
              <input
                autoComplete="off"
                className={secretInputClassName}
                id={`airbnb-import-${integration.property.id}`}
                onChange={(event) => setCandidateUrl(event.target.value)}
                placeholder={copy.values.secretPlaceholder}
                spellCheck={false}
                type={showCandidate ? "text" : "password"}
                value={candidateUrl}
              />
              <Button
                aria-label={showCandidate ? copy.actions.hideUrl : copy.actions.showUrl}
                className="absolute right-1 top-1 size-9 rounded-xl"
                onClick={() => setShowCandidate((value) => !value)}
                size="icon"
                type="button"
                variant="ghost"
              >
                {showCandidate ? <EyeOff aria-hidden="true" /> : <Eye aria-hidden="true" />}
              </Button>
            </div>
            <div className="mt-3 flex flex-wrap gap-2">
              <Button
                disabled={!hasCandidate || busyAction !== null}
                onClick={() => void executeInboundAction(
                  "save",
                  () => fetch(`${basePath}/import-url`, {
                    method: "PATCH",
                    headers: { "content-type": "application/json" },
                    body: JSON.stringify({ importUrl: candidateUrl, expectedUpdatedAt: integration.updatedAt }),
                  }),
                  integration.importConfigured ? copy.success.urlReplaced : copy.success.urlSaved,
                  { clearCandidate: true },
                )}
                type="button"
              >
                {busyAction === "save" ? <Loader2 aria-hidden="true" className="animate-spin" /> : <Save aria-hidden="true" />}
                {integration.importConfigured ? copy.actions.replaceUrl : copy.actions.saveUrl}
              </Button>
              <Button
                disabled={!integration.calendarId || (!hasCandidate && !integration.importConfigured) || busyAction !== null}
                onClick={() => void executeInboundAction(
                  "test",
                  () => fetch(`${basePath}/import-test`, {
                    method: "POST",
                    headers: { "content-type": "application/json" },
                    body: JSON.stringify(hasCandidate ? { candidateImportUrl: candidateUrl } : {}),
                  }),
                  copy.success.connectionPassed,
                  { refresh: false },
                )}
                type="button"
                variant="outline"
              >
                {busyAction === "test" ? <Loader2 aria-hidden="true" className="animate-spin" /> : <TestTube2 aria-hidden="true" />}
                {copy.actions.testConnection}
              </Button>
              <Button
                disabled={!integration.importConfigured || !integration.isImportEnabled || busyAction !== null}
                onClick={() => void executeInboundAction(
                  "sync",
                  () => fetch(`${basePath}/import-sync`, { method: "POST" }),
                  copy.success.syncCompleted,
                )}
                type="button"
                variant="outline"
              >
                {busyAction === "sync" ? <Loader2 aria-hidden="true" className="animate-spin" /> : <RefreshCw aria-hidden="true" />}
                {copy.actions.syncNow}
              </Button>
              {integration.calendarId && integration.updatedAt ? (
                <Button
                  disabled={busyAction !== null}
                  onClick={() => void executeInboundAction(
                    "toggle",
                    () => fetch(`${basePath}/import-enabled`, {
                      method: "PATCH",
                      headers: { "content-type": "application/json" },
                      body: JSON.stringify({ enabled: !integration.isImportEnabled, expectedUpdatedAt: integration.updatedAt }),
                    }),
                    integration.isImportEnabled ? copy.success.importDisabled : copy.success.importEnabled,
                  )}
                  type="button"
                  variant="secondary"
                >
                  {busyAction === "toggle" ? <Loader2 aria-hidden="true" className="animate-spin" /> : <Power aria-hidden="true" />}
                  {integration.isImportEnabled ? copy.actions.disableImport : copy.actions.enableImport}
                </Button>
              ) : null}
            </div>
          </div>

          {integration.inboundStatus === "LEGACY_ENV_MIGRATION_REQUIRED" ? (
            <div className="mt-4 rounded-2xl border border-border bg-muted/30 p-4">
              <div className="flex gap-3">
                <TriangleAlert aria-hidden="true" className="mt-0.5 size-5 shrink-0" />
                <div>
                  <p className="text-sm font-medium">{copy.notes.legacyMigrationTitle}</p>
                  <p className="mt-1 text-sm leading-6 text-muted-foreground">
                    {copy.notes.legacyMigrationDescription}
                  </p>
                </div>
              </div>
            </div>
          ) : null}

          <div className="mt-4">
            <SyncEvidence integration={integration} />
          </div>

          {integration.safeFailure ? (
            <div className="mt-4 rounded-2xl border border-destructive/30 bg-destructive/5 p-4">
              <div className="flex gap-3">
                <TriangleAlert
                  aria-hidden="true"
                  className="mt-0.5 size-5 shrink-0 text-destructive"
                />
                <div className="min-w-0">
                  <p className="text-sm font-medium">{copy.labels.safeDiagnostic}</p>
                  <p className="mt-1 text-sm leading-6 text-muted-foreground">
                    {integration.safeFailure.code
                      ? `${copy.labels.errorCode}: ${integration.safeFailure.code}`
                      : copy.notes.safeFailure}
                  </p>
                </div>
              </div>
            </div>
          ) : null}
        </section>

        <section className="min-w-0 rounded-2xl border border-border/70 p-4 sm:p-5">
          <div className="flex items-start gap-3">
            <span className="flex size-10 shrink-0 items-center justify-center rounded-2xl bg-muted">
              <CloudUpload aria-hidden="true" className="size-5" />
            </span>
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <h2 className="font-semibold">{copy.directions.outbound.title}</h2>
                <Badge variant={outboundBadgeVariant(integration.outboundStatus)}>
                  {copy.outboundStatuses[integration.outboundStatus]}
                </Badge>
              </div>
              <p className="mt-1 text-sm leading-6 text-muted-foreground">
                {copy.directions.outbound.description}
              </p>
            </div>
          </div>

          <dl className="mt-5">
            <DetailRow
              label={copy.labels.configuration}
              value={
                integration.exportConfigured
                  ? copy.values.configured
                  : copy.values.notConfigured
              }
            />
            <DetailRow
              label={copy.labels.exportState}
              value={
                integration.isExportEnabled
                  ? copy.values.enabled
                  : copy.values.disabled
              }
            />
            <DetailRow
              label={copy.labels.copyAvailability}
              value={
                integration.exportCopyAvailable
                  ? copy.values.available
                  : copy.values.unavailable
              }
            />
            <DetailRow
              label={copy.labels.lastRotation}
              value={formatDateTime(
                integration.exportTokenLastRotatedAt,
                locale,
                copy.values.unavailable,
              )}
            />
            <DetailRow
              label={copy.labels.lastFeedGenerated}
              value={formatDateTime(
                integration.lastExportGeneratedAt,
                locale,
                copy.values.unavailable,
              )}
            />
          </dl>

          <div className="mt-5 flex flex-wrap gap-2">
            <Button
              disabled={!integration.exportCopyAvailable || busyAction !== null}
              onClick={() => void copyOutboundUrl()}
              type="button"
            >
              {busyAction === "copy-export" ? (
                <Loader2 aria-hidden="true" className="animate-spin" />
              ) : (
                <Copy aria-hidden="true" />
              )}
              {busyAction === "copy-export"
                ? copy.actions.copyingUrl
                : copy.actions.copyUrl}
            </Button>

            <Button
              disabled={!integration.calendarId || !integration.updatedAt || busyAction !== null}
              onClick={() => {
                if (integration.exportConfigured) {
                  setRotationConfirmationOpen(true);
                  return;
                }

                void mutateOutboundToken("GENERATE");
              }}
              type="button"
              variant="outline"
            >
              {busyAction === "generate-export" ? (
                <Loader2 aria-hidden="true" className="animate-spin" />
              ) : integration.exportConfigured ? (
                <RotateCw aria-hidden="true" />
              ) : (
                <KeyRound aria-hidden="true" />
              )}
              {busyAction === "generate-export"
                ? copy.actions.generatingUrl
                : integration.exportConfigured
                  ? copy.actions.rotateUrl
                  : copy.actions.generateUrl}
            </Button>

            {integration.calendarId && integration.updatedAt ? (
              <Button
                disabled={
                  busyAction !== null ||
                  (!integration.isExportEnabled && !integration.exportConfigured)
                }
                onClick={() =>
                  void executeOutboundMutation(
                    "toggle-export",
                    () =>
                      fetch(`${basePath}/export-enabled`, {
                        method: "PATCH",
                        headers: { "content-type": "application/json" },
                        body: JSON.stringify({
                          enabled: !integration.isExportEnabled,
                          expectedUpdatedAt: integration.updatedAt,
                        }),
                      }),
                    integration.isExportEnabled
                      ? copy.success.exportDisabled
                      : copy.success.exportEnabled,
                  )
                }
                type="button"
                variant="secondary"
              >
                {busyAction === "toggle-export" ? (
                  <Loader2 aria-hidden="true" className="animate-spin" />
                ) : (
                  <Power aria-hidden="true" />
                )}
                {integration.isExportEnabled
                  ? copy.actions.disableExport
                  : copy.actions.enableExport}
              </Button>
            ) : null}
          </div>

          {integration.outboundStatus === "NOT_CONFIGURED" ? (
            <div className="mt-4 rounded-2xl border border-border bg-muted/20 p-4">
              <div className="flex gap-3">
                <KeyRound aria-hidden="true" className="mt-0.5 size-5 shrink-0" />
                <div>
                  <p className="text-sm font-medium">
                    {copy.notes.generateRequiredTitle}
                  </p>
                  <p className="mt-1 text-sm leading-6 text-muted-foreground">
                    {copy.notes.generateRequiredDescription}
                  </p>
                </div>
              </div>
            </div>
          ) : null}

          {integration.outboundStatus === "ROTATION_REQUIRED" ? (
            <div className="mt-4 rounded-2xl border border-border bg-muted/30 p-4">
              <div className="flex gap-3">
                <TriangleAlert aria-hidden="true" className="mt-0.5 size-5 shrink-0" />
                <div>
                  <p className="text-sm font-medium">{copy.notes.rotationRequiredTitle}</p>
                  <p className="mt-1 text-sm leading-6 text-muted-foreground">
                    {copy.notes.rotationRequiredDescription}
                  </p>
                </div>
              </div>
            </div>
          ) : null}

          {integration.outboundStatus === "READY" ? (
            <div className="mt-4 rounded-2xl border border-border bg-muted/20 p-4">
              <div className="flex gap-3">
                <CheckCircle2 aria-hidden="true" className="mt-0.5 size-5 shrink-0" />
                <p className="text-sm leading-6 text-muted-foreground">
                  {copy.notes.outboundReady}
                </p>
              </div>
            </div>
          ) : null}
        </section>
      </CardContent>
      </Card>

      <Sheet
      onOpenChange={(open) => {
        if (!open && busyAction !== "rotate-export") {
          setRotationConfirmationOpen(false);
        }
      }}
      open={rotationConfirmationOpen}
    >
      <SheetContent closeLabel={messages.admin.feedback.dismiss}>
        <SheetHeader>
          <SheetTitle>{copy.rotationDialog.title}</SheetTitle>
          <SheetDescription>{copy.rotationDialog.description}</SheetDescription>
        </SheetHeader>

        <div className="grid gap-4 overflow-y-auto px-6 py-2 text-sm leading-6">
          <div className="rounded-2xl border border-destructive/30 bg-destructive/5 p-4">
            <p className="font-medium">{copy.rotationDialog.warningTitle}</p>
            <p className="mt-1 text-muted-foreground">
              {copy.rotationDialog.warningDescription}
            </p>
          </div>
          <p className="text-muted-foreground">
            {copy.rotationDialog.rolloutNote}
          </p>
          <p className="text-muted-foreground">
            {copy.rotationDialog.copyAfterRotationNote}
          </p>
        </div>

        <SheetFooter>
          <Button
            disabled={busyAction === "rotate-export"}
            onClick={() => setRotationConfirmationOpen(false)}
            type="button"
            variant="outline"
          >
            {copy.actions.cancel}
          </Button>
          <Button
            disabled={busyAction === "rotate-export"}
            onClick={() =>
              void mutateOutboundToken("ROTATE").then((success) => {
                if (success) {
                  setRotationConfirmationOpen(false);
                }
              })
            }
            type="button"
            variant="destructive"
          >
            {busyAction === "rotate-export" ? (
              <Loader2 aria-hidden="true" className="animate-spin" />
            ) : (
              <RotateCw aria-hidden="true" />
            )}
            {busyAction === "rotate-export"
              ? copy.actions.rotatingUrl
              : copy.actions.confirmRotation}
          </Button>
        </SheetFooter>
      </SheetContent>
      </Sheet>
    </>
  );
}

export function AdminCalendarIntegrationsPage({
  initialData,
}: Readonly<{
  initialData: AdminExternalCalendarIntegrationsPageData;
}>) {
  const { messages } = useLocale();
  const copy = messages.admin.calendarIntegrations;

  return (
    <>
      <AdminPageHeader
        actions={
          <Button asChild variant="outline">
            <Link href="/admin/calendar">
              <ArrowLeft aria-hidden="true" />
              {copy.actions.backToCalendar}
            </Link>
          </Button>
        }
        badge={copy.badge}
        description={copy.description}
        title={copy.title}
      />

      <div className="mb-6 grid gap-4 md:grid-cols-2">
        <Card className="border-border/70 bg-muted/20 shadow-none">
          <CardContent className="flex gap-3 p-4 sm:p-5">
            <ShieldCheck aria-hidden="true" className="mt-0.5 size-5 shrink-0" />
            <div>
              <p className="text-sm font-medium">{copy.notes.secretSafeTitle}</p>
              <p className="mt-1 text-sm leading-6 text-muted-foreground">
                {copy.notes.secretSafe}
              </p>
            </div>
          </CardContent>
        </Card>
        <Card className="border-border/70 bg-muted/20 shadow-none">
          <CardContent className="flex gap-3 p-4 sm:p-5">
            <Database aria-hidden="true" className="mt-0.5 size-5 shrink-0" />
            <div>
              <p className="text-sm font-medium">{copy.notes.independentDirectionsTitle}</p>
              <p className="mt-1 text-sm leading-6 text-muted-foreground">
                {copy.notes.independentDirections}
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-5">
        {initialData.integrations.map((integration) => (
          <IntegrationCard
            integration={integration}
            key={integration.property.id}
          />
        ))}
      </div>

      <div className="mt-6 flex justify-end">
        <Button asChild variant="ghost">
          <Link href="/admin/calendar">
            {copy.actions.backToCalendar}
            <ArrowRight aria-hidden="true" />
          </Link>
        </Button>
      </div>
    </>
  );
}
