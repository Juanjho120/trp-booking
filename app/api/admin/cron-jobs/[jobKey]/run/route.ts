import { z } from "zod";

import {
  adminApiErrorResponse,
  adminApiSuccessResponse,
  getAdminSessionActor,
} from "@/lib/admin";
import {
  CronJobRunnerError,
  getCronJobDefinitionBySlug,
  runCronJobBySlug,
} from "@/lib/cron";
import type { AdminCronJobRunErrorCode } from "@/types/admin-cron-job";
import { cronJobSlugs } from "@/types/cron-job";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const jobSlugSchema = z.enum(cronJobSlugs);

type RouteContext = Readonly<{
  params: Promise<{
    jobKey: string;
  }>;
}>;

function errorResponse(code: AdminCronJobRunErrorCode, status: number) {
  return adminApiErrorResponse(code, status);
}

export async function POST(_request: Request, context: RouteContext) {
  const actor = await getAdminSessionActor();

  if (!actor) {
    return errorResponse("ADMIN_UNAUTHORIZED", 401);
  }

  const { jobKey } = await context.params;
  const parsedJobKey = jobSlugSchema.safeParse(jobKey);

  if (
    !parsedJobKey.success ||
    !getCronJobDefinitionBySlug(parsedJobKey.data)
  ) {
    return errorResponse("INVALID_ADMIN_CRON_JOB_REQUEST", 400);
  }

  try {
    const execution = await runCronJobBySlug({
      slug: parsedJobKey.data,
      triggerSource: "MANUAL",
      actor,
    });

    return adminApiSuccessResponse({ execution });
  } catch (error) {
    if (
      error instanceof CronJobRunnerError &&
      error.code === "CRON_JOB_ALREADY_RUNNING"
    ) {
      return errorResponse("ADMIN_CRON_JOB_ALREADY_RUNNING", 409);
    }

    return errorResponse("ADMIN_CRON_JOB_UNEXPECTED_ERROR", 500);
  }
}
