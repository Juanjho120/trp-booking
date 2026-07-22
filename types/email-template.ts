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
  guestCount: number;
  arrivalTimeEstimate: string | null;
  total: string;
  currency: string;
  confirmedAt: string;
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
  nights: number;
  guestCount: number;
  arrivalTimeEstimate: string | null;
  total: string;
  confirmedAt: string;
  logoUrl: string;
  publicHomeUrl: string;
  adminReservationUrl: string;
  supportEmail: string;
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
}>;
