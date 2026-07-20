import type { PropertyStatus } from "@prisma/client";

import type { AdminActor } from "@/types/admin";
import type { AmenityIconName } from "@/types/amenity";

export type AdminAmenityHouseRuleProperty = Readonly<{
  id: string;
  nameEs: string;
  nameEn: string;
  slug: string;
  status: PropertyStatus;
}>;

export type AdminAmenityCatalogItem = Readonly<{
  id: string;
  key: string;
  nameEs: string;
  nameEn: string;
  icon: AmenityIconName;
  category: string | null;
  assigned: boolean;
  updatedAt: string;
}>;

export type AdminHouseRuleCatalogItem = Readonly<{
  id: string;
  key: string;
  titleEs: string;
  titleEn: string;
  descriptionEs: string;
  descriptionEn: string;
  category: string | null;
  assigned: boolean;
  updatedAt: string;
}>;

export type AdminAmenityHouseRuleSettings = Readonly<{
  property: AdminAmenityHouseRuleProperty;
  amenities: readonly AdminAmenityCatalogItem[];
  houseRules: readonly AdminHouseRuleCatalogItem[];
  revision: string;
  generatedAt: string;
}>;

export type AdminAmenityHouseRuleActor = AdminActor;

export type UpdateAdminAmenityContentInput = Readonly<{
  propertyId: string;
  amenityId: string;
  expectedUpdatedAt: string;
  nameEs: string;
  nameEn: string;
  icon: AmenityIconName;
}>;

export type UpdateAdminHouseRuleContentInput = Readonly<{
  propertyId: string;
  houseRuleId: string;
  expectedUpdatedAt: string;
  titleEs: string;
  titleEn: string;
  descriptionEs: string;
  descriptionEn: string;
}>;

export type UpdateAdminAmenityHouseRuleAssignmentsInput = Readonly<{
  propertyId: string;
  expectedRevision: string;
  amenityIds: readonly string[];
  houseRuleIds: readonly string[];
}>;

export const adminAmenityHouseRuleErrorCodes = [
  "ADMIN_UNAUTHORIZED",
  "INVALID_AMENITY_HOUSE_RULE_REQUEST",
  "AMENITY_HOUSE_RULE_PROPERTY_NOT_FOUND",
  "AMENITY_NOT_FOUND",
  "HOUSE_RULE_NOT_FOUND",
  "AMENITY_HOUSE_RULE_STALE",
  "AMENITY_HOUSE_RULE_MINIMUM_REQUIRED",
  "AMENITY_HOUSE_RULE_UNEXPECTED_ERROR",
] as const;

export type AdminAmenityHouseRuleErrorCode =
  (typeof adminAmenityHouseRuleErrorCodes)[number];
