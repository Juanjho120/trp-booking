import {
  adminApiErrorResponse,
  adminApiSuccessResponse,
  AdminPushError,
  getAdminPushConfig,
  getAdminSessionActor,
} from "@/lib/admin";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET() {
  const actor = await getAdminSessionActor();

  if (!actor) {
    return adminApiErrorResponse("ADMIN_UNAUTHORIZED", 401);
  }

  try {
    return adminApiSuccessResponse(getAdminPushConfig());
  } catch (error) {
    if (error instanceof AdminPushError) {
      return adminApiErrorResponse(error.code, 503);
    }

    return adminApiErrorResponse("ADMIN_PUSH_UNEXPECTED_ERROR", 500);
  }
}
