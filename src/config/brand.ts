/**
 * Registro de marcas (whitelabel).
 *
 * Assets vivem em `public/brands/<id>/` (login hero, logo, favicon) e são
 * servidos por caminho absoluto. A base traz só a marca neutra `base`; cada
 * produto registra as suas aqui (id em `BrandId`, perfil em `BRANDS`, dados
 * institucionais em `config/brand-info`).
 *
 * A marca ativa vem de `NEXT_PUBLIC_BRAND` em tempo de BUILD (inlined pelo Next),
 * setada pelo build-arg `BRAND` do Docker. Sem a env — ou com valor inválido —
 * cai no default `base`. Ver docs/tema-marca-e-idioma.md → "Marca".
 */

import type { BrandThemeContract, ColorScheme } from "@/lib/theme/color-scheme";

export type BrandId = "base";

/** Tríade de marcas do esquema de cores (mesma do color-scheme: light). */
export type BrandColors = {
  primary: string;
  secondary: string;
  tertiary: string;
};

export type BrandProfile = {
  id: BrandId;
  name: string;
  /** Cores padrão do white-label. O switcher aplica estas cores ao esquema ativo. */
  colors: BrandColors;
  /** Imagem "hero" do painel de login (desktop >= 720px). */
  loginImage: string;
  /**
   * Como a `loginImage` preenche o painel lateral: "cover" (fotos-hero, ocupam
   * tudo) ou "contain" (logos sobre fundo — centralizados, sem ampliar demais).
   */
  heroFit: "cover" | "contain";
  /** Fundo do painel (usado com "contain"). */
  heroBg?: string;
  /** Logo da marca (topo do login no mobile/<720). */
  logo: string;
  /** Favicon da marca (opcional). */
  favicon?: string;
};

export const BRANDS: Record<BrandId, BrandProfile> = {
  base: {
    id: "base",
    name: "Base",
    colors: { primary: "#2563eb", secondary: "#3e8744", tertiary: "#f5b400" },
    loginImage: "/brands/base/login.svg",
    heroFit: "cover",
    logo: "/brands/base/logo.svg",
    favicon: "/brands/base/favicon.svg",
  },
};

/** Ordem canônica das marcas (para listagens, ex.: switcher de dev). */
export const BRAND_IDS: BrandId[] = ["base"];

/**
 * Default da WL publicado como `ColorScheme` que o Theme sabe aplicar. O objeto
 * PERTENCE ao domínio da Brand: id `brand:<id>` e `builtin` (o Theme nunca o
 * edita nem persiste). É o único formato de cor que a Brand expõe ao Theme —
 * o `colors` da marca permanece detalhe interno.
 */
export function brandDefaultScheme(profile: BrandProfile): ColorScheme {
  return {
    id: `brand:${profile.id}`,
    name: profile.name,
    builtin: true,
    light: profile.colors,
  };
}

/**
 * Contrato PÚBLICO Brand -> Theme para uma marca. Único canal de comunicação:
 * o Theme lê isto, nunca `brand.colors`/estado interno da Brand.
 */
export function brandThemeContract(profile: BrandProfile): BrandThemeContract {
  return {
    brandId: profile.id,
    defaultScheme: brandDefaultScheme(profile),
  };
}

/** Default quando `NEXT_PUBLIC_BRAND` não está setada (ex.: dev, homolog). */
const DEFAULT_BRAND_ID: BrandId = "base";

/** Marca ativa do build, vinda de `NEXT_PUBLIC_BRAND` (inlined) — ver doc no topo. */
function resolveActiveBrandId(): BrandId {
  const fromEnv = process.env.NEXT_PUBLIC_BRAND?.trim().toLowerCase();
  return fromEnv && fromEnv in BRANDS ? (fromEnv as BrandId) : DEFAULT_BRAND_ID;
}

export const ACTIVE_BRAND_ID: BrandId = resolveActiveBrandId();

export const activeBrand: BrandProfile = BRANDS[ACTIVE_BRAND_ID];

// @dev-only:start
/** Chave de storage do override de marca (DEV): trocado pelo switcher do devtools. */
export const BRAND_OVERRIDE_STORAGE_KEY = "dev.whitelabel";
// @dev-only:end
