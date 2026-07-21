import { z } from "zod";

import { isPropertyTimeValue } from "@/lib/time/property-time";

import {
  adminApiErrorResponse,
  adminApiSuccessResponse,
  AdminAccommodationContentError,
  getAdminSessionActor,
  updateAdminAccommodationContent,
} from "@/lib/admin";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const updateAccommodationContentSchema = z
  .object({
    propertyId: z.string().trim().min(1).max(120),
    expectedUpdatedAt: z.string().datetime(),
    nameEs: z.string().trim().min(2).max(120),
    nameEn: z.string().trim().min(2).max(120),
    shortDescriptionEs: z.string().trim().min(20).max(500),
    shortDescriptionEn: z.string().trim().min(20).max(500),
    longDescriptionEs: z.string().trim().min(50).max(5000),
    longDescriptionEn: z.string().trim().min(50).max(5000),
    maxGuests: z.number().int().min(1).max(20),
    bedrooms: z.number().int().min(1).max(20),
    bathrooms: z.number().int().min(1).max(20),
    checkInTime: z.string().trim().refine(isPropertyTimeValue),
    checkOutTime: z
      .string()
      .trim()
      .refine(isPropertyTimeValue)
      .nullable()
      .optional(),
  })
  .strict();

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
      "INVALID_ACCOMMODATION_CONTENT_REQUEST",
      400,
    );
  }

  const parsedRequest = updateAccommodationContentSchema.safeParse(body);

  if (!parsedRequest.success) {
    return adminApiErrorResponse(
      "INVALID_ACCOMMODATION_CONTENT_REQUEST",
      400,
    );
  }

  try {
    const property = await updateAdminAccommodationContent(
      parsedRequest.data,
      actor,
    );
    return adminApiSuccessResponse({ property });
  } catch (error) {
    if (error instanceof AdminAccommodationContentError) {
      const status =
        error.code === "ACCOMMODATION_CONTENT_PROPERTY_NOT_FOUND"
          ? 404
          : error.code === "ACCOMMODATION_CONTENT_STALE"
            ? 409
            : 400;

      return adminApiErrorResponse(error.code, status);
    }

    return adminApiErrorResponse(
      "ACCOMMODATION_CONTENT_UNEXPECTED_ERROR",
      500,
    );
  }
}
