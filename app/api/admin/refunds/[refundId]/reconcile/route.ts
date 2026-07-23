import { z } from "zod";

import {
  AdminRefundError,
  adminApiErrorResponse,
  adminApiSuccessResponse,
  getAdminSessionActor,
  reconcileAdminRefund,
} from "@/lib/admin";
import {
  adminRefundProcessingModes,
  adminRefundReconciliationOutcomes,
  adminRefundReconciliationSources,
  type AdminRefundErrorCode,
} from "@/types/admin-refund";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const idSchema = z.string().trim().min(1).max(120);
const requestSchema = z
  .object({
    outcome: z.enum(adminRefundReconciliationOutcomes),
    source: z.enum(adminRefundReconciliationSources),
    finalProcessingMode: z.enum(adminRefundProcessingModes),
    providerRefundId: z.string().trim().max(180).nullable(),
    note: z.string().trim().min(1).max(2_000),
    requestId: z.uuid(),
    expectedRefundUpdatedAt: z.iso.datetime(),
    expectedPaymentUpdatedAt: z.iso.datetime(),
  })
  .strict();

type RouteContext = Readonly<{
  params: Promise<{ refundId: string }>;
}>;

function errorStatus(code: AdminRefundErrorCode): number {
  if (code === "ADMIN_UNAUTHORIZED") return 401;
  if (code === "ADMIN_REFUND_NOT_FOUND") return 404;
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

  try {
    const { refundId } = await context.params;
    const parsedRefundId = idSchema.safeParse(refundId);
    const parsedRequest = requestSchema.safeParse(await readJson(request));

    if (!parsedRefundId.success || !parsedRequest.success) {
      return adminApiErrorResponse("INVALID_ADMIN_REFUND_REQUEST", 400);
    }

    const result = await reconcileAdminRefund(
      { refundId: parsedRefundId.data, ...parsedRequest.data },
      actor,
    );

    return adminApiSuccessResponse({ result });
  } catch (error) {
    return errorResponse(error);
  }
}
