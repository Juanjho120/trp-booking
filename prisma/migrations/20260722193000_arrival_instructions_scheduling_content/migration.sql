-- Phase 10.6: property-owned arrival instructions and scheduled notification metadata.

CREATE TABLE "property_arrival_instructions" (
    "id" TEXT NOT NULL,
    "property_id" TEXT NOT NULL,
    "enabled" BOOLEAN NOT NULL DEFAULT false,
    "lead_time_hours" INTEGER NOT NULL DEFAULT 48,
    "exact_address" TEXT,
    "map_url" TEXT,
    "instructions_es" TEXT,
    "instructions_en" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "property_arrival_instructions_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "property_arrival_instructions_lead_time_hours_check"
      CHECK ("lead_time_hours" >= 1 AND "lead_time_hours" <= 168)
);

CREATE UNIQUE INDEX "property_arrival_instructions_property_id_key"
ON "property_arrival_instructions"("property_id");

CREATE INDEX "property_arrival_instructions_enabled_idx"
ON "property_arrival_instructions"("enabled");

ALTER TABLE "property_arrival_instructions"
ADD CONSTRAINT "property_arrival_instructions_property_id_fkey"
FOREIGN KEY ("property_id") REFERENCES "properties"("id")
ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "email_notifications"
ADD COLUMN "scheduled_for" TIMESTAMP(3),
ADD COLUMN "reservation_check_in_date_snapshot" DATE,
ADD COLUMN "arrival_instructions_version" TIMESTAMP(3);

CREATE INDEX "email_notifications_scheduled_for_idx"
ON "email_notifications"("scheduled_for");

CREATE INDEX "email_notifications_reservation_check_in_date_snapshot_idx"
ON "email_notifications"("reservation_check_in_date_snapshot");

CREATE INDEX "email_notifications_arrival_instructions_version_idx"
ON "email_notifications"("arrival_instructions_version");
