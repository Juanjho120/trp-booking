import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";

import {
  buildPublicWhatsAppUrl,
  getPublicWhatsAppContact,
  normalizePublicWhatsAppPhone,
} from "@/config/public-whatsapp";
import { enMessages, esMessages } from "@/messages";

import { test } from "./harness";

const ROOT = process.cwd();
const CLEANUP_MIGRATION_NAME =
  "20260924130000_final_f_r4_remove_whatsapp_backend";
const HISTORICAL_MIGRATIONS = [
  "20260922170000_final_f_3_whatsapp_persistence_foundation",
  "20260922193000_final_f_3_correct_twilio_message_sid_constraints",
  "20260922210000_final_f_5_whatsapp_outbound_idempotency",
] as const;

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

const PACKAGE_JSON = JSON.parse(read("package.json")) as {
  dependencies?: Record<string, string>;
  scripts?: Record<string, string>;
};
const PACKAGE_LOCK = JSON.parse(read("package-lock.json")) as {
  packages?: Record<string, unknown>;
};
const SCHEMA = read("prisma/schema.prisma");
const ENV_EXAMPLE = read(".env.example");
const SERVER_ENV = read("lib/env/server.ts");
const ADMIN_SHELL = read("features/admin/components/admin-shell.tsx");
const ES_MESSAGES = read("messages/es.ts");
const EN_MESSAGES = read("messages/en.ts");
const PUBLIC_WHATSAPP_CONFIG = read("config/public-whatsapp.ts");
const FLOATING_ACTION = read(
  "components/layout/public-whatsapp-floating-action.tsx",
);
const SITE_FOOTER = read("components/layout/site-footer.tsx");
const CLEANUP_MIGRATION = read(
  `prisma/migrations/${CLEANUP_MIGRATION_NAME}/migration.sql`,
);

test("F.R4 removes the direct Twilio dependency from npm manifests", () => {
  assert.equal(PACKAGE_JSON.dependencies?.twilio, undefined);
  assert.equal(PACKAGE_LOCK.packages?.["node_modules/twilio"], undefined);
});

test("F.R4 removes lib/twilio and Twilio webhook routes", () => {
  for (const removedPath of [
    "lib/twilio/inbound-whatsapp.ts",
    "lib/twilio/provider.ts",
    "lib/twilio/whatsapp-status.ts",
    "app/api/twilio/whatsapp/inbound/route.ts",
    "app/api/twilio/whatsapp/status/route.ts",
    "scripts/final-f-2-twilio-sandbox-probe.ts",
  ]) {
    assert.equal(exists(removedPath), false, `${removedPath} must be absent`);
  }
});

test("F.R4 removes the 360dialog provider, webhook route and probe script", () => {
  for (const removedPath of [
    "lib/360dialog/provider.ts",
    "app/api/360dialog/whatsapp/webhook/route.ts",
    "scripts/final-f-r2-360dialog-provider-probe.ts",
  ]) {
    assert.equal(exists(removedPath), false, `${removedPath} must be absent`);
  }
});

test("F.R4 removes the protected Admin WhatsApp inbox and APIs", () => {
  for (const removedPath of [
    "app/admin/whatsapp/page.tsx",
    "app/api/admin/whatsapp/conversations/[conversationId]/messages/route.ts",
    "app/api/admin/whatsapp/conversations/[conversationId]/read/route.ts",
    "features/admin/components/admin-whatsapp-page.tsx",
    "lib/admin/whatsapp.ts",
    "lib/admin/whatsapp-display.ts",
    "types/admin-whatsapp.ts",
  ]) {
    assert.equal(exists(removedPath), false, `${removedPath} must be absent`);
  }
});

test("F.R4 removes WhatsApp from Admin navigation", () => {
  for (const removedSource of [
    "/admin/whatsapp",
    'key: "whatsapp"',
    "MessagesSquare",
  ]) {
    expectExcludes(ADMIN_SHELL, removedSource);
  }
});

test("F.R4 removes Admin WhatsApp exports", () => {
  expectExcludes(read("features/admin/index.ts"), "AdminWhatsAppPageView");
  expectExcludes(read("lib/admin/index.ts"), "AdminWhatsApp");
  expectExcludes(read("lib/admin/index.ts"), "./whatsapp");
});

test("F.R4 removes WhatsApp backend Prisma models and enums", () => {
  for (const removedSource of [
    "enum WhatsAppMessageDirection",
    "enum WhatsAppMessageStatus",
    "enum StaffWhatsAppAlertType",
    "enum StaffWhatsAppAlertStatus",
    "model WhatsAppConversation",
    "model WhatsAppMessage",
    "model StaffWhatsAppRecipient",
    "model StaffWhatsAppAlert",
    "whatsappConversations",
    "staffWhatsAppAlerts",
    "providerMessageSid",
    "GUEST_WHATSAPP_RECEIVED",
  ]) {
    expectExcludes(SCHEMA, removedSource);
  }
});

test("F.R4 preserves the human lifecycle WhatsApp channel", () => {
  expectIncludes(SCHEMA, "enum ReservationLifecycleRequestChannel");
  expectIncludes(SCHEMA, "  WHATSAPP");
  expectIncludes(ES_MESSAGES, 'WHATSAPP: "WhatsApp"');
  expectIncludes(EN_MESSAGES, 'WHATSAPP: "WhatsApp"');
});

test("F.R4 cleanup migration drops only the backend WhatsApp tables and enum types", () => {
  for (const statement of [
    'DROP TABLE IF EXISTS "staff_whatsapp_alerts";',
    'DROP TABLE IF EXISTS "staff_whatsapp_recipients";',
    'DROP TABLE IF EXISTS "whatsapp_messages";',
    'DROP TABLE IF EXISTS "whatsapp_conversations";',
    'DROP TYPE IF EXISTS "staff_whatsapp_alert_status";',
    'DROP TYPE IF EXISTS "staff_whatsapp_alert_type";',
    'DROP TYPE IF EXISTS "whatsapp_message_status";',
    'DROP TYPE IF EXISTS "whatsapp_message_direction";',
  ]) {
    expectIncludes(CLEANUP_MIGRATION, statement);
  }

  expectExcludes(CLEANUP_MIGRATION, "reservation_lifecycle_request_channel");
  expectExcludes(CLEANUP_MIGRATION, "reservations");
  expectExcludes(CLEANUP_MIGRATION, "reviews");
});

test("F.R4 keeps historical WhatsApp migrations as immutable audit trail", () => {
  for (const migrationName of HISTORICAL_MIGRATIONS) {
    assert.equal(
      exists(`prisma/migrations/${migrationName}/migration.sql`),
      true,
      `${migrationName} must remain`,
    );
  }
});

test("F.R4 removes Twilio and 360dialog server env contracts", () => {
  for (const removedSource of [
    "TWILIO_",
    "D360_",
    "TwilioEnv",
    "D360Env",
    "getTwilioEnv",
    "getD360Env",
    "twilioWebhookBaseUrlKey",
    "d360WebhookBaseUrlKey",
  ]) {
    expectExcludes(ENV_EXAMPLE, removedSource);
    expectExcludes(SERVER_ENV, removedSource);
  }
});

test("F.R4 documents NEXT_PUBLIC_WHATSAPP_PHONE_E164 as public build-time config", () => {
  for (const expected of [
    'NEXT_PUBLIC_WHATSAPP_PHONE_E164=""',
    "public by design; it is NOT a secret",
    "Local/Test should use the developer/test WhatsApp Business App number",
    "Production should use Tu Refugio Perfecto's official WhatsApp Business App number",
    "Values may differ by environment",
    "formatted as +<E.164>",
    "Vercel changes require redeployment",
  ]) {
    expectIncludes(ENV_EXAMPLE, expected);
  }
});

test("F.R4 does not hardcode a public WhatsApp number in git", () => {
  assert.equal(
    /NEXT_PUBLIC_WHATSAPP_PHONE_E164="\+\d/.test(ENV_EXAMPLE),
    false,
  );
  assert.equal(/wa\.me\/\d{8,15}/.test(PUBLIC_WHATSAPP_CONFIG), false);
  assert.equal(/wa\.me\/\d{8,15}/.test(FLOATING_ACTION), false);
});

test("F.R4 normalizes only +E.164 public WhatsApp numbers", () => {
  assert.equal(normalizePublicWhatsAppPhone(" +50255551234 "), "+50255551234");
  assert.equal(normalizePublicWhatsAppPhone("50255551234"), null);
  assert.equal(normalizePublicWhatsAppPhone("+012345678"), null);
  assert.equal(normalizePublicWhatsAppPhone(""), null);
  assert.equal(normalizePublicWhatsAppPhone(undefined), null);
});

test("F.R4 builds the expected wa.me URL for the ES initial message", () => {
  assert.equal(
    buildPublicWhatsAppUrl(
      "+50255551234",
      esMessages.publicWhatsApp.initialMessage,
    ),
    `https://wa.me/50255551234?text=${encodeURIComponent(
      "Hola, tengo una consulta sobre Tu Refugio Perfecto.",
    )}`,
  );
});

test("F.R4 builds the expected wa.me URL for the EN initial message", () => {
  assert.equal(
    buildPublicWhatsAppUrl(
      "+15005551234",
      enMessages.publicWhatsApp.initialMessage,
    ),
    `https://wa.me/15005551234?text=${encodeURIComponent(
      "Hello, I have a question about Tu Refugio Perfecto.",
    )}`,
  );
});

test("F.R4 safely disables public WhatsApp contact for missing or invalid config", () => {
  assert.equal(
    getPublicWhatsAppContact(esMessages.publicWhatsApp.initialMessage, ""),
    null,
  );
  assert.equal(
    getPublicWhatsAppContact(esMessages.publicWhatsApp.initialMessage, "5555"),
    null,
  );
});

test("F.R4 returns complete public WhatsApp contact data for valid config", () => {
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
});

test("F.R4 implements the floating public WhatsApp action accessibly", () => {
  for (const expected of [
    '"use client"',
    "MessageCircle",
    "getPublicWhatsAppContact",
    "fixed",
    "safe-area-inset-bottom",
    "safe-area-inset-right",
    "min-h-11 min-w-11",
    "focus-visible",
    "aria-label={copy.ariaLabel}",
    'target="_blank"',
    'rel="noopener noreferrer"',
  ]) {
    expectIncludes(FLOATING_ACTION, expected);
  }
});

test("F.R4 wires the floating action and optional footer link through shared public chrome", () => {
  expectIncludes(SITE_FOOTER, "PublicWhatsAppFloatingAction");
  expectIncludes(SITE_FOOTER, "getPublicWhatsAppContact");
  expectIncludes(SITE_FOOTER, "messages.publicWhatsApp.footerLabel");

  for (const publicSurface of [
    "features/marketing/components/home-page.tsx",
    "features/properties/components/accommodations-page.tsx",
    "features/properties/components/property-detail-page.tsx",
    "features/reviews/components/public-reviews-page.tsx",
  ]) {
    const source = read(publicSurface);

    expectIncludes(source, "SiteHeader");
    expectIncludes(source, "SiteFooter");
  }
});

test("F.R4 keeps public WhatsApp out of the Admin shell", () => {
  expectExcludes(ADMIN_SHELL, "PublicWhatsAppFloatingAction");
  expectExcludes(ADMIN_SHELL, "getPublicWhatsAppContact");
});

test("F.R4 removes Admin WhatsApp copy while preserving human WhatsApp labels", () => {
  for (const source of [ES_MESSAGES, EN_MESSAGES]) {
    expectExcludes(source, "whatsappPage");
    expectExcludes(source, "ADMIN_WHATSAPP_");
    expectIncludes(source, "publicWhatsApp");
    expectIncludes(source, 'WHATSAPP: "WhatsApp"');
  }
});

test("F.R4 keeps Vercel cron registrations empty", () => {
  assert.deepEqual(JSON.parse(read("vercel.json")), { crons: [] });
});

test("F.R4 kept durable Admin Web Push notification history out of its historical scope", () => {
  const r4Record = read(
    "docs/201-final-f-r4-whatsapp-backend-decommission-and-public-whatsapp-contact.md",
  );

  expectIncludes(r4Record, "no PWA, service worker, manifest, Web Push");
  expectIncludes(r4Record, "no /admin/notifications route");
  assert.equal(PACKAGE_JSON.dependencies?.firebase, undefined);
  assert.equal(PACKAGE_JSON.dependencies?.["firebase-admin"], undefined);
});
