import type { BrandId } from "@/config/brand";
import { brandInfo } from "@/config/brand-info";
import type { BrandInfo } from "@/types/brand";

/**
 * Origem das informações de white-label. Ainda não há endpoint real: vem da
 * configuração por marca (`config/brand-info`), igual em todos os ambientes.
 *
 * Trocar por `apiFetch('/whitelabel/' + id)` quando o backend existir — ele
 * também passará a servir as imagens de cada WL (hoje os assets vêm do
 * `BrandProfile` estático em `config/brand`).
 */
export async function getBrandInfo(id: BrandId): Promise<BrandInfo> {
  return brandInfo(id);
}
