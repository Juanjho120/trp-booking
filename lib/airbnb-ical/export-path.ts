const ICAL_FILE_EXTENSION = ".ics";

export function normalizeAirbnbIcalExportPathToken(pathToken: string): string {
  const trimmedPathToken = pathToken.trim();

  if (!trimmedPathToken) {
    throw new Error("Airbnb iCal export token is required.");
  }

  const rawToken = trimmedPathToken.toLowerCase().endsWith(ICAL_FILE_EXTENSION)
    ? trimmedPathToken.slice(0, -ICAL_FILE_EXTENSION.length)
    : trimmedPathToken;

  if (!rawToken) {
    throw new Error("Airbnb iCal export token is required.");
  }

  return rawToken;
}
