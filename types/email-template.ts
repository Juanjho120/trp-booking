import type { DateOnlyString } from "@/types/availability";
import type { TransactionalEmailLocale } from "@/types/email-provider";

export type TransactionalEmailContent = Readonly<{
  subject: string;
  html: string;
  text: string;
}>;

export type ReservationEmailTemplateHouseRule = Readonly<{
  titleEs: string;
  titleEn: string;
  descriptionEs: string;
  descriptionEn: string;
}>;

export type ReservationEmailTemplateHouseRuleViewModel = Readonly<{
  title: string;
  description: string;
}>;

export type ReservationEmailTemplateReservation = Readonly<{
  id: string;
  guestName: string;
  guestEmail: string;
  guestPhone: string | null;
  guestCountry: string | null;
  preferredLocale: TransactionalEmailLocale;
  propertyNameEs: string;
  propertyNameEn: string;
  houseRules: readonly ReservationEmailTemplateHouseRule[];
  checkInDate: DateOnlyString;
  checkOutDate: DateOnlyString;
  checkOutTime: string | null;
  guestCount: number;
  arrivalTimeEstimate: string | null;
  total: string;
  currency: string;
  confirmedAt: string;
  appliedPricingSummary: string | null;
}>;

export type ReservationEmailTemplateInput = Readonly<{
  locale: TransactionalEmailLocale;
  publicBaseUrl: string;
  brandLogoUrl: string;
  reservation: ReservationEmailTemplateReservation;
}>;

export type ArrivalInstructionsEmailTemplateInput =
  ReservationEmailTemplateInput &
    Readonly<{
      arrival: Readonly<{
        checkInTime: string;
        exactAddress: string;
        mapUrl: string | null;
        instructions: string;
      }>;
    }>;

export type ReservationEmailTemplateViewModel = Readonly<{
  locale: TransactionalEmailLocale;
  localeTag: "es-GT" | "en-US";
  reservationId: string;
  guestName: string;
  guestEmail: string;
  guestPhone: string | null;
  guestCountry: string | null;
  guestPreferredLocale: TransactionalEmailLocale;
  propertyName: string;
  houseRules: readonly ReservationEmailTemplateHouseRuleViewModel[];
  checkInDate: string;
  checkOutDate: string;
  checkOutTime: string | null;
  nights: number;
  guestCount: number;
  arrivalTimeEstimate: string | null;
  total: string;
  confirmedAt: string;
  logoUrl: string;
  publicHomeUrl: string;
  adminReservationUrl: string;
  supportEmail: string;
  appliedPricingSummary: string | null;
}>;

export type ArrivalInstructionsEmailTemplateViewModel =
  ReservationEmailTemplateViewModel &
    Readonly<{
      checkInTime: string;
      exactAddress: string;
      mapUrl: string | null;
      instructions: string;
    }>;

export type TransactionalEmailMessages = Readonly<{
  common: Readonly<{
    brandName: string;
    publicName: string;
    location: string;
    reservationReference: string;
    accommodation: string;
    checkIn: string;
    checkOut: string;
    checkInTime: string;
    checkOutTime: string;
    flexibleCheckOut: string;
    exactAddress: string;
    houseRules: string;
    nights: string;
    guests: string;
    arrivalTime: string;
    total: string;
    confirmedAt: string;
    guestName: string;
    guestEmail: string;
    guestPhone: string;
    guestCountry: string;
    preferredLanguage: string;
    notProvided: string;
    spanish: string;
    english: string;
    nightSingular: string;
    nightPlural: string;
    guestSingular: string;
    guestPlural: string;
    supportLabel: string;
    footer: string;
    appliedRates: string;
    seasonalRate: string;
    lengthOfStayRate: string;
  }>;
  reservationConfirmed: Readonly<{
    subjectPrefix: string;
    previewPrefix: string;
    eyebrow: string;
    title: string;
    greetingPrefix: string;
    introduction: string;
    summaryTitle: string;
    paymentNote: string;
    dateChangesTitle: string;
    dateChangesDescription: string;
    arrivalTitle: string;
    arrivalDescription: string;
    supportDescription: string;
    closing: string;
  }>;
  adminNewReservation: Readonly<{
    subjectPrefix: string;
    previewPrefix: string;
    eyebrow: string;
    title: string;
    introduction: string;
    reservationTitle: string;
    guestTitle: string;
    paymentNote: string;
    actionLabel: string;
    actionFallback: string;
    footer: string;
  }>;
  arrivalInstructions: Readonly<{
    subjectPrefix: string;
    previewPrefix: string;
    eyebrow: string;
    title: string;
    greetingPrefix: string;
    introduction: string;
    scheduleTitle: string;
    locationTitle: string;
    mapActionLabel: string;
    mapActionFallback: string;
    instructionsTitle: string;
    securityNote: string;
    supportDescription: string;
    closing: string;
  }>;
  reviewInvitation: Readonly<{
    subjectPrefix: string;
    preview: string;
    eyebrow: string;
    title: string;
    greetingPrefix: string;
    introduction: string;
    summaryTitle: string;
    checkoutLabel: string;
    expiresAtLabel: string;
    actionLabel: string;
    actionFallback: string;
    securityNote: string;
    supportDescription: string;
    closing: string;
  }>;
  adminReviewSubmitted: Readonly<{
    subjectPrefix: string;
    preview: string;
    eyebrow: string;
    title: string;
    introduction: string;
    summaryTitle: string;
    guestLabel: string;
    ratingLabel: string;
    submittedAtLabel: string;
    commentTitle: string;
    actionLabel: string;
    actionFallback: string;
    footer: string;
  }>;
  additionalChargeEmailLabels: Readonly<{
    guestPaymentRequestStatuses: Readonly<{
      PENDING: string;
      PAID: string;
      CANCELLED: string;
      EXPIRED: string;
    }>;
    paymentStatuses: Readonly<{
      APPROVED: string;
      PARTIALLY_REFUNDED: string;
      REFUNDED: string;
      PENDING: string;
      FAILED: string;
      REJECTED: string;
    }>;
    additionalChargeStatuses: Readonly<{
      PENDING: string;
      PAID: string;
      PARTIALLY_REFUNDED: string;
      REFUNDED: string;
      CANCELLED: string;
    }>;
    refundProcessingModes: Readonly<{
      TILOPAY_API: string;
      TILOPAY_PORTAL_FALLBACK: string;
    }>;
  }>;
  additionalChargePaymentRequired: Readonly<{
    subjectPrefix: string;
    preview: string;
    eyebrow: string;
    title: string;
    introduction: string;
    pendingNotice: string;
    summaryTitle: string;
    itemsTitle: string;
    requestLabel: string;
    totalLabel: string;
    expiresAtLabel: string;
    actionLabel: string;
    actionFallback: string;
    securityNote: string;
    supportDescription: string;
    categories: Readonly<{
      CLEANING: string;
      DAMAGE: string;
      TRANSPORT: string;
      LATE_CHECKOUT: string;
      EXTRA_SERVICE: string;
      OTHER: string;
    }>;
  }>;
  adminAdditionalChargePaymentRequired: Readonly<{
    subjectPrefix: string;
    preview: string;
    eyebrow: string;
    title: string;
    introduction: string;
    summaryTitle: string;
    itemsTitle: string;
    requestLabel: string;
    statusLabel: string;
    createdAtLabel: string;
    expiresAtLabel: string;
    intendedRecipientLabel: string;
    createdByLabel: string;
    totalLabel: string;
    actionLabel: string;
    actionFallback: string;
    footer: string;
  }>;
  additionalChargePaymentApproved: Readonly<{
    subjectPrefix: string;
    preview: string;
    eyebrow: string;
    title: string;
    introduction: string;
    summaryTitle: string;
    itemsTitle: string;
    paidAtLabel: string;
    totalLabel: string;
    supportDescription: string;
  }>;
  adminAdditionalChargePaymentApproved: Readonly<{
    subjectPrefix: string;
    preview: string;
    eyebrow: string;
    title: string;
    introduction: string;
    summaryTitle: string;
    itemsTitle: string;
    requestLabel: string;
    requestStatusLabel: string;
    paymentLabel: string;
    paymentStatusLabel: string;
    providerReferenceLabel: string;
    paidAtLabel: string;
    totalLabel: string;
    chargeStatusLabel: string;
    actionLabel: string;
    actionFallback: string;
    footer: string;
  }>;
  additionalChargeRefundProcessed: Readonly<{
    subjectPrefix: string;
    preview: string;
    eyebrow: string;
    title: string;
    introduction: string;
    summaryTitle: string;
    allocationsTitle: string;
    refundLabel: string;
    approvedAtLabel: string;
    totalLabel: string;
    originalAmountLabel: string;
    refundedAmountLabel: string;
    remainingAmountLabel: string;
    resultingStatusLabel: string;
    supportDescription: string;
  }>;
  adminAdditionalChargeRefundProcessed: Readonly<{
    subjectPrefix: string;
    preview: string;
    eyebrow: string;
    title: string;
    introduction: string;
    summaryTitle: string;
    allocationsTitle: string;
    refundLabel: string;
    requestLabel: string;
    paymentLabel: string;
    paymentStatusLabel: string;
    processingModeLabel: string;
    providerReferenceLabel: string;
    reasonLabel: string;
    requestedByLabel: string;
    approvedAtLabel: string;
    totalLabel: string;
    chargeLabel: string;
    originalAmountLabel: string;
    refundedAmountLabel: string;
    cumulativeRefundedLabel: string;
    remainingAmountLabel: string;
    resultingStatusLabel: string;
    actionLabel: string;
    actionFallback: string;
    footer: string;
  }>;
}>;
