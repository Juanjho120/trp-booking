export type AccommodationId =
  | "black-white-apartment"
  | "perfect-retreat-bungalow"
  | "complete-retreat";

export type AccommodationKind = "single" | "composed";

export type LocalizedText = Readonly<{
  es: string;
  en: string;
}>;

export type LocalizedList = Readonly<{
  es: readonly string[];
  en: readonly string[];
}>;

export type PreparationBufferPolicy = Readonly<{
  daysBefore: number;
  daysAfter: number;
}>;

export type ArrivalPolicy = Readonly<{
  checkInFrom: LocalizedText;
  earlyCheckInNote: LocalizedText;
}>;

export type AccommodationImage = Readonly<{
  src: string;
  alt: LocalizedText;
}>;

export type Accommodation = Readonly<{
  id: AccommodationId;
  kind: AccommodationKind;
  name: LocalizedText;
  slug: LocalizedText;
  shortDescription: LocalizedText;
  longDescription: LocalizedText;
  baseNightlyPriceUsd: number;
  maxGuests: number;
  bedrooms: number;
  bathrooms: number;
  preparationBuffer: PreparationBufferPolicy;
  arrivalPolicy: ArrivalPolicy;
  coverImage: AccommodationImage;
  galleryImages: readonly AccommodationImage[];
  highlights: LocalizedList;
  amenities: LocalizedList;
  rules: LocalizedList;
  composedOf?: readonly AccommodationId[];
}>;
