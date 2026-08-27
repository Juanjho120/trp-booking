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
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import { useLocale } from "@/features/i18n";
import type {
  AdminLengthOfStayPricingRule,
  AdminPricingErrorCode,
  AdminPricingPreview,
  AdminPricingSettings,
  AdminSeasonalPricingRule,
} from "@/types/admin-pricing";
import type { Locale } from "@/types/locale";

import { AdminPageHeader } from "./admin-page-header";
import {
  AdminPricingDateRangeCalendar,
  type AdminPricingDateRange,
  type AdminPricingDisabledDateRange,
} from "./admin-pricing-date-range-calendar";
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

function addDaysToDateOnly(value: string, days: number): string {
  const date = new Date(`${value}T00:00:00.000Z`);
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}

function toSeasonalUiRange(
  startDate: string,
  exclusiveEndDate: string,
): AdminPricingDateRange {
  return {
    startDate,
    endDate: exclusiveEndDate
      ? addDaysToDateOnly(exclusiveEndDate, -1)
      : "",
  };
}

function toSeasonalPersistenceRange(
  range: AdminPricingDateRange,
): Readonly<{ startDate: string; endDate: string }> {
  return {
    startDate: range.startDate,
    endDate: range.endDate ? addDaysToDateOnly(range.endDate, 1) : "",
  };
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
  const configuredLosRules = useMemo(
    () =>
      settings.lengthOfStayRules.filter(
        (rule): rule is AdminLengthOfStayPricingRule & {
          id: string;
          nightlyRate: string;
          updatedAt: string;
        } => Boolean(rule.id && rule.nightlyRate && rule.updatedAt),
      ),
    [settings.lengthOfStayRules],
  );
  const seasonalDisabledDateRanges = useMemo<
    readonly AdminPricingDisabledDateRange[]
  >(
    () =>
      activeSeasonalRules
        .filter((rule) => rule.isEnabled && rule.id !== editingRule?.id)
        .map((rule) => ({
          startDate: rule.startDate,
          endDate: rule.endDate,
        })),
    [activeSeasonalRules, editingRule?.id],
  );
  const seasonalUiRange = toSeasonalUiRange(
    seasonalForm.startDate,
    seasonalForm.endDate,
  );
  const previewRange: AdminPricingDateRange = {
    startDate: previewCheckIn,
    endDate: previewCheckOut,
  };

  function formatMoney(amount: string): string {
    return new Intl.NumberFormat(intlLocale, {
      style: "currency",
      currency: settings.property.currency,
    }).format(Number(amount));
  }

  function formatDate(dateOnly: string): string {
    if (!dateOnly) {
      return copy.calendar.notSelected;
    }

    return new Intl.DateTimeFormat(intlLocale, {
      day: "2-digit",
      month: "short",
      timeZone: "UTC",
      year: "numeric",
    }).format(new Date(`${dateOnly}T00:00:00.000Z`));
  }

  function formatSeasonalRange(rule: AdminSeasonalPricingRule): string {
    return `${formatDate(rule.startDate)} — ${formatDate(
      addDaysToDateOnly(rule.endDate, -1),
    )}`;
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

  function updateSeasonalRange(range: AdminPricingDateRange): void {
    const persistenceRange = toSeasonalPersistenceRange(range);

    setSeasonalForm((current) => ({
      ...current,
      ...persistenceRange,
    }));
  }

  function updatePreviewRange(range: AdminPricingDateRange): void {
    setPreviewCheckIn(range.startDate);
    setPreviewCheckOut(range.endDate);
    setPreview(null);
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

      <Tabs defaultValue="overview">
        <TabsList className="grid w-full grid-cols-3 sm:w-auto">
          <TabsTrigger value="overview">{copy.tabs.overview}</TabsTrigger>
          <TabsTrigger value="seasonal">{copy.tabs.seasonal}</TabsTrigger>
          <TabsTrigger value="los">{copy.tabs.los}</TabsTrigger>
        </TabsList>

        <TabsContent className="mt-6 space-y-6" value="overview">
          <BaseRateCard
            copy={copy}
            formattedRate={formatMoney(settings.property.baseNightlyRate)}
          />
          <PricingSummaryCard
            activeSeasonalRules={activeSeasonalRules}
            configuredLosRules={configuredLosRules}
            copy={copy}
            formatMoney={formatMoney}
            formatSeasonalRange={formatSeasonalRange}
          />
          <PricingPreviewCard
            busy={busyKey === "preview"}
            calendarCopy={copy.calendar}
            copy={copy}
            formatMoney={formatMoney}
            locale={locale}
            onPreview={() => void runPreview()}
            onRangeChange={updatePreviewRange}
            preview={preview}
            range={previewRange}
          />
        </TabsContent>

        <TabsContent className="mt-6" value="seasonal">
          <SeasonalRatesSection
            activeSeasonalRules={activeSeasonalRules}
            busyKey={busyKey}
            copy={copy}
            deletedSeasonalRules={deletedSeasonalRules}
            formatMoney={formatMoney}
            formatSeasonalRange={formatSeasonalRange}
            onCreate={openCreateSeasonal}
            onDelete={setDeleteTarget}
            onEdit={openEditSeasonal}
            onRestore={(rule) => void restoreSeasonal(rule)}
            onToggle={(rule) => void toggleSeasonal(rule)}
          />
        </TabsContent>

        <TabsContent className="mt-6" value="los">
          <LengthOfStayRatesSection
            busyKey={busyKey}
            copy={copy}
            drafts={losDrafts}
            onDraftChange={(minimumNights, value) =>
              setLosDrafts((current) => ({
                ...current,
                [minimumNights]: value,
              }))
            }
            onSave={(minimumNights, updatedAt) =>
              void saveLos(minimumNights, updatedAt)
            }
            onToggle={(minimumNights, updatedAt, enabled) =>
              void toggleLos(minimumNights, updatedAt, enabled)
            }
            rules={settings.lengthOfStayRules}
          />
        </TabsContent>
      </Tabs>

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
          <div className="grid gap-5 px-6 py-2 pb-6">
            <PricingInput
              label={copy.labels.name}
              onChange={(value) =>
                setSeasonalForm((current) => ({ ...current, name: value }))
              }
              placeholder={copy.placeholders.name}
              value={seasonalForm.name}
            />

            <div className="grid gap-3">
              <div>
                <p className="text-sm font-medium text-foreground">
                  {copy.calendar.seasonalRange}
                </p>
                <p className="mt-1 text-xs leading-5 text-muted-foreground">
                  {copy.calendar.seasonalHelp}
                </p>
              </div>
              <RangeSelectionSummary
                endLabel={copy.labels.endDate}
                endValue={formatDate(seasonalUiRange.endDate)}
                startLabel={copy.labels.startDate}
                startValue={formatDate(seasonalUiRange.startDate)}
              />
              <AdminPricingDateRangeCalendar
                allowSameDayEnd
                copy={copy.calendar}
                disabledRanges={seasonalDisabledDateRanges}
                disablePastDates
                locale={locale}
                onChange={updateSeasonalRange}
                range={seasonalUiRange}
              />
              <p className="text-xs leading-5 text-muted-foreground">
                {copy.calendar.seasonalUnavailable}
              </p>
            </div>

            <PricingInput
              align="right"
              inputMode="decimal"
              label={copy.labels.nightlyRate}
              min="0.01"
              onChange={(value) =>
                setSeasonalForm((current) => ({
                  ...current,
                  nightlyRate: value,
                }))
              }
              placeholder={copy.placeholders.nightlyRate}
              step="0.01"
              type="number"
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

function BaseRateCard({
  copy,
  formattedRate,
}: Readonly<{
  copy: ReturnType<typeof useLocale>["messages"]["admin"]["accommodations"]["pricing"];
  formattedRate: string;
}>) {
  return (
    <Card className="border-border/70 bg-card shadow-sm">
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
            <p className="text-xs text-muted-foreground">{copy.base.label}</p>
            <p className="text-xl font-semibold text-foreground">
              {formattedRate}
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function PricingSummaryCard({
  activeSeasonalRules,
  configuredLosRules,
  copy,
  formatMoney,
  formatSeasonalRange,
}: Readonly<{
  activeSeasonalRules: readonly AdminSeasonalPricingRule[];
  configuredLosRules: readonly (AdminLengthOfStayPricingRule & {
    id: string;
    nightlyRate: string;
    updatedAt: string;
  })[];
  copy: ReturnType<typeof useLocale>["messages"]["admin"]["accommodations"]["pricing"];
  formatMoney: (amount: string) => string;
  formatSeasonalRange: (rule: AdminSeasonalPricingRule) => string;
}>) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>{copy.summary.title}</CardTitle>
        <CardDescription>{copy.summary.description}</CardDescription>
      </CardHeader>
      <CardContent className="grid gap-6 lg:grid-cols-2">
        <div className="space-y-3">
          <div>
            <p className="font-semibold text-foreground">
              {copy.summary.seasonalTitle}
            </p>
            <p className="text-xs text-muted-foreground">
              {copy.summary.seasonalDescription}
            </p>
          </div>
          {activeSeasonalRules.length > 0 ? (
            <div className="grid gap-2">
              {activeSeasonalRules.map((rule) => (
                <div
                  className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-border/70 bg-muted/20 p-3"
                  key={rule.id}
                >
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium text-foreground">
                      {rule.name}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {formatSeasonalRange(rule)}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-semibold tabular-nums">
                      {formatMoney(rule.nightlyRate)}
                    </span>
                    <Badge variant={rule.isEnabled ? "default" : "secondary"}>
                      {rule.isEnabled
                        ? copy.states.enabled
                        : copy.states.disabled}
                    </Badge>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="rounded-2xl border border-dashed border-border p-4 text-sm text-muted-foreground">
              {copy.summary.noSeasonal}
            </p>
          )}
        </div>

        <div className="space-y-3">
          <div>
            <p className="font-semibold text-foreground">
              {copy.summary.losTitle}
            </p>
            <p className="text-xs text-muted-foreground">
              {copy.summary.losDescription}
            </p>
          </div>
          {configuredLosRules.length > 0 ? (
            <div className="grid gap-2">
              {configuredLosRules.map((rule) => (
                <div
                  className="flex items-center justify-between gap-3 rounded-2xl border border-border/70 bg-muted/20 p-3"
                  key={rule.minimumNights}
                >
                  <span className="text-sm font-medium">
                    {rule.minimumNights}{copy.los.tierSuffix}
                  </span>
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-semibold tabular-nums">
                      {formatMoney(rule.nightlyRate)}
                    </span>
                    <Badge variant={rule.isEnabled ? "default" : "secondary"}>
                      {rule.isEnabled
                        ? copy.states.enabled
                        : copy.states.disabled}
                    </Badge>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="rounded-2xl border border-dashed border-border p-4 text-sm text-muted-foreground">
              {copy.summary.noLos}
            </p>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

function SeasonalRatesSection({
  activeSeasonalRules,
  busyKey,
  copy,
  deletedSeasonalRules,
  formatMoney,
  formatSeasonalRange,
  onCreate,
  onDelete,
  onEdit,
  onRestore,
  onToggle,
}: Readonly<{
  activeSeasonalRules: readonly AdminSeasonalPricingRule[];
  busyKey: string | null;
  copy: ReturnType<typeof useLocale>["messages"]["admin"]["accommodations"]["pricing"];
  deletedSeasonalRules: readonly AdminSeasonalPricingRule[];
  formatMoney: (amount: string) => string;
  formatSeasonalRange: (rule: AdminSeasonalPricingRule) => string;
  onCreate: () => void;
  onDelete: (rule: AdminSeasonalPricingRule) => void;
  onEdit: (rule: AdminSeasonalPricingRule) => void;
  onRestore: (rule: AdminSeasonalPricingRule) => void;
  onToggle: (rule: AdminSeasonalPricingRule) => void;
}>) {
  return (
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
        <Button onClick={onCreate} type="button">
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
                      {formatSeasonalRange(rule)}
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
                  <p className="font-semibold tabular-nums">
                    {formatMoney(rule.nightlyRate)}
                  </p>
                </div>
                <div className="grid gap-2 sm:grid-cols-3">
                  <Button
                    onClick={() => onEdit(rule)}
                    type="button"
                    variant="outline"
                  >
                    <PencilLine aria-hidden="true" />
                    {copy.actions.edit}
                  </Button>
                  <Button
                    disabled={busyKey === `seasonal-toggle-${rule.id}`}
                    onClick={() => onToggle(rule)}
                    type="button"
                    variant="outline"
                  >
                    {rule.isEnabled
                      ? copy.actions.disable
                      : copy.actions.enable}
                  </Button>
                  <Button
                    disabled={busyKey === `seasonal-delete-${rule.id}`}
                    onClick={() => onDelete(rule)}
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
                  {formatSeasonalRange(rule)} · {formatMoney(rule.nightlyRate)}
                </p>
              </div>
              <Button
                disabled={busyKey === `seasonal-restore-${rule.id}`}
                onClick={() => onRestore(rule)}
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
  );
}

function LengthOfStayRatesSection({
  busyKey,
  copy,
  drafts,
  onDraftChange,
  onSave,
  onToggle,
  rules,
}: Readonly<{
  busyKey: string | null;
  copy: ReturnType<typeof useLocale>["messages"]["admin"]["accommodations"]["pricing"];
  drafts: Record<number, string>;
  onDraftChange: (minimumNights: number, value: string) => void;
  onSave: (minimumNights: number, updatedAt: string | null) => void;
  onToggle: (
    minimumNights: number,
    updatedAt: string,
    enabled: boolean,
  ) => void;
  rules: AdminPricingSettings["lengthOfStayRules"];
}>) {
  return (
    <section>
      <div>
        <h2 className="text-2xl font-semibold tracking-tight">
          {copy.los.title}
        </h2>
        <p className="mt-2 max-w-3xl text-sm leading-6 text-muted-foreground">
          {copy.los.description}
        </p>
      </div>

      <div className="mt-5 grid gap-3">
        {rules.map((rule) => (
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
                align="right"
                inputMode="decimal"
                label={copy.labels.nightlyRate}
                min="0.01"
                onChange={(value) => onDraftChange(rule.minimumNights, value)}
                placeholder={copy.placeholders.nightlyRate}
                step="0.01"
                type="number"
                value={drafts[rule.minimumNights] ?? ""}
              />
              <Button
                disabled={busyKey === `los-save-${rule.minimumNights}`}
                onClick={() => onSave(rule.minimumNights, rule.updatedAt)}
                type="button"
              >
                {copy.actions.saveTier}
              </Button>
              {rule.id && rule.updatedAt ? (
                <Button
                  disabled={busyKey === `los-toggle-${rule.minimumNights}`}
                  onClick={() =>
                    onToggle(
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
  );
}

function PricingPreviewCard({
  busy,
  calendarCopy,
  copy,
  formatMoney,
  locale,
  onPreview,
  onRangeChange,
  preview,
  range,
}: Readonly<{
  busy: boolean;
  calendarCopy: ReturnType<typeof useLocale>["messages"]["admin"]["accommodations"]["pricing"]["calendar"];
  copy: ReturnType<typeof useLocale>["messages"]["admin"]["accommodations"]["pricing"];
  formatMoney: (amount: string) => string;
  locale: Locale;
  onPreview: () => void;
  onRangeChange: (range: AdminPricingDateRange) => void;
  preview: AdminPricingPreview | null;
  range: AdminPricingDateRange;
}>) {
  const intlLocale = getIntlLocale(locale);

  function formatDate(value: string): string {
    if (!value) {
      return copy.calendar.notSelected;
    }

    return new Intl.DateTimeFormat(intlLocale, {
      day: "2-digit",
      month: "short",
      timeZone: "UTC",
      year: "numeric",
    }).format(new Date(`${value}T00:00:00.000Z`));
  }

  return (
    <section>
      <div>
        <h2 className="text-2xl font-semibold tracking-tight">
          {copy.preview.title}
        </h2>
        <p className="mt-2 max-w-3xl text-sm leading-6 text-muted-foreground">
          {copy.preview.description}
        </p>
      </div>
      <Card className="mt-5 overflow-visible">
        <CardContent className="space-y-5 p-5">
          <div className="grid gap-3">
            <RangeSelectionSummary
              endLabel={copy.labels.checkOutDate}
              endValue={formatDate(range.endDate)}
              startLabel={copy.labels.checkInDate}
              startValue={formatDate(range.startDate)}
            />
            <AdminPricingDateRangeCalendar
              copy={calendarCopy}
              locale={locale}
              onChange={onRangeChange}
              range={range}
            />
            <p className="text-xs leading-5 text-muted-foreground">
              {copy.calendar.previewHelp}
            </p>
          </div>

          <Button
            disabled={busy || !range.startDate || !range.endDate}
            onClick={onPreview}
            type="button"
          >
            <CalendarRange aria-hidden="true" />
            {busy ? copy.actions.previewing : copy.actions.preview}
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
  );
}

function RangeSelectionSummary({
  endLabel,
  endValue,
  startLabel,
  startValue,
}: Readonly<{
  endLabel: string;
  endValue: string;
  startLabel: string;
  startValue: string;
}>) {
  return (
    <div className="grid gap-2 rounded-2xl border border-border/70 bg-muted/20 p-3 sm:grid-cols-2">
      <div>
        <p className="text-xs text-muted-foreground">{startLabel}</p>
        <p className="mt-1 text-sm font-semibold text-foreground">
          {startValue}
        </p>
      </div>
      <div>
        <p className="text-xs text-muted-foreground">{endLabel}</p>
        <p className="mt-1 text-sm font-semibold text-foreground">{endValue}</p>
      </div>
    </div>
  );
}

function PricingInput({
  align = "left",
  inputMode,
  label,
  min,
  onChange,
  placeholder,
  step,
  type = "text",
  value,
}: Readonly<{
  align?: "left" | "right";
  inputMode?: "decimal" | "numeric" | "text";
  label: string;
  min?: string;
  onChange: (value: string) => void;
  placeholder: string;
  step?: string;
  type?: "number" | "text";
  value: string;
}>) {
  return (
    <label className="grid gap-2 text-sm font-medium text-foreground">
      <span>{label}</span>
      <input
        className={`h-11 rounded-2xl border border-border/70 bg-background px-4 text-sm text-foreground shadow-sm outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20 ${
          align === "right" ? "text-right tabular-nums" : "text-left"
        }`}
        inputMode={inputMode}
        min={min}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        step={step}
        type={type}
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
