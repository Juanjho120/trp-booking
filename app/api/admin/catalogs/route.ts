import { z } from "zod";

import {
  AdminCatalogError,
  adminApiErrorResponse,
  adminApiSuccessResponse,
  getAdminSessionActor,
  updateAdminCatalogAmenity,
  updateAdminCatalogHouseRule,
} from "@/lib/admin";
import type { AdminCatalogErrorCode } from "@/types/admin-catalogs";
import { amenityIconNames } from "@/types/amenity";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const catalogIdSchema = z.string().trim().min(1).max(120);
const timestampSchema = z.string().datetime();
const singleLineSchema = z.string().trim().min(2).max(160);
const descriptionSchema = z.string().trim().min(3).max(500);

const updateAmenitySchema = z
  .object({
    action: z.literal("update-amenity"),
    amenityId: catalogIdSchema,
    expectedUpdatedAt: timestampSchema,
    nameEs: singleLineSchema,
    nameEn: singleLineSchema,
    icon: z.enum(amenityIconNames),
  })
  .strict();

const updateHouseRuleSchema = z
  .object({
    action: z.literal("update-house-rule"),
    houseRuleId: catalogIdSchema,
    expectedUpdatedAt: timestampSchema,
    titleEs: singleLineSchema,
    titleEn: singleLineSchema,
    descriptionEs: descriptionSchema,
    descriptionEn: descriptionSchema,
  })
  .strict();

const patchSchema = z.discriminatedUnion("action", [
  updateAmenitySchema,
  updateHouseRuleSchema,
]);

function errorStatus(code: AdminCatalogErrorCode): number {
  switch (code) {
    case "ADMIN_UNAUTHORIZED":
      return 401;
    case "ADMIN_CATALOG_AMENITY_NOT_FOUND":
    case "ADMIN_CATALOG_HOUSE_RULE_NOT_FOUND":
      return 404;
    case "ADMIN_CATALOG_STALE":
      return 409;
    case "INVALID_ADMIN_CATALOG_REQUEST":
      return 400;
    case "ADMIN_CATALOG_UNEXPECTED_ERROR":
    default:
      return 500;
  }
}

async function readJson(request: Request): Promise<unknown> {
  try {
    return await request.json();
  } catch {
    throw new AdminCatalogError("INVALID_ADMIN_CATALOG_REQUEST");
  }
}

export async function PATCH(request: Request) {
  const actor = await getAdminSessionActor();

  if (!actor) {
    return adminApiErrorResponse("ADMIN_UNAUTHORIZED", 401);
  }

  try {
    const parsedRequest = patchSchema.safeParse(await readJson(request));

    if (!parsedRequest.success) {
      return adminApiErrorResponse("INVALID_ADMIN_CATALOG_REQUEST", 400);
    }

    const settings =
      parsedRequest.data.action === "update-amenity"
        ? await updateAdminCatalogAmenity(parsedRequest.data, actor)
        : await updateAdminCatalogHouseRule(parsedRequest.data, actor);

    return adminApiSuccessResponse({ settings });
  } catch (error) {
    if (error instanceof AdminCatalogError) {
      return adminApiErrorResponse(error.code, errorStatus(error.code));
    }

    return adminApiErrorResponse("ADMIN_CATALOG_UNEXPECTED_ERROR", 500);
  }
}
