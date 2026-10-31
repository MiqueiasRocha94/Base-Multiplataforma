import { apiFetch } from "@/lib/http";

export async function loadDocument(uri: string, signal?: AbortSignal): Promise<string> {
  const response = await apiFetch(uri, { signal });
  return response.text();
}
