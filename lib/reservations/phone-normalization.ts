import {
  isSupportedCountry,
  parsePhoneNumber,
  type CountryCode,
  type MetadataJson,
} from "libphonenumber-js/core";
import metadata from "libphonenumber-js/metadata.min.json";

const E164_PATTERN = /^\+[1-9]\d{7,14}$/;
const INTERNATIONAL_PHONE_PATTERN = /^\s*\+/;
const ISO2_COUNTRY_PATTERN = /^[A-Z]{2}$/;
const PHONE_METADATA = metadata as MetadataJson;

function normalizeCountry(value: string | null | undefined): CountryCode | null {
  const country = value?.trim().toUpperCase() ?? "";

  if (
    !ISO2_COUNTRY_PATTERN.test(country) ||
    !isSupportedCountry(country as CountryCode, PHONE_METADATA)
  ) {
    return null;
  }

  return country as CountryCode;
}

export function normalizeReservationPhone(
  guestPhone: string | null | undefined,
  guestCountry: string | null | undefined,
): string | null {
  const phone = guestPhone?.trim() ?? "";

  if (!phone) {
    return null;
  }

  const country = normalizeCountry(guestCountry);
  const hasInternationalPrefix = INTERNATIONAL_PHONE_PATTERN.test(phone);

  if (!hasInternationalPrefix && !country) {
    return null;
  }

  try {
    const parsed = country
      ? parsePhoneNumber(phone, country, PHONE_METADATA)
      : parsePhoneNumber(phone, PHONE_METADATA);
    const normalized = parsed?.number;

    return normalized &&
      E164_PATTERN.test(normalized) &&
      parsed.isValid()
      ? normalized
      : null;
  } catch {
    return null;
  }
}
