import { z } from "zod";

import {
  AdminReservationDateMutationError,
  adminApiErrorResponse,
  adminApiSuccessResponse,
  decideAdminDateMutationRequest,
  getAdminSessionActor,
} from "@/lib/admin";
import {
  adminDateMutationDecisions,
  type AdminDateMutationErrorCode,
} from "@/types/admin-reservation-date-mutation";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const idSchema = z.string().trim().min(1).max(120);
const decisionSchema = z
  .object({
    decision: z.enum(adminDateMutationDecisions),
    decisionNote: z.string().trim().min(1).max(2_000),
    expectedRequestVersion: z.number().int().positive(),
    expectedReservationUpdatedAt: z.iso.datetime(),
  })
  .strict();

type RouteContext = Readonly<{
  params: Promise<{
    reservationId: string;
    requestId: string;
  }>;
}>;

function errorStatus(code: AdminDateMutationErrorCode): number {
  switch (code) {
    case "ADMIN_UNAUTHORIZED":
      return 401;
    case "ADMIN_DATE_MUTATION_RESERVATION_NOT_FOUND":
    case "ADMIN_DATE_MUTATION_REQUEST_NOT_FOUND":
      return 404;
    case "ADMIN_DATE_MUTATION_DATES_UNAVAILABLE":
    case "ADMIN_DATE_MUTATION_REQUEST_NOT_PENDING":
    case "ADMIN_DATE_MUTATION_REQUEST_EXPIRED":
    case "ADMIN_DATE_MUTATION_DECISION_CONFLICT":
    case "ADMIN_DATE_MUTATION_ADJUSTMENT_PAYMENT_CONFLICT":
    case "ADMIN_DATE_MUTATION_REFUND_BALANCE_INSUFFICIENT":
    case "ADMIN_DATE_MUTATION_STALE":
    case "ADMIN_DATE_MUTATION_COMPLETION_NOT_READY":
    case "ADMIN_DATE_MUTATION_ADJUSTMENT_PAYMENT_NOT_APPROVED":
    case "ADMIN_DATE_MUTATION_HOLD_NOT_ACTIVE":
    case "ADMIN_DATE_MUTATION_NEGATIVE_COMPLETION_DEFERRED":
    case "ADMIN_DATE_MUTATION_COMPLETION_CONFLICT":
      return 409;
    case "INVALID_ADMIN_DATE_MUTATION_REQUEST":
    case "ADMIN_DATE_MUTATION_RESERVATION_NOT_CONFIRMED":
    case "ADMIN_DATE_MUTATION_PROPERTY_NOT_ELIGIBLE":
    case "ADMIN_DATE_MUTATION_SOURCE_PAYMENT_NOT_FOUND":
    case "ADMIN_DATE_MUTATION_EXTENSION_INVALID":
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

export async function POST(request: Request, context: RouteContext) {
  const actor = await getAdminSessionActor();

  if (!actor) {
    return adminApiErrorResponse("ADMIN_UNAUTHORIZED", 401);
  }

  try {
    const params = await context.params;
    const parsedReservationId = idSchema.safeParse(params.reservationId);
    const parsedRequestId = idSchema.safeParse(params.requestId);
    const body = await request.json().catch(() => null);
    const parsedDecision = decisionSchema.safeParse(body);

    if (
      !parsedReservationId.success ||
      !parsedRequestId.success ||
      !parsedDecision.success
    ) {
      return adminApiErrorResponse(
        "INVALID_ADMIN_DATE_MUTATION_REQUEST",
        400,
      );
    }

    const decisionResult = await decideAdminDateMutationRequest(
      {
        reservationId: parsedReservationId.data,
        requestId: parsedRequestId.data,
        ...parsedDecision.data,
      },
      actor,
    );

    return adminApiSuccessResponse({ decisionResult });
  } catch (error) {
    return errorResponse(error);
  }
}
