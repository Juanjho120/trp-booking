import type {
  FelDocumentStatus,
  FelDocumentType,
  FelLineKind,
  FelLineSourceRole,
  FelLineSourceType,
} from "@prisma/client";

import type { AdminActor, AdminPagination } from "@/types/admin";

export const ADMIN_FEL_RECEIVER_IDENTIFIER_TYPES = [
  "CONSUMIDOR_FINAL",
  "NIT",
  "CUI",
  "PASSPORT_FOREIGN",
  "OTHER",
] as const;

export type AdminFelReceiverIdentifierType =
  (typeof ADMIN_FEL_RECEIVER_IDENTIFIER_TYPES)[number];

export const ADMIN_FEL_ERROR_CODES = [
  "ADMIN_UNAUTHORIZED",
  "ADMIN_FEL_ORIGIN_INVALID",
  "INVALID_ADMIN_FEL_REQUEST",
  "ADMIN_FEL_DOCUMENT_NOT_FOUND",
  "ADMIN_FEL_DRAFT_NOT_EDITABLE",
  "ADMIN_FEL_RESERVATION_NOT_ELIGIBLE",
  "ADMIN_FEL_CHECKOUT_NOT_REACHED",
  "ADMIN_FEL_INVALID_CHECKOUT_TIME",
  "ADMIN_FEL_LIFECYCLE_UNRESOLVED",
  "ADMIN_FEL_FISCAL_RECONCILIATION_REQUIRED",
  "ADMIN_FEL_CURRENCY_MISMATCH",
  "ADMIN_FEL_SOURCE_ALREADY_ALLOCATED",
  "ADMIN_FEL_UNEXPECTED_ERROR",
] as const;

export type AdminFelErrorCode = (typeof ADMIN_FEL_ERROR_CODES)[number];

export type AdminFelBlockedReason = Exclude<
  AdminFelErrorCode,
  | "ADMIN_UNAUTHORIZED"
  | "ADMIN_FEL_ORIGIN_INVALID"
  | "INVALID_ADMIN_FEL_REQUEST"
  | "ADMIN_FEL_DOCUMENT_NOT_FOUND"
  | "ADMIN_FEL_DRAFT_NOT_EDITABLE"
  | "ADMIN_FEL_UNEXPECTED_ERROR"
>;

export type AdminFelReceiverInput = Readonly<{
  receiverName: string;
  receiverIdentifierType: AdminFelReceiverIdentifierType;
  receiverIdentifier?: string | null;
  receiverAddress?: string | null;
  receiverEmail?: string | null;
  receiverCountry?: string | null;
}>;

export type AdminFelReceiverSnapshot = Readonly<{
  receiverName: string;
  receiverIdentifierType: AdminFelReceiverIdentifierType;
  receiverIdentifier: string | null;
  receiverAddress: string | null;
  receiverEmail: string | null;
  receiverCountry: string | null;
}>;

export type AdminFelEligibleExtra = Readonly<{
  guestPaymentRequestItemId: string;
  additionalChargeId: string;
  category: string;
  description: string;
  amount: string;
  currency: string;
  createdAt: string;
}>;

export type AdminFelEligibleReservation = Readonly<{
  id: string;
  guestName: string;
  property: Readonly<{
    id: string;
    nameEs: string;
    nameEn: string;
  }>;
  checkInDate: string;
  checkOutDate: string;
  lodgingDescription: string;
  checkoutAt: string;
  nights: number;
  guestCount: number;
  total: string;
  currency: string;
  eligibleExtraCount: number;
  eligibleExtraTotal: string;
  extras: readonly AdminFelEligibleExtra[];
}>;

export type AdminFelLineSourcePreview = Readonly<{
  sourceType: FelLineSourceType;
  sourceId: string;
  sourceRole: FelLineSourceRole;
}>;

export type AdminFelLinePreview = Readonly<{
  lineNumber: number;
  kind: FelLineKind;
  description: string;
  amount: string;
  currency: string;
  allocationCount: number;
  sources: readonly AdminFelLineSourcePreview[];
}>;

export type AdminFelDraftPreview = Readonly<{
  documentType: FelDocumentType;
  status: "DRAFT";
  commercialCurrency: string;
  receiver: AdminFelReceiverSnapshot;
  groupExtras: boolean;
  reservationIds: readonly string[];
  lines: readonly AdminFelLinePreview[];
  total: string;
}>;

export type AdminFelDocumentSummary = Readonly<{
  id: string;
  documentType: FelDocumentType;
  status: FelDocumentStatus;
  commercialCurrency: string;
  receiverName: string;
  receiverIdentifierType: string;
  receiverIdentifier: string | null;
  total: string;
  groupExtras: boolean;
  reservationCount: number;
  lineCount: number;
  createdBy: AdminActor;
  createdAt: string;
  updatedAt: string;
}>;

export type AdminFelDocumentDetail = AdminFelDocumentSummary &
  Readonly<{
    receiverAddress: string | null;
    receiverEmail: string | null;
    receiverCountry: string | null;
    reservations: readonly Readonly<{
      reservationId: string;
      propertyName: string;
      checkInDate: string;
      checkOutDate: string;
      guestCount: number;
      total: string;
      currency: string;
    }>[];
    lines: readonly AdminFelLinePreview[];
  }>;

export type AdminFelPageData = Readonly<{
  generatedAt: string;
  eligibleReservations: readonly AdminFelEligibleReservation[];
  documents: readonly AdminFelDocumentDetail[];
  pagination: AdminPagination;
}>;

export type CreateAdminFelDraftInput = AdminFelReceiverInput &
  Readonly<{
    reservationIds: readonly string[];
    groupExtras: boolean;
  }>;

export type RebuildAdminFelDraftInput = Readonly<{
  documentId: string;
  reservationIds: readonly string[];
  groupExtras: boolean;
}>;

export type UpdateAdminFelDraftReceiverInput = AdminFelReceiverInput &
  Readonly<{
    documentId: string;
  }>;

export type DiscardAdminFelDraftInput = Readonly<{
  documentId: string;
}>;
