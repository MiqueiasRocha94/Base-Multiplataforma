import en from "../../../public/locales/en/en.json";
import esES from "../../../public/locales/es-ES/es-ES.json";
import ptBR from "../../../public/locales/pt-BR/pt-BR.json";

import type { AppLocale } from "@/lib/i18n/settings";

// Namespaces LAZY (por-página): só o TIPO entra no build (import type-only). O
// conteúdo é carregado sob demanda por (locale, rota) e vira um chunk separado,
// então NÃO vai no bundle principal — cada página expõe só o próprio texto.
// ⚠️ Só carregam na rota dona (LanguageContext.namespaceForPath). Texto usado
// pelo shell (header, sidebar, AccountMenu, ThemeToggle...) aparece em TODAS as
// rotas e fica vazio fora da rota dona → vai no core (ex.: `account`).
export type LazyNamespaces = {
  profile: typeof import("../../../public/locales/pt-BR/profile.json");
  persons: typeof import("../../../public/locales/pt-BR/persons.json");
  analytics: typeof import("../../../public/locales/pt-BR/analytics.json");
};

export type LazyNamespaceKey = keyof LazyNamespaces;

// Dicionário completo (TIPO): core estático + namespaces lazy. Os componentes
// seguem lendo `dictionary.<ns>.<chave>` normalmente.
export type AppDictionary = typeof ptBR & LazyNamespaces;

const coreDictionaries: Record<AppLocale, typeof ptBR> = {
  "pt-BR": ptBR,
  en,
  "es-ES": esES,
};

export const locales = Object.keys(coreDictionaries) as AppLocale[];

// Placeholders vazios dos lazy — garantem que `dictionary.<ns>` exista (objeto)
// antes do carregamento, evitando crash; o texto entra ao carregar (LanguageProvider).
const emptyLazy = { profile: {}, persons: {}, analytics: {} } as unknown as LazyNamespaces;

/**
 * Dicionário base: core (estático) + placeholders dos lazy. Consumidores que só
 * usam namespaces core (ex.: global-error) podem usar direto; a mesclagem dos
 * namespaces lazy acontece no LanguageProvider conforme a rota.
 */
export function getDictionary(locale: AppLocale): AppDictionary {
  return { ...coreDictionaries[locale], ...emptyLazy } as AppDictionary;
}

// Loaders dinâmicos por namespace lazy → chunk separado por (locale, namespace).
export const lazyNamespaceLoaders: Record<LazyNamespaceKey, (locale: AppLocale) => Promise<unknown>> = {
  profile: (locale) => import(`../../../public/locales/${locale}/profile.json`).then((m) => m.default),
  persons: (locale) => import(`../../../public/locales/${locale}/persons.json`).then((m) => m.default),
  analytics: (locale) => import(`../../../public/locales/${locale}/analytics.json`).then((m) => m.default),
};
