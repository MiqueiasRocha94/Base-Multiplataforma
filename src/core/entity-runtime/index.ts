/**
 * Entity Runtime — infraestrutura orientada a contrato. Ponto de entrada unico
 * para acessar qualquer entidade: `useEntity<T>({ url })`.
 */
export { useEntity } from "@/core/entity-runtime/use-entity";
export type { UseEntityOptions, UseEntityResult } from "@/core/entity-runtime/use-entity";
export { getEntityDataProvider } from "@/core/entity-runtime/entity-provider";
export { getCachedContract, invalidateContract, loadContract } from "@/core/entity-runtime/contract-provider";
export type { EntityDataProvider } from "@/core/entity-runtime/types";
