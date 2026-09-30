-- CreateEnum
CREATE TYPE "fel_document_type" AS ENUM ('SMALL_TAXPAYER_INVOICE', 'CREDIT_NOTE');

-- CreateEnum
CREATE TYPE "fel_document_status" AS ENUM ('DRAFT', 'READY', 'SUBMITTING', 'CERTIFIED', 'REJECTED', 'RETRY_PENDING', 'CANCELLATION_PENDING', 'CANCELLED', 'CANCELLATION_FAILED');

-- CreateEnum
CREATE TYPE "fel_line_kind" AS ENUM ('LODGING', 'ADDITIONAL_CHARGE', 'GROUPED_ADDITIONAL_CHARGES');

-- CreateEnum
CREATE TYPE "fel_line_source_type" AS ENUM ('RESERVATION', 'ADDITIONAL_CHARGE', 'GUEST_PAYMENT_REQUEST_ITEM', 'PAYMENT', 'REFUND', 'ADDITIONAL_CHARGE_REFUND_ALLOCATION', 'RESERVATION_LIFECYCLE_REQUEST');

-- CreateEnum
CREATE TYPE "fel_line_source_role" AS ENUM ('AMOUNT_SOURCE', 'SETTLEMENT_EVIDENCE', 'REFUND_EVIDENCE', 'LIFECYCLE_EVIDENCE');

-- CreateTable
CREATE TABLE "fel_documents" (
    "id" TEXT NOT NULL,
    "document_type" "fel_document_type" NOT NULL DEFAULT 'SMALL_TAXPAYER_INVOICE',
    "status" "fel_document_status" NOT NULL DEFAULT 'DRAFT',
    "commercial_currency" VARCHAR(3) NOT NULL,
    "receiver_name" VARCHAR(160) NOT NULL,
    "receiver_identifier_type" VARCHAR(60) NOT NULL,
    "receiver_identifier" VARCHAR(80),
    "receiver_address" TEXT,
    "receiver_email" VARCHAR(254),
    "receiver_country" VARCHAR(100),
    "total" DECIMAL(10,2) NOT NULL,
    "group_extras" BOOLEAN NOT NULL DEFAULT false,
    "original_document_id" TEXT,
    "certification_uuid" VARCHAR(160),
    "series" VARCHAR(80),
    "number" VARCHAR(80),
    "certified_at" TIMESTAMP(3),
    "cancelled_at" TIMESTAMP(3),
    "created_by_admin_id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "fel_documents_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "fel_document_reservations" (
    "id" TEXT NOT NULL,
    "fel_document_id" TEXT NOT NULL,
    "reservation_id" TEXT NOT NULL,
    "property_id" TEXT NOT NULL,
    "property_name_snapshot" VARCHAR(200) NOT NULL,
    "check_in_date" DATE NOT NULL,
    "check_out_date" DATE NOT NULL,
    "guest_count" INTEGER NOT NULL,
    "subtotal_snapshot" DECIMAL(10,2) NOT NULL,
    "cleaning_fee_snapshot" DECIMAL(10,2) NOT NULL,
    "taxes_snapshot" DECIMAL(10,2) NOT NULL,
    "discounts_snapshot" DECIMAL(10,2) NOT NULL,
    "total_snapshot" DECIMAL(10,2) NOT NULL,
    "currency_snapshot" VARCHAR(3) NOT NULL,
    "pricing_snapshot" JSONB,
    "reservation_updated_at_snapshot" TIMESTAMP(3) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "fel_document_reservations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "fel_line_items" (
    "id" TEXT NOT NULL,
    "fel_document_id" TEXT NOT NULL,
    "line_number" INTEGER NOT NULL,
    "kind" "fel_line_kind" NOT NULL,
    "description" TEXT NOT NULL,
    "quantity" DECIMAL(10,2) NOT NULL,
    "unit_price" DECIMAL(10,2) NOT NULL,
    "amount" DECIMAL(10,2) NOT NULL,
    "currency" VARCHAR(3) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "fel_line_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "fel_line_sources" (
    "id" TEXT NOT NULL,
    "fel_line_item_id" TEXT NOT NULL,
    "source_type" "fel_line_source_type" NOT NULL,
    "source_id" VARCHAR(160) NOT NULL,
    "source_role" "fel_line_source_role" NOT NULL,
    "source_snapshot_json" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "fel_line_sources_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "fel_commercial_source_allocations" (
    "id" TEXT NOT NULL,
    "fel_document_id" TEXT NOT NULL,
    "fel_line_item_id" TEXT NOT NULL,
    "reservation_id" TEXT,
    "guest_payment_request_item_id" TEXT,
    "amount_snapshot" DECIMAL(10,2) NOT NULL,
    "currency_snapshot" VARCHAR(3) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "fel_commercial_source_allocations_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "fel_commercial_source_allocations_exactly_one_source_check" CHECK (
        ("reservation_id" IS NOT NULL) <> ("guest_payment_request_item_id" IS NOT NULL)
    )
);

-- CreateTable
CREATE TABLE "fel_provider_attempts" (
    "id" TEXT NOT NULL,
    "fel_document_id" TEXT NOT NULL,
    "operation" VARCHAR(80) NOT NULL,
    "attempt_number" INTEGER NOT NULL,
    "status" VARCHAR(80) NOT NULL,
    "request_fingerprint" VARCHAR(160),
    "provider_reference" VARCHAR(160),
    "error_classification" VARCHAR(120),
    "error_code" VARCHAR(120),
    "error_message" TEXT,
    "response_metadata" JSONB,
    "started_at" TIMESTAMP(3),
    "finished_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "fel_provider_attempts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "fel_credit_allocations" (
    "id" TEXT NOT NULL,
    "credit_document_id" TEXT NOT NULL,
    "original_document_id" TEXT NOT NULL,
    "original_line_item_id" TEXT NOT NULL,
    "refund_id" TEXT,
    "additional_charge_refund_allocation_id" TEXT,
    "lifecycle_request_id" TEXT,
    "amount_snapshot" DECIMAL(10,2),
    "currency_snapshot" VARCHAR(3),
    "source_snapshot_json" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "fel_credit_allocations_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "fel_documents_status_created_at_idx" ON "fel_documents"("status", "created_at");

-- CreateIndex
CREATE INDEX "fel_documents_document_type_idx" ON "fel_documents"("document_type");

-- CreateIndex
CREATE INDEX "fel_documents_created_by_admin_id_idx" ON "fel_documents"("created_by_admin_id");

-- CreateIndex
CREATE INDEX "fel_documents_original_document_id_idx" ON "fel_documents"("original_document_id");

-- CreateIndex
CREATE INDEX "fel_document_reservations_reservation_id_idx" ON "fel_document_reservations"("reservation_id");

-- CreateIndex
CREATE INDEX "fel_document_reservations_property_id_idx" ON "fel_document_reservations"("property_id");

-- CreateIndex
CREATE UNIQUE INDEX "fel_document_reservations_document_reservation_key" ON "fel_document_reservations"("fel_document_id", "reservation_id");

-- CreateIndex
CREATE INDEX "fel_line_items_fel_document_id_idx" ON "fel_line_items"("fel_document_id");

-- CreateIndex
CREATE UNIQUE INDEX "fel_line_items_document_line_number_key" ON "fel_line_items"("fel_document_id", "line_number");

-- CreateIndex
CREATE UNIQUE INDEX "fel_line_items_id_document_id_key" ON "fel_line_items"("id", "fel_document_id");

-- CreateIndex
CREATE INDEX "fel_line_sources_source_type_source_id_idx" ON "fel_line_sources"("source_type", "source_id");

-- CreateIndex
CREATE INDEX "fel_line_sources_fel_line_item_id_idx" ON "fel_line_sources"("fel_line_item_id");

-- CreateIndex
CREATE UNIQUE INDEX "fel_line_sources_line_source_role_key" ON "fel_line_sources"("fel_line_item_id", "source_type", "source_id", "source_role");

-- CreateIndex
CREATE UNIQUE INDEX "fel_commercial_source_allocations_reservation_id_key" ON "fel_commercial_source_allocations"("reservation_id");

-- CreateIndex
CREATE UNIQUE INDEX "fel_commercial_source_allocations_gpri_id_key" ON "fel_commercial_source_allocations"("guest_payment_request_item_id");

-- CreateIndex
CREATE INDEX "fel_commercial_source_allocations_fel_document_id_idx" ON "fel_commercial_source_allocations"("fel_document_id");

-- CreateIndex
CREATE INDEX "fel_commercial_source_allocations_fel_line_item_id_idx" ON "fel_commercial_source_allocations"("fel_line_item_id");

-- CreateIndex
CREATE INDEX "fel_provider_attempts_fel_document_id_operation_idx" ON "fel_provider_attempts"("fel_document_id", "operation");

-- CreateIndex
CREATE INDEX "fel_provider_attempts_status_idx" ON "fel_provider_attempts"("status");

-- CreateIndex
CREATE UNIQUE INDEX "fel_provider_attempts_document_operation_attempt_key" ON "fel_provider_attempts"("fel_document_id", "operation", "attempt_number");

-- CreateIndex
CREATE INDEX "fel_credit_allocations_credit_document_id_idx" ON "fel_credit_allocations"("credit_document_id");

-- CreateIndex
CREATE INDEX "fel_credit_allocations_original_document_id_idx" ON "fel_credit_allocations"("original_document_id");

-- CreateIndex
CREATE INDEX "fel_credit_allocations_original_line_item_id_idx" ON "fel_credit_allocations"("original_line_item_id");

-- CreateIndex
CREATE INDEX "fel_credit_allocations_refund_id_idx" ON "fel_credit_allocations"("refund_id");

-- CreateIndex
CREATE INDEX "fel_credit_allocations_additional_charge_refund_allocation__idx" ON "fel_credit_allocations"("additional_charge_refund_allocation_id");

-- CreateIndex
CREATE INDEX "fel_credit_allocations_lifecycle_request_id_idx" ON "fel_credit_allocations"("lifecycle_request_id");

-- AddForeignKey
ALTER TABLE "fel_documents" ADD CONSTRAINT "fel_documents_created_by_admin_id_fkey" FOREIGN KEY ("created_by_admin_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "fel_documents" ADD CONSTRAINT "fel_documents_original_document_id_fkey" FOREIGN KEY ("original_document_id") REFERENCES "fel_documents"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "fel_document_reservations" ADD CONSTRAINT "fel_document_reservations_fel_document_id_fkey" FOREIGN KEY ("fel_document_id") REFERENCES "fel_documents"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "fel_document_reservations" ADD CONSTRAINT "fel_document_reservations_reservation_id_fkey" FOREIGN KEY ("reservation_id") REFERENCES "reservations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "fel_document_reservations" ADD CONSTRAINT "fel_document_reservations_property_id_fkey" FOREIGN KEY ("property_id") REFERENCES "properties"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "fel_line_items" ADD CONSTRAINT "fel_line_items_fel_document_id_fkey" FOREIGN KEY ("fel_document_id") REFERENCES "fel_documents"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "fel_line_sources" ADD CONSTRAINT "fel_line_sources_fel_line_item_id_fkey" FOREIGN KEY ("fel_line_item_id") REFERENCES "fel_line_items"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "fel_commercial_source_allocations" ADD CONSTRAINT "fel_commercial_source_allocations_fel_document_id_fkey" FOREIGN KEY ("fel_document_id") REFERENCES "fel_documents"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "fel_commercial_source_allocations" ADD CONSTRAINT "fel_commercial_source_allocations_fel_line_item_id_fel_doc_fkey" FOREIGN KEY ("fel_line_item_id", "fel_document_id") REFERENCES "fel_line_items"("id", "fel_document_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "fel_commercial_source_allocations" ADD CONSTRAINT "fel_commercial_source_allocations_reservation_id_fkey" FOREIGN KEY ("reservation_id") REFERENCES "reservations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "fel_commercial_source_allocations" ADD CONSTRAINT "fel_commercial_source_allocations_guest_payment_request_it_fkey" FOREIGN KEY ("guest_payment_request_item_id") REFERENCES "guest_payment_request_items"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "fel_provider_attempts" ADD CONSTRAINT "fel_provider_attempts_fel_document_id_fkey" FOREIGN KEY ("fel_document_id") REFERENCES "fel_documents"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "fel_credit_allocations" ADD CONSTRAINT "fel_credit_allocations_credit_document_id_fkey" FOREIGN KEY ("credit_document_id") REFERENCES "fel_documents"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "fel_credit_allocations" ADD CONSTRAINT "fel_credit_allocations_original_document_id_fkey" FOREIGN KEY ("original_document_id") REFERENCES "fel_documents"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "fel_credit_allocations" ADD CONSTRAINT "fel_credit_allocations_original_line_item_id_fkey" FOREIGN KEY ("original_line_item_id") REFERENCES "fel_line_items"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "fel_credit_allocations" ADD CONSTRAINT "fel_credit_allocations_refund_id_fkey" FOREIGN KEY ("refund_id") REFERENCES "refunds"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "fel_credit_allocations" ADD CONSTRAINT "fel_credit_allocations_additional_charge_refund_allocation_fkey" FOREIGN KEY ("additional_charge_refund_allocation_id") REFERENCES "additional_charge_refund_allocations"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "fel_credit_allocations" ADD CONSTRAINT "fel_credit_allocations_lifecycle_request_id_fkey" FOREIGN KEY ("lifecycle_request_id") REFERENCES "reservation_lifecycle_requests"("id") ON DELETE SET NULL ON UPDATE CASCADE;
