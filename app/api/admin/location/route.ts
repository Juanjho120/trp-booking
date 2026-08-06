import { z } from "zod";

import {
  AdminPublicLocationError,
  adminApiErrorResponse,
  adminApiSuccessResponse,
  getAdminPublicLocationPage,
  getAdminSessionActor,
  updateAdminPublicLocation,
} from "@/lib/admin";
import { PUBLIC_LOCATION_MAP_URL_MAX_LENGTH } from "@/lib/public-location-map";
import type { AdminPublicLocationErrorCode } from "@/types/admin-public-location";
import { PUBLIC_LOCATION_TEXT_MAX_LENGTH } from "@/types/admin-public-location";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const requestSchema = z
  .object({
    expectedUpdatedAt: z.iso.datetime().nullable(),
    enabled: z.boolean(),
    publicLocationEs: z.string().max(PUBLIC_LOCATION_TEXT_MAX_LENGTH),
    publicLocationEn: z.string().max(PUBLIC_LOCATION_TEXT_MAX_LENGTH),
    mapEmbedUrl: z.string().max(PUBLIC_LOCATION_MAP_URL_MAX_LENGTH),
  })
  .strict();

function errorStatus(code: AdminPublicLocationErrorCode): number {
  switch (code) {
    case "ADMIN_UNAUTHORIZED":
      return 401;
    case "ADMIN_PUBLIC_LOCATION_STALE":
      return 409;
    case "INVALID_ADMIN_PUBLIC_LOCATION_REQUEST":
    case "ADMIN_PUBLIC_LOCATION_MAP_URL_NOT_ALLOWED":
      return 400;
    case "ADMIN_PUBLIC_LOCATION_UNEXPECTED_ERROR":
    default:
      return 500;
  }
}

async function readJson(request: Request): Promise<unknown> {
  try {
    return await request.json();
  } catch {
    throw new AdminPublicLocationError(
      "INVALID_ADMIN_PUBLIC_LOCATION_REQUEST",
    );
  }
}

function errorResponse(error: unknown) {
  if (error instanceof AdminPublicLocationError) {
    return adminApiErrorResponse(error.code, errorStatus(error.code));
  }

  return adminApiErrorResponse(
    "ADMIN_PUBLIC_LOCATION_UNEXPECTED_ERROR",
    500,
  );
}

export async function PATCH(request: Request) {
  const actor = await getAdminSessionActor();

  if (!actor) {
    return adminApiErrorResponse("ADMIN_UNAUTHORIZED", 401);
  }

  try {
    const parsedRequest = requestSchema.safeParse(await readJson(request));

    if (!parsedRequest.success) {
      return adminApiErrorResponse(
        "INVALID_ADMIN_PUBLIC_LOCATION_REQUEST",
        400,
      );
    }

    await updateAdminPublicLocation(parsedRequest.data, actor);
    const pageData = await getAdminPublicLocationPage();

    return adminApiSuccessResponse({ pageData });
  } catch (error) {
    return errorResponse(error);
  }
}
