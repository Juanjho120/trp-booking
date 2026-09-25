import {
  adminApiErrorResponse,
  adminApiSuccessResponse,
  adminPushEndpointInputSchema,
  adminPushSubscriptionInputSchema,
  AdminPushError,
  getAdminSessionActor,
  isValidAdminMutationOrigin,
  registerAdminPushSubscription,
  revokeAdminPushSubscription,
} from "@/lib/admin";
import type { AdminPushErrorCode } from "@/lib/admin";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const errorStatus: Record<AdminPushErrorCode, number> = {
  ADMIN_UNAUTHORIZED: 401,
  ADMIN_PUSH_ORIGIN_INVALID: 403,
  INVALID_ADMIN_PUSH_REQUEST: 400,
  ADMIN_PUSH_CONFIGURATION_INVALID: 503,
  ADMIN_PUSH_UNAVAILABLE: 503,
  ADMIN_PUSH_SUBSCRIPTION_OWNERSHIP_CONFLICT: 409,
  ADMIN_PUSH_SUBSCRIPTION_NOT_FOUND: 404,
  ADMIN_PUSH_SUBSCRIPTION_EXPIRED: 410,
  ADMIN_PUSH_TEST_SEND_FAILED: 502,
  ADMIN_PUSH_UNEXPECTED_ERROR: 500,
};

async function readJson(request: Request): Promise<unknown> {
  try {
    return await request.json();
  } catch {
    throw new AdminPushError("INVALID_ADMIN_PUSH_REQUEST");
  }
}

async function authorizeMutation(request: Request) {
  const actor = await getAdminSessionActor();

  if (!actor) {
    throw new AdminPushError("ADMIN_UNAUTHORIZED");
  }

  if (!isValidAdminMutationOrigin(request)) {
    throw new AdminPushError("ADMIN_PUSH_ORIGIN_INVALID");
  }

  return actor;
}

function errorResponse(error: unknown) {
  const code =
    error instanceof AdminPushError
      ? error.code
      : "ADMIN_PUSH_UNEXPECTED_ERROR";

  return adminApiErrorResponse(code, errorStatus[code]);
}

export async function POST(request: Request) {
  try {
    const actor = await authorizeMutation(request);
    const parsedBody = adminPushSubscriptionInputSchema.safeParse(
      await readJson(request),
    );

    if (!parsedBody.success) {
      return adminApiErrorResponse("INVALID_ADMIN_PUSH_REQUEST", 400);
    }

    const result = await registerAdminPushSubscription(parsedBody.data, actor);

    return adminApiSuccessResponse(result);
  } catch (error) {
    return errorResponse(error);
  }
}

export async function DELETE(request: Request) {
  try {
    const actor = await authorizeMutation(request);
    const parsedBody = adminPushEndpointInputSchema.safeParse(
      await readJson(request),
    );

    if (!parsedBody.success) {
      return adminApiErrorResponse("INVALID_ADMIN_PUSH_REQUEST", 400);
    }

    const result = await revokeAdminPushSubscription(parsedBody.data, actor);

    return adminApiSuccessResponse(result);
  } catch (error) {
    return errorResponse(error);
  }
}
