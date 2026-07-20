import type { PropertyStatus } from "@prisma/client";

import type { AdminActor } from "@/types/admin";

export type AdminAccommodationContentProperty = Readonly<{
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
  currency: string;
  status: PropertyStatus;
  checkInTime: string;
  checkOutTime: string | null;
  isComposed: boolean;
  updatedAt: string;
}>;

export type AdminAccommodationContentSettings = Readonly<{
  generatedAt: string;
  properties: readonly AdminAccommodationContentProperty[];
}>;

export type AdminAccommodationContentActor = AdminActor;

export type UpdateAdminAccommodationContentInput = Readonly<{
  propertyId: string;
  expectedUpdatedAt: string;
  nameEs: string;
  nameEn: string;
  shortDescriptionEs: string;
  shortDescriptionEn: string;
  longDescriptionEs: string;
  longDescriptionEn: string;
  maxGuests: number;
  bedrooms: number;
  bathrooms: number;
  checkInTime: string;
  checkOutTime?: string | null;
}>;

export const adminAccommodationContentErrorCodes = [
  "ADMIN_UNAUTHORIZED",
  "INVALID_ACCOMMODATION_CONTENT_REQUEST",
  "ACCOMMODATION_CONTENT_PROPERTY_NOT_FOUND",
  "ACCOMMODATION_CONTENT_STALE",
  "ACCOMMODATION_CONTENT_UNEXPECTED_ERROR",
] as const;

export type AdminAccommodationContentErrorCode =
  (typeof adminAccommodationContentErrorCodes)[number];
