-- Final-F.7: Zoho inbound email bounded metadata and GUEST_EMAIL_RECEIVED Admin Web Push.

ALTER TYPE "admin_notification_type" ADD VALUE IF NOT EXISTS 'GUEST_EMAIL_RECEIVED';

CREATE TABLE "zoho_mail_webhook_configurations" (
  "id" TEXT NOT NULL,
  "business_environment" VARCHAR(32) NOT NULL,
  "hook_secret_encrypted" TEXT NOT NULL,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "zoho_mail_webhook_configurations_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "zoho_inbound_email_events" (
  "id" TEXT NOT NULL,
  "event_fingerprint" VARCHAR(80) NOT NULL,
  "from_address" VARCHAR(320) NOT NULL,
  "to_address" VARCHAR(1000) NOT NULL,
  "subject" VARCHAR(500) NOT NULL,
  "received_at" TIMESTAMP(3) NOT NULL,
  "reservation_id" TEXT,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "zoho_inbound_email_events_pkey" PRIMARY KEY ("id")
);

ALTER TABLE "admin_notifications"
  ADD COLUMN "zoho_inbound_email_event_id" TEXT;

CREATE UNIQUE INDEX "zoho_mail_webhook_configurations_business_environment_key"
  ON "zoho_mail_webhook_configurations"("business_environment");
CREATE UNIQUE INDEX "zoho_inbound_email_events_event_fingerprint_key"
  ON "zoho_inbound_email_events"("event_fingerprint");
CREATE INDEX "zoho_inbound_email_events_reservation_id_idx"
  ON "zoho_inbound_email_events"("reservation_id");
CREATE INDEX "zoho_inbound_email_events_received_at_idx"
  ON "zoho_inbound_email_events"("received_at");
CREATE UNIQUE INDEX "admin_notifications_zoho_inbound_email_event_id_key"
  ON "admin_notifications"("zoho_inbound_email_event_id");

ALTER TABLE "zoho_inbound_email_events"
  ADD CONSTRAINT "zoho_inbound_email_events_reservation_id_fkey"
  FOREIGN KEY ("reservation_id") REFERENCES "reservations"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "admin_notifications"
  ADD CONSTRAINT "admin_notifications_zoho_inbound_email_event_id_fkey"
  FOREIGN KEY ("zoho_inbound_email_event_id") REFERENCES "zoho_inbound_email_events"("id") ON DELETE SET NULL ON UPDATE CASCADE;
