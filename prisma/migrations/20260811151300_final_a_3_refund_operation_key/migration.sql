ALTER TABLE "refunds"
ADD COLUMN "refund_operation_key" TEXT;

CREATE INDEX "refunds_refund_operation_key_idx"
ON "refunds"("refund_operation_key");
