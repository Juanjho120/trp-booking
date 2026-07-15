import { NextResponse } from "next/server";
import { z } from "zod";

import { auth } from "@/auth";
import { ADMIN_ROLE } from "@/lib/auth/admin-access";
import {
  AdminPreparationBufferError,
  getAdminPreparationBufferManagement,
  updateAdminPreparationBufferSettings,
} from "@/lib/admin";
import type { AdminPreparationBufferErrorCode } from "@/types/admin-preparation-buffer-management";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const updatePreparationBufferSchema = z.object({
  propertyId: z.string().trim().min(1).max(120),
  preparationDaysBefore: z.number().int().min(0).max(30),
  preparationDaysAfter: z.number().int().min(0).max(30),
});

function errorResponse(
  code: AdminPreparationBufferErrorCode,
  status: number,
): NextResponse {
  return NextResponse.json(
    {
      error: {
        code,
      },
    },
    {
      status,
      headers: {
        "cache-control": "no-store, max-age=0",
      },
    },
  );
}

async function getAdminActor() {
  const session = await auth();
  const user = session?.user;

  if (!user || user.role !== ADMIN_ROLE || !user.email) {
    return null;
  }

  return {
    email: user.email,
    name: user.name,
  };
}

export async function GET(): Promise<NextResponse> {
  const actor = await getAdminActor();

  if (!actor) {
    return errorResponse("ADMIN_UNAUTHORIZED", 401);
  }

  try {
    const management = await getAdminPreparationBufferManagement();

    return NextResponse.json(
      {
        management,
      },
      {
        status: 200,
        headers: {
          "cache-control": "no-store, max-age=0",
        },
      },
    );
  } catch {
    return errorResponse("PREPARATION_BUFFER_UNEXPECTED_ERROR", 500);
  }
}

export async function PATCH(request: Request): Promise<NextResponse> {
  const actor = await getAdminActor();

  if (!actor) {
    return errorResponse("ADMIN_UNAUTHORIZED", 401);
  }

  let body: unknown;

  try {
    body = await request.json();
  } catch {
    return errorResponse("INVALID_PREPARATION_BUFFER_REQUEST", 400);
  }

  const parsedRequest = updatePreparationBufferSchema.safeParse(body);

  if (!parsedRequest.success) {
    return errorResponse("INVALID_PREPARATION_BUFFER_REQUEST", 400);
  }

  try {
    const management = await updateAdminPreparationBufferSettings(
      parsedRequest.data,
      actor,
    );

    return NextResponse.json(
      {
        management,
      },
      {
        status: 200,
        headers: {
          "cache-control": "no-store, max-age=0",
        },
      },
    );
  } catch (error) {
    if (error instanceof AdminPreparationBufferError) {
      const status =
        error.code === "PREPARATION_BUFFER_PROPERTY_NOT_FOUND" ? 404 : 400;

      return errorResponse(error.code, status);
    }

    return errorResponse("PREPARATION_BUFFER_UNEXPECTED_ERROR", 500);
  }
}
