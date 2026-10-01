export type ReceiverContactSuggestionSource = Readonly<{
  guestEmail?: string | null;
  guestCountry?: string | null;
}>;

export type ReceiverCountrySuggestion = Readonly<{
  code: string;
  label: string;
}>;

function normalizeSuggestionKey(value: string): string {
  return value.trim().toLocaleLowerCase("en-US");
}

export function buildReceiverEmailSuggestions(
  reservations: readonly ReceiverContactSuggestionSource[],
): string[] {
  const suggestions = new Map<string, string>();

  for (const reservation of reservations) {
    const email = reservation.guestEmail?.trim();

    if (!email) {
      continue;
    }

    const key = normalizeSuggestionKey(email);

    if (!suggestions.has(key)) {
      suggestions.set(key, email);
    }
  }

  return [...suggestions.values()];
}

function countryDisplayName(code: string, intlLocale: string): string {
  try {
    return (
      new Intl.DisplayNames([intlLocale], { type: "region" }).of(code) ?? code
    );
  } catch {
    return code;
  }
}

export function buildReceiverCountrySuggestions(
  reservations: readonly ReceiverContactSuggestionSource[],
  intlLocale: string,
): ReceiverCountrySuggestion[] {
  const suggestions = new Map<string, ReceiverCountrySuggestion>();

  for (const reservation of reservations) {
    const code = reservation.guestCountry?.trim().toUpperCase();

    if (!code || !/^[A-Z]{2}$/.test(code)) {
      continue;
    }

    if (!suggestions.has(code)) {
      suggestions.set(code, {
        code,
        label: countryDisplayName(code, intlLocale),
      });
    }
  }

  return [...suggestions.values()];
}
