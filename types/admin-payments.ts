import type { AdminPagination, AdminPropertyOption } from "@/types/admin";

export type AdminPaymentsView = "payments" | "events";

export type AdminPaymentDiagnostics = Readonly<{
  providerCode: string | null;
  providerMessage: string | null;
  authorization: string | null;
  providerOrder: string | null;
  tilopayTransaction: string | null;
  orderHashStatus: string | null;
}>;

export type AdminPaymentListItem = Readonly<{
  id: string;
  reservationId: string;
  property: AdminPropertyOption;
  guestName: string;
  provider: string;
  providerReference: string | null;
  providerTransactionId: string | null;
  status: string;
  amount: string;
  currency: string;
  paidAt: string | null;
  failedAt: string | null;
  createdAt: string;
  updatedAt: string;
  diagnostics: AdminPaymentDiagnostics;
}>;

export type AdminPaymentEventListItem = Readonly<{
  id: string;
  paymentId: string;
  reservationId: string;
  property: AdminPropertyOption;
  guestName: string;
  eventType: string;
  environment: string | null;
  locale: string | null;
  paymentMethodName: string | null;
  paymentMethodType: string | null;
  detectedCardBrand: string | null;
  sdkMessage: string | null;
  preflightStatus: string | null;
  preflightExpiresAt: string | null;
  createdAt: string;
}>;

export type AdminPaymentFilters = Readonly<{
  view?: AdminPaymentsView;
  search?: string;
  propertyId?: string;
  status?: string;
  page?: number;
}>;

export type AdminPaymentsPageData = Readonly<{
  generatedAt: string;
  properties: readonly AdminPropertyOption[];
  filters: AdminPaymentFilters;
  pagination: AdminPagination;
  payments: readonly AdminPaymentListItem[];
  events: readonly AdminPaymentEventListItem[];
}>;
