-- Final-F.R5: ADMIN PushSubscription persistence foundation.
-- Stores only authenticated ADMIN device subscriptions; operational notification
-- history/delivery models remain out of scope until Final-F.6.

CREATE TABLE "admin_push_subscriptions" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "endpoint" TEXT NOT NULL,
    "p256dh_key" TEXT NOT NULL,
    "auth_key" TEXT NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "last_used_at" TIMESTAMP(3),
    "revoked_at" TIMESTAMP(3),

    CONSTRAINT "admin_push_subscriptions_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "admin_push_subscriptions_endpoint_key" ON "admin_push_subscriptions"("endpoint");
CREATE INDEX "admin_push_subscriptions_user_id_idx" ON "admin_push_subscriptions"("user_id");
CREATE INDEX "admin_push_subscriptions_active_idx" ON "admin_push_subscriptions"("active");

ALTER TABLE "admin_push_subscriptions"
ADD CONSTRAINT "admin_push_subscriptions_user_id_fkey"
FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
