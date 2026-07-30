import { z } from "zod";

import {
  AdminReservationDateMutationError,
  adminApiErrorResponse,
  adminApiSuccessResponse,
  createAdminDateMutationRequest,
  getAdminSessionActor,
} from "@/lib/admin";
import {
  adminDateMutationChannels,
  adminDateMutationRequestTypes,
  type AdminDateMutationErrorCode,
} from "@/types/admin-reservation-date-mutation";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const idSchema = z.string().trim().min(1).max(120);
const requestSchema = z
  .object({
    requestType: z.enum(adminDateMutationRequestTypes),
    requestedCheckInDate: z.iso.date(),
    requestedCheckOutDate: z.iso.date(),
    channel: z.enum(adminDateMutationChannels),
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

function errorStatus(code: AdminDateMutationErrorCode): number {
  switch (code) {
    case "ADMIN_UNAUTHORIZED":
      return 401;
    case "ADMIN_DATE_MUTATION_RESERVATION_NOT_FOUND":
      return 404;
    case "ADMIN_DATE_MUTATION_DATES_UNAVAILABLE":
    case "ADMIN_DATE_MUTATION_REQUEST_ALREADY_ACTIVE":
    case "ADMIN_DATE_MUTATION_CANCELLATION_ACTIVE":
    case "ADMIN_DATE_MUTATION_STALE":
    case "ADMIN_DATE_MUTATION_IDEMPOTENCY_CONFLICT":
      return 409;
    case "INVALID_ADMIN_DATE_MUTATION_REQUEST":
    case "ADMIN_DATE_MUTATION_RESERVATION_NOT_CONFIRMED":
    case "ADMIN_DATE_MUTATION_PROPERTY_NOT_ELIGIBLE":
    case "ADMIN_DATE_MUTATION_SOURCE_PAYMENT_NOT_FOUND":
    case "ADMIN_DATE_MUTATION_DATES_UNCHANGED":
    case "ADMIN_DATE_MUTATION_DATE_CHANGE_AFTER_CHECK_IN":
    case "ADMIN_DATE_MUTATION_EXTENSION_INVALID":
    case "ADMIN_DATE_MUTATION_STAY_ENDED":
    case "ADMIN_DATE_MUTATION_DATE_HORIZON_EXCEEDED":
      return 400;
    case "ADMIN_DATE_MUTATION_UNEXPECTED_ERROR":
    default:
      return 500;
  }
}

async function readJson(request: Request): Promise<unknown> {
  try {
    return await request.json();
  } catch {
    throw new AdminReservationDateMutationError(
      "INVALID_ADMIN_DATE_MUTATION_REQUEST",
    );
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
        "INVALID_ADMIN_DATE_MUTATION_REQUEST",
        400,
      );
    }

    const dateMutationRequest = await createAdminDateMutationRequest(
      {
        reservationId: parsedReservationId.data,
        ...parsedRequest.data,
      },
      actor,
    );

    return adminApiSuccessResponse({ dateMutationRequest });
  } catch (error) {
    return errorResponse(error);
  }
}
