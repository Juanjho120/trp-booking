CREATE TABLE "public_location_settings" (
    "id" TEXT NOT NULL DEFAULT 'site',
    "enabled" BOOLEAN NOT NULL DEFAULT false,
    "public_location_es" TEXT,
    "public_location_en" TEXT,
    "map_embed_url" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "public_location_settings_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "public_location_settings_singleton_check" CHECK ("id" = 'site')
);

INSERT INTO "public_location_settings" (
    "id",
    "enabled",
    "created_at",
    "updated_at"
)
VALUES (
    'site',
    false,
    CURRENT_TIMESTAMP,
    CURRENT_TIMESTAMP
)
ON CONFLICT ("id") DO NOTHING;
