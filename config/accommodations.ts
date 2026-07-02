import type { Accommodation, AccommodationId } from "@/types/accommodation";
import type { Locale } from "@/types/locale";

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
    longDescription: {
      es: "Disfruta una estadía cómoda en Apartamento Blanco y Negro, un alojamiento privado en Panajachel con diseño moderno, ambiente limpio y detalles pensados para descansar. Su decoración en tonos blanco y negro, piso de granito, dormitorio acogedor, baño completo y área interior funcional lo convierten en una opción ideal para parejas o viajeros que buscan privacidad, comodidad y una ubicación conveniente cerca del Lago de Atitlán.",
      en: "Enjoy a comfortable stay at Black & White Apartment, a private accommodation in Panajachel with a modern design, clean atmosphere, and thoughtful details for rest. Its black and white decor, granite floor, cozy bedroom, full bathroom, and functional indoor area make it ideal for couples or travelers looking for privacy, comfort, and a convenient location near Lake Atitlán.",
    },
    baseNightlyPriceUsd: 65,
    maxGuests: 2,
    bedrooms: 1,
    bathrooms: 1,
    preparationBuffer: {
      daysBefore: 1,
      daysAfter: 1,
    },
    arrivalPolicy: {
      checkInFrom: {
        es: "Check-in a partir de las 8:00 a. m.",
        en: "Check-in from 8:00 a.m.",
      },
      earlyCheckInNote: {
        es: "El check-in más temprano puede coordinarse si el huésped avisa con anticipación.",
        en: "Earlier check-in may be coordinated if the guest notifies the host in advance.",
      },
    },
    coverImage: {
      src: "/images/accommodations/black-white-apartment/cover.webp",
      alt: {
        es: "Patio exterior azul de Apartamento Blanco y Negro en Panajachel.",
        en: "Blue exterior courtyard of Black & White Apartment in Panajachel.",
      },
    },
    galleryImages: [
      {
        src: "/images/accommodations/black-white-apartment/gallery-01.webp",
        alt: {
          es: "Dormitorio con decoración en blanco y negro del apartamento.",
          en: "Bedroom with black and white decor in the apartment.",
        },
      },
      {
        src: "/images/accommodations/black-white-apartment/gallery-02.webp",
        alt: {
          es: "Área interior funcional con cocina y mesa del apartamento.",
          en: "Functional indoor area with kitchen and table in the apartment.",
        },
      },
      {
        src: "/images/accommodations/black-white-apartment/gallery-03.webp",
        alt: {
          es: "Baño privado del Apartamento Blanco y Negro.",
          en: "Private bathroom of Black & White Apartment.",
        },
      },
    ],
    highlights: {
      es: ["Hasta 2 huéspedes", "1 dormitorio", "1 baño", "WiFi de fibra óptica 100 Mbps"],
      en: ["Up to 2 guests", "1 bedroom", "1 bathroom", "100 Mbps fiber optic WiFi"],
    },
    amenities: {
      es: [
        "Agua caliente",
        "WiFi de fibra óptica 100 Mbps",
        "Cocina completa",
        "Refrigerador",
        "Estufa de gas con horno",
        "Cafetera de filtro",
        "Ropa de cama",
        "Ventiladores portátiles",
        "Patio compartido",
        "Estacionamiento gratuito en la calle",
      ],
      en: [
        "Hot water",
        "100 Mbps fiber optic WiFi",
        "Full kitchen",
        "Refrigerator",
        "Gas stove with oven",
        "Drip coffee maker",
        "Bed linens",
        "Portable fans",
        "Shared patio",
        "Free street parking",
      ],
    },
    rules: {
      es: [
        "Máximo 2 huéspedes.",
        "No se admiten mascotas.",
        "Horas de silencio de 9:00 p. m. a 7:00 a. m.",
        "No se admiten fiestas o eventos.",
        "Prohibido fumar.",
        "No se permite el ingreso de bebidas alcohólicas.",
        "Cuidar instalaciones, muebles, ropa de cama y toallas durante la estancia.",
      ],
      en: [
        "Maximum 2 guests.",
        "Pets are not allowed.",
        "Quiet hours from 9:00 p.m. to 7:00 a.m.",
        "Parties or events are not allowed.",
        "No smoking.",
        "Alcoholic beverages are not allowed.",
        "Please take care of the facilities, furniture, bed linens, and towels during the stay.",
      ],
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
    longDescription: {
      es: "Bungalow Refugio Perfecto es una opción cómoda y privada para hospedarte en Panajachel, cerca del Lago de Atitlán. Su ambiente amplio, tranquilo y funcional lo convierte en un espacio ideal para descansar después de recorrer el pueblo, visitar el lago o disfrutar una escapada en pareja, familia o con amigos.",
      en: "Perfect Retreat Bungalow is a comfortable and private option for staying in Panajachel, near Lake Atitlán. Its spacious, quiet, and functional atmosphere makes it ideal for resting after exploring town, visiting the lake, or enjoying a getaway as a couple, family, or with friends.",
    },
    baseNightlyPriceUsd: 95,
    maxGuests: 4,
    bedrooms: 2,
    bathrooms: 1,
    preparationBuffer: {
      daysBefore: 2,
      daysAfter: 2,
    },
    arrivalPolicy: {
      checkInFrom: {
        es: "Check-in a partir de las 8:00 a. m.",
        en: "Check-in from 8:00 a.m.",
      },
      earlyCheckInNote: {
        es: "El check-in más temprano puede coordinarse si el huésped avisa con anticipación.",
        en: "Earlier check-in may be coordinated if the guest notifies the host in advance.",
      },
    },
    coverImage: {
      src: "/images/accommodations/perfect-retreat-bungalow/cover.webp",
      alt: {
        es: "Entrada del Bungalow Refugio Perfecto con patio exterior.",
        en: "Entrance of Perfect Retreat Bungalow with exterior courtyard.",
      },
    },
    galleryImages: [
      {
        src: "/images/accommodations/perfect-retreat-bungalow/gallery-01.webp",
        alt: {
          es: "Dormitorio del Bungalow Refugio Perfecto con tonos crema y cortinas grises.",
          en: "Bedroom of Perfect Retreat Bungalow with cream tones and gray curtains.",
        },
      },
      {
        src: "/images/accommodations/perfect-retreat-bungalow/gallery-02.webp",
        alt: {
          es: "Área de comedor y cocina equipada del bungalow.",
          en: "Dining area and equipped kitchen of the bungalow.",
        },
      },
      {
        src: "/images/accommodations/perfect-retreat-bungalow/gallery-03.webp",
        alt: {
          es: "Baño completo del Bungalow Refugio Perfecto.",
          en: "Full bathroom of Perfect Retreat Bungalow.",
        },
      },
    ],
    highlights: {
      es: ["Hasta 4 huéspedes", "2 dormitorios", "1 baño", "Ambiente amplio y privado"],
      en: ["Up to 4 guests", "2 bedrooms", "1 bathroom", "Spacious and private atmosphere"],
    },
    amenities: {
      es: [
        "Agua caliente",
        "WiFi de fibra óptica 100 Mbps",
        "Cocina completa",
        "Refrigerador",
        "Estufa de gas con horno",
        "Cafetera de filtro",
        "Ropa de cama",
        "Caja fuerte",
        "Equipo para hacer ejercicio",
        "Patio compartido",
        "Se permite dejar el equipaje",
      ],
      en: [
        "Hot water",
        "100 Mbps fiber optic WiFi",
        "Full kitchen",
        "Refrigerator",
        "Gas stove with oven",
        "Drip coffee maker",
        "Bed linens",
        "Safe box",
        "Exercise equipment",
        "Shared patio",
        "Luggage drop-off allowed",
      ],
    },
    rules: {
      es: [
        "Máximo 4 huéspedes.",
        "No se admiten mascotas.",
        "Horas de silencio de 9:00 p. m. a 7:00 a. m.",
        "No se admiten fiestas o eventos.",
        "Prohibido fumar.",
        "No se permite el ingreso de bebidas alcohólicas.",
        "Cuidar instalaciones, muebles, ropa de cama y toallas durante la estancia.",
      ],
      en: [
        "Maximum 4 guests.",
        "Pets are not allowed.",
        "Quiet hours from 9:00 p.m. to 7:00 a.m.",
        "Parties or events are not allowed.",
        "No smoking.",
        "Alcoholic beverages are not allowed.",
        "Please take care of the facilities, furniture, bed linens, and towels during the stay.",
      ],
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
    longDescription: {
      es: "Disfruta una estadía privada y cómoda en Refugio Completo, una opción ideal para familias o grupos pequeños que desean reservar dos alojamientos juntos en Panajachel. Este anuncio combina Apartamento Blanco y Negro y Bungalow Refugio Perfecto, ofreciendo más espacio, dormitorios independientes, baños completos, cocina, comedor y áreas interiores funcionales.",
      en: "Enjoy a private and comfortable stay at Complete Private Retreat in Panajachel, an ideal option for families or small groups who want to book two accommodations together. This listing combines Black & White Apartment and Perfect Retreat Bungalow, offering more space, independent bedrooms, full bathrooms, a kitchen, dining area, and functional indoor spaces.",
    },
    baseNightlyPriceUsd: 145,
    maxGuests: 6,
    bedrooms: 3,
    bathrooms: 2,
    preparationBuffer: {
      daysBefore: 2,
      daysAfter: 2,
    },
    arrivalPolicy: {
      checkInFrom: {
        es: "Check-in a partir de las 8:00 a. m.",
        en: "Check-in from 8:00 a.m.",
      },
      earlyCheckInNote: {
        es: "El check-in más temprano puede coordinarse si el huésped avisa con anticipación.",
        en: "Earlier check-in may be coordinated if the guest notifies the host in advance.",
      },
    },
    coverImage: {
      src: "/images/accommodations/complete-retreat/cover.webp",
      alt: {
        es: "Patio exterior compartido de Tu Refugio Perfecto en Panajachel.",
        en: "Shared exterior courtyard of Tu Refugio Perfecto in Panajachel.",
      },
    },
    galleryImages: [
      {
        src: "/images/accommodations/complete-retreat/gallery-01.webp",
        alt: {
          es: "Dormitorio de Apartamento Blanco y Negro incluido en Refugio Completo.",
          en: "Bedroom of Black & White Apartment included in the complete retreat.",
        },
      },
      {
        src: "/images/accommodations/complete-retreat/gallery-02.webp",
        alt: {
          es: "Comedor del Bungalow Refugio Perfecto incluido en Refugio Completo.",
          en: "Dining area of Perfect Retreat Bungalow included in the complete retreat.",
        },
      },
      {
        src: "/images/accommodations/complete-retreat/gallery-03.webp",
        alt: {
          es: "Baño completo disponible al reservar Refugio Completo.",
          en: "Full bathroom available when booking the complete retreat.",
        },
      },
    ],
    highlights: {
      es: ["Hasta 6 huéspedes", "3 dormitorios", "2 baños", "Dos alojamientos en una sola reserva"],
      en: ["Up to 6 guests", "3 bedrooms", "2 bathrooms", "Two accommodations in one booking"],
    },
    amenities: {
      es: [
        "Acceso a ambos alojamientos",
        "WiFi de fibra óptica 100 Mbps",
        "Cocina completa",
        "Dormitorios independientes",
        "Baños completos",
        "Comedor y áreas interiores funcionales",
        "Patio compartido",
        "Estacionamiento gratuito en la calle",
        "Ideal para familias o grupos pequeños",
      ],
      en: [
        "Access to both accommodations",
        "100 Mbps fiber optic WiFi",
        "Full kitchen",
        "Independent bedrooms",
        "Full bathrooms",
        "Dining and functional indoor areas",
        "Shared patio",
        "Free street parking",
        "Ideal for families or small groups",
      ],
    },
    rules: {
      es: [
        "Máximo 6 huéspedes.",
        "No se admiten mascotas.",
        "Horas de silencio de 9:00 p. m. a 7:00 a. m.",
        "No se admiten fiestas o eventos.",
        "Prohibido fumar.",
        "No se permite el ingreso de bebidas alcohólicas.",
        "El huésped debe respetar las reglas de ambos alojamientos.",
      ],
      en: [
        "Maximum 6 guests.",
        "Pets are not allowed.",
        "Quiet hours from 9:00 p.m. to 7:00 a.m.",
        "Parties or events are not allowed.",
        "No smoking.",
        "Alcoholic beverages are not allowed.",
        "Guests must follow the rules of both accommodations.",
      ],
    },
    composedOf: ["black-white-apartment", "perfect-retreat-bungalow"],
  },
] as const satisfies readonly Accommodation[];

export function getAccommodationById(id: AccommodationId) {
  return accommodations.find((accommodation) => accommodation.id === id);
}

export function getAccommodationBySlug(slug: string, locale: Locale = "es") {
  return accommodations.find((accommodation) => accommodation.slug[locale] === slug);
}

export function getAccommodationSlugs(locale: Locale = "es") {
  return accommodations.map((accommodation) => accommodation.slug[locale]);
}
