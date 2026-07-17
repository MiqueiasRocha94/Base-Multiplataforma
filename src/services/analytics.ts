import { getDevAnalyticsOverview } from "@/dev-backend/analytics";
import type { AnalyticsOverview } from "@/types/analytics";

/**
 * Origem do painel de Analytics. Ainda nao ha endpoint real: usa o Dev Backend
 * (mock local), no mesmo espirito de `getEntityDataProvider`. Trocar por um
 * fetch a `GET /analytics/overview` quando o backend existir.
 */
export async function getAnalyticsOverview(): Promise<AnalyticsOverview> {
  return getDevAnalyticsOverview();
}
