CREATE TYPE "payment_submission_source" AS ENUM (
  'INITIAL_CHECKOUT',
  'RETRY_PAGE',
  'LIFECYCLE_ADJUSTMENT'
);

CREATE TYPE "payment_submission_status" AS ENUM (
  'STARTED',
  'SUBMITTED',
  'APPROVED',
  'REJECTED',
  'FAILED',
  'UNKNOWN'
);

CREATE TABLE "payment_submission_attempts" (
  "id" TEXT NOT NULL,
  "payment_id" TEXT NOT NULL,
  "reservation_id" TEXT NOT NULL,
  "attempt_number" INTEGER NOT NULL,
  "source" "payment_submission_source" NOT NULL,
  "status" "payment_submission_status" NOT NULL DEFAULT 'STARTED',
  "environment" VARCHAR(40) NOT NULL,
  "locale" VARCHAR(10) NOT NULL,
  "safe_result_code" VARCHAR(100),
  "preflight_expires_at" TIMESTAMP(3),
  "started_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "submitted_at" TIMESTAMP(3),
  "completed_at" TIMESTAMP(3),
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "payment_submission_attempts_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "payment_submission_attempts_reservation_id_attempt_number_key"
  ON "payment_submission_attempts"("reservation_id", "attempt_number");

CREATE INDEX "payment_submission_attempts_payment_id_started_at_idx"
  ON "payment_submission_attempts"("payment_id", "started_at");

CREATE INDEX "payment_submission_attempts_reservation_id_started_at_idx"
  ON "payment_submission_attempts"("reservation_id", "started_at");

CREATE INDEX "payment_submission_attempts_status_idx"
  ON "payment_submission_attempts"("status");

CREATE INDEX "payment_submission_attempts_source_idx"
  ON "payment_submission_attempts"("source");

ALTER TABLE "payment_submission_attempts"
  ADD CONSTRAINT "payment_submission_attempts_payment_id_fkey"
  FOREIGN KEY ("payment_id") REFERENCES "payments"("id")
  ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "payment_submission_attempts"
  ADD CONSTRAINT "payment_submission_attempts_reservation_id_fkey"
  FOREIGN KEY ("reservation_id") REFERENCES "reservations"("id")
  ON DELETE RESTRICT ON UPDATE CASCADE;
