import { z } from "zod";

import {
  adminApiErrorResponse,
  adminApiSuccessResponse,
  AdminCalendarError,
  createAdminManualCalendarBlock,
  getAdminSessionActor,
  releaseAdminManualCalendarBlockDay,
} from "@/lib/admin";
import { isDateOnlyString } from "@/lib/availability/rules";
import type { DateOnlyString } from "@/types/availability";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const createManualBlockSchema = z.object({
  propertyId: z.string().trim().min(1).max(120),
  startDate: z.string().trim().refine(isDateOnlyString),
  endDate: z.string().trim().refine(isDateOnlyString),
  note: z.string().trim().max(500).optional().nullable(),
});

const releaseManualBlockDaySchema = z.object({
  calendarBlockId: z.string().trim().min(1).max(120),
  date: z.string().trim().refine(isDateOnlyString),
});

function calendarErrorStatus(error: AdminCalendarError): number {
  if (
    error.code === "ADMIN_CALENDAR_PROPERTY_NOT_FOUND" ||
    error.code === "ADMIN_CALENDAR_MANUAL_BLOCK_NOT_FOUND"
  ) {
    return 404;
  }

  if (
    error.code === "ADMIN_CALENDAR_DATE_IN_PAST" ||
    error.code === "ADMIN_CALENDAR_DAY_NOT_IN_BLOCK"
  ) {
    return 409;
  }

  return 400;
}

export async function POST(request: Request) {
  const actor = await getAdminSessionActor();

  if (!actor) {
    return adminApiErrorResponse("ADMIN_UNAUTHORIZED", 401);
  }

  let body: unknown;

  try {
    body = await request.json();
  } catch {
    return adminApiErrorResponse("INVALID_ADMIN_CALENDAR_REQUEST", 400);
  }

  const parsedRequest = createManualBlockSchema.safeParse(body);

  if (!parsedRequest.success) {
    return adminApiErrorResponse("INVALID_ADMIN_CALENDAR_REQUEST", 400);
  }

  try {
    const result = await createAdminManualCalendarBlock(
      {
        propertyId: parsedRequest.data.propertyId,
        startDate: parsedRequest.data.startDate as DateOnlyString,
        endDate: parsedRequest.data.endDate as DateOnlyString,
        note: parsedRequest.data.note,
      },
      actor,
    );
    return adminApiSuccessResponse({ result });
  } catch (error) {
    if (error instanceof AdminCalendarError) {
      return adminApiErrorResponse(error.code, calendarErrorStatus(error));
    }

    return adminApiErrorResponse("ADMIN_CALENDAR_UNEXPECTED_ERROR", 500);
  }
}

export async function DELETE(request: Request) {
  const actor = await getAdminSessionActor();

  if (!actor) {
    return adminApiErrorResponse("ADMIN_UNAUTHORIZED", 401);
  }

  let body: unknown;

  try {
    body = await request.json();
  } catch {
    return adminApiErrorResponse("INVALID_ADMIN_CALENDAR_REQUEST", 400);
  }

  const parsedRequest = releaseManualBlockDaySchema.safeParse(body);

  if (!parsedRequest.success) {
    return adminApiErrorResponse("INVALID_ADMIN_CALENDAR_REQUEST", 400);
  }

  try {
    const result = await releaseAdminManualCalendarBlockDay(
      {
        calendarBlockId: parsedRequest.data.calendarBlockId,
        date: parsedRequest.data.date as DateOnlyString,
      },
      actor,
    );
    return adminApiSuccessResponse({ result });
  } catch (error) {
    if (error instanceof AdminCalendarError) {
      return adminApiErrorResponse(error.code, calendarErrorStatus(error));
    }

    return adminApiErrorResponse("ADMIN_CALENDAR_UNEXPECTED_ERROR", 500);
  }
}
