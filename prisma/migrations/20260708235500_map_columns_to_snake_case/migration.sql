-- Map existing Prisma-created PostgreSQL identifiers to snake_case while preserving data.
-- TypeScript/Prisma field names remain unchanged via @map in prisma/schema.prisma.
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_type WHERE typname = 'UserRole')
     AND NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'user_role') THEN
    ALTER TYPE "UserRole" RENAME TO user_role;
  END IF;
END $$;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_type WHERE typname = 'PropertyStatus')
     AND NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'property_status') THEN
    ALTER TYPE "PropertyStatus" RENAME TO property_status;
  END IF;
END $$;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_type WHERE typname = 'ReservationStatus')
     AND NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'reservation_status') THEN
    ALTER TYPE "ReservationStatus" RENAME TO reservation_status;
  END IF;
END $$;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_type WHERE typname = 'PaymentProvider')
     AND NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'payment_provider') THEN
    ALTER TYPE "PaymentProvider" RENAME TO payment_provider;
  END IF;
END $$;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_type WHERE typname = 'PaymentStatus')
     AND NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'payment_status') THEN
    ALTER TYPE "PaymentStatus" RENAME TO payment_status;
  END IF;
END $$;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_type WHERE typname = 'RefundStatus')
     AND NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'refund_status') THEN
    ALTER TYPE "RefundStatus" RENAME TO refund_status;
  END IF;
END $$;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_type WHERE typname = 'CalendarBlockSource')
     AND NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'calendar_block_source') THEN
    ALTER TYPE "CalendarBlockSource" RENAME TO calendar_block_source;
  END IF;
END $$;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_type WHERE typname = 'ExternalCalendarProvider')
     AND NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'external_calendar_provider') THEN
    ALTER TYPE "ExternalCalendarProvider" RENAME TO external_calendar_provider;
  END IF;
END $$;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_type WHERE typname = 'ExternalCalendarStatus')
     AND NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'external_calendar_status') THEN
    ALTER TYPE "ExternalCalendarStatus" RENAME TO external_calendar_status;
  END IF;
END $$;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_type WHERE typname = 'ExternalCalendarDirection')
     AND NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'external_calendar_direction') THEN
    ALTER TYPE "ExternalCalendarDirection" RENAME TO external_calendar_direction;
  END IF;
END $$;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_type WHERE typname = 'ExternalCalendarEventStatus')
     AND NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'external_calendar_event_status') THEN
    ALTER TYPE "ExternalCalendarEventStatus" RENAME TO external_calendar_event_status;
  END IF;
END $$;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_type WHERE typname = 'CalendarSyncTriggeredBy')
     AND NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'calendar_sync_triggered_by') THEN
    ALTER TYPE "CalendarSyncTriggeredBy" RENAME TO calendar_sync_triggered_by;
  END IF;
END $$;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_type WHERE typname = 'CalendarSyncStatus')
     AND NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'calendar_sync_status') THEN
    ALTER TYPE "CalendarSyncStatus" RENAME TO calendar_sync_status;
  END IF;
END $$;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_type WHERE typname = 'EmailNotificationType')
     AND NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'email_notification_type') THEN
    ALTER TYPE "EmailNotificationType" RENAME TO email_notification_type;
  END IF;
END $$;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_type WHERE typname = 'EmailNotificationStatus')
     AND NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'email_notification_status') THEN
    ALTER TYPE "EmailNotificationStatus" RENAME TO email_notification_status;
  END IF;
END $$;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = current_schema() AND table_name = 'users' AND column_name = 'createdAt'
  ) AND NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = current_schema() AND table_name = 'users' AND column_name = 'created_at'
  ) THEN
    ALTER TABLE "users" RENAME COLUMN "createdAt" TO "created_at";
  END IF;
END $$;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = current_schema() AND table_name = 'users' AND column_name = 'updatedAt'
  ) AND NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = current_schema() AND table_name = 'users' AND column_name = 'updated_at'
  ) THEN
    ALTER TABLE "users" RENAME COLUMN "updatedAt" TO "updated_at";
  END IF;
END $$;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = current_schema() AND table_name = 'properties' AND column_name = 'nameEs'
  ) AND NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = current_schema() AND table_name = 'properties' AND column_name = 'name_es'
  ) THEN
    ALTER TABLE "properties" RENAME COLUMN "nameEs" TO "name_es";
  END IF;
END $$;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = current_schema() AND table_name = 'properties' AND column_name = 'nameEn'
  ) AND NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = current_schema() AND table_name = 'properties' AND column_name = 'name_en'
  ) THEN
    ALTER TABLE "properties" RENAME COLUMN "nameEn" TO "name_en";
  END IF;
END $$;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = current_schema() AND table_name = 'properties' AND column_name = 'shortDescriptionEs'
  ) AND NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = current_schema() AND table_name = 'properties' AND column_name = 'short_description_es'
  ) THEN
    ALTER TABLE "properties" RENAME COLUMN "shortDescriptionEs" TO "short_description_es";
  END IF;
END $$;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = current_schema() AND table_name = 'properties' AND column_name = 'shortDescriptionEn'
  ) AND NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = current_schema() AND table_name = 'properties' AND column_name = 'short_description_en'
  ) THEN
    ALTER TABLE "properties" RENAME COLUMN "shortDescriptionEn" TO "short_description_en";
  END IF;
END $$;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = current_schema() AND table_name = 'properties' AND column_name = 'longDescriptionEs'
  ) AND NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = current_schema() AND table_name = 'properties' AND column_name = 'long_description_es'
  ) THEN
    ALTER TABLE "properties" RENAME COLUMN "longDescriptionEs" TO "long_description_es";
  END IF;
END $$;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = current_schema() AND table_name = 'properties' AND column_name = 'longDescriptionEn'
  ) AND NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = current_schema() AND table_name = 'properties' AND column_name = 'long_description_en'
  ) THEN
    ALTER TABLE "properties" RENAME COLUMN "longDescriptionEn" TO "long_description_en";
  END IF;
END $$;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = current_schema() AND table_name = 'properties' AND column_name = 'maxGuests'
  ) AND NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = current_schema() AND table_name = 'properties' AND column_name = 'max_guests'
  ) THEN
    ALTER TABLE "properties" RENAME COLUMN "maxGuests" TO "max_guests";
  END IF;
END $$;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = current_schema() AND table_name = 'properties' AND column_name = 'baseNightlyPrice'
  ) AND NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = current_schema() AND table_name = 'properties' AND column_name = 'base_nightly_price'
  ) THEN
    ALTER TABLE "properties" RENAME COLUMN "baseNightlyPrice" TO "base_nightly_price";
  END IF;
END $$;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = current_schema() AND table_name = 'properties' AND column_name = 'checkInTime'
  ) AND NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = current_schema() AND table_name = 'properties' AND column_name = 'check_in_time'
  ) THEN
    ALTER TABLE "properties" RENAME COLUMN "checkInTime" TO "check_in_time";
  END IF;
END $$;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = current_schema() AND table_name = 'properties' AND column_name = 'checkOutTime'
  ) AND NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = current_schema() AND table_name = 'properties' AND column_name = 'check_out_time'
  ) THEN
    ALTER TABLE "properties" RENAME COLUMN "checkOutTime" TO "check_out_time";
  END IF;
END $$;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = current_schema() AND table_name = 'properties' AND column_name = 'isComposed'
  ) AND NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = current_schema() AND table_name = 'properties' AND column_name = 'is_composed'
  ) THEN
    ALTER TABLE "properties" RENAME COLUMN "isComposed" TO "is_composed";
  END IF;
END $$;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = current_schema() AND table_name = 'properties' AND column_name = 'preparationDaysBefore'
  ) AND NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = current_schema() AND table_name = 'properties' AND column_name = 'preparation_days_before'
  ) THEN
    ALTER TABLE "properties" RENAME COLUMN "preparationDaysBefore" TO "preparation_days_before";
  END IF;
END $$;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = current_schema() AND table_name = 'properties' AND column_name = 'preparationDaysAfter'
  ) AND NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = current_schema() AND table_name = 'properties' AND column_name = 'preparation_days_after'
  ) THEN
    ALTER TABLE "properties" RENAME COLUMN "preparationDaysAfter" TO "preparation_days_after";
  END IF;
END $$;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = current_schema() AND table_name = 'properties' AND column_name = 'createdAt'
  ) AND NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = current_schema() AND table_name = 'properties' AND column_name = 'created_at'
  ) THEN
    ALTER TABLE "properties" RENAME COLUMN "createdAt" TO "created_at";
  END IF;
END $$;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = current_schema() AND table_name = 'properties' AND column_name = 'updatedAt'
  ) AND NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = current_schema() AND table_name = 'properties' AND column_name = 'updated_at'
  ) THEN
    ALTER TABLE "properties" RENAME COLUMN "updatedAt" TO "updated_at";
  END IF;
END $$;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = current_schema() AND table_name = 'properties' AND column_name = 'deletedAt'
  ) AND NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = current_schema() AND table_name = 'properties' AND column_name = 'deleted_at'
  ) THEN
    ALTER TABLE "properties" RENAME COLUMN "deletedAt" TO "deleted_at";
  END IF;
END $$;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = current_schema() AND table_name = 'properties' AND column_name = 'deletedById'
  ) AND NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = current_schema() AND table_name = 'properties' AND column_name = 'deleted_by_id'
  ) THEN
    ALTER TABLE "properties" RENAME COLUMN "deletedById" TO "deleted_by_id";
  END IF;
END $$;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = current_schema() AND table_name = 'property_components' AND column_name = 'parentPropertyId'
  ) AND NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = current_schema() AND table_name = 'property_components' AND column_name = 'parent_property_id'
  ) THEN
    ALTER TABLE "property_components" RENAME COLUMN "parentPropertyId" TO "parent_property_id";
  END IF;
END $$;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = current_schema() AND table_name = 'property_components' AND column_name = 'componentPropertyId'
  ) AND NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = current_schema() AND table_name = 'property_components' AND column_name = 'component_property_id'
  ) THEN
    ALTER TABLE "property_components" RENAME COLUMN "componentPropertyId" TO "component_property_id";
  END IF;
END $$;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = current_schema() AND table_name = 'property_components' AND column_name = 'createdAt'
  ) AND NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = current_schema() AND table_name = 'property_components' AND column_name = 'created_at'
  ) THEN
    ALTER TABLE "property_components" RENAME COLUMN "createdAt" TO "created_at";
  END IF;
END $$;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = current_schema() AND table_name = 'property_images' AND column_name = 'propertyId'
  ) AND NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = current_schema() AND table_name = 'property_images' AND column_name = 'property_id'
  ) THEN
    ALTER TABLE "property_images" RENAME COLUMN "propertyId" TO "property_id";
  END IF;
END $$;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = current_schema() AND table_name = 'property_images' AND column_name = 'cloudinaryPublicId'
  ) AND NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = current_schema() AND table_name = 'property_images' AND column_name = 'cloudinary_public_id'
  ) THEN
    ALTER TABLE "property_images" RENAME COLUMN "cloudinaryPublicId" TO "cloudinary_public_id";
  END IF;
END $$;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = current_schema() AND table_name = 'property_images' AND column_name = 'secureUrl'
  ) AND NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = current_schema() AND table_name = 'property_images' AND column_name = 'secure_url'
  ) THEN
    ALTER TABLE "property_images" RENAME COLUMN "secureUrl" TO "secure_url";
  END IF;
END $$;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = current_schema() AND table_name = 'property_images' AND column_name = 'altTextEs'
  ) AND NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = current_schema() AND table_name = 'property_images' AND column_name = 'alt_text_es'
  ) THEN
    ALTER TABLE "property_images" RENAME COLUMN "altTextEs" TO "alt_text_es";
  END IF;
END $$;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = current_schema() AND table_name = 'property_images' AND column_name = 'altTextEn'
  ) AND NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = current_schema() AND table_name = 'property_images' AND column_name = 'alt_text_en'
  ) THEN
    ALTER TABLE "property_images" RENAME COLUMN "altTextEn" TO "alt_text_en";
  END IF;
END $$;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = current_schema() AND table_name = 'property_images' AND column_name = 'sortOrder'
  ) AND NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = current_schema() AND table_name = 'property_images' AND column_name = 'sort_order'
  ) THEN
    ALTER TABLE "property_images" RENAME COLUMN "sortOrder" TO "sort_order";
  END IF;
END $$;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = current_schema() AND table_name = 'property_images' AND column_name = 'isCover'
  ) AND NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = current_schema() AND table_name = 'property_images' AND column_name = 'is_cover'
  ) THEN
    ALTER TABLE "property_images" RENAME COLUMN "isCover" TO "is_cover";
  END IF;
END $$;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = current_schema() AND table_name = 'property_images' AND column_name = 'createdAt'
  ) AND NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = current_schema() AND table_name = 'property_images' AND column_name = 'created_at'
  ) THEN
    ALTER TABLE "property_images" RENAME COLUMN "createdAt" TO "created_at";
  END IF;
END $$;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = current_schema() AND table_name = 'property_images' AND column_name = 'updatedAt'
  ) AND NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = current_schema() AND table_name = 'property_images' AND column_name = 'updated_at'
  ) THEN
    ALTER TABLE "property_images" RENAME COLUMN "updatedAt" TO "updated_at";
  END IF;
END $$;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = current_schema() AND table_name = 'property_images' AND column_name = 'deletedAt'
  ) AND NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = current_schema() AND table_name = 'property_images' AND column_name = 'deleted_at'
  ) THEN
    ALTER TABLE "property_images" RENAME COLUMN "deletedAt" TO "deleted_at";
  END IF;
END $$;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = current_schema() AND table_name = 'property_images' AND column_name = 'deletedById'
  ) AND NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = current_schema() AND table_name = 'property_images' AND column_name = 'deleted_by_id'
  ) THEN
    ALTER TABLE "property_images" RENAME COLUMN "deletedById" TO "deleted_by_id";
  END IF;
END $$;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = current_schema() AND table_name = 'property_images' AND column_name = 'altEs'
  ) AND NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = current_schema() AND table_name = 'property_images' AND column_name = 'alt_text_es'
  ) THEN
    ALTER TABLE "property_images" RENAME COLUMN "altEs" TO "alt_text_es";
  END IF;
END $$;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = current_schema() AND table_name = 'property_images' AND column_name = 'altEn'
  ) AND NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = current_schema() AND table_name = 'property_images' AND column_name = 'alt_text_en'
  ) THEN
    ALTER TABLE "property_images" RENAME COLUMN "altEn" TO "alt_text_en";
  END IF;
END $$;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = current_schema() AND table_name = 'amenities' AND column_name = 'nameEs'
  ) AND NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = current_schema() AND table_name = 'amenities' AND column_name = 'name_es'
  ) THEN
    ALTER TABLE "amenities" RENAME COLUMN "nameEs" TO "name_es";
  END IF;
END $$;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = current_schema() AND table_name = 'amenities' AND column_name = 'nameEn'
  ) AND NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = current_schema() AND table_name = 'amenities' AND column_name = 'name_en'
  ) THEN
    ALTER TABLE "amenities" RENAME COLUMN "nameEn" TO "name_en";
  END IF;
END $$;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = current_schema() AND table_name = 'amenities' AND column_name = 'createdAt'
  ) AND NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = current_schema() AND table_name = 'amenities' AND column_name = 'created_at'
  ) THEN
    ALTER TABLE "amenities" RENAME COLUMN "createdAt" TO "created_at";
  END IF;
END $$;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = current_schema() AND table_name = 'amenities' AND column_name = 'updatedAt'
  ) AND NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = current_schema() AND table_name = 'amenities' AND column_name = 'updated_at'
  ) THEN
    ALTER TABLE "amenities" RENAME COLUMN "updatedAt" TO "updated_at";
  END IF;
END $$;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = current_schema() AND table_name = 'amenities' AND column_name = 'deletedAt'
  ) AND NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = current_schema() AND table_name = 'amenities' AND column_name = 'deleted_at'
  ) THEN
    ALTER TABLE "amenities" RENAME COLUMN "deletedAt" TO "deleted_at";
  END IF;
END $$;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = current_schema() AND table_name = 'amenities' AND column_name = 'deletedById'
  ) AND NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = current_schema() AND table_name = 'amenities' AND column_name = 'deleted_by_id'
  ) THEN
    ALTER TABLE "amenities" RENAME COLUMN "deletedById" TO "deleted_by_id";
  END IF;
END $$;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = current_schema() AND table_name = 'property_amenities' AND column_name = 'propertyId'
  ) AND NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = current_schema() AND table_name = 'property_amenities' AND column_name = 'property_id'
  ) THEN
    ALTER TABLE "property_amenities" RENAME COLUMN "propertyId" TO "property_id";
  END IF;
END $$;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = current_schema() AND table_name = 'property_amenities' AND column_name = 'amenityId'
  ) AND NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = current_schema() AND table_name = 'property_amenities' AND column_name = 'amenity_id'
  ) THEN
    ALTER TABLE "property_amenities" RENAME COLUMN "amenityId" TO "amenity_id";
  END IF;
END $$;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = current_schema() AND table_name = 'property_amenities' AND column_name = 'createdAt'
  ) AND NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = current_schema() AND table_name = 'property_amenities' AND column_name = 'created_at'
  ) THEN
    ALTER TABLE "property_amenities" RENAME COLUMN "createdAt" TO "created_at";
  END IF;
END $$;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = current_schema() AND table_name = 'house_rules' AND column_name = 'titleEs'
  ) AND NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = current_schema() AND table_name = 'house_rules' AND column_name = 'title_es'
  ) THEN
    ALTER TABLE "house_rules" RENAME COLUMN "titleEs" TO "title_es";
  END IF;
END $$;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = current_schema() AND table_name = 'house_rules' AND column_name = 'titleEn'
  ) AND NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = current_schema() AND table_name = 'house_rules' AND column_name = 'title_en'
  ) THEN
    ALTER TABLE "house_rules" RENAME COLUMN "titleEn" TO "title_en";
  END IF;
END $$;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = current_schema() AND table_name = 'house_rules' AND column_name = 'descriptionEs'
  ) AND NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = current_schema() AND table_name = 'house_rules' AND column_name = 'description_es'
  ) THEN
    ALTER TABLE "house_rules" RENAME COLUMN "descriptionEs" TO "description_es";
  END IF;
END $$;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = current_schema() AND table_name = 'house_rules' AND column_name = 'descriptionEn'
  ) AND NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = current_schema() AND table_name = 'house_rules' AND column_name = 'description_en'
  ) THEN
    ALTER TABLE "house_rules" RENAME COLUMN "descriptionEn" TO "description_en";
  END IF;
END $$;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = current_schema() AND table_name = 'house_rules' AND column_name = 'createdAt'
  ) AND NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = current_schema() AND table_name = 'house_rules' AND column_name = 'created_at'
  ) THEN
    ALTER TABLE "house_rules" RENAME COLUMN "createdAt" TO "created_at";
  END IF;
END $$;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = current_schema() AND table_name = 'house_rules' AND column_name = 'updatedAt'
  ) AND NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = current_schema() AND table_name = 'house_rules' AND column_name = 'updated_at'
  ) THEN
    ALTER TABLE "house_rules" RENAME COLUMN "updatedAt" TO "updated_at";
  END IF;
END $$;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = current_schema() AND table_name = 'house_rules' AND column_name = 'deletedAt'
  ) AND NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = current_schema() AND table_name = 'house_rules' AND column_name = 'deleted_at'
  ) THEN
    ALTER TABLE "house_rules" RENAME COLUMN "deletedAt" TO "deleted_at";
  END IF;
END $$;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = current_schema() AND table_name = 'house_rules' AND column_name = 'deletedById'
  ) AND NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = current_schema() AND table_name = 'house_rules' AND column_name = 'deleted_by_id'
  ) THEN
    ALTER TABLE "house_rules" RENAME COLUMN "deletedById" TO "deleted_by_id";
  END IF;
END $$;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = current_schema() AND table_name = 'property_rules' AND column_name = 'propertyId'
  ) AND NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = current_schema() AND table_name = 'property_rules' AND column_name = 'property_id'
  ) THEN
    ALTER TABLE "property_rules" RENAME COLUMN "propertyId" TO "property_id";
  END IF;
END $$;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = current_schema() AND table_name = 'property_rules' AND column_name = 'ruleId'
  ) AND NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = current_schema() AND table_name = 'property_rules' AND column_name = 'rule_id'
  ) THEN
    ALTER TABLE "property_rules" RENAME COLUMN "ruleId" TO "rule_id";
  END IF;
END $$;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = current_schema() AND table_name = 'property_rules' AND column_name = 'createdAt'
  ) AND NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = current_schema() AND table_name = 'property_rules' AND column_name = 'created_at'
  ) THEN
    ALTER TABLE "property_rules" RENAME COLUMN "createdAt" TO "created_at";
  END IF;
END $$;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = current_schema() AND table_name = 'reservations' AND column_name = 'propertyId'
  ) AND NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = current_schema() AND table_name = 'reservations' AND column_name = 'property_id'
  ) THEN
    ALTER TABLE "reservations" RENAME COLUMN "propertyId" TO "property_id";
  END IF;
END $$;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = current_schema() AND table_name = 'reservations' AND column_name = 'guestName'
  ) AND NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = current_schema() AND table_name = 'reservations' AND column_name = 'guest_name'
  ) THEN
    ALTER TABLE "reservations" RENAME COLUMN "guestName" TO "guest_name";
  END IF;
END $$;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = current_schema() AND table_name = 'reservations' AND column_name = 'guestEmail'
  ) AND NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = current_schema() AND table_name = 'reservations' AND column_name = 'guest_email'
  ) THEN
    ALTER TABLE "reservations" RENAME COLUMN "guestEmail" TO "guest_email";
  END IF;
END $$;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = current_schema() AND table_name = 'reservations' AND column_name = 'guestPhone'
  ) AND NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = current_schema() AND table_name = 'reservations' AND column_name = 'guest_phone'
  ) THEN
    ALTER TABLE "reservations" RENAME COLUMN "guestPhone" TO "guest_phone";
  END IF;
END $$;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = current_schema() AND table_name = 'reservations' AND column_name = 'guestCountry'
  ) AND NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = current_schema() AND table_name = 'reservations' AND column_name = 'guest_country'
  ) THEN
    ALTER TABLE "reservations" RENAME COLUMN "guestCountry" TO "guest_country";
  END IF;
END $$;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = current_schema() AND table_name = 'reservations' AND column_name = 'checkInDate'
  ) AND NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = current_schema() AND table_name = 'reservations' AND column_name = 'check_in_date'
  ) THEN
    ALTER TABLE "reservations" RENAME COLUMN "checkInDate" TO "check_in_date";
  END IF;
END $$;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = current_schema() AND table_name = 'reservations' AND column_name = 'checkOutDate'
  ) AND NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = current_schema() AND table_name = 'reservations' AND column_name = 'check_out_date'
  ) THEN
    ALTER TABLE "reservations" RENAME COLUMN "checkOutDate" TO "check_out_date";
  END IF;
END $$;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = current_schema() AND table_name = 'reservations' AND column_name = 'arrivalTimeEstimate'
  ) AND NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = current_schema() AND table_name = 'reservations' AND column_name = 'arrival_time_estimate'
  ) THEN
    ALTER TABLE "reservations" RENAME COLUMN "arrivalTimeEstimate" TO "arrival_time_estimate";
  END IF;
END $$;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = current_schema() AND table_name = 'reservations' AND column_name = 'guestCount'
  ) AND NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = current_schema() AND table_name = 'reservations' AND column_name = 'guest_count'
  ) THEN
    ALTER TABLE "reservations" RENAME COLUMN "guestCount" TO "guest_count";
  END IF;
END $$;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = current_schema() AND table_name = 'reservations' AND column_name = 'cleaningFee'
  ) AND NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = current_schema() AND table_name = 'reservations' AND column_name = 'cleaning_fee'
  ) THEN
    ALTER TABLE "reservations" RENAME COLUMN "cleaningFee" TO "cleaning_fee";
  END IF;
END $$;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = current_schema() AND table_name = 'reservations' AND column_name = 'expiresAt'
  ) AND NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = current_schema() AND table_name = 'reservations' AND column_name = 'expires_at'
  ) THEN
    ALTER TABLE "reservations" RENAME COLUMN "expiresAt" TO "expires_at";
  END IF;
END $$;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = current_schema() AND table_name = 'reservations' AND column_name = 'confirmedAt'
  ) AND NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = current_schema() AND table_name = 'reservations' AND column_name = 'confirmed_at'
  ) THEN
    ALTER TABLE "reservations" RENAME COLUMN "confirmedAt" TO "confirmed_at";
  END IF;
END $$;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = current_schema() AND table_name = 'reservations' AND column_name = 'cancelledAt'
  ) AND NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = current_schema() AND table_name = 'reservations' AND column_name = 'cancelled_at'
  ) THEN
    ALTER TABLE "reservations" RENAME COLUMN "cancelledAt" TO "cancelled_at";
  END IF;
END $$;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = current_schema() AND table_name = 'reservations' AND column_name = 'createdAt'
  ) AND NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = current_schema() AND table_name = 'reservations' AND column_name = 'created_at'
  ) THEN
    ALTER TABLE "reservations" RENAME COLUMN "createdAt" TO "created_at";
  END IF;
END $$;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = current_schema() AND table_name = 'reservations' AND column_name = 'updatedAt'
  ) AND NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = current_schema() AND table_name = 'reservations' AND column_name = 'updated_at'
  ) THEN
    ALTER TABLE "reservations" RENAME COLUMN "updatedAt" TO "updated_at";
  END IF;
END $$;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = current_schema() AND table_name = 'reservation_guests' AND column_name = 'reservationId'
  ) AND NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = current_schema() AND table_name = 'reservation_guests' AND column_name = 'reservation_id'
  ) THEN
    ALTER TABLE "reservation_guests" RENAME COLUMN "reservationId" TO "reservation_id";
  END IF;
END $$;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = current_schema() AND table_name = 'reservation_guests' AND column_name = 'createdAt'
  ) AND NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = current_schema() AND table_name = 'reservation_guests' AND column_name = 'created_at'
  ) THEN
    ALTER TABLE "reservation_guests" RENAME COLUMN "createdAt" TO "created_at";
  END IF;
END $$;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = current_schema() AND table_name = 'reservation_guests' AND column_name = 'updatedAt'
  ) AND NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = current_schema() AND table_name = 'reservation_guests' AND column_name = 'updated_at'
  ) THEN
    ALTER TABLE "reservation_guests" RENAME COLUMN "updatedAt" TO "updated_at";
  END IF;
END $$;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = current_schema() AND table_name = 'payments' AND column_name = 'reservationId'
  ) AND NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = current_schema() AND table_name = 'payments' AND column_name = 'reservation_id'
  ) THEN
    ALTER TABLE "payments" RENAME COLUMN "reservationId" TO "reservation_id";
  END IF;
END $$;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = current_schema() AND table_name = 'payments' AND column_name = 'providerTransactionId'
  ) AND NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = current_schema() AND table_name = 'payments' AND column_name = 'provider_transaction_id'
  ) THEN
    ALTER TABLE "payments" RENAME COLUMN "providerTransactionId" TO "provider_transaction_id";
  END IF;
END $$;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = current_schema() AND table_name = 'payments' AND column_name = 'providerReference'
  ) AND NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = current_schema() AND table_name = 'payments' AND column_name = 'provider_reference'
  ) THEN
    ALTER TABLE "payments" RENAME COLUMN "providerReference" TO "provider_reference";
  END IF;
END $$;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = current_schema() AND table_name = 'payments' AND column_name = 'paidAt'
  ) AND NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = current_schema() AND table_name = 'payments' AND column_name = 'paid_at'
  ) THEN
    ALTER TABLE "payments" RENAME COLUMN "paidAt" TO "paid_at";
  END IF;
END $$;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = current_schema() AND table_name = 'payments' AND column_name = 'failedAt'
  ) AND NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = current_schema() AND table_name = 'payments' AND column_name = 'failed_at'
  ) THEN
    ALTER TABLE "payments" RENAME COLUMN "failedAt" TO "failed_at";
  END IF;
END $$;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = current_schema() AND table_name = 'payments' AND column_name = 'rawPayload'
  ) AND NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = current_schema() AND table_name = 'payments' AND column_name = 'raw_payload'
  ) THEN
    ALTER TABLE "payments" RENAME COLUMN "rawPayload" TO "raw_payload";
  END IF;
END $$;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = current_schema() AND table_name = 'payments' AND column_name = 'createdAt'
  ) AND NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = current_schema() AND table_name = 'payments' AND column_name = 'created_at'
  ) THEN
    ALTER TABLE "payments" RENAME COLUMN "createdAt" TO "created_at";
  END IF;
END $$;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = current_schema() AND table_name = 'payments' AND column_name = 'updatedAt'
  ) AND NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = current_schema() AND table_name = 'payments' AND column_name = 'updated_at'
  ) THEN
    ALTER TABLE "payments" RENAME COLUMN "updatedAt" TO "updated_at";
  END IF;
END $$;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = current_schema() AND table_name = 'refunds' AND column_name = 'paymentId'
  ) AND NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = current_schema() AND table_name = 'refunds' AND column_name = 'payment_id'
  ) THEN
    ALTER TABLE "refunds" RENAME COLUMN "paymentId" TO "payment_id";
  END IF;
END $$;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = current_schema() AND table_name = 'refunds' AND column_name = 'providerRefundId'
  ) AND NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = current_schema() AND table_name = 'refunds' AND column_name = 'provider_refund_id'
  ) THEN
    ALTER TABLE "refunds" RENAME COLUMN "providerRefundId" TO "provider_refund_id";
  END IF;
END $$;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = current_schema() AND table_name = 'refunds' AND column_name = 'rawPayload'
  ) AND NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = current_schema() AND table_name = 'refunds' AND column_name = 'raw_payload'
  ) THEN
    ALTER TABLE "refunds" RENAME COLUMN "rawPayload" TO "raw_payload";
  END IF;
END $$;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = current_schema() AND table_name = 'refunds' AND column_name = 'createdAt'
  ) AND NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = current_schema() AND table_name = 'refunds' AND column_name = 'created_at'
  ) THEN
    ALTER TABLE "refunds" RENAME COLUMN "createdAt" TO "created_at";
  END IF;
END $$;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = current_schema() AND table_name = 'refunds' AND column_name = 'updatedAt'
  ) AND NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = current_schema() AND table_name = 'refunds' AND column_name = 'updated_at'
  ) THEN
    ALTER TABLE "refunds" RENAME COLUMN "updatedAt" TO "updated_at";
  END IF;
END $$;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = current_schema() AND table_name = 'calendar_blocks' AND column_name = 'propertyId'
  ) AND NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = current_schema() AND table_name = 'calendar_blocks' AND column_name = 'property_id'
  ) THEN
    ALTER TABLE "calendar_blocks" RENAME COLUMN "propertyId" TO "property_id";
  END IF;
END $$;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = current_schema() AND table_name = 'calendar_blocks' AND column_name = 'startDate'
  ) AND NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = current_schema() AND table_name = 'calendar_blocks' AND column_name = 'start_date'
  ) THEN
    ALTER TABLE "calendar_blocks" RENAME COLUMN "startDate" TO "start_date";
  END IF;
END $$;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = current_schema() AND table_name = 'calendar_blocks' AND column_name = 'endDate'
  ) AND NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = current_schema() AND table_name = 'calendar_blocks' AND column_name = 'end_date'
  ) THEN
    ALTER TABLE "calendar_blocks" RENAME COLUMN "endDate" TO "end_date";
  END IF;
END $$;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = current_schema() AND table_name = 'calendar_blocks' AND column_name = 'reservationId'
  ) AND NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = current_schema() AND table_name = 'calendar_blocks' AND column_name = 'reservation_id'
  ) THEN
    ALTER TABLE "calendar_blocks" RENAME COLUMN "reservationId" TO "reservation_id";
  END IF;
END $$;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = current_schema() AND table_name = 'calendar_blocks' AND column_name = 'externalCalendarEventId'
  ) AND NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = current_schema() AND table_name = 'calendar_blocks' AND column_name = 'external_calendar_event_id'
  ) THEN
    ALTER TABLE "calendar_blocks" RENAME COLUMN "externalCalendarEventId" TO "external_calendar_event_id";
  END IF;
END $$;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = current_schema() AND table_name = 'calendar_blocks' AND column_name = 'parentBlockId'
  ) AND NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = current_schema() AND table_name = 'calendar_blocks' AND column_name = 'parent_block_id'
  ) THEN
    ALTER TABLE "calendar_blocks" RENAME COLUMN "parentBlockId" TO "parent_block_id";
  END IF;
END $$;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = current_schema() AND table_name = 'calendar_blocks' AND column_name = 'isAdminOverrideAllowed'
  ) AND NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = current_schema() AND table_name = 'calendar_blocks' AND column_name = 'is_admin_override_allowed'
  ) THEN
    ALTER TABLE "calendar_blocks" RENAME COLUMN "isAdminOverrideAllowed" TO "is_admin_override_allowed";
  END IF;
END $$;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = current_schema() AND table_name = 'calendar_blocks' AND column_name = 'unlockedByAdminAt'
  ) AND NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = current_schema() AND table_name = 'calendar_blocks' AND column_name = 'unlocked_by_admin_at'
  ) THEN
    ALTER TABLE "calendar_blocks" RENAME COLUMN "unlockedByAdminAt" TO "unlocked_by_admin_at";
  END IF;
END $$;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = current_schema() AND table_name = 'calendar_blocks' AND column_name = 'unlockedByAdminId'
  ) AND NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = current_schema() AND table_name = 'calendar_blocks' AND column_name = 'unlocked_by_admin_id'
  ) THEN
    ALTER TABLE "calendar_blocks" RENAME COLUMN "unlockedByAdminId" TO "unlocked_by_admin_id";
  END IF;
END $$;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = current_schema() AND table_name = 'calendar_blocks' AND column_name = 'adminOverrideReason'
  ) AND NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = current_schema() AND table_name = 'calendar_blocks' AND column_name = 'admin_override_reason'
  ) THEN
    ALTER TABLE "calendar_blocks" RENAME COLUMN "adminOverrideReason" TO "admin_override_reason";
  END IF;
END $$;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = current_schema() AND table_name = 'calendar_blocks' AND column_name = 'createdAt'
  ) AND NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = current_schema() AND table_name = 'calendar_blocks' AND column_name = 'created_at'
  ) THEN
    ALTER TABLE "calendar_blocks" RENAME COLUMN "createdAt" TO "created_at";
  END IF;
END $$;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = current_schema() AND table_name = 'calendar_blocks' AND column_name = 'updatedAt'
  ) AND NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = current_schema() AND table_name = 'calendar_blocks' AND column_name = 'updated_at'
  ) THEN
    ALTER TABLE "calendar_blocks" RENAME COLUMN "updatedAt" TO "updated_at";
  END IF;
END $$;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = current_schema() AND table_name = 'calendar_blocks' AND column_name = 'deletedAt'
  ) AND NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = current_schema() AND table_name = 'calendar_blocks' AND column_name = 'deleted_at'
  ) THEN
    ALTER TABLE "calendar_blocks" RENAME COLUMN "deletedAt" TO "deleted_at";
  END IF;
END $$;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = current_schema() AND table_name = 'calendar_blocks' AND column_name = 'deletedById'
  ) AND NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = current_schema() AND table_name = 'calendar_blocks' AND column_name = 'deleted_by_id'
  ) THEN
    ALTER TABLE "calendar_blocks" RENAME COLUMN "deletedById" TO "deleted_by_id";
  END IF;
END $$;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = current_schema() AND table_name = 'external_calendars' AND column_name = 'propertyId'
  ) AND NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = current_schema() AND table_name = 'external_calendars' AND column_name = 'property_id'
  ) THEN
    ALTER TABLE "external_calendars" RENAME COLUMN "propertyId" TO "property_id";
  END IF;
END $$;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = current_schema() AND table_name = 'external_calendars' AND column_name = 'importUrlEncrypted'
  ) AND NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = current_schema() AND table_name = 'external_calendars' AND column_name = 'import_url_encrypted'
  ) THEN
    ALTER TABLE "external_calendars" RENAME COLUMN "importUrlEncrypted" TO "import_url_encrypted";
  END IF;
END $$;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = current_schema() AND table_name = 'external_calendars' AND column_name = 'exportTokenHash'
  ) AND NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = current_schema() AND table_name = 'external_calendars' AND column_name = 'export_token_hash'
  ) THEN
    ALTER TABLE "external_calendars" RENAME COLUMN "exportTokenHash" TO "export_token_hash";
  END IF;
END $$;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = current_schema() AND table_name = 'external_calendars' AND column_name = 'exportTokenLastRotatedAt'
  ) AND NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = current_schema() AND table_name = 'external_calendars' AND column_name = 'export_token_last_rotated_at'
  ) THEN
    ALTER TABLE "external_calendars" RENAME COLUMN "exportTokenLastRotatedAt" TO "export_token_last_rotated_at";
  END IF;
END $$;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = current_schema() AND table_name = 'external_calendars' AND column_name = 'isImportEnabled'
  ) AND NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = current_schema() AND table_name = 'external_calendars' AND column_name = 'is_import_enabled'
  ) THEN
    ALTER TABLE "external_calendars" RENAME COLUMN "isImportEnabled" TO "is_import_enabled";
  END IF;
END $$;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = current_schema() AND table_name = 'external_calendars' AND column_name = 'isExportEnabled'
  ) AND NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = current_schema() AND table_name = 'external_calendars' AND column_name = 'is_export_enabled'
  ) THEN
    ALTER TABLE "external_calendars" RENAME COLUMN "isExportEnabled" TO "is_export_enabled";
  END IF;
END $$;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = current_schema() AND table_name = 'external_calendars' AND column_name = 'lastImportStartedAt'
  ) AND NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = current_schema() AND table_name = 'external_calendars' AND column_name = 'last_import_started_at'
  ) THEN
    ALTER TABLE "external_calendars" RENAME COLUMN "lastImportStartedAt" TO "last_import_started_at";
  END IF;
END $$;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = current_schema() AND table_name = 'external_calendars' AND column_name = 'lastImportFinishedAt'
  ) AND NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = current_schema() AND table_name = 'external_calendars' AND column_name = 'last_import_finished_at'
  ) THEN
    ALTER TABLE "external_calendars" RENAME COLUMN "lastImportFinishedAt" TO "last_import_finished_at";
  END IF;
END $$;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = current_schema() AND table_name = 'external_calendars' AND column_name = 'lastExportGeneratedAt'
  ) AND NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = current_schema() AND table_name = 'external_calendars' AND column_name = 'last_export_generated_at'
  ) THEN
    ALTER TABLE "external_calendars" RENAME COLUMN "lastExportGeneratedAt" TO "last_export_generated_at";
  END IF;
END $$;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = current_schema() AND table_name = 'external_calendars' AND column_name = 'lastFailureCode'
  ) AND NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = current_schema() AND table_name = 'external_calendars' AND column_name = 'last_failure_code'
  ) THEN
    ALTER TABLE "external_calendars" RENAME COLUMN "lastFailureCode" TO "last_failure_code";
  END IF;
END $$;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = current_schema() AND table_name = 'external_calendars' AND column_name = 'lastFailureMessage'
  ) AND NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = current_schema() AND table_name = 'external_calendars' AND column_name = 'last_failure_message'
  ) THEN
    ALTER TABLE "external_calendars" RENAME COLUMN "lastFailureMessage" TO "last_failure_message";
  END IF;
END $$;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = current_schema() AND table_name = 'external_calendars' AND column_name = 'createdAt'
  ) AND NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = current_schema() AND table_name = 'external_calendars' AND column_name = 'created_at'
  ) THEN
    ALTER TABLE "external_calendars" RENAME COLUMN "createdAt" TO "created_at";
  END IF;
END $$;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = current_schema() AND table_name = 'external_calendars' AND column_name = 'updatedAt'
  ) AND NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = current_schema() AND table_name = 'external_calendars' AND column_name = 'updated_at'
  ) THEN
    ALTER TABLE "external_calendars" RENAME COLUMN "updatedAt" TO "updated_at";
  END IF;
END $$;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = current_schema() AND table_name = 'external_calendars' AND column_name = 'deletedAt'
  ) AND NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = current_schema() AND table_name = 'external_calendars' AND column_name = 'deleted_at'
  ) THEN
    ALTER TABLE "external_calendars" RENAME COLUMN "deletedAt" TO "deleted_at";
  END IF;
END $$;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = current_schema() AND table_name = 'external_calendars' AND column_name = 'deletedById'
  ) AND NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = current_schema() AND table_name = 'external_calendars' AND column_name = 'deleted_by_id'
  ) THEN
    ALTER TABLE "external_calendars" RENAME COLUMN "deletedById" TO "deleted_by_id";
  END IF;
END $$;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = current_schema() AND table_name = 'external_calendar_events' AND column_name = 'externalCalendarId'
  ) AND NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = current_schema() AND table_name = 'external_calendar_events' AND column_name = 'external_calendar_id'
  ) THEN
    ALTER TABLE "external_calendar_events" RENAME COLUMN "externalCalendarId" TO "external_calendar_id";
  END IF;
END $$;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = current_schema() AND table_name = 'external_calendar_events' AND column_name = 'providerEventUid'
  ) AND NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = current_schema() AND table_name = 'external_calendar_events' AND column_name = 'provider_event_uid'
  ) THEN
    ALTER TABLE "external_calendar_events" RENAME COLUMN "providerEventUid" TO "provider_event_uid";
  END IF;
END $$;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = current_schema() AND table_name = 'external_calendar_events' AND column_name = 'startDate'
  ) AND NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = current_schema() AND table_name = 'external_calendar_events' AND column_name = 'start_date'
  ) THEN
    ALTER TABLE "external_calendar_events" RENAME COLUMN "startDate" TO "start_date";
  END IF;
END $$;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = current_schema() AND table_name = 'external_calendar_events' AND column_name = 'endDate'
  ) AND NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = current_schema() AND table_name = 'external_calendar_events' AND column_name = 'end_date'
  ) THEN
    ALTER TABLE "external_calendar_events" RENAME COLUMN "endDate" TO "end_date";
  END IF;
END $$;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = current_schema() AND table_name = 'external_calendar_events' AND column_name = 'firstSeenAt'
  ) AND NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = current_schema() AND table_name = 'external_calendar_events' AND column_name = 'first_seen_at'
  ) THEN
    ALTER TABLE "external_calendar_events" RENAME COLUMN "firstSeenAt" TO "first_seen_at";
  END IF;
END $$;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = current_schema() AND table_name = 'external_calendar_events' AND column_name = 'lastSeenAt'
  ) AND NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = current_schema() AND table_name = 'external_calendar_events' AND column_name = 'last_seen_at'
  ) THEN
    ALTER TABLE "external_calendar_events" RENAME COLUMN "lastSeenAt" TO "last_seen_at";
  END IF;
END $$;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = current_schema() AND table_name = 'external_calendar_events' AND column_name = 'removedAt'
  ) AND NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = current_schema() AND table_name = 'external_calendar_events' AND column_name = 'removed_at'
  ) THEN
    ALTER TABLE "external_calendar_events" RENAME COLUMN "removedAt" TO "removed_at";
  END IF;
END $$;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = current_schema() AND table_name = 'external_calendar_events' AND column_name = 'rawPayload'
  ) AND NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = current_schema() AND table_name = 'external_calendar_events' AND column_name = 'raw_payload'
  ) THEN
    ALTER TABLE "external_calendar_events" RENAME COLUMN "rawPayload" TO "raw_payload";
  END IF;
END $$;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = current_schema() AND table_name = 'external_calendar_events' AND column_name = 'createdAt'
  ) AND NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = current_schema() AND table_name = 'external_calendar_events' AND column_name = 'created_at'
  ) THEN
    ALTER TABLE "external_calendar_events" RENAME COLUMN "createdAt" TO "created_at";
  END IF;
END $$;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = current_schema() AND table_name = 'external_calendar_events' AND column_name = 'updatedAt'
  ) AND NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = current_schema() AND table_name = 'external_calendar_events' AND column_name = 'updated_at'
  ) THEN
    ALTER TABLE "external_calendar_events" RENAME COLUMN "updatedAt" TO "updated_at";
  END IF;
END $$;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = current_schema() AND table_name = 'external_calendar_sync_logs' AND column_name = 'externalCalendarId'
  ) AND NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = current_schema() AND table_name = 'external_calendar_sync_logs' AND column_name = 'external_calendar_id'
  ) THEN
    ALTER TABLE "external_calendar_sync_logs" RENAME COLUMN "externalCalendarId" TO "external_calendar_id";
  END IF;
END $$;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = current_schema() AND table_name = 'external_calendar_sync_logs' AND column_name = 'triggeredBy'
  ) AND NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = current_schema() AND table_name = 'external_calendar_sync_logs' AND column_name = 'triggered_by'
  ) THEN
    ALTER TABLE "external_calendar_sync_logs" RENAME COLUMN "triggeredBy" TO "triggered_by";
  END IF;
END $$;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = current_schema() AND table_name = 'external_calendar_sync_logs' AND column_name = 'startedAt'
  ) AND NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = current_schema() AND table_name = 'external_calendar_sync_logs' AND column_name = 'started_at'
  ) THEN
    ALTER TABLE "external_calendar_sync_logs" RENAME COLUMN "startedAt" TO "started_at";
  END IF;
END $$;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = current_schema() AND table_name = 'external_calendar_sync_logs' AND column_name = 'finishedAt'
  ) AND NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = current_schema() AND table_name = 'external_calendar_sync_logs' AND column_name = 'finished_at'
  ) THEN
    ALTER TABLE "external_calendar_sync_logs" RENAME COLUMN "finishedAt" TO "finished_at";
  END IF;
END $$;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = current_schema() AND table_name = 'external_calendar_sync_logs' AND column_name = 'eventsImported'
  ) AND NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = current_schema() AND table_name = 'external_calendar_sync_logs' AND column_name = 'events_imported'
  ) THEN
    ALTER TABLE "external_calendar_sync_logs" RENAME COLUMN "eventsImported" TO "events_imported";
  END IF;
END $$;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = current_schema() AND table_name = 'external_calendar_sync_logs' AND column_name = 'eventsUpdated'
  ) AND NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = current_schema() AND table_name = 'external_calendar_sync_logs' AND column_name = 'events_updated'
  ) THEN
    ALTER TABLE "external_calendar_sync_logs" RENAME COLUMN "eventsUpdated" TO "events_updated";
  END IF;
END $$;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = current_schema() AND table_name = 'external_calendar_sync_logs' AND column_name = 'eventsRemoved'
  ) AND NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = current_schema() AND table_name = 'external_calendar_sync_logs' AND column_name = 'events_removed'
  ) THEN
    ALTER TABLE "external_calendar_sync_logs" RENAME COLUMN "eventsRemoved" TO "events_removed";
  END IF;
END $$;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = current_schema() AND table_name = 'external_calendar_sync_logs' AND column_name = 'eventsSkipped'
  ) AND NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = current_schema() AND table_name = 'external_calendar_sync_logs' AND column_name = 'events_skipped'
  ) THEN
    ALTER TABLE "external_calendar_sync_logs" RENAME COLUMN "eventsSkipped" TO "events_skipped";
  END IF;
END $$;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = current_schema() AND table_name = 'external_calendar_sync_logs' AND column_name = 'blocksCreated'
  ) AND NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = current_schema() AND table_name = 'external_calendar_sync_logs' AND column_name = 'blocks_created'
  ) THEN
    ALTER TABLE "external_calendar_sync_logs" RENAME COLUMN "blocksCreated" TO "blocks_created";
  END IF;
END $$;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = current_schema() AND table_name = 'external_calendar_sync_logs' AND column_name = 'blocksUpdated'
  ) AND NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = current_schema() AND table_name = 'external_calendar_sync_logs' AND column_name = 'blocks_updated'
  ) THEN
    ALTER TABLE "external_calendar_sync_logs" RENAME COLUMN "blocksUpdated" TO "blocks_updated";
  END IF;
END $$;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = current_schema() AND table_name = 'external_calendar_sync_logs' AND column_name = 'errorCode'
  ) AND NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = current_schema() AND table_name = 'external_calendar_sync_logs' AND column_name = 'error_code'
  ) THEN
    ALTER TABLE "external_calendar_sync_logs" RENAME COLUMN "errorCode" TO "error_code";
  END IF;
END $$;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = current_schema() AND table_name = 'external_calendar_sync_logs' AND column_name = 'errorMessage'
  ) AND NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = current_schema() AND table_name = 'external_calendar_sync_logs' AND column_name = 'error_message'
  ) THEN
    ALTER TABLE "external_calendar_sync_logs" RENAME COLUMN "errorMessage" TO "error_message";
  END IF;
END $$;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = current_schema() AND table_name = 'external_calendar_sync_logs' AND column_name = 'createdAt'
  ) AND NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = current_schema() AND table_name = 'external_calendar_sync_logs' AND column_name = 'created_at'
  ) THEN
    ALTER TABLE "external_calendar_sync_logs" RENAME COLUMN "createdAt" TO "created_at";
  END IF;
END $$;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = current_schema() AND table_name = 'email_notifications' AND column_name = 'reservationId'
  ) AND NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = current_schema() AND table_name = 'email_notifications' AND column_name = 'reservation_id'
  ) THEN
    ALTER TABLE "email_notifications" RENAME COLUMN "reservationId" TO "reservation_id";
  END IF;
END $$;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = current_schema() AND table_name = 'email_notifications' AND column_name = 'providerMessageId'
  ) AND NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = current_schema() AND table_name = 'email_notifications' AND column_name = 'provider_message_id'
  ) THEN
    ALTER TABLE "email_notifications" RENAME COLUMN "providerMessageId" TO "provider_message_id";
  END IF;
END $$;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = current_schema() AND table_name = 'email_notifications' AND column_name = 'sentAt'
  ) AND NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = current_schema() AND table_name = 'email_notifications' AND column_name = 'sent_at'
  ) THEN
    ALTER TABLE "email_notifications" RENAME COLUMN "sentAt" TO "sent_at";
  END IF;
END $$;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = current_schema() AND table_name = 'email_notifications' AND column_name = 'errorMessage'
  ) AND NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = current_schema() AND table_name = 'email_notifications' AND column_name = 'error_message'
  ) THEN
    ALTER TABLE "email_notifications" RENAME COLUMN "errorMessage" TO "error_message";
  END IF;
END $$;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = current_schema() AND table_name = 'email_notifications' AND column_name = 'createdAt'
  ) AND NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = current_schema() AND table_name = 'email_notifications' AND column_name = 'created_at'
  ) THEN
    ALTER TABLE "email_notifications" RENAME COLUMN "createdAt" TO "created_at";
  END IF;
END $$;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = current_schema() AND table_name = 'email_notifications' AND column_name = 'updatedAt'
  ) AND NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = current_schema() AND table_name = 'email_notifications' AND column_name = 'updated_at'
  ) THEN
    ALTER TABLE "email_notifications" RENAME COLUMN "updatedAt" TO "updated_at";
  END IF;
END $$;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = current_schema() AND table_name = 'email_notifications' AND column_name = 'recipientEmail'
  ) AND NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = current_schema() AND table_name = 'email_notifications' AND column_name = 'recipient'
  ) THEN
    ALTER TABLE "email_notifications" RENAME COLUMN "recipientEmail" TO "recipient";
  END IF;
END $$;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = current_schema() AND table_name = 'admin_audit_logs' AND column_name = 'userId'
  ) AND NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = current_schema() AND table_name = 'admin_audit_logs' AND column_name = 'user_id'
  ) THEN
    ALTER TABLE "admin_audit_logs" RENAME COLUMN "userId" TO "user_id";
  END IF;
END $$;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = current_schema() AND table_name = 'admin_audit_logs' AND column_name = 'entityType'
  ) AND NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = current_schema() AND table_name = 'admin_audit_logs' AND column_name = 'entity_type'
  ) THEN
    ALTER TABLE "admin_audit_logs" RENAME COLUMN "entityType" TO "entity_type";
  END IF;
END $$;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = current_schema() AND table_name = 'admin_audit_logs' AND column_name = 'entityId'
  ) AND NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = current_schema() AND table_name = 'admin_audit_logs' AND column_name = 'entity_id'
  ) THEN
    ALTER TABLE "admin_audit_logs" RENAME COLUMN "entityId" TO "entity_id";
  END IF;
END $$;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = current_schema() AND table_name = 'admin_audit_logs' AND column_name = 'createdAt'
  ) AND NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = current_schema() AND table_name = 'admin_audit_logs' AND column_name = 'created_at'
  ) THEN
    ALTER TABLE "admin_audit_logs" RENAME COLUMN "createdAt" TO "created_at";
  END IF;
END $$;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = current_schema() AND table_name = 'settings' AND column_name = 'createdAt'
  ) AND NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = current_schema() AND table_name = 'settings' AND column_name = 'created_at'
  ) THEN
    ALTER TABLE "settings" RENAME COLUMN "createdAt" TO "created_at";
  END IF;
END $$;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = current_schema() AND table_name = 'settings' AND column_name = 'updatedAt'
  ) AND NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = current_schema() AND table_name = 'settings' AND column_name = 'updated_at'
  ) THEN
    ALTER TABLE "settings" RENAME COLUMN "updatedAt" TO "updated_at";
  END IF;
END $$;

-- Safety cleanup: local placeholder image rows must not be served in the public site.
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = current_schema() AND table_name = 'property_images' AND column_name = 'url'
  ) AND EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = current_schema() AND table_name = 'property_images' AND column_name = 'deleted_at'
  ) THEN
    UPDATE "property_images"
    SET "deleted_at" = CURRENT_TIMESTAMP
    WHERE "deleted_at" IS NULL
      AND COALESCE("cloudinary_public_id", '') = ''
      AND ("url" LIKE '/images/accommodations/%' OR COALESCE("secure_url", '') LIKE '/images/accommodations/%');
  END IF;
END $$;
