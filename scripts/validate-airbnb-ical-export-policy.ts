import { getBlockingAccommodationIds } from "@/lib/availability/rules";
import {
  AIRBNB_ICAL_EXPORT_UID_HOST,
  buildAirbnbIcalExportEventUid,
  isTrpOwnedCalendarBlockForAirbnbExport,
} from "@/lib/airbnb-ical/export-policy";
import type { AccommodationId } from "@/types/accommodation";

function assert(condition: boolean, message: string): void {
  if (!condition) {
    throw new Error(message);
  }
}

function assertSameMembers(
  actual: readonly string[],
  expected: readonly string[],
  message: string,
): void {
  const normalizedActual = [...actual].sort().join("|");
  const normalizedExpected = [...expected].sort().join("|");

  assert(
    normalizedActual === normalizedExpected,
    `${message}. Expected ${normalizedExpected}, received ${normalizedActual}.`,
  );
}

function feedIsBlockedBy(
  targetAccommodationId: AccommodationId,
  sourceAccommodationId: AccommodationId,
): boolean {
  return getBlockingAccommodationIds(targetAccommodationId).includes(
    sourceAccommodationId,
  );
}

function validateOwnershipPolicy(): void {
  assert(
    !isTrpOwnedCalendarBlockForAirbnbExport({
      source: "AIRBNB",
      externalCalendarEventId: "airbnb-event-1",
    }),
    "Imported AIRBNB blocks must never be exported back to Airbnb",
  );

  assert(
    !isTrpOwnedCalendarBlockForAirbnbExport({
      source: "PREPARATION_BUFFER",
      externalCalendarEventId: "airbnb-event-1",
    }),
    "Preparation buffers derived from imported Airbnb events must not be exported",
  );

  assert(
    isTrpOwnedCalendarBlockForAirbnbExport({
      source: "PREPARATION_BUFFER",
      externalCalendarEventId: null,
    }),
    "TRP-owned preparation buffer rows must remain export-eligible",
  );

  assert(
    isTrpOwnedCalendarBlockForAirbnbExport({
      source: "MANUAL_BLOCK",
      externalCalendarEventId: null,
    }),
    "TRP manual blocks must remain export-eligible",
  );

  assert(
    isTrpOwnedCalendarBlockForAirbnbExport({
      source: "MAINTENANCE",
      externalCalendarEventId: null,
    }),
    "TRP maintenance blocks must remain export-eligible",
  );

  assert(
    !isTrpOwnedCalendarBlockForAirbnbExport({
      source: "COMPOSED_LISTING_DEPENDENCY",
      externalCalendarEventId: null,
    }),
    "Physical composed-listing dependency copies must not be exported",
  );

  assert(
    !isTrpOwnedCalendarBlockForAirbnbExport({
      source: "DIRECT_RESERVATION",
      externalCalendarEventId: null,
    }),
    "Direct reservation CalendarBlock copies must not replace Reservation as the outbound source of truth",
  );
}

function validateComposedListingMatrix(): void {
  assertSameMembers(
    getBlockingAccommodationIds("black-white-apartment"),
    ["black-white-apartment", "complete-retreat"],
    "Apartment outbound feed blocking-property matrix changed unexpectedly",
  );
  assertSameMembers(
    getBlockingAccommodationIds("perfect-retreat-bungalow"),
    ["perfect-retreat-bungalow", "complete-retreat"],
    "Bungalow outbound feed blocking-property matrix changed unexpectedly",
  );
  assertSameMembers(
    getBlockingAccommodationIds("complete-retreat"),
    [
      "black-white-apartment",
      "perfect-retreat-bungalow",
      "complete-retreat",
    ],
    "Complete-retreat outbound feed blocking-property matrix changed unexpectedly",
  );

  assert(
    feedIsBlockedBy("black-white-apartment", "black-white-apartment") &&
      feedIsBlockedBy("complete-retreat", "black-white-apartment") &&
      !feedIsBlockedBy("perfect-retreat-bungalow", "black-white-apartment"),
    "Apartment-only TRP blockers must export to Apartment and Complete, but not Bungalow",
  );

  assert(
    feedIsBlockedBy("perfect-retreat-bungalow", "perfect-retreat-bungalow") &&
      feedIsBlockedBy("complete-retreat", "perfect-retreat-bungalow") &&
      !feedIsBlockedBy("black-white-apartment", "perfect-retreat-bungalow"),
    "Bungalow-only TRP blockers must export to Bungalow and Complete, but not Apartment",
  );

  assert(
    feedIsBlockedBy("black-white-apartment", "complete-retreat") &&
      feedIsBlockedBy("perfect-retreat-bungalow", "complete-retreat") &&
      feedIsBlockedBy("complete-retreat", "complete-retreat"),
    "Complete-retreat TRP blockers must export to all three affected feeds",
  );
}

function validateStableEventIdentity(): void {
  const externalCalendarId = "calendar-123";
  const rangeA = { startDate: "2026-08-12", endDate: "2026-08-13" };
  const rangeB = { startDate: "2026-08-20", endDate: "2026-08-22" };
  const rangeC = { startDate: "2026-09-02", endDate: "2026-09-04" };

  const initialUids = new Map(
    [rangeB, rangeC].map((range) => [
      `${range.startDate}-${range.endDate}`,
      buildAirbnbIcalExportEventUid({ externalCalendarId, range }),
    ]),
  );
  const withEarlierRangeUids = new Map(
    [rangeA, rangeB, rangeC].map((range) => [
      `${range.startDate}-${range.endDate}`,
      buildAirbnbIcalExportEventUid({ externalCalendarId, range }),
    ]),
  );
  const afterRemovalUids = new Map(
    [rangeB, rangeC].map((range) => [
      `${range.startDate}-${range.endDate}`,
      buildAirbnbIcalExportEventUid({ externalCalendarId, range }),
    ]),
  );

  for (const range of [rangeB, rangeC]) {
    const key = `${range.startDate}-${range.endDate}`;
    assert(
      initialUids.get(key) === withEarlierRangeUids.get(key) &&
        initialUids.get(key) === afterRemovalUids.get(key),
      `VEVENT UID changed when unrelated earlier ranges changed for ${key}`,
    );
  }

  const deterministicUid = buildAirbnbIcalExportEventUid({
    externalCalendarId,
    range: rangeB,
  });
  assert(
    deterministicUid ===
      buildAirbnbIcalExportEventUid({ externalCalendarId, range: rangeB }),
    "Same calendar and normalized range must always produce the same VEVENT UID",
  );
  assert(
    deterministicUid.endsWith(`@${AIRBNB_ICAL_EXPORT_UID_HOST}`),
    "VEVENT UID must use the permanent Tu Refugio Perfecto namespace",
  );
  assert(
    AIRBNB_ICAL_EXPORT_UID_HOST === "turefugioperfecto.com",
    "VEVENT UID namespace must use the accepted production domain identity",
  );
  assert(
    !deterministicUid.includes("turefugioperfecto.com.gt"),
    "Historical .com.gt namespace must not remain in outbound VEVENT UIDs",
  );
}

validateOwnershipPolicy();
validateComposedListingMatrix();
validateStableEventIdentity();

console.log("Airbnb iCal outbound ownership and UID policy validation passed.");
