import { getTimezone } from "countries-and-timezones";
import type { Country } from "react-phone-number-input";

import { normalizeSupportedCountryCode } from "@/lib/geo/countries";

export type PhoneCountryInferenceInput = Readonly<{
  ipCountry: string | null | undefined;
  timeZone: string | null | undefined;
}>;

export function getSupportedCountriesForTimeZone(
  timeZone: string | null | undefined,
): readonly Country[] {
  const normalizedTimeZone = timeZone?.trim();

  if (!normalizedTimeZone) {
    return [];
  }

  const timezone = getTimezone(normalizedTimeZone);

  if (!timezone) {
    return [];
  }

  const supportedCountries: Country[] = [];
  const seenCountries = new Set<Country>();

  for (const country of timezone.countries) {
    const supportedCountry = normalizeSupportedCountryCode(country);

    if (supportedCountry && !seenCountries.has(supportedCountry)) {
      seenCountries.add(supportedCountry);
      supportedCountries.push(supportedCountry);
    }
  }

  return supportedCountries;
}

export function resolveCountryFromTimeZone(
  timeZone: string | null | undefined,
): Country | null {
  return getSupportedCountriesForTimeZone(timeZone)[0] ?? null;
}

export function resolvePhoneCountryInference({
  ipCountry,
  timeZone,
}: PhoneCountryInferenceInput): Country | null {
  const normalizedIpCountry = normalizeSupportedCountryCode(ipCountry);
  const supportedTimeZoneCountries = getSupportedCountriesForTimeZone(timeZone);

  if (supportedTimeZoneCountries.length === 0) {
    return normalizedIpCountry;
  }

  if (
    normalizedIpCountry &&
    supportedTimeZoneCountries.includes(normalizedIpCountry)
  ) {
    return normalizedIpCountry;
  }

  return supportedTimeZoneCountries[0] ?? null;
}
