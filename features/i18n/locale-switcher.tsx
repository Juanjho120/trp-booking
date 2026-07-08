"use client";

import { Check } from "lucide-react";

import { Button } from "@/components/ui/button";
import { useLocale } from "@/features/i18n/use-locale";
import type { Locale } from "@/types/locale";

const localeOptions: readonly Readonly<{
  locale: Locale;
  label: string;
  shortLabel: string;
}>[] = [
  {
    locale: "es",
    label: "Español",
    shortLabel: "ES",
  },
  {
    locale: "en",
    label: "English",
    shortLabel: "EN",
  },
];

export function LocaleSwitcher() {
  const { locale, setLocale } = useLocale();

  return (
    <div
      aria-label={locale === "en" ? "Language selector" : "Selector de idioma"}
      className="inline-flex rounded-full border border-border/70 bg-background p-1 shadow-sm"
      role="group"
    >
      {localeOptions.map((option) => {
        const selected = option.locale === locale;

        return (
          <Button
            aria-pressed={selected}
            className="h-8 rounded-full px-3 text-xs"
            key={option.locale}
            onClick={() => setLocale(option.locale)}
            type="button"
            variant={selected ? "default" : "ghost"}
          >
            <span>{option.shortLabel}</span>
            <span className="sr-only">{option.label}</span>
            {selected ? <Check aria-hidden="true" className="ml-1 size-3" /> : null}
          </Button>
        );
      })}
    </div>
  );
}
