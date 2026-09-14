ALTER TABLE "payments"
DROP CONSTRAINT "payments_purpose_relation_check";

ALTER TABLE "payments"
ADD CONSTRAINT "payments_purpose_relation_check"
CHECK (
    (
        "purpose" = 'INITIAL_RESERVATION'
        AND "lifecycle_request_id" IS NULL
        AND "guest_payment_request_id" IS NULL
    ) OR (
        "purpose" = 'LIFECYCLE_ADJUSTMENT'
        AND "lifecycle_request_id" IS NOT NULL
        AND "guest_payment_request_id" IS NULL
    ) OR (
        "purpose" = 'ADDITIONAL_CHARGE'
        AND "lifecycle_request_id" IS NULL
        AND "guest_payment_request_id" IS NOT NULL
    )
);
