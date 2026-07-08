import {
  getCountries,
  getCountryCallingCode,
  type Country,
} from "react-phone-number-input";
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

  return getCountries()
    .map((country) => ({
      iso2: country,
      flag: iso2ToFlag(country),
      name: labels[country] ?? country,
      dialCode: `+${getCountryCallingCode(country)}`,
    }))
    .sort((firstCountry, secondCountry) =>
      firstCountry.name.localeCompare(secondCountry.name, locale),
    );
}

export function getCountryOption(iso2: Country, locale: Locale): CountryOption {
  const labels = getLabels(locale);

  return {
    iso2,
    flag: iso2ToFlag(iso2),
    name: labels[iso2] ?? iso2,
    dialCode: `+${getCountryCallingCode(iso2)}`,
  };
}
