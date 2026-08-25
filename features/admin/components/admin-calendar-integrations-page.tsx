"use client";

import Link from "next/link";
import {
  ArrowLeft,
  ArrowRight,
  CheckCircle2,
  CloudDownload,
  CloudUpload,
  Database,
  ShieldCheck,
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
import { useLocale } from "@/features/i18n";
import type {
  AdminExternalCalendarInboundStatus,
  AdminExternalCalendarIntegration,
  AdminExternalCalendarIntegrationsPageData,
  AdminExternalCalendarOutboundStatus,
} from "@/types/admin-external-calendar-integration";
import type { Locale } from "@/types/locale";

import { AdminPageHeader } from "./admin-page-header";

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

  return (
    <Card className="border-border/70 bg-card shadow-sm">
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
