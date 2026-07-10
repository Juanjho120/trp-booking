import { NextResponse } from "next/server";
import { z } from "zod";

import { getAvailabilityBlockingRecords } from "@/lib/availability/service";
import {
  addDaysToDateOnly,
  dateOnlyToUtcDate,
  isDateOnlyString,
} from "@/lib/availability/rules";
import type { AccommodationId } from "@/types/accommodation";
import type { DateOnlyString } from "@/types/availability";
import type { BlockedDatesApiResponse } from "@/types/availability-blocked-dates";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const accommodationIdSchema = z.enum([
  "black-white-apartment",
  "perfect-retreat-bungalow",
  "complete-retreat",
]);

const querySchema = z.object({
  accommodationId: accommodationIdSchema,
  startDate: z.string().refine(isDateOnlyString),
  endDate: z.string().refine(isDateOnlyString),
});

function eachDateOnlyInRange(
  startDate: DateOnlyString,
  endDate: DateOnlyString,
): DateOnlyString[] {
  const dates: DateOnlyString[] = [];
  let cursor = startDate;

  while (cursor < endDate) {
    dates.push(cursor);
    cursor = addDaysToDateOnly(cursor, 1);
  }

  return dates;
}

function maxDateOnly(left: DateOnlyString, right: DateOnlyString): DateOnlyString {
  return left >= right ? left : right;
}

function minDateOnly(left: DateOnlyString, right: DateOnlyString): DateOnlyString {
  return left <= right ? left : right;
}

export async function GET(request: Request) {
  const url = new URL(request.url);
  const parsedQuery = querySchema.safeParse({
    accommodationId: url.searchParams.get("accommodationId"),
    startDate: url.searchParams.get("startDate"),
    endDate: url.searchParams.get("endDate"),
  });

  if (!parsedQuery.success) {
    return NextResponse.json(
      {
        error: {
          code: "INVALID_BLOCKED_DATES_REQUEST",
          message: "Invalid blocked dates request.",
        },
      },
      { status: 400 },
    );
  }

  const { accommodationId, startDate, endDate } = parsedQuery.data;

  if (dateOnlyToUtcDate(startDate) >= dateOnlyToUtcDate(endDate)) {
    return NextResponse.json(
      {
        error: {
          code: "INVALID_BLOCKED_DATES_REQUEST",
          message: "Invalid blocked dates range.",
        },
      },
      { status: 400 },
    );
  }

  const blockingRecords = await getAvailabilityBlockingRecords({
    accommodationId: accommodationId as AccommodationId,
    startDate: startDate as DateOnlyString,
    endDate: endDate as DateOnlyString,
  });
  const blockedDates = Array.from(
    new Set(
      blockingRecords.flatMap((record) =>
        eachDateOnlyInRange(
          maxDateOnly(record.startDate, startDate as DateOnlyString),
          minDateOnly(record.endDate, endDate as DateOnlyString),
        ),
      ),
    ),
  ).sort();

  const response: BlockedDatesApiResponse = {
    accommodationId: accommodationId as AccommodationId,
    startDate: startDate as DateOnlyString,
    endDate: endDate as DateOnlyString,
    blockedDates,
  };

  return NextResponse.json(response);
}
