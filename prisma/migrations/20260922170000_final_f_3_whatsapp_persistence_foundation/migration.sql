CREATE TYPE "whatsapp_message_direction" AS ENUM (
    'INBOUND',
    'OUTBOUND'
);

CREATE TYPE "whatsapp_message_status" AS ENUM (
    'RECEIVED',
    'PENDING',
    'PROCESSING',
    'QUEUED',
    'SENT',
    'DELIVERED',
    'READ',
    'FAILED',
    'UNDELIVERED',
    'SKIPPED'
);

CREATE TYPE "staff_whatsapp_alert_type" AS ENUM (
    'RESERVATION_CONFIRMED',
    'RESERVATION_CANCELLED',
    'CHECK_IN_MINUS_48H',
    'CHECK_OUT_MINUS_6H',
    'REVIEW_SUBMITTED',
    'GUEST_WHATSAPP_RECEIVED',
    'GUEST_EMAIL_RECEIVED'
);

CREATE TYPE "staff_whatsapp_alert_status" AS ENUM (
    'PENDING',
    'PROCESSING',
    'QUEUED',
    'SENT',
    'DELIVERED',
    'READ',
    'FAILED',
    'UNDELIVERED',
    'SKIPPED'
);

CREATE TABLE "whatsapp_conversations" (
    "id" TEXT NOT NULL,
    "guest_phone_e164" VARCHAR(20) NOT NULL,
    "reservation_id" TEXT,
    "unread_count" INTEGER NOT NULL DEFAULT 0,
    "last_message_at" TIMESTAMP(3),
    "last_inbound_at" TIMESTAMP(3),
    "customer_service_window_started_at" TIMESTAMP(3),
    "customer_service_window_expires_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "whatsapp_conversations_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "whatsapp_conversations_guest_phone_e164_check"
        CHECK ("guest_phone_e164" ~ '^\+[1-9][0-9]{7,14}$'),
    CONSTRAINT "whatsapp_conversations_unread_count_nonnegative_check"
        CHECK ("unread_count" >= 0),
    CONSTRAINT "whatsapp_conversations_customer_service_window_check"
        CHECK (
            "customer_service_window_started_at" IS NULL
            OR "customer_service_window_expires_at" IS NULL
            OR "customer_service_window_expires_at" > "customer_service_window_started_at"
        )
);

CREATE TABLE "whatsapp_messages" (
    "id" TEXT NOT NULL,
    "conversation_id" TEXT NOT NULL,
    "direction" "whatsapp_message_direction" NOT NULL,
    "status" "whatsapp_message_status" NOT NULL,
    "body" TEXT,
    "provider_message_sid" VARCHAR(64),
    "media_count" INTEGER NOT NULL DEFAULT 0,
    "media_metadata" JSONB,
    "attempt_count" INTEGER NOT NULL DEFAULT 0,
    "last_attempt_at" TIMESTAMP(3),
    "next_attempt_at" TIMESTAMP(3),
    "processing_started_at" TIMESTAMP(3),
    "sent_at" TIMESTAMP(3),
    "delivered_at" TIMESTAMP(3),
    "read_at" TIMESTAMP(3),
    "failed_at" TIMESTAMP(3),
    "error_code" VARCHAR(100),
    "error_message" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "whatsapp_messages_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "whatsapp_messages_provider_message_sid_check"
        CHECK ("provider_message_sid" IS NULL OR "provider_message_sid" ~ '^SM[0-9A-Za-z]{32}$'),
    CONSTRAINT "whatsapp_messages_media_count_nonnegative_check"
        CHECK ("media_count" >= 0),
    CONSTRAINT "whatsapp_messages_attempt_count_nonnegative_check"
        CHECK ("attempt_count" >= 0),
    CONSTRAINT "whatsapp_messages_body_or_media_check"
        CHECK ("body" IS NOT NULL OR "media_count" > 0)
);

CREATE TABLE "staff_whatsapp_recipients" (
    "id" TEXT NOT NULL,
    "name" VARCHAR(160) NOT NULL,
    "phone_e164" VARCHAR(20) NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT false,
    "opted_in_at" TIMESTAMP(3),
    "reservation_confirmed_enabled" BOOLEAN NOT NULL DEFAULT false,
    "reservation_cancelled_enabled" BOOLEAN NOT NULL DEFAULT false,
    "check_in_reminder_enabled" BOOLEAN NOT NULL DEFAULT false,
    "check_out_reminder_enabled" BOOLEAN NOT NULL DEFAULT false,
    "review_submitted_enabled" BOOLEAN NOT NULL DEFAULT false,
    "guest_whatsapp_received_enabled" BOOLEAN NOT NULL DEFAULT false,
    "guest_email_received_enabled" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "staff_whatsapp_recipients_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "staff_whatsapp_recipients_name_not_blank_check"
        CHECK (char_length(btrim("name")) > 0),
    CONSTRAINT "staff_whatsapp_recipients_phone_e164_check"
        CHECK ("phone_e164" ~ '^\+[1-9][0-9]{7,14}$'),
    CONSTRAINT "staff_whatsapp_recipients_active_opt_in_check"
        CHECK (NOT "active" OR "opted_in_at" IS NOT NULL)
);

CREATE TABLE "staff_whatsapp_alerts" (
    "id" TEXT NOT NULL,
    "recipient_id" TEXT NOT NULL,
    "reservation_id" TEXT,
    "review_id" TEXT,
    "source_whatsapp_message_id" TEXT,
    "type" "staff_whatsapp_alert_type" NOT NULL,
    "status" "staff_whatsapp_alert_status" NOT NULL DEFAULT 'PENDING',
    "deduplication_key" VARCHAR(220) NOT NULL,
    "recipient_phone_e164_snapshot" VARCHAR(20) NOT NULL,
    "scheduled_for" TIMESTAMP(3),
    "reservation_check_in_date_snapshot" DATE,
    "reservation_check_out_date_snapshot" DATE,
    "reservation_check_in_time_snapshot" VARCHAR(16),
    "reservation_check_out_time_snapshot" VARCHAR(16),
    "attempt_count" INTEGER NOT NULL DEFAULT 0,
    "last_attempt_at" TIMESTAMP(3),
    "next_attempt_at" TIMESTAMP(3),
    "processing_started_at" TIMESTAMP(3),
    "provider_message_sid" VARCHAR(64),
    "sent_at" TIMESTAMP(3),
    "delivered_at" TIMESTAMP(3),
    "read_at" TIMESTAMP(3),
    "failed_at" TIMESTAMP(3),
    "error_code" VARCHAR(100),
    "error_message" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "staff_whatsapp_alerts_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "staff_whatsapp_alerts_deduplication_key_not_blank_check"
        CHECK (char_length(btrim("deduplication_key")) > 0),
    CONSTRAINT "staff_whatsapp_alerts_recipient_snapshot_e164_check"
        CHECK ("recipient_phone_e164_snapshot" ~ '^\+[1-9][0-9]{7,14}$'),
    CONSTRAINT "staff_whatsapp_alerts_provider_message_sid_check"
        CHECK ("provider_message_sid" IS NULL OR "provider_message_sid" ~ '^SM[0-9A-Za-z]{32}$'),
    CONSTRAINT "staff_whatsapp_alerts_attempt_count_nonnegative_check"
        CHECK ("attempt_count" >= 0)
);

CREATE UNIQUE INDEX "whatsapp_conversations_guest_phone_e164_key"
ON "whatsapp_conversations"("guest_phone_e164");

CREATE INDEX "whatsapp_conversations_reservation_id_idx"
ON "whatsapp_conversations"("reservation_id");

CREATE INDEX "whatsapp_conversations_last_message_at_idx"
ON "whatsapp_conversations"("last_message_at");

CREATE INDEX "whatsapp_conversations_last_inbound_at_idx"
ON "whatsapp_conversations"("last_inbound_at");

CREATE INDEX "whatsapp_conversations_customer_service_window_expires_at_idx"
ON "whatsapp_conversations"("customer_service_window_expires_at");

CREATE UNIQUE INDEX "whatsapp_messages_provider_message_sid_key"
ON "whatsapp_messages"("provider_message_sid");

CREATE INDEX "whatsapp_messages_conversation_id_created_at_idx"
ON "whatsapp_messages"("conversation_id", "created_at");

CREATE INDEX "whatsapp_messages_status_next_attempt_at_idx"
ON "whatsapp_messages"("status", "next_attempt_at");

CREATE INDEX "whatsapp_messages_direction_idx"
ON "whatsapp_messages"("direction");

CREATE INDEX "whatsapp_messages_created_at_idx"
ON "whatsapp_messages"("created_at");

CREATE UNIQUE INDEX "staff_whatsapp_recipients_phone_e164_key"
ON "staff_whatsapp_recipients"("phone_e164");

CREATE INDEX "staff_whatsapp_recipients_active_idx"
ON "staff_whatsapp_recipients"("active");

CREATE UNIQUE INDEX "staff_whatsapp_alerts_deduplication_key_key"
ON "staff_whatsapp_alerts"("deduplication_key");

CREATE UNIQUE INDEX "staff_whatsapp_alerts_provider_message_sid_key"
ON "staff_whatsapp_alerts"("provider_message_sid");

CREATE INDEX "staff_whatsapp_alerts_recipient_id_idx"
ON "staff_whatsapp_alerts"("recipient_id");

CREATE INDEX "staff_whatsapp_alerts_reservation_id_idx"
ON "staff_whatsapp_alerts"("reservation_id");

CREATE INDEX "staff_whatsapp_alerts_review_id_idx"
ON "staff_whatsapp_alerts"("review_id");

CREATE INDEX "staff_whatsapp_alerts_source_whatsapp_message_id_idx"
ON "staff_whatsapp_alerts"("source_whatsapp_message_id");

CREATE INDEX "staff_whatsapp_alerts_status_next_attempt_at_idx"
ON "staff_whatsapp_alerts"("status", "next_attempt_at");

CREATE INDEX "staff_whatsapp_alerts_type_idx"
ON "staff_whatsapp_alerts"("type");

CREATE INDEX "staff_whatsapp_alerts_scheduled_for_idx"
ON "staff_whatsapp_alerts"("scheduled_for");

ALTER TABLE "whatsapp_conversations"
ADD CONSTRAINT "whatsapp_conversations_reservation_id_fkey"
FOREIGN KEY ("reservation_id") REFERENCES "reservations"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "whatsapp_messages"
ADD CONSTRAINT "whatsapp_messages_conversation_id_fkey"
FOREIGN KEY ("conversation_id") REFERENCES "whatsapp_conversations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "staff_whatsapp_alerts"
ADD CONSTRAINT "staff_whatsapp_alerts_recipient_id_fkey"
FOREIGN KEY ("recipient_id") REFERENCES "staff_whatsapp_recipients"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "staff_whatsapp_alerts"
ADD CONSTRAINT "staff_whatsapp_alerts_reservation_id_fkey"
FOREIGN KEY ("reservation_id") REFERENCES "reservations"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "staff_whatsapp_alerts"
ADD CONSTRAINT "staff_whatsapp_alerts_review_id_fkey"
FOREIGN KEY ("review_id") REFERENCES "reviews"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "staff_whatsapp_alerts"
ADD CONSTRAINT "staff_whatsapp_alerts_source_whatsapp_message_id_fkey"
FOREIGN KEY ("source_whatsapp_message_id") REFERENCES "whatsapp_messages"("id") ON DELETE SET NULL ON UPDATE CASCADE;
