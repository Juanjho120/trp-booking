import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import {
  calculateStayPricing,
  type PricingEngineLengthOfStayRule,
  type PricingEngineSeasonalRule,
} from "@/lib/pricing/engine";
import type { DateOnlyString } from "@/types/availability";
import type { LengthOfStayMinimumNights } from "@/types/pricing";

import { test } from "./harness";

function source(path: string): string {
  return readFileSync(resolve(process.cwd(), path), "utf8");
}

function dateAfter(startDate: DateOnlyString, days: number): DateOnlyString {
  const date = new Date(`${startDate}T00:00:00.000Z`);
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10) as DateOnlyString;
}

function losRule(
  minimumNights: LengthOfStayMinimumNights,
  nightlyRateCents: number,
): PricingEngineLengthOfStayRule {
  return {
    id: `los-${minimumNights}`,
    minimumNights,
    nightlyRateCents,
  };
}

function seasonalRule(
  id: string,
  startDate: DateOnlyString,
  endDate: DateOnlyString,
  nightlyRateCents: number,
): PricingEngineSeasonalRule {
  return { id, startDate, endDate, nightlyRateCents };
}

const startDate = "2026-11-01" as DateOnlyString;
const allLosRules = [
  losRule(2, 9800),
  losRule(3, 9700),
  losRule(4, 9600),
  losRule(5, 9500),
  losRule(6, 9400),
  losRule(7, 9300),
  losRule(15, 8500),
  losRule(30, 7500),
] as const;

test("C.6 exact LOS thresholds select the matching configured tier", () => {
  for (const rule of allLosRules) {
    const result = calculateStayPricing({
      propertyId: "black-white-apartment",
      checkInDate: startDate,
      checkOutDate: dateAfter(startDate, rule.minimumNights),
      stayLengthContextNights: rule.minimumNights,
      baseNightlyRateCents: 10000,
      seasonalRules: [],
      lengthOfStayRules: allLosRules,
    });

    assert.equal(result.uniformNightlyRateCents, rule.nightlyRateCents);
    assert.equal(result.snapshot.segments[0]?.kind, "RESOLVED_RATE");
    assert.equal(result.snapshot.segments[0]?.source, "LENGTH_OF_STAY");
    const segment = result.snapshot.segments[0];
    if (segment?.kind === "RESOLVED_RATE" && segment.source === "LENGTH_OF_STAY") {
      assert.equal(segment.minimumNights, rule.minimumNights);
      assert.equal(segment.ruleId, rule.id);
    }
  }
});

test("C.6 one-night stay ignores every LOS tier", () => {
  const result = calculateStayPricing({
    propertyId: "perfect-retreat-bungalow",
    checkInDate: startDate,
    checkOutDate: dateAfter(startDate, 1),
    stayLengthContextNights: 1,
    baseNightlyRateCents: 10000,
    seasonalRules: [],
    lengthOfStayRules: allLosRules,
  });

  assert.equal(result.uniformNightlyRateCents, 10000);
  assert.deepEqual(result.appliedSources, ["BASE"]);
});

test("C.6 between-threshold stays choose the highest eligible configured LOS tier", () => {
  for (const [nights, expectedTier] of [
    [10, 7],
    [20, 15],
    [32, 30],
  ] as const) {
    const result = calculateStayPricing({
      propertyId: "complete-retreat",
      checkInDate: startDate,
      checkOutDate: dateAfter(startDate, nights),
      stayLengthContextNights: nights,
      baseNightlyRateCents: 10000,
      seasonalRules: [],
      lengthOfStayRules: allLosRules,
    });
    const segment = result.snapshot.segments[0];

    assert.equal(segment?.kind, "RESOLVED_RATE");
    assert.equal(segment?.source, "LENGTH_OF_STAY");
    if (segment?.kind === "RESOLVED_RATE" && segment.source === "LENGTH_OF_STAY") {
      assert.equal(segment.minimumNights, expectedTier);
    }
  }
});

test("C.6 adjacent seasonal ranges are accepted without overlap ambiguity", () => {
  const boundary = dateAfter(startDate, 2);
  const result = calculateStayPricing({
    propertyId: "black-white-apartment",
    checkInDate: startDate,
    checkOutDate: dateAfter(startDate, 4),
    stayLengthContextNights: 4,
    baseNightlyRateCents: 10000,
    seasonalRules: [
      seasonalRule("seasonal-a", startDate, boundary, 12000),
      seasonalRule("seasonal-b", boundary, dateAfter(startDate, 4), 13000),
    ],
    lengthOfStayRules: [losRule(4, 9000)],
  });

  assert.equal(result.subtotalCents, 50000);
  assert.equal(result.snapshot.segments.length, 2);
  assert.deepEqual(result.appliedSources, ["SEASONAL"]);
});

test("C.6 repository keeps active pricing rules Property-scoped and ignores disabled/deleted rows", () => {
  const repository = source("lib/pricing/repository.ts");

  assert.match(repository, /id: input\.propertyId/);
  assert.match(repository, /seasonalPricingRules:[\s\S]*isEnabled: true[\s\S]*deletedAt: null/);
  assert.match(repository, /lengthOfStayPricingRules:[\s\S]*isEnabled: true[\s\S]*deletedAt: null/);
  assert.match(repository, /minimumNights:\s*\{\s*lte: input\.stayLengthContextNights/);
});

test("C.6 pending reservation keeps guest, availability and accepted-total boundaries", () => {
  const pendingHolds = source("lib/reservations/pending-holds.ts");

  assert.match(pendingHolds, /assertGuestDetails\(input\)/);
  assert.match(pendingHolds, /checkAccommodationAvailability/);
  assert.match(pendingHolds, /subtotal: quote\.subtotal\.amount\.toString\(\)/);
  assert.match(pendingHolds, /total: quote\.total\.amount\.toString\(\)/);
  assert.match(pendingHolds, /pricingSnapshot: pricingSnapshot as Prisma\.InputJsonValue/);
  assert.match(pendingHolds, /assertStoredReservationMatchesQuote/);
});

test("C.6 Final-C migration remains prospective and does not fabricate historical pricing", () => {
  const migration = source(
    "prisma/migrations/20260826104500_final_c_2_pricing_persistence_foundation/migration.sql",
  );

  assert.match(migration, /ADD COLUMN "pricing_snapshot" JSONB/);
  assert.match(migration, /ADD COLUMN "original_pricing_snapshot" JSONB/);
  assert.match(migration, /ADD COLUMN "requested_pricing_snapshot" JSONB/);
  assert.doesNotMatch(migration, /\bUPDATE\s+"?reservations"?/i);
  assert.doesNotMatch(migration, /\bINSERT\s+INTO\s+"?(seasonal_pricing_rules|length_of_stay_pricing_rules)"?/i);
});

test("C.6 admin mutation boundary retains validation, optimistic concurrency and Serializable overlap protection", () => {
  const pricing = source("lib/admin/pricing.ts");
  const route = source("app/api/admin/pricing/route.ts");

  assert.match(route, /getAdminSessionActor/);
  assert.match(route, /isValidAdminMutationOrigin/);
  assert.match(pricing, /SUPPORTED_LENGTH_OF_STAY_MINIMUM_NIGHTS/);
  assert.match(pricing, /assertExpectedUpdatedAt/);
  assert.match(pricing, /Prisma\.TransactionIsolationLevel\.Serializable/);
  assert.match(pricing, /assertNoActiveSeasonalOverlap/);
  assert.match(pricing, /P2034/);
  assert.match(pricing, /P2002/);
  assert.match(pricing, /adminAuditLog\.create/);
});
