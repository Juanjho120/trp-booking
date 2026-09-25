import {
  adminApiErrorResponse,
  adminApiSuccessResponse,
  adminPushEndpointInputSchema,
  AdminPushError,
  getAdminPushSubscriptionStatus,
  getAdminSessionActor,
  isValidAdminMutationOrigin,
} from "@/lib/admin";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

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
    const parsedBody = adminPushEndpointInputSchema.safeParse(
      await readJson(request),
    );

    if (!parsedBody.success) {
      return adminApiErrorResponse("INVALID_ADMIN_PUSH_REQUEST", 400);
    }

    const result = await getAdminPushSubscriptionStatus(parsedBody.data, actor);

    return adminApiSuccessResponse(result);
  } catch (error) {
    if (error instanceof AdminPushError) {
      return adminApiErrorResponse(error.code, 400);
    }

    return adminApiErrorResponse("ADMIN_PUSH_UNEXPECTED_ERROR", 500);
  }
}
