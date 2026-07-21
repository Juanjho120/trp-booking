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

export type AdminReservationDetailEmailNotification = Readonly<{
  id: string;
  type: string;
  recipient: string;
  locale: string;
  status: string;
  attemptCount: number;
  lastAttemptAt: string | null;
  nextAttemptAt: string | null;
  sentAt: string | null;
  providerMessageId: string | null;
  errorCode: string | null;
  errorMessage: string | null;
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
  emailNotifications: readonly AdminReservationDetailEmailNotification[];
}>;
