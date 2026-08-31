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
  createAdminGuestPaymentRequest,
} from "@/lib/admin/additional-charges";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const paramsSchema = z
  .object({
    reservationId: z.string().trim().min(1).max(160),
  })
  .strict();

const requestSchema = z
  .object({
    clientRequestId: z.uuid(),
    charges: z
      .array(
        z
          .object({
            chargeId: z.string().trim().min(1).max(160),
            expectedUpdatedAt: z.iso.datetime(),
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

export async function POST(request: Request, context: RouteContext) {
  try {
    const actor = await authorizeMutation(request);
    const parsedParams = paramsSchema.safeParse(await context.params);
    const parsedBody = requestSchema.safeParse(await readJson(request));

    if (!parsedParams.success || !parsedBody.success) {
      return adminApiErrorResponse(
        "INVALID_ADMIN_ADDITIONAL_CHARGE_REQUEST",
        400,
      );
    }

    const paymentRequest = await createAdminGuestPaymentRequest(
      {
        reservationId: parsedParams.data.reservationId,
        ...parsedBody.data,
      },
      actor,
    );

    return adminApiSuccessResponse({ paymentRequest });
  } catch (error) {
    return adminAdditionalChargeErrorResponse(error);
  }
}
