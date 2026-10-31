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

// --- Contrato Brand -> Theme --------------------------------------------------

/**
 * Canal PÚBLICO de comunicação Brand -> Theme. O domínio Theme trata este
 * objeto como entrada READ-ONLY e NUNCA lê o estado interno da Brand
 * (`brand.colors`/`brand.default`). A Brand publica:
 *  - `brandId`: escopo das customizações e do esquema ativo por marca;
 *  - `defaultScheme`: o default da WL, já num formato que o Theme sabe aplicar,
 *    mas que PERTENCE ao domínio da Brand (id `brand:<id>`, `builtin` = não
 *    editável e não persistido pelo Theme).
 */
export type BrandThemeContract = {
  brandId: string;
  defaultScheme: ColorScheme;
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
  /** Esquemas gerais da aplicação (acessibilidade/inclusão). Ids GLOBAIS. */
  commons: ColorScheme[];
  /**
   * Esquemas do formato ANTIGO (sem vínculo de marca). Somente-leitura,
   * preservados por compatibilidade até uma migração explícita dos dados.
   */
  legacyGlobal: ColorScheme[];
  /** Customizações POR marca — cada custom pertence à Brand que a criou. */
  customizations: Record<string, ColorScheme[]>;
  /**
   * Esquema ativo POR marca. O `active` é estado do Theme, mas depende da Brand
   * atual: cada marca resolve o seu (fallback = default da Brand).
   */
  activeSchemeIdByBrand: Record<string, string>;
  /** Active do formato antigo — fallback global de compat (pré-migração). */
  legacyActiveSchemeId?: string;
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
  // Cinza NEUTRO (sem tinta de hue) — os neutros nao devem herdar a cor da marca.
  background: "#121212",
  surface: "#1c1c1c",
  surfaceStrong: "#2a2a2a",
  text: "#f2f2f2",
  textMuted: "#bcbcbc",
  border: "#383838",
  success: "#54d38f",
  warning: "#ffc94d",
  error: "#ff836e",
};

// --- Presets builtin ----------------------------------------------------------

/**
 * Esquemas COMMONS: gerais da aplicação, incluindo acessibilidade/inclusão
 * (daltonismo, alto contraste). Ids globais, `builtin` (não editáveis nem
 * removíveis). O antigo builtin "default" foi removido: o default agora é
 * fornecido pela Brand via `BrandThemeContract`.
 */
export const COMMON_SCHEMES: ColorScheme[] = [
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
  commons: COMMON_SCHEMES,
  legacyGlobal: [],
  customizations: {},
  activeSchemeIdByBrand: {},
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

/**
 * Cores efetivas de uma area: personalizadas ou derivadas das marcas do esquema.
 *
 * Personalizadas seguem o modelo "claro configura, escuro deriva": no tema escuro,
 * um fundo CLARO (ex.: sidebar/rodape brancos) vira um tom escuro do mesmo matiz
 * (branco → a superficie do dark), com texto e borda recalculados. Fundos ja
 * escuros (header marinho, sidebar preta) ficam como configurados.
 */
export function resolveAreaColors(area: AreaOverride, brand: BrandColors, key: AreaKey, theme: ResolvedTheme = "light"): AreaColors {
  if (area.custom) {
    if (theme === "dark" && relativeLuminance(area.colors.background) > 0.5) {
      const background = toDark(area.colors.background, 0.11);
      const foreground = readableForeground(background);
      return { background, foreground, border: mixHex(background, foreground, 0.15) };
    }
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
export function resolveCssVars(store: ColorSchemeStore, contract: BrandThemeContract, theme: ResolvedTheme): Record<string, string> {
  const scheme = getActiveScheme(store, contract);
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
    const colors = resolveAreaColors(store.areas[key], brand, key, theme);
    const prefix = AREA_VAR_PREFIX[key];
    vars[`${prefix}-background`] = colors.background;
    vars[`${prefix}-foreground`] = colors.foreground;
    vars[`${prefix}-border`] = colors.border;
  }

  return vars;
}

// --- Persistencia / migracao --------------------------------------------------

/**
 * Esquemas DISPONÍVEIS para a marca atual, na ordem de exibição:
 * default da Brand (via contrato) + commons + customizações DA marca.
 *
 * O `legacyGlobal` NÃO entra: é apenas dado preservado (compat não-destrutiva)
 * até uma migração explícita — não deve ser exibido nem vazar entre marcas
 * (senão o esquema salvo de uma WL apareceria em outra).
 */
export function getAvailableSchemes(store: ColorSchemeStore, contract: BrandThemeContract): ColorScheme[] {
  return [
    contract.defaultScheme,
    ...store.commons,
    ...(store.customizations[contract.brandId] ?? []),
  ];
}

/**
 * Esquema ATIVO resolvido: registro por-marca → default da Brand. O active
 * pertence ao Theme, mas a escolha depende da Brand atual (a Brand informa o
 * contexto; o Theme resolve o estado). O `legacyActiveSchemeId` não força o
 * ativo — cai no default da Brand até a migração explícita.
 */
export function getActiveScheme(store: ColorSchemeStore, contract: BrandThemeContract): ColorScheme {
  const available = getAvailableSchemes(store, contract);
  const activeId = store.activeSchemeIdByBrand[contract.brandId];
  return available.find((entry) => entry.id === activeId) ?? contract.defaultScheme;
}

function isBrand(value: unknown): value is BrandColors {
  if (!value || typeof value !== "object") return false;
  return BRAND_COLOR_KEYS.every((key) => typeof (value as Record<string, unknown>)[key] === "string");
}

/** Esquema válido de usuário (id + tríade); ignora o flag `builtin` de origem. */
function isUserScheme(value: unknown): value is ColorScheme {
  if (!value || typeof value !== "object") return false;
  const entry = value as Partial<ColorScheme>;
  return typeof entry.id === "string" && typeof entry.name === "string" && isBrand(entry.light);
}

/** Marca um esquema como somente-leitura (legado global, pré-migração). */
function toReadonly(scheme: ColorScheme): ColorScheme {
  return { ...scheme, builtin: true };
}

/** Áreas/charts têm o MESMO parse nos dois formatos (não são tríade de marca). */
function parseAreas(value: unknown): AreaOverrides {
  const areas: AreaOverrides = { ...DEFAULT_AREA_OVERRIDES };
  if (value && typeof value === "object") {
    for (const key of AREA_KEYS) {
      const stored = (value as Partial<AreaOverrides>)[key];
      if (stored && typeof stored.custom === "boolean" && stored.colors) {
        areas[key] = { custom: stored.custom, colors: { ...DEFAULT_AREA_OVERRIDES[key].colors, ...stored.colors } };
      }
    }
  }
  return areas;
}

function parseCharts(value: unknown): ChartOverride {
  const charts = value as Partial<ChartOverride> | undefined;
  if (charts && typeof charts.custom === "boolean" && charts.colors) {
    return { custom: charts.custom, colors: { ...DEFAULT_CHART_OVERRIDE.colors, ...charts.colors } };
  }
  return DEFAULT_CHART_OVERRIDE;
}

/**
 * Lê o store persistido de forma tolerante. Aceita DOIS formatos, sem migração
 * destrutiva (ver docs/tema-marca-e-idioma.md):
 *  - NOVO: `commons`/`customizations`/`activeSchemeIdByBrand` (por marca);
 *  - LEGADO: `schemes` flat + `activeSchemeId` global → preservados em
 *    `legacyGlobal` (somente-leitura) + `legacyActiveSchemeId` (fallback).
 * Os `commons` são sempre garantidos a partir do código (não vêm do disco).
 */
export function parseColorSchemeStore(raw: string | null): ColorSchemeStore {
  if (!raw) {
    return DEFAULT_COLOR_SCHEME_STORE;
  }
  try {
    const parsed = JSON.parse(raw) as Record<string, unknown>;
    const areas = parseAreas(parsed.areas);
    const charts = parseCharts(parsed.charts);

    const isNewFormat = parsed.customizations !== undefined || parsed.activeSchemeIdByBrand !== undefined;

    if (isNewFormat) {
      const customizations: Record<string, ColorScheme[]> = {};
      if (parsed.customizations && typeof parsed.customizations === "object") {
        for (const [brandId, list] of Object.entries(parsed.customizations as Record<string, unknown>)) {
          if (Array.isArray(list)) {
            const valid = list.filter(isUserScheme).map((scheme) => ({ ...scheme, builtin: false }));
            if (valid.length > 0) {
              customizations[brandId] = valid;
            }
          }
        }
      }
      const legacyGlobal = Array.isArray(parsed.legacyGlobal)
        ? (parsed.legacyGlobal as unknown[]).filter(isUserScheme).map(toReadonly)
        : [];
      const activeSchemeIdByBrand =
        parsed.activeSchemeIdByBrand && typeof parsed.activeSchemeIdByBrand === "object"
          ? { ...(parsed.activeSchemeIdByBrand as Record<string, string>) }
          : {};

      return {
        commons: COMMON_SCHEMES,
        legacyGlobal,
        customizations,
        activeSchemeIdByBrand,
        legacyActiveSchemeId: typeof parsed.legacyActiveSchemeId === "string" ? parsed.legacyActiveSchemeId : undefined,
        areas,
        charts,
      };
    }

    // Formato LEGADO: esquemas de usuário viram legado GLOBAL somente-leitura,
    // vinculados a nenhuma marca (migração explícita para por-marca fica adiada).
    const legacyGlobal = Array.isArray(parsed.schemes)
      ? (parsed.schemes as unknown[]).filter(isUserScheme).map(toReadonly)
      : [];

    return {
      commons: COMMON_SCHEMES,
      legacyGlobal,
      customizations: {},
      activeSchemeIdByBrand: {},
      legacyActiveSchemeId: typeof parsed.activeSchemeId === "string" ? parsed.activeSchemeId : undefined,
      areas,
      charts,
    };
  } catch {
    return DEFAULT_COLOR_SCHEME_STORE;
  }
}

/**
 * Serializa o que precisa persistir (formato NOVO). Os `commons` são omitidos
 * (rehidratados do código); `legacyGlobal`/`legacyActiveSchemeId` são
 * preservados por compatibilidade até a migração explícita.
 */
export function serializeColorSchemeStore(store: ColorSchemeStore): string {
  return JSON.stringify({
    customizations: store.customizations,
    activeSchemeIdByBrand: store.activeSchemeIdByBrand,
    legacyGlobal: store.legacyGlobal.map((scheme) => ({ ...scheme, builtin: false })),
    legacyActiveSchemeId: store.legacyActiveSchemeId,
    areas: store.areas,
    charts: store.charts,
  });
}
