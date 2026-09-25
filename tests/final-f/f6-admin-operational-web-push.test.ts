import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";

import { test } from "./harness";

const ROOT = process.cwd();
const MIGRATION_NAME =
  "20260925190000_final_f_6_admin_operational_notifications";

function fromRoot(relativePath: string): string {
  return path.join(ROOT, relativePath);
}

function read(relativePath: string): string {
  return readFileSync(fromRoot(relativePath), "utf8");
}

function exists(relativePath: string): boolean {
  return existsSync(fromRoot(relativePath));
}

function expectIncludes(source: string, expected: string): void {
  assert.ok(
    source.includes(expected),
    `Expected source to include: ${expected}`,
  );
}

function expectExcludes(source: string, unexpected: string): void {
  assert.equal(
    source.includes(unexpected),
    false,
    `Expected source to exclude: ${unexpected}`,
  );
}

const SCHEMA = read("prisma/schema.prisma");
const MIGRATION = read(
  `prisma/migrations/${MIGRATION_NAME}/migration.sql`,
);
const OPERATIONAL_SERVICE = read("lib/admin-notifications/operational.ts");
const CENTER_SERVICE = read("lib/admin-notifications/center.ts");
const TARGETS = read("lib/admin-notifications/targets.ts");
const ADMIN_INDEX = read("lib/admin/index.ts");
const CONFIRMATION = read("lib/reservations/confirmation.ts");
const CANCELLATION = read("lib/admin/reservation-cancellation.ts");
const REVIEW_SUBMISSION = read("lib/reviews/review-submission.ts");
const CRON_TYPES = read("types/cron-job.ts");
const CRON_REGISTRY = read("lib/cron/registry.ts");
const CRON_ROUTE = read(
  "app/api/cron/process-admin-push-notifications/route.ts",
);
const READ_ROUTE = read(
  "app/api/admin/notifications/[notificationId]/read/route.ts",
);
const NOTIFICATIONS_PAGE = read("app/admin/notifications/page.tsx");
const NOTIFICATIONS_VIEW = read(
  "features/admin/components/admin-notifications-page.tsx",
);
const TEMPLATE_DATA = read("emails/template-data.ts");
const LIFECYCLE_TEMPLATE_DATA = read("emails/lifecycle-template-data.ts");
const REVIEW_TEMPLATE_DATA = read(
  "emails/admin-review-submitted-template-data.ts",
);
const ES_MESSAGES = read("messages/es.ts");
const EN_MESSAGES = read("messages/en.ts");
const VERCEL = read("vercel.json");

test("F.6 adds only the five accepted AdminNotification types", () => {
  for (const expected of [
    "enum AdminNotificationType",
    "RESERVATION_CONFIRMED",
    "RESERVATION_CANCELLED",
    "CHECK_IN_MINUS_48H",
    "CHECK_OUT_MINUS_6H",
    "REVIEW_SUBMITTED",
    '@@map("admin_notification_type")',
  ]) {
    expectIncludes(SCHEMA, expected);
  }

  expectExcludes(SCHEMA, "GUEST_EMAIL_RECEIVED");
});

test("F.6 adds durable notification, read-state and delivery persistence", () => {
  for (const expected of [
    "model AdminNotification",
    "deduplicationKey String                @unique",
    "targetPath       String",
    "model AdminNotificationRead",
    "@@id([notificationId, userId])",
    "model AdminPushDelivery",
    "AdminPushDeliveryStatus",
    "@@unique([notificationId, subscriptionId])",
    "@@index([status, nextAttemptAt])",
    "adminNotificationReads",
    "deliveries AdminPushDelivery[]",
  ]) {
    expectIncludes(SCHEMA, expected);
  }
});

test("F.6 migration creates exactly the operational notification tables and cron enum value", () => {
  assert.equal(exists(`prisma/migrations/${MIGRATION_NAME}/migration.sql`), true);

  for (const expected of [
    'CREATE TYPE "admin_notification_type"',
    "'RESERVATION_CONFIRMED'",
    "'REVIEW_SUBMITTED'",
    'CREATE TYPE "admin_push_delivery_status"',
    "ALTER TYPE \"cron_job_key\" ADD VALUE 'PROCESS_ADMIN_PUSH_NOTIFICATIONS'",
    'CREATE TABLE "admin_notifications"',
    'CREATE TABLE "admin_notification_reads"',
    'CREATE TABLE "admin_push_deliveries"',
    'CREATE UNIQUE INDEX "admin_notifications_deduplication_key_key"',
    'CREATE UNIQUE INDEX "admin_push_deliveries_notification_id_subscription_id_key"',
    'REFERENCES "admin_push_subscriptions"("id") ON DELETE CASCADE',
  ]) {
    expectIncludes(MIGRATION, expected);
  }

  expectExcludes(MIGRATION, "guest_email_received");
});

test("F.6 shares Admin target resolution across push and existing email CTAs", () => {
  for (const source of [TARGETS, TEMPLATE_DATA, LIFECYCLE_TEMPLATE_DATA, REVIEW_TEMPLATE_DATA]) {
    expectIncludes(source, "resolveAdminNotificationTarget");
  }

  expectIncludes(TARGETS, 'kind: "reservation"');
  expectIncludes(TARGETS, 'kind: "reviews"');
  expectIncludes(TARGETS, "/admin/reservations/");
  expectIncludes(TARGETS, "/admin/reviews");
  expectIncludes(TARGETS, "buildAbsoluteAdminNotificationTargetUrl");
  expectIncludes(TEMPLATE_DATA, "buildAbsoluteAdminNotificationTargetUrl");
  expectIncludes(LIFECYCLE_TEMPLATE_DATA, "buildAbsoluteAdminNotificationTargetUrl");
  expectIncludes(REVIEW_TEMPLATE_DATA, "buildAbsoluteAdminNotificationTargetUrl");
});

test("F.6 creates idempotent durable intents and deliveries without requiring subscriptions", () => {
  for (const expected of [
    "ensureAdminOperationalNotificationIntent",
    "deduplicationKey",
    "createMany({",
    "skipDuplicates: true",
    "adminPushSubscription.findMany",
    "where: { active: true }",
    "adminPushDelivery.createMany",
    "subscriptions.length > 0",
  ]) {
    expectIncludes(OPERATIONAL_SERVICE, expected);
  }
});

test("F.6 lock-screen copy is privacy-bounded and localized", () => {
  for (const expected of [
    "Reservación confirmada ·",
    "Reservación cancelada ·",
    "Check-in en 48 horas ·",
    "Check-out en 6 horas ·",
    "Nueva reseña recibida ·",
    "Reservation confirmed ·",
    "Reservation cancelled ·",
    "Check-in in 48 hours ·",
    "Check-out in 6 hours ·",
    "New review received ·",
    "Toca para ver detalles.",
    "Tap to view details.",
  ]) {
    expectIncludes(OPERATIONAL_SERVICE, expected);
  }

  for (const forbidden of [
    "guestEmail",
    "guestPhone",
    "guestName",
    "comment:",
    "amount:",
    "accessToken",
  ]) {
    expectExcludes(OPERATIONAL_SERVICE, forbidden);
  }
});

test("F.6 hooks confirmation, cancellation and review submission after durable transactions", () => {
  for (const expected of [
    "ensureReservationConfirmedAdminNotificationIntent",
    "deliverAdminPushNotificationsBestEffort",
    "adminPushNotificationIds",
  ]) {
    expectIncludes(CONFIRMATION, expected);
  }

  for (const expected of [
    "ensureReservationCancelledAdminNotificationIntent",
    "ReservationStatus.CANCELLED",
    "deliverAdminPushNotificationsBestEffort",
    "adminPushNotificationIds",
  ]) {
    expectIncludes(CANCELLATION, expected);
  }

  for (const expected of [
    "ensureReviewSubmittedAdminNotificationIntent",
    "reviewId: review.id",
    "adminPushNotificationIds",
    "deliverAdminPushNotificationsBestEffort",
  ]) {
    expectIncludes(REVIEW_SUBMISSION, expected);
  }
});

test("F.6 reminder scheduler uses accepted Guatemala timing and bounded batches", () => {
  for (const expected of [
    "REMINDER_CANDIDATE_BATCH_SIZE = 500",
    "CHECK_IN_REMINDER_WINDOW_MS = 48 * 60 * 60 * 1000",
    "CHECK_OUT_REMINDER_WINDOW_MS = 6 * 60 * 60 * 1000",
    "getArrivalCheckInDateTime",
    "normalizeTimeOfDay",
    "calculateReviewInvitationTimes",
    "confirmedAt: { not: null }",
    "cancelledAt: null",
    "ReservationStatus.CONFIRMED",
  ]) {
    expectIncludes(OPERATIONAL_SERVICE, expected);
  }
});

test("F.6 Web Push processing has retry, stale recovery and delivery-time admin validation", () => {
  for (const expected of [
    "ADMIN_PUSH_DELIVERY_BATCH_SIZE = 50",
    "ADMIN_PUSH_DELIVERY_MAX_ATTEMPTS = 5",
    "ADMIN_PUSH_DELIVERY_STALE_TIMEOUT_MS = 10 * 60 * 1000",
    "ADMIN_PUSH_RETRY_DELAYS_MS",
    "5 * 60 * 1000",
    "15 * 60 * 1000",
    "60 * 60 * 1000",
    "6 * 60 * 60 * 1000",
    "getAllowedAdminEmails",
    "UserRole.ADMIN",
    "isAllowedAdminEmail",
    "statusCode === 404 || statusCode === 410",
    "statusCode === 429",
    "statusCode !== null && statusCode >= 500",
    "active: false",
  ]) {
    expectIncludes(OPERATIONAL_SERVICE, expected);
  }
});

test("F.6 unavailable Web Push configuration does not claim pending deliveries", () => {
  const processIndex = OPERATIONAL_SERVICE.indexOf(
    "export async function processAdminPushNotifications",
  );
  const processBlock = OPERATIONAL_SERVICE.slice(processIndex);
  const unavailableIndex = processBlock.indexOf("if (!env || !allowedAdminEmails)");
  const recoverIndex = processBlock.indexOf("recoverStaleAdminPushDeliveries");
  const claimIndex = processBlock.indexOf("claimEligibleAdminPushDeliveries");

  assert.ok(processIndex >= 0);
  assert.ok(unavailableIndex >= 0);
  assert.ok(recoverIndex > unavailableIndex);
  assert.ok(claimIndex > unavailableIndex);
  expectIncludes(OPERATIONAL_SERVICE, "deliveryMode: \"unavailable\"");
});

test("F.6 registers the internal cron job but keeps Vercel crons empty", () => {
  for (const source of [CRON_TYPES, CRON_REGISTRY, CRON_ROUTE]) {
    expectIncludes(source, "process-admin-push-notifications");
  }

  expectIncludes(CRON_TYPES, "PROCESS_ADMIN_PUSH_NOTIFICATIONS");
  expectIncludes(CRON_REGISTRY, "processAdminPushNotifications");
  expectIncludes(CRON_REGISTRY, "*/5 * * * *");
  assert.deepEqual(JSON.parse(VERCEL), { crons: [] });
});

test("F.6 notification center exposes safe history and per-admin read state", () => {
  for (const expected of [
    "getAdminNotificationCenter",
    "take: 50",
    "reads: {",
    "unreadCount",
    "coerceAdminNotificationTargetPath",
    "markAdminNotificationRead",
    "notificationId_userId",
    "upsert",
  ]) {
    expectIncludes(CENTER_SERVICE, expected);
  }

  expectIncludes(ADMIN_INDEX, "getAdminNotificationCenter");
  expectIncludes(ADMIN_INDEX, "markAdminNotificationRead");
});

test("F.6 mark-read API is ADMIN protected, origin checked and idempotent", () => {
  for (const expected of [
    'dynamic = "force-dynamic"',
    'runtime = "nodejs"',
    "getAdminSessionActor",
    "isValidAdminMutationOrigin",
    "markAdminNotificationRead",
    "export async function POST",
    "export async function PATCH",
    "adminApiSuccessResponse",
    "adminApiErrorResponse",
  ]) {
    expectIncludes(READ_ROUTE, expected);
  }
});

test("F.6 /admin/notifications preserves R5 device UX and adds safe recent history", () => {
  expectIncludes(NOTIFICATIONS_PAGE, "getAdminNotificationCenter");
  expectIncludes(NOTIFICATIONS_PAGE, "notificationCenter={notificationCenter}");
  expectIncludes(NOTIFICATIONS_VIEW, "notificationCenter");
  expectIncludes(NOTIFICATIONS_VIEW, "recentNotifications");
  expectIncludes(NOTIFICATIONS_VIEW, "copy.history.title");
  expectIncludes(NOTIFICATIONS_VIEW, "safeAdminTargetPath");
  expectIncludes(NOTIFICATIONS_VIEW, '"/api/admin/push/test"');
  expectIncludes(NOTIFICATIONS_VIEW, '"/api/admin/push/subscriptions"');
  expectIncludes(NOTIFICATIONS_VIEW, "/api/admin/notifications/");
});

test("F.6 localized copy covers history, cron labels and mark-read errors", () => {
  for (const source of [ES_MESSAGES, EN_MESSAGES]) {
    expectIncludes(source, "PROCESS_ADMIN_PUSH_NOTIFICATIONS");
    expectIncludes(source, "history:");
    expectIncludes(source, "markRead");
    expectIncludes(source, "ADMIN_NOTIFICATION_ORIGIN_INVALID");
    expectIncludes(source, "INVALID_ADMIN_NOTIFICATION_REQUEST");
    expectIncludes(source, "ADMIN_NOTIFICATION_NOT_FOUND");
  }
});

test("F.6 runtime sources do not log push secrets, endpoints or provider bodies", () => {
  for (const source of [
    OPERATIONAL_SERVICE,
    CENTER_SERVICE,
    READ_ROUTE,
    CRON_ROUTE,
    NOTIFICATIONS_VIEW,
  ]) {
    expectExcludes(source, "console.log");
    expectExcludes(source, "console.error");
    expectExcludes(source, "provider body");
    expectExcludes(source, "raw provider");
    expectExcludes(source, "WEB_PUSH_VAPID_PRIVATE_KEY");
  }
});
