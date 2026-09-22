import { z } from "zod";

import {
  adminApiErrorResponse,
  adminApiSuccessResponse,
  AdminWhatsAppError,
  getAdminSessionActor,
  isValidAdminMutationOrigin,
  markAdminWhatsAppConversationRead,
} from "@/lib/admin";
import type { AdminWhatsAppErrorCode } from "@/types/admin-whatsapp";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const paramsSchema = z
  .object({
    conversationId: z.string().trim().min(1).max(160),
  })
  .strict();

const errorStatus: Record<AdminWhatsAppErrorCode, number> = {
  ADMIN_UNAUTHORIZED: 401,
  ADMIN_WHATSAPP_ORIGIN_INVALID: 403,
  INVALID_ADMIN_WHATSAPP_REQUEST: 400,
  ADMIN_WHATSAPP_CONVERSATION_NOT_FOUND: 404,
  ADMIN_WHATSAPP_UNEXPECTED_ERROR: 500,
};

type RouteContext = Readonly<{
  params: Promise<{ conversationId: string }>;
}>;

function adminWhatsAppErrorResponse(error: unknown) {
  const code =
    error instanceof AdminWhatsAppError
      ? error.code
      : "ADMIN_WHATSAPP_UNEXPECTED_ERROR";

  return adminApiErrorResponse(code, errorStatus[code]);
}

async function authorizeMutation(request: Request) {
  const actor = await getAdminSessionActor();

  if (!actor) {
    throw new AdminWhatsAppError("ADMIN_UNAUTHORIZED");
  }

  if (!isValidAdminMutationOrigin(request)) {
    throw new AdminWhatsAppError("ADMIN_WHATSAPP_ORIGIN_INVALID");
  }

  return actor;
}

export async function PATCH(request: Request, context: RouteContext) {
  try {
    const actor = await authorizeMutation(request);
    const parsedParams = paramsSchema.safeParse(await context.params);

    if (!parsedParams.success) {
      return adminApiErrorResponse("INVALID_ADMIN_WHATSAPP_REQUEST", 400);
    }

    const conversation = await markAdminWhatsAppConversationRead(
      { conversationId: parsedParams.data.conversationId },
      actor,
    );

    return adminApiSuccessResponse({ conversation });
  } catch (error) {
    return adminWhatsAppErrorResponse(error);
  }
}
