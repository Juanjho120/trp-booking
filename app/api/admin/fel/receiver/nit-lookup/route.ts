import { z } from "zod";

import {
  adminApiErrorResponse,
  adminApiSuccessResponse,
  AdminFelError,
  getAdminSessionActor,
  isValidAdminMutationOrigin,
} from "@/lib/admin";
import { lookupReceiverNit } from "@/lib/fel/receiver-nit-lookup";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const requestSchema = z
  .object({
    nit: z.string().trim().min(1).max(80),
  })
  .strict();

async function readJson(request: Request): Promise<unknown> {
  try {
    return await request.json();
  } catch {
    throw new AdminFelError("INVALID_ADMIN_FEL_REQUEST");
  }
}

async function authorizeMutation(request: Request): Promise<void> {
  const actor = await getAdminSessionActor();

  if (!actor) {
    throw new AdminFelError("ADMIN_UNAUTHORIZED");
  }

  if (!isValidAdminMutationOrigin(request)) {
    throw new AdminFelError("ADMIN_FEL_ORIGIN_INVALID");
  }
}

function adminFelErrorResponse(error: unknown) {
  if (error instanceof AdminFelError) {
    if (error.code === "ADMIN_UNAUTHORIZED") {
      return adminApiErrorResponse(error.code, 401);
    }

    if (error.code === "ADMIN_FEL_ORIGIN_INVALID") {
      return adminApiErrorResponse(error.code, 403);
    }

    return adminApiErrorResponse(error.code, 400);
  }

  return adminApiErrorResponse("ADMIN_FEL_UNEXPECTED_ERROR", 500);
}

export async function POST(request: Request) {
  try {
    await authorizeMutation(request);
    const parsed = requestSchema.safeParse(await readJson(request));

    if (!parsed.success) {
      return adminApiErrorResponse("INVALID_ADMIN_FEL_REQUEST", 400);
    }

    const result = await lookupReceiverNit(parsed.data.nit);

    return adminApiSuccessResponse(result);
  } catch (error) {
    return adminFelErrorResponse(error);
  }
}
