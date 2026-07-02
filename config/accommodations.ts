import type { Accommodation } from "@/types/accommodation";

export const accommodations = [
  {
    id: "black-white-apartment",
    kind: "single",
    name: {
      es: "Apartamento Blanco y Negro",
      en: "Black & White Apartment",
    },
    slug: {
      es: "apartamento-blanco-y-negro",
      en: "black-white-apartment",
    },
    shortDescription: {
      es: "Alojamiento privado y cómodo en Panajachel, ideal para parejas o viajeros que buscan privacidad cerca del Lago de Atitlán.",
      en: "A private and comfortable accommodation in Panajachel, ideal for couples or travelers looking for privacy near Lake Atitlán.",
    },
    baseNightlyPriceUsd: 65,
    maxGuests: 2,
    bedrooms: 1,
    bathrooms: 1,
    preparationBuffer: {
      daysBefore: 1,
      daysAfter: 1,
    },
  },
  {
    id: "perfect-retreat-bungalow",
    kind: "single",
    name: {
      es: "Bungalow Refugio Perfecto",
      en: "Perfect Retreat Bungalow",
    },
    slug: {
      es: "bungalow-refugio-perfecto",
      en: "perfect-retreat-bungalow",
    },
    shortDescription: {
      es: "Bungalow privado y espacioso en Panajachel, ideal para familias, amigos o grupos pequeños.",
      en: "A private and spacious bungalow in Panajachel, ideal for families, friends, or small groups.",
    },
    baseNightlyPriceUsd: 95,
    maxGuests: 4,
    bedrooms: 2,
    bathrooms: 1,
    preparationBuffer: {
      daysBefore: 2,
      daysAfter: 2,
    },
  },
  {
    id: "complete-retreat",
    kind: "composed",
    name: {
      es: "Refugio Completo",
      en: "Complete Private Retreat in Panajachel",
    },
    slug: {
      es: "refugio-completo",
      en: "complete-private-retreat-panajachel",
    },
    shortDescription: {
      es: "Reserva ambos alojamientos juntos para disfrutar más espacio, privacidad y comodidad en Panajachel.",
      en: "Book both accommodations together to enjoy more space, privacy, and comfort in Panajachel.",
    },
    baseNightlyPriceUsd: 145,
    maxGuests: 6,
    bedrooms: 3,
    bathrooms: 2,
    preparationBuffer: {
      daysBefore: 2,
      daysAfter: 2,
    },
    composedOf: ["black-white-apartment", "perfect-retreat-bungalow"],
  },
] as const satisfies readonly Accommodation[];
