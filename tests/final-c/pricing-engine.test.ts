import assert from "node:assert/strict";

import {
  calculateStayPricing,
  PricingEngineError,
  type PricingEngineLengthOfStayRule,
  type PricingEngineSeasonalRule,
} from "@/lib/pricing/engine";
import type { DateOnlyString } from "@/types/availability";

import { test } from "./harness";

const baseInput = {
  propertyId: "black-white-apartment",
  checkInDate: "2026-10-01" as DateOnlyString,
  checkOutDate: "2026-10-04" as DateOnlyString,
  stayLengthContextNights: 3,
  baseNightlyRateCents: 10000,
  seasonalRules: [] as readonly PricingEngineSeasonalRule[],
  lengthOfStayRules: [] as readonly PricingEngineLengthOfStayRule[],
};

function losRule(
  id: string,
  minimumNights: 2 | 3 | 4 | 5 | 6 | 7 | 15 | 30,
  nightlyRateCents: number,
): PricingEngineLengthOfStayRule {
  return { id, minimumNights, nightlyRateCents };
}

function seasonalRule(
  id: string,
  startDate: DateOnlyString,
  endDate: DateOnlyString,
  nightlyRateCents: number,
): PricingEngineSeasonalRule {
  return { id, startDate, endDate, nightlyRateCents };
}

test("base pricing resolves every requested night in integer cents", () => {
  const result = calculateStayPricing(baseInput);

  assert.equal(result.pricedNights, 3);
  assert.equal(result.subtotalCents, 30000);
  assert.equal(result.totalCents, 30000);
  assert.equal(result.uniformNightlyRateCents, 10000);
  assert.deepEqual(result.appliedSources, ["BASE"]);
  assert.equal(result.snapshot.version, "FINAL_C_V1");
  assert.equal(result.snapshot.segments.length, 1);
});

test("highest eligible LOS threshold wins for the complete stay context", () => {
  const result = calculateStayPricing({
    ...baseInput,
    lengthOfStayRules: [
      losRule("los-2", 2, 9500),
      losRule("los-3", 3, 9000),
      losRule("los-7", 7, 8000),
    ],
  });

  assert.equal(result.uniformNightlyRateCents, 9000);
  assert.equal(result.subtotalCents, 27000);
  assert.deepEqual(result.appliedSources, ["LENGTH_OF_STAY"]);
  const segment = result.snapshot.segments[0];
  assert.equal(segment?.kind, "RESOLVED_RATE");
  assert.equal(segment?.source, "LENGTH_OF_STAY");
  if (segment?.kind === "RESOLVED_RATE" && segment.source === "LENGTH_OF_STAY") {
    assert.equal(segment.ruleId, "los-3");
    assert.equal(segment.minimumNights, 3);
  }
});

test("missing LOS tiers are skipped deterministically", () => {
  const result = calculateStayPricing({
    ...baseInput,
    checkOutDate: "2026-10-07",
    stayLengthContextNights: 6,
    lengthOfStayRules: [losRule("los-2", 2, 9700), losRule("los-5", 5, 8500)],
  });

  assert.equal(result.uniformNightlyRateCents, 8500);
  assert.equal(result.subtotalCents, 51000);
});

test("seasonal nightly rate overrides LOS only for covered nights", () => {
  const result = calculateStayPricing({
    ...baseInput,
    lengthOfStayRules: [losRule("los-3", 3, 9000)],
    seasonalRules: [
      seasonalRule("seasonal", "2026-10-02", "2026-10-03", 12500),
    ],
  });

  assert.equal(result.subtotalCents, 30500);
  assert.equal(result.uniformNightlyRateCents, null);
  assert.deepEqual(result.appliedSources, ["LENGTH_OF_STAY", "SEASONAL"]);
  assert.equal(result.snapshot.segments.length, 3);
});

test("seasonal ranges use inclusive start and exclusive end", () => {
  const result = calculateStayPricing({
    ...baseInput,
    seasonalRules: [
      seasonalRule("seasonal", "2026-10-01", "2026-10-03", 12000),
    ],
  });

  assert.equal(result.subtotalCents, 34000);
  assert.equal(result.snapshot.segments.length, 2);
  assert.equal(result.snapshot.segments[0]?.startDate, "2026-10-01");
  assert.equal(result.snapshot.segments[0]?.endDate, "2026-10-03");
  assert.equal(result.snapshot.segments[1]?.startDate, "2026-10-03");
});

test("seasonal values lower than base remain valid absolute nightly prices", () => {
  const result = calculateStayPricing({
    ...baseInput,
    seasonalRules: [
      seasonalRule("low-season", "2026-10-01", "2026-10-04", 7500),
    ],
  });

  assert.equal(result.uniformNightlyRateCents, 7500);
  assert.equal(result.totalCents, 22500);
});

test("equal effective nightly values remain safe to expose as one uniform rate", () => {
  const result = calculateStayPricing({
    ...baseInput,
    lengthOfStayRules: [losRule("los-3", 3, 9000)],
    seasonalRules: [
      seasonalRule("seasonal", "2026-10-02", "2026-10-03", 9000),
    ],
  });

  assert.equal(result.uniformNightlyRateCents, 9000);
  assert.equal(result.subtotalCents, 27000);
  assert.equal(result.snapshot.segments.length, 3);
});

test("overlapping seasonal rules fail closed instead of depending on row ordering", () => {
  assert.throws(
    () =>
      calculateStayPricing({
        ...baseInput,
        seasonalRules: [
          seasonalRule("seasonal-a", "2026-10-01", "2026-10-03", 11000),
          seasonalRule("seasonal-b", "2026-10-02", "2026-10-04", 12000),
        ],
      }),
    (error: unknown) =>
      error instanceof PricingEngineError &&
      error.code === "OVERLAPPING_SEASONAL_RULES",
  );
});

test("snapshot preserves exact rule evidence while subtotal equals segment sum", () => {
  const result = calculateStayPricing({
    ...baseInput,
    lengthOfStayRules: [losRule("los-3", 3, 9000)],
    seasonalRules: [
      seasonalRule("seasonal", "2026-10-02", "2026-10-03", 12500),
    ],
  });
  const segmentSubtotal = result.snapshot.segments.reduce((sum, segment) => {
    if (segment.kind === "PRESERVED_LEGACY_STAY") {
      return sum + segment.acceptedSubtotalCents;
    }

    return sum + segment.subtotalCents;
  }, 0);

  assert.equal(segmentSubtotal, result.subtotalCents);
  assert.equal(result.snapshot.propertyId, baseInput.propertyId);
  assert.equal(result.snapshot.stayLengthContextNights, 3);
});
