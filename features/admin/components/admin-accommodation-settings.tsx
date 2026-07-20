"use client";

import { useState } from "react";
import { Loader2, Save, Settings2 } from "lucide-react";

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
  AdminPreparationBufferErrorCode,
  AdminPreparationBufferSettings,
} from "@/types/admin-preparation-buffer-management";
import type { Locale } from "@/types/locale";

import { AdminPageHeader } from "./admin-page-header";
import { AdminSnackbar } from "./admin-snackbar";

type PropertyDraft = Readonly<{
  preparationDaysBefore: string;
  preparationDaysAfter: string;
}>;

type SettingsApiResponse = Readonly<{
  settings?: AdminPreparationBufferSettings;
  error?: Readonly<{
    code?: AdminPreparationBufferErrorCode;
  }>;
}>;

const fieldClassName =
  "h-11 w-full rounded-2xl border border-input bg-background px-3 text-sm text-foreground shadow-xs outline-none transition focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50 disabled:cursor-not-allowed disabled:opacity-50";

function getIntlLocale(locale: Locale): string {
  return locale === "en" ? "en-US" : "es-GT";
}

function buildDrafts(
  settings: AdminPreparationBufferSettings,
): Record<string, PropertyDraft> {
  return Object.fromEntries(
    settings.properties.map((property) => [
      property.id,
      {
        preparationDaysBefore: String(property.preparationDaysBefore),
        preparationDaysAfter: String(property.preparationDaysAfter),
      },
    ]),
  );
}

export function AdminAccommodationSettings({
  initialSettings,
  showHeader = true,
}: Readonly<{
  initialSettings: AdminPreparationBufferSettings;
  showHeader?: boolean;
}>) {
  const { locale, messages } = useLocale();
  const copy = messages.admin.accommodations.preparation;
  const intlLocale = getIntlLocale(locale);
  const [settings, setSettings] =
    useState<AdminPreparationBufferSettings>(initialSettings);
  const [drafts, setDrafts] = useState<Record<string, PropertyDraft>>(() =>
    buildDrafts(initialSettings),
  );
  const [busyPropertyId, setBusyPropertyId] = useState<string | null>(null);
  const [errorFeedback, setErrorFeedback] = useState<string | null>(null);
  const [successFeedback, setSuccessFeedback] = useState<string | null>(null);

  function formatDateTime(value: string): string {
    return new Intl.DateTimeFormat(intlLocale, {
      dateStyle: "medium",
      timeStyle: "short",
    }).format(new Date(value));
  }

  function errorMessage(code: AdminPreparationBufferErrorCode | undefined): string {
    return code
      ? copy.errors[code] ?? copy.errors.PREPARATION_BUFFER_UNEXPECTED_ERROR
      : copy.errors.PREPARATION_BUFFER_UNEXPECTED_ERROR;
  }

  async function saveSettings(propertyId: string) {
    const draft = drafts[propertyId];

    if (!draft) {
      return;
    }

    setBusyPropertyId(propertyId);
    setErrorFeedback(null);
    setSuccessFeedback(null);

    try {
      const response = await fetch("/api/admin/preparation-buffers", {
        method: "PATCH",
        headers: {
          "content-type": "application/json",
        },
        body: JSON.stringify({
          propertyId,
          preparationDaysBefore: Number(draft.preparationDaysBefore),
          preparationDaysAfter: Number(draft.preparationDaysAfter),
        }),
      });
      const payload = (await response.json()) as SettingsApiResponse;

      if (!response.ok || !payload.settings) {
        setErrorFeedback(errorMessage(payload.error?.code));
        return;
      }

      setSettings(payload.settings);
      setDrafts(buildDrafts(payload.settings));
      setSuccessFeedback(copy.success.settingsSaved);
    } catch {
      setErrorFeedback(copy.errors.PREPARATION_BUFFER_UNEXPECTED_ERROR);
    } finally {
      setBusyPropertyId(null);
    }
  }

  return (
    <>
      {showHeader ? (
        <AdminPageHeader
          badge={copy.badge}
          description={copy.description}
          title={copy.title}
        />
      ) : null}

      {errorFeedback ? (
        <div
          className="mb-6 rounded-2xl border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive"
          role="alert"
        >
          {errorFeedback}
        </div>
      ) : null}

      <AdminSnackbar
        closeLabel={messages.admin.feedback.dismiss}
        message={successFeedback}
        onDismiss={() => setSuccessFeedback(null)}
      />

      <div className="grid gap-5 xl:grid-cols-3">
        {settings.properties.map((property) => {
          const draft = drafts[property.id];
          const isBusy = busyPropertyId === property.id;

          return (
            <Card className="border-border/70 bg-card shadow-sm" key={property.id}>
              <CardHeader>
                <div className="mb-3 flex size-10 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                  <Settings2 aria-hidden="true" className="size-5" />
                </div>
                <CardTitle>
                  {locale === "en" ? property.nameEn : property.nameEs}
                </CardTitle>
                <CardDescription>
                  {copy.labels.lastUpdated}: {formatDateTime(property.updatedAt)}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <form
                  className="space-y-4"
                  onSubmit={(event) => {
                    event.preventDefault();
                    void saveSettings(property.id);
                  }}
                >
                  <label className="grid gap-2 text-sm font-medium">
                    {copy.labels.daysBefore}
                    <input
                      className={fieldClassName}
                      disabled={busyPropertyId !== null}
                      inputMode="numeric"
                      max={30}
                      min={0}
                      onChange={(event) => {
                        setDrafts((current) => ({
                          ...current,
                          [property.id]: {
                            ...(current[property.id] ?? {
                              preparationDaysBefore: "0",
                              preparationDaysAfter: "0",
                            }),
                            preparationDaysBefore: event.target.value,
                          },
                        }));
                      }}
                      required
                      type="number"
                      value={draft?.preparationDaysBefore ?? ""}
                    />
                  </label>
                  <label className="grid gap-2 text-sm font-medium">
                    {copy.labels.daysAfter}
                    <input
                      className={fieldClassName}
                      disabled={busyPropertyId !== null}
                      inputMode="numeric"
                      max={30}
                      min={0}
                      onChange={(event) => {
                        setDrafts((current) => ({
                          ...current,
                          [property.id]: {
                            ...(current[property.id] ?? {
                              preparationDaysBefore: "0",
                              preparationDaysAfter: "0",
                            }),
                            preparationDaysAfter: event.target.value,
                          },
                        }));
                      }}
                      required
                      type="number"
                      value={draft?.preparationDaysAfter ?? ""}
                    />
                  </label>
                  <p className="text-xs leading-5 text-muted-foreground">
                    {copy.notes.allowedRange}
                  </p>
                  <Button
                    className="w-full"
                    disabled={busyPropertyId !== null}
                    type="submit"
                  >
                    {isBusy ? (
                      <Loader2 aria-hidden="true" className="animate-spin" />
                    ) : (
                      <Save aria-hidden="true" />
                    )}
                    {isBusy ? copy.actions.saving : copy.actions.saveSettings}
                  </Button>
                </form>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <div className="mt-6 rounded-2xl border border-border bg-muted/30 p-4 text-sm leading-6 text-muted-foreground">
        {copy.notes.settingsImpact}
      </div>
    </>
  );
}
