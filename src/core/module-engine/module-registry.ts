import type { EntitySchema, ModuleUi } from "@/core/contracts";

/**
 * Cache em memoria do contrato (schema + ui) por entidade, preenchido quando a
 * listagem carrega o envelope. Permite que telas de detalhe/formulario montem
 * o formulario e as validacoes Zod sem uma chamada extra.
 */
export type ModuleDescriptor = {
  schema: EntitySchema;
  ui: ModuleUi;
};

const registry = new Map<string, ModuleDescriptor>();

export function registerModule(entity: string, descriptor: ModuleDescriptor): void {
  registry.set(entity, descriptor);
}

export function getModule(entity: string): ModuleDescriptor | null {
  return registry.get(entity) ?? null;
}
