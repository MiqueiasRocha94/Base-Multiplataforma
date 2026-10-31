"use client";

import i18n from "i18next";
import HttpBackend from "i18next-http-backend";
import LanguageDetector from "i18next-browser-languagedetector";
import { initReactI18next } from "react-i18next";

import { defaultLocale, enabledLocales } from "@/lib/i18n/settings";

if (!i18n.isInitialized) {
  void i18n
    .use(HttpBackend)
    .use(LanguageDetector)
    .use(initReactI18next)
    .init({
      fallbackLng: defaultLocale,
      supportedLngs: [...enabledLocales],
      debug: false,
      backend: {
        loadPath: "/locales/{{lng}}/{{lng}}.json",
      },
      interpolation: {
        escapeValue: false,
      },
      detection: {
        order: ["localStorage", "navigator"],
        lookupLocalStorage: "i18nextLng",
        caches: ["localStorage"],
      },
    });
}

export default i18n;
