-- Phase 11.5.5: classify negative-difference and compensating refunds separately.
ALTER TYPE "refund_authorization_type"
ADD VALUE IF NOT EXISTS 'LIFECYCLE_ADJUSTMENT';
