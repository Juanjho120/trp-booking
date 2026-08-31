BEGIN;

ALTER TYPE "payment_purpose"
ADD VALUE 'ADDITIONAL_CHARGE';

ALTER TYPE "payment_submission_source"
ADD VALUE 'ADDITIONAL_CHARGE';

ALTER TYPE "refund_authorization_type"
ADD VALUE 'ADDITIONAL_CHARGE';

ALTER TYPE "email_notification_type"
ADD VALUE 'ADDITIONAL_CHARGE_PAYMENT_REQUIRED';

CREATE TYPE "additional_charge_category" AS ENUM (
    'CLEANING',
    'DAMAGE',
    'TRANSPORT',
    'LATE_CHECKOUT',
    'EXTRA_SERVICE',
    'OTHER'
);

CREATE TYPE "additional_charge_status" AS ENUM (
    'PENDING',
    'PAID',
    'PARTIALLY_REFUNDED',
    'REFUNDED',
    'CANCELLED'
);

CREATE TYPE "guest_payment_request_status" AS ENUM (
    'PENDING',
    'PAID',
    'EXPIRED',
    'CANCELLED'
);

CREATE TABLE "additional_charges" (
    "id" TEXT NOT NULL,
    "reservation_id" TEXT NOT NULL,
    "category" "additional_charge_category" NOT NULL,
    "description" TEXT NOT NULL,
    "internal_note" TEXT,
    "amount" DECIMAL(10,2) NOT NULL,
    "currency" VARCHAR(3) NOT NULL DEFAULT 'USD',
    "status" "additional_charge_status" NOT NULL DEFAULT 'PENDING',
    "created_by_admin_id" TEXT NOT NULL,
    "cancelled_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "additional_charges_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "additional_charges_description_not_blank_check"
        CHECK (char_length(btrim("description")) > 0),
    CONSTRAINT "additional_charges_amount_positive_check"
        CHECK ("amount" > 0),
    CONSTRAINT "additional_charges_currency_usd_check"
        CHECK ("currency" = 'USD')
);

CREATE TABLE "guest_payment_requests" (
    "id" TEXT NOT NULL,
    "reservation_id" TEXT NOT NULL,
    "status" "guest_payment_request_status" NOT NULL DEFAULT 'PENDING',
    "total_amount" DECIMAL(10,2) NOT NULL,
    "currency" VARCHAR(3) NOT NULL DEFAULT 'USD',
    "access_token_hash" VARCHAR(64) NOT NULL,
    "access_token_encrypted" TEXT NOT NULL,
    "expires_at" TIMESTAMP(3) NOT NULL,
    "created_by_admin_id" TEXT NOT NULL,
    "client_request_id" VARCHAR(120) NOT NULL,
    "paid_at" TIMESTAMP(3),
    "cancelled_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "guest_payment_requests_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "guest_payment_requests_total_positive_check"
        CHECK ("total_amount" > 0),
    CONSTRAINT "guest_payment_requests_currency_usd_check"
        CHECK ("currency" = 'USD'),
    CONSTRAINT "guest_payment_requests_token_hash_check"
        CHECK (char_length("access_token_hash") = 64),
    CONSTRAINT "guest_payment_requests_encrypted_token_not_blank_check"
        CHECK (char_length(btrim("access_token_encrypted")) > 0),
    CONSTRAINT "guest_payment_requests_client_request_not_blank_check"
        CHECK (char_length(btrim("client_request_id")) > 0),
    CONSTRAINT "guest_payment_requests_expiry_after_creation_check"
        CHECK ("expires_at" > "created_at")
);

CREATE TABLE "guest_payment_request_items" (
    "id" TEXT NOT NULL,
    "payment_request_id" TEXT NOT NULL,
    "additional_charge_id" TEXT NOT NULL,
    "category_snapshot" "additional_charge_category" NOT NULL,
    "description_snapshot" TEXT NOT NULL,
    "amount_snapshot" DECIMAL(10,2) NOT NULL,
    "currency_snapshot" VARCHAR(3) NOT NULL DEFAULT 'USD',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "guest_payment_request_items_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "guest_payment_request_items_description_not_blank_check"
        CHECK (char_length(btrim("description_snapshot")) > 0),
    CONSTRAINT "guest_payment_request_items_amount_positive_check"
        CHECK ("amount_snapshot" > 0),
    CONSTRAINT "guest_payment_request_items_currency_usd_check"
        CHECK ("currency_snapshot" = 'USD')
);

CREATE TABLE "additional_charge_refund_allocations" (
    "id" TEXT NOT NULL,
    "refund_id" TEXT NOT NULL,
    "additional_charge_id" TEXT NOT NULL,
    "allocated_amount" DECIMAL(10,2) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "additional_charge_refund_allocations_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "additional_charge_refund_allocations_amount_positive_check"
        CHECK ("allocated_amount" > 0)
);

ALTER TABLE "payments"
ADD COLUMN "guest_payment_request_id" TEXT;

ALTER TABLE "email_notifications"
ADD COLUMN "guest_payment_request_id" TEXT;

CREATE UNIQUE INDEX "guest_payment_requests_access_token_hash_key"
ON "guest_payment_requests"("access_token_hash");

CREATE UNIQUE INDEX "guest_payment_requests_client_request_id_key"
ON "guest_payment_requests"("client_request_id");

CREATE INDEX "additional_charges_reservation_id_status_idx"
ON "additional_charges"("reservation_id", "status");

CREATE INDEX "additional_charges_created_by_admin_id_idx"
ON "additional_charges"("created_by_admin_id");

CREATE INDEX "additional_charges_status_idx"
ON "additional_charges"("status");

CREATE INDEX "guest_payment_requests_reservation_id_status_idx"
ON "guest_payment_requests"("reservation_id", "status");

CREATE INDEX "guest_payment_requests_status_expires_at_idx"
ON "guest_payment_requests"("status", "expires_at");

CREATE INDEX "guest_payment_requests_created_by_admin_id_idx"
ON "guest_payment_requests"("created_by_admin_id");

CREATE UNIQUE INDEX "guest_payment_request_items_request_charge_key"
ON "guest_payment_request_items"("payment_request_id", "additional_charge_id");

CREATE INDEX "guest_payment_request_items_additional_charge_id_idx"
ON "guest_payment_request_items"("additional_charge_id");

CREATE UNIQUE INDEX "payments_guest_payment_request_id_key"
ON "payments"("guest_payment_request_id");

CREATE INDEX "email_notifications_guest_payment_request_id_idx"
ON "email_notifications"("guest_payment_request_id");

CREATE UNIQUE INDEX "additional_charge_refund_allocations_refund_charge_key"
ON "additional_charge_refund_allocations"("refund_id", "additional_charge_id");

CREATE INDEX "additional_charge_refund_allocations_additional_charge_id_idx"
ON "additional_charge_refund_allocations"("additional_charge_id");

ALTER TABLE "additional_charges"
ADD CONSTRAINT "additional_charges_reservation_id_fkey"
FOREIGN KEY ("reservation_id") REFERENCES "reservations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "additional_charges"
ADD CONSTRAINT "additional_charges_created_by_admin_id_fkey"
FOREIGN KEY ("created_by_admin_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "guest_payment_requests"
ADD CONSTRAINT "guest_payment_requests_reservation_id_fkey"
FOREIGN KEY ("reservation_id") REFERENCES "reservations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "guest_payment_requests"
ADD CONSTRAINT "guest_payment_requests_created_by_admin_id_fkey"
FOREIGN KEY ("created_by_admin_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "guest_payment_request_items"
ADD CONSTRAINT "guest_payment_request_items_payment_request_id_fkey"
FOREIGN KEY ("payment_request_id") REFERENCES "guest_payment_requests"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "guest_payment_request_items"
ADD CONSTRAINT "guest_payment_request_items_additional_charge_id_fkey"
FOREIGN KEY ("additional_charge_id") REFERENCES "additional_charges"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "payments"
ADD CONSTRAINT "payments_guest_payment_request_id_fkey"
FOREIGN KEY ("guest_payment_request_id") REFERENCES "guest_payment_requests"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "email_notifications"
ADD CONSTRAINT "email_notifications_guest_payment_request_id_fkey"
FOREIGN KEY ("guest_payment_request_id") REFERENCES "guest_payment_requests"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "additional_charge_refund_allocations"
ADD CONSTRAINT "additional_charge_refund_allocations_refund_id_fkey"
FOREIGN KEY ("refund_id") REFERENCES "refunds"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "additional_charge_refund_allocations"
ADD CONSTRAINT "additional_charge_refund_allocations_additional_charge_id_fkey"
FOREIGN KEY ("additional_charge_id") REFERENCES "additional_charges"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

COMMIT;
