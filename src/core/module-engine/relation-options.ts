// eslint-disable-next-line no-restricted-imports -- D04 (desvio conhecido): log de mock em core; some com a injeção do provider de dados
import { logMockApi } from "@/lib/mock-collection";
import type { FieldRelationship } from "@/core/contracts";
import type { DynamicSelectOption } from "@/types/dynamic-form";

/**
 * Carrega as opcoes de um campo de relacionamento (`relationship.entity`).
 *
 * No modo mockado resolve a partir de dados de referencia locais (simulando a
 * API da entidade alvo); em producao trocaria por uma chamada ao endpoint de
 * `relationship.entity`. Simplificacao do mock: o `valueField` nao e usado — a
 * opcao guarda o rotulo como valor (evita o round-trip id<->label nas telas).
 */
const REFERENCE_DATA: Record<string, { id: string; name: string }[]> = {
  departments: [
    { id: "1", name: "TI" },
    { id: "2", name: "Financeiro" },
    { id: "3", name: "RH" },
    { id: "4", name: "Operacoes" },
  ],
};

export async function loadRelationOptions(relationship: FieldRelationship): Promise<DynamicSelectOption[]> {
  const rows = REFERENCE_DATA[relationship.entity] ?? [];
  logMockApi("GET", `/api/v1/${relationship.entity}`, {}, rows);
  return rows.map((row) => {
    const label = String((row as Record<string, unknown>)[relationship.labelField ?? "name"] ?? row.name);
    return { id: label, label };
  });
}
