-- Add append-only client-side Tilopay SDK event tracking.
-- This stores only operational metadata. It must never store card number, CVV, expiration date, or cardholder-sensitive fields.

CREATE TYPE "payment_client_event_type" AS ENUM (
  'TILOPAY_SDK_START_PAYMENT_FAILED',
  'TILOPAY_SDK_START_PAYMENT_NON_SUCCESS'
);

CREATE TABLE "payment_client_events" (
  "id" TEXT NOT NULL,
  "payment_id" TEXT NOT NULL,
  "reservation_id" TEXT NOT NULL,
  "provider" "payment_provider" NOT NULL DEFAULT 'TILOPAY',
  "event_type" "payment_client_event_type" NOT NULL,
  "environment" TEXT,
  "locale" TEXT,
  "payment_method_id" TEXT,
  "payment_method_name" TEXT,
  "payment_method_type" TEXT,
  "detected_card_brand" TEXT,
  "sdk_message" TEXT,
  "sdk_payload" JSONB,
  "preflight_status" TEXT,
  "preflight_expires_at" TIMESTAMP(3),
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "payment_client_events_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "payment_client_events_payment_id_fkey"
    FOREIGN KEY ("payment_id") REFERENCES "payments"("id")
    ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "payment_client_events_reservation_id_fkey"
    FOREIGN KEY ("reservation_id") REFERENCES "reservations"("id")
    ON DELETE RESTRICT ON UPDATE CASCADE
);

CREATE INDEX "payment_client_events_payment_id_idx" ON "payment_client_events"("payment_id");
CREATE INDEX "payment_client_events_reservation_id_idx" ON "payment_client_events"("reservation_id");
CREATE INDEX "payment_client_events_event_type_idx" ON "payment_client_events"("event_type");
CREATE INDEX "payment_client_events_created_at_idx" ON "payment_client_events"("created_at");
