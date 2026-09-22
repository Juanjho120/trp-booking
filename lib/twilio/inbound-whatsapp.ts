import {
  Prisma,
  WhatsAppMessageDirection,
  WhatsAppMessageStatus,
  type PrismaClient,
} from "@prisma/client";

import { prisma } from "@/lib/db/prisma";
import { normalizeReservationPhone } from "@/lib/reservations/phone-normalization";
import {
  normalizeTwilioWhatsappAddress,
  resolveTwilioProviderConfig,
  type TwilioWebhookPayload,
} from "@/lib/twilio/provider";

const TWILIO_MESSAGE_SID_PATTERN = /^(SM|MM)[0-9a-fA-F]{32}$/;
const MAX_INBOUND_MEDIA_ITEMS = 10;
const MEDIA_CONTENT_TYPE_MAX_LENGTH = 120;
const CUSTOMER_SERVICE_WINDOW_HOURS = 24;
const MAX_INBOUND_TRANSACTION_ATTEMPTS = 3;
const PROVIDER_MESSAGE_SID_TARGETS = [
  "providerMessageSid",
  "provider_message_sid",
] as const;
const GUEST_PHONE_E164_TARGETS = [
  "guestPhoneE164",
  "guest_phone_e164",
] as const;

export type InboundWhatsAppIgnoredReason =
  | "CONFIGURATION_UNAVAILABLE"
  | "INVALID_PAYLOAD"
  | "WRONG_BUSINESS_SENDER"
  | "ACTIVE_STAFF_SENDER";

export type InboundWhatsAppProcessingResult =
  | Readonly<{
      kind: "persisted";
      conversationId: string;
      messageId: string;
      reservationId: string | null;
    }>
  | Readonly<{
      kind: "duplicate";
      conversationId: string | null;
      messageId: string | null;
    }>
  | Readonly<{
      kind: "ignored";
      reason: InboundWhatsAppIgnoredReason;
    }>;

export type ParsedInboundWhatsAppPayload = Readonly<{
  providerMessageSid: string;
  fromAddress: `whatsapp:${string}`;
  toAddress: `whatsapp:${string}`;
  guestPhoneE164: string;
  body: string | null;
  mediaCount: number;
  mediaMetadata: InboundWhatsAppMediaMetadata | null;
}>;

export type InboundWhatsAppMediaMetadata = Readonly<{
  retainedBytes: false;
  mediaUrlsRetained: false;
  items: readonly InboundWhatsAppMediaItemMetadata[];
}>;

export type InboundWhatsAppMediaItemMetadata = Readonly<{
  index: number;
  contentType: string | null;
}>;

type InboundWhatsAppPrismaClient = Pick<
  PrismaClient,
  | "$transaction"
  | "reservation"
  | "staffWhatsAppRecipient"
  | "whatsAppConversation"
  | "whatsAppMessage"
>;

type InboundWhatsAppTransactionClient = Pick<
  Prisma.TransactionClient,
  "reservation" | "whatsAppConversation" | "whatsAppMessage"
>;

type ExistingConversation = Readonly<{
  id: string;
  reservationId: string | null;
}>;

type ExistingMessage = Readonly<{
  id: string;
  conversationId: string;
}>;

type ReservationPhoneCandidate = Readonly<{
  id: string;
  guestPhone: string | null;
  guestCountry: string | null;
}>;

export type ProcessInboundWhatsAppWebhookOptions = Readonly<{
  now?: Date;
  prismaClient?: InboundWhatsAppPrismaClient;
  source?: NodeJS.ProcessEnv;
}>;

function readFirstParam(
  params: Readonly<Record<string, string | readonly string[]>>,
  key: string,
): string | null {
  const value = params[key];

  if (typeof value === "string") {
    return value;
  }

  return value?.[0] ?? null;
}

function normalizeInboundBody(value: string | null): string | null {
  if (value === null || !value.trim()) {
    return null;
  }

  return value;
}

function parseMediaCount(value: string | null): number | null {
  if (value === null || !/^\d{1,2}$/.test(value.trim())) {
    return null;
  }

  const mediaCount = Number(value);
  return Number.isInteger(mediaCount) &&
    mediaCount >= 0 &&
    mediaCount <= MAX_INBOUND_MEDIA_ITEMS
    ? mediaCount
    : null;
}

function normalizeMediaContentType(value: string | null): string | null {
  const trimmed = value?.trim() ?? "";

  if (
    !trimmed ||
    trimmed.length > MEDIA_CONTENT_TYPE_MAX_LENGTH ||
    !/^[A-Za-z0-9][A-Za-z0-9.+-]*\/[A-Za-z0-9][A-Za-z0-9.+-]*$/.test(trimmed)
  ) {
    return null;
  }

  return trimmed.toLowerCase();
}

function buildMediaMetadata(
  params: TwilioWebhookPayload["params"],
  mediaCount: number,
): InboundWhatsAppMediaMetadata | null {
  if (mediaCount === 0) {
    return null;
  }

  return {
    retainedBytes: false,
    mediaUrlsRetained: false,
    items: Array.from({ length: mediaCount }, (_, index) => ({
      index,
      contentType: normalizeMediaContentType(
        readFirstParam(params, `MediaContentType${index}`),
      ),
    })),
  };
}

function toE164FromWhatsappAddress(value: `whatsapp:${string}`): string {
  return value.slice("whatsapp:".length);
}

export function parseInboundWhatsAppPayload(
  payload: TwilioWebhookPayload,
): ParsedInboundWhatsAppPayload | null {
  const providerMessageSid =
    readFirstParam(payload.params, "MessageSid") ??
    readFirstParam(payload.params, "SmsMessageSid");
  const from = readFirstParam(payload.params, "From");
  const to = readFirstParam(payload.params, "To");
  const body = normalizeInboundBody(readFirstParam(payload.params, "Body"));
  const mediaCount = parseMediaCount(readFirstParam(payload.params, "NumMedia") ?? "0");

  if (
    !providerMessageSid ||
    !TWILIO_MESSAGE_SID_PATTERN.test(providerMessageSid) ||
    !from ||
    !to ||
    mediaCount === null ||
    (!body && mediaCount === 0)
  ) {
    return null;
  }

  try {
    const fromAddress = normalizeTwilioWhatsappAddress(from);
    const toAddress = normalizeTwilioWhatsappAddress(to);

    return {
      providerMessageSid,
      fromAddress,
      toAddress,
      guestPhoneE164: toE164FromWhatsappAddress(fromAddress),
      body,
      mediaCount,
      mediaMetadata: buildMediaMetadata(payload.params, mediaCount),
    };
  } catch {
    return null;
  }
}

function addHours(value: Date, hours: number): Date {
  return new Date(value.getTime() + hours * 60 * 60 * 1000);
}

function getPrismaErrorCode(error: unknown): string | null {
  if (typeof error !== "object" || error === null) {
    return null;
  }

  const code = (error as { code?: unknown }).code;

  return typeof code === "string" ? code : null;
}

function getPrismaErrorMeta(error: unknown): Record<string, unknown> | null {
  if (typeof error !== "object" || error === null) {
    return null;
  }

  const meta = (error as { meta?: unknown }).meta;

  return typeof meta === "object" && meta !== null
    ? (meta as Record<string, unknown>)
    : null;
}

function getPrismaErrorTargetText(error: unknown): string {
  const target = getPrismaErrorMeta(error)?.target;

  if (Array.isArray(target)) {
    return target.join(" ");
  }

  return typeof target === "string" ? target : "";
}

function isUniqueConflictForTarget(
  error: unknown,
  targets: readonly string[],
): boolean {
  if (
    getPrismaErrorCode(error) !== "P2002" &&
    !(error instanceof Prisma.PrismaClientKnownRequestError)
  ) {
    return false;
  }

  if (getPrismaErrorCode(error) !== "P2002") {
    return false;
  }

  const targetText = getPrismaErrorTargetText(error);

  return targets.some((target) => targetText.includes(target));
}

function isProviderMessageSidUniqueConflict(error: unknown): boolean {
  return isUniqueConflictForTarget(error, PROVIDER_MESSAGE_SID_TARGETS);
}

function isGuestPhoneE164UniqueConflict(error: unknown): boolean {
  return isUniqueConflictForTarget(error, GUEST_PHONE_E164_TARGETS);
}

function isSerializableTransactionConflict(error: unknown): boolean {
  const meta = getPrismaErrorMeta(error);

  return (
    getPrismaErrorCode(error) === "P2034" ||
    meta?.code === "40001" ||
    meta?.code === "40P01"
  );
}

function shouldRetryInboundTransaction(error: unknown): boolean {
  return (
    isGuestPhoneE164UniqueConflict(error) ||
    isSerializableTransactionConflict(error)
  );
}

function hasAttemptsRemaining(attempt: number): boolean {
  return attempt < MAX_INBOUND_TRANSACTION_ATTEMPTS;
}

async function resolveUniqueReservationIdByGuestPhone(
  transaction: InboundWhatsAppTransactionClient,
  guestPhoneE164: string,
): Promise<string | null> {
  const candidates = (await transaction.reservation.findMany({
    where: { guestPhone: { not: null } },
    select: {
      id: true,
      guestPhone: true,
      guestCountry: true,
    },
  })) as ReservationPhoneCandidate[];
  const matches = candidates.filter(
    (reservation) =>
      normalizeReservationPhone(
        reservation.guestPhone,
        reservation.guestCountry,
      ) === guestPhoneE164,
  );

  return matches.length === 1 ? matches[0].id : null;
}

async function findDuplicateMessage(
  prismaClient: InboundWhatsAppPrismaClient,
  providerMessageSid: string,
): Promise<InboundWhatsAppProcessingResult> {
  const message = (await prismaClient.whatsAppMessage.findUnique({
    where: { providerMessageSid },
    select: {
      id: true,
      conversationId: true,
    },
  })) as ExistingMessage | null;

  return {
    kind: "duplicate",
    messageId: message?.id ?? null,
    conversationId: message?.conversationId ?? null,
  };
}

async function persistInboundGuestWhatsAppMessage(
  parsed: ParsedInboundWhatsAppPayload,
  options: Required<Pick<ProcessInboundWhatsAppWebhookOptions, "now">> &
    Readonly<{ prismaClient: InboundWhatsAppPrismaClient }>,
): Promise<InboundWhatsAppProcessingResult> {
  const windowExpiresAt = addHours(options.now, CUSTOMER_SERVICE_WINDOW_HOURS);

  for (let attempt = 1; attempt <= MAX_INBOUND_TRANSACTION_ATTEMPTS; attempt += 1) {
    try {
      return await options.prismaClient.$transaction(
        async (transaction) => {
          const existingMessage = (await transaction.whatsAppMessage.findUnique({
            where: { providerMessageSid: parsed.providerMessageSid },
            select: {
              id: true,
              conversationId: true,
            },
          })) as ExistingMessage | null;

          if (existingMessage) {
            return {
              kind: "duplicate",
              messageId: existingMessage.id,
              conversationId: existingMessage.conversationId,
            };
          }

          let conversation = (await transaction.whatsAppConversation.findUnique({
            where: { guestPhoneE164: parsed.guestPhoneE164 },
            select: {
              id: true,
              reservationId: true,
            },
          })) as ExistingConversation | null;
          const reservationId = conversation?.reservationId
            ? conversation.reservationId
            : await resolveUniqueReservationIdByGuestPhone(
                transaction,
                parsed.guestPhoneE164,
              );

          if (!conversation) {
            conversation = (await transaction.whatsAppConversation.create({
              data: {
                guestPhoneE164: parsed.guestPhoneE164,
                ...(reservationId ? { reservationId } : {}),
              },
              select: {
                id: true,
                reservationId: true,
              },
            })) as ExistingConversation;
          }

          const message = (await transaction.whatsAppMessage.create({
            data: {
              conversationId: conversation.id,
              direction: WhatsAppMessageDirection.INBOUND,
              status: WhatsAppMessageStatus.RECEIVED,
              body: parsed.body,
              providerMessageSid: parsed.providerMessageSid,
              mediaCount: parsed.mediaCount,
              ...(parsed.mediaMetadata
                ? {
                    mediaMetadata:
                      parsed.mediaMetadata as Prisma.InputJsonValue,
                  }
                : {}),
              createdAt: options.now,
              updatedAt: options.now,
            },
            select: {
              id: true,
            },
          })) as Readonly<{ id: string }>;

          await transaction.whatsAppConversation.update({
            where: { id: conversation.id },
            data: {
              unreadCount: { increment: 1 },
              lastMessageAt: options.now,
              lastInboundAt: options.now,
              customerServiceWindowStartedAt: options.now,
              customerServiceWindowExpiresAt: windowExpiresAt,
              ...(!conversation.reservationId && reservationId
                ? { reservationId }
                : {}),
            },
            select: { id: true },
          });

          return {
            kind: "persisted",
            conversationId: conversation.id,
            messageId: message.id,
            reservationId: conversation.reservationId ?? reservationId,
          };
        },
        { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
      );
    } catch (error) {
      if (isProviderMessageSidUniqueConflict(error)) {
        return findDuplicateMessage(
          options.prismaClient,
          parsed.providerMessageSid,
        );
      }

      if (shouldRetryInboundTransaction(error) && hasAttemptsRemaining(attempt)) {
        continue;
      }

      throw error;
    }
  }

  throw new Error("INBOUND_WHATSAPP_TRANSACTION_RETRY_EXHAUSTED");
}

export async function processInboundWhatsAppWebhook(
  payload: TwilioWebhookPayload,
  options: ProcessInboundWhatsAppWebhookOptions = {},
): Promise<InboundWhatsAppProcessingResult> {
  const parsed = parseInboundWhatsAppPayload(payload);

  if (!parsed) {
    return { kind: "ignored", reason: "INVALID_PAYLOAD" };
  }

  const config = resolveTwilioProviderConfig(options.source ?? process.env);

  if (!config.configured) {
    return { kind: "ignored", reason: "CONFIGURATION_UNAVAILABLE" };
  }

  if (parsed.toAddress !== config.config.whatsappFrom) {
    return { kind: "ignored", reason: "WRONG_BUSINESS_SENDER" };
  }

  const prismaClient = options.prismaClient ?? prisma;
  const activeStaffSender = await prismaClient.staffWhatsAppRecipient.findFirst({
    where: {
      active: true,
      phoneE164: parsed.guestPhoneE164,
    },
    select: { id: true },
  });

  if (activeStaffSender) {
    return { kind: "ignored", reason: "ACTIVE_STAFF_SENDER" };
  }

  return persistInboundGuestWhatsAppMessage(parsed, {
    now: options.now ?? new Date(),
    prismaClient,
  });
}
