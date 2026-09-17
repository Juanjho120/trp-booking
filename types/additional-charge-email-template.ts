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
