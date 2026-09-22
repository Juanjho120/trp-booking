import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";

import { test } from "./harness";

const ROOT = process.cwd();
const FOUNDATION_MIGRATION_NAME =
  "20260922170000_final_f_3_whatsapp_persistence_foundation";
const CORRECTIVE_MIGRATION_NAME =
  "20260922193000_final_f_3_correct_twilio_message_sid_constraints";
const SCHEMA = read("prisma/schema.prisma");
const MIGRATION = read(
  `prisma/migrations/${FOUNDATION_MIGRATION_NAME}/migration.sql`,
);
const CORRECTIVE_MIGRATION = read(
  `prisma/migrations/${CORRECTIVE_MIGRATION_NAME}/migration.sql`,
);
const PACKAGE_JSON = read("package.json");
const VERCEL_JSON = read("vercel.json");
const INBOUND_ROUTE = read("app/api/twilio/whatsapp/inbound/route.ts");
const STATUS_ROUTE = read("app/api/twilio/whatsapp/status/route.ts");
const TWILIO_MESSAGE_SID_CONTRACT = /^(SM|MM)[0-9a-fA-F]{32}$/;
const LEGACY_MESSAGE_SID_PATTERN = "^SM[0-9A-Za-z]{32}$";
const CORRECT_MESSAGE_SID_PATTERN = "^(SM|MM)[0-9a-fA-F]{32}$";

function read(relativePath: string): string {
  return readFileSync(path.join(ROOT, relativePath), "utf8");
}

function schemaBlock(kind: "enum" | "model", name: string): string {
  const match = SCHEMA.match(new RegExp(`${kind} ${name} \\{[\\s\\S]*?\\n\\}`));

  assert.ok(match, `${kind} ${name} must exist`);

  return match[0];
}

function enumValues(name: string): string[] {
  return schemaBlock("enum", name)
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(
      (line) =>
        line.length > 0 &&
        line !== `enum ${name} {` &&
        line !== "}" &&
        !line.startsWith("@@"),
    );
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

test("F.3 defines dormant WhatsApp conversation/message and staff recipient/alert models", () => {
  for (const model of [
    "WhatsAppConversation",
    "WhatsAppMessage",
    "StaffWhatsAppRecipient",
    "StaffWhatsAppAlert",
  ]) {
    schemaBlock("model", model);
  }

  assert.deepEqual(enumValues("WhatsAppMessageDirection"), [
    "INBOUND",
    "OUTBOUND",
  ]);
  assert.deepEqual(enumValues("WhatsAppMessageStatus"), [
    "RECEIVED",
    "PENDING",
    "PROCESSING",
    "QUEUED",
    "SENT",
    "DELIVERED",
    "READ",
    "FAILED",
    "UNDELIVERED",
    "SKIPPED",
  ]);
  assert.deepEqual(enumValues("StaffWhatsAppAlertStatus"), [
    "PENDING",
    "PROCESSING",
    "QUEUED",
    "SENT",
    "DELIVERED",
    "READ",
    "FAILED",
    "UNDELIVERED",
    "SKIPPED",
  ]);
});

test("F.3 freezes exactly the seven accepted staff WhatsApp alert classes", () => {
  assert.deepEqual(enumValues("StaffWhatsAppAlertType"), [
    "RESERVATION_CONFIRMED",
    "RESERVATION_CANCELLED",
    "CHECK_IN_MINUS_48H",
    "CHECK_OUT_MINUS_6H",
    "REVIEW_SUBMITTED",
    "GUEST_WHATSAPP_RECEIVED",
    "GUEST_EMAIL_RECEIVED",
  ]);
});

test("F.3 keeps conversation reservation matching optional and source relations scoped", () => {
  const conversation = schemaBlock("model", "WhatsAppConversation");
  const message = schemaBlock("model", "WhatsAppMessage");
  const alert = schemaBlock("model", "StaffWhatsAppAlert");
  const reservation = schemaBlock("model", "Reservation");
  const review = schemaBlock("model", "Review");

  expectIncludes(conversation, "reservationId");
  expectIncludes(conversation, "String?");
  expectIncludes(conversation, "Reservation?");
  expectIncludes(conversation, "onDelete: SetNull");
  expectIncludes(reservation, "whatsappConversations");
  expectIncludes(reservation, "staffWhatsAppAlerts");
  expectIncludes(review, "staffWhatsAppAlerts");
  expectIncludes(message, "sourceStaffAlerts");
  expectIncludes(alert, "sourceWhatsAppMessageId");
  expectIncludes(alert, "reservationId");
  expectIncludes(alert, "reviewId");
  expectIncludes(alert, "onDelete: SetNull");
});

test("F.3 migration enforces E.164 phone boundaries and staff opt-in activation", () => {
  for (const constraint of [
    '"whatsapp_conversations_guest_phone_e164_check"',
    '"staff_whatsapp_recipients_phone_e164_check"',
    '"staff_whatsapp_alerts_recipient_snapshot_e164_check"',
    '"staff_whatsapp_recipients_active_opt_in_check"',
  ]) {
    expectIncludes(MIGRATION, constraint);
  }

  expectIncludes(MIGRATION, "'^\\+[1-9][0-9]{7,14}$'");
  expectIncludes(MIGRATION, 'CHECK (NOT "active" OR "opted_in_at" IS NOT NULL)');
});

test("F.3 migration adds idempotency and delivery indexes without data backfill", () => {
  for (const statement of [
    'CREATE UNIQUE INDEX "whatsapp_messages_provider_message_sid_key"',
    'CREATE UNIQUE INDEX "staff_whatsapp_alerts_deduplication_key_key"',
    'CREATE UNIQUE INDEX "staff_whatsapp_alerts_provider_message_sid_key"',
    'CREATE INDEX "whatsapp_messages_status_next_attempt_at_idx"',
    'CREATE INDEX "staff_whatsapp_alerts_status_next_attempt_at_idx"',
  ]) {
    expectIncludes(MIGRATION, statement);
  }

  for (const migration of [MIGRATION, CORRECTIVE_MIGRATION]) {
    assert.equal(
      /^\s*(INSERT\s+INTO|UPDATE\s+"|DELETE\s+FROM|TRUNCATE\s+)/imu.test(
        migration,
      ),
      false,
    );
  }
});

test("F.3 corrective migration enforces the accepted Twilio MessageSid contract", () => {
  assert.ok(
    CORRECTIVE_MIGRATION_NAME > FOUNDATION_MIGRATION_NAME,
    "Corrective migration must run after the applied foundation migration",
  );
  expectIncludes(MIGRATION, `'${LEGACY_MESSAGE_SID_PATTERN}'`);

  for (const constraint of [
    "whatsapp_messages_provider_message_sid_check",
    "staff_whatsapp_alerts_provider_message_sid_check",
  ]) {
    expectIncludes(CORRECTIVE_MIGRATION, `DROP CONSTRAINT "${constraint}"`);
    expectIncludes(CORRECTIVE_MIGRATION, `ADD CONSTRAINT "${constraint}"`);
  }

  expectIncludes(
    CORRECTIVE_MIGRATION,
    `"provider_message_sid" ~ '${CORRECT_MESSAGE_SID_PATTERN}'`,
  );
  assert.equal(
    CORRECTIVE_MIGRATION.split(
      `"provider_message_sid" ~ '${CORRECT_MESSAGE_SID_PATTERN}'`,
    ).length - 1,
    2,
  );
  expectExcludes(CORRECTIVE_MIGRATION, LEGACY_MESSAGE_SID_PATTERN);
  expectExcludes(CORRECTIVE_MIGRATION, "CREATE UNIQUE INDEX");
  expectExcludes(CORRECTIVE_MIGRATION, "DROP INDEX");
  expectExcludes(CORRECTIVE_MIGRATION, "ALTER COLUMN");

  for (const validSid of [
    `SM${"a".repeat(32)}`,
    `MM${"0123456789abcdef".repeat(2)}`,
  ]) {
    assert.equal(TWILIO_MESSAGE_SID_CONTRACT.test(validSid), true);
  }

  for (const invalidSid of [
    `SM${"g".repeat(32)}`,
    `XX${"a".repeat(32)}`,
    `SM${"a".repeat(31)}`,
  ]) {
    assert.equal(TWILIO_MESSAGE_SID_CONTRACT.test(invalidSid), false);
  }

  const legacyContract = /^SM[0-9A-Za-z]{32}$/;
  assert.equal(legacyContract.test(`SM${"g".repeat(32)}`), true);
  assert.equal(legacyContract.test(`MM${"a".repeat(32)}`), false);
});

test("F.3 message persistence has bounded fields and no raw webhook payload column", () => {
  const conversation = schemaBlock("model", "WhatsAppConversation");
  const message = schemaBlock("model", "WhatsAppMessage");
  const alert = schemaBlock("model", "StaffWhatsAppAlert");

  for (const field of [
    "customerServiceWindowStartedAt",
    "customerServiceWindowExpiresAt",
    "providerMessageSid",
    "mediaCount",
    "mediaMetadata",
    "attemptCount",
    "nextAttemptAt",
    "processingStartedAt",
    "deliveredAt",
    "readAt",
    "failedAt",
  ]) {
    assert.ok(
      `${conversation}\n${message}\n${alert}`.includes(field),
      `Expected WhatsApp persistence field: ${field}`,
    );
  }

  expectExcludes(message, "rawPayload");
  expectExcludes(message, "webhookPayload");
  expectExcludes(alert, "rawPayload");
  expectExcludes(alert, "webhookPayload");
});

test("F.3 migration creates only the four dormant WhatsApp persistence tables", () => {
  const createdTables = Array.from(
    MIGRATION.matchAll(/CREATE TABLE "([^"]+)"/g),
    (match) => match[1],
  );

  assert.deepEqual(createdTables, [
    "whatsapp_conversations",
    "whatsapp_messages",
    "staff_whatsapp_recipients",
    "staff_whatsapp_alerts",
  ]);

  for (const table of createdTables) {
    expectIncludes(MIGRATION, `CREATE TABLE "${table}"`);
  }
});

test("F.3 leaves accepted Twilio inbound and status routes ACK-only with no persistence activation", () => {
  for (const route of [INBOUND_ROUTE, STATUS_ROUTE]) {
    expectIncludes(route, "validateTwilioWebhookRequest");
    expectExcludes(route, "prisma");
    expectExcludes(route, "WhatsAppConversation");
    expectExcludes(route, "WhatsAppMessage");
    expectExcludes(route, "StaffWhatsAppAlert");
    expectExcludes(route, "StaffWhatsAppRecipient");
  }

  expectIncludes(INBOUND_ROUTE, "<Response></Response>");
  expectIncludes(STATUS_ROUTE, "status: 204");
});

test("F.3 does not register crons or a permanent Final-F validation gate yet", () => {
  const packageJson = JSON.parse(PACKAGE_JSON) as {
    scripts: Record<string, string>;
  };

  assert.deepEqual(JSON.parse(VERCEL_JSON), { crons: [] });
  assert.equal(
    Object.prototype.hasOwnProperty.call(packageJson.scripts, "final-f:validate"),
    false,
  );
});
