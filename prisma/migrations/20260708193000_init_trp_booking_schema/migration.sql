-- TRP Booking initial Prisma migration
-- Generated as the missing database bootstrap before Phase 8.4 writes pending reservations.
-- Target database: PostgreSQL / Supabase.
-- If the project uses the Supabase schema `trp_booking`, ensure DATABASE_URL targets that schema
-- for Prisma, for example by using the same schema strategy already documented for the project.

-- Enums
CREATE TYPE "UserRole" AS ENUM ('ADMIN');
CREATE TYPE "PropertyStatus" AS ENUM ('DRAFT', 'ACTIVE', 'INACTIVE');
CREATE TYPE "ReservationStatus" AS ENUM ('PENDING_PAYMENT', 'CONFIRMED', 'CANCELLED', 'REFUNDED', 'PARTIALLY_REFUNDED', 'EXPIRED', 'BLOCKED');
CREATE TYPE "PaymentProvider" AS ENUM ('TILOPAY');
CREATE TYPE "PaymentStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED', 'FAILED', 'REFUNDED', 'PARTIALLY_REFUNDED');
CREATE TYPE "RefundStatus" AS ENUM ('PENDING', 'APPROVED', 'FAILED', 'MANUAL');
CREATE TYPE "CalendarBlockSource" AS ENUM ('DIRECT_RESERVATION', 'AIRBNB', 'MANUAL_BLOCK', 'MAINTENANCE', 'COMPOSED_LISTING_DEPENDENCY', 'PREPARATION_BUFFER');
CREATE TYPE "ExternalCalendarProvider" AS ENUM ('AIRBNB');
CREATE TYPE "ExternalCalendarStatus" AS ENUM ('ACTIVE', 'INACTIVE', 'ERROR');
CREATE TYPE "ExternalCalendarDirection" AS ENUM ('IMPORT', 'EXPORT', 'BIDIRECTIONAL');
CREATE TYPE "ExternalCalendarEventStatus" AS ENUM ('ACTIVE', 'REMOVED', 'CANCELLED');
CREATE TYPE "CalendarSyncTriggeredBy" AS ENUM ('CRON', 'ADMIN', 'SYSTEM');
CREATE TYPE "CalendarSyncStatus" AS ENUM ('STARTED', 'SUCCESS', 'FAILED', 'PARTIAL_SUCCESS');
CREATE TYPE "EmailNotificationType" AS ENUM ('RESERVATION_CONFIRMED', 'PAYMENT_APPROVED', 'PAYMENT_FAILED', 'RESERVATION_CANCELLED', 'RESERVATION_DATES_UPDATED', 'STAY_EXTENSION_CONFIRMED', 'REFUND_PROCESSED', 'ARRIVAL_INSTRUCTIONS', 'ADMIN_NEW_RESERVATION');
CREATE TYPE "EmailNotificationStatus" AS ENUM ('PENDING', 'SENT', 'FAILED', 'SKIPPED');

-- Tables
CREATE TABLE "users" (
    "id" TEXT NOT NULL,
    "name" TEXT,
    "email" TEXT NOT NULL,
    "role" "UserRole" NOT NULL DEFAULT 'ADMIN',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "properties" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "nameEs" TEXT NOT NULL,
    "nameEn" TEXT NOT NULL,
    "descriptionEs" TEXT NOT NULL,
    "descriptionEn" TEXT NOT NULL,
    "baseNightlyPrice" DECIMAL(10,2) NOT NULL,
    "maxGuests" INTEGER NOT NULL,
    "bedrooms" INTEGER NOT NULL,
    "bathrooms" INTEGER NOT NULL,
    "status" "PropertyStatus" NOT NULL DEFAULT 'DRAFT',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),
    "deletedById" TEXT,
    CONSTRAINT "properties_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "property_images" (
    "id" TEXT NOT NULL,
    "propertyId" TEXT NOT NULL,
    "cloudinaryPublicId" TEXT NOT NULL,
    "altEs" TEXT NOT NULL,
    "altEn" TEXT NOT NULL,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "isCover" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),
    "deletedById" TEXT,
    CONSTRAINT "property_images_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "amenities" (
    "id" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "nameEs" TEXT NOT NULL,
    "nameEn" TEXT NOT NULL,
    "icon" TEXT NOT NULL,
    "category" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),
    "deletedById" TEXT,
    CONSTRAINT "amenities_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "property_amenities" (
    "id" TEXT NOT NULL,
    "propertyId" TEXT NOT NULL,
    "amenityId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "property_amenities_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "house_rules" (
    "id" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "titleEs" TEXT NOT NULL,
    "titleEn" TEXT NOT NULL,
    "descriptionEs" TEXT NOT NULL,
    "descriptionEn" TEXT NOT NULL,
    "category" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),
    "deletedById" TEXT,
    CONSTRAINT "house_rules_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "property_rules" (
    "id" TEXT NOT NULL,
    "propertyId" TEXT NOT NULL,
    "ruleId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "property_rules_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "reservations" (
    "id" TEXT NOT NULL,
    "propertyId" TEXT NOT NULL,
    "guestName" TEXT NOT NULL,
    "guestEmail" TEXT NOT NULL,
    "guestPhone" TEXT,
    "guestCountry" TEXT,
    "checkInDate" DATE NOT NULL,
    "checkOutDate" DATE NOT NULL,
    "arrivalTimeEstimate" TEXT,
    "guestCount" INTEGER NOT NULL,
    "status" "ReservationStatus" NOT NULL DEFAULT 'PENDING_PAYMENT',
    "subtotal" DECIMAL(10,2) NOT NULL,
    "cleaningFee" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "taxes" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "discounts" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "total" DECIMAL(10,2) NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'USD',
    "expiresAt" TIMESTAMP(3),
    "confirmedAt" TIMESTAMP(3),
    "cancelledAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "reservations_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "reservation_guests" (
    "id" TEXT NOT NULL,
    "reservationId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT,
    "phone" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "reservation_guests_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "payments" (
    "id" TEXT NOT NULL,
    "reservationId" TEXT NOT NULL,
    "provider" "PaymentProvider" NOT NULL DEFAULT 'TILOPAY',
    "providerTransactionId" TEXT,
    "providerReference" TEXT,
    "status" "PaymentStatus" NOT NULL DEFAULT 'PENDING',
    "amount" DECIMAL(10,2) NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'USD',
    "paidAt" TIMESTAMP(3),
    "failedAt" TIMESTAMP(3),
    "rawPayload" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "payments_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "refunds" (
    "id" TEXT NOT NULL,
    "paymentId" TEXT NOT NULL,
    "providerRefundId" TEXT,
    "amount" DECIMAL(10,2) NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'USD',
    "reason" TEXT,
    "status" "RefundStatus" NOT NULL DEFAULT 'PENDING',
    "rawPayload" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "refunds_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "calendar_blocks" (
    "id" TEXT NOT NULL,
    "propertyId" TEXT NOT NULL,
    "startDate" DATE NOT NULL,
    "endDate" DATE NOT NULL,
    "source" "CalendarBlockSource" NOT NULL,
    "reason" TEXT,
    "reservationId" TEXT,
    "externalCalendarEventId" TEXT,
    "parentBlockId" TEXT,
    "isAdminOverrideAllowed" BOOLEAN NOT NULL DEFAULT false,
    "unlockedByAdminAt" TIMESTAMP(3),
    "unlockedByAdminId" TEXT,
    "adminOverrideReason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),
    "deletedById" TEXT,
    CONSTRAINT "calendar_blocks_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "external_calendars" (
    "id" TEXT NOT NULL,
    "propertyId" TEXT NOT NULL,
    "provider" "ExternalCalendarProvider" NOT NULL DEFAULT 'AIRBNB',
    "direction" "ExternalCalendarDirection" NOT NULL DEFAULT 'BIDIRECTIONAL',
    "name" TEXT NOT NULL,
    "importUrlEncrypted" TEXT,
    "exportTokenHash" TEXT,
    "exportTokenLastRotatedAt" TIMESTAMP(3),
    "isImportEnabled" BOOLEAN NOT NULL DEFAULT true,
    "isExportEnabled" BOOLEAN NOT NULL DEFAULT true,
    "lastImportStartedAt" TIMESTAMP(3),
    "lastImportFinishedAt" TIMESTAMP(3),
    "lastExportGeneratedAt" TIMESTAMP(3),
    "lastFailureCode" TEXT,
    "lastFailureMessage" TEXT,
    "status" "ExternalCalendarStatus" NOT NULL DEFAULT 'ACTIVE',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),
    "deletedById" TEXT,
    CONSTRAINT "external_calendars_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "external_calendar_events" (
    "id" TEXT NOT NULL,
    "externalCalendarId" TEXT NOT NULL,
    "providerEventUid" TEXT NOT NULL,
    "status" "ExternalCalendarEventStatus" NOT NULL DEFAULT 'ACTIVE',
    "summary" TEXT,
    "startDate" DATE NOT NULL,
    "endDate" DATE NOT NULL,
    "firstSeenAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastSeenAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "removedAt" TIMESTAMP(3),
    "rawPayload" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "external_calendar_events_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "external_calendar_sync_logs" (
    "id" TEXT NOT NULL,
    "externalCalendarId" TEXT NOT NULL,
    "triggeredBy" "CalendarSyncTriggeredBy" NOT NULL,
    "status" "CalendarSyncStatus" NOT NULL DEFAULT 'STARTED',
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "finishedAt" TIMESTAMP(3),
    "eventsImported" INTEGER NOT NULL DEFAULT 0,
    "eventsUpdated" INTEGER NOT NULL DEFAULT 0,
    "eventsRemoved" INTEGER NOT NULL DEFAULT 0,
    "eventsSkipped" INTEGER NOT NULL DEFAULT 0,
    "blocksCreated" INTEGER NOT NULL DEFAULT 0,
    "blocksUpdated" INTEGER NOT NULL DEFAULT 0,
    "errorCode" TEXT,
    "errorMessage" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "external_calendar_sync_logs_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "email_notifications" (
    "id" TEXT NOT NULL,
    "reservationId" TEXT NOT NULL,
    "type" "EmailNotificationType" NOT NULL,
    "status" "EmailNotificationStatus" NOT NULL DEFAULT 'PENDING',
    "recipientEmail" TEXT NOT NULL,
    "subject" TEXT,
    "sentAt" TIMESTAMP(3),
    "failedAt" TIMESTAMP(3),
    "errorMessage" TEXT,
    "rawPayload" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "email_notifications_pkey" PRIMARY KEY ("id")
);

-- Unique constraints
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");
CREATE UNIQUE INDEX "properties_slug_key" ON "properties"("slug");
CREATE UNIQUE INDEX "property_images_cloudinaryPublicId_key" ON "property_images"("cloudinaryPublicId");
CREATE UNIQUE INDEX "amenities_key_key" ON "amenities"("key");
CREATE UNIQUE INDEX "property_amenities_propertyId_amenityId_key" ON "property_amenities"("propertyId", "amenityId");
CREATE UNIQUE INDEX "house_rules_key_key" ON "house_rules"("key");
CREATE UNIQUE INDEX "property_rules_propertyId_ruleId_key" ON "property_rules"("propertyId", "ruleId");
CREATE UNIQUE INDEX "external_calendars_exportTokenHash_key" ON "external_calendars"("exportTokenHash");
CREATE UNIQUE INDEX "external_calendar_events_externalCalendarId_providerEventUid_key" ON "external_calendar_events"("externalCalendarId", "providerEventUid");

-- Indexes
CREATE INDEX "properties_status_idx" ON "properties"("status");
CREATE INDEX "properties_deletedAt_idx" ON "properties"("deletedAt");
CREATE INDEX "property_images_propertyId_idx" ON "property_images"("propertyId");
CREATE INDEX "property_images_deletedAt_idx" ON "property_images"("deletedAt");
CREATE INDEX "amenities_deletedAt_idx" ON "amenities"("deletedAt");
CREATE INDEX "property_amenities_amenityId_idx" ON "property_amenities"("amenityId");
CREATE INDEX "house_rules_deletedAt_idx" ON "house_rules"("deletedAt");
CREATE INDEX "property_rules_ruleId_idx" ON "property_rules"("ruleId");
CREATE INDEX "reservations_propertyId_checkInDate_checkOutDate_idx" ON "reservations"("propertyId", "checkInDate", "checkOutDate");
CREATE INDEX "reservations_status_idx" ON "reservations"("status");
CREATE INDEX "reservations_guestEmail_idx" ON "reservations"("guestEmail");
CREATE INDEX "reservation_guests_reservationId_idx" ON "reservation_guests"("reservationId");
CREATE INDEX "payments_reservationId_idx" ON "payments"("reservationId");
CREATE INDEX "payments_provider_providerReference_idx" ON "payments"("provider", "providerReference");
CREATE INDEX "refunds_paymentId_idx" ON "refunds"("paymentId");
CREATE INDEX "refunds_status_idx" ON "refunds"("status");
CREATE INDEX "calendar_blocks_propertyId_startDate_endDate_idx" ON "calendar_blocks"("propertyId", "startDate", "endDate");
CREATE INDEX "calendar_blocks_source_idx" ON "calendar_blocks"("source");
CREATE INDEX "calendar_blocks_reservationId_idx" ON "calendar_blocks"("reservationId");
CREATE INDEX "calendar_blocks_externalCalendarEventId_idx" ON "calendar_blocks"("externalCalendarEventId");
CREATE INDEX "calendar_blocks_parentBlockId_idx" ON "calendar_blocks"("parentBlockId");
CREATE INDEX "calendar_blocks_deletedAt_idx" ON "calendar_blocks"("deletedAt");
CREATE INDEX "external_calendars_propertyId_idx" ON "external_calendars"("propertyId");
CREATE INDEX "external_calendars_provider_status_idx" ON "external_calendars"("provider", "status");
CREATE INDEX "external_calendars_direction_idx" ON "external_calendars"("direction");
CREATE INDEX "external_calendars_deletedAt_idx" ON "external_calendars"("deletedAt");
CREATE INDEX "external_calendar_events_externalCalendarId_startDate_endDate_idx" ON "external_calendar_events"("externalCalendarId", "startDate", "endDate");
CREATE INDEX "external_calendar_events_status_idx" ON "external_calendar_events"("status");
CREATE INDEX "external_calendar_sync_logs_externalCalendarId_idx" ON "external_calendar_sync_logs"("externalCalendarId");
CREATE INDEX "external_calendar_sync_logs_status_idx" ON "external_calendar_sync_logs"("status");
CREATE INDEX "external_calendar_sync_logs_startedAt_idx" ON "external_calendar_sync_logs"("startedAt");
CREATE INDEX "email_notifications_reservationId_idx" ON "email_notifications"("reservationId");
CREATE INDEX "email_notifications_status_idx" ON "email_notifications"("status");
CREATE INDEX "email_notifications_type_idx" ON "email_notifications"("type");

-- Foreign keys
ALTER TABLE "properties" ADD CONSTRAINT "properties_deletedById_fkey" FOREIGN KEY ("deletedById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "property_images" ADD CONSTRAINT "property_images_propertyId_fkey" FOREIGN KEY ("propertyId") REFERENCES "properties"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "property_images" ADD CONSTRAINT "property_images_deletedById_fkey" FOREIGN KEY ("deletedById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "amenities" ADD CONSTRAINT "amenities_deletedById_fkey" FOREIGN KEY ("deletedById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "property_amenities" ADD CONSTRAINT "property_amenities_propertyId_fkey" FOREIGN KEY ("propertyId") REFERENCES "properties"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "property_amenities" ADD CONSTRAINT "property_amenities_amenityId_fkey" FOREIGN KEY ("amenityId") REFERENCES "amenities"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "house_rules" ADD CONSTRAINT "house_rules_deletedById_fkey" FOREIGN KEY ("deletedById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "property_rules" ADD CONSTRAINT "property_rules_propertyId_fkey" FOREIGN KEY ("propertyId") REFERENCES "properties"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "property_rules" ADD CONSTRAINT "property_rules_ruleId_fkey" FOREIGN KEY ("ruleId") REFERENCES "house_rules"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "reservations" ADD CONSTRAINT "reservations_propertyId_fkey" FOREIGN KEY ("propertyId") REFERENCES "properties"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "reservation_guests" ADD CONSTRAINT "reservation_guests_reservationId_fkey" FOREIGN KEY ("reservationId") REFERENCES "reservations"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "payments" ADD CONSTRAINT "payments_reservationId_fkey" FOREIGN KEY ("reservationId") REFERENCES "reservations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "refunds" ADD CONSTRAINT "refunds_paymentId_fkey" FOREIGN KEY ("paymentId") REFERENCES "payments"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "calendar_blocks" ADD CONSTRAINT "calendar_blocks_propertyId_fkey" FOREIGN KEY ("propertyId") REFERENCES "properties"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "calendar_blocks" ADD CONSTRAINT "calendar_blocks_reservationId_fkey" FOREIGN KEY ("reservationId") REFERENCES "reservations"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "calendar_blocks" ADD CONSTRAINT "calendar_blocks_externalCalendarEventId_fkey" FOREIGN KEY ("externalCalendarEventId") REFERENCES "external_calendar_events"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "calendar_blocks" ADD CONSTRAINT "calendar_blocks_parentBlockId_fkey" FOREIGN KEY ("parentBlockId") REFERENCES "calendar_blocks"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "calendar_blocks" ADD CONSTRAINT "calendar_blocks_unlockedByAdminId_fkey" FOREIGN KEY ("unlockedByAdminId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "calendar_blocks" ADD CONSTRAINT "calendar_blocks_deletedById_fkey" FOREIGN KEY ("deletedById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "external_calendars" ADD CONSTRAINT "external_calendars_propertyId_fkey" FOREIGN KEY ("propertyId") REFERENCES "properties"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "external_calendars" ADD CONSTRAINT "external_calendars_deletedById_fkey" FOREIGN KEY ("deletedById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "external_calendar_events" ADD CONSTRAINT "external_calendar_events_externalCalendarId_fkey" FOREIGN KEY ("externalCalendarId") REFERENCES "external_calendars"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "external_calendar_sync_logs" ADD CONSTRAINT "external_calendar_sync_logs_externalCalendarId_fkey" FOREIGN KEY ("externalCalendarId") REFERENCES "external_calendars"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "email_notifications" ADD CONSTRAINT "email_notifications_reservationId_fkey" FOREIGN KEY ("reservationId") REFERENCES "reservations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
