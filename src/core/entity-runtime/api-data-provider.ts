import type { DataResponse, EntityContract } from "@/core/contracts";
import type { EntityDataProvider } from "@/core/entity-runtime/types";
// eslint-disable-next-line no-restricted-imports -- D05 (desvio conhecido): provider REST em core; corrige movendo para services/ e injetando
import { apiFetch } from "@/lib/http";
import type { ListQuery } from "@/types/list-query";

/**
 * Provider de PRODUCAO: fala REST com o backend orientado a contrato.
 *
 *   GET /{url}/contract -> EntityContract
 *   GET /{url}          -> { data, pagination }  (?limit&offset&from&to&<campo>=&sort=campo,dir&addColumn=campo)
 *
 * Observacao: esta e uma base e ainda nao possui backend. O caminho funcional
 * padrao e o DEV BACKEND; este provider e o contrato REST esperado.
 */
const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL ?? "";

function toQueryString(query?: ListQuery, search?: string): string {
  const params = new URLSearchParams();
  if (query?.limit != null) params.set("limit", String(query.limit));
  if (query && query.offset > 0) params.set("offset", String(query.offset));
  if (query?.dateFrom != null) params.set("from", new Date(query.dateFrom).toISOString());
  if (query?.dateTo != null) params.set("to", new Date(query.dateTo).toISOString());
  if (search) params.set("search", search);
  for (const [field, value] of Object.entries(query?.filters ?? {})) params.set(field, value);
  for (const { key, direction } of query?.sort ?? []) params.append("sort", `${key},${direction}`);
  for (const field of query?.addColumns ?? []) params.append("addColumn", field);
  const qs = params.toString();
  return qs ? `?${qs}` : "";
}

class ApiDataProvider implements EntityDataProvider {
  async getContract(url: string): Promise<EntityContract> {
    const response = await apiFetch(`/${url}/contract`, { baseUrl: API_BASE });
    return response.json();
  }

  async list<T>(url: string, query?: ListQuery): Promise<DataResponse<T>> {
    const response = await apiFetch(`/${url}${toQueryString(query)}`, { baseUrl: API_BASE });
    return response.json();
  }

  async getById<T>(url: string, id: string): Promise<T | null> {
    const response = await apiFetch(`/${url}/${id}`, { baseUrl: API_BASE });
    return (await response.json()) ?? null;
  }

  async create<T>(url: string, input: unknown): Promise<T> {
    const response = await apiFetch(`/${url}`, { baseUrl: API_BASE, method: "POST", body: JSON.stringify(input) });
    return response.json();
  }

  async update<T>(url: string, id: string, input: unknown): Promise<T> {
    const response = await apiFetch(`/${url}/${id}`, { baseUrl: API_BASE, method: "PUT", body: JSON.stringify(input) });
    return response.json();
  }

  async remove(url: string, id: string): Promise<void> {
    await apiFetch(`/${url}/${id}`, { baseUrl: API_BASE, method: "DELETE" });
  }

  async search<T>(url: string, term: string, query?: ListQuery): Promise<DataResponse<T>> {
    const response = await apiFetch(`/${url}${toQueryString(query, term)}`, { baseUrl: API_BASE });
    return response.json();
  }
}

export const apiDataProvider: EntityDataProvider = new ApiDataProvider();
