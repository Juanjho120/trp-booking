"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

import type { AccommodationId } from "@/types/accommodation";
import type { AvailabilityBlockingRecord, DateOnlyString } from "@/types/availability";
import type { PublicAvailabilityCopy } from "@/features/availability/copy";

const DEFAULT_VISIBLE_DAYS = 60;

type AvailabilityCalendarDay = Readonly<{
  date: DateOnlyString;
  available: boolean;
  blockingSources: readonly AvailabilityBlockingRecord["source"][];
}>;

type AvailabilityCalendarResponse = Readonly<{
  accommodationId: AccommodationId;
  requestedRange: Readonly<{
    startDate: DateOnlyString;
    endDate: DateOnlyString;
  }>;
  days: readonly AvailabilityCalendarDay[];
}>;

type LoadState =
  | Readonly<{
      status: "loading";
      days: readonly AvailabilityCalendarDay[];
      errorMessage?: undefined;
    }>
  | Readonly<{
      status: "loaded";
      days: readonly AvailabilityCalendarDay[];
      errorMessage?: undefined;
    }>
  | Readonly<{
      status: "error";
      days: readonly AvailabilityCalendarDay[];
      errorMessage: string;
    }>;

type PublicAvailabilityCalendarProps = Readonly<{
  accommodationId: AccommodationId;
  copy: PublicAvailabilityCopy;
  visibleDays?: number;
}>;

function toDateOnly(value: Date): DateOnlyString {
  return value.toISOString().slice(0, 10) as DateOnlyString;
}

function addDays(date: DateOnlyString, days: number): DateOnlyString {
  const [year, month, day] = date.split("-").map(Number);
  const parsedDate = new Date(Date.UTC(year, month - 1, day));
  parsedDate.setUTCDate(parsedDate.getUTCDate() + days);

  return toDateOnly(parsedDate);
}

function formatCalendarDate(date: DateOnlyString): string {
  const [year, month, day] = date.split("-").map(Number);
  const parsedDate = new Date(Date.UTC(year, month - 1, day));

  return new Intl.DateTimeFormat("es-GT", {
    weekday: "short",
    day: "2-digit",
    month: "short",
    timeZone: "UTC",
  }).format(parsedDate);
}

function buildRequestRange(visibleDays: number): Readonly<{
  startDate: DateOnlyString;
  endDate: DateOnlyString;
}> {
  const startDate = toDateOnly(new Date());

  return {
    startDate,
    endDate: addDays(startDate, visibleDays),
  };
}

function buildAvailabilityUrl(
  accommodationId: AccommodationId,
  startDate: DateOnlyString,
  endDate: DateOnlyString,
): string {
  const searchParams = new URLSearchParams({
    accommodationId,
    startDate,
    endDate,
  });

  return `/api/availability?${searchParams.toString()}`;
}

function getDayClassName(day: AvailabilityCalendarDay): string {
  if (day.available) {
    return "border-emerald-200 bg-emerald-50 text-emerald-900";
  }

  return "border-stone-300 bg-stone-100 text-stone-500";
}

export function PublicAvailabilityCalendar({
  accommodationId,
  copy,
  visibleDays = DEFAULT_VISIBLE_DAYS,
}: PublicAvailabilityCalendarProps) {
  const requestRange = useMemo(() => buildRequestRange(visibleDays), [visibleDays]);
  const [loadState, setLoadState] = useState<LoadState>({
    status: "loading",
    days: [],
  });

  const loadAvailability = useCallback(
    async (abortSignal?: AbortSignal) => {
      setLoadState({
        status: "loading",
        days: [],
      });

      const response = await fetch(
        buildAvailabilityUrl(accommodationId, requestRange.startDate, requestRange.endDate),
        {
          method: "GET",
          signal: abortSignal,
        },
      );

      if (!response.ok) {
        const errorResponse = (await response.json().catch(() => null)) as
          | Readonly<{ error?: string }>
          | null;

        throw new Error(errorResponse?.error ?? copy.errorTitle);
      }

      const availabilityResponse = (await response.json()) as AvailabilityCalendarResponse;

      setLoadState({
        status: "loaded",
        days: availabilityResponse.days,
      });
    },
    [accommodationId, copy.errorTitle, requestRange.endDate, requestRange.startDate],
  );

  useEffect(() => {
    const abortController = new AbortController();

    loadAvailability(abortController.signal).catch((error: unknown) => {
      if (abortController.signal.aborted) {
        return;
      }

      setLoadState({
        status: "error",
        days: [],
        errorMessage: error instanceof Error ? error.message : copy.errorTitle,
      });
    });

    return () => {
      abortController.abort();
    };
  }, [copy.errorTitle, loadAvailability]);

  const unavailableSourceLabels = useMemo(() => {
    const sourceLabels = new Set(
      loadState.days
        .filter((day) => !day.available)
        .flatMap((day) => day.blockingSources),
    );

    return [...sourceLabels];
  }, [loadState.days]);

  return (
    <section className="rounded-3xl border border-stone-200 bg-white/90 p-6 shadow-sm">
      <div className="flex flex-col gap-2">
        <p className="text-xs font-semibold uppercase tracking-[0.25em] text-stone-500">
          {copy.nextWindowLabel}
        </p>
        <h2 className="text-2xl font-semibold text-stone-950">{copy.calendarTitle}</h2>
        <p className="text-sm text-stone-600">{copy.checkoutDisabledNotice}</p>
      </div>

      <div className="mt-5 flex flex-wrap gap-3 text-sm">
        <span className="rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-emerald-900">
          {copy.available}
        </span>
        <span className="rounded-full border border-stone-300 bg-stone-100 px-3 py-1 text-stone-600">
          {copy.unavailable}
        </span>
      </div>

      {loadState.status === "loading" ? (
        <p className="mt-6 rounded-2xl bg-stone-50 p-4 text-sm text-stone-600">{copy.loading}</p>
      ) : null}

      {loadState.status === "error" ? (
        <div className="mt-6 rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-900">
          <p className="font-semibold">{copy.errorTitle}</p>
          <p className="mt-1">{loadState.errorMessage}</p>
          <button
            type="button"
            className="mt-3 rounded-full border border-red-300 px-4 py-2 text-sm font-semibold"
            onClick={() => {
              loadAvailability().catch((error: unknown) => {
                setLoadState({
                  status: "error",
                  days: [],
                  errorMessage: error instanceof Error ? error.message : copy.errorTitle,
                });
              });
            }}
          >
            {copy.retry}
          </button>
        </div>
      ) : null}

      {loadState.status === "loaded" && loadState.days.length === 0 ? (
        <p className="mt-6 rounded-2xl bg-stone-50 p-4 text-sm text-stone-600">{copy.emptyState}</p>
      ) : null}

      {loadState.status === "loaded" && loadState.days.length > 0 ? (
        <>
          <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
            {loadState.days.map((day) => (
              <div
                key={day.date}
                className={`rounded-2xl border p-3 text-sm transition ${getDayClassName(day)}`}
                aria-label={`${formatCalendarDate(day.date)} — ${
                  day.available ? copy.available : copy.unavailable
                }`}
              >
                <p className="font-semibold capitalize">{formatCalendarDate(day.date)}</p>
                <p className="mt-1 text-xs">{day.available ? copy.available : copy.unavailable}</p>
              </div>
            ))}
          </div>

          {unavailableSourceLabels.length > 0 ? (
            <div className="mt-5 rounded-2xl bg-stone-50 p-4 text-sm text-stone-600">
              <p className="font-semibold text-stone-800">{copy.unavailableSourcesLabel}</p>
              <p className="mt-1">{unavailableSourceLabels.join(", ")}</p>
            </div>
          ) : null}
        </>
      ) : null}
    </section>
  );
}
