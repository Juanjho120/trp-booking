import { NextResponse } from "next/server";

import {
  ZohoMailWebhookError,
  processZohoMailWebhook,
} from "@/lib/zoho-mail";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const MAX_RAW_BODY_BYTES = 16 * 1024;

function jsonResponse(
  payload: Readonly<Record<string, unknown>>,
  status: number,
): NextResponse {
  return NextResponse.json(payload, { status });
}

async function readBoundedRawBody(request: Request): Promise<string> {
  const contentLength = Number(request.headers.get("content-length") ?? "0");

  if (Number.isFinite(contentLength) && contentLength > MAX_RAW_BODY_BYTES) {
    throw new ZohoMailWebhookError("ZOHO_MAIL_PAYLOAD_TOO_LARGE", 413);
  }

  const rawBody = await request.text();

  if (Buffer.byteLength(rawBody, "utf8") > MAX_RAW_BODY_BYTES) {
    throw new ZohoMailWebhookError("ZOHO_MAIL_PAYLOAD_TOO_LARGE", 413);
  }

  return rawBody;
}

export async function POST(request: Request) {
  try {
    const rawBody = await readBoundedRawBody(request);
    const outcome = await processZohoMailWebhook({
      rawBody,
      hookSecretHeader: request.headers.get("x-hook-secret"),
      signatureHeader: request.headers.get("x-hook-signature"),
      bootstrapTokenParam: new URL(request.url).searchParams.get("bootstrap"),
    });

    return jsonResponse({ ok: true, status: outcome.status }, 200);
  } catch (error) {
    if (error instanceof ZohoMailWebhookError) {
      return jsonResponse({ ok: false, error: { code: error.code } }, error.status);
    }

    return jsonResponse(
      {
        ok: false,
        error: { code: "ZOHO_MAIL_WEBHOOK_UNEXPECTED_ERROR" },
      },
      500,
    );
  }
}
