BEGIN;

CREATE TABLE "seasonal_pricing_rules" (
    "id" TEXT NOT NULL,
    "property_id" TEXT NOT NULL,
    "name" VARCHAR(160) NOT NULL,
    "start_date" DATE NOT NULL,
    "end_date" DATE NOT NULL,
    "nightly_rate" DECIMAL(10,2) NOT NULL,
    "is_enabled" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "deleted_at" TIMESTAMP(3),

    CONSTRAINT "seasonal_pricing_rules_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "seasonal_pricing_rules_name_not_blank_check"
        CHECK (char_length(btrim("name")) > 0),
    CONSTRAINT "seasonal_pricing_rules_date_range_check"
        CHECK ("start_date" < "end_date"),
    CONSTRAINT "seasonal_pricing_rules_nightly_rate_positive_check"
        CHECK ("nightly_rate" > 0)
);

CREATE TABLE "length_of_stay_pricing_rules" (
    "id" TEXT NOT NULL,
    "property_id" TEXT NOT NULL,
    "minimum_nights" INTEGER NOT NULL,
    "nightly_rate" DECIMAL(10,2) NOT NULL,
    "is_enabled" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "deleted_at" TIMESTAMP(3),

    CONSTRAINT "length_of_stay_pricing_rules_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "length_of_stay_pricing_rules_supported_tier_check"
        CHECK ("minimum_nights" IN (2, 3, 4, 5, 6, 7, 15, 30)),
    CONSTRAINT "length_of_stay_pricing_rules_nightly_rate_positive_check"
        CHECK ("nightly_rate" > 0)
);

ALTER TABLE "reservations"
ADD COLUMN "pricing_snapshot" JSONB;

ALTER TABLE "reservation_lifecycle_requests"
ADD COLUMN "original_pricing_snapshot" JSONB,
ADD COLUMN "requested_pricing_snapshot" JSONB;

CREATE INDEX "seasonal_pricing_active_range_idx"
ON "seasonal_pricing_rules"("property_id", "is_enabled", "deleted_at", "start_date", "end_date");

CREATE UNIQUE INDEX "los_pricing_property_tier_key"
ON "length_of_stay_pricing_rules"("property_id", "minimum_nights");

CREATE INDEX "los_pricing_active_lookup_idx"
ON "length_of_stay_pricing_rules"("property_id", "is_enabled", "deleted_at");

ALTER TABLE "seasonal_pricing_rules"
ADD CONSTRAINT "seasonal_pricing_rules_property_id_fkey"
FOREIGN KEY ("property_id") REFERENCES "properties"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "length_of_stay_pricing_rules"
ADD CONSTRAINT "length_of_stay_pricing_rules_property_id_fkey"
FOREIGN KEY ("property_id") REFERENCES "properties"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

COMMIT;
