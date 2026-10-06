import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import vm from "node:vm";
import { AdminNotificationType, type PrismaClient } from "@prisma/client";

import {
  getAdminNotificationCenter,
  normalizeAdminNotificationId,
  normalizeAdminNotificationCenterPage,
  resolveAdminNotificationCenterSafePage,
  resolveAdminNotificationCenterSkip,
  resolveAdminNotificationCenterTotalPages,
  resolveAdminNotificationTargetPage,
  resolveAdminNotificationInitialOpenId,
} from "@/lib/admin-notifications";
import {
  buildAdminNotificationCenterDeepLink,
  shouldShowAdminNotificationConfiguration,
} from "@/lib/admin-notifications/center-routing";
import {
  resolveAdminNotificationsActiveTab,
  shouldAutoScrollAdminNotification,
  type AdminNotificationsDeviceState,
} from "@/features/admin/components/admin-notifications-page";
import type { AdminActor } from "@/types/admin";

import { test } from "./harness";

const ROOT = process.cwd();

function read(relativePath: string): string {
  return readFileSync(path.join(ROOT, relativePath), "utf8");
}

function expectIncludes(source: string, expected: string): void {
  assert.ok(source.includes(expected), `Expected source to include: ${expected}`);
}

function expectExcludes(source: string, unexpected: string): void {
  assert.equal(
    source.includes(unexpected),
    false,
    `Expected source to exclude: ${unexpected}`,
  );
}

const NOTIFICATIONS_PAGE = read("app/admin/notifications/page.tsx");
const NOTIFICATIONS_VIEW = read(
  "features/admin/components/admin-notifications-page.tsx",
);
const OPERATIONAL_SERVICE = read("lib/admin-notifications/operational.ts");
const CENTER_ROUTING = read("lib/admin-notifications/center-routing.ts");
const SERVICE_WORKER = read("public/sw.js");
const SCHEMA = read("prisma/schema.prisma");

type FakeNotification = Readonly<{
  id: string;
  type: AdminNotificationType;
  title: string;
  body: string;
  targetPath: string;
  deduplicationKey: string;
  createdAt: Date;
  reservationId: string | null;
  zohoInboundEmailEvent: null;
}>;

type FakeRead = Readonly<{
  notificationId: string;
  userId: string;
  readAt: Date;
}>;

function withReads(
  notification: FakeNotification,
  reads: readonly FakeRead[],
  userId: string,
) {
  return {
    ...notification,
    reads: reads
      .filter(
        (read) =>
          read.notificationId === notification.id && read.userId === userId,
      )
      .map((read) => ({ readAt: read.readAt })),
  };
}

function createNotificationCenterClient() {
  const adminUser = {
    id: "admin-1",
    email: "admin@example.com",
    name: null,
  };
  const notifications: FakeNotification[] = Array.from(
    { length: 23 },
    (_, index) => {
      const sequence = index + 1;
      const id = `notification_${String(sequence).padStart(3, "0")}`;

      return {
        id,
        type:
          sequence === 15
            ? AdminNotificationType.GUEST_EMAIL_RECEIVED
            : AdminNotificationType.RESERVATION_CONFIRMED,
        title: `Notification ${sequence}`,
        body: "Toca para ver detalles.",
        targetPath:
          sequence === 15
            ? "/admin/notifications"
            : `/admin/reservations/reservation-${sequence}`,
        deduplicationKey: `admin-notification/test/${id}`,
        createdAt: new Date(
          Date.UTC(2026, 8, 29, 12, 0, 0) - index * 60_000,
        ),
        reservationId: sequence === 15 ? null : `reservation-${sequence}`,
        zohoInboundEmailEvent: null,
      };
    },
  );
  const reads: FakeRead[] = [
    {
      notificationId: "notification_001",
      userId: adminUser.id,
      readAt: new Date("2026-09-29T12:30:00.000Z"),
    },
  ];
  const findUniqueIds: string[] = [];
  const findManyInputs: Array<Readonly<{ skip?: number; take?: number }>> = [];
  const countInputs: unknown[] = [];
  const orderedNotifications = () =>
    [...notifications].sort((left, right) => {
      const createdDelta = right.createdAt.getTime() - left.createdAt.getTime();

      return createdDelta === 0
        ? right.id.localeCompare(left.id)
        : createdDelta;
    });

  const prismaClient = {
    adminNotification: {
      async findMany(input: {
        skip?: number;
        take?: number;
        select: { reads: { where: { userId: string } } };
      }) {
        findManyInputs.push({ skip: input.skip, take: input.take });
        const userId = input.select.reads.where.userId;

        return orderedNotifications()
          .slice(input.skip ?? 0, (input.skip ?? 0) + (input.take ?? 50))
          .map((notification) => withReads(notification, reads, userId));
      },
      async findUnique(input: {
        where: { id: string };
        select: { reads?: { where?: { userId: string } } };
      }) {
        findUniqueIds.push(input.where.id);
        const notification = notifications.find(
          (current) => current.id === input.where.id,
        );

        if (!notification) {
          return null;
        }

        return withReads(
          notification,
          reads,
          input.select.reads?.where?.userId ?? adminUser.id,
        );
      },
      async count(input?: {
        where?: {
          reads?: { none: { userId: string } };
          OR?: Array<{
            createdAt?: { gt?: Date; equals?: Date };
            id?: { gt: string };
          }>;
        };
      }) {
        countInputs.push(input);

        if (input?.where?.reads?.none) {
          const userId = input.where.reads.none.userId;

          return notifications.filter(
            (notification) =>
              !reads.some(
                (read) =>
                  read.notificationId === notification.id &&
                  read.userId === userId,
              ),
          ).length;
        }

        if (input?.where?.OR) {
          return notifications.filter((notification) =>
            input.where!.OR!.some((condition) => {
              if (condition.createdAt?.gt) {
                return notification.createdAt > condition.createdAt.gt;
              }

              if (condition.createdAt?.equals && condition.id?.gt) {
                return (
                  notification.createdAt.getTime() ===
                    condition.createdAt.equals.getTime() &&
                  notification.id > condition.id.gt
                );
              }

              return false;
            }),
          ).length;
        }

        return notifications.length;
      },
    },
  } as unknown as PrismaClient;

  return {
    countInputs,
    findManyInputs,
    findUniqueIds,
    notifications,
    prismaClient,
    resolveActor: async (_client: PrismaClient, actor: AdminActor) => {
      if (actor.email !== adminUser.email) {
        throw new Error("ADMIN_UNAUTHORIZED");
      }

      return adminUser;
    },
  };
}

type ServiceWorkerTestEvent = Readonly<{
  data?: Readonly<{ json(): unknown }>;
  notification?: Readonly<{
    data?: Readonly<{ notificationId?: unknown; targetPath?: unknown }>;
    close(): void;
  }>;
  waitUntil(promise: Promise<unknown>): void;
}>;

type ServiceWorkerNotificationOptions = Readonly<{
  body?: string;
  icon?: string;
  data?: Readonly<{ notificationId?: unknown; targetPath?: unknown }>;
}>;

function createServiceWorkerHarness() {
  const listeners = new Map<string, (event: ServiceWorkerTestEvent) => void>();
  const shownNotifications: Array<
    Readonly<{ title: string; options: ServiceWorkerNotificationOptions }>
  > = [];
  const openedWindows: string[] = [];
  const context = {
    URL,
    URLSearchParams,
    self: {
      location: { origin: "https://trp-booking.juantzun.dev" },
      addEventListener(
        type: string,
        handler: (event: ServiceWorkerTestEvent) => void,
      ) {
        listeners.set(type, handler);
      },
      registration: {
        async showNotification(
          title: string,
          options: ServiceWorkerNotificationOptions,
        ) {
          shownNotifications.push({ title, options });
        },
      },
      clients: {
        async matchAll() {
          return [];
        },
        async openWindow(url: string) {
          openedWindows.push(url);
          return { url };
        },
      },
    },
  };

  vm.createContext(context);
  vm.runInContext(SERVICE_WORKER, context);

  return {
    context,
    listeners,
    openedWindows,
    shownNotifications,
  };
}

function waitableEvent<TBase extends object>(base: TBase) {
  let waited: Promise<unknown> | null = null;

  return {
    event: {
      ...base,
      waitUntil(promise: Promise<unknown>) {
        waited = promise;
      },
    } as TBase & ServiceWorkerTestEvent,
    async wait() {
      assert.ok(waited, "Expected waitUntil to receive a promise");
      await waited;
    },
  };
}

test("I.3 notification ID helpers accept only bounded opaque identifiers", () => {
  assert.equal(normalizeAdminNotificationId("  notification_123-ABC  "), "notification_123-ABC");
  assert.equal(normalizeAdminNotificationId("https://evil.example/admin"), null);
  assert.equal(normalizeAdminNotificationId("/admin/reservations/abc"), null);
  assert.equal(normalizeAdminNotificationId("notification?x=1"), null);
  assert.equal(normalizeAdminNotificationId("notification#x"), null);
  assert.equal(normalizeAdminNotificationId(`notification\n1`), null);
  assert.equal(normalizeAdminNotificationId("a".repeat(161)), null);
  assert.equal(normalizeAdminNotificationId(123), null);

  assert.equal(
    buildAdminNotificationCenterDeepLink("notification_123-ABC"),
    "/admin/notifications?notification=notification_123-ABC",
  );
  assert.equal(
    buildAdminNotificationCenterDeepLink("https://evil.example/admin"),
    "/admin/notifications",
  );
});

test("I.3 responsive helper hides configuration on desktop browser and preserves it on mobile or standalone", () => {
  assert.equal(
    shouldShowAdminNotificationConfiguration({
      isMobileViewport: false,
      displayMode: "browser",
    }),
    false,
  );
  assert.equal(
    shouldShowAdminNotificationConfiguration({
      isMobileViewport: true,
      displayMode: "browser",
    }),
    true,
  );
  assert.equal(
    shouldShowAdminNotificationConfiguration({
      isMobileViewport: false,
      displayMode: "standalone",
    }),
    true,
  );

  const deviceState: AdminNotificationsDeviceState = {
    supported: false,
    configured: false,
    permission: "default",
    serviceWorkerState: "checking",
    subscriptionState: "checking",
    serverRegistrationState: "unknown",
    displayMode: "browser",
  };

  assert.equal(
    resolveAdminNotificationsActiveTab({
      selectedTab: "configuration",
      deviceState,
      configurationNavigationVisible: false,
    }),
    "notifications",
  );
  assert.equal(
    resolveAdminNotificationsActiveTab({
      selectedTab: null,
      deviceState,
      configurationNavigationVisible: true,
    }),
    "configuration",
  );
});

test("I.3 auto-scroll helper scopes mobile/PWA deep-link scrolling to the initial notification", () => {
  const base = {
    activeTab: "notifications" as const,
    displayMode: "browser" as const,
    hasScrolledToInitialNotification: false,
    initialNotificationId: "notification_targeted",
    isMobileViewport: true,
    openNotificationId: "notification_targeted",
    targetElementAvailable: true,
  };

  assert.equal(shouldAutoScrollAdminNotification(base), true);
  assert.equal(
    shouldAutoScrollAdminNotification({
      ...base,
      openNotificationId: "notification_other",
    }),
    false,
  );
  assert.equal(
    shouldAutoScrollAdminNotification({
      ...base,
      isMobileViewport: false,
    }),
    false,
  );
  assert.equal(
    shouldAutoScrollAdminNotification({
      ...base,
      displayMode: "standalone",
      isMobileViewport: false,
    }),
    true,
  );
  assert.equal(
    shouldAutoScrollAdminNotification({
      ...base,
      targetElementAvailable: false,
    }),
    false,
  );
  assert.equal(
    shouldAutoScrollAdminNotification({
      ...base,
      initialNotificationId: null,
    }),
    false,
  );
  assert.equal(
    shouldAutoScrollAdminNotification({
      ...base,
      hasScrolledToInitialNotification: true,
    }),
    false,
  );
  assert.equal(
    shouldAutoScrollAdminNotification({
      ...base,
      activeTab: "configuration",
    }),
    false,
  );
});

test("I.3 notification-center query selection opens only existing visible items", () => {
  const notifications = [{ id: "notification_a" }, { id: "notification_b" }];

  assert.equal(
    resolveAdminNotificationInitialOpenId({
      requestedNotificationId: "notification_b",
      notifications,
    }),
    "notification_b",
  );
  assert.equal(
    resolveAdminNotificationInitialOpenId({
      requestedNotificationId: "notification_missing",
      notifications,
    }),
    null,
  );
  assert.equal(
    resolveAdminNotificationInitialOpenId({
      requestedNotificationId: "https://evil.example/admin",
      notifications,
    }),
    null,
  );
});

test("I.6.2 notification pagination helpers normalize clamp and calculate offsets", () => {
  assert.equal(normalizeAdminNotificationCenterPage("2"), 2);
  assert.equal(normalizeAdminNotificationCenterPage(3), 3);
  assert.equal(normalizeAdminNotificationCenterPage("0"), 1);
  assert.equal(normalizeAdminNotificationCenterPage("-1"), 1);
  assert.equal(normalizeAdminNotificationCenterPage("1.5"), 1);
  assert.equal(normalizeAdminNotificationCenterPage("abc"), 1);
  assert.equal(resolveAdminNotificationCenterTotalPages(0), 1);
  assert.equal(resolveAdminNotificationCenterTotalPages(1), 1);
  assert.equal(resolveAdminNotificationCenterTotalPages(10), 1);
  assert.equal(resolveAdminNotificationCenterTotalPages(11), 2);
  assert.equal(resolveAdminNotificationCenterTotalPages(23), 3);
  assert.equal(
    resolveAdminNotificationCenterSafePage({
      requestedPage: 99,
      totalItems: 23,
    }),
    3,
  );
  assert.equal(resolveAdminNotificationCenterSkip(1), 0);
  assert.equal(resolveAdminNotificationCenterSkip(3), 20);
  assert.equal(resolveAdminNotificationTargetPage({ rowsBeforeTarget: 14 }), 2);
});

test("I.6.2 loader paginates notifications server-side and keeps unread count global", async () => {
  const actor: AdminActor = { email: "admin@example.com" };
  const client = createNotificationCenterClient();
  const center = await getAdminNotificationCenter(actor, {
    page: "2",
    prismaClient: client.prismaClient,
    resolveActor: client.resolveActor,
  });

  assert.equal(center.pagination.page, 2);
  assert.equal(center.pagination.pageSize, 10);
  assert.equal(center.pagination.totalItems, 23);
  assert.equal(center.pagination.totalPages, 3);
  assert.equal(center.unreadCount, 22);
  assert.equal(center.notifications.length, 10);
  assert.deepEqual(client.findManyInputs.at(-1), { skip: 10, take: 10 });
  assert.deepEqual(
    center.notifications.map((notification) => notification.id),
    Array.from({ length: 10 }, (_, index) =>
      `notification_${String(index + 11).padStart(3, "0")}`,
    ),
  );
});

test("I.6.2 loader opens targeted notifications on their canonical page without prepending rows", async () => {
  const actor: AdminActor = { email: "admin@example.com" };
  const firstClient = createNotificationCenterClient();
  const center = await getAdminNotificationCenter(actor, {
    requestedNotificationId: "notification_015",
    prismaClient: firstClient.prismaClient,
    resolveActor: firstClient.resolveActor,
  });

  assert.equal(center.pagination.page, 2);
  assert.equal(center.notifications.length, 10);
  assert.equal(
    center.notifications.filter(
      (notification) => notification.id === "notification_015",
    ).length,
    1,
  );
  assert.deepEqual(firstClient.findUniqueIds, ["notification_015"]);
  assert.deepEqual(firstClient.findManyInputs.at(-1), { skip: 10, take: 10 });

  const secondClient = createNotificationCenterClient();
  const malformed = await getAdminNotificationCenter(actor, {
    requestedNotificationId: "https://evil.example/admin",
    prismaClient: secondClient.prismaClient,
    resolveActor: secondClient.resolveActor,
  });

  assert.deepEqual(
    malformed.notifications.map((notification) => notification.id),
    Array.from({ length: 10 }, (_, index) =>
      `notification_${String(index + 1).padStart(3, "0")}`,
    ),
  );
  assert.deepEqual(secondClient.findUniqueIds, []);
});

test("I.3 page and view wire safe query parsing, desktop simplification and single accordion", () => {
  for (const expected of [
    "searchParams",
    "normalizeAdminNotificationId",
    "normalizeAdminNotificationCenterPage",
    "requestedNotificationId",
    "requestedPage",
    "resolveAdminNotificationInitialOpenId",
    "initialNotificationId={initialNotificationId}",
  ]) {
    expectIncludes(NOTIFICATIONS_PAGE, expected);
  }

  for (const expected of [
    "ADMIN_NOTIFICATION_MOBILE_MEDIA_QUERY",
    "window.matchMedia(ADMIN_NOTIFICATION_MOBILE_MEDIA_QUERY)",
    "showConfigurationNavigation",
    "shouldShowAdminNotificationConfiguration",
    "showConfigurationNavigation ? (",
    "<Accordion",
    "type=\"single\"",
    "collapsible",
    "value={openNotificationId}",
    "initialNotificationId ?? \"\"",
    "setOpenNotificationId(value || \"\")",
    "initialNotificationId ? \"notifications\" : null",
    "notificationElementRefs.current.get(initialNotificationId)",
    "ref={(element) =>",
    "registerNotificationElement(notification.id, element)",
    "scroll-mt-20",
    "window.matchMedia(",
    "(prefers-reduced-motion: reduce)",
    "window.requestAnimationFrame(() =>",
    "scrollIntoView({",
    "block: \"start\"",
    "behavior: reducedMotion ? \"auto\" : \"smooth\"",
    "hasScrolledToInitialNotificationRef.current = true",
    "<AccordionTrigger",
    "copy.history.unread",
    "copy.history.read",
    "formatNotificationTimestamp(",
    "notification.createdAt,",
    "{notification.title}",
    "openZohoMailForNotification",
    "openAdminNotificationTarget",
    "markNotificationReadForOpen",
    "router.push(targetPath)",
    "notificationCenter.pagination",
    "navigateNotificationPage",
    "safeAdminTargetPath(notification.targetPath)",
  ]) {
    expectIncludes(NOTIFICATIONS_VIEW, expected);
  }

  expectExcludes(NOTIFICATIONS_VIEW, "navigator.userAgent");
  expectExcludes(NOTIFICATIONS_VIEW, "userAgent");

  const accordionChange = NOTIFICATIONS_VIEW.slice(
    NOTIFICATIONS_VIEW.indexOf("onValueChange={(value) =>"),
    NOTIFICATIONS_VIEW.indexOf("type=\"single\""),
  );
  expectIncludes(accordionChange, "setOpenNotificationId");
  expectExcludes(accordionChange, "markNotificationRead");

  const deepLinkScrollEffect = NOTIFICATIONS_VIEW.slice(
    NOTIFICATIONS_VIEW.indexOf(
      "const targetNotificationId = initialNotificationId;",
    ),
    NOTIFICATIONS_VIEW.indexOf("const notificationsPanel = ("),
  );
  expectIncludes(deepLinkScrollEffect, "scrollIntoView({");
  expectExcludes(deepLinkScrollEffect, "markNotificationRead");
});

test("I.3 push payload carries bounded notificationId while preserving targetPath for the Open action", () => {
  for (const expected of [
    "notificationId: input.claim.notification.id",
    "targetPath: coerceAdminNotificationTargetPath(",
  ]) {
    expectIncludes(OPERATIONAL_SERVICE, expected);
  }

  expectIncludes(NOTIFICATIONS_VIEW, "safeAdminTargetPath(notification.targetPath)");
  expectIncludes(CENTER_ROUTING, "ADMIN_NOTIFICATION_ID_PATTERN");
});

test("I.3 service worker click opens notification-center deep links and never treats notificationId as a URL", async () => {
  const harness = createServiceWorkerHarness();
  const buildUrl = (harness.context as {
    buildNotificationCenterUrl?: (notificationId: unknown) => string;
  }).buildNotificationCenterUrl;
  assert.ok(buildUrl, "Expected service worker helper to be available");

  assert.equal(
    buildUrl("notification_123-ABC"),
    "https://trp-booking.juantzun.dev/admin/notifications?notification=notification_123-ABC",
  );
  assert.equal(
    buildUrl("https://evil.example/admin"),
    "https://trp-booking.juantzun.dev/admin/notifications",
  );
  assert.equal(
    buildUrl("/admin/reservations/reservation-1"),
    "https://trp-booking.juantzun.dev/admin/notifications",
  );

  const push = waitableEvent({
    data: {
      json: () => ({
        title: "TRP Admin",
        body: "Toca para ver detalles.",
        notificationId: "notification_123-ABC",
        targetPath: "/admin/reservations/reservation-1",
      }),
    },
  });
  harness.listeners.get("push")?.(push.event);
  await push.wait();

  assert.equal(
    harness.shownNotifications[0]?.options.data.notificationId,
    "notification_123-ABC",
  );
  assert.equal(
    harness.shownNotifications[0]?.options.data.targetPath,
    "/admin/reservations/reservation-1",
  );

  const click = waitableEvent({
    notification: {
      data: { notificationId: "notification_123-ABC" },
      close() {},
    },
  });
  harness.listeners.get("notificationclick")?.(click.event);
  await click.wait();

  assert.deepEqual(harness.openedWindows, [
    "https://trp-booking.juantzun.dev/admin/notifications?notification=notification_123-ABC",
  ]);
});

test("I.3 service worker falls back to the notification center for missing or invalid IDs", async () => {
  const harness = createServiceWorkerHarness();
  const click = waitableEvent({
    notification: {
      data: {
        notificationId: "https://evil.example/admin",
        targetPath: "/admin/reservations/reservation-1",
      },
      close() {},
    },
  });

  harness.listeners.get("notificationclick")?.(click.event);
  await click.wait();

  assert.deepEqual(harness.openedWindows, [
    "https://trp-booking.juantzun.dev/admin/notifications",
  ]);
  expectIncludes(
    SERVICE_WORKER,
    "const targetUrl = buildNotificationCenterUrl(",
    "event.notification.data?.notificationId",
  );
  expectExcludes(SERVICE_WORKER, "const targetUrl = new URL(targetPath");
});

test("I.3 keeps accepted AdminNotification types and records Final-I.6.1 financial additions", () => {
  const notificationType = SCHEMA.match(
    /enum AdminNotificationType \{([\s\S]*?)\n\}/,
  );

  assert.ok(notificationType, "AdminNotificationType enum should exist");
  assert.deepEqual(
    notificationType[1]
      .split("\n")
      .map((line) => line.trim())
      .filter((line) => line && !line.startsWith("@@") && !line.startsWith("//")),
    [
      "RESERVATION_CONFIRMED",
      "RESERVATION_CANCELLED",
      "CHECK_IN_MINUS_48H",
      "CHECK_OUT_MINUS_6H",
      "REVIEW_SUBMITTED",
      "GUEST_EMAIL_RECEIVED",
      "ADDITIONAL_CHARGE_PAID",
      "LIFECYCLE_ADJUSTMENT_PAID",
      "REFUND_PROCESSED",
    ],
  );
});
