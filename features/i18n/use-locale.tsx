"use client";

import { useEffect, useMemo, useState } from "react";

import { enMessages, esMessages } from "@/messages";
import { defaultLocale, locales, type Locale } from "@/types/locale";

const LOCALE_STORAGE_KEY = "trp-booking.locale";
const LOCALE_CHANGE_EVENT = "trp-booking:locale-change";

type LocaleMessages = typeof esMessages;

type LocaleHookValue = Readonly<{
  locale: Locale;
  messages: LocaleMessages;
  setLocale: (locale: Locale) => void;
}>;

function isLocale(value: string | null): value is Locale {
  return locales.includes(value as Locale);
}

function getStoredLocale(): Locale {
  if (typeof window === "undefined") {
    return defaultLocale;
  }

  const storedLocale = window.localStorage.getItem(LOCALE_STORAGE_KEY);

  return isLocale(storedLocale) ? storedLocale : defaultLocale;
}

function getMessages(locale: Locale): LocaleMessages {
  return locale === "en" ? enMessages : esMessages;
}

export function useLocale(): LocaleHookValue {
  const [locale, setLocaleState] = useState<Locale>(defaultLocale);

  useEffect(() => {
    setLocaleState(getStoredLocale());

    function handleLocaleChange() {
      setLocaleState(getStoredLocale());
    }

    window.addEventListener(LOCALE_CHANGE_EVENT, handleLocaleChange);
    window.addEventListener("storage", handleLocaleChange);

    return () => {
      window.removeEventListener(LOCALE_CHANGE_EVENT, handleLocaleChange);
      window.removeEventListener("storage", handleLocaleChange);
    };
  }, []);

  const messages = useMemo(() => getMessages(locale), [locale]);

  function setLocale(nextLocale: Locale): void {
    window.localStorage.setItem(LOCALE_STORAGE_KEY, nextLocale);
    setLocaleState(nextLocale);
    window.dispatchEvent(new Event(LOCALE_CHANGE_EVENT));
  }

  return {
    locale,
    messages,
    setLocale,
  };
}
