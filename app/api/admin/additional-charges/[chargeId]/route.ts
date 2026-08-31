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
  cancelAdminAdditionalCharge,
  updateAdminAdditionalCharge,
} from "@/lib/admin/additional-charges";
import { ADDITIONAL_CHARGE_CATEGORIES } from "@/types/additional-charge";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const paramsSchema = z
  .object({
    chargeId: z.string().trim().min(1).max(160),
  })
  .strict();

const updateSchema = z
  .object({
    category: z.enum(ADDITIONAL_CHARGE_CATEGORIES),
    description: z.string().trim().min(1).max(1_000),
    internalNote: z.string().trim().max(2_000).nullable().optional(),
    amount: z
      .string()
      .trim()
      .regex(/^(?:0|[1-9]\d{0,7})(?:\.\d{1,2})?$/),
    expectedUpdatedAt: z.iso.datetime(),
  })
  .strict();

const cancelSchema = z
  .object({
    expectedUpdatedAt: z.iso.datetime(),
  })
  .strict();

type RouteContext = Readonly<{
  params: Promise<{ chargeId: string }>;
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

export async function PATCH(request: Request, context: RouteContext) {
  try {
    const actor = await authorizeMutation(request);
    const parsedParams = paramsSchema.safeParse(await context.params);
    const parsedBody = updateSchema.safeParse(await readJson(request));

    if (!parsedParams.success || !parsedBody.success) {
      return adminApiErrorResponse(
        "INVALID_ADMIN_ADDITIONAL_CHARGE_REQUEST",
        400,
      );
    }

    const charge = await updateAdminAdditionalCharge(
      {
        chargeId: parsedParams.data.chargeId,
        ...parsedBody.data,
      },
      actor,
    );

    return adminApiSuccessResponse({ charge });
  } catch (error) {
    return adminAdditionalChargeErrorResponse(error);
  }
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

    const charge = await cancelAdminAdditionalCharge(
      {
        chargeId: parsedParams.data.chargeId,
        expectedUpdatedAt: parsedBody.data.expectedUpdatedAt,
      },
      actor,
    );

    return adminApiSuccessResponse({ charge });
  } catch (error) {
    return adminAdditionalChargeErrorResponse(error);
  }
}
