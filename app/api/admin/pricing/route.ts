import { z } from "zod";

import {
  AdminPricingError,
  adminApiErrorResponse,
  adminApiSuccessResponse,
  createAdminSeasonalPricingRule,
  getAdminSessionActor,
  isValidAdminMutationOrigin,
  restoreAdminSeasonalPricingRule,
  saveAdminLengthOfStayPricingRule,
  setAdminLengthOfStayPricingRuleEnabled,
  setAdminSeasonalPricingRuleEnabled,
  softDeleteAdminSeasonalPricingRule,
  updateAdminSeasonalPricingRule,
} from "@/lib/admin";
import type {
  AdminPricingErrorCode,
  AdminPricingSettings,
} from "@/types/admin-pricing";
import { SUPPORTED_LENGTH_OF_STAY_MINIMUM_NIGHTS } from "@/types/pricing";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const propertyIdSchema = z.string().trim().min(1).max(120);
const ruleIdSchema = z.string().trim().min(1).max(160);
const expectedUpdatedAtSchema = z.iso.datetime();
const dateOnlySchema = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);
const nightlyRateSchema = z
  .string()
  .trim()
  .regex(/^\d{1,8}(?:\.\d{1,2})?$/);
const supportedMinimumNights = new Set<number>(
  SUPPORTED_LENGTH_OF_STAY_MINIMUM_NIGHTS,
);
const minimumNightsSchema = z
  .number()
  .int()
  .refine((value) => supportedMinimumNights.has(value));

const createSeasonalSchema = z
  .object({
    action: z.literal("create-seasonal"),
    propertyId: propertyIdSchema,
    name: z.string().trim().min(2).max(160),
    startDate: dateOnlySchema,
    endDate: dateOnlySchema,
    nightlyRate: nightlyRateSchema,
  })
  .strict();

const saveLosSchema = z
  .object({
    action: z.literal("save-los"),
    propertyId: propertyIdSchema,
    minimumNights: minimumNightsSchema,
    expectedUpdatedAt: expectedUpdatedAtSchema.nullable(),
    nightlyRate: nightlyRateSchema,
  })
  .strict();

const updateSeasonalSchema = z
  .object({
    action: z.literal("update-seasonal"),
    propertyId: propertyIdSchema,
    ruleId: ruleIdSchema,
    expectedUpdatedAt: expectedUpdatedAtSchema,
    name: z.string().trim().min(2).max(160),
    startDate: dateOnlySchema,
    endDate: dateOnlySchema,
    nightlyRate: nightlyRateSchema,
  })
  .strict();

const setSeasonalEnabledSchema = z
  .object({
    action: z.literal("set-seasonal-enabled"),
    propertyId: propertyIdSchema,
    ruleId: ruleIdSchema,
    expectedUpdatedAt: expectedUpdatedAtSchema,
    enabled: z.boolean(),
  })
  .strict();

const restoreSeasonalSchema = z
  .object({
    action: z.literal("restore-seasonal"),
    propertyId: propertyIdSchema,
    ruleId: ruleIdSchema,
    expectedUpdatedAt: expectedUpdatedAtSchema,
  })
  .strict();

const setLosEnabledSchema = z
  .object({
    action: z.literal("set-los-enabled"),
    propertyId: propertyIdSchema,
    minimumNights: minimumNightsSchema,
    expectedUpdatedAt: expectedUpdatedAtSchema,
    enabled: z.boolean(),
  })
  .strict();

const deleteSeasonalSchema = z
  .object({
    action: z.literal("delete-seasonal"),
    propertyId: propertyIdSchema,
    ruleId: ruleIdSchema,
    expectedUpdatedAt: expectedUpdatedAtSchema,
  })
  .strict();

const postSchema = z.discriminatedUnion("action", [
  createSeasonalSchema,
  saveLosSchema,
]);
const patchSchema = z.discriminatedUnion("action", [
  updateSeasonalSchema,
  setSeasonalEnabledSchema,
  restoreSeasonalSchema,
  setLosEnabledSchema,
]);

function errorStatus(code: AdminPricingErrorCode): number {
  switch (code) {
    case "ADMIN_UNAUTHORIZED":
      return 401;
    case "ADMIN_PRICING_ORIGIN_INVALID":
      return 403;
    case "ADMIN_PRICING_PROPERTY_NOT_FOUND":
    case "ADMIN_PRICING_RULE_NOT_FOUND":
      return 404;
    case "ADMIN_PRICING_RULE_STALE":
    case "ADMIN_PRICING_SEASONAL_OVERLAP":
    case "ADMIN_PRICING_CONFLICT":
      return 409;
    case "INVALID_ADMIN_PRICING_REQUEST":
    case "ADMIN_PRICING_LOS_TIER_INVALID":
      return 400;
    case "ADMIN_PRICING_CONFIGURATION_INVALID":
    case "ADMIN_PRICING_UNEXPECTED_ERROR":
    default:
      return 500;
  }
}

async function readJson(request: Request): Promise<unknown> {
  try {
    return await request.json();
  } catch {
    throw new AdminPricingError("INVALID_ADMIN_PRICING_REQUEST");
  }
}

async function authorizeMutation(request: Request) {
  const actor = await getAdminSessionActor();

  if (!actor) {
    throw new AdminPricingError("ADMIN_UNAUTHORIZED");
  }

  if (!isValidAdminMutationOrigin(request)) {
    throw new AdminPricingError("ADMIN_PRICING_ORIGIN_INVALID");
  }

  return actor;
}

function errorResponse(error: unknown) {
  if (error instanceof AdminPricingError) {
    return adminApiErrorResponse(error.code, errorStatus(error.code));
  }

  return adminApiErrorResponse("ADMIN_PRICING_UNEXPECTED_ERROR", 500);
}

export async function POST(request: Request) {
  try {
    const actor = await authorizeMutation(request);
    const parsed = postSchema.safeParse(await readJson(request));

    if (!parsed.success) {
      return adminApiErrorResponse("INVALID_ADMIN_PRICING_REQUEST", 400);
    }

    const settings =
      parsed.data.action === "create-seasonal"
        ? await createAdminSeasonalPricingRule(parsed.data, actor)
        : await saveAdminLengthOfStayPricingRule(parsed.data, actor);

    return adminApiSuccessResponse({ settings });
  } catch (error) {
    return errorResponse(error);
  }
}

export async function PATCH(request: Request) {
  try {
    const actor = await authorizeMutation(request);
    const parsed = patchSchema.safeParse(await readJson(request));

    if (!parsed.success) {
      return adminApiErrorResponse("INVALID_ADMIN_PRICING_REQUEST", 400);
    }

    let settings: AdminPricingSettings;

    switch (parsed.data.action) {
      case "update-seasonal":
        settings = await updateAdminSeasonalPricingRule(parsed.data, actor);
        break;
      case "set-seasonal-enabled":
        settings = await setAdminSeasonalPricingRuleEnabled(parsed.data, actor);
        break;
      case "restore-seasonal":
        settings = await restoreAdminSeasonalPricingRule(parsed.data, actor);
        break;
      case "set-los-enabled":
        settings = await setAdminLengthOfStayPricingRuleEnabled(
          parsed.data,
          actor,
        );
        break;
      default:
        throw new AdminPricingError("INVALID_ADMIN_PRICING_REQUEST");
    }

    return adminApiSuccessResponse({ settings });
  } catch (error) {
    return errorResponse(error);
  }
}

export async function DELETE(request: Request) {
  try {
    const actor = await authorizeMutation(request);
    const parsed = deleteSeasonalSchema.safeParse(await readJson(request));

    if (!parsed.success) {
      return adminApiErrorResponse("INVALID_ADMIN_PRICING_REQUEST", 400);
    }

    const settings = await softDeleteAdminSeasonalPricingRule(
      parsed.data,
      actor,
    );

    return adminApiSuccessResponse({ settings });
  } catch (error) {
    return errorResponse(error);
  }
}
