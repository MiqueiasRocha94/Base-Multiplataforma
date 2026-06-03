import type { StaticImageData } from "next/image";

import flagEn from "../../../public/locales/en/en.png";
import flagEsEs from "../../../public/locales/es-ES/es-ES.png";
import flagPtBr from "../../../public/locales/pt-BR/pt-BR.png";

export const locales = ["pt-BR", "en", "es-ES"] as const;

export type AppLocale = (typeof locales)[number];

export const defaultLocale: AppLocale = "pt-BR";

export const languageLabels: Record<AppLocale, string> = {
  "pt-BR": "Portugues",
  en: "English",
  "es-ES": "Espanol",
};

export const languageFlags: Record<AppLocale, StaticImageData> = {
  "pt-BR": flagPtBr,
  en: flagEn,
  "es-ES": flagEsEs,
};

export const languageShortLabels: Record<AppLocale, string> = {
  "pt-BR": "PT",
  en: "EN",
  "es-ES": "ES",
};

export function isAppLocale(value: string): value is AppLocale {
  return locales.includes(value as AppLocale);
}
