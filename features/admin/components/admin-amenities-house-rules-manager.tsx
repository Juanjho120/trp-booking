"use client";

import Link from "next/link";
import {
  ArrowLeft,
  Check,
  CheckCircle2,
  Circle,
  Loader2,
  Save,
} from "lucide-react";
import { type ChangeEvent, type ReactNode, useMemo, useState } from "react";

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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useLocale } from "@/features/i18n";
import { AmenityIcon } from "@/features/properties";
import type {
  AdminAmenityCatalogItem,
  AdminAmenityHouseRuleErrorCode,
  AdminAmenityHouseRuleSettings,
  AdminHouseRuleCatalogItem,
} from "@/types/admin-amenities-house-rules";
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

type AmenitiesRulesApiResponse = Readonly<{
  settings?: AdminAmenityHouseRuleSettings;
  error?: Readonly<{
    code?: AdminAmenityHouseRuleErrorCode;
  }>;
}>;

function buildAmenityDrafts(
  settings: AdminAmenityHouseRuleSettings,
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
  settings: AdminAmenityHouseRuleSettings,
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

function getAssignedAmenityIds(
  settings: AdminAmenityHouseRuleSettings,
): string[] {
  return settings.amenities
    .filter((amenity) => amenity.assigned)
    .map((amenity) => amenity.id);
}

function getAssignedHouseRuleIds(
  settings: AdminAmenityHouseRuleSettings,
): string[] {
  return settings.houseRules
    .filter((houseRule) => houseRule.assigned)
    .map((houseRule) => houseRule.id);
}

function sameIds(first: readonly string[], second: readonly string[]): boolean {
  return (
    JSON.stringify([...first].sort()) === JSON.stringify([...second].sort())
  );
}

export function AdminAmenitiesHouseRulesManager({
  initialSettings,
}: Readonly<{
  initialSettings: AdminAmenityHouseRuleSettings;
}>) {
  const { locale, messages } = useLocale();
  const copy = messages.admin.accommodations.amenitiesRules;
  const statusCopy = messages.admin.accommodations.overview.statuses;
  const [settings, setSettings] =
    useState<AdminAmenityHouseRuleSettings>(initialSettings);
  const [amenityDrafts, setAmenityDrafts] = useState<
    Record<string, AmenityDraft>
  >(() => buildAmenityDrafts(initialSettings));
  const [houseRuleDrafts, setHouseRuleDrafts] = useState<
    Record<string, HouseRuleDraft>
  >(() => buildHouseRuleDrafts(initialSettings));
  const [selectedAmenityIds, setSelectedAmenityIds] = useState<string[]>(() =>
    getAssignedAmenityIds(initialSettings),
  );
  const [selectedHouseRuleIds, setSelectedHouseRuleIds] = useState<string[]>(
    () => getAssignedHouseRuleIds(initialSettings),
  );
  const [busyKey, setBusyKey] = useState<string | null>(null);
  const [errorFeedback, setErrorFeedback] = useState<string | null>(null);
  const [successFeedback, setSuccessFeedback] = useState<string | null>(null);
  const propertyName =
    locale === "en" ? settings.property.nameEn : settings.property.nameEs;
  const assignmentsDirty = useMemo(
    () =>
      !sameIds(selectedAmenityIds, getAssignedAmenityIds(settings)) ||
      !sameIds(selectedHouseRuleIds, getAssignedHouseRuleIds(settings)),
    [selectedAmenityIds, selectedHouseRuleIds, settings],
  );
  const isBusy = busyKey !== null;

  function errorMessage(
    code: AdminAmenityHouseRuleErrorCode | undefined,
  ): string {
    return code
      ? copy.errors[code] ?? copy.errors.AMENITY_HOUSE_RULE_UNEXPECTED_ERROR
      : copy.errors.AMENITY_HOUSE_RULE_UNEXPECTED_ERROR;
  }


  function categoryLabel(category: string | null): string {
    if (!category) {
      return copy.labels.noCategory;
    }

    return (
      copy.categoryLabels[
        category as keyof typeof copy.categoryLabels
      ] ?? copy.labels.noCategory
    );
  }

  function clearFeedback(): void {
    setErrorFeedback(null);
    setSuccessFeedback(null);
  }

  function applySettings(nextSettings: AdminAmenityHouseRuleSettings): void {
    setSettings(nextSettings);
    setAmenityDrafts(buildAmenityDrafts(nextSettings));
    setHouseRuleDrafts(buildHouseRuleDrafts(nextSettings));
    setSelectedAmenityIds(getAssignedAmenityIds(nextSettings));
    setSelectedHouseRuleIds(getAssignedHouseRuleIds(nextSettings));
  }

  function toggleAmenity(amenityId: string): void {
    setSelectedAmenityIds((current) =>
      current.includes(amenityId)
        ? current.filter((id) => id !== amenityId)
        : [...current, amenityId],
    );
  }

  function toggleHouseRule(houseRuleId: string): void {
    setSelectedHouseRuleIds((current) =>
      current.includes(houseRuleId)
        ? current.filter((id) => id !== houseRuleId)
        : [...current, houseRuleId],
    );
  }

  async function requestSettings(body: object): Promise<boolean> {
    const response = await fetch("/api/admin/amenities-house-rules", {
      method: "PATCH",
      headers: {
        "content-type": "application/json",
      },
      body: JSON.stringify(body),
    });
    const payload = (await response.json()) as AmenitiesRulesApiResponse;

    if (!response.ok || !payload.settings) {
      setErrorFeedback(errorMessage(payload.error?.code));
      return false;
    }

    applySettings(payload.settings);
    return true;
  }

  async function saveAssignments(): Promise<void> {
    clearFeedback();

    if (
      selectedAmenityIds.length === 0 ||
      selectedHouseRuleIds.length === 0
    ) {
      setErrorFeedback(copy.errors.AMENITY_HOUSE_RULE_MINIMUM_REQUIRED);
      return;
    }

    setBusyKey("assignments");

    try {
      const saved = await requestSettings({
        action: "update-assignments",
        propertyId: settings.property.id,
        expectedRevision: settings.revision,
        amenityIds: selectedAmenityIds,
        houseRuleIds: selectedHouseRuleIds,
      });

      if (saved) {
        setSuccessFeedback(copy.success.assignmentsSaved);
      }
    } catch {
      setErrorFeedback(copy.errors.AMENITY_HOUSE_RULE_UNEXPECTED_ERROR);
    } finally {
      setBusyKey(null);
    }
  }

  async function saveAmenity(amenity: AdminAmenityCatalogItem): Promise<void> {
    const draft = amenityDrafts[amenity.id];

    if (!draft) {
      return;
    }

    clearFeedback();
    setBusyKey(`amenity:${amenity.id}`);

    try {
      const saved = await requestSettings({
        action: "update-amenity",
        propertyId: settings.property.id,
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
      setErrorFeedback(copy.errors.AMENITY_HOUSE_RULE_UNEXPECTED_ERROR);
    } finally {
      setBusyKey(null);
    }
  }

  async function saveHouseRule(
    houseRule: AdminHouseRuleCatalogItem,
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
        propertyId: settings.property.id,
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
      setErrorFeedback(copy.errors.AMENITY_HOUSE_RULE_UNEXPECTED_ERROR);
    } finally {
      setBusyKey(null);
    }
  }

  return (
    <>
      <AdminPageHeader
        actions={
          <div className="flex flex-wrap gap-2">
            <Button asChild className="rounded-full" variant="outline">
              <Link href="/admin/accommodations">
                <ArrowLeft aria-hidden="true" />
                {copy.actions.backToAccommodations}
              </Link>
            </Button>
            <Button asChild className="rounded-full" variant="outline">
              <Link href={`/admin/accommodations/${settings.property.id}`}>
                {copy.actions.backToContent}
              </Link>
            </Button>
          </div>
        }
        badge={copy.badge}
        description={copy.description}
        title={`${copy.title}: ${propertyName}`}
      />

      <AdminSnackbar
        closeLabel={messages.admin.feedback.dismiss}
        message={errorFeedback ?? successFeedback}
        onDismiss={() => {
          setErrorFeedback(null);
          setSuccessFeedback(null);
        }}
        variant={errorFeedback ? "error" : "success"}
      />

      <Card className="border-border/70 bg-card shadow-sm">
        <CardHeader>
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <CardTitle>{copy.sections.assignments}</CardTitle>
              <CardDescription className="mt-2 max-w-3xl">
                {copy.notes.assignment}
              </CardDescription>
            </div>
            <Badge variant="secondary">
              {statusCopy[settings.property.status]}
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="space-y-8">
          <AssignmentGroup
            disabled={isBusy}
            items={settings.amenities.map((amenity) => ({
              id: amenity.id,
              label: locale === "en" ? amenity.nameEn : amenity.nameEs,
              assigned: selectedAmenityIds.includes(amenity.id),
            }))}
            onToggle={toggleAmenity}
            title={copy.sections.amenityAssignments}
          />

          <AssignmentGroup
            disabled={isBusy}
            items={settings.houseRules.map((houseRule) => ({
              id: houseRule.id,
              label:
                locale === "en" ? houseRule.titleEn : houseRule.titleEs,
              assigned: selectedHouseRuleIds.includes(houseRule.id),
            }))}
            onToggle={toggleHouseRule}
            title={copy.sections.houseRuleAssignments}
          />

          <div className="flex flex-col gap-3 border-t border-border pt-5 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-sm leading-6 text-muted-foreground">
              {copy.notes.minimumRequired}
            </p>
            <Button
              disabled={!assignmentsDirty || isBusy}
              onClick={() => void saveAssignments()}
              type="button"
            >
              {busyKey === "assignments" ? (
                <Loader2 aria-hidden="true" className="animate-spin" />
              ) : (
                <Save aria-hidden="true" />
              )}
              {busyKey === "assignments"
                ? copy.actions.saving
                : copy.actions.saveAssignments}
            </Button>
          </div>
        </CardContent>
      </Card>

      <section className="mt-10" aria-labelledby="amenity-catalog-heading">
        <div className="mb-5">
          <h2
            className="text-2xl font-semibold tracking-tight"
            id="amenity-catalog-heading"
          >
            {copy.sections.amenityCatalog}
          </h2>
          <p className="mt-2 max-w-3xl text-sm leading-6 text-muted-foreground">
            {copy.notes.typedCatalog}
          </p>
        </div>

        <div className="grid gap-5 xl:grid-cols-2">
          {settings.amenities.map((amenity) => {
            const draft = amenityDrafts[amenity.id];

            if (!draft) {
              return null;
            }

            return (
              <Card className="border-border/70 bg-card shadow-sm" key={amenity.id}>
                <CardHeader>
                  <div className="flex items-start justify-between gap-4">
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
                    <Badge variant={amenity.assigned ? "default" : "outline"}>
                      {amenity.assigned
                        ? copy.labels.assigned
                        : copy.labels.notAssigned}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent className="space-y-5">
                  <div className="grid gap-4 sm:grid-cols-2">
                    <LabeledField label={copy.labels.nameEs}>
                      <input
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
                        aria-label={copy.labels.nameEs}
                        value={draft.nameEs}
                      />
                    </LabeledField>
                    <LabeledField label={copy.labels.nameEn}>
                      <input
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
                        aria-label={copy.labels.nameEn}
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
                                <AmenityIcon className="size-4" name={iconName} />
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

      <section className="mt-10" aria-labelledby="house-rule-catalog-heading">
        <div className="mb-5">
          <h2
            className="text-2xl font-semibold tracking-tight"
            id="house-rule-catalog-heading"
          >
            {copy.sections.houseRuleCatalog}
          </h2>
          <p className="mt-2 max-w-3xl text-sm leading-6 text-muted-foreground">
            {copy.notes.publicImpact}
          </p>
        </div>

        <div className="grid gap-5 xl:grid-cols-2">
          {settings.houseRules.map((houseRule) => {
            const draft = houseRuleDrafts[houseRule.id];

            if (!draft) {
              return null;
            }

            return (
              <Card className="border-border/70 bg-card shadow-sm" key={houseRule.id}>
                <CardHeader>
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <CardTitle>
                        {locale === "en" ? houseRule.titleEn : houseRule.titleEs}
                      </CardTitle>
                      <CardDescription className="mt-1">
                        {houseRule.key}
                      </CardDescription>
                    </div>
                    <Badge variant={houseRule.assigned ? "default" : "outline"}>
                      {houseRule.assigned
                        ? copy.labels.assigned
                        : copy.labels.notAssigned}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent className="space-y-5">
                  <div className="grid gap-4 sm:grid-cols-2">
                    <LabeledField label={copy.labels.titleEs}>
                      <input
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
                        aria-label={copy.labels.titleEs}
                        value={draft.titleEs}
                      />
                    </LabeledField>
                    <LabeledField label={copy.labels.titleEn}>
                      <input
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
                        aria-label={copy.labels.titleEn}
                        value={draft.titleEn}
                      />
                    </LabeledField>
                  </div>

                  <div className="grid gap-4 sm:grid-cols-2">
                    <LabeledField label={copy.labels.descriptionEs}>
                      <textarea
                        className={textareaClassName}
                        disabled={isBusy}
                        maxLength={500}
                        onChange={(event: ChangeEvent<HTMLTextAreaElement>) =>
                          setHouseRuleDrafts((current) => ({
                            ...current,
                            [houseRule.id]: {
                              ...draft,
                              descriptionEs: event.target.value,
                            },
                          }))
                        }
                        aria-label={copy.labels.descriptionEs}
                        value={draft.descriptionEs}
                      />
                    </LabeledField>
                    <LabeledField label={copy.labels.descriptionEn}>
                      <textarea
                        className={textareaClassName}
                        disabled={isBusy}
                        maxLength={500}
                        onChange={(event: ChangeEvent<HTMLTextAreaElement>) =>
                          setHouseRuleDrafts((current) => ({
                            ...current,
                            [houseRule.id]: {
                              ...draft,
                              descriptionEn: event.target.value,
                            },
                          }))
                        }
                        aria-label={copy.labels.descriptionEn}
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
                        <Loader2 aria-hidden="true" className="animate-spin" />
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
    </>
  );
}

function AssignmentGroup({
  disabled,
  items,
  onToggle,
  title,
}: Readonly<{
  disabled: boolean;
  items: readonly Readonly<{
    id: string;
    label: string;
    assigned: boolean;
  }>[];
  onToggle: (id: string) => void;
  title: string;
}>) {
  return (
    <div>
      <h3 className="text-sm font-semibold text-foreground">{title}</h3>
      <div className="mt-3 grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
        {items.map((item) => (
          <Button
            aria-pressed={item.assigned}
            className="h-auto min-h-11 justify-start whitespace-normal py-2 text-left"
            disabled={disabled}
            key={item.id}
            onClick={() => onToggle(item.id)}
            type="button"
            variant={item.assigned ? "secondary" : "outline"}
          >
            {item.assigned ? (
              <CheckCircle2 aria-hidden="true" className="shrink-0" />
            ) : (
              <Circle aria-hidden="true" className="shrink-0" />
            )}
            <span>{item.label}</span>
            {item.assigned ? (
              <Check aria-hidden="true" className="ml-auto shrink-0" />
            ) : null}
          </Button>
        ))}
      </div>
    </div>
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
