import type { AccommodationImage, LocalizedText } from "@/types/accommodation";

import { getCloudinaryUploadFolder } from "./client";
import { buildCloudinaryImageUrl } from "./delivery";
import { buildAccommodationImagePublicId } from "./folders";

export type PublicAccommodationImageInput = Readonly<{
  propertySlug: string;
  sortOrder: number;
  imagePurpose: string;
  fallbackSrc: string;
  alt: LocalizedText;
}>;

export function buildPublicAccommodationImage({
  propertySlug,
  sortOrder,
  imagePurpose,
  fallbackSrc,
  alt,
}: PublicAccommodationImageInput): AccommodationImage {
  const cloudinaryPublicId = buildAccommodationImagePublicId({
    baseFolder: getCloudinaryUploadFolder(),
    propertySlug,
    sortOrder,
    imagePurpose,
  });

  return {
    cloudinaryPublicId,
    src: buildCloudinaryImageUrl(cloudinaryPublicId, {
      width: 1600,
      height: 1200,
      crop: "fill",
      quality: "auto",
      format: "auto",
    }),
    fallbackSrc,
    alt,
  };
}
