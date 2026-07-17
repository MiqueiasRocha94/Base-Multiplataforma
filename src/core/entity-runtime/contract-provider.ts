import type { EntityContract } from "@/core/contracts";
import { getEntityDataProvider } from "@/core/entity-runtime/entity-provider";
import { registerModule } from "@/core/module-engine";

/**
 * Carregamento e cache do contrato da entidade.
 *
 * O contrato e a definicao ESTATICA (version/schema/ui/permissions/relations) e
 * pode ser cacheado durante o ciclo da app. Funciona para deep-link e abertura
 * direta de formulario — basta `loadContract(url)`, sem passar pela lista. Ao
 * carregar, registra no `module-registry` (schema/ui) para o motor schema-driven.
 */
const cache = new Map<string, EntityContract>();
const inFlight = new Map<string, Promise<EntityContract>>();

export async function loadContract(url: string): Promise<EntityContract> {
  const cached = cache.get(url);
  if (cached) {
    return cached;
  }

  const pending = inFlight.get(url);
  if (pending) {
    return pending;
  }

  const promise = (async () => {
    const provider = await getEntityDataProvider();
    const contract = await provider.getContract(url);
    cache.set(url, contract);
    registerModule(url, { schema: contract.schema, ui: contract.ui });
    return contract;
  })();

  inFlight.set(url, promise);
  try {
    return await promise;
  } finally {
    inFlight.delete(url);
  }
}

export function getCachedContract(url: string): EntityContract | null {
  return cache.get(url) ?? null;
}

export function invalidateContract(url: string): void {
  cache.delete(url);
}
