export const AIRBNB_ICAL_EXPORT_UID_HOST = "turefugioperfecto.com";

type AirbnbIcalExportCalendarBlockSource =
  | "DIRECT_RESERVATION"
  | "AIRBNB"
  | "MANUAL_BLOCK"
  | "MAINTENANCE"
  | "COMPOSED_LISTING_DEPENDENCY"
  | "PREPARATION_BUFFER";

type AirbnbIcalExportCalendarBlockOwnershipCandidate = Readonly<{
  source: string;
  externalCalendarEventId: string | null;
}>;

type AirbnbIcalExportUidRange = Readonly<{
  startDate: string;
  endDate: string;
}>;

const TRP_OWNED_CALENDAR_BLOCK_SOURCES: ReadonlySet<string> = new Set<AirbnbIcalExportCalendarBlockSource>([
  "MANUAL_BLOCK",
  "MAINTENANCE",
  "PREPARATION_BUFFER",
]);

/**
 * CalendarBlock rows are allowed into the outbound Airbnb feed only when TRP is
 * their source of truth. Provider-origin rows are intentionally excluded to
 * prevent Airbnb -> TRP -> Airbnb feedback loops.
 */
export function isTrpOwnedCalendarBlockForAirbnbExport(
  candidate: AirbnbIcalExportCalendarBlockOwnershipCandidate,
): boolean {
  if (candidate.externalCalendarEventId) {
    return false;
  }

  return TRP_OWNED_CALENDAR_BLOCK_SOURCES.has(candidate.source);
}

/**
 * Builds the permanent semantic VEVENT identity used by Airbnb imports.
 * Identity must not depend on array position because inserting an earlier range
 * must not rename unchanged events already known by Airbnb.
 */
export function buildAirbnbIcalExportEventUid(
  input: Readonly<{
    externalCalendarId: string;
    range: AirbnbIcalExportUidRange;
  }>,
): string {
  const externalCalendarId = input.externalCalendarId.trim();
  const startDate = input.range.startDate.trim();
  const endDate = input.range.endDate.trim();

  if (!externalCalendarId) {
    throw new Error("Airbnb iCal export calendar id is required for VEVENT UID generation.");
  }

  if (!startDate || !endDate || startDate >= endDate) {
    throw new Error("Airbnb iCal export VEVENT UID requires a valid normalized date range.");
  }

  return `trp-booking-${externalCalendarId}-${startDate}-${endDate}@${AIRBNB_ICAL_EXPORT_UID_HOST}`;
}
