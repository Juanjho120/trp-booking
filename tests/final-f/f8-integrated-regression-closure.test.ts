import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { AdminNotificationType } from "@prisma/client";

import manifest from "@/app/manifest";
import {
  buildPublicWhatsAppUrl,
  getPublicWhatsAppContact,
} from "@/config/public-whatsapp";
import { siteConfig } from "@/config/site";
import { enMessages, esMessages } from "@/messages";
import { parseZohoLimitedInboundEmailPayload } from "@/lib/zoho-mail";

import { test } from "./harness";

const ROOT = process.cwd();

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
  scripts?: Record<string, string>;
};
const SCHEMA = read("prisma/schema.prisma");
const VERCEL = read("vercel.json");
const ADMIN_SHELL = read("features/admin/components/admin-shell.tsx");
const NOTIFICATIONS_PAGE = read("app/admin/notifications/page.tsx");
const NOTIFICATIONS_VIEW = read(
  "features/admin/components/admin-notifications-page.tsx",
);
const SUBSCRIPTIONS_ROUTE = read(
  "app/api/admin/push/subscriptions/route.ts",
);
const STATUS_ROUTE = read(
  "app/api/admin/push/subscriptions/status/route.ts",
);
const TEST_ROUTE = read("app/api/admin/push/test/route.ts");
const FLOATING_ACTION = read(
  "components/layout/public-whatsapp-floating-action.tsx",
);
const SITE_FOOTER = read("components/layout/site-footer.tsx");
const SERVICE_WORKER = read("public/sw.js");
const OPERATIONAL_SERVICE = read("lib/admin-notifications/operational.ts");
const INBOUND_SERVICE = read("lib/zoho-mail/inbound-email.ts");
const CENTER_SERVICE = read("lib/admin-notifications/center.ts");
const ZOHO_ROUTE = read("app/api/integrations/zoho-mail/webhook/route.ts");
const DOC_200 = read(
  "docs/200-final-f-r3-admin-web-push-public-whatsapp-architecture-rebaseline.md",
);
const DOC_205 = read(
  "docs/205-final-f-8-integrated-regression-and-final-f-closure.md",
);

const acceptedNotificationTypes = [
  "CHECK_IN_MINUS_48H",
  "CHECK_OUT_MINUS_6H",
  "GUEST_EMAIL_RECEIVED",
  "RESERVATION_CANCELLED",
  "RESERVATION_CONFIRMED",
  "REVIEW_SUBMITTED",
] as const;

test("F.8 exposes the permanent Final-F validation gate", () => {
  assert.equal(
    PACKAGE_JSON.scripts?.["final-f:validate"],
    "tsx --tsconfig tests/final-f/tsconfig.json tests/final-f/run.ts",
  );
  expectIncludes(
    read("tests/final-f/run.ts"),
    "./f8-integrated-regression-closure.test",
  );
});

test("F.8 integrated public WhatsApp architecture remains public-only", () => {
  assert.equal(
    buildPublicWhatsAppUrl(
      "+50255551234",
      esMessages.publicWhatsApp.initialMessage,
    ),
    `https://wa.me/50255551234?text=${encodeURIComponent(
      "Hola, tengo una consulta sobre Tu Refugio Perfecto.",
    )}`,
  );
  assert.equal(
    buildPublicWhatsAppUrl(
      "+15005551234",
      enMessages.publicWhatsApp.initialMessage,
    ),
    `https://wa.me/15005551234?text=${encodeURIComponent(
      "Hello, I have a question about Tu Refugio Perfecto.",
    )}`,
  );
  assert.deepEqual(
    getPublicWhatsAppContact(
      esMessages.publicWhatsApp.initialMessage,
      "+50255551234",
    ),
    {
      phoneE164: "+50255551234",
      digits: "50255551234",
      href: `https://wa.me/50255551234?text=${encodeURIComponent(
        "Hola, tengo una consulta sobre Tu Refugio Perfecto.",
      )}`,
    },
  );

  expectIncludes(FLOATING_ACTION, "getPublicWhatsAppContact");
  expectIncludes(SITE_FOOTER, "PublicWhatsAppFloatingAction");
  expectExcludes(ADMIN_SHELL, "PublicWhatsAppFloatingAction");
  assert.equal(exists("app/admin/whatsapp/page.tsx"), false);
  assert.equal(exists("app/api/twilio/whatsapp/inbound/route.ts"), false);
  assert.equal(exists("app/api/360dialog/whatsapp/webhook/route.ts"), false);
  assert.equal(PACKAGE_JSON.dependencies?.twilio, undefined);
  assert.deepEqual(JSON.parse(VERCEL), { crons: [] });
});

test("F.8 integrated Android PWA and Web Push foundation remains bounded", () => {
  assert.deepEqual(manifest(), {
    name: "TRP Admin",
    short_name: "TRP Admin",
    start_url: "/admin/notifications",
    scope: "/admin/",
    display: "standalone",
    background_color: "#ffffff",
    theme_color: "#111827",
    icons: [
      {
        src: "/brand/favicon-192.png",
        sizes: "192x192",
        type: "image/png",
      },
      {
        src: "/brand/favicon-512.png",
        sizes: "512x512",
        type: "image/png",
      },
    ],
  });

  expectIncludes(NOTIFICATIONS_PAGE, "getAdminSessionActor");
  for (const route of [SUBSCRIPTIONS_ROUTE, STATUS_ROUTE, TEST_ROUTE]) {
    expectIncludes(route, "getAdminSessionActor");
    expectIncludes(route, "isValidAdminMutationOrigin");
  }
  expectIncludes(NOTIFICATIONS_VIEW, 'navigator.serviceWorker.register("/sw.js"');
  expectIncludes(NOTIFICATIONS_VIEW, 'scope: "/admin/"');
  const enableBlock = sourceBlock(
    NOTIFICATIONS_VIEW,
    "async function enableNotifications",
    "async function disableNotifications",
  );
  expectIncludes(enableBlock, "Notification.requestPermission()");
  expectIncludes(SERVICE_WORKER, 'addEventListener("push"');
  expectIncludes(SERVICE_WORKER, 'addEventListener("notificationclick"');
  expectExcludes(SERVICE_WORKER, 'addEventListener("fetch"');
  expectExcludes(SERVICE_WORKER, "caches.");
  expectExcludes(SERVICE_WORKER, "indexedDB");
  expectIncludes(DOC_200, "iOS/iPadOS are explicitly deferred");
});

test("F.8 integrated notification package keeps the six accepted ADMIN classes only", () => {
  assert.deepEqual(
    Object.values(AdminNotificationType).sort(),
    [...acceptedNotificationTypes].sort(),
  );

  for (const type of acceptedNotificationTypes) {
    expectIncludes(SCHEMA, type);
  }

  expectExcludes(SCHEMA, "GUEST_WHATSAPP_RECEIVED");

  for (const expected of [
    "Reservación confirmada · ${guestName} · ${propertyName}",
    "Reservación cancelada · ${guestName} · ${propertyName}",
    "Check-in en 48 horas · ${guestName} · ${propertyName}",
    "Check-out en 6 horas · ${guestName} · ${propertyName}",
    "Nueva reseña recibida · ${guestName} · ${propertyName}",
    "Nuevo correo de huésped · ${guestName} · ${propertyName}",
  ]) {
    expectIncludes(OPERATIONAL_SERVICE, expected);
  }

  for (const forbidden of [
    "guestPhone",
    "comment:",
    "amount:",
    "accessToken",
    "WEB_PUSH_VAPID_PRIVATE_KEY",
  ]) {
    expectExcludes(OPERATIONAL_SERVICE, forbidden);
  }
});

test("F.8 integrated delivery model keeps immediate delivery and cron as fallback", () => {
  for (const sourcePath of [
    "lib/reservations/confirmation.ts",
    "lib/admin/reservation-cancellation.ts",
    "lib/reviews/review-submission.ts",
  ]) {
    const source = read(sourcePath);
    expectIncludes(source, "deliverAdminPushNotificationsBestEffort");
    expectIncludes(source, "adminPushNotificationIds");
  }

  expectIncludes(INBOUND_SERVICE, "deliverAdminPushNotificationsBestEffort");
  expectIncludes(INBOUND_SERVICE, "if (result.created)");
  expectIncludes(INBOUND_SERVICE, "await deliver([result.notificationId]");
  expectExcludes(INBOUND_SERVICE, "processAdminPushNotifications");
  expectIncludes(OPERATIONAL_SERVICE, "processAdminPushNotifications");
  expectIncludes(OPERATIONAL_SERVICE, "ADMIN_PUSH_RETRY_DELAYS_MS");
  assert.deepEqual(JSON.parse(VERCEL), { crons: [] });
});

test("F.8 integrated Zoho inbound contract accepts bounded metadata and ignores provider IDs", () => {
  const parsed = parseZohoLimitedInboundEmailPayload({
    subject: "Consulta de llegada",
    from: "Guest Example <guest@example.com>",
    to: ["Reservas <reservas@juantzun.dev>"],
    receivedAt: "2026-09-25T14:00:00.000Z",
    messageId: "provider-message-id-that-must-not-persist",
  });

  assert.deepEqual(parsed, {
    subject: "Consulta de llegada",
    fromAddress: "guest@example.com",
    toAddress: "reservas@juantzun.dev",
    toAddresses: ["reservas@juantzun.dev"],
    receivedAt: new Date("2026-09-25T14:00:00.000Z"),
  });
  assert.equal(siteConfig.correspondence.zohoMailWebUrl, "https://mail.zoho.com/");
  expectIncludes(NOTIFICATIONS_VIEW, "siteConfig.correspondence.zohoMailWebUrl");
  expectIncludes(NOTIFICATIONS_VIEW, '"_blank"');
  expectIncludes(NOTIFICATIONS_VIEW, '"noopener,noreferrer"');
  expectExcludes(NOTIFICATIONS_VIEW, "intent://");
  expectExcludes(INBOUND_SERVICE, "messageId");
  expectExcludes(CENTER_SERVICE, "messageId");
  expectExcludes(SERVICE_WORKER, "messageId");
  expectIncludes(ZOHO_ROUTE, "fieldCategory: error.fieldCategory");
});

test("F.8 documentation records accepted Hosted closure and package boundaries", () => {
  for (const expected of [
    "Status: Completed and accepted on 2026-09-28",
    "Implementation base head: c5a41d8a01b7772f7a75c7c0ae382e3df92ff13e",
    "Accepted implementation/validation head: 13f0e0cf6904e34155dd754230f320ca6c214141",
    "Final-F accepted feature head: 13f0e0cf6904e34155dd754230f320ca6c214141",
    "Owner acceptance: Completed on 2026-09-28",
    "Hosted integrated regression: Completed and accepted",
    "Vercel for accepted head: SUCCESS",
    "npm run final-f:validate",
    "Final-F package — completed and accepted",
    "Final-G: Completed and accepted on 2026-09-28 at be8445a2c73a710e451da608fd9e669f8f412ab3",
    "Final-H: Integrated regression/evidence completed; owner acceptance pending",
    "Phase 13: Not started",
    "No schema changes",
    "No migration changes",
    "No Production resources",
    'vercel.json remains {"crons":[]}',
  ]) {
    expectIncludes(DOC_205, expected);
  }
});
