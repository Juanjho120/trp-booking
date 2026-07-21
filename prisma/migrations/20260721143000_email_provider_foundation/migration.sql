-- Phase 10.2: durable locale, permanent email deduplication, and retry/claim metadata.
-- Existing reservations safely default to Spanish.
-- Existing notification rows receive a stable legacy key before the NOT NULL/UNIQUE contract is enforced.

ALTER TYPE "email_notification_status" ADD VALUE 'PROCESSING' BEFORE 'SENT';

ALTER TABLE "reservations"
ADD COLUMN "preferred_locale" TEXT NOT NULL DEFAULT 'es';

ALTER TABLE "email_notifications"
ADD COLUMN "deduplication_key" TEXT,
ADD COLUMN "attempt_count" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN "last_attempt_at" TIMESTAMP(3),
ADD COLUMN "next_attempt_at" TIMESTAMP(3),
ADD COLUMN "processing_started_at" TIMESTAMP(3),
ADD COLUMN "error_code" TEXT;

UPDATE "email_notifications"
SET "deduplication_key" = 'legacy/' || "id"
WHERE "deduplication_key" IS NULL;

ALTER TABLE "email_notifications"
ALTER COLUMN "deduplication_key" SET NOT NULL;

DROP INDEX "email_notifications_status_idx";

CREATE UNIQUE INDEX "email_notifications_deduplication_key_key"
ON "email_notifications"("deduplication_key");

CREATE INDEX "email_notifications_status_next_attempt_at_idx"
ON "email_notifications"("status", "next_attempt_at");
