"use client";

import { createContext, useContext, useEffect, useMemo, useState } from "react";

import i18n from "@/lib/i18n";
import { dictionaries, getDictionary, type AppDictionary } from "@/lib/i18n/dictionaries";
import { defaultLocale, type AppLocale } from "@/lib/i18n/settings";
import { getStorageItem, setStorageItem, storageKeys } from "@/lib/platform/storage";

type LanguageContextValue = {
  dictionary: AppDictionary;
  locale: AppLocale;
  setLocale: (locale: AppLocale) => void;
};

const LanguageContext = createContext<LanguageContextValue | null>(null);

function resolveInitialLocale(): AppLocale {
  const storedLocale = getStorageItem(storageKeys.locale);
  if (storedLocale && storedLocale in dictionaries) {
    return storedLocale as AppLocale;
  }

  return defaultLocale;
}

export function LanguageProvider({ children }: { children: React.ReactNode }) {
  const [locale, setLocaleState] = useState<AppLocale>(resolveInitialLocale);

  useEffect(() => {
    setStorageItem(storageKeys.locale, locale);
    if (i18n.resolvedLanguage !== locale) {
      void i18n.changeLanguage(locale);
    }
  }, [locale]);

  const value = useMemo<LanguageContextValue>(
    () => ({
      dictionary: getDictionary(locale),
      locale,
      setLocale: setLocaleState,
    }),
    [locale],
  );

  return <LanguageContext.Provider value={value}>{children}</LanguageContext.Provider>;
}

export function useLanguage() {
  const context = useContext(LanguageContext);

  if (!context) {
    throw new Error("useLanguage must be used within LanguageProvider.");
  }

  return context;
}
