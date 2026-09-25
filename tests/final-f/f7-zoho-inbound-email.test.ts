import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import {
  AdminNotificationType,
  AdminPushDeliveryStatus,
  type PrismaClient,
} from "@prisma/client";

import { getZohoMailWebhookEnv } from "@/lib/env/server";
import {
  createZohoMailWebhookSignature,
  decryptZohoMailWebhookSecret,
  encryptZohoMailWebhookSecret,
  getAcceptedZohoMailRecipientAddresses,
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
const TARGETS = read("lib/admin-notifications/targets.ts");
const NOTIFICATIONS_VIEW = read(
  "features/admin/components/admin-notifications-page.tsx",
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
  property: {
    nameEs: string;
    nameEn: string;
  };
};

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
        where: { guestEmail: { equals: string } };
        take: number;
      }) {
        return reservations
          .filter(
            (reservation) =>
              reservation.guestEmail.toLowerCase() ===
              args.where.guestEmail.equals.toLowerCase(),
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
    "Remove it from Vercel and redeploy",
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
    { html: "<p>full</p>" },
    { cc: "copy@example.com" },
    { fullHeaders: "raw headers" },
    { attachments: [] },
    { threadId: "thread-1" },
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

test("F.7 resolves accepted recipients and ignores internal correspondence-domain senders", () => {
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
  assert.equal(
    isAcceptedZohoMailRecipient({
      toAddresses: ["owner@example.com", "reservas@juantzun.dev"],
      trpEnvironment: "test",
    }),
    true,
  );
  assert.equal(
    isInternalZohoMailSender({
      fromAddress: "admin@juantzun.dev",
      trpEnvironment: "test",
    }),
    true,
  );
});

test("F.7 bootstrap persists only encrypted hook secret and creates no guest email notification", async () => {
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
  assert.equal(
    Array.from(fake.configurations.values())[0]?.hookSecretEncrypted.includes(
      "zoho-hook-secret",
    ),
    false,
  );
});

test("F.7 rejects invalid bootstrap token and invalid registered signatures", async () => {
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

  await bootstrapFakeWebhook(fake);
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

test("F.7 creates one matched event, AdminNotification and delivery after verified registered webhook", async () => {
  const fake = createFakeZohoPrismaClient({
    reservations: [
      {
        id: "reservation-1",
        guestEmail: "GUEST@example.com",
        property: { nameEs: "Bungalow Luna", nameEn: "Moon Bungalow" },
      },
    ],
  });
  const delivered: string[][] = [];
  await bootstrapFakeWebhook(fake);

  const rawBody = createLimitedRawBody();
  const outcome = await processZohoMailWebhook({
    rawBody,
    signatureHeader: createZohoMailWebhookSignature(rawBody, "zoho-hook-secret"),
    source: baseEnv,
    prismaClient: fake.prismaClient,
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
  assert.equal(notification?.title, "Nuevo correo de huésped · Bungalow Luna");
  assert.equal(notification?.body, "Toca para revisar la correspondencia.");
  assert.equal(notification?.title.includes("guest@example.com"), false);
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
  });
  fake.reservations.push({
    id: "reservation-after-first-delivery",
    guestEmail: "guest@example.com",
    property: { nameEs: "Bungalow Sol", nameEn: "Sun Bungalow" },
  });
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

test("F.7 ignores irrelevant recipients, own-domain senders and ambiguous reservation matches", async () => {
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
    { status: "ignored" },
  );
  assert.equal(ignoredRecipient.notifications.size, 0);

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
    { status: "ignored" },
  );

  const ambiguous = createFakeZohoPrismaClient({
    reservations: [
      {
        id: "reservation-a",
        guestEmail: "guest@example.com",
        property: { nameEs: "Uno", nameEn: "One" },
      },
      {
        id: "reservation-b",
        guestEmail: "guest@example.com",
        property: { nameEs: "Dos", nameEn: "Two" },
      },
    ],
  });
  await bootstrapFakeWebhook(ambiguous);
  const rawBody = createLimitedRawBody();
  await processZohoMailWebhook({
    rawBody,
    signatureHeader: createZohoMailWebhookSignature(rawBody, "zoho-hook-secret"),
    source: baseEnv,
    prismaClient: ambiguous.prismaClient,
  });

  assert.equal(
    Array.from(ambiguous.notifications.values())[0]?.targetPath,
    "/admin/notifications",
  );
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
  ]) {
    expectExcludes(CENTER_SERVICE, forbidden);
  }
});

test("F.7 Admin notification UI opens Zoho Mail with best-effort sender copy and no deep links", () => {
  for (const expected of [
    "siteConfig.correspondence.zohoMailWebUrl",
    "openZohoMailForNotification",
    "navigator.clipboard.writeText(notification.zohoEmail.fromAddress)",
    "copy.actions.openZohoMail",
    "copy.history.zohoEmail",
    "copy.errors.ADMIN_NOTIFICATION_ZOHO_COPY_FAILED",
  ]) {
    expectIncludes(NOTIFICATIONS_VIEW, expected);
  }

  expectIncludes(ES_MESSAGES, 'openZohoMail: "Abrir Zoho Mail"');
  expectIncludes(EN_MESSAGES, 'openZohoMail: "Open Zoho Mail"');
  expectExcludes(NOTIFICATIONS_VIEW, "mail.zoho.com/mail/");
  expectExcludes(NOTIFICATIONS_VIEW, "notification.zohoEmail.subject)");
});

test("F.7 keeps targets shared and service-worker push payload privacy bounded", () => {
  expectIncludes(INBOUND_SERVICE, "resolveAdminNotificationTarget");
  expectIncludes(TARGETS, 'kind: "notifications"');
  expectIncludes(TARGETS, 'kind: "reservation"');
  expectIncludes(INBOUND_SERVICE, "deliverAdminPushNotificationsBestEffort");
  expectIncludes(INBOUND_SERVICE, "targetPath");

  for (const forbidden of [
    "fromAddress",
    "toAddress",
    "subject",
    "receivedAt",
    "zoho",
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
