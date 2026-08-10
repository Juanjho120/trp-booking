import assert from "node:assert/strict";

import {
  consolidateAdminCalendarEntries,
  type AdminCalendarDisplayEntry,
} from "../lib/admin/calendar-display";
import type { AdminCalendarEntry } from "../types/admin-calendar";

function entry(
  id: string,
  input: Partial<AdminCalendarEntry> &
    Pick<
      AdminCalendarEntry,
      "source" | "originPropertyId" | "originPropertyNameEs" | "originPropertyNameEn"
    >,
): AdminCalendarEntry {
  return {
    id,
    source: input.source,
    blocking: input.blocking ?? true,
    inherited: input.inherited ?? false,
    originPropertyId: input.originPropertyId,
    originPropertyNameEs: input.originPropertyNameEs,
    originPropertyNameEn: input.originPropertyNameEn,
    startDate: input.startDate ?? "2026-08-10",
    endDate: input.endDate ?? "2026-08-11",
    reservationId: input.reservationId ?? null,
    guestName: input.guestName ?? null,
    guestEmail: input.guestEmail ?? null,
    calendarBlockId: input.calendarBlockId ?? id,
    externalCalendarEventId: input.externalCalendarEventId ?? null,
    note: input.note ?? null,
    canUnlockPreparation: input.canUnlockPreparation ?? false,
    canRestorePreparation: input.canRestorePreparation ?? false,
    canReleaseManualDay: input.canReleaseManualDay ?? false,
  };
}

function origins(displayEntry: AdminCalendarDisplayEntry): string[] {
  return [
    ...new Set(displayEntry.entries.map((candidate) => candidate.originPropertyId)),
  ].sort();
}

const apartmentAirbnb = entry("airbnb-apartment", {
  source: "AIRBNB",
  inherited: true,
  originPropertyId: "black-white-apartment",
  originPropertyNameEs: "Apartamento Blanco y Negro",
  originPropertyNameEn: "Black and White Apartment",
});

const bungalowAirbnb = entry("airbnb-bungalow", {
  source: "AIRBNB",
  inherited: true,
  originPropertyId: "perfect-retreat-bungalow",
  originPropertyNameEs: "Bungalow Refugio Perfecto",
  originPropertyNameEn: "Perfect Retreat Bungalow",
});

const inheritedAirbnb = consolidateAdminCalendarEntries([
  apartmentAirbnb,
  bungalowAirbnb,
]);

assert.equal(inheritedAirbnb.length, 1);
assert.equal(inheritedAirbnb[0]?.source, "AIRBNB");
assert.equal(inheritedAirbnb[0]?.inherited, true);
assert.deepEqual(origins(inheritedAirbnb[0]!), [
  "black-white-apartment",
  "perfect-retreat-bungalow",
]);

const apartmentPreparation = entry("prep-apartment", {
  source: "PREPARATION_BUFFER",
  originPropertyId: "black-white-apartment",
  originPropertyNameEs: "Apartamento Blanco y Negro",
  originPropertyNameEn: "Black and White Apartment",
  canUnlockPreparation: true,
});

const localPreparationOverlap = consolidateAdminCalendarEntries([
  {
    ...apartmentAirbnb,
    inherited: false,
  },
  apartmentPreparation,
]);

assert.equal(localPreparationOverlap.length, 1);
assert.equal(localPreparationOverlap[0]?.source, "AIRBNB_PREPARATION");
assert.equal(localPreparationOverlap[0]?.inherited, false);
assert.deepEqual(origins(localPreparationOverlap[0]!), [
  "black-white-apartment",
]);

const completeInheritedPreparation = consolidateAdminCalendarEntries([
  apartmentAirbnb,
  {
    ...apartmentPreparation,
    inherited: true,
    canUnlockPreparation: false,
  },
]);

assert.equal(completeInheritedPreparation.length, 1);
assert.equal(completeInheritedPreparation[0]?.source, "AIRBNB_PREPARATION");
assert.equal(completeInheritedPreparation[0]?.inherited, true);

const directReservation = entry("reservation", {
  source: "DIRECT_RESERVATION",
  originPropertyId: "black-white-apartment",
  originPropertyNameEs: "Apartamento Blanco y Negro",
  originPropertyNameEn: "Black and White Apartment",
  reservationId: "reservation-1",
});

const mixedSources = consolidateAdminCalendarEntries([
  apartmentAirbnb,
  bungalowAirbnb,
  directReservation,
]);

assert.equal(mixedSources.length, 2);
assert.equal(
  mixedSources.filter((candidate) => candidate.source === "AIRBNB").length,
  1,
);
assert.equal(
  mixedSources.filter(
    (candidate) => candidate.source === "DIRECT_RESERVATION",
  ).length,
  1,
);

console.log("Admin calendar display consolidation validation passed.");
