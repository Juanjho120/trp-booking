import { NextResponse } from "next/server";
import { z } from "zod";

import {
  getPaymentHandoffErrorMessage,
  type PaymentHandoffErrorCode,
} from "@/features/reservations/reservation-payment-handoff-copy";
import {
  PaymentHandoffValidationError,
  validatePaymentHandoff,
} from "@/lib/reservations/payment-handoff";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const localeSchema = z.enum(["es", "en"]).catch("es");

const paymentHandoffValidationRequestSchema = z.object({
  reservationId: z.string().trim().min(1).max(120),
  locale: localeSchema,
});

function toErrorResponse(
  code: PaymentHandoffErrorCode,
  locale: "es" | "en",
  status: number,
): NextResponse {
  return NextResponse.json(
    {
      error: {
        code,
        message: getPaymentHandoffErrorMessage(code, locale),
      },
    },
    { status },
  );
}

function resolveErrorStatus(code: PaymentHandoffErrorCode): number {
  switch (code) {
    case "PENDING_HOLD_NOT_FOUND":
      return 404;
    case "PENDING_HOLD_NOT_PAYABLE":
    case "PENDING_HOLD_EXPIRED":
    case "PAYMENT_HANDOFF_UNAVAILABLE_DATES":
    case "PAYMENT_HANDOFF_QUOTE_CHANGED":
      return 409;
    case "INVALID_PAYMENT_HANDOFF_REQUEST":
    default:
      return 400;
  }
}

function mapValidationErrorCode(code: PaymentHandoffValidationError["code"]): PaymentHandoffErrorCode {
  return code;
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
  const parsedRequest = paymentHandoffValidationRequestSchema.safeParse(body);

  if (!parsedRequest.success) {
    return toErrorResponse("INVALID_PAYMENT_HANDOFF_REQUEST", locale, 400);
  }

  try {
    const paymentHandoff = await validatePaymentHandoff(parsedRequest.data);

    return NextResponse.json({ paymentHandoff }, { status: 200 });
  } catch (error) {
    if (error instanceof PaymentHandoffValidationError) {
      const code = mapValidationErrorCode(error.code);

      return toErrorResponse(code, locale, resolveErrorStatus(code));
    }

    return toErrorResponse("PAYMENT_HANDOFF_UNEXPECTED_ERROR", locale, 500);
  }
}
