import { isRouteReleased } from "@/lib/auth/mobile-release";
import { hasAnyRole, hasPermission } from "@/lib/auth/user";
import type { Permission, Role, User } from "@/types/user";

/**
 * Controle de ACESSO por rota (nao apenas visibilidade de menu). Espelha os
 * requisitos dos itens de navegacao: o `PortalGate` redireciona quem tenta
 * abrir uma rota sem permissao (inclusive por URL direta).
 *
 * `exact` casa só a própria rota (ex.: página do módulo, cujos filhos têm regra própria).
 */
type RouteRule = { prefix: string; exact?: boolean; permissions?: Permission[]; roles?: Role[] };

const ROUTE_RULES: RouteRule[] = [
  { prefix: "/portal/persons", permissions: ["pessoa.visualizar"] },
  { prefix: "/portal/analytics", roles: ["ANALISTA", "ADMIN"] },
  // @dev-only:start
  { prefix: "/portal/demo400", roles: ["ADMIN"] },
  { prefix: "/portal/demo500", roles: ["ADMIN"] },
  // @dev-only:end
  { prefix: "/portal/audit", roles: ["ADMIN"] },
];

/** Verdadeiro se o usuario pode acessar a rota (rotas sem regra sao livres). */
export function canAccessPath(pathname: string, user: User | null): boolean {
  // No app, rota não publicada não abre (a página nem está no APK).
  if (!isRouteReleased(pathname)) {
    return false;
  }
  // Prefixo por SEGMENTO: `/portal/persons` não pega `/portal/persons-extra`.
  const rule = ROUTE_RULES.find(
    (item) => pathname === item.prefix || (!item.exact && pathname.startsWith(`${item.prefix}/`)),
  );
  if (!rule) {
    return true;
  }
  const permOk = !rule.permissions?.length || rule.permissions.every((permission) => hasPermission(user, permission));
  const roleOk = !rule.roles?.length || hasAnyRole(user, rule.roles);
  return permOk && roleOk;
}
