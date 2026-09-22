import { Prisma, type PrismaClient } from "@prisma/client";

import { prisma } from "@/lib/db/prisma";
import { normalizeReservationPhone } from "@/lib/reservations/phone-normalization";
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

type AdminWhatsAppConversationRecord = Prisma.WhatsAppConversationGetPayload<{
  select: typeof adminWhatsAppConversationSelect;
}>;

type AdminWhatsAppCandidateReservationRecord = Prisma.ReservationGetPayload<{
  select: typeof adminWhatsAppCandidateReservationSelect;
}>;

type AdminWhatsAppMessageRecord = Prisma.WhatsAppMessageGetPayload<{
  select: typeof adminWhatsAppMessageSelect;
}>;

type AdminWhatsAppPrismaClient = Pick<
  PrismaClient,
  "reservation" | "whatsAppConversation" | "whatsAppMessage"
>;

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
): AdminWhatsAppConversationSummary {
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
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

async function findCandidateReservationsByGuestPhone(
  prismaClient: AdminWhatsAppPrismaClient,
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

export async function getAdminWhatsAppPage(
  input: AdminWhatsAppFilters,
  options: Readonly<{ prismaClient?: AdminWhatsAppPrismaClient }> = {},
): Promise<AdminWhatsAppPageData> {
  const prismaClient = options.prismaClient ?? prisma;
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
    toConversationSummary(conversation),
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
          .then((row) => (row ? toConversationSummary(row) : null)))) as
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
  options: Readonly<{ prismaClient?: AdminWhatsAppPrismaClient }> = {},
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
