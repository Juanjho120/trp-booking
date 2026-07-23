import { z } from "zod";

import {
  AdminRefundError,
  adminApiErrorResponse,
  adminApiSuccessResponse,
  createAdminRefundAuthorization,
  getAdminSessionActor,
} from "@/lib/admin";
import {
  adminRefundProcessingModes,
  type AdminRefundErrorCode,
} from "@/types/admin-refund";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const idSchema = z.string().trim().min(1).max(120);
const requestSchema = z
  .object({
    amount: z.string().trim().regex(/^\d{1,8}(?:\.\d{1,2})?$/),
    reason: z.string().trim().min(1).max(2_000),
    processingMode: z.enum(adminRefundProcessingModes),
    requestId: z.uuid(),
    expectedRequestVersion: z.number().int().min(1),
    expectedRequestUpdatedAt: z.iso.datetime(),
    expectedPaymentUpdatedAt: z.iso.datetime(),
  })
  .strict();

type RouteContext = Readonly<{
  params: Promise<{ requestId: string }>;
}>;

function errorStatus(code: AdminRefundErrorCode): number {
  switch (code) {
    case "ADMIN_UNAUTHORIZED":
      return 401;
    case "ADMIN_REFUND_LIFECYCLE_REQUEST_NOT_FOUND":
    case "ADMIN_REFUND_NOT_FOUND":
      return 404;
    case "ADMIN_REFUND_STALE":
    case "ADMIN_REFUND_RECONCILIATION_CONFLICT":
      return 409;
    case "ADMIN_REFUND_PROVIDER_UNAVAILABLE":
      return 503;
    case "INVALID_ADMIN_REFUND_REQUEST":
    case "ADMIN_REFUND_REQUEST_NOT_COMPLETED":
    case "ADMIN_REFUND_RESERVATION_NOT_CANCELLED":
    case "ADMIN_REFUND_PAYMENT_NOT_FOUND":
    case "ADMIN_REFUND_PAYMENT_NOT_REFUNDABLE":
    case "ADMIN_REFUND_POLICY_NOT_ELIGIBLE":
    case "ADMIN_REFUND_AMOUNT_EXCEEDS_POLICY":
    case "ADMIN_REFUND_AMOUNT_EXCEEDS_PAYMENT":
    case "ADMIN_REFUND_NOT_PENDING":
    case "ADMIN_REFUND_NOT_PROCESSING":
    case "ADMIN_REFUND_API_EXECUTION_NOT_ALLOWED":
    case "ADMIN_REFUND_API_SANDBOX_ONLY":
      return 400;
    case "ADMIN_REFUND_UNEXPECTED_ERROR":
    default:
      return 500;
  }
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

  try {
    const { requestId: lifecycleRequestId } = await context.params;
    const parsedLifecycleRequestId = idSchema.safeParse(lifecycleRequestId);
    const parsedRequest = requestSchema.safeParse(await readJson(request));

    if (!parsedLifecycleRequestId.success || !parsedRequest.success) {
      return adminApiErrorResponse("INVALID_ADMIN_REFUND_REQUEST", 400);
    }

    const result = await createAdminRefundAuthorization(
      {
        lifecycleRequestId: parsedLifecycleRequestId.data,
        ...parsedRequest.data,
      },
      actor,
    );

    return adminApiSuccessResponse({ result });
  } catch (error) {
    return errorResponse(error);
  }
}
