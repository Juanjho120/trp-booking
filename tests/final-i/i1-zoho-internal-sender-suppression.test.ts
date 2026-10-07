import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import {
  AdminNotificationType,
  AdminPushDeliveryStatus,
  ReservationStatus,
  type PrismaClient,
} from "@prisma/client";

import {
  createZohoMailWebhookSignature,
  encryptZohoMailWebhookSecret,
  getAcceptedZohoMailRecipientAddresses,
  getInternalZohoMailSenderDomains,
  isAcceptedZohoMailRecipient,
  isInternalZohoMailSender,
  processZohoMailWebhook,
  ZohoMailWebhookError,
} from "@/lib/zoho-mail";

import { test } from "./harness";

const ROOT = process.cwd();
const ZOHO_KEY = "AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA=";
const HOOK_SECRET = "zoho-hook-secret";
const MATCH_NOW = new Date("2026-09-25T18:00:00.000Z");

function read(relativePath: string): string {
  return readFileSync(path.join(ROOT, relativePath), "utf8");
}

function expectIncludes(source: string, expected: string): void {
  assert.ok(
    source.includes(expected),
    `Expected source to include: ${expected}`,
  );
}

function expectNotIncludes(source: string, unexpected: string): void {
  assert.ok(
    !source.includes(unexpected),
    `Expected source not to include: ${unexpected}`,
  );
}

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

function createFakeReservation(
  override: Partial<FakeReservation> = {},
): FakeReservation {
  return {
    id: "reservation-1",
    guestEmail: "guest@example.com",
    guestName: "Guest Example",
    status: ReservationStatus.CONFIRMED,
    checkInDate: new Date("2026-09-24T00:00:00.000Z"),
    checkOutDate: new Date("2026-09-26T00:00:00.000Z"),
    property: {
      nameEs: "Bungalow Luna",
      nameEn: "Moon Bungalow",
    },
    ...override,
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

function createLimitedRawBody(
  override: Record<string, unknown> = {},
): string {
  return JSON.stringify({
    subject: "Arrival question",
    from: "Guest Example <guest@example.com>",
    to: ["Reservations <reservas@juantzun.dev>"],
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

function registerWebhookConfiguration(
  fake: ReturnType<typeof createFakeZohoPrismaClient>,
  env: NodeJS.ProcessEnv = baseEnv,
): void {
  const businessEnvironment = env.TRP_ENVIRONMENT ?? "test";

  fake.configurations.set(businessEnvironment, {
    hookSecretEncrypted: encryptZohoMailWebhookSecret({
      hookSecret: HOOK_SECRET,
      businessEnvironment: businessEnvironment as "local" | "test" | "production",
      source: env,
    }),
  });
}

async function processRegisteredWebhook(
  input: Readonly<{
    fake: ReturnType<typeof createFakeZohoPrismaClient>;
    env?: NodeJS.ProcessEnv;
    payloadOverride?: Record<string, unknown>;
    signatureSecret?: string;
    deliverAdminPush?: Parameters<typeof processZohoMailWebhook>[0]["deliverAdminPush"];
  }>,
): Promise<Awaited<ReturnType<typeof processZohoMailWebhook>>> {
  const env = input.env ?? baseEnv;
  const rawBody = createLimitedRawBody(input.payloadOverride);

  return processZohoMailWebhook({
    rawBody,
    signatureHeader: createZohoMailWebhookSignature(
      rawBody,
      input.signatureSecret ?? HOOK_SECRET,
    ),
    source: env,
    prismaClient: input.fake.prismaClient,
    deliverAdminPush: input.deliverAdminPush,
    now: MATCH_NOW,
  });
}

function assertNoInboundPersistence(
  fake: ReturnType<typeof createFakeZohoPrismaClient>,
): void {
  assert.equal(fake.events.size, 0);
  assert.equal(fake.notifications.size, 0);
  assert.equal(fake.deliveries.length, 0);
}

test("I.1 classifies correspondence and transactional sending domains as internal", () => {
  assert.deepEqual(getInternalZohoMailSenderDomains("test"), [
    "juantzun.dev",
    "mail.trp-booking.juantzun.dev",
  ]);
  assert.deepEqual(getInternalZohoMailSenderDomains("production"), [
    "turefugioperfecto.com",
    "mail.turefugioperfecto.com",
  ]);

  for (const fromAddress of [
    "ADMIN@JUANTZUN.DEV",
    "reservas@MAIL.TRP-BOOKING.JUANTZUN.DEV",
  ]) {
    assert.equal(
      isInternalZohoMailSender({ fromAddress, trpEnvironment: "test" }),
      true,
      `${fromAddress} should be internal in Test`,
    );
  }

  for (const fromAddress of [
    "admin@turefugioperfecto.com",
    "reservas@mail.turefugioperfecto.com",
  ]) {
    assert.equal(
      isInternalZohoMailSender({ fromAddress, trpEnvironment: "production" }),
      true,
      `${fromAddress} should be internal in Production`,
    );
  }
});

test("I.1 rejects sender-domain lookalikes by exact comparison only", () => {
  for (const fromAddress of [
    "attacker@evilmail.trp-booking.juantzun.dev",
    "attacker@mail.trp-booking.juantzun.dev.attacker.example",
    "attacker@eviljuantzun.dev",
    "attacker@juantzun.dev.attacker.example",
  ]) {
    assert.equal(
      isInternalZohoMailSender({ fromAddress, trpEnvironment: "test" }),
      false,
      `${fromAddress} should remain external`,
    );
  }
});

test("I.1 ignores Test transactional-domain senders before persistence or push", async () => {
  const fake = createFakeZohoPrismaClient({
    reservations: [createFakeReservation()],
  });
  registerWebhookConfiguration(fake);
  let deliverCalls = 0;

  const outcome = await processRegisteredWebhook({
    fake,
    payloadOverride: {
      from: "TRP <reservas@mail.trp-booking.juantzun.dev>",
    },
    deliverAdminPush: async () => {
      deliverCalls += 1;
    },
  });

  assert.deepEqual(outcome, {
    status: "ignored",
    reason: "internal_sender",
  });
  assertNoInboundPersistence(fake);
  assert.equal(deliverCalls, 0);
});

test("I.1 ignores Production transactional-domain senders before persistence or push", async () => {
  const productionEnv = {
    ...baseEnv,
    TRP_ENVIRONMENT: "production",
    AUTH_ALLOWED_ADMIN_EMAILS: "admin@turefugioperfecto.com",
    TILOPAY_ENVIRONMENT: "production",
    TILOPAY_REDIRECT_URL:
      "https://turefugioperfecto.com/api/payments/tilopay/redirect",
    TILOPAY_SUCCESS_URL: "https://turefugioperfecto.com/reservas/pago/exitoso",
    TILOPAY_CANCEL_URL: "https://turefugioperfecto.com/reservas/pago/cancelado",
    TILOPAY_ERROR_URL: "https://turefugioperfecto.com/reservas/pago/error",
    TILOPAY_WEBHOOK_URL:
      "https://turefugioperfecto.com/api/payments/tilopay/webhook",
  } satisfies NodeJS.ProcessEnv;
  const fake = createFakeZohoPrismaClient({
    reservations: [createFakeReservation()],
  });
  registerWebhookConfiguration(fake, productionEnv);
  let deliverCalls = 0;

  const outcome = await processRegisteredWebhook({
    fake,
    env: productionEnv,
    payloadOverride: {
      from: "TRP <reservas@mail.turefugioperfecto.com>",
      to: ["Admin <admin@turefugioperfecto.com>"],
    },
    deliverAdminPush: async () => {
      deliverCalls += 1;
    },
  });

  assert.deepEqual(outcome, {
    status: "ignored",
    reason: "internal_sender",
  });
  assertNoInboundPersistence(fake);
  assert.equal(deliverCalls, 0);
});

test("I.1 preserves external guest processing and reservation matching", async () => {
  const fake = createFakeZohoPrismaClient({
    reservations: [createFakeReservation({ guestEmail: "guest@example.com" })],
  });
  registerWebhookConfiguration(fake);
  let deliverCalls = 0;

  const outcome = await processRegisteredWebhook({
    fake,
    payloadOverride: {
      from: "Guest Example <guest@example.com>",
      to: ["Reservations <reservas@juantzun.dev>"],
    },
    deliverAdminPush: async () => {
      deliverCalls += 1;
    },
  });
  const event = Array.from(fake.events.values())[0];
  const notification = Array.from(fake.notifications.values())[0];

  assert.equal(outcome.status, "processed");
  assert.equal(outcome.reservationId, "reservation-1");
  assert.equal(event?.fromAddress, "guest@example.com");
  assert.equal(event?.reservationId, "reservation-1");
  assert.equal(notification?.type, AdminNotificationType.GUEST_EMAIL_RECEIVED);
  assert.equal(notification?.reservationId, "reservation-1");
  assert.equal(notification?.targetPath, "/admin/reservations/reservation-1");
  assert.equal(fake.deliveries.length, 1);
  assert.equal(deliverCalls, 1);
});

test("I.6.1 preserves intended aliases and domain-based Zoho recipient compatibility", async () => {
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

  for (const recipient of getAcceptedZohoMailRecipientAddresses("test")) {
    const fake = createFakeZohoPrismaClient({
      reservations: [createFakeReservation({ guestEmail: "guest@example.com" })],
    });
    registerWebhookConfiguration(fake);

    const outcome = await processRegisteredWebhook({
      fake,
      payloadOverride: {
        from: "Guest Example <guest@example.com>",
        to: [`TRP <${recipient}>`],
      },
    });

    assert.equal(outcome.status, "processed");
    assert.equal(fake.events.size, 1);
    assert.equal(fake.notifications.size, 1);
  }

  const normalizedRecipientFake = createFakeZohoPrismaClient({
    reservations: [createFakeReservation({ guestEmail: "guest@example.com" })],
  });
  registerWebhookConfiguration(normalizedRecipientFake);

  const normalizedOutcome = await processRegisteredWebhook({
    fake: normalizedRecipientFake,
    payloadOverride: {
      from: "Guest Example <guest@example.com>",
      to: ["Mailbox normalized <mailbox-normalized@juantzun.dev>"],
    },
  });

  assert.equal(normalizedOutcome.status, "processed");
  assert.equal(normalizedRecipientFake.events.size, 1);
  assert.equal(
    isAcceptedZohoMailRecipient({
      toAddresses: ["mailbox-normalized@juantzun.dev"],
      trpEnvironment: "test",
    }),
    true,
  );
});

test("I.6.1 rejects recipient-domain lookalikes without exact-alias runtime filtering", async () => {
  for (const recipient of [
    "attacker@eviljuantzun.dev",
    "attacker@juantzun.dev.attacker.example",
    "attacker@example.com",
  ]) {
    const fake = createFakeZohoPrismaClient();
    registerWebhookConfiguration(fake);

    const outcome = await processRegisteredWebhook({
      fake,
      payloadOverride: {
        to: [`Lookalike <${recipient}>`],
      },
    });

    assert.deepEqual(outcome, {
      status: "ignored",
      reason: "recipient_outside_correspondence_domain",
    });
    assertNoInboundPersistence(fake);
    assert.equal(
      isAcceptedZohoMailRecipient({
        toAddresses: [recipient],
        trpEnvironment: "test",
      }),
      false,
    );
  }
});

test("I.1 keeps recipient filtering and signature verification boundaries", async () => {
  const unsafeRecipientFake = createFakeZohoPrismaClient();
  registerWebhookConfiguration(unsafeRecipientFake);

  const ignored = await processRegisteredWebhook({
    fake: unsafeRecipientFake,
    payloadOverride: {
      to: ["Unrelated <inbox@example.com>"],
    },
  });

  assert.deepEqual(ignored, {
    status: "ignored",
    reason: "recipient_outside_correspondence_domain",
  });
  assertNoInboundPersistence(unsafeRecipientFake);

  const badSignatureFake = createFakeZohoPrismaClient();
  registerWebhookConfiguration(badSignatureFake);

  await assert.rejects(
    () =>
      processRegisteredWebhook({
        fake: badSignatureFake,
        signatureSecret: "wrong-secret",
      }),
    (error: unknown) => {
      assert.ok(error instanceof ZohoMailWebhookError);
      assert.equal(error.code, "ZOHO_MAIL_SIGNATURE_INVALID");
      assert.equal(error.status, 403);

      return true;
    },
  );
  assertNoInboundPersistence(badSignatureFake);
});

test("I.1 registers the roadmap, validation script, and F.7 forward note", () => {
  const packageJson = JSON.parse(read("package.json")) as {
    scripts: Record<string, string>;
  };
  const doc212 = read(
    "docs/212-final-i-operational-polish-notification-ux-and-fel-invoicing-roadmap.md",
  );
  const doc204 = read(
    "docs/204-final-f-7-zoho-inbound-email-metadata-and-admin-web-push.md",
  );
  const doc215 = read(
    "docs/215-final-i-6-1-interim-operational-hardening.md",
  );
  const doc216 = read(
    "docs/216-final-i-6-2-admin-ux-navigation-accordions-pagination-polish.md",
  );
  const doc217 = read(
    "docs/217-final-i-6-3-additional-charges-email-delivery-layout-polish.md",
  );
  const vercel = JSON.parse(read("vercel.json")) as { crons?: unknown[] };

  assert.equal(
    packageJson.scripts["final-i:validate"],
    "tsx --tsconfig tests/final-i/tsconfig.json tests/final-i/run.ts",
  );
  assert.deepEqual(vercel.crons, []);
  expectIncludes(doc212, "Final-I.1 status: Completed and accepted on 2026-09-29");
  expectIncludes(doc212, "Accepted Final-I.1 head: 9a15f349c1104671f5555d1988caa56756e5ff0c");
  expectIncludes(doc212, "Final-I.2 status: Completed and accepted on 2026-09-29");
  expectIncludes(doc212, "Accepted Final-I.2 head: 6451cb705d972c83a771a9ff39f6da80d130cf58");
  expectIncludes(doc212, "Final-I.3 status: Completed and accepted on 2026-09-29");
  expectIncludes(doc212, "Accepted Final-I.3 head: 8c5a9186e392f35bdbc998f463c5c3c6cd0be295");
  expectIncludes(doc212, "Final-I.4 status: Completed and accepted on 2026-09-30");
  expectIncludes(doc212, "Accepted Final-I.4 head: 8e2d7d56a8e81a860833b05f4a28cba8a517bad4");
  expectIncludes(
    doc212,
    "Final-I.5 status: Completed and accepted on 2026-09-30",
  );
  expectIncludes(doc212, "Accepted Final-I.5 head: fde3ae06427af1f8905e6f7589263c199f918553");
  expectIncludes(
    doc212,
    "Final-I.5 implementation and acceptance record: docs/213-final-i-5-fel-fiscal-domain-contract-and-architecture.md",
  );
  expectIncludes(
    doc212,
    "Final-I.6 status: Completed and accepted on 2026-10-02",
  );
  expectIncludes(
    doc212,
    "Accepted Final-I.6 head: 80469abda146d0d50516ab598a514a9ccea2db6d",
  );
  expectIncludes(
    doc212,
    "Final-I.6 implementation and acceptance record: docs/214-final-i-6-fel-persistence-admin-draft-module.md",
  );
  expectIncludes(doc212, "Final-I.6.1 status: Completed and accepted on 2026-10-06");
  expectIncludes(
    doc212,
    "Accepted Final-I.6.1 feature head: 4d8a1dd5eb2f2eaaadf43bd8b97d7dd1df6e500e",
  );
  expectIncludes(
    doc212,
    "Workstream E status: Completed; provider trigger configuration + Hosted validation PASS on 2026-10-02",
  );
  expectIncludes(
    doc212,
    "Workstream A status: Completed; Hosted owner validation PASS on 2026-10-05",
  );
  expectIncludes(
    doc212,
    "Workstream B+C status: Completed; Hosted owner validation PASS on 2026-10-06",
  );
  expectIncludes(
    doc212,
    "Workstream D status: Completed; Hosted functional validation PASS; final full-width Charge accordion-header visual revalidation PASS; Hosted owner validation PASS on 2026-10-06",
  );
  expectIncludes(
    doc212,
    "Final-I.6.1 implementation and acceptance record: docs/215-final-i-6-1-interim-operational-hardening.md",
  );
  expectIncludes(doc212, "Final-I.6.2 status: Completed and accepted on 2026-10-07");
  expectIncludes(
    doc212,
    "Accepted Final-I.6.2 feature head: d936983edd22607919148f871e3ba339ab4a4ed9",
  );
  expectIncludes(
    doc212,
    "Final-I.6.2 implementation and acceptance record: docs/216-final-i-6-2-admin-ux-navigation-accordions-pagination-polish.md",
  );
  expectIncludes(
    doc212,
    "Final-I.6.3 status: Implementation completed; Hosted owner validation pending",
  );
  expectIncludes(
    doc212,
    "Final-I.6.3 scope: Additional Charges Email Delivery Layout Polish",
  );
  expectIncludes(
    doc212,
    "Final-I.6.3 implementation record: docs/217-final-i-6-3-additional-charges-email-delivery-layout-polish.md",
  );
  expectNotIncludes(
    doc212,
    "Final-I.6.2 implementation is completed with Hosted owner validation pending",
  );
  expectNotIncludes(doc212, "no Final-I.6.3 was created");
  expectIncludes(doc216, "Status: Completed and accepted on 2026-10-07");
  expectIncludes(
    doc216,
    "Accepted Final-I.6.2 feature head: d936983edd22607919148f871e3ba339ab4a4ed9",
  );
  expectIncludes(doc216, "Owner formal acceptance: PASS on 2026-10-07");
  expectIncludes(doc216, "A - Additional Charges compact tabs: Completed; Hosted owner validation PASS");
  expectIncludes(doc216, "K - Admin identity relocation and compact tooltip refinement: Completed; Hosted owner validation PASS on 2026-10-07");
  expectNotIncludes(doc216, "Pending final visual revalidation");
  expectIncludes(
    doc217,
    "Status: Implementation completed; Hosted owner validation pending",
  );
  expectIncludes(
    doc217,
    "Accepted Final-I.6.2 feature head: d936983edd22607919148f871e3ba339ab4a4ed9",
  );
  expectIncludes(
    doc217,
    "The optional resend action remains in the card header, outside the metrics grid.",
  );
  expectIncludes(
    doc217,
    "Final-I.7 status: Blocked pending official INFILE technical documentation + Test credentials",
  );
  expectIncludes(doc212, "Final-I.7 status: Blocked pending official INFILE technical documentation + Test credentials");
  expectIncludes(doc212, "Final-I.8 status: Not started / reserved for FEL delivery email/PDF/XML/history UX");
  expectIncludes(doc212, "Final-I.9 status: Not started / integrated Final-I closure");
  expectIncludes(doc212, "Phase 13 status: Blocked / Not started until Final-I closes");
  expectIncludes(doc204, "Final-I.1 forward hardening note");
  expectIncludes(doc204, "Final-I.6.1 Provider Trigger-Scope Hardening Note");
  expectIncludes(doc204, "Final-I.6.1 Workstream E Hosted validation passed on 2026-10-02");
  expectIncludes(doc215, "Any / OR");
  expectIncludes(doc215, "admin@juantzun.dev");
  expectIncludes(doc215, "reservas@juantzun.dev");
  expectIncludes(doc215, "reservations@juantzun.dev");
  expectIncludes(doc215, "admin@turefugioperfecto.com");
  expectIncludes(doc215, "reservas@turefugioperfecto.com");
  expectIncludes(doc215, "reservations@turefugioperfecto.com");
  expectIncludes(doc215, "Runtime acceptance remains intentionally domain-based");
  expectIncludes(doc215, "Do not add DMARC subject, sender or keyword suppression");
});

test("I.1 records internal suppression from environmentConfig without hardcoded extra domains", () => {
  const service = read("lib/zoho-mail/inbound-email.ts");

  expectIncludes(service, "environmentConfig.production.sendingDomain");
  expectIncludes(service, "environmentConfig.test.sendingDomain");
  expectIncludes(service, "getInternalZohoMailSenderDomains");
});

test("I.6.1 keeps Zoho runtime free of DMARC subject or sender heuristics", () => {
  const service = read("lib/zoho-mail/inbound-email.ts");

  assert.doesNotMatch(service, /DMARC|Forensic|Report/i);
  assert.doesNotMatch(service, /subject[\s\S]{0,120}DMARC/i);
  assert.doesNotMatch(service, /fromAddress[\s\S]{0,120}DMARC/i);
});
