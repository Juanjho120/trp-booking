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
  createAdminAdditionalCharge,
  getAdminAdditionalChargeManagement,
} from "@/lib/admin/additional-charges";
import { ADDITIONAL_CHARGE_CATEGORIES } from "@/types/additional-charge";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const paramsSchema = z
  .object({
    reservationId: z.string().trim().min(1).max(160),
  })
  .strict();

const createSchema = z
  .object({
    category: z.enum(ADDITIONAL_CHARGE_CATEGORIES),
    description: z.string().trim().min(1).max(1_000),
    internalNote: z.string().trim().max(2_000).nullable().optional(),
    amount: z
      .string()
      .trim()
      .regex(/^(?:0|[1-9]\d{0,7})(?:\.\d{1,2})?$/),
  })
  .strict();

type RouteContext = Readonly<{
  params: Promise<{ reservationId: string }>;
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

export async function GET(_request: Request, context: RouteContext) {
  const actor = await getAdminSessionActor();

  if (!actor) {
    return adminApiErrorResponse("ADMIN_UNAUTHORIZED", 401);
  }

  const parsedParams = paramsSchema.safeParse(await context.params);

  if (!parsedParams.success) {
    return adminApiErrorResponse(
      "INVALID_ADMIN_ADDITIONAL_CHARGE_REQUEST",
      400,
    );
  }

  try {
    const management = await getAdminAdditionalChargeManagement(
      parsedParams.data.reservationId,
    );

    return adminApiSuccessResponse({ management });
  } catch (error) {
    return adminAdditionalChargeErrorResponse(error);
  }
}

export async function POST(request: Request, context: RouteContext) {
  try {
    const actor = await authorizeMutation(request);
    const parsedParams = paramsSchema.safeParse(await context.params);
    const parsedBody = createSchema.safeParse(await readJson(request));

    if (!parsedParams.success || !parsedBody.success) {
      return adminApiErrorResponse(
        "INVALID_ADMIN_ADDITIONAL_CHARGE_REQUEST",
        400,
      );
    }

    const charge = await createAdminAdditionalCharge(
      {
        reservationId: parsedParams.data.reservationId,
        ...parsedBody.data,
      },
      actor,
    );

    return adminApiSuccessResponse({ charge });
  } catch (error) {
    return adminAdditionalChargeErrorResponse(error);
  }
}
