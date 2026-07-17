import type { Permission, Role, User } from "@/types/user";

/**
 * Helpers puros para o usuario autenticado: guardas de papel/permissao.
 * Sem efeitos colaterais — seguro para SSR e testes. Sao a base do RBAC:
 * o registro de acoes e o `entity-policy` filtram tudo por estas funcoes.
 */

/** Verdadeiro se o usuario possui o papel informado. */
export function hasRole(user: User | null | undefined, role: Role): boolean {
  return Boolean(user?.authorization.roles.includes(role));
}

/** Verdadeiro se o usuario possui pelo menos um dos papeis informados. */
export function hasAnyRole(user: User | null | undefined, roles: Role[]): boolean {
  return roles.some((role) => hasRole(user, role));
}

/** Verdadeiro se o usuario possui a permissao informada. */
export function hasPermission(user: User | null | undefined, permission: Permission): boolean {
  return Boolean(user?.authorization.permissions.includes(permission));
}

/** Verdadeiro se o usuario possui todas as permissoes informadas. */
export function hasAllPermissions(user: User | null | undefined, permissions: Permission[]): boolean {
  return permissions.every((permission) => hasPermission(user, permission));
}

/** Nome preferido para exibicao (usa `displayName`, cai para `name`). */
export function preferredName(user: User): string {
  return user.displayName.trim() || user.name.trim() || user.username;
}
