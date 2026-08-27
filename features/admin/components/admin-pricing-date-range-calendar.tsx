"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";
import { useEffect, useMemo, useState } from "react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { Locale } from "@/types/locale";

export type AdminPricingDateRange = Readonly<{
  startDate: string;
  endDate: string;
}>;

export type AdminPricingDisabledDateRange = Readonly<{
  startDate: string;
  endDate: string;
}>;

type CalendarCopy = Readonly<{
  previousMonth: string;
  nextMonth: string;
  selectStart: string;
  selectEnd: string;
}>;

type CalendarDay = Readonly<{
  date: Date;
  dateOnly: string;
  inCurrentMonth: boolean;
}>;

const DAYS_PER_WEEK = 7;
const CALENDAR_WEEKS = 6;
const CALENDAR_CELLS = DAYS_PER_WEEK * CALENDAR_WEEKS;

function toDateOnly(date: Date): string {
  return [
    String(date.getUTCFullYear()).padStart(4, "0"),
    String(date.getUTCMonth() + 1).padStart(2, "0"),
    String(date.getUTCDate()).padStart(2, "0"),
  ].join("-");
}

function fromDateOnly(value: string): Date {
  return new Date(`${value}T00:00:00.000Z`);
}

function addUtcDays(date: Date, days: number): Date {
  const next = new Date(date);
  next.setUTCDate(next.getUTCDate() + days);
  return next;
}

function addUtcMonths(date: Date, months: number): Date {
  return new Date(
    Date.UTC(date.getUTCFullYear(), date.getUTCMonth() + months, 1),
  );
}

function monthStart(date: Date): Date {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), 1));
}

function todayDateOnly(): string {
  const now = new Date();
  return [
    String(now.getFullYear()).padStart(4, "0"),
    String(now.getMonth() + 1).padStart(2, "0"),
    String(now.getDate()).padStart(2, "0"),
  ].join("-");
}

function buildCalendarDays(month: Date): readonly CalendarDay[] {
  const firstDay = monthStart(month);
  const gridStart = addUtcDays(firstDay, -firstDay.getUTCDay());

  return Array.from({ length: CALENDAR_CELLS }, (_, index) => {
    const date = addUtcDays(gridStart, index);

    return {
      date,
      dateOnly: toDateOnly(date),
      inCurrentMonth: date.getUTCMonth() === firstDay.getUTCMonth(),
    };
  });
}

function dateIsInsideHalfOpenRange(
  date: string,
  range: AdminPricingDisabledDateRange,
): boolean {
  return date >= range.startDate && date < range.endDate;
}

function rangeCrossesDisabledDate(
  startDate: string,
  endDate: string,
  isDisabled: (date: string) => boolean,
): boolean {
  let cursor = fromDateOnly(startDate);
  const end = fromDateOnly(endDate);

  while (cursor.getTime() <= end.getTime()) {
    if (isDisabled(toDateOnly(cursor))) {
      return true;
    }

    cursor = addUtcDays(cursor, 1);
  }

  return false;
}

export function AdminPricingDateRangeCalendar({
  allowSameDayEnd = false,
  copy,
  disabledRanges = [],
  disablePastDates = false,
  locale,
  onChange,
  range,
}: Readonly<{
  allowSameDayEnd?: boolean;
  copy: CalendarCopy;
  disabledRanges?: readonly AdminPricingDisabledDateRange[];
  disablePastDates?: boolean;
  locale: Locale;
  onChange: (range: AdminPricingDateRange) => void;
  range: AdminPricingDateRange;
}>) {
  const intlLocale = locale === "en" ? "en-US" : "es-GT";
  const firstVisibleDate = range.startDate || todayDateOnly();
  const [visibleMonth, setVisibleMonth] = useState(() =>
    monthStart(fromDateOnly(firstVisibleDate)),
  );
  const days = useMemo(() => buildCalendarDays(visibleMonth), [visibleMonth]);
  const today = todayDateOnly();
  const monthLabel = new Intl.DateTimeFormat(intlLocale, {
    month: "long",
    timeZone: "UTC",
    year: "numeric",
  }).format(visibleMonth);
  const weekdayFormatter = new Intl.DateTimeFormat(intlLocale, {
    timeZone: "UTC",
    weekday: "short",
  });
  const fullDateFormatter = new Intl.DateTimeFormat(intlLocale, {
    dateStyle: "full",
    timeZone: "UTC",
  });
  const weekdayLabels = Array.from({ length: DAYS_PER_WEEK }, (_, index) =>
    weekdayFormatter.format(addUtcDays(new Date(Date.UTC(2026, 0, 4)), index)),
  );

  useEffect(() => {
    if (range.startDate) {
      setVisibleMonth(monthStart(fromDateOnly(range.startDate)));
    }
  }, [range.startDate]);

  function isDisabled(date: string): boolean {
    if (disablePastDates && date < today) {
      return true;
    }

    return disabledRanges.some((disabledRange) =>
      dateIsInsideHalfOpenRange(date, disabledRange),
    );
  }

  function handleDateClick(date: string): void {
    if (isDisabled(date)) {
      return;
    }

    if (!range.startDate || range.endDate) {
      onChange({ startDate: date, endDate: "" });
      return;
    }

    if (date < range.startDate) {
      onChange({ startDate: date, endDate: "" });
      return;
    }

    if (date === range.startDate && !allowSameDayEnd) {
      onChange({ startDate: date, endDate: "" });
      return;
    }

    if (rangeCrossesDisabledDate(range.startDate, date, isDisabled)) {
      onChange({ startDate: date, endDate: "" });
      return;
    }

    onChange({ startDate: range.startDate, endDate: date });
  }

  return (
    <div className="rounded-2xl border border-border/70 bg-background p-3 shadow-sm sm:p-4">
      <div className="mb-3 flex items-center justify-between gap-3">
        <Button
          aria-label={copy.previousMonth}
          onClick={() => setVisibleMonth((month) => addUtcMonths(month, -1))}
          size="icon"
          type="button"
          variant="outline"
        >
          <ChevronLeft aria-hidden="true" className="size-4" />
        </Button>
        <p className="text-sm font-semibold capitalize text-foreground">
          {monthLabel}
        </p>
        <Button
          aria-label={copy.nextMonth}
          onClick={() => setVisibleMonth((month) => addUtcMonths(month, 1))}
          size="icon"
          type="button"
          variant="outline"
        >
          <ChevronRight aria-hidden="true" className="size-4" />
        </Button>
      </div>

      <div className="grid grid-cols-7 gap-1 text-center">
        {weekdayLabels.map((label, index) => (
          <span
            className="py-1 text-[0.7rem] font-medium uppercase tracking-wide text-muted-foreground"
            key={`${label}-${index}`}
          >
            {label}
          </span>
        ))}

        {days.map((day) => {
          const disabled = isDisabled(day.dateOnly);
          const isStart = day.dateOnly === range.startDate;
          const isEnd = day.dateOnly === range.endDate;
          const isInRange =
            Boolean(range.startDate && range.endDate) &&
            day.dateOnly > range.startDate &&
            day.dateOnly < range.endDate;
          const isToday = day.dateOnly === today;

          return (
            <button
              aria-label={fullDateFormatter.format(day.date)}
              aria-pressed={isStart || isEnd || isInRange}
              className={cn(
                "relative flex aspect-square min-h-9 items-center justify-center rounded-xl text-sm outline-none transition focus-visible:ring-2 focus-visible:ring-primary/40",
                !day.inCurrentMonth && "text-muted-foreground/50",
                day.inCurrentMonth && !disabled && "hover:bg-muted",
                isToday && !isStart && !isEnd && "font-semibold text-primary",
                isInRange && "rounded-none bg-primary/10 text-foreground",
                isStart &&
                  range.endDate &&
                  "rounded-r-none bg-primary text-primary-foreground",
                isStart &&
                  !range.endDate &&
                  "rounded-xl bg-primary text-primary-foreground",
                isEnd && "rounded-l-none bg-primary text-primary-foreground",
                isStart && isEnd && "rounded-xl",
                disabled &&
                  "cursor-not-allowed bg-muted/40 text-muted-foreground/35 line-through",
              )}
              disabled={disabled}
              key={day.dateOnly}
              onClick={() => handleDateClick(day.dateOnly)}
              type="button"
            >
              {day.date.getUTCDate()}
            </button>
          );
        })}
      </div>

      <p className="mt-3 text-xs leading-5 text-muted-foreground">
        {range.startDate && !range.endDate ? copy.selectEnd : copy.selectStart}
      </p>
    </div>
  );
}
