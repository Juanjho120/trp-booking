import assert from "node:assert/strict";
import { performance } from "node:perf_hooks";

import { PrismaClient } from "@prisma/client";

import {
  adminAccommodationIds,
  isAdminAccommodationId,
} from "../lib/admin/accommodations";
import {
  getAdminPropertyCalendar,
  type AdminPropertyCalendarTimingEvent,
  type AdminPropertyCalendarTimingStage,
} from "../lib/admin/property-calendar";
import type { AccommodationId } from "../types/accommodation";

type QueryFamily =
  | "properties"
  | "reservations"
  | "calendar_blocks"
  | "lifecycle_holds"
  | "other";

type QueryTiming = Readonly<{
  family: QueryFamily;
  durationMs: number;
}>;

type CalendarSample = Readonly<{
  sample: number;
  totalMs: number;
  entries: number;
  queryCount: number;
  queryMs: number;
  queriesByFamily: Readonly<Record<QueryFamily, number>>;
  stages: readonly AdminPropertyCalendarTimingEvent[];
}>;

type CalendarCombinationResult = Readonly<{
  propertyId: AccommodationId;
  month: string;
  firstSampleMs: number;
  subsequentMedianMs: number | null;
  medianMs: number;
  p80Ms: number;
  p95Ms: number;
  minMs: number;
  maxMs: number;
  medianQueryCount: number;
  medianQueryMs: number;
  medianStagesMs: Readonly<
    Partial<Record<AdminPropertyCalendarTimingStage, number>>
  >;
  medianQueryFamiliesMs: Readonly<Partial<Record<QueryFamily, number>>>;
  samples: readonly CalendarSample[];
}>;

const QUERY_FAMILIES: readonly QueryFamily[] = [
  "properties",
  "reservations",
  "calendar_blocks",
  "lifecycle_holds",
  "other",
];

const TIMING_STAGES: readonly AdminPropertyCalendarTimingStage[] = [
  "properties",
  "availability_records",
  "preparation_overrides",
  "blocking_block_details",
  "reservations",
  "total",
];

const ROUTE_COOKIE_ENV = "TRP_ADMIN_SESSION_COOKIE";

function assertTestEnvironment(): void {
  assert.equal(
    process.env.TRP_ENVIRONMENT,
    "test",
    "Calendar performance measurement must run only with TRP_ENVIRONMENT=test.",
  );

  const databaseUrl = process.env.DATABASE_URL ?? "";

  assert.ok(databaseUrl, "DATABASE_URL must be configured for measurement.");
  assert.doesNotMatch(
    databaseUrl,
    /production|prod|turefugioperfecto/i,
    "Refusing to measure against a production-looking database URL.",
  );
}

function optionValue(name: string): string | null {
  const prefix = `--${name}=`;
  const match = process.argv.slice(2).find((arg) => arg.startsWith(prefix));

  return match ? match.slice(prefix.length) : null;
}

function hasFlag(name: string): boolean {
  return process.argv.slice(2).includes(`--${name}`);
}

function parsePositiveIntegerOption(name: string, fallback: number): number {
  const rawValue = optionValue(name);

  if (!rawValue) {
    return fallback;
  }

  const value = Number(rawValue);

  assert.ok(
    Number.isInteger(value) && value > 0,
    `--${name} must be a positive integer.`,
  );

  return value;
}

function assertValidMonth(value: string): string {
  assert.match(value, /^\d{4}-(0[1-9]|1[0-2])$/, "Month must be YYYY-MM.");
  return value;
}

function addMonths(month: string, amount: number): string {
  const [year, monthNumber] = month.split("-").map(Number);
  const date = new Date(Date.UTC(year, monthNumber - 1 + amount, 1));

  return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(
    2,
    "0",
  )}`;
}

function parseProperties(): readonly AccommodationId[] {
  const rawValue = optionValue("properties");

  if (!rawValue) {
    return adminAccommodationIds;
  }

  const values = rawValue.split(",").map((value) => value.trim());

  values.forEach((value) => {
    assert.ok(
      isAdminAccommodationId(value),
      `Unsupported accommodation id: ${value}`,
    );
  });

  return values as AccommodationId[];
}

function classifyQuery(query: string): QueryFamily {
  const normalized = query.toLowerCase();

  if (
    normalized.includes("lifecyclerequesthold") ||
    normalized.includes("lifecycle_request_hold") ||
    normalized.includes("lifecycle_request_holds")
  ) {
    return "lifecycle_holds";
  }

  if (
    normalized.includes("calendarblock") ||
    normalized.includes("calendar_block") ||
    normalized.includes("calendar_blocks")
  ) {
    return "calendar_blocks";
  }

  if (normalized.includes("reservation") || normalized.includes("reservations")) {
    return "reservations";
  }

  if (normalized.includes("property") || normalized.includes("properties")) {
    return "properties";
  }

  return "other";
}

function round(value: number): number {
  return Math.round(value * 10) / 10;
}

function percentile(values: readonly number[], percentileRank: number): number {
  assert.ok(values.length > 0, "Cannot summarize an empty sample set.");

  const sorted = [...values].sort((left, right) => left - right);
  const index = Math.min(
    sorted.length - 1,
    Math.max(0, Math.ceil((percentileRank / 100) * sorted.length) - 1),
  );

  return sorted[index]!;
}

function median(values: readonly number[]): number {
  return percentile(values, 50);
}

function sum(values: readonly number[]): number {
  return values.reduce((total, value) => total + value, 0);
}

function emptyQueryFamilyDurations(): Record<QueryFamily, number> {
  return {
    properties: 0,
    reservations: 0,
    calendar_blocks: 0,
    lifecycle_holds: 0,
    other: 0,
  };
}

function summarizeByStage(
  samples: readonly CalendarSample[],
): Partial<Record<AdminPropertyCalendarTimingStage, number>> {
  return Object.fromEntries(
    TIMING_STAGES.map((stage) => {
      const values = samples
        .map((sample) => sample.stages.find((event) => event.stage === stage))
        .filter((event): event is AdminPropertyCalendarTimingEvent =>
          Boolean(event),
        )
        .map((event) => event.durationMs);

      return values.length > 0 ? [stage, round(median(values))] : null;
    }).filter((entry): entry is [AdminPropertyCalendarTimingStage, number] =>
      Boolean(entry),
    ),
  );
}

function summarizeByQueryFamily(
  samples: readonly CalendarSample[],
): Partial<Record<QueryFamily, number>> {
  return Object.fromEntries(
    QUERY_FAMILIES.map((family) => {
      const values = samples.map((sample) => sample.queriesByFamily[family]);

      return [family, round(median(values))];
    }),
  );
}

async function measureCalendarDataPath(): Promise<
  readonly CalendarCombinationResult[]
> {
  const sampleCount = parsePositiveIntegerOption("samples", 7);
  const includeSamples = !hasFlag("summary-only");
  const baseMonth = assertValidMonth(optionValue("month") ?? "2026-10");
  const months = [addMonths(baseMonth, -1), baseMonth, addMonths(baseMonth, 1)];
  const propertyIds = parseProperties();
  const now = new Date(optionValue("now") ?? "2026-10-12T12:00:00.000Z");
  const prismaClient = new PrismaClient({
    log: [{ emit: "event", level: "query" }],
  });
  let currentQueries: QueryTiming[] = [];

  prismaClient.$on("query", (event) => {
    currentQueries.push({
      family: classifyQuery(event.query),
      durationMs: event.duration,
    });
  });

  try {
    const results: CalendarCombinationResult[] = [];

    for (const propertyId of propertyIds) {
      for (const month of months) {
        const samples: CalendarSample[] = [];

        for (let sample = 1; sample <= sampleCount; sample += 1) {
          const stages: AdminPropertyCalendarTimingEvent[] = [];
          currentQueries = [];

          const startedAt = performance.now();
          const calendar = await getAdminPropertyCalendar(
            {
              propertyId,
              month,
            },
            {
              prismaClient,
              now,
              onTiming(event) {
                stages.push({
                  ...event,
                  durationMs: round(event.durationMs),
                });
              },
            },
          );
          const totalMs = performance.now() - startedAt;
          const queriesByFamily = emptyQueryFamilyDurations();

          currentQueries.forEach((query) => {
            queriesByFamily[query.family] += query.durationMs;
          });

          samples.push({
            sample,
            totalMs: round(totalMs),
            entries: calendar.days.reduce(
              (total, day) => total + day.entries.length,
              0,
            ),
            queryCount: currentQueries.length,
            queryMs: round(sum(currentQueries.map((query) => query.durationMs))),
            queriesByFamily: Object.fromEntries(
              QUERY_FAMILIES.map((family) => [
                family,
                round(queriesByFamily[family]),
              ]),
            ) as Record<QueryFamily, number>,
            stages,
          });
        }

        const totals = samples.map((sample) => sample.totalMs);
        const queryCounts = samples.map((sample) => sample.queryCount);
        const queryDurations = samples.map((sample) => sample.queryMs);
        const subsequentTotals = samples.slice(1).map((sample) => sample.totalMs);

        results.push({
          propertyId,
          month,
          firstSampleMs: samples[0]!.totalMs,
          subsequentMedianMs:
            subsequentTotals.length > 0 ? round(median(subsequentTotals)) : null,
          medianMs: round(median(totals)),
          p80Ms: round(percentile(totals, 80)),
          p95Ms: round(percentile(totals, 95)),
          minMs: round(Math.min(...totals)),
          maxMs: round(Math.max(...totals)),
          medianQueryCount: round(median(queryCounts)),
          medianQueryMs: round(median(queryDurations)),
          medianStagesMs: summarizeByStage(samples),
          medianQueryFamiliesMs: summarizeByQueryFamily(samples),
          samples: includeSamples ? samples : [],
        });
      }
    }

    return results;
  } finally {
    await prismaClient.$disconnect();
  }
}

function cleanRouteBaseUrl(rawValue: string): URL {
  const parsed = new URL(rawValue);

  assert.match(parsed.protocol, /^https?:$/, "--route-base-url must be HTTP(S).");
  parsed.pathname = parsed.pathname.replace(/\/+$/, "");
  parsed.search = "";
  parsed.hash = "";

  return parsed;
}

async function measureRouteResponses(): Promise<unknown> {
  const rawBaseUrl = optionValue("route-base-url");

  if (!rawBaseUrl) {
    return {
      status: "not_requested",
    };
  }

  const cookie = process.env[ROUTE_COOKIE_ENV];

  if (!cookie) {
    return {
      status: "not_run",
      reason:
        "No ADMIN session cookie was provided through TRP_ADMIN_SESSION_COOKIE.",
    };
  }

  const baseUrl = cleanRouteBaseUrl(rawBaseUrl);
  const sampleCount = parsePositiveIntegerOption("route-samples", 5);
  const baseMonth = assertValidMonth(optionValue("month") ?? "2026-10");
  const propertyIds = parseProperties();
  const navigationTargets = [
    {
      action: "first_load",
      propertyId: propertyIds[0]!,
      month: baseMonth,
    },
    ...propertyIds.slice(1).map((propertyId) => ({
      action: "property_change",
      propertyId,
      month: baseMonth,
    })),
    {
      action: "previous_month",
      propertyId: propertyIds[0]!,
      month: addMonths(baseMonth, -1),
    },
    {
      action: "next_month",
      propertyId: propertyIds[0]!,
      month: addMonths(baseMonth, 1),
    },
  ] as const;

  const results = [];

  for (const target of navigationTargets) {
    const samples = [];

    for (let sample = 1; sample <= sampleCount; sample += 1) {
      const url = new URL("/admin/calendar", baseUrl);
      url.searchParams.set("propertyId", target.propertyId);
      url.searchParams.set("month", target.month);

      const startedAt = performance.now();
      const response = await fetch(url, {
        headers: {
          cookie,
        },
        redirect: "manual",
      });
      const bytes = (await response.arrayBuffer()).byteLength;

      samples.push({
        sample,
        status: response.status,
        totalMs: round(performance.now() - startedAt),
        bytes,
        redirected: response.status >= 300 && response.status < 400,
      });
    }

    results.push({
      ...target,
      firstSampleMs: samples[0]?.totalMs ?? null,
      medianMs: round(median(samples.map((sample) => sample.totalMs))),
      p80Ms: round(percentile(samples.map((sample) => sample.totalMs), 80)),
      samples,
    });
  }

  return {
    status: "completed",
    note:
      "Route-response timing only; browser-visible render timing requires a browser session.",
    results,
  };
}

async function main(): Promise<void> {
  assertTestEnvironment();

  const sampleCount = parsePositiveIntegerOption("samples", 7);
  const baseMonth = assertValidMonth(optionValue("month") ?? "2026-10");
  const dataPathResults = await measureCalendarDataPath();
  const routeResponseResults = hasFlag("skip-route")
    ? { status: "skipped" }
    : await measureRouteResponses();

  console.log(
    JSON.stringify(
      {
        generatedAt: new Date().toISOString(),
        environment: "test",
        command: `TRP_ENVIRONMENT=test npx tsx scripts/measure-admin-property-calendar.ts --samples=${sampleCount} --month=${baseMonth}`,
        dataPathResults,
        routeResponseResults,
      },
      null,
      2,
    ),
  );
}

main().catch((error: unknown) => {
  console.error(error);
  process.exitCode = 1;
});
