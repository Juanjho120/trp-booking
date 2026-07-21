import { PropertyStatus, type Prisma, type PrismaClient } from "@prisma/client";

import { buildCloudinaryImageUrl } from "@/lib/cloudinary";
import { prisma } from "@/lib/db/prisma";
import type {
  Accommodation,
  AccommodationId,
  AccommodationImage,
  LocalizedList,
  LocalizedText,
} from "@/types/accommodation";
import type { AmenityDefinition, AmenityIconName, AmenityKey } from "@/types/amenity";

const accommodationOrder: readonly AccommodationId[] = [
  "black-white-apartment",
  "perfect-retreat-bungalow",
  "complete-retreat",
];

const amenityDisplayOrder = [
  "hot-water",
  "fiber-wifi",
  "full-kitchen",
  "refrigerator",
  "gas-stove-oven",
  "drip-coffee-maker",
  "bed-linens",
  "portable-fans",
  "safe-box",
  "exercise-equipment",
  "shared-patio",
  "free-street-parking",
  "luggage-drop-off",
  "combined-access",
  "independent-bedrooms",
  "full-bathrooms",
  "dining-indoor-areas",
  "family-groups",
] as const satisfies readonly AmenityKey[];

const ruleDisplayOrder = [
  "max-guests-2",
  "max-guests-4",
  "max-guests-6",
  "no-pets",
  "quiet-hours",
  "no-parties",
  "no-smoking",
  "no-alcohol",
  "care-property",
  "respect-both-listings",
] as const;

const cloudinaryDeliveryUrlPrefix = "https://res.cloudinary.com/";

const publicPropertySelect = {
  id: true,
  nameEs: true,
  nameEn: true,
  slug: true,
  shortDescriptionEs: true,
  shortDescriptionEn: true,
  longDescriptionEs: true,
  longDescriptionEn: true,
  maxGuests: true,
  bedrooms: true,
  bathrooms: true,
  baseNightlyPrice: true,
  currency: true,
  checkInTime: true,
  checkOutTime: true,
  isComposed: true,
  preparationDaysBefore: true,
  preparationDaysAfter: true,
  images: {
    where: {
      deletedAt: null,
      OR: [
        { cloudinaryPublicId: { not: null } },
        { secureUrl: { startsWith: cloudinaryDeliveryUrlPrefix } },
        { url: { startsWith: cloudinaryDeliveryUrlPrefix } },
      ],
    },
    orderBy: [
      {
        isCover: "desc",
      },
      {
        sortOrder: "asc",
      },
    ],
    select: {
      id: true,
      cloudinaryPublicId: true,
      url: true,
      secureUrl: true,
      altTextEs: true,
      altTextEn: true,
      sortOrder: true,
      isCover: true,
    },
  },
  amenities: {
    where: {
      amenity: {
        deletedAt: null,
      },
    },
    select: {
      amenity: {
        select: {
          key: true,
          nameEs: true,
          nameEn: true,
          icon: true,
        },
      },
    },
  },
  rules: {
    where: {
      rule: {
        deletedAt: null,
      },
    },
    select: {
      rule: {
        select: {
          key: true,
          descriptionEs: true,
          descriptionEn: true,
        },
      },
    },
  },
  parentComponents: {
    select: {
      componentPropertyId: true,
    },
  },
} satisfies Prisma.PropertySelect;

type PublicPropertyRecord = Prisma.PropertyGetPayload<{
  select: typeof publicPropertySelect;
}>;

type PublicAccommodationQueryOptions = Readonly<{
  prismaClient?: PrismaClient;
}>;

function assertServerSidePublicPropertyQuery(): void {
  if (typeof window !== "undefined") {
    throw new Error("Public property queries must remain server-side only.");
  }
}

function toAccommodationId(value: string): AccommodationId {
  if (accommodationOrder.includes(value as AccommodationId)) {
    return value as AccommodationId;
  }

  throw new Error(`Unsupported public accommodation id: ${value}.`);
}

function compareAccommodationOrder(firstId: string, secondId: string): number {
  return (
    accommodationOrder.indexOf(toAccommodationId(firstId)) -
    accommodationOrder.indexOf(toAccommodationId(secondId))
  );
}

function compareConfiguredOrder(
  firstKey: string,
  secondKey: string,
  configuredOrder: readonly string[],
): number {
  const firstIndex = configuredOrder.indexOf(firstKey);
  const secondIndex = configuredOrder.indexOf(secondKey);

  if (firstIndex === -1 && secondIndex === -1) {
    return firstKey.localeCompare(secondKey);
  }

  if (firstIndex === -1) {
    return 1;
  }

  if (secondIndex === -1) {
    return -1;
  }

  return firstIndex - secondIndex;
}

function compareAmenityOrder(firstKey: string, secondKey: string): number {
  return compareConfiguredOrder(
    firstKey,
    secondKey,
    amenityDisplayOrder,
  );
}

function compareRuleOrder(firstKey: string, secondKey: string): number {
  return compareConfiguredOrder(
    firstKey,
    secondKey,
    ruleDisplayOrder,
  );
}

function buildLocalizedText(es: string, en: string): LocalizedText {
  return { es, en };
}

function buildHighlights(property: PublicPropertyRecord): LocalizedList {
  return {
    es: [
      `Hasta ${property.maxGuests} huéspedes`,
      `${property.bedrooms} dormitorio${property.bedrooms === 1 ? "" : "s"}`,
      `${property.bathrooms} baño${property.bathrooms === 1 ? "" : "s"}`,
      property.isComposed ? "Dos alojamientos en una sola reserva" : "Alojamiento privado",
    ],
    en: [
      `Up to ${property.maxGuests} guests`,
      `${property.bedrooms} bedroom${property.bedrooms === 1 ? "" : "s"}`,
      `${property.bathrooms} bathroom${property.bathrooms === 1 ? "" : "s"}`,
      property.isComposed ? "Two accommodations in one booking" : "Private accommodation",
    ],
  };
}

function buildArrivalPolicy(property: PublicPropertyRecord): Accommodation["arrivalPolicy"] {
  return {
    checkInFrom: {
      es: `Check-in a partir de las ${property.checkInTime}`,
      en: `Check-in from ${property.checkInTime}`,
    },
    earlyCheckInNote: {
      es: "El check-in más temprano puede coordinarse si el huésped avisa con anticipación.",
      en: "Earlier check-in may be coordinated if the guest notifies the host in advance.",
    },
  };
}

function isCloudinaryDeliveryUrl(value: string | null): value is string {
  return value?.startsWith(cloudinaryDeliveryUrlPrefix) ?? false;
}

function toAccommodationImage(
  image: PublicPropertyRecord["images"][number],
): AccommodationImage | null {
  if (image.cloudinaryPublicId) {
    const src = buildCloudinaryImageUrl(image.cloudinaryPublicId, {
      width: 1600,
      height: 1200,
      crop: "fill",
      quality: "auto",
      format: "auto",
    });
    const fallbackSrc = isCloudinaryDeliveryUrl(image.secureUrl)
      ? image.secureUrl
      : isCloudinaryDeliveryUrl(image.url)
        ? image.url
        : src;

    return {
      cloudinaryPublicId: image.cloudinaryPublicId,
      src,
      fallbackSrc,
      alt: {
        es: image.altTextEs,
        en: image.altTextEn,
      },
    };
  }

  const cloudinaryUrl = isCloudinaryDeliveryUrl(image.secureUrl)
    ? image.secureUrl
    : isCloudinaryDeliveryUrl(image.url)
      ? image.url
      : null;

  if (!cloudinaryUrl) {
    return null;
  }

  return {
    src: cloudinaryUrl,
    fallbackSrc: cloudinaryUrl,
    alt: {
      es: image.altTextEs,
      en: image.altTextEn,
    },
  };
}

function getCloudinaryImages(property: PublicPropertyRecord): readonly AccommodationImage[] {
  return property.images
    .map(toAccommodationImage)
    .filter((image): image is AccommodationImage => image !== null);
}

function getCoverImage(property: PublicPropertyRecord): AccommodationImage {
  const cloudinaryImages = getCloudinaryImages(property);
  const coverRecord = property.images.find((image) => image.isCover);
  const coverImage = coverRecord ? toAccommodationImage(coverRecord) : null;
  const image = coverImage ?? cloudinaryImages[0];

  if (!image) {
    throw new Error(
      `Public property ${property.id} does not have active Cloudinary images. ` +
        "Upload Cloudinary images in property_images before rendering the public gallery.",
    );
  }

  return image;
}

function getGalleryImages(property: PublicPropertyRecord): readonly AccommodationImage[] {
  const coverImageId = property.images.find((image) => image.isCover)?.id;

  return property.images
    .filter((image) => image.id !== coverImageId)
    .map(toAccommodationImage)
    .filter((image): image is AccommodationImage => image !== null);
}

function getAmenities(property: PublicPropertyRecord): readonly AmenityDefinition[] {
  return [...property.amenities]
    .sort((first, second) =>
      compareAmenityOrder(first.amenity.key, second.amenity.key),
    )
    .map(({ amenity }) => ({
      key: amenity.key as AmenityKey,
      icon: amenity.icon as AmenityIconName,
      label: {
        es: amenity.nameEs,
        en: amenity.nameEn,
      },
    }));
}

function getRules(property: PublicPropertyRecord): LocalizedList {
  const rules = [...property.rules].sort((first, second) =>
    compareRuleOrder(first.rule.key, second.rule.key),
  );

  return {
    es: rules.map(({ rule }) => rule.descriptionEs),
    en: rules.map(({ rule }) => rule.descriptionEn),
  };
}

function toAccommodation(property: PublicPropertyRecord): Accommodation {
  const amenities = getAmenities(property);

  return {
    id: toAccommodationId(property.id),
    kind: property.isComposed ? "composed" : "single",
    name: buildLocalizedText(property.nameEs, property.nameEn),
    slug: buildLocalizedText(property.slug, property.slug),
    shortDescription: buildLocalizedText(property.shortDescriptionEs, property.shortDescriptionEn),
    longDescription: buildLocalizedText(property.longDescriptionEs, property.longDescriptionEn),
    baseNightlyPriceUsd: Number(property.baseNightlyPrice),
    maxGuests: property.maxGuests,
    bedrooms: property.bedrooms,
    bathrooms: property.bathrooms,
    preparationBuffer: {
      daysBefore: property.preparationDaysBefore,
      daysAfter: property.preparationDaysAfter,
    },
    arrivalPolicy: buildArrivalPolicy(property),
    coverImage: getCoverImage(property),
    galleryImages: getGalleryImages(property),
    highlights: buildHighlights(property),
    amenityKeys: amenities.map((amenity) => amenity.key),
    amenities,
    rules: getRules(property),
    composedOf: property.parentComponents
      .map((component) => toAccommodationId(component.componentPropertyId))
      .sort(compareAccommodationOrder),
  };
}

export async function getPublicAccommodations(
  options: PublicAccommodationQueryOptions = {},
): Promise<readonly Accommodation[]> {
  assertServerSidePublicPropertyQuery();

  const prismaClient = options.prismaClient ?? prisma;
  const properties = await prismaClient.property.findMany({
    where: {
      status: PropertyStatus.ACTIVE,
      deletedAt: null,
    },
    select: publicPropertySelect,
  });

  return properties
    .sort((first, second) => compareAccommodationOrder(first.id, second.id))
    .map(toAccommodation);
}

export async function getPublicAccommodationById(
  accommodationId: AccommodationId,
  options: PublicAccommodationQueryOptions = {},
): Promise<Accommodation | null> {
  assertServerSidePublicPropertyQuery();

  const prismaClient = options.prismaClient ?? prisma;
  const property = await prismaClient.property.findFirst({
    where: {
      id: accommodationId,
      status: PropertyStatus.ACTIVE,
      deletedAt: null,
    },
    select: publicPropertySelect,
  });

  return property ? toAccommodation(property) : null;
}

export async function getPublicAccommodationBySlug(
  slug: string,
  options: PublicAccommodationQueryOptions = {},
): Promise<Accommodation | null> {
  assertServerSidePublicPropertyQuery();

  const prismaClient = options.prismaClient ?? prisma;
  const property = await prismaClient.property.findFirst({
    where: {
      slug,
      status: PropertyStatus.ACTIVE,
      deletedAt: null,
    },
    select: publicPropertySelect,
  });

  return property ? toAccommodation(property) : null;
}
