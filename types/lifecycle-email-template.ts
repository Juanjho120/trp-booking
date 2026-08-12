import type { TransactionalEmailLocale } from "@/types/email-provider";

export type LifecycleRequestChannel = "EMAIL" | "PHONE" | "WHATSAPP" | "OTHER";
export type LifecycleAdjustmentPaymentStatus =
  | "PENDING"
  | "APPROVED"
  | "REJECTED"
  | "FAILED"
  | "REFUNDED"
  | "PARTIALLY_REFUNDED";
export type LifecycleRefundStatus =
  | "PENDING"
  | "PROCESSING"
  | "APPROVED"
  | "FAILED"
  | "MANUAL";
export type LifecycleRefundAuthorizationType =
  | "STANDARD_POLICY"
  | "EXTRAORDINARY"
  | "LIFECYCLE_ADJUSTMENT";
export type LifecycleRefundProcessingMode =
  | "TILOPAY_API"
  | "TILOPAY_PORTAL_FALLBACK"
  | "LEGACY_UNSPECIFIED";
export type LifecycleHoldStatus = "ACTIVE" | "RELEASED" | "EXPIRED";

export type LifecycleEmailReservation = Readonly<{
  id: string;
  guestName: string;
  guestEmail: string;
  preferredLocale: TransactionalEmailLocale;
  propertyNameEs: string;
  propertyNameEn: string;
  currency: string;
}>;

export type LifecycleEmailAdminContext = Readonly<{
  channel: LifecycleRequestChannel;
  requestNote?: string | null;
  createdByAdminName?: string | null;
  reviewedByAdminName?: string | null;
  decisionNote?: string | null;
}>;

export type LifecycleEmailTemplateBaseInput = Readonly<{
  locale: TransactionalEmailLocale;
  publicBaseUrl: string;
  brandLogoUrl: string;
  reservation: LifecycleEmailReservation;
}>;

export type ReservationCancelledEmailTemplateInput =
  LifecycleEmailTemplateBaseInput &
    Readonly<{
      cancellation: Readonly<{
        checkInDate: string;
        checkOutDate: string;
        cancelledAt: string;
        policyReasonCode:
          | "AT_LEAST_168_HOURS"
          | "BETWEEN_72_AND_168_HOURS"
          | "LESS_THAN_72_HOURS"
          | "NOT_APPLICABLE";
        refundPercentage: number;
        refundAmount: string;
        refundExpected: boolean;
      }>;
      admin?: LifecycleEmailAdminContext;
    }>;

export type ReservationDatesUpdatedEmailTemplateInput =
  LifecycleEmailTemplateBaseInput &
    Readonly<{
      dateChange: Readonly<{
        originalCheckInDate: string;
        originalCheckOutDate: string;
        requestedCheckInDate: string;
        requestedCheckOutDate: string;
        originalTotal: string;
        requestedTotal: string;
        financialDifference: string;
        completedAt: string;
        adjustmentPaymentStatus?: LifecycleAdjustmentPaymentStatus | null;
        refundStatus?: LifecycleRefundStatus | null;
        refundAmount?: string | null;
      }>;
      admin?: LifecycleEmailAdminContext;
    }>;

export type StayExtensionConfirmedEmailTemplateInput =
  LifecycleEmailTemplateBaseInput &
    Readonly<{
      extension: Readonly<{
        checkInDate: string;
        originalCheckOutDate: string;
        requestedCheckOutDate: string;
        addedNights: number;
        originalTotal: string;
        additionalAmount: string;
        requestedTotal: string;
        completedAt: string;
        adjustmentPaymentStatus?: LifecycleAdjustmentPaymentStatus | null;
        holdStatus?: LifecycleHoldStatus | null;
      }>;
      admin?: LifecycleEmailAdminContext;
    }>;

export type RefundProcessedEmailTemplateInput =
  LifecycleEmailTemplateBaseInput &
    Readonly<{
      refund: Readonly<{
        amount: string;
        approvedAt: string;
        authorizationType: LifecycleRefundAuthorizationType;
        processingMode: LifecycleRefundProcessingMode;
        paymentStatus: "REFUNDED" | "PARTIALLY_REFUNDED";
        providerRefundId?: string | null;
        reason?: string | null;
        operation?: Readonly<{
          key: string;
          movementCount: number;
          approvedMovementCount: number;
          requestedAmount: string;
        }> | null;
      }>;
      admin?: Readonly<{
        requestedByAdminName?: string | null;
        reconciledByAdminName?: string | null;
      }>;
    }>;

export type LifecycleAdjustmentPaymentRequiredEmailTemplateInput =
  LifecycleEmailTemplateBaseInput &
    Readonly<{
      paymentRequest: Readonly<{
        requestType: "DATE_CHANGE" | "STAY_EXTENSION";
        originalCheckInDate: string;
        originalCheckOutDate: string;
        requestedCheckInDate: string;
        requestedCheckOutDate: string;
        amount: string;
        holdExpiresAt: string;
        paymentUrl: string;
      }>;
    }>;

export type AdminLifecycleAdjustmentPaymentDeliveryStatusEmailTemplateInput =
  LifecycleEmailTemplateBaseInput &
    Readonly<{
      delivery: Readonly<{
        requestType: "DATE_CHANGE" | "STAY_EXTENSION";
        outcome: "SENT" | "FAILED";
        intendedGuestRecipient: string;
        sourceNotificationId: string;
        attemptCount: number;
        observedAt: string;
        errorCode?: string | null;
      }>;
    }>;
