export const cronJobSlugs = [
  "sync-airbnb-calendars",
  "expire-pending-reservation-holds",
  "process-email-notifications",
  "schedule-arrival-instructions",
] as const;

export type CronJobSlug = (typeof cronJobSlugs)[number];

export type CronJobKeyValue =
  | "SYNC_AIRBNB_CALENDARS"
  | "EXPIRE_PENDING_RESERVATION_HOLDS"
  | "PROCESS_EMAIL_NOTIFICATIONS"
  | "SCHEDULE_ARRIVAL_INSTRUCTIONS";

export type CronJobTriggerSourceValue = "SCHEDULED" | "MANUAL";

export type CronJobExecutionStatusValue =
  | "RUNNING"
  | "SUCCESS"
  | "PARTIAL_SUCCESS"
  | "FAILED";

export type CronJobSafeJson =
  | null
  | boolean
  | number
  | string
  | readonly CronJobSafeJson[]
  | { readonly [key: string]: CronJobSafeJson };

export type CronJobExecutionResult = Readonly<{
  status: Exclude<CronJobExecutionStatusValue, "RUNNING">;
  result: Readonly<Record<string, CronJobSafeJson>>;
  errorCode: string | null;
  errorMessage: string | null;
}>;

export type CronJobExecutionSnapshot = Readonly<{
  id: string;
  jobKey: CronJobKeyValue;
  triggerSource: CronJobTriggerSourceValue;
  businessEnvironment: string;
  status: CronJobExecutionStatusValue;
  startedAt: string;
  finishedAt: string | null;
  durationMs: number | null;
  result: CronJobSafeJson;
  errorCode: string | null;
  errorMessage: string | null;
  createdAt: string;
  adminActor: Readonly<{
    id: string;
    email: string;
    name: string | null;
  }> | null;
}>;
