import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";

import {
  AdminNotificationType,
  AdminPushDeliveryStatus,
  GuestPaymentRequestStatus,
  type Prisma,
} from "@prisma/client";

import {
  ensureAdditionalChargePaidAdminNotificationIntent,
  ensureLifecycleAdjustmentPaidAdminNotificationIntent,
  ensureRefundProcessedAdminNotificationIntent,
} from "@/lib/admin-notifications";
import { listCronJobDefinitions } from "@/lib/cron/registry";
import { expirePendingGuestPaymentRequests } from "@/lib/payments/guest-payment-request-expiration";

import { test } from "./harness";

const ROOT = process.cwd();

type ExpirationRecord = {
  id: string;
  reservationId: string;
  accessTokenHash: string;
  status: GuestPaymentRequestStatus;
  expiresAt: Date;
};

function read(relativePath: string): string {
  return readFileSync(path.join(ROOT, relativePath), "utf8");
}

function enumValues(name: string): string[] {
  const schema = read("prisma/schema.prisma");
  const start = schema.indexOf("enum " + name + " {");

  assert.ok(start >= 0, name + " enum should exist");

  const end = schema.indexOf("\n}", start);

  assert.ok(end > start, name + " enum should close");

  return schema
    .slice(start, end)
    .split("\n")
    .slice(1)
    .map((line) => line.trim())
    .filter((line) => line && !line.startsWith("@@") && !line.startsWith("//"));
}


function createExpirationClient(records: ExpirationRecord[]) {
  const calls: Array<Readonly<{ where: Prisma.GuestPaymentRequestWhereInput }>> =
    [];
  const client = {
    guestPaymentRequest: {
      async updateMany(input: {
        where: Prisma.GuestPaymentRequestWhereInput;
        data: Readonly<{ status: GuestPaymentRequestStatus }>;
      }) {
        calls.push({ where: input.where });
        let count = 0;
        const expiresAt = input.where.expiresAt as
          | Readonly<{ lte?: Date }>
          | undefined;
        const cutoff = expiresAt?.lte;

        for (const record of records) {
          if (record.status !== GuestPaymentRequestStatus.PENDING) continue;
          if (cutoff && record.expiresAt > cutoff) continue;
          if (
            typeof input.where.reservationId === "string" &&
            record.reservationId !== input.where.reservationId
          ) {
            continue;
          }
          if (
            typeof input.where.accessTokenHash === "string" &&
            record.accessTokenHash !== input.where.accessTokenHash
          ) {
            continue;
          }

          record.status = input.data.status;
          count += 1;
        }

        return { count };
      },
    },
  };

  return { calls, client };
}

function createNotificationTransaction() {
  const notifications = new Map<
    string,
    {
      id: string;
      type: AdminNotificationType;
      reservationId: string | null;
      reviewId: string | null;
      deduplicationKey: string;
      title: string;
      body: string;
      targetPath: string;
    }
  >();
  const deliveries: Array<{
    notificationId: string;
    subscriptionId: string;
    status: AdminPushDeliveryStatus;
  }> = [];
  let sequence = 0;

  const transaction = {
    reservation: {
      async findUnique(input: { where: { id: string } }) {
        if (input.where.id !== "reservation-1") return null;

        return {
          id: "reservation-1",
          guestName: "Ada Lovelace",
          property: {
            nameEs: "Bungalow Azul",
            nameEn: "Blue Bungalow",
            checkInTime: "15:00",
            checkOutTime: "11:00",
          },
        };
      },
    },
    adminNotification: {
      async createMany(input: {
        data: {
          type: AdminNotificationType;
          reservationId: string | null;
          reviewId: string | null;
          deduplicationKey: string;
          title: string;
          body: string;
          targetPath: string;
        };
        skipDuplicates: boolean;
      }) {
        assert.equal(input.skipDuplicates, true);
        if (notifications.has(input.data.deduplicationKey)) {
          return { count: 0 };
        }

        sequence += 1;
        notifications.set(input.data.deduplicationKey, {
          id: `notification-${sequence}`,
          ...input.data,
        });

        return { count: 1 };
      },
      async findUnique(input: { where: { deduplicationKey: string } }) {
        return notifications.get(input.where.deduplicationKey) ?? null;
      },
    },
    adminPushSubscription: {
      async findMany() {
        return [{ id: "subscription-1" }, { id: "subscription-2" }];
      },
    },
    adminPushDelivery: {
      async createMany(input: {
        data: Array<{
          notificationId: string;
          subscriptionId: string;
          status: AdminPushDeliveryStatus;
        }>;
        skipDuplicates: boolean;
      }) {
        assert.equal(input.skipDuplicates, true);
        deliveries.push(...input.data);
        return { count: input.data.length };
      },
    },
  } as unknown as Prisma.TransactionClient;

  return { deliveries, notifications, transaction };
}

test("I.6.1 canonical GPR expiration only mutates overdue pending requests", async () => {
  const now = new Date("2026-10-05T12:00:00.000Z");
  const records: ExpirationRecord[] = [
    {
      id: "expired-a",
      reservationId: "reservation-a",
      accessTokenHash: "hash-a",
      status: GuestPaymentRequestStatus.PENDING,
      expiresAt: new Date("2026-10-05T11:59:00.000Z"),
    },
    {
      id: "future-a",
      reservationId: "reservation-a",
      accessTokenHash: "hash-future",
      status: GuestPaymentRequestStatus.PENDING,
      expiresAt: new Date("2026-10-05T12:01:00.000Z"),
    },
    {
      id: "paid-a",
      reservationId: "reservation-a",
      accessTokenHash: "hash-paid",
      status: GuestPaymentRequestStatus.PAID,
      expiresAt: new Date("2026-10-05T11:00:00.000Z"),
    },
    {
      id: "expired-b",
      reservationId: "reservation-b",
      accessTokenHash: "hash-b",
      status: GuestPaymentRequestStatus.PENDING,
      expiresAt: new Date("2026-10-05T10:00:00.000Z"),
    },
  ];
  const { calls, client } = createExpirationClient(records);

  const scoped = await expirePendingGuestPaymentRequests({
    client,
    now,
    reservationId: "reservation-a",
  });
  const tokenScoped = await expirePendingGuestPaymentRequests({
    accessTokenHash: "hash-b",
    client,
    now,
  });

  assert.deepEqual(scoped, {
    expiredCount: 1,
    expiredAt: "2026-10-05T12:00:00.000Z",
  });
  assert.deepEqual(tokenScoped, {
    expiredCount: 1,
    expiredAt: "2026-10-05T12:00:00.000Z",
  });
  assert.equal(records.find((record) => record.id === "expired-a")?.status, "EXPIRED");
  assert.equal(records.find((record) => record.id === "future-a")?.status, "PENDING");
  assert.equal(records.find((record) => record.id === "paid-a")?.status, "PAID");
  assert.equal(records.find((record) => record.id === "expired-b")?.status, "EXPIRED");
  assert.deepEqual(
    calls.map((call) => call.where),
    [
      {
        reservationId: "reservation-a",
        status: GuestPaymentRequestStatus.PENDING,
        expiresAt: { lte: now },
      },
      {
        accessTokenHash: "hash-b",
        status: GuestPaymentRequestStatus.PENDING,
        expiresAt: { lte: now },
      },
    ],
  );
});

test("I.6.1 canonical GPR expiration global mode expires all overdue pending requests", async () => {
  const now = new Date("2026-10-05T12:00:00.000Z");
  const records: ExpirationRecord[] = [
    {
      id: "overdue-a",
      reservationId: "reservation-a",
      accessTokenHash: "hash-overdue-a",
      status: GuestPaymentRequestStatus.PENDING,
      expiresAt: new Date("2026-10-05T11:59:00.000Z"),
    },
    {
      id: "future-a",
      reservationId: "reservation-a",
      accessTokenHash: "hash-future-a",
      status: GuestPaymentRequestStatus.PENDING,
      expiresAt: new Date("2026-10-05T12:01:00.000Z"),
    },
    {
      id: "paid-a",
      reservationId: "reservation-a",
      accessTokenHash: "hash-paid-a",
      status: GuestPaymentRequestStatus.PAID,
      expiresAt: new Date("2026-10-05T11:00:00.000Z"),
    },
    {
      id: "cancelled-a",
      reservationId: "reservation-a",
      accessTokenHash: "hash-cancelled-a",
      status: GuestPaymentRequestStatus.CANCELLED,
      expiresAt: new Date("2026-10-05T11:00:00.000Z"),
    },
    {
      id: "expired-a",
      reservationId: "reservation-a",
      accessTokenHash: "hash-expired-a",
      status: GuestPaymentRequestStatus.EXPIRED,
      expiresAt: new Date("2026-10-05T11:00:00.000Z"),
    },
    {
      id: "overdue-b",
      reservationId: "reservation-b",
      accessTokenHash: "hash-overdue-b",
      status: GuestPaymentRequestStatus.PENDING,
      expiresAt: new Date("2026-10-05T10:00:00.000Z"),
    },
  ];
  const { calls, client } = createExpirationClient(records);

  const result = await expirePendingGuestPaymentRequests({ client, now });

  assert.deepEqual(result, {
    expiredCount: 2,
    expiredAt: "2026-10-05T12:00:00.000Z",
  });
  assert.equal(
    records.find((record) => record.id === "overdue-a")?.status,
    "EXPIRED",
  );
  assert.equal(
    records.find((record) => record.id === "future-a")?.status,
    "PENDING",
  );
  assert.equal(records.find((record) => record.id === "paid-a")?.status, "PAID");
  assert.equal(
    records.find((record) => record.id === "cancelled-a")?.status,
    "CANCELLED",
  );
  assert.equal(
    records.find((record) => record.id === "expired-a")?.status,
    "EXPIRED",
  );
  assert.equal(
    records.find((record) => record.id === "overdue-b")?.status,
    "EXPIRED",
  );
  assert.deepEqual(calls.map((call) => call.where), [
    {
      status: GuestPaymentRequestStatus.PENDING,
      expiresAt: { lte: now },
    },
  ]);
  assert.equal(
    Object.hasOwn(calls[0]?.where ?? {}, "reservationId"),
    false,
  );
  assert.equal(
    Object.hasOwn(calls[0]?.where ?? {}, "accessTokenHash"),
    false,
  );
});

test("I.6.1 registers the GPR expiration cron without enabling Vercel schedules", () => {
  const definition = listCronJobDefinitions().find(
    (job) => job.key === "EXPIRE_GUEST_PAYMENT_REQUESTS",
  );
  const esMessages = read("messages/es.ts");
  const enMessages = read("messages/en.ts");

  assert.ok(definition);
  assert.equal(definition.slug, "expire-guest-payment-requests");
  assert.equal(definition.schedule, "*/5 * * * *");
  assert.equal(
    definition.safeUnexpectedErrorCode,
    "GUEST_PAYMENT_REQUEST_EXPIRATION_UNEXPECTED_ERROR",
  );
  assert.deepEqual(JSON.parse(read("vercel.json")), { crons: [] });
  assert.ok(
    read("app/api/cron/expire-guest-payment-requests/route.ts").includes(
      'handleScheduledCronRequest(request, "expire-guest-payment-requests")',
    ),
  );
  assert.ok(esMessages.includes("Expirar solicitudes de pago vencidas"));
  assert.ok(enMessages.includes("Expire overdue payment requests"));
  assert.ok(
    esMessages.includes("GUEST_PAYMENT_REQUEST_EXPIRATION_UNEXPECTED_ERROR"),
  );
  assert.ok(
    esMessages.includes(
      "No se pudo completar la expiración de solicitudes de pago de huéspedes.",
    ),
  );
  assert.ok(
    enMessages.includes("GUEST_PAYMENT_REQUEST_EXPIRATION_UNEXPECTED_ERROR"),
  );
  assert.ok(
    enMessages.includes(
      "Guest payment request expiration could not be completed.",
    ),
  );
});

test("I.6.1 financial Admin Push helpers are idempotent and bounded", async () => {
  const { deliveries, notifications, transaction } =
    createNotificationTransaction();
  const additional =
    await ensureAdditionalChargePaidAdminNotificationIntent(
      transaction,
      {
        reservationId: "reservation-1",
        guestPaymentRequestId: "gpr-1",
      },
      { EMAIL_ADMIN_LOCALE: "es" } as NodeJS.ProcessEnv,
    );
  const duplicate =
    await ensureAdditionalChargePaidAdminNotificationIntent(
      transaction,
      {
        reservationId: "reservation-1",
        guestPaymentRequestId: "gpr-1",
      },
      { EMAIL_ADMIN_LOCALE: "es" } as NodeJS.ProcessEnv,
    );
  const lifecycle =
    await ensureLifecycleAdjustmentPaidAdminNotificationIntent(
      transaction,
      {
        reservationId: "reservation-1",
        lifecycleRequestId: "lifecycle-1",
      },
      { EMAIL_ADMIN_LOCALE: "en" } as NodeJS.ProcessEnv,
    );
  const refund = await ensureRefundProcessedAdminNotificationIntent(
    transaction,
    {
      reservationId: "reservation-1",
      refundId: "refund-1",
    },
    { EMAIL_ADMIN_LOCALE: "es" } as NodeJS.ProcessEnv,
  );

  assert.equal(additional.created, true);
  assert.equal(duplicate.created, false);
  assert.equal(duplicate.id, additional.id);
  assert.equal(lifecycle.created, true);
  assert.equal(refund.created, true);
  assert.equal(deliveries.length, 6);
  assert.deepEqual(
    Array.from(notifications.values()).map((notification) => [
      notification.type,
      notification.deduplicationKey,
      notification.title,
      notification.body,
      notification.targetPath,
    ]),
    [
      [
        AdminNotificationType.ADDITIONAL_CHARGE_PAID,
        "admin-notification/additional-charge-paid/gpr-1",
        "Pago de cargo adicional recibido · Ada Lovelace · Bungalow Azul",
        "Toca para ver detalles.",
        "/admin/reservations/reservation-1",
      ],
      [
        AdminNotificationType.LIFECYCLE_ADJUSTMENT_PAID,
        "admin-notification/lifecycle-adjustment-paid/lifecycle-1",
        "Stay adjustment payment received · Ada Lovelace · Blue Bungalow",
        "Tap to view details.",
        "/admin/reservations/reservation-1",
      ],
      [
        AdminNotificationType.REFUND_PROCESSED,
        "admin-notification/refund-processed/refund-1",
        "Reembolso procesado · Ada Lovelace · Bungalow Azul",
        "Toca para ver detalles.",
        "/admin/reservations/reservation-1",
      ],
    ],
  );

  for (const notification of notifications.values()) {
    const persistedText = JSON.stringify(notification);

    for (const forbidden of [
      "100.00",
      "provider",
      "card",
      "refund amount",
      "guest@example.com",
      "+502",
    ]) {
      assert.equal(
        persistedText.includes(forbidden),
        false,
        `Financial push notification should not expose ${forbidden}`,
      );
    }
  }
});

test("I.6.1 schema and migration add only the planned enum values", () => {
  assert.ok(
    enumValues("CronJobKey").includes("EXPIRE_GUEST_PAYMENT_REQUESTS"),
  );
  assert.ok(
    enumValues("AdminNotificationType").includes("ADDITIONAL_CHARGE_PAID"),
  );
  assert.ok(
    enumValues("AdminNotificationType").includes(
      "LIFECYCLE_ADJUSTMENT_PAID",
    ),
  );
  assert.ok(enumValues("AdminNotificationType").includes("REFUND_PROCESSED"));

  const migration = read(
    "prisma/migrations/20261005130000_final_i_6_1_financial_operations_hardening/migration.sql",
  );

  assert.match(migration, /ALTER TYPE "cron_job_key"/);
  assert.match(migration, /ALTER TYPE "admin_notification_type"/);
  assert.doesNotMatch(
    migration,
    /\bCREATE\s+(?:TABLE|INDEX)|\bADD\s+COLUMN|\bALTER\s+TABLE/i,
  );
});

test("I.6.1 wires financial notification triggers at commit-safe boundaries", () => {
  const gprPayment = read("lib/payments/guest-payment-request-payment.ts");
  const lifecycleCompletion = read(
    "lib/reservations/date-mutation-completion.ts",
  );
  const refunds = read("lib/admin/refunds.ts");
  const lifecycleRefunds = read(
    "lib/admin/lifecycle-adjustment-refund-workflow.ts",
  );

  assert.ok(
    gprPayment.includes("ensureAdditionalChargePaidAdminNotificationIntent"),
  );
  assert.ok(gprPayment.includes("adminNotificationIds: []"));
  assert.ok(gprPayment.includes("deliverAdminPushNotificationsBestEffort"));
  assert.ok(
    lifecycleCompletion.includes(
      "positiveArtifacts\n    ? await ensureLifecycleAdjustmentPaidAdminNotificationIntent",
    ),
  );
  assert.ok(
    lifecycleCompletion.includes(
      "completeApprovedZeroDateMutationInTransaction",
    ),
  );
  assert.ok(refunds.includes("input.outcome === \"APPROVED\""));
  assert.ok(refunds.includes("ensureRefundProcessedAdminNotificationIntent"));
  assert.ok(lifecycleRefunds.includes("input.outcome === \"APPROVED\""));
  assert.ok(
    lifecycleRefunds.includes("ensureRefundProcessedAdminNotificationIntent"),
  );
});
