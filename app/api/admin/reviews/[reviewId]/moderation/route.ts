import { z } from "zod";

import {
  adminApiErrorResponse,
  adminApiSuccessResponse,
  AdminReviewError,
  getAdminSessionActor,
  isValidAdminMutationOrigin,
  moderateAdminReview,
} from "@/lib/admin";
import { ADMIN_REVIEW_TARGET_STATUSES } from "@/types/admin-reviews";
import type { AdminReviewErrorCode } from "@/types/admin-reviews";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const paramsSchema = z
  .object({
    reviewId: z.string().trim().min(1).max(160),
  })
  .strict();

const requestSchema = z
  .object({
    targetStatus: z.enum(ADMIN_REVIEW_TARGET_STATUSES),
    expectedUpdatedAt: z.iso.datetime(),
  })
  .strict();

const errorStatus: Record<AdminReviewErrorCode, number> = {
  ADMIN_UNAUTHORIZED: 401,
  ADMIN_REVIEW_ORIGIN_INVALID: 403,
  INVALID_ADMIN_REVIEW_REQUEST: 400,
  ADMIN_REVIEW_NOT_FOUND: 404,
  ADMIN_REVIEW_STALE: 409,
  ADMIN_REVIEW_INVALID_TRANSITION: 409,
  ADMIN_REVIEW_UNEXPECTED_ERROR: 500,
};

type RouteContext = Readonly<{
  params: Promise<{ reviewId: string }>;
}>;

async function readJson(request: Request): Promise<unknown> {
  try {
    return await request.json();
  } catch {
    throw new AdminReviewError("INVALID_ADMIN_REVIEW_REQUEST");
  }
}

function adminReviewErrorResponse(error: unknown) {
  const code =
    error instanceof AdminReviewError
      ? error.code
      : "ADMIN_REVIEW_UNEXPECTED_ERROR";

  return adminApiErrorResponse(code, errorStatus[code]);
}

async function authorizeMutation(request: Request) {
  const actor = await getAdminSessionActor();

  if (!actor) {
    throw new AdminReviewError("ADMIN_UNAUTHORIZED");
  }

  if (!isValidAdminMutationOrigin(request)) {
    throw new AdminReviewError("ADMIN_REVIEW_ORIGIN_INVALID");
  }

  return actor;
}

export async function PATCH(request: Request, context: RouteContext) {
  try {
    const actor = await authorizeMutation(request);
    const parsedParams = paramsSchema.safeParse(await context.params);
    const parsedBody = requestSchema.safeParse(await readJson(request));

    if (!parsedParams.success || !parsedBody.success) {
      return adminApiErrorResponse("INVALID_ADMIN_REVIEW_REQUEST", 400);
    }

    const review = await moderateAdminReview(
      {
        reviewId: parsedParams.data.reviewId,
        ...parsedBody.data,
      },
      actor,
    );

    return adminApiSuccessResponse({ review });
  } catch (error) {
    return adminReviewErrorResponse(error);
  }
}
