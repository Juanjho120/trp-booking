import { NextResponse } from "next/server";

import type { CronJobSafeJson, CronJobSlug } from "@/types/cron-job";

import { authorizeCronRequest } from "./auth";
import { CronJobRunnerError, runCronJobBySlug } from "./runner";

const NO_STORE_HEADERS = {
  "cache-control": "no-store, max-age=0",
} as const;

function executionHttpStatus(status: string): number {
  if (status === "PARTIAL_SUCCESS") {
    return 207;
  }

  if (status === "FAILED") {
    return 503;
  }

  return 200;
}

function errorResponse(message: string, code: string, status: number) {
  return NextResponse.json(
    { error: message, code },
    { status, headers: NO_STORE_HEADERS },
  );
}

export async function handleScheduledCronRequest(
  request: Request,
  slug: CronJobSlug,
) {
  const authorization = authorizeCronRequest(request);

  if (authorization === "NOT_CONFIGURED") {
    return errorResponse(
      "Cron execution is not configured.",
      "CRON_NOT_CONFIGURED",
      503,
    );
  }

  if (authorization === "UNAUTHORIZED") {
    return errorResponse("Unauthorized.", "CRON_UNAUTHORIZED", 401);
  }

  try {
    const execution = await runCronJobBySlug({
      slug,
      triggerSource: "SCHEDULED",
    });
    const result = execution.result as Readonly<Record<string, CronJobSafeJson>>;

    return NextResponse.json(result, {
      status: executionHttpStatus(execution.status),
      headers: {
        ...NO_STORE_HEADERS,
        "x-cron-execution-id": execution.id,
      },
    });
  } catch (error) {
    if (
      error instanceof CronJobRunnerError &&
      error.code === "CRON_JOB_ALREADY_RUNNING"
    ) {
      return errorResponse(
        "This cron job is already running.",
        error.code,
        409,
      );
    }

    return errorResponse(
      "Cron execution could not be started.",
      "CRON_JOB_UNEXPECTED_ERROR",
      503,
    );
  }
}
