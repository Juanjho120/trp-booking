import { getTimezone } from "countries-and-timezones";
import type { Country } from "react-phone-number-input";

import { normalizeSupportedCountryCode } from "@/lib/geo/countries";

export type PhoneCountryInferenceInput = Readonly<{
  ipCountry: string | null | undefined;
  timeZone: string | null | undefined;
}>;

export function resolveCountryFromTimeZone(
  timeZone: string | null | undefined,
): Country | null {
  const normalizedTimeZone = timeZone?.trim();

  if (!normalizedTimeZone) {
    return null;
  }

  const timezone = getTimezone(normalizedTimeZone);

  if (!timezone) {
    return null;
  }

  const supportedCountries = new Set<Country>();

  for (const country of timezone.countries) {
    const supportedCountry = normalizeSupportedCountryCode(country);

    if (supportedCountry) {
      supportedCountries.add(supportedCountry);
    }
  }

  if (supportedCountries.size !== 1) {
    return null;
  }

  return Array.from(supportedCountries)[0] ?? null;
}

export function resolvePhoneCountryInference({
  ipCountry,
  timeZone,
}: PhoneCountryInferenceInput): Country | null {
  return (
    resolveCountryFromTimeZone(timeZone) ??
    normalizeSupportedCountryCode(ipCountry)
  );
}
