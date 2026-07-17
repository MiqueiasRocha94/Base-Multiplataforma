/**
 * Modelo de esquema de cores da base.
 *
 * Um esquema configura apenas o tema CLARO com 3 marcas (primary, secondary,
 * tertiary). A "primaria forte" (item selecionado, barra de filtro) nao e
 * configuravel: e derivada da primaria (tom mais escuro no claro; mais claro no
 * escuro). O tema ESCURO e derivado automaticamente do claro, com possibilidade
 * de override pontual por esquema (`darkOverrides`).
 *
 * Os neutros (fundo/superficie/texto/borda) sao fixos por tema; os graficos
 * derivam das marcas. Cada area do shell (header, footer, sidebars) pode seguir
 * o esquema ou usar cores proprias (`AreaOverride.custom`).
 *
 * `ColorSchemeStore` e o JSON persistido: a lista de esquemas (builtin + criados),
 * o esquema ativo e os overrides de area.
 */

export type ResolvedTheme = "light" | "dark";

// --- As 3 marcas do esquema ---------------------------------------------------

export type BrandColors = {
  primary: string;
  secondary: string;
  tertiary: string;
};

export type BrandColorKey = keyof BrandColors;

export const BRAND_COLOR_KEYS: BrandColorKey[] = ["primary", "secondary", "tertiary"];

// --- Esquema de cores ---------------------------------------------------------

export type ColorScheme = {
  id: string;
  name: string;
  /** Presets do sistema: nao editaveis nem removiveis. */
  builtin: boolean;
  /** Marcas do tema claro (fonte de verdade; o dark deriva daqui). */
  light: BrandColors;
  /** Overrides opcionais do dark (o que nao vier aqui e derivado do light). */
  darkOverrides?: Partial<BrandColors>;
};

// --- Areas do shell -----------------------------------------------------------

export type AreaKey = "header" | "footer" | "leftSidebar" | "rightSidebar";

export const AREA_KEYS: AreaKey[] = ["header", "footer", "leftSidebar", "rightSidebar"];

export type AreaColors = {
  background: string;
  foreground: string;
  border: string;
};

export type AreaOverride = {
  /** `false` = segue o esquema (neutros do tema). `true` = usa `colors`. */
  custom: boolean;
  colors: AreaColors;
};

export type AreaOverrides = Record<AreaKey, AreaOverride>;

// --- Cores dos graficos (Recharts) ---------------------------------------------

export type ChartColorKey = "chart1" | "chart2" | "chart3" | "chart4" | "chart5";

export const CHART_COLOR_KEYS: ChartColorKey[] = ["chart1", "chart2", "chart3", "chart4", "chart5"];

export type ChartColors = Record<ChartColorKey, string>;

export type ChartOverride = {
  /** `false` = deriva das marcas do esquema. `true` = usa `colors`. */
  custom: boolean;
  colors: ChartColors;
};

// --- Estado persistido (o "json") ---------------------------------------------

export type ColorSchemeStore = {
  activeSchemeId: string;
  schemes: ColorScheme[];
  areas: AreaOverrides;
  charts: ChartOverride;
};

// --- Neutros fixos por tema ---------------------------------------------------

export type Neutrals = {
  background: string;
  surface: string;
  surfaceStrong: string;
  text: string;
  textMuted: string;
  border: string;
  success: string;
  warning: string;
  error: string;
};

export const LIGHT_NEUTRALS: Neutrals = {
  background: "#f6f3eb",
  surface: "#fffdf8",
  surfaceStrong: "#e8dfcf",
  text: "#1f2933",
  textMuted: "#52606d",
  border: "#d8d1c2",
  success: "#1e7a46",
  warning: "#ca8a04",
  error: "#b8351f",
};

export const DARK_NEUTRALS: Neutrals = {
  background: "#0f1714",
  surface: "#16211d",
  surfaceStrong: "#20302a",
  text: "#edf4ef",
  textMuted: "#b5c6bd",
  border: "#31443d",
  success: "#54d38f",
  warning: "#ffc94d",
  error: "#ff836e",
};

// --- Presets builtin ----------------------------------------------------------

export const BUILTIN_SCHEMES: ColorScheme[] = [
  {
    id: "default",
    name: "Padrão",
    builtin: true,
    light: { primary: "#009c3b", secondary: "#ffdf00", tertiary: "#002776" },
  },
  {
    id: "accessible",
    name: "Acessível",
    builtin: true,
    light: { primary: "#0072b2", secondary: "#e69f00", tertiary: "#009e73" },
    darkOverrides: { primary: "#56b4e9", secondary: "#f0e442", tertiary: "#4ddbb0" },
  },
  {
    id: "highContrast",
    name: "Alto contraste",
    builtin: true,
    light: { primary: "#0000ee", secondary: "#b35900", tertiary: "#006400" },
    darkOverrides: { primary: "#4da3ff", secondary: "#ffd400", tertiary: "#5dff9e" },
  },
];

export const DEFAULT_AREA_OVERRIDES: AreaOverrides = {
  header: { custom: false, colors: { background: LIGHT_NEUTRALS.surface, foreground: LIGHT_NEUTRALS.text, border: LIGHT_NEUTRALS.border } },
  footer: { custom: false, colors: { background: LIGHT_NEUTRALS.surface, foreground: LIGHT_NEUTRALS.textMuted, border: LIGHT_NEUTRALS.border } },
  leftSidebar: { custom: false, colors: { background: LIGHT_NEUTRALS.surface, foreground: LIGHT_NEUTRALS.text, border: LIGHT_NEUTRALS.border } },
  rightSidebar: { custom: false, colors: { background: LIGHT_NEUTRALS.surface, foreground: LIGHT_NEUTRALS.text, border: LIGHT_NEUTRALS.border } },
};

// Seed estatico (mesmos tons do esquema "Padrao"); so importa como ponto de
// partida ao ligar "Cor personalizada" pela primeira vez — com custom=false
// os graficos derivam ao vivo das marcas via `deriveCharts`.
export const DEFAULT_CHART_OVERRIDE: ChartOverride = {
  custom: false,
  colors: { chart1: "#009c3b", chart2: "#ffdf00", chart3: "#002776", chart4: "#006626", chart5: "#c9b200" },
};

export const DEFAULT_COLOR_SCHEME_STORE: ColorSchemeStore = {
  activeSchemeId: "default",
  schemes: BUILTIN_SCHEMES,
  areas: DEFAULT_AREA_OVERRIDES,
  charts: DEFAULT_CHART_OVERRIDE,
};

// --- Helpers de cor (hex <-> hsl) --------------------------------------------

type Hsl = { h: number; s: number; l: number };

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

function hexToHsl(hex: string): Hsl {
  let clean = hex.replace("#", "");
  if (clean.length === 3) {
    clean = clean.split("").map((c) => c + c).join("");
  }
  const r = parseInt(clean.slice(0, 2), 16) / 255;
  const g = parseInt(clean.slice(2, 4), 16) / 255;
  const b = parseInt(clean.slice(4, 6), 16) / 255;
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const delta = max - min;
  let h = 0;
  if (delta !== 0) {
    if (max === r) h = ((g - b) / delta) % 6;
    else if (max === g) h = (b - r) / delta + 2;
    else h = (r - g) / delta + 4;
  }
  h = Math.round(h * 60);
  if (h < 0) h += 360;
  const l = (max + min) / 2;
  const s = delta === 0 ? 0 : delta / (1 - Math.abs(2 * l - 1));
  return { h, s, l };
}

function hslToHex({ h, s, l }: Hsl): string {
  const c = (1 - Math.abs(2 * l - 1)) * s;
  const x = c * (1 - Math.abs(((h / 60) % 2) - 1));
  const m = l - c / 2;
  let r = 0;
  let g = 0;
  let b = 0;
  if (h < 60) [r, g, b] = [c, x, 0];
  else if (h < 120) [r, g, b] = [x, c, 0];
  else if (h < 180) [r, g, b] = [0, c, x];
  else if (h < 240) [r, g, b] = [0, x, c];
  else if (h < 300) [r, g, b] = [x, 0, c];
  else [r, g, b] = [c, 0, x];
  const toHex = (v: number) => Math.round((v + m) * 255).toString(16).padStart(2, "0");
  return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
}

/** Ajusta uma cor para o tema escuro: fixa a luminosidade e limita a saturacao. */
function toDark(hex: string, lightness: number): string {
  const { h, s } = hexToHsl(hex);
  return hslToHex({ h, s: Math.min(s, 0.85), l: clamp(lightness, 0, 1) });
}

function shiftHue(hex: string, degrees: number): string {
  const { h, s, l } = hexToHsl(hex);
  return hslToHex({ h: (h + degrees + 360) % 360, s, l });
}

function hexToRgb(hex: string): { r: number; g: number; b: number } {
  let clean = hex.replace("#", "");
  if (clean.length === 3) {
    clean = clean.split("").map((c) => c + c).join("");
  }
  return {
    r: parseInt(clean.slice(0, 2), 16),
    g: parseInt(clean.slice(2, 4), 16),
    b: parseInt(clean.slice(4, 6), 16),
  };
}

function relativeLuminance(hex: string): number {
  const { r, g, b } = hexToRgb(hex);
  const toLinear = (v: number) => {
    const s = v / 255;
    return s <= 0.03928 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4);
  };
  return 0.2126 * toLinear(r) + 0.7152 * toLinear(g) + 0.0722 * toLinear(b);
}

const ON_LIGHT = "#141a17"; // quase-preto (texto sobre fundo claro)
const ON_DARK = "#f7faf9"; // quase-branco (texto sobre fundo escuro)

function contrastRatio(a: number, b: number): number {
  const hi = Math.max(a, b);
  const lo = Math.min(a, b);
  return (hi + 0.05) / (lo + 0.05);
}

/**
 * Texto/icone legivel sobre uma cor de fundo. Escolhe entre um quase-preto e um
 * quase-branco pelo MAIOR contraste (luminancia relativa WCAG), em vez de um
 * limiar fixo. Obs.: em fundos de tom medio, nenhum extremo atinge AA (4.5:1)
 * para texto normal — passa em AA-large (3:1), adequado a UI (botoes, chrome).
 */
export function readableForeground(background: string): string {
  const bg = relativeLuminance(background);
  const withDark = contrastRatio(bg, relativeLuminance(ON_LIGHT));
  const withLight = contrastRatio(bg, relativeLuminance(ON_DARK));
  return withDark >= withLight ? ON_LIGHT : ON_DARK;
}

/** Mistura duas cores hex (t=0 => a, t=1 => b). */
function mixHex(a: string, b: string, t: number): string {
  const pa = hexToRgb(a);
  const pb = hexToRgb(b);
  const ch = (x: number, y: number) => Math.round(x + (y - x) * t).toString(16).padStart(2, "0");
  return `#${ch(pa.r, pb.r)}${ch(pa.g, pb.g)}${ch(pa.b, pb.b)}`;
}

// --- Derivacoes ---------------------------------------------------------------

/** Deriva as marcas do dark a partir do light. */
export function deriveDarkBrand(light: BrandColors): BrandColors {
  return {
    primary: toDark(light.primary, 0.62),
    secondary: toDark(light.secondary, 0.72),
    tertiary: toDark(light.tertiary, 0.64),
  };
}

/**
 * Variacao "forte" da primaria (item selecionado, barra de filtro). Nao e
 * configuravel: e sempre um tom mais escuro da primaria resolvida — em ambos
 * os temas, ja que ela precisa contrastar com barras cujo fundo e a primaria.
 */
export function derivePrimaryStrong(primary: string): string {
  const { h, s, l } = hexToHsl(primary);
  return hslToHex({ h, s, l: clamp(l * 0.65, 0, 1) });
}

export function resolveBrand(scheme: ColorScheme, theme: ResolvedTheme): BrandColors {
  if (theme === "light") {
    return scheme.light;
  }
  return { ...deriveDarkBrand(scheme.light), ...(scheme.darkOverrides ?? {}) };
}

/** Paleta categorica de graficos derivada das marcas. */
function deriveCharts(brand: BrandColors, primaryStrong: string): ChartColors {
  return {
    chart1: brand.primary,
    chart2: brand.secondary,
    chart3: brand.tertiary,
    chart4: primaryStrong,
    chart5: shiftHue(brand.secondary, 45),
  };
}

/** Cores efetivas dos graficos: personalizadas ou derivadas das marcas do esquema. */
export function resolveChartColors(charts: ChartOverride, brand: BrandColors): ChartColors {
  return charts.custom ? charts.colors : deriveCharts(brand, derivePrimaryStrong(brand.primary));
}

// Ao seguir o esquema, toda area usa a primaria como fundo por default; o texto
// e auto-contrastado e a borda e um tom sutil do fundo. Personalize por area no painel.
const AREA_BRAND_KEY: Record<AreaKey, BrandColorKey> = {
  header: "primary",
  leftSidebar: "primary",
  rightSidebar: "primary",
  footer: "primary",
};

/** Cores efetivas de uma area: personalizadas ou derivadas das marcas do esquema. */
export function resolveAreaColors(area: AreaOverride, brand: BrandColors, key: AreaKey): AreaColors {
  if (area.custom) {
    return area.colors;
  }
  const background = brand[AREA_BRAND_KEY[key]];
  const foreground = readableForeground(background);
  return {
    background,
    foreground,
    border: mixHex(background, foreground, 0.2),
  };
}

const AREA_VAR_PREFIX: Record<AreaKey, string> = {
  header: "--color-header",
  footer: "--color-footer",
  leftSidebar: "--color-left-sidebar",
  rightSidebar: "--color-right-sidebar",
};

/** Monta todas as CSS variables a aplicar no <html> para o tema dado. */
export function resolveCssVars(store: ColorSchemeStore, theme: ResolvedTheme): Record<string, string> {
  const scheme = store.schemes.find((entry) => entry.id === store.activeSchemeId) ?? store.schemes[0] ?? BUILTIN_SCHEMES[0];
  const brand = resolveBrand(scheme, theme);
  const primaryStrong = derivePrimaryStrong(brand.primary);
  const neutrals = theme === "dark" ? DARK_NEUTRALS : LIGHT_NEUTRALS;
  const charts = resolveChartColors(store.charts, brand);

  const vars: Record<string, string> = {
    "--color-primary": brand.primary,
    "--color-primary-strong": primaryStrong,
    "--color-secondary": brand.secondary,
    "--color-tertiary": brand.tertiary,
    // Cores de texto/icone auto-contrastadas (o tema nao define foreground na mao).
    "--color-on-primary": readableForeground(brand.primary),
    "--color-on-primary-strong": readableForeground(primaryStrong),
    "--color-on-secondary": readableForeground(brand.secondary),
    "--color-on-tertiary": readableForeground(brand.tertiary),
    "--color-background": neutrals.background,
    "--color-surface": neutrals.surface,
    "--color-surface-strong": neutrals.surfaceStrong,
    "--color-text": neutrals.text,
    "--color-text-muted": neutrals.textMuted,
    "--color-border": neutrals.border,
    "--color-success": neutrals.success,
    "--color-warning": neutrals.warning,
    "--color-error": neutrals.error,
    "--color-on-success": readableForeground(neutrals.success),
    "--color-on-warning": readableForeground(neutrals.warning),
    "--color-on-error": readableForeground(neutrals.error),
    "--chart-1": charts.chart1,
    "--chart-2": charts.chart2,
    "--chart-3": charts.chart3,
    "--chart-4": charts.chart4,
    "--chart-5": charts.chart5,
  };

  for (const key of AREA_KEYS) {
    const colors = resolveAreaColors(store.areas[key], brand, key);
    const prefix = AREA_VAR_PREFIX[key];
    vars[`${prefix}-background`] = colors.background;
    vars[`${prefix}-foreground`] = colors.foreground;
    vars[`${prefix}-border`] = colors.border;
  }

  return vars;
}

// --- Persistencia / migracao --------------------------------------------------

export function getActiveScheme(store: ColorSchemeStore): ColorScheme {
  return store.schemes.find((entry) => entry.id === store.activeSchemeId) ?? store.schemes[0] ?? BUILTIN_SCHEMES[0];
}

function isBrand(value: unknown): value is BrandColors {
  if (!value || typeof value !== "object") return false;
  return BRAND_COLOR_KEYS.every((key) => typeof (value as Record<string, unknown>)[key] === "string");
}

/** Le o store persistido de forma tolerante, garantindo os presets builtin. */
export function parseColorSchemeStore(raw: string | null): ColorSchemeStore {
  if (!raw) {
    return DEFAULT_COLOR_SCHEME_STORE;
  }
  try {
    const parsed = JSON.parse(raw) as Partial<ColorSchemeStore>;
    const userSchemes = Array.isArray(parsed.schemes)
      ? parsed.schemes.filter(
          (entry): entry is ColorScheme =>
            Boolean(entry) && typeof entry.id === "string" && !entry.builtin && isBrand(entry.light),
        )
      : [];

    const schemes = [...BUILTIN_SCHEMES, ...userSchemes];
    const activeSchemeId = schemes.some((entry) => entry.id === parsed.activeSchemeId)
      ? (parsed.activeSchemeId as string)
      : "default";

    const areas: AreaOverrides = { ...DEFAULT_AREA_OVERRIDES };
    if (parsed.areas && typeof parsed.areas === "object") {
      for (const key of AREA_KEYS) {
        const stored = (parsed.areas as Partial<AreaOverrides>)[key];
        if (stored && typeof stored.custom === "boolean" && stored.colors) {
          areas[key] = { custom: stored.custom, colors: { ...DEFAULT_AREA_OVERRIDES[key].colors, ...stored.colors } };
        }
      }
    }

    let charts: ChartOverride = DEFAULT_CHART_OVERRIDE;
    if (parsed.charts && typeof parsed.charts.custom === "boolean" && parsed.charts.colors) {
      charts = { custom: parsed.charts.custom, colors: { ...DEFAULT_CHART_OVERRIDE.colors, ...parsed.charts.colors } };
    }

    return { activeSchemeId, schemes, areas, charts };
  } catch {
    return DEFAULT_COLOR_SCHEME_STORE;
  }
}

/** Serializa apenas o que precisa persistir (esquemas de usuario + ativo + areas + graficos). */
export function serializeColorSchemeStore(store: ColorSchemeStore): string {
  return JSON.stringify({
    activeSchemeId: store.activeSchemeId,
    schemes: store.schemes.filter((entry) => !entry.builtin),
    areas: store.areas,
    charts: store.charts,
  });
}
