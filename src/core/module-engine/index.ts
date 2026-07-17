/**
 * Module Engine — funcoes puras que transformam o contrato schema-driven em
 * pecas de UI (colunas, filtros, formulario, Zod, CSV, acoes), o registry de
 * contratos em memoria e o carregamento de opcoes de relacionamento.
 */
export {
  buildCsv,
  buildFilterFields,
  buildFormFields,
  buildPredicate,
  buildRowStatus,
  buildTableColumns,
  buildZodSchema,
  displayValue,
  fieldLabel,
  formValuesToRecord,
  getRecordId,
  recordToFormValues,
  resolveActions,
  type ModuleActionFlags,
} from "@/core/module-engine/module-engine";
export { getModule, registerModule, type ModuleDescriptor } from "@/core/module-engine/module-registry";
export { loadRelationOptions } from "@/core/module-engine/relation-options";
export { downloadCsv } from "@/core/module-engine/export-csv";
