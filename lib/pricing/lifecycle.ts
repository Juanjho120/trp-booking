import {
  assertDateOnlyString,
  assertValidAvailabilityDateRange,
  dateOnlyToUtcDate,
} from "@/lib/availability/rules";
import {
  PricingRepositoryError,
  resolvePropertyStayPricing,
  type ResolvePropertyStayPricingInput,
  type ResolvePropertyStayPricingOptions,
} from "@/lib/pricing/repository";
import type { DateOnlyString } from "@/types/availability";
import type { CalculatedStayPricing } from "@/lib/pricing/engine";
import {
  FINAL_C_PRICING_SNAPSHOT_VERSION,
  SUPPORTED_LENGTH_OF_STAY_MINIMUM_NIGHTS,
  TRP_STAY_PRICING_CURRENCY,
  type FinalCPricingSegment,
  type FinalCPricingSnapshot,
} from "@/types/pricing";

const MILLISECONDS_PER_DAY = 24 * 60 * 60 * 1_000;
const supportedLengthOfStayMinimumNights = new Set<number>(
  SUPPORTED_LENGTH_OF_STAY_MINIMUM_NIGHTS,
);

export type LifecyclePricingRequestType = "DATE_CHANGE" | "STAY_EXTENSION";

export type ResolveLifecyclePricingInput = Readonly<{
  requestType: LifecyclePricingRequestType;
  propertyId: string;
  originalCheckInDate: DateOnlyString;
  originalCheckOutDate: DateOnlyString;
  requestedCheckInDate: DateOnlyString;
  requestedCheckOutDate: DateOnlyString;
  originalSubtotalCents: number;
  originalTotalCents: number;
  originalPricingSnapshot: unknown | null;
}>;

export type ResolvedLifecyclePricing = Readonly<{
  requestedSubtotalCents: number;
  requestedTotalCents: number;
  requestedPricingSnapshot: FinalCPricingSnapshot;
}>;

type LifecyclePricingResolver = (
  input: ResolvePropertyStayPricingInput,
  options?: ResolvePropertyStayPricingOptions,
) => Promise<CalculatedStayPricing>;

export type ResolveLifecyclePricingOptions =
  ResolvePropertyStayPricingOptions &
    Readonly<{
      pricingResolver?: LifecyclePricingResolver;
    }>;

export type LifecyclePricingErrorCode =
  | "INVALID_LIFECYCLE_PRICING_INPUT"
  | "INVALID_ACCEPTED_PRICING_SNAPSHOT"
  | "LIFECYCLE_PRICING_PROPERTY_NOT_FOUND"
  | "LIFECYCLE_PRICING_CONFIGURATION_INVALID";

export class LifecyclePricingError extends Error {
  readonly code: LifecyclePricingErrorCode;

  constructor(code: LifecyclePricingErrorCode) {
    super(code);
    this.name = "LifecyclePricingError";
    this.code = code;
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isPositiveSafeInteger(value: unknown): value is number {
  return Number.isSafeInteger(value) && Number(value) > 0;
}

function isNonNegativeSafeInteger(value: unknown): value is number {
  return Number.isSafeInteger(value) && Number(value) >= 0;
}

function isDateOnlyString(value: unknown): value is DateOnlyString {
  if (typeof value !== "string") {
    return false;
  }

  try {
    assertDateOnlyString(value, "date");
    return true;
  } catch {
    return false;
  }
}

function countNights(
  checkInDate: DateOnlyString,
  checkOutDate: DateOnlyString,
): number {
  try {
    assertValidAvailabilityDateRange({
      startDate: checkInDate,
      endDate: checkOutDate,
    });
  } catch {
    throw new LifecyclePricingError("INVALID_LIFECYCLE_PRICING_INPUT");
  }

  const nights =
    (dateOnlyToUtcDate(checkOutDate).getTime() -
      dateOnlyToUtcDate(checkInDate).getTime()) /
    MILLISECONDS_PER_DAY;

  if (!Number.isSafeInteger(nights) || nights <= 0) {
    throw new LifecyclePricingError("INVALID_LIFECYCLE_PRICING_INPUT");
  }

  return nights;
}

function addMoneyCents(left: number, right: number): number {
  if (!isNonNegativeSafeInteger(left) || !isNonNegativeSafeInteger(right)) {
    throw new LifecyclePricingError("INVALID_LIFECYCLE_PRICING_INPUT");
  }

  const total = left + right;

  if (!Number.isSafeInteger(total)) {
    throw new LifecyclePricingError("INVALID_LIFECYCLE_PRICING_INPUT");
  }

  return total;
}

function segmentRangeIsValid(
  startDate: unknown,
  endDate: unknown,
  nights: unknown,
): startDate is DateOnlyString {
  if (
    !isDateOnlyString(startDate) ||
    !isDateOnlyString(endDate) ||
    !isPositiveSafeInteger(nights)
  ) {
    return false;
  }

  try {
    return countNights(startDate, endDate) === nights;
  } catch {
    return false;
  }
}

function isResolvedRateSegment(value: unknown): value is FinalCPricingSegment {
  if (!isRecord(value) || value.kind !== "RESOLVED_RATE") {
    return false;
  }

  const startDate = value.startDate;
  const endDate = value.endDate;
  const nights = value.nights;
  const nightlyRateCents = value.nightlyRateCents;
  const subtotalCents = value.subtotalCents;

  if (
    !isDateOnlyString(startDate) ||
    !isDateOnlyString(endDate) ||
    !isPositiveSafeInteger(nights) ||
    !segmentRangeIsValid(startDate, endDate, nights) ||
    !isPositiveSafeInteger(nightlyRateCents) ||
    !isPositiveSafeInteger(subtotalCents) ||
    subtotalCents !== nightlyRateCents * nights
  ) {
    return false;
  }

  if (value.source === "BASE") {
    return isPositiveSafeInteger(value.baseNightlyRateCents);
  }

  if (value.source === "LENGTH_OF_STAY") {
    const minimumNights = value.minimumNights;
    const configuredNightlyRateCents = value.configuredNightlyRateCents;

    return (
      typeof value.ruleId === "string" &&
      value.ruleId.trim().length > 0 &&
      isPositiveSafeInteger(minimumNights) &&
      supportedLengthOfStayMinimumNights.has(minimumNights) &&
      isPositiveSafeInteger(configuredNightlyRateCents) &&
      nightlyRateCents === configuredNightlyRateCents
    );
  }

  if (value.source === "SEASONAL") {
    const ruleStartDate = value.ruleStartDate;
    const ruleEndDate = value.ruleEndDate;
    const configuredNightlyRateCents = value.configuredNightlyRateCents;

    return (
      typeof value.ruleId === "string" &&
      value.ruleId.trim().length > 0 &&
      isDateOnlyString(ruleStartDate) &&
      isDateOnlyString(ruleEndDate) &&
      ruleStartDate <= startDate &&
      endDate <= ruleEndDate &&
      isPositiveSafeInteger(configuredNightlyRateCents) &&
      nightlyRateCents === configuredNightlyRateCents
    );
  }

  return false;
}

function isPreservedLegacySegment(
  value: unknown,
): value is FinalCPricingSegment {
  return (
    isRecord(value) &&
    value.kind === "PRESERVED_LEGACY_STAY" &&
    segmentRangeIsValid(value.startDate, value.endDate, value.nights) &&
    isPositiveSafeInteger(value.acceptedSubtotalCents) &&
    isPositiveSafeInteger(value.acceptedTotalCents)
  );
}

function isPricingSegment(value: unknown): value is FinalCPricingSegment {
  return isResolvedRateSegment(value) || isPreservedLegacySegment(value);
}

function jsonValuesEqual(left: unknown, right: unknown): boolean {
  if (left === right) {
    return true;
  }

  if (Array.isArray(left) || Array.isArray(right)) {
    return (
      Array.isArray(left) &&
      Array.isArray(right) &&
      left.length === right.length &&
      left.every((item, index) => jsonValuesEqual(item, right[index]))
    );
  }

  if (isRecord(left) || isRecord(right)) {
    if (!isRecord(left) || !isRecord(right)) {
      return false;
    }

    const leftKeys = Object.keys(left).sort();
    const rightKeys = Object.keys(right).sort();

    return (
      leftKeys.length === rightKeys.length &&
      leftKeys.every(
        (key, index) =>
          key === rightKeys[index] &&
          jsonValuesEqual(left[key], right[key]),
      )
    );
  }

  return false;
}

export function parseFinalCPricingSnapshot(
  value: unknown,
): FinalCPricingSnapshot | null {
  if (
    !isRecord(value) ||
    value.version !== FINAL_C_PRICING_SNAPSHOT_VERSION ||
    value.currency !== TRP_STAY_PRICING_CURRENCY ||
    typeof value.propertyId !== "string" ||
    value.propertyId.trim().length === 0 ||
    !isDateOnlyString(value.checkInDate) ||
    !isDateOnlyString(value.checkOutDate) ||
    !isPositiveSafeInteger(value.stayLengthContextNights) ||
    !isPositiveSafeInteger(value.pricedNights) ||
    !isPositiveSafeInteger(value.subtotalCents) ||
    !isPositiveSafeInteger(value.totalCents) ||
    !Array.isArray(value.segments) ||
    value.segments.length === 0 ||
    !value.segments.every(isPricingSegment)
  ) {
    return null;
  }

  let rangeNights: number;

  try {
    rangeNights = countNights(value.checkInDate, value.checkOutDate);
  } catch {
    return null;
  }

  let expectedStartDate = value.checkInDate;
  let segmentNights = 0;
  let segmentSubtotalCents = 0;
  let segmentTotalCents = 0;

  for (const segment of value.segments) {
    if (segment.startDate !== expectedStartDate) {
      return null;
    }

    expectedStartDate = segment.endDate;
    segmentNights += segment.nights;

    if (segment.kind === "PRESERVED_LEGACY_STAY") {
      segmentSubtotalCents += segment.acceptedSubtotalCents;
      segmentTotalCents += segment.acceptedTotalCents;
    } else {
      segmentSubtotalCents += segment.subtotalCents;
      segmentTotalCents += segment.subtotalCents;
    }
  }

  if (
    expectedStartDate !== value.checkOutDate ||
    segmentNights !== value.pricedNights ||
    value.pricedNights !== rangeNights ||
    segmentSubtotalCents !== value.subtotalCents ||
    segmentTotalCents !== value.totalCents
  ) {
    return null;
  }

  return value as FinalCPricingSnapshot;
}

export function pricingSnapshotsEqual(
  left: unknown,
  right: FinalCPricingSnapshot,
): boolean {
  const parsedLeft = parseFinalCPricingSnapshot(left);
  return parsedLeft !== null && jsonValuesEqual(parsedLeft, right);
}

function assertAcceptedSnapshotMatchesReservation(
  snapshot: FinalCPricingSnapshot,
  input: ResolveLifecyclePricingInput,
): void {
  const originalNights = countNights(
    input.originalCheckInDate,
    input.originalCheckOutDate,
  );

  if (
    snapshot.propertyId !== input.propertyId ||
    snapshot.currency !== TRP_STAY_PRICING_CURRENCY ||
    snapshot.checkInDate !== input.originalCheckInDate ||
    snapshot.checkOutDate !== input.originalCheckOutDate ||
    snapshot.pricedNights !== originalNights ||
    snapshot.subtotalCents !== input.originalSubtotalCents ||
    snapshot.totalCents !== input.originalTotalCents
  ) {
    throw new LifecyclePricingError("INVALID_ACCEPTED_PRICING_SNAPSHOT");
  }
}

function buildPreservedLegacySegment(
  input: ResolveLifecyclePricingInput,
): FinalCPricingSegment {
  return {
    kind: "PRESERVED_LEGACY_STAY",
    startDate: input.originalCheckInDate,
    endDate: input.originalCheckOutDate,
    nights: countNights(input.originalCheckInDate, input.originalCheckOutDate),
    acceptedSubtotalCents: input.originalSubtotalCents,
    acceptedTotalCents: input.originalTotalCents,
  };
}

function mapPricingRepositoryError(error: PricingRepositoryError): never {
  throw new LifecyclePricingError(
    error.code === "PRICING_PROPERTY_NOT_FOUND"
      ? "LIFECYCLE_PRICING_PROPERTY_NOT_FOUND"
      : "LIFECYCLE_PRICING_CONFIGURATION_INVALID",
  );
}

async function resolveCurrentStayPricing(
  input: ResolvePropertyStayPricingInput,
  options: ResolveLifecyclePricingOptions,
) {
  const pricingResolver = options.pricingResolver ?? resolvePropertyStayPricing;
  const repositoryOptions: ResolvePropertyStayPricingOptions = {
    prismaClient: options.prismaClient,
  };

  try {
    return await pricingResolver(input, repositoryOptions);
  } catch (error) {
    if (error instanceof PricingRepositoryError) {
      return mapPricingRepositoryError(error);
    }

    throw error;
  }
}

export async function resolveLifecyclePricing(
  input: ResolveLifecyclePricingInput,
  options: ResolveLifecyclePricingOptions = {},
): Promise<ResolvedLifecyclePricing> {
  if (
    !input.propertyId.trim() ||
    !isNonNegativeSafeInteger(input.originalSubtotalCents) ||
    !isNonNegativeSafeInteger(input.originalTotalCents)
  ) {
    throw new LifecyclePricingError("INVALID_LIFECYCLE_PRICING_INPUT");
  }

  const originalNights = countNights(
    input.originalCheckInDate,
    input.originalCheckOutDate,
  );
  const requestedNights = countNights(
    input.requestedCheckInDate,
    input.requestedCheckOutDate,
  );

  if (input.requestType === "DATE_CHANGE") {
    const pricing = await resolveCurrentStayPricing(
      {
        propertyId: input.propertyId,
        checkInDate: input.requestedCheckInDate,
        checkOutDate: input.requestedCheckOutDate,
        stayLengthContextNights: requestedNights,
      },
      options,
    );

    return {
      requestedSubtotalCents: pricing.subtotalCents,
      requestedTotalCents: pricing.totalCents,
      requestedPricingSnapshot: pricing.snapshot,
    };
  }

  if (
    input.requestedCheckInDate !== input.originalCheckInDate ||
    input.requestedCheckOutDate <= input.originalCheckOutDate ||
    requestedNights <= originalNights
  ) {
    throw new LifecyclePricingError("INVALID_LIFECYCLE_PRICING_INPUT");
  }

  const addedPricing = await resolveCurrentStayPricing(
    {
      propertyId: input.propertyId,
      checkInDate: input.originalCheckOutDate,
      checkOutDate: input.requestedCheckOutDate,
      stayLengthContextNights: requestedNights,
    },
    options,
  );
  const acceptedSnapshot =
    input.originalPricingSnapshot === null
      ? null
      : parseFinalCPricingSnapshot(input.originalPricingSnapshot);

  if (input.originalPricingSnapshot !== null && !acceptedSnapshot) {
    throw new LifecyclePricingError("INVALID_ACCEPTED_PRICING_SNAPSHOT");
  }

  if (acceptedSnapshot) {
    assertAcceptedSnapshotMatchesReservation(acceptedSnapshot, input);
  }

  const requestedSubtotalCents = addMoneyCents(
    input.originalSubtotalCents,
    addedPricing.subtotalCents,
  );
  const requestedTotalCents = addMoneyCents(
    input.originalTotalCents,
    addedPricing.totalCents,
  );
  const requestedPricingSnapshot: FinalCPricingSnapshot = {
    version: FINAL_C_PRICING_SNAPSHOT_VERSION,
    currency: TRP_STAY_PRICING_CURRENCY,
    propertyId: input.propertyId,
    checkInDate: input.originalCheckInDate,
    checkOutDate: input.requestedCheckOutDate,
    stayLengthContextNights: requestedNights,
    pricedNights: requestedNights,
    subtotalCents: requestedSubtotalCents,
    totalCents: requestedTotalCents,
    segments: [
      ...(acceptedSnapshot?.segments ?? [buildPreservedLegacySegment(input)]),
      ...addedPricing.snapshot.segments,
    ],
  };

  if (!parseFinalCPricingSnapshot(requestedPricingSnapshot)) {
    throw new LifecyclePricingError("INVALID_ACCEPTED_PRICING_SNAPSHOT");
  }

  return {
    requestedSubtotalCents,
    requestedTotalCents,
    requestedPricingSnapshot,
  };
}
