import { z } from "zod";

import {
  adminAccommodationIds,
  adminApiErrorResponse,
  adminApiSuccessResponse,
  getAdminExternalCalendarIntegrationsPage,
  getAdminSessionActor,
  isValidAdminMutationOrigin,
  saveAdminAirbnbImportUrl,
} from "@/lib/admin";
import { adminExternalCalendarErrorResponse } from "@/lib/admin/external-calendar-api";
import { AIRBNB_ICAL_URL_MAX_LENGTH } from "@/lib/airbnb-ical/provider-security";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const propertyIdSchema = z.enum(adminAccommodationIds);
const requestSchema = z
  .object({
    importUrl: z.string().trim().min(1).max(AIRBNB_ICAL_URL_MAX_LENGTH),
    expectedUpdatedAt: z.iso.datetime().nullable(),
  })
  .strict();

type RouteContext = Readonly<{
  params: Promise<{ propertyId: string }>;
}>;

async function readJson(request: Request): Promise<unknown> {
  try {
    return await request.json();
  } catch {
    return null;
  }
}

export async function PATCH(request: Request, context: RouteContext) {
  const actor = await getAdminSessionActor();
  if (!actor) {
    return adminApiErrorResponse("ADMIN_UNAUTHORIZED", 401);
  }
  if (!isValidAdminMutationOrigin(request)) {
    return adminApiErrorResponse("ADMIN_EXTERNAL_CALENDAR_ORIGIN_INVALID", 403);
  }

  try {
    const { propertyId } = await context.params;
    const parsedPropertyId = propertyIdSchema.safeParse(propertyId);
    const parsedRequest = requestSchema.safeParse(await readJson(request));

    if (!parsedPropertyId.success || !parsedRequest.success) {
      return adminApiErrorResponse(
        "INVALID_ADMIN_EXTERNAL_CALENDAR_REQUEST",
        400,
      );
    }

    await saveAdminAirbnbImportUrl(
      {
        propertyId: parsedPropertyId.data,
        ...parsedRequest.data,
      },
      actor,
    );
    const pageData = await getAdminExternalCalendarIntegrationsPage();
    return adminApiSuccessResponse({ pageData });
  } catch (error) {
    return adminExternalCalendarErrorResponse(error);
  }
}
