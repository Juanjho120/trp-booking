import { PaymentSubmissionSource } from "@prisma/client";
import { NextResponse } from "next/server";
import { z } from "zod";

import { getTilopayEnv } from "@/lib/env/server";
import { isLifecycleAdjustmentHandoffToken } from "@/lib/payments/lifecycle-adjustment-handoff";
import {
  createPaymentSubmissionAttempt,
  PaymentSubmissionAttemptError,
} from "@/lib/payments/payment-submission-attempts";
import {
  TilopayPaymentPreflightError,
  validateTilopayPaymentPreflight,
} from "@/lib/payments/tilopay-payment-preflight";
import { enMessages } from "@/messages/en";
import { esMessages } from "@/messages/es";
import type { TilopayPaymentPreflightErrorCode } from "@/types/tilopay-payment-preflight";
import type { CreatablePaymentSubmissionAttemptSource } from "@/types/payment-submission-attempt";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const localeSchema = z.enum(["es", "en"]).catch("es");
const tilopayPaymentPreflightRequestSchema = z.object({
  reservationId: z.string().trim().min(1).max(4_096),
  paymentId: z.string().trim().min(1).max(120),
  locale: localeSchema,
});

function getTilopayPreflightErrorMessage(
  code: TilopayPaymentPreflightErrorCode,
  locale: "es" | "en",
): string {
  const messages = locale === "en" ? enMessages : esMessages;
  return messages.errors.payment.tilopaySdk[code];
}

function toErrorResponse(
  code: TilopayPaymentPreflightErrorCode,
  locale: "es" | "en",
  status: number,
): NextResponse {
  return NextResponse.json(
    { error: { code, message: getTilopayPreflightErrorMessage(code, locale) } },
    { status },
  );
}

function resolveErrorStatus(code: TilopayPaymentPreflightErrorCode): number {
  switch (code) {
    case "PENDING_HOLD_NOT_FOUND":
      return 404;
    case "PENDING_HOLD_NOT_PAYABLE":
    case "PENDING_HOLD_EXPIRED":
    case "PAYMENT_HANDOFF_UNAVAILABLE_DATES":
    case "PAYMENT_HANDOFF_QUOTE_CHANGED":
    case "PAYMENT_ATTEMPT_AMOUNT_MISMATCH":
    case "PAYMENT_ATTEMPT_UNEXPECTED_ERROR":
      return 409;
    case "PAYMENT_HANDOFF_UNEXPECTED_ERROR":
      return 500;
    case "INVALID_PAYMENT_HANDOFF_REQUEST":
    default:
      return 400;
  }
}

function resolveSubmissionSource(
  request: Request,
  reservationReference: string,
): CreatablePaymentSubmissionAttemptSource {
  if (isLifecycleAdjustmentHandoffToken(reservationReference)) {
    return PaymentSubmissionSource.LIFECYCLE_ADJUSTMENT;
  }

  const referer = request.headers.get("referer");

  if (referer) {
    try {
      const refererUrl = new URL(referer);
      const requestUrl = new URL(request.url);
      const pathname = refererUrl.pathname.replace(/\/+$/, "");

      if (
        refererUrl.origin === requestUrl.origin &&
        pathname === "/reservas/pago/reintentar"
      ) {
        return PaymentSubmissionSource.RETRY_PAGE;
      }
    } catch {
      // An absent or malformed Referer is safe to classify as initial checkout.
    }
  }

  return PaymentSubmissionSource.INITIAL_CHECKOUT;
}

export async function POST(request: Request) {
  let body: unknown;

  try {
    body = await request.json();
  } catch {
    return toErrorResponse("INVALID_PAYMENT_HANDOFF_REQUEST", "es", 400);
  }

  const locale = localeSchema.parse(
    typeof body === "object" && body !== null && "locale" in body
      ? body.locale
      : "es",
  );
  const parsedRequest = tilopayPaymentPreflightRequestSchema.safeParse(body);

  if (!parsedRequest.success) {
    return toErrorResponse("INVALID_PAYMENT_HANDOFF_REQUEST", locale, 400);
  }

  try {
    const tilopayPaymentPreflight = await validateTilopayPaymentPreflight(
      parsedRequest.data,
    );
    await createPaymentSubmissionAttempt({
      paymentId: tilopayPaymentPreflight.paymentId,
      reservationReference: parsedRequest.data.reservationId,
      source: resolveSubmissionSource(
        request,
        parsedRequest.data.reservationId,
      ),
      environment: getTilopayEnv().TILOPAY_ENVIRONMENT,
      locale,
      preflightExpiresAt: tilopayPaymentPreflight.expiresAt,
    });

    return NextResponse.json({ tilopayPaymentPreflight }, { status: 200 });
  } catch (error) {
    if (error instanceof TilopayPaymentPreflightError) {
      return toErrorResponse(error.code, locale, resolveErrorStatus(error.code));
    }

    if (error instanceof PaymentSubmissionAttemptError) {
      return toErrorResponse(error.code, locale, resolveErrorStatus(error.code));
    }

    return toErrorResponse("PAYMENT_HANDOFF_UNEXPECTED_ERROR", locale, 500);
  }
}
