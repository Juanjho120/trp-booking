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

export function resolveAirbnbImportSecretSource(
  calendar: AirbnbImportSecretCalendar,
): AirbnbImportSecretSource {
  return calendar.importUrlEncrypted ? "DATABASE_ENCRYPTED" : "NONE";
}

export function resolveAirbnbIcalImportUrlDatabaseFirst(
  calendar: AirbnbImportSecretCalendar,
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
