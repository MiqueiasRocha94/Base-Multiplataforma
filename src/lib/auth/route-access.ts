import { hasAnyRole, hasPermission } from "@/lib/auth/user";
import type { Permission, Role, User } from "@/types/user";

/**
 * Controle de ACESSO por rota (nao apenas visibilidade de menu). Espelha os
 * requisitos dos itens de navegacao: o `PortalGate` redireciona quem tenta
 * abrir uma rota sem permissao (inclusive por URL direta).
 */
type RouteRule = { prefix: string; permissions?: Permission[]; roles?: Role[] };

const ROUTE_RULES: RouteRule[] = [
  { prefix: "/portal/persons", permissions: ["pessoa.visualizar"] },
  { prefix: "/portal/analytics", roles: ["ANALISTA", "ADMIN"] },
  { prefix: "/portal/demo400", roles: ["ADMIN"] },
  { prefix: "/portal/demo500", roles: ["ADMIN"] },
  { prefix: "/portal/audit", roles: ["ADMIN"] },
  { prefix: "/portal/modulo-", roles: ["ADMIN"] },
];

/** Verdadeiro se o usuario pode acessar a rota (rotas sem regra sao livres). */
export function canAccessPath(pathname: string, user: User | null): boolean {
  const rule = ROUTE_RULES.find((item) => pathname === item.prefix || pathname.startsWith(item.prefix));
  if (!rule) {
    return true;
  }
  const permOk = !rule.permissions?.length || rule.permissions.every((permission) => hasPermission(user, permission));
  const roleOk = !rule.roles?.length || hasAnyRole(user, rule.roles);
  return permOk && roleOk;
}
