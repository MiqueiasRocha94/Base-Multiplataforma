"use client";

import { useAuth } from "@/contexts/AuthContext";
import { hasAllPermissions, hasAnyRole, hasPermission, hasRole } from "@/lib/auth/user";
import type { Permission, Role } from "@/types/user";

type CanProps = {
  /** Permissao(oes) exigida(s). */
  permission?: Permission | Permission[];
  /** Papel(is) exigido(s). */
  role?: Role | Role[];
  /** Combinar requisitos: exigir todos ("all", padrao) ou qualquer um ("any"). */
  match?: "all" | "any";
  /** Renderizado quando o usuario NAO satisfaz os requisitos. */
  fallback?: React.ReactNode;
  children: React.ReactNode;
};

/**
 * Gate declarativo de UX: mostra `children` apenas se o usuario logado satisfaz
 * permissao/papel. Autorizacao definitiva e responsabilidade do servidor — aqui
 * e so experiencia. Reusa os mesmos helpers do RBAC de acoes.
 */
export function Can({ permission, role, match = "all", fallback = null, children }: CanProps): React.ReactNode {
  const { user } = useAuth();

  const permissions = permission ? (Array.isArray(permission) ? permission : [permission]) : [];
  const roles = role ? (Array.isArray(role) ? role : [role]) : [];

  const any = match === "any";

  const permOk =
    permissions.length === 0 ||
    (any ? permissions.some((item) => hasPermission(user, item)) : hasAllPermissions(user, permissions));

  const roleOk =
    roles.length === 0 || (any ? hasAnyRole(user, roles) : roles.every((item) => hasRole(user, item)));

  return permOk && roleOk ? children : fallback;
}
