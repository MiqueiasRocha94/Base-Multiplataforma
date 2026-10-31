/**
 * Config estatica do sistema (baseline versionado).
 *
 * O painel do sistema (habilitado so em modo dev via
 * `NEXT_PUBLIC_SYSTEM_PANEL_ENABLED`) permite editar layout, tema e cores ao
 * vivo e EXPORTAR o estado atual como JSON. Esse JSON e commitado em
 * `src/config/system-config.json` e passa a ser a UNICA fonte da config: os
 * providers sempre inicializam a partir dele (o `localStorage` nao e usado para
 * essas configuracoes). Em producao, com o painel desabilitado, o app apenas le
 * este arquivo.
 *
 * `loadSystemConfig()` le o JSON de forma tolerante (mescla com defaults) e
 * `buildSystemConfigFile()` monta o objeto a ser baixado pelo painel.
 */

import rawConfig from "@/config/system-config.json";
import type { AppTheme, FontPreset, RadiusPreset } from "@/contexts/ThemeProvider";
import type { SystemLayoutConfig } from "@/contexts/system/types";
import {
  type ColorSchemeStore,
  parseColorSchemeStore,
  serializeColorSchemeStore,
} from "@/lib/theme/color-scheme";

export const SYSTEM_CONFIG_FILENAME = "system-config.json";
const CONFIG_VERSION = 1;

const FONT_SCALE_MIN = 0.8;
const FONT_SCALE_MAX = 1.6;

/** Layout default do shell — fallback ultimo caso o arquivo esteja incompleto. */
export const DEFAULT_LAYOUT_CONFIG: SystemLayoutConfig = {
  headerVisible: true,
  leftSidebarVisible: true,
  rightSidebarVisible: true,
  footerVisible: true,
  headerReserveSpace: false,
  leftSidebarReserveSpace: false,
  rightSidebarReserveSpace: false,
  footerReserveSpace: false,
  headerHeight: 64,
  footerHeight: 48,
  leftSidebarWidth: 280,
  rightSidebarWidth: 280,
  leftSidebarDisplayMode: "full",
  rightSidebarDisplayMode: "full",
  leftSidebarLayoutMode: "structural",
  rightSidebarLayoutMode: "structural",
  sidebarCardMargin: 10,
  mainContentMode: "full",
  mainContentCardMargin: 10,
  zIndexHeader: 1000,
  zIndexFooter: 1000,
  accountPlacement: "auto",
};

/** Formato do arquivo estatico (o JSON commitado / exportado pelo painel). */
export type SystemConfigFile = {
  version: number;
  theme: AppTheme;
  radiusPreset: RadiusPreset;
  fontPreset: FontPreset;
  fontScale: number;
  layout: SystemLayoutConfig;
  /**
   * Store serializado do esquema de cores. Aceita o formato NOVO (customizações
   * por marca + active por marca) e o LEGADO (schemes flat + activeSchemeId),
   * resolvido em `parseColorSchemeStore` sem migração destrutiva.
   */
  colorScheme: unknown;
};

/** Config ja resolvida e pronta para os providers consumirem. */
export type ResolvedSystemConfig = {
  theme: AppTheme;
  radiusPreset: RadiusPreset;
  fontPreset: FontPreset;
  fontScale: number;
  layout: SystemLayoutConfig;
  colorScheme: ColorSchemeStore;
};

function normalizeTheme(value: unknown): AppTheme {
  return value === "light" || value === "dark" || value === "system" ? value : "system";
}

function normalizeRadius(value: unknown): RadiusPreset {
  return value === "high" || value === "default" || value === "light" || value === "none" ? value : "default";
}

function normalizeFontPreset(value: unknown): FontPreset {
  return value === "manrope" || value === "system" || value === "reading" ? value : "manrope";
}

function normalizeFontScale(value: unknown): number {
  const parsed = typeof value === "number" ? value : Number.parseFloat(String(value));
  if (!Number.isFinite(parsed)) {
    return 1;
  }
  return Math.min(FONT_SCALE_MAX, Math.max(FONT_SCALE_MIN, Math.round(parsed * 100) / 100));
}

/** Le o arquivo estatico de forma tolerante, mesclando com os defaults. */
export function loadSystemConfig(): ResolvedSystemConfig {
  const file = rawConfig as Partial<SystemConfigFile>;
  const layout = file.layout && typeof file.layout === "object"
    ? { ...DEFAULT_LAYOUT_CONFIG, ...file.layout }
    : DEFAULT_LAYOUT_CONFIG;

  return {
    theme: normalizeTheme(file.theme),
    radiusPreset: normalizeRadius(file.radiusPreset),
    fontPreset: normalizeFontPreset(file.fontPreset),
    fontScale: normalizeFontScale(file.fontScale),
    layout,
    // Reaproveita o parser do color-scheme (garante os esquemas builtin).
    colorScheme: parseColorSchemeStore(file.colorScheme ? JSON.stringify(file.colorScheme) : null),
  };
}

/** Config estatica resolvida no boot (fonte unica; o localStorage nao e usado). */
export const systemConfig: ResolvedSystemConfig = loadSystemConfig();

/** Monta o objeto do arquivo a partir do estado atual, para o painel baixar. */
export function buildSystemConfigFile(input: {
  theme: AppTheme;
  radiusPreset: RadiusPreset;
  fontPreset: FontPreset;
  fontScale: number;
  layout: SystemLayoutConfig;
  colorScheme: ColorSchemeStore;
}): SystemConfigFile {
  return {
    version: CONFIG_VERSION,
    theme: input.theme,
    radiusPreset: input.radiusPreset,
    fontPreset: input.fontPreset,
    fontScale: input.fontScale,
    layout: input.layout,
    colorScheme: JSON.parse(serializeColorSchemeStore(input.colorScheme)),
  };
}
