import en from "../../../public/locales/en/en.json";
import esES from "../../../public/locales/es-ES/es-ES.json";
import ptBR from "../../../public/locales/pt-BR/pt-BR.json";

import type { AppLocale } from "@/lib/i18n/settings";

export type AppDictionary = typeof ptBR;

export const dictionaries: Record<AppLocale, AppDictionary> = {
  "pt-BR": ptBR,
  en,
  "es-ES": esES,
};

export function getDictionary(locale: AppLocale): AppDictionary {
  return dictionaries[locale];
}
