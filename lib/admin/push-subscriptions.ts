import { Prisma, type PrismaClient } from "@prisma/client";
import * as webPush from "web-push";
import { z } from "zod";

import { getWebPushEnv } from "@/lib/env/server";
import { prisma } from "@/lib/db/prisma";
import type { AdminActor } from "@/types/admin";
import type { Locale } from "@/types/locale";

import { resolveAdminActor } from "./admin-actor";

export type AdminPushErrorCode =
  | "ADMIN_UNAUTHORIZED"
  | "ADMIN_PUSH_ORIGIN_INVALID"
  | "INVALID_ADMIN_PUSH_REQUEST"
  | "ADMIN_PUSH_CONFIGURATION_INVALID"
  | "ADMIN_PUSH_UNAVAILABLE"
  | "ADMIN_PUSH_SUBSCRIPTION_OWNERSHIP_CONFLICT"
  | "ADMIN_PUSH_SUBSCRIPTION_NOT_FOUND"
  | "ADMIN_PUSH_SUBSCRIPTION_EXPIRED"
  | "ADMIN_PUSH_TEST_SEND_FAILED"
  | "ADMIN_PUSH_UNEXPECTED_ERROR";

export class AdminPushError extends Error {
  constructor(readonly code: AdminPushErrorCode) {
    super(code);
  }
}

type AdminPushQueryClient = PrismaClient | Prisma.TransactionClient;

export const adminPushEndpointSchema = z
  .string()
  .trim()
  .min(1)
  .max(2_048)
  .url()
  .refine((value) => new URL(value).protocol === "https:", {
    message: "Push endpoint must use HTTPS.",
  });

export const adminPushSubscriptionInputSchema = z
  .object({
    endpoint: adminPushEndpointSchema,
    keys: z
      .object({
        p256dh: z.string().trim().min(1).max(512),
        auth: z.string().trim().min(1).max(512),
      })
      .strict(),
  })
  .strict();

export const adminPushEndpointInputSchema = z
  .object({
    endpoint: adminPushEndpointSchema,
  })
  .strict();

export const adminPushTestInputSchema = adminPushEndpointInputSchema.extend({
  locale: z.enum(["es", "en"]),
});

export type AdminPushSubscriptionInput = z.infer<
  typeof adminPushSubscriptionInputSchema
>;
export type AdminPushEndpointInput = z.infer<typeof adminPushEndpointInputSchema>;
export type AdminPushTestInput = z.infer<typeof adminPushTestInputSchema>;

type AdminPushConfig =
  | Readonly<{
      configured: false;
      vapidPublicKey: null;
    }>
  | Readonly<{
      configured: true;
      vapidPublicKey: string;
    }>;

type AdminPushSubscriptionStatus = Readonly<{
  registered: boolean;
}>;

type AdminPushTestResult = Readonly<{
  sent: true;
}>;

function toConfigurationError(error: unknown): never {
  if (error instanceof z.ZodError) {
    throw new AdminPushError("ADMIN_PUSH_CONFIGURATION_INVALID");
  }

  throw new AdminPushError("ADMIN_PUSH_CONFIGURATION_INVALID");
}

function getValidatedWebPushEnv() {
  try {
    return getWebPushEnv();
  } catch (error) {
    return toConfigurationError(error);
  }
}

function normalizeSubscriptionInput(
  input: AdminPushSubscriptionInput,
): AdminPushSubscriptionInput {
  return {
    endpoint: input.endpoint.trim(),
    keys: {
      p256dh: input.keys.p256dh.trim(),
      auth: input.keys.auth.trim(),
    },
  };
}

async function getCurrentAdminUser(
  prismaClient: AdminPushQueryClient,
  actor: AdminActor,
) {
  try {
    return await resolveAdminActor(prismaClient, actor);
  } catch {
    throw new AdminPushError("ADMIN_UNAUTHORIZED");
  }
}

export function getAdminPushConfig(): AdminPushConfig {
  const env = getValidatedWebPushEnv();

  if (!env.configured) {
    return {
      configured: false,
      vapidPublicKey: null,
    };
  }

  return {
    configured: true,
    vapidPublicKey: env.publicKey,
  };
}

export async function getAdminPushSubscriptionStatus(
  input: AdminPushEndpointInput,
  actor: AdminActor,
  prismaClient: AdminPushQueryClient = prisma,
): Promise<AdminPushSubscriptionStatus> {
  const user = await getCurrentAdminUser(prismaClient, actor);
  const endpoint = input.endpoint.trim();

  const subscription = await prismaClient.adminPushSubscription.findUnique({
    where: { endpoint },
    select: {
      userId: true,
      active: true,
    },
  });

  return {
    registered: subscription?.userId === user.id && subscription.active,
  };
}

export async function registerAdminPushSubscription(
  input: AdminPushSubscriptionInput,
  actor: AdminActor,
  prismaClient: PrismaClient = prisma,
): Promise<AdminPushSubscriptionStatus> {
  const normalizedInput = normalizeSubscriptionInput(input);
  const now = new Date();

  await prismaClient.$transaction(async (transaction) => {
    const user = await getCurrentAdminUser(transaction, actor);
    const existing = await transaction.adminPushSubscription.findUnique({
      where: { endpoint: normalizedInput.endpoint },
      select: {
        id: true,
        userId: true,
      },
    });

    if (existing && existing.userId !== user.id) {
      throw new AdminPushError("ADMIN_PUSH_SUBSCRIPTION_OWNERSHIP_CONFLICT");
    }

    if (existing) {
      await transaction.adminPushSubscription.update({
        where: { id: existing.id },
        data: {
          p256dhKey: normalizedInput.keys.p256dh,
          authKey: normalizedInput.keys.auth,
          active: true,
          revokedAt: null,
          lastUsedAt: now,
        },
      });
      return;
    }

    await transaction.adminPushSubscription.create({
      data: {
        userId: user.id,
        endpoint: normalizedInput.endpoint,
        p256dhKey: normalizedInput.keys.p256dh,
        authKey: normalizedInput.keys.auth,
        active: true,
        lastUsedAt: now,
      },
    });
  });

  return { registered: true };
}

export async function revokeAdminPushSubscription(
  input: AdminPushEndpointInput,
  actor: AdminActor,
  prismaClient: PrismaClient = prisma,
): Promise<AdminPushSubscriptionStatus> {
  const endpoint = input.endpoint.trim();
  const now = new Date();

  await prismaClient.$transaction(async (transaction) => {
    const user = await getCurrentAdminUser(transaction, actor);
    const existing = await transaction.adminPushSubscription.findUnique({
      where: { endpoint },
      select: {
        id: true,
        userId: true,
      },
    });

    if (existing && existing.userId !== user.id) {
      throw new AdminPushError("ADMIN_PUSH_SUBSCRIPTION_OWNERSHIP_CONFLICT");
    }

    if (!existing) {
      return;
    }

    await transaction.adminPushSubscription.update({
      where: { id: existing.id },
      data: {
        active: false,
        revokedAt: now,
      },
    });
  });

  return { registered: false };
}

function getPushCopy(locale: Locale): Readonly<{
  title: string;
  body: string;
  targetPath: string;
}> {
  if (locale === "en") {
    return {
      title: "TRP Admin",
      body: "Notifications are working on this device.",
      targetPath: "/admin/notifications",
    };
  }

  return {
    title: "TRP Admin",
    body: "Las notificaciones de este dispositivo están funcionando.",
    targetPath: "/admin/notifications",
  };
}

function getWebPushStatusCode(error: unknown): number | null {
  if (error instanceof webPush.WebPushError) {
    return error.statusCode;
  }

  if (
    typeof error === "object" &&
    error !== null &&
    "statusCode" in error &&
    typeof error.statusCode === "number"
  ) {
    return error.statusCode;
  }

  return null;
}

export async function sendAdminPushTestNotification(
  input: AdminPushTestInput,
  actor: AdminActor,
  prismaClient: AdminPushQueryClient = prisma,
): Promise<AdminPushTestResult> {
  const env = getValidatedWebPushEnv();

  if (!env.configured) {
    throw new AdminPushError("ADMIN_PUSH_UNAVAILABLE");
  }

  const user = await getCurrentAdminUser(prismaClient, actor);
  const endpoint = input.endpoint.trim();
  const subscription = await prismaClient.adminPushSubscription.findFirst({
    where: {
      endpoint,
      userId: user.id,
      active: true,
    },
    select: {
      id: true,
      endpoint: true,
      p256dhKey: true,
      authKey: true,
    },
  });

  if (!subscription) {
    throw new AdminPushError("ADMIN_PUSH_SUBSCRIPTION_NOT_FOUND");
  }

  webPush.setVapidDetails(env.subject, env.publicKey, env.privateKey);

  try {
    await webPush.sendNotification(
      {
        endpoint: subscription.endpoint,
        keys: {
          p256dh: subscription.p256dhKey,
          auth: subscription.authKey,
        },
      },
      JSON.stringify(getPushCopy(input.locale)),
      {
        TTL: 60,
        urgency: "normal",
        topic: "trp-admin-test",
      },
    );

    await prismaClient.adminPushSubscription.update({
      where: { id: subscription.id },
      data: {
        lastUsedAt: new Date(),
      },
    });

    return { sent: true };
  } catch (error) {
    const statusCode = getWebPushStatusCode(error);

    if (statusCode === 404 || statusCode === 410) {
      await prismaClient.adminPushSubscription.update({
        where: { id: subscription.id },
        data: {
          active: false,
          revokedAt: new Date(),
        },
      });

      throw new AdminPushError("ADMIN_PUSH_SUBSCRIPTION_EXPIRED");
    }

    throw new AdminPushError("ADMIN_PUSH_TEST_SEND_FAILED");
  }
}
