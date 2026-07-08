/*
  Warnings:

  - You are about to drop the column `failedAt` on the `email_notifications` table. All the data in the column will be lost.
  - You are about to drop the column `rawPayload` on the `email_notifications` table. All the data in the column will be lost.
  - You are about to drop the column `recipientEmail` on the `email_notifications` table. All the data in the column will be lost.
  - You are about to drop the column `subject` on the `email_notifications` table. All the data in the column will be lost.
  - You are about to drop the column `descriptionEn` on the `properties` table. All the data in the column will be lost.
  - You are about to drop the column `descriptionEs` on the `properties` table. All the data in the column will be lost.
  - You are about to drop the column `altEn` on the `property_images` table. All the data in the column will be lost.
  - You are about to drop the column `altEs` on the `property_images` table. All the data in the column will be lost.
  - Added the required column `locale` to the `email_notifications` table without a default value. This is not possible if the table is not empty.
  - Added the required column `recipient` to the `email_notifications` table without a default value. This is not possible if the table is not empty.
  - Added the required column `checkInTime` to the `properties` table without a default value. This is not possible if the table is not empty.
  - Added the required column `longDescriptionEn` to the `properties` table without a default value. This is not possible if the table is not empty.
  - Added the required column `longDescriptionEs` to the `properties` table without a default value. This is not possible if the table is not empty.
  - Added the required column `shortDescriptionEn` to the `properties` table without a default value. This is not possible if the table is not empty.
  - Added the required column `shortDescriptionEs` to the `properties` table without a default value. This is not possible if the table is not empty.
  - Added the required column `altTextEn` to the `property_images` table without a default value. This is not possible if the table is not empty.
  - Added the required column `altTextEs` to the `property_images` table without a default value. This is not possible if the table is not empty.
  - Added the required column `url` to the `property_images` table without a default value. This is not possible if the table is not empty.

*/
-- DropForeignKey
ALTER TABLE "calendar_blocks" DROP CONSTRAINT "calendar_blocks_propertyId_fkey";

-- DropForeignKey
ALTER TABLE "email_notifications" DROP CONSTRAINT "email_notifications_reservationId_fkey";

-- DropIndex
DROP INDEX "calendar_blocks_parentBlockId_idx";

-- DropIndex
DROP INDEX "property_images_cloudinaryPublicId_key";

-- DropIndex
DROP INDEX "property_images_propertyId_idx";

-- AlterTable
ALTER TABLE "email_notifications" DROP COLUMN "failedAt",
DROP COLUMN "rawPayload",
DROP COLUMN "recipientEmail",
DROP COLUMN "subject",
ADD COLUMN     "locale" TEXT NOT NULL,
ADD COLUMN     "providerMessageId" TEXT,
ADD COLUMN     "recipient" TEXT NOT NULL;

-- AlterTable
ALTER TABLE "properties" DROP COLUMN "descriptionEn",
DROP COLUMN "descriptionEs",
ADD COLUMN     "checkInTime" TEXT NOT NULL,
ADD COLUMN     "checkOutTime" TEXT,
ADD COLUMN     "currency" TEXT NOT NULL DEFAULT 'USD',
ADD COLUMN     "isComposed" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "longDescriptionEn" TEXT NOT NULL,
ADD COLUMN     "longDescriptionEs" TEXT NOT NULL,
ADD COLUMN     "preparationDaysAfter" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "preparationDaysBefore" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "shortDescriptionEn" TEXT NOT NULL,
ADD COLUMN     "shortDescriptionEs" TEXT NOT NULL;

-- AlterTable
ALTER TABLE "property_images" DROP COLUMN "altEn",
DROP COLUMN "altEs",
ADD COLUMN     "altTextEn" TEXT NOT NULL,
ADD COLUMN     "altTextEs" TEXT NOT NULL,
ADD COLUMN     "secureUrl" TEXT,
ADD COLUMN     "url" TEXT NOT NULL,
ALTER COLUMN "cloudinaryPublicId" DROP NOT NULL;

-- CreateTable
CREATE TABLE "property_components" (
    "id" TEXT NOT NULL,
    "parentPropertyId" TEXT NOT NULL,
    "componentPropertyId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "property_components_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "admin_audit_logs" (
    "id" TEXT NOT NULL,
    "userId" TEXT,
    "action" TEXT NOT NULL,
    "entityType" TEXT NOT NULL,
    "entityId" TEXT,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "admin_audit_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "settings" (
    "id" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "value" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "settings_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "property_components_componentPropertyId_idx" ON "property_components"("componentPropertyId");

-- CreateIndex
CREATE UNIQUE INDEX "property_components_parentPropertyId_componentPropertyId_key" ON "property_components"("parentPropertyId", "componentPropertyId");

-- CreateIndex
CREATE INDEX "admin_audit_logs_userId_idx" ON "admin_audit_logs"("userId");

-- CreateIndex
CREATE INDEX "admin_audit_logs_entityType_entityId_idx" ON "admin_audit_logs"("entityType", "entityId");

-- CreateIndex
CREATE INDEX "admin_audit_logs_createdAt_idx" ON "admin_audit_logs"("createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "settings_key_key" ON "settings"("key");

-- CreateIndex
CREATE INDEX "payments_status_idx" ON "payments"("status");

-- CreateIndex
CREATE INDEX "property_images_propertyId_sortOrder_idx" ON "property_images"("propertyId", "sortOrder");

-- AddForeignKey
ALTER TABLE "property_components" ADD CONSTRAINT "property_components_parentPropertyId_fkey" FOREIGN KEY ("parentPropertyId") REFERENCES "properties"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "property_components" ADD CONSTRAINT "property_components_componentPropertyId_fkey" FOREIGN KEY ("componentPropertyId") REFERENCES "properties"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "calendar_blocks" ADD CONSTRAINT "calendar_blocks_propertyId_fkey" FOREIGN KEY ("propertyId") REFERENCES "properties"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "email_notifications" ADD CONSTRAINT "email_notifications_reservationId_fkey" FOREIGN KEY ("reservationId") REFERENCES "reservations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "admin_audit_logs" ADD CONSTRAINT "admin_audit_logs_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- RenameIndex
ALTER INDEX "external_calendar_events_externalCalendarId_providerEventUid_ke" RENAME TO "external_calendar_events_externalCalendarId_providerEventUi_key";

-- RenameIndex
ALTER INDEX "external_calendar_events_externalCalendarId_startDate_endDate_i" RENAME TO "external_calendar_events_externalCalendarId_startDate_endDa_idx";
