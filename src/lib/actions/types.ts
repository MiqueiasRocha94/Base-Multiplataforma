import type { Permission, Role } from "@/types/user";

/** Como combinar os requisitos: exigir todos ("all", padrao) ou qualquer um ("any"). */
export type ActionMatch = "all" | "any";

/**
 * Definicao de uma acao no catalogo. Declara O QUE a acao exige do usuario
 * logado (permissoes/papeis). A UI nunca decide sozinha: consome apenas o
 * resultado de `resolveAvailableActions(registry, user)`.
 */
export interface ActionDef {
  /** Identificador estavel (casa com o handler na UI). */
  id: string;
  /** Chave de i18n do rotulo (ex.: em `dictionary.persons`). */
  labelKey: string;
  /**
   * Entidade/contexto dos dados que a acao opera (hoje "person" na demo; no app
   * real, o recurso equivalente). NAO e um segundo filtro — apenas contexto.
   */
  entity: string;
  /** Permissoes exigidas (formato "recurso.acao"). */
  requiredPermissions?: Permission[];
  /** Papeis exigidos. */
  requiredRoles?: Role[];
  /** Combinacao dos requisitos (padrao "all"). */
  match?: ActionMatch;
  /**
   * Acao de LINHA liberada pelo backend por registro: so aparece quando
   * `record[recordFlag] === true` (ex.: `podeSimularLiquidacao`). O front nao
   * deduz a regra; sem a flag na resposta, a acao fica oculta.
   */
  recordFlag?: string;
}
