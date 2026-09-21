import type { TransactionalEmailLocale } from "@/types/email-provider";

export type AdminReviewSubmittedEmailTemplateReview = Readonly<{
  propertyNameEs: string;
  propertyNameEn: string;
  guestDisplayName: string;
  rating: number;
  comment: string;
  submittedAt: string;
}>;

export type AdminReviewSubmittedEmailTemplateInput = Readonly<{
  locale: TransactionalEmailLocale;
  publicBaseUrl: string;
  brandLogoUrl: string;
  review: AdminReviewSubmittedEmailTemplateReview;
}>;

export type AdminReviewSubmittedEmailTemplateViewModel = Readonly<{
  locale: TransactionalEmailLocale;
  propertyName: string;
  guestDisplayName: string;
  rating: string;
  comment: string;
  submittedAt: string;
  adminReviewsUrl: string;
  logoUrl: string;
  publicHomeUrl: string;
}>;
