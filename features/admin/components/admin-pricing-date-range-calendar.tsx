"use client";

import { useEffect, useMemo, useState } from "react";
import type { DateRange } from "react-day-picker";

import { AvailabilityDateRangePicker } from "@/components/availability/availability-date-range-picker";
import { useLocale } from "@/features/i18n";
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
  selectStart: string;
  selectEnd: string;
}>;

function dateOnlyStringToLocalDate(value: string): Date {
  const [year, month, day] = value.split("-").map(Number);

  return new Date(year, month - 1, day);
}

function toDateOnlyString(value: Date): string {
  const year = value.getFullYear();
  const month = String(value.getMonth() + 1).padStart(2, "0");
  const day = String(value.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

function addCalendarDays(value: Date, days: number): Date {
  return new Date(
    value.getFullYear(),
    value.getMonth(),
    value.getDate() + days,
  );
}

function getGuatemalaBusinessDate(): Date {
  const parts = new Intl.DateTimeFormat("en-CA", {
    day: "2-digit",
    month: "2-digit",
    timeZone: "America/Guatemala",
    year: "numeric",
  }).formatToParts(new Date());

  const values = Object.fromEntries(
    parts
      .filter((part) => part.type !== "literal")
      .map((part) => [part.type, part.value]),
  );

  return dateOnlyStringToLocalDate(
    `${values.year}-${values.month}-${values.day}`,
  );
}

function expandDisabledRanges(
  ranges: readonly AdminPricingDisabledDateRange[],
): readonly Date[] {
  const result: Date[] = [];

  for (const range of ranges) {
    let cursor = dateOnlyStringToLocalDate(range.startDate);
    const end = dateOnlyStringToLocalDate(range.endDate);

    while (cursor.getTime() < end.getTime()) {
      result.push(cursor);
      cursor = addCalendarDays(cursor, 1);
    }
  }

  return result;
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
  const { messages } = useLocale();
  const dateRangeCopy = messages.reservations.requestUx.dateRange;

  const selectedRange = useMemo<DateRange | undefined>(() => {
    if (!range.startDate) {
      return undefined;
    }

    return {
      from: dateOnlyStringToLocalDate(range.startDate),
      to: range.endDate
        ? dateOnlyStringToLocalDate(range.endDate)
        : undefined,
    };
  }, [range.endDate, range.startDate]);

  const disabledDates = useMemo(
    () => expandDisabledRanges(disabledRanges),
    [disabledRanges],
  );

  const initialMonth = selectedRange?.from ?? getGuatemalaBusinessDate();
  const [visibleMonth, setVisibleMonth] = useState(initialMonth);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (selectedRange?.from) {
      setVisibleMonth(selectedRange.from);
    }
  }, [selectedRange?.from]);

  const selectedLabel = useMemo(() => {
    if (!selectedRange?.from) {
      return copy.selectStart;
    }

    const intlLocale = locale === "en" ? "en-US" : "es-GT";
    const formatter = new Intl.DateTimeFormat(intlLocale, {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });

    if (!selectedRange.to) {
      return formatter.format(selectedRange.from);
    }

    return `${formatter.format(selectedRange.from)} — ${formatter.format(
      selectedRange.to,
    )}`;
  }, [copy.selectStart, locale, selectedRange]);

  function handleSelect(nextRange: DateRange | undefined): void {
    const startDate = nextRange?.from
      ? toDateOnlyString(nextRange.from)
      : "";

    const endDate = nextRange?.to ? toDateOnlyString(nextRange.to) : "";

    if (
      !allowSameDayEnd &&
      startDate &&
      endDate &&
      startDate === endDate
    ) {
      onChange({
        startDate,
        endDate: "",
      });

      return;
    }

    onChange({
      startDate,
      endDate,
    });
  }

  return (
    <AvailabilityDateRangePicker
      blockedDates={disabledDates}
      clearLabel={dateRangeCopy.clear}
      disabledBefore={
        disablePastDates ? getGuatemalaBusinessDate() : undefined
      }
      doneLabel={dateRangeCopy.done}
      helperText={
        range.startDate && !range.endDate
          ? copy.selectEnd
          : copy.selectStart
      }
      label=""
      month={visibleMonth}
      onClear={() =>
        onChange({
          startDate: "",
          endDate: "",
        })
      }
      onDone={() => setOpen(false)}
      onMonthChange={setVisibleMonth}
      onOpenChange={setOpen}
      onSelect={handleSelect}
      open={open}
      selectedLabel={selectedLabel}
      value={selectedRange}
    />
  );
}