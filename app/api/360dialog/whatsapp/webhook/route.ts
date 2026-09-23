import { NextResponse } from "next/server";

import { validateD360WebhookRequest } from "@/lib/360dialog/provider";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const NO_STORE_HEADERS = {
  "cache-control": "no-store, max-age=0",
} as const;

function errorResponse(code: string, status: number): NextResponse {
  return NextResponse.json(
    { error: { code } },
    { status, headers: NO_STORE_HEADERS },
  );
}

export async function POST(request: Request): Promise<NextResponse> {
  const validation = await validateD360WebhookRequest(request);

  if (!validation.valid) {
    return errorResponse(validation.errorCode, validation.httpStatus);
  }

  return new NextResponse(null, {
    status: 200,
    headers: NO_STORE_HEADERS,
  });
}
