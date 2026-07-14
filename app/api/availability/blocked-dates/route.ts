import { ReservationStatus } from "@prisma/client";
import { NextResponse } from "next/server";
import { z } from "zod";

import {
  addDaysToDateOnly,
  dateOnlyToUtcDate,
  isDateOnlyString,
} from "@/lib/availability/rules";
import { getAvailabilityBlockingRecords } from "@/lib/availability/service";
import { prisma } from "@/lib/db/prisma";
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

function toDateOnlyString(date: Date): DateOnlyString {
  return date.toISOString().slice(0, 10) as DateOnlyString;
}

function getReservationBlockingAccommodationIds(
  accommodationId: AccommodationId,
): AccommodationId[] {
  if (accommodationId === "complete-retreat") {
    return ["black-white-apartment", "perfect-retreat-bungalow", "complete-retreat"];
  }

  return [accommodationId, "complete-retreat"];
}

async function getReservationBlockedDates(input: Readonly<{
  accommodationId: AccommodationId;
  startDate: DateOnlyString;
  endDate: DateOnlyString;
  now: Date;
}>): Promise<DateOnlyString[]> {
  const blockingAccommodationIds = getReservationBlockingAccommodationIds(input.accommodationId);
  const reservations = await prisma.reservation.findMany({
    where: {
      propertyId: {
        in: blockingAccommodationIds,
      },
      checkInDate: {
        lt: dateOnlyToUtcDate(input.endDate),
      },
      checkOutDate: {
        gt: dateOnlyToUtcDate(input.startDate),
      },
      OR: [
        {
          status: ReservationStatus.CONFIRMED,
        },
        {
          status: ReservationStatus.PENDING_PAYMENT,
          expiresAt: {
            gt: input.now,
          },
        },
      ],
    },
    select: {
      checkInDate: true,
      checkOutDate: true,
    },
  });

  return reservations.flatMap((reservation) =>
    eachDateOnlyInRange(
      maxDateOnly(toDateOnlyString(reservation.checkInDate), input.startDate),
      minDateOnly(toDateOnlyString(reservation.checkOutDate), input.endDate),
    ),
  );
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

  const now = new Date();
  const blockingRecords = await getAvailabilityBlockingRecords({
    accommodationId: accommodationId as AccommodationId,
    startDate: startDate as DateOnlyString,
    endDate: endDate as DateOnlyString,
  });
  const serviceBlockedDates = blockingRecords.flatMap((record) =>
    eachDateOnlyInRange(
      maxDateOnly(record.startDate, startDate as DateOnlyString),
      minDateOnly(record.endDate, endDate as DateOnlyString),
    ),
  );
  const reservationBlockedDates = await getReservationBlockedDates({
    accommodationId: accommodationId as AccommodationId,
    startDate: startDate as DateOnlyString,
    endDate: endDate as DateOnlyString,
    now,
  });
  const blockedDates = Array.from(
    new Set([...serviceBlockedDates, ...reservationBlockedDates]),
  ).sort();

  const response: BlockedDatesApiResponse = {
    accommodationId: accommodationId as AccommodationId,
    startDate: startDate as DateOnlyString,
    endDate: endDate as DateOnlyString,
    blockedDates,
  };

  return NextResponse.json(response);
}
