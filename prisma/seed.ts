import { Prisma, PrismaClient, PropertyStatus } from "@prisma/client";

const prisma = new PrismaClient();

type PropertySeed = Readonly<{
  id: string;
  nameEs: string;
  nameEn: string;
  slug: string;
  shortDescriptionEs: string;
  shortDescriptionEn: string;
  longDescriptionEs: string;
  longDescriptionEn: string;
  maxGuests: number;
  bedrooms: number;
  bathrooms: number;
  baseNightlyPrice: string;
  checkInTime: string;
  checkOutTime?: string | null;
  isComposed: boolean;
  preparationDaysBefore: number;
  preparationDaysAfter: number;
}>;

type AmenitySeed = Readonly<{
  id: string;
  key: string;
  nameEs: string;
  nameEn: string;
  icon: string;
  category: string;
}>;

type HouseRuleSeed = Readonly<{
  id: string;
  key: string;
  titleEs: string;
  titleEn: string;
  descriptionEs: string;
  descriptionEn: string;
  category: string;
}>;

const properties: readonly PropertySeed[] = [
  {
    id: "black-white-apartment",
    nameEs: "Apartamento Blanco y Negro",
    nameEn: "Black & White Apartment",
    slug: "apartamento-blanco-y-negro",
    shortDescriptionEs:
      "Alojamiento privado y cómodo en Panajachel, ideal para parejas o viajeros que buscan privacidad cerca del Lago de Atitlán.",
    shortDescriptionEn:
      "A private and comfortable accommodation in Panajachel, ideal for couples or travelers looking for privacy near Lake Atitlán.",
    longDescriptionEs:
      "Disfruta una estadía cómoda en Apartamento Blanco y Negro, un alojamiento privado en Panajachel con diseño moderno, ambiente limpio y detalles pensados para descansar. Su decoración en tonos blanco y negro, piso de granito, dormitorio acogedor, baño completo y área interior funcional lo convierten en una opción ideal para parejas o viajeros que buscan privacidad, comodidad y una ubicación conveniente cerca del Lago de Atitlán.",
    longDescriptionEn:
      "Enjoy a comfortable stay at Black & White Apartment, a private accommodation in Panajachel with a modern design, clean atmosphere, and thoughtful details for rest. Its black and white decor, granite floor, cozy bedroom, full bathroom, and functional indoor area make it ideal for couples or travelers looking for privacy, comfort, and a convenient location near Lake Atitlán.",
    maxGuests: 2,
    bedrooms: 1,
    bathrooms: 1,
    baseNightlyPrice: "65.00",
    checkInTime: "8:00 a.m.",
    checkOutTime: null,
    isComposed: false,
    preparationDaysBefore: 1,
    preparationDaysAfter: 1,
  },
  {
    id: "perfect-retreat-bungalow",
    nameEs: "Bungalow Refugio Perfecto",
    nameEn: "Perfect Retreat Bungalow",
    slug: "bungalow-refugio-perfecto",
    shortDescriptionEs:
      "Bungalow privado y espacioso en Panajachel, ideal para familias, amigos o grupos pequeños.",
    shortDescriptionEn:
      "A private and spacious bungalow in Panajachel, ideal for families, friends, or small groups.",
    longDescriptionEs:
      "Bungalow Refugio Perfecto es una opción cómoda y privada para hospedarte en Panajachel, cerca del Lago de Atitlán. Su ambiente amplio, tranquilo y funcional lo convierte en un espacio ideal para descansar después de recorrer el pueblo, visitar el lago o disfrutar una escapada en pareja, familia o con amigos.",
    longDescriptionEn:
      "Perfect Retreat Bungalow is a comfortable and private option for staying in Panajachel, near Lake Atitlán. Its spacious, quiet, and functional atmosphere makes it ideal for resting after exploring town, visiting the lake, or enjoying a getaway as a couple, family, or with friends.",
    maxGuests: 4,
    bedrooms: 2,
    bathrooms: 1,
    baseNightlyPrice: "95.00",
    checkInTime: "8:00 a.m.",
    checkOutTime: null,
    isComposed: false,
    preparationDaysBefore: 2,
    preparationDaysAfter: 2,
  },
  {
    id: "complete-retreat",
    nameEs: "Refugio Completo",
    nameEn: "Complete Private Retreat in Panajachel",
    slug: "refugio-completo",
    shortDescriptionEs:
      "Reserva ambos alojamientos juntos para disfrutar más espacio, privacidad y comodidad en Panajachel.",
    shortDescriptionEn:
      "Book both accommodations together to enjoy more space, privacy, and comfort in Panajachel.",
    longDescriptionEs:
      "Disfruta una estadía privada y cómoda en Refugio Completo, una opción ideal para familias o grupos pequeños que desean reservar dos alojamientos juntos en Panajachel. Este anuncio combina Apartamento Blanco y Negro y Bungalow Refugio Perfecto, ofreciendo más espacio, dormitorios independientes, baños completos, cocina, comedor y áreas interiores funcionales.",
    longDescriptionEn:
      "Enjoy a private and comfortable stay at Complete Private Retreat in Panajachel, an ideal option for families or small groups who want to book two accommodations together. This listing combines Black & White Apartment and Perfect Retreat Bungalow, offering more space, independent bedrooms, full bathrooms, a kitchen, dining area, and functional indoor spaces.",
    maxGuests: 6,
    bedrooms: 3,
    bathrooms: 2,
    baseNightlyPrice: "145.00",
    checkInTime: "8:00 a.m.",
    checkOutTime: null,
    isComposed: true,
    preparationDaysBefore: 2,
    preparationDaysAfter: 2,
  },
];

const propertyComponents = [
  {
    id: "complete-retreat_black-white-apartment",
    parentPropertyId: "complete-retreat",
    componentPropertyId: "black-white-apartment",
  },
  {
    id: "complete-retreat_perfect-retreat-bungalow",
    parentPropertyId: "complete-retreat",
    componentPropertyId: "perfect-retreat-bungalow",
  },
] as const;

const amenities: readonly AmenitySeed[] = [
  { id: "amenity_combined-access", key: "combined-access", icon: "home", category: "access", nameEs: "Acceso a ambos alojamientos", nameEn: "Access to both accommodations" },
  { id: "amenity_dining-indoor-areas", key: "dining-indoor-areas", icon: "utensils", category: "spaces", nameEs: "Comedor y áreas interiores funcionales", nameEn: "Dining and functional indoor areas" },
  { id: "amenity_drip-coffee-maker", key: "drip-coffee-maker", icon: "coffee", category: "kitchen", nameEs: "Cafetera de filtro", nameEn: "Drip coffee maker" },
  { id: "amenity_family-groups", key: "family-groups", icon: "users", category: "guest-fit", nameEs: "Ideal para familias o grupos pequeños", nameEn: "Ideal for families or small groups" },
  { id: "amenity_fiber-wifi", key: "fiber-wifi", icon: "wifi", category: "connectivity", nameEs: "WiFi de fibra óptica 100 Mbps", nameEn: "100 Mbps fiber optic WiFi" },
  { id: "amenity_free-street-parking", key: "free-street-parking", icon: "car", category: "parking", nameEs: "Estacionamiento gratuito en la calle", nameEn: "Free street parking" },
  { id: "amenity_full-bathrooms", key: "full-bathrooms", icon: "bath", category: "bathroom", nameEs: "Baños completos", nameEn: "Full bathrooms" },
  { id: "amenity_full-kitchen", key: "full-kitchen", icon: "chefHat", category: "kitchen", nameEs: "Cocina completa", nameEn: "Full kitchen" },
  { id: "amenity_gas-stove-oven", key: "gas-stove-oven", icon: "flame", category: "kitchen", nameEs: "Estufa de gas con horno", nameEn: "Gas stove with oven" },
  { id: "amenity_hot-water", key: "hot-water", icon: "showerHead", category: "bathroom", nameEs: "Agua caliente", nameEn: "Hot water" },
  { id: "amenity_independent-bedrooms", key: "independent-bedrooms", icon: "bed", category: "bedroom", nameEs: "Dormitorios independientes", nameEn: "Independent bedrooms" },
  { id: "amenity_refrigerator", key: "refrigerator", icon: "refrigerator", category: "kitchen", nameEs: "Refrigerador", nameEn: "Refrigerator" },
  { id: "amenity_bed-linens", key: "bed-linens", icon: "bed", category: "bedroom", nameEs: "Ropa de cama", nameEn: "Bed linens" },
  { id: "amenity_portable-fans", key: "portable-fans", icon: "fan", category: "comfort", nameEs: "Ventiladores portátiles", nameEn: "Portable fans" },
  { id: "amenity_safe-box", key: "safe-box", icon: "shieldCheck", category: "safety", nameEs: "Caja fuerte", nameEn: "Safe box" },
  { id: "amenity_exercise-equipment", key: "exercise-equipment", icon: "dumbbell", category: "comfort", nameEs: "Equipo para hacer ejercicio", nameEn: "Exercise equipment" },
  { id: "amenity_shared-patio", key: "shared-patio", icon: "treePalm", category: "outdoor", nameEs: "Patio compartido", nameEn: "Shared patio" },
  { id: "amenity_luggage-drop-off", key: "luggage-drop-off", icon: "briefcase", category: "guest-services", nameEs: "Se permite dejar el equipaje", nameEn: "Luggage drop-off allowed" },
];

const propertyAmenities: Readonly<Record<string, readonly string[]>> = {
  "black-white-apartment": [
    "hot-water",
    "fiber-wifi",
    "full-kitchen",
    "refrigerator",
    "gas-stove-oven",
    "drip-coffee-maker",
    "bed-linens",
    "portable-fans",
    "shared-patio",
    "free-street-parking",
  ],
  "perfect-retreat-bungalow": [
    "hot-water",
    "fiber-wifi",
    "full-kitchen",
    "refrigerator",
    "gas-stove-oven",
    "drip-coffee-maker",
    "bed-linens",
    "safe-box",
    "exercise-equipment",
    "shared-patio",
    "luggage-drop-off",
  ],
  "complete-retreat": [
    "combined-access",
    "fiber-wifi",
    "full-kitchen",
    "independent-bedrooms",
    "full-bathrooms",
    "dining-indoor-areas",
    "shared-patio",
    "free-street-parking",
    "family-groups",
  ],
};

const houseRules: readonly HouseRuleSeed[] = [
  { id: "rule_max-guests-2", key: "max-guests-2", category: "capacity", titleEs: "Máximo 2 huéspedes", titleEn: "Maximum 2 guests", descriptionEs: "Máximo 2 huéspedes.", descriptionEn: "Maximum 2 guests." },
  { id: "rule_max-guests-4", key: "max-guests-4", category: "capacity", titleEs: "Máximo 4 huéspedes", titleEn: "Maximum 4 guests", descriptionEs: "Máximo 4 huéspedes.", descriptionEn: "Maximum 4 guests." },
  { id: "rule_max-guests-6", key: "max-guests-6", category: "capacity", titleEs: "Máximo 6 huéspedes", titleEn: "Maximum 6 guests", descriptionEs: "Máximo 6 huéspedes.", descriptionEn: "Maximum 6 guests." },
  { id: "rule_no-pets", key: "no-pets", category: "house-rules", titleEs: "No mascotas", titleEn: "No pets", descriptionEs: "No se admiten mascotas.", descriptionEn: "Pets are not allowed." },
  { id: "rule_quiet-hours", key: "quiet-hours", category: "house-rules", titleEs: "Horas de silencio", titleEn: "Quiet hours", descriptionEs: "Horas de silencio de 9:00 p. m. a 7:00 a. m.", descriptionEn: "Quiet hours from 9:00 p.m. to 7:00 a.m." },
  { id: "rule_no-parties", key: "no-parties", category: "house-rules", titleEs: "No fiestas", titleEn: "No parties", descriptionEs: "No se admiten fiestas o eventos.", descriptionEn: "Parties or events are not allowed." },
  { id: "rule_no-smoking", key: "no-smoking", category: "house-rules", titleEs: "Prohibido fumar", titleEn: "No smoking", descriptionEs: "Prohibido fumar.", descriptionEn: "No smoking." },
  { id: "rule_no-alcohol", key: "no-alcohol", category: "house-rules", titleEs: "No alcohol", titleEn: "No alcohol", descriptionEs: "No se permite el ingreso de bebidas alcohólicas.", descriptionEn: "Alcoholic beverages are not allowed." },
  { id: "rule_care-property", key: "care-property", category: "care", titleEs: "Cuidar el alojamiento", titleEn: "Care for the accommodation", descriptionEs: "Cuidar instalaciones, muebles, ropa de cama y toallas durante la estancia.", descriptionEn: "Please take care of the facilities, furniture, bed linens, and towels during the stay." },
  { id: "rule_respect-both-listings", key: "respect-both-listings", category: "composed", titleEs: "Respetar ambos alojamientos", titleEn: "Respect both accommodations", descriptionEs: "El huésped debe respetar las reglas de ambos alojamientos.", descriptionEn: "Guests must follow the rules of both accommodations." },
];

const propertyRules: Readonly<Record<string, readonly string[]>> = {
  "black-white-apartment": [
    "max-guests-2",
    "no-pets",
    "quiet-hours",
    "no-parties",
    "no-smoking",
    "no-alcohol",
    "care-property",
  ],
  "perfect-retreat-bungalow": [
    "max-guests-4",
    "no-pets",
    "quiet-hours",
    "no-parties",
    "no-smoking",
    "no-alcohol",
    "care-property",
  ],
  "complete-retreat": [
    "max-guests-6",
    "no-pets",
    "quiet-hours",
    "no-parties",
    "no-smoking",
    "no-alcohol",
    "respect-both-listings",
  ],
};

async function seedProperties(): Promise<void> {
  for (const property of properties) {
    await prisma.property.upsert({
      where: { id: property.id },
      update: {
        nameEs: property.nameEs,
        nameEn: property.nameEn,
        slug: property.slug,
        shortDescriptionEs: property.shortDescriptionEs,
        shortDescriptionEn: property.shortDescriptionEn,
        longDescriptionEs: property.longDescriptionEs,
        longDescriptionEn: property.longDescriptionEn,
        maxGuests: property.maxGuests,
        bedrooms: property.bedrooms,
        bathrooms: property.bathrooms,
        baseNightlyPrice: new Prisma.Decimal(property.baseNightlyPrice),
        currency: "USD",
        status: PropertyStatus.ACTIVE,
        checkInTime: property.checkInTime,
        checkOutTime: property.checkOutTime ?? null,
        isComposed: property.isComposed,
        preparationDaysBefore: property.preparationDaysBefore,
        preparationDaysAfter: property.preparationDaysAfter,
        deletedAt: null,
        deletedById: null,
      },
      create: {
        id: property.id,
        nameEs: property.nameEs,
        nameEn: property.nameEn,
        slug: property.slug,
        shortDescriptionEs: property.shortDescriptionEs,
        shortDescriptionEn: property.shortDescriptionEn,
        longDescriptionEs: property.longDescriptionEs,
        longDescriptionEn: property.longDescriptionEn,
        maxGuests: property.maxGuests,
        bedrooms: property.bedrooms,
        bathrooms: property.bathrooms,
        baseNightlyPrice: new Prisma.Decimal(property.baseNightlyPrice),
        currency: "USD",
        status: PropertyStatus.ACTIVE,
        checkInTime: property.checkInTime,
        checkOutTime: property.checkOutTime ?? null,
        isComposed: property.isComposed,
        preparationDaysBefore: property.preparationDaysBefore,
        preparationDaysAfter: property.preparationDaysAfter,
      },
    });
  }
}

async function seedPropertyComponents(): Promise<void> {
  for (const component of propertyComponents) {
    await prisma.propertyComponent.upsert({
      where: {
        parentPropertyId_componentPropertyId: {
          parentPropertyId: component.parentPropertyId,
          componentPropertyId: component.componentPropertyId,
        },
      },
      update: {},
      create: component,
    });
  }
}

async function seedPropertyImages(): Promise<void> {
  // Public images are Cloudinary-owned data and must not be seeded with local placeholders.
  // This cleanup only soft-deletes legacy local placeholder rows generated by older seeds.
  await prisma.propertyImage.updateMany({
    where: {
      deletedAt: null,
      cloudinaryPublicId: null,
      OR: [
        { url: { startsWith: "/images/accommodations/" } },
        { secureUrl: { startsWith: "/images/accommodations/" } },
      ],
    },
    data: {
      deletedAt: new Date(),
      deletedById: null,
    },
  });
}

async function seedAmenities(): Promise<void> {
  for (const amenity of amenities) {
    await prisma.amenity.upsert({
      where: { key: amenity.key },
      update: {
        nameEs: amenity.nameEs,
        nameEn: amenity.nameEn,
        icon: amenity.icon,
        category: amenity.category,
        deletedAt: null,
        deletedById: null,
      },
      create: amenity,
    });
  }

  for (const [propertyId, amenityKeys] of Object.entries(propertyAmenities)) {
    for (const amenityKey of amenityKeys) {
      const amenity = amenities.find((candidate) => candidate.key === amenityKey);

      if (!amenity) {
        throw new Error(`Amenity seed not found for key ${amenityKey}.`);
      }

      await prisma.propertyAmenity.upsert({
        where: {
          propertyId_amenityId: {
            propertyId,
            amenityId: amenity.id,
          },
        },
        update: {},
        create: {
          propertyId,
          amenityId: amenity.id,
        },
      });
    }
  }
}

async function seedHouseRules(): Promise<void> {
  for (const rule of houseRules) {
    await prisma.houseRule.upsert({
      where: { key: rule.key },
      update: {
        titleEs: rule.titleEs,
        titleEn: rule.titleEn,
        descriptionEs: rule.descriptionEs,
        descriptionEn: rule.descriptionEn,
        category: rule.category,
        deletedAt: null,
        deletedById: null,
      },
      create: rule,
    });
  }

  for (const [propertyId, ruleKeys] of Object.entries(propertyRules)) {
    for (const ruleKey of ruleKeys) {
      const rule = houseRules.find((candidate) => candidate.key === ruleKey);

      if (!rule) {
        throw new Error(`House rule seed not found for key ${ruleKey}.`);
      }

      await prisma.propertyRule.upsert({
        where: {
          propertyId_ruleId: {
            propertyId,
            ruleId: rule.id,
          },
        },
        update: {},
        create: {
          propertyId,
          ruleId: rule.id,
        },
      });
    }
  }
}

async function main(): Promise<void> {
  await seedProperties();
  await seedPropertyComponents();
  await seedPropertyImages();
  await seedAmenities();
  await seedHouseRules();
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (error: unknown) => {
    console.error(error);
    await prisma.$disconnect();
    process.exit(1);
  });
