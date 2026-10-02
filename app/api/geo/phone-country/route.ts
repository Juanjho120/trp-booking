import { NextResponse } from "next/server";

import { normalizeSupportedCountryCode } from "@/lib/geo/countries";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const country = normalizeSupportedCountryCode(
    request.headers.get("x-vercel-ip-country"),
  );

  return NextResponse.json(
    { country },
    {
      status: 200,
      headers: {
        "cache-control": "no-store, max-age=0",
      },
    },
  );
}
