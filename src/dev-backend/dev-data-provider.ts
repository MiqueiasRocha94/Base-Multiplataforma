import type { DataResponse, EntityContract, EntitySchema, ModuleRecord, ModuleUi } from "@/core/contracts";
import type { EntityDataProvider } from "@/core/entity-runtime/types";
import { serverSortableFields } from "@/core/module-engine";
import { getDevEntity } from "@/dev-backend/registry";
import { erroApi } from "@/dev-backend/api-format";
import { logMockApi, readMockCollection, writeMockCollection } from "@/lib/mock-collection";
import { applyListQuery, EMPTY_LIST_QUERY, type ListQuery, type ListSort } from "@/types/list-query";

/**
 * DEV BACKEND: provider alternativo que implementa o MESMO contrato da API de
 * producao usando dados locais (localStorage via mock-collection). O frontend
 * nao sabe que esta falando com ele.
 *
 * Generico: nao conhece nenhuma entidade especifica. Cada entidade se registra
 * em `dev-backend/entities/*` com contrato + seed.
 */
const STORAGE_PREFIX = "@multiplataforma-base/dev-backend/";

type DevModule = {
  contract: EntityContract;
  storageKey: string;
  seed: () => ModuleRecord[];
  scope: (records: ModuleRecord[]) => ModuleRecord[];
};

function moduleOf(url: string): DevModule {
  const registered = getDevEntity(url);
  if (!registered) {
    throw new Error(`Dev Backend: entidade "${url}" nao registrada.`);
  }
  return {
    contract: typeof registered.contract === "function" ? registered.contract() : registered.contract,
    storageKey: `${STORAGE_PREFIX}${url}`,
    seed: registered.seed,
    scope: registered.scope ?? ((records) => records),
  };
}

function generateId(): string {
  return `${Date.now()}${Math.floor(100 + Math.random() * 900)}`;
}

function compare(av: unknown, bv: unknown): number {
  if (av === bv) return 0;
  if (av == null) return 1;
  if (bv == null) return -1;
  if (typeof av === "number" && typeof bv === "number") return av - bv;
  return String(av).localeCompare(String(bv), "pt-BR", { numeric: true });
}

/**
 * Ordenacao composta pedida (`sort`, na ordem de prioridade) ou, sem ela, a
 * padrao do contrato (`ui.sort`).
 */
function sortRecords(records: ModuleRecord[], ui: ModuleUi, sort?: ListSort): ModuleRecord[] {
  const criteria: ListSort = sort?.length
    ? sort
    : ui.sort
      ? [{ key: ui.sort.field, direction: ui.sort.direction === "ASC" ? "asc" : "desc" }]
      : [];
  if (criteria.length === 0) {
    return records;
  }
  return [...records].sort((a, b) => {
    for (const { key, direction } of criteria) {
      const result = compare(a[key], b[key]);
      if (result !== 0) return direction === "asc" ? result : -result;
    }
    return 0;
  });
}

/**
 * Filtros por campo (modo servidor), em AND: enum/boolean/relation por igualdade
 * do VALOR; demais por inclusao, sem diferenciar maiusculas.
 */
function filterRecords(records: ModuleRecord[], schema: EntitySchema, filters?: Record<string, string>): ModuleRecord[] {
  const entries = Object.entries(filters ?? {});
  if (entries.length === 0) {
    return records;
  }
  const byName = new Map(schema.fields.map((field) => [field.name, field]));
  return records.filter((record) =>
    entries.every(([name, value]) => {
      const field = byName.get(name);
      const raw = record[name];
      if (field?.enum?.length || field?.type === "enum" || field?.type === "boolean" || field?.type === "relation") {
        return String(raw) === value;
      }
      return raw != null && String(raw).toLowerCase().includes(value.toLowerCase());
    }),
  );
}

function dateAccessor(schema: EntitySchema): ((item: ModuleRecord) => number) | undefined {
  const dateField = schema.fields.find((field) => field.type === "datetime" || field.type === "date");
  if (!dateField) {
    return undefined;
  }
  return (item) => {
    const value = item[dateField.name];
    return typeof value === "string" ? Date.parse(value) || 0 : Number(value ?? 0);
  };
}

class DevDataProvider implements EntityDataProvider {
  async getContract(url: string): Promise<EntityContract> {
    const { contract } = moduleOf(url);
    logMockApi("GET", `/${url}/contract`, {}, contract);
    return contract;
  }

  async list<T>(url: string, query?: ListQuery): Promise<DataResponse<T>> {
    const { contract, storageKey, seed, scope } = moduleOf(url);
    // Como a API: `sort` so nos campos que o contrato declara aceitos.
    const accepted = serverSortableFields(contract.ui);
    const invalid = query?.sort?.find((entry) => !accepted.has(entry.key));
    if (invalid) {
      throw erroApi(400, `Ordenação inválida: ${invalid.key},${invalid.direction}.`);
    }
    // Como a API: filtro obrigatório do contrato (`ui.requiredFilters`) ausente → 400.
    const missing = contract.ui.requiredFilters?.find((name) => !query?.filters?.[name]?.trim());
    if (missing) {
      const field = contract.schema.fields.find((item) => item.name === missing);
      throw erroApi(400, `Informe ${field?.label ?? missing}.`);
    }
    const all = scope(await readMockCollection<ModuleRecord>(storageKey, seed));
    const sorted = sortRecords(filterRecords(all, contract.schema, query?.filters), contract.ui, query?.sort);

    const dateOf = dateAccessor(contract.schema);
    const effective = query ?? EMPTY_LIST_QUERY;
    const page = applyListQuery(sorted, effective, dateOf);
    const size = effective.limit && effective.limit > 0 ? effective.limit : null;
    const offset = effective.offset > 0 ? effective.offset : 0;

    // Como a API: coluna adicional (`ui.columns[].additional`) só vem com `addColumn`.
    const omitted = contract.ui.columns
      .filter((column) => typeof column !== "string" && column.additional && !query?.addColumns?.includes(column.field))
      .map((column) => (column as { field: string }).field);
    const data = omitted.length > 0
      ? page.data.map((record) => Object.fromEntries(Object.entries(record).filter(([key]) => !omitted.includes(key))))
      : page.data;

    const response: DataResponse<T> = {
      data: data as unknown as T[],
      pagination: {
        page: size != null ? Math.floor(offset / size) + 1 : 1,
        size: size ?? page.total,
        total: page.total,
      },
    };
    logMockApi("GET", `/${url}`, { query }, response);
    return response;
  }

  async getById<T>(url: string, id: string): Promise<T | null> {
    const { contract, storageKey, seed, scope } = moduleOf(url);
    const pk = contract.schema.primaryKey;
    const all = scope(await readMockCollection<ModuleRecord>(storageKey, seed));
    const found =(all.find((item) => String(item[pk]) === String(id)) ?? null) as T | null;
    logMockApi("GET", `/${url}/${id}`, { id }, found);
    return found;
  }

  async create<T>(url: string, input: unknown): Promise<T> {
    const { contract, storageKey, seed } = moduleOf(url);
    const pk = contract.schema.primaryKey;
    const all = await readMockCollection<ModuleRecord>(storageKey, seed);
    const created: ModuleRecord = { [pk]: generateId(), createdAt: Date.now(), ...(input as ModuleRecord) };
    await writeMockCollection(storageKey, [created, ...all]);
    logMockApi("POST", `/${url}`, input, created);
    return created as T;
  }

  async update<T>(url: string, id: string, input: unknown): Promise<T> {
    const { contract, storageKey, seed } = moduleOf(url);
    const pk = contract.schema.primaryKey;
    const all = await readMockCollection<ModuleRecord>(storageKey, seed);
    const existing = all.find((item) => String(item[pk]) === String(id));
    if (!existing) {
      throw new Error("Registro nao encontrado.");
    }
    const updated: ModuleRecord = { ...existing, ...(input as ModuleRecord), [pk]: existing[pk] };
    await writeMockCollection(
      storageKey,
      all.map((item) => (String(item[pk]) === String(id) ? updated : item)),
    );
    logMockApi("PUT", `/${url}/${id}`, input, updated);
    return updated as T;
  }

  async remove(url: string, id: string): Promise<void> {
    const { contract, storageKey, seed } = moduleOf(url);
    const pk = contract.schema.primaryKey;
    const all = await readMockCollection<ModuleRecord>(storageKey, seed);
    await writeMockCollection(
      storageKey,
      all.filter((item) => String(item[pk]) !== String(id)),
    );
    logMockApi("DELETE", `/${url}/${id}`, { id }, { success: true });
  }

  async search<T>(url: string, term: string, query?: ListQuery): Promise<DataResponse<T>> {
    const { contract, storageKey, seed, scope } = moduleOf(url);
    const needle = term.trim().toLowerCase();
    const all = scope(await readMockCollection<ModuleRecord>(storageKey, seed));
    const filtered = !needle
      ? all
      : all.filter((item) => contract.ui.filters.some((name) => String(item[name] ?? "").toLowerCase().includes(needle)));
    const sorted = sortRecords(filterRecords(filtered, contract.schema, query?.filters), contract.ui, query?.sort);
    const effective = query ?? EMPTY_LIST_QUERY;
    const page = applyListQuery(sorted, effective);
    const size = effective.limit && effective.limit > 0 ? effective.limit : null;
    const offset = effective.offset > 0 ? effective.offset : 0;
    const response: DataResponse<T> = {
      data: page.data as unknown as T[],
      pagination: { page: size != null ? Math.floor(offset / size) + 1 : 1, size: size ?? page.total, total: page.total },
    };
    logMockApi("GET", `/${url}?search=${term}`, { term, query }, response);
    return response;
  }
}

export const devDataProvider: EntityDataProvider = new DevDataProvider();
