import { NextResponse } from "next/server";
import { z } from "zod";

import { auth } from "@/auth";
import { ADMIN_ROLE } from "@/lib/auth/admin-access";
import {
  AdminPreparationBufferError,
  unlockAdminPreparationBufferDay,
} from "@/lib/admin";
import { isDateOnlyString } from "@/lib/availability/rules";
import type { AdminPreparationBufferErrorCode } from "@/types/admin-preparation-buffer-management";
import type { DateOnlyString } from "@/types/availability";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const unlockPreparationBufferSchema = z.object({
  reservationId: z.string().trim().min(1).max(120),
  date: z.string().trim().refine(isDateOnlyString),
  reason: z.string().trim().min(3).max(500),
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

export async function POST(request: Request): Promise<NextResponse> {
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

  const parsedRequest = unlockPreparationBufferSchema.safeParse(body);

  if (!parsedRequest.success) {
    return errorResponse("INVALID_PREPARATION_BUFFER_REQUEST", 400);
  }

  try {
    const management = await unlockAdminPreparationBufferDay(
      {
        ...parsedRequest.data,
        date: parsedRequest.data.date as DateOnlyString,
      },
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
      let status = 400;

      if (error.code === "PREPARATION_BUFFER_RESERVATION_NOT_FOUND") {
        status = 404;
      } else if (
        error.code === "PREPARATION_BUFFER_RESERVATION_NOT_CONFIRMED" ||
        error.code === "PREPARATION_BUFFER_DATE_NOT_UNLOCKABLE" ||
        error.code === "PREPARATION_BUFFER_DATE_IN_PAST"
      ) {
        status = 409;
      }

      return errorResponse(error.code, status);
    }

    return errorResponse("PREPARATION_BUFFER_UNEXPECTED_ERROR", 500);
  }
}
