"use client";

import Link from "next/link";
import { ArrowLeft, Clock3, Loader2, MailClock, Save } from "lucide-react";
import { type ChangeEvent, type ReactNode, useState } from "react";

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
  AdminArrivalInstructionsErrorCode,
  AdminArrivalInstructionsProperty,
} from "@/types/admin-arrival-instructions";
import {
  ARRIVAL_INSTRUCTIONS_MAX_LEAD_TIME_HOURS,
  ARRIVAL_INSTRUCTIONS_MIN_LEAD_TIME_HOURS,
} from "@/types/admin-arrival-instructions";

import { AdminPageHeader } from "./admin-page-header";
import { AdminSnackbar } from "./admin-snackbar";

const inputClassName =
  "h-11 w-full rounded-2xl border border-input bg-background px-3 text-sm text-foreground shadow-xs outline-none transition focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50 disabled:cursor-not-allowed disabled:opacity-50";
const textareaClassName =
  "min-h-28 w-full resize-y rounded-2xl border border-input bg-background px-3 py-3 text-sm leading-6 text-foreground shadow-xs outline-none transition focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50 disabled:cursor-not-allowed disabled:opacity-50";

type ArrivalInstructionsApiResponse = Readonly<{
  settings?: AdminArrivalInstructionsProperty;
  error?: Readonly<{
    code?: AdminArrivalInstructionsErrorCode;
  }>;
}>;

type ArrivalInstructionsDraft = Readonly<{
  enabled: boolean;
  leadTimeHours: number;
  exactAddress: string;
  mapUrl: string;
  instructionsEs: string;
  instructionsEn: string;
}>;

function toDraft(
  settings: AdminArrivalInstructionsProperty,
): ArrivalInstructionsDraft {
  return {
    enabled: settings.enabled,
    leadTimeHours: settings.leadTimeHours,
    exactAddress: settings.exactAddress,
    mapUrl: settings.mapUrl,
    instructionsEs: settings.instructionsEs,
    instructionsEn: settings.instructionsEn,
  };
}

export function AdminArrivalInstructionsEditor({
  initialSettings,
}: Readonly<{
  initialSettings: AdminArrivalInstructionsProperty;
}>) {
  const { locale, messages } = useLocale();
  const copy = messages.admin.accommodations.arrivalInstructions;
  const [settings, setSettings] =
    useState<AdminArrivalInstructionsProperty>(initialSettings);
  const [draft, setDraft] = useState<ArrivalInstructionsDraft>(() =>
    toDraft(initialSettings),
  );
  const [saving, setSaving] = useState(false);
  const [errorFeedback, setErrorFeedback] = useState<string | null>(null);
  const [successFeedback, setSuccessFeedback] = useState<string | null>(null);
  const propertyName =
    locale === "en" ? settings.propertyNameEn : settings.propertyNameEs;

  function clearFeedback(): void {
    setErrorFeedback(null);
    setSuccessFeedback(null);
  }

  function errorMessage(
    code: AdminArrivalInstructionsErrorCode | undefined,
  ): string {
    return code
      ? (copy.errors[code] ??
          copy.errors.ADMIN_ARRIVAL_INSTRUCTIONS_UNEXPECTED_ERROR)
      : copy.errors.ADMIN_ARRIVAL_INSTRUCTIONS_UNEXPECTED_ERROR;
  }

  async function save(): Promise<void> {
    clearFeedback();
    setSaving(true);

    try {
      const response = await fetch(
        `/api/admin/accommodations/${encodeURIComponent(
          settings.propertyId,
        )}/arrival-instructions`,
        {
          method: "PATCH",
          headers: {
            "content-type": "application/json",
          },
          body: JSON.stringify({
            expectedUpdatedAt: settings.updatedAt,
            ...draft,
          }),
        },
      );
      const payload = (await response.json()) as ArrivalInstructionsApiResponse;

      if (!response.ok || !payload.settings) {
        setErrorFeedback(errorMessage(payload.error?.code));
        return;
      }

      setSettings(payload.settings);
      setDraft(toDraft(payload.settings));
      setSuccessFeedback(copy.success.saved);
    } catch {
      setErrorFeedback(copy.errors.ADMIN_ARRIVAL_INSTRUCTIONS_UNEXPECTED_ERROR);
    } finally {
      setSaving(false);
    }
  }

  return (
    <>
      <AdminPageHeader
        actions={
          <Button asChild variant="outline">
            <Link href="/admin/accommodations">
              <ArrowLeft aria-hidden="true" />
              {copy.actions.backToAccommodations}
            </Link>
          </Button>
        }
        badge={copy.badge}
        description={copy.description}
        title={`${copy.title} · ${propertyName}`}
      />

      <AdminSnackbar
        closeLabel={messages.admin.feedback.dismiss}
        message={errorFeedback ?? successFeedback}
        onDismiss={clearFeedback}
        variant={errorFeedback ? "error" : "success"}
      />

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1.2fr)_minmax(20rem,0.8fr)]">
        <Card className="border-border/70 bg-card shadow-sm">
          <CardHeader>
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <CardTitle>{copy.sections.content}</CardTitle>
                <CardDescription className="mt-2">
                  {copy.notes.contentOwnership}
                </CardDescription>
              </div>
              <Badge variant={draft.enabled ? "default" : "secondary"}>
                {draft.enabled ? copy.states.enabled : copy.states.disabled}
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="grid gap-5">
            <LabeledField label={copy.labels.exactAddress}>
              <textarea
                className={textareaClassName}
                disabled={saving}
                maxLength={500}
                onChange={(event: ChangeEvent<HTMLTextAreaElement>) =>
                  setDraft((current) => ({
                    ...current,
                    exactAddress: event.target.value,
                  }))
                }
                placeholder={copy.placeholders.exactAddress}
                value={draft.exactAddress}
              />
            </LabeledField>

            <LabeledField label={copy.labels.mapUrl}>
              <input
                className={inputClassName}
                disabled={saving}
                inputMode="url"
                maxLength={500}
                onChange={(event: ChangeEvent<HTMLInputElement>) =>
                  setDraft((current) => ({
                    ...current,
                    mapUrl: event.target.value,
                  }))
                }
                placeholder={copy.placeholders.mapUrl}
                type="url"
                value={draft.mapUrl}
              />
            </LabeledField>

            <div className="grid gap-5 lg:grid-cols-2">
              <LabeledField label={copy.labels.instructionsEs}>
                <textarea
                  className={textareaClassName}
                  disabled={saving}
                  maxLength={5_000}
                  onChange={(event: ChangeEvent<HTMLTextAreaElement>) =>
                    setDraft((current) => ({
                      ...current,
                      instructionsEs: event.target.value,
                    }))
                  }
                  placeholder={copy.placeholders.instructionsEs}
                  value={draft.instructionsEs}
                />
              </LabeledField>
              <LabeledField label={copy.labels.instructionsEn}>
                <textarea
                  className={textareaClassName}
                  disabled={saving}
                  maxLength={5_000}
                  onChange={(event: ChangeEvent<HTMLTextAreaElement>) =>
                    setDraft((current) => ({
                      ...current,
                      instructionsEn: event.target.value,
                    }))
                  }
                  placeholder={copy.placeholders.instructionsEn}
                  value={draft.instructionsEn}
                />
              </LabeledField>
            </div>
          </CardContent>
        </Card>

        <div className="grid h-fit gap-6">
          <Card className="border-border/70 bg-card shadow-sm">
            <CardHeader>
              <CardTitle>{copy.sections.schedule}</CardTitle>
              <CardDescription>{copy.notes.schedule}</CardDescription>
            </CardHeader>
            <CardContent className="grid gap-5">
              <div className="rounded-2xl border border-border bg-muted/30 p-4">
                <p className="text-xs uppercase tracking-wide text-muted-foreground">
                  {copy.labels.propertyCheckIn}
                </p>
                <p className="mt-2 flex items-center gap-2 font-medium">
                  <Clock3 aria-hidden="true" className="size-4" />
                  {settings.checkInTime}
                </p>
              </div>

              <LabeledField label={copy.labels.leadTimeHours}>
                <input
                  className={inputClassName}
                  disabled={saving}
                  max={ARRIVAL_INSTRUCTIONS_MAX_LEAD_TIME_HOURS}
                  min={ARRIVAL_INSTRUCTIONS_MIN_LEAD_TIME_HOURS}
                  onChange={(event: ChangeEvent<HTMLInputElement>) =>
                    setDraft((current) => ({
                      ...current,
                      leadTimeHours: Number(event.target.value),
                    }))
                  }
                  type="number"
                  value={draft.leadTimeHours}
                />
              </LabeledField>

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
                <MailClock aria-hidden="true" />
                {draft.enabled ? copy.actions.disable : copy.actions.enable}
              </Button>
            </CardContent>
          </Card>

          <div className="rounded-2xl border border-amber-500/30 bg-amber-500/10 p-4 text-sm leading-6 text-foreground">
            <p className="font-semibold">{copy.notes.securityTitle}</p>
            <p className="mt-1 text-muted-foreground">
              {copy.notes.securityDescription}
            </p>
          </div>

          <Button
            disabled={saving}
            onClick={() => void save()}
            size="lg"
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
      </div>
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
