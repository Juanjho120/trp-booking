import { z } from "zod";

import {
  AdminAmenityHouseRuleError,
  adminApiErrorResponse,
  adminApiSuccessResponse,
  getAdminSessionActor,
  updateAdminAmenityContent,
  updateAdminAmenityHouseRuleAssignments,
  updateAdminHouseRuleContent,
} from "@/lib/admin";
import type { AdminAmenityHouseRuleErrorCode } from "@/types/admin-amenities-house-rules";
import { amenityIconNames } from "@/types/amenity";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const propertyIdSchema = z.string().trim().min(1).max(120);
const catalogIdSchema = z.string().trim().min(1).max(120);
const timestampSchema = z.string().datetime();
const revisionSchema = z.string().regex(/^[a-f0-9]{64}$/);
const singleLineSchema = z.string().trim().min(2).max(160);
const descriptionSchema = z.string().trim().min(3).max(500);
const uniqueCatalogIdsSchema = z
  .array(catalogIdSchema)
  .min(1)
  .max(100)
  .refine((ids: readonly string[]) => new Set(ids).size === ids.length);

const updateAmenitySchema = z
  .object({
    action: z.literal("update-amenity"),
    propertyId: propertyIdSchema,
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
    propertyId: propertyIdSchema,
    houseRuleId: catalogIdSchema,
    expectedUpdatedAt: timestampSchema,
    titleEs: singleLineSchema,
    titleEn: singleLineSchema,
    descriptionEs: descriptionSchema,
    descriptionEn: descriptionSchema,
  })
  .strict();

const updateAssignmentsSchema = z
  .object({
    action: z.literal("update-assignments"),
    propertyId: propertyIdSchema,
    expectedRevision: revisionSchema,
    amenityIds: uniqueCatalogIdsSchema,
    houseRuleIds: uniqueCatalogIdsSchema,
  })
  .strict();

const patchSchema = z.discriminatedUnion("action", [
  updateAmenitySchema,
  updateHouseRuleSchema,
  updateAssignmentsSchema,
]);

function errorStatus(code: AdminAmenityHouseRuleErrorCode): number {
  switch (code) {
    case "ADMIN_UNAUTHORIZED":
      return 401;
    case "AMENITY_HOUSE_RULE_PROPERTY_NOT_FOUND":
    case "AMENITY_NOT_FOUND":
    case "HOUSE_RULE_NOT_FOUND":
      return 404;
    case "AMENITY_HOUSE_RULE_STALE":
    case "AMENITY_HOUSE_RULE_MINIMUM_REQUIRED":
      return 409;
    case "INVALID_AMENITY_HOUSE_RULE_REQUEST":
      return 400;
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

function errorResponse(error: unknown) {
  if (error instanceof AdminAmenityHouseRuleError) {
    return adminApiErrorResponse(error.code, errorStatus(error.code));
  }

  return adminApiErrorResponse(
    "AMENITY_HOUSE_RULE_UNEXPECTED_ERROR",
    500,
  );
}

export async function PATCH(request: Request) {
  const actor = await getAdminSessionActor();

  if (!actor) {
    return adminApiErrorResponse("ADMIN_UNAUTHORIZED", 401);
  }

  try {
    const parsedRequest = patchSchema.safeParse(await readJson(request));

    if (!parsedRequest.success) {
      return adminApiErrorResponse(
        "INVALID_AMENITY_HOUSE_RULE_REQUEST",
        400,
      );
    }

    const settings =
      parsedRequest.data.action === "update-amenity"
        ? await updateAdminAmenityContent(parsedRequest.data, actor)
        : parsedRequest.data.action === "update-house-rule"
          ? await updateAdminHouseRuleContent(parsedRequest.data, actor)
          : await updateAdminAmenityHouseRuleAssignments(
              parsedRequest.data,
              actor,
            );

    return adminApiSuccessResponse({ settings });
  } catch (error) {
    return errorResponse(error);
  }
}
