"use client";

import { CalendarDays } from "lucide-react";
import { useState } from "react";
import {
  DayPicker,
  type DateRange,
  type Matcher,
} from "react-day-picker";

import { Button } from "@/components/ui/button";

const dayPickerClassNames = {
  months: "grid gap-4",
  month: "space-y-4",
  caption:
    "flex items-center justify-between px-1 text-sm font-medium text-foreground",
  caption_label: "text-sm font-semibold",
  nav: "flex items-center gap-2",
  button_previous:
    "inline-flex size-8 items-center justify-center rounded-full border border-border/70 bg-background text-muted-foreground transition hover:bg-muted hover:text-foreground",
  button_next:
    "inline-flex size-8 items-center justify-center rounded-full border border-border/70 bg-background text-muted-foreground transition hover:bg-muted hover:text-foreground",
  month_grid: "w-full border-collapse space-y-1",
  weekdays: "grid grid-cols-7 text-xs text-muted-foreground",
  weekday: "flex h-8 items-center justify-center font-medium",
  week: "grid grid-cols-7",
  day: "relative flex size-10 items-center justify-center text-sm",
  day_button:
    "flex size-9 items-center justify-center rounded-full text-sm transition hover:bg-primary/10 hover:text-primary focus:outline-none focus:ring-2 focus:ring-primary/30",
  selected: "",
  range_start: "rounded-l-full bg-primary text-primary-foreground",
  range_middle: "rounded-none bg-primary/15 text-primary",
  range_end: "rounded-r-full bg-primary text-primary-foreground",
  today: "font-bold text-primary",
  outside: "text-muted-foreground/40",
  disabled: "pointer-events-none text-muted-foreground/30 line-through",
};

function startOfDate(date: Date): number {
  const normalizedDate = new Date(date);
  normalizedDate.setHours(0, 0, 0, 0);
  return normalizedDate.getTime();
}

function isDateInRange(date: Date, from: Date, to: Date): boolean {
  const dateTime = startOfDate(date);
  return dateTime >= startOfDate(from) && dateTime <= startOfDate(to);
}

export type AvailabilityDateRangePickerProps = Readonly<{
  blockedDates: readonly Date[];
  clearLabel: string;
  disabled?: boolean;
  disabledAfter?: Date;
  disabledBefore?: Date;
  doneLabel: string;
  fixedStartDate?: Date;
  helperText?: string;
  label?: string;
  minimumFixedEndDate?: Date;
  month: Date;
  onClear: () => void;
  onDone: () => void;
  onMonthChange: (month: Date) => void;
  onOpenChange: (open: boolean) => void;
  onSelect: (value: DateRange | undefined) => void;
  open: boolean;
  selectedLabel: string;
  statusMessage?: string | null;
  statusVariant?: "muted" | "error";
  value: DateRange | undefined;
}>;

export function AvailabilityDateRangePicker({
  blockedDates,
  clearLabel,
  disabled = false,
  disabledAfter,
  disabledBefore,
  doneLabel,
  fixedStartDate,
  helperText,
  label,
  minimumFixedEndDate,
  month,
  onClear,
  onDone,
  onMonthChange,
  onOpenChange,
  onSelect,
  open,
  selectedLabel,
  statusMessage = null,
  statusVariant = "muted",
  value,
}: AvailabilityDateRangePickerProps) {
  const [hoveredDate, setHoveredDate] = useState<Date | undefined>();
  const previewRange =
    value?.from &&
    !value.to &&
    hoveredDate &&
    startOfDate(hoveredDate) > startOfDate(value.from)
      ? { from: value.from, to: hoveredDate }
      : null;
  const disabledMatchers: Matcher[] = [...blockedDates];

  if (disabledBefore) {
    disabledMatchers.unshift({ before: disabledBefore });
  }

  if (disabledAfter) {
    disabledMatchers.push({ after: disabledAfter });
  }

  function handleSelect(nextRange: DateRange | undefined): void {
    if (!fixedStartDate) {
      onSelect(nextRange);
      return;
    }

    const candidate = nextRange?.to ?? nextRange?.from;

    if (!candidate) {
      return;
    }

    if (
      minimumFixedEndDate &&
      startOfDate(candidate) <= startOfDate(minimumFixedEndDate)
    ) {
      return;
    }

    onSelect({
      from: fixedStartDate,
      to: candidate,
    });
  }

  return (
    <div className="grid gap-2 text-sm font-medium text-foreground">
      {label ? <span>{label}</span> : null}
      <div className="relative">
        <button
          className="flex h-11 w-full items-center justify-between gap-3 rounded-2xl border border-border/70 bg-background px-4 text-left text-sm text-foreground shadow-sm outline-none transition hover:border-primary/60 focus:border-primary focus:ring-2 focus:ring-primary/20 disabled:cursor-not-allowed disabled:opacity-50"
          disabled={disabled}
          onClick={() => onOpenChange(!open)}
          type="button"
        >
          <span
            className={
              value?.from && value.to
                ? "text-foreground"
                : "text-muted-foreground"
            }
          >
            {selectedLabel}
          </span>
          <CalendarDays
            aria-hidden="true"
            className="size-4 text-muted-foreground"
          />
        </button>

        {open ? (
          <div
            className="absolute left-0 top-full z-[80] mt-2 w-full rounded-[1.5rem] border border-border/70 bg-card p-4 shadow-2xl sm:w-[24rem]"
            onMouseLeave={() => setHoveredDate(undefined)}
          >
            <DayPicker
              classNames={dayPickerClassNames}
              disabled={disabledMatchers}
              excludeDisabled
              mode="range"
              modifiers={{
                blocked: [...blockedDates],
                preview_range: (date) =>
                  previewRange
                    ? isDateInRange(date, previewRange.from, previewRange.to)
                    : false,
              }}
              modifiersClassNames={{
                blocked:
                  "pointer-events-none text-muted-foreground/30 line-through",
                preview_range: "bg-primary/10 text-primary",
              }}
              month={month}
              numberOfMonths={1}
              onDayMouseEnter={setHoveredDate}
              onMonthChange={onMonthChange}
              onSelect={handleSelect}
              selected={value}
              weekStartsOn={1}
            />
            <div className="mt-3 grid gap-2 sm:grid-cols-2">
              <Button
                className="rounded-full"
                disabled={disabled}
                onClick={onClear}
                type="button"
                variant="ghost"
              >
                {clearLabel}
              </Button>
              <Button
                className="rounded-full"
                disabled={disabled}
                onClick={onDone}
                type="button"
                variant="secondary"
              >
                {doneLabel}
              </Button>
            </div>
          </div>
        ) : null}
      </div>

      {helperText ? (
        <span className="text-xs font-normal leading-5 text-muted-foreground">
          {helperText}
        </span>
      ) : null}

      {statusMessage ? (
        <span
          className={
            statusVariant === "error"
              ? "text-xs font-normal leading-5 text-destructive"
              : "text-xs font-normal leading-5 text-muted-foreground"
          }
        >
          {statusMessage}
        </span>
      ) : null}

    </div>
  );
}
