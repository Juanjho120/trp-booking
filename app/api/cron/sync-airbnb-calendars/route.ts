import { timingSafeEqual } from "crypto";

import { CalendarSyncTriggeredBy } from "@prisma/client";
import { NextResponse } from "next/server";

import { syncConfiguredAirbnbIcalImports } from "@/lib/airbnb-ical/scheduled-sync";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const CRON_SECRET_HEADER = "x-cron-secret";

type CronSyncResponse = Readonly<{
  calendarsFound: number;
  calendarsSynced: number;
  calendarsFailed: number;
  calendarsSkipped: number;
  results: readonly Readonly<{
    externalCalendarId: string;
    syncLogId?: string;
    status: string;
    errorCode?: string;
    errorMessage?: string;
    eventsImported: number;
    eventsUpdated: number;
    eventsRemoved: number;
    eventsSkipped: number;
    blocksCreated: number;
    blocksUpdated: number;
  }>[];
}>;

type CronSyncErrorResponse = Readonly<{
  error: string;
}>;

function getBearerToken(request: Request): string | null {
  const authorizationHeader = request.headers.get("authorization");

  if (!authorizationHeader?.startsWith("Bearer ")) {
    return null;
  }

  const token = authorizationHeader.slice("Bearer ".length).trim();

  return token.length > 0 ? token : null;
}

function timingSafeStringEquals(firstValue: string, secondValue: string): boolean {
  const firstBuffer = Buffer.from(firstValue);
  const secondBuffer = Buffer.from(secondValue);

  if (firstBuffer.length !== secondBuffer.length) {
    return false;
  }

  return timingSafeEqual(firstBuffer, secondBuffer);
}

function isAuthorizedCronRequest(request: Request): boolean {
  const expectedSecret = process.env.CRON_SECRET?.trim();

  if (!expectedSecret) {
    return false;
  }

  const providedSecret =
    getBearerToken(request) ?? request.headers.get(CRON_SECRET_HEADER)?.trim() ?? "";

  if (!providedSecret) {
    return false;
  }

  return timingSafeStringEquals(providedSecret, expectedSecret);
}

function buildErrorResponse(
  message: string,
  status: number,
): NextResponse<CronSyncErrorResponse> {
  return NextResponse.json(
    {
      error: message,
    },
    {
      status,
      headers: {
        "cache-control": "no-store, max-age=0",
      },
    },
  );
}

export async function GET(
  request: Request,
): Promise<NextResponse<CronSyncResponse | CronSyncErrorResponse>> {
  if (!process.env.CRON_SECRET?.trim()) {
    return buildErrorResponse("Airbnb iCal cron sync is not configured.", 503);
  }

  if (!isAuthorizedCronRequest(request)) {
    return buildErrorResponse("Unauthorized.", 401);
  }

  const result = await syncConfiguredAirbnbIcalImports({
    triggeredBy: CalendarSyncTriggeredBy.CRON,
  });

  return NextResponse.json(
    {
      calendarsFound: result.calendarsFound,
      calendarsSynced: result.calendarsSynced,
      calendarsFailed: result.calendarsFailed,
      calendarsSkipped: result.calendarsSkipped,
      results: result.results,
    },
    {
      status: result.calendarsFailed > 0 ? 207 : 200,
      headers: {
        "cache-control": "no-store, max-age=0",
      },
    },
  );
}
