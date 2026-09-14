import { z } from "zod";

import {
  AdminRefundError,
  adminApiErrorResponse,
  adminApiSuccessResponse,
  createAdminRefundAuthorization,
  getAdminSessionActor,
  isValidAdminMutationOrigin,
} from "@/lib/admin";
import {
  adminRefundProcessingModes,
  type AdminRefundErrorCode,
} from "@/types/admin-refund";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const idSchema = z.string().trim().min(1).max(160);
const amountSchema = z
  .string()
  .trim()
  .regex(/^\d{1,8}(?:\.\d{1,2})?$/);
const paramsSchema = z
  .object({
    reservationId: idSchema,
  })
  .strict();
const requestSchema = z
  .object({
    paymentId: idSchema,
    amount: amountSchema,
    reason: z.string().trim().min(1).max(2_000),
    processingMode: z.enum(adminRefundProcessingModes),
    requestId: z.uuid(),
    expectedPaymentUpdatedAt: z.iso.datetime(),
    allocations: z
      .array(
        z
          .object({
            additionalChargeId: idSchema,
            amount: amountSchema,
            expectedChargeUpdatedAt: z.iso.datetime(),
          })
          .strict(),
      )
      .min(1)
      .max(50),
  })
  .strict();

type RouteContext = Readonly<{
  params: Promise<{ reservationId: string }>;
}>;

function errorStatus(code: AdminRefundErrorCode): number {
  if (code === "ADMIN_UNAUTHORIZED") return 401;
  if (
    code === "ADMIN_REFUND_LIFECYCLE_REQUEST_NOT_FOUND" ||
    code === "ADMIN_REFUND_NOT_FOUND" ||
    code === "ADMIN_REFUND_PAYMENT_NOT_FOUND"
  ) {
    return 404;
  }
  if (
    code === "ADMIN_REFUND_STALE" ||
    code === "ADMIN_REFUND_RECONCILIATION_CONFLICT"
  ) {
    return 409;
  }
  if (code === "ADMIN_REFUND_PROVIDER_UNAVAILABLE") return 503;
  if (code === "ADMIN_REFUND_UNEXPECTED_ERROR") return 500;
  return 400;
}

async function readJson(request: Request): Promise<unknown> {
  try {
    return await request.json();
  } catch {
    throw new AdminRefundError("INVALID_ADMIN_REFUND_REQUEST");
  }
}

function errorResponse(error: unknown) {
  if (error instanceof AdminRefundError) {
    return adminApiErrorResponse(error.code, errorStatus(error.code));
  }

  return adminApiErrorResponse("ADMIN_REFUND_UNEXPECTED_ERROR", 500);
}

export async function POST(request: Request, context: RouteContext) {
  const actor = await getAdminSessionActor();

  if (!actor) {
    return adminApiErrorResponse("ADMIN_UNAUTHORIZED", 401);
  }

  if (!isValidAdminMutationOrigin(request)) {
    return adminApiErrorResponse(
      "ADMIN_ADDITIONAL_CHARGE_ORIGIN_INVALID",
      403,
    );
  }

  try {
    const parsedParams = paramsSchema.safeParse(await context.params);
    const parsedRequest = requestSchema.safeParse(await readJson(request));

    if (!parsedParams.success || !parsedRequest.success) {
      return adminApiErrorResponse("INVALID_ADMIN_REFUND_REQUEST", 400);
    }

    const result = await createAdminRefundAuthorization(
      {
        reservationId: parsedParams.data.reservationId,
        authorizationType: "ADDITIONAL_CHARGE",
        ...parsedRequest.data,
      },
      actor,
    );

    return adminApiSuccessResponse({ result });
  } catch (error) {
    return errorResponse(error);
  }
}
