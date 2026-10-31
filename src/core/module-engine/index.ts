/**
 * Module Engine — funcoes puras que transformam o contrato schema-driven em
 * pecas de UI (colunas, filtros, formulario, Zod, CSV, acoes), o registry de
 * contratos em memoria e o carregamento de opcoes de relacionamento.
 */
export {
  buildCsv,
  buildDateOf,
  buildFilterFields,
  buildFormFields,
  buildPredicate,
  buildQueryFilters,
  buildRowStatus,
  buildTableColumns,
  buildZodSchema,
  displayValue,
  fieldLabel,
  fileFields,
  formValuesToRecord,
  getRecordId,
  normalizeColumns,
  type NormalizedColumn,
  recordToFormValues,
  resolveActions,
  serverSortableFields,
  type ModuleActionFlags,
} from "@/core/module-engine/module-engine";
export { getModule, registerModule, type ModuleDescriptor } from "@/core/module-engine/module-registry";
export { loadRelationOptions } from "@/core/module-engine/relation-options";
export { downloadCsv } from "@/core/module-engine/export-csv";
