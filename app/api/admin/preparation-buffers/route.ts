import { z } from "zod";

import {
  adminApiErrorResponse,
  adminApiSuccessResponse,
  AdminPreparationBufferError,
  getAdminPreparationBufferSettings,
  getAdminSessionActor,
  updateAdminPreparationBufferSettings,
} from "@/lib/admin";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const updatePreparationBufferSchema = z.object({
  propertyId: z.string().trim().min(1).max(120),
  preparationDaysBefore: z.number().int().min(0).max(30),
  preparationDaysAfter: z.number().int().min(0).max(30),
});

export async function GET() {
  const actor = await getAdminSessionActor();

  if (!actor) {
    return adminApiErrorResponse("ADMIN_UNAUTHORIZED", 401);
  }

  try {
    const settings = await getAdminPreparationBufferSettings();
    return adminApiSuccessResponse({ settings });
  } catch {
    return adminApiErrorResponse(
      "PREPARATION_BUFFER_UNEXPECTED_ERROR",
      500,
    );
  }
}

export async function PATCH(request: Request) {
  const actor = await getAdminSessionActor();

  if (!actor) {
    return adminApiErrorResponse("ADMIN_UNAUTHORIZED", 401);
  }

  let body: unknown;

  try {
    body = await request.json();
  } catch {
    return adminApiErrorResponse(
      "INVALID_PREPARATION_BUFFER_REQUEST",
      400,
    );
  }

  const parsedRequest = updatePreparationBufferSchema.safeParse(body);

  if (!parsedRequest.success) {
    return adminApiErrorResponse(
      "INVALID_PREPARATION_BUFFER_REQUEST",
      400,
    );
  }

  try {
    const settings = await updateAdminPreparationBufferSettings(
      parsedRequest.data,
      actor,
    );
    return adminApiSuccessResponse({ settings });
  } catch (error) {
    if (error instanceof AdminPreparationBufferError) {
      return adminApiErrorResponse(
        error.code,
        error.code === "PREPARATION_BUFFER_PROPERTY_NOT_FOUND" ? 404 : 400,
      );
    }

    return adminApiErrorResponse(
      "PREPARATION_BUFFER_UNEXPECTED_ERROR",
      500,
    );
  }
}
