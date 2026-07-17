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
import { getCachedContract, invalidateContract, loadContract } from "@/core/entity-runtime/contract-provider";
import { getEntityDataProvider } from "@/core/entity-runtime/entity-provider";
import { resolveActions, type ModuleActionFlags } from "@/core/module-engine";
import { useAuth } from "@/contexts/AuthContext";
import { resolveEntityPermissions } from "@/lib/auth/entity-policy";
import type { ListQuery } from "@/types/list-query";

export type UseEntityOptions = {
  /** Caminho da entidade (ex.: "users"); usado na URL REST e no Dev Backend. */
  url: string;
  /** Query basica (limit/offset/data) da listagem; alterar refaz o fetch. */
  query?: ListQuery;
  /** Carregar a lista automaticamente. `false` em telas de formulario. Padrao: true. */
  list?: boolean;
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

  // dados
  items: T[];
  pagination: EntityPagination | null;

  // ciclo de vida
  loading: boolean;
  refreshing: boolean;
  error: string | null;
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

/**
 * Entity Runtime — ponte entre o contrato da entidade e a interface. Substitui
 * os services de CRUD especificos: dado apenas `{ url }`, fornece contrato
 * (schema/ui/permissions/relations), dados paginados e operacoes CRUD, alem do
 * ciclo de vida usado pelas telas (loading/refreshing/error/refresh/invalidate).
 */
export function useEntity<T extends ModuleRecord = ModuleRecord>(options: UseEntityOptions): UseEntityResult<T> {
  const { url, query, list = true } = options;
  const { user } = useAuth();

  const [contract, setContract] = useState<EntityContract | null>(() => getCachedContract(url));
  const [items, setItems] = useState<T[]>([]);
  const [pagination, setPagination] = useState<EntityPagination | null>(null);
  const [loading, setLoading] = useState(list);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const lastQueryKey = useRef<string | null>(null);

  const pk = contract?.schema.primaryKey ?? "id";

  // Contrato: carrega uma vez (cobre deep-link / formulario sem passar pela lista).
  useEffect(() => {
    if (contract) {
      return;
    }
    let active = true;
    void loadContract(url)
      .then((loaded) => {
        if (active) setContract(loaded);
      })
      .catch((err) => {
        if (active) setError(err instanceof Error ? err.message : "Falha ao carregar o contrato.");
      });
    return () => {
      active = false;
    };
  }, [url, contract]);

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
        const loadedContract = await loadContract(url);
        setContract((current) => current ?? loadedContract);

        const provider = await getEntityDataProvider();
        const response = await provider.list<T>(url, query);
        setItems(response.data);
        setPagination(response.pagination);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Falha ao carregar os dados.");
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [url, query],
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
    invalidateContract(url);
    setContract(null);
  }, [url]);

  const findAll = useCallback(
    async (q?: ListQuery) => {
      const provider = await getEntityDataProvider();
      return provider.list<T>(url, q ?? query);
    },
    [url, query],
  );

  const findById = useCallback(
    async (id: string) => {
      const provider = await getEntityDataProvider();
      return provider.getById<T>(url, id);
    },
    [url],
  );

  const create = useCallback(
    async (input: unknown) => {
      const provider = await getEntityDataProvider();
      return provider.create<T>(url, input);
    },
    [url],
  );

  const update = useCallback(
    async (id: string, input: unknown) => {
      const provider = await getEntityDataProvider();
      return provider.update<T>(url, id, input);
    },
    [url],
  );

  const remove = useCallback(
    async (id: string) => {
      const provider = await getEntityDataProvider();
      await provider.remove(url, id);
      setItems((current) => current.filter((item) => String(item[pk]) !== String(id)));
    },
    [url, pk],
  );

  const paginate = useCallback(
    async (q: ListQuery) => {
      const provider = await getEntityDataProvider();
      return provider.list<T>(url, q);
    },
    [url],
  );

  const search = useCallback(
    async (term: string, q?: ListQuery) => {
      const provider = await getEntityDataProvider();
      return provider.search<T>(url, term, q ?? query);
    },
    [url, query],
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

  return {
    contract,
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
