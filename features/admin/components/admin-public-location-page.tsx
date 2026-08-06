"use client";

import {
  Clock3,
  Loader2,
  MapPinned,
  Save,
  ShieldCheck,
} from "lucide-react";
import { type ChangeEvent, type ReactNode, useState } from "react";

import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
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
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import { useLocale } from "@/features/i18n";
import { PUBLIC_LOCATION_MAP_URL_MAX_LENGTH } from "@/lib/public-location-map";
import type {
  AdminPublicLocationApiResponse,
  AdminPublicLocationPageData,
  AdminPublicLocationSettings,
} from "@/types/admin-public-location";
import type { Locale } from "@/types/locale";

import { AdminPageHeader } from "./admin-page-header";
import { AdminSnackbar } from "./admin-snackbar";

const inputClassName =
  "h-11 w-full rounded-2xl border border-input bg-background px-3 text-sm text-foreground shadow-xs outline-none transition focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50 disabled:cursor-not-allowed disabled:opacity-50";
const textareaClassName =
  "min-h-28 w-full resize-y rounded-2xl border border-input bg-background px-3 py-3 text-sm leading-6 text-foreground shadow-xs outline-none transition focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50 disabled:cursor-not-allowed disabled:opacity-50";

type PublicLocationDraft = Readonly<{
  enabled: boolean;
  publicLocationEs: string;
  publicLocationEn: string;
  mapEmbedUrl: string;
}>;

function toDraft(settings: AdminPublicLocationSettings): PublicLocationDraft {
  return {
    enabled: settings.enabled,
    publicLocationEs: settings.publicLocationEs,
    publicLocationEn: settings.publicLocationEn,
    mapEmbedUrl: settings.mapEmbedUrl,
  };
}

function getIntlLocale(locale: Locale): string {
  return locale === "en" ? "en-US" : "es-GT";
}

export function AdminPublicLocationPage({
  initialData,
}: Readonly<{
  initialData: AdminPublicLocationPageData;
}>) {
  const { locale, messages } = useLocale();
  const copy = messages.admin.publicLocation;
  const [data, setData] = useState(initialData);
  const [draft, setDraft] = useState(() => toDraft(initialData.settings));
  const [saving, setSaving] = useState(false);
  const [errorFeedback, setErrorFeedback] = useState<string | null>(null);
  const [successFeedback, setSuccessFeedback] = useState<string | null>(null);
  const savedLocationText =
    locale === "en"
      ? data.settings.publicLocationEn
      : data.settings.publicLocationEs;
  const canPreview =
    data.settings.enabled &&
    Boolean(savedLocationText && data.settings.mapEmbedUrl);

  function clearFeedback(): void {
    setErrorFeedback(null);
    setSuccessFeedback(null);
  }

  function errorMessage(payload: AdminPublicLocationApiResponse): string {
    if (!("error" in payload)) {
      return copy.errors.ADMIN_PUBLIC_LOCATION_UNEXPECTED_ERROR;
    }

    return copy.errors[payload.error.code];
  }

  function formatDateTime(value: string): string {
    return new Intl.DateTimeFormat(getIntlLocale(locale), {
      dateStyle: "medium",
      timeStyle: "short",
    }).format(new Date(value));
  }

  function changedFieldLabel(field: string): string {
    const labels: Readonly<Record<string, string>> = copy.history.fields;

    return labels[field] ?? field;
  }

  async function save(): Promise<void> {
    clearFeedback();
    setSaving(true);

    try {
      const response = await fetch("/api/admin/location", {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          expectedUpdatedAt: data.settings.updatedAt,
          ...draft,
        }),
      });
      const payload = (await response.json()) as AdminPublicLocationApiResponse;

      if (!response.ok || !("pageData" in payload)) {
        setErrorFeedback(errorMessage(payload));
        return;
      }

      setData(payload.pageData);
      setDraft(toDraft(payload.pageData.settings));
      setSuccessFeedback(copy.success.saved);
    } catch {
      setErrorFeedback(copy.errors.ADMIN_PUBLIC_LOCATION_UNEXPECTED_ERROR);
    } finally {
      setSaving(false);
    }
  }

  return (
    <>
      <AdminPageHeader
        badge={copy.badge}
        description={copy.description}
        title={copy.title}
      />

      <AdminSnackbar
        closeLabel={messages.admin.feedback.dismiss}
        message={errorFeedback ?? successFeedback}
        onDismiss={clearFeedback}
        variant={errorFeedback ? "error" : "success"}
      />

      <Tabs className="mt-6" defaultValue="configuration">
        <TabsList className="grid w-full grid-cols-2 sm:w-fit">
          <TabsTrigger value="configuration">
            {copy.tabs.configuration}
          </TabsTrigger>
          <TabsTrigger value="history">{copy.tabs.history}</TabsTrigger>
        </TabsList>

        <TabsContent className="mt-6" value="configuration">
          <div className="grid gap-6 xl:grid-cols-[minmax(0,1.15fr)_minmax(22rem,0.85fr)]">
            <Card className="border-border/70 bg-card shadow-sm">
              <CardHeader>
                <div className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-start">
                  <div>
                    <CardTitle>{copy.sections.configuration}</CardTitle>
                    <CardDescription className="mt-2">
                      {copy.notes.publicOnly}
                    </CardDescription>
                  </div>
                  <Badge
                    className="w-fit sm:justify-self-end"
                    variant={draft.enabled ? "default" : "secondary"}
                  >
                    {draft.enabled ? copy.states.enabled : copy.states.disabled}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="grid gap-5">
                <div className="grid gap-5 lg:grid-cols-2">
                  <LabeledField label={copy.labels.publicLocationEs}>
                    <textarea
                      className={textareaClassName}
                      disabled={saving}
                      maxLength={500}
                      onChange={(event: ChangeEvent<HTMLTextAreaElement>) =>
                        setDraft((current) => ({
                          ...current,
                          publicLocationEs: event.target.value,
                        }))
                      }
                      placeholder={copy.placeholders.publicLocationEs}
                      value={draft.publicLocationEs}
                    />
                  </LabeledField>
                  <LabeledField label={copy.labels.publicLocationEn}>
                    <textarea
                      className={textareaClassName}
                      disabled={saving}
                      maxLength={500}
                      onChange={(event: ChangeEvent<HTMLTextAreaElement>) =>
                        setDraft((current) => ({
                          ...current,
                          publicLocationEn: event.target.value,
                        }))
                      }
                      placeholder={copy.placeholders.publicLocationEn}
                      value={draft.publicLocationEn}
                    />
                  </LabeledField>
                </div>

                <LabeledField label={copy.labels.mapEmbedUrl}>
                  <input
                    className={inputClassName}
                    disabled={saving}
                    inputMode="url"
                    maxLength={PUBLIC_LOCATION_MAP_URL_MAX_LENGTH}
                    onChange={(event: ChangeEvent<HTMLInputElement>) =>
                      setDraft((current) => ({
                        ...current,
                        mapEmbedUrl: event.target.value,
                      }))
                    }
                    placeholder={copy.placeholders.mapEmbedUrl}
                    type="url"
                    value={draft.mapEmbedUrl}
                  />
                </LabeledField>

                <p className="text-sm leading-6 text-muted-foreground">
                  {copy.notes.allowedProviders}
                </p>

                <div className="flex flex-col gap-3 sm:flex-row sm:justify-between">
                  <Button
                    aria-pressed={draft.enabled}
                    disabled={saving}
                    onClick={() =>
                      setDraft((current) => ({
                        ...current,
                        enabled: !current.enabled,
                      }))
                    }
                    type="button"
                    variant={draft.enabled ? "default" : "outline"}
                  >
                    <MapPinned aria-hidden="true" />
                    {draft.enabled ? copy.actions.disable : copy.actions.enable}
                  </Button>

                  <Button
                    disabled={saving}
                    onClick={() => void save()}
                    type="button"
                  >
                    {saving ? (
                      <Loader2 aria-hidden="true" className="animate-spin" />
                    ) : (
                      <Save aria-hidden="true" />
                    )}
                    {saving ? copy.actions.saving : copy.actions.save}
                  </Button>
                </div>
              </CardContent>
            </Card>

            <div className="grid h-fit gap-6">
              <Card className="overflow-hidden border-border/70 bg-card shadow-sm">
                <CardHeader>
                  <CardTitle>{copy.sections.preview}</CardTitle>
                  <CardDescription>{copy.preview.savedNote}</CardDescription>
                </CardHeader>
                <CardContent>
                  {canPreview ? (
                    <div className="overflow-hidden rounded-2xl border border-border">
                      <div className="aspect-[4/3] bg-muted">
                        <iframe
                          allowFullScreen
                          className="h-full w-full border-0"
                          loading="lazy"
                          referrerPolicy="no-referrer-when-downgrade"
                          src={data.settings.mapEmbedUrl}
                          title={copy.preview.frameTitle}
                        />
                      </div>
                      <p className="border-t border-border p-4 text-sm leading-6">
                        {savedLocationText}
                      </p>
                    </div>
                  ) : (
                    <div className="rounded-2xl border border-dashed border-border bg-muted/20 px-4 py-10 text-center text-sm leading-6 text-muted-foreground">
                      {copy.preview.unavailable}
                    </div>
                  )}
                </CardContent>
              </Card>

              <div className="rounded-2xl border border-amber-500/30 bg-amber-500/10 p-4 text-sm leading-6 text-foreground">
                <p className="flex items-center gap-2 font-semibold">
                  <ShieldCheck aria-hidden="true" className="size-4" />
                  {copy.notes.securityTitle}
                </p>
                <p className="mt-1 text-muted-foreground">
                  {copy.notes.securityDescription}
                </p>
              </div>
            </div>
          </div>
        </TabsContent>

        <TabsContent className="mt-6" value="history">
          <Card className="border-border/70 bg-card shadow-sm">
            <CardHeader>
              <CardTitle>{copy.sections.history}</CardTitle>
              <CardDescription>{copy.history.description}</CardDescription>
            </CardHeader>
            <CardContent>
              {data.history.length > 0 ? (
                <Accordion className="grid gap-3" collapsible type="single">
                  {data.history.map((entry) => {
                    const actor =
                      entry.actor.name ??
                      entry.actor.email ??
                      copy.history.systemActor;

                    return (
                      <AccordionItem
                        className="overflow-hidden rounded-2xl border border-border bg-muted/20 last:border-b"
                        key={entry.id}
                        value={entry.id}
                      >
                        <AccordionTrigger className="px-4 py-3 hover:bg-muted/40 sm:px-5">
                          <div className="grid min-w-0 flex-1 gap-2 pr-2 text-left sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center">
                            <div className="min-w-0">
                              <p className="truncate text-sm font-semibold">{actor}</p>
                              <p className="mt-1 text-xs text-muted-foreground">
                                {entry.changedFields
                                  .map(changedFieldLabel)
                                  .join(" · ")}
                              </p>
                            </div>
                            <p className="flex items-center gap-2 text-xs text-muted-foreground">
                              <Clock3 aria-hidden="true" className="size-4" />
                              {formatDateTime(entry.createdAt)}
                            </p>
                          </div>
                        </AccordionTrigger>
                        <AccordionContent className="border-t border-border/70 px-4 pb-4 pt-3 sm:px-5">
                          <div className="grid gap-3 text-sm sm:grid-cols-2">
                            <HistoryState
                              label={copy.history.before}
                              value={
                                entry.enabledBefore
                                  ? copy.states.enabled
                                  : copy.states.disabled
                              }
                            />
                            <HistoryState
                              label={copy.history.after}
                              value={
                                entry.enabledAfter
                                  ? copy.states.enabled
                                  : copy.states.disabled
                              }
                            />
                          </div>
                        </AccordionContent>
                      </AccordionItem>
                    );
                  })}
                </Accordion>
              ) : (
                <div className="rounded-2xl border border-dashed border-border bg-muted/10 px-4 py-10 text-center text-sm text-muted-foreground">
                  {copy.history.empty}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </>
  );
}

function LabeledField({
  label,
  children,
}: Readonly<{
  label: string;
  children: ReactNode;
}>) {
  return (
    <label className="grid gap-2 text-sm font-medium">
      <span>{label}</span>
      {children}
    </label>
  );
}

function HistoryState({
  label,
  value,
}: Readonly<{
  label: string;
  value: string;
}>) {
  return (
    <div className="rounded-2xl border border-border bg-background p-4">
      <p className="text-xs uppercase tracking-wide text-muted-foreground">
        {label}
      </p>
      <p className="mt-2 font-medium">{value}</p>
    </div>
  );
}
