import { NextResponse } from "next/server";

import { expirePendingReservationHolds } from "@/lib/reservations";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function isLocalDevRequestAllowed(): boolean {
  return process.env.NODE_ENV !== "production";
}

async function expireLocalPendingReservationHolds() {
  if (!isLocalDevRequestAllowed()) {
    return NextResponse.json(
      {
        error: {
          code: "DEV_ENDPOINT_NOT_AVAILABLE",
          message: "This endpoint is only available outside production.",
        },
      },
      { status: 404 },
    );
  }

  const result = await expirePendingReservationHolds();

  return NextResponse.json({
    ok: true,
    result,
  });
}

export async function GET() {
  return expireLocalPendingReservationHolds();
}

export async function POST() {
  return expireLocalPendingReservationHolds();
}
