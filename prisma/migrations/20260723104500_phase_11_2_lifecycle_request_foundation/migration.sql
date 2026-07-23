-- Phase 11.2: typed lifecycle requests, audit snapshots, adjustment-payment linkage,
-- refund processing-mode normalization, and temporary requested-date holds.

CREATE TYPE "payment_purpose" AS ENUM (
    'INITIAL_RESERVATION',
    'LIFECYCLE_ADJUSTMENT'
);

CREATE TYPE "refund_processing_mode" AS ENUM (
    'LEGACY_UNSPECIFIED',
    'TILOPAY_API',
    'TILOPAY_PORTAL_FALLBACK'
);

CREATE TYPE "reservation_lifecycle_request_type" AS ENUM (
    'CANCELLATION',
    'DATE_CHANGE',
    'STAY_EXTENSION'
);

CREATE TYPE "reservation_lifecycle_request_status" AS ENUM (
    'PENDING_REVIEW',
    'APPROVED',
    'REJECTED',
    'AWAITING_ADJUSTMENT_PAYMENT',
    'COMPLETED',
    'WITHDRAWN',
    'EXPIRED',
    'FAILED'
);

CREATE TYPE "reservation_lifecycle_request_channel" AS ENUM (
    'EMAIL',
    'PHONE',
    'WHATSAPP',
    'OTHER'
);

CREATE TYPE "cancellation_policy_version" AS ENUM (
    'DIRECT_BOOKING_2026_07_23'
);

CREATE TYPE "cancellation_policy_reason_code" AS ENUM (
    'NOT_APPLICABLE',
    'AT_LEAST_168_HOURS',
    'BETWEEN_72_AND_168_HOURS',
    'LESS_THAN_72_HOURS'
);

CREATE TYPE "lifecycle_request_hold_status" AS ENUM (
    'ACTIVE',
    'RELEASED',
    'EXPIRED'
);

ALTER TYPE "refund_status" ADD VALUE IF NOT EXISTS 'PROCESSING' BEFORE 'APPROVED';

CREATE TABLE "reservation_lifecycle_requests" (
    "id" TEXT NOT NULL,
    "reservation_id" TEXT NOT NULL,
    "source_payment_id" TEXT,
    "request_type" "reservation_lifecycle_request_type" NOT NULL,
    "status" "reservation_lifecycle_request_status" NOT NULL DEFAULT 'PENDING_REVIEW',
    "channel" "reservation_lifecycle_request_channel" NOT NULL,
    "requester_name" VARCHAR(160) NOT NULL,
    "requester_email" VARCHAR(254),
    "requester_phone" VARCHAR(40),
    "request_note" TEXT,
    "client_request_id" VARCHAR(120) NOT NULL,
    "idempotency_key" VARCHAR(180) NOT NULL,

    "original_reservation_status" "reservation_status" NOT NULL,
    "original_check_in_date" DATE NOT NULL,
    "original_check_out_date" DATE NOT NULL,
    "original_guest_name" VARCHAR(160) NOT NULL,
    "original_guest_email" VARCHAR(254) NOT NULL,
    "original_guest_phone" VARCHAR(40),
    "original_guest_country" VARCHAR(100),
    "original_preferred_locale" VARCHAR(10) NOT NULL,
    "original_guest_count" INTEGER NOT NULL,
    "original_subtotal" DECIMAL(10,2) NOT NULL,
    "original_cleaning_fee" DECIMAL(10,2) NOT NULL,
    "original_taxes" DECIMAL(10,2) NOT NULL,
    "original_discounts" DECIMAL(10,2) NOT NULL,
    "original_total" DECIMAL(10,2) NOT NULL,
    "currency" VARCHAR(3) NOT NULL DEFAULT 'USD',

    "requested_check_in_date" DATE,
    "requested_check_out_date" DATE,
    "requested_guest_count" INTEGER,
    "requested_subtotal" DECIMAL(10,2),
    "requested_cleaning_fee" DECIMAL(10,2),
    "requested_taxes" DECIMAL(10,2),
    "requested_discounts" DECIMAL(10,2),
    "requested_total" DECIMAL(10,2),
    "financial_difference" DECIMAL(10,2),

    "cancellation_policy_version" "cancellation_policy_version",
    "policy_timezone" VARCHAR(64),
    "policy_calculated_at" TIMESTAMP(3),
    "policy_check_in_at" TIMESTAMP(3),
    "policy_hours_before_check_in" DECIMAL(12,6),
    "policy_reason_code" "cancellation_policy_reason_code" NOT NULL DEFAULT 'NOT_APPLICABLE',
    "standard_refund_percentage" INTEGER,
    "standard_refund_amount" DECIMAL(10,2),
    "approved_refund_percentage" INTEGER,
    "approved_refund_amount" DECIMAL(10,2),
    "policy_exception_applied" BOOLEAN NOT NULL DEFAULT false,
    "policy_exception_reason" TEXT,

    "created_by_admin_id" TEXT NOT NULL,
    "reviewed_by_admin_id" TEXT,
    "decision_reason_code" VARCHAR(100),
    "decision_note" TEXT,
    "failure_code" VARCHAR(100),
    "requested_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "reviewed_at" TIMESTAMP(3),
    "decided_at" TIMESTAMP(3),
    "completed_at" TIMESTAMP(3),
    "failed_at" TIMESTAMP(3),
    "withdrawn_at" TIMESTAMP(3),
    "expired_at" TIMESTAMP(3),
    "expected_reservation_updated_at" TIMESTAMP(3) NOT NULL,
    "version" INTEGER NOT NULL DEFAULT 1,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "reservation_lifecycle_requests_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "lifecycle_requests_original_dates_check"
      CHECK ("original_check_in_date" < "original_check_out_date"),
    CONSTRAINT "lifecycle_requests_original_guests_check"
      CHECK ("original_guest_count" > 0),
    CONSTRAINT "lifecycle_requests_original_amounts_check"
      CHECK (
        "original_subtotal" >= 0 AND
        "original_cleaning_fee" >= 0 AND
        "original_taxes" >= 0 AND
        "original_discounts" >= 0 AND
        "original_total" >= 0
      ),
    CONSTRAINT "lifecycle_requests_requested_shape_check"
      CHECK (
        (
          "request_type" = 'CANCELLATION' AND
          "requested_check_in_date" IS NULL AND
          "requested_check_out_date" IS NULL
        ) OR (
          "request_type" IN ('DATE_CHANGE', 'STAY_EXTENSION') AND
          "requested_check_in_date" IS NOT NULL AND
          "requested_check_out_date" IS NOT NULL AND
          "requested_check_in_date" < "requested_check_out_date"
        )
      ),
    CONSTRAINT "lifecycle_requests_date_change_delta_check"
      CHECK (
        "request_type" <> 'DATE_CHANGE' OR
        "requested_check_in_date" <> "original_check_in_date" OR
        "requested_check_out_date" <> "original_check_out_date"
      ),
    CONSTRAINT "lifecycle_requests_extension_shape_check"
      CHECK (
        "request_type" <> 'STAY_EXTENSION' OR (
          "requested_check_in_date" = "original_check_in_date" AND
          "requested_check_out_date" > "original_check_out_date"
        )
      ),
    CONSTRAINT "lifecycle_requests_requested_guests_check"
      CHECK ("requested_guest_count" IS NULL OR "requested_guest_count" > 0),
    CONSTRAINT "lifecycle_requests_requested_amounts_check"
      CHECK (
        ("requested_subtotal" IS NULL OR "requested_subtotal" >= 0) AND
        ("requested_cleaning_fee" IS NULL OR "requested_cleaning_fee" >= 0) AND
        ("requested_taxes" IS NULL OR "requested_taxes" >= 0) AND
        ("requested_discounts" IS NULL OR "requested_discounts" >= 0) AND
        ("requested_total" IS NULL OR "requested_total" >= 0)
      ),
    CONSTRAINT "lifecycle_requests_policy_percentage_check"
      CHECK (
        ("standard_refund_percentage" IS NULL OR "standard_refund_percentage" BETWEEN 0 AND 100) AND
        ("approved_refund_percentage" IS NULL OR "approved_refund_percentage" BETWEEN 0 AND 100)
      ),
    CONSTRAINT "lifecycle_requests_policy_amount_check"
      CHECK (
        ("standard_refund_amount" IS NULL OR "standard_refund_amount" >= 0) AND
        ("approved_refund_amount" IS NULL OR "approved_refund_amount" >= 0)
      ),
    CONSTRAINT "lifecycle_requests_approved_refund_pair_check"
      CHECK (
        ("approved_refund_percentage" IS NULL AND "approved_refund_amount" IS NULL) OR
        ("approved_refund_percentage" IS NOT NULL AND "approved_refund_amount" IS NOT NULL)
      ),
    CONSTRAINT "lifecycle_requests_cancellation_policy_check"
      CHECK (
        (
          "request_type" <> 'CANCELLATION' AND
          "cancellation_policy_version" IS NULL AND
          "policy_timezone" IS NULL AND
          "policy_calculated_at" IS NULL AND
          "policy_check_in_at" IS NULL AND
          "policy_hours_before_check_in" IS NULL AND
          "policy_reason_code" = 'NOT_APPLICABLE' AND
          "standard_refund_percentage" IS NULL AND
          "standard_refund_amount" IS NULL AND
          "approved_refund_percentage" IS NULL AND
          "approved_refund_amount" IS NULL AND
          "policy_exception_applied" = false AND
          "policy_exception_reason" IS NULL
        ) OR (
          "request_type" = 'CANCELLATION' AND
          "cancellation_policy_version" = 'DIRECT_BOOKING_2026_07_23' AND
          "policy_timezone" = 'America/Guatemala' AND
          "policy_calculated_at" IS NOT NULL AND
          "policy_check_in_at" IS NOT NULL AND
          "policy_hours_before_check_in" IS NOT NULL AND
          "standard_refund_percentage" IS NOT NULL AND
          "standard_refund_amount" IS NOT NULL AND
          (
            (
              "policy_reason_code" = 'AT_LEAST_168_HOURS' AND
              "policy_calculated_at" <= "policy_check_in_at" - INTERVAL '168 hours' AND
              "standard_refund_percentage" = 100
            ) OR (
              "policy_reason_code" = 'BETWEEN_72_AND_168_HOURS' AND
              "policy_calculated_at" > "policy_check_in_at" - INTERVAL '168 hours' AND
              "policy_calculated_at" <= "policy_check_in_at" - INTERVAL '72 hours' AND
              "standard_refund_percentage" = 50
            ) OR (
              "policy_reason_code" = 'LESS_THAN_72_HOURS' AND
              "policy_calculated_at" > "policy_check_in_at" - INTERVAL '72 hours' AND
              "standard_refund_percentage" = 0
            )
          )
        )
      ),
    CONSTRAINT "lifecycle_requests_policy_exception_check"
      CHECK (
        ("policy_exception_applied" = false AND "policy_exception_reason" IS NULL) OR
        ("policy_exception_applied" = true AND NULLIF(BTRIM("policy_exception_reason"), '') IS NOT NULL)
      ),
    CONSTRAINT "lifecycle_requests_standard_decision_check"
      CHECK (
        "policy_exception_applied" = true OR
        "approved_refund_percentage" IS NULL OR (
          "approved_refund_percentage" = "standard_refund_percentage" AND
          "approved_refund_amount" = "standard_refund_amount"
        )
      ),
    CONSTRAINT "lifecycle_requests_version_check"
      CHECK ("version" >= 1)
);

CREATE UNIQUE INDEX "reservation_lifecycle_requests_client_request_id_key"
ON "reservation_lifecycle_requests"("client_request_id");

CREATE UNIQUE INDEX "reservation_lifecycle_requests_idempotency_key_key"
ON "reservation_lifecycle_requests"("idempotency_key");

CREATE INDEX "lifecycle_requests_reservation_status_idx"
ON "reservation_lifecycle_requests"("reservation_id", "status");

CREATE INDEX "lifecycle_requests_type_status_idx"
ON "reservation_lifecycle_requests"("request_type", "status");

CREATE INDEX "lifecycle_requests_source_payment_idx"
ON "reservation_lifecycle_requests"("source_payment_id");

CREATE INDEX "lifecycle_requests_created_by_idx"
ON "reservation_lifecycle_requests"("created_by_admin_id");

CREATE INDEX "lifecycle_requests_reviewed_by_idx"
ON "reservation_lifecycle_requests"("reviewed_by_admin_id");

CREATE INDEX "lifecycle_requests_requested_at_idx"
ON "reservation_lifecycle_requests"("requested_at");

ALTER TABLE "payments"
ADD COLUMN "purpose" "payment_purpose" NOT NULL DEFAULT 'INITIAL_RESERVATION',
ADD COLUMN "lifecycle_request_id" TEXT;

CREATE INDEX "payments_lifecycle_request_id_idx"
ON "payments"("lifecycle_request_id");

CREATE INDEX "payments_purpose_idx"
ON "payments"("purpose");

ALTER TABLE "payments"
ADD CONSTRAINT "payments_purpose_relation_check"
CHECK (
    ("purpose" = 'INITIAL_RESERVATION' AND "lifecycle_request_id" IS NULL) OR
    ("purpose" = 'LIFECYCLE_ADJUSTMENT' AND "lifecycle_request_id" IS NOT NULL)
);

ALTER TABLE "refunds"
ADD COLUMN "lifecycle_request_id" TEXT,
ADD COLUMN "requested_by_admin_id" TEXT,
ADD COLUMN "client_request_id" TEXT,
ADD COLUMN "idempotency_key" TEXT,
ADD COLUMN "processing_mode" "refund_processing_mode",
ADD COLUMN "processing_started_at" TIMESTAMP(3),
ADD COLUMN "approved_at" TIMESTAMP(3),
ADD COLUMN "failed_at" TIMESTAMP(3),
ADD COLUMN "failure_code" VARCHAR(100);

UPDATE "refunds"
SET "processing_mode" = CASE
    WHEN "status" = 'MANUAL'::"refund_status"
      THEN 'TILOPAY_PORTAL_FALLBACK'::"refund_processing_mode"
    ELSE 'LEGACY_UNSPECIFIED'::"refund_processing_mode"
END;

ALTER TABLE "refunds"
ALTER COLUMN "processing_mode" SET NOT NULL,
ALTER COLUMN "processing_mode" SET DEFAULT 'TILOPAY_API';

CREATE UNIQUE INDEX "refunds_client_request_id_key"
ON "refunds"("client_request_id");

CREATE UNIQUE INDEX "refunds_idempotency_key_key"
ON "refunds"("idempotency_key");

CREATE INDEX "refunds_lifecycle_request_id_idx"
ON "refunds"("lifecycle_request_id");

CREATE INDEX "refunds_requested_by_admin_id_idx"
ON "refunds"("requested_by_admin_id");

CREATE INDEX "refunds_status_processing_mode_idx"
ON "refunds"("status", "processing_mode");

ALTER TABLE "refunds"
ADD CONSTRAINT "refunds_legacy_manual_mode_check"
CHECK (
    "status" <> 'MANUAL' OR
    "processing_mode" = 'TILOPAY_PORTAL_FALLBACK'
);

CREATE TABLE "lifecycle_request_holds" (
    "id" TEXT NOT NULL,
    "lifecycle_request_id" TEXT NOT NULL,
    "property_id" TEXT NOT NULL,
    "start_date" DATE NOT NULL,
    "end_date" DATE NOT NULL,
    "preparation_days_before" INTEGER NOT NULL,
    "preparation_days_after" INTEGER NOT NULL,
    "status" "lifecycle_request_hold_status" NOT NULL DEFAULT 'ACTIVE',
    "expires_at" TIMESTAMP(3) NOT NULL,
    "released_at" TIMESTAMP(3),
    "expired_at" TIMESTAMP(3),
    "release_reason_code" VARCHAR(100),
    "version" INTEGER NOT NULL DEFAULT 1,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "lifecycle_request_holds_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "lifecycle_request_holds_dates_check"
      CHECK ("start_date" < "end_date"),
    CONSTRAINT "lifecycle_request_holds_preparation_check"
      CHECK (
        "preparation_days_before" BETWEEN 0 AND 30 AND
        "preparation_days_after" BETWEEN 0 AND 30
      ),
    CONSTRAINT "lifecycle_request_holds_expiration_check"
      CHECK ("expires_at" > "created_at"),
    CONSTRAINT "lifecycle_request_holds_version_check"
      CHECK ("version" >= 1)
);

CREATE UNIQUE INDEX "lifecycle_request_holds_lifecycle_request_id_key"
ON "lifecycle_request_holds"("lifecycle_request_id");

CREATE INDEX "lifecycle_request_holds_property_dates_idx"
ON "lifecycle_request_holds"("property_id", "start_date", "end_date");

CREATE INDEX "lifecycle_request_holds_status_expires_at_idx"
ON "lifecycle_request_holds"("status", "expires_at");

ALTER TABLE "reservation_lifecycle_requests"
ADD CONSTRAINT "lifecycle_requests_reservation_id_fkey"
FOREIGN KEY ("reservation_id") REFERENCES "reservations"("id")
ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "reservation_lifecycle_requests"
ADD CONSTRAINT "lifecycle_requests_source_payment_id_fkey"
FOREIGN KEY ("source_payment_id") REFERENCES "payments"("id")
ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "reservation_lifecycle_requests"
ADD CONSTRAINT "lifecycle_requests_created_by_admin_id_fkey"
FOREIGN KEY ("created_by_admin_id") REFERENCES "users"("id")
ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "reservation_lifecycle_requests"
ADD CONSTRAINT "lifecycle_requests_reviewed_by_admin_id_fkey"
FOREIGN KEY ("reviewed_by_admin_id") REFERENCES "users"("id")
ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "payments"
ADD CONSTRAINT "payments_lifecycle_request_id_fkey"
FOREIGN KEY ("lifecycle_request_id") REFERENCES "reservation_lifecycle_requests"("id")
ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "refunds"
ADD CONSTRAINT "refunds_lifecycle_request_id_fkey"
FOREIGN KEY ("lifecycle_request_id") REFERENCES "reservation_lifecycle_requests"("id")
ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "refunds"
ADD CONSTRAINT "refunds_requested_by_admin_id_fkey"
FOREIGN KEY ("requested_by_admin_id") REFERENCES "users"("id")
ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "lifecycle_request_holds"
ADD CONSTRAINT "lifecycle_request_holds_lifecycle_request_id_fkey"
FOREIGN KEY ("lifecycle_request_id") REFERENCES "reservation_lifecycle_requests"("id")
ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "lifecycle_request_holds"
ADD CONSTRAINT "lifecycle_request_holds_property_id_fkey"
FOREIGN KEY ("property_id") REFERENCES "properties"("id")
ON DELETE RESTRICT ON UPDATE CASCADE;
