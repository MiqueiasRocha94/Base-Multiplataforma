import type { ModulePermissions } from "@/core/contracts";
import { hasPermission } from "@/lib/auth/user";
import type { User } from "@/types/user";

/**
 * Politica de autorizacao por entidade: mapeia o `User` (roles/permissions) para
 * as `ModulePermissions` (create/update/delete/view/export) que o contrato expoe.
 *
 * E aqui que a autorizacao do usuario logado "entra" no runtime da entidade:
 * `use-entity` chama esta funcao e alimenta `resolveActions`, de modo que trocar
 * de usuario muda os botoes em TODA pagina dirigida por contrato — sem tocar na UI.
 * No backend real, `contract.permissions` ja viria resolvido do servidor.
 */
export function resolveEntityPermissions(
  user: User | null,
  entity: string,
  fallback: ModulePermissions,
): ModulePermissions {
  switch (entity) {
    case "persons":
      return {
        view: hasPermission(user, "pessoa.visualizar"),
        create: hasPermission(user, "pessoa.criar"),
        update: hasPermission(user, "pessoa.editar"),
        delete: hasPermission(user, "pessoa.remover"),
        export: hasPermission(user, "pessoa.exportar"),
      };
    default:
      // Entidades sem politica mapeada preservam o contrato (nao regride nada).
      return fallback;
  }
}
