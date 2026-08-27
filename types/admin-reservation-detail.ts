import type { AdminPropertyOption } from "@/types/admin";
import type { AdminDateMutationRequestSummary } from "@/types/admin-reservation-date-mutation";
import type { AdminCancellationRequestSummary } from "@/types/admin-reservation-cancellation";
import type { AdminRefundSummary } from "@/types/admin-refund";
import type { AdminReservationOperationalHistoryEvent } from "@/types/admin-reservation-operational-history";
import type { DateOnlyString } from "@/types/availability";

export type AdminReservationDetailPayment = Readonly<{
  id: string;
  purpose: string;
  providerReference: string | null;
  providerTransactionId: string | null;
  status: string;
  amount: string;
  currency: string;
  paidAt: string | null;
  createdAt: string;
  updatedAt: string;
}>;

export type AdminReservationFinancialSummaryEligiblePayment = Readonly<{
  paymentId: string;
  purpose: string;
  status: string;
  amount: string;
  currency: string;
  providerReference: string | null;
  committedRefundAmount: string;
  approvedRefundAmount: string;
  remainingRefundableAmount: string;
}>;

export type AdminReservationFinancialSummary = Readonly<{
  currency: string;
  originalStayAmount: string;
  approvedCompletedPositiveStayAdjustments: string;
  currentStayValue: string;
  capturedStayPayments: string;
  committedStayRefunds: string;
  approvedStayRefunds: string;
  remainingRefundableStayBalance: string;
  eligibleStayPayments: readonly AdminReservationFinancialSummaryEligiblePayment[];
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

export type AdminReservationPricingBreakdownSegment = Readonly<{
  kind: "RESOLVED_RATE" | "PRESERVED_LEGACY_STAY";
  startDate: DateOnlyString;
  endDate: DateOnlyString;
  nights: number;
  source: "BASE" | "LENGTH_OF_STAY" | "SEASONAL" | null;
  seasonalRuleName: string | null;
  minimumNights: number | null;
  nightlyRate: string | null;
  subtotal: string;
}>;

export type AdminReservationPricingBreakdown = Readonly<{
  currency: string;
  subtotal: string;
  segments: readonly AdminReservationPricingBreakdownSegment[];
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
  dateMutationRequests: readonly AdminDateMutationRequestSummary[];
  refunds: readonly AdminRefundSummary[];
  financialSummary: AdminReservationFinancialSummary | null;
  operationalHistory: readonly AdminReservationOperationalHistoryEvent[];
  refundApiExecutionEnabled: boolean;
  pricingBreakdown: AdminReservationPricingBreakdown | null;
}>;
