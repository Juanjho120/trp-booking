import {
  Prisma,
  WhatsAppMessageDirection,
  WhatsAppMessageStatus,
  type PrismaClient,
} from "@prisma/client";

import { prisma } from "@/lib/db/prisma";
import type { TwilioWebhookPayload } from "@/lib/twilio/provider";

const TWILIO_MESSAGE_SID_PATTERN = /^(SM|MM)[0-9a-fA-F]{32}$/;
const ERROR_CODE_MAX_LENGTH = 100;
const SUCCESS_STATUS_RANK: Readonly<
  Partial<Record<WhatsAppMessageStatus, number>>
> = {
  [WhatsAppMessageStatus.QUEUED]: 1,
  [WhatsAppMessageStatus.SENT]: 2,
  [WhatsAppMessageStatus.DELIVERED]: 3,
  [WhatsAppMessageStatus.READ]: 4,
};
const TERMINAL_FAILURE_STATUSES = new Set<WhatsAppMessageStatus>([
  WhatsAppMessageStatus.FAILED,
  WhatsAppMessageStatus.UNDELIVERED,
]);
const STATUS_CALLBACK_SERIALIZABLE_RETRY_LIMIT = 3;

type WhatsAppStatusPrismaClient = Pick<
  PrismaClient,
  "$transaction" | "whatsAppMessage"
>;

type WhatsAppStatusTransactionClient = Pick<
  Prisma.TransactionClient,
  "whatsAppMessage"
>;

type ExistingWhatsAppStatusMessage = Readonly<{
  id: string;
  direction: WhatsAppMessageDirection;
  status: WhatsAppMessageStatus;
  sentAt: Date | null;
  deliveredAt: Date | null;
  readAt: Date | null;
  failedAt: Date | null;
}>;

export type WhatsAppStatusCallbackProcessingResult =
  | Readonly<{
      kind: "processed";
      messageId: string;
      status: WhatsAppMessageStatus;
    }>
  | Readonly<{
      kind: "ignored";
      reason:
        | "INVALID_MESSAGE_SID"
        | "UNKNOWN_MESSAGE_SID"
        | "INBOUND_MESSAGE"
        | "UNKNOWN_STATUS";
    }>;

export type ProcessWhatsAppStatusCallbackOptions = Readonly<{
  now?: Date;
  prismaClient?: WhatsAppStatusPrismaClient;
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

function normalizeErrorCode(value: string | null): string | null {
  const trimmed = value?.trim() ?? "";

  if (
    !trimmed ||
    trimmed.length > ERROR_CODE_MAX_LENGTH ||
    !/^[A-Za-z0-9_.:-]+$/.test(trimmed)
  ) {
    return null;
  }

  return trimmed;
}

function getPrismaErrorCode(error: unknown): string | null {
  if (typeof error !== "object" || error === null) {
    return null;
  }

  const code = (error as { code?: unknown }).code;

  return typeof code === "string" ? code : null;
}

function isSerializationConflict(error: unknown): boolean {
  return getPrismaErrorCode(error) === "P2034";
}

export function mapTwilioMessageStatusToWhatsAppStatus(
  value: string | null,
): WhatsAppMessageStatus | null {
  const normalized = value?.trim().toLowerCase() ?? "";

  switch (normalized) {
    case "accepted":
    case "sending":
    case "queued":
      return WhatsAppMessageStatus.QUEUED;
    case "sent":
      return WhatsAppMessageStatus.SENT;
    case "delivered":
      return WhatsAppMessageStatus.DELIVERED;
    case "read":
      return WhatsAppMessageStatus.READ;
    case "failed":
      return WhatsAppMessageStatus.FAILED;
    case "undelivered":
      return WhatsAppMessageStatus.UNDELIVERED;
    default:
      return null;
  }
}

function readProviderStatus(
  params: TwilioWebhookPayload["params"],
): string | null {
  const directStatus =
    readFirstParam(params, "MessageStatus") ??
    readFirstParam(params, "SmsStatus");

  if (directStatus) {
    return directStatus;
  }

  const eventType = readFirstParam(params, "EventType");

  return eventType?.toLowerCase().includes("read") ? "read" : null;
}

function shouldPromoteStatus(
  current: WhatsAppMessageStatus,
  incoming: WhatsAppMessageStatus,
): boolean {
  if (TERMINAL_FAILURE_STATUSES.has(current)) {
    return false;
  }

  if (current === WhatsAppMessageStatus.READ) {
    return false;
  }

  if (TERMINAL_FAILURE_STATUSES.has(incoming)) {
    return current !== WhatsAppMessageStatus.DELIVERED;
  }

  return (
    (SUCCESS_STATUS_RANK[incoming] ?? 0) >
    (SUCCESS_STATUS_RANK[current] ?? 0)
  );
}

function safeFailureMessage(status: WhatsAppMessageStatus): string {
  return status === WhatsAppMessageStatus.UNDELIVERED
    ? "Twilio reported WhatsApp message delivery as undelivered."
    : "Twilio reported WhatsApp message delivery as failed.";
}

function buildStatusUpdate(
  message: ExistingWhatsAppStatusMessage,
  incoming: WhatsAppMessageStatus,
  now: Date,
  errorCode: string | null,
): Prisma.WhatsAppMessageUpdateInput | null {
  if (
    TERMINAL_FAILURE_STATUSES.has(message.status) &&
    !TERMINAL_FAILURE_STATUSES.has(incoming)
  ) {
    return null;
  }

  const data: Prisma.WhatsAppMessageUpdateInput = {};
  const promoteStatus = shouldPromoteStatus(message.status, incoming);

  if (promoteStatus && incoming !== message.status) {
    data.status = incoming;
  }

  if (incoming === WhatsAppMessageStatus.SENT && !message.sentAt) {
    data.sentAt = now;
  }

  if (incoming === WhatsAppMessageStatus.DELIVERED && !message.deliveredAt) {
    data.deliveredAt = now;
  }

  if (incoming === WhatsAppMessageStatus.READ && !message.readAt) {
    data.readAt = now;
  }

  if (
    TERMINAL_FAILURE_STATUSES.has(incoming) &&
    !TERMINAL_FAILURE_STATUSES.has(message.status) &&
    message.status !== WhatsAppMessageStatus.READ &&
    message.status !== WhatsAppMessageStatus.DELIVERED
  ) {
    if (!message.failedAt) {
      data.failedAt = now;
    }

    if (errorCode) {
      data.errorCode = errorCode;
    }

    data.errorMessage = safeFailureMessage(incoming);
  }

  return Object.keys(data).length > 0 ? data : null;
}

async function processTwilioWhatsAppStatusCallbackInTransaction(
  transaction: WhatsAppStatusTransactionClient,
  input: Readonly<{
    providerMessageSid: string;
    incomingStatus: WhatsAppMessageStatus;
    observedAt: Date;
    errorCode: string | null;
  }>,
): Promise<WhatsAppStatusCallbackProcessingResult> {
  const message = (await transaction.whatsAppMessage.findUnique({
    where: { providerMessageSid: input.providerMessageSid },
    select: {
      id: true,
      direction: true,
      status: true,
      sentAt: true,
      deliveredAt: true,
      readAt: true,
      failedAt: true,
    },
  })) as ExistingWhatsAppStatusMessage | null;

  if (!message) {
    return { kind: "ignored", reason: "UNKNOWN_MESSAGE_SID" };
  }

  if (message.direction !== WhatsAppMessageDirection.OUTBOUND) {
    return { kind: "ignored", reason: "INBOUND_MESSAGE" };
  }

  const data = buildStatusUpdate(
    message,
    input.incomingStatus,
    input.observedAt,
    input.errorCode,
  );

  if (!data) {
    return {
      kind: "processed",
      messageId: message.id,
      status: message.status,
    };
  }

  const updated = (await transaction.whatsAppMessage.update({
    where: { id: message.id },
    data,
    select: {
      id: true,
      status: true,
    },
  })) as Readonly<{ id: string; status: WhatsAppMessageStatus }>;

  return {
    kind: "processed",
    messageId: updated.id,
    status: updated.status,
  };
}

async function processTwilioWhatsAppStatusCallbackWithRetry(
  prismaClient: WhatsAppStatusPrismaClient,
  input: Readonly<{
    providerMessageSid: string;
    incomingStatus: WhatsAppMessageStatus;
    observedAt: Date;
    errorCode: string | null;
  }>,
): Promise<WhatsAppStatusCallbackProcessingResult> {
  for (
    let attempt = 1;
    attempt <= STATUS_CALLBACK_SERIALIZABLE_RETRY_LIMIT;
    attempt += 1
  ) {
    try {
      return await prismaClient.$transaction(
        (transaction) =>
          processTwilioWhatsAppStatusCallbackInTransaction(
            transaction as WhatsAppStatusTransactionClient,
            input,
          ),
        { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
      );
    } catch (error) {
      if (
        attempt < STATUS_CALLBACK_SERIALIZABLE_RETRY_LIMIT &&
        isSerializationConflict(error)
      ) {
        continue;
      }

      throw error;
    }
  }

  throw new Error("TWILIO_STATUS_CALLBACK_RETRY_EXHAUSTED");
}

export async function processTwilioWhatsAppStatusCallback(
  payload: TwilioWebhookPayload,
  options: ProcessWhatsAppStatusCallbackOptions = {},
): Promise<WhatsAppStatusCallbackProcessingResult> {
  const params = payload.params;
  const providerMessageSid =
    readFirstParam(params, "MessageSid") ??
    readFirstParam(params, "SmsMessageSid");

  if (
    !providerMessageSid ||
    !TWILIO_MESSAGE_SID_PATTERN.test(providerMessageSid)
  ) {
    return { kind: "ignored", reason: "INVALID_MESSAGE_SID" };
  }

  const incomingStatus = mapTwilioMessageStatusToWhatsAppStatus(
    readProviderStatus(params),
  );

  if (!incomingStatus) {
    return { kind: "ignored", reason: "UNKNOWN_STATUS" };
  }

  const prismaClient = options.prismaClient ?? prisma;

  return processTwilioWhatsAppStatusCallbackWithRetry(prismaClient, {
    providerMessageSid,
    incomingStatus,
    observedAt: options.now ?? new Date(),
    errorCode: normalizeErrorCode(readFirstParam(params, "ErrorCode")),
  });
}
