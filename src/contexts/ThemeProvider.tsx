"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";

import { useBrand } from "@/contexts/BrandContext";
import { systemConfig } from "@/lib/config/system-config";
import { getStorageItem, setStorageItem, storageKeys } from "@/lib/platform/storage";
import {
  type AreaColors,
  type AreaKey,
  type BrandColorKey,
  type ChartColorKey,
  type ChartColors,
  type ColorScheme,
  type ColorSchemeStore,
  type ResolvedTheme,
  DEFAULT_AREA_OVERRIDES,
  derivePrimaryStrong,
  getActiveScheme,
  getAvailableSchemes,
  resolveBrand,
  resolveCssVars,
} from "@/lib/theme/color-scheme";

export type AppTheme = "system" | "light" | "dark";
export type FontPreset = "manrope" | "system" | "reading";
// Arredondamento global: "default" (Moderado) usa os raios do tema, "high"
// (Alto) aumenta, "light" (Leve) reduz e "none" (Sem) zera.
export type RadiusPreset = "high" | "default" | "light" | "none";
export type { ResolvedTheme, BrandColorKey, AreaKey, AreaColors, ChartColorKey, ChartColors, ColorScheme } from "@/lib/theme/color-scheme";

// Escala de fonte (acessibilidade) — aplicada como `--font-scale` no <html>.
export const FONT_SCALE_MIN = 0.8;
export const FONT_SCALE_MAX = 2;
export const FONT_SCALE_STEP = 0.05;
export const FONT_SCALE_DEFAULT = 1;

// Presets controlam só a FAMÍLIA; o TAMANHO vem exclusivamente do slider
// (`fontScale`), pra ser um único controle claro. Por isso todos = 1.
const FONT_PRESET_SCALE: Record<FontPreset, number> = {
  manrope: 1,
  system: 1,
  reading: 1,
};

type ThemeContextValue = {
  theme: AppTheme;
  resolvedTheme: ResolvedTheme;
  setTheme: (theme: AppTheme) => void;
  fontPreset: FontPreset;
  setFontPreset: (preset: FontPreset) => void;
  fontScale: number;
  setFontScale: (value: number) => void;
  radiusPreset: RadiusPreset;
  setRadiusPreset: (preset: RadiusPreset) => void;
  // --- Esquemas de cores ---
  schemes: ColorScheme[];
  activeScheme: ColorScheme;
  setActiveScheme: (id: string) => void;
  /** Cria um novo esquema editavel a partir do ativo e o seleciona. Retorna o id. */
  addScheme: (name?: string) => string;
  renameScheme: (id: string, name: string) => void;
  deleteScheme: (id: string) => void;
  /** Edita uma marca do esquema ativo (ignorado se for builtin). */
  updateBrandColor: (key: BrandColorKey, value: string) => void;
  /** Indica se o esquema ativo pode ser editado. */
  activeSchemeEditable: boolean;
  // --- Cores por area ---
  areas: Record<AreaKey, { custom: boolean; colors: AreaColors }>;
  setAreaCustom: (area: AreaKey, custom: boolean) => void;
  updateAreaColor: (area: AreaKey, key: keyof AreaColors, value: string) => void;
  // --- Cores dos graficos ---
  charts: { custom: boolean; colors: ChartColors };
  setChartsCustom: (custom: boolean) => void;
  updateChartColor: (key: ChartColorKey, value: string) => void;
  /** Store completo do esquema de cores (para exportar a config estatica). */
  colorSchemeStore: ColorSchemeStore;
};

const ThemeContext = createContext<ThemeContextValue | null>(null);

function clampFontScale(value: number): number {
  if (!Number.isFinite(value)) {
    return FONT_SCALE_DEFAULT;
  }
  return Math.min(FONT_SCALE_MAX, Math.max(FONT_SCALE_MIN, Math.round(value * 100) / 100));
}

/** Lê uma preferência do storage validando contra os valores permitidos. */
function readStoredPref<T extends string>(key: string, fallback: T, allowed: readonly T[]): T {
  const value = getStorageItem(key);
  return value && (allowed as readonly string[]).includes(value) ? (value as T) : fallback;
}

/** Lê a escala de fonte do storage (número positivo) com fallback. */
function readStoredScale(fallback: number): number {
  const value = Number(getStorageItem(storageKeys.fontScale));
  return Number.isFinite(value) && value > 0 ? value : fallback;
}

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  // Config estatica (system-config.json) e o DEFAULT; as PREFERENCIAS do usuario
  // (tema, fonte, arredondamento) sao persistidas em localStorage e sobrepoem o
  // default — assim uma troca no painel sobrevive ao reload. As CORES nao entram
  // aqui: seguem a marca (BrandContext). Inicializador lazy = SSR usa o default
  // (getStorageItem devolve null no server) e o cliente le o storage sem
  // divergencia de hidratacao (o JSX nao depende do tema — ele vira CSS/dataset).
  const [theme, setTheme] = useState<AppTheme>(() =>
    readStoredPref(storageKeys.theme, systemConfig.theme, ["system", "light", "dark"] as const),
  );
  const [fontPreset, setFontPreset] = useState<FontPreset>(() =>
    readStoredPref(storageKeys.fontPreset, systemConfig.fontPreset, ["manrope", "system", "reading"] as const),
  );
  const [fontScale, setFontScaleState] = useState<number>(() => readStoredScale(systemConfig.fontScale));
  const [radiusPreset, setRadiusPreset] = useState<RadiusPreset>(() =>
    readStoredPref(storageKeys.radiusPreset, systemConfig.radiusPreset, ["high", "default", "light", "none"] as const),
  );
  const [store, setStore] = useState<ColorSchemeStore>(systemConfig.colorScheme);
  const [resolvedTheme, setResolvedTheme] = useState<ResolvedTheme>("light");

  // Comunicação Brand -> Theme via CONTRATO público (nunca lê `brand.colors` nem
  // o estado interno da Brand). A Brand informa a marca ativa + o seu default
  // encapsulado; o Theme resolve o PRÓPRIO domínio: esquemas disponíveis, ativo
  // por marca e aplicação dos tokens. Ver docs/tema-marca-e-idioma.md (Marca / Esquema de cores).
  const { themeContract } = useBrand();

  const schemes = useMemo(() => getAvailableSchemes(store, themeContract), [store, themeContract]);
  const activeScheme = useMemo(() => getActiveScheme(store, themeContract), [store, themeContract]);
  const activeSchemeEditable = !activeScheme.builtin;

  useEffect(() => {
    const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)");
    const sync = () => setResolvedTheme(theme === "system" ? (mediaQuery.matches ? "dark" : "light") : theme);
    sync();
    mediaQuery.addEventListener("change", sync);
    return () => mediaQuery.removeEventListener("change", sync);
  }, [theme]);

  useEffect(() => {
    if (theme === "system") {
      delete document.documentElement.dataset.theme;
    } else {
      document.documentElement.dataset.theme = theme;
    }
    setStorageItem(storageKeys.theme, theme);
  }, [theme]);

  useEffect(() => {
    document.documentElement.dataset.font = fontPreset;
    setStorageItem(storageKeys.fontPreset, fontPreset);
  }, [fontPreset]);

  useEffect(() => {
    const effective = Math.round(FONT_PRESET_SCALE[fontPreset] * fontScale * 100) / 100;
    document.documentElement.style.setProperty("--font-scale", String(effective));
    setStorageItem(storageKeys.fontScale, String(fontScale));
  }, [fontScale, fontPreset]);

  useEffect(() => {
    if (radiusPreset === "default") {
      delete document.documentElement.dataset.radius;
    } else {
      document.documentElement.dataset.radius = radiusPreset;
    }
    setStorageItem(storageKeys.radiusPreset, radiusPreset);
  }, [radiusPreset]);

  // Aplica as CSS variables do esquema + areas para o tema resolvido. O tema
  // efetivo é calculado AQUI (não só de `resolvedTheme`): no primeiro efeito o
  // estado ainda é o "light" inicial e aplicaria as cores claras por um quadro
  // no tema escuro, desfazendo o bootstrap pré-pintura (lib/theme/theme-bootstrap).
  useEffect(() => {
    const effective: ResolvedTheme =
      theme === "system" ? (window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light") : theme;
    const vars = resolveCssVars(store, themeContract, effective);
    for (const [name, value] of Object.entries(vars)) {
      document.documentElement.style.setProperty(name, value);
    }
  }, [store, themeContract, theme, resolvedTheme]);

  // As mutações de esquema pertencem ao Theme, mas são ESCOPADAS pela marca
  // atual: o active é gravado por marca e as customizações vivem sob o brandId
  // (nunca vazam entre WLs). Default da Brand e commons são builtin (read-only).
  const setActiveScheme = useCallback((id: string) => {
    const brandId = themeContract.brandId;
    setStore((current) =>
      getAvailableSchemes(current, themeContract).some((s) => s.id === id)
        ? { ...current, activeSchemeIdByBrand: { ...current.activeSchemeIdByBrand, [brandId]: id } }
        : current,
    );
  }, [themeContract]);

  const addScheme = useCallback((name?: string) => {
    const id = `scheme-${Date.now().toString(36)}`;
    const brandId = themeContract.brandId;
    setStore((current) => {
      const base = getActiveScheme(current, themeContract);
      const scheme: ColorScheme = { id, name: name?.trim() || "Novo esquema", builtin: false, light: { ...base.light } };
      const list = current.customizations[brandId] ?? [];
      return {
        ...current,
        customizations: { ...current.customizations, [brandId]: [...list, scheme] },
        activeSchemeIdByBrand: { ...current.activeSchemeIdByBrand, [brandId]: id },
      };
    });
    return id;
  }, [themeContract]);

  const renameScheme = useCallback((id: string, name: string) => {
    const brandId = themeContract.brandId;
    setStore((current) => {
      const list = current.customizations[brandId] ?? [];
      return {
        ...current,
        customizations: {
          ...current.customizations,
          [brandId]: list.map((s) => (s.id === id ? { ...s, name } : s)),
        },
      };
    });
  }, [themeContract]);

  const deleteScheme = useCallback((id: string) => {
    const brandId = themeContract.brandId;
    setStore((current) => {
      const list = current.customizations[brandId] ?? [];
      if (!list.some((s) => s.id === id)) {
        return current;
      }
      // Se o excluído era o ativo, remove o registro da marca -> fallback resolve
      // para o legado/default da Brand em getActiveScheme.
      const activeSchemeIdByBrand = { ...current.activeSchemeIdByBrand };
      if (activeSchemeIdByBrand[brandId] === id) {
        delete activeSchemeIdByBrand[brandId];
      }
      return {
        ...current,
        customizations: { ...current.customizations, [brandId]: list.filter((s) => s.id !== id) },
        activeSchemeIdByBrand,
      };
    });
  }, [themeContract]);

  const updateBrandColor = useCallback((key: BrandColorKey, value: string) => {
    const brandId = themeContract.brandId;
    setStore((current) => {
      const active = getActiveScheme(current, themeContract);
      if (active.builtin) {
        return current; // default da Brand, commons e legado não são editáveis.
      }
      const list = current.customizations[brandId] ?? [];
      return {
        ...current,
        customizations: {
          ...current.customizations,
          [brandId]: list.map((s) => (s.id === active.id ? { ...s, light: { ...s.light, [key]: value } } : s)),
        },
      };
    });
  }, [themeContract]);

  const setAreaCustom = useCallback((area: AreaKey, custom: boolean) => {
    setStore((current) => ({
      ...current,
      areas: { ...current.areas, [area]: { ...current.areas[area], custom } },
    }));
  }, []);

  const updateAreaColor = useCallback((area: AreaKey, key: keyof AreaColors, value: string) => {
    setStore((current) => ({
      ...current,
      areas: {
        ...current.areas,
        [area]: { ...current.areas[area], colors: { ...current.areas[area].colors, [key]: value } },
      },
    }));
  }, []);

  const setChartsCustom = useCallback((custom: boolean) => {
    setStore((current) => ({
      ...current,
      charts: { ...current.charts, custom },
    }));
  }, []);

  const updateChartColor = useCallback((key: ChartColorKey, value: string) => {
    setStore((current) => ({
      ...current,
      charts: { ...current.charts, colors: { ...current.charts.colors, [key]: value } },
    }));
  }, []);

  const setFontScale = useCallback((value: number) => setFontScaleState(clampFontScale(value)), []);

  const value = useMemo<ThemeContextValue>(
    () => ({
      theme,
      resolvedTheme,
      setTheme,
      fontPreset,
      setFontPreset,
      fontScale,
      setFontScale,
      radiusPreset,
      setRadiusPreset,
      schemes,
      activeScheme,
      setActiveScheme,
      addScheme,
      renameScheme,
      deleteScheme,
      updateBrandColor,
      activeSchemeEditable,
      areas: store.areas,
      setAreaCustom,
      updateAreaColor,
      charts: store.charts,
      setChartsCustom,
      updateChartColor,
      colorSchemeStore: store,
    }),
    [
      activeScheme,
      activeSchemeEditable,
      addScheme,
      deleteScheme,
      fontPreset,
      fontScale,
      radiusPreset,
      renameScheme,
      resolvedTheme,
      setActiveScheme,
      setAreaCustom,
      setChartsCustom,
      schemes,
      setFontScale,
      store,
      theme,
      updateAreaColor,
      updateBrandColor,
      updateChartColor,
    ],
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error("useTheme must be used within ThemeProvider.");
  }
  return context;
}

// Reexporta para consumidores de UI (previews de esquema, etc.).
export { resolveBrand, derivePrimaryStrong, DEFAULT_AREA_OVERRIDES };
