import type { AdminPropertyOption } from "@/types/admin";
import type { AdminPaymentDiagnostics } from "@/types/admin-payments";
import type { DateOnlyString } from "@/types/availability";

export type AdminPaymentDetailReservation = Readonly<{
  id: string;
  property: AdminPropertyOption;
  guestName: string;
  guestEmail: string;
  checkInDate: DateOnlyString;
  checkOutDate: DateOnlyString;
  guestCount: number;
  status: string;
  total: string;
  currency: string;
}>;

export type AdminPaymentDetailClientEvent = Readonly<{
  id: string;
  eventType: string;
  environment: string | null;
  sdkMessage: string | null;
  createdAt: string;
}>;

export type AdminPaymentDetailData = Readonly<{
  id: string;
  providerReference: string | null;
  providerTransactionId: string | null;
  status: string;
  amount: string;
  currency: string;
  createdAt: string;
  diagnostics: AdminPaymentDiagnostics;
  reservation: AdminPaymentDetailReservation;
  clientEvents: readonly AdminPaymentDetailClientEvent[];
}>;
