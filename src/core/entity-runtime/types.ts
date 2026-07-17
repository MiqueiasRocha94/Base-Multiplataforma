import type { DataResponse, EntityContract } from "@/core/contracts";
import type { ListQuery } from "@/types/list-query";

/**
 * Provider de dados de uma entidade. A mesma interface e implementada pelo
 * provider de PRODUCAO (HTTP REST) e pelo DEV BACKEND (dados locais). O frontend
 * nao conhece a origem ativa — ambos devem fornecer contrato, dados, paginacao,
 * erros e operacoes CRUD no mesmo formato.
 */
export interface EntityDataProvider {
  /** GET /{url}/contract — definicao estatica da entidade. */
  getContract(url: string): Promise<EntityContract>;
  /** GET /{url} — pagina de dados + paginacao (aplica limit/offset/data e ordenacao). */
  list<T>(url: string, query?: ListQuery): Promise<DataResponse<T>>;
  /** GET /{url}/{id} — registro unico (ou null se inexistente). */
  getById<T>(url: string, id: string): Promise<T | null>;
  /** POST /{url} */
  create<T>(url: string, input: unknown): Promise<T>;
  /** PUT /{url}/{id} */
  update<T>(url: string, id: string, input: unknown): Promise<T>;
  /** DELETE /{url}/{id} */
  remove(url: string, id: string): Promise<void>;
  /** GET /{url}?search= — busca (server-side quando o provider suportar). */
  search<T>(url: string, term: string, query?: ListQuery): Promise<DataResponse<T>>;
}
