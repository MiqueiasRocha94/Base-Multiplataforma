import { getStorageItem, setStorageItem } from "@/lib/platform/storage";

/**
 * Armazenamento generico de colecoes mockadas (sobre localStorage, com fallback
 * em memoria). Usado pelo Dev Backend para simular a persistencia de uma API.
 * Nao depende de nenhum contexto React, portanto e seguro em qualquer bundle.
 */
const memory = new Map<string, string>();

function read(key: string): string | null {
  const value = getStorageItem(key);
  if (value !== null) {
    memory.set(key, value);
    return value;
  }
  return memory.get(key) ?? null;
}

function write(key: string, value: string): void {
  memory.set(key, value);
  setStorageItem(key, value);
}

/**
 * Loga a "chamada" e o "retorno" do mock como se fosse a API real — util para
 * inspecionar requisicao + resposta no console durante o desenvolvimento.
 */
export function logMockApi(method: string, path: string, request: unknown, response: unknown): void {
  console.info(`[mock-api] ${method} ${path}`, { request, response });
}

export async function readMockCollection<T>(key: string, seed: () => T[]): Promise<T[]> {
  const raw = read(key);
  if (!raw) {
    const seeded = seed();
    write(key, JSON.stringify(seeded));
    return seeded;
  }

  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as T[]) : [];
  } catch {
    return [];
  }
}

export async function writeMockCollection<T>(key: string, items: T[]): Promise<void> {
  write(key, JSON.stringify(items));
}
