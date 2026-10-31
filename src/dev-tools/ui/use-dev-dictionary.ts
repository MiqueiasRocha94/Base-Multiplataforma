"use client";

import { useLanguage } from "@/contexts/LanguageContext";
import type { AppLocale } from "@/lib/i18n/settings";

import en from "../locales/en.json";
import esES from "../locales/es-es.json";
import ptBR from "../locales/pt-br.json";

/**
 * Textos das ferramentas de dev (painéis, acesso rápido), no idioma atual. Ficam
 * fora de `public/locales` para não irem nos artefatos de homologação/produção.
 */
const DEV_DICTIONARIES: Record<AppLocale, typeof ptBR> = { "pt-BR": ptBR, en, "es-ES": esES };

export function useDevDictionary() {
  const { locale } = useLanguage();
  return DEV_DICTIONARIES[locale] ?? ptBR;
}
