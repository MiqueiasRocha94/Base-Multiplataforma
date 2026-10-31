// eslint-disable-next-line no-restricted-imports -- D02 (desvio conhecido): hook React em core; corrige movendo para hooks/use-entity.ts
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import type {
  DataResponse,
  EntityContract,
  EntityMetadata,
  EntityPagination,
  EntitySchema,
  ModuleRecord,
  ModuleUi,
} from "@/core/contracts";
import {
  getCachedContract,
  invalidateContract,
  InvalidContractError,
  loadContract,
} from "@/core/entity-runtime/contract-provider";
import { getEntityDataProvider } from "@/core/entity-runtime/entity-provider";
import type { EntityDataProvider } from "@/core/entity-runtime/types";
import { resolveActions, type ModuleActionFlags } from "@/core/module-engine";
// eslint-disable-next-line no-restricted-imports -- D02 (desvio conhecido): hook React em core; corrige movendo para hooks/use-entity.ts
import { useAuth } from "@/contexts/AuthContext";
import { resolveEntityPermissions } from "@/lib/auth/entity-policy";
import { isServerError, toError } from "@/lib/http";
import type { ListQuery } from "@/types/list-query";

export type UseEntityOptions = {
  /** Caminho da entidade (ex.: "users"); usado na URL REST e no Dev Backend. */
  url: string;
  /** Query basica (limit/offset/data) da listagem; alterar refaz o fetch. */
  query?: ListQuery;
  /** Carregar a lista automaticamente. `false` em telas de formulario. Padrao: true. */
  list?: boolean;
  /**
   * Provider injetado pela tela (via `services/`), para entidades de outra raiz
   * de API — ex.: as rotas `/private` da API, com token/DPoP. Sem ele, o padrao
   * (`getEntityDataProvider`: dev-backend ou `NEXT_PUBLIC_API_BASE_URL`).
   */
  provider?: EntityDataProvider;
};

export type UseEntityResult<T> = {
  // contrato (definicao estatica)
  contract: EntityContract | null;
  metadata: EntityMetadata | null;
  schema: EntitySchema | null;
  ui: ModuleUi | null;
  permissions: EntityContract["permissions"] | null;
  relations: EntityContract["relations"] | null;
  /** Acoes resolvidas = permissoes do usuario x habilitacao na ui. */
  actions: ModuleActionFlags | null;

  /** `ui.requiredFilters` ainda vazios na query: a lista não é buscada até preenchê-los. */
  missingFilters: string[];

  // dados
  items: T[];
  pagination: EntityPagination | null;

  // ciclo de vida
  loading: boolean;
  refreshing: boolean;
  error: Error | null;
  refresh: () => Promise<void>;
  invalidate: () => void;

  // operacoes CRUD
  findAll: (query?: ListQuery) => Promise<DataResponse<T>>;
  findById: (id: string) => Promise<T | null>;
  create: (input: unknown) => Promise<T>;
  update: (id: string, input: unknown) => Promise<T>;
  remove: (id: string) => Promise<void>;
  paginate: (query: ListQuery) => Promise<DataResponse<T>>;
  search: (term: string, query?: ListQuery) => Promise<DataResponse<T>>;
};

/** Filtros que o contrato exige (`ui.requiredFilters`) e a query ainda não traz. */
function missingFilters(contract: EntityContract, query?: ListQuery): string[] {
  return (contract.ui.requiredFilters ?? []).filter((name) => !query?.filters?.[name]?.trim());
}

/**
 * Entity Runtime — ponte entre o contrato da entidade e a interface. Substitui
 * os services de CRUD especificos: dado apenas `{ url }`, fornece contrato
 * (schema/ui/permissions/relations), dados paginados e operacoes CRUD, alem do
 * ciclo de vida usado pelas telas (loading/refreshing/error/refresh/invalidate).
 */
export function useEntity<T extends ModuleRecord = ModuleRecord>(options: UseEntityOptions): UseEntityResult<T> {
  const { url, query, list = true, provider: injected } = options;
  const { user } = useAuth();
  // Cache do contrato por usuario: o backend pode variar o contrato por perfil.
  const scope = user?.id;
  const providerOf = useCallback(async () => injected ?? getEntityDataProvider(), [injected]);

  const [contract, setContract] = useState<EntityContract | null>(() => getCachedContract(url, scope));
  const [items, setItems] = useState<T[]>([]);
  const [pagination, setPagination] = useState<EntityPagination | null>(null);
  const [loading, setLoading] = useState(list);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const lastQueryKey = useRef<string | null>(null);
  const [contractRevision, setContractRevision] = useState(0);

  const pk = contract?.schema.primaryKey ?? "id";

  // Contrato: carrega uma vez (cobre deep-link / formulario sem passar pela lista).
  useEffect(() => {
    if (contract) {
      return;
    }
    let active = true;
    void loadContract(url, injected, scope)
      .then((loaded) => {
        if (active) { setContract(loaded); setError(null); }
      })
      .catch((err) => {
        if (active) setError(toError(err));
      });
    return () => {
      active = false;
    };
  }, [url, contract, contractRevision, injected, scope]);

  const loadList = useCallback(
    async (mode: "initial" | "refresh") => {
      if (mode === "refresh") {
        setRefreshing(true);
      } else {
        setLoading(true);
      }
      setError(null);
      try {
        // Garante contrato carregado/registrado para o motor schema-driven.
        const loadedContract = await loadContract(url, injected, scope);
        setContract((current) => current ?? loadedContract);

        // Filtros obrigatórios do contrato ainda vazios: a API daria 400 — espera.
        if (missingFilters(loadedContract, query).length > 0) {
          setItems([]);
          setPagination(null);
          return;
        }

        const provider = await providerOf();
        const response = await provider.list<T>(url, query);
        setItems(response.data);
        setPagination(response.pagination);
      } catch (err) {
        setError(toError(err));
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [url, query, injected, scope, providerOf],
  );

  // Recarrega quando a query muda de fato (evita refetch redundante na montagem).
  useEffect(() => {
    if (!list) {
      return;
    }
    const key = JSON.stringify(query ?? null);
    if (lastQueryKey.current === key) {
      return;
    }
    lastQueryKey.current = key;
    void loadList("initial");
  }, [list, query, loadList]);

  const refresh = useCallback(() => loadList("refresh"), [loadList]);

  const invalidate = useCallback(() => {
    invalidateContract(url, scope);
    setContract(null);
    setError(null);
    setContractRevision((revision) => revision + 1);
  }, [url, scope]);

  const findAll = useCallback(
    async (q?: ListQuery) => {
      const provider = await providerOf();
      return provider.list<T>(url, q ?? query);
    },
    [url, query, providerOf],
  );

  const findById = useCallback(
    async (id: string) => {
      const provider = await providerOf();
      return provider.getById<T>(url, id);
    },
    [url, providerOf],
  );

  const create = useCallback(
    async (input: unknown) => {
      const provider = await providerOf();
      return provider.create<T>(url, input);
    },
    [url, providerOf],
  );

  const update = useCallback(
    async (id: string, input: unknown) => {
      const provider = await providerOf();
      return provider.update<T>(url, id, input);
    },
    [url, providerOf],
  );

  const remove = useCallback(
    async (id: string) => {
      const provider = await providerOf();
      await provider.remove(url, id);
      setItems((current) => current.filter((item) => String(item[pk]) !== String(id)));
    },
    [url, pk, providerOf],
  );

  const paginate = useCallback(
    async (q: ListQuery) => {
      const provider = await providerOf();
      return provider.list<T>(url, q);
    },
    [url, providerOf],
  );

  const search = useCallback(
    async (term: string, q?: ListQuery) => {
      const provider = await providerOf();
      return provider.search<T>(url, term, q ?? query);
    },
    [url, query, providerOf],
  );

  const metadata = useMemo<EntityMetadata | null>(
    () => (contract ? { version: contract.version } : null),
    [contract],
  );

  // Permissoes EFETIVAS = autorizacao do usuario logado mapeada pela politica da
  // entidade (nao mais o `contract.permissions` estatico). E o ponto unico onde
  // o `User` "entra" no runtime — trocar de usuario muda os botoes na UI.
  const effectivePermissions = useMemo<EntityContract["permissions"] | null>(
    () => (contract ? resolveEntityPermissions(user, url, contract.permissions) : null),
    [contract, user, url],
  );

  const actions = useMemo<ModuleActionFlags | null>(
    () => (contract && effectivePermissions ? resolveActions(effectivePermissions, contract.ui) : null),
    [contract, effectivePermissions],
  );

  const missing = useMemo(() => (contract ? missingFilters(contract, query) : []), [contract, query]);

  // 5xx e contrato fora do formato: a tela nao tem como seguir → error boundary (card 500).
  if (isServerError(error) || error instanceof InvalidContractError) throw error;

  return {
    contract,
    missingFilters: missing,
    metadata,
    schema: contract?.schema ?? null,
    ui: contract?.ui ?? null,
    permissions: effectivePermissions,
    relations: contract?.relations ?? null,
    actions,
    items,
    pagination,
    loading,
    refreshing,
    error,
    refresh,
    invalidate,
    findAll,
    findById,
    create,
    update,
    remove,
    paginate,
    search,
  };
}
