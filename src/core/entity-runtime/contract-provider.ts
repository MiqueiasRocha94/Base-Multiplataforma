import type { EntityContract } from "@/core/contracts";
import { getEntityDataProvider } from "@/core/entity-runtime/entity-provider";
import type { EntityDataProvider } from "@/core/entity-runtime/types";
import { registerModule } from "@/core/module-engine";

/**
 * Carregamento e cache do contrato da entidade.
 *
 * O contrato e a definicao ESTATICA (version/schema/ui/permissions/relations) e
 * pode ser cacheado durante o ciclo da app. Funciona para deep-link e abertura
 * direta de formulario — basta `loadContract(url)`, sem passar pela lista. Ao
 * carregar, registra no `module-registry` (schema/ui) para o motor schema-driven.
 *
 * `scope` separa o cache por usuario: o backend pode devolver colunas/filtros/
 * acoes diferentes por perfil (decide pelo token), entao trocar de usuario na
 * mesma aba nao reaproveita o contrato do anterior.
 */
const cache = new Map<string, EntityContract>();
const inFlight = new Map<string, Promise<EntityContract>>();

const keyOf = (url: string, scope?: string) => `${scope ?? ""}|${url}`;

/**
 * Resposta da API fora do contrato da entidade (2xx com outro corpo). Falha do
 * BACKEND detectada no front: vai para o error boundary (card 500), com
 * `origin: "api"` para o modo desenvolvedor indicar a origem.
 */
export class InvalidContractError extends Error {
  readonly origin = "api";

  constructor(message: string) {
    super(message);
    this.name = "InvalidContractError";
  }
}

/**
 * Confere a FORMA do contrato antes de usar/cachear. Uma rota que responde 200
 * com outro corpo (ex.: backend sem `/contract`, que casa `/{id}` ou devolve a
 * lista) viraria crash no motor (`schema` indefinido); aqui vira erro com causa.
 */
function assertContract(url: string, value: unknown): EntityContract {
  const contract = value as Partial<EntityContract> | null;
  const valid =
    contract != null &&
    typeof contract.schema?.primaryKey === "string" &&
    Array.isArray(contract.schema.fields) &&
    Array.isArray(contract.ui?.columns) &&
    Array.isArray(contract.ui?.filters) &&
    contract.ui?.actions != null &&
    contract.permissions != null;
  if (!valid) {
    throw new InvalidContractError(`A API não devolveu o contrato da entidade (GET ${url}/contract): resposta sem schema/ui/permissions.`);
  }
  return contract as EntityContract;
}

/** `provider` injetado (ex.: rotas `/private` da API); sem ele, o provider padrao. */
export async function loadContract(url: string, provider?: EntityDataProvider, scope?: string): Promise<EntityContract> {
  const key = keyOf(url, scope);
  const cached = cache.get(key);
  if (cached) {
    return cached;
  }

  const pending = inFlight.get(key);
  if (pending) {
    return pending;
  }

  const promise = (async () => {
    const contract = assertContract(url, await (provider ?? (await getEntityDataProvider())).getContract(url));
    cache.set(key, contract);
    registerModule(url, { schema: contract.schema, ui: contract.ui });
    return contract;
  })();

  inFlight.set(key, promise);
  try {
    return await promise;
  } finally {
    inFlight.delete(key);
  }
}

export function getCachedContract(url: string, scope?: string): EntityContract | null {
  return cache.get(keyOf(url, scope)) ?? null;
}

export function invalidateContract(url: string, scope?: string): void {
  cache.delete(keyOf(url, scope));
}
