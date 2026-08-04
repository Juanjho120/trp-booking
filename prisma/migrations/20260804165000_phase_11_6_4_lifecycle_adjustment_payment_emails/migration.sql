ALTER TYPE "trp_booking"."email_notification_type" ADD VALUE IF NOT EXISTS 'DATE_CHANGE_PAYMENT_REQUIRED';
ALTER TYPE "trp_booking"."email_notification_type" ADD VALUE IF NOT EXISTS 'STAY_EXTENSION_PAYMENT_REQUIRED';
ALTER TYPE "trp_booking"."email_notification_type" ADD VALUE IF NOT EXISTS 'ADMIN_DATE_CHANGE_PAYMENT_LINK_DELIVERY_STATUS';
ALTER TYPE "trp_booking"."email_notification_type" ADD VALUE IF NOT EXISTS 'ADMIN_STAY_EXTENSION_PAYMENT_LINK_DELIVERY_STATUS';

ALTER TABLE "trp_booking"."email_notifications"
ADD COLUMN IF NOT EXISTS "source_notification_id" TEXT;

CREATE INDEX IF NOT EXISTS "email_notifications_source_notification_id_idx"
ON "trp_booking"."email_notifications"("source_notification_id");

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'email_notifications_source_notification_id_fkey'
      AND conrelid = '"trp_booking"."email_notifications"'::regclass
  ) THEN
    ALTER TABLE "trp_booking"."email_notifications"
      ADD CONSTRAINT "email_notifications_source_notification_id_fkey"
      FOREIGN KEY ("source_notification_id")
      REFERENCES "trp_booking"."email_notifications"("id")
      ON DELETE SET NULL
      ON UPDATE CASCADE;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'email_notifications_source_not_self_check'
      AND conrelid = '"trp_booking"."email_notifications"'::regclass
  ) THEN
    ALTER TABLE "trp_booking"."email_notifications"
      ADD CONSTRAINT "email_notifications_source_not_self_check"
      CHECK (
        "source_notification_id" IS NULL
        OR "source_notification_id" <> "id"
      );
  END IF;
END $$;
