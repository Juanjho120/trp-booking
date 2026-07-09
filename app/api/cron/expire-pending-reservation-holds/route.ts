import { timingSafeEqual } from "crypto";

import { NextResponse } from "next/server";

import { expirePendingReservationHolds } from "@/lib/reservations/expiration";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const CRON_SECRET_HEADER = "x-cron-secret";

type CronExpirePendingHoldsResponse = Readonly<{
  expiredCount: number;
  expiredAt: string;
}>;

type CronExpirePendingHoldsErrorResponse = Readonly<{
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
): NextResponse<CronExpirePendingHoldsErrorResponse> {
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
): Promise<NextResponse<CronExpirePendingHoldsResponse | CronExpirePendingHoldsErrorResponse>> {
  if (!process.env.CRON_SECRET?.trim()) {
    return buildErrorResponse("Pending reservation hold expiration cron is not configured.", 503);
  }

  if (!isAuthorizedCronRequest(request)) {
    return buildErrorResponse("Unauthorized.", 401);
  }

  const result = await expirePendingReservationHolds();

  return NextResponse.json(
    {
      expiredCount: result.expiredCount,
      expiredAt: result.expiredAt,
    },
    {
      status: 200,
      headers: {
        "cache-control": "no-store, max-age=0",
      },
    },
  );
}
