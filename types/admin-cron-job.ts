import type {
  CronJobExecutionSnapshot,
  CronJobKeyValue,
  CronJobSlug,
} from "@/types/cron-job";

export type AdminCronJobSummary = Readonly<{
  key: CronJobKeyValue;
  slug: CronJobSlug;
  schedule: string;
  isRunning: boolean;
  latestExecution: CronJobExecutionSnapshot | null;
}>;

export type AdminCronJobsPageData = Readonly<{
  jobs: readonly AdminCronJobSummary[];
  executions: readonly CronJobExecutionSnapshot[];
  pagination: Readonly<{
    page: number;
    pageSize: number;
    totalItems: number;
    totalPages: number;
  }>;
}>;

export type AdminCronJobRunErrorCode =
  | "ADMIN_UNAUTHORIZED"
  | "INVALID_ADMIN_CRON_JOB_REQUEST"
  | "ADMIN_CRON_JOB_ALREADY_RUNNING"
  | "ADMIN_CRON_JOB_UNEXPECTED_ERROR";

export type AdminCronJobRunApiResponse =
  | Readonly<{
      execution: CronJobExecutionSnapshot;
    }>
  | Readonly<{
      error: Readonly<{
        code: AdminCronJobRunErrorCode;
      }>;
    }>;
