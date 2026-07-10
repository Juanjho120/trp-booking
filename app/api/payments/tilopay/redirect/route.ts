import { NextResponse } from "next/server";

import { getTilopayEnv } from "@/lib/env/server";
import {
  processTilopayPaymentRedirect,
  TilopayPaymentResultError,
} from "@/lib/payments/tilopay-payment-result";
import type { ProcessedTilopayPaymentResult } from "@/types/tilopay-payment-result";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function buildResultRedirectUrl(
  baseUrl: string,
  result: ProcessedTilopayPaymentResult,
): URL {
  const url = new URL(baseUrl);

  url.searchParams.set("paymentId", result.paymentId);
  url.searchParams.set("reservationId", result.reservationId);
  url.searchParams.set("paymentStatus", result.paymentStatus.toLowerCase());
  url.searchParams.set("phaseBoundary", result.phaseBoundary);

  return url;
}

function buildErrorRedirectUrl(baseUrl: string, code: string, error: unknown): URL {
  const url = new URL(baseUrl);

  url.searchParams.set("paymentStatus", "failed");
  url.searchParams.set("code", code);

  if (error instanceof TilopayPaymentResultError) {
    if (error.paymentId) {
      url.searchParams.set("paymentId", error.paymentId);
    }

    if (error.reservationId) {
      url.searchParams.set("reservationId", error.reservationId);
    }
  }

  return url;
}

export async function GET(request: Request) {
  const env = getTilopayEnv();

  try {
    const result = await processTilopayPaymentRedirect(request.url);
    const targetUrl = result.redirectTarget === "success"
      ? env.TILOPAY_SUCCESS_URL
      : env.TILOPAY_CANCEL_URL;

    return NextResponse.redirect(buildResultRedirectUrl(targetUrl, result));
  } catch (error) {
    const code = error instanceof TilopayPaymentResultError
      ? error.code
      : "TILOPAY_PAYMENT_RESULT_UNEXPECTED_ERROR";

    return NextResponse.redirect(buildErrorRedirectUrl(env.TILOPAY_ERROR_URL, code, error));
  }
}
