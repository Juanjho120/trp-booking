import type { AdminPropertyOption } from "@/types/admin";
import type { AdminCancellationRequestSummary } from "@/types/admin-reservation-cancellation";
import type { DateOnlyString } from "@/types/availability";

export type AdminReservationDetailPayment = Readonly<{
  id: string;
  providerReference: string | null;
  status: string;
  amount: string;
  currency: string;
  createdAt: string;
}>;

export type AdminReservationDetailEmailNotificationAdmin = Readonly<{
  name: string | null;
  email: string;
}>;

export type AdminReservationDetailEmailNotification = Readonly<{
  id: string;
  type: string;
  recipient: string;
  locale: string;
  origin: string;
  parentNotificationId: string | null;
  hasManualResends: boolean;
  requestedAt: string | null;
  requestedByAdmin: AdminReservationDetailEmailNotificationAdmin | null;
  status: string;
  attemptCount: number;
  lastAttemptAt: string | null;
  nextAttemptAt: string | null;
  scheduledFor: string | null;
  sentAt: string | null;
  providerMessageId: string | null;
  errorCode: string | null;
  errorMessage: string | null;
  createdAt: string;
  updatedAt: string;
}>;

export type AdminReservationDetailData = Readonly<{
  id: string;
  property: AdminPropertyOption &
    Readonly<{
      checkInTime: string;
    }>;
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
  confirmedAt: string | null;
  cancelledAt: string | null;
  createdAt: string;
  updatedAt: string;
  payments: readonly AdminReservationDetailPayment[];
  emailNotifications: readonly AdminReservationDetailEmailNotification[];
  cancellationRequests: readonly AdminCancellationRequestSummary[];
}>;
