import { z } from "zod";

import {
  AdminPricingError,
  adminApiErrorResponse,
  adminApiSuccessResponse,
  getAdminSessionActor,
  isValidAdminMutationOrigin,
  previewAdminPricing,
} from "@/lib/admin";
import type { AdminPricingErrorCode } from "@/types/admin-pricing";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const previewSchema = z
  .object({
    propertyId: z.string().trim().min(1).max(120),
    checkInDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
    checkOutDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  })
  .strict();

function errorStatus(code: AdminPricingErrorCode): number {
  switch (code) {
    case "ADMIN_UNAUTHORIZED":
      return 401;
    case "ADMIN_PRICING_ORIGIN_INVALID":
      return 403;
    case "ADMIN_PRICING_PROPERTY_NOT_FOUND":
      return 404;
    case "ADMIN_PRICING_SEASONAL_OVERLAP":
    case "ADMIN_PRICING_CONFLICT":
      return 409;
    case "INVALID_ADMIN_PRICING_REQUEST":
    case "ADMIN_PRICING_LOS_TIER_INVALID":
      return 400;
    case "ADMIN_PRICING_CONFIGURATION_INVALID":
    case "ADMIN_PRICING_RULE_NOT_FOUND":
    case "ADMIN_PRICING_RULE_STALE":
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

export async function POST(request: Request) {
  const actor = await getAdminSessionActor();

  if (!actor) {
    return adminApiErrorResponse("ADMIN_UNAUTHORIZED", 401);
  }

  if (!isValidAdminMutationOrigin(request)) {
    return adminApiErrorResponse("ADMIN_PRICING_ORIGIN_INVALID", 403);
  }

  try {
    const parsed = previewSchema.safeParse(await readJson(request));

    if (!parsed.success) {
      return adminApiErrorResponse("INVALID_ADMIN_PRICING_REQUEST", 400);
    }

    const preview = await previewAdminPricing(parsed.data);

    return adminApiSuccessResponse({ preview });
  } catch (error) {
    if (error instanceof AdminPricingError) {
      return adminApiErrorResponse(error.code, errorStatus(error.code));
    }

    return adminApiErrorResponse("ADMIN_PRICING_UNEXPECTED_ERROR", 500);
  }
}
