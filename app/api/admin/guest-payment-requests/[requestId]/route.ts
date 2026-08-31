import { z } from "zod";

import {
  adminApiErrorResponse,
  adminApiSuccessResponse,
  getAdminSessionActor,
  isValidAdminMutationOrigin,
} from "@/lib/admin";
import { adminAdditionalChargeErrorResponse } from "@/lib/admin/additional-charge-api";
import {
  AdminAdditionalChargeError,
  cancelAdminGuestPaymentRequest,
} from "@/lib/admin/additional-charges";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const paramsSchema = z
  .object({
    requestId: z.string().trim().min(1).max(160),
  })
  .strict();

const cancelSchema = z
  .object({
    expectedUpdatedAt: z.iso.datetime(),
  })
  .strict();

type RouteContext = Readonly<{
  params: Promise<{ requestId: string }>;
}>;

async function readJson(request: Request): Promise<unknown> {
  try {
    return await request.json();
  } catch {
    throw new AdminAdditionalChargeError(
      "INVALID_ADMIN_ADDITIONAL_CHARGE_REQUEST",
    );
  }
}

async function authorizeMutation(request: Request) {
  const actor = await getAdminSessionActor();

  if (!actor) {
    throw new AdminAdditionalChargeError("ADMIN_UNAUTHORIZED");
  }

  if (!isValidAdminMutationOrigin(request)) {
    throw new AdminAdditionalChargeError(
      "ADMIN_ADDITIONAL_CHARGE_ORIGIN_INVALID",
    );
  }

  return actor;
}

export async function DELETE(request: Request, context: RouteContext) {
  try {
    const actor = await authorizeMutation(request);
    const parsedParams = paramsSchema.safeParse(await context.params);
    const parsedBody = cancelSchema.safeParse(await readJson(request));

    if (!parsedParams.success || !parsedBody.success) {
      return adminApiErrorResponse(
        "INVALID_ADMIN_ADDITIONAL_CHARGE_REQUEST",
        400,
      );
    }

    const paymentRequest = await cancelAdminGuestPaymentRequest(
      {
        requestId: parsedParams.data.requestId,
        expectedUpdatedAt: parsedBody.data.expectedUpdatedAt,
      },
      actor,
    );

    return adminApiSuccessResponse({ paymentRequest });
  } catch (error) {
    return adminAdditionalChargeErrorResponse(error);
  }
}
