import type { PropertyStatus } from "@prisma/client";

import type { AdminActor } from "@/types/admin";

export const adminPropertyPhotoErrorCodes = [
  "ADMIN_UNAUTHORIZED",
  "INVALID_PROPERTY_PHOTO_REQUEST",
  "PROPERTY_PHOTO_PROPERTY_NOT_FOUND",
  "PROPERTY_PHOTO_NOT_FOUND",
  "PROPERTY_PHOTO_STALE",
  "PROPERTY_PHOTO_LIMIT_REACHED",
  "PROPERTY_PHOTO_MINIMUM_REQUIRED",
  "PROPERTY_PHOTO_UNSUPPORTED_TYPE",
  "PROPERTY_PHOTO_FILE_TOO_LARGE",
  "PROPERTY_PHOTO_UPLOAD_EXPIRED",
  "PROPERTY_PHOTO_PROVIDER_ERROR",
  "PROPERTY_PHOTO_UNEXPECTED_ERROR",
] as const;

export type AdminPropertyPhotoErrorCode =
  (typeof adminPropertyPhotoErrorCodes)[number];

export type AdminPropertyPhotoActor = AdminActor;

export type AdminPropertyPhoto = Readonly<{
  id: string;
  propertyId: string;
  cloudinaryPublicId: string | null;
  src: string;
  altTextEs: string;
  altTextEn: string;
  sortOrder: number;
  isCover: boolean;
  createdAt: string;
  updatedAt: string;
}>;

export type AdminPropertyPhotoProperty = Readonly<{
  id: string;
  nameEs: string;
  nameEn: string;
  slug: string;
  status: PropertyStatus;
}>;

export type AdminPropertyPhotoSettings = Readonly<{
  property: AdminPropertyPhotoProperty;
  photos: readonly AdminPropertyPhoto[];
  maxPhotos: number;
  maxFileSizeBytes: number;
  acceptedMimeTypes: readonly string[];
  revision: string;
  generatedAt: string;
}>;

export type AdminPropertyPhotoUploadSignature = Readonly<{
  uploadUrl: string;
  cloudName: string;
  apiKey: string;
  timestamp: number;
  signature: string;
  publicId: string;
  overwrite: false;
}>;

export type PrepareAdminPropertyPhotoUploadInput = Readonly<{
  propertyId: string;
  fileName: string;
  mimeType: string;
  fileSize: number;
  altTextEs: string;
  altTextEn: string;
}>;

export type FinalizeAdminPropertyPhotoUploadInput = Readonly<{
  propertyId: string;
  publicId: string;
  altTextEs: string;
  altTextEn: string;
}>;

export type UpdateAdminPropertyPhotoAltTextInput = Readonly<{
  propertyId: string;
  imageId: string;
  expectedUpdatedAt: string;
  altTextEs: string;
  altTextEn: string;
}>;

export type ReorderAdminPropertyPhotosInput = Readonly<{
  propertyId: string;
  expectedRevision: string;
  orderedImageIds: readonly string[];
}>;

export type SetAdminPropertyPhotoCoverInput = Readonly<{
  propertyId: string;
  imageId: string;
  expectedRevision: string;
}>;

export type DeleteAdminPropertyPhotoInput = Readonly<{
  propertyId: string;
  imageId: string;
  expectedRevision: string;
}>;
