import { NextResponse } from "next/server";
import { z } from "zod";

import { enMessages } from "@/messages/en";
import { esMessages } from "@/messages/es";
import {
  createPaymentAttemptForPendingReservation,
  PaymentAttemptCreationError,
} from "@/lib/payments/payment-attempts";
import type { PaymentAttemptErrorCode } from "@/types/payment-attempt";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const localeSchema = z.enum(["es", "en"]).catch("es");

const createPaymentAttemptRequestSchema = z.object({
  reservationId: z.string().trim().min(1).max(120),
  locale: localeSchema,
});

function getPaymentAttemptErrorMessage(
  code: PaymentAttemptErrorCode,
  locale: "es" | "en",
): string {
  const messages = locale === "en" ? enMessages : esMessages;

  return messages.errors.payment.attempt[code];
}

function toErrorResponse(
  code: PaymentAttemptErrorCode,
  locale: "es" | "en",
  status: number,
): NextResponse {
  return NextResponse.json(
    {
      error: {
        code,
        message: getPaymentAttemptErrorMessage(code, locale),
      },
    },
    { status },
  );
}

function resolveErrorStatus(code: PaymentAttemptErrorCode): number {
  switch (code) {
    case "PENDING_HOLD_NOT_FOUND":
      return 404;
    case "PENDING_HOLD_NOT_PAYABLE":
    case "PENDING_HOLD_EXPIRED":
    case "PAYMENT_HANDOFF_UNAVAILABLE_DATES":
    case "PAYMENT_HANDOFF_QUOTE_CHANGED":
    case "PAYMENT_ATTEMPT_AMOUNT_MISMATCH":
      return 409;
    case "INVALID_PAYMENT_HANDOFF_REQUEST":
    default:
      return 400;
  }
}

function mapCreationErrorCode(
  code: PaymentAttemptCreationError["code"],
): PaymentAttemptErrorCode {
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
  const parsedRequest = createPaymentAttemptRequestSchema.safeParse(body);

  if (!parsedRequest.success) {
    return toErrorResponse("INVALID_PAYMENT_HANDOFF_REQUEST", locale, 400);
  }

  try {
    const paymentAttempt = await createPaymentAttemptForPendingReservation(parsedRequest.data);

    return NextResponse.json({ paymentAttempt }, { status: 201 });
  } catch (error) {
    if (error instanceof PaymentAttemptCreationError) {
      const code = mapCreationErrorCode(error.code);

      return toErrorResponse(code, locale, resolveErrorStatus(code));
    }

    return toErrorResponse("PAYMENT_ATTEMPT_UNEXPECTED_ERROR", locale, 500);
  }
}
