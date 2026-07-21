"use client";

import Link from "next/link";
import { Loader2, Save } from "lucide-react";
import { type ChangeEvent, type ReactNode, useState } from "react";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useLocale } from "@/features/i18n";
import { AmenityIcon } from "@/features/properties";
import type {
  AdminCatalogAmenity,
  AdminCatalogErrorCode,
  AdminCatalogHouseRule,
  AdminCatalogSettings,
  AdminCatalogTab,
} from "@/types/admin-catalogs";
import {
  amenityIconNames,
  type AmenityIconName,
} from "@/types/amenity";

import { AdminPageHeader } from "./admin-page-header";
import { AdminSnackbar } from "./admin-snackbar";

const inputClassName =
  "h-11 w-full rounded-2xl border border-input bg-background px-3 text-sm text-foreground shadow-xs outline-none transition focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50 disabled:cursor-not-allowed disabled:opacity-50";
const textareaClassName =
  "min-h-24 w-full resize-y rounded-2xl border border-input bg-background px-3 py-3 text-sm leading-6 text-foreground shadow-xs outline-none transition focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50 disabled:cursor-not-allowed disabled:opacity-50";

type AmenityDraft = Readonly<{
  nameEs: string;
  nameEn: string;
  icon: AmenityIconName;
}>;

type HouseRuleDraft = Readonly<{
  titleEs: string;
  titleEn: string;
  descriptionEs: string;
  descriptionEn: string;
}>;

type CatalogApiResponse = Readonly<{
  settings?: AdminCatalogSettings;
  error?: Readonly<{
    code?: AdminCatalogErrorCode;
  }>;
}>;

function buildAmenityDrafts(
  settings: AdminCatalogSettings,
): Record<string, AmenityDraft> {
  return Object.fromEntries(
    settings.amenities.map((amenity) => [
      amenity.id,
      {
        nameEs: amenity.nameEs,
        nameEn: amenity.nameEn,
        icon: amenity.icon,
      },
    ]),
  );
}

function buildHouseRuleDrafts(
  settings: AdminCatalogSettings,
): Record<string, HouseRuleDraft> {
  return Object.fromEntries(
    settings.houseRules.map((houseRule) => [
      houseRule.id,
      {
        titleEs: houseRule.titleEs,
        titleEn: houseRule.titleEn,
        descriptionEs: houseRule.descriptionEs,
        descriptionEn: houseRule.descriptionEn,
      },
    ]),
  );
}

export function AdminCatalogManager({
  initialSettings,
  selectedCatalog,
}: Readonly<{
  initialSettings: AdminCatalogSettings;
  selectedCatalog: AdminCatalogTab;
}>) {
  const { locale, messages } = useLocale();
  const copy = messages.admin.catalogs;
  const [settings, setSettings] =
    useState<AdminCatalogSettings>(initialSettings);
  const [amenityDrafts, setAmenityDrafts] = useState<
    Record<string, AmenityDraft>
  >(() => buildAmenityDrafts(initialSettings));
  const [houseRuleDrafts, setHouseRuleDrafts] = useState<
    Record<string, HouseRuleDraft>
  >(() => buildHouseRuleDrafts(initialSettings));
  const [busyKey, setBusyKey] = useState<string | null>(null);
  const [errorFeedback, setErrorFeedback] = useState<string | null>(null);
  const [successFeedback, setSuccessFeedback] = useState<string | null>(null);
  const isBusy = busyKey !== null;

  function categoryLabel(category: string | null): string {
    if (!category) {
      return copy.labels.noCategory;
    }

    return (
      copy.categoryLabels[category as keyof typeof copy.categoryLabels] ??
      copy.labels.noCategory
    );
  }

  function errorMessage(code: AdminCatalogErrorCode | undefined): string {
    return code
      ? copy.errors[code] ?? copy.errors.ADMIN_CATALOG_UNEXPECTED_ERROR
      : copy.errors.ADMIN_CATALOG_UNEXPECTED_ERROR;
  }

  function clearFeedback(): void {
    setErrorFeedback(null);
    setSuccessFeedback(null);
  }

  function applySettings(nextSettings: AdminCatalogSettings): void {
    setSettings(nextSettings);
    setAmenityDrafts(buildAmenityDrafts(nextSettings));
    setHouseRuleDrafts(buildHouseRuleDrafts(nextSettings));
  }

  async function requestSettings(body: object): Promise<boolean> {
    const response = await fetch("/api/admin/catalogs", {
      method: "PATCH",
      headers: {
        "content-type": "application/json",
      },
      body: JSON.stringify(body),
    });
    const payload = (await response.json()) as CatalogApiResponse;

    if (!response.ok || !payload.settings) {
      setErrorFeedback(errorMessage(payload.error?.code));
      return false;
    }

    applySettings(payload.settings);
    return true;
  }

  async function saveAmenity(amenity: AdminCatalogAmenity): Promise<void> {
    const draft = amenityDrafts[amenity.id];

    if (!draft) {
      return;
    }

    clearFeedback();
    setBusyKey(`amenity:${amenity.id}`);

    try {
      const saved = await requestSettings({
        action: "update-amenity",
        amenityId: amenity.id,
        expectedUpdatedAt: amenity.updatedAt,
        nameEs: draft.nameEs,
        nameEn: draft.nameEn,
        icon: draft.icon,
      });

      if (saved) {
        setSuccessFeedback(copy.success.amenitySaved);
      }
    } catch {
      setErrorFeedback(copy.errors.ADMIN_CATALOG_UNEXPECTED_ERROR);
    } finally {
      setBusyKey(null);
    }
  }

  async function saveHouseRule(
    houseRule: AdminCatalogHouseRule,
  ): Promise<void> {
    const draft = houseRuleDrafts[houseRule.id];

    if (!draft) {
      return;
    }

    clearFeedback();
    setBusyKey(`house-rule:${houseRule.id}`);

    try {
      const saved = await requestSettings({
        action: "update-house-rule",
        houseRuleId: houseRule.id,
        expectedUpdatedAt: houseRule.updatedAt,
        titleEs: draft.titleEs,
        titleEn: draft.titleEn,
        descriptionEs: draft.descriptionEs,
        descriptionEn: draft.descriptionEn,
      });

      if (saved) {
        setSuccessFeedback(copy.success.houseRuleSaved);
      }
    } catch {
      setErrorFeedback(copy.errors.ADMIN_CATALOG_UNEXPECTED_ERROR);
    } finally {
      setBusyKey(null);
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

      <div className="mb-6 flex gap-2 overflow-x-auto pb-1">
        <Button
          asChild
          variant={selectedCatalog === "amenities" ? "default" : "outline"}
        >
          <Link
            aria-current={selectedCatalog === "amenities" ? "page" : undefined}
            href="/admin/catalogs?catalog=amenities"
          >
            {copy.tabs.amenities}
          </Link>
        </Button>
        <Button
          asChild
          variant={
            selectedCatalog === "house-rules" ? "default" : "outline"
          }
        >
          <Link
            aria-current={
              selectedCatalog === "house-rules" ? "page" : undefined
            }
            href="/admin/catalogs?catalog=house-rules"
          >
            {copy.tabs.houseRules}
          </Link>
        </Button>
      </div>

      {selectedCatalog === "amenities" ? (
        <section aria-labelledby="amenity-catalog-heading">
          <div className="mb-5">
            <h2
              className="text-2xl font-semibold tracking-tight"
              id="amenity-catalog-heading"
            >
              {copy.sections.amenities}
            </h2>
            <p className="mt-2 max-w-3xl text-sm leading-6 text-muted-foreground">
              {copy.notes.amenities}
            </p>
          </div>

          <div className="grid gap-5 xl:grid-cols-2">
            {settings.amenities.map((amenity) => {
              const draft = amenityDrafts[amenity.id];

              if (!draft) {
                return null;
              }

              return (
                <Card
                  className="border-border/70 bg-card shadow-sm"
                  key={amenity.id}
                >
                  <CardHeader>
                    <div className="flex items-center gap-3">
                      <span className="flex size-11 shrink-0 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                        <AmenityIcon className="size-5" name={draft.icon} />
                      </span>
                      <div>
                        <CardTitle>
                          {locale === "en" ? amenity.nameEn : amenity.nameEs}
                        </CardTitle>
                        <CardDescription className="mt-1">
                          {amenity.key}
                        </CardDescription>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-5">
                    <div className="grid gap-4 sm:grid-cols-2">
                      <LabeledField label={copy.labels.nameEs}>
                        <input
                          aria-label={copy.labels.nameEs}
                          className={inputClassName}
                          disabled={isBusy}
                          maxLength={160}
                          onChange={(event: ChangeEvent<HTMLInputElement>) =>
                            setAmenityDrafts((current) => ({
                              ...current,
                              [amenity.id]: {
                                ...draft,
                                nameEs: event.target.value,
                              },
                            }))
                          }
                          value={draft.nameEs}
                        />
                      </LabeledField>
                      <LabeledField label={copy.labels.nameEn}>
                        <input
                          aria-label={copy.labels.nameEn}
                          className={inputClassName}
                          disabled={isBusy}
                          maxLength={160}
                          onChange={(event: ChangeEvent<HTMLInputElement>) =>
                            setAmenityDrafts((current) => ({
                              ...current,
                              [amenity.id]: {
                                ...draft,
                                nameEn: event.target.value,
                              },
                            }))
                          }
                          value={draft.nameEn}
                        />
                      </LabeledField>
                    </div>

                    <div className="grid gap-4 sm:grid-cols-2">
                      <LabeledField label={copy.labels.icon}>
                        <Select
                          disabled={isBusy}
                          onValueChange={(value: string) =>
                            setAmenityDrafts((current) => ({
                              ...current,
                              [amenity.id]: {
                                ...draft,
                                icon: value as AmenityIconName,
                              },
                            }))
                          }
                          value={draft.icon}
                        >
                          <SelectTrigger aria-label={copy.labels.icon}>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {amenityIconNames.map((iconName) => (
                              <SelectItem key={iconName} value={iconName}>
                                <span className="flex items-center gap-2">
                                  <AmenityIcon
                                    className="size-4"
                                    name={iconName}
                                  />
                                  {copy.iconLabels[iconName]}
                                </span>
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </LabeledField>
                      <LabeledField label={copy.labels.category}>
                        <div className="flex h-11 items-center rounded-2xl border border-input bg-muted/40 px-3 text-sm text-muted-foreground">
                          {categoryLabel(amenity.category)}
                        </div>
                      </LabeledField>
                    </div>

                    <Button
                      disabled={isBusy}
                      onClick={() => void saveAmenity(amenity)}
                      type="button"
                    >
                      {busyKey === `amenity:${amenity.id}` ? (
                        <Loader2 aria-hidden="true" className="animate-spin" />
                      ) : (
                        <Save aria-hidden="true" />
                      )}
                      {busyKey === `amenity:${amenity.id}`
                        ? copy.actions.saving
                        : copy.actions.saveAmenity}
                    </Button>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </section>
      ) : (
        <section aria-labelledby="house-rule-catalog-heading">
          <div className="mb-5">
            <h2
              className="text-2xl font-semibold tracking-tight"
              id="house-rule-catalog-heading"
            >
              {copy.sections.houseRules}
            </h2>
            <p className="mt-2 max-w-3xl text-sm leading-6 text-muted-foreground">
              {copy.notes.houseRules}
            </p>
          </div>

          <div className="grid gap-5 xl:grid-cols-2">
            {settings.houseRules.map((houseRule) => {
              const draft = houseRuleDrafts[houseRule.id];

              if (!draft) {
                return null;
              }

              return (
                <Card
                  className="border-border/70 bg-card shadow-sm"
                  key={houseRule.id}
                >
                  <CardHeader>
                    <CardTitle>
                      {locale === "en"
                        ? houseRule.titleEn
                        : houseRule.titleEs}
                    </CardTitle>
                    <CardDescription>{houseRule.key}</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-5">
                    <div className="grid gap-4 sm:grid-cols-2">
                      <LabeledField label={copy.labels.titleEs}>
                        <input
                          aria-label={copy.labels.titleEs}
                          className={inputClassName}
                          disabled={isBusy}
                          maxLength={160}
                          onChange={(event: ChangeEvent<HTMLInputElement>) =>
                            setHouseRuleDrafts((current) => ({
                              ...current,
                              [houseRule.id]: {
                                ...draft,
                                titleEs: event.target.value,
                              },
                            }))
                          }
                          value={draft.titleEs}
                        />
                      </LabeledField>
                      <LabeledField label={copy.labels.titleEn}>
                        <input
                          aria-label={copy.labels.titleEn}
                          className={inputClassName}
                          disabled={isBusy}
                          maxLength={160}
                          onChange={(event: ChangeEvent<HTMLInputElement>) =>
                            setHouseRuleDrafts((current) => ({
                              ...current,
                              [houseRule.id]: {
                                ...draft,
                                titleEn: event.target.value,
                              },
                            }))
                          }
                          value={draft.titleEn}
                        />
                      </LabeledField>
                    </div>

                    <div className="grid gap-4 sm:grid-cols-2">
                      <LabeledField label={copy.labels.descriptionEs}>
                        <textarea
                          aria-label={copy.labels.descriptionEs}
                          className={textareaClassName}
                          disabled={isBusy}
                          maxLength={500}
                          onChange={(
                            event: ChangeEvent<HTMLTextAreaElement>,
                          ) =>
                            setHouseRuleDrafts((current) => ({
                              ...current,
                              [houseRule.id]: {
                                ...draft,
                                descriptionEs: event.target.value,
                              },
                            }))
                          }
                          value={draft.descriptionEs}
                        />
                      </LabeledField>
                      <LabeledField label={copy.labels.descriptionEn}>
                        <textarea
                          aria-label={copy.labels.descriptionEn}
                          className={textareaClassName}
                          disabled={isBusy}
                          maxLength={500}
                          onChange={(
                            event: ChangeEvent<HTMLTextAreaElement>,
                          ) =>
                            setHouseRuleDrafts((current) => ({
                              ...current,
                              [houseRule.id]: {
                                ...draft,
                                descriptionEn: event.target.value,
                              },
                            }))
                          }
                          value={draft.descriptionEn}
                        />
                      </LabeledField>
                    </div>

                    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                      <p className="text-xs text-muted-foreground">
                        {copy.labels.category}: {categoryLabel(houseRule.category)}
                      </p>
                      <Button
                        disabled={isBusy}
                        onClick={() => void saveHouseRule(houseRule)}
                        type="button"
                      >
                        {busyKey === `house-rule:${houseRule.id}` ? (
                          <Loader2
                            aria-hidden="true"
                            className="animate-spin"
                          />
                        ) : (
                          <Save aria-hidden="true" />
                        )}
                        {busyKey === `house-rule:${houseRule.id}`
                          ? copy.actions.saving
                          : copy.actions.saveHouseRule}
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </section>
      )}
    </>
  );
}

function LabeledField({
  children,
  label,
}: Readonly<{
  children: ReactNode;
  label: string;
}>) {
  return (
    <div className="grid gap-2 text-sm font-medium text-foreground">
      <span>{label}</span>
      {children}
    </div>
  );
}
