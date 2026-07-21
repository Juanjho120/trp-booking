import { z } from "zod";

import {
  AdminAmenityHouseRuleError,
  adminApiErrorResponse,
  adminApiSuccessResponse,
  getAdminSessionActor,
  updateAdminAmenityHouseRuleAssignments,
} from "@/lib/admin";
import type { AdminAmenityHouseRuleErrorCode } from "@/types/admin-amenities-house-rules";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const catalogIdSchema = z.string().trim().min(1).max(120);
const uniqueCatalogIdsSchema = z
  .array(catalogIdSchema)
  .min(1)
  .max(100)
  .refine((ids: readonly string[]) => new Set(ids).size === ids.length);

const updateAssignmentsSchema = z
  .object({
    action: z.literal("update-assignments"),
    propertyId: z.string().trim().min(1).max(120),
    expectedRevision: z.string().regex(/^[a-f0-9]{64}$/),
    amenityIds: uniqueCatalogIdsSchema,
    houseRuleIds: uniqueCatalogIdsSchema,
  })
  .strict();

function errorStatus(code: AdminAmenityHouseRuleErrorCode): number {
  switch (code) {
    case "ADMIN_UNAUTHORIZED":
      return 401;
    case "AMENITY_HOUSE_RULE_PROPERTY_NOT_FOUND":
      return 404;
    case "AMENITY_HOUSE_RULE_STALE":
    case "AMENITY_HOUSE_RULE_MINIMUM_REQUIRED":
      return 409;
    case "INVALID_AMENITY_HOUSE_RULE_REQUEST":
      return 400;
    case "AMENITY_NOT_FOUND":
    case "HOUSE_RULE_NOT_FOUND":
      return 404;
    case "AMENITY_HOUSE_RULE_UNEXPECTED_ERROR":
    default:
      return 500;
  }
}

async function readJson(request: Request): Promise<unknown> {
  try {
    return await request.json();
  } catch {
    throw new AdminAmenityHouseRuleError(
      "INVALID_AMENITY_HOUSE_RULE_REQUEST",
    );
  }
}

export async function PATCH(request: Request) {
  const actor = await getAdminSessionActor();

  if (!actor) {
    return adminApiErrorResponse("ADMIN_UNAUTHORIZED", 401);
  }

  try {
    const parsedRequest = updateAssignmentsSchema.safeParse(
      await readJson(request),
    );

    if (!parsedRequest.success) {
      return adminApiErrorResponse(
        "INVALID_AMENITY_HOUSE_RULE_REQUEST",
        400,
      );
    }

    const settings = await updateAdminAmenityHouseRuleAssignments(
      parsedRequest.data,
      actor,
    );

    return adminApiSuccessResponse({ settings });
  } catch (error) {
    if (error instanceof AdminAmenityHouseRuleError) {
      return adminApiErrorResponse(error.code, errorStatus(error.code));
    }

    return adminApiErrorResponse(
      "AMENITY_HOUSE_RULE_UNEXPECTED_ERROR",
      500,
    );
  }
}
