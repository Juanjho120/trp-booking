import {
  addDaysToDateOnly,
  assertValidAvailabilityDateRange,
} from "@/lib/availability/rules";
import type { DateOnlyString } from "@/types/availability";
import {
  FINAL_C_PRICING_SNAPSHOT_VERSION,
  SUPPORTED_LENGTH_OF_STAY_MINIMUM_NIGHTS,
  TRP_STAY_PRICING_CURRENCY,
  type FinalCPricingResolutionSource,
  type FinalCPricingSnapshot,
  type FinalCPricingSegment,
  type LengthOfStayMinimumNights,
} from "@/types/pricing";

export type PricingEngineSeasonalRule = Readonly<{
  id: string;
  startDate: DateOnlyString;
  endDate: DateOnlyString;
  nightlyRateCents: number;
}>;

export type PricingEngineLengthOfStayRule = Readonly<{
  id: string;
  minimumNights: LengthOfStayMinimumNights;
  nightlyRateCents: number;
}>;

export type CalculateStayPricingInput = Readonly<{
  propertyId: string;
  checkInDate: DateOnlyString;
  checkOutDate: DateOnlyString;
  stayLengthContextNights: number;
  baseNightlyRateCents: number;
  seasonalRules: readonly PricingEngineSeasonalRule[];
  lengthOfStayRules: readonly PricingEngineLengthOfStayRule[];
}>;

export type CalculatedStayPricing = Readonly<{
  currency: typeof TRP_STAY_PRICING_CURRENCY;
  propertyId: string;
  checkInDate: DateOnlyString;
  checkOutDate: DateOnlyString;
  stayLengthContextNights: number;
  pricedNights: number;
  uniformNightlyRateCents: number | null;
  subtotalCents: number;
  totalCents: number;
  appliedSources: readonly FinalCPricingResolutionSource[];
  snapshot: FinalCPricingSnapshot;
}>;

export type PricingEngineErrorCode =
  | "INVALID_PRICING_INPUT"
  | "INVALID_PRICING_RULE"
  | "OVERLAPPING_SEASONAL_RULES";

export class PricingEngineError extends Error {
  readonly code: PricingEngineErrorCode;

  constructor(code: PricingEngineErrorCode) {
    super(code);
    this.name = "PricingEngineError";
    this.code = code;
  }
}

type ResolvedNight = Readonly<{
  startDate: DateOnlyString;
  endDate: DateOnlyString;
  source: FinalCPricingResolutionSource;
  nightlyRateCents: number;
  seasonalRule?: PricingEngineSeasonalRule;
  lengthOfStayRule?: PricingEngineLengthOfStayRule;
}>;

const supportedLengthOfStayMinimumNights = new Set<number>(
  SUPPORTED_LENGTH_OF_STAY_MINIMUM_NIGHTS,
);

function assertPositiveMoneyCents(value: number): void {
  if (!Number.isSafeInteger(value) || value <= 0) {
    throw new PricingEngineError("INVALID_PRICING_RULE");
  }
}

function countNights(
  checkInDate: DateOnlyString,
  checkOutDate: DateOnlyString,
): number {
  let nights = 0;
  let currentDate = checkInDate;

  while (currentDate < checkOutDate) {
    nights += 1;
    currentDate = addDaysToDateOnly(currentDate, 1);

    if (!Number.isSafeInteger(nights) || nights > 3660) {
      throw new PricingEngineError("INVALID_PRICING_INPUT");
    }
  }

  if (nights <= 0 || currentDate !== checkOutDate) {
    throw new PricingEngineError("INVALID_PRICING_INPUT");
  }

  return nights;
}

function assertInput(input: CalculateStayPricingInput): number {
  try {
    assertValidAvailabilityDateRange({
      startDate: input.checkInDate,
      endDate: input.checkOutDate,
    });
  } catch {
    throw new PricingEngineError("INVALID_PRICING_INPUT");
  }

  if (!input.propertyId.trim()) {
    throw new PricingEngineError("INVALID_PRICING_INPUT");
  }

  assertPositiveMoneyCents(input.baseNightlyRateCents);

  if (
    !Number.isSafeInteger(input.stayLengthContextNights) ||
    input.stayLengthContextNights <= 0
  ) {
    throw new PricingEngineError("INVALID_PRICING_INPUT");
  }

  const pricedNights = countNights(input.checkInDate, input.checkOutDate);

  for (const rule of input.seasonalRules) {
    if (!rule.id.trim()) {
      throw new PricingEngineError("INVALID_PRICING_RULE");
    }

    try {
      assertValidAvailabilityDateRange({
        startDate: rule.startDate,
        endDate: rule.endDate,
      });
    } catch {
      throw new PricingEngineError("INVALID_PRICING_RULE");
    }

    assertPositiveMoneyCents(rule.nightlyRateCents);
  }

  for (const rule of input.lengthOfStayRules) {
    if (
      !rule.id.trim() ||
      !supportedLengthOfStayMinimumNights.has(rule.minimumNights)
    ) {
      throw new PricingEngineError("INVALID_PRICING_RULE");
    }

    assertPositiveMoneyCents(rule.nightlyRateCents);
  }

  return pricedNights;
}

function selectLengthOfStayRule(
  rules: readonly PricingEngineLengthOfStayRule[],
  stayLengthContextNights: number,
): PricingEngineLengthOfStayRule | null {
  return (
    rules
      .filter((rule) => rule.minimumNights <= stayLengthContextNights)
      .sort((first, second) => second.minimumNights - first.minimumNights)[0] ??
    null
  );
}

function resolveNight(
  startDate: DateOnlyString,
  input: CalculateStayPricingInput,
  lengthOfStayRule: PricingEngineLengthOfStayRule | null,
): ResolvedNight {
  const endDate = addDaysToDateOnly(startDate, 1);
  const matchingSeasonalRules = input.seasonalRules.filter(
    (rule) => rule.startDate <= startDate && startDate < rule.endDate,
  );

  if (matchingSeasonalRules.length > 1) {
    throw new PricingEngineError("OVERLAPPING_SEASONAL_RULES");
  }

  const seasonalRule = matchingSeasonalRules[0];

  if (seasonalRule) {
    return {
      startDate,
      endDate,
      source: "SEASONAL",
      nightlyRateCents: seasonalRule.nightlyRateCents,
      seasonalRule,
    };
  }

  if (lengthOfStayRule) {
    return {
      startDate,
      endDate,
      source: "LENGTH_OF_STAY",
      nightlyRateCents: lengthOfStayRule.nightlyRateCents,
      lengthOfStayRule,
    };
  }

  return {
    startDate,
    endDate,
    source: "BASE",
    nightlyRateCents: input.baseNightlyRateCents,
  };
}

function canMergeNights(first: ResolvedNight, second: ResolvedNight): boolean {
  if (
    first.endDate !== second.startDate ||
    first.source !== second.source ||
    first.nightlyRateCents !== second.nightlyRateCents
  ) {
    return false;
  }

  if (first.source === "SEASONAL" && second.source === "SEASONAL") {
    return first.seasonalRule?.id === second.seasonalRule?.id;
  }

  if (
    first.source === "LENGTH_OF_STAY" &&
    second.source === "LENGTH_OF_STAY"
  ) {
    return first.lengthOfStayRule?.id === second.lengthOfStayRule?.id;
  }

  return first.source === "BASE" && second.source === "BASE";
}

function toSegment(
  nights: readonly ResolvedNight[],
  baseNightlyRateCents: number,
): FinalCPricingSegment {
  const first = nights[0];
  const last = nights[nights.length - 1];

  if (!first || !last) {
    throw new PricingEngineError("INVALID_PRICING_INPUT");
  }

  const subtotalCents = nights.reduce(
    (total, night) => total + night.nightlyRateCents,
    0,
  );
  const common = {
    kind: "RESOLVED_RATE" as const,
    startDate: first.startDate,
    endDate: last.endDate,
    nights: nights.length,
    nightlyRateCents: first.nightlyRateCents,
    subtotalCents,
  };

  switch (first.source) {
    case "BASE":
      return {
        ...common,
        source: "BASE",
        baseNightlyRateCents,
      };
    case "LENGTH_OF_STAY": {
      const rule = first.lengthOfStayRule;

      if (!rule) {
        throw new PricingEngineError("INVALID_PRICING_RULE");
      }

      return {
        ...common,
        source: "LENGTH_OF_STAY",
        ruleId: rule.id,
        minimumNights: rule.minimumNights,
        configuredNightlyRateCents: rule.nightlyRateCents,
      };
    }
    case "SEASONAL": {
      const rule = first.seasonalRule;

      if (!rule) {
        throw new PricingEngineError("INVALID_PRICING_RULE");
      }

      return {
        ...common,
        source: "SEASONAL",
        ruleId: rule.id,
        ruleStartDate: rule.startDate,
        ruleEndDate: rule.endDate,
        configuredNightlyRateCents: rule.nightlyRateCents,
      };
    }
  }
}

function compressResolvedNights(
  resolvedNights: readonly ResolvedNight[],
  baseNightlyRateCents: number,
): readonly FinalCPricingSegment[] {
  const groups: ResolvedNight[][] = [];

  for (const night of resolvedNights) {
    const currentGroup = groups[groups.length - 1];
    const previousNight = currentGroup?.[currentGroup.length - 1];

    if (currentGroup && previousNight && canMergeNights(previousNight, night)) {
      currentGroup.push(night);
    } else {
      groups.push([night]);
    }
  }

  return groups.map((group) => toSegment(group, baseNightlyRateCents));
}

export function calculateStayPricing(
  input: CalculateStayPricingInput,
): CalculatedStayPricing {
  const pricedNights = assertInput(input);
  const selectedLengthOfStayRule = selectLengthOfStayRule(
    input.lengthOfStayRules,
    input.stayLengthContextNights,
  );
  const resolvedNights: ResolvedNight[] = [];
  let currentDate = input.checkInDate;

  while (currentDate < input.checkOutDate) {
    resolvedNights.push(
      resolveNight(currentDate, input, selectedLengthOfStayRule),
    );
    currentDate = addDaysToDateOnly(currentDate, 1);
  }

  if (resolvedNights.length !== pricedNights) {
    throw new PricingEngineError("INVALID_PRICING_INPUT");
  }

  const subtotalCents = resolvedNights.reduce(
    (total, night) => total + night.nightlyRateCents,
    0,
  );

  if (!Number.isSafeInteger(subtotalCents) || subtotalCents <= 0) {
    throw new PricingEngineError("INVALID_PRICING_INPUT");
  }

  const firstNightlyRateCents = resolvedNights[0]?.nightlyRateCents ?? null;
  const uniformNightlyRateCents =
    firstNightlyRateCents !== null &&
    resolvedNights.every(
      (night) => night.nightlyRateCents === firstNightlyRateCents,
    )
      ? firstNightlyRateCents
      : null;
  const appliedSources = [...new Set(resolvedNights.map((night) => night.source))];
  const segments = compressResolvedNights(
    resolvedNights,
    input.baseNightlyRateCents,
  );
  const snapshot: FinalCPricingSnapshot = {
    version: FINAL_C_PRICING_SNAPSHOT_VERSION,
    currency: TRP_STAY_PRICING_CURRENCY,
    propertyId: input.propertyId,
    checkInDate: input.checkInDate,
    checkOutDate: input.checkOutDate,
    stayLengthContextNights: input.stayLengthContextNights,
    pricedNights,
    subtotalCents,
    totalCents: subtotalCents,
    segments,
  };

  return {
    currency: TRP_STAY_PRICING_CURRENCY,
    propertyId: input.propertyId,
    checkInDate: input.checkInDate,
    checkOutDate: input.checkOutDate,
    stayLengthContextNights: input.stayLengthContextNights,
    pricedNights,
    uniformNightlyRateCents,
    subtotalCents,
    totalCents: subtotalCents,
    appliedSources,
    snapshot,
  };
}
