import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";

import { getWebPushEnv } from "@/lib/env/server";

import { test } from "./harness";

const ROOT = process.cwd();
const MIGRATION_NAME = "20260925170000_final_f_r5_admin_push_subscription";

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

function sourceBlock(
  source: string,
  startMarker: string,
  endMarker: string,
): string {
  const start = source.indexOf(startMarker);
  assert.ok(start >= 0, `Expected source marker: ${startMarker}`);

  const end = source.indexOf(endMarker, start);
  assert.ok(end > start, `Expected source marker after start: ${endMarker}`);

  return source.slice(start, end);
}

const PACKAGE_JSON = JSON.parse(read("package.json")) as {
  dependencies?: Record<string, string>;
  devDependencies?: Record<string, string>;
};
const SCHEMA = read("prisma/schema.prisma");
const ENV_EXAMPLE = read(".env.example");
const NEXT_CONFIG = read("next.config.ts");
const ADMIN_SHELL = read("features/admin/components/admin-shell.tsx");
const ADMIN_INDEX = read("features/admin/index.ts");
const ES_MESSAGES = read("messages/es.ts");
const EN_MESSAGES = read("messages/en.ts");
const MANIFEST = read("app/manifest.ts");
const SERVICE_WORKER = read("public/sw.js");
const PUSH_SERVICE = read("lib/admin/push-subscriptions.ts");
const CONFIG_ROUTE = read("app/api/admin/push/config/route.ts");
const SUBSCRIPTIONS_ROUTE = read("app/api/admin/push/subscriptions/route.ts");
const STATUS_ROUTE = read(
  "app/api/admin/push/subscriptions/status/route.ts",
);
const TEST_ROUTE = read("app/api/admin/push/test/route.ts");
const NOTIFICATIONS_PAGE = read("app/admin/notifications/page.tsx");
const NOTIFICATIONS_VIEW = read(
  "features/admin/components/admin-notifications-page.tsx",
);
const MIGRATION = read(
  `prisma/migrations/${MIGRATION_NAME}/migration.sql`,
);

const baseEnv = {
  TRP_ENVIRONMENT: "local",
  DATABASE_URL:
    "postgresql://user:password@localhost:5432/postgres?schema=trp_booking",
  DIRECT_URL:
    "postgresql://user:password@localhost:5432/postgres?schema=trp_booking",
  AUTH_SECRET: "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
  AUTH_TRUST_HOST: "true",
  AUTH_GOOGLE_ID: "google-client-id",
  AUTH_GOOGLE_SECRET: "google-client-secret",
  AUTH_ALLOWED_ADMIN_EMAILS: "admin@juantzun.dev",
  EXTERNAL_CALENDAR_ENCRYPTION_KEY:
    "AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA=",
  CLOUDINARY_CLOUD_NAME: "trp-test",
  CLOUDINARY_API_KEY: "cloudinary123",
  CLOUDINARY_API_SECRET: "cloudinary-secret",
  CLOUDINARY_UPLOAD_FOLDER: "trp-booking/dev",
  TILOPAY_ENVIRONMENT: "sandbox",
  TILOPAY_API_KEY: "tilopay-key",
  TILOPAY_API_USER: "tilopay-user",
  TILOPAY_API_PASSWORD: "tilopay-password",
  TILOPAY_REDIRECT_URL: "http://localhost:3000/api/payments/tilopay/redirect",
  TILOPAY_SUCCESS_URL: "http://localhost:3000/reservas/pago/exitoso",
  TILOPAY_CANCEL_URL: "http://localhost:3000/reservas/pago/cancelado",
  TILOPAY_ERROR_URL: "http://localhost:3000/reservas/pago/error",
  TILOPAY_WEBHOOK_URL: "http://localhost:3000/api/payments/tilopay/webhook",
  EMAIL_DELIVERY_MODE: "disabled",
  NODE_ENV: "test",
} satisfies NodeJS.ProcessEnv;

test("F.R5 adds the native Next manifest with the accepted Admin PWA contract", () => {
  for (const expected of [
    "MetadataRoute.Manifest",
    'name: "TRP Admin"',
    'short_name: "TRP Admin"',
    'start_url: "/admin/notifications"',
    'scope: "/admin/"',
    'display: "standalone"',
    'src: "/brand/favicon-192.png"',
    'sizes: "192x192"',
    'src: "/brand/favicon-512.png"',
    'sizes: "512x512"',
  ]) {
    expectIncludes(MANIFEST, expected);
  }

  expectExcludes(MANIFEST, "maskable");
});

test("F.R5 reuses existing PWA icon assets", () => {
  assert.equal(exists("public/brand/favicon-192.png"), true);
  assert.equal(exists("public/brand/favicon-512.png"), true);
});

test("F.R5 service worker handles only push and notification clicks", () => {
  expectIncludes(SERVICE_WORKER, 'addEventListener("push"');
  expectIncludes(SERVICE_WORKER, 'addEventListener("notificationclick"');
  expectExcludes(SERVICE_WORKER, 'addEventListener("fetch"');
  expectExcludes(SERVICE_WORKER, "CacheStorage");
  expectExcludes(SERVICE_WORKER, "caches.");
  expectExcludes(SERVICE_WORKER, "indexedDB");
  expectExcludes(SERVICE_WORKER, "localStorage");
});

test("F.R5 service worker limits notification targets to internal Admin paths", () => {
  expectIncludes(SERVICE_WORKER, 'DEFAULT_TARGET_PATH = "/admin/notifications"');
  expectIncludes(SERVICE_WORKER, "parsed.origin !== self.location.origin");
  expectIncludes(SERVICE_WORKER, "ADMIN_PATH_PATTERN");
  expectIncludes(SERVICE_WORKER, "clients.openWindow(targetUrl)");
});

test("F.R5 serves sw.js with explicit no-store JavaScript headers", () => {
  expectIncludes(NEXT_CONFIG, 'source: "/sw.js"');
  expectIncludes(NEXT_CONFIG, 'key: "Content-Type"');
  expectIncludes(NEXT_CONFIG, "application/javascript; charset=utf-8");
  expectIncludes(NEXT_CONFIG, "no-cache, no-store, must-revalidate");
  expectExcludes(NEXT_CONFIG, "Content-Security-Policy");
});

test("F.R5 declares web-push directly and does not add Firebase", () => {
  assert.equal(PACKAGE_JSON.dependencies?.["web-push"], "^3.6.7");
  assert.equal(PACKAGE_JSON.devDependencies?.["@types/web-push"], "^3.6.4");
  assert.equal(PACKAGE_JSON.dependencies?.firebase, undefined);
  assert.equal(PACKAGE_JSON.dependencies?.["firebase-admin"], undefined);
});

test("F.R5 documents the VAPID environment contract without NEXT_PUBLIC keys", () => {
  for (const expected of [
    "WEB_PUSH_VAPID_PUBLIC_KEY",
    "WEB_PUSH_VAPID_PRIVATE_KEY",
    "WEB_PUSH_SUBJECT",
    "npx web-push generate-vapid-keys",
    "All three empty -> Web Push unavailable/disabled safely.",
    "Partial configuration is invalid.",
    "Developer/Test should use developer-owned VAPID key material",
    "Future Production belongs to Phase 13",
  ]) {
    expectIncludes(ENV_EXAMPLE, expected);
  }

  expectExcludes(ENV_EXAMPLE, "NEXT_PUBLIC_WEB_PUSH");
});

test("F.R5 getWebPushEnv disables safely when all VAPID settings are absent", () => {
  assert.deepEqual(getWebPushEnv(baseEnv), { configured: false });
});

test("F.R5 getWebPushEnv enables only when all VAPID settings are valid", () => {
  assert.deepEqual(
    getWebPushEnv({
      ...baseEnv,
      WEB_PUSH_VAPID_PUBLIC_KEY: "B".repeat(87),
      WEB_PUSH_VAPID_PRIVATE_KEY: "C".repeat(43),
      WEB_PUSH_SUBJECT: "mailto:admin@juantzun.dev",
    }),
    {
      configured: true,
      publicKey: "B".repeat(87),
      privateKey: "C".repeat(43),
      subject: "mailto:admin@juantzun.dev",
    },
  );
});

test("F.R5 getWebPushEnv rejects partial VAPID configuration", () => {
  assert.throws(() =>
    getWebPushEnv({
      ...baseEnv,
      WEB_PUSH_VAPID_PUBLIC_KEY: "B".repeat(87),
    }),
  );
});

test("F.R5 Web Push config endpoint exposes only safe public config", () => {
  expectIncludes(CONFIG_ROUTE, "getAdminSessionActor");
  expectIncludes(CONFIG_ROUTE, "getAdminPushConfig");
  expectIncludes(PUSH_SERVICE, "vapidPublicKey: env.publicKey");
  expectExcludes(CONFIG_ROUTE, "privateKey");
  expectExcludes(CONFIG_ROUTE, "WEB_PUSH_VAPID_PRIVATE_KEY");
});

test("F.R5 adds only AdminPushSubscription persistence", () => {
  for (const expected of [
    "model AdminPushSubscription",
    "adminPushSubscriptions",
    "endpoint   String    @unique @db.Text",
    'p256dhKey  String    @map("p256dh_key") @db.Text',
    'authKey    String    @map("auth_key") @db.Text',
    "active     Boolean   @default(true)",
    'lastUsedAt DateTime? @map("last_used_at")',
    'revokedAt  DateTime? @map("revoked_at")',
    "@@index([userId])",
    "@@index([active])",
    '@@map("admin_push_subscriptions")',
  ]) {
    expectIncludes(SCHEMA, expected);
  }

  for (const unexpected of [
    "model AdminNotification",
    "model AdminNotificationRead",
    "model AdminPushDelivery",
  ]) {
    expectExcludes(SCHEMA, unexpected);
  }
});

test("F.R5 migration creates only the AdminPushSubscription table and indexes", () => {
  for (const expected of [
    'CREATE TABLE "admin_push_subscriptions"',
    '"endpoint" TEXT NOT NULL',
    '"p256dh_key" TEXT NOT NULL',
    '"auth_key" TEXT NOT NULL',
    'CREATE UNIQUE INDEX "admin_push_subscriptions_endpoint_key"',
    'CREATE INDEX "admin_push_subscriptions_user_id_idx"',
    'CREATE INDEX "admin_push_subscriptions_active_idx"',
    'REFERENCES "users"("id") ON DELETE CASCADE',
  ]) {
    expectIncludes(MIGRATION, expected);
  }

  for (const unexpected of [
    "reservations",
    "payments",
    "reviews",
    "email_notifications",
  ]) {
    expectExcludes(MIGRATION, unexpected);
  }
});

test("F.R5 subscription APIs are node runtime, dynamic, ADMIN protected and origin checked", () => {
  for (const source of [SUBSCRIPTIONS_ROUTE, STATUS_ROUTE, TEST_ROUTE]) {
    expectIncludes(source, 'dynamic = "force-dynamic"');
    expectIncludes(source, 'runtime = "nodejs"');
    expectIncludes(source, "getAdminSessionActor");
    expectIncludes(source, "isValidAdminMutationOrigin");
    expectIncludes(source, "adminApiSuccessResponse");
    expectIncludes(source, "adminApiErrorResponse");
  }
});

test("F.R5 subscription API validates payloads strictly and never transfers endpoint ownership", () => {
  expectIncludes(PUSH_SERVICE, "adminPushSubscriptionInputSchema");
  expectIncludes(PUSH_SERVICE, ".strict()");
  expectIncludes(PUSH_SERVICE, 'new URL(value).protocol === "https:"');
  expectIncludes(PUSH_SERVICE, "ADMIN_PUSH_SUBSCRIPTION_OWNERSHIP_CONFLICT");
  expectIncludes(PUSH_SERVICE, "existing.userId !== user.id");
});

test("F.R5 same-user register is idempotent and reactivates a revoked subscription", () => {
  for (const expected of [
    "registerAdminPushSubscription",
    "active: true",
    "revokedAt: null",
    "lastUsedAt: now",
    "p256dhKey: normalizedInput.keys.p256dh",
    "authKey: normalizedInput.keys.auth",
  ]) {
    expectIncludes(PUSH_SERVICE, expected);
  }
});

test("F.R5 revoke belongs to the current ADMIN and is soft/idempotent", () => {
  for (const expected of [
    "revokeAdminPushSubscription",
    "endpoint,",
    "userId: true",
    "active: false",
    "revokedAt: now",
  ]) {
    expectIncludes(PUSH_SERVICE, expected);
  }

  expectExcludes(PUSH_SERVICE, "delete({");
  expectExcludes(PUSH_SERVICE, "deleteMany");
});

test("F.R5 status API uses POST body instead of endpoint query strings", () => {
  expectIncludes(STATUS_ROUTE, "export async function POST");
  expectIncludes(STATUS_ROUTE, "adminPushEndpointInputSchema");
  expectExcludes(STATUS_ROUTE, "searchParams");
  expectExcludes(STATUS_ROUTE, "nextUrl.searchParams");
});

test("F.R5 API success payloads do not expose subscription secrets", () => {
  for (const source of [SUBSCRIPTIONS_ROUTE, STATUS_ROUTE, TEST_ROUTE]) {
    expectExcludes(source, "p256dh");
    expectExcludes(source, "authKey");
    expectExcludes(source, "provider");
  }

  expectIncludes(PUSH_SERVICE, "return { registered: true }");
  expectIncludes(PUSH_SERVICE, "return { sent: true }");
});

test("F.R5 controlled test push uses fixed copy and target", () => {
  for (const expected of [
    "sendAdminPushTestNotification",
    'title: "TRP Admin"',
    "Las notificaciones de este dispositivo están funcionando.",
    "Notifications are working on this device.",
    'targetPath: "/admin/notifications"',
    "webPush.sendNotification",
  ]) {
    expectIncludes(PUSH_SERVICE, expected);
  }

  expectIncludes(TEST_ROUTE, "adminPushTestInputSchema");
  expectExcludes(TEST_ROUTE, "bodyText");
  expectExcludes(TEST_ROUTE, "message");
});

test("F.R5 deactivates subscriptions on 404/410 push responses", () => {
  expectIncludes(PUSH_SERVICE, "statusCode === 404 || statusCode === 410");
  expectIncludes(PUSH_SERVICE, "active: false");
  expectIncludes(PUSH_SERVICE, "ADMIN_PUSH_SUBSCRIPTION_EXPIRED");
});

test("F.R5 adds the protected Admin notifications page and noindex metadata", () => {
  expectIncludes(NOTIFICATIONS_PAGE, "AdminNotificationsPageView");
  expectIncludes(NOTIFICATIONS_PAGE, "notificationsPage.seoTitle");
  expectIncludes(NOTIFICATIONS_PAGE, "index: false");
  expectIncludes(NOTIFICATIONS_PAGE, "follow: false");
  expectIncludes(ADMIN_INDEX, "AdminNotificationsPageView");
});

test("F.R5 adds Notifications to Admin navigation without restoring WhatsApp", () => {
  expectIncludes(ADMIN_SHELL, "/admin/notifications");
  expectIncludes(ADMIN_SHELL, 'key: "notifications"');
  expectIncludes(ADMIN_SHELL, "Bell");
  expectIncludes(ES_MESSAGES, 'notifications: "Notificaciones"');
  expectIncludes(EN_MESSAGES, 'notifications: "Notifications"');
  expectExcludes(ADMIN_SHELL, "/admin/whatsapp");
  expectExcludes(ADMIN_SHELL, 'key: "whatsapp"');
});

test("F.R5 notification center reports device, server, permission and display state", () => {
  for (const expected of [
    "browserSupport",
    "serverConfig",
    "permission",
    "serviceWorker",
    "browserSubscription",
    "serverRegistration",
    "displayMode",
    '(display-mode: standalone)',
  ]) {
    expectIncludes(NOTIFICATIONS_VIEW, expected);
  }
});

test("F.R5 requests notification permission only inside the explicit enable action", () => {
  assert.equal(
    (NOTIFICATIONS_VIEW.match(/Notification\.requestPermission/g) ?? []).length,
    1,
  );
  const enableIndex = NOTIFICATIONS_VIEW.indexOf(
    "async function enableNotifications",
  );
  const permissionIndex = NOTIFICATIONS_VIEW.indexOf(
    "Notification.requestPermission",
  );

  assert.ok(enableIndex >= 0);
  assert.ok(permissionIndex > enableIndex);
});

test("F.R5 UI registers the service worker and never persists subscription secrets locally", () => {
  expectIncludes(NOTIFICATIONS_VIEW, 'navigator.serviceWorker.register("/sw.js"');
  expectIncludes(NOTIFICATIONS_VIEW, 'scope: "/admin/"');
  expectIncludes(NOTIFICATIONS_VIEW, "pushManager.subscribe");
  expectIncludes(NOTIFICATIONS_VIEW, "pushManager.getSubscription");
  expectExcludes(NOTIFICATIONS_VIEW, "localStorage");
  expectExcludes(NOTIFICATIONS_VIEW, "indexedDB");
});

test("F.R5 UI sends disable to the backend before browser unsubscribe", () => {
  const disableBlock = sourceBlock(
    NOTIFICATIONS_VIEW,
    "async function disableNotifications",
    "async function sendTestNotification",
  );
  const revokeIndex = disableBlock.indexOf(
    '"/api/admin/push/subscriptions"',
  );
  const unsubscribeIndex = disableBlock.indexOf(
    "subscription.unsubscribe()",
  );

  assert.ok(revokeIndex >= 0);
  assert.ok(unsubscribeIndex > revokeIndex);
});

test("F.R5 UI allows disable cleanup when browser is subscribed but server is not registered", () => {
  const canDisableBlock = sourceBlock(
    NOTIFICATIONS_VIEW,
    "const canDisable =",
    "const canTest =",
  );

  expectIncludes(
    canDisableBlock,
    'subscriptionState === "subscribed"',
  );
  expectExcludes(
    canDisableBlock,
    'serverRegistrationState === "registered"',
  );
});

test("F.R5 UI handles expired test-push responses by attempting local browser unsubscribe", () => {
  const sendTestBlock = sourceBlock(
    NOTIFICATIONS_VIEW,
    "async function sendTestNotification",
    "const statusItems = useMemo",
  );
  const expiredBlock = sourceBlock(
    sendTestBlock,
    'code === "ADMIN_PUSH_SUBSCRIPTION_EXPIRED"',
    "setErrorMessage(\n        resolveError(code),",
  );

  expectIncludes(expiredBlock, "navigator.serviceWorker.ready");
  expectIncludes(expiredBlock, "registration.pushManager.getSubscription()");
  expectIncludes(expiredBlock, "subscription.unsubscribe()");
});

test("F.R5 expired test-push cleanup refreshes device state without issuing another server revoke", () => {
  const sendTestBlock = sourceBlock(
    NOTIFICATIONS_VIEW,
    "async function sendTestNotification",
    "const statusItems = useMemo",
  );
  const expiredBlock = sourceBlock(
    sendTestBlock,
    'code === "ADMIN_PUSH_SUBSCRIPTION_EXPIRED"',
    "setErrorMessage(\n        resolveError(code),",
  );

  const unsubscribeIndex = expiredBlock.indexOf("subscription.unsubscribe()");
  const refreshIndex = expiredBlock.indexOf("await refreshCurrentDevice()");

  assert.ok(unsubscribeIndex >= 0);
  assert.ok(refreshIndex > unsubscribeIndex);
  expectExcludes(expiredBlock, '"/api/admin/push/subscriptions"');
  expectIncludes(
    expiredBlock,
    "copy.errors.ADMIN_PUSH_BROWSER_UNSUBSCRIBE_FAILED",
  );
});

test("F.R5 UI exposes only the controlled test notification action", () => {
  expectIncludes(NOTIFICATIONS_VIEW, '"/api/admin/push/test"');
  expectIncludes(NOTIFICATIONS_VIEW, "copy.actions.test");
  expectExcludes(NOTIFICATIONS_VIEW, "textarea");
  expectExcludes(NOTIFICATIONS_VIEW, "contentEditable");
});

test("F.R5 keeps Vercel cron registrations empty", () => {
  assert.deepEqual(JSON.parse(read("vercel.json")), { crons: [] });
});

test("F.R5 runtime source does not log push secrets or endpoints", () => {
  for (const source of [
    PUSH_SERVICE,
    CONFIG_ROUTE,
    SUBSCRIPTIONS_ROUTE,
    STATUS_ROUTE,
    TEST_ROUTE,
  ]) {
    expectExcludes(source, "console.log");
    expectExcludes(source, "console.error");
    expectExcludes(source, "AdminAuditLog");
    expectExcludes(source, "adminAuditLog");
  }
});
