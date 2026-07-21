import { defaultLocale, locales } from "@/types/locale";

export const environmentConfig = {
  test: {
    applicationDomain: "trp-booking.juantzun.dev",
    applicationUrl: "https://trp-booking.juantzun.dev",
    sendingDomain: "mail.trp-booking.juantzun.dev",
    adminEmail: "admin@mail.trp-booking.juantzun.dev",
  },
  production: {
    applicationDomain: "turefugioperfecto.com",
    applicationUrl: "https://turefugioperfecto.com",
    sendingDomain: "mail.turefugioperfecto.com",
    adminEmail: "admin@turefugioperfecto.com",
  },
} as const;

export const siteConfig = {
  technicalName: "trp-booking",
  internalName: "TRP Booking",
  brandName: "Tu Refugio Perfecto",
  publicName: "Bungalows Tu Refugio Perfecto",
  domain: environmentConfig.production.applicationDomain,
  url: environmentConfig.production.applicationUrl,
  defaultLocale,
  locales,
  emails: {
    reservationsEs: "reservas@turefugioperfecto.com",
    reservationsEn: "reservations@turefugioperfecto.com",
    admin: environmentConfig.production.adminEmail,
  },
} as const;
