import type { AdminActor } from "@/types/admin";
import type { AmenityIconName } from "@/types/amenity";

export type AdminCatalogTab = "amenities" | "house-rules";

export type AdminCatalogAmenity = Readonly<{
  id: string;
  key: string;
  nameEs: string;
  nameEn: string;
  icon: AmenityIconName;
  category: string | null;
  updatedAt: string;
}>;

export type AdminCatalogHouseRule = Readonly<{
  id: string;
  key: string;
  titleEs: string;
  titleEn: string;
  descriptionEs: string;
  descriptionEn: string;
  category: string | null;
  updatedAt: string;
}>;

export type AdminCatalogSettings = Readonly<{
  amenities: readonly AdminCatalogAmenity[];
  houseRules: readonly AdminCatalogHouseRule[];
  generatedAt: string;
}>;

export type AdminCatalogActor = AdminActor;

export type CreateAdminCatalogAmenityInput = Readonly<{
  nameEs: string;
  nameEn: string;
  icon: AmenityIconName;
}>;

export type CreateAdminCatalogHouseRuleInput = Readonly<{
  titleEs: string;
  titleEn: string;
  descriptionEs: string;
  descriptionEn: string;
}>;

export type UpdateAdminCatalogAmenityInput = Readonly<{
  amenityId: string;
  expectedUpdatedAt: string;
  nameEs: string;
  nameEn: string;
  icon: AmenityIconName;
}>;

export type UpdateAdminCatalogHouseRuleInput = Readonly<{
  houseRuleId: string;
  expectedUpdatedAt: string;
  titleEs: string;
  titleEn: string;
  descriptionEs: string;
  descriptionEn: string;
}>;

export type DeleteAdminCatalogAmenityInput = Readonly<{
  amenityId: string;
  expectedUpdatedAt: string;
}>;

export type DeleteAdminCatalogHouseRuleInput = Readonly<{
  houseRuleId: string;
  expectedUpdatedAt: string;
}>;

export const adminCatalogErrorCodes = [
  "ADMIN_UNAUTHORIZED",
  "INVALID_ADMIN_CATALOG_REQUEST",
  "ADMIN_CATALOG_AMENITY_NOT_FOUND",
  "ADMIN_CATALOG_HOUSE_RULE_NOT_FOUND",
  "ADMIN_CATALOG_STALE",
  "ADMIN_CATALOG_MINIMUM_ASSIGNMENT_REQUIRED",
  "ADMIN_CATALOG_UNEXPECTED_ERROR",
] as const;

export type AdminCatalogErrorCode =
  (typeof adminCatalogErrorCodes)[number];
