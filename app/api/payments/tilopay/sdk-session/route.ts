import { NextResponse } from "next/server";
import { z } from "zod";

import { createTilopaySdkSession, TilopaySdkSessionError } from "@/lib/payments/tilopay-sdk-session";
import { enMessages } from "@/messages/en";
import { esMessages } from "@/messages/es";
import type { TilopaySdkSessionErrorCode } from "@/types/tilopay-sdk-session";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const localeSchema = z.enum(["es", "en"]).catch("es");

const createTilopaySdkSessionRequestSchema = z.object({
  reservationId: z.string().trim().min(1).max(120),
  locale: localeSchema,
});

function getTilopaySdkErrorMessage(
  code: TilopaySdkSessionErrorCode,
  locale: "es" | "en",
): string {
  const messages = locale === "en" ? enMessages : esMessages;

  return messages.errors.payment.tilopaySdk[code];
}

function toErrorResponse(
  code: TilopaySdkSessionErrorCode,
  locale: "es" | "en",
  status: number,
): NextResponse {
  return NextResponse.json(
    {
      error: {
        code,
        message: getTilopaySdkErrorMessage(code, locale),
      },
    },
    { status },
  );
}

function resolveErrorStatus(code: TilopaySdkSessionErrorCode): number {
  switch (code) {
    case "PENDING_HOLD_NOT_FOUND":
      return 404;
    case "PENDING_HOLD_NOT_PAYABLE":
    case "PENDING_HOLD_EXPIRED":
    case "PAYMENT_HANDOFF_UNAVAILABLE_DATES":
    case "PAYMENT_HANDOFF_QUOTE_CHANGED":
    case "PAYMENT_ATTEMPT_AMOUNT_MISMATCH":
      return 409;
    case "TILOPAY_SDK_TOKEN_UNAVAILABLE":
      return 502;
    case "INVALID_PAYMENT_HANDOFF_REQUEST":
    default:
      return 400;
  }
}

export async function POST(request: Request) {
  let body: unknown;

  try {
    body = await request.json();
  } catch {
    return toErrorResponse("INVALID_PAYMENT_HANDOFF_REQUEST", "es", 400);
  }

  const locale = localeSchema.parse(
    typeof body === "object" && body !== null && "locale" in body ? body.locale : "es",
  );
  const parsedRequest = createTilopaySdkSessionRequestSchema.safeParse(body);

  if (!parsedRequest.success) {
    return toErrorResponse("INVALID_PAYMENT_HANDOFF_REQUEST", locale, 400);
  }

  try {
    const tilopaySdkSession = await createTilopaySdkSession(parsedRequest.data);

    return NextResponse.json(
      { tilopaySdkSession },
      { status: tilopaySdkSession.existingPaymentAttempt ? 200 : 201 },
    );
  } catch (error) {
    if (error instanceof TilopaySdkSessionError) {
      return toErrorResponse(error.code, locale, resolveErrorStatus(error.code));
    }

    return toErrorResponse("TILOPAY_SDK_SESSION_UNEXPECTED_ERROR", locale, 500);
  }
}
