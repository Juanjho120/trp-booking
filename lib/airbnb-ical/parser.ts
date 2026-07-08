import type {
  AirbnbIcalImportedEvent,
  AirbnbIcalImportedEventStatus,
  AirbnbIcalParseResult,
} from "./types";

import {
  addDaysToDateOnly,
  assertDateOnlyString,
  assertValidAvailabilityDateRange,
} from "@/lib/availability/rules";
import type { DateOnlyString } from "@/types/availability";

const BEGIN_EVENT = "BEGIN:VEVENT";
const END_EVENT = "END:VEVENT";
const DATE_ONLY_COMPACT_PATTERN = /^\d{8}$/;
const DATE_ONLY_DASHED_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

function unfoldIcalLines(content: string): readonly string[] {
  const rawLines = content.replace(/\r\n/g, "\n").replace(/\r/g, "\n").split("\n");
  const lines: string[] = [];

  for (const rawLine of rawLines) {
    if (/^[ \t]/.test(rawLine) && lines.length > 0) {
      lines[lines.length - 1] += rawLine.slice(1);
      continue;
    }

    lines.push(rawLine);
  }

  return lines.map((line) => line.trimEnd()).filter(Boolean);
}

function getLineName(line: string): string {
  const separatorIndex = line.indexOf(":");
  const head = separatorIndex >= 0 ? line.slice(0, separatorIndex) : line;

  return head.split(";")[0].trim().toUpperCase();
}

function getLineValue(line: string): string | undefined {
  const separatorIndex = line.indexOf(":");

  if (separatorIndex < 0) {
    return undefined;
  }

  return line.slice(separatorIndex + 1).trim();
}

function unescapeIcalText(value: string): string {
  return value
    .replace(/\\n/gi, "\n")
    .replace(/\\,/g, ",")
    .replace(/\\;/g, ";")
    .replace(/\\\\/g, "\\");
}

function parseDateOnly(value: string): DateOnlyString {
  const trimmedValue = value.trim();
  const datePart = trimmedValue.includes("T") ? trimmedValue.slice(0, 8) : trimmedValue;

  if (DATE_ONLY_COMPACT_PATTERN.test(datePart)) {
    const formattedDate = `${datePart.slice(0, 4)}-${datePart.slice(4, 6)}-${datePart.slice(
      6,
      8,
    )}`;

    assertDateOnlyString(formattedDate, "iCal date");

    return formattedDate;
  }

  if (DATE_ONLY_DASHED_PATTERN.test(datePart)) {
    assertDateOnlyString(datePart, "iCal date");

    return datePart as DateOnlyString;
  }

  throw new Error("Unsupported iCal date format.");
}

function splitEventLines(lines: readonly string[]): readonly (readonly string[])[] {
  const events: string[][] = [];
  let currentEvent: string[] | null = null;

  for (const line of lines) {
    const lineName = getLineName(line);

    if (lineName === "BEGIN" && getLineValue(line)?.toUpperCase() === "VEVENT") {
      currentEvent = [BEGIN_EVENT];
      continue;
    }

    if (lineName === "END" && getLineValue(line)?.toUpperCase() === "VEVENT") {
      if (currentEvent) {
        currentEvent.push(END_EVENT);
        events.push(currentEvent);
        currentEvent = null;
      }

      continue;
    }

    if (currentEvent) {
      currentEvent.push(line);
    }
  }

  return events;
}

function findEventValue(eventLines: readonly string[], name: string): string | undefined {
  const targetName = name.toUpperCase();
  const line = eventLines.find((candidateLine) => getLineName(candidateLine) === targetName);

  if (!line) {
    return undefined;
  }

  return getLineValue(line);
}

function toImportedEventStatus(statusValue: string | undefined): AirbnbIcalImportedEventStatus {
  if (statusValue?.trim().toUpperCase() === "CANCELLED") {
    return "CANCELLED";
  }

  return "ACTIVE";
}

function parseEvent(eventLines: readonly string[]): AirbnbIcalImportedEvent {
  const providerEventUid = findEventValue(eventLines, "UID")?.trim();
  const startDateValue = findEventValue(eventLines, "DTSTART");
  const endDateValue = findEventValue(eventLines, "DTEND");

  if (!providerEventUid) {
    throw new Error("iCal VEVENT is missing UID.");
  }

  if (!startDateValue) {
    throw new Error("iCal VEVENT is missing DTSTART.");
  }

  const startDate = parseDateOnly(startDateValue);
  const endDate = endDateValue ? parseDateOnly(endDateValue) : addDaysToDateOnly(startDate, 1);
  const range = {
    startDate,
    endDate,
  };

  assertValidAvailabilityDateRange(range);

  const summary = findEventValue(eventLines, "SUMMARY");

  return {
    providerEventUid,
    startDate,
    endDate,
    summary: summary ? unescapeIcalText(summary) : undefined,
    status: toImportedEventStatus(findEventValue(eventLines, "STATUS")),
  };
}

export function parseAirbnbIcalContent(content: string): AirbnbIcalParseResult {
  const lines = unfoldIcalLines(content);
  const eventLineGroups = splitEventLines(lines);
  const events: AirbnbIcalImportedEvent[] = [];
  let skippedEvents = 0;

  for (const eventLines of eventLineGroups) {
    try {
      events.push(parseEvent(eventLines));
    } catch {
      skippedEvents += 1;
    }
  }

  return {
    events,
    skippedEvents,
  };
}
