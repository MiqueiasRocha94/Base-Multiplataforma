import type { EntityContract, ModuleRecord } from "@/core/contracts";

/**
 * Registro de uma entidade no DEV BACKEND: contrato (definicao estatica) +
 * dados-semente. Cada entidade do dominio registra o seu modulo aqui para que o
 * Dev Backend sirva contrato, dados e CRUD sem um servidor real.
 */
export type DevEntityModule = {
  /** Caminho da entidade, igual ao usado em `useEntity({ url })` (ex.: "users"). */
  url: string;
  /** Definicao estatica (mesmo formato que a API de producao retornaria). */
  contract: EntityContract;
  /** Dados iniciais da colecao (timestamps/arquivos permitidos). */
  seed: () => ModuleRecord[];
};

const modules = new Map<string, DevEntityModule>();

export function registerDevEntity(module: DevEntityModule): void {
  modules.set(module.url, module);
}

export function getDevEntity(url: string): DevEntityModule | undefined {
  return modules.get(url);
}
