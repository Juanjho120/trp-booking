import { NextResponse } from "next/server";
import { z } from "zod";

import {
  adminAccommodationIds,
  adminApiErrorResponse,
  copyAdminAirbnbExportUrl,
  getAdminSessionActor,
  isValidAdminMutationOrigin,
} from "@/lib/admin";
import { adminExternalCalendarOutboundErrorResponse } from "@/lib/admin/external-calendar-outbound-api";

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

    const url = await copyAdminAirbnbExportUrl(
      {
        propertyId: parsedPropertyId.data,
        requestOrigin: request.headers.get("origin"),
      },
      actor,
    );

    return NextResponse.json(
      { url },
      {
        status: 200,
        headers: {
          "cache-control": "private, no-store, max-age=0",
        },
      },
    );
  } catch (error) {
    return adminExternalCalendarOutboundErrorResponse(error);
  }
}
