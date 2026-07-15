"use client";

import { useMemo, useState } from "react";
import {
  CalendarClock,
  CheckCircle2,
  Loader2,
  LockKeyhole,
  LockKeyholeOpen,
  Save,
  Settings2,
} from "lucide-react";

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
  AdminPreparationBufferErrorCode,
  AdminPreparationBufferManagement,
} from "@/types/admin-preparation-buffer-management";
import type { Locale } from "@/types/locale";

type AdminPreparationBufferManagementProps = Readonly<{
  initialManagement: AdminPreparationBufferManagement;
}>;

type PropertyDraft = Readonly<{
  preparationDaysBefore: string;
  preparationDaysAfter: string;
}>;

type Feedback = Readonly<{
  tone: "success" | "error";
  message: string;
}> | null;

type AdminPreparationBufferApiResponse = Readonly<{
  management?: AdminPreparationBufferManagement;
  error?: Readonly<{
    code?: AdminPreparationBufferErrorCode;
  }>;
}>;

const fieldClassName =
  "h-10 w-full rounded-xl border border-input bg-background px-3 text-sm text-foreground shadow-xs outline-none transition focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50 disabled:cursor-not-allowed disabled:opacity-50";

const textareaClassName =
  "min-h-20 w-full resize-y rounded-xl border border-input bg-background px-3 py-2 text-sm text-foreground shadow-xs outline-none transition placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50 disabled:cursor-not-allowed disabled:opacity-50";

function getIntlLocale(locale: Locale): string {
  return locale === "en" ? "en-US" : "es-GT";
}

function buildPropertyDrafts(
  management: AdminPreparationBufferManagement,
): Record<string, PropertyDraft> {
  return Object.fromEntries(
    management.properties.map((property) => [
      property.id,
      {
        preparationDaysBefore: String(property.preparationDaysBefore),
        preparationDaysAfter: String(property.preparationDaysAfter),
      },
    ]),
  );
}

export function AdminPreparationBufferManagement({
  initialManagement,
}: AdminPreparationBufferManagementProps) {
  const { locale, messages } = useLocale();
  const copy = messages.admin.preparationBuffers;
  const intlLocale = getIntlLocale(locale);
  const [management, setManagement] =
    useState<AdminPreparationBufferManagement>(initialManagement);
  const [propertyDrafts, setPropertyDrafts] = useState<
    Record<string, PropertyDraft>
  >(() => buildPropertyDrafts(initialManagement));
  const [unlockReasons, setUnlockReasons] = useState<Record<string, string>>({});
  const [busyKey, setBusyKey] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<Feedback>(null);
  const isOperationInProgress = busyKey !== null;

  const propertyNames = useMemo(
    () =>
      new Map(
        management.properties.map((property) => [
          property.id,
          locale === "en" ? property.nameEn : property.nameEs,
        ]),
      ),
    [locale, management.properties],
  );

  function formatDate(value: string): string {
    return new Intl.DateTimeFormat(intlLocale, {
      dateStyle: "medium",
      timeZone: "UTC",
    }).format(new Date(`${value}T00:00:00.000Z`));
  }

  function formatDateTime(value: string | null): string {
    if (!value) {
      return copy.labels.unavailable;
    }

    return new Intl.DateTimeFormat(intlLocale, {
      dateStyle: "medium",
      timeStyle: "short",
    }).format(new Date(value));
  }

  function getErrorMessage(
    code: AdminPreparationBufferErrorCode | undefined,
  ): string {
    if (!code) {
      return copy.errors.PREPARATION_BUFFER_UNEXPECTED_ERROR;
    }

    return copy.errors[code] ?? copy.errors.PREPARATION_BUFFER_UNEXPECTED_ERROR;
  }

  function applyManagement(nextManagement: AdminPreparationBufferManagement) {
    setManagement(nextManagement);
    setPropertyDrafts(buildPropertyDrafts(nextManagement));
  }

  async function savePropertySettings(propertyId: string) {
    const draft = propertyDrafts[propertyId];

    if (!draft) {
      return;
    }

    const preparationDaysBefore = Number(draft.preparationDaysBefore);
    const preparationDaysAfter = Number(draft.preparationDaysAfter);
    const requestKey = `settings:${propertyId}`;

    setBusyKey(requestKey);
    setFeedback(null);

    try {
      const response = await fetch("/api/admin/preparation-buffers", {
        method: "PATCH",
        headers: {
          "content-type": "application/json",
        },
        body: JSON.stringify({
          propertyId,
          preparationDaysBefore,
          preparationDaysAfter,
        }),
      });
      const payload =
        (await response.json()) as AdminPreparationBufferApiResponse;

      if (!response.ok || !payload.management) {
        setFeedback({
          tone: "error",
          message: getErrorMessage(payload.error?.code),
        });
        return;
      }

      applyManagement(payload.management);
      setFeedback({
        tone: "success",
        message: copy.success.settingsSaved,
      });
    } catch {
      setFeedback({
        tone: "error",
        message: copy.errors.PREPARATION_BUFFER_UNEXPECTED_ERROR,
      });
    } finally {
      setBusyKey(null);
    }
  }

  async function unlockBufferDay(reservationId: string, date: string) {
    const reasonKey = `${reservationId}:${date}`;
    const reason = unlockReasons[reasonKey]?.trim() ?? "";
    const requestKey = `unlock:${reasonKey}`;

    setBusyKey(requestKey);
    setFeedback(null);

    try {
      const response = await fetch(
        "/api/admin/preparation-buffers/unlock",
        {
          method: "POST",
          headers: {
            "content-type": "application/json",
          },
          body: JSON.stringify({
            reservationId,
            date,
            reason,
          }),
        },
      );
      const payload =
        (await response.json()) as AdminPreparationBufferApiResponse;

      if (!response.ok || !payload.management) {
        setFeedback({
          tone: "error",
          message: getErrorMessage(payload.error?.code),
        });
        return;
      }

      applyManagement(payload.management);
      setUnlockReasons((current) => {
        const next = { ...current };
        delete next[reasonKey];
        return next;
      });
      setFeedback({
        tone: "success",
        message: copy.success.dayUnlocked,
      });
    } catch {
      setFeedback({
        tone: "error",
        message: copy.errors.PREPARATION_BUFFER_UNEXPECTED_ERROR,
      });
    } finally {
      setBusyKey(null);
    }
  }

  return (
    <section className="pb-12">
      <div className="mx-auto max-w-7xl space-y-8 px-6 lg:px-8">
        <div>
          <Badge className="rounded-full" variant="secondary">
            {copy.badge}
          </Badge>
          <h2 className="mt-4 text-2xl font-semibold tracking-tight">
            {copy.title}
          </h2>
          <p className="mt-2 max-w-4xl text-sm leading-6 text-muted-foreground">
            {copy.description}
          </p>
        </div>

        {feedback ? (
          <div
            className={
              feedback.tone === "success"
                ? "rounded-2xl border border-primary/30 bg-primary/10 px-4 py-3 text-sm text-foreground"
                : "rounded-2xl border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive"
            }
            role="status"
          >
            {feedback.message}
          </div>
        ) : null}

        <div className="space-y-4">
          <div>
            <h3 className="text-xl font-semibold tracking-tight">
              {copy.sections.settings}
            </h3>
            <p className="mt-2 text-sm leading-6 text-muted-foreground">
              {copy.notes.settingsImpact}
            </p>
          </div>

          <div className="grid gap-5 lg:grid-cols-3">
            {management.properties.map((property) => {
              const draft = propertyDrafts[property.id];
              const requestKey = `settings:${property.id}`;
              const isBusy = busyKey === requestKey;

              return (
                <Card
                  className="border-border/70 bg-card shadow-sm"
                  key={property.id}
                >
                  <CardHeader>
                    <div className="mb-4 flex size-11 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                      <Settings2 aria-hidden="true" className="size-5" />
                    </div>
                    <CardTitle>
                      {propertyNames.get(property.id) ?? property.id}
                    </CardTitle>
                    <CardDescription>
                      {copy.labels.lastUpdated}:{" "}
                      {formatDateTime(property.updatedAt)}
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <form
                      className="space-y-4"
                      onSubmit={(event) => {
                        event.preventDefault();
                        void savePropertySettings(property.id);
                      }}
                    >
                      <label className="grid gap-2 text-sm font-medium">
                        {copy.labels.daysBefore}
                        <input
                          className={fieldClassName}
                          disabled={isOperationInProgress}
                          inputMode="numeric"
                          max={30}
                          min={0}
                          onChange={(event) => {
                            const value = event.target.value;
                            setPropertyDrafts((current) => ({
                              ...current,
                              [property.id]: {
                                ...(current[property.id] ?? {
                                  preparationDaysBefore: "0",
                                  preparationDaysAfter: "0",
                                }),
                                preparationDaysBefore: value,
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
                          disabled={isOperationInProgress}
                          inputMode="numeric"
                          max={30}
                          min={0}
                          onChange={(event) => {
                            const value = event.target.value;
                            setPropertyDrafts((current) => ({
                              ...current,
                              [property.id]: {
                                ...(current[property.id] ?? {
                                  preparationDaysBefore: "0",
                                  preparationDaysAfter: "0",
                                }),
                                preparationDaysAfter: value,
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
                        className="w-full rounded-full"
                        disabled={isOperationInProgress}
                        type="submit"
                      >
                        {isBusy ? (
                          <Loader2
                            aria-hidden="true"
                            className="animate-spin"
                          />
                        ) : (
                          <Save aria-hidden="true" />
                        )}
                        {isBusy
                          ? copy.actions.saving
                          : copy.actions.saveSettings}
                      </Button>
                    </form>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>

        <div className="space-y-4">
          <div>
            <h3 className="text-xl font-semibold tracking-tight">
              {copy.sections.unlocks}
            </h3>
            <p className="mt-2 max-w-4xl text-sm leading-6 text-muted-foreground">
              {copy.notes.unlockScope}
            </p>
          </div>

          {management.reservations.length === 0 ? (
            <Card
              className="border-dashed border-border/70 bg-muted/20 shadow-none"
              size="sm"
            >
              <CardContent className="py-8 text-center text-sm text-muted-foreground">
                {copy.empty.noConfirmedBuffers}
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-5">
              {management.reservations.map((reservation) => (
                <Card
                  className="border-border/70 bg-card shadow-sm"
                  key={reservation.id}
                >
                  <CardHeader>
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div>
                        <CardTitle>
                          {locale === "en"
                            ? reservation.propertyNameEn
                            : reservation.propertyNameEs}
                        </CardTitle>
                        <CardDescription className="mt-1">
                          {copy.labels.reservation}: {reservation.id}
                        </CardDescription>
                      </div>
                      <Badge variant="outline">
                        <CalendarClock aria-hidden="true" />
                        {formatDate(reservation.checkInDate)} —{" "}
                        {formatDate(reservation.checkOutDate)}
                      </Badge>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      {copy.labels.guest}: {reservation.guestName}
                    </p>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {reservation.bufferDays.map((bufferDay) => {
                      const reasonKey = `${reservation.id}:${bufferDay.date}`;
                      const requestKey = `unlock:${reasonKey}`;
                      const isBusy = busyKey === requestKey;

                      return (
                        <div
                          className="grid gap-4 rounded-3xl border border-border bg-muted/20 p-4 lg:grid-cols-[0.8fr_0.8fr_2fr_auto] lg:items-end"
                          key={reasonKey}
                        >
                          <div>
                            <p className="text-xs font-medium uppercase tracking-[0.18em] text-muted-foreground">
                              {copy.labels.bufferDay}
                            </p>
                            <p className="mt-1 font-medium text-foreground">
                              {formatDate(bufferDay.date)}
                            </p>
                          </div>

                          <div>
                            <p className="text-xs font-medium uppercase tracking-[0.18em] text-muted-foreground">
                              {copy.labels.bufferType}
                            </p>
                            <Badge
                              className="mt-1"
                              variant={
                                bufferDay.kind === "before-check-in"
                                  ? "secondary"
                                  : "outline"
                              }
                            >
                              {bufferDay.kind === "before-check-in"
                                ? copy.kinds.beforeCheckIn
                                : copy.kinds.afterCheckOut}
                            </Badge>
                          </div>

                          {bufferDay.isUnlocked ? (
                            <div className="rounded-2xl border border-primary/30 bg-primary/10 p-3 text-sm">
                              <div className="flex items-center gap-2 font-medium text-foreground">
                                <CheckCircle2
                                  aria-hidden="true"
                                  className="size-4 text-primary"
                                />
                                {copy.labels.unlocked}
                              </div>
                              <p className="mt-2 text-muted-foreground">
                                {bufferDay.overrideReason ??
                                  copy.labels.unavailable}
                              </p>
                              <p className="mt-1 text-xs text-muted-foreground">
                                {bufferDay.unlockedByName ??
                                  bufferDay.unlockedByEmail ??
                                  copy.labels.unavailable}{" "}
                                · {formatDateTime(bufferDay.unlockedAt)}
                              </p>
                            </div>
                          ) : (
                            <label className="grid gap-2 text-sm font-medium">
                              {copy.labels.reason}
                              <textarea
                                className={textareaClassName}
                                disabled={isOperationInProgress}
                                maxLength={500}
                                onChange={(event) => {
                                  const value = event.target.value;
                                  setUnlockReasons((current) => ({
                                    ...current,
                                    [reasonKey]: value,
                                  }));
                                }}
                                placeholder={copy.placeholders.reason}
                                required
                                value={unlockReasons[reasonKey] ?? ""}
                              />
                            </label>
                          )}

                          {bufferDay.isUnlocked ? (
                            <Badge variant="secondary">
                              <LockKeyholeOpen aria-hidden="true" />
                              {copy.labels.availableByOverride}
                            </Badge>
                          ) : (
                            <Button
                              className="rounded-full"
                              disabled={
                                isOperationInProgress ||
                                !(unlockReasons[reasonKey]?.trim().length ?? 0)
                              }
                              onClick={() => {
                                void unlockBufferDay(
                                  reservation.id,
                                  bufferDay.date,
                                );
                              }}
                              type="button"
                              variant="outline"
                            >
                              {isBusy ? (
                                <Loader2
                                  aria-hidden="true"
                                  className="animate-spin"
                                />
                              ) : (
                                <LockKeyholeOpen aria-hidden="true" />
                              )}
                              {isBusy
                                ? copy.actions.unlocking
                                : copy.actions.unlockDay}
                            </Button>
                          )}
                        </div>
                      );
                    })}
                  </CardContent>
                </Card>
              ))}
            </div>
          )}

          <div className="flex items-start gap-3 rounded-2xl border border-border bg-muted/35 p-4 text-sm leading-6 text-muted-foreground">
            <LockKeyhole
              aria-hidden="true"
              className="mt-1 size-4 shrink-0 text-primary"
            />
            <p>{copy.notes.otherBlocksMayStillApply}</p>
          </div>
        </div>
      </div>
    </section>
  );
}
