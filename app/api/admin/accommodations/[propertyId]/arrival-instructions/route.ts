import { z } from "zod";

import {
  AdminArrivalInstructionsError,
  adminApiErrorResponse,
  adminApiSuccessResponse,
  getAdminSessionActor,
  updateAdminArrivalInstructions,
} from "@/lib/admin";
import { scheduleArrivalInstructionsNotifications } from "@/lib/email";
import type { AdminArrivalInstructionsErrorCode } from "@/types/admin-arrival-instructions";
import {
  ARRIVAL_INSTRUCTIONS_MAX_LEAD_TIME_HOURS,
  ARRIVAL_INSTRUCTIONS_MIN_LEAD_TIME_HOURS,
} from "@/types/admin-arrival-instructions";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const propertyIdSchema = z.string().trim().min(1).max(120);
const requestSchema = z
  .object({
    expectedUpdatedAt: z.iso.datetime().nullable(),
    enabled: z.boolean(),
    leadTimeHours: z
      .number()
      .int()
      .min(ARRIVAL_INSTRUCTIONS_MIN_LEAD_TIME_HOURS)
      .max(ARRIVAL_INSTRUCTIONS_MAX_LEAD_TIME_HOURS),
    exactAddress: z.string().max(500),
    mapUrl: z.string().max(500),
    instructionsEs: z.string().max(5_000),
    instructionsEn: z.string().max(5_000),
  })
  .strict();

type RouteContext = Readonly<{
  params: Promise<{
    propertyId: string;
  }>;
}>;

function errorStatus(code: AdminArrivalInstructionsErrorCode): number {
  switch (code) {
    case "ADMIN_UNAUTHORIZED":
      return 401;
    case "ADMIN_ARRIVAL_INSTRUCTIONS_PROPERTY_NOT_FOUND":
      return 404;
    case "ADMIN_ARRIVAL_INSTRUCTIONS_STALE":
      return 409;
    case "INVALID_ADMIN_ARRIVAL_INSTRUCTIONS_REQUEST":
      return 400;
    case "ADMIN_ARRIVAL_INSTRUCTIONS_UNEXPECTED_ERROR":
    default:
      return 500;
  }
}

async function readJson(request: Request): Promise<unknown> {
  try {
    return await request.json();
  } catch {
    throw new AdminArrivalInstructionsError(
      "INVALID_ADMIN_ARRIVAL_INSTRUCTIONS_REQUEST",
    );
  }
}

function errorResponse(error: unknown) {
  if (error instanceof AdminArrivalInstructionsError) {
    return adminApiErrorResponse(error.code, errorStatus(error.code));
  }

  return adminApiErrorResponse(
    "ADMIN_ARRIVAL_INSTRUCTIONS_UNEXPECTED_ERROR",
    500,
  );
}

export async function PATCH(request: Request, context: RouteContext) {
  const actor = await getAdminSessionActor();

  if (!actor) {
    return adminApiErrorResponse("ADMIN_UNAUTHORIZED", 401);
  }

  try {
    const { propertyId } = await context.params;
    const parsedPropertyId = propertyIdSchema.safeParse(propertyId);
    const parsedRequest = requestSchema.safeParse(await readJson(request));

    if (!parsedPropertyId.success || !parsedRequest.success) {
      return adminApiErrorResponse(
        "INVALID_ADMIN_ARRIVAL_INSTRUCTIONS_REQUEST",
        400,
      );
    }

    const settings = await updateAdminArrivalInstructions(
      {
        propertyId: parsedPropertyId.data,
        ...parsedRequest.data,
      },
      actor,
    );

    try {
      await scheduleArrivalInstructionsNotifications({
        propertyId: settings.propertyId,
      });
    } catch {
      // The accepted admin settings remain saved; the protected cron will retry scheduling.
    }

    return adminApiSuccessResponse({ settings });
  } catch (error) {
    return errorResponse(error);
  }
}
