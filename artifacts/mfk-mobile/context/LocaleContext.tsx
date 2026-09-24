import AsyncStorage from "@react-native-async-storage/async-storage";
import React, { createContext, useContext, useEffect, useMemo, useState } from "react";

import {
  ENGLISH_LOCALE_ENABLED,
  LocaleCode,
  locales,
  translations,
} from "@/constants/i18n";

type TranslationDictionary = (typeof translations)[LocaleCode];

type LocaleContextValue = {
  locale: LocaleCode;
  direction: "rtl" | "ltr";
  englishEnabled: boolean;
  setLocale: (locale: LocaleCode) => Promise<boolean>;
  t: TranslationDictionary;
};

const LOCALE_STORAGE_KEY = "mfk.locale";
const LocaleContext = createContext<LocaleContextValue | null>(null);

export function LocaleProvider({ children }: { children: React.ReactNode }) {
  const [locale, setLocaleState] = useState<LocaleCode>("ar");

  useEffect(() => {
    let mounted = true;

    AsyncStorage.getItem(LOCALE_STORAGE_KEY)
      .then((stored) => {
        if (!mounted) return;
        if (stored === "ar" || (stored === "en" && ENGLISH_LOCALE_ENABLED)) {
          setLocaleState(stored);
        }
      })
      .catch(() => {
        // Keep Arabic if storage is unavailable.
      });

    return () => {
      mounted = false;
    };
  }, []);

  const setLocale = async (nextLocale: LocaleCode) => {
    if (nextLocale === "en" && !ENGLISH_LOCALE_ENABLED) {
      return false;
    }

    setLocaleState(nextLocale);
    await AsyncStorage.setItem(LOCALE_STORAGE_KEY, nextLocale);
    return true;
  };

  const value = useMemo(
    () => ({
      locale,
      direction: locales[locale].direction,
      englishEnabled: ENGLISH_LOCALE_ENABLED,
      setLocale,
      t: translations[locale],
    }),
    [locale],
  );

  return <LocaleContext.Provider value={value}>{children}</LocaleContext.Provider>;
}

export function useLocale() {
  const context = useContext(LocaleContext);

  if (!context) {
    throw new Error("useLocale must be used inside LocaleProvider");
  }

  return context;
}
