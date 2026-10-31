import { apiDataProvider } from "@/core/entity-runtime/api-data-provider";
import type { EntityDataProvider } from "@/core/entity-runtime/types";
// @dev-only:start
// eslint-disable-next-line no-restricted-imports -- D01 (desvio conhecido): core escolhe dev-backend × API aqui; corrige ao injetar o provider de dados
import { devDataProvider } from "@/dev-backend";
import { getStorageItem, storageKeys } from "@/lib/platform/storage";
// @dev-only:end

// @dev-only:start
/**
 * Resolve qual provider de dados esta ativo. O frontend nao conhece a origem:
 *
 *   Sem backend configurado (padrao) -> Dev Backend (dados locais que simulam a API)
 *   Backend configurado + mock off    -> API de producao (REST)
 *
 * Ambos implementam `EntityDataProvider` com o mesmo formato de contrato/dados.
 */
function isMockedModeEnabled(): boolean {
  const apiBase = process.env.NEXT_PUBLIC_API_BASE_URL;
  // Sem backend real configurado, o Dev Backend e o caminho funcional padrao.
  if (!apiBase) {
    return true;
  }

  const raw = getStorageItem(storageKeys.developerModeSettings);
  if (!raw) {
    return false;
  }

  try {
    return Boolean((JSON.parse(raw) as { mockedDataEnabled?: boolean }).mockedDataEnabled);
  } catch {
    return false;
  }
}
// @dev-only:end

export async function getEntityDataProvider(): Promise<EntityDataProvider> {
  // @dev-only:start
  if (isMockedModeEnabled()) {
    return devDataProvider;
  }
  // @dev-only:end
  return apiDataProvider;
}
