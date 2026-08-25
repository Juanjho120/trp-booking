import { decryptExternalCalendarSecret } from "./secret-crypto";

export type AirbnbImportSecretCalendar = Readonly<{
  id: string;
  propertyId: string;
  importUrlEncrypted?: string | null;
}>;

export type AirbnbImportSecretSource = "DATABASE_ENCRYPTED" | "NONE";

export class AirbnbImportSecretError extends Error {
  constructor(
    public readonly code: "ICAL_IMPORT_SECRET_DECRYPTION_FAILED",
  ) {
    super(code);
    this.name = code;
  }
}

/**
 * Final-B.6 compatibility export.
 *
 * The legacy AIRBNB_ICAL_IMPORT_URLS_JSON fallback has been retired for every
 * environment. Keep this export temporarily so older callers fail closed
 * instead of reintroducing environment-backed secret resolution.
 */
export function resolveLegacyAirbnbIcalImportUrl(
  _calendarId: string,
  _source: NodeJS.ProcessEnv = process.env,
): string | null {
  return null;
}

export function resolveAirbnbImportSecretSource(
  calendar: AirbnbImportSecretCalendar,
  _source: NodeJS.ProcessEnv = process.env,
): AirbnbImportSecretSource {
  return calendar.importUrlEncrypted ? "DATABASE_ENCRYPTED" : "NONE";
}

export function resolveAirbnbIcalImportUrlDatabaseFirst(
  calendar: AirbnbImportSecretCalendar,
  _source: NodeJS.ProcessEnv = process.env,
): string | null {
  if (!calendar.importUrlEncrypted) {
    return null;
  }

  try {
    return decryptExternalCalendarSecret({
      encryptedValue: calendar.importUrlEncrypted,
      propertyId: calendar.propertyId,
      purpose: "AIRBNB_IMPORT",
    }).trim();
  } catch {
    throw new AirbnbImportSecretError(
      "ICAL_IMPORT_SECRET_DECRYPTION_FAILED",
    );
  }
}