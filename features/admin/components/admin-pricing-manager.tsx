"use client";

import Link from "next/link";
import {
  CalendarRange,
  DollarSign,
  PencilLine,
  Plus,
  RotateCcw,
  Trash2,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";

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
  AdminPricingErrorCode,
  AdminPricingPreview,
  AdminPricingSettings,
  AdminSeasonalPricingRule,
} from "@/types/admin-pricing";
import type { Locale } from "@/types/locale";

import { AdminPageHeader } from "./admin-page-header";
import { AdminSnackbar } from "./admin-snackbar";

type SeasonalFormState = Readonly<{
  name: string;
  startDate: string;
  endDate: string;
  nightlyRate: string;
}>;

type MutationResponse =
  | Readonly<{ settings: AdminPricingSettings }>
  | Readonly<{ error: { code: AdminPricingErrorCode | string } }>;

type PreviewResponse =
  | Readonly<{ preview: AdminPricingPreview }>
  | Readonly<{ error: { code: AdminPricingErrorCode | string } }>;

const emptySeasonalForm: SeasonalFormState = {
  name: "",
  startDate: "",
  endDate: "",
  nightlyRate: "",
};

function getIntlLocale(locale: Locale): string {
  return locale === "en" ? "en-US" : "es-GT";
}

function isSettingsResponse(
  response: MutationResponse,
): response is { settings: AdminPricingSettings } {
  return "settings" in response;
}

function isPreviewResponse(
  response: PreviewResponse,
): response is { preview: AdminPricingPreview } {
  return "preview" in response;
}

export function AdminPricingManager({
  initialSettings,
}: Readonly<{ initialSettings: AdminPricingSettings }>) {
  const { locale, messages } = useLocale();
  const copy = messages.admin.accommodations.pricing;
  const [settings, setSettings] = useState(initialSettings);
  const [seasonalSheetOpen, setSeasonalSheetOpen] = useState(false);
  const [editingRule, setEditingRule] =
    useState<AdminSeasonalPricingRule | null>(null);
  const [seasonalForm, setSeasonalForm] =
    useState<SeasonalFormState>(emptySeasonalForm);
  const [deleteTarget, setDeleteTarget] =
    useState<AdminSeasonalPricingRule | null>(null);
  const [busyKey, setBusyKey] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [losDrafts, setLosDrafts] = useState<Record<number, string>>(() =>
    Object.fromEntries(
      initialSettings.lengthOfStayRules.map((rule) => [
        rule.minimumNights,
        rule.nightlyRate ?? "",
      ]),
    ),
  );
  const [previewCheckIn, setPreviewCheckIn] = useState("");
  const [previewCheckOut, setPreviewCheckOut] = useState("");
  const [preview, setPreview] = useState<AdminPricingPreview | null>(null);
  const intlLocale = getIntlLocale(locale);
  const propertyName =
    locale === "en"
      ? settings.property.nameEn
      : settings.property.nameEs;

  useEffect(() => {
    setLosDrafts(
      Object.fromEntries(
        settings.lengthOfStayRules.map((rule) => [
          rule.minimumNights,
          rule.nightlyRate ?? "",
        ]),
      ),
    );
  }, [settings]);

  const activeSeasonalRules = useMemo(
    () => settings.seasonalRules.filter((rule) => !rule.isDeleted),
    [settings.seasonalRules],
  );
  const deletedSeasonalRules = useMemo(
    () => settings.seasonalRules.filter((rule) => rule.isDeleted),
    [settings.seasonalRules],
  );

  function formatMoney(amount: string): string {
    return new Intl.NumberFormat(intlLocale, {
      style: "currency",
      currency: settings.property.currency,
    }).format(Number(amount));
  }

  function resolveError(code: string): string {
    if (code in copy.errors) {
      return copy.errors[code as keyof typeof copy.errors];
    }

    return copy.errors.ADMIN_PRICING_UNEXPECTED_ERROR;
  }

  async function requestSettings(
    method: "POST" | "PATCH" | "DELETE",
    body: object,
    busyValue: string,
    success: string,
  ): Promise<boolean> {
    setBusyKey(busyValue);
    setSuccessMessage(null);
    setErrorMessage(null);

    try {
      const response = await fetch("/api/admin/pricing", {
        method,
        headers: {
          accept: "application/json",
          "content-type": "application/json",
        },
        body: JSON.stringify(body),
      });
      const payload = (await response.json()) as MutationResponse;

      if (!response.ok || !isSettingsResponse(payload)) {
        const code = "error" in payload
          ? payload.error.code
          : "ADMIN_PRICING_UNEXPECTED_ERROR";
        throw new Error(resolveError(code));
      }

      setSettings(payload.settings);
      setPreview(null);
      setSuccessMessage(success);
      return true;
    } catch (error) {
      setErrorMessage(
        error instanceof Error
          ? error.message
          : copy.errors.ADMIN_PRICING_UNEXPECTED_ERROR,
      );
      return false;
    } finally {
      setBusyKey(null);
    }
  }

  function openCreateSeasonal(): void {
    setEditingRule(null);
    setSeasonalForm(emptySeasonalForm);
    setSeasonalSheetOpen(true);
  }

  function openEditSeasonal(rule: AdminSeasonalPricingRule): void {
    setEditingRule(rule);
    setSeasonalForm({
      name: rule.name,
      startDate: rule.startDate,
      endDate: rule.endDate,
      nightlyRate: rule.nightlyRate,
    });
    setSeasonalSheetOpen(true);
  }

  async function saveSeasonal(): Promise<void> {
    const action = editingRule ? "update-seasonal" : "create-seasonal";
    const saved = await requestSettings(
      editingRule ? "PATCH" : "POST",
      {
        action,
        propertyId: settings.property.id,
        ...(editingRule
          ? {
              ruleId: editingRule.id,
              expectedUpdatedAt: editingRule.updatedAt,
            }
          : {}),
        ...seasonalForm,
      },
      "seasonal-form",
      editingRule ? copy.success.seasonalUpdated : copy.success.seasonalCreated,
    );

    if (saved) {
      setSeasonalSheetOpen(false);
      setEditingRule(null);
      setSeasonalForm(emptySeasonalForm);
    }
  }

  async function toggleSeasonal(rule: AdminSeasonalPricingRule): Promise<void> {
    await requestSettings(
      "PATCH",
      {
        action: "set-seasonal-enabled",
        propertyId: settings.property.id,
        ruleId: rule.id,
        expectedUpdatedAt: rule.updatedAt,
        enabled: !rule.isEnabled,
      },
      `seasonal-toggle-${rule.id}`,
      rule.isEnabled
        ? copy.success.seasonalDisabled
        : copy.success.seasonalEnabled,
    );
  }

  async function deleteSeasonal(): Promise<void> {
    if (!deleteTarget) {
      return;
    }

    const deleted = await requestSettings(
      "DELETE",
      {
        action: "delete-seasonal",
        propertyId: settings.property.id,
        ruleId: deleteTarget.id,
        expectedUpdatedAt: deleteTarget.updatedAt,
      },
      `seasonal-delete-${deleteTarget.id}`,
      copy.success.seasonalDeleted,
    );

    if (deleted) {
      setDeleteTarget(null);
    }
  }

  async function restoreSeasonal(rule: AdminSeasonalPricingRule): Promise<void> {
    await requestSettings(
      "PATCH",
      {
        action: "restore-seasonal",
        propertyId: settings.property.id,
        ruleId: rule.id,
        expectedUpdatedAt: rule.updatedAt,
      },
      `seasonal-restore-${rule.id}`,
      copy.success.seasonalRestored,
    );
  }

  async function saveLos(
    minimumNights: number,
    expectedUpdatedAt: string | null,
  ): Promise<void> {
    await requestSettings(
      "POST",
      {
        action: "save-los",
        propertyId: settings.property.id,
        minimumNights,
        expectedUpdatedAt,
        nightlyRate: losDrafts[minimumNights] ?? "",
      },
      `los-save-${minimumNights}`,
      copy.success.losSaved,
    );
  }

  async function toggleLos(
    minimumNights: number,
    expectedUpdatedAt: string,
    enabled: boolean,
  ): Promise<void> {
    await requestSettings(
      "PATCH",
      {
        action: "set-los-enabled",
        propertyId: settings.property.id,
        minimumNights,
        expectedUpdatedAt,
        enabled,
      },
      `los-toggle-${minimumNights}`,
      enabled ? copy.success.losEnabled : copy.success.losDisabled,
    );
  }

  async function runPreview(): Promise<void> {
    setBusyKey("preview");
    setSuccessMessage(null);
    setErrorMessage(null);

    try {
      const response = await fetch("/api/admin/pricing/preview", {
        method: "POST",
        headers: {
          accept: "application/json",
          "content-type": "application/json",
        },
        body: JSON.stringify({
          propertyId: settings.property.id,
          checkInDate: previewCheckIn,
          checkOutDate: previewCheckOut,
        }),
      });
      const payload = (await response.json()) as PreviewResponse;

      if (!response.ok || !isPreviewResponse(payload)) {
        const code = "error" in payload
          ? payload.error.code
          : "ADMIN_PRICING_UNEXPECTED_ERROR";
        throw new Error(resolveError(code));
      }

      setPreview(payload.preview);
    } catch (error) {
      setPreview(null);
      setErrorMessage(
        error instanceof Error
          ? error.message
          : copy.errors.ADMIN_PRICING_UNEXPECTED_ERROR,
      );
    } finally {
      setBusyKey(null);
    }
  }

  return (
    <>
      <AdminPageHeader
        badge={copy.badge}
        description={copy.description}
        title={`${copy.title} · ${propertyName}`}
      />

      <div className="mb-6 flex flex-wrap gap-2">
        <Button asChild variant="outline">
          <Link href="/admin/accommodations">
            {copy.actions.backToAccommodations}
          </Link>
        </Button>
      </div>

      <Card className="mb-6 border-border/70 bg-card shadow-sm">
        <CardHeader>
          <CardTitle>{copy.base.title}</CardTitle>
          <CardDescription>{copy.base.description}</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-3">
            <div className="flex size-10 items-center justify-center rounded-2xl bg-primary/10 text-primary">
              <DollarSign aria-hidden="true" className="size-5" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">
                {copy.base.label}
              </p>
              <p className="text-xl font-semibold text-foreground">
                {formatMoney(settings.property.baseNightlyRate)}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      <section className="space-y-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h2 className="text-2xl font-semibold tracking-tight">
              {copy.seasonal.title}
            </h2>
            <p className="mt-2 max-w-3xl text-sm leading-6 text-muted-foreground">
              {copy.seasonal.description}
            </p>
          </div>
          <Button onClick={openCreateSeasonal} type="button">
            <Plus aria-hidden="true" />
            {copy.actions.createSeasonal}
          </Button>
        </div>

        {activeSeasonalRules.length > 0 ? (
          <div className="grid gap-4 xl:grid-cols-2">
            {activeSeasonalRules.map((rule) => (
              <Card key={rule.id}>
                <CardHeader>
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <CardTitle>{rule.name}</CardTitle>
                      <CardDescription>
                        {rule.startDate} — {rule.endDate}
                      </CardDescription>
                    </div>
                    <Badge variant={rule.isEnabled ? "default" : "secondary"}>
                      {rule.isEnabled
                        ? copy.states.enabled
                        : copy.states.disabled}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <p className="text-xs text-muted-foreground">
                      {copy.labels.nightlyRate}
                    </p>
                    <p className="font-semibold">
                      {formatMoney(rule.nightlyRate)}
                    </p>
                  </div>
                  <div className="grid gap-2 sm:grid-cols-3">
                    <Button
                      onClick={() => openEditSeasonal(rule)}
                      type="button"
                      variant="outline"
                    >
                      <PencilLine aria-hidden="true" />
                      {copy.actions.edit}
                    </Button>
                    <Button
                      disabled={busyKey === `seasonal-toggle-${rule.id}`}
                      onClick={() => void toggleSeasonal(rule)}
                      type="button"
                      variant="outline"
                    >
                      {rule.isEnabled
                        ? copy.actions.disable
                        : copy.actions.enable}
                    </Button>
                    <Button
                      disabled={busyKey === `seasonal-delete-${rule.id}`}
                      onClick={() => setDeleteTarget(rule)}
                      type="button"
                      variant="outline"
                    >
                      <Trash2 aria-hidden="true" />
                      {copy.actions.delete}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <p className="rounded-2xl border border-dashed border-border p-5 text-sm text-muted-foreground">
            {copy.seasonal.empty}
          </p>
        )}

        {deletedSeasonalRules.length > 0 ? (
          <div className="space-y-3 pt-2">
            <h3 className="font-semibold">{copy.seasonal.deletedTitle}</h3>
            {deletedSeasonalRules.map((rule) => (
              <div
                className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-border bg-muted/30 p-4"
                key={rule.id}
              >
                <div>
                  <p className="font-medium">{rule.name}</p>
                  <p className="text-xs text-muted-foreground">
                    {rule.startDate} — {rule.endDate} · {formatMoney(rule.nightlyRate)}
                  </p>
                </div>
                <Button
                  disabled={busyKey === `seasonal-restore-${rule.id}`}
                  onClick={() => void restoreSeasonal(rule)}
                  type="button"
                  variant="outline"
                >
                  <RotateCcw aria-hidden="true" />
                  {copy.actions.restore}
                </Button>
              </div>
            ))}
            <p className="text-xs leading-5 text-muted-foreground">
              {copy.seasonal.restoreNote}
            </p>
          </div>
        ) : null}
      </section>

      <section className="mt-10 border-t border-border pt-8">
        <div>
          <h2 className="text-2xl font-semibold tracking-tight">
            {copy.los.title}
          </h2>
          <p className="mt-2 max-w-3xl text-sm leading-6 text-muted-foreground">
            {copy.los.description}
          </p>
        </div>

        <div className="mt-5 grid gap-3">
          {settings.lengthOfStayRules.map((rule) => (
            <Card key={rule.minimumNights}>
              <CardContent className="grid gap-4 p-5 lg:grid-cols-[minmax(0,0.35fr)_minmax(0,1fr)_auto_auto] lg:items-end">
                <div>
                  <p className="text-xs text-muted-foreground">
                    {copy.labels.minimumNights}
                  </p>
                  <p className="font-semibold">
                    {rule.minimumNights}{copy.los.tierSuffix}
                  </p>
                </div>
                <PricingInput
                  label={copy.labels.nightlyRate}
                  onChange={(value) =>
                    setLosDrafts((current) => ({
                      ...current,
                      [rule.minimumNights]: value,
                    }))
                  }
                  placeholder={copy.placeholders.nightlyRate}
                  value={losDrafts[rule.minimumNights] ?? ""}
                />
                <Button
                  disabled={busyKey === `los-save-${rule.minimumNights}`}
                  onClick={() =>
                    void saveLos(rule.minimumNights, rule.updatedAt)
                  }
                  type="button"
                >
                  {copy.actions.saveTier}
                </Button>
                {rule.id && rule.updatedAt ? (
                  <Button
                    disabled={busyKey === `los-toggle-${rule.minimumNights}`}
                    onClick={() =>
                      void toggleLos(
                        rule.minimumNights,
                        rule.updatedAt as string,
                        !rule.isEnabled,
                      )
                    }
                    type="button"
                    variant="outline"
                  >
                    {rule.isEnabled
                      ? copy.actions.disable
                      : copy.actions.enable}
                  </Button>
                ) : (
                  <Badge variant="secondary">{copy.states.notConfigured}</Badge>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      </section>

      <section className="mt-10 border-t border-border pt-8">
        <div>
          <h2 className="text-2xl font-semibold tracking-tight">
            {copy.preview.title}
          </h2>
          <p className="mt-2 max-w-3xl text-sm leading-6 text-muted-foreground">
            {copy.preview.description}
          </p>
        </div>
        <Card className="mt-5">
          <CardContent className="space-y-5 p-5">
            <div className="grid gap-4 sm:grid-cols-2">
              <PricingInput
                label={copy.labels.checkInDate}
                onChange={(value) => {
                  setPreviewCheckIn(value);
                  setPreview(null);
                }}
                placeholder={copy.placeholders.date}
                value={previewCheckIn}
              />
              <PricingInput
                label={copy.labels.checkOutDate}
                onChange={(value) => {
                  setPreviewCheckOut(value);
                  setPreview(null);
                }}
                placeholder={copy.placeholders.date}
                value={previewCheckOut}
              />
            </div>
            <Button
              disabled={busyKey === "preview"}
              onClick={() => void runPreview()}
              type="button"
            >
              <CalendarRange aria-hidden="true" />
              {busyKey === "preview"
                ? copy.actions.previewing
                : copy.actions.preview}
            </Button>

            {preview ? (
              <div className="space-y-4 rounded-2xl border border-primary/20 bg-primary/5 p-4">
                <div className="grid gap-4 sm:grid-cols-3">
                  <PreviewValue
                    label={copy.preview.nights}
                    value={String(preview.nights)}
                  />
                  <PreviewValue
                    label={copy.preview.uniformRate}
                    value={
                      preview.uniformNightlyRate
                        ? formatMoney(preview.uniformNightlyRate)
                        : copy.preview.mixedRate
                    }
                  />
                  <PreviewValue
                    label={copy.preview.subtotal}
                    value={formatMoney(preview.subtotal)}
                  />
                </div>
                <div className="grid gap-2">
                  {preview.segments.map((segment, index) => (
                    <div
                      className="grid gap-2 rounded-xl border border-border bg-background p-3 text-sm sm:grid-cols-[1fr_auto_auto]"
                      key={`${segment.startDate}-${segment.endDate}-${index}`}
                    >
                      <div>
                        <p className="font-medium">
                          {segment.startDate} — {segment.endDate}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {copy.preview.sources[segment.source]}
                        </p>
                      </div>
                      <span>{formatMoney(segment.nightlyRate)}</span>
                      <span className="font-semibold">
                        {formatMoney(segment.subtotal)}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            ) : null}
          </CardContent>
        </Card>
      </section>

      <Sheet
        onOpenChange={(open) => {
          if (busyKey !== "seasonal-form") {
            setSeasonalSheetOpen(open);
          }
        }}
        open={seasonalSheetOpen}
      >
        <SheetContent
          className="overflow-y-auto"
          closeLabel={copy.actions.closeNotification}
        >
          <SheetHeader>
            <SheetTitle>
              {editingRule
                ? copy.seasonal.editTitle
                : copy.seasonal.createTitle}
            </SheetTitle>
            <SheetDescription>{copy.seasonal.formDescription}</SheetDescription>
          </SheetHeader>
          <div className="my-6 grid gap-4">
            <PricingInput
              label={copy.labels.name}
              onChange={(value) =>
                setSeasonalForm((current) => ({ ...current, name: value }))
              }
              placeholder={copy.placeholders.name}
              value={seasonalForm.name}
            />
            <PricingInput
              label={copy.labels.startDate}
              onChange={(value) =>
                setSeasonalForm((current) => ({
                  ...current,
                  startDate: value,
                }))
              }
              placeholder={copy.placeholders.date}
              value={seasonalForm.startDate}
            />
            <PricingInput
              label={copy.labels.endDate}
              onChange={(value) =>
                setSeasonalForm((current) => ({ ...current, endDate: value }))
              }
              placeholder={copy.placeholders.date}
              value={seasonalForm.endDate}
            />
            <PricingInput
              label={copy.labels.nightlyRate}
              onChange={(value) =>
                setSeasonalForm((current) => ({
                  ...current,
                  nightlyRate: value,
                }))
              }
              placeholder={copy.placeholders.nightlyRate}
              value={seasonalForm.nightlyRate}
            />
          </div>
          <SheetFooter>
            <Button
              disabled={busyKey === "seasonal-form"}
              onClick={() => setSeasonalSheetOpen(false)}
              type="button"
              variant="outline"
            >
              {copy.actions.cancel}
            </Button>
            <Button
              disabled={busyKey === "seasonal-form"}
              onClick={() => void saveSeasonal()}
              type="button"
            >
              {busyKey === "seasonal-form"
                ? copy.actions.saving
                : copy.actions.saveSeasonal}
            </Button>
          </SheetFooter>
        </SheetContent>
      </Sheet>

      <Sheet
        onOpenChange={(open) => {
          if (!open && !busyKey?.startsWith("seasonal-delete-")) {
            setDeleteTarget(null);
          }
        }}
        open={deleteTarget !== null}
      >
        <SheetContent closeLabel={copy.actions.closeNotification}>
          <SheetHeader>
            <SheetTitle>{copy.deleteDialog.title}</SheetTitle>
            <SheetDescription>{copy.deleteDialog.description}</SheetDescription>
          </SheetHeader>
          <SheetFooter className="mt-6">
            <Button
              onClick={() => setDeleteTarget(null)}
              type="button"
              variant="outline"
            >
              {copy.actions.cancel}
            </Button>
            <Button onClick={() => void deleteSeasonal()} type="button">
              {copy.actions.confirmDelete}
            </Button>
          </SheetFooter>
        </SheetContent>
      </Sheet>

      <AdminSnackbar
        closeLabel={copy.actions.closeNotification}
        message={successMessage}
        onDismiss={() => setSuccessMessage(null)}
      />
      <AdminSnackbar
        closeLabel={copy.actions.closeNotification}
        message={errorMessage}
        onDismiss={() => setErrorMessage(null)}
        variant="error"
      />
    </>
  );
}

function PricingInput({
  label,
  onChange,
  placeholder,
  value,
}: Readonly<{
  label: string;
  onChange: (value: string) => void;
  placeholder: string;
  value: string;
}>) {
  return (
    <label className="grid gap-2 text-sm font-medium text-foreground">
      <span>{label}</span>
      <input
        className="h-11 rounded-2xl border border-border/70 bg-background px-4 text-sm text-foreground shadow-sm outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20"
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        type="text"
        value={value}
      />
    </label>
  );
}

function PreviewValue({
  label,
  value,
}: Readonly<{ label: string; value: string }>) {
  return (
    <div>
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="mt-1 font-semibold text-foreground">{value}</p>
    </div>
  );
}
