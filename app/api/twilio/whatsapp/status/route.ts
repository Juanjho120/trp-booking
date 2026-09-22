import { NextResponse } from "next/server";

import { validateTwilioWebhookRequest } from "@/lib/twilio/provider";
import { processTwilioWhatsAppStatusCallback } from "@/lib/twilio/whatsapp-status";

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
  const validation = await validateTwilioWebhookRequest(request);

  if (!validation.valid) {
    return errorResponse(validation.errorCode, validation.httpStatus);
  }

  try {
    await processTwilioWhatsAppStatusCallback(validation.payload);

    return new NextResponse(null, { status: 204, headers: NO_STORE_HEADERS });
  } catch {
    return errorResponse("TWILIO_STATUS_CALLBACK_UNEXPECTED_ERROR", 500);
  }
}
