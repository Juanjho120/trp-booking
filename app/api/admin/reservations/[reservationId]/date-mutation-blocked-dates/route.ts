import { z } from "zod";

import {
  AdminReservationDateMutationError,
  adminApiErrorResponse,
  adminApiSuccessResponse,
  getAdminDateMutationBlockedDates,
  getAdminSessionActor,
} from "@/lib/admin";
import type { AdminDateMutationErrorCode } from "@/types/admin-reservation-date-mutation";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const idSchema = z.string().trim().min(1).max(120);
const querySchema = z
  .object({
    startDate: z.iso.date(),
    endDate: z.iso.date(),
  })
  .strict();

type RouteContext = Readonly<{
  params: Promise<{
    reservationId: string;
  }>;
}>;

function errorStatus(code: AdminDateMutationErrorCode): number {
  switch (code) {
    case "ADMIN_UNAUTHORIZED":
      return 401;
    case "ADMIN_DATE_MUTATION_RESERVATION_NOT_FOUND":
      return 404;
    case "INVALID_ADMIN_DATE_MUTATION_REQUEST":
    case "ADMIN_DATE_MUTATION_RESERVATION_NOT_CONFIRMED":
    case "ADMIN_DATE_MUTATION_PROPERTY_NOT_ELIGIBLE":
      return 400;
    case "ADMIN_DATE_MUTATION_UNEXPECTED_ERROR":
    default:
      return 500;
  }
}

function errorResponse(error: unknown) {
  if (error instanceof AdminReservationDateMutationError) {
    return adminApiErrorResponse(error.code, errorStatus(error.code));
  }

  return adminApiErrorResponse(
    "ADMIN_DATE_MUTATION_UNEXPECTED_ERROR",
    500,
  );
}

export async function GET(request: Request, context: RouteContext) {
  const actor = await getAdminSessionActor();

  if (!actor) {
    return adminApiErrorResponse("ADMIN_UNAUTHORIZED", 401);
  }

  try {
    const { reservationId } = await context.params;
    const url = new URL(request.url);
    const parsedReservationId = idSchema.safeParse(reservationId);
    const parsedQuery = querySchema.safeParse({
      startDate: url.searchParams.get("startDate"),
      endDate: url.searchParams.get("endDate"),
    });

    if (!parsedReservationId.success || !parsedQuery.success) {
      return adminApiErrorResponse(
        "INVALID_ADMIN_DATE_MUTATION_REQUEST",
        400,
      );
    }

    const blockedDates = await getAdminDateMutationBlockedDates({
      reservationId: parsedReservationId.data,
      ...parsedQuery.data,
    });

    return adminApiSuccessResponse({ blockedDates });
  } catch (error) {
    return errorResponse(error);
  }
}
