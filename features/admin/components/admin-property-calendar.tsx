"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  useEffect,
  useMemo,
  useRef,
  useState,
  useTransition,
  type KeyboardEvent,
  type MouseEvent,
} from "react";
import {
  CalendarPlus,
  ChevronLeft,
  ChevronRight,
  Link2,
  Loader2,
  LockKeyhole,
  LockKeyholeOpen,
  RotateCcw,
  Search,
  X,
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
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { useLocale } from "@/features/i18n";
import { addDaysToDateOnly } from "@/lib/availability/rules";
import {
  consolidateAdminCalendarEntries,
  type AdminCalendarDisplayEntry,
  type AdminCalendarDisplaySource,
} from "@/lib/admin/calendar-display";
import {
  ADMIN_CALENDAR_SKELETON_CELL_COUNT,
  ADMIN_CALENDAR_SKELETON_WEEKDAY_COUNT,
  areAdminCalendarTargetsEqual,
  clearAdminCalendarNavigationPending,
  createAdminCalendarHref,
  createAdminCalendarNavigationState,
  getVisibleAdminCalendarTarget,
  reconcileAdminCalendarNavigation,
  requestAdminCalendarNavigation,
  type AdminCalendarNavigationTarget,
} from "@/features/admin/lib/admin-calendar-navigation";
import { cn } from "@/lib/utils";
import type {
  AdminCalendarEntry,
  AdminCalendarErrorCode,
  AdminPropertyCalendar,
} from "@/types/admin-calendar";
import type { AdminPreparationBufferErrorCode } from "@/types/admin-preparation-buffer-management";
import type { DateOnlyString } from "@/types/availability";
import type { Locale } from "@/types/locale";

import { AdminLinkTab, AdminLinkTabList } from "./admin-link-tabs";
import { AdminNavigationLink } from "./admin-navigation-feedback";
import { AdminPageHeader } from "./admin-page-header";
import { AdminSnackbar } from "./admin-snackbar";

type CalendarApiErrorCode =
  | AdminCalendarErrorCode
  | AdminPreparationBufferErrorCode;

type CalendarApiResponse = Readonly<{
  error?: Readonly<{
    code?: CalendarApiErrorCode;
  }>;
}>;

const inputClassName =
  "h-11 w-full rounded-2xl border border-input bg-background px-3 text-sm text-foreground shadow-xs outline-none transition placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50";
const textareaClassName =
  "min-h-20 w-full resize-y rounded-2xl border border-input bg-background px-3 py-2 text-sm text-foreground shadow-xs outline-none transition placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50";

function getIntlLocale(locale: Locale): string {
  return locale === "en" ? "en-US" : "es-GT";
}

function addMonths(month: string, amount: number): string {
  const [year, monthNumber] = month.split("-").map(Number);
  const date = new Date(Date.UTC(year, monthNumber - 1 + amount, 1));
  return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, "0")}`;
}

function dayNumber(date: string): string {
  return String(Number(date.slice(-2)));
}

function normalizeSearch(value: string): string {
  return value.trim().toLocaleLowerCase();
}

function sourceClassName(source: AdminCalendarDisplaySource): string {
  const classes: Record<AdminCalendarDisplaySource, string> = {
    DIRECT_RESERVATION: "border-primary/30 bg-primary/15 text-foreground",
    PENDING_PAYMENT: "border-secondary bg-secondary text-secondary-foreground",
    AIRBNB: "border-foreground/20 bg-foreground text-background",
    AIRBNB_PREPARATION: "border-foreground/20 bg-foreground text-background",
    MANUAL_BLOCK: "border-destructive/25 bg-destructive/10 text-destructive",
    MAINTENANCE: "border-border bg-muted text-foreground",
    COMPOSED_LISTING_DEPENDENCY: "border-border bg-muted text-muted-foreground",
    PREPARATION_BUFFER: "border-primary/20 bg-primary/10 text-foreground",
    PREPARATION_BUFFER_OVERRIDE:
      "border-primary/30 bg-background text-foreground",
  };

  return classes[source];
}

function AdminCalendarWeekdayHeader({
  weekdays,
}: Readonly<{ weekdays: readonly string[] }>) {
  return (
    <div className="grid grid-cols-7 border-b border-border bg-muted/20">
      {weekdays.slice(0, ADMIN_CALENDAR_SKELETON_WEEKDAY_COUNT).map((weekday) => (
        <div
          className="px-1 py-3 text-center text-xs font-medium uppercase tracking-wide text-muted-foreground"
          key={weekday}
        >
          {weekday}
        </div>
      ))}
    </div>
  );
}

function AdminCalendarGridSkeleton({
  loadingLabel,
  weekdays,
}: Readonly<{
  loadingLabel: string;
  weekdays: readonly string[];
}>) {
  return (
    <div
      aria-busy="true"
      aria-live="polite"
      className="animate-pulse motion-reduce:animate-none"
    >
      <p className="sr-only">{loadingLabel}</p>
      <AdminCalendarWeekdayHeader weekdays={weekdays} />
      <div className="grid grid-cols-7">
        {Array.from(
          { length: ADMIN_CALENDAR_SKELETON_CELL_COUNT },
          (_, index) => (
            <div
              aria-hidden="true"
              className="min-h-28 border-b border-r border-border bg-background p-2 sm:min-h-32"
              key={index}
            >
              <div className="size-7 rounded-full bg-muted" />
              <div className="mt-3 grid gap-2">
                <div className="h-3 rounded-full bg-muted/80" />
                <div className="h-3 w-2/3 rounded-full bg-muted/70" />
              </div>
            </div>
          ),
        )}
      </div>
    </div>
  );
}

export function AdminPropertyCalendarView({
  initialCalendar,
}: Readonly<{ initialCalendar: AdminPropertyCalendar }>) {
  const router = useRouter();
  const { locale, messages } = useLocale();
  const copy = messages.admin.calendar;
  const intlLocale = getIntlLocale(locale);
  const [selectedDate, setSelectedDate] = useState<DateOnlyString | null>(null);
  const [rangeMode, setRangeMode] = useState(false);
  const [rangeStart, setRangeStart] = useState<DateOnlyString | null>(null);
  const [rangeEnd, setRangeEnd] = useState<DateOnlyString | null>(null);
  const [note, setNote] = useState("");
  const [search, setSearch] = useState("");
  const [busyKey, setBusyKey] = useState<string | null>(null);
  const [errorFeedback, setErrorFeedback] = useState<string | null>(null);
  const [successFeedback, setSuccessFeedback] = useState<string | null>(null);
  const confirmedTarget = useMemo<AdminCalendarNavigationTarget>(
    () => ({
      month: initialCalendar.month,
      propertyId: initialCalendar.selectedProperty.id,
    }),
    [initialCalendar.month, initialCalendar.selectedProperty.id],
  );
  const [navigationState, setNavigationState] = useState(() =>
    createAdminCalendarNavigationState(confirmedTarget),
  );
  const pendingTargetRef = useRef<AdminCalendarNavigationTarget | null>(null);
  const observedPendingTransitionRef = useRef(false);
  const [isRoutePending, startRouteTransition] = useTransition();
  const visibleTarget = getVisibleAdminCalendarTarget(navigationState);
  const displayProperty =
    initialCalendar.properties.find(
      (property) => property.id === visibleTarget.propertyId,
    ) ?? initialCalendar.selectedProperty;
  const isNavigationPending = navigationState.pendingTarget !== null;
  const isCalendarNavigationLocked = isNavigationPending || busyKey !== null;
  const isCalendarInteractionLocked = isNavigationPending || busyKey !== null;
  const selectedDay = selectedDate
    ? isNavigationPending
      ? null
      : initialCalendar.days.find((day) => day.date === selectedDate) ?? null
    : null;
  const normalizedSearch = normalizeSearch(search);
  const selectedDayDisplayEntries = useMemo(
    () =>
      selectedDay ? consolidateAdminCalendarEntries(selectedDay.entries) : [],
    [selectedDay],
  );

  const matchingEntryIds = useMemo(() => {
    if (!normalizedSearch) {
      return null;
    }

    return new Set(
      initialCalendar.days
        .flatMap((day) => day.entries)
        .filter((entry) => {
          const haystack = [
            entry.reservationId,
            entry.guestName,
            entry.guestEmail,
            entry.originPropertyNameEs,
            entry.originPropertyNameEn,
            entry.note,
          ]
            .filter(Boolean)
            .join(" ")
            .toLocaleLowerCase();

          return haystack.includes(normalizedSearch);
        })
        .map((entry) => entry.id),
    );
  }, [initialCalendar.days, normalizedSearch]);

  useEffect(() => {
    setNavigationState((current) => {
      const next = reconcileAdminCalendarNavigation(current, confirmedTarget);
      pendingTargetRef.current = next.pendingTarget;
      return next;
    });
  }, [confirmedTarget]);

  useEffect(() => {
    if (isRoutePending) {
      observedPendingTransitionRef.current = true;
      return;
    }

    if (!observedPendingTransitionRef.current || !pendingTargetRef.current) {
      return;
    }

    observedPendingTransitionRef.current = false;
    setNavigationState((current) => {
      const next = clearAdminCalendarNavigationPending(current);
      pendingTargetRef.current = null;
      return next;
    });
  }, [isRoutePending]);

  function formatDate(value: string): string {
    return new Intl.DateTimeFormat(intlLocale, {
      dateStyle: "long",
      timeZone: "UTC",
    }).format(new Date(`${value}T00:00:00.000Z`));
  }

  function formatMonth(value: string): string {
    return new Intl.DateTimeFormat(intlLocale, {
      month: "long",
      year: "numeric",
      timeZone: "UTC",
    }).format(new Date(`${value}-01T00:00:00.000Z`));
  }

  function displaySourceLabel(source: AdminCalendarDisplaySource): string {
    if (source === "AIRBNB_PREPARATION") {
      return `${copy.sources.AIRBNB} · ${copy.sources.PREPARATION_BUFFER}`;
    }

    return copy.sources[source];
  }

  function displayPropertyNames(entry: AdminCalendarDisplayEntry): string {
    const names = entry.entries.map((candidate) =>
      locale === "en"
        ? candidate.originPropertyNameEn
        : candidate.originPropertyNameEs,
    );

    return [...new Set(names)].join(" · ");
  }

  function displayValues(
    entry: AdminCalendarDisplayEntry,
    selector: (candidate: AdminCalendarEntry) => string | null,
  ): readonly string[] {
    return [
      ...new Set(
        entry.entries
          .map(selector)
          .filter((value): value is string => Boolean(value)),
      ),
    ];
  }

  function actionEntry(
    displayEntry: AdminCalendarDisplayEntry,
  ): AdminCalendarEntry | null {
    return displayEntry.entries.length === 1
      ? displayEntry.entries[0] ?? null
      : null;
  }

  function errorMessage(code: CalendarApiErrorCode | undefined): string {
    return code
      ? copy.errors[code] ?? copy.errors.ADMIN_CALENDAR_UNEXPECTED_ERROR
      : copy.errors.ADMIN_CALENDAR_UNEXPECTED_ERROR;
  }

  function resetRangeMode() {
    setRangeMode(false);
    setRangeStart(null);
    setRangeEnd(null);
    setNote("");
  }

  function resetCalendarSelectionState() {
    setSelectedDate(null);
    resetRangeMode();
    setErrorFeedback(null);
    setSuccessFeedback(null);
  }

  function requestCalendarNavigation(
    target: AdminCalendarNavigationTarget,
    event?: MouseEvent<HTMLAnchorElement>,
  ) {
    event?.preventDefault();

    if (
      busyKey !== null ||
      pendingTargetRef.current ||
      areAdminCalendarTargetsEqual(confirmedTarget, target)
    ) {
      return;
    }

    const decision = requestAdminCalendarNavigation(navigationState, target);

    if (!decision.shouldNavigate || !decision.href) {
      return;
    }

    const href = decision.href;
    pendingTargetRef.current = decision.state.pendingTarget;
    setNavigationState(decision.state);
    resetCalendarSelectionState();
    startRouteTransition(() => {
      router.push(href, { scroll: false });
    });
  }

  function preventLockedCalendarNavigation(
    event: KeyboardEvent<HTMLAnchorElement>,
  ) {
    if (
      isCalendarNavigationLocked &&
      (event.key === "Enter" || event.key === " ")
    ) {
      event.preventDefault();
    }
  }

  function calendarNavigationLinkProps(target: AdminCalendarNavigationTarget) {
    return {
      "aria-disabled": isCalendarNavigationLocked ? true : undefined,
      className: isCalendarNavigationLocked
        ? "aria-disabled:pointer-events-none aria-disabled:opacity-50"
        : undefined,
      href: createAdminCalendarHref(target),
      onClick: (event: MouseEvent<HTMLAnchorElement>) => {
        requestCalendarNavigation(target, event);
      },
      onKeyDown: preventLockedCalendarNavigation,
      prefetch: false,
      tabIndex: isCalendarNavigationLocked ? -1 : undefined,
    };
  }

  function selectRangeDate(date: DateOnlyString) {
    if (isCalendarInteractionLocked) {
      return;
    }

    const selectedCalendarDay = initialCalendar.days.find(
      (day) => day.date === date,
    );

    if (!selectedCalendarDay?.canCreateManualBlock) {
      return;
    }

    setErrorFeedback(null);

    if (!rangeStart || rangeEnd) {
      setRangeStart(date);
      setRangeEnd(null);
      return;
    }

    const proposedStart = date < rangeStart ? date : rangeStart;
    const proposedEnd = date < rangeStart ? rangeStart : date;
    const crossesUnavailableDate = initialCalendar.days.some(
      (day) =>
        day.date >= proposedStart &&
        day.date <= proposedEnd &&
        !day.canCreateManualBlock,
    );

    if (crossesUnavailableDate) {
      setErrorFeedback(copy.errors.ADMIN_CALENDAR_RANGE_UNAVAILABLE);
      return;
    }

    setRangeStart(proposedStart);
    setRangeEnd(proposedEnd);
  }

  async function executeMutation(
    key: string,
    request: () => Promise<Response>,
    successMessage: string,
    onSuccess?: () => void,
  ) {
    setBusyKey(key);
    setErrorFeedback(null);
    setSuccessFeedback(null);

    try {
      const response = await request();
      const payload = (await response.json()) as CalendarApiResponse;

      if (!response.ok) {
        setErrorFeedback(errorMessage(payload.error?.code));
        return;
      }

      setSuccessFeedback(successMessage);
      onSuccess?.();
      router.refresh();
    } catch {
      setErrorFeedback(copy.errors.ADMIN_CALENDAR_UNEXPECTED_ERROR);
    } finally {
      setBusyKey(null);
    }
  }

  async function createManualBlock(
    startDate: DateOnlyString,
    endDateInclusive: DateOnlyString,
    optionalNote: string | null,
  ) {
    const key = `manual-create:${startDate}:${endDateInclusive}`;

    await executeMutation(
      key,
      () =>
        fetch("/api/admin/calendar/manual-blocks", {
          method: "POST",
          headers: {
            "content-type": "application/json",
          },
          body: JSON.stringify({
            propertyId: initialCalendar.selectedProperty.id,
            startDate,
            endDate: addDaysToDateOnly(endDateInclusive, 1),
            note: optionalNote,
          }),
        }),
      copy.success.datesBlocked,
      () => {
        resetRangeMode();
        setSelectedDate(null);
      },
    );
  }

  async function releaseManualDay(entry: AdminCalendarEntry, date: DateOnlyString) {
    if (!entry.calendarBlockId) {
      return;
    }

    await executeMutation(
      `manual-release:${entry.calendarBlockId}:${date}`,
      () =>
        fetch("/api/admin/calendar/manual-blocks", {
          method: "DELETE",
          headers: {
            "content-type": "application/json",
          },
          body: JSON.stringify({
            calendarBlockId: entry.calendarBlockId,
            date,
          }),
        }),
      copy.success.dateReleased,
    );
  }

  async function unlockPreparation(entry: AdminCalendarEntry, date: DateOnlyString) {
    if (!entry.reservationId && !entry.calendarBlockId) {
      return;
    }
    const targetId = entry.reservationId ?? entry.calendarBlockId!;

    await executeMutation(
      `buffer-unlock:${targetId}:${date}`,
      () =>
        fetch("/api/admin/preparation-buffers/unlock", {
          method: "POST",
          headers: {
            "content-type": "application/json",
          },
          body: JSON.stringify({
            reservationId: entry.reservationId,
            calendarBlockId: entry.reservationId
              ? null
              : entry.calendarBlockId,
            date,
          }),
        }),
      copy.success.bufferUnlocked,
    );
  }

  async function restorePreparation(entry: AdminCalendarEntry) {
    if (!entry.calendarBlockId) {
      return;
    }

    await executeMutation(
      `buffer-restore:${entry.calendarBlockId}`,
      () =>
        fetch("/api/admin/preparation-buffers/unlock", {
          method: "DELETE",
          headers: {
            "content-type": "application/json",
          },
          body: JSON.stringify({
            overrideId: entry.calendarBlockId,
          }),
        }),
      copy.success.bufferRestored,
    );
  }

  return (
    <>
      <AdminPageHeader
        description={copy.description}
        title={copy.title}
        actions={
          <div className="flex flex-wrap gap-2">
            <Button asChild variant="outline">
              <AdminNavigationLink href="/admin/calendar/integrations">
                <Link2 aria-hidden="true" />
                {copy.actions.integrations}
              </AdminNavigationLink>
            </Button>
            <Button
              disabled={isCalendarInteractionLocked}
              onClick={() => {
                if (isCalendarInteractionLocked) {
                  return;
                }

                if (rangeMode) {
                  resetRangeMode();
                } else {
                  setRangeMode(true);
                  setSelectedDate(null);
                  setErrorFeedback(null);
                }
              }}
              type="button"
              variant={rangeMode ? "secondary" : "default"}
            >
              {rangeMode ? <X aria-hidden="true" /> : <CalendarPlus aria-hidden="true" />}
              {rangeMode ? copy.actions.cancelSelection : copy.actions.blockDates}
            </Button>
          </div>
        }
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

      <AdminLinkTabList aria-label={copy.title} className="mb-5">
        {initialCalendar.properties.map((property) => {
          const active = property.id === visibleTarget.propertyId;
          const target = {
            month: visibleTarget.month,
            propertyId: property.id,
          };

          return (
            <AdminLinkTab
              active={active}
              key={property.id}
              {...calendarNavigationLinkProps(target)}
            >
              {locale === "en" ? property.nameEn : property.nameEs}
            </AdminLinkTab>
          );
        })}
      </AdminLinkTabList>

      <Card className="border-border/70 bg-card shadow-sm">
        <CardHeader className="gap-5 border-b border-border">
          <div className="flex flex-col justify-between gap-4 md:flex-row md:items-center">
            <div>
              <CardTitle className="capitalize">
                {formatMonth(visibleTarget.month)}
              </CardTitle>
              <CardDescription>
                {locale === "en" ? displayProperty.nameEn : displayProperty.nameEs}
              </CardDescription>
            </div>
            <div className="flex items-center gap-2">
              <Button asChild size="icon" variant="outline">
                <Link
                  aria-label={copy.actions.previousMonth}
                  {...calendarNavigationLinkProps({
                    month: addMonths(visibleTarget.month, -1),
                    propertyId: visibleTarget.propertyId,
                  })}
                >
                  <ChevronLeft aria-hidden="true" />
                </Link>
              </Button>
              <Button asChild variant="outline">
                <Link
                  {...calendarNavigationLinkProps({
                    month: initialCalendar.today.slice(0, 7),
                    propertyId: visibleTarget.propertyId,
                  })}
                >
                  {copy.actions.today}
                </Link>
              </Button>
              <Button asChild size="icon" variant="outline">
                <Link
                  aria-label={copy.actions.nextMonth}
                  {...calendarNavigationLinkProps({
                    month: addMonths(visibleTarget.month, 1),
                    propertyId: visibleTarget.propertyId,
                  })}
                >
                  <ChevronRight aria-hidden="true" />
                </Link>
              </Button>
            </div>
          </div>

          <label className="relative block max-w-xl">
            <Search
              aria-hidden="true"
              className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground"
            />
            <span className="sr-only">{copy.labels.search}</span>
            <input
              className={cn(inputClassName, "pl-10")}
              onChange={(event) => setSearch(event.target.value)}
              placeholder={copy.placeholders.search}
              type="search"
              value={search}
            />
          </label>
        </CardHeader>

        <CardContent className="p-0">
          {isNavigationPending ? (
            <AdminCalendarGridSkeleton
              loadingLabel={copy.states.loading}
              weekdays={copy.weekdays}
            />
          ) : (
            <>
              {rangeMode ? (
                <div className="grid gap-4 border-b border-border bg-muted/25 p-4 md:grid-cols-[1fr_1fr_auto] md:items-end">
                  <div>
                    <p className="text-sm font-medium">
                      {copy.labels.selectedRange}
                    </p>
                    <p className="mt-1 text-sm text-muted-foreground">
                      {rangeStart
                        ? `${formatDate(rangeStart)}${rangeEnd ? ` — ${formatDate(rangeEnd)}` : ""}`
                        : copy.states.selectStart}
                    </p>
                  </div>
                  <label className="grid gap-2 text-sm font-medium">
                    {copy.labels.optionalNote}
                    <textarea
                      className={textareaClassName}
                      disabled={isCalendarInteractionLocked}
                      maxLength={500}
                      onChange={(event) => setNote(event.target.value)}
                      placeholder={copy.placeholders.optionalNote}
                      value={note}
                    />
                  </label>
                  <Button
                    disabled={
                      !rangeStart ||
                      busyKey !== null ||
                      isCalendarInteractionLocked
                    }
                    onClick={() => {
                      if (rangeStart && !isCalendarInteractionLocked) {
                        void createManualBlock(
                          rangeStart,
                          rangeEnd ?? rangeStart,
                          note.trim() || null,
                        );
                      }
                    }}
                    type="button"
                  >
                    {busyKey?.startsWith("manual-create:") ? (
                      <Loader2 aria-hidden="true" className="animate-spin" />
                    ) : (
                      <LockKeyhole aria-hidden="true" />
                    )}
                    {copy.actions.confirmBlock}
                  </Button>
                </div>
              ) : null}

              <AdminCalendarWeekdayHeader weekdays={copy.weekdays} />

              <div className="grid grid-cols-7">
                {initialCalendar.days.map((day) => {
                  const inSelectedRange = Boolean(
                    rangeStart &&
                      day.date >= rangeStart &&
                      day.date <= (rangeEnd ?? rangeStart),
                  );
                  const hasSearchMatch =
                    !matchingEntryIds ||
                    day.entries.some((entry) => matchingEntryIds.has(entry.id));
                  const displayEntries = consolidateAdminCalendarEntries(
                    day.entries,
                  );
                  const blockingDisplayEntries = displayEntries.filter(
                    (entry) => entry.blocking,
                  );
                  const visibleEntries = blockingDisplayEntries.slice(0, 2);
                  const displayBlockingCount = blockingDisplayEntries.length;
                  const hasOverride = displayEntries.some(
                    (entry) => entry.source === "PREPARATION_BUFFER_OVERRIDE",
                  );
                  const dayDisabled =
                    isCalendarInteractionLocked ||
                    (rangeMode && !day.canCreateManualBlock);

                  return (
                    <button
                      aria-label={`${formatDate(day.date)}. ${
                        displayBlockingCount > 0
                          ? copy.states.blocked
                          : copy.states.available
                      }`}
                      className={cn(
                        "min-h-28 border-b border-r border-border p-2 text-left align-top transition focus-visible:relative focus-visible:z-10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring sm:min-h-32",
                        !day.inCurrentMonth &&
                          "bg-muted/20 text-muted-foreground",
                        day.inCurrentMonth && "bg-background hover:bg-muted/30",
                        displayBlockingCount > 0 && "bg-primary/[0.04]",
                        day.isPast && "cursor-default opacity-60",
                        rangeMode &&
                          !day.canCreateManualBlock &&
                          "cursor-not-allowed bg-muted/40 opacity-50 hover:bg-muted/40",
                        inSelectedRange &&
                          "bg-primary/15 ring-2 ring-inset ring-primary",
                        normalizedSearch && !hasSearchMatch && "opacity-35",
                      )}
                      disabled={dayDisabled}
                      key={day.date}
                      onClick={() => {
                        if (isCalendarInteractionLocked) {
                          return;
                        }

                        if (rangeMode) {
                          selectRangeDate(day.date);
                        } else {
                          setSelectedDate(day.date);
                        }
                      }}
                      type="button"
                    >
                      <span
                        className={cn(
                          "flex size-7 items-center justify-center rounded-full text-sm font-medium",
                          day.date === initialCalendar.today &&
                            "bg-primary text-primary-foreground",
                        )}
                      >
                        {dayNumber(day.date)}
                      </span>
                      <span className="mt-2 grid gap-1">
                        {visibleEntries.map((entry) => (
                          <span
                            className={cn(
                              "truncate rounded-lg border px-1.5 py-1 text-[10px] font-medium leading-none sm:text-xs",
                              sourceClassName(entry.source),
                            )}
                            key={entry.id}
                          >
                            {displaySourceLabel(entry.source)}
                          </span>
                        ))}
                        {displayBlockingCount > 2 ? (
                          <span className="text-[10px] text-muted-foreground sm:text-xs">
                            +{displayBlockingCount - 2} {copy.labels.more}
                          </span>
                        ) : null}
                        {displayBlockingCount === 0 && hasOverride ? (
                          <span className="truncate rounded-lg border border-primary/30 bg-primary/10 px-1.5 py-1 text-[10px] font-medium leading-none text-foreground sm:text-xs">
                            {copy.sources.PREPARATION_BUFFER_OVERRIDE}
                          </span>
                        ) : null}
                      </span>
                    </button>
                  );
                })}
              </div>
            </>
          )}
        </CardContent>
      </Card>

      <div className="mt-5 flex flex-wrap gap-2">
        {copy.legend.map((item) => (
          <Badge
            className={sourceClassName(
              item.source as AdminCalendarEntry["source"],
            )}
            key={item.source}
            variant="outline"
          >
            {copy.sources[item.source as keyof typeof copy.sources]}
          </Badge>
        ))}
      </div>

      <Sheet
        onOpenChange={(open) => {
          if (!open) {
            setSelectedDate(null);
          }
        }}
        open={Boolean(selectedDay)}
      >
        <SheetContent closeLabel={copy.actions.close} className="overflow-y-auto">
          {selectedDay ? (
            <>
              <SheetHeader>
                <SheetTitle>{formatDate(selectedDay.date)}</SheetTitle>
                <SheetDescription>
                  {selectedDayDisplayEntries.some((entry) => entry.blocking)
                    ? copy.states.blocked
                    : copy.states.available}
                </SheetDescription>
              </SheetHeader>

              <div className="grid gap-3 px-6 pb-6">
                {selectedDayDisplayEntries.length > 0 ? (
                  selectedDayDisplayEntries.map((displayEntry) => {
                    const entry = actionEntry(displayEntry);
                    const actionTargetId =
                      entry?.calendarBlockId ??
                      entry?.reservationId ??
                      displayEntry.id;
                    const actionBusy = busyKey?.includes(actionTargetId) ?? false;
                    const guestNames = displayValues(
                      displayEntry,
                      (candidate) => candidate.guestName,
                    );
                    const reservationIds = displayValues(
                      displayEntry,
                      (candidate) => candidate.reservationId,
                    );
                    const notes = displayValues(
                      displayEntry,
                      (candidate) => candidate.note,
                    );

                    return (
                      <Card
                        className="border-border/70"
                        key={displayEntry.id}
                        size="sm"
                      >
                        <CardHeader>
                          <div className="flex flex-wrap items-start justify-between gap-2">
                            <div>
                              <CardTitle>
                                {displaySourceLabel(displayEntry.source)}
                              </CardTitle>
                              <CardDescription>
                                {displayPropertyNames(displayEntry)}
                              </CardDescription>
                            </div>
                            {displayEntry.inherited ? (
                              <Badge variant="outline">{copy.labels.inherited}</Badge>
                            ) : null}
                          </div>
                        </CardHeader>
                        <CardContent className="grid gap-3 text-sm">
                          {guestNames.length > 0 ? (
                            <p>
                              <span className="text-muted-foreground">
                                {copy.labels.guest}:{" "}
                              </span>
                              {guestNames.join(" · ")}
                            </p>
                          ) : null}
                          {reservationIds.length > 0 ? (
                            <p className="break-all">
                              <span className="text-muted-foreground">
                                {copy.labels.reservation}:{" "}
                              </span>
                              {reservationIds.join(" · ")}
                            </p>
                          ) : null}
                          {notes.map((note) => (
                            <p key={note}>
                              <span className="text-muted-foreground">
                                {copy.labels.note}:{" "}
                              </span>
                              {note}
                            </p>
                          ))}
                          {entry ? (
                            <div className="flex flex-wrap gap-2">
                              {entry.canUnlockPreparation ? (
                                <Button
                                  disabled={busyKey !== null}
                                  onClick={() => {
                                    void unlockPreparation(
                                      entry,
                                      selectedDay.date,
                                    );
                                  }}
                                  size="sm"
                                  type="button"
                                  variant="outline"
                                >
                                  {actionBusy ? (
                                    <Loader2
                                      aria-hidden="true"
                                      className="animate-spin"
                                    />
                                  ) : (
                                    <LockKeyholeOpen aria-hidden="true" />
                                  )}
                                  {copy.actions.unlockBuffer}
                                </Button>
                              ) : null}
                              {entry.canRestorePreparation ? (
                                <Button
                                  disabled={busyKey !== null}
                                  onClick={() => {
                                    void restorePreparation(entry);
                                  }}
                                  size="sm"
                                  type="button"
                                  variant="outline"
                                >
                                  {actionBusy ? (
                                    <Loader2
                                      aria-hidden="true"
                                      className="animate-spin"
                                    />
                                  ) : (
                                    <RotateCcw aria-hidden="true" />
                                  )}
                                  {copy.actions.restoreBuffer}
                                </Button>
                              ) : null}
                              {entry.canReleaseManualDay ? (
                                <Button
                                  disabled={busyKey !== null}
                                  onClick={() => {
                                    void releaseManualDay(
                                      entry,
                                      selectedDay.date,
                                    );
                                  }}
                                  size="sm"
                                  type="button"
                                  variant="outline"
                                >
                                  {actionBusy ? (
                                    <Loader2
                                      aria-hidden="true"
                                      className="animate-spin"
                                    />
                                  ) : (
                                    <LockKeyholeOpen aria-hidden="true" />
                                  )}
                                  {copy.actions.releaseDay}
                                </Button>
                              ) : null}
                            </div>
                          ) : null}
                        </CardContent>
                      </Card>
                    );
                  })
                ) : (
                  <p className="rounded-2xl border border-dashed border-border bg-muted/20 p-5 text-sm text-muted-foreground">
                    {copy.empty.noBlocks}
                  </p>
                )}
              </div>

              {selectedDay.canCreateManualBlock ? (
                <SheetFooter>
                  <Button
                    disabled={busyKey !== null}
                    onClick={() => {
                      void createManualBlock(selectedDay.date, selectedDay.date, null);
                    }}
                    type="button"
                  >
                    <LockKeyhole aria-hidden="true" />
                    {copy.actions.blockThisDay}
                  </Button>
                </SheetFooter>
              ) : null}
            </>
          ) : null}
        </SheetContent>
      </Sheet>
    </>
  );
}
