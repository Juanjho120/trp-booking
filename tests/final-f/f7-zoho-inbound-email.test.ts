import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import {
  AdminNotificationType,
  AdminPushDeliveryStatus,
  ReservationStatus,
  type PrismaClient,
} from "@prisma/client";

import {
  buildZohoMailAndroidIntentUrl,
  resolveZohoMailOpenUrlForUserAgent,
} from "@/features/admin/components/admin-notifications-page";
import { getZohoMailWebhookEnv } from "@/lib/env/server";
import {
  createZohoMailWebhookSignature,
  decryptZohoMailWebhookSecret,
  encryptZohoMailWebhookSecret,
  getAcceptedZohoMailRecipientAddresses,
  getAcceptedZohoMailRecipientDomain,
  isAcceptedZohoMailRecipient,
  isInternalZohoMailSender,
  parseZohoLimitedInboundEmailPayload,
  processZohoMailWebhook,
  verifyZohoMailWebhookSignature,
  ZohoLimitedDataError,
  ZohoMailWebhookError,
} from "@/lib/zoho-mail";

import { test } from "./harness";

const ROOT = process.cwd();
const MIGRATION_NAME =
  "20260925210000_final_f_7_zoho_inbound_email_metadata";
const ZOHO_KEY = "AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA=";
const MATCH_NOW = new Date("2026-09-25T18:00:00.000Z");

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
const ENV_EXAMPLE = read(".env.example");
const SERVER_ENV = read("lib/env/server.ts");
const ROUTE = read("app/api/integrations/zoho-mail/webhook/route.ts");
const LIMITED_DATA = read("lib/zoho-mail/limited-data.ts");
const INBOUND_SERVICE = read("lib/zoho-mail/inbound-email.ts");
const SECRET_CRYPTO = read("lib/zoho-mail/webhook-secret-crypto.ts");
const SIGNATURE = read("lib/zoho-mail/webhook-signature.ts");
const CENTER_SERVICE = read("lib/admin-notifications/center.ts");
const OPERATIONAL_SERVICE = read("lib/admin-notifications/operational.ts");
const TARGETS = read("lib/admin-notifications/targets.ts");
const NOTIFICATIONS_VIEW = read(
  "features/admin/components/admin-notifications-page.tsx",
);
const DOC_200 = read(
  "docs/200-final-f-r3-admin-web-push-public-whatsapp-architecture-rebaseline.md",
);
const DOC_204 = read(
  "docs/204-final-f-7-zoho-inbound-email-metadata-and-admin-web-push.md",
);
const ES_MESSAGES = read("messages/es.ts");
const EN_MESSAGES = read("messages/en.ts");
const SERVICE_WORKER = read("public/sw.js");
const VERCEL = read("vercel.json");

const baseEnv = {
  TRP_ENVIRONMENT: "test",
  DATABASE_URL:
    "postgresql://user:password@localhost:5432/postgres?schema=trp_booking",
  DIRECT_URL:
    "postgresql://user:password@localhost:5432/postgres?schema=trp_booking",
  AUTH_SECRET: "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
  AUTH_TRUST_HOST: "true",
  AUTH_GOOGLE_ID: "google-client-id",
  AUTH_GOOGLE_SECRET: "google-client-secret",
  AUTH_ALLOWED_ADMIN_EMAILS: "admin@juantzun.dev",
  EXTERNAL_CALENDAR_ENCRYPTION_KEY: ZOHO_KEY,
  CLOUDINARY_CLOUD_NAME: "trp-test",
  CLOUDINARY_API_KEY: "cloudinary123",
  CLOUDINARY_API_SECRET: "cloudinary-secret",
  CLOUDINARY_UPLOAD_FOLDER: "trp-booking/dev",
  TILOPAY_ENVIRONMENT: "sandbox",
  TILOPAY_API_KEY: "tilopay-key",
  TILOPAY_API_USER: "tilopay-user",
  TILOPAY_API_PASSWORD: "tilopay-password",
  TILOPAY_REDIRECT_URL:
    "https://trp-booking.juantzun.dev/api/payments/tilopay/redirect",
  TILOPAY_SUCCESS_URL: "https://trp-booking.juantzun.dev/reservas/pago/exitoso",
  TILOPAY_CANCEL_URL: "https://trp-booking.juantzun.dev/reservas/pago/cancelado",
  TILOPAY_ERROR_URL: "https://trp-booking.juantzun.dev/reservas/pago/error",
  TILOPAY_WEBHOOK_URL:
    "https://trp-booking.juantzun.dev/api/payments/tilopay/webhook",
  EMAIL_DELIVERY_MODE: "disabled",
  EMAIL_ADMIN_LOCALE: "es",
  ZOHO_MAIL_WEBHOOK_ENCRYPTION_KEY: ZOHO_KEY,
  ZOHO_MAIL_WEBHOOK_BOOTSTRAP_TOKEN:
    "0123456789abcdef0123456789abcdef01234567",
  VERCEL_ENV: "production",
  NODE_ENV: "test",
} satisfies NodeJS.ProcessEnv;

type FakeReservation = {
  id: string;
  guestEmail: string;
  guestName: string;
  status: ReservationStatus;
  checkInDate: Date;
  checkOutDate: Date;
  property: {
    nameEs: string;
    nameEn: string;
  };
};

type FakeReservationInput = Readonly<{
  id: string;
  guestEmail?: string;
  guestName?: string;
  status?: ReservationStatus;
  checkInDate?: string;
  checkOutDate?: string;
  propertyNameEs?: string;
  propertyNameEn?: string;
}>;

type FakeReservationDateFilter = Readonly<{
  gte?: Date;
  lte?: Date;
  gt?: Date;
  lt?: Date;
}>;

type FakeReservationWhere = Readonly<{
  status?: ReservationStatus;
  guestEmail: Readonly<{ equals: string }>;
  OR?: ReadonlyArray<
    Readonly<{
      checkInDate?: FakeReservationDateFilter;
      checkOutDate?: FakeReservationDateFilter;
    }>
  >;
}>;

function createFakeReservation(input: FakeReservationInput): FakeReservation {
  return {
    id: input.id,
    guestEmail: input.guestEmail ?? "guest@example.com",
    guestName: input.guestName ?? "María López",
    status: input.status ?? ReservationStatus.CONFIRMED,
    checkInDate: new Date(`${input.checkInDate ?? "2026-09-24"}T00:00:00.000Z`),
    checkOutDate: new Date(`${input.checkOutDate ?? "2026-09-26"}T00:00:00.000Z`),
    property: {
      nameEs: input.propertyNameEs ?? "Bungalow Luna",
      nameEn: input.propertyNameEn ?? "Moon Bungalow",
    },
  };
}

function matchesDateFilter(value: Date, filter: FakeReservationDateFilter): boolean {
  const timestamp = value.getTime();

  return (
    (filter.gte === undefined || timestamp >= filter.gte.getTime()) &&
    (filter.lte === undefined || timestamp <= filter.lte.getTime()) &&
    (filter.gt === undefined || timestamp > filter.gt.getTime()) &&
    (filter.lt === undefined || timestamp < filter.lt.getTime())
  );
}

function matchesReservationWhere(
  reservation: FakeReservation,
  where: FakeReservationWhere,
): boolean {
  const emailMatches =
    reservation.guestEmail.toLowerCase() === where.guestEmail.equals.toLowerCase();
  const statusMatches = !where.status || reservation.status === where.status;
  const dateMatches =
    !where.OR ||
    where.OR.some(
      (clause) =>
        (!clause.checkInDate ||
          matchesDateFilter(reservation.checkInDate, clause.checkInDate)) &&
        (!clause.checkOutDate ||
          matchesDateFilter(reservation.checkOutDate, clause.checkOutDate)),
    );

  return emailMatches && statusMatches && dateMatches;
}

type FakeZohoEvent = {
  id: string;
  eventFingerprint: string;
  fromAddress: string;
  toAddress: string;
  subject: string;
  receivedAt: Date;
  reservationId: string | null;
};

type FakeAdminNotification = {
  id: string;
  type: AdminNotificationType;
  reservationId: string | null;
  reviewId: string | null;
  zohoInboundEmailEventId: string | null;
  deduplicationKey: string;
  title: string;
  body: string;
  targetPath: string;
};

function createLimitedRawBody(
  override: Record<string, unknown> = {},
): string {
  return JSON.stringify({
    subject: "Consulta de llegada",
    from: "Guest Example <guest@example.com>",
    to: ["Reservas <reservas@juantzun.dev>"],
    receivedAt: "2026-09-25T14:00:00.000Z",
    ...override,
  });
}

function createLimitedPayload(
  override: Record<string, unknown> = {},
): Record<string, unknown> {
  return {
    subject: "Consulta de llegada",
    from: "Guest Example <guest@example.com>",
    to: ["Reservas <reservas@juantzun.dev>"],
    receivedAt: "2026-09-25T14:00:00.000Z",
    ...override,
  };
}

function captureLimitedDataError(payload: unknown): ZohoLimitedDataError {
  try {
    parseZohoLimitedInboundEmailPayload(payload);
  } catch (error) {
    assert.ok(error instanceof ZohoLimitedDataError);

    return error;
  }

  assert.fail("Expected ZohoLimitedDataError.");
}

function routeWarningBlock(): string {
  const start = ROUTE.indexOf(
    'console.warn("[zoho-mail] webhook payload rejected"',
  );

  assert.notEqual(start, -1);

  const end = ROUTE.indexOf("      return jsonResponse", start);

  assert.notEqual(end, -1);

  return ROUTE.slice(start, end);
}

function createFakeZohoPrismaClient(
  input: Readonly<{
    reservations?: readonly FakeReservation[];
    subscriptions?: readonly { id: string; active: boolean }[];
  }> = {},
) {
  const configurations = new Map<string, { hookSecretEncrypted: string }>();
  const events = new Map<string, FakeZohoEvent>();
  const notifications = new Map<string, FakeAdminNotification>();
  const deliveries: Array<{
    notificationId: string;
    subscriptionId: string;
    status: AdminPushDeliveryStatus;
  }> = [];
  const reservations = [...(input.reservations ?? [])];
  const subscriptions = [
    ...(input.subscriptions ?? [{ id: "subscription-1", active: true }]),
  ];

  const transaction = {
    zohoInboundEmailEvent: {
      async createMany(args: { data: Omit<FakeZohoEvent, "id"> }) {
        if (events.has(args.data.eventFingerprint)) {
          return { count: 0 };
        }

        events.set(args.data.eventFingerprint, {
          id: `zoho-event-${events.size + 1}`,
          ...args.data,
        });

        return { count: 1 };
      },
      async findUnique(args: { where: { eventFingerprint: string } }) {
        const event = events.get(args.where.eventFingerprint);

        if (!event) {
          return null;
        }

        const adminNotification =
          Array.from(notifications.values()).find(
            (notification) =>
              notification.zohoInboundEmailEventId === event.id,
          ) ?? null;

        return {
          ...event,
          adminNotification: adminNotification
            ? { id: adminNotification.id }
            : null,
        };
      },
    },
    adminNotification: {
      async createMany(args: { data: Omit<FakeAdminNotification, "id"> }) {
        if (notifications.has(args.data.deduplicationKey)) {
          return { count: 0 };
        }

        notifications.set(args.data.deduplicationKey, {
          ...args.data,
          id: `notification-${notifications.size + 1}`,
        });

        return { count: 1 };
      },
      async findUnique(args: { where: { deduplicationKey: string } }) {
        return notifications.get(args.where.deduplicationKey) ?? null;
      },
    },
    adminPushSubscription: {
      async findMany() {
        return subscriptions
          .filter((subscription) => subscription.active)
          .map((subscription) => ({ id: subscription.id }));
      },
    },
    adminPushDelivery: {
      async createMany(args: {
        data: Array<{
          notificationId: string;
          subscriptionId: string;
          status: AdminPushDeliveryStatus;
        }>;
      }) {
        let count = 0;

        for (const delivery of args.data) {
          const existsDelivery = deliveries.some(
            (current) =>
              current.notificationId === delivery.notificationId &&
              current.subscriptionId === delivery.subscriptionId,
          );

          if (!existsDelivery) {
            deliveries.push(delivery);
            count += 1;
          }
        }

        return { count };
      },
    },
  };

  const prismaClient = {
    zohoMailWebhookConfiguration: {
      async findUnique(args: { where: { businessEnvironment: string } }) {
        return configurations.get(args.where.businessEnvironment) ?? null;
      },
      async createMany(args: {
        data: {
          businessEnvironment: string;
          hookSecretEncrypted: string;
        };
      }) {
        if (configurations.has(args.data.businessEnvironment)) {
          return { count: 0 };
        }

        configurations.set(args.data.businessEnvironment, {
          hookSecretEncrypted: args.data.hookSecretEncrypted,
        });

        return { count: 1 };
      },
    },
    reservation: {
      async findMany(args: {
        where: FakeReservationWhere;
        take: number;
      }) {
        return reservations
          .filter((reservation) => matchesReservationWhere(reservation, args.where))
          .sort(
            (left, right) =>
              left.checkInDate.getTime() - right.checkInDate.getTime() ||
              left.checkOutDate.getTime() - right.checkOutDate.getTime() ||
              left.id.localeCompare(right.id),
          )
          .slice(0, args.take);
      },
    },
    async $transaction<T>(
      callback: (client: typeof transaction) => Promise<T>,
    ): Promise<T> {
      return callback(transaction);
    },
  } as unknown as PrismaClient;

  return {
    configurations,
    deliveries,
    events,
    notifications,
    prismaClient,
    reservations,
  };
}

async function bootstrapFakeWebhook(
  fake: ReturnType<typeof createFakeZohoPrismaClient>,
  hookSecret = "zoho-hook-secret",
): Promise<void> {
  const rawBody = createLimitedRawBody();
  await processZohoMailWebhook({
    rawBody,
    hookSecretHeader: hookSecret,
    signatureHeader: createZohoMailWebhookSignature(rawBody, hookSecret),
    bootstrapTokenParam: baseEnv.ZOHO_MAIL_WEBHOOK_BOOTSTRAP_TOKEN,
    source: baseEnv,
    prismaClient: fake.prismaClient,
  });
}
async function processRegisteredLimitedWebhook(
  reservations: readonly FakeReservation[],
  override: Record<string, unknown> = {},
): Promise<
  Readonly<{
    fake: ReturnType<typeof createFakeZohoPrismaClient>;
    outcome: Awaited<ReturnType<typeof processZohoMailWebhook>>;
    event: FakeZohoEvent | undefined;
    notification: FakeAdminNotification | undefined;
  }>
> {
  const fake = createFakeZohoPrismaClient({ reservations });
  await bootstrapFakeWebhook(fake);
  const rawBody = createLimitedRawBody(override);
  const outcome = await processZohoMailWebhook({
    rawBody,
    signatureHeader: createZohoMailWebhookSignature(rawBody, "zoho-hook-secret"),
    source: baseEnv,
    prismaClient: fake.prismaClient,
    now: MATCH_NOW,
  });

  return {
    fake,
    outcome,
    event: Array.from(fake.events.values())[0],
    notification: Array.from(fake.notifications.values())[0],
  };
}

test("F.7 adds only bounded Zoho inbound email persistence and the sixth AdminNotification type", () => {
  const zohoSchemaBlock = SCHEMA.slice(
    SCHEMA.indexOf("model ZohoMailWebhookConfiguration"),
    SCHEMA.indexOf("model AdminNotificationRead"),
  );

  for (const expected of [
    "GUEST_EMAIL_RECEIVED",
    "model ZohoMailWebhookConfiguration",
    "businessEnvironment String   @unique",
    "hookSecretEncrypted String",
    "model ZohoInboundEmailEvent",
    "eventFingerprint String   @unique",
    "fromAddress      String",
    "toAddress        String",
    "subject          String",
    "receivedAt       DateTime",
    "zohoInboundEmailEventId",
  ]) {
    expectIncludes(SCHEMA, expected);
  }

  for (const forbidden of [
    "bodyHtml",
    "html",
    "mailBody",
    "attachmentData",
    "rawPayload",
    "fullHeaders",
    "threadId",
    "folderId",
    "GUEST_WHATSAPP_RECEIVED",
  ]) {
    expectExcludes(zohoSchemaBlock, forbidden);
  }
});

test("F.7 migration creates bounded tables and leaves historical F.6 structures intact", () => {
  assert.equal(exists(`prisma/migrations/${MIGRATION_NAME}/migration.sql`), true);

  for (const expected of [
    "ALTER TYPE \"admin_notification_type\" ADD VALUE IF NOT EXISTS 'GUEST_EMAIL_RECEIVED'",
    'CREATE TABLE "zoho_mail_webhook_configurations"',
    '"business_environment" VARCHAR(32) NOT NULL',
    '"hook_secret_encrypted" TEXT NOT NULL',
    'CREATE TABLE "zoho_inbound_email_events"',
    '"event_fingerprint" VARCHAR(80) NOT NULL',
    '"from_address" VARCHAR(320) NOT NULL',
    '"to_address" VARCHAR(1000) NOT NULL',
    '"subject" VARCHAR(500) NOT NULL',
    'ADD COLUMN "zoho_inbound_email_event_id" TEXT',
    'REFERENCES "zoho_inbound_email_events"("id") ON DELETE SET NULL',
  ]) {
    expectIncludes(MIGRATION, expected);
  }

  expectExcludes(MIGRATION, "DROP TABLE");
  expectExcludes(MIGRATION, "mail_body");
  expectExcludes(MIGRATION, "raw_payload");
});

test("F.7 documents and validates server-only Zoho webhook environment variables", () => {
  for (const expected of [
    "ZOHO_MAIL_WEBHOOK_ENCRYPTION_KEY",
    "ZOHO_MAIL_WEBHOOK_BOOTSTRAP_TOKEN",
    "Limited Data List metadata",
    "webhook?bootstrap=<temporary-token>",
    "Treat that temporary callback URL as a credential.",
    "https://trp-booking.juantzun.dev/api/integrations/zoho-mail/webhook",
    "remove ZOHO_MAIL_WEBHOOK_BOOTSTRAP_TOKEN from",
  ]) {
    expectIncludes(ENV_EXAMPLE, expected);
  }

  expectIncludes(SERVER_ENV, "getZohoMailWebhookEnv");
  assert.deepEqual(getZohoMailWebhookEnv(baseEnv), {
    trpEnvironment: "test",
    encryptionKeyBase64: ZOHO_KEY,
    bootstrapToken: baseEnv.ZOHO_MAIL_WEBHOOK_BOOTSTRAP_TOKEN,
    configured: true,
  });
  assert.equal(
    getZohoMailWebhookEnv({
      ...baseEnv,
      ZOHO_MAIL_WEBHOOK_ENCRYPTION_KEY: "",
      ZOHO_MAIL_WEBHOOK_BOOTSTRAP_TOKEN: "",
    }).configured,
    false,
  );
});

test("F.7 docs require cleaning the bootstrap URL before removing the Vercel bootstrap variable", () => {
  for (const source of [ENV_EXAMPLE, DOC_204, DOC_200]) {
    expectIncludes(
      source,
      "https://trp-booking.juantzun.dev/api/integrations/zoho-mail/webhook?bootstrap=<temporary-token>",
    );
    expectIncludes(
      source,
      "https://trp-booking.juantzun.dev/api/integrations/zoho-mail/webhook",
    );
    expectIncludes(source, "ZOHO_MAIL_WEBHOOK_BOOTSTRAP_TOKEN");
  }

  for (const expected of [
    "The temporary callback URL with ?bootstrap=... must be treated as a credential.",
    "must never be logged, persisted in the database, returned in API responses, included in Web Push/service-worker payloads, or exposed to application clients",
    "first real Zoho Mail Save attempt reached TRP but returned HTTP 401",
    "ZOHO_MAIL_SIGNATURE_MISSING",
    "initial Save/validation POST omitted",
    "`x-hook-signature` even though normal deliveries are signed",
    "If Zoho provides `x-hook-signature` during bootstrap, TRP verifies it against the exact raw body",
    "After configuration persistence, `x-hook-signature` is strictly mandatory",
    "Only after the clean URL is saved successfully should the owner remove",
    "The persisted encrypted\n`x-hook-secret` then remains authoritative for normal requests.",
    "Bootstrap query params cannot overwrite an existing persisted secret.",
    "A subsequently supplied x-hook-secret cannot overwrite the persisted encrypted secret.",
    "No secret-rotation flow exists in Final-F.7.",
  ]) {
    expectIncludes(DOC_204, expected);
  }

  expectExcludes(
    ENV_EXAMPLE,
    "Never expose them through NEXT_PUBLIC\n# variables, logs, docs, query strings",
  );
});

test("F.7 encrypts the Zoho hook secret with AES-256-GCM and environment-bound AAD", () => {
  const encrypted = encryptZohoMailWebhookSecret({
    hookSecret: "secret-value",
    businessEnvironment: "test",
    source: baseEnv,
  });

  assert.notEqual(encrypted.includes("secret-value"), true);
  assert.equal(
    decryptZohoMailWebhookSecret({
      encryptedSecret: encrypted,
      businessEnvironment: "test",
      source: baseEnv,
    }),
    "secret-value",
  );
  assert.throws(() =>
    decryptZohoMailWebhookSecret({
      encryptedSecret: encrypted,
      businessEnvironment: "production",
      source: baseEnv,
    }),
  );
  expectIncludes(SECRET_CRYPTO, "aes-256-gcm");
  expectIncludes(SECRET_CRYPTO, "setAAD");
});

test("F.7 verifies Base64 HMAC signatures against the exact raw body", () => {
  const rawBody = createLimitedRawBody();
  const signature = createZohoMailWebhookSignature(rawBody, "hook-secret");

  assert.equal(
    verifyZohoMailWebhookSignature({
      rawBody,
      hookSecret: "hook-secret",
      signatureHeader: signature,
    }),
    true,
  );
  assert.equal(
    verifyZohoMailWebhookSignature({
      rawBody: `${rawBody} `,
      hookSecret: "hook-secret",
      signatureHeader: signature,
    }),
    false,
  );
  expectIncludes(SIGNATURE, "timingSafeEqual");
});

test("F.7 webhook route uses raw text once, 16 KB cap, node runtime and signature headers", () => {
  for (const expected of [
    'dynamic = "force-dynamic"',
    'runtime = "nodejs"',
    "MAX_RAW_BODY_BYTES = 16 * 1024",
    "request.text()",
    '"x-hook-secret"',
    '"x-hook-signature"',
    "searchParams.get(\"bootstrap\")",
    "processZohoMailWebhook",
    "reason: outcome.reason",
  ]) {
    expectIncludes(ROUTE, expected);
  }

  expectExcludes(ROUTE, "request.json()");
  expectExcludes(ROUTE, "console.log");
  expectExcludes(ROUTE, "console.error");
});

test("F.7 parses Limited Data metadata and rejects full-content payloads", () => {
  const parsed = parseZohoLimitedInboundEmailPayload({
    subject: "  Hola   TRP  ",
    from: "Guest <GUEST@example.com>",
    to: ["reservas@juantzun.dev", "Admin <admin@juantzun.dev>"],
    sentTime: "2026-09-25T14:00:00.000Z",
  });

  assert.deepEqual(parsed, {
    fromAddress: "guest@example.com",
    toAddresses: ["reservas@juantzun.dev", "admin@juantzun.dev"],
    toAddress: "reservas@juantzun.dev, admin@juantzun.dev",
    subject: "Hola TRP",
    receivedAt: new Date("2026-09-25T14:00:00.000Z"),
  });

  for (const forbidden of [
    { body: "full body" },
    { mailBody: "full mail body" },
    { messageBody: "full message body" },
    { html: "<p>full</p>" },
    { content: "full content" },
    { summary: "provider summary" },
    { attachments: [] },
    { fullHeaders: "raw headers" },
    { folderId: "folder-1" },
    { rawPayload: "raw payload" },
    { threadId: "thread-1" },
    { cc: "copy@example.com" },
    { bcc: "blind@example.com" },
  ]) {
    assert.throws(
      () =>
        parseZohoLimitedInboundEmailPayload({
          subject: "Hi",
          from: "guest@example.com",
          to: "reservas@juantzun.dev",
          receivedAt: "2026-09-25T14:00:00.000Z",
          ...forbidden,
        }),
      ZohoLimitedDataError,
    );
  }

  expectIncludes(LIMITED_DATA, "ZOHO_MAIL_FULL_CONTENT_PAYLOAD");
});

test("F.7 accepts but ignores provider messageId metadata", () => {
  const variants: ReadonlyArray<Record<string, unknown>> = [
    { messageId: "provider-message-secret" },
    { message_id: "provider-message-secret" },
    { "message-id": "provider-message-secret" },
  ];

  for (const variant of variants) {
    const parsed = parseZohoLimitedInboundEmailPayload(
      createLimitedPayload(variant),
    );
    const serialized = JSON.stringify(parsed);

    assert.deepEqual(parsed, {
      fromAddress: "guest@example.com",
      toAddresses: ["reservas@juantzun.dev"],
      toAddress: "reservas@juantzun.dev",
      subject: "Consulta de llegada",
      receivedAt: new Date("2026-09-25T14:00:00.000Z"),
    });
    assert.equal(serialized.includes("provider-message-secret"), false);
    assert.equal("messageId" in parsed, false);
  }

  expectExcludes(LIMITED_DATA, 'marker: "messageid"');
  expectExcludes(LIMITED_DATA, 'category: "message_id"');
});
test("F.7 classifies forbidden Limited Data keys into safe structural categories", () => {
  const cases: ReadonlyArray<
    readonly [Record<string, unknown>, string, readonly string[]]
  > = [
    [{ attachments: ["secret-file"] }, "attachment", ["attachments", "secret-file"]],
    [{ body: "secret body" }, "body", ["secret body"]],
    [{ content: "secret content" }, "content", ["secret content"]],
    [{ fullHeaders: "secret headers" }, "headers", ["fullHeaders", "secret headers"]],
    [{ html: "<p>secret</p>" }, "html", ["<p>secret</p>"]],
    [{ folderId: "folder-secret" }, "folder", ["folderId", "folder-secret"]],
    [{ rawPayload: "raw-secret" }, "raw", ["rawPayload", "raw-secret"]],
    [{ summary: "summary-secret" }, "summary", ["summary-secret"]],
    [{ threadId: "thread-secret" }, "thread", ["threadId", "thread-secret"]],
    [{ cc: "copy@example.com" }, "cc", ["copy@example.com"]],
    [{ bcc: "blind@example.com" }, "bcc", ["blind@example.com"]],
  ];

  for (const [override, fieldCategory, forbiddenFragments] of cases) {
    const error = captureLimitedDataError(createLimitedPayload(override));
    const diagnostic = JSON.stringify({
      code: error.code,
      fieldCategory: error.fieldCategory,
    });

    assert.equal(error.code, "ZOHO_MAIL_FULL_CONTENT_PAYLOAD");
    assert.equal(error.fieldCategory, fieldCategory);
    assert.equal(error.message, "ZOHO_MAIL_FULL_CONTENT_PAYLOAD");

    for (const fragment of forbiddenFragments) {
      assert.equal(diagnostic.includes(fragment), false);
      assert.equal(error.message.includes(fragment), false);
    }
  }
});

test("F.7 catches nested forbidden Limited Data keys without emitting raw names or values", () => {
  const payload = createLimitedPayload({
    envelope: {
      providerControlledBodyBlob: "nested body value",
      original: {
        from: "Nested Sender <nested@example.com>",
      },
    },
  });
  const error = captureLimitedDataError(payload);
  const diagnostic = JSON.stringify({
    code: error.code,
    fieldCategory: error.fieldCategory,
  });

  assert.equal(error.code, "ZOHO_MAIL_FULL_CONTENT_PAYLOAD");
  assert.equal(error.fieldCategory, "body");

  for (const forbidden of [
    "providerControlledBodyBlob",
    "nested body value",
    "nested@example.com",
    "Guest Example",
    "guest@example.com",
    "Consulta de llegada",
    JSON.stringify(payload),
  ]) {
    assert.equal(diagnostic.includes(forbidden), false);
  }
});

test("F.7 registered full-content webhooks remain rejected with HTTP 422 and safe diagnostics only", async () => {
  const fake = createFakeZohoPrismaClient();
  await bootstrapFakeWebhook(fake);
  const rawBody = createLimitedRawBody({
    subject: "Sensitive Subject",
    from: "Sensitive Sender <sensitive@example.com>",
    to: "Private Recipient <private@juantzun.dev>",
    body: "Sensitive body that must not be logged",
  });
  const signatureHeader = createZohoMailWebhookSignature(
    rawBody,
    "zoho-hook-secret",
  );

  await assert.rejects(
    () =>
      processZohoMailWebhook({
        rawBody,
        signatureHeader,
        source: baseEnv,
        prismaClient: fake.prismaClient,
      }),
    (error: unknown) => {
      assert.ok(error instanceof ZohoMailWebhookError);
      assert.equal(error.status, 422);
      assert.equal(error.code, "ZOHO_MAIL_FULL_CONTENT_PAYLOAD");
      assert.equal(error.fieldCategory, "body");
      const diagnostic = JSON.stringify({
        code: error.code,
        fieldCategory: error.fieldCategory,
      });

      for (const forbidden of [
        rawBody,
        "Sensitive Subject",
        "Sensitive Sender",
        "sensitive@example.com",
        "private@juantzun.dev",
        "Sensitive body that must not be logged",
        "zoho-hook-secret",
        signatureHeader,
        baseEnv.ZOHO_MAIL_WEBHOOK_BOOTSTRAP_TOKEN,
      ]) {
        assert.equal(diagnostic.includes(forbidden), false);
      }

      return true;
    },
  );
  assert.equal(fake.events.size, 0);
  assert.equal(fake.notifications.size, 0);
  assert.equal(fake.deliveries.length, 0);
  expectIncludes(ROUTE, "error.status");
});

test("F.7 route warning contains only code and safe forbidden-field category", () => {
  const warningBlock = routeWarningBlock();

  expectIncludes(ROUTE, "console.warn");
  expectIncludes(warningBlock, "[zoho-mail] webhook payload rejected");
  expectIncludes(warningBlock, "code: error.code");
  expectIncludes(warningBlock, "fieldCategory: error.fieldCategory");

  for (const forbidden of [
    "rawBody",
    "request.headers",
    "hookSecret",
    "signatureHeader",
    "bootstrapTokenParam",
    "subject",
    "fromAddress",
    "toAddress",
    "body",
    "html",
    "content",
    "attachments",
    "messageId",
  ]) {
    expectExcludes(warningBlock, forbidden);
  }
});
test("F.7 resolves accepted recipients by exact correspondence domain and ignores internal senders", () => {
  assert.deepEqual(getAcceptedZohoMailRecipientAddresses("test"), [
    "admin@juantzun.dev",
    "reservas@juantzun.dev",
    "reservations@juantzun.dev",
  ]);
  assert.deepEqual(getAcceptedZohoMailRecipientAddresses("production"), [
    "admin@turefugioperfecto.com",
    "reservas@turefugioperfecto.com",
    "reservations@turefugioperfecto.com",
  ]);
  assert.equal(getAcceptedZohoMailRecipientDomain("test"), "juantzun.dev");
  assert.equal(
    getAcceptedZohoMailRecipientDomain("production"),
    "turefugioperfecto.com",
  );

  for (const toAddresses of [
    ["reservas@juantzun.dev"],
    ["admin@juantzun.dev"],
    ["mailbox@juantzun.dev"],
    ["MAILBOX@JUANTZUN.DEV"],
    ["owner@example.com", "reservations@juantzun.dev"],
  ]) {
    assert.equal(
      isAcceptedZohoMailRecipient({
        toAddresses,
        trpEnvironment: "test",
      }),
      true,
    );
  }

  for (const toAddresses of [
    ["user@eviljuantzun.dev"],
    ["user@juantzun.dev.attacker.example"],
    ["user@example.com"],
  ]) {
    assert.equal(
      isAcceptedZohoMailRecipient({
        toAddresses,
        trpEnvironment: "test",
      }),
      false,
    );
  }

  assert.equal(
    isInternalZohoMailSender({
      fromAddress: "admin@juantzun.dev",
      trpEnvironment: "test",
    }),
    true,
  );
  assert.equal(
    isInternalZohoMailSender({
      fromAddress: "guest@example.com",
      trpEnvironment: "test",
    }),
    false,
  );
});

test("F.7 first bootstrap can persist encrypted hook secret without x-hook-signature", async () => {
  const fake = createFakeZohoPrismaClient();
  const rawBody = createLimitedRawBody();
  const outcome = await processZohoMailWebhook({
    rawBody,
    hookSecretHeader: "zoho-hook-secret",
    signatureHeader: null,
    bootstrapTokenParam: baseEnv.ZOHO_MAIL_WEBHOOK_BOOTSTRAP_TOKEN,
    source: baseEnv,
    prismaClient: fake.prismaClient,
  });
  const encryptedSecret = Array.from(fake.configurations.values())[0]
    ?.hookSecretEncrypted;

  assert.deepEqual(outcome, { status: "bootstrapped" });
  assert.equal(fake.configurations.size, 1);
  assert.equal(fake.events.size, 0);
  assert.equal(fake.notifications.size, 0);
  assert.equal(
    decryptZohoMailWebhookSecret({
      encryptedSecret: encryptedSecret ?? "",
      businessEnvironment: "test",
      source: baseEnv,
    }),
    "zoho-hook-secret",
  );
});

test("F.7 first bootstrap with a valid signature persists only encrypted hook secret", async () => {
  const fake = createFakeZohoPrismaClient();
  const rawBody = createLimitedRawBody();
  const outcome = await processZohoMailWebhook({
    rawBody,
    hookSecretHeader: "zoho-hook-secret",
    signatureHeader: createZohoMailWebhookSignature(rawBody, "zoho-hook-secret"),
    bootstrapTokenParam: baseEnv.ZOHO_MAIL_WEBHOOK_BOOTSTRAP_TOKEN,
    source: baseEnv,
    prismaClient: fake.prismaClient,
  });

  assert.deepEqual(outcome, { status: "bootstrapped" });
  assert.equal(fake.configurations.size, 1);
  assert.equal(fake.events.size, 0);
  assert.equal(fake.notifications.size, 0);
  const encryptedSecret = Array.from(fake.configurations.values())[0]
    ?.hookSecretEncrypted;

  assert.equal(encryptedSecret?.includes("zoho-hook-secret"), false);
  assert.equal(
    encryptedSecret?.includes(baseEnv.ZOHO_MAIL_WEBHOOK_BOOTSTRAP_TOKEN),
    false,
  );
  assert.equal(
    decryptZohoMailWebhookSecret({
      encryptedSecret: encryptedSecret ?? "",
      businessEnvironment: "test",
      source: baseEnv,
    }),
    "zoho-hook-secret",
  );
});

test("F.7 rejects invalid bootstrap credentials or signature without persisting configuration", async () => {
  const fake = createFakeZohoPrismaClient();
  const rawBody = createLimitedRawBody();

  await assert.rejects(
    () =>
      processZohoMailWebhook({
        rawBody,
        hookSecretHeader: "zoho-hook-secret",
        signatureHeader: createZohoMailWebhookSignature(
          rawBody,
          "zoho-hook-secret",
        ),
        bootstrapTokenParam: "wrong-token",
        source: baseEnv,
        prismaClient: fake.prismaClient,
      }),
    (error: unknown) =>
      error instanceof ZohoMailWebhookError &&
      error.code === "ZOHO_MAIL_BOOTSTRAP_INVALID",
  );
  assert.equal(fake.configurations.size, 0);

  await assert.rejects(
    () =>
      processZohoMailWebhook({
        rawBody,
        hookSecretHeader: "zoho-hook-secret",
        signatureHeader: null,
        bootstrapTokenParam: null,
        source: baseEnv,
        prismaClient: fake.prismaClient,
      }),
    (error: unknown) =>
      error instanceof ZohoMailWebhookError &&
      error.code === "ZOHO_MAIL_BOOTSTRAP_INVALID",
  );
  assert.equal(fake.configurations.size, 0);

  await assert.rejects(
    () =>
      processZohoMailWebhook({
        rawBody,
        hookSecretHeader: "",
        signatureHeader: null,
        bootstrapTokenParam: baseEnv.ZOHO_MAIL_WEBHOOK_BOOTSTRAP_TOKEN,
        source: baseEnv,
        prismaClient: fake.prismaClient,
      }),
    (error: unknown) =>
      error instanceof ZohoMailWebhookError &&
      error.code === "ZOHO_MAIL_BOOTSTRAP_INVALID",
  );
  assert.equal(fake.configurations.size, 0);

  await assert.rejects(
    () =>
      processZohoMailWebhook({
        rawBody,
        hookSecretHeader: "zoho-hook-secret",
        signatureHeader: createZohoMailWebhookSignature(rawBody, "wrong-secret"),
        bootstrapTokenParam: baseEnv.ZOHO_MAIL_WEBHOOK_BOOTSTRAP_TOKEN,
        source: baseEnv,
        prismaClient: fake.prismaClient,
      }),
    (error: unknown) =>
      error instanceof ZohoMailWebhookError &&
      error.code === "ZOHO_MAIL_SIGNATURE_INVALID",
  );
  assert.equal(fake.configurations.size, 0);

  await bootstrapFakeWebhook(fake);
  await assert.rejects(
    () =>
      processZohoMailWebhook({
        rawBody,
        signatureHeader: null,
        source: baseEnv,
        prismaClient: fake.prismaClient,
      }),
    (error: unknown) =>
      error instanceof ZohoMailWebhookError &&
      error.code === "ZOHO_MAIL_SIGNATURE_MISSING",
  );
  await assert.rejects(
    () =>
      processZohoMailWebhook({
        rawBody,
        signatureHeader: createZohoMailWebhookSignature(rawBody, "wrong-secret"),
        source: baseEnv,
        prismaClient: fake.prismaClient,
      }),
    (error: unknown) =>
      error instanceof ZohoMailWebhookError &&
      error.code === "ZOHO_MAIL_SIGNATURE_INVALID",
  );
});

test("F.7 existing configuration ignores later bootstrap tokens and x-hook-secret overwrite attempts", async () => {
  const fake = createFakeZohoPrismaClient();
  await bootstrapFakeWebhook(fake, "original-hook-secret");
  const originalEncryptedSecret = Array.from(fake.configurations.values())[0]
    ?.hookSecretEncrypted;
  const rawBody = createLimitedRawBody({ subject: "Second delivery" });

  await assert.rejects(
    () =>
      processZohoMailWebhook({
        rawBody,
        hookSecretHeader: "replacement-hook-secret",
        signatureHeader: createZohoMailWebhookSignature(
          rawBody,
          "replacement-hook-secret",
        ),
        bootstrapTokenParam: baseEnv.ZOHO_MAIL_WEBHOOK_BOOTSTRAP_TOKEN,
        source: baseEnv,
        prismaClient: fake.prismaClient,
      }),
    (error: unknown) =>
      error instanceof ZohoMailWebhookError &&
      error.code === "ZOHO_MAIL_SIGNATURE_INVALID",
  );

  assert.equal(fake.configurations.size, 1);
  assert.equal(
    Array.from(fake.configurations.values())[0]?.hookSecretEncrypted,
    originalEncryptedSecret,
  );
  assert.equal(
    decryptZohoMailWebhookSecret({
      encryptedSecret: originalEncryptedSecret ?? "",
      businessEnvironment: "test",
      source: baseEnv,
    }),
    "original-hook-secret",
  );

  const outcome = await processZohoMailWebhook({
    rawBody,
    hookSecretHeader: "replacement-hook-secret",
    signatureHeader: createZohoMailWebhookSignature(
      rawBody,
      "original-hook-secret",
    ),
    bootstrapTokenParam: baseEnv.ZOHO_MAIL_WEBHOOK_BOOTSTRAP_TOKEN,
    source: baseEnv,
    prismaClient: fake.prismaClient,
    now: MATCH_NOW,
  });

  assert.equal(outcome.status, "processed");
  assert.equal(fake.configurations.size, 1);
  assert.equal(
    Array.from(fake.configurations.values())[0]?.hookSecretEncrypted,
    originalEncryptedSecret,
  );
});

test("F.7 processes registered webhooks after the bootstrap token is removed from env", async () => {
  const fake = createFakeZohoPrismaClient();
  await bootstrapFakeWebhook(fake);
  const registeredOnlyEnv: NodeJS.ProcessEnv = { ...baseEnv };
  delete registeredOnlyEnv.ZOHO_MAIL_WEBHOOK_BOOTSTRAP_TOKEN;
  const rawBody = createLimitedRawBody({ subject: "Post bootstrap" });

  assert.deepEqual(getZohoMailWebhookEnv(registeredOnlyEnv), {
    trpEnvironment: "test",
    encryptionKeyBase64: ZOHO_KEY,
    bootstrapToken: null,
    configured: true,
  });

  const outcome = await processZohoMailWebhook({
    rawBody,
    signatureHeader: createZohoMailWebhookSignature(rawBody, "zoho-hook-secret"),
    source: registeredOnlyEnv,
    prismaClient: fake.prismaClient,
  });

  assert.equal(outcome.status, "processed");
  assert.equal(fake.events.size, 1);
  assert.equal(fake.notifications.size, 1);
});

test("F.7 creates one matched event, AdminNotification and immediate delivery for provider-normalized mailbox recipients", async () => {
  const fake = createFakeZohoPrismaClient({
    reservations: [
      createFakeReservation({
        id: "reservation-1",
        guestEmail: "GUEST@example.com",
      }),
    ],
  });
  const delivered: string[][] = [];
  await bootstrapFakeWebhook(fake);

  const rawBody = createLimitedRawBody({
    to: "Provider Mailbox <mailbox@juantzun.dev>",
  });
  const outcome = await processZohoMailWebhook({
    rawBody,
    signatureHeader: createZohoMailWebhookSignature(rawBody, "zoho-hook-secret"),
    source: baseEnv,
    prismaClient: fake.prismaClient,
    now: MATCH_NOW,
    deliverAdminPush: async (notificationIds) => {
      delivered.push([...notificationIds]);
      return {
        deliveryMode: "enabled",
        requested: notificationIds.length,
        remindersCreated: 0,
        recovered: 0,
        claimed: 0,
        sent: 0,
        failed: 0,
        retryScheduled: 0,
        skipped: 0,
      };
    },
  });
  const notification = Array.from(fake.notifications.values())[0];

  assert.equal(outcome.status, "processed");
  assert.equal(fake.events.size, 1);
  assert.equal(fake.notifications.size, 1);
  assert.equal(fake.deliveries.length, 1);
  assert.deepEqual(delivered, [["notification-1"]]);
  assert.equal(notification?.type, AdminNotificationType.GUEST_EMAIL_RECEIVED);
  assert.equal(notification?.reservationId, "reservation-1");
  assert.equal(notification?.targetPath, "/admin/reservations/reservation-1");
  assert.equal(notification?.title, "Nuevo correo de huésped · María López · Bungalow Luna");
  assert.equal(notification?.body, "Toca para revisar la correspondencia.");
  assert.equal(notification?.title.includes("guest@example.com"), false);
  assert.equal(
    Array.from(fake.events.values())[0]?.toAddress,
    "mailbox@juantzun.dev",
  );
});


test("F.7 processes provider messageId without persisting or exposing it", async () => {
  const providerMessageId = "provider-message-id-that-must-not-persist";
  const fake = createFakeZohoPrismaClient({
    reservations: [
      createFakeReservation({
        id: "reservation-1",
        guestEmail: "GUEST@example.com",
      }),
    ],
  });
  const delivered: string[][] = [];
  await bootstrapFakeWebhook(fake);
  const rawBody = createLimitedRawBody({
    messageId: providerMessageId,
    to: "Provider Mailbox <mailbox@juantzun.dev>",
  });
  const outcome = await processZohoMailWebhook({
    rawBody,
    signatureHeader: createZohoMailWebhookSignature(rawBody, "zoho-hook-secret"),
    source: baseEnv,
    prismaClient: fake.prismaClient,
    now: MATCH_NOW,
    deliverAdminPush: async (notificationIds) => {
      delivered.push([...notificationIds]);
      return {
        deliveryMode: "enabled",
        requested: notificationIds.length,
        remindersCreated: 0,
        recovered: 0,
        claimed: 0,
        sent: 0,
        failed: 0,
        retryScheduled: 0,
        skipped: 0,
      };
    },
  });
  const event = Array.from(fake.events.values())[0];
  const notification = Array.from(fake.notifications.values())[0];
  const persistedState = JSON.stringify({
    events: Array.from(fake.events.values()),
    notifications: Array.from(fake.notifications.values()),
    deliveries: fake.deliveries,
  });

  assert.equal(outcome.status, "processed");
  assert.deepEqual(delivered, [["notification-1"]]);
  assert.equal(fake.events.size, 1);
  assert.equal(fake.notifications.size, 1);
  assert.equal(fake.deliveries.length, 1);
  assert.deepEqual(Object.keys(event ?? {}).sort(), [
    "eventFingerprint",
    "fromAddress",
    "id",
    "receivedAt",
    "reservationId",
    "subject",
    "toAddress",
  ].sort());
  assert.equal(event?.fromAddress, "guest@example.com");
  assert.equal(event?.toAddress, "mailbox@juantzun.dev");
  assert.equal(event?.subject, "Consulta de llegada");
  assert.equal(event?.reservationId, "reservation-1");
  assert.equal(notification?.type, AdminNotificationType.GUEST_EMAIL_RECEIVED);
  assert.equal(notification?.reservationId, "reservation-1");
  assert.equal(notification?.title.includes(providerMessageId), false);
  assert.equal(notification?.body.includes(providerMessageId), false);
  assert.equal(notification?.deduplicationKey.includes(providerMessageId), false);
  assert.equal(notification?.deduplicationKey.startsWith("zoho-mail-inbound/"), true);
  assert.equal(persistedState.includes(providerMessageId), false);
  assert.equal(persistedState.includes("messageId"), false);
  expectExcludes(ROUTE, "messageId");
  expectIncludes(INBOUND_SERVICE, "fingerprintZohoMailLimitedDataRawBody(input.rawBody)");
  expectExcludes(INBOUND_SERVICE, "messageId");
  expectExcludes(CENTER_SERVICE, "messageId");
  expectExcludes(OPERATIONAL_SERVICE, "messageId");
  expectExcludes(SERVICE_WORKER, "messageId");
});

test("F.7 duplicate webhook reuses the same event and notification without duplicate deliveries", async () => {
  const fake = createFakeZohoPrismaClient();
  await bootstrapFakeWebhook(fake);
  const rawBody = createLimitedRawBody();
  const signatureHeader = createZohoMailWebhookSignature(
    rawBody,
    "zoho-hook-secret",
  );

  const first = await processZohoMailWebhook({
    rawBody,
    signatureHeader,
    source: baseEnv,
    prismaClient: fake.prismaClient,
    now: MATCH_NOW,
  });
  fake.reservations.push(
    createFakeReservation({
      id: "reservation-after-first-delivery",
      propertyNameEs: "Bungalow Sol",
      propertyNameEn: "Sun Bungalow",
    }),
  );
  const second = await processZohoMailWebhook({
    rawBody,
    signatureHeader,
    source: baseEnv,
    prismaClient: fake.prismaClient,
  });

  assert.equal(first.status, "processed");
  assert.equal(second.status, "duplicate");
  assert.equal(fake.events.size, 1);
  assert.equal(fake.notifications.size, 1);
  assert.equal(fake.deliveries.length, 1);
  assert.equal(Array.from(fake.events.values())[0]?.reservationId, null);
  assert.equal(Array.from(fake.notifications.values())[0]?.reservationId, null);
});

test("F.7 ignores unsafe recipients and internal senders without creating notifications or deliveries", async () => {
  const ignoredRecipient = createFakeZohoPrismaClient();
  await bootstrapFakeWebhook(ignoredRecipient);
  const ignoredRawBody = createLimitedRawBody({
    to: "someone@example.com",
  });
  assert.deepEqual(
    await processZohoMailWebhook({
      rawBody: ignoredRawBody,
      signatureHeader: createZohoMailWebhookSignature(
        ignoredRawBody,
        "zoho-hook-secret",
      ),
      source: baseEnv,
      prismaClient: ignoredRecipient.prismaClient,
    }),
    {
      status: "ignored",
      reason: "recipient_outside_correspondence_domain",
    },
  );
  assert.equal(ignoredRecipient.events.size, 0);
  assert.equal(ignoredRecipient.notifications.size, 0);
  assert.equal(ignoredRecipient.deliveries.length, 0);

  const internalSender = createFakeZohoPrismaClient();
  await bootstrapFakeWebhook(internalSender);
  const internalRawBody = createLimitedRawBody({
    from: "admin@juantzun.dev",
  });
  assert.deepEqual(
    await processZohoMailWebhook({
      rawBody: internalRawBody,
      signatureHeader: createZohoMailWebhookSignature(
        internalRawBody,
        "zoho-hook-secret",
      ),
      source: baseEnv,
      prismaClient: internalSender.prismaClient,
    }),
    { status: "ignored", reason: "internal_sender" },
  );
  assert.equal(internalSender.events.size, 0);
  assert.equal(internalSender.notifications.size, 0);
  assert.equal(internalSender.deliveries.length, 0);
});

test("F.7 ranks exact confirmed reservation matches by current, upcoming and recent relevance", async () => {
  const current = await processRegisteredLimitedWebhook([
    createFakeReservation({
      id: "future-reservation",
      checkInDate: "2026-10-02",
      checkOutDate: "2026-10-05",
      propertyNameEs: "Bungalow Futuro",
      propertyNameEn: "Future Bungalow",
    }),
    createFakeReservation({
      id: "current-reservation",
      guestEmail: "GUEST@example.com",
      guestName: "Ana Current",
      checkInDate: "2026-09-24",
      checkOutDate: "2026-09-25",
      propertyNameEs: "Bungalow Actual",
      propertyNameEn: "Current Bungalow",
    }),
    createFakeReservation({
      id: "recent-reservation",
      checkInDate: "2026-09-12",
      checkOutDate: "2026-09-20",
      propertyNameEs: "Bungalow Reciente",
      propertyNameEn: "Recent Bungalow",
    }),
    createFakeReservation({
      id: "pending-current-reservation",
      status: ReservationStatus.PENDING_PAYMENT,
      checkInDate: "2026-09-24",
      checkOutDate: "2026-09-25",
    }),
    createFakeReservation({
      id: "different-email-reservation",
      guestEmail: "guest+alias@example.com",
      checkInDate: "2026-09-24",
      checkOutDate: "2026-09-25",
    }),
  ]);

  assert.equal(current.outcome.status, "processed");
  assert.equal(current.event?.reservationId, "current-reservation");
  assert.equal(
    current.notification?.title,
    "Nuevo correo de huésped · Ana Current · Bungalow Actual",
  );

  const upcoming = await processRegisteredLimitedWebhook([
    createFakeReservation({
      id: "later-upcoming-reservation",
      checkInDate: "2026-10-02",
      checkOutDate: "2026-10-05",
    }),
    createFakeReservation({
      id: "earliest-upcoming-reservation",
      guestName: "Ana Upcoming",
      checkInDate: "2026-09-28",
      checkOutDate: "2026-10-01",
      propertyNameEs: "Bungalow Próximo",
      propertyNameEn: "Upcoming Bungalow",
    }),
    createFakeReservation({
      id: "recent-when-upcoming-exists",
      checkInDate: "2026-09-10",
      checkOutDate: "2026-09-20",
    }),
  ]);

  assert.equal(upcoming.outcome.status, "processed");
  assert.equal(upcoming.event?.reservationId, "earliest-upcoming-reservation");
  assert.equal(
    upcoming.notification?.title,
    "Nuevo correo de huésped · Ana Upcoming · Bungalow Próximo",
  );

  const recent = await processRegisteredLimitedWebhook([
    createFakeReservation({
      id: "older-recent-reservation",
      checkInDate: "2026-09-01",
      checkOutDate: "2026-09-20",
    }),
    createFakeReservation({
      id: "latest-recent-reservation",
      guestName: "Ana Recent",
      checkInDate: "2026-09-15",
      checkOutDate: "2026-09-23",
      propertyNameEs: "Bungalow Reciente",
      propertyNameEn: "Recent Bungalow",
    }),
    createFakeReservation({
      id: "too-old-reservation",
      checkInDate: "2026-08-01",
      checkOutDate: "2026-08-20",
    }),
  ]);

  assert.equal(recent.outcome.status, "processed");
  assert.equal(recent.event?.reservationId, "latest-recent-reservation");
  assert.equal(
    recent.notification?.title,
    "Nuevo correo de huésped · Ana Recent · Bungalow Reciente",
  );
});

test("F.7 treats tied reservation relevance candidates as ambiguous", async () => {
  for (const reservations of [
    [
      createFakeReservation({ id: "current-a" }),
      createFakeReservation({ id: "current-b" }),
    ],
    [
      createFakeReservation({
        id: "upcoming-a",
        checkInDate: "2026-09-29",
        checkOutDate: "2026-10-01",
      }),
      createFakeReservation({
        id: "upcoming-b",
        checkInDate: "2026-09-29",
        checkOutDate: "2026-10-03",
      }),
    ],
    [
      createFakeReservation({
        id: "recent-a",
        checkInDate: "2026-09-10",
        checkOutDate: "2026-09-22",
      }),
      createFakeReservation({
        id: "recent-b",
        checkInDate: "2026-09-12",
        checkOutDate: "2026-09-22",
      }),
    ],
  ]) {
    const result = await processRegisteredLimitedWebhook(reservations);

    assert.equal(result.outcome.status, "processed");
    assert.equal(result.event?.reservationId, null);
    assert.equal(result.notification?.reservationId, null);
    assert.equal(result.notification?.targetPath, "/admin/notifications");
  }
});

test("F.7 never auto-links non-confirmed statuses or non-exact email candidates", async () => {
  const result = await processRegisteredLimitedWebhook([
    createFakeReservation({
      id: "pending-payment",
      status: ReservationStatus.PENDING_PAYMENT,
    }),
    createFakeReservation({
      id: "cancelled",
      status: ReservationStatus.CANCELLED,
    }),
    createFakeReservation({
      id: "expired",
      status: ReservationStatus.EXPIRED,
    }),
    createFakeReservation({
      id: "blocked",
      status: ReservationStatus.BLOCKED,
    }),
    createFakeReservation({
      id: "refunded",
      status: ReservationStatus.REFUNDED,
    }),
    createFakeReservation({
      id: "partially-refunded",
      status: ReservationStatus.PARTIALLY_REFUNDED,
    }),
    createFakeReservation({
      id: "confirmed-different-email",
      guestEmail: "other@example.com",
    }),
  ]);

  assert.equal(result.outcome.status, "processed");
  assert.equal(result.event?.reservationId, null);
  assert.equal(result.notification?.reservationId, null);
  assert.equal(result.notification?.targetPath, "/admin/notifications");
});
test("F.7 processes ambiguous reservation matches without linking but keeps notification center target", async () => {
  const ambiguous = createFakeZohoPrismaClient({
    reservations: [
      createFakeReservation({
        id: "reservation-a",
        propertyNameEs: "Uno",
        propertyNameEn: "One",
      }),
      createFakeReservation({
        id: "reservation-b",
        propertyNameEs: "Dos",
        propertyNameEn: "Two",
      }),
    ],
  });
  await bootstrapFakeWebhook(ambiguous);
  const rawBody = createLimitedRawBody({
    to: "Provider Mailbox <mailbox@juantzun.dev>",
  });
  const outcome = await processZohoMailWebhook({
    rawBody,
    signatureHeader: createZohoMailWebhookSignature(rawBody, "zoho-hook-secret"),
    source: baseEnv,
    prismaClient: ambiguous.prismaClient,
  });

  assert.equal(outcome.status, "processed");
  assert.equal(Array.from(ambiguous.events.values())[0]?.reservationId, null);
  assert.equal(
    Array.from(ambiguous.notifications.values())[0]?.targetPath,
    "/admin/notifications",
  );
});

test("F.7 keeps bootstrap tokens out of persisted records, notification center data, push payloads and API responses", async () => {
  const sensitiveBootstrapToken =
    "bootstrap-sensitive-token-that-must-not-persist";
  const source: NodeJS.ProcessEnv = {
    ...baseEnv,
    ZOHO_MAIL_WEBHOOK_BOOTSTRAP_TOKEN: sensitiveBootstrapToken,
  };
  const fake = createFakeZohoPrismaClient();
  const bootstrapRawBody = createLimitedRawBody({ subject: "Bootstrap" });

  await processZohoMailWebhook({
    rawBody: bootstrapRawBody,
    hookSecretHeader: "zoho-hook-secret",
    signatureHeader: createZohoMailWebhookSignature(
      bootstrapRawBody,
      "zoho-hook-secret",
    ),
    bootstrapTokenParam: sensitiveBootstrapToken,
    source,
    prismaClient: fake.prismaClient,
  });

  const deliveryRawBody = createLimitedRawBody({ subject: "Safe event" });
  await processZohoMailWebhook({
    rawBody: deliveryRawBody,
    signatureHeader: createZohoMailWebhookSignature(
      deliveryRawBody,
      "zoho-hook-secret",
    ),
    source,
    prismaClient: fake.prismaClient,
  });

  const persistedState = JSON.stringify({
    configurations: Array.from(fake.configurations.values()),
    events: Array.from(fake.events.values()),
    notifications: Array.from(fake.notifications.values()),
    deliveries: fake.deliveries,
  });

  assert.equal(persistedState.includes(sensitiveBootstrapToken), false);
  expectExcludes(CENTER_SERVICE, "bootstrapToken");
  expectExcludes(SERVICE_WORKER, "bootstrap");
  expectIncludes(ROUTE, "reason: outcome.reason");
  expectIncludes(
    ROUTE,
    "jsonResponse({ ok: true, status: outcome.status }, 200)",
  );
  expectIncludes(ROUTE, "error: { code: error.code }");
  expectExcludes(ROUTE, "fromAddress");
  expectExcludes(ROUTE, "toAddress");
  expectExcludes(ROUTE, "subject");
  expectExcludes(ROUTE, "ZOHO_MAIL_WEBHOOK_BOOTSTRAP_TOKEN");
});

test("F.7 notification center exposes bounded authenticated email metadata only", () => {
  for (const expected of [
    "zohoEmail",
    "fromAddress",
    "toAddress",
    "subject",
    "receivedAt",
    "reservationMatched",
    "zohoInboundEmailEvent",
  ]) {
    expectIncludes(CENTER_SERVICE, expected);
  }

  for (const forbidden of [
    "hookSecret",
    "eventFingerprint",
    "signature",
    "rawBody",
    "html",
    "attachments",
    "messageId",
  ]) {
    expectExcludes(CENTER_SERVICE, forbidden);
  }
});

test("F.7 Admin notification UI opens Zoho Mail with Android intent and bounded sender copy", () => {
  const androidUserAgent =
    "Mozilla/5.0 (Linux; Android 15; Pixel) AppleWebKit/537.36 Chrome/140.0 Mobile Safari/537.36";
  const desktopUserAgent =
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/140.0 Safari/537.36";
  const androidIntent = resolveZohoMailOpenUrlForUserAgent(androidUserAgent);
  const directIntent = buildZohoMailAndroidIntentUrl("https://mail.zoho.com/");

  assert.equal(androidIntent, directIntent);
  assert.equal(
    resolveZohoMailOpenUrlForUserAgent(desktopUserAgent),
    "https://mail.zoho.com/",
  );
  assert.equal(androidIntent.includes("package=com.zoho.mail"), true);
  assert.equal(
    androidIntent.includes(
      "S.browser_fallback_url=https%3A%2F%2Fmail.zoho.com%2F",
    ),
    true,
  );

  for (const expected of [
    "siteConfig.correspondence.zohoMailWebUrl",
    "resolveZohoMailOpenUrlForUserAgent(navigator.userAgent)",
    "openZohoMailForNotification",
    "navigator.clipboard.writeText(notification.zohoEmail.fromAddress)",
    "copy.actions.openZohoMail",
    "copy.history.zohoEmail",
    "copy.errors.ADMIN_NOTIFICATION_ZOHO_COPY_FAILED",
  ]) {
    expectIncludes(NOTIFICATIONS_VIEW, expected);
  }

  for (const forbidden of [
    "mail.zoho.com/mail/",
    "zohomail://",
    "notification.zohoEmail.subject)",
    "notification.zohoEmail.toAddress)",
    "notification.zohoEmail.receivedAt)",
    "hookSecret",
    "signatureHeader",
    "bootstrap",
  ]) {
    expectExcludes(NOTIFICATIONS_VIEW, forbidden);
    assert.equal(androidIntent.includes(forbidden), false);
  }

  expectIncludes(ES_MESSAGES, 'openZohoMail: "Abrir Zoho Mail"');
  expectIncludes(EN_MESSAGES, 'openZohoMail: "Open Zoho Mail"');
});

test("F.7 keeps targets shared and service-worker push payload privacy bounded", () => {
  expectIncludes(INBOUND_SERVICE, "resolveAdminNotificationTarget");
  expectIncludes(TARGETS, 'kind: "notifications"');
  expectIncludes(TARGETS, 'kind: "reservation"');
  expectIncludes(INBOUND_SERVICE, "deliverAdminPushNotificationsBestEffort");
  expectIncludes(INBOUND_SERVICE, "if (result.created)");
  expectIncludes(INBOUND_SERVICE, "await deliver([result.notificationId]");
  expectIncludes(INBOUND_SERVICE, "targetPath");
  expectExcludes(INBOUND_SERVICE, "processAdminPushNotifications");

  for (const forbidden of [
    "fromAddress",
    "toAddress",
    "subject",
    "receivedAt",
    "zoho",
    "messageId",
  ]) {
    expectExcludes(SERVICE_WORKER, forbidden);
  }

  assert.deepEqual(JSON.parse(VERCEL), { crons: [] });
});

test("F.7 runtime sources do not log webhook secrets, headers, raw payloads or email bodies", () => {
  for (const source of [
    ROUTE,
    INBOUND_SERVICE,
    LIMITED_DATA,
    SECRET_CRYPTO,
    SIGNATURE,
    OPERATIONAL_SERVICE,
  ]) {
    expectExcludes(source, "console.log");
    expectExcludes(source, "console.error");
    expectExcludes(source, "AdminAuditLog");
    expectExcludes(source, "adminAuditLog");
  }

  expectExcludes(INBOUND_SERVICE, "bodyHtml");
  expectExcludes(INBOUND_SERVICE, "mailBody");
  expectExcludes(INBOUND_SERVICE, "attachmentData");
});
