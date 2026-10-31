// @dev-only:start
import { getDevAnalyticsOverview } from "@/dev-backend/analytics";
// @dev-only:end
import { apiFetch } from "@/lib/http";
import type { AnalyticsOverview } from "@/types/analytics";

const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL ?? "";

/**
 * Origem do painel de Analytics: `GET /analytics/overview` na raiz do portal
 * (`NEXT_PUBLIC_API_BASE_URL`). O endpoint ainda não existe (404 esperado fora
 * de dev — docs/comunicacao-api.md "Front consome, backend decide"); em dev,
 * sem a raiz, responde o dev-backend.
 */
export async function getAnalyticsOverview(): Promise<AnalyticsOverview> {
  // @dev-only:start
  if (!API_BASE) {
    return getDevAnalyticsOverview();
  }
  // @dev-only:end
  const response = await apiFetch("/analytics/overview", { baseUrl: API_BASE });
  return (await response.json()) as AnalyticsOverview;
}
