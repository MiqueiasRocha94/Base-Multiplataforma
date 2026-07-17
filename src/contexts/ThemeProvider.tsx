"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";

import { systemConfig } from "@/lib/config/system-config";
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
  resolveBrand,
  resolveCssVars,
} from "@/lib/theme/color-scheme";

export type AppTheme = "system" | "light" | "dark";
export type FontPreset = "system" | "reading" | "compact";
// Arredondamento global: "default" (Moderado) usa os raios do tema, "high"
// (Alto) aumenta, "light" (Leve) reduz e "none" (Sem) zera.
export type RadiusPreset = "high" | "default" | "light" | "none";
export type { ResolvedTheme, BrandColorKey, AreaKey, AreaColors, ChartColorKey, ChartColors, ColorScheme } from "@/lib/theme/color-scheme";

// Escala de fonte (acessibilidade) — aplicada como `--font-scale` no <html>.
export const FONT_SCALE_MIN = 0.8;
export const FONT_SCALE_MAX = 1.6;
export const FONT_SCALE_STEP = 0.05;
export const FONT_SCALE_DEFAULT = 1;

const FONT_PRESET_SCALE: Record<FontPreset, number> = {
  system: 1,
  reading: 1.05,
  compact: 0.96,
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

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  // Fonte unica: a config estatica (src/config/system-config.json). O
  // localStorage nao e usado para estas configuracoes — o arquivo sempre vence.
  const [theme, setTheme] = useState<AppTheme>(systemConfig.theme);
  const [fontPreset, setFontPreset] = useState<FontPreset>(systemConfig.fontPreset);
  const [fontScale, setFontScaleState] = useState<number>(systemConfig.fontScale);
  const [radiusPreset, setRadiusPreset] = useState<RadiusPreset>(systemConfig.radiusPreset);
  const [store, setStore] = useState<ColorSchemeStore>(systemConfig.colorScheme);
  const [resolvedTheme, setResolvedTheme] = useState<ResolvedTheme>("light");

  const activeScheme = useMemo(() => getActiveScheme(store), [store]);
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
      return;
    }
    document.documentElement.dataset.theme = theme;
  }, [theme]);

  useEffect(() => {
    document.documentElement.dataset.font = fontPreset;
  }, [fontPreset]);

  useEffect(() => {
    const effective = Math.round(FONT_PRESET_SCALE[fontPreset] * fontScale * 100) / 100;
    document.documentElement.style.setProperty("--font-scale", String(effective));
  }, [fontScale, fontPreset]);

  useEffect(() => {
    if (radiusPreset === "default") {
      delete document.documentElement.dataset.radius;
      return;
    }
    document.documentElement.dataset.radius = radiusPreset;
  }, [radiusPreset]);

  // Aplica as CSS variables do esquema + areas para o tema resolvido.
  useEffect(() => {
    const vars = resolveCssVars(store, resolvedTheme);
    for (const [name, value] of Object.entries(vars)) {
      document.documentElement.style.setProperty(name, value);
    }
  }, [store, resolvedTheme]);

  const setActiveScheme = useCallback((id: string) => {
    setStore((current) => (current.schemes.some((s) => s.id === id) ? { ...current, activeSchemeId: id } : current));
  }, []);

  const addScheme = useCallback((name?: string) => {
    const id = `scheme-${Date.now().toString(36)}`;
    setStore((current) => {
      const base = getActiveScheme(current);
      const scheme: ColorScheme = { id, name: name?.trim() || "Novo esquema", builtin: false, light: { ...base.light } };
      return { ...current, schemes: [...current.schemes, scheme], activeSchemeId: id };
    });
    return id;
  }, []);

  const renameScheme = useCallback((id: string, name: string) => {
    setStore((current) => ({
      ...current,
      schemes: current.schemes.map((s) => (s.id === id && !s.builtin ? { ...s, name } : s)),
    }));
  }, []);

  const deleteScheme = useCallback((id: string) => {
    setStore((current) => {
      const target = current.schemes.find((s) => s.id === id);
      if (!target || target.builtin) {
        return current;
      }
      const schemes = current.schemes.filter((s) => s.id !== id);
      const activeSchemeId = current.activeSchemeId === id ? "default" : current.activeSchemeId;
      return { ...current, schemes, activeSchemeId };
    });
  }, []);

  const updateBrandColor = useCallback((key: BrandColorKey, value: string) => {
    setStore((current) => {
      const active = getActiveScheme(current);
      if (active.builtin) {
        return current;
      }
      return {
        ...current,
        schemes: current.schemes.map((s) =>
          s.id === active.id ? { ...s, light: { ...s.light, [key]: value } } : s,
        ),
      };
    });
  }, []);

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
      schemes: store.schemes,
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
