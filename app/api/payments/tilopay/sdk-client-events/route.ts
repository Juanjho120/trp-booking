import { NextResponse } from "next/server";
import { z } from "zod";

import {
  recordTilopaySdkClientEvent,
  TilopaySdkClientEventError,
} from "@/lib/payments/tilopay-sdk-client-events";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const eventTypeSchema = z.enum([
  "TILOPAY_SDK_START_PAYMENT_FAILED",
  "TILOPAY_SDK_START_PAYMENT_NON_SUCCESS",
]);

const optionalStringSchema = z.string().trim().max(1000).optional().nullable();

const tilopaySdkClientEventRequestSchema = z.object({
  paymentId: z.string().trim().min(1).max(120),
  reservationId: z.string().trim().min(1).max(120),
  eventType: eventTypeSchema,
  environment: z.enum(["sandbox", "production"]).optional().nullable(),
  locale: z.enum(["es", "en"]).optional().nullable(),
  paymentMethodId: optionalStringSchema,
  paymentMethodName: optionalStringSchema,
  paymentMethodType: optionalStringSchema,
  detectedCardBrand: optionalStringSchema,
  sdkMessage: optionalStringSchema,
  sdkPayload: z.unknown().optional(),
  preflightStatus: optionalStringSchema,
  preflightExpiresAt: optionalStringSchema,
});

function toErrorResponse(code: string, status: number): NextResponse {
  return NextResponse.json(
    {
      error: {
        code,
      },
    },
    { status },
  );
}

export async function POST(request: Request) {
  let body: unknown;

  try {
    body = await request.json();
  } catch {
    return toErrorResponse("INVALID_TILOPAY_SDK_CLIENT_EVENT_REQUEST", 400);
  }

  const parsedRequest = tilopaySdkClientEventRequestSchema.safeParse(body);

  if (!parsedRequest.success) {
    return toErrorResponse("INVALID_TILOPAY_SDK_CLIENT_EVENT_REQUEST", 400);
  }

  try {
    await recordTilopaySdkClientEvent(parsedRequest.data);

    return new NextResponse(null, { status: 204 });
  } catch (error) {
    if (error instanceof TilopaySdkClientEventError && error.code === "PAYMENT_NOT_FOUND") {
      return toErrorResponse("TILOPAY_SDK_CLIENT_EVENT_PAYMENT_NOT_FOUND", 404);
    }

    return toErrorResponse("TILOPAY_SDK_CLIENT_EVENT_UNEXPECTED_ERROR", 500);
  }
}
