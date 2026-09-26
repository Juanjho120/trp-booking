import { createHash } from "node:crypto";
import {
  AdminNotificationType,
  AdminPushDeliveryStatus,
  type Prisma,
  type PrismaClient,
} from "@prisma/client";

import { environmentConfig } from "@/config/site";
import {
  deliverAdminPushNotificationsBestEffort,
  resolveAdminNotificationTarget,
} from "@/lib/admin-notifications";
import { prisma } from "@/lib/db/prisma";
import {
  getZohoMailWebhookEnv,
  type TrpEnvironment,
} from "@/lib/env/server";

import {
  ZohoLimitedDataError,
  parseZohoLimitedInboundEmailPayload,
  type ZohoLimitedInboundEmail,
} from "./limited-data";
import {
  decryptZohoMailWebhookSecret,
  encryptZohoMailWebhookSecret,
} from "./webhook-secret-crypto";
import {
  constantTimeEqualString,
  verifyZohoMailWebhookSignature,
} from "./webhook-signature";

export type ZohoMailWebhookErrorCode =
  | "ZOHO_MAIL_WEBHOOK_UNAVAILABLE"
  | "ZOHO_MAIL_PAYLOAD_TOO_LARGE"
  | "ZOHO_MAIL_SIGNATURE_MISSING"
  | "ZOHO_MAIL_SIGNATURE_INVALID"
  | "ZOHO_MAIL_BOOTSTRAP_INVALID"
  | "ZOHO_MAIL_JSON_MALFORMED"
  | "ZOHO_MAIL_LIMITED_DATA_MALFORMED"
  | "ZOHO_MAIL_FULL_CONTENT_PAYLOAD"
  | "ZOHO_MAIL_WEBHOOK_UNEXPECTED_ERROR";

export type ZohoMailWebhookIgnoredReason =
  | "recipient_outside_correspondence_domain"
  | "internal_sender";

export type ZohoMailWebhookOutcome =
  | Readonly<{ status: "bootstrapped" }>
  | Readonly<{ status: "ignored"; reason: ZohoMailWebhookIgnoredReason }>
  | Readonly<{
      status: "processed" | "duplicate";
      eventId: string;
      notificationId: string;
      reservationId: string | null;
    }>;

type ZohoMailWebhookDeliver = typeof deliverAdminPushNotificationsBestEffort;

type ReservationMatch = Readonly<{
  id: string;
  propertyNameEs: string;
  propertyNameEn: string;
}> | null;

type AdminPushPersistenceClient = Pick<
  Prisma.TransactionClient,
  | "adminNotification"
  | "adminPushDelivery"
  | "adminPushSubscription"
  | "zohoInboundEmailEvent"
>;

export class ZohoMailWebhookError extends Error {
  constructor(
    readonly code: ZohoMailWebhookErrorCode,
    readonly status: number,
  ) {
    super(code);
    this.name = "ZohoMailWebhookError";
  }
}

function businessEnvironmentFor(
  trpEnvironment: TrpEnvironment,
): "local" | "test" | "production" {
  return trpEnvironment;
}

function correspondenceDomainFor(trpEnvironment: TrpEnvironment): string {
  return trpEnvironment === "production"
    ? environmentConfig.production.correspondenceDomain
    : environmentConfig.test.correspondenceDomain;
}

function emailDomainFor(address: string): string {
  const parts = address.trim().toLowerCase().split("@");

  return parts.length === 2 ? (parts[1] ?? "") : "";
}

export function getAcceptedZohoMailRecipientDomain(
  trpEnvironment: TrpEnvironment,
): string {
  return correspondenceDomainFor(trpEnvironment);
}

export function getAcceptedZohoMailRecipientAddresses(
  trpEnvironment: TrpEnvironment,
): readonly string[] {
  const domain = correspondenceDomainFor(trpEnvironment);

  return [
    `admin@${domain}`,
    `reservas@${domain}`,
    `reservations@${domain}`,
  ];
}

export function isAcceptedZohoMailRecipient(
  input: Readonly<{
    toAddresses: readonly string[];
    trpEnvironment: TrpEnvironment;
  }>,
): boolean {
  const acceptedDomain = getAcceptedZohoMailRecipientDomain(
    input.trpEnvironment,
  );

  return input.toAddresses.some(
    (address) => emailDomainFor(address) === acceptedDomain,
  );
}

export function isInternalZohoMailSender(
  input: Readonly<{
    fromAddress: string;
    trpEnvironment: TrpEnvironment;
  }>,
): boolean {
  const domain = getAcceptedZohoMailRecipientDomain(input.trpEnvironment);
  const senderDomain = emailDomainFor(input.fromAddress);

  return senderDomain === domain;
}

export function fingerprintZohoMailLimitedDataRawBody(rawBody: string): string {
  return createHash("sha256").update(rawBody, "utf8").digest("hex");
}

export function buildZohoMailInboundDeduplicationKey(
  eventFingerprint: string,
): string {
  return `zoho-mail-inbound/${eventFingerprint}`;
}

function parseVerifiedJsonPayload(rawBody: string): unknown {
  try {
    return JSON.parse(rawBody) as unknown;
  } catch {
    throw new ZohoMailWebhookError("ZOHO_MAIL_JSON_MALFORMED", 400);
  }
}

function requireSignatureHeader(signatureHeader: string | null | undefined): void {
  if (!signatureHeader?.trim()) {
    throw new ZohoMailWebhookError("ZOHO_MAIL_SIGNATURE_MISSING", 401);
  }
}

function requireVerifiedSignature(
  input: Readonly<{
    rawBody: string;
    hookSecret: string;
    signatureHeader: string | null | undefined;
  }>,
): void {
  requireSignatureHeader(input.signatureHeader);

  if (!verifyZohoMailWebhookSignature(input)) {
    throw new ZohoMailWebhookError("ZOHO_MAIL_SIGNATURE_INVALID", 403);
  }
}

function verifyBootstrapSignatureIfPresent(
  input: Readonly<{
    rawBody: string;
    hookSecret: string;
    signatureHeader: string | null | undefined;
  }>,
): void {
  if (!input.signatureHeader?.trim()) {
    return;
  }

  if (!verifyZohoMailWebhookSignature(input)) {
    throw new ZohoMailWebhookError("ZOHO_MAIL_SIGNATURE_INVALID", 403);
  }
}

function readAdminLocale(source: NodeJS.ProcessEnv): "es" | "en" {
  return source.EMAIL_ADMIN_LOCALE === "en" ? "en" : "es";
}

function buildGuestEmailReceivedCopy(
  input: Readonly<{
    reservationMatch: ReservationMatch;
    source: NodeJS.ProcessEnv;
  }>,
): Readonly<{ title: string; body: string }> {
  const locale = readAdminLocale(input.source);

  if (locale === "en") {
    return {
      title: input.reservationMatch
        ? `New guest email · ${input.reservationMatch.propertyNameEn}`
        : "New guest email",
      body: "Tap to review correspondence.",
    };
  }

  return {
    title: input.reservationMatch
      ? `Nuevo correo de huésped · ${input.reservationMatch.propertyNameEs}`
      : "Nuevo correo de huésped",
    body: "Toca para revisar la correspondencia.",
  };
}

function normalizeNotificationText(value: string, maximumLength: number): string {
  return value.trim().replace(/\s+/g, " ").slice(0, maximumLength);
}

async function findUniqueReservationForSender(
  prismaClient: PrismaClient,
  fromAddress: string,
): Promise<ReservationMatch> {
  const reservations = await prismaClient.reservation.findMany({
    where: {
      guestEmail: {
        equals: fromAddress,
        mode: "insensitive",
      },
    },
    orderBy: [{ createdAt: "desc" }, { id: "desc" }],
    take: 2,
    select: {
      id: true,
      property: {
        select: {
          nameEs: true,
          nameEn: true,
        },
      },
    },
  });

  if (reservations.length !== 1) {
    return null;
  }

  return {
    id: reservations[0].id,
    propertyNameEs: reservations[0].property.nameEs,
    propertyNameEn: reservations[0].property.nameEn,
  };
}

async function ensureGuestEmailReceivedNotification(
  transaction: AdminPushPersistenceClient,
  input: Readonly<{
    event: ZohoLimitedInboundEmail;
    eventFingerprint: string;
    reservationMatch: ReservationMatch;
    source: NodeJS.ProcessEnv;
  }>,
): Promise<
  Readonly<{
    created: boolean;
    eventId: string;
    notificationId: string;
    reservationId: string | null;
  }>
> {
  await transaction.zohoInboundEmailEvent.createMany({
    data: {
      eventFingerprint: input.eventFingerprint,
      fromAddress: input.event.fromAddress,
      toAddress: input.event.toAddress,
      subject: input.event.subject,
      receivedAt: input.event.receivedAt,
      reservationId: input.reservationMatch?.id ?? null,
    },
    skipDuplicates: true,
  });

  const event = await transaction.zohoInboundEmailEvent.findUnique({
    where: { eventFingerprint: input.eventFingerprint },
    select: {
      id: true,
      reservationId: true,
      adminNotification: {
        select: { id: true },
      },
    },
  });

  if (!event) {
    throw new TypeError("Zoho inbound email event was not persisted.");
  }

  if (event.adminNotification) {
    return {
      created: false,
      eventId: event.id,
      notificationId: event.adminNotification.id,
      reservationId: event.reservationId,
    };
  }

  const deduplicationKey = buildZohoMailInboundDeduplicationKey(
    input.eventFingerprint,
  );
  const targetPath = input.reservationMatch
    ? resolveAdminNotificationTarget({
        kind: "reservation",
        reservationId: input.reservationMatch.id,
      }).targetPath
    : resolveAdminNotificationTarget({ kind: "notifications" }).targetPath;
  const copy = buildGuestEmailReceivedCopy({
    reservationMatch: input.reservationMatch,
    source: input.source,
  });
  const creation = await transaction.adminNotification.createMany({
    data: {
      type: AdminNotificationType.GUEST_EMAIL_RECEIVED,
      reservationId: input.reservationMatch?.id ?? null,
      reviewId: null,
      zohoInboundEmailEventId: event.id,
      deduplicationKey,
      title: normalizeNotificationText(copy.title, 160),
      body: normalizeNotificationText(copy.body, 240),
      targetPath,
    },
    skipDuplicates: true,
  });
  const notification = await transaction.adminNotification.findUnique({
    where: { deduplicationKey },
    select: {
      id: true,
      type: true,
      reservationId: true,
      zohoInboundEmailEventId: true,
      targetPath: true,
    },
  });

  if (!notification) {
    throw new TypeError("Zoho inbound email notification was not persisted.");
  }

  if (
    notification.type !== AdminNotificationType.GUEST_EMAIL_RECEIVED ||
    notification.reservationId !== (input.reservationMatch?.id ?? null) ||
    notification.zohoInboundEmailEventId !== event.id ||
    notification.targetPath !== targetPath
  ) {
    throw new TypeError("Zoho inbound email notification deduplication conflict.");
  }

  if (creation.count === 1) {
    const subscriptions = await transaction.adminPushSubscription.findMany({
      where: { active: true },
      select: { id: true },
    });

    if (subscriptions.length > 0) {
      await transaction.adminPushDelivery.createMany({
        data: subscriptions.map((subscription) => ({
          notificationId: notification.id,
          subscriptionId: subscription.id,
          status: AdminPushDeliveryStatus.PENDING,
        })),
        skipDuplicates: true,
      });
    }
  }

  return {
    created: creation.count === 1,
    eventId: event.id,
    notificationId: notification.id,
    reservationId: notification.reservationId,
  };
}

async function bootstrapWebhookConfiguration(
  input: Readonly<{
    prismaClient: PrismaClient;
    businessEnvironment: string;
    bootstrapTokenParam: string | null | undefined;
    hookSecretHeader: string | null | undefined;
    signatureHeader: string | null | undefined;
    rawBody: string;
    source: NodeJS.ProcessEnv;
  }>,
): Promise<ZohoMailWebhookOutcome> {
  const env = getZohoMailWebhookEnv(input.source);
  const hookSecret = input.hookSecretHeader?.trim();

  if (
    !env.bootstrapToken ||
    !constantTimeEqualString(input.bootstrapTokenParam, env.bootstrapToken) ||
    !hookSecret
  ) {
    throw new ZohoMailWebhookError("ZOHO_MAIL_BOOTSTRAP_INVALID", 403);
  }

  verifyBootstrapSignatureIfPresent({
    rawBody: input.rawBody,
    hookSecret,
    signatureHeader: input.signatureHeader,
  });

  const now = new Date();
  await input.prismaClient.zohoMailWebhookConfiguration.createMany({
    data: {
      businessEnvironment: input.businessEnvironment,
      hookSecretEncrypted: encryptZohoMailWebhookSecret({
        hookSecret,
        businessEnvironment: input.businessEnvironment,
        source: input.source,
      }),
      createdAt: now,
      updatedAt: now,
    },
    skipDuplicates: true,
  });

  return { status: "bootstrapped" };
}

export async function processZohoMailWebhook(
  input: Readonly<{
    rawBody: string;
    hookSecretHeader: string | null | undefined;
    signatureHeader: string | null | undefined;
    bootstrapTokenParam?: string | null;
    source?: NodeJS.ProcessEnv;
    prismaClient?: PrismaClient;
    deliverAdminPush?: ZohoMailWebhookDeliver;
  }>,
): Promise<ZohoMailWebhookOutcome> {
  const source = input.source ?? process.env;
  const env = getZohoMailWebhookEnv(source);

  if (!env.configured || !env.encryptionKeyBase64) {
    throw new ZohoMailWebhookError("ZOHO_MAIL_WEBHOOK_UNAVAILABLE", 503);
  }

  const businessEnvironment = businessEnvironmentFor(env.trpEnvironment);
  const prismaClient = input.prismaClient ?? prisma;
  const configuration =
    await prismaClient.zohoMailWebhookConfiguration.findUnique({
      where: { businessEnvironment },
      select: { hookSecretEncrypted: true },
    });

  if (!configuration) {
    return bootstrapWebhookConfiguration({
      prismaClient,
      businessEnvironment,
      bootstrapTokenParam: input.bootstrapTokenParam,
      hookSecretHeader: input.hookSecretHeader,
      signatureHeader: input.signatureHeader,
      rawBody: input.rawBody,
      source,
    });
  }

  requireVerifiedSignature({
    rawBody: input.rawBody,
    hookSecret: decryptZohoMailWebhookSecret({
      encryptedSecret: configuration.hookSecretEncrypted,
      businessEnvironment,
      source,
    }),
    signatureHeader: input.signatureHeader,
  });

  const payload = parseVerifiedJsonPayload(input.rawBody);
  let event: ZohoLimitedInboundEmail;

  try {
    event = parseZohoLimitedInboundEmailPayload(payload);
  } catch (error) {
    if (error instanceof ZohoLimitedDataError) {
      throw new ZohoMailWebhookError(
        error.code,
        error.code === "ZOHO_MAIL_FULL_CONTENT_PAYLOAD" ? 422 : 400,
      );
    }

    throw error;
  }

  if (
    !isAcceptedZohoMailRecipient({
      toAddresses: event.toAddresses,
      trpEnvironment: env.trpEnvironment,
    })
  ) {
    return {
      status: "ignored",
      reason: "recipient_outside_correspondence_domain",
    };
  }

  if (
    isInternalZohoMailSender({
      fromAddress: event.fromAddress,
      trpEnvironment: env.trpEnvironment,
    })
  ) {
    return { status: "ignored", reason: "internal_sender" };
  }

  const eventFingerprint = fingerprintZohoMailLimitedDataRawBody(input.rawBody);
  const reservationMatch = await findUniqueReservationForSender(
    prismaClient,
    event.fromAddress,
  );
  const result = await prismaClient.$transaction((transaction) =>
    ensureGuestEmailReceivedNotification(transaction, {
      event,
      eventFingerprint,
      reservationMatch,
      source,
    }),
  );

  if (result.created) {
    const deliver =
      input.deliverAdminPush ?? deliverAdminPushNotificationsBestEffort;
    await deliver([result.notificationId], {
      source,
      prismaClient,
    });
  }

  return {
    status: result.created ? "processed" : "duplicate",
    eventId: result.eventId,
    notificationId: result.notificationId,
    reservationId: result.reservationId,
  };
}
