-- Phase 11.6.1: add typed lifecycle-notification recipients and source relations.

ALTER TYPE "email_notification_type"
ADD VALUE IF NOT EXISTS 'ADMIN_RESERVATION_CANCELLED';

ALTER TYPE "email_notification_type"
ADD VALUE IF NOT EXISTS 'ADMIN_RESERVATION_DATES_UPDATED';

ALTER TYPE "email_notification_type"
ADD VALUE IF NOT EXISTS 'ADMIN_STAY_EXTENSION_CONFIRMED';

ALTER TYPE "email_notification_type"
ADD VALUE IF NOT EXISTS 'ADMIN_REFUND_PROCESSED';

ALTER TABLE "email_notifications"
ADD COLUMN "lifecycle_request_id" TEXT,
ADD COLUMN "refund_id" TEXT;

CREATE INDEX "email_notifications_lifecycle_request_id_idx"
ON "email_notifications"("lifecycle_request_id");

CREATE INDEX "email_notifications_refund_id_idx"
ON "email_notifications"("refund_id");

ALTER TABLE "email_notifications"
ADD CONSTRAINT "email_notifications_lifecycle_request_id_fkey"
FOREIGN KEY ("lifecycle_request_id")
REFERENCES "reservation_lifecycle_requests"("id")
ON DELETE SET NULL
ON UPDATE CASCADE;

ALTER TABLE "email_notifications"
ADD CONSTRAINT "email_notifications_refund_id_fkey"
FOREIGN KEY ("refund_id")
REFERENCES "refunds"("id")
ON DELETE SET NULL
ON UPDATE CASCADE;
