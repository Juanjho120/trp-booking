ALTER TYPE "cron_job_key"
ADD VALUE IF NOT EXISTS 'SCHEDULE_REVIEW_INVITATIONS';

ALTER TYPE "email_notification_type"
ADD VALUE IF NOT EXISTS 'REVIEW_INVITATION';

CREATE TYPE "review_invitation_status" AS ENUM (
    'ACTIVE',
    'CONSUMED',
    'EXPIRED',
    'CANCELLED'
);

CREATE TYPE "review_moderation_status" AS ENUM (
    'PENDING',
    'PUBLISHED',
    'HIDDEN'
);

CREATE TABLE "review_invitations" (
    "id" TEXT NOT NULL,
    "reservation_id" TEXT NOT NULL,
    "status" "review_invitation_status" NOT NULL DEFAULT 'ACTIVE',
    "access_token_hash" VARCHAR(64) NOT NULL,
    "access_token_encrypted" TEXT,
    "checkout_at_snapshot" TIMESTAMP(3) NOT NULL,
    "eligible_at" TIMESTAMP(3) NOT NULL,
    "expires_at" TIMESTAMP(3) NOT NULL,
    "consumed_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "review_invitations_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "review_invitations_access_token_hash_check"
        CHECK ("access_token_hash" ~ '^[0-9a-f]{64}$'),
    CONSTRAINT "review_invitations_encrypted_token_not_blank_check"
        CHECK ("access_token_encrypted" IS NULL OR char_length(btrim("access_token_encrypted")) > 0),
    CONSTRAINT "review_invitations_expiry_after_creation_check"
        CHECK ("expires_at" > "created_at"),
    CONSTRAINT "review_invitations_eligible_after_checkout_check"
        CHECK ("eligible_at" >= "checkout_at_snapshot"),
    CONSTRAINT "review_invitations_consumed_at_status_check"
        CHECK (("status" = 'CONSUMED') = ("consumed_at" IS NOT NULL))
);

CREATE TABLE "reviews" (
    "id" TEXT NOT NULL,
    "reservation_id" TEXT NOT NULL,
    "property_id" TEXT NOT NULL,
    "rating" INTEGER NOT NULL,
    "comment" TEXT NOT NULL,
    "guest_display_name" VARCHAR(120) NOT NULL,
    "moderation_status" "review_moderation_status" NOT NULL DEFAULT 'PENDING',
    "submitted_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "published_at" TIMESTAMP(3),
    "moderated_at" TIMESTAMP(3),
    "moderated_by_admin_id" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "reviews_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "reviews_rating_check"
        CHECK ("rating" BETWEEN 1 AND 5),
    CONSTRAINT "reviews_comment_length_check"
        CHECK (char_length(btrim("comment")) BETWEEN 1 AND 2000),
    CONSTRAINT "reviews_guest_display_name_not_blank_check"
        CHECK (char_length(btrim("guest_display_name")) > 0)
);

ALTER TABLE "email_notifications"
ADD COLUMN "review_invitation_id" TEXT;

CREATE UNIQUE INDEX "review_invitations_reservation_id_key"
ON "review_invitations"("reservation_id");

CREATE UNIQUE INDEX "review_invitations_access_token_hash_key"
ON "review_invitations"("access_token_hash");

CREATE INDEX "review_invitations_status_idx"
ON "review_invitations"("status");

CREATE INDEX "review_invitations_eligible_at_idx"
ON "review_invitations"("eligible_at");

CREATE INDEX "review_invitations_expires_at_idx"
ON "review_invitations"("expires_at");

CREATE UNIQUE INDEX "reviews_reservation_id_key"
ON "reviews"("reservation_id");

CREATE INDEX "reviews_property_id_idx"
ON "reviews"("property_id");

CREATE INDEX "reviews_moderation_status_idx"
ON "reviews"("moderation_status");

CREATE INDEX "reviews_submitted_at_idx"
ON "reviews"("submitted_at");

CREATE INDEX "reviews_moderated_by_admin_id_idx"
ON "reviews"("moderated_by_admin_id");

CREATE INDEX "email_notifications_review_invitation_id_idx"
ON "email_notifications"("review_invitation_id");

ALTER TABLE "review_invitations"
ADD CONSTRAINT "review_invitations_reservation_id_fkey"
FOREIGN KEY ("reservation_id") REFERENCES "reservations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "reviews"
ADD CONSTRAINT "reviews_reservation_id_fkey"
FOREIGN KEY ("reservation_id") REFERENCES "reservations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "reviews"
ADD CONSTRAINT "reviews_property_id_fkey"
FOREIGN KEY ("property_id") REFERENCES "properties"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "reviews"
ADD CONSTRAINT "reviews_moderated_by_admin_id_fkey"
FOREIGN KEY ("moderated_by_admin_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "email_notifications"
ADD CONSTRAINT "email_notifications_review_invitation_id_fkey"
FOREIGN KEY ("review_invitation_id") REFERENCES "review_invitations"("id") ON DELETE SET NULL ON UPDATE CASCADE;
