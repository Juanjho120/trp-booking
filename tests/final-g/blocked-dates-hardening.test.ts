import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";

import {
  CalendarBlockSource,
  LifecycleRequestHoldStatus,
  ReservationStatus,
} from "@prisma/client";

import { getAvailabilityBlockingRecords } from "@/lib/availability/service";
import type { AccommodationId } from "@/types/accommodation";
import type {
  AvailabilityBlockingRecord,
  DateOnlyString,
} from "@/types/availability";

import { test } from "./harness";

const ROOT = process.cwd();

function readSource(relativePath: string): string {
  return readFileSync(path.join(ROOT, relativePath), "utf8");
}

function date(value: DateOnlyString): Date {
  return new Date(`${value}T00:00:00.000Z`);
}

function addDays(value: DateOnlyString, days: number): DateOnlyString {
  const next = date(value);
  next.setUTCDate(next.getUTCDate() + days);
  return next.toISOString().slice(0, 10) as DateOnlyString;
}

function eachDateOnlyInRange(
  startDate: DateOnlyString,
  endDate: DateOnlyString,
): DateOnlyString[] {
  const dates: DateOnlyString[] = [];
  let cursor = startDate;

  while (cursor < endDate) {
    dates.push(cursor);
    cursor = addDays(cursor, 1);
  }

  return dates;
}

function recordsToBlockedDates(
  records: readonly AvailabilityBlockingRecord[],
): readonly DateOnlyString[] {
  return [
    ...new Set(
      records.flatMap((record) =>
        eachDateOnlyInRange(record.startDate, record.endDate),
      ),
    ),
  ].sort();
}

type MockProperty = Readonly<{
  id: AccommodationId;
  preparationDaysBefore: number;
  preparationDaysAfter: number;
}>;

type MockReservation = Readonly<{
  id: string;
  propertyId: AccommodationId;
  checkInDate: Date;
  checkOutDate: Date;
  status: ReservationStatus;
  expiresAt: Date | null;
}>;

type MockCalendarBlock = Readonly<{
  id: string;
  propertyId: AccommodationId;
  startDate: Date;
  endDate: Date;
  source: CalendarBlockSource;
  reason: string | null;
  reservationId: string | null;
  externalCalendarEventId: string | null;
  parentBlockId: string | null;
  unlockedByAdminAt: Date | null;
}>;

type MockLifecycleHold = Readonly<{
  id: string;
  lifecycleRequestId: string;
  propertyId: AccommodationId;
  startDate: Date;
  endDate: Date;
  preparationDaysBefore: number;
  preparationDaysAfter: number;
  status: LifecycleRequestHoldStatus;
  expiresAt: Date;
  lifecycleRequest: Readonly<{
    reservationId: string;
  }>;
}>;

function createAvailabilityPrismaMock(input: Readonly<{
  properties: readonly MockProperty[];
  reservations?: readonly MockReservation[];
  calendarBlocks?: readonly MockCalendarBlock[];
  lifecycleRequestHolds?: readonly MockLifecycleHold[];
}>) {
  const calls: string[] = [];

  return {
    calls,
    prismaClient: {
      property: {
        findMany: async (args: {
          where: { id: { in: readonly string[] } };
        }) => {
          calls.push("property.findMany");
          return input.properties.filter((property) =>
            args.where.id.in.includes(property.id),
          );
        },
      },
      reservation: {
        findMany: async (args: {
          where: {
            propertyId: { in: readonly string[] };
            checkInDate: { lt: Date };
            checkOutDate: { gt: Date };
          };
        }) => {
          calls.push("reservation.findMany");
          return (input.reservations ?? []).filter(
            (reservation) =>
              args.where.propertyId.in.includes(reservation.propertyId) &&
              reservation.checkInDate < args.where.checkInDate.lt &&
              reservation.checkOutDate > args.where.checkOutDate.gt,
          );
        },
      },
      calendarBlock: {
        findMany: async (args: {
          where: {
            propertyId: { in: readonly string[] };
            startDate: { lt: Date };
            endDate: { gt: Date };
          };
        }) => {
          calls.push("calendarBlock.findMany");
          return (input.calendarBlocks ?? []).filter(
            (calendarBlock) =>
              args.where.propertyId.in.includes(calendarBlock.propertyId) &&
              calendarBlock.startDate < args.where.startDate.lt &&
              calendarBlock.endDate > args.where.endDate.gt,
          );
        },
      },
      lifecycleRequestHold: {
        findMany: async (args: {
          where: {
            propertyId: { in: readonly string[] };
            startDate: { lt: Date };
            endDate: { gt: Date };
          };
        }) => {
          calls.push("lifecycleRequestHold.findMany");
          return (input.lifecycleRequestHolds ?? []).filter(
            (hold) =>
              args.where.propertyId.in.includes(hold.propertyId) &&
              hold.startDate < args.where.startDate.lt &&
              hold.endDate > args.where.endDate.gt,
          );
        },
      },
    },
  };
}

const zeroBufferProperties: readonly MockProperty[] = [
  {
    id: "black-white-apartment",
    preparationDaysBefore: 0,
    preparationDaysAfter: 0,
  },
  {
    id: "perfect-retreat-bungalow",
    preparationDaysBefore: 0,
    preparationDaysAfter: 0,
  },
  {
    id: "complete-retreat",
    preparationDaysBefore: 0,
    preparationDaysAfter: 0,
  },
];

const bufferedProperties: readonly MockProperty[] = [
  {
    id: "black-white-apartment",
    preparationDaysBefore: 1,
    preparationDaysAfter: 1,
  },
  {
    id: "perfect-retreat-bungalow",
    preparationDaysBefore: 2,
    preparationDaysAfter: 2,
  },
  {
    id: "complete-retreat",
    preparationDaysBefore: 2,
    preparationDaysAfter: 2,
  },
];

test("G.3 blocked-date optimization keeps direct reservation, pending-hold expiry and checkout exclusivity semantics", async () => {
  const mock = createAvailabilityPrismaMock({
    properties: zeroBufferProperties,
    reservations: [
      {
        id: "confirmed-direct",
        propertyId: "black-white-apartment",
        checkInDate: date("2026-09-05"),
        checkOutDate: date("2026-09-07"),
        status: ReservationStatus.CONFIRMED,
        expiresAt: null,
      },
      {
        id: "active-pending",
        propertyId: "black-white-apartment",
        checkInDate: date("2026-09-08"),
        checkOutDate: date("2026-09-10"),
        status: ReservationStatus.PENDING_PAYMENT,
        expiresAt: new Date("2026-09-10T13:00:00.000Z"),
      },
      {
        id: "expired-pending",
        propertyId: "black-white-apartment",
        checkInDate: date("2026-09-11"),
        checkOutDate: date("2026-09-13"),
        status: ReservationStatus.PENDING_PAYMENT,
        expiresAt: new Date("2026-09-10T11:00:00.000Z"),
      },
    ],
  });

  const records = await getAvailabilityBlockingRecords(
    {
      accommodationId: "black-white-apartment",
      startDate: "2026-09-01",
      endDate: "2026-09-15",
    },
    {
      now: new Date("2026-09-10T12:00:00.000Z"),
      prismaClient: mock.prismaClient as never,
    },
  );
  const directReservationIds = records
    .filter((record) => record.source === CalendarBlockSource.DIRECT_RESERVATION)
    .map((record) => record.reservationId);

  assert.deepEqual(directReservationIds.sort(), [
    "active-pending",
    "confirmed-direct",
  ]);
  assert.deepEqual(recordsToBlockedDates(records), [
    "2026-09-05",
    "2026-09-06",
    "2026-09-08",
    "2026-09-09",
  ]);
  assert.equal(mock.calls.filter((call) => call === "reservation.findMany").length, 1);
});

test("G.3 blocked-date optimization preserves dependency, calendar, lifecycle and preparation-buffer semantics", async () => {
  const mock = createAvailabilityPrismaMock({
    properties: bufferedProperties,
    reservations: [
      {
        id: "complete-blocks-child",
        propertyId: "complete-retreat",
        checkInDate: date("2026-09-06"),
        checkOutDate: date("2026-09-08"),
        status: ReservationStatus.CONFIRMED,
        expiresAt: null,
      },
      {
        id: "child-blocks-complete",
        propertyId: "perfect-retreat-bungalow",
        checkInDate: date("2026-09-11"),
        checkOutDate: date("2026-09-12"),
        status: ReservationStatus.CONFIRMED,
        expiresAt: null,
      },
      {
        id: "unlocked-buffer",
        propertyId: "black-white-apartment",
        checkInDate: date("2026-09-18"),
        checkOutDate: date("2026-09-19"),
        status: ReservationStatus.CONFIRMED,
        expiresAt: null,
      },
    ],
    calendarBlocks: [
      {
        id: "manual-block",
        propertyId: "black-white-apartment",
        startDate: date("2026-09-03"),
        endDate: date("2026-09-04"),
        source: CalendarBlockSource.MANUAL_BLOCK,
        reason: "Maintenance",
        reservationId: null,
        externalCalendarEventId: null,
        parentBlockId: null,
        unlockedByAdminAt: null,
      },
      {
        id: "admin-unlocked-prep",
        propertyId: "black-white-apartment",
        startDate: date("2026-09-17"),
        endDate: date("2026-09-18"),
        source: CalendarBlockSource.PREPARATION_BUFFER,
        reason: "Admin unlocked",
        reservationId: "unlocked-buffer",
        externalCalendarEventId: null,
        parentBlockId: null,
        unlockedByAdminAt: new Date("2026-09-10T12:00:00.000Z"),
      },
    ],
    lifecycleRequestHolds: [
      {
        id: "lifecycle-hold",
        lifecycleRequestId: "lifecycle-request",
        propertyId: "black-white-apartment",
        startDate: date("2026-09-14"),
        endDate: date("2026-09-15"),
        preparationDaysBefore: 1,
        preparationDaysAfter: 1,
        status: LifecycleRequestHoldStatus.ACTIVE,
        expiresAt: new Date("2026-09-10T13:00:00.000Z"),
        lifecycleRequest: {
          reservationId: "reservation-lifecycle",
        },
      },
    ],
  });

  const childRecords = await getAvailabilityBlockingRecords(
    {
      accommodationId: "black-white-apartment",
      startDate: "2026-09-01",
      endDate: "2026-09-22",
    },
    {
      now: new Date("2026-09-10T12:00:00.000Z"),
      prismaClient: mock.prismaClient as never,
    },
  );
  const completeRecords = await getAvailabilityBlockingRecords(
    {
      accommodationId: "complete-retreat",
      startDate: "2026-09-01",
      endDate: "2026-09-22",
    },
    {
      now: new Date("2026-09-10T12:00:00.000Z"),
      prismaClient: mock.prismaClient as never,
    },
  );

  assert.ok(
    childRecords.some(
      (record) =>
        record.reservationId === "complete-blocks-child" &&
        record.source === CalendarBlockSource.DIRECT_RESERVATION,
    ),
  );
  assert.ok(
    completeRecords.some(
      (record) =>
        record.reservationId === "child-blocks-complete" &&
        record.source === CalendarBlockSource.DIRECT_RESERVATION,
    ),
  );
  assert.ok(
    childRecords.some(
      (record) =>
        record.calendarBlockId === "manual-block" &&
        record.source === CalendarBlockSource.MANUAL_BLOCK,
    ),
  );
  assert.ok(
    childRecords.some(
      (record) =>
        record.lifecycleRequestHoldId === "lifecycle-hold" &&
        record.source === "LIFECYCLE_REQUEST_HOLD",
    ),
  );
  assert.ok(
    childRecords.some(
      (record) =>
        record.reservationId === "complete-blocks-child" &&
        record.source === CalendarBlockSource.PREPARATION_BUFFER,
    ),
  );
  assert.equal(
    childRecords.some(
      (record) =>
        record.reservationId === "unlocked-buffer" &&
        record.source === CalendarBlockSource.PREPARATION_BUFFER &&
        record.startDate === "2026-09-17",
    ),
    false,
  );
});

test("G.3 blocked-dates route derives dates from availability records without a second reservation query", () => {
  const route = readSource("app/api/availability/blocked-dates/route.ts");

  assert.doesNotMatch(route, /getReservationBlockedDates/);
  assert.doesNotMatch(route, /prisma\.reservation\.findMany/);
  assert.doesNotMatch(route, /ReservationStatus/);
  assert.match(route, /getAvailabilityBlockingRecords/);
  assert.match(route, /new Set\(serviceBlockedDates\)/);
});
