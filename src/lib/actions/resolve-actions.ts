import { hasPermission, hasRole } from "@/lib/auth/user";
import type { User } from "@/types/user";
import type { ActionDef } from "@/lib/actions/types";

/**
 * Fonte de verdade do RBAC de acoes: filtra o catalogo pelas permissoes do
 * usuario logado. A UI so consome este resultado — nenhum componente refaz o
 * filtro. Deslogado (`user == null`) => apenas acoes publicas (sem requisitos).
 */
export function resolveAvailableActions(registry: ActionDef[], user: User | null): ActionDef[] {
  return registry.filter((action) => userSatisfies(action, user));
}

/** Verdadeiro se o usuario satisfaz os requisitos declarados pela acao. */
export function userSatisfies(action: ActionDef, user: User | null): boolean {
  const needsPermissions = Boolean(action.requiredPermissions?.length);
  const needsRoles = Boolean(action.requiredRoles?.length);

  // Sem requisitos => acao publica.
  if (!needsPermissions && !needsRoles) {
    return true;
  }
  if (!user) {
    return false;
  }

  const any = action.match === "any";

  const permOk =
    !needsPermissions ||
    (any
      ? action.requiredPermissions!.some((permission) => hasPermission(user, permission))
      : action.requiredPermissions!.every((permission) => hasPermission(user, permission)));

  const roleOk =
    !needsRoles ||
    (any
      ? action.requiredRoles!.some((role) => hasRole(user, role))
      : action.requiredRoles!.every((role) => hasRole(user, role)));

  return permOk && roleOk;
}
