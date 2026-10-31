import type { DeviceView } from "@/contexts/DeviceContext";
import type { LayoutFlags, RegionKey, SystemLayoutConfig } from "@/contexts/system/types";
import type { RouteLayout } from "@/lib/system/route-meta";

/**
 * Entradas da resolução de layout. São lidas de outros domínios pelo
 * SystemProvider (Device, config/override, metadata da rota) e passadas para cá —
 * este módulo NÃO lê contextos nem conhece rotas (§5.2): recebe apenas tokens.
 */
export type ResolveSystemInputs = {
  /** Config bruta (override do painel dev). */
  config: SystemLayoutConfig;
  /** View do DeviceContext. */
  view: DeviceView;
  /** Token de layout declarado pela rota (§5.2). `minimal` suprime o chrome. */
  routeLayout: RouteLayout;
};

/** Resultado da resolução (§9): presença das regiões + flags de apresentação. */
export type ResolvedLayout = {
  /** Presença resolvida de cada região; `main` sempre `true` (imutável). */
  layout: LayoutFlags;
  isMobile: boolean;
  canRenderSidebars: boolean;
  mainContentBare: boolean;
};

/** Patch de presença de uma fonte. `undefined` = "não mexe" (§6: ausência ≠ negação). */
type LayoutPatch = Partial<Record<RegionKey, boolean>>;

const REGIONS: RegionKey[] = ["header", "leftSidebar", "rightSidebar", "footer"];

/**
 * Presets de layout (§5.2): cada token do RouteMeta declara a presença das
 * regiões que lhe importam. `main` é imutável e nunca entra aqui. Config e device
 * ainda se aplicam por cima (mobile tira as sidebars; "restrição vence permissão").
 *   - `default`: nada declarado → segue a config (chrome completo).
 *   - `minimal`: só main. A RightSidebar (trilho dev/sistema, env-gated) NÃO é
 *               chrome de app, então o preset não a toca.
 *   - `basic`  : header + main.
 *   - `mobile` : header + main + footer.
 */
const LAYOUT_PRESETS: Record<RouteLayout, LayoutPatch> = {
  default: {},
  minimal: { header: false, leftSidebar: false, footer: false },
  basic: { header: true, leftSidebar: false, footer: false },
  mobile: { header: true, leftSidebar: false, footer: true },
};

/**
 * Fold de precedência (§6). Recebe as fontes em ordem CRESCENTE de precedência;
 * cada uma declara só as regiões que lhe importam. Regras de desempate:
 * - **restrição é grudenta**: uma vez `false`, nenhuma fonte reativa a região
 *   ("restrição vence permissão" — vale mesmo para a fonte de maior precedência);
 * - **ausência ≠ negação**: `undefined` não altera o acumulado;
 * - `main` é imutável e nem participa desta resolução (sempre presente).
 */
function resolvePresence(sources: LayoutPatch[]): Record<RegionKey, boolean> {
  const result = {} as Record<RegionKey, boolean>;

  for (const region of REGIONS) {
    let present = false;
    let restricted = false;

    for (const patch of sources) {
      const declared = patch[region];
      if (declared === undefined) {
        continue;
      }
      if (declared === false) {
        present = false;
        restricted = true;
      } else if (!restricted) {
        present = true;
      }
    }

    result[region] = present;
  }

  return result;
}

/**
 * Resolução do layout: função PURA (§5.1). Monta as fontes de precedência a
 * partir das entradas e as consolida no fold.
 *
 * Fontes atuais (ordem crescente de precedência):
 *   1. config      — presença configurada (defaults + override do painel dev);
 *   2. rota         — preset do RouteLayout (LAYOUT_PRESETS: minimal/basic/mobile);
 *   3. device       — mobile remove as sidebars da árvore (o resto é CSS).
 *
 * Ponto de extensão: novas camadas (domínio Portal/App/Admin, capacidades por
 * permissão, override "modo foco", `pending` de auth §8.3) entram como um novo
 * `LayoutPatch` nesta lista, na posição de precedência correta. Não há nenhuma
 * hoje porque nenhuma região é gated por domínio/permissão — serão adicionadas
 * quando existir a primeira.
 */
export function resolveSystemConfig({
  config,
  view,
  routeLayout,
}: ResolveSystemInputs): ResolvedLayout {
  const isMobile = view === "mobile";

  const configPatch: LayoutPatch = {
    header: config.headerVisible,
    leftSidebar: config.leftSidebarVisible,
    rightSidebar: config.rightSidebarVisible,
    footer: config.footerVisible,
  };
  // Preset declarado pela rota (já selecionado por device pelo SystemContext).
  const routePatch = LAYOUT_PRESETS[routeLayout];
  // Mobile tira as sidebars da árvore; Header/Footer seguem (variam por CSS).
  const devicePatch: LayoutPatch = isMobile
    ? { leftSidebar: false, rightSidebar: false }
    : {};

  const presence = resolvePresence([configPatch, routePatch, devicePatch]);

  return {
    // `main` é imutável (§6/§9): sempre presente, fora do fold de restrições.
    layout: { ...presence, main: true },
    isMobile,
    canRenderSidebars: !isMobile,
    // Full-bleed (sem top bar/padding/card) só no `minimal`, onde a página é dona
    // da moldura; `basic`/`mobile` usam o MainContent normal.
    mainContentBare: routeLayout === "minimal",
  };
}
