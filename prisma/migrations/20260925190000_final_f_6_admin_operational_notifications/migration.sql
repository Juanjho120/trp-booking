-- Final-F.6: durable ADMIN Web Push operational notifications.

CREATE TYPE "admin_notification_type" AS ENUM (
  'RESERVATION_CONFIRMED',
  'RESERVATION_CANCELLED',
  'CHECK_IN_MINUS_48H',
  'CHECK_OUT_MINUS_6H',
  'REVIEW_SUBMITTED'
);

CREATE TYPE "admin_push_delivery_status" AS ENUM (
  'PENDING',
  'PROCESSING',
  'SENT',
  'FAILED',
  'SKIPPED'
);

ALTER TYPE "cron_job_key" ADD VALUE 'PROCESS_ADMIN_PUSH_NOTIFICATIONS';

CREATE TABLE "admin_notifications" (
  "id" TEXT NOT NULL,
  "type" "admin_notification_type" NOT NULL,
  "reservation_id" TEXT,
  "review_id" TEXT,
  "deduplication_key" VARCHAR(191) NOT NULL,
  "title" VARCHAR(160) NOT NULL,
  "body" VARCHAR(240) NOT NULL,
  "target_path" VARCHAR(512) NOT NULL,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "admin_notifications_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "admin_notification_reads" (
  "notification_id" TEXT NOT NULL,
  "user_id" TEXT NOT NULL,
  "read_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "admin_notification_reads_pkey" PRIMARY KEY ("notification_id","user_id")
);

CREATE TABLE "admin_push_deliveries" (
  "id" TEXT NOT NULL,
  "notification_id" TEXT NOT NULL,
  "subscription_id" TEXT NOT NULL,
  "status" "admin_push_delivery_status" NOT NULL DEFAULT 'PENDING',
  "attempt_count" INTEGER NOT NULL DEFAULT 0,
  "last_attempt_at" TIMESTAMP(3),
  "next_attempt_at" TIMESTAMP(3),
  "processing_started_at" TIMESTAMP(3),
  "error_code" VARCHAR(80),
  "error_message" VARCHAR(240),
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "admin_push_deliveries_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "admin_notifications_deduplication_key_key" ON "admin_notifications"("deduplication_key");
CREATE INDEX "admin_notifications_type_idx" ON "admin_notifications"("type");
CREATE INDEX "admin_notifications_created_at_idx" ON "admin_notifications"("created_at");
CREATE INDEX "admin_notifications_reservation_id_idx" ON "admin_notifications"("reservation_id");
CREATE INDEX "admin_notifications_review_id_idx" ON "admin_notifications"("review_id");
CREATE INDEX "admin_notification_reads_user_id_idx" ON "admin_notification_reads"("user_id");
CREATE UNIQUE INDEX "admin_push_deliveries_notification_id_subscription_id_key" ON "admin_push_deliveries"("notification_id","subscription_id");
CREATE INDEX "admin_push_deliveries_status_next_attempt_at_idx" ON "admin_push_deliveries"("status","next_attempt_at");
CREATE INDEX "admin_push_deliveries_notification_id_idx" ON "admin_push_deliveries"("notification_id");
CREATE INDEX "admin_push_deliveries_subscription_id_idx" ON "admin_push_deliveries"("subscription_id");

ALTER TABLE "admin_notifications"
  ADD CONSTRAINT "admin_notifications_reservation_id_fkey"
  FOREIGN KEY ("reservation_id") REFERENCES "reservations"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "admin_notifications"
  ADD CONSTRAINT "admin_notifications_review_id_fkey"
  FOREIGN KEY ("review_id") REFERENCES "reviews"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "admin_notification_reads"
  ADD CONSTRAINT "admin_notification_reads_notification_id_fkey"
  FOREIGN KEY ("notification_id") REFERENCES "admin_notifications"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "admin_notification_reads"
  ADD CONSTRAINT "admin_notification_reads_user_id_fkey"
  FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "admin_push_deliveries"
  ADD CONSTRAINT "admin_push_deliveries_notification_id_fkey"
  FOREIGN KEY ("notification_id") REFERENCES "admin_notifications"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "admin_push_deliveries"
  ADD CONSTRAINT "admin_push_deliveries_subscription_id_fkey"
  FOREIGN KEY ("subscription_id") REFERENCES "admin_push_subscriptions"("id") ON DELETE CASCADE ON UPDATE CASCADE;
