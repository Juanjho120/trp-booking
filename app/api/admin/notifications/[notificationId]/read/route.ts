import { z } from "zod";

import {
  adminApiErrorResponse,
  adminApiSuccessResponse,
  AdminNotificationCenterError,
  getAdminSessionActor,
  isValidAdminMutationOrigin,
  markAdminNotificationRead,
} from "@/lib/admin";
import type { AdminNotificationCenterErrorCode } from "@/lib/admin";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const paramsSchema = z
  .object({
    notificationId: z.string().trim().min(1).max(160),
  })
  .strict();

const errorStatus: Record<AdminNotificationCenterErrorCode, number> = {
  ADMIN_UNAUTHORIZED: 401,
  ADMIN_NOTIFICATION_ORIGIN_INVALID: 403,
  INVALID_ADMIN_NOTIFICATION_REQUEST: 400,
  ADMIN_NOTIFICATION_NOT_FOUND: 404,
  ADMIN_NOTIFICATION_UNEXPECTED_ERROR: 500,
};

type RouteContext = Readonly<{
  params: Promise<{
    notificationId: string;
  }>;
}>;

function errorResponse(error: unknown) {
  const code =
    error instanceof AdminNotificationCenterError
      ? error.code
      : "ADMIN_NOTIFICATION_UNEXPECTED_ERROR";

  return adminApiErrorResponse(code, errorStatus[code]);
}

async function markRead(request: Request, context: RouteContext) {
  try {
    const actor = await getAdminSessionActor();

    if (!actor) {
      throw new AdminNotificationCenterError("ADMIN_UNAUTHORIZED");
    }

    if (!isValidAdminMutationOrigin(request)) {
      throw new AdminNotificationCenterError(
        "ADMIN_NOTIFICATION_ORIGIN_INVALID",
      );
    }

    const parsedParams = paramsSchema.safeParse(await context.params);

    if (!parsedParams.success) {
      throw new AdminNotificationCenterError(
        "INVALID_ADMIN_NOTIFICATION_REQUEST",
      );
    }

    const result = await markAdminNotificationRead({
      notificationId: parsedParams.data.notificationId,
      actor,
    });

    return adminApiSuccessResponse(result);
  } catch (error) {
    return errorResponse(error);
  }
}

export async function POST(request: Request, context: RouteContext) {
  return markRead(request, context);
}

export async function PATCH(request: Request, context: RouteContext) {
  return markRead(request, context);
}
