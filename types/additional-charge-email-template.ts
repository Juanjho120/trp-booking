import type { TransactionalEmailLocale } from "@/types/email-provider";
import type { AdditionalChargeCategory } from "@/types/additional-charge";

export type AdditionalChargeEmailReservation = Readonly<{
  id: string;
  guestName: string;
  guestEmail: string;
  preferredLocale: TransactionalEmailLocale;
  propertyNameEs: string;
  propertyNameEn: string;
  currency: string;
}>;

export type AdditionalChargePaymentRequiredEmailTemplateInput = Readonly<{
  locale: TransactionalEmailLocale;
  publicBaseUrl: string;
  brandLogoUrl: string;
  reservation: AdditionalChargeEmailReservation;
  paymentRequest: Readonly<{
    id: string;
    totalAmount: string;
    currency: string;
    expiresAt: string;
    paymentUrl: string;
    items: readonly Readonly<{
      category: AdditionalChargeCategory;
      description: string;
      amount: string;
      currency: string;
    }>[];
  }>;
}>;

export type AdditionalChargeEmailItem = Readonly<{
  category: AdditionalChargeCategory;
  description: string;
  amount: string;
  currency: string;
  status?: string | null;
}>;

export type AdditionalChargeAdminPaymentRequiredEmailTemplateInput = Readonly<{
  locale: TransactionalEmailLocale;
  publicBaseUrl: string;
  brandLogoUrl: string;
  reservation: AdditionalChargeEmailReservation;
  paymentRequest: Readonly<{
    id: string;
    totalAmount: string;
    currency: string;
    createdAt: string;
    expiresAt: string;
    status: string;
    createdByAdminName: string | null;
    createdByAdminEmail: string | null;
    intendedGuestRecipient: string;
    items: readonly AdditionalChargeEmailItem[];
  }>;
}>;

export type AdditionalChargePaymentApprovedEmailTemplateInput = Readonly<{
  locale: TransactionalEmailLocale;
  publicBaseUrl: string;
  brandLogoUrl: string;
  reservation: AdditionalChargeEmailReservation;
  payment: Readonly<{
    paidAt: string;
    totalAmount: string;
    currency: string;
    items: readonly AdditionalChargeEmailItem[];
  }>;
}>;

export type AdditionalChargeAdminPaymentApprovedEmailTemplateInput = Readonly<{
  locale: TransactionalEmailLocale;
  publicBaseUrl: string;
  brandLogoUrl: string;
  reservation: AdditionalChargeEmailReservation;
  paymentRequest: Readonly<{
    id: string;
    status: string;
  }>;
  payment: Readonly<{
    id: string;
    providerReference: string | null;
    paidAt: string;
    status: string;
    totalAmount: string;
    currency: string;
    items: readonly AdditionalChargeEmailItem[];
  }>;
}>;

export type AdditionalChargeRefundAllocationEmailItem = Readonly<{
  additionalChargeId?: string | null;
  category: AdditionalChargeCategory;
  description: string;
  originalAmount: string;
  allocatedAmount: string;
  cumulativeRefundedAmount?: string | null;
  remainingAmount?: string | null;
  currency: string;
  resultingStatus?: string | null;
}>;

export type AdditionalChargeRefundProcessedEmailTemplateInput = Readonly<{
  locale: TransactionalEmailLocale;
  publicBaseUrl: string;
  brandLogoUrl: string;
  reservation: AdditionalChargeEmailReservation;
  refund: Readonly<{
    id: string;
    totalAmount: string;
    currency: string;
    approvedAt: string;
    allocations: readonly AdditionalChargeRefundAllocationEmailItem[];
  }>;
}>;

export type AdditionalChargeAdminRefundProcessedEmailTemplateInput = Readonly<{
  locale: TransactionalEmailLocale;
  publicBaseUrl: string;
  brandLogoUrl: string;
  reservation: AdditionalChargeEmailReservation;
  guestPaymentRequestId: string;
  refund: Readonly<{
    id: string;
    paymentId: string;
    paymentStatus: string;
    processingMode: string;
    providerRefundId: string | null;
    reason: string | null;
    requestedByAdminName: string | null;
    requestedByAdminEmail: string | null;
    totalAmount: string;
    currency: string;
    approvedAt: string;
    allocations: readonly AdditionalChargeRefundAllocationEmailItem[];
  }>;
}>;
