"use client";

import Link from "next/link";
import { ArrowLeft, Loader2, Save } from "lucide-react";
import { useMemo, useState } from "react";

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
  AdminAccommodationContentErrorCode,
  AdminAccommodationContentProperty,
} from "@/types/admin-accommodation-content";

import { AdminPageHeader } from "./admin-page-header";
import { AdminSnackbar } from "./admin-snackbar";

type ContentDraft = Readonly<{
  nameEs: string;
  nameEn: string;
  shortDescriptionEs: string;
  shortDescriptionEn: string;
  longDescriptionEs: string;
  longDescriptionEn: string;
  maxGuests: string;
  bedrooms: string;
  bathrooms: string;
  checkInTime: string;
  checkOutTime: string;
}>;

type ContentApiResponse = Readonly<{
  property?: AdminAccommodationContentProperty;
  error?: Readonly<{
    code?: AdminAccommodationContentErrorCode;
  }>;
}>;

const inputClassName =
  "h-11 w-full rounded-2xl border border-input bg-background px-3 text-sm text-foreground shadow-xs outline-none transition focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50 disabled:cursor-not-allowed disabled:opacity-50 read-only:bg-muted/40 read-only:text-muted-foreground";
const textareaClassName =
  "min-h-28 w-full resize-y rounded-2xl border border-input bg-background px-3 py-3 text-sm leading-6 text-foreground shadow-xs outline-none transition focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50 disabled:cursor-not-allowed disabled:opacity-50";

function buildDraft(property: AdminAccommodationContentProperty): ContentDraft {
  return {
    nameEs: property.nameEs,
    nameEn: property.nameEn,
    shortDescriptionEs: property.shortDescriptionEs,
    shortDescriptionEn: property.shortDescriptionEn,
    longDescriptionEs: property.longDescriptionEs,
    longDescriptionEn: property.longDescriptionEn,
    maxGuests: String(property.maxGuests),
    bedrooms: String(property.bedrooms),
    bathrooms: String(property.bathrooms),
    checkInTime: property.checkInTime,
    checkOutTime: property.checkOutTime ?? "",
  };
}

export function AdminAccommodationContentEditor({
  initialProperty,
}: Readonly<{
  initialProperty: AdminAccommodationContentProperty;
}>) {
  const { locale, messages } = useLocale();
  const copy = messages.admin.accommodations.content;
  const overviewCopy = messages.admin.accommodations.overview;
  const [property, setProperty] =
    useState<AdminAccommodationContentProperty>(initialProperty);
  const [draft, setDraft] = useState<ContentDraft>(() => buildDraft(initialProperty));
  const [isSaving, setIsSaving] = useState(false);
  const [errorFeedback, setErrorFeedback] = useState<string | null>(null);
  const [successFeedback, setSuccessFeedback] = useState<string | null>(null);
  const currentPropertyName = locale === "en" ? property.nameEn : property.nameEs;
  const isDirty = useMemo(
    () => JSON.stringify(draft) !== JSON.stringify(buildDraft(property)),
    [draft, property],
  );

  function updateDraft(field: keyof ContentDraft, value: string) {
    setDraft((current) => ({
      ...current,
      [field]: value,
    }));
  }

  function errorMessage(code: AdminAccommodationContentErrorCode | undefined) {
    return code
      ? copy.errors[code] ?? copy.errors.ACCOMMODATION_CONTENT_UNEXPECTED_ERROR
      : copy.errors.ACCOMMODATION_CONTENT_UNEXPECTED_ERROR;
  }

  async function saveContent() {
    setIsSaving(true);
    setErrorFeedback(null);
    setSuccessFeedback(null);

    try {
      const response = await fetch("/api/admin/accommodation-content", {
        method: "PATCH",
        headers: {
          "content-type": "application/json",
        },
        body: JSON.stringify({
          propertyId: property.id,
          expectedUpdatedAt: property.updatedAt,
          nameEs: draft.nameEs,
          nameEn: draft.nameEn,
          shortDescriptionEs: draft.shortDescriptionEs,
          shortDescriptionEn: draft.shortDescriptionEn,
          longDescriptionEs: draft.longDescriptionEs,
          longDescriptionEn: draft.longDescriptionEn,
          maxGuests: Number(draft.maxGuests),
          bedrooms: Number(draft.bedrooms),
          bathrooms: Number(draft.bathrooms),
          checkInTime: draft.checkInTime,
          checkOutTime: draft.checkOutTime.trim() || null,
        }),
      });
      const payload = (await response.json()) as ContentApiResponse;

      if (!response.ok || !payload.property) {
        setErrorFeedback(errorMessage(payload.error?.code));
        return;
      }

      setProperty(payload.property);
      setDraft(buildDraft(payload.property));
      setSuccessFeedback(copy.success.contentSaved);
    } catch {
      setErrorFeedback(copy.errors.ACCOMMODATION_CONTENT_UNEXPECTED_ERROR);
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <>
      <AdminPageHeader
        actions={
          <Button asChild className="rounded-full" variant="outline">
            <Link href="/admin/accommodations">
              <ArrowLeft aria-hidden="true" />
              {copy.actions.backToAccommodations}
            </Link>
          </Button>
        }
        badge={copy.badge}
        description={copy.description}
        title={`${copy.title}: ${currentPropertyName}`}
      />

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

      <form
        className="space-y-6"
        onSubmit={(event) => {
          event.preventDefault();
          void saveContent();
        }}
      >
        <Card className="border-border/70 bg-card shadow-sm">
          <CardHeader>
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <CardTitle>{copy.sections.identity}</CardTitle>
                <CardDescription className="mt-2">
                  {copy.notes.requiredLanguages}
                </CardDescription>
              </div>
              <Badge variant="secondary">
                {overviewCopy.statuses[property.status]}
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="grid gap-5 md:grid-cols-2">
            <label className="grid gap-2 text-sm font-medium">
              {copy.labels.nameEs}
              <input
                className={inputClassName}
                disabled={isSaving}
                maxLength={120}
                minLength={2}
                onChange={(event) => updateDraft("nameEs", event.target.value)}
                required
                value={draft.nameEs}
              />
            </label>
            <label className="grid gap-2 text-sm font-medium">
              {copy.labels.nameEn}
              <input
                className={inputClassName}
                disabled={isSaving}
                maxLength={120}
                minLength={2}
                onChange={(event) => updateDraft("nameEn", event.target.value)}
                required
                value={draft.nameEn}
              />
            </label>
            <label className="grid gap-2 text-sm font-medium md:col-span-2">
              {copy.labels.slug}
              <input className={inputClassName} readOnly value={property.slug} />
            </label>
          </CardContent>
        </Card>

        <Card className="border-border/70 bg-card shadow-sm">
          <CardHeader>
            <CardTitle>{copy.sections.descriptions}</CardTitle>
            <CardDescription>{copy.notes.publicImpact}</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-5 lg:grid-cols-2">
            <label className="grid gap-2 text-sm font-medium">
              {copy.labels.shortDescriptionEs}
              <textarea
                className={textareaClassName}
                disabled={isSaving}
                maxLength={500}
                minLength={20}
                onChange={(event) =>
                  updateDraft("shortDescriptionEs", event.target.value)
                }
                required
                value={draft.shortDescriptionEs}
              />
            </label>
            <label className="grid gap-2 text-sm font-medium">
              {copy.labels.shortDescriptionEn}
              <textarea
                className={textareaClassName}
                disabled={isSaving}
                maxLength={500}
                minLength={20}
                onChange={(event) =>
                  updateDraft("shortDescriptionEn", event.target.value)
                }
                required
                value={draft.shortDescriptionEn}
              />
            </label>
            <label className="grid gap-2 text-sm font-medium">
              {copy.labels.longDescriptionEs}
              <textarea
                className={`${textareaClassName} min-h-52`}
                disabled={isSaving}
                maxLength={5000}
                minLength={50}
                onChange={(event) =>
                  updateDraft("longDescriptionEs", event.target.value)
                }
                required
                value={draft.longDescriptionEs}
              />
            </label>
            <label className="grid gap-2 text-sm font-medium">
              {copy.labels.longDescriptionEn}
              <textarea
                className={`${textareaClassName} min-h-52`}
                disabled={isSaving}
                maxLength={5000}
                minLength={50}
                onChange={(event) =>
                  updateDraft("longDescriptionEn", event.target.value)
                }
                required
                value={draft.longDescriptionEn}
              />
            </label>
          </CardContent>
        </Card>

        <div className="grid gap-6 xl:grid-cols-2">
          <Card className="border-border/70 bg-card shadow-sm">
            <CardHeader>
              <CardTitle>{copy.sections.capacity}</CardTitle>
              <CardDescription>{copy.notes.capacityRange}</CardDescription>
            </CardHeader>
            <CardContent className="grid gap-5 sm:grid-cols-3">
              {(
                [
                  ["maxGuests", copy.labels.maxGuests],
                  ["bedrooms", copy.labels.bedrooms],
                  ["bathrooms", copy.labels.bathrooms],
                ] as const
              ).map(([field, label]) => (
                <label className="grid gap-2 text-sm font-medium" key={field}>
                  {label}
                  <input
                    className={inputClassName}
                    disabled={isSaving}
                    inputMode="numeric"
                    max={20}
                    min={1}
                    onChange={(event) => updateDraft(field, event.target.value)}
                    required
                    type="number"
                    value={draft[field]}
                  />
                </label>
              ))}
            </CardContent>
          </Card>

          <Card className="border-border/70 bg-card shadow-sm">
            <CardHeader>
              <CardTitle>{copy.sections.arrival}</CardTitle>
              <CardDescription>{copy.notes.timeFormat}</CardDescription>
            </CardHeader>
            <CardContent className="grid gap-5 sm:grid-cols-2">
              <label className="grid gap-2 text-sm font-medium">
                {copy.labels.checkInTime}
                <input
                  className={inputClassName}
                  disabled={isSaving}
                  maxLength={30}
                  onChange={(event) =>
                    updateDraft("checkInTime", event.target.value)
                  }
                  required
                  value={draft.checkInTime}
                />
              </label>
              <label className="grid gap-2 text-sm font-medium">
                {copy.labels.checkOutTime}
                <input
                  className={inputClassName}
                  disabled={isSaving}
                  maxLength={30}
                  onChange={(event) =>
                    updateDraft("checkOutTime", event.target.value)
                  }
                  value={draft.checkOutTime}
                />
              </label>
            </CardContent>
          </Card>
        </div>

        <div className="rounded-2xl border border-border bg-muted/30 p-4 text-sm leading-6 text-muted-foreground">
          {copy.notes.immutableFields}
        </div>

        <div className="flex justify-end">
          <Button disabled={isSaving || !isDirty} type="submit">
            {isSaving ? (
              <Loader2 aria-hidden="true" className="animate-spin" />
            ) : (
              <Save aria-hidden="true" />
            )}
            {isSaving ? copy.actions.saving : copy.actions.saveContent}
          </Button>
        </div>
      </form>
    </>
  );
}
