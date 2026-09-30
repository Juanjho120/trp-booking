import { z } from "zod";

import {
  adminApiErrorResponse,
  adminApiSuccessResponse,
  AdminFelError,
  createAdminFelDraft,
  getAdminSessionActor,
  isValidAdminMutationOrigin,
} from "@/lib/admin";
import {
  ADMIN_FEL_RECEIVER_IDENTIFIER_TYPES,
  type AdminFelErrorCode,
} from "@/types/admin-fel";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const requestSchema = z
  .object({
    reservationIds: z.array(z.string().trim().min(1).max(160)).min(1).max(20),
    groupExtras: z.boolean(),
    receiverName: z.string().trim().min(1).max(160),
    receiverIdentifierType: z.enum(ADMIN_FEL_RECEIVER_IDENTIFIER_TYPES),
    receiverIdentifier: z.string().trim().max(80).nullable().optional(),
    receiverAddress: z.string().trim().max(500).nullable().optional(),
    receiverEmail: z.string().trim().max(254).nullable().optional(),
    receiverCountry: z.string().trim().max(100).nullable().optional(),
  })
  .strict();

const errorStatus: Record<AdminFelErrorCode, number> = {
  ADMIN_UNAUTHORIZED: 401,
  ADMIN_FEL_ORIGIN_INVALID: 403,
  INVALID_ADMIN_FEL_REQUEST: 400,
  ADMIN_FEL_DOCUMENT_NOT_FOUND: 404,
  ADMIN_FEL_DRAFT_NOT_EDITABLE: 409,
  ADMIN_FEL_RESERVATION_NOT_ELIGIBLE: 409,
  ADMIN_FEL_CHECKOUT_NOT_REACHED: 409,
  ADMIN_FEL_INVALID_CHECKOUT_TIME: 409,
  ADMIN_FEL_LIFECYCLE_UNRESOLVED: 409,
  ADMIN_FEL_FISCAL_RECONCILIATION_REQUIRED: 409,
  ADMIN_FEL_CURRENCY_MISMATCH: 409,
  ADMIN_FEL_SOURCE_ALREADY_ALLOCATED: 409,
  ADMIN_FEL_UNEXPECTED_ERROR: 500,
};

async function readJson(request: Request): Promise<unknown> {
  try {
    return await request.json();
  } catch {
    throw new AdminFelError("INVALID_ADMIN_FEL_REQUEST");
  }
}

async function authorizeMutation(request: Request) {
  const actor = await getAdminSessionActor();

  if (!actor) {
    throw new AdminFelError("ADMIN_UNAUTHORIZED");
  }

  if (!isValidAdminMutationOrigin(request)) {
    throw new AdminFelError("ADMIN_FEL_ORIGIN_INVALID");
  }

  return actor;
}

function adminFelErrorResponse(error: unknown) {
  const code =
    error instanceof AdminFelError
      ? error.code
      : "ADMIN_FEL_UNEXPECTED_ERROR";

  return adminApiErrorResponse(code, errorStatus[code]);
}

export async function POST(request: Request) {
  try {
    const actor = await authorizeMutation(request);
    const parsed = requestSchema.safeParse(await readJson(request));

    if (!parsed.success) {
      return adminApiErrorResponse("INVALID_ADMIN_FEL_REQUEST", 400);
    }

    const document = await createAdminFelDraft(parsed.data, actor);

    return adminApiSuccessResponse({ document });
  } catch (error) {
    return adminFelErrorResponse(error);
  }
}
