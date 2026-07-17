import type { DataResponse, EntityContract, EntitySchema, ModuleRecord, ModuleUi } from "@/core/contracts";
import type { EntityDataProvider } from "@/core/entity-runtime/types";
import { getDevEntity } from "@/dev-backend/registry";
import { logMockApi, readMockCollection, writeMockCollection } from "@/lib/mock-collection";
import { applyListQuery, EMPTY_LIST_QUERY, type ListQuery } from "@/types/list-query";

/**
 * DEV BACKEND: provider alternativo que implementa o MESMO contrato da API de
 * producao usando dados locais (localStorage via mock-collection). O frontend
 * nao sabe que esta falando com ele.
 *
 * Generico: nao conhece nenhuma entidade especifica. Cada entidade se registra
 * em `dev-backend/entities/*` com contrato + seed.
 */
const STORAGE_PREFIX = "@multiplataforma-base/dev-backend/";

function moduleOf(url: string): { contract: EntityContract; storageKey: string; seed: () => ModuleRecord[] } {
  const registered = getDevEntity(url);
  if (!registered) {
    throw new Error(`Dev Backend: entidade "${url}" nao registrada.`);
  }
  return { contract: registered.contract, storageKey: `${STORAGE_PREFIX}${url}`, seed: registered.seed };
}

function generateId(): string {
  return `${Date.now()}${Math.floor(100 + Math.random() * 900)}`;
}

/** Ordena pela `ui.sort` do contrato, quando definida. */
function sortRecords(records: ModuleRecord[], ui: ModuleUi): ModuleRecord[] {
  const sort = ui.sort;
  if (!sort) {
    return records;
  }
  const dir = sort.direction === "ASC" ? 1 : -1;
  return [...records].sort((a, b) => {
    const av = a[sort.field];
    const bv = b[sort.field];
    if (av === bv) return 0;
    if (av == null) return 1;
    if (bv == null) return -1;
    return (av as number) > (bv as number) ? dir : -dir;
  });
}

function dateAccessor(schema: EntitySchema): ((item: ModuleRecord) => number) | undefined {
  const dateField = schema.fields.find((field) => field.type === "datetime" || field.type === "date");
  if (!dateField) {
    return undefined;
  }
  return (item) => Number(item[dateField.name] ?? 0);
}

class DevDataProvider implements EntityDataProvider {
  async getContract(url: string): Promise<EntityContract> {
    const { contract } = moduleOf(url);
    logMockApi("GET", `/${url}/contract`, {}, contract);
    return contract;
  }

  async list<T>(url: string, query?: ListQuery): Promise<DataResponse<T>> {
    const { contract, storageKey, seed } = moduleOf(url);
    const all = await readMockCollection<ModuleRecord>(storageKey, seed);
    const sorted = sortRecords(all, contract.ui);

    const dateOf = dateAccessor(contract.schema);
    const effective = query ?? EMPTY_LIST_QUERY;
    const page = applyListQuery(sorted, effective, dateOf);
    const size = effective.limit && effective.limit > 0 ? effective.limit : null;
    const offset = effective.offset > 0 ? effective.offset : 0;

    const response: DataResponse<T> = {
      data: page.data as unknown as T[],
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
    const { contract, storageKey, seed } = moduleOf(url);
    const pk = contract.schema.primaryKey;
    const all = await readMockCollection<ModuleRecord>(storageKey, seed);
    const found = (all.find((item) => String(item[pk]) === String(id)) ?? null) as T | null;
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
    const { contract, storageKey, seed } = moduleOf(url);
    const needle = term.trim().toLowerCase();
    const all = await readMockCollection<ModuleRecord>(storageKey, seed);
    const filtered = !needle
      ? all
      : all.filter((item) => contract.ui.filters.some((name) => String(item[name] ?? "").toLowerCase().includes(needle)));
    const sorted = sortRecords(filtered, contract.ui);
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
