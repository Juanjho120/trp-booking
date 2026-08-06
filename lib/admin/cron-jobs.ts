import { CronJobExecutionStatus, type Prisma } from "@prisma/client";

import { prisma } from "@/lib/db/prisma";
import {
  getCronJobStaleThresholdMs,
  listCronJobDefinitions,
} from "@/lib/cron";
import type {
  AdminCronJobsPageData,
  AdminCronJobSummary,
} from "@/types/admin-cron-job";
import type {
  CronJobExecutionSnapshot,
  CronJobKeyValue,
  CronJobSafeJson,
  CronJobTriggerSourceValue,
} from "@/types/cron-job";

const DEFAULT_PAGE_SIZE = 20;
const MAX_PAGE_SIZE = 50;

const executionInclude = {
  adminActor: {
    select: {
      id: true,
      email: true,
      name: true,
    },
  },
} satisfies Prisma.CronJobExecutionInclude;

type StoredExecution = Prisma.CronJobExecutionGetPayload<{
  include: typeof executionInclude;
}>;

function serializeExecution(
  execution: StoredExecution,
): CronJobExecutionSnapshot {
  return {
    id: execution.id,
    jobKey: execution.jobKey as CronJobKeyValue,
    triggerSource: execution.triggerSource as CronJobTriggerSourceValue,
    businessEnvironment: execution.businessEnvironment,
    status: execution.status,
    startedAt: execution.startedAt.toISOString(),
    finishedAt: execution.finishedAt?.toISOString() ?? null,
    durationMs: execution.durationMs,
    result: execution.resultJson as CronJobSafeJson,
    errorCode: execution.errorCode,
    errorMessage: execution.errorMessage,
    createdAt: execution.createdAt.toISOString(),
    adminActor: execution.adminActor,
  };
}

export async function getAdminCronJobsPage(
  input: Readonly<{
    page?: number;
    pageSize?: number;
  }> = {},
): Promise<AdminCronJobsPageData> {
  const requestedPage = Math.max(1, Math.trunc(input.page ?? 1));
  const pageSize = Math.min(
    MAX_PAGE_SIZE,
    Math.max(1, Math.trunc(input.pageSize ?? DEFAULT_PAGE_SIZE)),
  );
  const definitions = listCronJobDefinitions();
  const totalItems = await prisma.cronJobExecution.count();
  const totalPages = Math.max(1, Math.ceil(totalItems / pageSize));
  const page = Math.min(requestedPage, totalPages);
  const staleBefore = new Date(Date.now() - getCronJobStaleThresholdMs());
  const [latestExecutions, executions] = await Promise.all([
    Promise.all(
      definitions.map((definition) =>
        prisma.cronJobExecution.findFirst({
          where: { jobKey: definition.key },
          orderBy: [{ startedAt: "desc" }, { id: "desc" }],
          include: executionInclude,
        }),
      ),
    ),
    prisma.cronJobExecution.findMany({
      orderBy: [{ startedAt: "desc" }, { id: "desc" }],
      skip: (page - 1) * pageSize,
      take: pageSize,
      include: executionInclude,
    }),
  ]);

  const jobs: AdminCronJobSummary[] = definitions.map((definition, index) => {
    const latestExecution = latestExecutions[index];
    const isRunning =
      latestExecution?.status === CronJobExecutionStatus.RUNNING &&
      latestExecution.startedAt >= staleBefore;

    return {
      key: definition.key,
      slug: definition.slug,
      schedule: definition.schedule,
      isRunning,
      latestExecution: latestExecution
        ? serializeExecution(latestExecution)
        : null,
    };
  });

  return {
    jobs,
    executions: executions.map(serializeExecution),
    pagination: {
      page,
      pageSize,
      totalItems,
      totalPages,
    },
  };
}
