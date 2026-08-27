import type { AdminActor } from "@/types/admin";
import type { DateOnlyString } from "@/types/availability";
import type {
  FinalCPricingResolutionSource,
  LengthOfStayMinimumNights,
} from "@/types/pricing";

export type AdminPricingErrorCode =
  | "ADMIN_UNAUTHORIZED"
  | "ADMIN_PRICING_ORIGIN_INVALID"
  | "INVALID_ADMIN_PRICING_REQUEST"
  | "ADMIN_PRICING_PROPERTY_NOT_FOUND"
  | "ADMIN_PRICING_RULE_NOT_FOUND"
  | "ADMIN_PRICING_RULE_STALE"
  | "ADMIN_PRICING_SEASONAL_OVERLAP"
  | "ADMIN_PRICING_LOS_TIER_INVALID"
  | "ADMIN_PRICING_CONFLICT"
  | "ADMIN_PRICING_CONFIGURATION_INVALID"
  | "ADMIN_PRICING_UNEXPECTED_ERROR";

export type AdminPricingActor = AdminActor;

export type AdminPricingProperty = Readonly<{
  id: string;
  nameEs: string;
  nameEn: string;
  baseNightlyRate: string;
  currency: "USD";
}>;

export type AdminSeasonalPricingRule = Readonly<{
  id: string;
  name: string;
  startDate: DateOnlyString;
  endDate: DateOnlyString;
  nightlyRate: string;
  isEnabled: boolean;
  isDeleted: boolean;
  updatedAt: string;
}>;

export type AdminLengthOfStayPricingRule = Readonly<{
  id: string | null;
  minimumNights: LengthOfStayMinimumNights;
  nightlyRate: string | null;
  isEnabled: boolean;
  updatedAt: string | null;
}>;

export type AdminPricingSettings = Readonly<{
  property: AdminPricingProperty;
  seasonalRules: readonly AdminSeasonalPricingRule[];
  lengthOfStayRules: readonly AdminLengthOfStayPricingRule[];
  generatedAt: string;
}>;

export type CreateAdminSeasonalPricingRuleInput = Readonly<{
  propertyId: string;
  name: string;
  startDate: string;
  endDate: string;
  nightlyRate: string;
}>;

export type UpdateAdminSeasonalPricingRuleInput = Readonly<{
  propertyId: string;
  ruleId: string;
  expectedUpdatedAt: string;
  name: string;
  startDate: string;
  endDate: string;
  nightlyRate: string;
}>;

export type SetAdminSeasonalPricingRuleEnabledInput = Readonly<{
  propertyId: string;
  ruleId: string;
  expectedUpdatedAt: string;
  enabled: boolean;
}>;

export type SoftDeleteAdminSeasonalPricingRuleInput = Readonly<{
  propertyId: string;
  ruleId: string;
  expectedUpdatedAt: string;
}>;

export type RestoreAdminSeasonalPricingRuleInput = Readonly<{
  propertyId: string;
  ruleId: string;
  expectedUpdatedAt: string;
}>;

export type SaveAdminLengthOfStayPricingRuleInput = Readonly<{
  propertyId: string;
  minimumNights: number;
  expectedUpdatedAt: string | null;
  nightlyRate: string;
}>;

export type SetAdminLengthOfStayPricingRuleEnabledInput = Readonly<{
  propertyId: string;
  minimumNights: number;
  expectedUpdatedAt: string;
  enabled: boolean;
}>;

export type AdminPricingPreviewInput = Readonly<{
  propertyId: string;
  checkInDate: string;
  checkOutDate: string;
}>;

export type AdminPricingPreviewSegment = Readonly<{
  startDate: DateOnlyString;
  endDate: DateOnlyString;
  nights: number;
  source: FinalCPricingResolutionSource;
  nightlyRate: string;
  subtotal: string;
}>;

export type AdminPricingPreview = Readonly<{
  checkInDate: DateOnlyString;
  checkOutDate: DateOnlyString;
  nights: number;
  uniformNightlyRate: string | null;
  subtotal: string;
  currency: "USD";
  segments: readonly AdminPricingPreviewSegment[];
}>;
