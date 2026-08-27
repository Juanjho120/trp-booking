import assert from "node:assert/strict";

import {
  calculateStayPricing,
  type PricingEngineLengthOfStayRule,
  type PricingEngineSeasonalRule,
} from "@/lib/pricing/engine";
import {
  LifecyclePricingError,
  parseFinalCPricingSnapshot,
  pricingSnapshotsEqual,
  resolveLifecyclePricing,
  type ResolveLifecyclePricingOptions,
} from "@/lib/pricing/lifecycle";
import type { ResolvePropertyStayPricingInput } from "@/lib/pricing/repository";
import type { DateOnlyString } from "@/types/availability";
import type { FinalCPricingSnapshot } from "@/types/pricing";

import { test } from "./harness";

type ResolverCall = ResolvePropertyStayPricingInput;

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

function pricingOptions(input: Readonly<{
  calls: ResolverCall[];
  baseNightlyRateCents?: number;
  seasonalRules?: readonly PricingEngineSeasonalRule[];
  lengthOfStayRules?: readonly PricingEngineLengthOfStayRule[];
}>): ResolveLifecyclePricingOptions {
  return {
    pricingResolver: async (request) => {
      input.calls.push(request);
      return calculateStayPricing({
        ...request,
        baseNightlyRateCents: input.baseNightlyRateCents ?? 10000,
        seasonalRules: input.seasonalRules ?? [],
        lengthOfStayRules: input.lengthOfStayRules ?? [],
      });
    },
  };
}

function fullSnapshot(input: Readonly<{
  checkInDate: DateOnlyString;
  checkOutDate: DateOnlyString;
  stayLengthContextNights: number;
  baseNightlyRateCents?: number;
  seasonalRules?: readonly PricingEngineSeasonalRule[];
  lengthOfStayRules?: readonly PricingEngineLengthOfStayRule[];
}>): FinalCPricingSnapshot {
  return calculateStayPricing({
    propertyId: "black-white-apartment",
    checkInDate: input.checkInDate,
    checkOutDate: input.checkOutDate,
    stayLengthContextNights: input.stayLengthContextNights,
    baseNightlyRateCents: input.baseNightlyRateCents ?? 10000,
    seasonalRules: input.seasonalRules ?? [],
    lengthOfStayRules: input.lengthOfStayRules ?? [],
  }).snapshot;
}

test("DATE_CHANGE reprices the complete requested stay with current Final-C rules", async () => {
  const calls: ResolverCall[] = [];
  const result = await resolveLifecyclePricing(
    {
      requestType: "DATE_CHANGE",
      propertyId: "black-white-apartment",
      originalCheckInDate: "2026-10-01",
      originalCheckOutDate: "2026-10-04",
      requestedCheckInDate: "2026-11-01",
      requestedCheckOutDate: "2026-11-08",
      originalSubtotalCents: 30000,
      originalTotalCents: 30000,
      originalPricingSnapshot: null,
    },
    pricingOptions({
      calls,
      lengthOfStayRules: [losRule("los-7", 7, 8000)],
      seasonalRules: [
        seasonalRule("seasonal", "2026-11-03", "2026-11-04", 12000),
      ],
    }),
  );

  assert.deepEqual(calls, [
    {
      propertyId: "black-white-apartment",
      checkInDate: "2026-11-01",
      checkOutDate: "2026-11-08",
      stayLengthContextNights: 7,
    },
  ]);
  assert.equal(result.requestedSubtotalCents, 60000);
  assert.equal(result.requestedTotalCents, 60000);
  assert.equal(result.requestedPricingSnapshot.checkInDate, "2026-11-01");
  assert.equal(result.requestedPricingSnapshot.checkOutDate, "2026-11-08");
  assert.equal(
    result.requestedPricingSnapshot.segments.some(
      (segment) => segment.kind === "PRESERVED_LEGACY_STAY",
    ),
    false,
  );
});

test("STAY_EXTENSION prices only added nights while LOS uses resulting total stay", async () => {
  const originalSnapshot = fullSnapshot({
    checkInDate: "2026-10-01",
    checkOutDate: "2026-10-07",
    stayLengthContextNights: 6,
    lengthOfStayRules: [losRule("los-5", 5, 9000)],
  });
  const calls: ResolverCall[] = [];
  const result = await resolveLifecyclePricing(
    {
      requestType: "STAY_EXTENSION",
      propertyId: "black-white-apartment",
      originalCheckInDate: "2026-10-01",
      originalCheckOutDate: "2026-10-07",
      requestedCheckInDate: "2026-10-01",
      requestedCheckOutDate: "2026-10-08",
      originalSubtotalCents: 54000,
      originalTotalCents: 54000,
      originalPricingSnapshot: originalSnapshot,
    },
    pricingOptions({
      calls,
      lengthOfStayRules: [
        losRule("los-5", 5, 9000),
        losRule("los-7", 7, 8000),
      ],
    }),
  );

  assert.deepEqual(calls, [
    {
      propertyId: "black-white-apartment",
      checkInDate: "2026-10-07",
      checkOutDate: "2026-10-08",
      stayLengthContextNights: 7,
    },
  ]);
  assert.equal(result.requestedSubtotalCents, 62000);
  assert.equal(result.requestedTotalCents, 62000);
  assert.equal(result.requestedPricingSnapshot.stayLengthContextNights, 7);
  assert.equal(result.requestedPricingSnapshot.segments.length, 2);

  const originalSegment = result.requestedPricingSnapshot.segments[0];
  const addedSegment = result.requestedPricingSnapshot.segments[1];
  assert.equal(originalSegment?.kind, "RESOLVED_RATE");
  assert.equal(
    originalSegment?.kind === "RESOLVED_RATE"
      ? originalSegment.source
      : null,
    "LENGTH_OF_STAY",
  );
  assert.equal(
    originalSegment?.kind === "RESOLVED_RATE" &&
      originalSegment.source === "LENGTH_OF_STAY"
      ? originalSegment.ruleId
      : null,
    "los-5",
  );
  assert.equal(addedSegment?.kind, "RESOLVED_RATE");
  assert.equal(
    addedSegment?.kind === "RESOLVED_RATE" ? addedSegment.source : null,
    "LENGTH_OF_STAY",
  );
  assert.equal(
    addedSegment?.kind === "RESOLVED_RATE" &&
      addedSegment.source === "LENGTH_OF_STAY"
      ? addedSegment.ruleId
      : null,
    "los-7",
  );
});

test("seasonal rate still overrides LOS on newly added extension nights", async () => {
  const originalSnapshot = fullSnapshot({
    checkInDate: "2026-12-20",
    checkOutDate: "2026-12-26",
    stayLengthContextNights: 6,
  });
  const result = await resolveLifecyclePricing(
    {
      requestType: "STAY_EXTENSION",
      propertyId: "black-white-apartment",
      originalCheckInDate: "2026-12-20",
      originalCheckOutDate: "2026-12-26",
      requestedCheckInDate: "2026-12-20",
      requestedCheckOutDate: "2026-12-27",
      originalSubtotalCents: 60000,
      originalTotalCents: 60000,
      originalPricingSnapshot: originalSnapshot,
    },
    pricingOptions({
      calls: [],
      lengthOfStayRules: [losRule("los-7", 7, 8000)],
      seasonalRules: [
        seasonalRule("holiday", "2026-12-26", "2026-12-27", 15000),
      ],
    }),
  );

  assert.equal(result.requestedSubtotalCents, 75000);
  const addedSegment = result.requestedPricingSnapshot.segments.at(-1);
  assert.equal(addedSegment?.kind, "RESOLVED_RATE");
  assert.equal(
    addedSegment?.kind === "RESOLVED_RATE" ? addedSegment.source : null,
    "SEASONAL",
  );
});

test("legacy extension preserves accepted historical stay without fabricated rule evidence", async () => {
  const result = await resolveLifecyclePricing(
    {
      requestType: "STAY_EXTENSION",
      propertyId: "black-white-apartment",
      originalCheckInDate: "2026-10-01",
      originalCheckOutDate: "2026-10-07",
      requestedCheckInDate: "2026-10-01",
      requestedCheckOutDate: "2026-10-08",
      originalSubtotalCents: 60000,
      originalTotalCents: 60000,
      originalPricingSnapshot: null,
    },
    pricingOptions({
      calls: [],
      lengthOfStayRules: [losRule("los-7", 7, 8000)],
    }),
  );

  const preserved = result.requestedPricingSnapshot.segments[0];
  assert.equal(preserved?.kind, "PRESERVED_LEGACY_STAY");
  assert.deepEqual(preserved, {
    kind: "PRESERVED_LEGACY_STAY",
    startDate: "2026-10-01",
    endDate: "2026-10-07",
    nights: 6,
    acceptedSubtotalCents: 60000,
    acceptedTotalCents: 60000,
  });
  assert.equal("ruleId" in (preserved ?? {}), false);
  assert.equal(result.requestedSubtotalCents, 68000);
  assert.ok(parseFinalCPricingSnapshot(result.requestedPricingSnapshot));
});

test("a later extension preserves prior combined evidence and appends only new nights", async () => {
  const firstExtension = await resolveLifecyclePricing(
    {
      requestType: "STAY_EXTENSION",
      propertyId: "black-white-apartment",
      originalCheckInDate: "2026-10-01",
      originalCheckOutDate: "2026-10-07",
      requestedCheckInDate: "2026-10-01",
      requestedCheckOutDate: "2026-10-08",
      originalSubtotalCents: 60000,
      originalTotalCents: 60000,
      originalPricingSnapshot: null,
    },
    pricingOptions({
      calls: [],
      lengthOfStayRules: [losRule("los-7", 7, 8000)],
    }),
  );
  const acceptedFirstExtension = firstExtension.requestedPricingSnapshot;
  const secondExtension = await resolveLifecyclePricing(
    {
      requestType: "STAY_EXTENSION",
      propertyId: "black-white-apartment",
      originalCheckInDate: "2026-10-01",
      originalCheckOutDate: "2026-10-08",
      requestedCheckInDate: "2026-10-01",
      requestedCheckOutDate: "2026-10-09",
      originalSubtotalCents: firstExtension.requestedSubtotalCents,
      originalTotalCents: firstExtension.requestedTotalCents,
      originalPricingSnapshot: acceptedFirstExtension,
    },
    pricingOptions({
      calls: [],
      lengthOfStayRules: [losRule("los-7", 7, 8000)],
    }),
  );

  assert.deepEqual(
    secondExtension.requestedPricingSnapshot.segments.slice(
      0,
      acceptedFirstExtension.segments.length,
    ),
    acceptedFirstExtension.segments,
  );
  assert.equal(
    secondExtension.requestedPricingSnapshot.segments.filter(
      (segment) => segment.kind === "PRESERVED_LEGACY_STAY",
    ).length,
    1,
  );
  assert.equal(secondExtension.requestedSubtotalCents, 76000);
  assert.equal(secondExtension.requestedPricingSnapshot.pricedNights, 8);
});

test("extension fails closed when persisted pricing evidence disagrees with accepted totals", async () => {
  const inconsistentSnapshot = fullSnapshot({
    checkInDate: "2026-10-01",
    checkOutDate: "2026-10-07",
    stayLengthContextNights: 6,
  });

  await assert.rejects(
    () =>
      resolveLifecyclePricing(
        {
          requestType: "STAY_EXTENSION",
          propertyId: "black-white-apartment",
          originalCheckInDate: "2026-10-01",
          originalCheckOutDate: "2026-10-07",
          requestedCheckInDate: "2026-10-01",
          requestedCheckOutDate: "2026-10-08",
          originalSubtotalCents: 59000,
          originalTotalCents: 59000,
          originalPricingSnapshot: inconsistentSnapshot,
        },
        pricingOptions({ calls: [] }),
      ),
    (error: unknown) =>
      error instanceof LifecyclePricingError &&
      error.code === "INVALID_ACCEPTED_PRICING_SNAPSHOT",
  );
});

test("pricing snapshot comparison is structural and independent of object key order", () => {
  const snapshot = fullSnapshot({
    checkInDate: "2026-10-01",
    checkOutDate: "2026-10-04",
    stayLengthContextNights: 3,
  });
  const reordered = {
    segments: snapshot.segments,
    totalCents: snapshot.totalCents,
    subtotalCents: snapshot.subtotalCents,
    pricedNights: snapshot.pricedNights,
    stayLengthContextNights: snapshot.stayLengthContextNights,
    checkOutDate: snapshot.checkOutDate,
    checkInDate: snapshot.checkInDate,
    propertyId: snapshot.propertyId,
    currency: snapshot.currency,
    version: snapshot.version,
  };

  assert.equal(pricingSnapshotsEqual(reordered, snapshot), true);
});
