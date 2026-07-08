import { NextResponse } from "next/server";

import { getAvailabilityBlockingRecords } from "@/lib/availability/service";
import {
  addDaysToDateOnly,
  assertValidAvailabilityDateRange,
  availabilityDateRangesOverlap,
  isDateOnlyString,
} from "@/lib/availability/rules";
import type {
  AvailabilityBlockingRecord,
  AvailabilityDateRange,
  DateOnlyString,
} from "@/types/availability";
import type { AccommodationId } from "@/types/accommodation";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const MAX_DAYS_PER_REQUEST = 120;

const validAccommodationIds = new Set<AccommodationId>([
  "black-white-apartment",
  "perfect-retreat-bungalow",
  "complete-retreat",
]);

type AvailabilityCalendarDay = Readonly<{
  date: DateOnlyString;
  available: boolean;
  blockingSources: readonly AvailabilityBlockingRecord["source"][];
}>;

type AvailabilityCalendarResponse = Readonly<{
  accommodationId: AccommodationId;
  requestedRange: AvailabilityDateRange;
  days: readonly AvailabilityCalendarDay[];
}>;

type AvailabilityCalendarErrorResponse = Readonly<{
  error: string;
}>;

function parseAccommodationId(value: string | null): AccommodationId {
  if (!value || !validAccommodationIds.has(value as AccommodationId)) {
    throw new Error("Invalid accommodationId.");
  }

  return value as AccommodationId;
}

function parseDateOnlyParam(value: string | null, label: string): DateOnlyString {
  if (!value || !isDateOnlyString(value)) {
    throw new Error(`${label} must use YYYY-MM-DD format.`);
  }

  return value;
}

function listDateOnlyRange(startDate: DateOnlyString, endDate: DateOnlyString): DateOnlyString[] {
  const days: DateOnlyString[] = [];
  let currentDate = startDate;

  while (currentDate < endDate) {
    days.push(currentDate);
    currentDate = addDaysToDateOnly(currentDate, 1);

    if (days.length > MAX_DAYS_PER_REQUEST) {
      throw new Error(`Availability requests cannot exceed ${MAX_DAYS_PER_REQUEST} days.`);
    }
  }

  return days;
}

function buildCalendarDays(
  requestedRange: AvailabilityDateRange,
  blockingRecords: readonly AvailabilityBlockingRecord[],
): readonly AvailabilityCalendarDay[] {
  return listDateOnlyRange(requestedRange.startDate, requestedRange.endDate).map((date) => {
    const dayRange: AvailabilityDateRange = {
      startDate: date,
      endDate: addDaysToDateOnly(date, 1),
    };

    const dayBlockingRecords = blockingRecords.filter((blockingRecord) =>
      availabilityDateRangesOverlap(dayRange, blockingRecord),
    );

    return {
      date,
      available: dayBlockingRecords.length === 0,
      blockingSources: [...new Set(dayBlockingRecords.map((blockingRecord) => blockingRecord.source))],
    };
  });
}

export async function GET(
  request: Request,
): Promise<NextResponse<AvailabilityCalendarResponse | AvailabilityCalendarErrorResponse>> {
  const { searchParams } = new URL(request.url);

  try {
    const accommodationId = parseAccommodationId(searchParams.get("accommodationId"));
    const startDate = parseDateOnlyParam(searchParams.get("startDate"), "startDate");
    const endDate = parseDateOnlyParam(searchParams.get("endDate"), "endDate");
    const requestedRange: AvailabilityDateRange = { startDate, endDate };

    assertValidAvailabilityDateRange(requestedRange);

    const blockingRecords = await getAvailabilityBlockingRecords({
      accommodationId,
      ...requestedRange,
    });

    return NextResponse.json({
      accommodationId,
      requestedRange,
      days: buildCalendarDays(requestedRange, blockingRecords),
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Availability could not be loaded.";

    return NextResponse.json(
      {
        error: message,
      },
      {
        status: 400,
      },
    );
  }
}
