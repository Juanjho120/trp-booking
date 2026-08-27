import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import { test } from "./harness";

function source(path: string): string {
  return readFileSync(resolve(process.cwd(), path), "utf8");
}

test("pricing repository scopes enabled non-deleted rules to one Property", () => {
  const repository = source("lib/pricing/repository.ts");

  assert.match(repository, /id: input\.propertyId/);
  assert.match(repository, /seasonalPricingRules:/);
  assert.match(repository, /lengthOfStayPricingRules:/);
  assert.match(repository, /isEnabled: true/);
  assert.match(repository, /deletedAt: null/);
});

test("public quote delegates pricing to the central engine repository", () => {
  const pricing = source("lib/reservations/pricing.ts");

  assert.match(pricing, /resolvePropertyStayPricing/);
  assert.doesNotMatch(pricing, /baseNightlyPriceUsd\s*\*/);
});

test("mixed public quotes cannot expose a misleading universal nightly rate", () => {
  const quoteType = source("types/reservation-quote.ts");
  const form = source(
    "features/reservations/components/reservation-request-form.tsx",
  );

  assert.match(
    quoteType,
    /nightlyRate: ReservationQuoteAmount \| null/,
  );
  assert.match(form, /quote\.nightlyRate \?/);
});

test("new pending reservations persist versioned pricing evidence", () => {
  const pendingHolds = source("lib/reservations/pending-holds.ts");

  assert.match(
    pendingHolds,
    /calculateReservationQuoteWithPricingSnapshot/,
  );
  assert.match(pendingHolds, /pricingSnapshot:/);
  assert.match(pendingHolds, /Prisma\.InputJsonValue/);
});

test("pending reservation reuse validates stored totals against authoritative pricing", () => {
  const pendingHolds = source("lib/reservations/pending-holds.ts");

  assert.match(pendingHolds, /assertStoredReservationMatchesQuote/);
  assert.match(pendingHolds, /PENDING_HOLD_STALE/);
});

test("public pricing response type contains no pricing rule identifiers", () => {
  const quoteType = source("types/reservation-quote.ts");

  assert.doesNotMatch(quoteType, /ruleId/);
  assert.doesNotMatch(quoteType, /pricingSnapshot/);
});

test("Final-C.5 routes lifecycle date mutations through the central pricing contract", () => {
  const lifecyclePricing = source("lib/pricing/lifecycle.ts");
  const dateMutation = source("lib/admin/reservation-date-mutation.ts");

  assert.match(lifecyclePricing, /resolvePropertyStayPricing/);
  assert.match(dateMutation, /resolveLifecyclePricing/);
  assert.doesNotMatch(dateMutation, /baseNightlyPrice/);
  assert.match(dateMutation, /originalPricingSnapshot/);
  assert.match(dateMutation, /requestedPricingSnapshot/);
});

test("STAY_EXTENSION resolves only added nights with resulting-stay LOS context", () => {
  const lifecyclePricing = source("lib/pricing/lifecycle.ts");

  assert.match(lifecyclePricing, /checkInDate: input\.originalCheckOutDate/);
  assert.match(lifecyclePricing, /stayLengthContextNights: requestedNights/);
  assert.match(lifecyclePricing, /PRESERVED_LEGACY_STAY/);
  assert.match(lifecyclePricing, /acceptedSnapshot\?\.segments/);
});

test("all lifecycle completion branches promote requested pricing evidence to Reservation", () => {
  const positiveZeroCompletion = source(
    "lib/reservations/date-mutation-completion.ts",
  );
  const negativeCompletion = source(
    "lib/reservations/negative-date-mutation-completion.ts",
  );

  for (const completion of [positiveZeroCompletion, negativeCompletion]) {
    assert.match(completion, /requestedPricingSnapshot: true/);
    assert.match(
      completion,
      /pricingSnapshot: snapshot\.pricingSnapshot as Prisma\.InputJsonValue/,
    );
    assert.match(completion, /pricingSnapshotsEqual/);
  }
});
