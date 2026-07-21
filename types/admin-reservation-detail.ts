import type { AdminPropertyOption } from "@/types/admin";
import type { DateOnlyString } from "@/types/availability";

export type AdminReservationDetailPayment = Readonly<{
  id: string;
  providerReference: string | null;
  status: string;
  amount: string;
  currency: string;
  createdAt: string;
}>;

export type AdminReservationDetailData = Readonly<{
  id: string;
  property: AdminPropertyOption;
  guestName: string;
  guestEmail: string;
  guestPhone: string | null;
  guestCountry: string | null;
  arrivalTimeEstimate: string | null;
  checkInDate: DateOnlyString;
  checkOutDate: DateOnlyString;
  guestCount: number;
  status: string;
  subtotal: string;
  cleaningFee: string;
  taxes: string;
  discounts: string;
  total: string;
  currency: string;
  expiresAt: string | null;
  createdAt: string;
  payments: readonly AdminReservationDetailPayment[];
}>;
