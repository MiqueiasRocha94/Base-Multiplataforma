"use client";

import { useLanguage } from "@/contexts/LanguageContext";
import type { AppLocale } from "@/lib/i18n/settings";

import en from "../locales/en.json";
import esES from "../locales/es-es.json";
import ptBR from "../locales/pt-br.json";

/**
 * Textos da atualização remota, no idioma atual. Ficam no módulo (fora de
 * `public/locales`) para saírem dos artefatos gerados sem o recurso.
 */
const DICTIONARIES: Record<AppLocale, typeof ptBR> = { "pt-BR": ptBR, en, "es-ES": esES };

export function useAppUpdateDictionary() {
  const { locale } = useLanguage();
  return DICTIONARIES[locale] ?? ptBR;
}
