import { defaultLocale, locales } from "@/types/locale";

export const siteConfig = {
  technicalName: "trp-booking",
  internalName: "TRP Booking",
  brandName: "Tu Refugio Perfecto",
  publicName: "Bungalows Tu Refugio Perfecto",
  domain: "turefugioperfecto.com.gt",
  url: "https://turefugioperfecto.com.gt",
  defaultLocale,
  locales,
  emails: {
    reservationsEs: "reservas@turefugioperfecto.com.gt",
    reservationsEn: "reservations@turefugioperfecto.com.gt",
    admin: "admin@turefugioperfecto.com.gt",
  },
} as const;
