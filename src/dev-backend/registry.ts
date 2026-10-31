import type { EntityContract, ModuleRecord } from "@/core/contracts";

/**
 * Registro de uma entidade no DEV BACKEND: contrato (definicao estatica) +
 * dados-semente. Cada entidade do dominio registra o seu modulo aqui para que o
 * Dev Backend sirva contrato, dados e CRUD sem um servidor real.
 */
export type DevEntityModule = {
  /** Caminho da entidade, igual ao usado em `useEntity({ url })` (ex.: "users"). */
  url: string;
  /**
   * Definicao estatica (mesmo formato que a API de producao retornaria). Funcao
   * quando o backend varia o contrato por perfil, pelo token (lida a cada chamada).
   */
  contract: EntityContract | (() => EntityContract);
  /** Dados iniciais da colecao (timestamps/arquivos permitidos). */
  seed: () => ModuleRecord[];
  /**
   * Escopo pelo token, como no backend real: reduz a colecao ao que o usuario
   * logado pode ver (ex.: o usuario so ve os proprios pedidos). Sem ele, tudo.
   */
  scope?: (records: ModuleRecord[]) => ModuleRecord[];
};

const modules = new Map<string, DevEntityModule>();

export function registerDevEntity(module: DevEntityModule): void {
  modules.set(module.url, module);
}

export function getDevEntity(url: string): DevEntityModule | undefined {
  return modules.get(url);
}
