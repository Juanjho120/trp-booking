-- Phase 10.5.1 — Manual resend and delivery recovery controls

CREATE TYPE "email_notification_origin" AS ENUM ('AUTOMATIC', 'MANUAL');

ALTER TABLE "email_notifications"
  ADD COLUMN "origin" "email_notification_origin" NOT NULL DEFAULT 'AUTOMATIC',
  ADD COLUMN "parent_notification_id" TEXT,
  ADD COLUMN "requested_by_admin_id" TEXT,
  ADD COLUMN "requested_at" TIMESTAMP(3);

ALTER TABLE "email_notifications"
  ADD CONSTRAINT "email_notifications_parent_notification_id_fkey"
  FOREIGN KEY ("parent_notification_id")
  REFERENCES "email_notifications"("id")
  ON DELETE SET NULL
  ON UPDATE CASCADE;

ALTER TABLE "email_notifications"
  ADD CONSTRAINT "email_notifications_requested_by_admin_id_fkey"
  FOREIGN KEY ("requested_by_admin_id")
  REFERENCES "users"("id")
  ON DELETE SET NULL
  ON UPDATE CASCADE;

ALTER TABLE "email_notifications"
  ADD CONSTRAINT "email_notifications_parent_not_self_check"
  CHECK ("parent_notification_id" IS NULL OR "parent_notification_id" <> "id");

CREATE INDEX "email_notifications_origin_idx"
  ON "email_notifications"("origin");

CREATE INDEX "email_notifications_parent_notification_id_idx"
  ON "email_notifications"("parent_notification_id");

CREATE INDEX "email_notifications_requested_by_admin_id_idx"
  ON "email_notifications"("requested_by_admin_id");
