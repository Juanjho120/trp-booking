import type { DateOnlyString } from "@/types/availability";

export const FINAL_C_PRICING_SNAPSHOT_VERSION = "FINAL_C_V1" as const;
export const TRP_STAY_PRICING_CURRENCY = "USD" as const;
export const SUPPORTED_LENGTH_OF_STAY_MINIMUM_NIGHTS = [
  2,
  3,
  4,
  5,
  6,
  7,
  15,
  30,
] as const;

export type LengthOfStayMinimumNights =
  (typeof SUPPORTED_LENGTH_OF_STAY_MINIMUM_NIGHTS)[number];

export type FinalCPricingResolutionSource =
  | "BASE"
  | "LENGTH_OF_STAY"
  | "SEASONAL";

type FinalCResolvedPricingSegmentBase = Readonly<{
  kind: "RESOLVED_RATE";
  startDate: DateOnlyString;
  endDate: DateOnlyString;
  nights: number;
  nightlyRateCents: number;
  subtotalCents: number;
}>;

export type FinalCBasePricingSegment = FinalCResolvedPricingSegmentBase &
  Readonly<{
    source: "BASE";
    baseNightlyRateCents: number;
  }>;

export type FinalCLengthOfStayPricingSegment =
  FinalCResolvedPricingSegmentBase &
    Readonly<{
      source: "LENGTH_OF_STAY";
      ruleId: string;
      minimumNights: LengthOfStayMinimumNights;
      configuredNightlyRateCents: number;
    }>;

export type FinalCSeasonalPricingSegment = FinalCResolvedPricingSegmentBase &
  Readonly<{
    source: "SEASONAL";
    ruleId: string;
    ruleStartDate: DateOnlyString;
    ruleEndDate: DateOnlyString;
    configuredNightlyRateCents: number;
  }>;

export type FinalCResolvedPricingSegment =
  | FinalCBasePricingSegment
  | FinalCLengthOfStayPricingSegment
  | FinalCSeasonalPricingSegment;

export type FinalCPreservedLegacyPricingSegment = Readonly<{
  kind: "PRESERVED_LEGACY_STAY";
  startDate: DateOnlyString;
  endDate: DateOnlyString;
  nights: number;
  acceptedSubtotalCents: number;
  acceptedTotalCents: number;
}>;

export type FinalCPricingSegment =
  | FinalCResolvedPricingSegment
  | FinalCPreservedLegacyPricingSegment;

export type FinalCPricingSnapshotV1 = Readonly<{
  version: typeof FINAL_C_PRICING_SNAPSHOT_VERSION;
  currency: typeof TRP_STAY_PRICING_CURRENCY;
  propertyId: string;
  checkInDate: DateOnlyString;
  checkOutDate: DateOnlyString;
  stayLengthContextNights: number;
  pricedNights: number;
  subtotalCents: number;
  totalCents: number;
  segments: readonly FinalCPricingSegment[];
}>;

export type FinalCPricingSnapshot = FinalCPricingSnapshotV1;
