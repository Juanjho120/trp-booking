import { z } from "zod";

import {
  AdminReservationCancellationError,
  adminApiErrorResponse,
  adminApiSuccessResponse,
  createAdminCancellationRequest,
  getAdminSessionActor,
} from "@/lib/admin";
import type { AdminReservationCancellationErrorCode } from "@/types/admin-reservation-cancellation";
import { adminCancellationChannels } from "@/types/admin-reservation-cancellation";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const idSchema = z.string().trim().min(1).max(120);
const requestSchema = z
  .object({
    channel: z.enum(adminCancellationChannels),
    requesterName: z.string().trim().min(1).max(160),
    requesterEmail: z.string().trim().email().max(254).nullable(),
    requesterPhone: z.string().trim().max(40).nullable(),
    requestNote: z.string().trim().min(1).max(2_000),
    expectedReservationUpdatedAt: z.iso.datetime(),
    requestId: z.uuid(),
  })
  .strict();

type RouteContext = Readonly<{
  params: Promise<{
    reservationId: string;
  }>;
}>;

function errorStatus(code: AdminReservationCancellationErrorCode): number {
  switch (code) {
    case "ADMIN_UNAUTHORIZED":
      return 401;
    case "ADMIN_CANCELLATION_RESERVATION_NOT_FOUND":
      return 404;
    case "ADMIN_CANCELLATION_REQUEST_ALREADY_ACTIVE":
    case "ADMIN_CANCELLATION_STALE":
      return 409;
    case "INVALID_ADMIN_CANCELLATION_REQUEST":
    case "ADMIN_CANCELLATION_RESERVATION_NOT_CONFIRMED":
    case "ADMIN_CANCELLATION_SOURCE_PAYMENT_NOT_FOUND":
      return 400;
    case "ADMIN_CANCELLATION_REQUEST_NOT_FOUND":
    case "ADMIN_CANCELLATION_REQUEST_NOT_PENDING":
    case "ADMIN_CANCELLATION_UNEXPECTED_ERROR":
    default:
      return 500;
  }
}

async function readJson(request: Request): Promise<unknown> {
  try {
    return await request.json();
  } catch {
    throw new AdminReservationCancellationError(
      "INVALID_ADMIN_CANCELLATION_REQUEST",
    );
  }
}

function errorResponse(error: unknown) {
  if (error instanceof AdminReservationCancellationError) {
    return adminApiErrorResponse(error.code, errorStatus(error.code));
  }

  return adminApiErrorResponse(
    "ADMIN_CANCELLATION_UNEXPECTED_ERROR",
    500,
  );
}

export async function POST(request: Request, context: RouteContext) {
  const actor = await getAdminSessionActor();

  if (!actor) {
    return adminApiErrorResponse("ADMIN_UNAUTHORIZED", 401);
  }

  try {
    const { reservationId } = await context.params;
    const parsedReservationId = idSchema.safeParse(reservationId);
    const parsedRequest = requestSchema.safeParse(await readJson(request));

    if (!parsedReservationId.success || !parsedRequest.success) {
      return adminApiErrorResponse(
        "INVALID_ADMIN_CANCELLATION_REQUEST",
        400,
      );
    }

    const cancellationRequest = await createAdminCancellationRequest(
      {
        reservationId: parsedReservationId.data,
        ...parsedRequest.data,
      },
      actor,
    );

    return adminApiSuccessResponse({ cancellationRequest });
  } catch (error) {
    return errorResponse(error);
  }
}
