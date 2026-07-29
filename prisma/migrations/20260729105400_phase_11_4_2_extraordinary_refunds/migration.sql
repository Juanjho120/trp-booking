-- Phase 11.4.2: persist whether each refund authorization follows the
-- cancellation policy or is an explicit administrative exception.
-- Existing rows are retained conservatively as legacy/unspecified; new rows
-- default to the standard-policy path unless explicitly extraordinary.

CREATE TYPE "refund_authorization_type" AS ENUM (
    'LEGACY_UNSPECIFIED',
    'STANDARD_POLICY',
    'EXTRAORDINARY'
);

ALTER TABLE "refunds"
ADD COLUMN "authorization_type" "refund_authorization_type" NOT NULL DEFAULT 'LEGACY_UNSPECIFIED';

ALTER TABLE "refunds"
ALTER COLUMN "authorization_type" SET DEFAULT 'STANDARD_POLICY';

CREATE INDEX "refunds_lifecycle_request_authorization_status_idx"
ON "refunds"("lifecycle_request_id", "authorization_type", "status");
