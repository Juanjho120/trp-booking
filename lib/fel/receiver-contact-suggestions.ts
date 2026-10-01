import {
  isSupportedCountry,
  parsePhoneNumber,
  type CountryCode,
  type MetadataJson,
} from "libphonenumber-js/core";
import metadata from "libphonenumber-js/metadata.min.json";

const ISO2_COUNTRY_PATTERN = /^[A-Z]{2}$/;
const PHONE_METADATA = metadata as MetadataJson;

function normalizeSupportedCountry(
  value: string | null | undefined,
): CountryCode | null {
  const country = value?.trim().toUpperCase() ?? "";

  if (
    !ISO2_COUNTRY_PATTERN.test(country) ||
    !isSupportedCountry(country as CountryCode, PHONE_METADATA)
  ) {
    return null;
  }

  return country as CountryCode;
}

export function inferReservationPhoneCountry(
  guestPhone: string | null | undefined,
  guestCountry: string | null | undefined,
): string | null {
  const phone = guestPhone?.trim() ?? "";
  const fallbackCountry = normalizeSupportedCountry(guestCountry);

  if (phone) {
    try {
      const parsed = parsePhoneNumber(phone, PHONE_METADATA);

      if (parsed?.isValid() && parsed.country) {
        return parsed.country;
      }
    } catch {
      // Fall back to the stored reservation country below.
    }
  }

  return fallbackCountry;
}
