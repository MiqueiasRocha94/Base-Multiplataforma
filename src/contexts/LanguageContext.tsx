"use client";

import { usePathname } from "next/navigation";
import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";

import i18n from "@/lib/i18n";
import {
  getDictionary,
  lazyNamespaceLoaders,
  type AppDictionary,
  type LazyNamespaceKey,
} from "@/lib/i18n/dictionaries";
import { defaultLocale, enabledLocales, type AppLocale } from "@/lib/i18n/settings";
import { setTrayLabels } from "@/lib/platform/desktop";
import { getStorageItem, setStorageItem, storageKeys } from "@/lib/platform/storage";

type LanguageContextValue = {
  dictionary: AppDictionary;
  locale: AppLocale;
  setLocale: (locale: AppLocale) => void;
  /** Pede um namespace lazy fora da rota dona (ex.: gaveta do Menu usa `profile`). */
  requireNamespace: (ns: LazyNamespaceKey) => void;
};

const LanguageContext = createContext<LanguageContextValue | null>(null);

function resolveInitialLocale(): AppLocale {
  const storedLocale = getStorageItem(storageKeys.locale);
  // Idioma salvo fora dos oferecidos (ex.: idioma desligado depois) volta ao padrão.
  if (storedLocale && enabledLocales.includes(storedLocale as AppLocale)) {
    return storedLocale as AppLocale;
  }

  return defaultLocale;
}

// Rota → namespace lazy que ela precisa (só o texto dela é baixado).
function namespaceForPath(pathname: string): LazyNamespaceKey | null {
  if (pathname.startsWith("/portal/profile")) return "profile";
  if (pathname.startsWith("/portal/persons")) return "persons";
  if (pathname.startsWith("/portal/analytics")) return "analytics";
  return null;
}

type LoadedLazy = Partial<Record<LazyNamespaceKey, { locale: AppLocale; data: unknown }>>;

export function LanguageProvider({ children }: { children: React.ReactNode }) {
  const [locale, setLocaleState] = useState<AppLocale>(resolveInitialLocale);
  const setLocale = useCallback((next: AppLocale) => {
    if (enabledLocales.includes(next)) {
      setLocaleState(next);
    }
  }, []);
  const pathname = usePathname();
  const [lazy, setLazy] = useState<LoadedLazy>({});

  useEffect(() => {
    setStorageItem(storageKeys.locale, locale);
    if (i18n.resolvedLanguage !== locale) {
      void i18n.changeLanguage(locale);
    }
  }, [locale]);

  // App desktop: menu da bandeja (nativo) no idioma do app; no-op fora dele.
  useEffect(() => {
    const { trayOpen, trayQuit } = getDictionary(locale).common;
    void setTrayLabels(trayOpen, trayQuit);
  }, [locale]);

  // Namespaces pedidos por componentes fora da rota dona (useLazyNamespace).
  const [requested, setRequested] = useState<LazyNamespaceKey[]>([]);
  const requireNamespace = useCallback((ns: LazyNamespaceKey) => {
    setRequested((prev) => (prev.includes(ns) ? prev : [...prev, ns]));
  }, []);

  // Carrega o namespace da rota atual + os pedidos (uma vez por locale). Chunk separado.
  const routeNs = namespaceForPath(pathname);
  useEffect(() => {
    const needed = new Set<LazyNamespaceKey>(routeNs ? [routeNs, ...requested] : requested);
    const missing = [...needed].filter((ns) => lazy[ns]?.locale !== locale);
    if (missing.length === 0) {
      return;
    }
    let alive = true;
    missing.forEach((ns) => {
      void lazyNamespaceLoaders[ns](locale).then((data) => {
        if (alive) {
          setLazy((prev) => ({ ...prev, [ns]: { locale, data } }));
        }
      });
    });
    return () => {
      alive = false;
    };
  }, [routeNs, requested, locale, lazy]);

  const value = useMemo<LanguageContextValue>(() => {
    const dictionary = getDictionary(locale);
    // Mescla os namespaces lazy já carregados para o locale atual.
    (Object.keys(lazy) as LazyNamespaceKey[]).forEach((ns) => {
      const entry = lazy[ns];
      if (entry && entry.locale === locale) {
        (dictionary as Record<string, unknown>)[ns] = entry.data;
      }
    });
    return { dictionary, locale, setLocale, requireNamespace };
  }, [locale, lazy, setLocale, requireNamespace]);

  return <LanguageContext.Provider value={value}>{children}</LanguageContext.Provider>;
}

export function useLanguage() {
  const context = useContext(LanguageContext);

  if (!context) {
    throw new Error("useLanguage must be used within LanguageProvider.");
  }

  return context;
}

/** Garante um namespace lazy carregado enquanto o componente estiver montado. */
export function useLazyNamespace(ns: LazyNamespaceKey) {
  const { requireNamespace } = useLanguage();
  useEffect(() => {
    requireNamespace(ns);
  }, [ns, requireNamespace]);
}
