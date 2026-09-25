import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import {
  AdminNotificationType,
  AdminPushDeliveryStatus,
  type PrismaClient,
} from "@prisma/client";

import {
  buildCheckInMinus48hAdminNotificationDeduplicationKey,
  buildCheckOutMinus6hAdminNotificationDeduplicationKey,
  calculateNextAdminPushDeliveryAttemptAt,
  classifyAdminPushDeliveryStatusCode,
  isCheckInMinus48hAdminReminderDue,
  isCheckOutMinus6hAdminReminderDue,
  recoverStaleAdminPushDeliveries,
} from "@/lib/admin-notifications/operational";
import {
  buildAbsoluteAdminNotificationTargetUrl,
  coerceAdminNotificationTargetPath,
  resolveAdminNotificationTarget,
} from "@/lib/admin-notifications/targets";
import {
  getAdminNotificationCenter,
  markAdminNotificationRead,
} from "@/lib/admin-notifications/center";
import {
  resolveAdminNotificationsActiveTab,
  resolveAdminNotificationsDefaultTab,
  type AdminNotificationsDeviceState,
  type AdminNotificationsTab,
} from "@/features/admin/components/admin-notifications-page";
import type { AdminActor } from "@/types/admin";

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

function expectOrderedSource(source: string, expected: string[]): void {
  let previousIndex = -1;

  for (const snippet of expected) {
    const index = source.indexOf(snippet);
    assert.ok(index >= 0, `Expected source to include: ${snippet}`);
    assert.ok(
      index > previousIndex,
      `Expected ${snippet} to appear after the previous ordered snippet`,
    );
    previousIndex = index;
  }
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

type FakeAdminPushDelivery = {
  id: string;
  status: AdminPushDeliveryStatus;
  attemptCount: number;
  processingStartedAt: Date | null;
  nextAttemptAt: Date | null;
  errorCode: string | null;
  errorMessage: string | null;
};

type FakeNotificationRead = {
  notificationId: string;
  userId: string;
  readAt: Date;
};

function createFakeRecoveryClient(deliveries: FakeAdminPushDelivery[]) {
  return {
    adminPushDelivery: {
      async updateMany(input: {
        where: {
          status: AdminPushDeliveryStatus;
          processingStartedAt: { lt: Date };
          attemptCount: { lt?: number; gte?: number };
        };
        data: Partial<FakeAdminPushDelivery>;
      }): Promise<{ count: number }> {
        let count = 0;

        for (const delivery of deliveries) {
          const isStale =
            delivery.status === input.where.status &&
            delivery.processingStartedAt !== null &&
            delivery.processingStartedAt.getTime() <
              input.where.processingStartedAt.lt.getTime();
          const attemptMatches =
            input.where.attemptCount.lt !== undefined
              ? delivery.attemptCount < input.where.attemptCount.lt
              : delivery.attemptCount >= input.where.attemptCount.gte!;

          if (!isStale || !attemptMatches) {
            continue;
          }

          Object.assign(delivery, input.data);
          count += 1;
        }

        return { count };
      },
    },
  } as unknown as Pick<PrismaClient, "adminPushDelivery">;
}

function createFakeNotificationCenterClient() {
  const notifications = [
    {
      id: "notification-1",
      type: AdminNotificationType.RESERVATION_CONFIRMED,
      title: "Reservación confirmada · Bungalow",
      body: "Toca para ver detalles.",
      targetPath: "/admin/reservations/res-1",
      createdAt: new Date("2026-09-25T18:00:00.000Z"),
    },
  ];
  const reads: FakeNotificationRead[] = [];
  const usersByEmail = new Map([
    ["admin-a@example.com", { id: "admin-a", email: "admin-a@example.com", name: null }],
    ["admin-b@example.com", { id: "admin-b", email: "admin-b@example.com", name: null }],
  ]);

  const prismaClient = {
    adminNotification: {
      async findMany(input: {
        select: { reads: { where: { userId: string } } };
      }) {
        const userId = input.select.reads.where.userId;

        return notifications.map((notification) => ({
          ...notification,
          reads: reads
            .filter(
              (read) =>
                read.notificationId === notification.id &&
                read.userId === userId,
            )
            .map((read) => ({ readAt: read.readAt })),
        }));
      },
      async count(input: { where: { reads: { none: { userId: string } } } }) {
        const userId = input.where.reads.none.userId;

        return notifications.filter(
          (notification) =>
            !reads.some(
              (read) =>
                read.notificationId === notification.id &&
                read.userId === userId,
            ),
        ).length;
      },
      async findUnique(input: { where: { id: string } }) {
        const notification = notifications.find(
          (current) => current.id === input.where.id,
        );

        return notification ? { id: notification.id } : null;
      },
    },
    adminNotificationRead: {
      async createMany(input: {
        data: FakeNotificationRead;
        skipDuplicates: boolean;
      }) {
        const exists = reads.some(
          (read) =>
            read.notificationId === input.data.notificationId &&
            read.userId === input.data.userId,
        );

        if (!exists) {
          reads.push({ ...input.data });
          return { count: 1 };
        }

        return { count: input.skipDuplicates ? 0 : 1 };
      },
      async findUnique(input: {
        where: {
          notificationId_userId: {
            notificationId: string;
            userId: string;
          };
        };
      }) {
        const read = reads.find(
          (current) =>
            current.notificationId ===
              input.where.notificationId_userId.notificationId &&
            current.userId === input.where.notificationId_userId.userId,
        );

        return read ? { readAt: read.readAt } : null;
      },
    },
  } as unknown as PrismaClient;

  return {
    prismaClient,
    resolveActor: async (_client: PrismaClient, actor: AdminActor) => {
      const user = usersByEmail.get(actor.email);

      if (!user) {
        throw new Error("ADMIN_UNAUTHORIZED");
      }

      return user;
    },
  };
}

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
    "createMany",
    "skipDuplicates: true",
    "findUnique",
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
  expectIncludes(NOTIFICATIONS_VIEW, "Tabs, TabsContent, TabsList, TabsTrigger");
  expectIncludes(NOTIFICATIONS_VIEW, '<TabsList className="grid w-full grid-cols-2');
  expectIncludes(NOTIFICATIONS_VIEW, '<TabsTrigger className="min-h-10" value="notifications">');
  expectIncludes(NOTIFICATIONS_VIEW, '<TabsTrigger className="min-h-10" value="configuration">');
  expectIncludes(NOTIFICATIONS_VIEW, '<TabsContent className="mt-6" value="notifications">');
  expectIncludes(NOTIFICATIONS_VIEW, '<TabsContent className="mt-6" value="configuration">');
  expectIncludes(NOTIFICATIONS_VIEW, "copy.tabs.notifications");
  expectIncludes(NOTIFICATIONS_VIEW, "copy.tabs.configuration");
  expectIncludes(NOTIFICATIONS_VIEW, "safeAdminTargetPath");
  expectIncludes(NOTIFICATIONS_VIEW, '"/api/admin/push/test"');
  expectIncludes(NOTIFICATIONS_VIEW, '"/api/admin/push/subscriptions"');
  expectIncludes(NOTIFICATIONS_VIEW, "/api/admin/notifications/");
  expectExcludes(NOTIFICATIONS_VIEW, "xl:grid-cols-[minmax(0,1fr)_22rem]");
});

test("F.6 localized copy covers history, cron labels and mark-read errors", () => {
  for (const source of [ES_MESSAGES, EN_MESSAGES]) {
    expectIncludes(source, "PROCESS_ADMIN_PUSH_NOTIFICATIONS");
    expectIncludes(source, "history:");
    expectIncludes(source, "tabs:");
    expectIncludes(source, "markRead");
    expectIncludes(source, "ADMIN_NOTIFICATION_ORIGIN_INVALID");
    expectIncludes(source, "INVALID_ADMIN_NOTIFICATION_REQUEST");
    expectIncludes(source, "ADMIN_NOTIFICATION_NOT_FOUND");
  }

  expectIncludes(ES_MESSAGES, 'notifications: "Notificaciones recientes"');
  expectIncludes(ES_MESSAGES, 'configuration: "Configuración"');
  expectIncludes(EN_MESSAGES, 'notifications: "Recent notifications"');
  expectIncludes(EN_MESSAGES, 'configuration: "Configuration"');
});

test("F.6 /admin/notifications source keeps tab content isolated", () => {
  const notificationsTabIndex = NOTIFICATIONS_VIEW.indexOf(
    '<TabsContent className="mt-6" value="notifications">',
  );
  const configurationTabIndex = NOTIFICATIONS_VIEW.indexOf(
    '<TabsContent className="mt-6" value="configuration">',
  );
  const historyIndex = NOTIFICATIONS_VIEW.indexOf("copy.history.title");
  const installIndex = NOTIFICATIONS_VIEW.indexOf("copy.install.title");
  const deviceIndex = NOTIFICATIONS_VIEW.indexOf("copy.device.title");
  const statusGridIndex = NOTIFICATIONS_VIEW.indexOf("statusItems.map");

  assert.ok(notificationsTabIndex >= 0);
  assert.ok(configurationTabIndex > notificationsTabIndex);
  assert.ok(historyIndex > notificationsTabIndex);
  assert.ok(historyIndex < configurationTabIndex);
  assert.ok(installIndex > configurationTabIndex);
  assert.ok(deviceIndex > installIndex);
  assert.ok(statusGridIndex > deviceIndex);
});

test("F.6 /admin/notifications configuration source order is stable", () => {
  expectOrderedSource(NOTIFICATIONS_VIEW, [
    "copy.install.title",
    "copy.device.title",
    "statusItems.map",
  ]);

  expectOrderedSource(NOTIFICATIONS_VIEW, [
    "copy.status.browserSupport",
    "copy.status.serverConfig",
    "copy.status.permission",
    "copy.status.serviceWorker",
    "copy.status.browserSubscription",
    "copy.status.serverRegistration",
    "copy.status.displayMode",
  ]);
});

test("F.6 /admin/notifications removes obsolete scope and accepted-target UI copy", () => {
  for (const source of [NOTIFICATIONS_VIEW, ES_MESSAGES, EN_MESSAGES]) {
    for (const obsolete of [
      "copy.scope",
      "copy.android",
      "Operational scope",
      "Accepted target",
      "Alcance operativo",
      "Target aceptado",
    ]) {
      expectExcludes(source, obsolete);
    }
  }
});

test("F.6 notification tabs default from complete device setup only", () => {
  const readyDevice: AdminNotificationsDeviceState = {
    supported: true,
    configured: true,
    permission: "granted",
    serviceWorkerState: "ready",
    subscriptionState: "subscribed",
    serverRegistrationState: "registered",
    displayMode: "standalone",
  };

  assert.equal(resolveAdminNotificationsDefaultTab(readyDevice), "notifications");

  const incompleteCases: Array<
    [string, Partial<AdminNotificationsDeviceState>]
  > = [
    ["not installed", { displayMode: "browser" }],
    ["permission default", { permission: "default" }],
    ["permission denied", { permission: "denied" }],
    ["subscription missing", { subscriptionState: "notSubscribed" }],
    ["server registration missing", { serverRegistrationState: "notRegistered" }],
    ["service worker checking", { serviceWorkerState: "checking" }],
    ["service worker error", { serviceWorkerState: "error" }],
    ["server config unavailable", { configured: false }],
    ["unsupported browser", { supported: false }],
  ];

  for (const [name, override] of incompleteCases) {
    assert.equal(
      resolveAdminNotificationsDefaultTab({ ...readyDevice, ...override }),
      "configuration",
      name,
    );
  }
});

test("F.6 notification tabs preserve explicit admin selection over async defaults", () => {
  const readyDevice: AdminNotificationsDeviceState = {
    supported: true,
    configured: true,
    permission: "granted",
    serviceWorkerState: "ready",
    subscriptionState: "subscribed",
    serverRegistrationState: "registered",
    displayMode: "standalone",
  };
  const incompleteDevice: AdminNotificationsDeviceState = {
    ...readyDevice,
    displayMode: "browser",
  };

  const cases: Array<
    [AdminNotificationsTab | null, AdminNotificationsDeviceState, AdminNotificationsTab]
  > = [
    ["configuration", readyDevice, "configuration"],
    ["notifications", incompleteDevice, "notifications"],
    [null, readyDevice, "notifications"],
    [null, incompleteDevice, "configuration"],
  ];

  for (const [selectedTab, deviceState, expected] of cases) {
    assert.equal(
      resolveAdminNotificationsActiveTab({ selectedTab, deviceState }),
      expected,
    );
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

test("F.6 check-in reminder timing executes Guatemala 48h boundaries", () => {
  const checkInDate = new Date("2026-10-01T00:00:00.000Z");
  const checkInAt = new Date("2026-10-01T21:00:00.000Z");

  assert.equal(
    isCheckInMinus48hAdminReminderDue({
      checkInDate,
      checkInTime: "15:00",
      now: new Date(checkInAt.getTime() - 48 * 60 * 60 * 1000 - 1),
    }),
    false,
  );
  assert.equal(
    isCheckInMinus48hAdminReminderDue({
      checkInDate,
      checkInTime: "15:00",
      now: new Date(checkInAt.getTime() - 48 * 60 * 60 * 1000),
    }),
    true,
  );
  assert.equal(
    isCheckInMinus48hAdminReminderDue({
      checkInDate,
      checkInTime: "15:00",
      now: new Date(checkInAt.getTime() - 47 * 60 * 60 * 1000 - 59 * 60 * 1000),
    }),
    true,
  );
  assert.equal(
    isCheckInMinus48hAdminReminderDue({
      checkInDate,
      checkInTime: "15:00",
      now: checkInAt,
    }),
    false,
  );
  assert.equal(
    isCheckInMinus48hAdminReminderDue({
      checkInDate,
      checkInTime: "15:00",
      now: new Date(checkInAt.getTime() + 1),
    }),
    false,
  );
});

test("F.6 check-out reminder timing executes Guatemala 6h boundaries", () => {
  const checkOutDate = new Date("2026-10-03T00:00:00.000Z");
  const checkOutAt = new Date("2026-10-03T17:00:00.000Z");

  assert.equal(
    isCheckOutMinus6hAdminReminderDue({
      checkOutDate,
      checkOutTime: "11:00",
      now: new Date(checkOutAt.getTime() - 6 * 60 * 60 * 1000 - 1),
    }),
    false,
  );
  assert.equal(
    isCheckOutMinus6hAdminReminderDue({
      checkOutDate,
      checkOutTime: "11:00",
      now: new Date(checkOutAt.getTime() - 6 * 60 * 60 * 1000),
    }),
    true,
  );
  assert.equal(
    isCheckOutMinus6hAdminReminderDue({
      checkOutDate,
      checkOutTime: "11:00",
      now: new Date(checkOutAt.getTime() - 5 * 60 * 60 * 1000),
    }),
    true,
  );
  assert.equal(
    isCheckOutMinus6hAdminReminderDue({
      checkOutDate,
      checkOutTime: "11:00",
      now: checkOutAt,
    }),
    false,
  );
  assert.equal(
    isCheckOutMinus6hAdminReminderDue({
      checkOutDate,
      checkOutTime: "11:00",
      now: new Date(checkOutAt.getTime() + 1),
    }),
    false,
  );
});

test("F.6 retry delays execute the accepted bounded attempt schedule", () => {
  const failedAt = new Date("2026-09-25T12:00:00.000Z");
  const expectedDelays = [
    5 * 60 * 1000,
    15 * 60 * 1000,
    60 * 60 * 1000,
    6 * 60 * 60 * 1000,
  ];

  for (const [index, delay] of expectedDelays.entries()) {
    assert.equal(
      calculateNextAdminPushDeliveryAttemptAt(index + 1, failedAt)?.toISOString(),
      new Date(failedAt.getTime() + delay).toISOString(),
    );
  }

  assert.equal(calculateNextAdminPushDeliveryAttemptAt(5, failedAt), null);
  assert.equal(calculateNextAdminPushDeliveryAttemptAt(6, failedAt), null);
});

test("F.6 stale PROCESSING recovery handles retryable and max-attempt deliveries", async () => {
  const now = new Date("2026-09-25T12:30:00.000Z");
  const stale = new Date("2026-09-25T12:00:00.000Z");
  const fresh = new Date("2026-09-25T12:25:00.000Z");
  const deliveries: FakeAdminPushDelivery[] = [
    {
      id: "retryable-stale",
      status: AdminPushDeliveryStatus.PROCESSING,
      attemptCount: 1,
      processingStartedAt: stale,
      nextAttemptAt: null,
      errorCode: null,
      errorMessage: null,
    },
    {
      id: "exhausted-stale",
      status: AdminPushDeliveryStatus.PROCESSING,
      attemptCount: 5,
      processingStartedAt: stale,
      nextAttemptAt: null,
      errorCode: null,
      errorMessage: null,
    },
    {
      id: "fresh-processing",
      status: AdminPushDeliveryStatus.PROCESSING,
      attemptCount: 1,
      processingStartedAt: fresh,
      nextAttemptAt: null,
      errorCode: null,
      errorMessage: null,
    },
  ];

  const recovered = await recoverStaleAdminPushDeliveries(
    now,
    createFakeRecoveryClient(deliveries),
  );

  assert.equal(recovered, 2);
  assert.deepEqual(
    deliveries.find((delivery) => delivery.id === "retryable-stale"),
    {
      id: "retryable-stale",
      status: AdminPushDeliveryStatus.FAILED,
      attemptCount: 1,
      processingStartedAt: null,
      nextAttemptAt: now,
      errorCode: "ADMIN_PUSH_DELIVERY_STALE",
      errorMessage: "The Web Push delivery was recovered after stale processing.",
    },
  );
  assert.deepEqual(
    deliveries.find((delivery) => delivery.id === "exhausted-stale"),
    {
      id: "exhausted-stale",
      status: AdminPushDeliveryStatus.FAILED,
      attemptCount: 5,
      processingStartedAt: null,
      nextAttemptAt: null,
      errorCode: "ADMIN_PUSH_DELIVERY_MAX_ATTEMPTS",
      errorMessage: "The Web Push delivery reached the retry limit.",
    },
  );
  assert.equal(
    deliveries.find((delivery) => delivery.id === "fresh-processing")?.status,
    AdminPushDeliveryStatus.PROCESSING,
  );
});

test("F.6 notification read state is per-admin and preserves first readAt", async () => {
  const { prismaClient, resolveActor } = createFakeNotificationCenterClient();
  const adminA: AdminActor = { email: "admin-a@example.com" };
  const adminB: AdminActor = { email: "admin-b@example.com" };
  const firstReadAt = new Date("2026-09-25T12:00:00.000Z");
  const secondReadAt = new Date("2026-09-25T12:30:00.000Z");

  const first = await markAdminNotificationRead({
    notificationId: "notification-1",
    actor: adminA,
    now: firstReadAt,
    prismaClient,
    resolveActor,
  });
  const second = await markAdminNotificationRead({
    notificationId: "notification-1",
    actor: adminA,
    now: secondReadAt,
    prismaClient,
    resolveActor,
  });
  const centerA = await getAdminNotificationCenter(adminA, {
    prismaClient,
    resolveActor,
  });
  const centerB = await getAdminNotificationCenter(adminB, {
    prismaClient,
    resolveActor,
  });

  assert.equal(first.readAt, firstReadAt.toISOString());
  assert.equal(second.readAt, firstReadAt.toISOString());
  assert.equal(centerA.unreadCount, 0);
  assert.equal(centerA.notifications[0]?.readAt, firstReadAt.toISOString());
  assert.equal(centerB.unreadCount, 1);
  assert.equal(centerB.notifications[0]?.readAt, null);
});

test("F.6 target resolver behavior is executable and fails closed", () => {
  assert.equal(
    resolveAdminNotificationTarget({
      kind: "reservation",
      reservationId: "abc",
    }).targetPath,
    "/admin/reservations/abc",
  );
  assert.equal(
    resolveAdminNotificationTarget({
      kind: "reservation",
      reservationId: "abc/def?x=1 #",
    }).targetPath,
    "/admin/reservations/abc%2Fdef%3Fx%3D1%20%23",
  );
  assert.equal(
    resolveAdminNotificationTarget({ kind: "reviews" }).targetPath,
    "/admin/reviews",
  );
  assert.equal(
    coerceAdminNotificationTargetPath("https://evil.example/admin"),
    "/admin/notifications",
  );
  assert.equal(
    coerceAdminNotificationTargetPath("//evil.example/admin"),
    "/admin/notifications",
  );
  assert.equal(
    coerceAdminNotificationTargetPath("/public"),
    "/admin/notifications",
  );
  assert.equal(
    buildAbsoluteAdminNotificationTargetUrl(
      "/admin/reviews",
      "https://trp-booking.juantzun.dev",
    ),
    "https://trp-booking.juantzun.dev/admin/reviews",
  );
});

test("F.6 reminder deduplication keys change when stay timing changes", () => {
  const checkInDate = new Date("2026-10-01T00:00:00.000Z");
  const changedCheckInDate = new Date("2026-10-02T00:00:00.000Z");
  const checkOutDate = new Date("2026-10-03T00:00:00.000Z");
  const changedCheckOutDate = new Date("2026-10-04T00:00:00.000Z");

  assert.equal(
    buildCheckInMinus48hAdminNotificationDeduplicationKey({
      reservationId: "res-1",
      checkInDate,
      checkInTime: "15:00",
    }),
    buildCheckInMinus48hAdminNotificationDeduplicationKey({
      reservationId: "res-1",
      checkInDate,
      checkInTime: "15:00",
    }),
  );
  assert.notEqual(
    buildCheckInMinus48hAdminNotificationDeduplicationKey({
      reservationId: "res-1",
      checkInDate,
      checkInTime: "15:00",
    }),
    buildCheckInMinus48hAdminNotificationDeduplicationKey({
      reservationId: "res-1",
      checkInDate: changedCheckInDate,
      checkInTime: "15:00",
    }),
  );
  assert.notEqual(
    buildCheckInMinus48hAdminNotificationDeduplicationKey({
      reservationId: "res-1",
      checkInDate,
      checkInTime: "15:00",
    }),
    buildCheckInMinus48hAdminNotificationDeduplicationKey({
      reservationId: "res-1",
      checkInDate,
      checkInTime: "16:00",
    }),
  );
  assert.notEqual(
    buildCheckOutMinus6hAdminNotificationDeduplicationKey({
      reservationId: "res-1",
      checkOutDate,
      checkOutTime: "11:00",
    }),
    buildCheckOutMinus6hAdminNotificationDeduplicationKey({
      reservationId: "res-1",
      checkOutDate: changedCheckOutDate,
      checkOutTime: "12:00",
    }),
  );
});

test("F.6 provider status classification is executable and bounded", () => {
  assert.deepEqual(classifyAdminPushDeliveryStatusCode(404), {
    code: "ADMIN_PUSH_SUBSCRIPTION_EXPIRED",
    retryable: false,
    expired: true,
  });
  assert.deepEqual(classifyAdminPushDeliveryStatusCode(410), {
    code: "ADMIN_PUSH_SUBSCRIPTION_EXPIRED",
    retryable: false,
    expired: true,
  });
  assert.deepEqual(classifyAdminPushDeliveryStatusCode(429), {
    code: "ADMIN_PUSH_PROVIDER_RATE_LIMITED",
    retryable: true,
    expired: false,
  });
  assert.deepEqual(classifyAdminPushDeliveryStatusCode(500), {
    code: "ADMIN_PUSH_PROVIDER_TEMPORARY_FAILURE",
    retryable: true,
    expired: false,
  });
  assert.deepEqual(classifyAdminPushDeliveryStatusCode(503), {
    code: "ADMIN_PUSH_PROVIDER_TEMPORARY_FAILURE",
    retryable: true,
    expired: false,
  });
  assert.deepEqual(classifyAdminPushDeliveryStatusCode(400), {
    code: "ADMIN_PUSH_PROVIDER_REJECTED",
    retryable: false,
    expired: false,
  });
  assert.deepEqual(classifyAdminPushDeliveryStatusCode(403), {
    code: "ADMIN_PUSH_PROVIDER_REJECTED",
    retryable: false,
    expired: false,
  });
  assert.deepEqual(classifyAdminPushDeliveryStatusCode(null), {
    code: "ADMIN_PUSH_DELIVERY_UNEXPECTED_ERROR",
    retryable: true,
    expired: false,
  });
});
