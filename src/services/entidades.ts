import type { DataResponse, EntityContract } from "@/core/contracts";
import type { EntityDataProvider } from "@/core/entity-runtime";
// @dev-only:start
import { devDataProvider } from "@/dev-backend";
// @dev-only:end
import { getSession } from "@/lib/auth/session";
import { chamarApi } from "@/services/api/cliente";
import { comQuery, getJson, postJson, usaApi } from "@/services/api/recursos";
import type { Pagina } from "@/types/api";
import type { ListQuery } from "@/types/list-query";

/**
 * Entidades servidas pelas rotas `/private` da API (ex.: `/private/pedidos`),
 * no mesmo padrão orientado a contrato das demais (docs/modulos-entidade.md):
 *
 *   GET {url}/contract → EntityContract (colunas/filtros/ações decididos pelo backend, por perfil)
 *   GET {url}?page=&size=&dataInicio=&dataFim=&<campo>=&sort=campo,dir&addColumn=campo → Pagina<T>
 *
 * Diferenças da raiz genérica (`NEXT_PUBLIC_API_BASE_URL`), resolvidas AQUI e não
 * na tela: raiz `NEXT_PUBLIC_ACESSO_API_URL`, `chamarApi` (Bearer/DPoP e
 * renovação), paginação do Spring (`page` a partir de 0, `{content, page}`).
 * Sem a raiz configurada, o dev-backend responde o mesmo contrato.
 */
const PREFIXO_PRIVADO = "/private/";

const token = () => getSession()?.accessToken ?? "";
const isoDoDia = (ms: number | null) => (ms == null ? undefined : new Date(ms).toISOString().slice(0, 10));

/** `ListQuery` → parâmetros da API (só os preenchidos vão na URL). */
function parametros(query?: ListQuery, busca?: string) {
  const size = query?.limit && query.limit > 0 ? query.limit : undefined;
  return {
    page: size ? Math.floor((query?.offset ?? 0) / size) : undefined,
    size,
    dataInicio: isoDoDia(query?.dateFrom ?? null),
    dataFim: isoDoDia(query?.dateTo ?? null),
    busca,
    ...query?.filters,
    sort: (query?.sort ?? []).map(({ key, direction }) => `${key},${direction}`),
    // Colunas adicionais (contrato `additional: true`) exibidas pelo usuário.
    addColumn: query?.addColumns ?? [],
  };
}

/** `{content, page}` (Spring, página 0-based) → `{data, pagination}` (página 1-based). */
function paraDados<T>(pagina: Pagina<T>): DataResponse<T> {
  return {
    data: pagina.content,
    pagination: { page: pagina.page.number + 1, size: pagina.page.size, total: pagina.page.totalElements },
  };
}

class ProviderPrivado implements EntityDataProvider {
  getContract(url: string): Promise<EntityContract> {
    return getJson<EntityContract>(`${url}/contract`, token());
  }

  async list<T>(url: string, query?: ListQuery): Promise<DataResponse<T>> {
    return paraDados(await getJson<Pagina<T>>(comQuery(url, parametros(query)), token()));
  }

  getById<T>(url: string, id: string): Promise<T | null> {
    return getJson<T>(`${url}/${id}`, token());
  }

  create<T>(url: string, input: unknown): Promise<T> {
    return postJson<T>(url, token(), input);
  }

  async update<T>(url: string, id: string, input: unknown): Promise<T> {
    const response = await chamarApi(`${url}/${id}`, { token: token(), method: "PUT", body: JSON.stringify(input) });
    return (await response.json()) as T;
  }

  async remove(url: string, id: string): Promise<void> {
    await chamarApi(`${url}/${id}`, { token: token(), method: "DELETE" });
  }

  async search<T>(url: string, term: string, query?: ListQuery): Promise<DataResponse<T>> {
    return paraDados(await getJson<Pagina<T>>(comQuery(url, parametros(query, term)), token()));
  }
}

const providerPrivado: EntityDataProvider = new ProviderPrivado();

/**
 * Provider da entidade pela `url`: rotas `/private` → API (ou dev-backend sem a
 * raiz configurada); demais → `undefined` (o runtime usa o provider padrão).
 * A tela injeta o resultado em `useEntity({ provider })`.
 */
export function providerDaEntidade(url: string): EntityDataProvider | undefined {
  if (!url.startsWith(PREFIXO_PRIVADO)) {
    return undefined;
  }
  // @dev-only:start
  if (!usaApi()) {
    return devDataProvider;
  }
  // @dev-only:end
  return providerPrivado;
}
