import { z } from "zod";

import {
  adminApiErrorResponse,
  adminApiSuccessResponse,
  AdminPreparationBufferError,
  getAdminSessionActor,
  restoreAdminPreparationBufferDay,
  unlockAdminPreparationBufferDay,
} from "@/lib/admin";
import { isDateOnlyString } from "@/lib/availability/rules";
import type { DateOnlyString } from "@/types/availability";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const unlockPreparationBufferSchema = z
  .object({
    reservationId: z.string().trim().min(1).max(120).optional().nullable(),
    calendarBlockId: z.string().trim().min(1).max(120).optional().nullable(),
    date: z.string().trim().refine(isDateOnlyString),
    reason: z.string().trim().max(500).optional().nullable(),
  })
  .refine(
    (value) => Boolean(value.reservationId) !== Boolean(value.calendarBlockId),
  );

const restorePreparationBufferSchema = z.object({
  overrideId: z.string().trim().min(1).max(120),
});

function preparationBufferErrorStatus(error: AdminPreparationBufferError): number {
  if (
    error.code === "PREPARATION_BUFFER_RESERVATION_NOT_FOUND" ||
    error.code === "PREPARATION_BUFFER_OVERRIDE_NOT_FOUND"
  ) {
    return 404;
  }

  if (
    error.code === "PREPARATION_BUFFER_RESERVATION_NOT_CONFIRMED" ||
    error.code === "PREPARATION_BUFFER_DATE_NOT_UNLOCKABLE" ||
    error.code === "PREPARATION_BUFFER_DATE_IN_PAST"
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
    return adminApiErrorResponse(
      "INVALID_PREPARATION_BUFFER_REQUEST",
      400,
    );
  }

  const parsedRequest = unlockPreparationBufferSchema.safeParse(body);

  if (!parsedRequest.success) {
    return adminApiErrorResponse(
      "INVALID_PREPARATION_BUFFER_REQUEST",
      400,
    );
  }

  try {
    const result = await unlockAdminPreparationBufferDay(
      {
        reservationId: parsedRequest.data.reservationId,
        calendarBlockId: parsedRequest.data.calendarBlockId,
        date: parsedRequest.data.date as DateOnlyString,
        reason: parsedRequest.data.reason,
      },
      actor,
    );
    return adminApiSuccessResponse({ result });
  } catch (error) {
    if (error instanceof AdminPreparationBufferError) {
      return adminApiErrorResponse(
        error.code,
        preparationBufferErrorStatus(error),
      );
    }

    return adminApiErrorResponse(
      "PREPARATION_BUFFER_UNEXPECTED_ERROR",
      500,
    );
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
    return adminApiErrorResponse(
      "INVALID_PREPARATION_BUFFER_REQUEST",
      400,
    );
  }

  const parsedRequest = restorePreparationBufferSchema.safeParse(body);

  if (!parsedRequest.success) {
    return adminApiErrorResponse(
      "INVALID_PREPARATION_BUFFER_REQUEST",
      400,
    );
  }

  try {
    const result = await restoreAdminPreparationBufferDay(
      parsedRequest.data,
      actor,
    );
    return adminApiSuccessResponse({ result });
  } catch (error) {
    if (error instanceof AdminPreparationBufferError) {
      return adminApiErrorResponse(
        error.code,
        preparationBufferErrorStatus(error),
      );
    }

    return adminApiErrorResponse(
      "PREPARATION_BUFFER_UNEXPECTED_ERROR",
      500,
    );
  }
}
