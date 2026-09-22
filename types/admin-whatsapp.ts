import type {
  ReservationStatus,
  WhatsAppMessageDirection,
  WhatsAppMessageStatus,
} from "@prisma/client";

export type AdminWhatsAppConversationLinkState =
  | "LINKED"
  | "UNLINKED_OR_AMBIGUOUS";

export type AdminWhatsAppReservationSummary = Readonly<{
  id: string;
  guestName: string;
  guestPhone: string | null;
  property: Readonly<{
    id: string;
    nameEs: string;
    nameEn: string;
  }>;
  checkInDate: string;
  checkOutDate: string;
  status: ReservationStatus;
  confirmedAt: string | null;
  createdAt: string;
}>;

export type AdminWhatsAppConversationSummary = Readonly<{
  id: string;
  guestPhoneE164: string;
  reservation: AdminWhatsAppReservationSummary | null;
  candidateReservations: readonly AdminWhatsAppReservationSummary[];
  linkState: AdminWhatsAppConversationLinkState;
  unreadCount: number;
  lastMessageAt: string | null;
  lastInboundAt: string | null;
  customerServiceWindowExpiresAt: string | null;
  createdAt: string;
  updatedAt: string;
}>;

export type AdminWhatsAppMessageSummary = Readonly<{
  id: string;
  direction: WhatsAppMessageDirection;
  status: WhatsAppMessageStatus;
  body: string | null;
  mediaCount: number;
  mediaItems: readonly AdminWhatsAppMediaItemSummary[];
  createdAt: string;
}>;

export type AdminWhatsAppMediaItemSummary = Readonly<{
  index: number;
  contentType: string | null;
}>;

export type AdminWhatsAppPageData = Readonly<{
  generatedAt: string;
  conversations: readonly AdminWhatsAppConversationSummary[];
  selectedConversation: AdminWhatsAppConversationSummary | null;
  messages: readonly AdminWhatsAppMessageSummary[];
  pagination: Readonly<{
    page: number;
    pageSize: number;
    totalItems: number;
    totalPages: number;
  }>;
}>;

export type AdminWhatsAppFilters = Readonly<{
  conversationId?: string;
  page?: number;
}>;

export type AdminWhatsAppErrorCode =
  | "ADMIN_UNAUTHORIZED"
  | "ADMIN_WHATSAPP_ORIGIN_INVALID"
  | "INVALID_ADMIN_WHATSAPP_REQUEST"
  | "ADMIN_WHATSAPP_CONVERSATION_NOT_FOUND"
  | "ADMIN_WHATSAPP_UNEXPECTED_ERROR";
