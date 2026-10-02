import {
  getCountries,
  getCountryCallingCode,
  type CountryCode,
  type MetadataJson,
} from "libphonenumber-js/core";
import metadata from "libphonenumber-js/metadata.min.json";
import type { Country } from "react-phone-number-input";
import enLabels from "react-phone-number-input/locale/en.json";
import esLabels from "react-phone-number-input/locale/es.json";

import type { Locale } from "@/types/locale";

export type CountryOption = Readonly<{
  iso2: Country;
  flag: string;
  name: string;
  dialCode: string;
}>;

type CountryLabels = Record<string, string>;

const ISO2_COUNTRY_PATTERN = /^[A-Z]{2}$/;
const PHONE_METADATA = metadata as MetadataJson;
const SUPPORTED_COUNTRIES = new Set<Country>(
  getCountries(PHONE_METADATA) as Country[],
);

function iso2ToFlag(iso2: string): string {
  return iso2
    .toUpperCase()
    .replace(/./g, (character) => String.fromCodePoint(127397 + character.charCodeAt(0)));
}

function getLabels(locale: Locale): CountryLabels {
  return (locale === "en" ? enLabels : esLabels) as CountryLabels;
}

export function getCountryOptions(locale: Locale): readonly CountryOption[] {
  const labels = getLabels(locale);

  return getCountries(PHONE_METADATA)
    .map((countryCode) => {
      const country = countryCode as Country;

      return {
        iso2: country,
        flag: iso2ToFlag(country),
        name: labels[country] ?? country,
        dialCode: `+${getCountryCallingCode(countryCode, PHONE_METADATA)}`,
      };
    })
    .sort((firstCountry, secondCountry) =>
      firstCountry.name.localeCompare(secondCountry.name, locale),
    );
}

export function normalizeSupportedCountryCode(
  value: string | null | undefined,
): Country | null {
  const normalizedValue = value?.trim().toUpperCase() ?? "";

  if (!ISO2_COUNTRY_PATTERN.test(normalizedValue)) {
    return null;
  }

  const country = normalizedValue as Country;

  return SUPPORTED_COUNTRIES.has(country) ? country : null;
}

export function getCountryOption(iso2: Country, locale: Locale): CountryOption {
  const labels = getLabels(locale);

  return {
    iso2,
    flag: iso2ToFlag(iso2),
    name: labels[iso2] ?? iso2,
    dialCode: `+${getCountryCallingCode(iso2 as CountryCode, PHONE_METADATA)}`,
  };
}
