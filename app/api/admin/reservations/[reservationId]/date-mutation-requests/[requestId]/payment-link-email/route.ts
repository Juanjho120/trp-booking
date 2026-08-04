import { z } from "zod";

import {
  AdminDateMutationPaymentLinkEmailError,
  getAdminDateMutationPaymentLinkEmailState,
  sendAdminDateMutationPaymentLinkEmail,
} from "@/lib/admin/date-mutation-payment-link-email";
import {
  adminApiErrorResponse,
  adminApiSuccessResponse,
  getAdminSessionActor,
} from "@/lib/admin";
import type { AdminDateMutationPaymentLinkEmailErrorCode } from "@/types/admin-date-mutation-payment-link-email";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const idSchema = z.string().trim().min(1).max(120);
const bodySchema = z
  .object({ requestId: z.string().uuid() })
  .strict();

type RouteContext = Readonly<{
  params: Promise<{
    reservationId: string;
    requestId: string;
  }>;
}>;

function statusFor(code: AdminDateMutationPaymentLinkEmailErrorCode): number {
  switch (code) {
    case "ADMIN_UNAUTHORIZED":
      return 401;
    case "ADMIN_DATE_MUTATION_PAYMENT_EMAIL_REQUEST_NOT_FOUND":
      return 404;
    case "ADMIN_DATE_MUTATION_PAYMENT_EMAIL_NOT_AVAILABLE":
      return 400;
    case "ADMIN_DATE_MUTATION_PAYMENT_EMAIL_PROCESSING_ACTIVE":
    case "ADMIN_DATE_MUTATION_PAYMENT_EMAIL_STALE":
      return 409;
    case "INVALID_ADMIN_DATE_MUTATION_PAYMENT_EMAIL_REQUEST":
      return 400;
    case "ADMIN_DATE_MUTATION_PAYMENT_EMAIL_UNEXPECTED_ERROR":
    default:
      return 500;
  }
}

function errorResponse(error: unknown) {
  if (error instanceof AdminDateMutationPaymentLinkEmailError) {
    return adminApiErrorResponse(error.code, statusFor(error.code));
  }
  return adminApiErrorResponse(
    "ADMIN_DATE_MUTATION_PAYMENT_EMAIL_UNEXPECTED_ERROR",
    500,
  );
}

async function readParams(context: RouteContext) {
  const params = await context.params;
  const reservationId = idSchema.safeParse(params.reservationId);
  const lifecycleRequestId = idSchema.safeParse(params.requestId);
  if (!reservationId.success || !lifecycleRequestId.success) return null;
  return {
    reservationId: reservationId.data,
    lifecycleRequestId: lifecycleRequestId.data,
  };
}

export async function GET(_request: Request, context: RouteContext) {
  const actor = await getAdminSessionActor();
  if (!actor) return adminApiErrorResponse("ADMIN_UNAUTHORIZED", 401);
  try {
    const params = await readParams(context);
    if (!params) {
      return adminApiErrorResponse(
        "INVALID_ADMIN_DATE_MUTATION_PAYMENT_EMAIL_REQUEST",
        400,
      );
    }
    const state = await getAdminDateMutationPaymentLinkEmailState(
      params.reservationId,
      params.lifecycleRequestId,
    );
    return adminApiSuccessResponse({ state });
  } catch (error) {
    return errorResponse(error);
  }
}

export async function POST(request: Request, context: RouteContext) {
  const actor = await getAdminSessionActor();
  if (!actor) return adminApiErrorResponse("ADMIN_UNAUTHORIZED", 401);
  try {
    const params = await readParams(context);
    const body = bodySchema.safeParse(await request.json().catch(() => null));
    if (!params || !body.success) {
      return adminApiErrorResponse(
        "INVALID_ADMIN_DATE_MUTATION_PAYMENT_EMAIL_REQUEST",
        400,
      );
    }
    const result = await sendAdminDateMutationPaymentLinkEmail(
      {
        ...params,
        requestId: body.data.requestId,
      },
      actor,
    );
    return adminApiSuccessResponse({ result });
  } catch (error) {
    return errorResponse(error);
  }
}
