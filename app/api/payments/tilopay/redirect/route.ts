import { PaymentPurpose } from "@prisma/client";
import { NextResponse } from "next/server";

import { prisma } from "@/lib/db/prisma";
import { getTilopayEnv } from "@/lib/env/server";
import { createLifecycleAdjustmentHandoffToken } from "@/lib/payments/lifecycle-adjustment-handoff";
import { finalizePaymentSubmissionAttempt } from "@/lib/payments/payment-submission-attempts";
import {
  processTilopayPaymentRedirect,
  TilopayPaymentResultError,
} from "@/lib/payments/tilopay-payment-result";
import type { ProcessedTilopayPaymentResult } from "@/types/tilopay-payment-result";
import type { PaymentSubmissionAttemptStatus } from "@/types/payment-submission-attempt";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function isLifecycleAdjustmentTarget(url: URL): boolean {
  return url.pathname.startsWith("/reservas/ajuste/");
}

function buildResultRedirectUrl(
  baseUrl: string,
  result: ProcessedTilopayPaymentResult,
): URL {
  const url = new URL(baseUrl);
  const lifecycleTarget = isLifecycleAdjustmentTarget(url);

  if (!lifecycleTarget) {
    url.searchParams.set("paymentId", result.paymentId);
    url.searchParams.set("reservationId", result.reservationId);
    url.searchParams.set(
      "reservationStatus",
      result.reservationStatus.toLowerCase(),
    );
    url.searchParams.set(
      "reservationConfirmed",
      String(result.reservationConfirmed),
    );
  }

  url.searchParams.set("paymentStatus", result.paymentStatus.toLowerCase());
  url.searchParams.set("phaseBoundary", result.phaseBoundary);

  if (result.paymentIssue) {
    url.searchParams.set("paymentIssue", result.paymentIssue);
  }

  return url;
}

function buildErrorRedirectUrl(
  baseUrl: string,
  code: string,
  error: unknown,
): URL {
  const url = new URL(baseUrl);
  url.searchParams.set("paymentStatus", "failed");
  url.searchParams.set("reservationConfirmed", "false");
  url.searchParams.set("code", code);

  if (
    !isLifecycleAdjustmentTarget(url) &&
    error instanceof TilopayPaymentResultError
  ) {
    if (error.paymentId) {
      url.searchParams.set("paymentId", error.paymentId);
    }

    if (error.reservationId) {
      url.searchParams.set("reservationId", error.reservationId);
    }
  }

  return url;
}

async function getLifecycleAdjustmentTarget(
  requestUrl: string,
  paymentId: string | undefined,
): Promise<string | null> {
  if (!paymentId) {
    return null;
  }

  const payment = await prisma.payment.findUnique({
    where: { id: paymentId },
    select: {
      id: true,
      purpose: true,
      lifecycleRequestId: true,
      lifecycleRequest: {
        select: {
          id: true,
          hold: {
            select: {
              id: true,
              expiresAt: true,
            },
          },
        },
      },
    },
  });

  if (
    !payment ||
    payment.purpose !== PaymentPurpose.LIFECYCLE_ADJUSTMENT ||
    !payment.lifecycleRequestId ||
    !payment.lifecycleRequest?.hold
  ) {
    return null;
  }

  const token = createLifecycleAdjustmentHandoffToken({
    lifecycleRequestId: payment.lifecycleRequestId,
    holdId: payment.lifecycleRequest.hold.id,
    paymentId: payment.id,
    expiresAt: payment.lifecycleRequest.hold.expiresAt.toISOString(),
  });

  return new URL(
    `/reservas/ajuste/${encodeURIComponent(token)}`,
    requestUrl,
  ).toString();
}

async function resolveResultTargetUrl(
  requestUrl: string,
  env: ReturnType<typeof getTilopayEnv>,
  result: ProcessedTilopayPaymentResult,
): Promise<string> {
  const lifecycleTarget = await getLifecycleAdjustmentTarget(
    requestUrl,
    result.paymentId,
  );

  if (lifecycleTarget) {
    return lifecycleTarget;
  }

  if (result.redirectTarget === "success") {
    return env.TILOPAY_SUCCESS_URL;
  }

  if (result.redirectTarget === "retry") {
    return new URL("/reservas/pago/reintentar", requestUrl).toString();
  }

  return env.TILOPAY_CANCEL_URL;
}

function resultSafeCode(result: ProcessedTilopayPaymentResult): string {
  if (result.paymentStatus === "APPROVED") {
    return "TILOPAY_APPROVED";
  }

  switch (result.paymentIssue) {
    case "invalid_cvv":
      return "TILOPAY_INVALID_CVV";
    case "insufficient_funds":
      return "TILOPAY_INSUFFICIENT_FUNDS";
    case "card_not_allowed_sensitive":
      return "TILOPAY_CARD_NOT_ALLOWED";
    default:
      return "TILOPAY_REJECTED";
  }
}

function errorAttemptStatus(
  error: TilopayPaymentResultError,
): PaymentSubmissionAttemptStatus {
  if (error.code === "RESERVATION_CONFIRMATION_FAILED") {
    return "APPROVED";
  }

  if (error.code === "TILOPAY_CONSULT_UNAVAILABLE") {
    return "UNKNOWN";
  }

  return "FAILED";
}

async function recordSuccessfulResult(
  result: ProcessedTilopayPaymentResult,
): Promise<void> {
  try {
    await finalizePaymentSubmissionAttempt({
      paymentId: result.paymentId,
      status: result.paymentStatus,
      safeResultCode: resultSafeCode(result),
    });
  } catch {
    // Attempt-history persistence must never replace a validated payment result.
  }
}

async function recordFailedResult(error: unknown): Promise<void> {
  if (!(error instanceof TilopayPaymentResultError) || !error.paymentId) {
    return;
  }

  try {
    await finalizePaymentSubmissionAttempt({
      paymentId: error.paymentId,
      status: errorAttemptStatus(error),
      safeResultCode:
        error.code === "RESERVATION_CONFIRMATION_FAILED"
          ? "PAYMENT_APPROVED_RESERVATION_CONFIRMATION_FAILED"
          : error.code,
    });
  } catch {
    // Attempt-history persistence must never replace the safe redirect behavior.
  }
}

export async function GET(request: Request) {
  const env = getTilopayEnv();

  try {
    const result = await processTilopayPaymentRedirect(request.url);
    await recordSuccessfulResult(result);
    const targetUrl = await resolveResultTargetUrl(request.url, env, result);
    return NextResponse.redirect(buildResultRedirectUrl(targetUrl, result));
  } catch (error) {
    await recordFailedResult(error);
    const code =
      error instanceof TilopayPaymentResultError
        ? error.code
        : "TILOPAY_PAYMENT_RESULT_UNEXPECTED_ERROR";
    const lifecycleTarget = await getLifecycleAdjustmentTarget(
      request.url,
      error instanceof TilopayPaymentResultError ? error.paymentId : undefined,
    );

    return NextResponse.redirect(
      buildErrorRedirectUrl(
        lifecycleTarget ?? env.TILOPAY_ERROR_URL,
        code,
        error,
      ),
    );
  }
}
