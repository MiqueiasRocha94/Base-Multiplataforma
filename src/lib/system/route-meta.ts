import { usePathname } from "next/navigation";

/**
 * Metadata de LAYOUT declarada pela rota (§5.2). O resolver interpreta o token
 * genérico (`minimal`/`default`) — ele NÃO conhece rotas. Substitui a antiga
 * lista `PUBLIC_AUTH_ROUTES` embutida na resolução.
 */
/**
 * Tokens de layout (presets de região resolvidos em resolve-system-config):
 * - `default`: segue a config (chrome completo);
 * - `minimal`: só `main` (sem header/sidebar-esq/footer);
 * - `basic`  : header + main;
 * - `mobile` : header + main + footer.
 */
export type RouteLayout = "default" | "minimal" | "basic" | "mobile";

/**
 * `layout` vale para todos os tamanhos; `mobileLayout` (opcional) o substitui
 * quando o device é mobile — permite, ex., desktop `minimal` + mobile `mobile`.
 */
export type RouteMeta = { layout?: RouteLayout; mobileLayout?: RouteLayout };

/** Metadata já resolvida (layout com default aplicado; mobileLayout passa direto). */
export type ResolvedRouteMeta = { layout: RouteLayout; mobileLayout?: RouteLayout };

/**
 * Registro pathname → meta. Primeiro passo: um mapa central; a evolução natural é
 * co-locar `export const meta` em cada `page.tsx`. `minimal` = telas sem o chrome
 * do app (auth/transição): `/` (redirect), `/login`, `/start`.
 */
const ROUTE_META: Record<string, RouteMeta> = {
  "/": { layout: "minimal" },
  "/login": { layout: "minimal" },
  "/start": { layout: "minimal" },
  // Troca de senha expirada: sem chrome — o menu so libera depois da troca.
  "/portal/alterar-senha-expirada": { layout: "minimal" },
};

const DEFAULT_META: ResolvedRouteMeta = { layout: "default" };

/** Resolve a metadata da rota. Função PURA — casa com o `pathname` exato. */
export function getRouteMeta(pathname: string): ResolvedRouteMeta {
  return { ...DEFAULT_META, ...ROUTE_META[pathname] };
}

/** Leitor da metadata da rota atual (para consumidores que não têm o pathname). */
export function useRouteMeta(): ResolvedRouteMeta {
  return getRouteMeta(usePathname());
}
