import { timingSafeEqual } from "crypto";

import { NextResponse } from "next/server";

import { scheduleArrivalInstructionsNotifications } from "@/lib/email";
import type { ArrivalInstructionsSchedulingSummary } from "@/types/email-notification";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const CRON_SECRET_HEADER = "x-cron-secret";

type CronArrivalInstructionsErrorResponse = Readonly<{
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
    getBearerToken(request) ??
    request.headers.get(CRON_SECRET_HEADER)?.trim() ??
    "";

  return (
    providedSecret.length > 0 &&
    timingSafeStringEquals(providedSecret, expectedSecret)
  );
}

function buildErrorResponse(
  message: string,
  status: number,
): NextResponse<CronArrivalInstructionsErrorResponse> {
  return NextResponse.json(
    { error: message },
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
): Promise<
  NextResponse<
    ArrivalInstructionsSchedulingSummary | CronArrivalInstructionsErrorResponse
  >
> {
  if (!process.env.CRON_SECRET?.trim()) {
    return buildErrorResponse(
      "Arrival-instruction scheduling cron is not configured.",
      503,
    );
  }

  if (!isAuthorizedCronRequest(request)) {
    return buildErrorResponse("Unauthorized.", 401);
  }

  try {
    const result = await scheduleArrivalInstructionsNotifications();

    return NextResponse.json(result, {
      status: result.failed > 0 ? 207 : 200,
      headers: {
        "cache-control": "no-store, max-age=0",
      },
    });
  } catch {
    return buildErrorResponse(
      "Arrival-instruction scheduling failed.",
      503,
    );
  }
}
