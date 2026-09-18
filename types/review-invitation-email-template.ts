import type { TransactionalEmailLocale } from "@/types/email-provider";

export type ReviewInvitationEmailTemplateInput = Readonly<{
  locale: TransactionalEmailLocale;
  publicBaseUrl: string;
  brandLogoUrl: string;
  guestName: string;
  propertyNameEs: string;
  propertyNameEn: string;
  checkoutAt: string;
  expiresAt: string;
  reviewUrl: string;
}>;

export type ReviewInvitationEmailTemplateViewModel = Readonly<{
  locale: TransactionalEmailLocale;
  guestName: string;
  propertyName: string;
  checkoutAt: string;
  expiresAt: string;
  reviewUrl: string;
  logoUrl: string;
  publicHomeUrl: string;
  supportEmail: string;
}>;
