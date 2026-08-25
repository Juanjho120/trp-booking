import { decryptExternalCalendarSecret } from "./secret-crypto";

const LEGACY_IMPORT_URLS_ENV_NAME = "AIRBNB_ICAL_IMPORT_URLS_JSON";

export type AirbnbImportSecretCalendar = Readonly<{
  id: string;
  propertyId: string;
  importUrlEncrypted?: string | null;
}>;

export type AirbnbImportSecretSource =
  | "DATABASE_ENCRYPTED"
  | "LEGACY_ENV"
  | "NONE";

export class AirbnbImportSecretError extends Error {
  constructor(
    public readonly code: "ICAL_IMPORT_SECRET_DECRYPTION_FAILED",
  ) {
    super(code);
    this.name = code;
  }
}

function parseLegacyMap(
  source: NodeJS.ProcessEnv = process.env,
): Readonly<Record<string, string>> {
  const rawValue = source[LEGACY_IMPORT_URLS_ENV_NAME];
  if (!rawValue?.trim()) {
    return {};
  }

  try {
    const parsed: unknown = JSON.parse(rawValue);
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
      return {};
    }

    return Object.fromEntries(
      Object.entries(parsed)
        .filter((entry): entry is [string, string] => typeof entry[1] === "string")
        .map(([calendarId, url]) => [calendarId, url.trim()])
        .filter(([, url]) => url.length > 0),
    );
  } catch {
    return {};
  }
}

export function resolveLegacyAirbnbIcalImportUrl(
  calendarId: string,
  source: NodeJS.ProcessEnv = process.env,
): string | null {
  return parseLegacyMap(source)[calendarId] ?? null;
}

export function resolveAirbnbImportSecretSource(
  calendar: AirbnbImportSecretCalendar,
  source: NodeJS.ProcessEnv = process.env,
): AirbnbImportSecretSource {
  if (calendar.importUrlEncrypted) {
    return "DATABASE_ENCRYPTED";
  }

  return resolveLegacyAirbnbIcalImportUrl(calendar.id, source)
    ? "LEGACY_ENV"
    : "NONE";
}

export function resolveAirbnbIcalImportUrlDatabaseFirst(
  calendar: AirbnbImportSecretCalendar,
  source: NodeJS.ProcessEnv = process.env,
): string | null {
  if (calendar.importUrlEncrypted) {
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

  return resolveLegacyAirbnbIcalImportUrl(calendar.id, source);
}
