export type ApiFetchOptions = RequestInit & {
  baseUrl?: string;
};

export async function apiFetch(path: string, options: ApiFetchOptions = {}) {
  const baseUrl = options.baseUrl ?? "";
  const response = await fetch(`${baseUrl}${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...options.headers,
    },
  });

  if (!response.ok) {
    throw new Error(`API request failed with status ${response.status}`);
  }

  return response;
}
