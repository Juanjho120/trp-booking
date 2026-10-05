-- Final-I.6.1 Workstreams B+C: GuestPaymentRequest expiration cron and financial Admin Push types.

ALTER TYPE "cron_job_key"
ADD VALUE IF NOT EXISTS 'EXPIRE_GUEST_PAYMENT_REQUESTS';

ALTER TYPE "admin_notification_type"
ADD VALUE IF NOT EXISTS 'ADDITIONAL_CHARGE_PAID';

ALTER TYPE "admin_notification_type"
ADD VALUE IF NOT EXISTS 'LIFECYCLE_ADJUSTMENT_PAID';

ALTER TYPE "admin_notification_type"
ADD VALUE IF NOT EXISTS 'REFUND_PROCESSED';
