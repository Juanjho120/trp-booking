import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";

import {
  AdminNotificationType,
  CronJobExecutionStatus,
  CronJobKey,
  CronJobTriggerSource,
} from "@prisma/client";

import { prisma } from "@/lib/db/prisma";

import { test } from "./harness";

function assertTestEnvironment(): void {
  assert.equal(
    process.env.TRP_ENVIRONMENT,
    "test",
    "final-i:db:validate must run only with TRP_ENVIRONMENT=test.",
  );

  const databaseUrl = process.env.DATABASE_URL ?? "";

  assert.ok(databaseUrl, "DATABASE_URL must be configured for DB validation.");
  assert.doesNotMatch(
    databaseUrl,
    /production|prod|turefugioperfecto/i,
    "Refusing to run Final-I DB validation against a production-looking database URL.",
  );
}

test("I.6.1 DB persists GPR expiration cron and financial AdminNotification enum values", async () => {
  assertTestEnvironment();

  const prefix = `i61db-${Date.now()}-${randomUUID().slice(0, 8)}`;
  const cronId = `${prefix}-cron`;
  const notificationIds = [
    `${prefix}-additional`,
    `${prefix}-lifecycle`,
    `${prefix}-refund`,
  ];

  try {
    const rows = await prisma.$queryRaw<
      Array<{ typname: string; enumlabel: string }>
    >`
      SELECT t.typname, e.enumlabel
      FROM pg_type t
      JOIN pg_enum e ON e.enumtypid = t.oid
      WHERE t.typname IN ('cron_job_key', 'admin_notification_type')
    `;
    const labels = new Set(rows.map((row) => `${row.typname}:${row.enumlabel}`));

    assert.ok(labels.has("cron_job_key:EXPIRE_GUEST_PAYMENT_REQUESTS"));
    assert.ok(labels.has("admin_notification_type:ADDITIONAL_CHARGE_PAID"));
    assert.ok(labels.has("admin_notification_type:LIFECYCLE_ADJUSTMENT_PAID"));
    assert.ok(labels.has("admin_notification_type:REFUND_PROCESSED"));

    await prisma.cronJobExecution.create({
      data: {
        id: cronId,
        jobKey: CronJobKey.EXPIRE_GUEST_PAYMENT_REQUESTS,
        triggerSource: CronJobTriggerSource.MANUAL,
        businessEnvironment: "test",
        status: CronJobExecutionStatus.SUCCESS,
        startedAt: new Date("2026-10-05T12:00:00.000Z"),
        finishedAt: new Date("2026-10-05T12:00:01.000Z"),
        durationMs: 1000,
        resultJson: { expiredCount: 0, expiredAt: "2026-10-05T12:00:00.000Z" },
      },
    });

    await prisma.adminNotification.createMany({
      data: [
        {
          id: notificationIds[0],
          type: AdminNotificationType.ADDITIONAL_CHARGE_PAID,
          deduplicationKey: `${prefix}/additional`,
          title: "Pago de cargo adicional recibido · Ada · Bungalow",
          body: "Toca para ver detalles.",
          targetPath: "/admin/reservations/test",
        },
        {
          id: notificationIds[1],
          type: AdminNotificationType.LIFECYCLE_ADJUSTMENT_PAID,
          deduplicationKey: `${prefix}/lifecycle`,
          title: "Pago de ajuste de estadía recibido · Ada · Bungalow",
          body: "Toca para ver detalles.",
          targetPath: "/admin/reservations/test",
        },
        {
          id: notificationIds[2],
          type: AdminNotificationType.REFUND_PROCESSED,
          deduplicationKey: `${prefix}/refund`,
          title: "Reembolso procesado · Ada · Bungalow",
          body: "Toca para ver detalles.",
          targetPath: "/admin/reservations/test",
        },
      ],
    });

    assert.equal(
      await prisma.cronJobExecution.count({
        where: { jobKey: CronJobKey.EXPIRE_GUEST_PAYMENT_REQUESTS },
      }),
      1,
    );
    assert.equal(
      await prisma.adminNotification.count({
        where: {
          id: { in: notificationIds },
          type: {
            in: [
              AdminNotificationType.ADDITIONAL_CHARGE_PAID,
              AdminNotificationType.LIFECYCLE_ADJUSTMENT_PAID,
              AdminNotificationType.REFUND_PROCESSED,
            ],
          },
        },
      }),
      3,
    );
  } finally {
    await prisma.adminNotification.deleteMany({
      where: { id: { in: notificationIds } },
    });
    await prisma.cronJobExecution.deleteMany({ where: { id: cronId } });
  }
});
