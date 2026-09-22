import {
  Prisma,
  WhatsAppMessageDirection,
  WhatsAppMessageStatus,
  type PrismaClient,
} from "@prisma/client";

import { prisma } from "@/lib/db/prisma";
import { normalizeReservationPhone } from "@/lib/reservations/phone-normalization";
import {
  normalizeTwilioProviderError,
  sendTwilioWhatsAppFreeformMessage,
  WHATSAPP_FREEFORM_BODY_MAX_LENGTH,
  type TwilioMessageClient,
} from "@/lib/twilio/provider";
import { mapTwilioMessageStatusToWhatsAppStatus } from "@/lib/twilio/whatsapp-status";
import type { AdminActor } from "@/types/admin";
import type {
  AdminWhatsAppReservationSummary,
  AdminWhatsAppConversationSummary,
  AdminWhatsAppErrorCode,
  AdminWhatsAppFilters,
  AdminWhatsAppMediaItemSummary,
  AdminWhatsAppMessageSummary,
  AdminWhatsAppPageData,
} from "@/types/admin-whatsapp";

const ADMIN_WHATSAPP_PAGE_SIZE = 20;
const ADMIN_WHATSAPP_MESSAGE_LIMIT = 100;
const CUSTOMER_SERVICE_WINDOW_MS = 24 * 60 * 60 * 1000;
const CLIENT_REQUEST_ID_MAX_LENGTH = 120;
const CLIENT_REQUEST_ID_TARGETS = [
  "clientRequestId",
  "client_request_id",
] as const;

const adminWhatsAppConversationSelect = {
  id: true,
  guestPhoneE164: true,
  unreadCount: true,
  lastMessageAt: true,
  lastInboundAt: true,
  customerServiceWindowExpiresAt: true,
  createdAt: true,
  updatedAt: true,
  reservation: {
    select: {
      id: true,
      guestName: true,
      guestPhone: true,
      checkInDate: true,
      checkOutDate: true,
      status: true,
      confirmedAt: true,
      createdAt: true,
      property: {
        select: {
          id: true,
          nameEs: true,
          nameEn: true,
        },
      },
    },
  },
} satisfies Prisma.WhatsAppConversationSelect;

const adminWhatsAppCandidateReservationSelect = {
  id: true,
  guestName: true,
  guestPhone: true,
  guestCountry: true,
  checkInDate: true,
  checkOutDate: true,
  status: true,
  confirmedAt: true,
  createdAt: true,
  property: {
    select: {
      id: true,
      nameEs: true,
      nameEn: true,
    },
  },
} satisfies Prisma.ReservationSelect;

const adminWhatsAppMessageSelect = {
  id: true,
  direction: true,
  status: true,
  body: true,
  mediaCount: true,
  mediaMetadata: true,
  createdAt: true,
} satisfies Prisma.WhatsAppMessageSelect;

const outboundWhatsAppMessageSelect = {
  id: true,
  conversationId: true,
  direction: true,
  status: true,
  body: true,
  providerMessageSid: true,
  mediaCount: true,
  mediaMetadata: true,
  createdAt: true,
} satisfies Prisma.WhatsAppMessageSelect;

type AdminWhatsAppConversationRecord = Prisma.WhatsAppConversationGetPayload<{
  select: typeof adminWhatsAppConversationSelect;
}>;

type AdminWhatsAppCandidateReservationRecord = Prisma.ReservationGetPayload<{
  select: typeof adminWhatsAppCandidateReservationSelect;
}>;

type AdminWhatsAppMessageRecord = Prisma.WhatsAppMessageGetPayload<{
  select: typeof adminWhatsAppMessageSelect;
}>;

type AdminWhatsAppReadPrismaClient = Pick<
  PrismaClient,
  "reservation" | "whatsAppConversation" | "whatsAppMessage"
>;

type AdminWhatsAppMutationPrismaClient = AdminWhatsAppReadPrismaClient &
  Pick<PrismaClient, "$transaction">;

type AdminWhatsAppTransactionClient = Pick<
  Prisma.TransactionClient,
  "whatsAppConversation" | "whatsAppMessage"
>;

type OutboundWhatsAppIntentMessage = Readonly<{
  id: string;
  conversationId: string;
  direction: WhatsAppMessageDirection;
  status: WhatsAppMessageStatus;
  body: string | null;
  providerMessageSid: string | null;
  mediaCount: number;
  mediaMetadata: Prisma.JsonValue | null;
  createdAt: Date;
}>;

type OutboundWhatsAppIntent = Readonly<
  | {
      deliveryAllowed: true;
      guestPhoneE164: string;
      message: OutboundWhatsAppIntentMessage;
    }
  | {
      deliveryAllowed: false;
      message: OutboundWhatsAppIntentMessage;
    }
>;

export type SendAdminWhatsAppConversationMessageInput = Readonly<{
  conversationId: string;
  body: string;
  clientRequestId: string;
}>;

export type SendAdminWhatsAppConversationMessageResult = Readonly<{
  message: AdminWhatsAppMessageSummary;
  deliveryAttempted: boolean;
}>;

type DeliverOutboundIntentResult = Readonly<{
  message: OutboundWhatsAppIntentMessage;
  deliveryAttempted: boolean;
}>;

export class AdminWhatsAppError extends Error {
  constructor(public readonly code: AdminWhatsAppErrorCode) {
    super(code);
    this.name = "AdminWhatsAppError";
  }
}

function normalizePage(value: number | undefined): number {
  return Number.isInteger(value) && (value ?? 0) > 0 ? value! : 1;
}

function normalizeConversationId(value: string | undefined): string | null {
  const trimmed = value?.trim() ?? "";
  return trimmed ? trimmed : null;
}

function toIsoString(value: Date | null): string | null {
  return value?.toISOString() ?? null;
}

function addCustomerServiceWindow(lastInboundAt: Date | null): Date | null {
  return lastInboundAt
    ? new Date(lastInboundAt.getTime() + CUSTOMER_SERVICE_WINDOW_MS)
    : null;
}

function isFreeformReplyAllowed(
  lastInboundAt: Date | null,
  now: Date,
): boolean {
  const expiresAt = addCustomerServiceWindow(lastInboundAt);

  return Boolean(expiresAt && now.getTime() < expiresAt.getTime());
}

function normalizeOutboundBody(value: string): string {
  const normalized = value.trim();

  if (!normalized) {
    throw new AdminWhatsAppError("ADMIN_WHATSAPP_MESSAGE_REQUIRED");
  }

  if (normalized.length > WHATSAPP_FREEFORM_BODY_MAX_LENGTH) {
    throw new AdminWhatsAppError("ADMIN_WHATSAPP_MESSAGE_TOO_LONG");
  }

  return normalized;
}

function normalizeClientRequestId(value: string): string {
  const normalized = value.trim();

  if (!normalized || normalized.length > CLIENT_REQUEST_ID_MAX_LENGTH) {
    throw new AdminWhatsAppError("INVALID_ADMIN_WHATSAPP_REQUEST");
  }

  return normalized;
}

function toReservationSummary(
  row:
    | NonNullable<AdminWhatsAppConversationRecord["reservation"]>
    | AdminWhatsAppCandidateReservationRecord,
): AdminWhatsAppReservationSummary {
  return {
    id: row.id,
    guestName: row.guestName,
    guestPhone: row.guestPhone,
    property: row.property,
    checkInDate: row.checkInDate.toISOString(),
    checkOutDate: row.checkOutDate.toISOString(),
    status: row.status,
    confirmedAt: toIsoString(row.confirmedAt),
    createdAt: row.createdAt.toISOString(),
  };
}

function toConversationSummary(
  row: AdminWhatsAppConversationRecord,
  candidateReservations: readonly AdminWhatsAppReservationSummary[] = [],
  now = new Date(),
): AdminWhatsAppConversationSummary {
  const freeformWindowExpiresAt = addCustomerServiceWindow(row.lastInboundAt);

  return {
    id: row.id,
    guestPhoneE164: row.guestPhoneE164,
    reservation: row.reservation ? toReservationSummary(row.reservation) : null,
    candidateReservations,
    linkState: row.reservation ? "LINKED" : "UNLINKED_OR_AMBIGUOUS",
    unreadCount: row.unreadCount,
    lastMessageAt: toIsoString(row.lastMessageAt),
    lastInboundAt: toIsoString(row.lastInboundAt),
    customerServiceWindowExpiresAt: toIsoString(
      row.customerServiceWindowExpiresAt,
    ),
    freeformReplyAllowed: isFreeformReplyAllowed(row.lastInboundAt, now),
    freeformWindowExpiresAt: toIsoString(freeformWindowExpiresAt),
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

async function findCandidateReservationsByGuestPhone(
  prismaClient: AdminWhatsAppReadPrismaClient,
  guestPhoneE164: string,
): Promise<readonly AdminWhatsAppReservationSummary[]> {
  const reservations = (await prismaClient.reservation.findMany({
    where: { guestPhone: { not: null } },
    orderBy: [
      { checkInDate: "desc" },
      { createdAt: "desc" },
      { id: "asc" },
    ],
    select: adminWhatsAppCandidateReservationSelect,
  })) as AdminWhatsAppCandidateReservationRecord[];

  return reservations
    .filter(
      (reservation) =>
        normalizeReservationPhone(
          reservation.guestPhone,
          reservation.guestCountry,
        ) === guestPhoneE164,
    )
    .map(toReservationSummary);
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function toMediaItems(
  mediaMetadata: Prisma.JsonValue | null,
  mediaCount: number,
): readonly AdminWhatsAppMediaItemSummary[] {
  if (isRecord(mediaMetadata) && Array.isArray(mediaMetadata.items)) {
    return mediaMetadata.items
      .flatMap((item) =>
        isRecord(item)
          ? [
              {
                index: typeof item.index === "number" ? item.index : 0,
                contentType:
                  typeof item.contentType === "string"
                    ? item.contentType
                    : null,
              },
            ]
          : [],
      )
      .slice(0, mediaCount);
  }

  return Array.from({ length: mediaCount }, (_, index) => ({
    index,
    contentType: null,
  }));
}

function toMessageSummary(
  row: AdminWhatsAppMessageRecord,
): AdminWhatsAppMessageSummary {
  return {
    id: row.id,
    direction: row.direction,
    status: row.status,
    body: row.body,
    mediaCount: row.mediaCount,
    mediaItems: toMediaItems(row.mediaMetadata, row.mediaCount),
    createdAt: row.createdAt.toISOString(),
  };
}

function getPrismaErrorCode(error: unknown): string | null {
  if (typeof error !== "object" || error === null) {
    return null;
  }

  const code = (error as { code?: unknown }).code;

  return typeof code === "string" ? code : null;
}

function getPrismaErrorTargetText(error: unknown): string {
  if (typeof error !== "object" || error === null) {
    return "";
  }

  const meta = (error as { meta?: unknown }).meta;
  const target =
    typeof meta === "object" && meta !== null
      ? (meta as { target?: unknown }).target
      : null;

  if (Array.isArray(target)) {
    return target.join(" ");
  }

  return typeof target === "string" ? target : "";
}

function isClientRequestIdUniqueConflict(error: unknown): boolean {
  if (getPrismaErrorCode(error) !== "P2002") {
    return false;
  }

  const targetText = getPrismaErrorTargetText(error);

  return CLIENT_REQUEST_ID_TARGETS.some((target) =>
    targetText.includes(target),
  );
}

function assertOutboundIdempotencyMatch(
  existing: OutboundWhatsAppIntentMessage,
  input: Readonly<{ conversationId: string; body: string }>,
): void {
  if (
    existing.direction !== WhatsAppMessageDirection.OUTBOUND ||
    existing.conversationId !== input.conversationId ||
    existing.body !== input.body
  ) {
    throw new AdminWhatsAppError("ADMIN_WHATSAPP_IDEMPOTENCY_CONFLICT");
  }
}

async function findExistingOutboundIntentByClientRequestId(
  prismaClient: Pick<
    AdminWhatsAppMutationPrismaClient,
    "whatsAppConversation" | "whatsAppMessage"
  >,
  input: Readonly<{
    clientRequestId: string;
    conversationId: string;
    body: string;
  }>,
): Promise<OutboundWhatsAppIntent> {
  const existing = (await prismaClient.whatsAppMessage.findUnique({
    where: { clientRequestId: input.clientRequestId },
    select: outboundWhatsAppMessageSelect,
  })) as OutboundWhatsAppIntentMessage | null;

  if (!existing) {
    throw new AdminWhatsAppError("ADMIN_WHATSAPP_UNEXPECTED_ERROR");
  }

  assertOutboundIdempotencyMatch(existing, input);

  if (
    existing.status === WhatsAppMessageStatus.PENDING &&
    !existing.providerMessageSid
  ) {
    return buildDeliverableOutboundIntent(prismaClient, existing);
  }

  return {
    deliveryAllowed: false,
    message: existing,
  };
}

async function buildDeliverableOutboundIntent(
  prismaClient: Pick<AdminWhatsAppMutationPrismaClient, "whatsAppConversation">,
  message: OutboundWhatsAppIntentMessage,
): Promise<OutboundWhatsAppIntent> {
  const conversation = (await prismaClient.whatsAppConversation.findUnique({
    where: { id: message.conversationId },
    select: { guestPhoneE164: true },
  })) as Readonly<{ guestPhoneE164: string }> | null;

  if (!conversation) {
    throw new AdminWhatsAppError("ADMIN_WHATSAPP_UNEXPECTED_ERROR");
  }

  return {
    deliveryAllowed: true,
    guestPhoneE164: conversation.guestPhoneE164,
    message,
  };
}

async function createOutboundIntent(
  transaction: AdminWhatsAppTransactionClient,
  input: Readonly<{
    conversationId: string;
    body: string;
    clientRequestId: string;
  }>,
  now: Date,
): Promise<OutboundWhatsAppIntent> {
  const existing = (await transaction.whatsAppMessage.findUnique({
    where: { clientRequestId: input.clientRequestId },
    select: outboundWhatsAppMessageSelect,
  })) as OutboundWhatsAppIntentMessage | null;

  if (existing) {
    assertOutboundIdempotencyMatch(existing, input);

    if (
      existing.status === WhatsAppMessageStatus.PENDING &&
      !existing.providerMessageSid
    ) {
      return buildDeliverableOutboundIntent(transaction, existing);
    }

    return {
      deliveryAllowed: false,
      message: existing,
    };
  }

  const conversation = (await transaction.whatsAppConversation.findUnique({
    where: { id: input.conversationId },
    select: {
      id: true,
      guestPhoneE164: true,
      lastInboundAt: true,
    },
  })) as Readonly<{
    id: string;
    guestPhoneE164: string;
    lastInboundAt: Date | null;
  }> | null;

  if (!conversation) {
    throw new AdminWhatsAppError("ADMIN_WHATSAPP_CONVERSATION_NOT_FOUND");
  }

  if (!isFreeformReplyAllowed(conversation.lastInboundAt, now)) {
    throw new AdminWhatsAppError("ADMIN_WHATSAPP_FREEFORM_WINDOW_CLOSED");
  }

  const message = (await transaction.whatsAppMessage.create({
    data: {
      conversationId: conversation.id,
      direction: WhatsAppMessageDirection.OUTBOUND,
      status: WhatsAppMessageStatus.PENDING,
      body: input.body,
      clientRequestId: input.clientRequestId,
      mediaCount: 0,
      createdAt: now,
      updatedAt: now,
    },
    select: outboundWhatsAppMessageSelect,
  })) as OutboundWhatsAppIntentMessage;

  await transaction.whatsAppConversation.updateMany({
    where: { id: conversation.id },
    data: { lastMessageAt: now },
  });

  return {
    deliveryAllowed: true,
    guestPhoneE164: conversation.guestPhoneE164,
    message,
  };
}

function deliveryTimestampData(
  status: WhatsAppMessageStatus,
  observedAt: Date,
): Prisma.WhatsAppMessageUpdateInput {
  if (status === WhatsAppMessageStatus.SENT) {
    return { sentAt: observedAt };
  }

  if (status === WhatsAppMessageStatus.DELIVERED) {
    return { deliveredAt: observedAt };
  }

  if (status === WhatsAppMessageStatus.READ) {
    return { readAt: observedAt };
  }

  if (
    status === WhatsAppMessageStatus.FAILED ||
    status === WhatsAppMessageStatus.UNDELIVERED
  ) {
    return { failedAt: observedAt };
  }

  return {};
}

async function getOutboundMessageOrThrow(
  prismaClient: Pick<AdminWhatsAppMutationPrismaClient, "whatsAppMessage">,
  messageId: string,
): Promise<OutboundWhatsAppIntentMessage> {
  const message = (await prismaClient.whatsAppMessage.findUnique({
    where: { id: messageId },
    select: outboundWhatsAppMessageSelect,
  })) as OutboundWhatsAppIntentMessage | null;

  if (!message) {
    throw new AdminWhatsAppError("ADMIN_WHATSAPP_UNEXPECTED_ERROR");
  }

  return message;
}

async function deliverOutboundIntent(
  intent: Extract<OutboundWhatsAppIntent, { deliveryAllowed: true }>,
  options: Readonly<{
    now: Date;
    prismaClient: AdminWhatsAppMutationPrismaClient;
    source?: NodeJS.ProcessEnv;
    twilioClient?: TwilioMessageClient;
  }>,
): Promise<DeliverOutboundIntentResult> {
  const claimed = await options.prismaClient.whatsAppMessage.updateMany({
    where: {
      id: intent.message.id,
      status: WhatsAppMessageStatus.PENDING,
      providerMessageSid: null,
    },
    data: {
      status: WhatsAppMessageStatus.PROCESSING,
      attemptCount: { increment: 1 },
      lastAttemptAt: options.now,
      processingStartedAt: options.now,
    },
  });

  if (claimed.count !== 1) {
    return {
      message: await getOutboundMessageOrThrow(
        options.prismaClient,
        intent.message.id,
      ),
      deliveryAttempted: false,
    };
  }

  try {
    const providerResult = await sendTwilioWhatsAppFreeformMessage({
      to: intent.guestPhoneE164,
      body: intent.message.body ?? "",
      source: options.source,
      client: options.twilioClient,
    });
    const providerStatus =
      mapTwilioMessageStatusToWhatsAppStatus(
        providerResult.providerStatus,
      ) ?? WhatsAppMessageStatus.QUEUED;

    return {
      message: (await options.prismaClient.whatsAppMessage.update({
        where: { id: intent.message.id },
        data: {
          providerMessageSid: providerResult.providerMessageSid,
          status: providerStatus,
          processingStartedAt: null,
          errorCode: null,
          errorMessage: null,
          ...deliveryTimestampData(providerStatus, options.now),
        },
        select: outboundWhatsAppMessageSelect,
      })) as OutboundWhatsAppIntentMessage,
      deliveryAttempted: true,
    };
  } catch (error) {
    const providerError = normalizeTwilioProviderError(error);

    return {
      message: (await options.prismaClient.whatsAppMessage.update({
        where: { id: intent.message.id },
        data: {
          status: WhatsAppMessageStatus.FAILED,
          processingStartedAt: null,
          failedAt: options.now,
          errorCode: providerError.code,
          errorMessage: providerError.message,
        },
        select: outboundWhatsAppMessageSelect,
      })) as OutboundWhatsAppIntentMessage,
      deliveryAttempted: true,
    };
  }
}

export async function getAdminWhatsAppPage(
  input: AdminWhatsAppFilters,
  options: Readonly<{
    now?: Date;
    prismaClient?: AdminWhatsAppReadPrismaClient;
  }> = {},
): Promise<AdminWhatsAppPageData> {
  const prismaClient = options.prismaClient ?? prisma;
  const now = options.now ?? new Date();
  const requestedPage = normalizePage(input.page);
  const requestedConversationId = normalizeConversationId(input.conversationId);
  const totalItems = await prismaClient.whatsAppConversation.count();
  const totalPages = Math.max(1, Math.ceil(totalItems / ADMIN_WHATSAPP_PAGE_SIZE));
  const page = Math.min(requestedPage, totalPages);
  const conversations = await prismaClient.whatsAppConversation.findMany({
    orderBy: [
      { lastMessageAt: { sort: "desc", nulls: "last" } },
      { id: "asc" },
    ],
    skip: (page - 1) * ADMIN_WHATSAPP_PAGE_SIZE,
    take: ADMIN_WHATSAPP_PAGE_SIZE,
    select: adminWhatsAppConversationSelect,
  });
  const conversationRows = conversations.map((conversation) =>
    toConversationSummary(conversation, [], now),
  );
  const selectedConversationId =
    requestedConversationId ?? conversationRows[0]?.id ?? null;
  const selectedConversationRecord = selectedConversationId
    ? ((conversationRows.find((item) => item.id === selectedConversationId) ??
        (await prismaClient.whatsAppConversation
          .findUnique({
            where: { id: selectedConversationId },
            select: adminWhatsAppConversationSelect,
          })
          .then((row) => (row ? toConversationSummary(row, [], now) : null)))) as
        | AdminWhatsAppConversationSummary
        | null)
    : null;
  const selectedConversation = selectedConversationRecord
    ? {
        ...selectedConversationRecord,
        candidateReservations: await findCandidateReservationsByGuestPhone(
          prismaClient,
          selectedConversationRecord.guestPhoneE164,
        ),
        freeformReplyAllowed: isFreeformReplyAllowed(
          selectedConversationRecord.lastInboundAt
            ? new Date(selectedConversationRecord.lastInboundAt)
            : null,
          now,
        ),
        freeformWindowExpiresAt: toIsoString(
          addCustomerServiceWindow(
            selectedConversationRecord.lastInboundAt
              ? new Date(selectedConversationRecord.lastInboundAt)
              : null,
          ),
        ),
      }
    : null;
  const messages = selectedConversation
    ? (
        await prismaClient.whatsAppMessage.findMany({
          where: { conversationId: selectedConversation.id },
          orderBy: [{ createdAt: "desc" }, { id: "desc" }],
          take: ADMIN_WHATSAPP_MESSAGE_LIMIT,
          select: adminWhatsAppMessageSelect,
        })
      ).reverse()
    : [];

  return {
    generatedAt: new Date().toISOString(),
    conversations: conversationRows,
    selectedConversation,
    messages: messages.map(toMessageSummary),
    pagination: {
      page,
      pageSize: ADMIN_WHATSAPP_PAGE_SIZE,
      totalItems,
      totalPages,
    },
  };
}

export async function markAdminWhatsAppConversationRead(
  input: Readonly<{ conversationId: string }>,
  actor: AdminActor,
  options: Readonly<{ prismaClient?: AdminWhatsAppReadPrismaClient }> = {},
): Promise<AdminWhatsAppConversationSummary> {
  if (!actor.email.trim()) {
    throw new AdminWhatsAppError("ADMIN_UNAUTHORIZED");
  }

  const conversationId = input.conversationId.trim();

  if (!conversationId) {
    throw new AdminWhatsAppError("INVALID_ADMIN_WHATSAPP_REQUEST");
  }

  const prismaClient = options.prismaClient ?? prisma;
  const existing = await prismaClient.whatsAppConversation.findUnique({
    where: { id: conversationId },
    select: { id: true },
  });

  if (!existing) {
    throw new AdminWhatsAppError("ADMIN_WHATSAPP_CONVERSATION_NOT_FOUND");
  }

  await prismaClient.whatsAppConversation.updateMany({
    where: { id: conversationId },
    data: { unreadCount: 0 },
  });

  const updated = await prismaClient.whatsAppConversation.findUnique({
    where: { id: conversationId },
    select: adminWhatsAppConversationSelect,
  });

  if (!updated) {
    throw new AdminWhatsAppError("ADMIN_WHATSAPP_CONVERSATION_NOT_FOUND");
  }

  return toConversationSummary(updated);
}

export async function sendAdminWhatsAppConversationMessage(
  input: SendAdminWhatsAppConversationMessageInput,
  actor: AdminActor,
  options: Readonly<{
    now?: Date;
    prismaClient?: AdminWhatsAppMutationPrismaClient;
    source?: NodeJS.ProcessEnv;
    twilioClient?: TwilioMessageClient;
  }> = {},
): Promise<SendAdminWhatsAppConversationMessageResult> {
  if (!actor.email.trim()) {
    throw new AdminWhatsAppError("ADMIN_UNAUTHORIZED");
  }

  const conversationId = normalizeConversationId(input.conversationId);

  if (!conversationId) {
    throw new AdminWhatsAppError("INVALID_ADMIN_WHATSAPP_REQUEST");
  }

  const normalizedInput = {
    conversationId,
    body: normalizeOutboundBody(input.body),
    clientRequestId: normalizeClientRequestId(input.clientRequestId),
  };

  const prismaClient = options.prismaClient ?? prisma;
  const now = options.now ?? new Date();
  let intent: OutboundWhatsAppIntent;

  try {
    intent = await prismaClient.$transaction(
      (transaction) =>
        createOutboundIntent(
          transaction as AdminWhatsAppTransactionClient,
          {
            conversationId: normalizedInput.conversationId,
            body: normalizedInput.body,
            clientRequestId: normalizedInput.clientRequestId,
          },
          now,
        ),
      { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
    );
  } catch (error) {
    if (isClientRequestIdUniqueConflict(error)) {
      intent = await findExistingOutboundIntentByClientRequestId(
        prismaClient,
        {
          conversationId: normalizedInput.conversationId,
          body: normalizedInput.body,
          clientRequestId: normalizedInput.clientRequestId,
        },
      );
    } else {
      throw error;
    }
  }

  if (!intent.deliveryAllowed) {
    return {
      message: toMessageSummary(intent.message),
      deliveryAttempted: false,
    };
  }

  const deliveryResult = await deliverOutboundIntent(intent, {
    now,
    prismaClient,
    source: options.source,
    twilioClient: options.twilioClient,
  });

  return {
    message: toMessageSummary(deliveryResult.message),
    deliveryAttempted: deliveryResult.deliveryAttempted,
  };
}
