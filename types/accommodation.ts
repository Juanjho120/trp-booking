export type AccommodationId =
  | "black-white-apartment"
  | "perfect-retreat-bungalow"
  | "complete-retreat";

export type AccommodationKind = "single" | "composed";

export type PreparationBufferPolicy = Readonly<{
  daysBefore: number;
  daysAfter: number;
}>;

export type LocalizedText = Readonly<{
  es: string;
  en: string;
}>;

export type Accommodation = Readonly<{
  id: AccommodationId;
  kind: AccommodationKind;
  name: LocalizedText;
  slug: LocalizedText;
  shortDescription: LocalizedText;
  baseNightlyPriceUsd: number;
  maxGuests: number;
  bedrooms: number;
  bathrooms: number;
  preparationBuffer: PreparationBufferPolicy;
  composedOf?: readonly AccommodationId[];
}>;
