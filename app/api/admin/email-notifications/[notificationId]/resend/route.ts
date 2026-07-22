import { z } from "zod";

import {
  AdminEmailNotificationResendError,
  adminApiErrorResponse,
  adminApiSuccessResponse,
  getAdminSessionActor,
  requestAdminEmailNotificationResend,
} from "@/lib/admin";
import type { AdminEmailNotificationResendErrorCode } from "@/types/admin-email-notification-resend";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const idSchema = z.string().trim().min(1).max(120);
const requestSchema = z
  .object({
    reservationId: idSchema,
    expectedUpdatedAt: z.iso.datetime(),
    requestId: z.uuid(),
  })
  .strict();

type RouteContext = Readonly<{
  params: Promise<{
    notificationId: string;
  }>;
}>;

function errorStatus(code: AdminEmailNotificationResendErrorCode): number {
  switch (code) {
    case "ADMIN_UNAUTHORIZED":
      return 401;
    case "ADMIN_EMAIL_NOTIFICATION_NOT_FOUND":
      return 404;
    case "ADMIN_EMAIL_NOTIFICATION_STALE":
    case "ADMIN_EMAIL_NOTIFICATION_PROCESSING_ACTIVE":
      return 409;
    case "INVALID_ADMIN_EMAIL_NOTIFICATION_RESEND_REQUEST":
    case "ADMIN_EMAIL_NOTIFICATION_RESEND_NOT_ALLOWED":
    case "ADMIN_EMAIL_NOTIFICATION_RESERVATION_NOT_CONFIRMED":
      return 400;
    case "ADMIN_EMAIL_NOTIFICATION_UNEXPECTED_ERROR":
    default:
      return 500;
  }
}

async function readJson(request: Request): Promise<unknown> {
  try {
    return await request.json();
  } catch {
    throw new AdminEmailNotificationResendError(
      "INVALID_ADMIN_EMAIL_NOTIFICATION_RESEND_REQUEST",
    );
  }
}

function errorResponse(error: unknown) {
  if (error instanceof AdminEmailNotificationResendError) {
    return adminApiErrorResponse(error.code, errorStatus(error.code));
  }

  return adminApiErrorResponse(
    "ADMIN_EMAIL_NOTIFICATION_UNEXPECTED_ERROR",
    500,
  );
}

export async function POST(request: Request, context: RouteContext) {
  const actor = await getAdminSessionActor();

  if (!actor) {
    return adminApiErrorResponse("ADMIN_UNAUTHORIZED", 401);
  }

  try {
    const { notificationId } = await context.params;
    const parsedNotificationId = idSchema.safeParse(notificationId);
    const parsedRequest = requestSchema.safeParse(await readJson(request));

    if (!parsedNotificationId.success || !parsedRequest.success) {
      return adminApiErrorResponse(
        "INVALID_ADMIN_EMAIL_NOTIFICATION_RESEND_REQUEST",
        400,
      );
    }

    const result = await requestAdminEmailNotificationResend(
      {
        sourceNotificationId: parsedNotificationId.data,
        reservationId: parsedRequest.data.reservationId,
        expectedUpdatedAt: parsedRequest.data.expectedUpdatedAt,
        requestId: parsedRequest.data.requestId,
      },
      actor,
    );

    return adminApiSuccessResponse({ result });
  } catch (error) {
    return errorResponse(error);
  }
}
