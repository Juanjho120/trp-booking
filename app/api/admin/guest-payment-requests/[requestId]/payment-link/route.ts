import { NextResponse } from "next/server";
import { z } from "zod";

import {
  adminApiErrorResponse,
  getAdminSessionActor,
  isValidAdminMutationOrigin,
} from "@/lib/admin";
import { adminAdditionalChargeErrorResponse } from "@/lib/admin/additional-charge-api";
import { AdminAdditionalChargeError } from "@/lib/admin/additional-charges";
import { getAdminGuestPaymentRequestPaymentLink } from "@/lib/payments/guest-payment-request-payment";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const paramsSchema = z
  .object({
    requestId: z.string().trim().min(1).max(160),
  })
  .strict();

type RouteContext = Readonly<{
  params: Promise<{ requestId: string }>;
}>;

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

    if (!parsedParams.success) {
      return adminApiErrorResponse(
        "INVALID_ADMIN_ADDITIONAL_CHARGE_REQUEST",
        400,
      );
    }

    const paymentUrl = await getAdminGuestPaymentRequestPaymentLink(
      {
        requestId: parsedParams.data.requestId,
        requestOrigin: request.headers.get("origin"),
      },
      actor,
    );

    return NextResponse.json(
      { paymentUrl },
      {
        status: 200,
        headers: {
          "cache-control": "private, no-store, max-age=0",
        },
      },
    );
  } catch (error) {
    return adminAdditionalChargeErrorResponse(error);
  }
}
