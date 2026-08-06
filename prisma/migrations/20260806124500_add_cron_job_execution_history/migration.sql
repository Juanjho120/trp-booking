CREATE TYPE "cron_job_key" AS ENUM (
  'SYNC_AIRBNB_CALENDARS',
  'EXPIRE_PENDING_RESERVATION_HOLDS',
  'PROCESS_EMAIL_NOTIFICATIONS',
  'SCHEDULE_ARRIVAL_INSTRUCTIONS'
);

CREATE TYPE "cron_job_trigger_source" AS ENUM ('SCHEDULED', 'MANUAL');

CREATE TYPE "cron_job_execution_status" AS ENUM (
  'RUNNING',
  'SUCCESS',
  'PARTIAL_SUCCESS',
  'FAILED'
);

CREATE TABLE "cron_job_executions" (
  "id" TEXT NOT NULL,
  "job_key" "cron_job_key" NOT NULL,
  "trigger_source" "cron_job_trigger_source" NOT NULL,
  "admin_actor_id" TEXT,
  "business_environment" VARCHAR(20) NOT NULL,
  "status" "cron_job_execution_status" NOT NULL DEFAULT 'RUNNING',
  "started_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "finished_at" TIMESTAMP(3),
  "duration_ms" INTEGER,
  "result_json" JSONB,
  "error_code" VARCHAR(100),
  "error_message" TEXT,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "cron_job_executions_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "cron_job_executions_job_key_started_at_idx"
  ON "cron_job_executions"("job_key", "started_at");

CREATE INDEX "cron_job_executions_status_started_at_idx"
  ON "cron_job_executions"("status", "started_at");

CREATE INDEX "cron_job_executions_trigger_source_started_at_idx"
  ON "cron_job_executions"("trigger_source", "started_at");

CREATE INDEX "cron_job_executions_admin_actor_id_idx"
  ON "cron_job_executions"("admin_actor_id");

CREATE UNIQUE INDEX "cron_job_executions_running_job_key_key"
  ON "cron_job_executions"("job_key")
  WHERE "status" = 'RUNNING';

ALTER TABLE "cron_job_executions"
  ADD CONSTRAINT "cron_job_executions_admin_actor_id_fkey"
  FOREIGN KEY ("admin_actor_id") REFERENCES "users"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;
