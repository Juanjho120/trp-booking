import { z } from "zod";

import {
  adminAccommodationIds,
  adminApiErrorResponse,
  adminApiSuccessResponse,
  getAdminExternalCalendarIntegrationsPage,
  getAdminSessionActor,
  isValidAdminMutationOrigin,
  syncAdminAirbnbImportNow,
} from "@/lib/admin";
import { adminExternalCalendarErrorResponse } from "@/lib/admin/external-calendar-api";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const propertyIdSchema = z.enum(adminAccommodationIds);

type RouteContext = Readonly<{
  params: Promise<{ propertyId: string }>;
}>;

export async function POST(request: Request, context: RouteContext) {
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
    if (!parsedPropertyId.success) {
      return adminApiErrorResponse(
        "INVALID_ADMIN_EXTERNAL_CALENDAR_REQUEST",
        400,
      );
    }

    await syncAdminAirbnbImportNow(parsedPropertyId.data, actor);
    const pageData = await getAdminExternalCalendarIntegrationsPage();
    return adminApiSuccessResponse({ pageData });
  } catch (error) {
    return adminExternalCalendarErrorResponse(error);
  }
}
