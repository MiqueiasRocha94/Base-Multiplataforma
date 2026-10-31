export type ApiFetchOptions = RequestInit & { baseUrl?: string };

export class HttpError extends Error {
  constructor(
    public readonly status: number,
    public readonly payload: unknown,
    message: string,
    /** Headers da resposta de erro (ex.: `DPoP-Nonce`, `WWW-Authenticate`). */
    public readonly headers?: Headers,
  ) {
    super(message);
    this.name = "HttpError";
  }
}

export function toError(error: unknown): Error {
  return error instanceof Error ? error : new Error("Nao foi possivel concluir a operacao.");
}

export function isServerError(error: unknown): error is HttpError {
  return error instanceof HttpError && error.status >= 500;
}

export async function apiFetch(path: string, options: ApiFetchOptions = {}): Promise<Response> {
  const { baseUrl = "", ...init } = options;
  const headers = new Headers(init.headers);
  if (!headers.has("Content-Type") && typeof init.body === "string") {
    headers.set("Content-Type", "application/json");
  }
  const response = await fetch(`${baseUrl}${path}`, { ...init, headers });
  if (!response.ok) {
    const text = await response.text();
    let payload: unknown = text;
    try { payload = JSON.parse(text); } catch { /* A resposta pode nao ser JSON. */ }
    const detail = payload && typeof payload === "object" ? payload as Record<string, unknown> : null;
    const message = typeof detail?.message === "string" ? detail.message
      : typeof detail?.detail === "string" ? detail.detail
      : `Falha na requisicao (HTTP ${response.status}).`;
    throw new HttpError(response.status, payload, message, response.headers);
  }
  return response;
}
