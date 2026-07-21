"use client";

import Link from "next/link";
import { Loader2, Plus, Save, Trash2 } from "lucide-react";
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
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
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

const defaultAmenityIcon: AmenityIconName = "wifi";

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

type DeleteTarget =
  | Readonly<{
      kind: "amenity";
      item: AdminCatalogAmenity;
    }>
  | Readonly<{
      kind: "house-rule";
      item: AdminCatalogHouseRule;
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

const emptyAmenityDraft: AmenityDraft = {
  nameEs: "",
  nameEn: "",
  icon: defaultAmenityIcon,
};

const emptyHouseRuleDraft: HouseRuleDraft = {
  titleEs: "",
  titleEn: "",
  descriptionEs: "",
  descriptionEn: "",
};

export function AdminCatalogManager({
  initialSettings,
  selectedCatalog,
}: Readonly<{
  initialSettings: AdminCatalogSettings;
  selectedCatalog: AdminCatalogTab;
}>) {
  const { locale, messages } = useLocale();
  const copy = messages.admin.catalogs;
  const genericActions = messages.admin.accommodations.photos.actions;
  const [settings, setSettings] =
    useState<AdminCatalogSettings>(initialSettings);
  const [amenityDrafts, setAmenityDrafts] = useState<
    Record<string, AmenityDraft>
  >(() => buildAmenityDrafts(initialSettings));
  const [houseRuleDrafts, setHouseRuleDrafts] = useState<
    Record<string, HouseRuleDraft>
  >(() => buildHouseRuleDrafts(initialSettings));
  const [newAmenityDraft, setNewAmenityDraft] =
    useState<AmenityDraft>(emptyAmenityDraft);
  const [newHouseRuleDraft, setNewHouseRuleDraft] =
    useState<HouseRuleDraft>(emptyHouseRuleDraft);
  const [createOpen, setCreateOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<DeleteTarget | null>(null);
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
    if (code === "ADMIN_CATALOG_MINIMUM_ASSIGNMENT_REQUIRED") {
      return messages.admin.accommodations.amenitiesRules.errors
        .AMENITY_HOUSE_RULE_MINIMUM_REQUIRED;
    }

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

  async function requestSettings(
    method: "POST" | "PATCH" | "DELETE",
    body: object,
  ): Promise<boolean> {
    const response = await fetch("/api/admin/catalogs", {
      method,
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

  async function createAmenity(): Promise<void> {
    clearFeedback();
    setBusyKey("create-amenity");

    try {
      const saved = await requestSettings("POST", {
        action: "create-amenity",
        nameEs: newAmenityDraft.nameEs,
        nameEn: newAmenityDraft.nameEn,
        icon: newAmenityDraft.icon,
      });

      if (saved) {
        setNewAmenityDraft(emptyAmenityDraft);
        setCreateOpen(false);
        setSuccessFeedback(copy.success.amenitySaved);
      }
    } catch {
      setErrorFeedback(copy.errors.ADMIN_CATALOG_UNEXPECTED_ERROR);
    } finally {
      setBusyKey(null);
    }
  }

  async function createHouseRule(): Promise<void> {
    clearFeedback();
    setBusyKey("create-house-rule");

    try {
      const saved = await requestSettings("POST", {
        action: "create-house-rule",
        titleEs: newHouseRuleDraft.titleEs,
        titleEn: newHouseRuleDraft.titleEn,
        descriptionEs: newHouseRuleDraft.descriptionEs,
        descriptionEn: newHouseRuleDraft.descriptionEn,
      });

      if (saved) {
        setNewHouseRuleDraft(emptyHouseRuleDraft);
        setCreateOpen(false);
        setSuccessFeedback(copy.success.houseRuleSaved);
      }
    } catch {
      setErrorFeedback(copy.errors.ADMIN_CATALOG_UNEXPECTED_ERROR);
    } finally {
      setBusyKey(null);
    }
  }

  async function saveAmenity(amenity: AdminCatalogAmenity): Promise<void> {
    const draft = amenityDrafts[amenity.id];

    if (!draft) {
      return;
    }

    clearFeedback();
    setBusyKey(`amenity:${amenity.id}`);

    try {
      const saved = await requestSettings("PATCH", {
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
      const saved = await requestSettings("PATCH", {
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

  async function deleteCatalogItem(): Promise<void> {
    if (!deleteTarget) {
      return;
    }

    clearFeedback();
    const targetKey =
      deleteTarget.kind === "amenity"
        ? `delete-amenity:${deleteTarget.item.id}`
        : `delete-house-rule:${deleteTarget.item.id}`;
    setBusyKey(targetKey);

    try {
      const deleted =
        deleteTarget.kind === "amenity"
          ? await requestSettings("DELETE", {
              action: "delete-amenity",
              amenityId: deleteTarget.item.id,
              expectedUpdatedAt: deleteTarget.item.updatedAt,
            })
          : await requestSettings("DELETE", {
              action: "delete-house-rule",
              houseRuleId: deleteTarget.item.id,
              expectedUpdatedAt: deleteTarget.item.updatedAt,
            });

      if (deleted) {
        setDeleteTarget(null);
        setSuccessFeedback(
          deleteTarget.kind === "amenity"
            ? copy.success.amenitySaved
            : copy.success.houseRuleSaved,
        );
      }
    } catch {
      setErrorFeedback(copy.errors.ADMIN_CATALOG_UNEXPECTED_ERROR);
    } finally {
      setBusyKey(null);
    }
  }

  const createDisabled =
    selectedCatalog === "amenities"
      ? !newAmenityDraft.nameEs.trim() || !newAmenityDraft.nameEn.trim()
      : !newHouseRuleDraft.titleEs.trim() ||
        !newHouseRuleDraft.titleEn.trim() ||
        !newHouseRuleDraft.descriptionEs.trim() ||
        !newHouseRuleDraft.descriptionEn.trim();
  const deleteTargetLabel = deleteTarget
    ? deleteTarget.kind === "amenity"
      ? locale === "en"
        ? deleteTarget.item.nameEn
        : deleteTarget.item.nameEs
      : locale === "en"
        ? deleteTarget.item.titleEn
        : deleteTarget.item.titleEs
    : null;

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
          <CatalogSectionHeader
            action={
              <Button onClick={() => setCreateOpen(true)} type="button">
                <Plus aria-hidden="true" />
                {copy.tabs.amenities}
              </Button>
            }
            description={copy.notes.amenities}
            id="amenity-catalog-heading"
            title={copy.sections.amenities}
          />

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
                      <div className="min-w-0">
                        <CardTitle className="truncate">
                          {locale === "en" ? amenity.nameEn : amenity.nameEs}
                        </CardTitle>
                        <CardDescription className="mt-1 break-all">
                          {amenity.key}
                        </CardDescription>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-5">
                    <AmenityFields
                      disabled={isBusy}
                      draft={draft}
                      iconLabels={copy.iconLabels}
                      labels={copy.labels}
                      onChange={(nextDraft) =>
                        setAmenityDrafts((current) => ({
                          ...current,
                          [amenity.id]: nextDraft,
                        }))
                      }
                    />

                    <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
                      <LabeledField label={copy.labels.category}>
                        <div className="flex h-11 items-center rounded-2xl border border-input bg-muted/40 px-3 text-sm text-muted-foreground">
                          {categoryLabel(amenity.category)}
                        </div>
                      </LabeledField>
                      <div className="flex flex-wrap gap-2">
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
                        <Button
                          disabled={isBusy}
                          onClick={() =>
                            setDeleteTarget({ kind: "amenity", item: amenity })
                          }
                          type="button"
                          variant="destructive"
                        >
                          <Trash2 aria-hidden="true" />
                          {genericActions.delete}
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </section>
      ) : (
        <section aria-labelledby="house-rule-catalog-heading">
          <CatalogSectionHeader
            action={
              <Button onClick={() => setCreateOpen(true)} type="button">
                <Plus aria-hidden="true" />
                {copy.tabs.houseRules}
              </Button>
            }
            description={copy.notes.houseRules}
            id="house-rule-catalog-heading"
            title={copy.sections.houseRules}
          />

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
                    <CardDescription className="break-all">
                      {houseRule.key}
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-5">
                    <HouseRuleFields
                      disabled={isBusy}
                      draft={draft}
                      labels={copy.labels}
                      onChange={(nextDraft) =>
                        setHouseRuleDrafts((current) => ({
                          ...current,
                          [houseRule.id]: nextDraft,
                        }))
                      }
                    />

                    <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
                      <p className="text-xs text-muted-foreground">
                        {copy.labels.category}: {categoryLabel(houseRule.category)}
                      </p>
                      <div className="flex flex-wrap gap-2">
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
                        <Button
                          disabled={isBusy}
                          onClick={() =>
                            setDeleteTarget({
                              kind: "house-rule",
                              item: houseRule,
                            })
                          }
                          type="button"
                          variant="destructive"
                        >
                          <Trash2 aria-hidden="true" />
                          {genericActions.delete}
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </section>
      )}

      <Sheet
        onOpenChange={(open) => {
          if (!open && !isBusy) {
            setCreateOpen(false);
          }
        }}
        open={createOpen}
      >
        <SheetContent closeLabel={messages.admin.feedback.dismiss}>
          <SheetHeader>
            <SheetTitle>
              {selectedCatalog === "amenities"
                ? copy.sections.amenities
                : copy.sections.houseRules}
            </SheetTitle>
            <SheetDescription>
              {selectedCatalog === "amenities"
                ? copy.notes.amenities
                : copy.notes.houseRules}
            </SheetDescription>
          </SheetHeader>

          <div className="grid gap-5 overflow-y-auto px-4">
            {selectedCatalog === "amenities" ? (
              <AmenityFields
                disabled={isBusy}
                draft={newAmenityDraft}
                iconLabels={copy.iconLabels}
                labels={copy.labels}
                onChange={setNewAmenityDraft}
              />
            ) : (
              <HouseRuleFields
                disabled={isBusy}
                draft={newHouseRuleDraft}
                labels={copy.labels}
                onChange={setNewHouseRuleDraft}
              />
            )}
          </div>

          <SheetFooter>
            <Button
              disabled={isBusy}
              onClick={() => setCreateOpen(false)}
              type="button"
              variant="outline"
            >
              {genericActions.cancel}
            </Button>
            <Button
              disabled={isBusy || createDisabled}
              onClick={() =>
                selectedCatalog === "amenities"
                  ? void createAmenity()
                  : void createHouseRule()
              }
              type="button"
            >
              {busyKey?.startsWith("create-") ? (
                <Loader2 aria-hidden="true" className="animate-spin" />
              ) : (
                <Plus aria-hidden="true" />
              )}
              {selectedCatalog === "amenities"
                ? copy.actions.saveAmenity
                : copy.actions.saveHouseRule}
            </Button>
          </SheetFooter>
        </SheetContent>
      </Sheet>

      <Sheet
        onOpenChange={(open) => {
          if (!open && !isBusy) {
            setDeleteTarget(null);
          }
        }}
        open={deleteTarget !== null}
      >
        <SheetContent closeLabel={messages.admin.feedback.dismiss}>
          <SheetHeader>
            <SheetTitle>{genericActions.delete}</SheetTitle>
            <SheetDescription>{deleteTargetLabel}</SheetDescription>
          </SheetHeader>
          <SheetFooter>
            <Button
              disabled={isBusy}
              onClick={() => setDeleteTarget(null)}
              type="button"
              variant="outline"
            >
              {genericActions.cancel}
            </Button>
            <Button
              disabled={isBusy}
              onClick={() => void deleteCatalogItem()}
              type="button"
              variant="destructive"
            >
              {busyKey?.startsWith("delete-") ? (
                <Loader2 aria-hidden="true" className="animate-spin" />
              ) : (
                <Trash2 aria-hidden="true" />
              )}
              {genericActions.delete}
            </Button>
          </SheetFooter>
        </SheetContent>
      </Sheet>
    </>
  );
}

function CatalogSectionHeader({
  action,
  description,
  id,
  title,
}: Readonly<{
  action: ReactNode;
  description: string;
  id: string;
  title: string;
}>) {
  return (
    <div className="mb-5 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
      <div>
        <h2 className="text-2xl font-semibold tracking-tight" id={id}>
          {title}
        </h2>
        <p className="mt-2 max-w-3xl text-sm leading-6 text-muted-foreground">
          {description}
        </p>
      </div>
      <div className="shrink-0">{action}</div>
    </div>
  );
}

function AmenityFields({
  disabled,
  draft,
  iconLabels,
  labels,
  onChange,
}: Readonly<{
  disabled: boolean;
  draft: AmenityDraft;
  iconLabels: Record<AmenityIconName, string>;
  labels: Readonly<{
    nameEs: string;
    nameEn: string;
    icon: string;
  }>;
  onChange: (draft: AmenityDraft) => void;
}>) {
  return (
    <div className="grid gap-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <LabeledField label={labels.nameEs}>
          <input
            aria-label={labels.nameEs}
            className={inputClassName}
            disabled={disabled}
            maxLength={160}
            minLength={2}
            onChange={(event: ChangeEvent<HTMLInputElement>) =>
              onChange({ ...draft, nameEs: event.target.value })
            }
            required
            value={draft.nameEs}
          />
        </LabeledField>
        <LabeledField label={labels.nameEn}>
          <input
            aria-label={labels.nameEn}
            className={inputClassName}
            disabled={disabled}
            maxLength={160}
            minLength={2}
            onChange={(event: ChangeEvent<HTMLInputElement>) =>
              onChange({ ...draft, nameEn: event.target.value })
            }
            required
            value={draft.nameEn}
          />
        </LabeledField>
      </div>

      <LabeledField label={labels.icon}>
        <Select
          disabled={disabled}
          onValueChange={(value: string) =>
            onChange({ ...draft, icon: value as AmenityIconName })
          }
          value={draft.icon}
        >
          <SelectTrigger aria-label={labels.icon}>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {amenityIconNames.map((iconName) => (
              <SelectItem key={iconName} value={iconName}>
                <span className="flex items-center gap-2">
                  <AmenityIcon className="size-4" name={iconName} />
                  {iconLabels[iconName]}
                </span>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </LabeledField>
    </div>
  );
}

function HouseRuleFields({
  disabled,
  draft,
  labels,
  onChange,
}: Readonly<{
  disabled: boolean;
  draft: HouseRuleDraft;
  labels: Readonly<{
    titleEs: string;
    titleEn: string;
    descriptionEs: string;
    descriptionEn: string;
  }>;
  onChange: (draft: HouseRuleDraft) => void;
}>) {
  return (
    <div className="grid gap-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <LabeledField label={labels.titleEs}>
          <input
            aria-label={labels.titleEs}
            className={inputClassName}
            disabled={disabled}
            maxLength={160}
            minLength={2}
            onChange={(event: ChangeEvent<HTMLInputElement>) =>
              onChange({ ...draft, titleEs: event.target.value })
            }
            required
            value={draft.titleEs}
          />
        </LabeledField>
        <LabeledField label={labels.titleEn}>
          <input
            aria-label={labels.titleEn}
            className={inputClassName}
            disabled={disabled}
            maxLength={160}
            minLength={2}
            onChange={(event: ChangeEvent<HTMLInputElement>) =>
              onChange({ ...draft, titleEn: event.target.value })
            }
            required
            value={draft.titleEn}
          />
        </LabeledField>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <LabeledField label={labels.descriptionEs}>
          <textarea
            aria-label={labels.descriptionEs}
            className={textareaClassName}
            disabled={disabled}
            maxLength={500}
            minLength={3}
            onChange={(event: ChangeEvent<HTMLTextAreaElement>) =>
              onChange({ ...draft, descriptionEs: event.target.value })
            }
            required
            value={draft.descriptionEs}
          />
        </LabeledField>
        <LabeledField label={labels.descriptionEn}>
          <textarea
            aria-label={labels.descriptionEn}
            className={textareaClassName}
            disabled={disabled}
            maxLength={500}
            minLength={3}
            onChange={(event: ChangeEvent<HTMLTextAreaElement>) =>
              onChange({ ...draft, descriptionEn: event.target.value })
            }
            required
            value={draft.descriptionEn}
          />
        </LabeledField>
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
