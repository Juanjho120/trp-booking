import { getAccommodationById } from "@/config/accommodations";
import type { AccommodationId } from "@/types/accommodation";
import type {
  AvailabilityDateRange,
  AvailabilityDependencyRule,
  AvailabilityRuleSummary,
  DateOnlyString,
  PreparationBufferDateRange,
} from "@/types/availability";

const DATE_ONLY_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

export const availabilityDependencyRules: readonly AvailabilityDependencyRule[] = [
  {
    accommodationId: "black-white-apartment",
    affectedAccommodationIds: ["black-white-apartment", "complete-retreat"],
  },
  {
    accommodationId: "perfect-retreat-bungalow",
    affectedAccommodationIds: ["perfect-retreat-bungalow", "complete-retreat"],
  },
  {
    accommodationId: "complete-retreat",
    affectedAccommodationIds: [
      "complete-retreat",
      "black-white-apartment",
      "perfect-retreat-bungalow",
    ],
  },
];

export function isDateOnlyString(value: string): value is DateOnlyString {
  if (!DATE_ONLY_PATTERN.test(value)) {
    return false;
  }

  const [year, month, day] = value.split("-").map(Number);
  const parsedDate = new Date(Date.UTC(year, month - 1, day));

  return (
    parsedDate.getUTCFullYear() === year &&
    parsedDate.getUTCMonth() === month - 1 &&
    parsedDate.getUTCDate() === day
  );
}

export function assertDateOnlyString(
  value: string,
  label: string,
): asserts value is DateOnlyString {
  if (!isDateOnlyString(value)) {
    throw new Error(`${label} must use YYYY-MM-DD format.`);
  }
}

export function dateOnlyToUtcDate(date: DateOnlyString): Date {
  assertDateOnlyString(date, "date");

  const [year, month, day] = date.split("-").map(Number);

  return new Date(Date.UTC(year, month - 1, day));
}

export function dateOnlyFromDate(date: Date): DateOnlyString {
  return date.toISOString().slice(0, 10) as DateOnlyString;
}

export function addDaysToDateOnly(
  date: DateOnlyString,
  days: number,
): DateOnlyString {
  if (!Number.isInteger(days)) {
    throw new Error("days must be an integer.");
  }

  const parsedDate = dateOnlyToUtcDate(date);
  parsedDate.setUTCDate(parsedDate.getUTCDate() + days);

  return dateOnlyFromDate(parsedDate);
}

export function assertValidAvailabilityDateRange(
  range: AvailabilityDateRange,
): void {
  assertDateOnlyString(range.startDate, "startDate");
  assertDateOnlyString(range.endDate, "endDate");

  if (range.startDate >= range.endDate) {
    throw new Error("Availability date ranges must end after they start.");
  }
}

export function availabilityDateRangesOverlap(
  firstRange: AvailabilityDateRange,
  secondRange: AvailabilityDateRange,
): boolean {
  assertValidAvailabilityDateRange(firstRange);
  assertValidAvailabilityDateRange(secondRange);

  return firstRange.startDate < secondRange.endDate && secondRange.startDate < firstRange.endDate;
}

export function getAffectedAccommodationIds(
  accommodationId: AccommodationId,
): readonly AccommodationId[] {
  const rule = availabilityDependencyRules.find(
    (candidateRule) => candidateRule.accommodationId === accommodationId,
  );

  if (!rule) {
    throw new Error(`Availability dependency rule not found for ${accommodationId}.`);
  }

  return rule.affectedAccommodationIds;
}

export function getBlockingAccommodationIds(
  accommodationId: AccommodationId,
): readonly AccommodationId[] {
  const blockingAccommodationIds = availabilityDependencyRules
    .filter((rule) => rule.affectedAccommodationIds.includes(accommodationId))
    .map((rule) => rule.accommodationId);

  if (blockingAccommodationIds.length === 0) {
    throw new Error(`Blocking availability dependency rule not found for ${accommodationId}.`);
  }

  return blockingAccommodationIds;
}

export function getAvailabilityRuleSummary(
  accommodationId: AccommodationId,
): AvailabilityRuleSummary {
  const accommodation = getAccommodationById(accommodationId);

  if (!accommodation) {
    throw new Error(`Accommodation not found for ${accommodationId}.`);
  }

  return {
    accommodationId,
    affectedAccommodationIds: getAffectedAccommodationIds(accommodationId),
    blockingAccommodationIds: getBlockingAccommodationIds(accommodationId),
    preparationBuffer: accommodation.preparationBuffer,
  };
}

export function buildPreparationBufferRanges(
  accommodationId: AccommodationId,
  stayRange: AvailabilityDateRange,
): readonly PreparationBufferDateRange[] {
  assertValidAvailabilityDateRange(stayRange);

  const accommodation = getAccommodationById(accommodationId);

  if (!accommodation) {
    throw new Error(`Accommodation not found for ${accommodationId}.`);
  }

  const ranges: PreparationBufferDateRange[] = [];
  const { daysBefore, daysAfter } = accommodation.preparationBuffer;

  if (daysBefore > 0) {
    ranges.push({
      accommodationId,
      kind: "before-check-in",
      days: daysBefore,
      startDate: addDaysToDateOnly(stayRange.startDate, -daysBefore),
      endDate: stayRange.startDate,
    });
  }

  if (daysAfter > 0) {
    ranges.push({
      accommodationId,
      kind: "after-check-out",
      days: daysAfter,
      startDate: stayRange.endDate,
      endDate: addDaysToDateOnly(stayRange.endDate, daysAfter),
    });
  }

  return ranges;
}
