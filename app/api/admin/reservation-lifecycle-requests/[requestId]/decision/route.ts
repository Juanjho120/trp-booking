import { z } from "zod";

import {
  AdminReservationCancellationError,
  adminApiErrorResponse,
  adminApiSuccessResponse,
  decideAdminCancellationRequest,
  getAdminSessionActor,
} from "@/lib/admin";
import type { AdminReservationCancellationErrorCode } from "@/types/admin-reservation-cancellation";
import { adminCancellationDecisions } from "@/types/admin-reservation-cancellation";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const idSchema = z.string().trim().min(1).max(120);
const requestSchema = z
  .object({
    reservationId: idSchema,
    decision: z.enum(adminCancellationDecisions),
    decisionNote: z.string().trim().min(1).max(2_000),
    expectedRequestVersion: z.number().int().min(1),
    expectedReservationUpdatedAt: z.iso.datetime(),
  })
  .strict();

type RouteContext = Readonly<{
  params: Promise<{
    requestId: string;
  }>;
}>;

function errorStatus(code: AdminReservationCancellationErrorCode): number {
  switch (code) {
    case "ADMIN_UNAUTHORIZED":
      return 401;
    case "ADMIN_CANCELLATION_REQUEST_NOT_FOUND":
    case "ADMIN_CANCELLATION_RESERVATION_NOT_FOUND":
      return 404;
    case "ADMIN_CANCELLATION_REQUEST_NOT_PENDING":
    case "ADMIN_CANCELLATION_STALE":
      return 409;
    case "INVALID_ADMIN_CANCELLATION_REQUEST":
    case "ADMIN_CANCELLATION_RESERVATION_NOT_CONFIRMED":
    case "ADMIN_CANCELLATION_SOURCE_PAYMENT_NOT_FOUND":
    case "ADMIN_CANCELLATION_REQUEST_ALREADY_ACTIVE":
      return 400;
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
    const { requestId } = await context.params;
    const parsedRequestId = idSchema.safeParse(requestId);
    const parsedRequest = requestSchema.safeParse(await readJson(request));

    if (!parsedRequestId.success || !parsedRequest.success) {
      return adminApiErrorResponse(
        "INVALID_ADMIN_CANCELLATION_REQUEST",
        400,
      );
    }

    const result = await decideAdminCancellationRequest(
      {
        requestId: parsedRequestId.data,
        ...parsedRequest.data,
      },
      actor,
    );

    return adminApiSuccessResponse({ result });
  } catch (error) {
    return errorResponse(error);
  }
}
