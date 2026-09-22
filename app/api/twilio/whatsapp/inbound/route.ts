import { NextResponse } from "next/server";

import { processInboundWhatsAppWebhook } from "@/lib/twilio/inbound-whatsapp";
import { validateTwilioWebhookRequest } from "@/lib/twilio/provider";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const NO_STORE_HEADERS = {
  "cache-control": "no-store, max-age=0",
} as const;
const EMPTY_MESSAGING_TWIML = "<Response></Response>";

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
    await processInboundWhatsAppWebhook(validation.payload);
  } catch {
    return errorResponse("TWILIO_INBOUND_PERSISTENCE_TEMPORARY_FAILURE", 500);
  }

  return new NextResponse(EMPTY_MESSAGING_TWIML, {
    status: 200,
    headers: {
      ...NO_STORE_HEADERS,
      "content-type": "text/xml; charset=utf-8",
    },
  });
}
