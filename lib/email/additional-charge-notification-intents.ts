import {
  EmailNotificationOrigin,
  EmailNotificationStatus,
  EmailNotificationType,
  Prisma,
} from "@prisma/client";
import { z } from "zod";

import { environmentConfig } from "@/config/site";

const recipientSchema = z
  .string()
  .trim()
  .email()
  .max(160)
  .transform((value) => value.toLowerCase());

export const additionalChargeNotificationTypeValues = [
  EmailNotificationType.ADDITIONAL_CHARGE_PAYMENT_REQUIRED,
  EmailNotificationType.ADMIN_ADDITIONAL_CHARGE_PAYMENT_REQUIRED,
  EmailNotificationType.ADDITIONAL_CHARGE_PAYMENT_APPROVED,
  EmailNotificationType.ADMIN_ADDITIONAL_CHARGE_PAYMENT_APPROVED,
  EmailNotificationType.ADDITIONAL_CHARGE_REFUND_PROCESSED,
  EmailNotificationType.ADMIN_ADDITIONAL_CHARGE_REFUND_PROCESSED,
] as const;

type AdditionalChargeNotificationType =
  (typeof additionalChargeNotificationTypeValues)[number];

type AdditionalChargeNotificationIntent = Readonly<{
  id: string;
  type: AdditionalChargeNotificationType;
  recipient: string;
  locale: "es" | "en";
  status: EmailNotificationStatus;
  created: boolean;
}>;

type AdditionalChargeNotificationRouting = Readonly<{
  adminRecipients: readonly string[];
  adminLocale: "es" | "en";
}>;

const notificationPrefixes = {
  [EmailNotificationType.ADDITIONAL_CHARGE_PAYMENT_REQUIRED]:
    "additional-charge-payment-required",
  [EmailNotificationType.ADMIN_ADDITIONAL_CHARGE_PAYMENT_REQUIRED]:
    "admin-additional-charge-payment-required",
  [EmailNotificationType.ADDITIONAL_CHARGE_PAYMENT_APPROVED]:
    "additional-charge-payment-approved",
  [EmailNotificationType.ADMIN_ADDITIONAL_CHARGE_PAYMENT_APPROVED]:
    "admin-additional-charge-payment-approved",
  [EmailNotificationType.ADDITIONAL_CHARGE_REFUND_PROCESSED]:
    "additional-charge-refund-processed",
  [EmailNotificationType.ADMIN_ADDITIONAL_CHARGE_REFUND_PROCESSED]:
    "admin-additional-charge-refund-processed",
} as const satisfies Readonly<Record<AdditionalChargeNotificationType, string>>;

function normalizeRecipient(value: string): string {
  const parsed = recipientSchema.safeParse(value);

  if (!parsed.success) {
    throw new TypeError("Invalid additional-charge notification recipient.");
  }

  return parsed.data;
}

function normalizeLocale(value: string): "es" | "en" {
  return value === "en" ? "en" : "es";
}

function getConfiguredAdminRecipients(source: NodeJS.ProcessEnv): string[] {
  const configuredRecipients = source.EMAIL_ADMIN_RECIPIENTS?.split(",") ?? [];
  const validRecipients = configuredRecipients.flatMap((recipient) => {
    const parsed = recipientSchema.safeParse(recipient);
    return parsed.success ? [parsed.data] : [];
  });

  return Array.from(new Set(validRecipients));
}

function getEnvironmentAdminFallback(source: NodeJS.ProcessEnv): string {
  return source.TRP_ENVIRONMENT === "production"
    ? environmentConfig.production.adminEmail
    : environmentConfig.test.adminEmail;
}

function resolveAdditionalChargeNotificationRouting(
  source: NodeJS.ProcessEnv = process.env,
): AdditionalChargeNotificationRouting {
  const configuredRecipients = getConfiguredAdminRecipients(source);

  return {
    adminRecipients:
      configuredRecipients.length > 0
        ? configuredRecipients
        : [getEnvironmentAdminFallback(source)],
    adminLocale: source.EMAIL_ADMIN_LOCALE === "en" ? "en" : "es",
  };
}

function buildAdditionalChargeNotificationKey(
  input: Readonly<{
    type: AdditionalChargeNotificationType;
    guestPaymentRequestId?: string | null;
    refundId?: string | null;
    recipient: string;
  }>,
): string {
  const relationId =
    input.type === EmailNotificationType.ADDITIONAL_CHARGE_REFUND_PROCESSED ||
    input.type === EmailNotificationType.ADMIN_ADDITIONAL_CHARGE_REFUND_PROCESSED
      ? input.refundId?.trim()
      : input.guestPaymentRequestId?.trim();

  if (!relationId) {
    throw new TypeError("Missing additional-charge notification relation.");
  }

  return `${notificationPrefixes[input.type]}/${relationId}/${normalizeRecipient(
    input.recipient,
  )}`;
}

export function buildAdditionalChargePaymentRequiredNotificationKey(
  requestId: string,
  recipient: string,
): string {
  return buildAdditionalChargeNotificationKey({
    type: EmailNotificationType.ADDITIONAL_CHARGE_PAYMENT_REQUIRED,
    guestPaymentRequestId: requestId,
    recipient,
  });
}

async function createAdditionalChargeNotificationIntent(
  transaction: Prisma.TransactionClient,
  input: Readonly<{
    reservationId: string;
    guestPaymentRequestId: string;
    refundId?: string | null;
    type: AdditionalChargeNotificationType;
    recipient: string;
    locale: "es" | "en";
  }>,
): Promise<AdditionalChargeNotificationIntent> {
  const recipient = normalizeRecipient(input.recipient);
  const deduplicationKey = buildAdditionalChargeNotificationKey({
    type: input.type,
    guestPaymentRequestId: input.guestPaymentRequestId,
    refundId: input.refundId,
    recipient,
  });
  const existing = await transaction.emailNotification.findUnique({
    where: { deduplicationKey },
    select: {
      id: true,
      reservationId: true,
      guestPaymentRequestId: true,
      refundId: true,
      type: true,
      recipient: true,
      locale: true,
      status: true,
    },
  });

  if (existing) {
    if (
      existing.reservationId !== input.reservationId ||
      existing.guestPaymentRequestId !== input.guestPaymentRequestId ||
      existing.refundId !== (input.refundId ?? null) ||
      existing.type !== input.type ||
      existing.recipient !== recipient ||
      existing.locale !== input.locale
    ) {
      throw new TypeError(
        "Additional-charge notification deduplication conflict.",
      );
    }

    return {
      id: existing.id,
      type: input.type,
      recipient: existing.recipient,
      locale: normalizeLocale(existing.locale),
      status: existing.status,
      created: false,
    };
  }

  const notification = await transaction.emailNotification.create({
    data: {
      reservationId: input.reservationId,
      guestPaymentRequestId: input.guestPaymentRequestId,
      refundId: input.refundId ?? null,
      type: input.type,
      recipient,
      locale: input.locale,
      deduplicationKey,
      origin: EmailNotificationOrigin.AUTOMATIC,
      status: EmailNotificationStatus.PENDING,
    },
    select: {
      id: true,
      type: true,
      recipient: true,
      locale: true,
      status: true,
    },
  });

  return {
    id: notification.id,
    type: input.type,
    recipient: notification.recipient,
    locale: normalizeLocale(notification.locale),
    status: notification.status,
    created: true,
  };
}

export async function createAdditionalChargePaymentRequiredNotificationIntent(
  transaction: Prisma.TransactionClient,
  input: Readonly<{
    reservationId: string;
    guestPaymentRequestId: string;
    recipient: string;
    locale: "es" | "en";
  }>,
): Promise<Readonly<{ id: string; created: boolean }>> {
  const intent = await createAdditionalChargeNotificationIntent(transaction, {
    reservationId: input.reservationId,
    guestPaymentRequestId: input.guestPaymentRequestId,
    type: EmailNotificationType.ADDITIONAL_CHARGE_PAYMENT_REQUIRED,
    recipient: input.recipient,
    locale: input.locale,
  });

  return { id: intent.id, created: intent.created };
}

export async function createAdditionalChargePaymentRequestNotificationIntents(
  transaction: Prisma.TransactionClient,
  input: Readonly<{
    reservationId: string;
    guestPaymentRequestId: string;
    guestEmail: string;
    preferredLocale: string;
  }>,
  source: NodeJS.ProcessEnv = process.env,
): Promise<readonly AdditionalChargeNotificationIntent[]> {
  const routing = resolveAdditionalChargeNotificationRouting(source);
  const guestLocale = normalizeLocale(input.preferredLocale);
  const intents: AdditionalChargeNotificationIntent[] = [];

  intents.push(
    await createAdditionalChargeNotificationIntent(transaction, {
      reservationId: input.reservationId,
      guestPaymentRequestId: input.guestPaymentRequestId,
      type: EmailNotificationType.ADDITIONAL_CHARGE_PAYMENT_REQUIRED,
      recipient: input.guestEmail,
      locale: guestLocale,
    }),
  );

  for (const recipient of routing.adminRecipients) {
    intents.push(
      await createAdditionalChargeNotificationIntent(transaction, {
        reservationId: input.reservationId,
        guestPaymentRequestId: input.guestPaymentRequestId,
        type: EmailNotificationType.ADMIN_ADDITIONAL_CHARGE_PAYMENT_REQUIRED,
        recipient,
        locale: routing.adminLocale,
      }),
    );
  }

  return intents;
}

export async function createAdditionalChargePaymentApprovedNotificationIntents(
  transaction: Prisma.TransactionClient,
  input: Readonly<{
    reservationId: string;
    guestPaymentRequestId: string;
    guestEmail: string;
    preferredLocale: string;
  }>,
  source: NodeJS.ProcessEnv = process.env,
): Promise<readonly AdditionalChargeNotificationIntent[]> {
  const routing = resolveAdditionalChargeNotificationRouting(source);
  const guestLocale = normalizeLocale(input.preferredLocale);
  const intents: AdditionalChargeNotificationIntent[] = [];

  intents.push(
    await createAdditionalChargeNotificationIntent(transaction, {
      reservationId: input.reservationId,
      guestPaymentRequestId: input.guestPaymentRequestId,
      type: EmailNotificationType.ADDITIONAL_CHARGE_PAYMENT_APPROVED,
      recipient: input.guestEmail,
      locale: guestLocale,
    }),
  );

  for (const recipient of routing.adminRecipients) {
    intents.push(
      await createAdditionalChargeNotificationIntent(transaction, {
        reservationId: input.reservationId,
        guestPaymentRequestId: input.guestPaymentRequestId,
        type: EmailNotificationType.ADMIN_ADDITIONAL_CHARGE_PAYMENT_APPROVED,
        recipient,
        locale: routing.adminLocale,
      }),
    );
  }

  return intents;
}

export async function createAdditionalChargeRefundProcessedNotificationIntents(
  transaction: Prisma.TransactionClient,
  input: Readonly<{
    reservationId: string;
    guestPaymentRequestId: string;
    refundId: string;
    guestEmail: string;
    preferredLocale: string;
  }>,
  source: NodeJS.ProcessEnv = process.env,
): Promise<readonly AdditionalChargeNotificationIntent[]> {
  const routing = resolveAdditionalChargeNotificationRouting(source);
  const guestLocale = normalizeLocale(input.preferredLocale);
  const intents: AdditionalChargeNotificationIntent[] = [];

  intents.push(
    await createAdditionalChargeNotificationIntent(transaction, {
      reservationId: input.reservationId,
      guestPaymentRequestId: input.guestPaymentRequestId,
      refundId: input.refundId,
      type: EmailNotificationType.ADDITIONAL_CHARGE_REFUND_PROCESSED,
      recipient: input.guestEmail,
      locale: guestLocale,
    }),
  );

  for (const recipient of routing.adminRecipients) {
    intents.push(
      await createAdditionalChargeNotificationIntent(transaction, {
        reservationId: input.reservationId,
        guestPaymentRequestId: input.guestPaymentRequestId,
        refundId: input.refundId,
        type: EmailNotificationType.ADMIN_ADDITIONAL_CHARGE_REFUND_PROCESSED,
        recipient,
        locale: routing.adminLocale,
      }),
    );
  }

  return intents;
}
