import {
  adminApiErrorResponse,
  adminApiSuccessResponse,
  adminPushTestInputSchema,
  AdminPushError,
  getAdminSessionActor,
  isValidAdminMutationOrigin,
  sendAdminPushTestNotification,
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

export async function POST(request: Request) {
  const actor = await getAdminSessionActor();

  if (!actor) {
    return adminApiErrorResponse("ADMIN_UNAUTHORIZED", 401);
  }

  if (!isValidAdminMutationOrigin(request)) {
    return adminApiErrorResponse("ADMIN_PUSH_ORIGIN_INVALID", 403);
  }

  try {
    const parsedBody = adminPushTestInputSchema.safeParse(
      await readJson(request),
    );

    if (!parsedBody.success) {
      return adminApiErrorResponse("INVALID_ADMIN_PUSH_REQUEST", 400);
    }

    const result = await sendAdminPushTestNotification(parsedBody.data, actor);

    return adminApiSuccessResponse(result);
  } catch (error) {
    const code =
      error instanceof AdminPushError
        ? error.code
        : "ADMIN_PUSH_UNEXPECTED_ERROR";

    return adminApiErrorResponse(code, errorStatus[code]);
  }
}
