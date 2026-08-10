export type AirbnbIcalEventKind = "RESERVATION" | "UNAVAILABLE";

type AirbnbIcalEventWithSummary = Readonly<{
  summary?: string;
}>;

const AIRBNB_RESERVED_SUMMARY = "reserved";

function normalizeAirbnbSummary(summary: string | undefined): string {
  return summary?.trim().toLowerCase() ?? "";
}

export function classifyAirbnbIcalEvent(
  event: AirbnbIcalEventWithSummary,
): AirbnbIcalEventKind {
  return normalizeAirbnbSummary(event.summary) === AIRBNB_RESERVED_SUMMARY
    ? "RESERVATION"
    : "UNAVAILABLE";
}

export function shouldCreateAirbnbPreparationBuffers(
  event: AirbnbIcalEventWithSummary,
): boolean {
  return classifyAirbnbIcalEvent(event) === "RESERVATION";
}
