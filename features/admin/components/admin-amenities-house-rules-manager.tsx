"use client";

import Link from "next/link";
import {
  ArrowLeft,
  Check,
  CheckCircle2,
  Circle,
  Library,
  Loader2,
  Save,
} from "lucide-react";
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
  AdminAmenityHouseRuleErrorCode,
  AdminAmenityHouseRuleSettings,
} from "@/types/admin-amenities-house-rules";

import { AdminPageHeader } from "./admin-page-header";
import { AdminSnackbar } from "./admin-snackbar";

type AmenitiesRulesApiResponse = Readonly<{
  settings?: AdminAmenityHouseRuleSettings;
  error?: Readonly<{
    code?: AdminAmenityHouseRuleErrorCode;
  }>;
}>;

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
  const [selectedAmenityIds, setSelectedAmenityIds] = useState<string[]>(() =>
    getAssignedAmenityIds(initialSettings),
  );
  const [selectedHouseRuleIds, setSelectedHouseRuleIds] = useState<string[]>(
    () => getAssignedHouseRuleIds(initialSettings),
  );
  const [isSaving, setIsSaving] = useState(false);
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

  function errorMessage(
    code: AdminAmenityHouseRuleErrorCode | undefined,
  ): string {
    return code
      ? copy.errors[code] ?? copy.errors.AMENITY_HOUSE_RULE_UNEXPECTED_ERROR
      : copy.errors.AMENITY_HOUSE_RULE_UNEXPECTED_ERROR;
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

  async function saveAssignments(): Promise<void> {
    setErrorFeedback(null);
    setSuccessFeedback(null);

    if (
      selectedAmenityIds.length === 0 ||
      selectedHouseRuleIds.length === 0
    ) {
      setErrorFeedback(copy.errors.AMENITY_HOUSE_RULE_MINIMUM_REQUIRED);
      return;
    }

    setIsSaving(true);

    try {
      const response = await fetch("/api/admin/amenities-house-rules", {
        method: "PATCH",
        headers: {
          "content-type": "application/json",
        },
        body: JSON.stringify({
          action: "update-assignments",
          propertyId: settings.property.id,
          expectedRevision: settings.revision,
          amenityIds: selectedAmenityIds,
          houseRuleIds: selectedHouseRuleIds,
        }),
      });
      const payload = (await response.json()) as AmenitiesRulesApiResponse;

      if (!response.ok || !payload.settings) {
        setErrorFeedback(errorMessage(payload.error?.code));
        return;
      }

      setSettings(payload.settings);
      setSelectedAmenityIds(getAssignedAmenityIds(payload.settings));
      setSelectedHouseRuleIds(getAssignedHouseRuleIds(payload.settings));
      setSuccessFeedback(copy.success.assignmentsSaved);
    } catch {
      setErrorFeedback(copy.errors.AMENITY_HOUSE_RULE_UNEXPECTED_ERROR);
    } finally {
      setIsSaving(false);
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
              <Link href="/admin/catalogs">
                <Library aria-hidden="true" />
                {copy.actions.openCatalogs}
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
            disabled={isSaving}
            items={settings.amenities.map((amenity) => ({
              id: amenity.id,
              label: locale === "en" ? amenity.nameEn : amenity.nameEs,
              assigned: selectedAmenityIds.includes(amenity.id),
            }))}
            onToggle={toggleAmenity}
            title={copy.sections.amenityAssignments}
          />

          <AssignmentGroup
            disabled={isSaving}
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
            <div className="space-y-1 text-sm leading-6 text-muted-foreground">
              <p>{copy.notes.minimumRequired}</p>
              <p>{copy.notes.catalogManagement}</p>
            </div>
            <Button
              disabled={!assignmentsDirty || isSaving}
              onClick={() => void saveAssignments()}
              type="button"
            >
              {isSaving ? (
                <Loader2 aria-hidden="true" className="animate-spin" />
              ) : (
                <Save aria-hidden="true" />
              )}
              {isSaving ? copy.actions.saving : copy.actions.saveAssignments}
            </Button>
          </div>
        </CardContent>
      </Card>
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
